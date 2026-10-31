import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  CHAMBER_OFFSET_X,
  computeBotInput,
  getFloorForZ,
  getPlatformPositionAtTime,
  stepPlayerPhysics,
} from '../game/rules';
import { sound } from '../game/sound';
import {
  FloorAtmosphere,
  InputSnapshot,
  ParkourCourse,
  PlayerState,
} from '../game/types';

interface TwinParkourCanvasProps {
  gameState: 'title' | 'playing' | 'paused' | 'gameover';
  mySlot: 1 | 2;
  course: ParkourCourse;
  playersRef: React.MutableRefObject<Record<1 | 2, PlayerState | null>>;
  chatFocusedRef: React.MutableRefObject<boolean>;
  onLocalPlayerSync: (player: PlayerState, justFinished: boolean) => void;
  onBotPlayerSync: (bot: PlayerState, justFinished: boolean) => void;
  onHudUpdate: (hud: {
    myProgress: number;
    rivalProgress: number;
    myFloor: FloorAtmosphere;
    rivalFloorNumber: number;
    bannerText: string | null;
    antiGlitchNotice: string | null;
    respawnCount: number;
    airJumpsLeft: number;
    dashCooldownLeft: number;
  }) => void;
}

interface EggActorHandles {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  shellMesh: THREE.Mesh;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  cheekLeft: THREE.Mesh;
  cheekRight: THREE.Mesh;
  crownGroup: THREE.Group;
  shadowDisc: THREE.Mesh;
  shellMat: THREE.MeshStandardMaterial;
  limbMat: THREE.MeshStandardMaterial;
  cheekMat: THREE.MeshStandardMaterial;
  squashY: number;
  walkPhase: number;
}

interface DynamicPlatHandle {
  defId: string;
  slot: 1 | 2;
  mesh: THREE.Group;
  sweeperBar?: THREE.Mesh;
  checkpointRing?: THREE.Mesh;
}

function createGridBumpTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#b8b8b8';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 120, 120);
  ctx.strokeStyle = '#585858';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(64, 0);
  ctx.lineTo(64, 128);
  ctx.moveTo(0, 64);
  ctx.lineTo(128, 64);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Builds a 10+ part composite 3D Egg Character with arms, legs, eyes, cheeks, and Winner Crown/Wings.
 */
