import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/* ====== EDIT THIS ====== */
const PROFILE = { name: 'Ayushman', role: 'Student & Web Developer', status: 'Open for projects' };
const LINKS = {
  github: { url: 'https://github.com/nyctophile-man', label: 'github.com/nyctophile-man' },
  linkedin: { url: 'https://www.linkedin.com/in/ayushman-kumar-685315389', label: 'linkedin.com/in/ayushman-kumar-685315389' },
  email: { url: 'mailto:kumarayushman72@gmail.com', label: 'kumarayushman72@gmail.com' },
};
/* ======================= */

/* site theme (same tokens as Journey / About) */
const INK = '#14161f';
const ACCENT = '#3a3af0';
const SKY = '#eceef4'; /* scene background, fog and section background all use this */
const HEAD = '"Bricolage Grotesque", "Helvetica Neue", Arial, sans-serif';
const BODY = '"DM Sans", "Helvetica Neue", Arial, sans-serif';
const CODE = 'ui-monospace, Menlo, Consolas, monospace';

/* three.js 155+ lights are physically based; older builds need the legacy scale */
const LK = parseInt(THREE.REVISION, 10) >= 155 ? 1 : 1 / Math.PI;

const ZONES = [
  { room: 'Entrance', title: '01 / Entrance', cap: 'Follow the blue line. Code on the left, network on the right, letterbox at the end.', z1: -10 },
  { room: 'Atrium', title: '02 / Atrium', cap: 'GitHub terminal on the left wall, LinkedIn totem on the right. Walk close and press E.', z1: -28 },
  { room: 'Mail room', title: '03 / Mail room', cap: 'A letter sits on the pedestal. Press E and write your message.', z1: -50 },
];
const STATIONS = [
  { k: 'github', n: '01', name: 'GitHub Terminal', line: 'Code, experiments and side-projects are all here.', cta: 'Open GitHub', at: [-9, -17] },
  { k: 'linkedin', n: '02', name: 'LinkedIn Totem', line: 'Professional side. Connect with me.', cta: 'Open LinkedIn', at: [6.3, -19.5] },
  { k: 'email', n: '03', name: 'Letterbox', line: 'Send a message directly. I will read and reply.', cta: 'Write a letter', at: [0, -38] },
];
const MAPC = { github: INK, linkedin: ACCENT, email: '#7b8090', gate: ACCENT };
const GATE_ST = { k: 'gate', n: '00', name: 'Entrance Gate', line: 'The gate is locked. Open it to enter the lobby.', cta: 'Open the gate', at: [0, -10] };

/* canvas textures. Text ones are registered so they can be redrawn once the web fonts have loaded */
const TEXTS = [];
const tex = (w, h, draw, text = false) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (text) { t.userData.redraw = () => { g.clearRect(0, 0, w, h); draw(g, w, h); t.needsUpdate = true; }; TEXTS.push(t); }
  return t;
};

