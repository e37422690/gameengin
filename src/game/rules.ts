import {
  FloorAnomalyType,
  FloorAtmosphere,
  FloorThemeId,
  InputSnapshot,
  ParkourCourse,
  PhysicsStepResult,
  PlatformDef,
  PlatformKind,
  PlayerState,
  Vec3,
  WinnerItemSpec,
  WinnerItemType,
} from './types';

export const CHAMBER_OFFSET_X = 9.0; // Slot 1 center = -9.0, Slot 2 center = +9.0
export const CHAMBER_HALF_WIDTH = 7.2; // Safe X distance from chamber center
export const GLASS_WALL_HALF_THICKNESS = 0.85; // Keep players away from X = 0 glass divider
export const PLAYER_RADIUS = 0.65;
export const PLAYER_HEIGHT = 1.65;

export const WINNER_ITEMS: Record<WinnerItemType, WinnerItemSpec> = {
  NONE: {
    id: 'NONE',
    name: 'Standart Yumurta',
    shortDesc: 'Standart tekli zıplama ve koşu fiziği',
    badgeColor: '#94a3b8',
    extraAirJumps: 0,
    dashCooldown: 0,
    speedBonus: 1.0,
  },
  GOLDEN_WINGS: {
    id: 'GOLDEN_WINGS',
    name: 'Altın Yumurta Kanatları',
    shortDesc: 'Havada +1 Ekstra Zıplama [Space] ve Havada Atılma [E / Shift]',
    badgeColor: '#f59e0b',
    extraAirJumps: 1,
    dashCooldown: 2.2,
    speedBonus: 1.12,
  },
  TURBO_SPRING: {
    id: 'TURBO_SPRING',
    name: 'Kuantum Yay Çizmeleri',
    shortDesc: 'Havada +2 Ekstra Zıplama [Space] ve %18 Hız Avantajı',
    badgeColor: '#10b981',
    extraAirJumps: 2,
    dashCooldown: 3.0,
    speedBonus: 1.18,
  },
  PHASE_DASH: {
    id: 'PHASE_DASH',
    name: 'Foton Sırt Roketi',
    shortDesc: 'Havada Zıplama + Hızlı İleri Fırlama [E / Shift] (1.4sn dolum)',
    badgeColor: '#06b6d4',
    extraAirJumps: 1,
    dashCooldown: 1.4,
    speedBonus: 1.15,
  },
};

export const EGG_COLOR_PALETTE: Array<{
  shell: string;
  limb: string;
  cheek: string;
  name: string;
}> = [
  { shell: '#FF6B6B', limb: '#FFE66D', cheek: '#FF8E8E', name: 'Mercan Yumurta' },
  { shell: '#38BDF8', limb: '#FDE047', cheek: '#F472B6', name: 'Buzul Yumurta' },
  { shell: '#34D399', limb: '#FBBF24', cheek: '#FB7185', name: 'Zümrüt Yumurta' },
  { shell: '#FBBF24', limb: '#FB7185', cheek: '#F97316', name: 'Altın Sarısı' },
  { shell: '#A78BFA', limb: '#34D399', cheek: '#F472B6', name: 'Lavanta Yumurta' },
  { shell: '#FB923C', limb: '#38BDF8', cheek: '#F43F5E', name: 'Mandalina Yumurta' },
  { shell: '#F472B6', limb: '#A3E635', cheek: '#FB7185', name: 'Şeker Pembe' },
  { shell: '#2DD4BF', limb: '#FACC15', cheek: '#FB923C', name: 'Turkuaz Yumurta' },
  { shell: '#E879F9', limb: '#fde047', cheek: '#38bdf8', name: 'Orkide Yumurta' },
  { shell: '#A3E635', limb: '#38BDF8', cheek: '#F97316', name: 'Limon Yumurta' },
];

