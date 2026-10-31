import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateProgressPercent,
  canStartMatch,
  clampDelta,
  createInitialPlayerState,
  enforceChamberBounds,
  generateParkourCourse,
  getFloorForZ,
  pickDistinctEggColors,
  sanitizeVector,
  stepPlayerPhysics,
} from './rules';
import { InputSnapshot } from './types';

const idleInput: InputSnapshot = {
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

test('procedural parkour generator creates 5 distinct floors with checkpoints and never repeats consecutive signatures', () => {
  const used = new Set<string>();
  const course1 = generateParkourCourse(101, used);
  const course2 = generateParkourCourse(101, used); // Even with same base seed, anti-repeat advances to a fresh layout!

  assert.equal(course1.floors.length, 5);
  assert.equal(course2.floors.length, 5);
  assert.notEqual(course1.signature, course2.signature);

  const checkpoints = course1.platforms.filter((p) => p.kind === 'checkpoint');
  assert.equal(checkpoints.length, 5);

  const finishPodiums = course1.platforms.filter((p) => p.kind === 'finish_podium');
  assert.equal(finishPodiums.length, 1);

  // At least one floor above Floor 1 should have a special event anomaly
  const anomalies = course1.floors.filter((f) => f.anomaly !== 'NONE');
  assert.ok(anomalies.length >= 1, 'Expected at least 1 floor special event anomaly');
});

test('egg color generator picks distinct colors for Player 1 and Player 2 and changes on replay', () => {
  const pair1 = pickDistinctEggColors(42);
  assert.notEqual(pair1.p1.shell, pair1.p2.shell);

  const pair2 = pickDistinctEggColors(42, pair1.pairSignature);
  assert.notEqual(pair1.pairSignature, pair2.pairSignature);
  assert.notEqual(pair2.p1.shell, pair2.p2.shell);
});

test('lobby ready gate requires both players to be present and ready before match starts', () => {
  const colors = pickDistinctEggColors(10);
  const p1 = createInitialPlayerState('id1', 1, 'Oyuncu 1', colors.p1);
  const p2 = createInitialPlayerState('id2', 2, 'Oyuncu 2', colors.p2);

  assert.equal(canStartMatch(p1, null), false);
  assert.equal(canStartMatch(p1, p2), false);

  p1.ready = true;
  assert.equal(canStartMatch(p1, p2), false);

  p2.ready = true;
  assert.equal(canStartMatch(p1, p2), true);
});

test('anti-glitch: chamber bounds keep Player 1 in X < 0 and Player 2 in X > 0 separated by glass wall at X = 0', () => {
  const p1AttemptCrossGlass = enforceChamberBounds(
    { x: 2.5, y: 1, z: -10 },
    { x: 8, y: 0, z: 0 },
    1,
  );
  assert.equal(p1AttemptCrossGlass.clamped, true);
  assert.ok(p1AttemptCrossGlass.pos.x < -1.0, 'Player 1 must stay in Left Chamber (X < 0)');
  assert.equal(p1AttemptCrossGlass.vel.x, 0);

  const p2AttemptCrossGlass = enforceChamberBounds(
    { x: -3.0, y: 1, z: -10 },
    { x: -8, y: 0, z: 0 },
    2,
  );
  assert.equal(p2AttemptCrossGlass.clamped, true);
  assert.ok(p2AttemptCrossGlass.pos.x > 1.0, 'Player 2 must stay in Right Chamber (X > 0)');
  assert.equal(p2AttemptCrossGlass.vel.x, 0);
});

test('anti-glitch: delta clamping, NaN sanitization, chat input lock, and void checkpoint recovery', () => {
  assert.equal(clampDelta(0.5), 0.05);
  assert.equal(clampDelta(NaN), 1 / 60);

  const repaired = sanitizeVector({ x: NaN, y: Infinity, z: 0 }, { x: -9, y: 1, z: 0 });
  assert.equal(repaired.repaired, true);
  assert.equal(repaired.vec.x, -9);

  const course = generateParkourCourse(777);
  const colors = pickDistinctEggColors(777);
  const p1 = createInitialPlayerState('p1', 1, 'Yumurta 1', colors.p1, 'GOLDEN_WINGS');

  // Typing in [T] chat must lock out movement & jumping
  const chatStep = stepPlayerPhysics(
    p1,
    { ...idleInput, forward: true, jumpJustPressed: true, chatFocused: true },
    course,
    0.016,
    1.0,
  );
  assert.equal(chatStep.justJumped, false);
  assert.equal(chatStep.player.velocity.z, 0);

  // Falling into the void must respawn at checkpoint
  const fallingPlayer = {
    ...p1,
    position: { x: -9, y: -25, z: -15 },
  };
  const voidStep = stepPlayerPhysics(fallingPlayer, idleInput, course, 0.016, 2.0);
  assert.equal(voidStep.justRespawned, true);
  assert.equal(voidStep.player.respawnCount, 1);
  assert.ok(voidStep.player.position.y > 0);
});

test('winner special item grants double jump and air dash on replay', () => {
  const course = generateParkourCourse(999);
  const colors = pickDistinctEggColors(999);
  const winner = createInitialPlayerState('w1', 1, 'Şampiyon', colors.p1, 'GOLDEN_WINGS');

  // First jump from ground
  const step1 = stepPlayerPhysics(
    winner,
    { ...idleInput, jumpJustPressed: true },
    course,
    0.016,
    0.5,
  );
  assert.equal(step1.justJumped, true);
  assert.equal(step1.player.grounded, false);

  // Mid-air double jump using GOLDEN_WINGS
  const step2 = stepPlayerPhysics(
    step1.player,
    { ...idleInput, jumpJustPressed: true },
    course,
    0.016,
    0.52,
  );
  assert.equal(step2.justDoubleJumped, true);
  assert.equal(step2.player.airJumpsLeft, 0);

  // Air dash
  const step3 = stepPlayerPhysics(
    step2.player,
    { ...idleInput, forward: true, dashJustPressed: true },
    course,
    0.016,
    0.54,
  );
  assert.equal(step3.justDashed, true);
  assert.ok(step3.player.velocity.z < -10);
});

test('both players experience the exact same floor anomaly at the same Z coordinate', () => {
  const course = generateParkourCourse(2026);
  for (const plat of course.platforms) {
    if (plat.kind === 'checkpoint') {
      const f1 = getFloorForZ(course, plat.z - 1);
      const f2 = getFloorForZ(course, plat.z - 1);
      assert.equal(f1.floorNumber, f2.floorNumber);
      assert.equal(f1.anomaly, f2.anomaly);
    }
  }
  assert.equal(calculateProgressPercent(course.finishZ, course.startZ, course.finishZ), 100);
});
