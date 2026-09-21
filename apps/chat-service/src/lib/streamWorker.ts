import { prisma, MessageType } from '@repo/db';
import { redis } from './redis.js';
import { logger } from './logger.js';

const STREAM_NAME = 'stream:chat-messages';
const GROUP_NAME = 'chat-service-group';
const DLQ_STREAM = 'stream:chat-messages:dlq';
const CONSUMER_NAME = `worker-${process.pid}-${Math.random().toString(36).substring(2, 7)}`;
const BATCH_SIZE = 50;
const BLOCK_TIMEOUT_MS = 2000;
const RECLAIM_INTERVAL_MS = 30000;
const PENDING_MIN_IDLE_TIME_MS = 60000;

interface StreamMessageData {
  id: string;
  sender: string;
  roomId: string;
  text?: string;
  attachments?: string;
  parentId?: string;
  createdAt: string;
  type?: keyof typeof MessageType;
}

function safeParseAttachments(attachments?: string | null): any {
  if (!attachments) return null;
  if (typeof attachments !== 'string') return attachments;
  try {
    return JSON.parse(attachments);
  } catch {
    return null;
  }
}

export class StreamWorker {
  private isRunning = false;
  private reclaimTimer: NodeJS.Timeout | null = null;

  public async start(): Promise<void> {
    if (this.isRunning) return;

    await this.ensureConsumerGroup();
    this.isRunning = true;

    // Start background recovery of idle unacknowledged messages from crashed workers
    this.startReclaimLoop();

    // Start main consumption loop
    void this.consumeLoop();

    logger.info(
      { group: GROUP_NAME, consumer: CONSUMER_NAME, stream: STREAM_NAME },
      'StreamWorker started with DLQ fallback and crash recovery',
    );
  }

  public stop(): void {
    this.isRunning = false;
    if (this.reclaimTimer) {
      clearInterval(this.reclaimTimer);
      this.reclaimTimer = null;
    }
    logger.info('StreamWorker stopped');
  }

  private async ensureConsumerGroup(): Promise<void> {
    try {
      await redis.xgroup('CREATE', STREAM_NAME, GROUP_NAME, '0', 'MKSTREAM');
      logger.info({ stream: STREAM_NAME, group: GROUP_NAME }, 'Created Redis stream consumer group');
    } catch (err: any) {
      if (err.message && err.message.includes('BUSYGROUP')) {
        // Group already exists, perfectly fine
        return;
      }
      logger.error({ err }, 'Failed to create consumer group');
    }
  }

  private startReclaimLoop(): void {
    this.reclaimTimer = setInterval(async () => {
      if (!this.isRunning) return;
      try {
        await this.reclaimPendingMessages();
      } catch (err) {
        logger.error({ err }, 'Error during unacknowledged message auto-claim');
      }
    }, RECLAIM_INTERVAL_MS);
  }

  private async reclaimPendingMessages(): Promise<void> {
    try {
      // XAUTOCLAIM stream group consumer min-idle-time start COUNT count
      const res = await redis.xautoclaim(
        STREAM_NAME,
        GROUP_NAME,
        CONSUMER_NAME,
        PENDING_MIN_IDLE_TIME_MS,
        '0-0',
        'COUNT',
        BATCH_SIZE,
      );

      if (!res || !Array.isArray(res) || res.length < 2) return;

      const messages = res[1] as Array<[string, string[]]>;
      if (messages && messages.length > 0) {
        logger.warn(
          { count: messages.length, consumer: CONSUMER_NAME },
          'Reclaimed orphaned messages from dead workers',
        );
        await this.processMessageBatch(messages);
      }
    } catch (err) {
      logger.error({ err }, 'Failed to execute XAUTOCLAIM');
    }
  }

  private async consumeLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        // XREADGROUP GROUP group consumer COUNT count BLOCK ms STREAMS stream >
        const streams = await redis.xreadgroup(
          'GROUP',
          GROUP_NAME,
          CONSUMER_NAME,
          'COUNT',
          BATCH_SIZE,
          'BLOCK',
          BLOCK_TIMEOUT_MS,
          'STREAMS',
          STREAM_NAME,
          '>',
        );

        if (!streams || streams.length === 0) {
          continue;
        }