const FLOOR_THEMES: Array<{
  themeId: FloorThemeId;
  title: string;
  subtitle: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fogColor: string;
  lightColor: string;
}> = [
  {
    themeId: 'emerald_atrium',
    title: 'Kat 1: Zümrüt Sera',
    subtitle: 'Biyo-Kubbe Başlangıç Parkuru',
    primaryColor: '#10b981',
    secondaryColor: '#1e293b',
    accentColor: '#34d399',
    fogColor: '#07171e',
    lightColor: '#a7f3d0',
  },
  {
    themeId: 'clockwork_foundry',
    title: 'Kat 2: Kehribar Saat Kulesi',
    subtitle: 'Salınımlı Sarkaçlar ve Dişli Köprüler',
    primaryColor: '#d97706',
    secondaryColor: '#271c15',
    accentColor: '#fbbf24',
    fogColor: '#18110c',
    lightColor: '#fde68a',
  },
  {
    themeId: 'cryo_lab',
    title: 'Kat 3: Kristal Buzul Laboratuvarı',
    subtitle: 'Dar Kristal Geçitler ve Lazer Süpürücüler',
    primaryColor: '#0284c7',
    secondaryColor: '#0f172a',
    accentColor: '#38bdf8',
    fogColor: '#081426',
    lightColor: '#bae6fd',
  },
  {
    themeId: 'obsidian_reactor',
    title: 'Kat 4: Volkanik Magma Reaktörü',
    subtitle: 'Yükselen Pistonlar ve Enerji Plakaları',
    primaryColor: '#e11d48',
    secondaryColor: '#231017',
    accentColor: '#fb7185',
    fogColor: '#1b0b12',
    lightColor: '#fecdd3',
  },
  {
    themeId: 'celestial_crown',
    title: 'Kat 5: Gökyüzü Tacı (Final Katı)',
    subtitle: 'Zirve Yükselişi ve Şampiyonluk Podyumu',
    primaryColor: '#eab308',
    secondaryColor: '#1e1b4b',
    accentColor: '#fde047',
    fogColor: '#0d102b',
    lightColor: '#fef08a',
  },
];

export const ANOMALY_CATALOG: Record<
  FloorAnomalyType,
  { title: string; description: string }
> = {
  NONE: {
    title: 'Standart Atmosfer',
    description: 'Normal yerçekimi ve standart zemin tutuşu aktif.',
  },
  SLIPPERY_GROUND: {
    title: 'ÖZEL ETKİNLİK: Buzlu Kaygan Zemin!',
    description: 'Bu katta yerler aşırı kaygan! Durmak ve yön değiştirmek dikkat ister.',
  },
  INVERTED_CONTROLS: {
    title: 'ÖZEL ETKİNLİK: Ters Kontroller!',
    description: 'Bu katta Sağ/Sol ve İleri/Geri yön tuşları ters çalışıyor!',
  },
  LOW_GRAVITY: {
    title: 'ÖZEL ETKİNLİK: Ay Yerçekimi!',
    description: 'Bu katta yerçekimi %45 azaldı! Çok daha yükseğe ve uzağa zıplıyorsun.',
  },
  HYPER_TURBO: {
    title: 'ÖZEL ETKİNLİK: Hız Koridoru!',
    description: 'Bu katta koşu hızı %45 arttı! Reflekslerini hazır tut.',
  },
  EARTHQUAKE_TREMOR: {
    title: 'ÖZEL ETKİNLİK: Sismik Sarsıntı!',
    description: 'Bu katta zemin periyodik olarak sallanıyor ve yana savuruyor!',
  },
};

/**
 * Deterministic 32-bit PRNG (Mulberry32)
 */
export function createSeededRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Picks two distinct egg color themes that never match each other
 * and never repeat the previous match's color pair signature.
 */
export function pickDistinctEggColors(
  seed: number,
  previousPairSignature?: string,
): {
  p1: { shell: string; limb: string; cheek: string; name: string };
  p2: { shell: string; limb: string; cheek: string; name: string };
  pairSignature: string;
} {
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
        pairSignature: sig,
      };
    }
  }
  return {
    p1: EGG_COLOR_PALETTE[0],
    p2: EGG_COLOR_PALETTE[1],
    pairSignature: '0-1',
  };
}

