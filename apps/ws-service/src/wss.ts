import { WebSocketServer } from 'ws';
import { logger } from './logger.js';
import type { AppWebSocket, SessionUser, AuthedRequest } from './types/wss.js';
import { redis } from './redis.js';
import { subscriptionManager } from './subscriptionManager.js';

const PORT = Number(process.env.PORT) || 3002;
const HEARTBEAT_INTERVAL = 30_000;

let server: WebSocketServer | null = null;
let heartbeat: ReturnType<typeof setInterval> | null = null;
let isInitialized = false;
let shutdownHandlersRegistered = false;

const userToWssMapKey = (uid: string): string => `ws-map:${uid}`;

async function validateTicket(ticket: string): Promise<SessionUser | null> {
  const ticketKey = `ws-ticket:${ticket}`;
  const data = await redis.getdel(ticketKey);
  if (!data) return null;

  const user: SessionUser = JSON.parse(data);
  return user;
}

function clearHeartbeat() {
  if (heartbeat) {
    clearInterval(heartbeat);
    heartbeat = null;
  }
}

function closeServer(server: WebSocketServer): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) {
        reject(err);
        return;
      }

      resolve();
    });
  });
}

function startHeartbeat(wss: WebSocketServer) {
  clearHeartbeat();

  heartbeat = setInterval(() => {
    try {
      wss.clients.forEach((socket) => {
        const ws = socket as AppWebSocket;

        // remove dead connections
        if (!ws.isAlive) {
          ws.terminate();
          return;
        }

        ws.isAlive = false;

        // ping client
        try {
          ws.ping('ping');
        } catch (sendErr) {
          logger.warn({ sendErr }, 'heartbeat: failed to send ping');
        }
      });
    } catch (err) {
      logger.error({ err }, 'heartbeat loop error');
    }
  }, HEARTBEAT_INTERVAL);
}

function registerShutdownHandlers(wss: WebSocketServer) {
  if (shutdownHandlersRegistered) {
    return;
  }

  const shutdown = async (signal: 'SIGINT' | 'SIGTERM') => {
    logger.info({ signal }, 'Closing WebSocket server');

    try {
      clearHeartbeat();
      await closeServer(wss);
      process.exit(0);
    } catch (err) {
      logger.error({ err, signal }, 'Error during WebSocket shutdown');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  shutdownHandlersRegistered = true;
}

function getWssServer(): WebSocketServer {
  if (!server) {
    server = new WebSocketServer({
      port: PORT,
      verifyClient: ({ req }, callback) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const ticket = url.searchParams.get('ticket');

        if (!ticket) {
          logger.warn('verifyClient: missing ticket');
          return callback(false, 401, 'Unauthorized');
        }

        validateTicket(ticket)
          .then((user) => {
            if (!user) {
              logger.warn({ ticket }, 'verifyClient: invalid or expired ticket');
              return callback(false, 401, 'Unauthorized');
            }

            (req as AuthedRequest).user = user;
            (req as AuthedRequest).sessionId = ticket;
            callback(true);
          })
          .catch((err) => {
            logger.error({ err }, 'verifyClient: unexpected error');
            callback(false, 500, 'Internal Server Error');
          });
      },
      perMessageDeflate: {
        zlibDeflateOptions: { chunkSize: 1024, memLevel: 7, level: 3 },
        zlibInflateOptions: { chunkSize: 10 * 1024 },
        clientNoContextTakeover: true,
        serverNoContextTakeover: true,
        serverMaxWindowBits: 10,
        concurrencyLimit: 10,
        threshold: 1024,
      },
    });

    server.on('listening', () => {
      logger.info({ port: PORT }, 'WebSocketServer listening');
    });

    server.on('error', (err) => {
      logger.error({ err }, 'WebSocket server error');
    });

    server.on('close', () => {
      clearHeartbeat();
      isInitialized = false;
      server = null;
    });
  }

  return server;
}

export async function startWebSocketServer(): Promise<WebSocketServer> {
  const wss = getWssServer();

  if (!isInitialized) {
    wss.on('connection', async (socket, req) => {
      const ws = socket as AppWebSocket;
      const authedReq = req as AuthedRequest;

      try {
        ws.isAlive = true;
        ws.sessionId = authedReq.sessionId;
        ws.user = authedReq.user;

        ws.on('pong', () => {
          ws.isAlive = true;
        });

        await redis.set(
          userToWssMapKey(ws.user.id),
          JSON.stringify({ sid: ws.sessionId, uid: ws.user.id, srv: process.env.INSTANCE_NAME }),
        );

        await subscriptionManager.registerClient(ws);

        logger.info({ username: ws.user.username, sessionId: ws.sessionId }, 'WebSocket client connected');

        ws.on('message', async (data: Buffer) => {
          try {
            const raw = JSON.parse(data.toString());
            logger.debug({ data: raw }, 'Received message from client');

            if (raw.type === 'join_room' && typeof raw.roomId === 'string') {
              await subscriptionManager.joinRoom(ws, raw.roomId);
            } else if (raw.type === 'leave_room' && typeof raw.roomId === 'string') {
              await subscriptionManager.leaveRoom(ws, raw.roomId);
            }
          } catch (err) {
            logger.error({ err }, 'ws.on message handler error');
          }
        });

        ws.on('close', async (code: number, reason: Buffer) => {
          try {
            await subscriptionManager.unregisterClient(ws);

            // del user session from ws map
            await redis.del(userToWssMapKey(ws.user.id));

            logger.info(
              {
                username: ws.user?.username ?? null,
                sessionId: ws.sessionId ?? null,
                code,
                reason: reason.toString() || null,
              },
              'WebSocket connection closed',
            );
          } catch (err) {
            logger.error({ err }, 'ws.on close handler error');
          }
        });

        ws.on('error', (err) => {
          try {
            logger.error(
              {
                err,
                username: ws?.user?.username ?? null,
                sessionId: ws?.sessionId ?? null,
              },
              'WebSocket error',
            );
          } catch (handlerErr) {
            logger.error({ handlerErr }, 'ws.on error handler threw');
          }
        });
      } catch (error) {
        logger.error({ error }, 'initSocket:: WebSocket connection error');
        ws.close(1011, 'Internal server error');
      }
    });

    startHeartbeat(wss);
    registerShutdownHandlers(wss);
    isInitialized = true;
  }

  return wss;
}