        for (const [, messages] of streams as Array<[string, Array<[string, string[]]>]>) {
          if (messages && messages.length > 0) {
            await this.processMessageBatch(messages);
          }
        }
      } catch (err) {
        if (this.isRunning) {
          logger.error({ err }, 'Stream consume loop error');
          // Brief pause on error before retrying
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }
  }

  private async processMessageBatch(messages: Array<[string, string[]]>): Promise<void> {
    const rawItems: Array<{ streamId: string; data: StreamMessageData }> = [];
    const corruptedItems: Array<{ streamId: string; raw: any; reason: string }> = [];

    for (const [streamId, fields] of messages) {
      try {
        let payloadString: string | null = null;
        for (let i = 0; i < fields.length; i += 2) {
          if (fields[i] === 'data') {
            payloadString = fields[i + 1] ?? null;
            break;
          }
        }

        if (!payloadString) {
          corruptedItems.push({ streamId, raw: fields, reason: 'Missing data field' });
          continue;
        }

        const data = JSON.parse(payloadString) as StreamMessageData;
        if (!data.id || !data.roomId || !data.sender) {
          corruptedItems.push({ streamId, raw: data, reason: 'Missing required message fields' });
          continue;
        }

        rawItems.push({ streamId, data });
      } catch (parseErr: any) {
        corruptedItems.push({ streamId, raw: fields, reason: parseErr.message || 'JSON parse error' });
      }
    }

    // Handle any immediately identified corrupted items (Poison pills) via DLQ
    for (const poison of corruptedItems) {
      await this.sendToDlq(poison.streamId, poison.raw, poison.reason);
      await redis.xack(STREAM_NAME, GROUP_NAME, poison.streamId);
    }

    if (rawItems.length === 0) return;

    // Fast-path: Attempt bulk database insert
    try {
      const records = rawItems.map(({ data }) => ({
        id: data.id,
        userId: data.sender,
        roomId: data.roomId,
        text: data.text ?? '',
        attachments: safeParseAttachments(data.attachments),
        parentId: data.parentId ?? null,
        type: data.type ? MessageType[data.type] : MessageType.TEXT,
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        updatedAt: new Date(),
      }));

      await prisma.chatMessage.createMany({
        data: records,
        skipDuplicates: true,
      });

      // Acknowledge all processed message IDs
      const streamIds = rawItems.map((item) => item.streamId);
      await redis.xack(STREAM_NAME, GROUP_NAME, ...streamIds);

      logger.debug({ count: rawItems.length }, 'Persisted message batch to PostgreSQL and ACKed');
    } catch (batchError) {
      logger.warn(
        { batchError, count: rawItems.length },
        'Batch insert failed; falling back to resilient individual record processing',
      );

      // Slow-path fallback: Process one-by-one to isolate poison pills
      for (const item of rawItems) {
        try {
          const { data } = item;
          await prisma.chatMessage.upsert({
            where: { id: data.id },
            update: {},
            create: {
              id: data.id,
              userId: data.sender,
              roomId: data.roomId,
              text: data.text ?? '',
              attachments: safeParseAttachments(data.attachments),
              parentId: data.parentId ?? null,
              type: data.type ? MessageType[data.type] : MessageType.TEXT,
              createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
              updatedAt: new Date(),
            },
          });

          await redis.xack(STREAM_NAME, GROUP_NAME, item.streamId);
        } catch (recordError: any) {
          logger.error(
            { recordError, messageId: item.data.id, streamId: item.streamId },
            'Poison pill message failed individual write; sending to DLQ',
          );

          await this.sendToDlq(
            item.streamId,
            item.data,
            recordError.message || 'Database insert error',
          );
          // Acknowledge from main stream to unblock consumer
          await redis.xack(STREAM_NAME, GROUP_NAME, item.streamId);
        }
      }
    }
  }

  private async sendToDlq(streamId: string, payload: any, errorReason: string): Promise<void> {
    try {
      await redis.xadd(
        DLQ_STREAM,
        '*',
        'originalStreamId',
        streamId,
        'payload',
        typeof payload === 'string' ? payload : JSON.stringify(payload),
        'error',
        errorReason,
        'failedAt',
        new Date().toISOString(),
      );
      logger.warn({ streamId, errorReason }, 'Sent poison pill message to DLQ');
    } catch (dlqErr) {
      logger.error({ dlqErr, streamId }, 'Failed to append to DLQ');
    }
  }
}

export const streamWorker = new StreamWorker();