/* ---------------- 3D world ---------------- */
function buildWorld(S) {
  TEXTS.length = 0;
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, metalness: 0, ...o });
  const ACC = new THREE.MeshBasicMaterial({ color: ACCENT, toneMapped: false }); ACC.color.multiplyScalar(1.5);
  const concrete = M('#dfe2ea', { roughness: 0.95 }), floorM = M('#ffffff', { roughness: 0.35 });
  const panel = M('#1a1d29', { roughness: 0.6 }), dark = M(INK, { roughness: 0.5 }), trim = M('#c9cdd9');
  const LIGHTM = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const cols = [];
  const add = (g, w, h, d, x, y, z, m, col) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); g.add(o);
    if (col) cols.push([x - w / 2, x + w / 2, z - d / 2, z + d / 2]); return o;
  };
  const plane = (w, h, x, y, z, ry, m) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); o.position.set(x, y, z); o.rotation.y = ry; S.add(o); return o; };
  const point = (x, y, z, c, i, d) => { const l = new THREE.PointLight(c, i * LK, d); l.position.set(x, y, z); S.add(l); return l; };

  /* even daylight-style lighting for the whole lobby */
  S.add(new THREE.HemisphereLight('#ffffff', '#b4bace', 2.4 * LK));
  S.add(new THREE.AmbientLight('#ffffff', 0.4 * LK));
  const sun = new THREE.DirectionalLight('#ffffff', 1.2 * LK); sun.position.set(6, 9, -3); S.add(sun);

  /* shell */
  const tileT = tex(256, 256, (g, w, h) => {
    const sh = ['#e9ebf0', '#e4e6ec', '#eceef3', '#e1e4ea'];
    for (let i = 0; i < 4; i++) { g.fillStyle = sh[i]; g.fillRect((i % 2) * 128, ((i / 2) | 0) * 128, 128, 128); }
    g.fillStyle = '#c3c7d2'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h); g.fillRect(127, 0, 2, h); g.fillRect(0, 127, w, 2);
  });
  tileT.wrapS = tileT.wrapT = THREE.RepeatWrapping; tileT.repeat.set(10, 23); floorM.map = tileT;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 46), floorM); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -20); S.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(20, 46), M('#eef0f5')); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 5.5, -20); S.add(ceil);
  add(S, 0.3, 5.5, 46, -10.15, 2.75, -20, concrete); add(S, 20.6, 5.5, 0.3, 0, 2.75, -42.15, concrete); add(S, 20.6, 5.5, 0.3, 0, 2.75, 2.15, concrete);
  for (let z = 1; z > -42; z -= 2.5) add(S, 20, 0.05, 0.05, 0, 5.45, z, trim);
  for (let x = -8; x <= 8; x += 4) add(S, 0.05, 0.05, 44, x, 5.45, -20, trim);
  /* glass wall (right) with ink frames */
  plane(44, 5.5, 10, 2.75, -20, -Math.PI / 2, new THREE.MeshStandardMaterial({ color: '#c4cbee', transparent: true, opacity: 0.1, roughness: 0.05, depthWrite: false }));
  for (let z = 2; z > -43; z -= 5.5) add(S, 0.22, 5.5, 0.22, 10, 2.75, z, dark);
  add(S, 0.3, 0.3, 44, 10, 0.15, -20, dark); add(S, 0.3, 0.2, 44, 10, 5.4, -20, dark);
  add(S, 0.16, 0.14, 44, 10, 3.9, -20, dark);
  /* structure: baseboards, ceiling beams, back-wall panels, runner */
  add(S, 0.08, 0.28, 46, -9.96, 0.14, -20, dark); add(S, 20, 0.28, 0.1, 0, 0.14, -41.95, dark);
  [-7, -21, -33].forEach((z) => add(S, 20, 0.45, 0.4, 0, 5.25, z, concrete));
  [-6.5, 6.5].forEach((x) => { add(S, 5, 3.6, 0.05, x, 2.3, -41.97, panel); add(S, 5.06, 0.04, 0.02, x, 4.12, -41.93, ACC); add(S, 5.06, 0.04, 0.02, x, 0.5, -41.93, ACC); });
  add(S, 3.2, 0.008, 38, 0, 0.005, -18, M('#d3d5f5', { roughness: 0.95 }));
  /* entrance cross wall (ink slats) with a doorway */
  add(S, 7, 5.5, 0.3, -6.5, 2.75, -10, panel, 1); add(S, 7, 5.5, 0.3, 6.5, 2.75, -10, panel, 1); add(S, 6, 1.5, 0.4, 0, 4.75, -10, panel);
  const slats = [];
  for (let z = 1.8; z > -9.8; z -= 0.3) slats.push([-9.88, z, 0]);
  for (let x = -9.8; x < -3.1; x += 0.3) slats.push([x, -9.82, 1]); for (let x = 3.2; x < 9.9; x += 0.3) slats.push([x, -9.82, 1]);
  const sm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 5.5, 0.12), M('#262a3a', { roughness: 0.5 }), slats.length);
  const mt = new THREE.Matrix4(); slats.forEach(([x, z, r], i) => { mt.makeRotationY(r ? 0 : Math.PI / 2); mt.setPosition(x, 2.75, z); sm.setMatrixAt(i, mt); }); S.add(sm);
  [-3, 3].forEach((x) => add(S, 0.06, 4, 0.06, x, 2, -9.78, ACC)); add(S, 6.06, 0.06, 0.06, 0, 4, -9.78, ACC);
  const nameT = tex(1024, 256, (g, w) => {
    g.textAlign = 'center'; g.fillStyle = '#f4f5f8'; g.font = `800 ${PROFILE.name.length > 12 ? 84 : 132}px ${HEAD}`;
    g.letterSpacing = '-4px'; g.fillText(PROFILE.name, w / 2, 150); g.letterSpacing = '0px';
    g.font = `500 30px ${BODY}`; g.fillStyle = '#a9acc4'; g.fillText(PROFILE.role, w / 2, 208);
  }, true);
  plane(5.6, 1.4, 0, 4.75, -9.78, 0, new THREE.MeshBasicMaterial({ map: nameT, transparent: true, toneMapped: false }));
  /* blue guide line */
  add(S, 0.12, 0.012, 38, 0, 0.012, -18, ACC); add(S, 7.6, 0.012, 0.12, -3.8, 0.012, -17, ACC); add(S, 5.4, 0.012, 0.12, 2.7, 0.012, -19.5, ACC);
  /* ENTRANCE GATE: two sliding doors in the doorway, closed at the start */
  /* status light: red while locked, accent blue once open */
  const ledM = new THREE.MeshBasicMaterial({ color: '#ff5a5f', toneMapped: false });
  const barM = M('#1a1d29', { roughness: 0.35, metalness: 0.6 });
  const glassM = new THREE.MeshStandardMaterial({ color: '#c4cbee', transparent: true, opacity: 0.34, roughness: 0.08, metalness: 0.15, depthWrite: false });
  const mkDoor = (side) => {
    const g = new THREE.Group();
    const box = (w, h, d, x, y, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, 0); g.add(b); return b; };
    box(2.9, 3.86, 0.03, 0, 0, glassM);                                            /* frosted glass leaf */
    box(3, 0.16, 0.12, 0, 1.92, barM); box(3, 0.16, 0.12, 0, -1.92, barM);          /* top + bottom rails */
    box(0.12, 4, 0.12, side * 1.44, 0, barM);                                       /* outer stile */
    for (let x = -1.1; x <= 1.11; x += 0.275) box(0.03, 3.6, 0.05, x, 0, barM);     /* vertical fins */
    box(2.8, 0.035, 0.08, 0, 0.1, ACC);                                             /* accent mid rail */
    box(2.9, 0.02, 0.13, 0, -1.8, ACC);                                             /* accent kick strip */
    box(0.16, 4, 0.14, -side * 1.42, 0, barM);                                      /* centre stile */
    box(0.045, 3.3, 0.16, -side * 1.42, 0, ledM);                                   /* centre seam light */
    box(0.05, 0.7, 0.2, -side * 1.25, -0.2, barM);                                  /* pull handle */
    g.position.set(side * 1.5, 2, -9.68); S.add(g); return g;
  };
  const gl = mkDoor(-1), gr = mkDoor(1);
  /* gate surroundings: floor track, floor status line, wall status plate */
  add(S, 6.2, 0.012, 0.24, 0, 0.012, -9.68, barM);
  add(S, 5.8, 0.012, 0.06, 0, 0.02, -9.3, ledM);
  const gateUI = { s: 'LOCKED' };
  const plateT = tex(512, 256, (g, w, h) => {
    const sub = { LOCKED: 'Press E to open', OPEN: 'Press E to close', OPENING: 'Please wait', CLOSING: 'Please wait' }[gateUI.s];
    g.fillStyle = INK; g.fillRect(0, 0, w, h);
    g.fillStyle = gateUI.s === 'LOCKED' ? '#ff6b70' : '#9d9dff'; g.beginPath(); g.arc(52, 58, 13, 0, 7); g.fill();
    g.textAlign = 'left'; g.font = `500 28px ${BODY}`; g.fillStyle = '#a9acc4'; g.fillText('Entrance gate', 80, 68);
    g.font = `800 86px ${HEAD}`; g.fillStyle = '#f4f5f8'; g.letterSpacing = '-3px';
    g.fillText(gateUI.s[0] + gateUI.s.slice(1).toLowerCase(), 40, 170); g.letterSpacing = '0px';
    g.font = `500 28px ${BODY}`; g.fillStyle = '#a9acc4'; g.fillText(sub, 42, 222);
  }, true);
  add(S, 1.62, 0.87, 0.04, 4.6, 1.9, -9.74, dark);
  plane(1.5, 0.75, 4.6, 1.9, -9.71, 0, new THREE.MeshBasicMaterial({ map: plateT, toneMapped: false }));
  /* gate.target: 0 = closed (start state), 1 = open */
  const gate = { target: 0, p: 0 };
  const gateCol = [-3, 3, -9.95, -9.6]; cols.push(gateCol);
  const gateStep = (dt) => {
    gate.p = clamp(gate.p + (gate.target ? dt / 2.8 : -dt / 2.8), 0, 1);
    const k = clamp((gate.p - 0.12) / 0.88, 0, 1), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    const jolt = gate.p > 0.02 && gate.p < 0.12 ? Math.sin(gate.p * 220) * 0.012 : 0;
    gl.position.x = -1.5 - e * 3.0 + jolt; gr.position.x = 1.5 + e * 3.0 - jolt;
    ledM.color.set(gate.target ? ACCENT : '#ff5a5f'); ledM.color.multiplyScalar(1.5);
    const st = gate.p <= 0.001 && !gate.target ? 'LOCKED' : gate.p >= 0.999 && gate.target ? 'OPEN' : gate.target ? 'OPENING' : 'CLOSING';
    if (st !== gateUI.s) { gateUI.s = st; plateT.userData.redraw && plateT.userData.redraw(); }
    const i = cols.indexOf(gateCol);
    if (gate.p > 0.5 && i >= 0) cols.splice(i, 1); else if (gate.p <= 0.5 && i < 0) cols.push(gateCol);
  };

  /* ceiling light strips */
  [[0, -3], [0, -15], [0, -25], [0, -35], [5.5, -20], [-5.5, -20]].forEach(([x, z]) => add(S, 0.2, 0.06, 6, x, 5.42, z, LIGHTM));

  /* columns + reception */
  [[-7.3, -14], [7.3, -14], [-7.3, -31], [7.3, -31]].forEach(([x, z]) => {
    add(S, 0.6, 5.5, 0.6, x, 2.75, z, concrete, 1); add(S, 0.82, 0.22, 0.82, x, 0.11, z, dark); add(S, 0.76, 0.12, 0.76, x, 5.3, z, dark);
    add(S, 0.66, 0.035, 0.66, x, 1.15, z, ACC); add(S, 0.66, 0.035, 0.66, x, 4.6, z, ACC);
  });
  add(S, 3, 1.05, 0.9, 5.5, 0.52, -4.5, panel, 1); add(S, 3.02, 0.03, 0.02, 5.5, 0.9, -4.04, ACC);
  /* light stands (decor) */
  [[-5, -24, 0.5], [4.5, -31, -0.6]].forEach(([x, z, r]) => {
    add(S, 0.05, 3, 0.05, x, 1.5, z, dark, 1); const b = add(S, 1, 1, 0.12, x, 3.1, z, LIGHTM); b.rotation.y = r;
    add(S, 0.7, 0.04, 0.04, x, 0.03, z, dark); add(S, 0.04, 0.04, 0.7, x, 0.03, z, dark);
  });

  /* STATION 01: GitHub terminal */
  const gh = document.createElement('canvas'); gh.width = 1024; gh.height = 640; const gg = gh.getContext('2d');
  const ghT = new THREE.CanvasTexture(gh); ghT.colorSpace = THREE.SRGBColorSpace; ghT.anisotropy = 8;
  const CODE_LINES = ['const dev = {', `  name: "${PROFILE.name}",`, '  stack: ["React", "Three.js", "Node"],', '  status: "open to work",', '};', '', 'export function contact() {', '  return dev.reachOut();', '}', '', '$ git commit -m "let\'s build"'];
  const ALL = CODE_LINES.join('\n');
  const drawGH = (t) => {
    gg.fillStyle = INK; gg.fillRect(0, 0, 1024, 640); gg.fillStyle = '#1d2030'; gg.fillRect(0, 0, 1024, 56);
    [0, 1, 2].forEach((i) => { gg.fillStyle = 'rgba(255,255,255,.22)'; gg.beginPath(); gg.arc(32 + i * 30, 28, 9, 0, 7); gg.fill(); });
    gg.font = `22px ${CODE}`; gg.fillStyle = '#8b90a8'; gg.fillText(LINKS.github.label, 320, 36);
    gg.font = `30px ${CODE}`;
    const lines = ALL.slice(0, Math.min(ALL.length, Math.floor(t * 20) % (ALL.length + 40))).split('\n');
    lines.forEach((ln, i) => { gg.fillStyle = ln.startsWith('$') ? '#9d9dff' : '#e6e8f2'; gg.fillText(ln, 48, 125 + i * 46); });
    if (Math.floor(t * 2) % 2) { gg.fillStyle = '#9d9dff'; gg.fillRect(52 + gg.measureText(lines[lines.length - 1]).width, 125 + (lines.length - 1) * 46 - 28, 16, 34); }
    gg.fillStyle = '#9d9dff'; gg.font = `22px ${CODE}`; gg.fillText('● online. press [E] to open profile', 48, 610);
    ghT.needsUpdate = true;
  };
  drawGH(0);
  add(S, 0.1, 2.5, 3.9, -9.94, 2.15, -17, dark); plane(3.8, 2.38, -9.88, 2.15, -17, Math.PI / 2, new THREE.MeshBasicMaterial({ map: ghT, toneMapped: false }));
  add(S, 1, 0.08, 3.2, -9.5, 0.78, -17, panel, 1); add(S, 0.9, 0.74, 0.08, -9.5, 0.4, -18.5, dark); add(S, 0.9, 0.74, 0.08, -9.5, 0.4, -15.5, dark);
  add(S, 0.3, 0.03, 0.9, -9.1, 0.83, -17, M('#2a2d3a')); add(S, 0.5, 0.08, 0.5, -8.1, 0.5, -17, dark, 1); add(S, 0.08, 0.55, 0.5, -7.88, 0.8, -17, dark);
  point(-8.3, 2.1, -17, '#ffffff', 3, 8);

  /* STATION 02: LinkedIn totem */
  const liT = tex(512, 1024, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, INK); gr.addColorStop(1, ACCENT); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff'; g.beginPath(); g.roundRect(176, 150, 160, 160, 30); g.fill(); g.textAlign = 'center';
    g.fillStyle = ACCENT; g.font = `800 118px ${HEAD}`; g.fillText('in', 256, 278);
    g.fillStyle = '#fff'; g.font = `800 ${PROFILE.name.length > 12 ? 44 : 62}px ${HEAD}`; g.fillText(PROFILE.name, 256, 440);
    g.font = `500 24px ${BODY}`; g.fillStyle = '#d4d6ff'; g.fillText(PROFILE.role, 256, 488); g.fillText("Let's connect", 256, 780);
    g.font = `500 19px ${BODY}`; g.fillText(LINKS.linkedin.label, 256, 940);
  }, true);
  add(S, 0.5, 0.3, 1.8, 6.3, 0.15, -19.5, dark, 1); add(S, 0.14, 3.1, 1.6, 6.3, 1.85, -19.5, dark);
  plane(1.5, 2.9, 6.22, 1.85, -19.5, -Math.PI / 2, new THREE.MeshBasicMaterial({ map: liT, toneMapped: false }));
  point(4.9, 1.9, -19.5, '#c9caff', 3, 8);

  /* STATION 03: Letterbox */
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.4, 0.2, 48), M(INK, { roughness: 0.4 })); plat.position.set(0, 0.1, -38); S.add(plat);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.025, 8, 64), ACC); ring.rotation.x = Math.PI / 2; ring.position.set(0, 0.21, -38); S.add(ring);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 1.1, 28), M('#1c1f2b', { roughness: 0.4 })); ped.position.set(0, 0.75, -38); S.add(ped);
  cols.push([-0.7, 0.7, -38.7, -37.3]);
  const sgn = tex(1024, 200, (g, w) => { g.textAlign = 'center'; g.font = `800 104px ${HEAD}`; g.letterSpacing = '-3px'; g.fillStyle = INK; g.fillText('Send me a letter.', w / 2, 130); }, true);
  plane(8, 1.56, 0, 3.4, -41.95, 0, new THREE.MeshBasicMaterial({ map: sgn, transparent: true, toneMapped: false }));
  const E = new THREE.Group(); E.position.set(0, 2.1, -38); E.scale.setScalar(1.15); S.add(E);
  const pm = (c) => M(c, { roughness: 0.45 });
  const tri = (pts, dp) => { const sh = new THREE.Shape(); sh.moveTo(...pts[0]); sh.lineTo(...pts[1]); sh.lineTo(...pts[2]); sh.closePath(); return new THREE.ExtrudeGeometry(sh, { depth: dp, bevelEnabled: false }); };
  const bk = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 0.03), pm(INK)); bk.position.z = -0.02; E.add(bk);
  [[[[-1.2, 0.8], [-1.2, -0.8], [0, -0.05]], '#ffffff'], [[[1.2, 0.8], [1.2, -0.8], [0, -0.05]], '#eceef4'], [[[-1.2, -0.8], [1.2, -0.8], [0, -0.05]], '#dfe2ea']].forEach(([p, c]) => { const m = new THREE.Mesh(tri(p, 0.03), pm(c)); m.position.z = 0.02; E.add(m); });
  const flap = new THREE.Group(); flap.position.set(0, 0.8, 0.055); flap.add(new THREE.Mesh(tri([[-1.2, 0], [1.2, 0], [0, -0.85]], 0.03), pm('#f4f5f8'))); E.add(flap);
  const lt = tex(512, 350, (g) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 512, 350); g.fillStyle = INK; g.font = `800 66px ${HEAD}`; g.fillText('Hello,', 40, 100); g.fillStyle = '#d5d8e2'; [170, 210, 250].forEach((y, k) => g.fillRect(40, y, 430 - k * 80, 10)); g.fillStyle = ACCENT; g.fillRect(40, 290, 60, 10); }, true);
  const letter = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.43), new THREE.MeshBasicMaterial({ map: lt, toneMapped: false })); letter.position.z = 0.005; E.add(letter);
  point(0, 2.8, -38, '#ffffff', 3, 8);
  [[-8.5, -33], [-8.5, -34.2], [8.5, -35]].forEach(([x, z]) => { add(S, 0.9, 0.6, 0.7, x, 0.3, z, dark, 1); add(S, 0.92, 0.02, 0.72, x, 0.58, z, ACC); });

  /* daytime city outside the glass: three depth layers fading into the haze */
  const winTex = (lit, cell) => tex(128, 256, (g, w, h) => {
    g.fillStyle = '#f1f3f8'; g.fillRect(0, 0, w, h);
    for (let y = 4; y < h - 4; y += cell) {
      for (let x = 5; x < w - 5; x += 10) { g.fillStyle = Math.random() < lit ? '#8e9ac2' : '#b9c0d6'; g.fillRect(x, y, 5, cell - 6); }
    }
    g.fillStyle = 'rgba(20,22,31,.05)'; for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 2, h);
  });
  const wins = [winTex(0.35, 12), winTex(0.2, 10), winTex(0.5, 14)];
  wins.forEach((w) => { w.wrapS = w.wrapT = THREE.RepeatWrapping; w.magFilter = THREE.NearestFilter; });
  const roofM = new THREE.MeshBasicMaterial({ color: '#b8bed0', fog: false });
  const tower = (cx, cz, w, h, d, tint) => {
    const t = wins[(Math.random() * wins.length) | 0].clone(); t.needsUpdate = true; t.repeat.set(w / 6, h / 12);
    const mat = new THREE.MeshBasicMaterial({ map: t, color: tint, fog: false }), faces = [mat, mat, roofM, roofM, mat, mat];
    const bd = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), faces); bd.position.set(cx, h / 2 - 1, cz); S.add(bd);
    if (Math.random() < 0.6) { const ch = 2 + Math.random() * 4, c = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, ch, d * 0.55), faces); c.position.set(cx, h - 1 + ch / 2, cz); S.add(c); }
  };
  for (let i = 0; i < 34; i++) tower(70 + Math.random() * 60, -150 + Math.random() * 200, 10 + Math.random() * 14, 40 + Math.random() * 80, 10 + Math.random() * 10, '#d5dae6');
  for (let i = 0; i < 30; i++) tower(38 + Math.random() * 22, -90 + Math.random() * 110, 6 + Math.random() * 9, 20 + Math.random() * 55, 7 + Math.random() * 8, '#c0c6d6');
  for (let i = 0; i < 11; i++) tower(31 + Math.random() * 3, -48 + i * 5.2, 7 + Math.random() * 3, 14 + Math.random() * 26, 4.6, '#a7aec3');
  /* street lamps (accent heads) + lane dashes */
  const DASH = new THREE.MeshBasicMaterial({ color: '#b4b9c8', fog: false });
  for (let z = 2; z > -46; z -= 7) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 5, 6), dark); pole.position.set(13, 2.45, z); S.add(pole);
    add(S, 0.9, 0.05, 0.05, 12.55, 4.95, z, dark);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), ACC); head.position.set(12.15, 4.9, z); S.add(head);
  }
  for (let z = 3; z > -48; z -= 4) add(S, 0.2, 0.01, 1.6, 20, -0.03, z, DASH);
  const outside = new THREE.Mesh(new THREE.PlaneGeometry(120, 160), new THREE.MeshBasicMaterial({ color: '#d6d9e2', fog: false })); outside.rotation.x = -Math.PI / 2; outside.position.set(70, -0.05, -30); S.add(outside);

  add(S, 0.05, 0.05, 44, -9.88, 0.06, -20, ACC);
  let acc = 0;
  const update = (t, dt) => {
    gateStep(dt);
    acc += dt; if (acc > 0.08) { acc = 0; drawGH(t); }
    let o = 0.5 + 0.5 * Math.sin(t * 0.8 - 1); o = o * o * (3 - 2 * o); flap.rotation.x = o * 2.7; letter.position.y = -0.05 + o * 0.95;
    E.position.y = 2.1 + Math.sin(t * 1.2) * 0.1; E.rotation.y = t * 0.5;
  };
  return { cols, update, gate };
}

