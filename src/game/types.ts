export type FloorThemeId =
  | 'emerald_atrium'
  | 'clockwork_foundry'
  | 'cryo_lab'
  | 'obsidian_reactor'
  | 'celestial_crown';

export type FloorAnomalyType =
  | 'NONE'
  | 'SLIPPERY_GROUND'
  | 'INVERTED_CONTROLS'
  | 'LOW_GRAVITY'
  | 'HYPER_TURBO'
  | 'EARTHQUAKE_TREMOR';

export type WinnerItemType =
  | 'NONE'
  | 'GOLDEN_WINGS'
  | 'TURBO_SPRING'
  | 'PHASE_DASH';

export interface WinnerItemSpec {
  id: WinnerItemType;
  name: string;
  shortDesc: string;
  badgeColor: string;
  extraAirJumps: number;
  dashCooldown: number;
  speedBonus: number;
}

export interface FloorAtmosphere {
  themeId: FloorThemeId;
  floorNumber: number;
  title: string;
  subtitle: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fogColor: string;
  lightColor: string;
  anomaly: FloorAnomalyType;
  anomalyTitle: string;
  anomalyDescription: string;
}

export type PlatformKind =
  | 'checkpoint'
  | 'standard'
  | 'moving_x'
  | 'moving_y'
  | 'narrow_beam'
  | 'bounce_pad'
  | 'ice_pad'
  | 'sweeper_hazard'
  | 'finish_podium';

export interface PlatformDef {
  id: string;
  floorIndex: number; // 0 to 4
  kind: PlatformKind;
  // Relative to chamber center X (Chamber 1 center = -9, Chamber 2 center = +9)
  localX: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  moveAmp?: number;
  moveSpeed?: number;
  movePhase?: number;
  hazardSpeed?: number;
}

export interface ParkourCourse {
  seed: number;
  signature: string;
  createdAt: number;
  totalFloors: number;
  startZ: number;
  finishZ: number;
  floors: FloorAtmosphere[];
  platforms: PlatformDef[];
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface PlayerState {
  id: string;
  slot: 1 | 2; // 1 = Left Room (X < 0), 2 = Right Room (X > 0)
  name: string;
  isBot?: boolean;
  ready: boolean;
  eggColor: string;
  limbColor: string;
  cheekColor: string;
  position: Vec3;
  velocity: Vec3;
  yaw: number;
  grounded: boolean;
  currentFloor: number; // 1 to 5
  highestCheckpointFloor: number; // 1 to 5
  checkpointPos: Vec3;
  progress: number; // 0 to 100
  finished: boolean;
  finishTimeMs: number | null;
  winnerItem: WinnerItemType;
  airJumpsLeft: number;
  dashCooldownLeft: number;
  respawnCount: number;
  antiGlitchTriggers: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  slot: 1 | 2 | 0;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export type MatchPhase = 'lobby' | 'countdown' | 'playing' | 'finished';

export interface RoomState {
  roomId: string;
  phase: MatchPhase;
  countdownSeconds: number;
  matchNumber: number;
  course: ParkourCourse;
  players: Record<1 | 2, PlayerState | null>;
  winnerSlot: 1 | 2 | null;
  winnerName: string | null;
  awardedItem: WinnerItemType;
  startedAt: number | null;
  chatHistory: ChatMessage[];
}

export interface InputSnapshot {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jumpHeld: boolean;
  jumpJustPressed: boolean;
  dashJustPressed: boolean;
  unstuckJustPressed: boolean;
  chatFocused: boolean;
}

export interface PhysicsStepResult {
  player: PlayerState;
  justJumped: boolean;
  justDoubleJumped: boolean;
  justDashed: boolean;
  justLanded: boolean;
  justReachedCheckpoint: number | null;
  justHitHazard: boolean;
  justRespawned: boolean;
  justFinished: boolean;
  antiGlitchReason: string | null;
}
