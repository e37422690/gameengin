import express from 'express';
import fs from 'fs';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server as SocketIOServer } from 'socket.io';
import {
  canStartMatch,
  createInitialPlayerState,
  generateParkourCourse,
  pickDistinctEggColors,
} from './src/game/rules';
import {
  ChatMessage,
  PlayerState,
  RoomState,
  WinnerItemType,
} from './src/game/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface InternalRoom {
  state: RoomState;
  usedSignatures: Set<string>;
  lastColorPairSig: string;
  socketSlots: Map<string, 1 | 2>;
  selectedWinnerItemBySlot: Record<1 | 2, WinnerItemType>;
}

const rooms = new Map<string, InternalRoom>();

const REWARD_POOL: WinnerItemType[] = [
  'GOLDEN_WINGS',
  'TURBO_SPRING',
  'PHASE_DASH',
];

function getOrCreateRoom(roomId: string): InternalRoom {
  const cleanId = (roomId || 'KULE-01').trim().toUpperCase().slice(0, 16);
  let room = rooms.get(cleanId);
  if (!room) {
    const usedSignatures = new Set<string>();
    const initialSeed = (Date.now() ^ (cleanId.charCodeAt(0) * 9973)) >>> 0;
    const course = generateParkourCourse(initialSeed, usedSignatures);
    const colors = pickDistinctEggColors(initialSeed);

    room = {
      usedSignatures,
      lastColorPairSig: colors.pairSignature,
      socketSlots: new Map(),
      selectedWinnerItemBySlot: { 1: 'NONE', 2: 'NONE' },
      state: {
        roomId: cleanId,
        phase: 'lobby',
        countdownSeconds: 0,
        matchNumber: 1,
        course,
        players: { 1: null, 2: null },
        winnerSlot: null,
        winnerName: null,
        awardedItem: 'GOLDEN_WINGS',
        startedAt: null,
        chatHistory: [
          {
            id: `sys-${Date.now()}`,
            senderId: 'system',
            senderName: 'KULE SİSTEMİ',
            senderColor: '#38bdf8',
            slot: 0,
            text: `${cleanId} odası hazır. İki oyuncu da ONAY verdiğinde cam bölmeli yarış başlar!`,
            timestamp: Date.now(),
            isSystem: true,
          },
        ],
      },
    };
    rooms.set(cleanId, room);
  }
  return room;
}