function createEggActorGroup(): EggActorHandles {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  // 1. Egg Ovoid Profile via LatheGeometry
  const eggPoints: THREE.Vector2[] = [];
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI;
    // Ovoid equation: slightly narrower at top than bottom
    const sinT = Math.sin(t);
    const cosT = Math.cos(t);
    const eggTaper = 1 - 0.22 * cosT;
    const r = Math.max(0.001, 0.54 * sinT * eggTaper);
    const y = 0.72 - 0.68 * cosT; // sits from y=0.04 to y=1.40
    eggPoints.push(new THREE.Vector2(r, y));
  }
  const eggGeo = new THREE.LatheGeometry(eggPoints, 24);
  const shellMat = new THREE.MeshStandardMaterial({
    color: 0xff6b6b,
    roughness: 0.28,
    metalness: 0.08,
  });
  const shellMesh = new THREE.Mesh(eggGeo, shellMat);
  shellMesh.castShadow = true;
  shellMesh.receiveShadow = true;
  bodyGroup.add(shellMesh);

  // 2. Decorative Belt / Sash for secondary silhouette read
  const beltGeo = new THREE.TorusGeometry(0.51, 0.045, 10, 24);
  beltGeo.rotateX(Math.PI / 2);
  const beltMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.55,
    metalness: 0.4,
  });
  const beltMesh = new THREE.Mesh(beltGeo, beltMat);
  beltMesh.position.y = 0.52;
  bodyGroup.add(beltMesh);

  // 3. Eyes (Sclera + Pupils) facing -Z (forward direction)
  const scleraGeo = new THREE.SphereGeometry(0.11, 14, 14);
  const scleraMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.15,
  });
  const pupilGeo = new THREE.SphereGeometry(0.058, 12, 12);
  const pupilMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.1,
  });

  [-0.17, 0.17].forEach((ex) => {
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(ex, 0.92, -0.44);
    const sclera = new THREE.Mesh(scleraGeo, scleraMat);
    sclera.scale.set(1, 1.15, 0.6);
    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupil.position.set(0, 0.01, -0.055);
    eyeGroup.add(sclera, pupil);
    bodyGroup.add(eyeGroup);
  });

  // 4. Rosy Cheeks
  const cheekGeo = new THREE.SphereGeometry(0.075, 12, 12);
  const cheekMat = new THREE.MeshStandardMaterial({
    color: 0xff8e8e,
    roughness: 0.6,
    emissive: 0xff6b6b,
    emissiveIntensity: 0.15,
  });
  const cheekLeft = new THREE.Mesh(cheekGeo, cheekMat);
  cheekLeft.scale.set(1.2, 0.7, 0.5);
  cheekLeft.position.set(-0.28, 0.78, -0.41);
  const cheekRight = new THREE.Mesh(cheekGeo, cheekMat);
  cheekRight.scale.set(1.2, 0.7, 0.5);
  cheekRight.position.set(0.28, 0.78, -0.41);
  bodyGroup.add(cheekLeft, cheekRight);

  // 5. Articulated Arms + Hands
  const limbMat = new THREE.MeshStandardMaterial({
    color: 0xffe66d,
    roughness: 0.45,
    metalness: 0.1,
  });
  const armGeo = new THREE.CapsuleGeometry(0.085, 0.28, 6, 12);
  const handGeo = new THREE.SphereGeometry(0.115, 12, 12);

  function buildArm(side: -1 | 1): THREE.Group {
    const armPivot = new THREE.Group();
    armPivot.position.set(side * 0.54, 0.78, 0);
    const armMesh = new THREE.Mesh(armGeo, limbMat);
    armMesh.position.set(side * 0.06, -0.16, 0);
    armMesh.rotation.z = side * 0.22;
    const handMesh = new THREE.Mesh(handGeo, limbMat);
    handMesh.position.set(side * 0.11, -0.34, -0.04);
    armPivot.add(armMesh, handMesh);
    return armPivot;
  }

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);
  bodyGroup.add(leftArm, rightArm);

  // 6. Articulated Legs + Shoes
  const legGeo = new THREE.CapsuleGeometry(0.095, 0.22, 6, 12);
  const shoeGeo = new THREE.BoxGeometry(0.22, 0.13, 0.34);

  function buildLeg(side: -1 | 1): THREE.Group {
    const legPivot = new THREE.Group();
    legPivot.position.set(side * 0.22, 0.26, 0);
    const legMesh = new THREE.Mesh(legGeo, limbMat);
    legMesh.position.set(0, -0.12, 0);
    const shoeMesh = new THREE.Mesh(shoeGeo, limbMat);
    shoeMesh.position.set(0, -0.22, -0.05);
    legPivot.add(legMesh, shoeMesh);
    return legPivot;
  }

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);
  bodyGroup.add(leftLeg, rightLeg);

  // 7. Winner Special Item Attachment: Golden Crown + Winged Jetpack
  const crownGroup = new THREE.Group();
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.18,
    metalness: 0.85,
    emissive: 0xd97706,
    emissiveIntensity: 0.25,
  });
  const crownBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.2, 0.14, 8),
    goldMat,
  );
  crownBase.position.set(0, 1.44, 0);
  crownGroup.add(crownBase);

  // Winged fins on back of egg
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.lineTo(0.45, 0.28);
  wingShape.lineTo(0.38, -0.15);
  wingShape.closePath();
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
    depth: 0.05,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
  });
  const leftWing = new THREE.Mesh(wingGeo, goldMat);
  leftWing.position.set(-0.12, 0.82, 0.42);
  leftWing.rotation.y = Math.PI + 0.35;
  const rightWing = new THREE.Mesh(wingGeo, goldMat);
  rightWing.position.set(0.12, 0.82, 0.42);
  rightWing.rotation.y = -0.35;
  crownGroup.add(leftWing, rightWing);
  crownGroup.visible = false;
  bodyGroup.add(crownGroup);

  // 8. Contact Shadow Disc on ground
  const shadowGeo = new THREE.CircleGeometry(0.58, 20);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
  shadowDisc.position.y = 0.02;
  root.add(shadowDisc);

  return {
    root,
    bodyGroup,
    shellMesh,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    cheekLeft,
    cheekRight,
    crownGroup,
    shadowDisc,
    shellMat,
    limbMat,
    cheekMat,
    squashY: 1,
    walkPhase: 0,
  };
}