/**
 * Generates a complete 5-floor procedural parkour course that never repeats a previous signature.
 * Both players run the exact same course in their parallel glass-separated chambers.
 */
export function generateParkourCourse(
  baseSeed: number,
  usedSignatures: Set<string> = new Set(),
): ParkourCourse {
  let currentSeed = baseSeed >>> 0;
  if (currentSeed === 0) currentSeed = 133742;

  for (let retry = 0; retry < 32; retry++) {
    const seedToTry = (currentSeed + retry * 7919) >>> 0;
    const rng = createSeededRng(seedToTry);

    const floors: FloorAtmosphere[] = [];
    const platforms: PlatformDef[] = [];
    const signatureParts: string[] = [];

    // Decide floor anomalies: Floor 1 is always NONE for fair onboarding.
    // Floors 2..5 have a chance for special events, and we guarantee at least 1 floor has a special anomaly!
    const possibleAnomalies: FloorAnomalyType[] = [
      'SLIPPERY_GROUND',
      'INVERTED_CONTROLS',
      'LOW_GRAVITY',
      'HYPER_TURBO',
      'EARTHQUAKE_TREMOR',
    ];
    const floorAnomalies: FloorAnomalyType[] = ['NONE', 'NONE', 'NONE', 'NONE', 'NONE'];
    let anomalyCount = 0;

    for (let f = 1; f < 5; f++) {
      if (rng() < 0.42) {
        const pick =
          possibleAnomalies[Math.floor(rng() * possibleAnomalies.length)];
        floorAnomalies[f] = pick;
        anomalyCount++;
      }
    }
    if (anomalyCount === 0) {
      const guaranteedFloor = 1 + Math.floor(rng() * 3); // Floor 2, 3, or 4
      const pick =
        possibleAnomalies[Math.floor(rng() * possibleAnomalies.length)];
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
        anomalyDescription: anomalyMeta.description,
      });

      // 1. Floor Checkpoint Pad (wide, safe landing & respawn anchor)
      const checkpointId = `f${f + 1}_checkpoint`;
      platforms.push({
        id: checkpointId,
        floorIndex: f,
        kind: 'checkpoint',
        localX: 0,
        y: cursorY,
        z: cursorZ,
        width: 5.8,
        height: 0.7,
        depth: 5.8,
      });

      let prevX = 0;
      const stepsInFloor = 6; // 6 parkour obstacles per floor

      for (let s = 0; s < stepsInFloor; s++) {
        // Forward spacing: guaranteed reachable (between 4.6m and 6.4m)
        const stepGapZ = 4.8 + rng() * 1.5;
        cursorZ -= stepGapZ;
        // Upward climb per step: between 0.45m and 1.15m
        const stepClimbY = 0.55 + rng() * 0.55;
        cursorY += stepClimbY;

        // Lateral X variation within chamber bounds (-3.4 to +3.4), max delta 3.2m from previous
        const maxDeltaX = 2.8;
        const rawTargetX = (rng() - 0.5) * 6.4;
        const clampedX = Math.max(
          -3.4,
          Math.min(
            3.4,
            prevX + Math.max(-maxDeltaX, Math.min(maxDeltaX, rawTargetX - prevX)),
          ),
        );

        // Choose platform kind based on floor & RNG
        const roll = rng();
        let kind: PlatformKind = 'standard';
        let width = 3.2 - f * 0.12;
        let depth = 3.2 - f * 0.1;
        let moveAmp = 0;
        let moveSpeed = 0;
        let movePhase = rng() * Math.PI * 2;
        let hazardSpeed = 0;

        if (anomaly === 'SLIPPERY_GROUND' && roll < 0.55) {
          kind = 'ice_pad';
          width = 3.4;
          depth = 3.6;
        } else if (roll < 0.22) {
          kind = 'moving_x';
          width = 3.0;
          depth = 3.0;
          moveAmp = 1.6 + rng() * 0.9;
          moveSpeed = 1.2 + rng() * 0.7;
        } else if (roll < 0.38) {
          kind = 'moving_y';
          width = 3.0;
          depth = 3.0;
          moveAmp = 0.75 + rng() * 0.45;
          moveSpeed = 1.3 + rng() * 0.6;
        } else if (roll < 0.54) {
          kind = 'narrow_beam';
          width = 1.95;
          depth = 4.2;
        } else if (roll < 0.7) {
          kind = 'bounce_pad';
          width = 2.9;
          depth = 2.9;
          // Next step after bounce pad can be slightly higher
        } else if (f >= 1 && roll < 0.86) {
          kind = 'sweeper_hazard';
          width = 3.5;
          depth = 3.5;
          hazardSpeed = 1.6 + f * 0.25;
        } else {
          kind = 'standard';
        }

        const finalLocalX = kind === 'moving_x' ? 0 : Number(clampedX.toFixed(2));
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
          hazardSpeed: Number(hazardSpeed.toFixed(2)),
        });
      }

      // Advance to next floor checkpoint
      cursorZ -= 5.4;
      cursorY += 0.9;
    }

    // Final Finish Crown Podium at the end of Floor 5
    const finishZ = Number(cursorZ.toFixed(2));
    platforms.push({
      id: 'finish_podium',
      floorIndex: 4,
      kind: 'finish_podium',
      localX: 0,
      y: Number(cursorY.toFixed(2)),
      z: finishZ,
      width: 6.4,
      height: 0.9,
      depth: 6.4,
    });

    const signature = signatureParts.join('|');
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
        platforms,
      };
    }
  }

  // Fallback guaranteed unique signature
  const fallbackSeed = (Date.now() & 0x7fffffff) >>> 0;
  return generateParkourCourse(fallbackSeed + 17, new Set());
}

