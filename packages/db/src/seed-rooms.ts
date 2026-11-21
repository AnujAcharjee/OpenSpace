import crypto from 'crypto';

// Parse command-line flags before loading environment
const args = process.argv.slice(2);
if (args.includes('--cloud') || args.includes('-c')) {
  process.env.ENV_TARGET = 'cloud';
} else if (args.includes('--local') || args.includes('-l')) {
  process.env.ENV_TARGET = 'local';
}

interface CommonRoomDefinition {
  id: string;
  name: string;
  description: string;
  topics: string[];
  type: 'GROUP' | 'DIRECT';
  isPrivate: boolean;
}

const COMMON_ROOMS: CommonRoomDefinition[] = [
  {
    id: 'e2fcacf2-8ac3-4a15-ab18-8eb6415266ad',
    name: 'world chat',
    description: "y'all are welcome here",
    topics: ['general', 'random', 'off-topic', 'advice'],
    type: 'GROUP',
    isPrivate: false,
  },
  {
    id: 'c2d30a25-ccba-4686-8843-c9178da7a5a3',
    name: 'Football',
    description: 'we talk footy here',
    topics: ['sports', 'football'],
    type: 'GROUP',
    isPrivate: false,
  },
  {
    id: 'db96fd04-edc8-4a0f-a955-9754a2a071cf',
    name: 'AI chat',
    description: 'Discussions on AI, LLMs, agents, and future tech',
    topics: ['ai', 'tech', 'coding'],
    type: 'GROUP',
    isPrivate: false,
  },
];