function appendSystemChat(room: InternalRoom, text: string) {
  const msg: ChatMessage = {
    id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    senderId: 'system',
    senderName: 'KULE SİSTEMİ',
    senderColor: '#38bdf8',
    slot: 0,
    text,
    timestamp: Date.now(),
    isSystem: true,
  };
  room.state.chatHistory.push(msg);
  if (room.state.chatHistory.length > 50) {
    room.state.chatHistory.shift();
  }
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: { origin: '*' },
  });

  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      activeRooms: rooms.size,
      timestamp: Date.now(),
    });
  });

  app.get('/api/rooms', (_req, res) => {
    const list = Array.from(rooms.values()).map((r) => ({
      roomId: r.state.roomId,
      phase: r.state.phase,
      matchNumber: r.state.matchNumber,
      p1: r.state.players[1]?.name || null,
      p2: r.state.players[2]?.name || null,
    }));
    res.json({ rooms: list });
  });

  io.on('connection', (socket) => {
    let currentRoomId: string | null = null;
    let lastChatTime = 0;

    socket.on(
      'room:join',
      (payload: { roomId?: string; playerName?: string; autoReadyWithBot?: boolean }) => {
        const targetRoomId = (payload.roomId || 'KULE-01').trim().toUpperCase();
        const playerName =
          (payload.playerName || 'Yumurta Koşucu').trim().slice(0, 20) || 'Yumurta Koşucu';

        if (currentRoomId && currentRoomId !== targetRoomId) {
          socket.leave(currentRoomId);
        }
        currentRoomId = targetRoomId;
        socket.join(targetRoomId);

        const room = getOrCreateRoom(targetRoomId);
        const colors = pickDistinctEggColors(
          room.state.course.seed + room.state.matchNumber * 31,
          room.lastColorPairSig,
        );
        room.lastColorPairSig = colors.pairSignature;

        // Assign Slot 1 or Slot 2
        let assignedSlot: 1 | 2 = 1;
        if (!room.state.players[1] || room.state.players[1].id === socket.id) {
          assignedSlot = 1;
        } else if (
          !room.state.players[2] ||
          room.state.players[2].id === socket.id ||
          room.state.players[2].isBot
        ) {
          assignedSlot = 2;
        } else {
          // Room has 2 active players; create a dynamic sub-room so player is never blocked
          const altId = `${targetRoomId}-${Math.floor(10 + Math.random() * 89)}`;
          socket.leave(targetRoomId);
          currentRoomId = altId;
          socket.join(altId);
          const altRoom = getOrCreateRoom(altId);
          altRoom.socketSlots.set(socket.id, 1);
          const altColors = pickDistinctEggColors(altRoom.state.course.seed);
          altRoom.state.players[1] = createInitialPlayerState(
            socket.id,
            1,
            playerName,
            altColors.p1,
            'NONE',
            false,
          );
          socket.emit('room:joined', {
            slot: 1,
            roomId: altId,
            state: altRoom.state,
          });
          io.to(altId).emit('room:state', altRoom.state);
          return;
        }

        room.socketSlots.set(socket.id, assignedSlot);
        const chosenColor = assignedSlot === 1 ? colors.p1 : colors.p2;
        const carryItem = room.selectedWinnerItemBySlot[assignedSlot] || 'NONE';

        room.state.players[assignedSlot] = createInitialPlayerState(
          socket.id,
          assignedSlot,
          playerName,
          chosenColor,
          carryItem,
          false,
        );

        appendSystemChat(
          room,
          `${playerName} (${chosenColor.name}) Oda ${assignedSlot === 1 ? 'Sol' : 'Sağ'} Cam Bölmesine katıldı.`,
        );

        // If autoReadyWithBot is requested (e.g. ?autostart=1 or instant duo test mode)
        if (payload.autoReadyWithBot) {
          room.state.players[assignedSlot]!.ready = true;
          const otherSlot: 1 | 2 = assignedSlot === 1 ? 2 : 1;
          if (!room.state.players[otherSlot]) {
            const botColor = otherSlot === 1 ? colors.p1 : colors.p2;
            room.state.players[otherSlot] = createInitialPlayerState(
              `bot-${targetRoomId}`,
              otherSlot,
              'Cam Rakip (Yumurta-X)',
              botColor,
              room.selectedWinnerItemBySlot[otherSlot] || 'NONE',
              true,
            );
          } else {
            room.state.players[otherSlot]!.ready = true;
          }
          if (canStartMatch(room.state.players[1], room.state.players[2])) {
            room.state.phase = 'playing';
            room.state.startedAt = Date.now();
            appendSystemChat(room, 'Her iki oyuncu da ONAY verdi! Yarış başladı!');
          }
        }

        socket.emit('room:joined', {
          slot: assignedSlot,
          roomId: room.state.roomId,
          state: room.state,
        });
        io.to(room.state.roomId).emit('room:state', room.state);
      },
    );

    socket.on('room:add_bot_partner', () => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      if (!room) return;

      const colors = pickDistinctEggColors(
        room.state.course.seed + room.state.matchNumber * 97,
        room.lastColorPairSig,
      );
      const emptySlot: 1 | 2 | null = !room.state.players[2]
        ? 2
        : !room.state.players[1]
          ? 1
          : null;

      if (emptySlot) {
        const botColor = emptySlot === 1 ? colors.p1 : colors.p2;
        room.state.players[emptySlot] = createInitialPlayerState(
          `bot-${room.state.roomId}`,
          emptySlot,
          'Cam Rakip (Yumurta-X)',
          botColor,
          room.selectedWinnerItemBySlot[emptySlot] || 'NONE',
          true,
        );
        appendSystemChat(
          room,
          `Cam Rakip (${botColor.name}) yan cam odaya girdi ve ONAY verdi!`,
        );
        if (canStartMatch(room.state.players[1], room.state.players[2])) {
          room.state.phase = 'playing';
          room.state.startedAt = Date.now();
          appendSystemChat(room, 'İki oyuncu da ONAY verdi! Parkur başladı!');
        }
        io.to(room.state.roomId).emit('room:state', room.state);
      }
    });

    socket.on('player:toggle_ready', (payload?: { ready?: boolean; winnerItem?: WinnerItemType }) => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      if (!room) return;
      const slot = room.socketSlots.get(socket.id);
      if (!slot) return;
      const player = room.state.players[slot];
      if (!player) return;

      if (payload?.winnerItem && room.state.winnerSlot === slot) {
        room.selectedWinnerItemBySlot[slot] = payload.winnerItem;
        player.winnerItem = payload.winnerItem;
      }

      player.ready =
        typeof payload?.ready === 'boolean' ? payload.ready : !player.ready;

      appendSystemChat(
        room,
        `${player.name} hazırlık durumu: ${player.ready ? 'ONAY VERDİ' : 'BEKLİYOR'}`,
      );

      if (
        room.state.phase === 'lobby' &&
        canStartMatch(room.state.players[1], room.state.players[2])
      ) {
        room.state.phase = 'playing';
        room.state.startedAt = Date.now();
        appendSystemChat(
          room,
          `Her iki oyuncu da ONAY verdi! ${room.state.matchNumber}. Parkur Yarışı başladı!`,
        );
      }

      io.to(room.state.roomId).emit('room:state', room.state);
    });

    socket.on('player:sync', (snapshot: Partial<PlayerState>) => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      if (!room) return;
      const slot = snapshot.slot || room.socketSlots.get(socket.id);
      if (!slot) return;

      const target = room.state.players[slot];
      if (!target) return;

      // Update server authoritative coordinates
      if (snapshot.position) target.position = snapshot.position;
      if (snapshot.velocity) target.velocity = snapshot.velocity;
      if (typeof snapshot.yaw === 'number') target.yaw = snapshot.yaw;
      if (typeof snapshot.grounded === 'boolean') target.grounded = snapshot.grounded;
      if (typeof snapshot.currentFloor === 'number')
        target.currentFloor = snapshot.currentFloor;
      if (typeof snapshot.highestCheckpointFloor === 'number')
        target.highestCheckpointFloor = snapshot.highestCheckpointFloor;
      if (snapshot.checkpointPos) target.checkpointPos = snapshot.checkpointPos;
      if (typeof snapshot.progress === 'number') target.progress = snapshot.progress;
      if (typeof snapshot.respawnCount === 'number')
        target.respawnCount = snapshot.respawnCount;
      if (typeof snapshot.antiGlitchTriggers === 'number')
        target.antiGlitchTriggers = snapshot.antiGlitchTriggers;

      // Check finish condition
      if (snapshot.finished && !target.finished && room.state.phase === 'playing') {
        target.finished = true;
        target.progress = 100;
        target.finishTimeMs = room.state.startedAt
          ? Date.now() - room.state.startedAt
          : 45000;

        if (!room.state.winnerSlot) {
          room.state.winnerSlot = slot;
          room.state.winnerName = target.name;
          room.state.phase = 'finished';

          // Pick special item reward for the winner
          const rewardItem =
            REWARD_POOL[(room.state.matchNumber - 1) % REWARD_POOL.length];
          room.state.awardedItem = rewardItem;
          room.selectedWinnerItemBySlot = {
            1: slot === 1 ? rewardItem : 'NONE',
            2: slot === 2 ? rewardItem : 'NONE',
          };

          appendSystemChat(
            room,
            `ŞAMPİYON ${target.name}! Son katı ilk bitiren oldu ve "${rewardItem === 'GOLDEN_WINGS' ? 'Altın Yumurta Kanatları' : rewardItem === 'TURBO_SPRING' ? 'Kuantum Yay Çizmeleri' : 'Foton Sırt Roketi'}" özel eşyasını kazandı!`,
          );
          io.to(room.state.roomId).emit('room:state', room.state);
          return;
        }
      }

      socket.to(room.state.roomId).emit('player:remote_update', {
        slot,
        player: target,
      });
    });

    socket.on(
      'room:rematch',
      (payload?: { chosenWinnerItem?: WinnerItemType; autoStart?: boolean }) => {
        if (!currentRoomId) return;
        const room = rooms.get(currentRoomId);
        if (!room) return;

        room.state.matchNumber += 1;
        const newSeed =
          (Date.now() ^ (room.state.matchNumber * 2654435761)) >>> 0;

        // Generate a brand-new procedural parkour that NEVER repeats previous signatures
        const newCourse = generateParkourCourse(newSeed, room.usedSignatures);
        // Generate brand-new Egg colors that NEVER repeat previous match colors
        const newColors = pickDistinctEggColors(newSeed, room.lastColorPairSig);
        room.lastColorPairSig = newColors.pairSignature;

        const prevWinnerSlot = room.state.winnerSlot;
        const chosenItem =
          payload?.chosenWinnerItem || room.state.awardedItem || 'GOLDEN_WINGS';

        if (prevWinnerSlot) {
          room.selectedWinnerItemBySlot[prevWinnerSlot] = chosenItem;
          const loserSlot: 1 | 2 = prevWinnerSlot === 1 ? 2 : 1;
          room.selectedWinnerItemBySlot[loserSlot] = 'NONE';
        }

        room.state.course = newCourse;
        room.state.winnerSlot = null;
        room.state.winnerName = null;

        ([1, 2] as const).forEach((s) => {
          const existing = room.state.players[s];
          if (existing) {
            const c = s === 1 ? newColors.p1 : newColors.p2;
            const itemForNextRun = room.selectedWinnerItemBySlot[s] || 'NONE';
            const refreshed = createInitialPlayerState(
              existing.id,
              s,
              existing.name,
              c,
              itemForNextRun,
              existing.isBot,
            );
            if (payload?.autoStart || existing.isBot) {
              refreshed.ready = true;
            }
            room.state.players[s] = refreshed;
          }
        });

        if (
          payload?.autoStart &&
          canStartMatch(room.state.players[1], room.state.players[2])
        ) {
          room.state.phase = 'playing';
          room.state.startedAt = Date.now();
          appendSystemChat(
            room,
            `Yeni Parkur (#${room.state.matchNumber}) ve yeni yumurta renkleri oluşturuldu! Özel eşya aktif!`,
          );
        } else {
          room.state.phase = 'lobby';
          room.state.startedAt = null;
          appendSystemChat(
            room,
            `Yeni Parkur (#${room.state.matchNumber}) hazırlandı! Yumurta renkleri yenilendi. Başlamak için her iki oyuncunun ONAY vermesi bekleniyor.`,
          );
        }

        io.to(room.state.roomId).emit('room:state', room.state);
      },
    );

    socket.on('chat:send', (payload: { text?: string }) => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      if (!room) return;

      const now = Date.now();
      if (now - lastChatTime < 250) return; // Anti-spam rate limit
      lastChatTime = now;

      const rawText = String(payload?.text || '').trim();
      if (!rawText) return;
      const cleanText = rawText.slice(0, 180);

      const slot = room.socketSlots.get(socket.id) || 1;
      const sender = room.state.players[slot];

      const msg: ChatMessage = {
        id: `msg-${now}-${Math.random().toString(36).slice(2, 6)}`,
        senderId: socket.id,
        senderName: sender?.name || `Oyuncu ${slot}`,
        senderColor: sender?.eggColor || '#f8fafc',
        slot,
        text: cleanText,
        timestamp: now,
      };

      room.state.chatHistory.push(msg);
      if (room.state.chatHistory.length > 50) {
        room.state.chatHistory.shift();
      }

      io.to(room.state.roomId).emit('chat:message', msg);
    });

    socket.on('disconnect', () => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      if (!room) return;
      const slot = room.socketSlots.get(socket.id);
      if (slot && room.state.players[slot]?.id === socket.id) {
        const leavingName = room.state.players[slot]?.name || `Oyuncu ${slot}`;
        room.state.players[slot] = null;
        room.socketSlots.delete(socket.id);
        if (room.state.phase === 'lobby') {
          appendSystemChat(room, `${leavingName} odadan ayrıldı.`);
        }
        io.to(room.state.roomId).emit('room:state', room.state);
      }
    });
  });

  const distPath = path.join(__dirname, 'dist');
  const hasDist = fs.existsSync(path.join(distPath, 'index.html'));

  if (process.env.NODE_ENV === 'production' || hasDist) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = Number(process.env.PORT) || 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Cam Kule: İkiz Parkur server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