/**
 * Evaluates dynamic platform center at elapsed time `elapsedSec`.
 */
export function getPlatformPositionAtTime(
  plat: PlatformDef,
  slot: 1 | 2,
  elapsedSec: number,
): Vec3 {
  const chamberCenterX = slot === 1 ? -CHAMBER_OFFSET_X : CHAMBER_OFFSET_X;
  let x = chamberCenterX + plat.localX;
  let y = plat.y;
  const z = plat.z;

  if (plat.kind === 'moving_x' && plat.moveAmp && plat.moveSpeed) {
    x += Math.sin(elapsedSec * plat.moveSpeed + (plat.movePhase || 0)) * plat.moveAmp;
  } else if (plat.kind === 'moving_y' && plat.moveAmp && plat.moveSpeed) {
    y += Math.sin(elapsedSec * plat.moveSpeed + (plat.movePhase || 0)) * plat.moveAmp;
  }

  return { x, y, z };
}

/**
 * Anti-Glitch: Clamps frame delta time to prevent physics tunneling on lag or tab-switch.
 */
export function clampDelta(rawDt: number): number {
  if (!Number.isFinite(rawDt) || rawDt <= 0) return 1 / 60;
  return Math.min(rawDt, 0.05);
}

/**
 * Anti-Glitch: Sanitizes vectors against NaN or Infinity corruption.
 */
export function sanitizeVector(v: Vec3, fallback: Vec3): { vec: Vec3; repaired: boolean } {
  if (
    !Number.isFinite(v.x) ||
    !Number.isFinite(v.y) ||
    !Number.isFinite(v.z) ||
    Math.abs(v.x) > 10000 ||
    Math.abs(v.y) > 10000 ||
    Math.abs(v.z) > 10000
  ) {
    return { vec: { ...fallback }, repaired: true };
  }
  return { vec: v, repaired: false };
}

/**
 * Anti-Glitch: Strictly enforces that Player 1 stays in Left Chamber (X < 0)
 * and Player 2 stays in Right Chamber (X > 0), never clipping through the central glass wall (X = 0).
 */
