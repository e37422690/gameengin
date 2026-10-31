// server.ts
import express from "express";
import fs from "fs";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { Server as SocketIOServer } from "socket.io";

// src/game/rules.ts
var CHAMBER_OFFSET_X = 9;
var WINNER_ITEMS = {
  NONE: {
    id: "NONE",
    name: "Standart Yumurta",
    shortDesc: "Standart tekli z\u0131plama ve ko\u015Fu fizi\u011Fi",
    badgeColor: "#94a3b8",
    extraAirJumps: 0,
    dashCooldown: 0,
    speedBonus: 1
  },
  GOLDEN_WINGS: {
    id: "GOLDEN_WINGS",
    name: "Alt\u0131n Yumurta Kanatlar\u0131",
    shortDesc: "Havada +1 Ekstra Z\u0131plama [Space] ve Havada At\u0131lma [E / Shift]",
    badgeColor: "#f59e0b",
    extraAirJumps: 1,
    dashCooldown: 2.2,
    speedBonus: 1.12
  },
  TURBO_SPRING: {
    id: "TURBO_SPRING",
    name: "Kuantum Yay \xC7izmeleri",
    shortDesc: "Havada +2 Ekstra Z\u0131plama [Space] ve %18 H\u0131z Avantaj\u0131",
    badgeColor: "#10b981",
    extraAirJumps: 2,
    dashCooldown: 3,
    speedBonus: 1.18
  },
  PHASE_DASH: {
    id: "PHASE_DASH",
    name: "Foton S\u0131rt Roketi",
    shortDesc: "Havada Z\u0131plama + H\u0131zl\u0131 \u0130leri F\u0131rlama [E / Shift] (1.4sn dolum)",
    badgeColor: "#06b6d4",
    extraAirJumps: 1,
    dashCooldown: 1.4,
    speedBonus: 1.15
  }
};
var EGG_COLOR_PALETTE = [
  { shell: "#FF6B6B", limb: "#FFE66D", cheek: "#FF8E8E", name: "Mercan Yumurta" },
  { shell: "#38BDF8", limb: "#FDE047", cheek: "#F472B6", name: "Buzul Yumurta" },
  { shell: "#34D399", limb: "#FBBF24", cheek: "#FB7185", name: "Z\xFCmr\xFCt Yumurta" },
  { shell: "#FBBF24", limb: "#FB7185", cheek: "#F97316", name: "Alt\u0131n Sar\u0131s\u0131" },
  { shell: "#A78BFA", limb: "#34D399", cheek: "#F472B6", name: "Lavanta Yumurta" },
  { shell: "#FB923C", limb: "#38BDF8", cheek: "#F43F5E", name: "Mandalina Yumurta" },
  { shell: "#F472B6", limb: "#A3E635", cheek: "#FB7185", name: "\u015Eeker Pembe" },
  { shell: "#2DD4BF", limb: "#FACC15", cheek: "#FB923C", name: "Turkuaz Yumurta" },
  { shell: "#E879F9", limb: "#fde047", cheek: "#38bdf8", name: "Orkide Yumurta" },
  { shell: "#A3E635", limb: "#38BDF8", cheek: "#F97316", name: "Limon Yumurta" }
];
var FLOOR_THEMES = [
  {
    themeId: "emerald_atrium",
    title: "Kat 1: Z\xFCmr\xFCt Sera",
    subtitle: "Biyo-Kubbe Ba\u015Flang\u0131\xE7 Parkuru",
    primaryColor: "#10b981",
    secondaryColor: "#1e293b",
    accentColor: "#34d399",
    fogColor: "#07171e",
    lightColor: "#a7f3d0"
  },
  {
    themeId: "clockwork_foundry",
    title: "Kat 2: Kehribar Saat Kulesi",
    subtitle: "Sal\u0131n\u0131ml\u0131 Sarka\xE7lar ve Di\u015Fli K\xF6pr\xFCler",
    primaryColor: "#d97706",
    secondaryColor: "#271c15",
    accentColor: "#fbbf24",
    fogColor: "#18110c",
    lightColor: "#fde68a"
  },
  {
    themeId: "cryo_lab",
    title: "Kat 3: Kristal Buzul Laboratuvar\u0131",
    subtitle: "Dar Kristal Ge\xE7itler ve Lazer S\xFCp\xFCr\xFCc\xFCler",
    primaryColor: "#0284c7",
    secondaryColor: "#0f172a",
    accentColor: "#38bdf8",
    fogColor: "#081426",
    lightColor: "#bae6fd"
  },
  {
    themeId: "obsidian_reactor",
    title: "Kat 4: Volkanik Magma Reakt\xF6r\xFC",
    subtitle: "Y\xFCkselen Pistonlar ve Enerji Plakalar\u0131",
    primaryColor: "#e11d48",
    secondaryColor: "#231017",
    accentColor: "#fb7185",
    fogColor: "#1b0b12",
    lightColor: "#fecdd3"
  },
  {
    themeId: "celestial_crown",
    title: "Kat 5: G\xF6ky\xFCz\xFC Tac\u0131 (Final Kat\u0131)",
    subtitle: "Zirve Y\xFCkseli\u015Fi ve \u015Eampiyonluk Podyumu",
    primaryColor: "#eab308",
    secondaryColor: "#1e1b4b",
    accentColor: "#fde047",
    fogColor: "#0d102b",
    lightColor: "#fef08a"
  }
];
var ANOMALY_CATALOG = {
  NONE: {
    title: "Standart Atmosfer",
    description: "Normal yer\xE7ekimi ve standart zemin tutu\u015Fu aktif."
  },
  SLIPPERY_GROUND: {
    title: "\xD6ZEL ETK\u0130NL\u0130K: Buzlu Kaygan Zemin!",
    description: "Bu katta yerler a\u015F\u0131r\u0131 kaygan! Durmak ve y\xF6n de\u011Fi\u015Ftirmek dikkat ister."
  },
  INVERTED_CONTROLS: {
    title: "\xD6ZEL ETK\u0130NL\u0130K: Ters Kontroller!",
    description: "Bu katta Sa\u011F/Sol ve \u0130leri/Geri y\xF6n tu\u015Flar\u0131 ters \xE7al\u0131\u015F\u0131yor!"
  },
  LOW_GRAVITY: {
    title: "\xD6ZEL ETK\u0130NL\u0130K: Ay Yer\xE7ekimi!",
    description: "Bu katta yer\xE7ekimi %45 azald\u0131! \xC7ok daha y\xFCkse\u011Fe ve uza\u011Fa z\u0131pl\u0131yorsun."
  },
  HYPER_TURBO: {
    title: "\xD6ZEL ETK\u0130NL\u0130K: H\u0131z Koridoru!",
    description: "Bu katta ko\u015Fu h\u0131z\u0131 %45 artt\u0131! Reflekslerini haz\u0131r tut."
  },
  EARTHQUAKE_TREMOR: {
    title: "\xD6ZEL ETK\u0130NL\u0130K: Sismik Sars\u0131nt\u0131!",
    description: "Bu katta zemin periyodik olarak sallan\u0131yor ve yana savuruyor!"
  }
};
function createSeededRng(seed) {
  let a = seed >>> 0;
  return function() {
    let t = a += 1831565813;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function pickDistinctEggColors(seed, previousPairSignature) {
  let attemptSeed = seed;
  for (let attempt = 0; attempt < 16; attempt++) {
    const rng = createSeededRng(attemptSeed + attempt * 9973);
    const idx1 = Math.floor(rng() * EGG_COLOR_PALETTE.length);
    let idx2 = Math.floor(rng() * (EGG_COLOR_PALETTE.length - 1));
    if (idx2 >= idx1) idx2 += 1;
    const sig = `${idx1}-${idx2}`;
    if (sig !== previousPairSignature) {
      return {
        p1: EGG_COLOR_PALETTE[idx1],
        p2: EGG_COLOR_PALETTE[idx2],
        pairSignature: sig
      };
    }
  }
  return {
    p1: EGG_COLOR_PALETTE[0],
    p2: EGG_COLOR_PALETTE[1],
    pairSignature: "0-1"
  };
}
function generateParkourCourse(baseSeed, usedSignatures = /* @__PURE__ */ new Set()) {
  let currentSeed = baseSeed >>> 0;
  if (currentSeed === 0) currentSeed = 133742;
  for (let retry = 0; retry < 32; retry++) {
    const seedToTry = currentSeed + retry * 7919 >>> 0;
    const rng = createSeededRng(seedToTry);
    const floors = [];
    const platforms = [];
    const signatureParts = [];
    const possibleAnomalies = [
      "SLIPPERY_GROUND",
      "INVERTED_CONTROLS",
      "LOW_GRAVITY",
      "HYPER_TURBO",
      "EARTHQUAKE_TREMOR"
    ];
    const floorAnomalies = ["NONE", "NONE", "NONE", "NONE", "NONE"];
    let anomalyCount = 0;
    for (let f = 1; f < 5; f++) {
      if (rng() < 0.42) {
        const pick = possibleAnomalies[Math.floor(rng() * possibleAnomalies.length)];
        floorAnomalies[f] = pick;
        anomalyCount++;
      }
    }
    if (anomalyCount === 0) {
      const guaranteedFloor = 1 + Math.floor(rng() * 3);
      const pick = possibleAnomalies[Math.floor(rng() * possibleAnomalies.length)];
      floorAnomalies[guaranteedFloor] = pick;
    }
    let cursorZ = 0;
    let cursorY = 0;
    for (let f = 0; f < 5; f++) {
      const theme = FLOOR_THEMES[f];
      const anomaly = floorAnomalies[f];
      const anomalyMeta = ANOMALY_CATALOG[anomaly];
      floors.push({
        themeId: theme.themeId,
        floorNumber: f + 1,
        title: theme.title,
        subtitle: theme.subtitle,
        primaryColor: theme.primaryColor,
        secondaryColor: theme.secondaryColor,
        accentColor: theme.accentColor,
        fogColor: theme.fogColor,
        lightColor: theme.lightColor,
        anomaly,
        anomalyTitle: anomalyMeta.title,
        anomalyDescription: anomalyMeta.description
      });
      const checkpointId = `f${f + 1}_checkpoint`;
      platforms.push({
        id: checkpointId,
        floorIndex: f,
        kind: "checkpoint",
        localX: 0,
        y: cursorY,
        z: cursorZ,
        width: 5.8,
        height: 0.7,
        depth: 5.8
      });
      let prevX = 0;
      const stepsInFloor = 6;
      for (let s = 0; s < stepsInFloor; s++) {
        const stepGapZ = 4.8 + rng() * 1.5;
        cursorZ -= stepGapZ;
        const stepClimbY = 0.55 + rng() * 0.55;
        cursorY += stepClimbY;
        const maxDeltaX = 2.8;
        const rawTargetX = (rng() - 0.5) * 6.4;
        const clampedX = Math.max(
          -3.4,
          Math.min(
            3.4,
            prevX + Math.max(-maxDeltaX, Math.min(maxDeltaX, rawTargetX - prevX))
          )
        );
        const roll = rng();
        let kind = "standard";
        let width = 3.2 - f * 0.12;
        let depth = 3.2 - f * 0.1;
        let moveAmp = 0;
        let moveSpeed = 0;
        let movePhase = rng() * Math.PI * 2;
        let hazardSpeed = 0;
        if (anomaly === "SLIPPERY_GROUND" && roll < 0.55) {
          kind = "ice_pad";
          width = 3.4;
          depth = 3.6;
        } else if (roll < 0.22) {
          kind = "moving_x";
          width = 3;
          depth = 3;
          moveAmp = 1.6 + rng() * 0.9;
          moveSpeed = 1.2 + rng() * 0.7;
        } else if (roll < 0.38) {
          kind = "moving_y";
          width = 3;
          depth = 3;
          moveAmp = 0.75 + rng() * 0.45;
          moveSpeed = 1.3 + rng() * 0.6;
        } else if (roll < 0.54) {
          kind = "narrow_beam";
          width = 1.95;
          depth = 4.2;
        } else if (roll < 0.7) {
          kind = "bounce_pad";
          width = 2.9;
          depth = 2.9;
        } else if (f >= 1 && roll < 0.86) {
          kind = "sweeper_hazard";
          width = 3.5;
          depth = 3.5;
          hazardSpeed = 1.6 + f * 0.25;
        } else {
          kind = "standard";
        }
        const finalLocalX = kind === "moving_x" ? 0 : Number(clampedX.toFixed(2));
        prevX = finalLocalX;
        signatureParts.push(`${f}:${kind}:${Math.round(finalLocalX)}:${anomaly}`);
        platforms.push({
          id: `f${f + 1}_step${s + 1}`,
          floorIndex: f,
          kind,
          localX: finalLocalX,
          y: Number(cursorY.toFixed(2)),
          z: Number(cursorZ.toFixed(2)),
          width: Number(width.toFixed(2)),
          height: 0.6,
          depth: Number(depth.toFixed(2)),
          moveAmp: Number(moveAmp.toFixed(2)),
          moveSpeed: Number(moveSpeed.toFixed(2)),
          movePhase: Number(movePhase.toFixed(2)),
          hazardSpeed: Number(hazardSpeed.toFixed(2))
        });
      }
      cursorZ -= 5.4;
      cursorY += 0.9;
    }
    const finishZ = Number(cursorZ.toFixed(2));
    platforms.push({
      id: "finish_podium",
      floorIndex: 4,
      kind: "finish_podium",
      localX: 0,
      y: Number(cursorY.toFixed(2)),
      z: finishZ,
      width: 6.4,
      height: 0.9,
      depth: 6.4
    });
    const signature = signatureParts.join("|");
    if (!usedSignatures.has(signature)) {
      usedSignatures.add(signature);
      return {
        seed: seedToTry,
        signature,
        createdAt: Date.now(),
        totalFloors: 5,
        startZ: 0,
        finishZ,
        floors,
        platforms
      };
    }
  }
  const fallbackSeed = (Date.now() & 2147483647) >>> 0;
  return generateParkourCourse(fallbackSeed + 17, /* @__PURE__ */ new Set());
}
function createInitialPlayerState(id, slot, name, colors, winnerItem = "NONE", isBot = false) {
  const startX = slot === 1 ? -CHAMBER_OFFSET_X : CHAMBER_OFFSET_X;
  const startPos = { x: startX, y: 0.9, z: 0 };
  const itemSpec = WINNER_ITEMS[winnerItem] || WINNER_ITEMS.NONE;
  return {
    id,
    slot,
    name,
    isBot,
    ready: isBot,
    eggColor: colors.shell,
    limbColor: colors.limb,
    cheekColor: colors.cheek,
    position: { ...startPos },
    velocity: { x: 0, y: 0, z: 0 },
    yaw: 0,
    grounded: true,
    currentFloor: 1,
    highestCheckpointFloor: 1,
    checkpointPos: { ...startPos },
    progress: 0,
    finished: false,
    finishTimeMs: null,
    winnerItem,
    airJumpsLeft: itemSpec.extraAirJumps,
    dashCooldownLeft: 0,
    respawnCount: 0,
    antiGlitchTriggers: 0
  };
}
function canStartMatch(p1, p2) {
  return Boolean(p1 && p2 && p1.ready && p2.ready);
}

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var rooms = /* @__PURE__ */ new Map();
var REWARD_POOL = [
  "GOLDEN_WINGS",
  "TURBO_SPRING",
  "PHASE_DASH"
];
function getOrCreateRoom(roomId) {
  const cleanId = (roomId || "KULE-01").trim().toUpperCase().slice(0, 16);
  let room = rooms.get(cleanId);
  if (!room) {
    const usedSignatures = /* @__PURE__ */ new Set();
    const initialSeed = (Date.now() ^ cleanId.charCodeAt(0) * 9973) >>> 0;
    const course = generateParkourCourse(initialSeed, usedSignatures);
    const colors = pickDistinctEggColors(initialSeed);
    room = {
      usedSignatures,
      lastColorPairSig: colors.pairSignature,
      socketSlots: /* @__PURE__ */ new Map(),
      selectedWinnerItemBySlot: { 1: "NONE", 2: "NONE" },
      state: {
        roomId: cleanId,
        phase: "lobby",
        countdownSeconds: 0,
        matchNumber: 1,
        course,
        players: { 1: null, 2: null },
        winnerSlot: null,
        winnerName: null,
        awardedItem: "GOLDEN_WINGS",
        startedAt: null,
        chatHistory: [
          {
            id: `sys-${Date.now()}`,
            senderId: "system",
            senderName: "KULE S\u0130STEM\u0130",
            senderColor: "#38bdf8",
            slot: 0,
            text: `${cleanId} odas\u0131 haz\u0131r. \u0130ki oyuncu da ONAY verdi\u011Finde cam b\xF6lmeli yar\u0131\u015F ba\u015Flar!`,
            timestamp: Date.now(),
            isSystem: true
          }
        ]
      }
    };
    rooms.set(cleanId, room);
  }
  return room;
}
function appendSystemChat(room, text) {
  const msg = {
    id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    senderId: "system",
    senderName: "KULE S\u0130STEM\u0130",
    senderColor: "#38bdf8",
    slot: 0,
    text,
    timestamp: Date.now(),
    isSystem: true
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
    cors: { origin: "*" }
  });
  app.use(express.json());
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      activeRooms: rooms.size,
      timestamp: Date.now()
    });
  });
  app.get("/api/rooms", (_req, res) => {
    const list = Array.from(rooms.values()).map((r) => ({
      roomId: r.state.roomId,
      phase: r.state.phase,
      matchNumber: r.state.matchNumber,
      p1: r.state.players[1]?.name || null,
      p2: r.state.players[2]?.name || null
    }));
    res.json({ rooms: list });
  });
  io.on("connection", (socket) => {
    let currentRoomId = null;
    let lastChatTime = 0;
    socket.on(
      "room:join",
      (payload) => {
        const targetRoomId = (payload.roomId || "KULE-01").trim().toUpperCase();
        const playerName = (payload.playerName || "Yumurta Ko\u015Fucu").trim().slice(0, 20) || "Yumurta Ko\u015Fucu";
        if (currentRoomId && currentRoomId !== targetRoomId) {
          socket.leave(currentRoomId);
        }
        currentRoomId = targetRoomId;
        socket.join(targetRoomId);
        const room = getOrCreateRoom(targetRoomId);
        const colors = pickDistinctEggColors(
          room.state.course.seed + room.state.matchNumber * 31,
          room.lastColorPairSig
        );
        room.lastColorPairSig = colors.pairSignature;
        let assignedSlot = 1;
        if (!room.state.players[1] || room.state.players[1].id === socket.id) {
          assignedSlot = 1;
        } else if (!room.state.players[2] || room.state.players[2].id === socket.id || room.state.players[2].isBot) {
          assignedSlot = 2;
        } else {
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
            "NONE",
            false
          );
          socket.emit("room:joined", {
            slot: 1,
            roomId: altId,
            state: altRoom.state
          });
          io.to(altId).emit("room:state", altRoom.state);
          return;
        }
        room.socketSlots.set(socket.id, assignedSlot);
        const chosenColor = assignedSlot === 1 ? colors.p1 : colors.p2;
        const carryItem = room.selectedWinnerItemBySlot[assignedSlot] || "NONE";
        room.state.players[assignedSlot] = createInitialPlayerState(
          socket.id,
          assignedSlot,
          playerName,
          chosenColor,
          carryItem,
          false
        );
        appendSystemChat(
          room,
          `${playerName} (${chosenColor.name}) Oda ${assignedSlot === 1 ? "Sol" : "Sa\u011F"} Cam B\xF6lmesine kat\u0131ld\u0131.`
        );
        if (payload.autoReadyWithBot) {
          room.state.players[assignedSlot].ready = true;
          const otherSlot = assignedSlot === 1 ? 2 : 1;
          if (!room.state.players[otherSlot]) {
            const botColor = otherSlot === 1 ? colors.p1 : colors.p2;
            room.state.players[otherSlot] = createInitialPlayerState(
              `bot-${targetRoomId}`,
              otherSlot,
              "Cam Rakip (Yumurta-X)",
              botColor,
              room.selectedWinnerItemBySlot[otherSlot] || "NONE",
              true
            );
          } else {
            room.state.players[otherSlot].ready = true;
          }
          if (canStartMatch(room.state.players[1], room.state.players[2])) {
            room.state.phase = "playing";
            room.state.startedAt = Date.now();
            appendSystemChat(room, "Her iki oyuncu da ONAY verdi! Yar\u0131\u015F ba\u015Flad\u0131!");
          }
        }
        socket.emit("room:joined", {
          slot: assignedSlot,
          roomId: room.state.roomId,
          state: room.state
        });
        io.to(room.state.roomId).emit("room:state", room.state);
      }
    );
    socket.on("room:add_bot_partner", () => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      if (!room) return;
      const colors = pickDistinctEggColors(
        room.state.course.seed + room.state.matchNumber * 97,
        room.lastColorPairSig
      );
      const emptySlot = !room.state.players[2] ? 2 : !room.state.players[1] ? 1 : null;
      if (emptySlot) {
        const botColor = emptySlot === 1 ? colors.p1 : colors.p2;
        room.state.players[emptySlot] = createInitialPlayerState(
          `bot-${room.state.roomId}`,
          emptySlot,
          "Cam Rakip (Yumurta-X)",
          botColor,
          room.selectedWinnerItemBySlot[emptySlot] || "NONE",
          true
        );
        appendSystemChat(
          room,
          `Cam Rakip (${botColor.name}) yan cam odaya girdi ve ONAY verdi!`
        );
        if (canStartMatch(room.state.players[1], room.state.players[2])) {
          room.state.phase = "playing";
          room.state.startedAt = Date.now();
          appendSystemChat(room, "\u0130ki oyuncu da ONAY verdi! Parkur ba\u015Flad\u0131!");
        }
        io.to(room.state.roomId).emit("room:state", room.state);
      }
    });
    socket.on("player:toggle_ready", (payload) => {
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
      player.ready = typeof payload?.ready === "boolean" ? payload.ready : !player.ready;
      appendSystemChat(
        room,
        `${player.name} haz\u0131rl\u0131k durumu: ${player.ready ? "ONAY VERD\u0130" : "BEKL\u0130YOR"}`
      );
      if (room.state.phase === "lobby" && canStartMatch(room.state.players[1], room.state.players[2])) {
        room.state.phase = "playing";
        room.state.startedAt = Date.now();
        appendSystemChat(
          room,
          `Her iki oyuncu da ONAY verdi! ${room.state.matchNumber}. Parkur Yar\u0131\u015F\u0131 ba\u015Flad\u0131!`
        );
      }
      io.to(room.state.roomId).emit("room:state", room.state);
    });
    socket.on("player:sync", (snapshot) => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      if (!room) return;
      const slot = snapshot.slot || room.socketSlots.get(socket.id);
      if (!slot) return;
      const target = room.state.players[slot];
      if (!target) return;
      if (snapshot.position) target.position = snapshot.position;
      if (snapshot.velocity) target.velocity = snapshot.velocity;
      if (typeof snapshot.yaw === "number") target.yaw = snapshot.yaw;
      if (typeof snapshot.grounded === "boolean") target.grounded = snapshot.grounded;
      if (typeof snapshot.currentFloor === "number")
        target.currentFloor = snapshot.currentFloor;
      if (typeof snapshot.highestCheckpointFloor === "number")
        target.highestCheckpointFloor = snapshot.highestCheckpointFloor;
      if (snapshot.checkpointPos) target.checkpointPos = snapshot.checkpointPos;
      if (typeof snapshot.progress === "number") target.progress = snapshot.progress;
      if (typeof snapshot.respawnCount === "number")
        target.respawnCount = snapshot.respawnCount;
      if (typeof snapshot.antiGlitchTriggers === "number")
        target.antiGlitchTriggers = snapshot.antiGlitchTriggers;
      if (snapshot.finished && !target.finished && room.state.phase === "playing") {
        target.finished = true;
        target.progress = 100;
        target.finishTimeMs = room.state.startedAt ? Date.now() - room.state.startedAt : 45e3;
        if (!room.state.winnerSlot) {
          room.state.winnerSlot = slot;
          room.state.winnerName = target.name;
          room.state.phase = "finished";
          const rewardItem = REWARD_POOL[(room.state.matchNumber - 1) % REWARD_POOL.length];
          room.state.awardedItem = rewardItem;
          room.selectedWinnerItemBySlot = {
            1: slot === 1 ? rewardItem : "NONE",
            2: slot === 2 ? rewardItem : "NONE"
          };
          appendSystemChat(
            room,
            `\u015EAMP\u0130YON ${target.name}! Son kat\u0131 ilk bitiren oldu ve "${rewardItem === "GOLDEN_WINGS" ? "Alt\u0131n Yumurta Kanatlar\u0131" : rewardItem === "TURBO_SPRING" ? "Kuantum Yay \xC7izmeleri" : "Foton S\u0131rt Roketi"}" \xF6zel e\u015Fyas\u0131n\u0131 kazand\u0131!`
          );
          io.to(room.state.roomId).emit("room:state", room.state);
          return;
        }
      }
      socket.to(room.state.roomId).emit("player:remote_update", {
        slot,
        player: target
      });
    });
    socket.on(
      "room:rematch",
      (payload) => {
        if (!currentRoomId) return;
        const room = rooms.get(currentRoomId);
        if (!room) return;
        room.state.matchNumber += 1;
        const newSeed = (Date.now() ^ room.state.matchNumber * 2654435761) >>> 0;
        const newCourse = generateParkourCourse(newSeed, room.usedSignatures);
        const newColors = pickDistinctEggColors(newSeed, room.lastColorPairSig);
        room.lastColorPairSig = newColors.pairSignature;
        const prevWinnerSlot = room.state.winnerSlot;
        const chosenItem = payload?.chosenWinnerItem || room.state.awardedItem || "GOLDEN_WINGS";
        if (prevWinnerSlot) {
          room.selectedWinnerItemBySlot[prevWinnerSlot] = chosenItem;
          const loserSlot = prevWinnerSlot === 1 ? 2 : 1;
          room.selectedWinnerItemBySlot[loserSlot] = "NONE";
        }
        room.state.course = newCourse;
        room.state.winnerSlot = null;
        room.state.winnerName = null;
        [1, 2].forEach((s) => {
          const existing = room.state.players[s];
          if (existing) {
            const c = s === 1 ? newColors.p1 : newColors.p2;
            const itemForNextRun = room.selectedWinnerItemBySlot[s] || "NONE";
            const refreshed = createInitialPlayerState(
              existing.id,
              s,
              existing.name,
              c,
              itemForNextRun,
              existing.isBot
            );
            if (payload?.autoStart || existing.isBot) {
              refreshed.ready = true;
            }
            room.state.players[s] = refreshed;
          }
        });
        if (payload?.autoStart && canStartMatch(room.state.players[1], room.state.players[2])) {
          room.state.phase = "playing";
          room.state.startedAt = Date.now();
          appendSystemChat(
            room,
            `Yeni Parkur (#${room.state.matchNumber}) ve yeni yumurta renkleri olu\u015Fturuldu! \xD6zel e\u015Fya aktif!`
          );
        } else {
          room.state.phase = "lobby";
          room.state.startedAt = null;
          appendSystemChat(
            room,
            `Yeni Parkur (#${room.state.matchNumber}) haz\u0131rland\u0131! Yumurta renkleri yenilendi. Ba\u015Flamak i\xE7in her iki oyuncunun ONAY vermesi bekleniyor.`
          );
        }
        io.to(room.state.roomId).emit("room:state", room.state);
      }
    );
    socket.on("chat:send", (payload) => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      if (!room) return;
      const now = Date.now();
      if (now - lastChatTime < 250) return;
      lastChatTime = now;
      const rawText = String(payload?.text || "").trim();
      if (!rawText) return;
      const cleanText = rawText.slice(0, 180);
      const slot = room.socketSlots.get(socket.id) || 1;
      const sender = room.state.players[slot];
      const msg = {
        id: `msg-${now}-${Math.random().toString(36).slice(2, 6)}`,
        senderId: socket.id,
        senderName: sender?.name || `Oyuncu ${slot}`,
        senderColor: sender?.eggColor || "#f8fafc",
        slot,
        text: cleanText,
        timestamp: now
      };
      room.state.chatHistory.push(msg);
      if (room.state.chatHistory.length > 50) {
        room.state.chatHistory.shift();
      }
      io.to(room.state.roomId).emit("chat:message", msg);
    });
    socket.on("disconnect", () => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      if (!room) return;
      const slot = room.socketSlots.get(socket.id);
      if (slot && room.state.players[slot]?.id === socket.id) {
        const leavingName = room.state.players[slot]?.name || `Oyuncu ${slot}`;
        room.state.players[slot] = null;
        room.socketSlots.delete(socket.id);
        if (room.state.phase === "lobby") {
          appendSystemChat(room, `${leavingName} odadan ayr\u0131ld\u0131.`);
        }
        io.to(room.state.roomId).emit("room:state", room.state);
      }
    });
  });
  const distPath = path.join(__dirname, "dist");
  const hasDist = fs.existsSync(path.join(distPath, "index.html"));
  if (process.env.NODE_ENV === "production" || hasDist) {
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  const PORT = Number(process.env.PORT) || 3e3;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Cam Kule: \u0130kiz Parkur server listening on http://0.0.0.0:${PORT}`);
  });
}
startServer();
