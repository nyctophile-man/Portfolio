import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function roundedBox(w, h, d, r, bevel) {
  const depth = d - 2 * bevel;
  const g = new THREE.ExtrudeGeometry(roundedRect(w - 2 * bevel, h - 2 * bevel, r), {
    depth,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 5,
    curveSegments: 14,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));

const TAPER = 0.3;
const taperAt = (z) => 1 - TAPER * clamp01((0.1 - z) / 0.95);
const sideX = (z) => 1.15 * taperAt(z);


const CH = ['FACE', 'TERM', 'EQ', 'SCOPE', 'SIGNAL'];
const SW = 512; // logical size the TERM/EQ/SCOPE/SIGNAL channels are drawn in
const SH = 380;
const PX_W = 640; // real canvas size (original screen)
const PX_H = 560;
const FONT = 'VT323, monospace';
const CELL = 10;
const PH = [
  'boot telebot --mood=chill',
  'ping mouse.local ... ok',
  'loading eyes.dll',
  'sync(cursor, head)',
  'gaze.lock = true',
  'signal ok',
  'opinions: loaded (slightly)',
  'render(tv) // 60fps',
];

/* ---------- model position controls (tweak from here) ---------- */
const VIEW_ZOOM = 1; // >1 = bigger model, <1 = smaller
const VIEW_SHIFT_X = 0; // + = model moves left, - = model moves right
const VIEW_SHIFT_Y = 0.15; // + = model moves down, - = model moves up

const SR_ONLY = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  border: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
};