export function enforceChamberBounds(
  pos: Vec3,
  vel: Vec3,
  slot: 1 | 2,
): { pos: Vec3; vel: Vec3; clamped: boolean } {
  const center = slot === 1 ? -CHAMBER_OFFSET_X : CHAMBER_OFFSET_X;
  const minX =
    slot === 1
      ? center - CHAMBER_HALF_WIDTH
      : GLASS_WALL_HALF_THICKNESS + PLAYER_RADIUS;
  const maxX =
    slot === 1
      ? -(GLASS_WALL_HALF_THICKNESS + PLAYER_RADIUS)
      : center + CHAMBER_HALF_WIDTH;

  let clamped = false;
  let nx = pos.x;
  let vx = vel.x;

  if (nx < minX) {
    nx = minX;
    if (vx < 0) vx = 0;
    clamped = true;
  } else if (nx > maxX) {
    nx = maxX;
    if (vx > 0) vx = 0;
    clamped = true;
  }

  return {
    pos: { x: nx, y: pos.y, z: pos.z },
    vel: { x: vx, y: vel.y, z: vel.z },
    clamped,
  };
}

/**
 * Calculates overall race progress percentage (0..100) from Z coordinate.
 */
export function calculateProgressPercent(currentZ: number, startZ: number, finishZ: number): number {
  const totalDist = Math.abs(finishZ - startZ);
  if (totalDist <= 0.001) return 0;
  const covered = startZ - currentZ;
  const raw = (covered / totalDist) * 100;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/**
 * Determines which floor (1..5) the player is currently in based on Z position.
 */
export function getFloorForZ(course: ParkourCourse, z: number): FloorAtmosphere {
  let activeFloor = course.floors[0];
  for (const plat of course.platforms) {
    if (plat.kind === 'checkpoint') {
      if (z <= plat.z + 2.8) {
        activeFloor = course.floors[plat.floorIndex] || activeFloor;
      }
    }
  }
  return activeFloor;
}

/**
 * Creates a fresh initial player state for a given slot and course.
 */
export function createInitialPlayerState(
  id: string,
  slot: 1 | 2,
  name: string,
  colors: { shell: string; limb: string; cheek: string },
  winnerItem: WinnerItemType = 'NONE',
  isBot = false,
): PlayerState {
  const startX = slot === 1 ? -CHAMBER_OFFSET_X : CHAMBER_OFFSET_X;
  const startPos: Vec3 = { x: startX, y: 0.9, z: 0 };
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
    antiGlitchTriggers: 0,
  };
}

/**
 * Pure, deterministic physics + anti-glitch step for a player.
 */