async function seedCommonRooms() {
  console.log('\n=============================================');
  console.log('   OpenSpace - Seed Common Chat Rooms        ');
  console.log('=============================================\n');

  const { prisma, env } = await import('./index.js');

  try {
    const dbUrl = new URL(env.DATABASE_URL);
    console.log(`Target Database Host: ${dbUrl.host}`);
    console.log(`Database Name:        ${dbUrl.pathname}`);
    console.log(`Environment Mode:     ${process.env.ENV_TARGET || (env.isDev ? 'local' : 'cloud')}\n`);
  } catch {
    console.log(`Database URL: configured\n`);
  }

  // 1. Check if public tables exist
  const existingTables = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
  );
  const tableNames = new Set(existingTables.map((t) => t.table_name.toLowerCase()));

  if (!tableNames.has('chatroom') || !tableNames.has('chatroommember') || !tableNames.has('user')) {
    console.error('ERROR: Required tables (ChatRoom, ChatRoomMember, User) do not exist in the database.');
    console.error('Please run database migrations or push the schema first:');
    console.error('  pnpm --filter @repo/db db:push\n');
    process.exit(1);
  }

  // 2. Inspect ChatRoom columns for backward & forward schema compatibility
  const chatRoomColumns = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
    `SELECT column_name FROM information_schema.columns WHERE lower(table_name) = 'chatroom' AND table_schema = 'public'`
  );
  const roomColSet = new Set(chatRoomColumns.map((c) => c.column_name.toLowerCase()));

  const hasTypeCol = roomColSet.has('type');
  const hasIsPrivateCol = roomColSet.has('isprivate');
  const hasTopicsCol = roomColSet.has('topics');
  const hasAvatarUrlCol = roomColSet.has('avatarurl');
  const hasDescriptionCol = roomColSet.has('description');
  const hasCreatorIdCol = roomColSet.has('creatorid');

  // 3. Find default creator user
  const allUsers = await prisma.user.findMany({
    select: { id: true, username: true, email: true },
    orderBy: { createdAt: 'asc' },
  });

  let defaultCreator = allUsers.find(
    (u) => u.username === 'anuj-admin' || u.username === 'catadmin'
  ) || allUsers[0] || null;

  if (defaultCreator) {
    console.log(`Default Room Creator: @${defaultCreator.username} (${defaultCreator.id})`);
  } else {
    console.log('Notice: No users found in database yet. Rooms will be created without creatorId.');
  }

  console.log(`Total existing users to enroll: ${allUsers.length}\n`);

  // 4. Create or verify each common room
  for (const roomDef of COMMON_ROOMS) {
    const existing = await prisma.$queryRawUnsafe<Array<{ id: string; name: string }>>(
      `SELECT id, name FROM "ChatRoom" WHERE id = $1`,
      roomDef.id
    );

    if (existing && existing.length > 0 && existing[0]) {
      console.log(`[EXISTS]  #${existing[0].name} (ID: ${roomDef.id})`);
    } else {
      // Build dynamic column insert based on schema columns
      const insertCols: string[] = ['"id"', '"name"', '"createdAt"', '"updatedAt"'];
      const insertParams: any[] = [roomDef.id, roomDef.name, new Date(), new Date()];
      let paramIdx = 5;

      if (hasDescriptionCol) {
        insertCols.push('"description"');
        insertParams.push(roomDef.description);
      }
      if (hasCreatorIdCol && defaultCreator) {
        insertCols.push('"creatorId"');
        insertParams.push(defaultCreator.id);
      }
      if (hasAvatarUrlCol) {
        insertCols.push('"avatarUrl"');
        insertParams.push(null);
      }
      if (hasTypeCol) {
        insertCols.push('"type"');
        insertParams.push(roomDef.type);
      }
      if (hasIsPrivateCol) {
        insertCols.push('"isPrivate"');
        insertParams.push(roomDef.isPrivate);
      }
      if (hasTopicsCol) {
        insertCols.push('"topics"');
        insertParams.push(roomDef.topics);
      }

      const placeholders = insertParams.map((_, i) => `$${i + 1}`).join(', ');
      const query = `INSERT INTO "ChatRoom" (${insertCols.join(', ')}) VALUES (${placeholders})`;

      await prisma.$executeRawUnsafe(query, ...insertParams);
      console.log(`[CREATED] #${roomDef.name} (ID: ${roomDef.id})`);
    }

    // 5. Enroll all existing users into the room
    if (allUsers.length > 0) {
      let enrolledCount = 0;
      for (const user of allUsers) {
        const isOwner = defaultCreator && user.id === defaultCreator.id;
        const role = isOwner ? 'OWNER' : 'MEMBER';
        const memberId = crypto.randomUUID();

        // Idempotent upsert via raw SQL for maximum compatibility
        await prisma.$executeRawUnsafe(
          `INSERT INTO "ChatRoomMember" ("id", "roomId", "userId", "role", "createdAt")
           VALUES ($1, $2, $3, $4::"RoomMemberRole", $5)
           ON CONFLICT ("roomId", "userId") DO NOTHING`,
          memberId,
          roomDef.id,
          user.id,
          role,
          new Date()
        );
        enrolledCount++;
      }
      console.log(`          Enrolled ${enrolledCount} users into #${roomDef.name}`);
    }

    // 6. Seed initial welcome message if room has zero messages
    if (defaultCreator) {
      const msgCountRes = await prisma.$queryRawUnsafe<Array<{ count: string | number }>>(
        `SELECT COUNT(*) as count FROM "ChatMessage" WHERE "roomId" = $1`,
        roomDef.id
      );
      const msgCount = Number(msgCountRes[0]?.count ?? 0);

      if (msgCount === 0) {
        const msgId = crypto.randomUUID();
        const welcomeText = `Welcome to #${roomDef.name}! Feel free to say hi.`;

        await prisma.$executeRawUnsafe(
          `INSERT INTO "ChatMessage" ("id", "roomId", "userId", "type", "text", "isDeleted", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, 'SYSTEM'::"MessageType", $4, false, $5, $6)`,
          msgId,
          roomDef.id,
          defaultCreator.id,
          welcomeText,
          new Date(),
          new Date()
        );
        console.log(`          Created initial system welcome message in #${roomDef.name}`);
      }
    }
  }

  // 7. Print final summary
  console.log('\n---------------------------------------------');
  console.log('   Summary of Seeded Chat Rooms              ');
  console.log('---------------------------------------------');

  const summary = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      name: string;
      member_count: string | number;
      message_count: string | number;
    }>
  >(
    `SELECT r.id, r.name,
            COUNT(DISTINCT m.id) as member_count,
            COUNT(DISTINCT msg.id) as message_count
     FROM "ChatRoom" r
     LEFT JOIN "ChatRoomMember" m ON r.id = m."roomId"
     LEFT JOIN "ChatMessage" msg ON r.id = msg."roomId"
     WHERE r.id IN ($1, $2, $3)
     GROUP BY r.id, r.name
     ORDER BY r.name ASC`,
    COMMON_ROOMS[0]!.id,
    COMMON_ROOMS[1]!.id,
    COMMON_ROOMS[2]!.id
  );

  console.table(
    summary.map((s) => ({
      ID: s.id,
      Name: s.name,
      Members: Number(s.member_count),
      Messages: Number(s.message_count),
    }))
  );

  console.log('All 3 common chat rooms are ready!\n');
}

seedCommonRooms()
  .catch((err) => {
    console.error('\nSeed failed with error:', err);
    process.exit(1);
  })
  .finally(async () => {
    try {
      const { prisma } = await import('./index.js');
      await prisma.$disconnect();
    } catch {}
  });