function TvHeadScene({ style }) {
  const mountRef = useRef(null);
  const apiRef = useRef(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // retro pixel font for the screen (falls back to monospace)
    if (!document.getElementById('vt323-font')) {
      const l = document.createElement('link');
      l.id = 'vt323-font';
      l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=VT323&display=swap';
      document.head.appendChild(l);
    }
    if (document.fonts) document.fonts.load('18px VT323');

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
    scene.environment = envTex;

    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

    const key = new THREE.DirectionalLight(0xfff3ec, 2.0);
    key.position.set(-3, 5, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -4;
    key.shadow.camera.right = 4;
    key.shadow.camera.top = 5;
    key.shadow.camera.bottom = -5;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 25;
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.03;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xdfe8ff, 0.5);
    fill.position.set(4, 1, 4);
    scene.add(fill);

    const plastic = new THREE.MeshPhysicalMaterial({
      color: '#dcd6d8',
      roughness: 0.5,
      metalness: 0,
      clearcoat: 0.4,
      clearcoatRoughness: 0.4,
    });
    const rimMat = new THREE.MeshStandardMaterial({ color: '#b9b9bd', metalness: 0.85, roughness: 0.28 });
    const blackGloss = new THREE.MeshPhysicalMaterial({
      color: '#050506',
      roughness: 0.25,
      metalness: 0.2,
      clearcoat: 0.6,
    });
    const darkPlastic = new THREE.MeshStandardMaterial({ color: '#1b1b1e', roughness: 0.55, metalness: 0.3 });
    const metal = new THREE.MeshStandardMaterial({ color: '#9a9aa0', metalness: 0.9, roughness: 0.3 });

    const makeRib = (repeatX, repeatY) => {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 8;
      const cx = c.getContext('2d');
      for (let i = 0; i < 64; i += 1) {
        const v = Math.round(128 + 127 * Math.sin((i / 64) * Math.PI * 2 * 8));
        cx.fillStyle = `rgb(${v},${v},${v})`;
        cx.fillRect(i, 0, 1, 8);
      }
      const t = new THREE.CanvasTexture(c);
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeatX, repeatY);
      return t;
    };
    const knit = (repeatX, repeatY) =>
      new THREE.MeshPhysicalMaterial({
        color: '#c9bac1',
        roughness: 0.9,
        sheen: 1,
        sheenRoughness: 0.5,
        sheenColor: new THREE.Color('#efe4ea'),
        bumpMap: makeRib(repeatX, repeatY),
        bumpScale: 1.2,
      });

    const body = new THREE.Group();
    scene.add(body);

    const profile = new THREE.SplineCurve(
      [
        [0.0, -3.8], [1.3, -3.8], [1.42, -3.2], [1.45, -2.3], [1.42, -1.6],
        [1.32, -1.15], [1.1, -0.82], [0.8, -0.55], [0.45, -0.4], [0.0, -0.38],
      ].map(([x, y]) => new THREE.Vector2(x, y))
    );
    const torso = new THREE.Mesh(new THREE.LatheGeometry(profile.getPoints(80), 72), knit(30, 3));
    torso.scale.set(1.45, 1, 0.6);
    torso.receiveShadow = true;
    body.add(torso);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.66, 1.4, 56, 1, true), knit(12, 2));
    neck.position.y = -0.35;
    neck.receiveShadow = true;
    body.add(neck);

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.15, 28, 64), knit(12, 1));
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.27;
    collar.receiveShadow = true;
    body.add(collar);

    const pivot = new THREE.Group();
    const PIVOT_Y = 0.35;
    pivot.position.set(0, PIVOT_Y, 0);
    scene.add(pivot);

    const head = new THREE.Group();
    head.position.y = 1.12;
    pivot.add(head);

    const casingGeo = roundedBox(2.3, 2.1, 1.7, 0.24, 0.1);
    const cp = casingGeo.attributes.position;
    for (let i = 0; i < cp.count; i += 1) {
      const s = taperAt(cp.getZ(i));
      cp.setX(i, cp.getX(i) * s);
      cp.setY(i, cp.getY(i) * s);
    }
    casingGeo.computeVertexNormals();
    head.add(new THREE.Mesh(casingGeo, plastic));

    const rim = new THREE.Mesh(roundedBox(2.12, 1.9, 0.14, 0.17, 0.03), rimMat);
    rim.position.z = 0.9;
    head.add(rim);

    const panel = new THREE.Mesh(roundedBox(1.98, 1.76, 0.14, 0.14, 0.03), blackGloss);
    panel.position.z = 0.92;
    head.add(panel);

    /* ---------- screen (canvas texture) ---------- */
    const sc = document.createElement('canvas');
    sc.width = PX_W;
    sc.height = PX_H;
    const ctx = sc.getContext('2d');
    const screenTex = new THREE.CanvasTexture(sc);
    if ('colorSpace' in screenTex) screenTex.colorSpace = THREE.SRGBColorSpace;

    const SCREEN_W = 1.7;
    const SCREEN_H = 1.46;
    const SCREEN_Y = 0;
    const screenGeo = new THREE.PlaneGeometry(SCREEN_W, SCREEN_H, 28, 24);
    const sp = screenGeo.attributes.position;
    for (let i = 0; i < sp.count; i += 1) {
      const nx = sp.getX(i) / (SCREEN_W / 2);
      const ny = sp.getY(i) / (SCREEN_H / 2);
      sp.setZ(i, 0.035 * (1 - (nx * nx + ny * ny) / 2));
    }
    screenGeo.computeVertexNormals();

    const screen = new THREE.Mesh(
      screenGeo,
      new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false })
    );
    screen.position.set(0, SCREEN_Y, 0.985);
    head.add(screen);

    /* ---------- 4 small channel buttons (same look as the original strip) ---------- */
    const BTN_Z = 0.995;
    const BTN_Y = -0.81;
    const buttons = [0.51, 0.615, 0.72, 0.825].map((x, i) => {
      const mat = new THREE.MeshStandardMaterial({
        color: '#3b3b40',
        emissive: '#3350ff',
        emissiveIntensity: 0,
        roughness: 0.5,
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.03, 0.02), mat);
      mesh.position.set(x, BTN_Y, BTN_Z);
      head.add(mesh);
      // invisible, bigger hit area so the tiny buttons are easy to click
      const hit = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 0.06), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.set(x, BTN_Y, BTN_Z);
      hit.userData.idx = i;
      head.add(hit);
      return { mesh, mat, hit, pressUntil: 0 };
    });
    const btnMeshes = buttons.map((b) => b.hit);

    [-1, 1].forEach((side) => {
      [0.5, -0.5].forEach((y0) => {
        for (let i = 0; i < 9; i += 1) {
          const z = -0.78 + i * 0.065;
          const slat = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.36, 0.022), darkPlastic);
          slat.position.set(side * (sideX(z) + 0.004), y0, z);
          slat.rotation.y = side * 0.32;
          head.add(slat);
        }
      });
    });

    [-1, 1].forEach((side) => {
      const cup = new THREE.Group();
      cup.position.set(side * 1.26, 0.1, 0.15);
      cup.rotation.z = -side * (Math.PI / 2);

      cup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.22, 48), blackGloss));

      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.03, 14, 48), rimMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.115;
      cup.add(ring);

      const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.33, 0.05, 40), darkPlastic);
      dome.position.y = 0.125;
      cup.add(dome);

      const inner = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.012, 10, 36), metal);
      inner.rotation.x = -Math.PI / 2;
      inner.position.y = 0.155;
      cup.add(inner);

      const capc = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 28), metal);
      capc.position.y = 0.16;
      cup.add(capc);

      head.add(cup);
    });

    const plate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.8), darkPlastic);
    plate.position.set(0, -1.08, 0.1);
    head.add(plate);

    [-0.3, 0, 0.3].forEach((x) => {
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 16), darkPlastic);
      sleeve.position.set(x, -1.14, 0.6);
      head.add(sleeve);
      const plug = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.26, 12), metal);
      plug.position.set(x, -1.27, 0.6);
      head.add(plug);
    });

    head.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });

    const cableMat = new THREE.MeshStandardMaterial({ color: '#050506', roughness: 0.5, metalness: 0.2 });
    const cableDefs = [
      { start: [1.3, 0.0, -0.1], end: [1.25, -1.05, 0.42], out: 1, loop: 0.45, slack: 0.1, drop: -0.35 },
      { start: [1.3, -0.05, -0.2], end: [0.9, -1.15, 0.58], out: 1, loop: 0.2, slack: 0.25, drop: -0.4 },
      { start: [-1.3, 0.0, -0.1], end: [-1.25, -1.05, 0.42], out: -1, loop: 0.45, slack: 0.1, drop: -0.35 },
      { start: [-1.3, -0.05, -0.2], end: [-0.8, -1.2, 0.6], out: -1, loop: 0.2, slack: 0.25, drop: -0.4 },
      { start: [-0.3, -1.4, 0.6], end: [-0.35, -1.15, 0.64], out: -1, loop: 0.25, slack: 0.3, drop: -0.3 },
      { start: [0.0, -1.4, 0.6], end: [0.15, -1.1, 0.66], out: 1, loop: 0.15, slack: 0.35, drop: -0.3 },
      { start: [0.3, -1.4, 0.6], end: [0.55, -1.2, 0.64], out: 1, loop: 0.3, slack: 0.3, drop: -0.3 },
    ];
    const cables = cableDefs.map((def) => {
      const mesh = new THREE.Mesh(new THREE.BufferGeometry(), cableMat);
      scene.add(mesh);
      return { def, mesh };
    });

    const updateCables = () => {
      cables.forEach(({ def, mesh }) => {
        const S = head.localToWorld(new THREE.Vector3(...def.start));
        const E = new THREE.Vector3(...def.end);
        const p1 = S.clone().add(new THREE.Vector3(def.out * 0.12, def.drop, 0.06));
        const p2 = S.clone()
          .lerp(E, 0.5)
          .add(new THREE.Vector3(def.out * def.loop, -0.1, 0.25 + def.slack));
        const p3 = p2.clone().lerp(E, 0.6).add(new THREE.Vector3(0, -0.05, 0.08));
        const curve = new THREE.CatmullRomCurve3([S, p1, p2, p3, E], false, 'centripetal');
        mesh.geometry.dispose();
        mesh.geometry = new THREE.TubeGeometry(curve, 40, 0.012, 5, false);
      });
    };

    /* ---------- interaction state ---------- */
    const mouse = { x: 0, y: 0 }; // -1..1, y is up
    const eased = { x: 0, y: 0 };
    let spd = 0; // pointer speed, drives glitches
    let tNow = 0;
    let osdUntil = 0;
    let staticUntil = 0;
    let ch = 0;
    const AUTO_MS = 3; // seconds between automatic channel changes
    let nextAuto = AUTO_MS;
    let hovered = -1;

    const onMove = (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -((e.clientY / window.innerHeight) * 2 - 1);
      spd = Math.max(spd, Math.hypot(e.movementX || 0, e.movementY || 0));
    };
    window.addEventListener('pointermove', onMove);

    /* ---------- channel switching ---------- */
    let audio = null;
    const blip = (freq, dur) => {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        audio = audio || new AC();
        const o = audio.createOscillator();
        const g = audio.createGain();
        o.type = 'square';
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.04, audio.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
        o.connect(g);
        g.connect(audio.destination);
        o.start();
        o.stop(audio.currentTime + dur);
      } catch (err) {
        /* audio is optional */
      }
    };

    const setChannel = (next, silent = false) => {
      ch = next;
      nextAuto = tNow + AUTO_MS; // restart the 3s timer (also after a manual press)
      osdUntil = tNow + 1.6;
      staticUntil = tNow + 0.3;
      if (!silent) blip(next ? 160 + next * 60 : 130, 0.12);
      setActive(next);
    };
    // buttons are channels 1-4; pressing the lit one returns to the face
    const press = (n) => setChannel(ch === n ? 0 : n);
    apiRef.current = { press };

    /* ---------- raycasting for the buttons ---------- */
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const pick = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(btnMeshes, false)[0];
      return hit ? hit.object.userData.idx : -1;
    };
    const onCanvasMove = (e) => {
      hovered = pick(e);
      renderer.domElement.style.cursor = hovered >= 0 ? 'pointer' : 'default';
    };
    const onCanvasLeave = () => {
      hovered = -1;
      renderer.domElement.style.cursor = 'default';
    };
    const onCanvasDown = (e) => {
      const i = pick(e);
      if (i < 0) return;
      buttons[i].pressUntil = tNow + 0.12;
      press(i + 1);
    };
    renderer.domElement.addEventListener('pointermove', onCanvasMove);
    renderer.domElement.addEventListener('pointerleave', onCanvasLeave);
    renderer.domElement.addEventListener('pointerdown', onCanvasDown);

    /* ---------- channel drawing ---------- */
    const stars = Array.from({ length: 80 }, () => [Math.random() * SW, Math.random() * SH, Math.random() * 6]);
    let logT = 0;
    const log = [];

    const glitch = (p) => {
      if (Math.random() < p) {
        const sy = Math.random() * (PX_H - 40);
        const hh = 8 + Math.random() * 30;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(sc, 0, sy, PX_W, hh, (Math.random() - 0.5) * 60, sy, PX_W, hh);
        ctx.restore();
      }
    };
    const pix = (x, y, w = CELL - 2, h = CELL - 2) => {
      ctx.fillRect(Math.round(x / CELL) * CELL, Math.round(y / CELL) * CELL, w, h);
    };
    const lens = (cx, cy, rx, ry, sh) => {
      for (let gy = -ry; gy <= ry; gy += CELL) {
        for (let gx = -rx; gx <= rx; gx += CELL) {
          if ((gx / rx) ** 2 + (gy / Math.max(ry, 1)) ** 2 <= 1) pix(cx + gx + gy * sh, cy + gy);
        }
      }
    };

    const W = PX_W;
    const H = PX_H;
    const faceStars = Array.from({ length: 70 }, () => [Math.random() * W, Math.random() * H, 1 + Math.random() * 1.5]);

    const drawGlyph = (alpha, t) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#f4f4f4';
      ctx.lineWidth = 13;
      ctx.lineCap = 'round';
      const wob = (n) => Math.sin(t * 9 + n) * 1.6;
      const star = (cx, cy, flip) => {
        const segs = [
          [0, -70, 0, 70],
          [-85, 8, 85, 8],
          [flip * -62, -50, flip * 62, 52],
        ];
        segs.forEach(([x1, y1, x2, y2], i) => {
          ctx.beginPath();
          ctx.moveTo(cx + x1 + wob(i), cy + y1);
          ctx.lineTo(cx + x2, cy + y2 + wob(i + 3));
          ctx.stroke();
        });
      };
      star(W / 2 - 110, H / 2, 1);
      star(W / 2 + 110, H / 2, -1);
      ctx.beginPath();
      ctx.arc(W / 2, H / 2 + 20, 92, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.restore();
    };

    const drawEyes = (alpha, t) => {
      const phase = t % 4.2;
      const blinkY = phase > 4.05 ? 1 - Math.sin(((phase - 4.05) / 0.15) * Math.PI) * 0.92 : 1;
      const r = 72;
      ctx.save();
      ctx.globalAlpha = alpha;
      [-1, 1].forEach((side) => {
        const ex = W / 2 + side * 118 + eased.x * 40;
        const ey = H / 2 - eased.y * 28;
        ctx.save();
        ctx.translate(ex, ey);
        ctx.scale(1, blinkY);

        ctx.globalCompositeOperation = 'lighter';
        [['rgba(90,170,255,0.55)', -6], ['rgba(255,150,80,0.5)', 6]].forEach(([col, dx]) => {
          const g = ctx.createRadialGradient(dx, 0, 0, dx, 0, r * 1.15);
          g.addColorStop(0, col);
          g.addColorStop(0.7, col);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(dx, 0, r * 1.15, 0, Math.PI * 2);
          ctx.fill();
        });

        const core = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        core.addColorStop(0, '#ffffff');
        core.addColorStop(0.65, '#fffaf0');
        core.addColorStop(0.9, 'rgba(255,240,225,0.85)');
        core.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      ctx.restore();
    };

    const face = (t) => {
      ctx.fillStyle = '#04070a';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      faceStars.forEach(([x, y, s]) => ctx.fillRect(x, y, s, s));

      const glyphA = clamp01((2.2 - t) / 0.4);
      const eyesA = clamp01((t - 2.0) / 0.5);
      if (glyphA > 0) drawGlyph(glyphA, t);
      if (eyesA > 0) drawEyes(eyesA, t);
    };

    const term = (t) => {
      ctx.fillStyle = '#04050b';
      ctx.fillRect(0, 0, SW, SH);
      stars.forEach((s) => {
        ctx.fillStyle = `rgba(200,215,255,${0.25 + 0.5 * Math.sin(t * 2 + s[2])})`;
        ctx.fillRect(s[0], s[1], 2, 2);
      });
      if (t - logT > 0.35) {
        logT = t;
        log.push(`${PH[(Math.random() * PH.length) | 0]}  0x${((Math.random() * 65535) | 0).toString(16)}`);
        if (log.length > 6) log.shift();
      }
      ctx.fillStyle = 'rgba(50,54,150,.8)';
      ctx.fillRect(0, 0, SW, 104);
      ctx.font = `18px ${FONT}`;
      ctx.fillStyle = '#a2adff';
      log.forEach((l, i) => ctx.fillText(`> ${l}`, 18, 26 + i * 15));
      ctx.fillStyle = '#ff9ad6';
      ctx.font = `15px ${FONT}`;
      log.forEach((l, i) => ctx.fillText(l.slice(-6), SW - 80, 26 + i * 15));

      const y = SH * 0.55 - eased.y * 60;
      const len = SW * 0.42 * (0.85 + 0.15 * Math.sin(t * 2));
      const x0 = SW * 0.33;
      const g = ctx.createLinearGradient(x0, 0, x0 + len, 0);
      g.addColorStop(0, 'rgba(255,255,255,.1)');
      g.addColorStop(0.3, '#fff');
      g.addColorStop(0.7, '#9ab8ff');
      g.addColorStop(1, '#ff9ad6');
      ctx.shadowColor = '#8fb0ff';
      ctx.shadowBlur = 22;
      ctx.fillStyle = g;
      ctx.fillRect(x0, y, len, 8);
      ctx.globalAlpha = 0.25;
      ctx.fillRect(x0 - 20, y - 8, len + 40, 24);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#b8a0ff';
      ctx.fillRect(72, y + 2, 8, 6);
      ctx.shadowBlur = 0;
      glitch(0.03 + Math.min(spd / 150, 0.5));
    };

    const eq = (t) => {
      ctx.fillStyle = '#04050b';
      ctx.fillRect(0, 0, SW, SH);
      const up = (1 + mouse.y) / 2; // 0 bottom .. 1 top
      const lv = 0.45 + up * 0.8;
      for (let i = 0; i < 14; i += 1) {
        const v = Math.min(1, ((Math.sin(t * 3.1 + i * 0.7) + Math.sin(t * 5.3 + i * 1.9) + 2) / 4) * lv);
        const n = Math.floor(v * 13);
        for (let k = 0; k < n; k += 1) {
          ctx.fillStyle = k < 8 ? '#7fd0ff' : k < 11 ? '#8aa8ff' : '#c58bff';
          ctx.fillRect(40 + i * 31, SH - 40 - k * 24, 24, 17);
        }
      }
    };

    const scope = (t) => {
      ctx.fillStyle = '#050c1c';
      ctx.fillRect(0, 0, SW, SH);
      ctx.strokeStyle = 'rgba(138,168,255,.2)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= SW; x += 51) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, SH);
        ctx.stroke();
      }
      for (let y = 0; y <= SH; y += 54) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(SW, y);
        ctx.stroke();
      }
      const up = (1 + mouse.y) / 2;
      const amp = 25 + up * 120;
      const f = 2 + ((mouse.x + 1) / 2) * 12;
      ctx.shadowColor = '#7fd0ff';
      ctx.shadowBlur = 14;
      ctx.lineWidth = 4;
      [['#7fd0ff', 1, 0], ['#c58bff', 0.5, 1.5]].forEach(([col, a, ph]) => {
        ctx.strokeStyle = col;
        ctx.beginPath();
        for (let x = 0; x <= SW; x += 4) {
          const y = SH / 2 + Math.sin((x / SW) * f * 6.28 + t * 3 + ph) * amp * a * (0.7 + 0.3 * Math.sin(x / 60 + t));
          if (x) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.stroke();
      });
      ctx.shadowBlur = 0;
    };

    const signal = () => {
      const c = ['#c8c8c8', '#c8c800', '#00c8c8', '#00c800', '#c800c8', '#c80000', '#0000c8'];
      const bw = SW / 7;
      c.forEach((k, i) => {
        ctx.fillStyle = k;
        ctx.fillRect(i * bw, 0, bw + 1, 250);
      });
      ['#0000c8', '#111', '#c800c8', '#111', '#00c8c8', '#111', '#c8c8c8'].forEach((k, i) => {
        ctx.fillStyle = k;
        ctx.fillRect(i * bw, 250, bw + 1, 36);
      });
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 286, SW, SH - 286);
      ctx.fillStyle = '#fff';
      ctx.fillRect(90, 304, 100, 52);
      for (let i = 0; i < 20; i += 1) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.6})`;
        ctx.fillRect(Math.random() * SW, Math.random() * SH, 4 + Math.random() * 10, 2);
      }
      glitch(0.1 + Math.min(spd / 120, 0.7));
    };

    const DRAW = [face, term, eq, scope, signal];

    const drawScreen = (t) => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      if (ch === 0) {
        face(t);
      } else {
        ctx.save();
        ctx.scale(PX_W / SW, PX_H / SH);
        DRAW[ch](t);
        ctx.restore();
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      // CRT vignette, scanlines and noise on every channel
      const v = ctx.createRadialGradient(PX_W / 2, PX_H / 2, PX_H * 0.3, PX_W / 2, PX_H / 2, PX_H * 0.85);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(0,0,0,0.7)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, PX_W, PX_H);

      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      for (let y = 0; y < PX_H; y += 3) ctx.fillRect(0, y, PX_W, 1);
      for (let i = 0; i < 18; i += 1) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
        ctx.fillRect(Math.random() * PX_W, Math.random() * PX_H, Math.random() * 120, 1);
      }

      // static burst when the channel changes
      if (t < staticUntil) {
        for (let i = 0; i < 160; i += 1) {
          ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.7})`;
          ctx.fillRect(Math.random() * PX_W, Math.random() * PX_H, 10 + Math.random() * 90, 2 + Math.random() * 4);
        }
      }

      // on-screen channel label
      if (t < osdUntil) {
        ctx.font = `28px ${FONT}`;
        ctx.fillStyle = '#7dff9a';
        ctx.shadowColor = '#7dff9a';
        ctx.shadowBlur = 8;
        ctx.fillText(`CH 0${ch + 1}  ${CH[ch]}`, 28, 52);
        ctx.shadowBlur = 0;
      }
      screenTex.needsUpdate = true;
    };

    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const tn = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const needH = 3.9 / VIEW_ZOOM;
      const needW = 4.7 / VIEW_ZOOM;
      const d = Math.max(needH / (2 * tn), needW / (2 * tn * camera.aspect));
      const visH = 2 * d * tn;
      const lookY = -1.05 + visH / 2 + VIEW_SHIFT_Y;
      camera.position.set(VIEW_SHIFT_X, lookY + 0.1, d);
      camera.lookAt(VIEW_SHIFT_X, lookY, 0);
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    const clock = new THREE.Clock();
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t = clock.getElapsedTime();
      tNow = t;

      eased.x += (mouse.x - eased.x) * 0.06;
      eased.y += (mouse.y - eased.y) * 0.06;
      spd *= 0.92;
      if (t >= nextAuto) setChannel((ch + 1) % CH.length, true);

      pivot.rotation.y = eased.x * 0.85;
      pivot.rotation.x = -eased.y * 0.4;
      pivot.rotation.z = -eased.x * 0.05;
      pivot.position.x = eased.x * 0.3;
      pivot.position.y = PIVOT_Y + (reduceMotion ? 0 : Math.sin(t * 1.2) * 0.025);
      body.rotation.y = eased.x * 0.08;

      // button glow, hover and press
      buttons.forEach((b, i) => {
        const on = ch === i + 1;
        const target = on ? 2 : hovered === i ? 0.8 : 0;
        b.mat.emissiveIntensity += (target - b.mat.emissiveIntensity) * 0.25;
        b.mat.color.set(on ? '#6f8bff' : '#3b3b40');
        b.mesh.position.z = BTN_Z - (t < b.pressUntil ? 0.008 : 0);
      });

      pivot.updateMatrixWorld(true);
      updateCables();
      drawScreen(t);
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('pointermove', onCanvasMove);
      renderer.domElement.removeEventListener('pointerleave', onCanvasLeave);
      renderer.domElement.removeEventListener('pointerdown', onCanvasDown);
      ro.disconnect();
      apiRef.current = null;
      if (audio) audio.close();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (o.material.map) o.material.map.dispose();
          if (o.material.bumpMap) o.material.bumpMap.dispose();
          o.material.dispose();
        }
      });
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minWidth: 0, overflow: 'hidden', ...style }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      {/* keyboard / screen-reader access to the same channel buttons */}
      <div role="group" aria-label="TV channels" style={SR_ONLY}>
        {CH.slice(1).map((name, i) => (
          <button
            key={name}
            type="button"
            aria-pressed={active === i + 1}
            onClick={() => apiRef.current && apiRef.current.press(i + 1)}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';

function Pill({ label, href }) {
  const [hover, setHover] = useState(false);

  return (
    <a
      href={href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        padding: '11px 28px 11px 24px', // width never changes on hover, so the row cannot wrap or jump
        borderRadius: '999px',
        background: 'rgba(255,255,255,0.92)',
        color: hover ? '#ffffff' : '#141414',
        textDecoration: 'none',
        fontSize: '15px',
        fontWeight: 500,
        whiteSpace: 'nowrap',
        transform: hover ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hover
          ? '0 14px 26px rgba(0,0,0,0.25)'
          : '0 2px 6px rgba(0,0,0,0.08)',
        // text turns white only after the dark fill has started covering it
        transition: `transform 0.45s ${ease}, box-shadow 0.45s ${ease}, color 0.25s ease ${hover ? '0.12s' : '0s'}`,
      }}
    >
      {/* the clip lives on its own layer so the rounded shape holds while the circle animates */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          borderRadius: 'inherit',
          clipPath: 'inset(0 round 999px)',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            position: 'absolute',
            left: '50%',
            top: '100%',
            width: '125%',
            aspectRatio: '1 / 1',
            borderRadius: '50%',
            background: '#141414',
            transform: `translate(-50%, ${hover ? '-74%' : '0%'}) scale(${hover ? 1 : 0.3})`,
            transition: `transform 0.55s ${ease}`,
          }}
        />
      </span>
      <span
        style={{
          position: 'relative',
          zIndex: 1,
          transform: hover ? 'translateX(-6px)' : 'translateX(0)',
          transition: `transform 0.4s ${ease}`,
        }}
      >
        {label}
      </span>
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: '12px',
          top: '50%',
          zIndex: 1,
          opacity: hover ? 1 : 0,
          transform: `translate(${hover ? '0px' : '-6px'}, -50%)`,
          transition: `all 0.4s ${ease}`,
        }}
      >
        &#8599;
      </span>
    </a>
  );
}