/* ---------------- small UI pieces (same feel as About + Journey) ---------------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';

function MoveText({ text, radius = 150, power = 0.32, scale = 0.22 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const root = ref.current; if (!root) return undefined;
    let raf = 0;
    const letters = () => root.querySelectorAll('[data-c]');
    const reset = () => letters().forEach((el) => { el.style.transform = ''; el.style.setProperty('--t', '0'); });
    const onMove = (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rr = root.getBoundingClientRect();
        if (e.clientY < rr.top - radius || e.clientY > rr.bottom + radius || e.clientX < rr.left - radius || e.clientX > rr.right + radius) { reset(); return; }
        letters().forEach((el) => {
          const cx = rr.left + el.offsetLeft + el.offsetWidth / 2, cy = rr.top + el.offsetTop + el.offsetHeight / 2;
          const dx = cx - e.clientX, dy = cy - e.clientY, d = Math.hypot(dx, dy) || 1;
          if (d > radius) { el.style.transform = ''; el.style.setProperty('--t', '0'); return; }
          const t = (1 - d / radius) ** 2, push = t * radius * power;
          el.style.transform = `translate(${(dx / d) * push}px, ${(dy / d) * push}px) scale(${1 + t * scale})`;
          el.style.setProperty('--t', t.toFixed(3));
        });
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', reset);
    return () => { window.removeEventListener('pointermove', onMove); document.documentElement.removeEventListener('pointerleave', reset); cancelAnimationFrame(raf); };
  }, [radius, power, scale]);
  return (
    <span className="mt" ref={ref} aria-label={text}>
      <span aria-hidden="true">
        {text.split(' ').map((word, wi, arr) => (
          <span className="mt-w" key={wi}>
            {[...word].map((ch, ci) => <span className="mt-c" data-c key={ci}>{ch}</span>)}
            {wi < arr.length - 1 ? ' ' : ''}
          </span>
        ))}
      </span>
    </span>
  );
}

/* the fill-on-hover pill from the About page */
function Pill({ label, onClick, type = 'button', disabled = false }) {
  const [hover, setHover] = useState(false);
  const on = hover && !disabled;
  return (
    <button
      type={type} onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onFocus={() => setHover(true)} onBlur={() => setHover(false)}
      style={{
        position: 'relative', display: 'inline-flex', alignItems: 'center', padding: '12px 28px', border: 'none', borderRadius: '999px',
        background: '#ffffff', color: on ? '#ffffff' : INK, fontFamily: 'inherit', fontSize: '15px', fontWeight: 500, whiteSpace: 'nowrap',
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
        boxShadow: on ? '0 14px 26px rgba(0,0,0,0.25)' : '0 2px 6px rgba(0,0,0,0.12), 0 0 0 1px rgba(20,22,31,.18)',
        transform: on ? 'translateY(-4px)' : 'translateY(0)',
        transition: `transform 0.45s ${ease}, box-shadow 0.45s ${ease}, color 0.25s ease ${on ? '0.12s' : '0s'}`,
      }}
    >
      <span aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 'inherit', clipPath: 'inset(0 round 999px)', pointerEvents: 'none' }}>
        <span style={{ position: 'absolute', left: '50%', top: '100%', width: '125%', aspectRatio: '1 / 1', borderRadius: '50%', background: ACCENT, transform: `translate(-50%, ${on ? '-74%' : '0%'}) scale(${on ? 1 : 0.3})`, transition: `transform 0.55s ${ease}` }} />
      </span>
      <span style={{ position: 'relative', zIndex: 1 }}>{label}</span>
    </button>
  );
}