export function stepPlayerPhysics(
  prev: PlayerState,
  input: InputSnapshot,
  course: ParkourCourse,
  rawDt: number,
  elapsedSec: number,
): PhysicsStepResult {
  const dt = clampDelta(rawDt);
  const player: PlayerState = {
    ...prev,
    position: { ...prev.position },
    velocity: { ...prev.velocity },
    checkpointPos: { ...prev.checkpointPos },
  };

  let justJumped = false;
  let justDoubleJumped = false;
  let justDashed = false;
  let justLanded = false;
  let justReachedCheckpoint: number | null = null;
  let justHitHazard = false;
  let justRespawned = false;
  let justFinished = false;
  let antiGlitchReason: string | null = null;

  if (player.finished) {
    player.velocity.x *= 0.85;
    player.velocity.z *= 0.85;
    return {
      player,
      justJumped,
      justDoubleJumped,
      justDashed,
      justLanded,
      justReachedCheckpoint,
      justHitHazard,
      justRespawned,
      justFinished,
      antiGlitchReason,
    };
  }

  // 1. Anti-Glitch: Unstuck [R] button recovery
  if (input.unstuckJustPressed && !input.chatFocused) {
    player.position = {
      x: player.checkpointPos.x,
      y: player.checkpointPos.y + 1.2,
      z: player.checkpointPos.z,
    };
    player.velocity = { x: 0, y: 0, z: 0 };
    player.grounded = false;
    justRespawned = true;
    antiGlitchReason = 'Checkpoint Kurtarma [R] uygulandı';
    player.antiGlitchTriggers += 1;
  }

  // 2. Identify current floor & active floor anomaly
  const currentFloorMeta = getFloorForZ(course, player.position.z);
  player.currentFloor = currentFloorMeta.floorNumber;
  const anomaly = currentFloorMeta.anomaly;
  const itemSpec = WINNER_ITEMS[player.winnerItem] || WINNER_ITEMS.NONE;

  // 3. Anti-Glitch: Ignore movement inputs if chat window is focused
  const effectiveInput: InputSnapshot = input.chatFocused
    ? {
        forward: false,
        backward: false,
        left: false,
        right: false,
        jumpHeld: false,
        jumpJustPressed: false,
        dashJustPressed: false,
        unstuckJustPressed: false,
        chatFocused: true,
      }
    : input;

  // 4. Handle Floor Anomaly: INVERTED_CONTROLS
  const invertMult = anomaly === 'INVERTED_CONTROLS' ? -1 : 1;
  let moveX =
    ((effectiveInput.right ? 1 : 0) - (effectiveInput.left ? 1 : 0)) * invertMult;
  let moveZ =
    ((effectiveInput.backward ? 1 : 0) - (effectiveInput.forward ? 1 : 0)) *
    invertMult;

  const moveLen = Math.hypot(moveX, moveZ);
  if (moveLen > 1) {
    moveX /= moveLen;
    moveZ /= moveLen;
  }

  // 5. Speed, Friction & Anomaly Modifiers
  let baseSpeed = 8.4 * itemSpec.speedBonus;
  if (anomaly === 'HYPER_TURBO') {
    baseSpeed *= 1.42;
  }

  const isSlippery = anomaly === 'SLIPPERY_GROUND';
  const accel = player.grounded ? (isSlippery ? 9.5 : 38.0) : 18.0;
  const damping = player.grounded ? (isSlippery ? 1.6 : 12.0) : 2.5;

  if (moveLen > 0.01) {
    const targetVx = moveX * baseSpeed;
    const targetVz = moveZ * baseSpeed;
    player.velocity.x += (targetVx - player.velocity.x) * Math.min(1, accel * dt);
    player.velocity.z += (targetVz - player.velocity.z) * Math.min(1, accel * dt);
    player.yaw = Math.atan2(moveX, moveZ);
  } else {
    const factor = Math.max(0, 1 - damping * dt);
    player.velocity.x *= factor;
    player.velocity.z *= factor;
  }

  // Earthquake Tremor lateral push
  if (anomaly === 'EARTHQUAKE_TREMOR' && player.grounded) {
    const tremorWave = Math.sin(elapsedSec * 7.5) * Math.cos(elapsedSec * 3.1);
    player.velocity.x += tremorWave * 11.0 * dt;
  }

  // 6. Winner Special Item: Air Dash [E / Shift]
  if (player.dashCooldownLeft > 0) {
    player.dashCooldownLeft = Math.max(0, player.dashCooldownLeft - dt);
  }
  if (
    effectiveInput.dashJustPressed &&
    player.winnerItem !== 'NONE' &&
    player.dashCooldownLeft <= 0
  ) {
    const dashDirX = moveLen > 0.05 ? moveX : 0;
    const dashDirZ = moveLen > 0.05 ? moveZ : -1;
    player.velocity.x = dashDirX * 16.5;
    player.velocity.z = dashDirZ * 16.5;
    player.velocity.y = Math.max(player.velocity.y, 4.2);
    player.dashCooldownLeft = itemSpec.dashCooldown;
    justDashed = true;
  }

  // 7. Jump & Winner Extra Air Jump (Anti-Infinite-Jump guarded)
  const gravity = anomaly === 'LOW_GRAVITY' ? -15.5 : -26.0;
  const jumpVelocity = anomaly === 'LOW_GRAVITY' ? 11.4 : 12.2;

  if (effectiveInput.jumpJustPressed) {
    if (player.grounded) {
      player.velocity.y = jumpVelocity;
      player.grounded = false;
      player.airJumpsLeft = itemSpec.extraAirJumps;
      justJumped = true;
    } else if (player.airJumpsLeft > 0) {
      player.velocity.y = jumpVelocity * 0.94;
      player.airJumpsLeft -= 1;
      justDoubleJumped = true;
    }
  }

  // Apply gravity
  player.velocity.y += gravity * dt;
  // Clamp terminal fall velocity (Anti-tunneling)
  if (player.velocity.y < -30) {
    player.velocity.y = -30;
  }

  // 8. Sub-stepped Position Integration & Platform Collision (Anti-Tunneling)
  const subSteps = 3;
  const subDt = dt / subSteps;
  const wasGrounded = player.grounded;
  let landedThisFrame = false;

  for (let step = 0; step < subSteps; step++) {
    const prevBottomY = player.position.y;
    player.position.x += player.velocity.x * subDt;
    player.position.y += player.velocity.y * subDt;
    player.position.z += player.velocity.z * subDt;

    // Check platform landings
    for (const plat of course.platforms) {
      // Quick Z filter
      if (Math.abs(plat.z - player.position.z) > plat.depth + 2.5) continue;

      const platPos = getPlatformPositionAtTime(plat, player.slot, elapsedSec);
      const halfW = plat.width * 0.5 + PLAYER_RADIUS * 0.55;
      const halfD = plat.depth * 0.5 + PLAYER_RADIUS * 0.55;
      const topY = platPos.y + plat.height * 0.5;

      const withinXZ =
        Math.abs(player.position.x - platPos.x) <= halfW &&
        Math.abs(player.position.z - platPos.z) <= halfD;

      if (
        withinXZ &&
        player.velocity.y <= 0 &&
        prevBottomY >= topY - 0.45 &&
        player.position.y <= topY + 0.18
      ) {
        player.position.y = topY;
        player.velocity.y = 0;
        landedThisFrame = true;

        // If moving_x platform, carry player horizontally
        if (plat.kind === 'moving_x' && plat.moveAmp && plat.moveSpeed) {
          const platVx =
            Math.cos(elapsedSec * plat.moveSpeed + (plat.movePhase || 0)) *
            plat.moveAmp *
            plat.moveSpeed;
          player.position.x += platVx * subDt;
        }

        // Bounce pad
        if (plat.kind === 'bounce_pad') {
          player.velocity.y = jumpVelocity * 1.36;
          landedThisFrame = false;
          justJumped = true;
        }

        // Sweeper hazard bar collision check
        if (plat.kind === 'sweeper_hazard' && plat.hazardSpeed) {
          const barAngle = elapsedSec * plat.hazardSpeed;
          const relX = player.position.x - platPos.x;
          const relZ = player.position.z - platPos.z;
          const barDirX = Math.cos(barAngle);
          const barDirZ = Math.sin(barAngle);
          const crossDist = Math.abs(relX * barDirZ - relZ * barDirX);
          const dotDist = Math.hypot(relX, relZ);
          if (
            crossDist < 0.45 &&
            dotDist < plat.width * 0.48 &&
            player.position.y < topY + 0.65
          ) {
            player.velocity.x += -barDirZ * 10.5;
            player.velocity.y = 7.5;
            landedThisFrame = false;
            justHitHazard = true;
          }
        }

        // Checkpoint activation
        if (plat.kind === 'checkpoint') {
          const floorNum = plat.floorIndex + 1;
          if (floorNum > player.highestCheckpointFloor) {
            player.highestCheckpointFloor = floorNum;
            player.checkpointPos = {
              x: platPos.x,
              y: topY + 0.2,
              z: platPos.z,
            };
            justReachedCheckpoint = floorNum;
          }
        }

        // Finish podium victory check
        if (plat.kind === 'finish_podium' && !player.finished) {
          player.finished = true;
          player.progress = 100;
          justFinished = true;
        }
        break;
      }
    }
  }

  player.grounded = landedThisFrame;
  if (!wasGrounded && landedThisFrame) {
    justLanded = true;
    player.airJumpsLeft = itemSpec.extraAirJumps;
  }

  // 9. Anti-Glitch: Enforce Chamber & Central Glass Partition Bounds
  const boundsCheck = enforceChamberBounds(
    player.position,
    player.velocity,
    player.slot,
  );
  player.position = boundsCheck.pos;
  player.velocity = boundsCheck.vel;

  // 10. Anti-Glitch: NaN / Infinity Sanitizer
  const sanitizedPos = sanitizeVector(player.position, player.checkpointPos);
  const sanitizedVel = sanitizeVector(player.velocity, { x: 0, y: 0, z: 0 });
  if (sanitizedPos.repaired || sanitizedVel.repaired) {
    player.position = sanitizedPos.vec;
    player.velocity = sanitizedVel.vec;
    player.antiGlitchTriggers += 1;
    antiGlitchReason = 'Geçersiz koordinat (NaN) onarıldı';
  }

  // 11. Anti-Void Fall Detection -> Instant Respawn at Floor Checkpoint
  const voidThresholdY = player.checkpointPos.y - 9.5;
  if (player.position.y < voidThresholdY) {
    player.position = {
      x: player.checkpointPos.x,
      y: player.checkpointPos.y + 1.0,
      z: player.checkpointPos.z,
    };
    player.velocity = { x: 0, y: 0, z: 0 };
    player.grounded = false;
    player.airJumpsLeft = itemSpec.extraAirJumps;
    player.respawnCount += 1;
    justRespawned = true;
  }

  // 12. Update Race Progress Percentage
  if (!player.finished) {
    player.progress = calculateProgressPercent(
      player.position.z,
      course.startZ,
      course.finishZ,
    );
  }

  return {
    player,
    justJumped,
    justDoubleJumped,
    justDashed,
    justLanded,
    justReachedCheckpoint,
    justHitHazard,
    justRespawned,
    justFinished,
    antiGlitchReason,
  };
}