export const TwinParkourCanvas: React.FC<TwinParkourCanvasProps> = ({
  gameState,
  mySlot,
  course,
  playersRef,
  chatFocusedRef,
  onLocalPlayerSync,
  onBotPlayerSync,
  onHudUpdate,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Store mutable refs so React state updates never recreate the WebGLRenderer
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const mySlotRef = useRef(mySlot);
  mySlotRef.current = mySlot;

  const courseRef = useRef(course);
  const courseSeedChangedRef = useRef<number>(0);
  if (courseRef.current.seed !== course.seed) {
    courseRef.current = course;
    courseSeedChangedRef.current = course.seed;
  }

  const callbacksRef = useRef({
    onLocalPlayerSync,
    onBotPlayerSync,
    onHudUpdate,
  });
  callbacksRef.current = {
    onLocalPlayerSync,
    onBotPlayerSync,
    onHudUpdate,
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Software-WebGL Guard per Three.js skill
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth || 1280, container.clientHeight || 720);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#071422');
    scene.fog = new THREE.FogExp2('#071422', 0.012);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04,
    ).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      62,
      (container.clientWidth || 1280) / (container.clientHeight || 720),
      0.2,
      240,
    );
    camera.position.set(-9, 6, 12);

    // 2. Balanced Warm/Cool Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x0f172a, 0.85);
    hemiLight.position.set(0, 60, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.45);
    keyLight.position.set(18, 38, 22);
    keyLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 2;
      keyLight.shadow.camera.far = 140;
      const d = 32;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);
    scene.add(keyLight.target);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.55);
    rimLight.position.set(-16, 20, -28);
    scene.add(rimLight);

    // 3. Shared Bump Texture
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const bumpTex = createGridBumpTexture(maxAnisotropy);

    // 4. Egg Actors for Slot 1 (Left Chamber) and Slot 2 (Right Chamber)
    const eggActors: Record<1 | 2, EggActorHandles> = {
      1: createEggActorGroup(),
      2: createEggActorGroup(),
    };
    scene.add(eggActors[1].root);
    scene.add(eggActors[2].root);

    // 5. Pooled Particle Ring Buffer (Zero-GC InstancedMesh)
    const PARTICLE_COUNT = 96;
    const partGeo = new THREE.DodecahedronGeometry(0.12, 0);
    const partMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const particleMesh = new THREE.InstancedMesh(partGeo, partMat, PARTICLE_COUNT);
    particleMesh.frustumCulled = false;
    scene.add(particleMesh);

    const particlePos = new Float32Array(PARTICLE_COUNT * 3);
    const particleVel = new Float32Array(PARTICLE_COUNT * 3);
    const particleLife = new Float32Array(PARTICLE_COUNT);
    const _dummyObj = new THREE.Object3D();
    const _color = new THREE.Color();
    let particleHead = 0;

    function spawnParticles(
      origin: { x: number; y: number; z: number },
      count: number,
      hexColor: string,
      speed = 4.2,
    ) {
      _color.set(hexColor);
      for (let i = 0; i < count; i++) {
        const idx = particleHead;
        particleHead = (particleHead + 1) % PARTICLE_COUNT;
        particlePos[idx * 3] = origin.x + (Math.random() - 0.5) * 0.5;
        particlePos[idx * 3 + 1] = origin.y + Math.random() * 0.4;
        particlePos[idx * 3 + 2] = origin.z + (Math.random() - 0.5) * 0.5;

        const angle = Math.random() * Math.PI * 2;
        const mag = (0.35 + Math.random() * 0.65) * speed;
        particleVel[idx * 3] = Math.cos(angle) * mag;
        particleVel[idx * 3 + 1] = 1.5 + Math.random() * speed;
        particleVel[idx * 3 + 2] = Math.sin(angle) * mag;
        particleLife[idx] = 0.45 + Math.random() * 0.35;
        particleMesh.setColorAt(idx, _color);
      }
      if (particleMesh.instanceColor) {
        particleMesh.instanceColor.needsUpdate = true;
      }
    }

    // 6. Course Scene Builder (Twin Chambers + Central Glass Wall + Floor Landmarks)
    const courseGroup = new THREE.Group();
    scene.add(courseGroup);
    let dynamicPlats: DynamicPlatHandle[] = [];
    let builtSeed = -1;

    function rebuildCourseGeometry(activeCourse: ParkourCourse) {
      builtSeed = activeCourse.seed;
      dynamicPlats = [];
      while (courseGroup.children.length > 0) {
        courseGroup.remove(courseGroup.children[0]);
      }

      const totalLengthZ = Math.abs(activeCourse.finishZ) + 28;
      const midZ = activeCourse.finishZ * 0.5;
      const maxHeightY =
        activeCourse.platforms[activeCourse.platforms.length - 1]?.y || 24;

      // A. Central Glass Wall separating Left Room (Slot 1) and Right Room (Slot 2)
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xbae6fd,
        roughness: 0.1,
        metalness: 0.05,
        transmission: isSoftwareGl ? 0 : 0.86,
        transparent: true,
        opacity: isSoftwareGl ? 0.28 : 0.92,
        ior: 1.48,
        thickness: 0.5,
        depthWrite: false,
      });
      const glassPaneGeo = new THREE.BoxGeometry(
        0.24,
        maxHeightY + 26,
        totalLengthZ,
      );
      const glassWall = new THREE.Mesh(glassPaneGeo, glassMat);
      glassWall.position.set(0, maxHeightY * 0.5 + 4, midZ);
      glassWall.renderOrder = 5;
      courseGroup.add(glassWall);

      // Brushed steel mullions along the central glass partition so players clearly perceive the glass wall
      const mullionMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.35,
        metalness: 0.75,
      });
      const postGeo = new THREE.BoxGeometry(0.42, maxHeightY + 28, 0.42);
      for (let z = 4; z >= activeCourse.finishZ - 10; z -= 14) {
        const post = new THREE.Mesh(postGeo, mullionMat);
        post.position.set(0, maxHeightY * 0.5 + 4, z);
        courseGroup.add(post);
      }

      // Outer Chamber Framing Rails (Left = -17.2, Right = +17.2)
      const railGeo = new THREE.BoxGeometry(0.5, 1.2, totalLengthZ);
      [-17.2, 17.2].forEach((rx) => {
        const lowerRail = new THREE.Mesh(railGeo, mullionMat);
        lowerRail.position.set(rx, 0, midZ);
        const upperRail = new THREE.Mesh(railGeo, mullionMat);
        upperRail.position.set(rx, maxHeightY + 6, midZ);
        courseGroup.add(lowerRail, upperRail);
      });

      // B. Build all Platforms identically in both Left Chamber (Slot 1) & Right Chamber (Slot 2)
      const boxGeoCache = new Map<string, THREE.BoxGeometry>();
      function getBoxGeo(w: number, h: number, d: number) {
        const key = `${w}_${h}_${d}`;
        if (!boxGeoCache.has(key)) {
          boxGeoCache.set(key, new THREE.BoxGeometry(w, h, d));
        }
        return boxGeoCache.get(key)!;
      }

      for (const plat of activeCourse.platforms) {
        const floorTheme = activeCourse.floors[plat.floorIndex] || activeCourse.floors[0];

        ([1, 2] as const).forEach((slot) => {
          const chamberX = slot === 1 ? -CHAMBER_OFFSET_X : CHAMBER_OFFSET_X;
          const pGroup = new THREE.Group();
          pGroup.position.set(chamberX + plat.localX, plat.y, plat.z);

          let baseColor = floorTheme.primaryColor;
          let roughness = 0.48;
          let metalness = 0.18;

          if (plat.kind === 'checkpoint') {
            baseColor = floorTheme.accentColor;
            roughness = 0.3;
          } else if (plat.kind === 'ice_pad') {
            baseColor = '#7dd3fc';
            roughness = 0.08;
            metalness = 0.1;
          } else if (plat.kind === 'bounce_pad') {
            baseColor = '#f43f5e';
            roughness = 0.25;
          } else if (plat.kind === 'finish_podium') {
            baseColor = '#facc15';
            roughness = 0.2;
            metalness = 0.65;
          }

          const platMat = new THREE.MeshStandardMaterial({
            color: baseColor,
            roughness,
            metalness,
            bumpMap: bumpTex,
            bumpScale: 0.03,
          });

          const mainSlab = new THREE.Mesh(
            getBoxGeo(plat.width, plat.height, plat.depth),
            platMat,
          );
          mainSlab.receiveShadow = true;
          mainSlab.castShadow = !isSoftwareGl;
          pGroup.add(mainSlab);

          // Bottom trim bevel for multi-part depth
          const underMat = new THREE.MeshStandardMaterial({
            color: floorTheme.secondaryColor,
            roughness: 0.75,
            metalness: 0.3,
          });
          const underSlab = new THREE.Mesh(
            getBoxGeo(plat.width * 0.86, 0.35, plat.depth * 0.86),
            underMat,
          );
          underSlab.position.y = -plat.height * 0.5 - 0.17;
          pGroup.add(underSlab);

          let sweeperBar: THREE.Mesh | undefined;
          let checkpointRing: THREE.Mesh | undefined;

          if (plat.kind === 'checkpoint') {
            // Checkpoint Archway & Glowing Ring
            const ringGeo = new THREE.TorusGeometry(2.2, 0.09, 10, 28);
            const ringMat = new THREE.MeshStandardMaterial({
              color: floorTheme.accentColor,
              emissive: floorTheme.primaryColor,
              emissiveIntensity: 0.6,
              roughness: 0.2,
            });
            checkpointRing = new THREE.Mesh(ringGeo, ringMat);
            checkpointRing.position.set(0, 2.2, -2.2);
            pGroup.add(checkpointRing);
          } else if (plat.kind === 'bounce_pad') {
            const padGeo = new THREE.CylinderGeometry(
              plat.width * 0.36,
              plat.width * 0.4,
              0.16,
              18,
            );
            const padMat = new THREE.MeshStandardMaterial({
              color: 0xfde047,
              emissive: 0xf59e0b,
              emissiveIntensity: 0.5,
            });
            const padMesh = new THREE.Mesh(padGeo, padMat);
            padMesh.position.y = plat.height * 0.5 + 0.08;
            pGroup.add(padMesh);
          } else if (plat.kind === 'sweeper_hazard') {
            const barGeo = new THREE.CylinderGeometry(0.12, 0.12, plat.width * 0.92, 12);
            barGeo.rotateZ(Math.PI / 2);
            const barMat = new THREE.MeshStandardMaterial({
              color: 0xff2e4c,
              emissive: 0xe11d48,
              emissiveIntensity: 0.75,
            });
            sweeperBar = new THREE.Mesh(barGeo, barMat);
            sweeperBar.position.y = plat.height * 0.5 + 0.34;
            pGroup.add(sweeperBar);
          } else if (plat.kind === 'finish_podium') {
            // Tall Victory Crown Spire Landmark visible from spawn vista
            const spireGeo = new THREE.ConeGeometry(1.1, 4.5, 8);
            const spireMat = new THREE.MeshStandardMaterial({
              color: 0xfde047,
              emissive: 0xeab308,
              emissiveIntensity: 0.65,
              metalness: 0.8,
              roughness: 0.15,
            });
            const spire = new THREE.Mesh(spireGeo, spireMat);
            spire.position.set(0, 3.2, 0);
            pGroup.add(spire);
          }

          courseGroup.add(pGroup);

          if (
            plat.kind === 'moving_x' ||
            plat.kind === 'moving_y' ||
            plat.kind === 'sweeper_hazard' ||
            plat.kind === 'checkpoint'
          ) {
            dynamicPlats.push({
              defId: plat.id,
              slot,
              mesh: pGroup,
              sweeperBar,
              checkpointRing,
            });
          }
        });
      }
    }

    rebuildCourseGeometry(courseRef.current);
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 7. Unified Keyboard Input Listener with Edge Triggers, Jump Buffer & Blur Guard
    const keysHeld = new Set<string>();
    let jumpBufferTimer = 0;
    let dashJustTriggered = false;
    let unstuckJustTriggered = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (chatFocusedRef.current) return;
      const code = e.code;
      if (!keysHeld.has(code)) {
        if (code === 'Space' || code === 'KeyW' || code === 'ArrowUp') {
          if (code === 'Space') {
            jumpBufferTimer = 0.13;
          }
        }
        if (code === 'KeyE' || code === 'ShiftLeft' || code === 'ShiftRight') {
          dashJustTriggered = true;
        }
        if (code === 'KeyR') {
          unstuckJustTriggered = true;
        }
      }
      keysHeld.add(code);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysHeld.delete(e.code);
    };

    const clearInputs = () => {
      keysHeld.clear();
      jumpBufferTimer = 0;
      dashJustTriggered = false;
      unstuckJustTriggered = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearInputs);

    // ResizeObserver for responsive viewport
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(320, entry.contentRect.width);
        const h = Math.max(240, entry.contentRect.height);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(container);

    // 8. Main Simulation & Render Loop with Software-WebGL Pacing (`afterDraw`)
    let lastTimeMs = performance.now();
    let elapsedSec = 0;
    let frameId = 0;
    let disposed = false;
    let syncAccumulator = 0;
    let hudAccumulator = 0;
    let activeBannerText: string | null = null;
    let bannerTimer = 0;
    let activeGlitchNotice: string | null = null;
    let glitchTimer = 0;
    let cameraShakeTrauma = 0;
    let lastFloorAnnounced = 1;

    const _camTargetPos = new THREE.Vector3(-9, 6, 12);
    const _camLookTarget = new THREE.Vector3(-9, 2, -6);
    const _fogTargetColor = new THREE.Color('#071422');

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync
        ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0)
        : null;
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (sync && state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function updateActorVisuals(
      handle: EggActorHandles,
      p: PlayerState | null,
      slot: 1 | 2,
      dt: number,
    ) {
      if (!p) {
        handle.root.visible = false;
        return;
      }
      handle.root.visible = true;
      handle.shellMat.color.set(p.eggColor);
      handle.limbMat.color.set(p.limbColor);
      handle.cheekMat.color.set(p.cheekColor);
      handle.crownGroup.visible = p.winnerItem !== 'NONE';

      // Smooth position & yaw
      handle.root.position.set(p.position.x, p.position.y, p.position.z);
      handle.bodyGroup.rotation.y = p.yaw;

      // Squash & stretch recovery
      handle.squashY = THREE.MathUtils.damp(handle.squashY, 1.0, 12, dt);
      const invScale = 1 / Math.sqrt(Math.max(0.5, handle.squashY));
      handle.bodyGroup.scale.set(invScale, handle.squashY, invScale);

      // Gait cycle synced to horizontal velocity
      const speedXZ = Math.hypot(p.velocity.x, p.velocity.z);
      if (p.grounded && speedXZ > 0.25) {
        handle.walkPhase += speedXZ * dt * 2.4;
        const swing = Math.sin(handle.walkPhase) * 0.65;
        handle.leftLeg.rotation.x = swing;
        handle.rightLeg.rotation.x = -swing;
        handle.leftArm.rotation.x = -swing * 0.85;
        handle.rightArm.rotation.x = swing * 0.85;
      } else if (!p.grounded) {
        // Arms up in air
        handle.leftArm.rotation.x = THREE.MathUtils.damp(
          handle.leftArm.rotation.x,
          -2.2,
          10,
          dt,
        );
        handle.rightArm.rotation.x = THREE.MathUtils.damp(
          handle.rightArm.rotation.x,
          -2.2,
          10,
          dt,
        );
        handle.leftLeg.rotation.x = 0.35;
        handle.rightLeg.rotation.x = -0.25;
      } else {
        // Idle breathing bob
        const idleWave = Math.sin(elapsedSec * 3.2 + slot) * 0.08;
        handle.leftArm.rotation.x = idleWave;
        handle.rightArm.rotation.x = -idleWave;
        handle.leftLeg.rotation.x = 0;
        handle.rightLeg.rotation.x = 0;
      }
    }

    function tick() {
      if (disposed) return;
      const nowMs = performance.now();
      const rawDt = (nowMs - lastTimeMs) / 1000;
      lastTimeMs = nowMs;
      const dt = Math.min(rawDt > 0 ? rawDt : 1 / 60, 0.05);
      elapsedSec += dt;

      const currentCourse = courseRef.current;
      if (builtSeed !== currentCourse.seed) {
        rebuildCourseGeometry(currentCourse);
        lastFloorAnnounced = 1;
      }

      // Animate moving platforms and rotating hazards
      for (const dyn of dynamicPlats) {
        const platDef = currentCourse.platforms.find((p) => p.id === dyn.defId);
        if (!platDef) continue;
        const pos = getPlatformPositionAtTime(platDef, dyn.slot, elapsedSec);
        dyn.mesh.position.set(pos.x, pos.y, pos.z);
        if (dyn.sweeperBar && platDef.hazardSpeed) {
          dyn.sweeperBar.rotation.y = elapsedSec * platDef.hazardSpeed;
        }
        if (dyn.checkpointRing) {
          dyn.checkpointRing.rotation.z = elapsedSec * 0.8;
        }
      }

      const activeState = gameStateRef.current;
      const slot = mySlotRef.current;
      const myPlayer = playersRef.current[slot];
      const otherSlot: 1 | 2 = slot === 1 ? 2 : 1;
      const rivalPlayer = playersRef.current[otherSlot];

      if (activeState === 'playing' && myPlayer) {
        if (jumpBufferTimer > 0) {
          jumpBufferTimer = Math.max(0, jumpBufferTimer - dt);
        }

        const inputSnap: InputSnapshot = {
          forward: keysHeld.has('KeyW') || keysHeld.has('ArrowUp'),
          backward: keysHeld.has('KeyS') || keysHeld.has('ArrowDown'),
          left: keysHeld.has('KeyA') || keysHeld.has('ArrowLeft'),
          right: keysHeld.has('KeyD') || keysHeld.has('ArrowRight'),
          jumpHeld: keysHeld.has('Space'),
          jumpJustPressed: jumpBufferTimer > 0,
          dashJustPressed: dashJustTriggered,
          unstuckJustPressed: unstuckJustTriggered,
          chatFocused: chatFocusedRef.current,
        };

        dashJustTriggered = false;
        unstuckJustTriggered = false;

        const stepRes = stepPlayerPhysics(
          myPlayer,
          inputSnap,
          currentCourse,
          dt,
          elapsedSec,
        );
        playersRef.current[slot] = stepRes.player;

        if (stepRes.justJumped || stepRes.justDoubleJumped) {
          jumpBufferTimer = 0;
          eggActors[slot].squashY = 1.24;
          sound.playJump(stepRes.justDoubleJumped);
          spawnParticles(
            stepRes.player.position,
            stepRes.justDoubleJumped ? 10 : 5,
            stepRes.justDoubleJumped ? '#fbbf24' : stepRes.player.eggColor,
            3.8,
          );
        }
        if (stepRes.justDashed) {
          eggActors[slot].squashY = 0.82;
          sound.playDash();
          cameraShakeTrauma = Math.min(1, cameraShakeTrauma + 0.35);
          spawnParticles(stepRes.player.position, 14, '#38bdf8', 5.5);
        }
        if (stepRes.justLanded) {
          eggActors[slot].squashY = 0.76;
          sound.playLand();
          spawnParticles(stepRes.player.position, 4, '#cbd5e1', 2.2);
        }
        if (stepRes.justReachedCheckpoint) {
          sound.playCheckpoint();
          const reachedFloor =
            currentCourse.floors[stepRes.justReachedCheckpoint - 1];
          activeBannerText = `${reachedFloor.title} — CHECKPOINT KAYDEDİLDİ!`;
          bannerTimer = 3.2;
          spawnParticles(
            stepRes.player.position,
            22,
            reachedFloor.accentColor,
            6.0,
          );
        }
        if (stepRes.player.currentFloor !== lastFloorAnnounced) {
          lastFloorAnnounced = stepRes.player.currentFloor;
          const fl = currentCourse.floors[lastFloorAnnounced - 1];
          if (fl && fl.anomaly !== 'NONE') {
            sound.playAnomalyAlert();
            activeBannerText = `${fl.anomalyTitle}`;
            bannerTimer = 4.0;
          }
        }
        if (stepRes.justRespawned) {
          sound.playRespawn();
          cameraShakeTrauma = Math.min(1, cameraShakeTrauma + 0.45);
        }
        if (stepRes.antiGlitchReason) {
          activeGlitchNotice = stepRes.antiGlitchReason;
          glitchTimer = 3.0;
        }
        if (stepRes.justFinished) {
          sound.playVictory();
          spawnParticles(stepRes.player.position, 36, '#facc15', 8.0);
        }

        // Step Bot partner if rival is a bot and local player is hosting/driving it
        if (rivalPlayer && rivalPlayer.isBot) {
          const botInput = computeBotInput(rivalPlayer, currentCourse, elapsedSec);
          const botRes = stepPlayerPhysics(
            rivalPlayer,
            botInput,
            currentCourse,
            dt,
            elapsedSec,
          );
          playersRef.current[otherSlot] = botRes.player;
          if (botRes.justFinished) {
            callbacksRef.current.onBotPlayerSync(botRes.player, true);
          }
        }

        // Sync to server at ~15Hz (or immediately on finish)
        syncAccumulator += dt;
        if (syncAccumulator >= 0.066 || stepRes.justFinished) {
          syncAccumulator = 0;
          callbacksRef.current.onLocalPlayerSync(
            stepRes.player,
            stepRes.justFinished,
          );
          if (
            playersRef.current[otherSlot] &&
            playersRef.current[otherSlot]!.isBot
          ) {
            callbacksRef.current.onBotPlayerSync(
              playersRef.current[otherSlot]!,
              false,
            );
          }
        }
      }

      // Update Egg Actors in both chambers
      const p1 = playersRef.current[1];
      const p2 = playersRef.current[2];
      updateActorVisuals(eggActors[1], p1, 1, dt);
      updateActorVisuals(eggActors[2], p2, 2, dt);

      // Update Particles
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        if (particleLife[i] > 0) {
          particleLife[i] -= dt;
          particlePos[i * 3] += particleVel[i * 3] * dt;
          particlePos[i * 3 + 1] += particleVel[i * 3 + 1] * dt;
          particlePos[i * 3 + 2] += particleVel[i * 3 + 2] * dt;
          particleVel[i * 3 + 1] -= 9.8 * dt;
          _dummyObj.position.set(
            particlePos[i * 3],
            particlePos[i * 3 + 1],
            particlePos[i * 3 + 2],
          );
          const s = Math.max(0.01, particleLife[i] * 1.6);
          _dummyObj.scale.setScalar(s);
        } else {
          _dummyObj.position.set(0, -999, 0);
          _dummyObj.scale.setScalar(0.001);
        }
        _dummyObj.updateMatrix();
        particleMesh.setMatrixAt(i, _dummyObj.matrix);
      }
      particleMesh.instanceMatrix.needsUpdate = true;

      // Camera Choreography:
      // On Title Screen -> Scenic Live World Tour across both Glass Chambers
      // In Playing -> Smooth damped chase camera angled slightly toward X=0 so player sees both their own Egg AND their Rival through the glass wall!
      if (activeState === 'title') {
        const panAngle = elapsedSec * 0.32;
        const tourZ = -12 + Math.sin(panAngle * 0.7) * 10;
        _camTargetPos.set(Math.sin(panAngle) * 11, 6.5, tourZ + 14);
        _camLookTarget.set(0, 2.5, tourZ - 6);
        camera.position.lerp(_camTargetPos, 1 - Math.exp(-4 * dt));
        camera.lookAt(_camLookTarget);
      } else {
        const focusPlayer = playersRef.current[slot] || p1;
        if (focusPlayer) {
          const activeFloorMeta = getFloorForZ(
            currentCourse,
            focusPlayer.position.z,
          );
          _fogTargetColor.set(activeFloorMeta.fogColor);
          if (scene.background instanceof THREE.Color) {
            scene.background.lerp(_fogTargetColor, 1 - Math.exp(-2.5 * dt));
          }
          if (scene.fog instanceof THREE.FogExp2) {
            scene.fog.color.lerp(_fogTargetColor, 1 - Math.exp(-2.5 * dt));
          }

          // Angle camera slightly inward toward X=0 so the central glass wall and rival chamber stay in peripheral sight
          const inwardBias = focusPlayer.slot === 1 ? 1.4 : -1.4;
          _camTargetPos.set(
            focusPlayer.position.x + inwardBias,
            focusPlayer.position.y + 4.4,
            focusPlayer.position.z + 8.6,
          );
          _camLookTarget.set(
            focusPlayer.position.x * 0.72,
            focusPlayer.position.y + 1.2,
            focusPlayer.position.z - 5.5,
          );

          const smoothAlpha = 1 - Math.exp(-9.5 * dt);
          camera.position.lerp(_camTargetPos, smoothAlpha);

          if (cameraShakeTrauma > 0) {
            const shake = cameraShakeTrauma * cameraShakeTrauma * 0.35;
            camera.position.x += (Math.random() - 0.5) * shake;
            camera.position.y += (Math.random() - 0.5) * shake;
            cameraShakeTrauma = Math.max(0, cameraShakeTrauma - dt * 2.2);
          }

          camera.lookAt(_camLookTarget);
          keyLight.position.set(
            focusPlayer.position.x + 16,
            focusPlayer.position.y + 32,
            focusPlayer.position.z + 18,
          );
          keyLight.target.position.set(
            0,
            focusPlayer.position.y,
            focusPlayer.position.z - 8,
          );
        }
      }

      // Timers & Throttled HUD updates (<= 10Hz)
      if (bannerTimer > 0) {
        bannerTimer -= dt;
        if (bannerTimer <= 0) activeBannerText = null;
      }
      if (glitchTimer > 0) {
        glitchTimer -= dt;
        if (glitchTimer <= 0) activeGlitchNotice = null;
      }

      hudAccumulator += dt;
      if (hudAccumulator >= 0.1) {
        hudAccumulator = 0;
        const me = playersRef.current[slot];
        const riv = playersRef.current[otherSlot];
        const myFloorMeta = me
          ? getFloorForZ(currentCourse, me.position.z)
          : currentCourse.floors[0];
        callbacksRef.current.onHudUpdate({
          myProgress: me ? me.progress : 0,
          rivalProgress: riv ? riv.progress : 0,
          myFloor: myFloorMeta,
          rivalFloorNumber: riv ? riv.currentFloor : 1,
          bannerText: activeBannerText,
          antiGlitchNotice: activeGlitchNotice,
          respawnCount: me ? me.respawnCount : 0,
          airJumpsLeft: me ? me.airJumpsLeft : 0,
          dashCooldownLeft: me ? me.dashCooldownLeft : 0,
        });
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearInputs);
      resizeObserver.disconnect();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      data-testid="parkour-3d-canvas"
      className="fixed inset-0 w-full h-full overflow-hidden"
    />
  );
};