/* ---------------- component ---------------- */
export default function ContactWorld({ endpoint }) {
  const host = useRef(null), mapRef = useRef(null), uiRef = useRef('intro'), api = useRef({});
  const [ui, _ui] = useState('intro');
  const setUI = (v) => { uiRef.current = v; _ui(v); };
  const [zone, setZone] = useState(0), [target, setTarget] = useState(null), [seen, setSeen] = useState([]), [showMap, setShowMap] = useState(true);
  const [noGL, setNoGL] = useState(false);
  const [gateOpen, setGateOpen] = useState(false); /* the gate always starts closed */
  const gateRef = useRef(false);
  const [form, setForm] = useState({ name: '', email: '', message: '' }), [fs, setFs] = useState({ s: 'idle', t: '' });

  useEffect(() => {
    const el = host.current; let R;

    /* web fonts for the canvas textures: redraw them once the fonts are ready */
    if (!document.getElementById('cw-fonts')) {
      const l = document.createElement('link'); l.id = 'cw-fonts'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=DM+Sans:wght@400;500;700&display=swap';
      document.head.appendChild(l);
    }
    const fontLink = document.getElementById('cw-fonts');
    const redrawText = () => {
      if (!document.fonts) return;
      Promise.all(['800 48px "Bricolage Grotesque"', '500 24px "DM Sans"'].map((f) => document.fonts.load(f)))
        .then(() => TEXTS.forEach((t) => t.userData.redraw && t.userData.redraw())).catch(() => {});
    };
    if (fontLink.sheet) redrawText(); else fontLink.addEventListener('load', redrawText, { once: true });

    try { R = new THREE.WebGLRenderer({ antialias: true }); } catch { setNoGL(true); return; }
    R.setPixelRatio(Math.min(window.devicePixelRatio, 1.75)); R.toneMapping = THREE.NoToneMapping;
    el.appendChild(R.domElement); const dom = R.domElement;
    const S = new THREE.Scene(); S.background = new THREE.Color(SKY); S.fog = new THREE.FogExp2(SKY, 0.018);
    const cam = new THREE.PerspectiveCamera(70, 1, 0.05, 300);
    const W = buildWorld(S);
    const comp = new EffectComposer(R); comp.addPass(new RenderPass(S, cam)); comp.addPass(new UnrealBloomPass(new THREE.Vector2(512, 512), 0.22, 0.4, 1.0)); comp.addPass(new OutputPass());

    const P = { x: 0, z: 1, yaw: 0, pitch: 0, vx: 0, vz: 0, ph: 0 }, keys = {};
    let tgt = null, zn = 0, drag = false, last = [0, 0], raf = 0, mapT = 0; const joy = { x: 0, y: 0 };

    /* ---- pointer lock: mouse look without clicking/dragging ---- */
    const fine = window.matchMedia('(pointer:fine)').matches;
    let lockFailed = false;
    const locked = () => document.pointerLockElement === dom;
    const lock = () => {
      if (!fine || !dom.requestPointerLock || locked()) return;
      try { const p = dom.requestPointerLock(); p && p.catch && p.catch(() => {}); } catch { /* fallback: drag-look still works */ }
    };
    const unlock = () => { if (locked()) document.exitPointerLock(); };

    let ac = null;
    const thud = () => {
      try {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        ac = ac || new AC(); const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(110, ac.currentTime); o.frequency.exponentialRampToValueAtTime(45, ac.currentTime + 1.2);
        g.gain.setValueAtTime(0.05, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 1.4);
        o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + 1.4);
      } catch { /* sound is optional */ }
    };
    const act = (k) => {
      if (k === 'gate') {
        /* closing: do not shut the gate while the player stands in the doorway */
        if (gateRef.current && Math.abs(P.z + 9.8) < 1.1 && Math.abs(P.x) < 3.4) return;
        gateRef.current = !gateRef.current;
        W.gate.target = gateRef.current ? 1 : 0;
        setGateOpen(gateRef.current);
        thud();
        return;
      }
      if (k === 'email') { setUI('form'); unlock(); } else window.open(LINKS[k].url, '_blank', 'noopener,noreferrer');
    };
    api.current = { act, joy, lock, unlock, reset: () => { P.x = 0; P.z = 1; P.yaw = 0; P.pitch = 0; P.vx = P.vz = 0; } };
    const kd = (e) => {
      if (e.code === 'Escape') {
        if (uiRef.current === 'play') { setUI('pause'); unlock(); } else if (uiRef.current !== 'intro') { setUI('play'); lock(); }
        return;
      }
      if (uiRef.current === 'form') return;
      keys[e.code] = true;
      if (uiRef.current !== 'play') return;
      if (e.code === 'KeyE' && tgt) act(tgt);
      if (e.code === 'KeyM') setShowMap((v) => !v);
    };
    const ku = (e) => { keys[e.code] = false; };
    /* mouse moved while locked -> look */
    const mm = (e) => {
      if (!locked() || uiRef.current !== 'play') return;
      const k = 0.0022; P.yaw -= e.movementX * k; P.pitch = clamp(P.pitch - e.movementY * k, -1.3, 1.3);
    };
    /* Esc (or alt-tab) released the lock -> pause */
    const plc = () => { if (locked()) lockFailed = false; else if (uiRef.current === 'play') setUI('pause'); };
    const ple = () => { lockFailed = true; };
    /* click while locked = interact with whatever you're looking at */
    const clk = () => { if (uiRef.current === 'play' && locked() && tgt) act(tgt); };
    /* drag-look stays as the fallback (touch, or if pointer lock is blocked) */
    const pd = (e) => {
      if (uiRef.current !== 'play') return;
      if (fine && !lockFailed) { if (!locked()) lock(); return; }
      drag = true; last = [e.clientX, e.clientY]; try { dom.setPointerCapture?.(e.pointerId); } catch { /* ignore */ } dom.style.cursor = 'grabbing';
    };
    const pm = (e) => { if (!drag || locked() || uiRef.current !== 'play') return; const k = e.pointerType === 'touch' ? 0.006 : 0.0042; P.yaw -= (e.clientX - last[0]) * k; P.pitch = clamp(P.pitch - (e.clientY - last[1]) * k, -1.3, 1.3); last = [e.clientX, e.clientY]; };
    const pu = () => { drag = false; dom.style.cursor = fine ? 'crosshair' : 'grab'; }, blur = () => Object.keys(keys).forEach((k) => (keys[k] = false));
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku); window.addEventListener('blur', blur);
    document.addEventListener('mousemove', mm); document.addEventListener('pointerlockchange', plc); document.addEventListener('pointerlockerror', ple);
    dom.addEventListener('click', clk);
    dom.addEventListener('pointerdown', pd); dom.addEventListener('pointermove', pm); dom.addEventListener('pointerup', pu); dom.addEventListener('pointercancel', pu);
    dom.style.cursor = fine ? 'crosshair' : 'grab'; dom.style.touchAction = 'none';

    const resolve = () => {
      P.x = clamp(P.x, -9.4, 9.4); P.z = clamp(P.z, -41.2, 1.4); const r = 0.35;
      W.cols.forEach(([a, b, c, d]) => {
        if (P.x > a - r && P.x < b + r && P.z > c - r && P.z < d + r) {
          const m = [P.x - (a - r), b + r - P.x, P.z - (c - r), d + r - P.z], i = m.indexOf(Math.min(...m));
          if (i === 0) P.x = a - r; else if (i === 1) P.x = b + r; else if (i === 2) P.z = c - r; else P.z = d + r;
        }
      });
    };
    const mctx = mapRef.current?.getContext('2d');
    const drawMap = () => {
      if (!mctx) return; const w = 210, h = 96, X = (z) => ((2 - z) / 44) * (w - 16) + 8, Y = (x) => ((x + 10) / 20) * (h - 16) + 8;
      mctx.clearRect(0, 0, w, h); mctx.strokeStyle = 'rgba(20,22,31,.7)'; mctx.lineWidth = 1; mctx.strokeRect(8, 8, w - 16, h - 16);
      mctx.strokeStyle = 'rgba(123,128,144,.7)'; mctx.setLineDash([3, 3]); [-10, -28].forEach((z) => { mctx.beginPath(); mctx.moveTo(X(z), 8); mctx.lineTo(X(z), h - 8); mctx.stroke(); }); mctx.setLineDash([]);
      if (!gateRef.current) { mctx.strokeStyle = ACCENT; mctx.lineWidth = 3; mctx.beginPath(); mctx.moveTo(X(-10), Y(-3)); mctx.lineTo(X(-10), Y(3)); mctx.stroke(); mctx.lineWidth = 1; }
      STATIONS.forEach((s) => { mctx.fillStyle = MAPC[s.k]; mctx.beginPath(); mctx.arc(X(s.at[1]), Y(s.at[0]), 3.5, 0, 7); mctx.fill(); });
      mctx.save(); mctx.translate(X(P.z), Y(P.x)); mctx.rotate(Math.atan2(-Math.sin(P.yaw), Math.cos(P.yaw)));
      mctx.fillStyle = ACCENT; mctx.beginPath(); mctx.moveTo(6, 0); mctx.lineTo(-4, -4); mctx.lineTo(-4, 4); mctx.fill(); mctx.restore();
    };

    const clock = new THREE.Clock();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
      if (uiRef.current === 'play') {
        P.yaw += ((keys.ArrowLeft ? 1 : 0) - (keys.ArrowRight ? 1 : 0)) * dt * 1.8;
        const f = clamp((keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - joy.y, -1, 1), s = clamp((keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0) + joy.x, -1, 1);
        const sp = keys.ShiftLeft || keys.ShiftRight ? 5.6 : 3.1, fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
        let tx = fx * f + rx * s, tz = fz * f + rz * s; const L = Math.hypot(tx, tz) || 1; tx = (tx / L) * sp * (f || s ? 1 : 0); tz = (tz / L) * sp * (f || s ? 1 : 0);
        const k = 1 - Math.exp(-dt * 9); P.vx += (tx - P.vx) * k; P.vz += (tz - P.vz) * k; P.x += P.vx * dt; P.z += P.vz * dt; resolve();
        P.ph += Math.hypot(P.vx, P.vz) * dt * 2.2;
        let best = null, bd = 9;
        /* the gate is always a station: E opens it, E again closes it */
        [GATE_ST, ...STATIONS].forEach((st) => { const dx = st.at[0] - P.x, dz = st.at[1] - P.z, d = Math.hypot(dx, dz); if (d < 5.4 && (dx * fx + dz * fz) / d > 0.68 && d < bd) { best = st.k; bd = d; } });
        if (best !== tgt) { tgt = best; setTarget(best); if (best && best !== 'gate') setSeen((a) => (a.includes(best) ? a : [...a, best])); }
        const z = ZONES.findIndex((q) => P.z > q.z1); if (z !== zn && z >= 0) { zn = z; setZone(z); }
      } else if (uiRef.current === 'intro') { P.yaw = Math.sin(t * 0.12) * 0.08; P.x = Math.sin(t * 0.09) * 0.8; P.z = -3.2 + Math.sin(t * 0.06) * 0.5; P.pitch = -0.1; }
      cam.position.set(P.x, 1.65 + Math.sin(P.ph) * 0.03 + Math.sin(t * 0.8) * 0.004, P.z); cam.rotation.set(P.pitch, P.yaw, 0, 'YXZ');
      W.update(t, dt);
      mapT += dt; if (mapT > 0.08) { mapT = 0; drawMap(); }
      comp.render();
    };
    const fit = () => { const w = el.clientWidth, h = el.clientHeight || 1; R.setSize(w, h); comp.setSize(w, h); cam.aspect = w / h; cam.fov = w / h < 1 ? 85 : 70; cam.updateProjectionMatrix(); };
    const ro = new ResizeObserver(fit); ro.observe(el); fit(); tick();
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); unlock(); if (ac) ac.close();
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('blur', blur);
      document.removeEventListener('mousemove', mm); document.removeEventListener('pointerlockchange', plc); document.removeEventListener('pointerlockerror', ple);
      S.traverse((o) => { o.geometry?.dispose(); }); R.dispose(); if (dom.parentNode === el) el.removeChild(dom);
    };
  }, []);

  const enter = () => { if (uiRef.current === 'intro') api.current.reset?.(); setUI('play'); api.current.lock?.(); };
  const closeForm = () => { setUI('play'); api.current.lock?.(); };
  const [knob, setKnob] = useState([0, 0]);
  const joyMove = (e) => {
    if (e.type === 'pointermove' && !(e.buttons & 1)) return;
    const r = e.currentTarget.getBoundingClientRect(), x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
    const L = Math.hypot(x, y) || 1, k = Math.min(1, L), j = api.current.joy; j.x = (x / L) * k; j.y = (y / L) * k; setKnob([j.x, j.y]);
  };
  const joyDown = (e) => { e.currentTarget.setPointerCapture(e.pointerId); joyMove(e); };
  const joyUp = () => { const j = api.current.joy; if (j) { j.x = 0; j.y = 0; } setKnob([0, 0]); };
  const upd = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); if (fs.s === 'error') setFs({ s: 'idle', t: '' }); };
  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return setFs({ s: 'error', t: 'Please fill in all the fields.' });
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setFs({ s: 'error', t: 'That email address looks a bit off.' });
    if (endpoint) {
      try {
        setFs({ s: 'sending', t: '' });
        const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(form) });
        if (!r.ok) throw new Error('x'); setFs({ s: 'sent', t: '' });
      } catch { setFs({ s: 'error', t: 'Could not send. Just email me directly.' }); }
    } else {
      window.location.href = `${LINKS.email.url}?subject=${encodeURIComponent('Portfolio letter from ' + form.name)}&body=${encodeURIComponent(form.message + '\n\n— ' + form.name + ' (' + form.email + ')')}`;
      setFs({ s: 'sent', t: '' });
    }
  };

  const Z = ZONES[zone];
  const T0 = [GATE_ST, ...STATIONS].find((s) => s.k === target);
  /* same gate station, text changes with the gate state */
  const T = T0 && T0.k === 'gate' && gateOpen
    ? { ...T0, line: 'The gate is open. Close it if you like.', cta: 'Close the gate' }
    : T0;
  const Links = () => ['github', 'linkedin', 'email'].map((k) => <a key={k} href={LINKS[k].url} {...(k !== 'email' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{k === 'github' ? 'GitHub' : k === 'linkedin' ? 'LinkedIn' : 'Email'} <em>{LINKS[k].label}</em></a>);

  return (
    <section className="cw" aria-label="Contact: walkable 3D lobby">
      <style>{CSS}</style>
      <div ref={host} className="cw-gl" />

      {ui === 'play' && (
        <>
          <div className="cw-chap" key={zone}><h2>{Z.title}</h2><p>{Z.cap}</p></div>
          <div className={'cw-dot' + (T ? ' on' : '')} />
          <div className="cw-hint"><span className="fine">Move mouse to look · WASD to walk</span><span className="coarse">Drag to look · joystick to move</span></div>
          <div className="cw-joy" onPointerDown={joyDown} onPointerMove={joyMove} onPointerUp={joyUp} onPointerCancel={joyUp}><i style={{ transform: `translate(${knob[0] * 28}px,${knob[1] * 28}px)` }} /></div>
          {showMap && (
            <div className="cw-map">
              <div className="cw-mh"><span>Map</span><span>{seen.length} / 3 explored</span></div>
              <canvas ref={mapRef} width="210" height="96" />
              <div className="cw-room">{Z.room}</div>
              <div className="cw-mf"><kbd>M</kbd> hide map</div>
            </div>
          )}
          {T && (
            <div className="cw-dlg" onClick={() => api.current.act?.(target)} role="button" tabIndex={0}>
              <div className="cw-k"><i style={{ background: MAPC[T.k] }} />Station {T.n} · {T.name}</div>
              <div className="cw-line">{T.line}</div>
              <div className="cw-foot"><kbd>E</kbd><b>{T.cta}</b><span>{LINKS[T.k]?.label}</span></div>
            </div>
          )}
          <div className="cw-keys"><kbd>Mouse</kbd> look · <kbd>WASD</kbd> walk · <kbd>Shift</kbd> run · <kbd>E</kbd> interact · <kbd>Esc</kbd> pause<br /><span>Follow the blue line, from entrance to letterbox</span></div>
        </>
      )}
      {ui === 'play' && !showMap && <div className="cw-mini"><kbd>M</kbd> map</div>}

      {ui === 'intro' && (
        <div className="cw-over">
          <div className="cw-brief">
            <div className="cw-col">
              <p className="cw-eb">Visitor briefing</p>
              <h1><MoveText text={PROFILE.name} radius={120} /></h1>
              <p className="cw-meta">Status <b className="live">{PROFILE.status}</b></p>
              <p className="cw-meta">Role <b>{PROFILE.role}</b></p>
              <p className="cw-txt">This contact page is a 3D lobby. Walk around: a GitHub terminal, a LinkedIn totem and a letterbox at the end. Press E near any station to use it.</p>
              <Pill label={noGL ? 'WebGL not supported' : 'Enter the lobby'} onClick={enter} disabled={noGL} />
            </div>
            <div className="cw-col">
              <p className="cw-eb">Controls</p>
              <ul className="cw-ctl">
                <li><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span>walk</li>
                <li><span><kbd>Shift</kbd></span>run</li>
                <li><span><kbd>Mouse</kbd></span>move mouse to look</li>
                <li><span><kbd>E</kbd></span>use station</li>
                <li><span><kbd>M</kbd></span>map on / off</li>
                <li><span><kbd>Esc</kbd></span>pause, mouse free</li>
              </ul>
            </div>
            <div className="cw-col">
              <p className="cw-eb">The lobby</p>
              <ol className="cw-rooms">{STATIONS.map((s) => <li key={s.k}><i style={{ background: MAPC[s.k] }} />{s.name}</li>)}</ol>
              <p className="cw-eb sm">Just want the links?</p>
              <div className="cw-links"><Links /></div>
            </div>
          </div>
        </div>
      )}

      {ui === 'pause' && (
        <div className="cw-over" onClick={enter}>
          <div className="cw-pause">
            <p className="cw-eb">Paused</p>
            <h2><MoveText text="Click to come back" radius={110} /></h2>
            <div className="cw-links" onClick={(e) => e.stopPropagation()}><Links /></div>
          </div>
        </div>
      )}

      {ui === 'form' && (
        <div className="cw-over">
          <form className="cw-form" onSubmit={submit} noValidate>
            <p className="cw-eb">Station 03 · Letterbox</p>
            {fs.s === 'sent' ? (
              <>
                <h2>{endpoint ? 'Letter delivered.' : 'Almost there.'}</h2>
                <p className="cw-txt">{endpoint ? `Thanks, ${form.name.trim().split(' ')[0]}! I will reply soon.` : 'Your email app should have opened. Press Send there.'}</p>
                <div className="cw-row"><Pill label="Back to the lobby" onClick={closeForm} /></div>
              </>
            ) : (
              <>
                <h2>Write me a letter</h2>
                <label>Name<input value={form.name} onChange={upd('name')} placeholder="Your name" autoFocus /></label>
                <label>Email<input type="email" value={form.email} onChange={upd('email')} placeholder="you@example.com" /></label>
                <label>Message<textarea rows="5" value={form.message} onChange={upd('message')} placeholder="Project idea, internship, or just hello…" /></label>
                {fs.s === 'error' && <p className="cw-err" role="alert">{fs.t}</p>}
                <div className="cw-row"><Pill type="submit" label={fs.s === 'sending' ? 'Sending…' : 'Send letter'} disabled={fs.s === 'sending'} /><button type="button" className="cw-ghost" onClick={closeForm}>Cancel</button></div>
                <p className="cw-alt">Or directly: <a href={LINKS.email.url}>{LINKS.email.label}</a></p>
              </>
            )}
          </form>
        </div>
      )}
    </section>
  );
}

const CSS = `
.cw{--ink:#14161f;--paper:#f4f5f8;--mute:#7b8090;--line:#dadce4;--accent:#3a3af0;--glass:rgba(244,245,248,.88);position:relative;width:100%;height:100vh;min-height:560px;overflow:hidden;background:${SKY};color:var(--ink);font-family:${BODY};user-select:none}
.cw *{box-sizing:border-box}
.cw-gl,.cw-gl canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.cw kbd{display:inline-block;min-width:24px;padding:2px 7px;margin:0 2px;border:1px solid var(--ink);border-bottom-width:2px;border-radius:5px;font:700 11px ${BODY};color:var(--ink);text-align:center;background:#fff}
.cw button:focus-visible,.cw a:focus-visible,.cw input:focus-visible,.cw textarea:focus-visible,.cw-dlg:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
.cw h1,.cw h2{margin:0;font-family:${HEAD};font-weight:800;letter-spacing:-.045em;line-height:.95}

/* letters that react to the cursor (same as Journey) */
.cw .mt{position:relative;display:inline-block}
.cw .mt-w{display:inline-block;white-space:nowrap}
.cw .mt-c{display:inline-block;--t:0;will-change:transform;color:color-mix(in srgb,var(--accent) calc(var(--t) * 100%),currentColor);transition:transform .28s cubic-bezier(.2,.8,.2,1),color .28s ease-out}

/* shared paper panel look */
.cw-chap,.cw-map,.cw-dlg,.cw-keys,.cw-hint,.cw-mini{background:var(--glass);backdrop-filter:blur(10px);border:1px solid var(--ink);border-radius:14px}

/* HUD */
.cw-chap{position:absolute;top:24px;left:calc(4vw + 8px);max-width:min(560px,62vw);padding:16px 20px;pointer-events:none;animation:cw-in .8s both}
.cw-chap h2{margin:0 0 8px;font:700 13px ${BODY};letter-spacing:0;color:var(--mute)}
.cw-chap p{margin:0;font:800 clamp(20px,2.1vw,28px)/1.15 ${HEAD};letter-spacing:-.035em;color:var(--ink)}
.cw-dot{position:absolute;left:50%;top:50%;width:6px;height:6px;margin:-3px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 2px rgba(255,255,255,.95);pointer-events:none;transition:width .25s,height .25s,margin .25s,background .25s}
.cw-dot.on{width:32px;height:32px;margin:-16px;background:rgba(255,255,255,.25);border:2px solid var(--accent);box-shadow:0 0 0 2px rgba(255,255,255,.9)}
.cw-map{position:absolute;top:24px;right:24px;width:244px;padding:14px 16px;font-size:11px}
.cw-mh{display:flex;justify-content:space-between;color:var(--mute);margin-bottom:10px;font-weight:700}
.cw-map canvas{display:block;width:100%}
.cw-room{margin-top:12px;font:800 26px/1 ${HEAD};letter-spacing:-.04em;border-top:1px solid var(--line);padding-top:10px}
.cw-mf{margin-top:8px;color:var(--mute)}
.cw-mini{position:absolute;top:24px;right:24px;padding:6px 12px;font-size:11px}
.cw-dlg{position:absolute;left:50%;bottom:14vh;transform:translateX(-50%);width:min(440px,88vw);padding:18px 22px;border-left:4px solid var(--accent);animation:cw-inc .35s both;cursor:pointer;transition:background .25s,color .25s;box-shadow:0 18px 50px rgba(20,22,31,.25)}
.cw-dlg:hover{background:var(--ink);color:#fff}.cw-dlg:hover .cw-k,.cw-dlg:hover .cw-foot span{color:#cfd2dd}.cw-dlg:hover kbd{border-color:#fff}
.cw-k{display:flex;align-items:center;gap:9px;font-size:12px;font-weight:700;color:var(--mute);margin-bottom:8px}
.cw-k i{width:9px;height:9px;border-radius:50%}
.cw-line{font:800 24px/1.15 ${HEAD};letter-spacing:-.04em}
.cw-foot{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:14px;padding-top:12px;border-top:1px solid var(--line);font-size:13px}
.cw-foot b{font-weight:700}.cw-foot span{margin-left:auto;color:var(--mute);font-size:12px}
.cw-keys{position:absolute;right:24px;bottom:22px;padding:10px 16px;text-align:right;font-size:12px;line-height:1.9;pointer-events:none}
.cw-keys span{color:var(--mute)}

/* overlays */
.cw-over{position:absolute;inset:0;z-index:5;display:grid;place-items:center;padding:24px;background:rgba(236,238,244,.62);backdrop-filter:blur(10px);overflow:auto}
.cw-brief{display:grid;grid-template-columns:1.35fr 1fr 1fr;width:min(1080px,100%);background:rgba(255,255,255,.72);backdrop-filter:blur(14px);border:1px solid var(--ink);border-radius:18px;box-shadow:0 30px 80px rgba(20,22,31,.18);animation:cw-in .8s both;overflow:hidden}
.cw-col{padding:40px 34px;border-right:1px solid var(--ink)}.cw-col:last-child{border:0}
.cw-eb{margin:0 0 16px;font-size:13px;font-weight:700;color:var(--mute)}.cw-eb.sm{margin-top:30px}
.cw-brief h1{margin:0 0 26px;font-size:clamp(52px,7vw,104px)}
.cw-meta{margin:0 0 8px;font-size:13px;color:var(--mute)}.cw-meta b{color:var(--ink);margin-left:8px;font-weight:700}
.cw-meta b.live::before{content:'';display:inline-block;width:7px;height:7px;margin-right:8px;border-radius:50%;background:var(--accent);animation:cw-pulse 2s infinite}
.cw-txt{margin:22px 0 28px;font-size:16px;line-height:1.6;color:#3a3e4d;max-width:44ch}
.cw-ghost{padding:12px 18px;border:0;background:none;color:var(--ink);font:700 14px ${BODY};cursor:pointer;opacity:.7}.cw-ghost:hover{opacity:1}
.cw-ctl,.cw-rooms{list-style:none;margin:0;padding:0;font-size:14px}
.cw-ctl li{display:flex;align-items:center;gap:14px;padding:11px 0;border-bottom:1px solid var(--line)}.cw-ctl li:first-child{border-top:1px solid var(--ink)}.cw-ctl li:last-child{border-bottom:0}
.cw-ctl li span{flex:0 0 112px}
.cw-rooms li{display:flex;align-items:center;gap:12px;padding:8px 0;font:800 24px ${HEAD};letter-spacing:-.04em}.cw-rooms i{width:10px;height:10px;border-radius:50%}
.cw-links{display:flex;flex-direction:column;gap:8px}
.cw-links a{color:var(--ink);text-decoration:none;font-size:14px;font-weight:700;padding:10px 14px;border:1px solid var(--ink);border-radius:12px;background:#fff;transition:background .25s,color .25s}
.cw-links a:hover{background:var(--ink);color:#fff}.cw-links em{display:block;margin-top:3px;font-style:normal;font-weight:400;opacity:.65;font-size:12px}
.cw-pause{text-align:center;cursor:pointer}.cw-pause h2{margin:0 0 28px;font-size:clamp(38px,5.4vw,72px)}.cw-pause .cw-links{max-width:340px;margin:0 auto;text-align:left;cursor:default}

/* form */
.cw-form{width:min(500px,100%);padding:36px;background:var(--paper);border:1px solid var(--ink);border-radius:18px;display:flex;flex-direction:column;gap:16px;animation:cw-in .5s both;user-select:text;box-shadow:0 30px 80px rgba(20,22,31,.2)}
.cw-form h2{margin:0 0 4px;font-size:46px}
.cw-form label{display:flex;flex-direction:column;gap:7px;font-size:13px;font-weight:700}
.cw-form input,.cw-form textarea{padding:13px 14px;background:#fff;border:1px solid var(--line);border-radius:10px;color:var(--ink);font:15px ${BODY};resize:vertical;transition:border-color .2s}
.cw-form input:focus,.cw-form textarea:focus{outline:none;border-color:var(--accent)}
.cw-row{display:flex;align-items:center;gap:8px}.cw-err{margin:0;color:#c0392b;font-size:13px}
.cw-alt{margin:2px 0 0;font-size:13px;color:var(--mute)}.cw-alt a{color:var(--accent)}

/* hint + joystick */
.cw-hint{position:absolute;left:50%;bottom:34px;transform:translateX(-50%);padding:10px 20px;border-radius:999px;font-size:13px;font-weight:500;white-space:nowrap;pointer-events:none;animation:cw-inc .8s .3s both,cw-out 1s 8s forwards}
.cw-hint .coarse{display:none}
.cw-joy{position:absolute;left:26px;bottom:34px;width:120px;height:120px;border-radius:50%;border:1px solid var(--ink);background:var(--glass);touch-action:none;display:grid;place-items:center}
.cw-joy i{width:46px;height:46px;border-radius:50%;background:var(--ink);pointer-events:none}
@media (pointer:fine){.cw-joy{display:none}}
@media (pointer:coarse){.cw-hint .fine{display:none}.cw-hint .coarse{display:inline}}

@keyframes cw-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes cw-inc{from{opacity:0;transform:translate(-50%,10px)}to{opacity:1;transform:translate(-50%,0)}}
@keyframes cw-out{to{opacity:0;transform:translate(-50%,8px)}}
@keyframes cw-pulse{50%{opacity:.35}}
@media (max-width:900px){.cw-brief{grid-template-columns:1fr}.cw-col{border-right:0;border-bottom:1px solid var(--ink);padding:24px 18px}.cw-map{width:170px;padding:10px 12px}.cw-room{font-size:20px}.cw-keys{display:none}.cw-ctl li span{flex-basis:96px}.cw-chap{left:18px}}
@media (prefers-reduced-motion:reduce){.cw *{animation:none!important;transition:none!important}}
`;