const MESSAGES = [
  "Hi, I'm Ayushman, a frontend developer who turns ideas into smooth web experiences.",
  'I build with React, JavaScript and a lot of curiosity.',
  'Every project here started as a small idea. Take a look around.',
  "Have a project in mind? Let's build it together.",
];

const PILLS = [
  { label: 'My journey', href: '/journey' },
  { label: 'Get in touch', href: '/contact' },
  { label: 'Download CV', href: '/cv.pdf' },
];

export default function About() {
  const [msgIdx, setMsgIdx] = useState(0);
  const [count, setCount] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [unlocked, setUnlocked] = useState(false); // browsers only allow speech after a click/key press
  const [speechDone, setSpeechDone] = useState(true);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const voiceOn = supported && soundOn && unlocked;

  // first click or key press anywhere unlocks the voice and restarts the message so text and voice start together
  useEffect(() => {
    if (!supported || unlocked) return undefined;
    const unlock = (e) => {
      if (e.target && e.target.closest && e.target.closest('[data-sound-toggle]')) return;
      setUnlocked(true);
      setCount(0);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [supported, unlocked]);

  // read the current message out loud, word for word
  useEffect(() => {
    if (!voiceOn) {
      setSpeechDone(true);
      return undefined;
    }
    let cancelled = false;
    setSpeechDone(false);
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(MESSAGES[msgIdx]);
    u.lang = 'en-US';
    u.rate = 1;
    u.onend = () => {
      if (!cancelled) setSpeechDone(true);
    };
    u.onerror = () => {
      if (!cancelled) setSpeechDone(true);
    };
    synth.speak(u);
    return () => {
      cancelled = true;
      synth.cancel();
    };
  }, [msgIdx, voiceOn]);

  const toggleSound = () => {
    if (!voiceOn) {
      setSoundOn(true);
      setUnlocked(true);
      setCount(0);
    } else {
      setSoundOn(false);
    }
  };

  useEffect(() => {
    const full = MESSAGES[msgIdx];
    if (count < full.length) {
      // type a bit slower while the voice is speaking so text and voice stay close
      const id = setTimeout(() => setCount((c) => c + 1), voiceOn ? 55 : 32);
      return () => clearTimeout(id);
    }
    if (!speechDone) return undefined; // wait until the voice finishes the sentence
    const id = setTimeout(() => {
      setMsgIdx((i) => (i + 1) % MESSAGES.length);
      setCount(0);
    }, 2600);
    return () => clearTimeout(id);
  }, [msgIdx, count, voiceOn, speechDone]);

  const prev = msgIdx > 0 ? MESSAGES[msgIdx - 1] : null;

  return (
    <section
      id="about"
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '100vw',
        minHeight: '100vh',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        overflow: 'hidden',
        boxSizing: 'border-box',
        fontFamily: 'Poppins, "Segoe UI", Arial, sans-serif',
        color: '#141414',
      }}
    >
      <style>{`
        @keyframes aboutCaret { 50% { opacity: 0; } }
        .ab-text { flex: 1 1 380px; padding: 0 clamp(24px, 4vw, 56px); box-sizing: border-box; z-index: 1; }
        .ab-scene { flex: 1 1 420px; align-self: flex-end; height: min(92vh, 820px); min-height: 420px; background: transparent; }
        @media (max-width: 900px) {
          /* stacked layout: text upar, TV-head scene chhota neeche */
          #about { min-height: auto !important; padding: 18px 0 40px; }
          .ab-text { flex-basis: 100%; padding: 0 24px; }
          .ab-scene { flex-basis: 100%; align-self: center; height: min(64vh, 520px); min-height: 340px; }
        }
        @media (max-width: 600px) {
          .ab-scene { height: min(56vh, 430px); min-height: 300px; }
        }
      `}</style>

      <div
        className="ab-text"
      >
        <p
          aria-hidden="true"
          style={{
            margin: '0 0 22px',
            maxWidth: '520px',
            fontSize: '15px',
            lineHeight: 1.45,
            opacity: prev ? 0.5 : 0,
            filter: 'blur(3px)',
            minHeight: '44px',
            transition: 'opacity 0.5s ease',
          }}
        >
          {prev}
        </p>

        <h1
          style={{
            display: 'grid',
            margin: '0 0 30px',
            maxWidth: '520px',
            fontSize: 'clamp(24px, 2.6vw, 36px)',
            fontWeight: 400,
            lineHeight: 1.25,
            letterSpacing: '-0.2px',
          }}
        >
          {/* invisible copies of every message keep the heading as tall as the longest one */}
          {MESSAGES.map((m) => (
            <span key={m} aria-hidden="true" style={{ gridArea: '1 / 1', visibility: 'hidden' }}>
              {m}
            </span>
          ))}
          <span style={{ gridArea: '1 / 1' }}>
            {MESSAGES[msgIdx].slice(0, count)}
            <span
              style={{
                display: 'inline-block',
                width: '3px',
                height: '1em',
                marginLeft: '4px',
                verticalAlign: '-0.12em',
                background: '#141414',
                animation: 'aboutCaret 1s steps(1) infinite',
              }}
            />
          </span>
        </h1>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', maxWidth: '640px' }}>
          {PILLS.map((p) => (
            <Pill key={p.label} label={p.label} href={p.href} />
          ))}
          {supported && (
            <button
              type="button"
              data-sound-toggle
              onClick={toggleSound}
              aria-pressed={voiceOn}
              aria-label={voiceOn ? 'Turn voice off' : 'Turn voice on'}
              title={voiceOn ? 'Voice on' : 'Click to hear it'}
              style={{
                width: '44px',
                height: '44px',
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                borderRadius: '999px',
                background: voiceOn ? '#141414' : 'rgba(255,255,255,0.92)',
                color: voiceOn ? '#ffffff' : '#141414',
                boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                cursor: 'pointer',
                transition: 'background 0.3s ease, color 0.3s ease',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 9v6h4l5 4V5L8 9H4z" />
                {voiceOn ? (
                  <>
                    <path d="M16.5 8.5a5 5 0 010 7" />
                    <path d="M19 6a8.5 8.5 0 010 12" />
                  </>
                ) : (
                  <>
                    <path d="M16.5 9.5l5 5" />
                    <path d="M21.5 9.5l-5 5" />
                  </>
                )}
              </svg>
            </button>
          )}
        </div>
      </div>

      <div
        className="ab-scene"
      >
        <TvHeadScene />
      </div>
    </section>
  );
}