/**
 * Simple AI Bot input generator for Slot 2 when a player chooses Solo/Bot practice or test mode.
 */
export function computeBotInput(
  bot: PlayerState,
  course: ParkourCourse,
  elapsedSec: number,
): InputSnapshot {
  const empty: InputSnapshot = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jumpHeld: false,
    jumpJustPressed: false,
    dashJustPressed: false,
    unstuckJustPressed: false,
    chatFocused: false,
  };
  if (bot.finished) return empty;

  // Find next platform ahead (z < bot.position.z - 0.8)
  let targetPlat: PlatformDef | null = null;
  let bestZ = -Infinity;
  for (const plat of course.platforms) {
    if (plat.z < bot.position.z - 1.1 && plat.z > bestZ) {
      bestZ = plat.z;
      targetPlat = plat;
    }
  }
  if (!targetPlat) {
    targetPlat = course.platforms[course.platforms.length - 1];
  }

  const targetPos = getPlatformPositionAtTime(targetPlat, bot.slot, elapsedSec);
  const dx = targetPos.x - bot.position.x;
  const dz = targetPos.z - bot.position.z;

  const currentFloorMeta = getFloorForZ(course, bot.position.z);
  const invert = currentFloorMeta.anomaly === 'INVERTED_CONTROLS';

  let forward = dz < -0.15;
  let backward = dz > 0.5;
  let left = dx < -0.25;
  let right = dx > 0.25;

  if (invert) {
    [forward, backward] = [backward, forward];
    [left, right] = [right, left];
  }

  const distXZ = Math.hypot(dx, dz);
  const shouldJump = bot.grounded && distXZ < 6.8 && distXZ > 1.2;

  return {
    forward,
    backward,
    left,
    right,
    jumpHeld: shouldJump,
    jumpJustPressed: shouldJump,
    dashJustPressed: false,
    unstuckJustPressed: false,
    chatFocused: false,
  };
}

/**
 * Checks if a room can transition from lobby to countdown/playing.
 * Requires both Player 1 and Player 2 to be present and marked ready.
 */
export function canStartMatch(
  p1: PlayerState | null,
  p2: PlayerState | null,
): boolean {
  return Boolean(p1 && p2 && p1.ready && p2.ready);
}
