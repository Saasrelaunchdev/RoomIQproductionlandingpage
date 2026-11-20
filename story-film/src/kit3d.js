// The 3D kit: soft clay shapes with rounded edges, flat colours and soft shadows (the style of 3D landing page art).
// Every builder returns a Group whose origin sits on the ground at the object's centre, facing +z. Colours come from
// C; set them from the landing page's own art with setPalette() before building (sample lit and shaded faces).
// Generic pieces: primitives, ground layers, a floating slab, people and poses, buildings, trees, a vehicle, a street
// lamp, a desk with a laptop and a monitor, a phone, and a brand tile. Build what the story's world needs; add pieces
// in the same style when it needs more.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// A pastel clay palette. Replace with colours sampled from the page's art.
export const C = {
  grass: '#b2eea4', grass2: '#a5e897', slab: '#e3eaf6', slabEdge: '#cfdaeb', road: '#76869f', roadLine: '#ffffff',
  walk: '#edf1f5', path: '#e6ebf1',
  roofNavy: '#3f5683', roofBlue: '#4d73b8', roofGrey: '#7f98c1', roofCoral: '#f39a7c',
  wallCream: '#f4efe3', wallWhite: '#f5f6f7', wallBlue: '#dce7f6', wallSand: '#efe4d2',
  doorBlue: '#1f86ff', doorNavy: '#244268', doorRed: '#d9654b', frame: '#ffffff', pane: '#c9dcf3', paneNight: '#ffd27a',
  leaf: '#7fe484', leaf2: '#6bd973', leaf3: '#94ec92', trunk: '#a87a55',
  van: '#f4f6f8', stripe: '#1f86ff', stripeRival: '#ee7d57', glass: '#13223c', tire: '#1b2335', hub: '#c9d3e0', ladder: '#c3ccd8',
  techShirt: '#2f80f0', techCap: '#4f8ff7', pants: '#17294c', capNavy: '#1a2e4c',
  rivalShirt: '#e8774f', rivalCap: '#f08f68',
  skin: ['#f2c8a5', '#d9a27c', '#a86f4c', '#7a4a2f', '#f6d3b8'],
  hair: ['#3b2a20', '#1d1a1a', '#7a4b2a', '#c9a06a', '#4a3426'],
  blue: '#1f86ff', royal: '#1a5cf0', cyan: '#2bd0ff', star: '#f9ce14', amber: '#f5a524', ink: '#0a1a33',
  concrete: '#d9dee6', water: '#5fb2ff', heater: '#eef2f6',
};

const mats = new Map();
export function setPalette(p) { Object.assign(C, p); }

export function mat(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!mats.has(key)) {
    mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0, ...o }));
  }
  return mats.get(key);
}
// A material whose colour or glow the story changes over time (windows at night, screens): never shared.
export function ownMat(color, o = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...o });
}

const geos = new Map();
function rgeo(w, h, d, r, s = 3) {
  const key = [w, h, d, r, s].map((v) => +v.toFixed(3)).join(',');
  if (!geos.has(key)) geos.set(key, new RoundedBoxGeometry(w, h, d, s, Math.min(r, w / 2, h / 2, d / 2) - 0.0001));
  return geos.get(key);
}

export function mesh(geo, material, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = cast; m.receiveShadow = receive;
  return m;
}

// A rounded box resting on y=0 unless `y` says otherwise; x, z are its centre.
export function rbox(w, h, d, r, material, { x = 0, y = 0, z = 0, s = 3, cast = true, receive = true } = {}) {
  const m = mesh(rgeo(w, h, d, r, s), typeof material === 'string' ? mat(material) : material, { cast, receive });
  m.position.set(x, y + h / 2, z);
  return m;
}

export function sphere(r, material, { x = 0, y = 0, z = 0, detail = 24, cast = true } = {}) {
  const m = mesh(new THREE.SphereGeometry(r, detail, Math.round(detail * 0.75)), typeof material === 'string' ? mat(material) : material, { cast });
  m.position.set(x, y, z);
  return m;
}

export function cyl(rt, rb, h, material, { x = 0, y = 0, z = 0, seg = 28, cast = true } = {}) {
  const m = mesh(new THREE.CylinderGeometry(rt, rb, h, seg), typeof material === 'string' ? mat(material) : material, { cast });
  m.position.set(x, y + h / 2, z);
  return m;
}

export function capsule(r, len, material, { cast = true } = {}) {
  return mesh(new THREE.CapsuleGeometry(r, len, 8, 20), typeof material === 'string' ? mat(material) : material, { cast });
}

// ---------------------------------------------------------------------------------------------------------------
// Houses

// A gable house (a home, a clinic, a small office): walls w (x) by d (z), the ridge running along z. Returns the group with .windows (materials that
// glow at night), .door (the door mesh, hinged), and .front (the door's position in group space).
export function gableHouse({ w = 3.2, d = 2.8, h = 1.75, wall = C.wallCream, roof = C.roofNavy, door = C.doorBlue,
  chimney = true, pitch = 0.62, flip = false } = {}) {
  const g = new THREE.Group();
  g.add(rbox(w, h, d, 0.1, wall));
  // the gable ends: a triangular prism under the roof, in the wall colour
  const roofH = (w / 2) * Math.tan(pitch);
  const tri = new THREE.Shape();
  tri.moveTo(-w / 2 + 0.02, 0); tri.lineTo(w / 2 - 0.02, 0); tri.lineTo(0, roofH - 0.04); tri.closePath();
  const gable = mesh(new THREE.ExtrudeGeometry(tri, { depth: d - 0.04, bevelEnabled: false }), mat(wall));
  gable.position.set(0, h - 0.01, -d / 2 + 0.02);
  g.add(gable);
  // two roof panels with an overhang
  const over = 0.28, thick = 0.24;
  const slant = (w / 2 + over) / Math.cos(pitch);
  for (const side of [-1, 1]) {
    const p = mesh(rgeo(slant, thick, d + over * 2, 0.1), mat(roof));
    p.rotation.z = -side * pitch;
    const cx = side * (w / 4 + over / 2) ;
    const cy = h + roofH / 2 - (over / 2) * Math.tan(pitch) + thick * 0.35;
    p.position.set(cx, cy, 0);
    g.add(p);
  }
  // a ridge cap hides the seam
  const ridge = mesh(rgeo(0.34, 0.2, d + over * 2 + 0.02, 0.09), mat(roof));
  ridge.position.set(0, h + roofH + thick * 0.55, 0);
  g.add(ridge);
  if (chimney) {
    const cx = (flip ? -1 : 1) * w * 0.22;
    const ch = rbox(0.36, 0.95, 0.36, 0.06, '#b9c6dc', { x: cx, y: h + roofH * 0.35, z: -d * 0.18 });
    g.add(ch);
  }
  // door, hinged on its left edge so it can swing open; the dark doorway behind it shows when it does
  const hinge = new THREE.Group();
  hinge.position.set(-0.29 + (flip ? -w * 0.18 : w * 0.12), 0.06, d / 2 + 0.03);
  const inside = ownMat('#3b3330', { emissive: '#ffcf7a', emissiveIntensity: 0 });
  g.add(rbox(0.58, 1.02, 0.02, 0.01, inside, { x: hinge.position.x + 0.29, y: 0.06, z: d / 2 + 0.005, cast: false }));
  g.inside = inside;
  const doorMesh = rbox(0.58, 1.02, 0.07, 0.03, door, { x: 0.29 });
  hinge.add(doorMesh);
  hinge.add(sphere(0.035, '#e8eef6', { x: 0.5, y: 0.52, z: 0.05, detail: 10, cast: false }));
  g.add(hinge);
  g.door = hinge;
  g.front = new THREE.Vector3(hinge.position.x + 0.29, 0, d / 2 + 0.55);
  // windows: a white frame and a pane whose material can glow
  g.windows = [];
  const addWin = (x, y, z, rotY, ww = 0.62, wh = 0.56) => {
    const wg = new THREE.Group();
    wg.add(rbox(ww, wh, 0.07, 0.03, C.frame, { y: -wh / 2, cast: false }));
    const pm = ownMat(C.pane, { roughness: 0.4 });
    g.windows.push(pm);
    const pane = rbox(ww - 0.12, wh - 0.12, 0.05, 0.02, pm, { y: -(wh - 0.12) / 2, z: 0.02, cast: false });
    wg.add(pane);
    wg.add(rbox(0.035, wh - 0.12, 0.06, 0.01, C.frame, { y: -(wh - 0.12) / 2, z: 0.03, cast: false }));
    wg.position.set(x, y, z); wg.rotation.y = rotY;
    g.add(wg);
  };
  const dx = flip ? w * 0.2 : -w * 0.24;
  addWin(dx, h * 0.62, d / 2 + 0.02, 0);
  addWin(w / 2 + 0.02, h * 0.62, -d * 0.12, Math.PI / 2);
  addWin(-w / 2 - 0.02, h * 0.62, d * 0.1, -Math.PI / 2);
  // a step and a short path
  g.add(rbox(0.9, 0.08, 0.4, 0.03, C.path, { x: g.front.x, z: d / 2 + 0.22, cast: false }));
  return g;
}

export function tree({ s = 1, seed = 1, colors = [C.leaf, C.leaf2, C.leaf3] } = {}) {
  const g = new THREE.Group();
  g.add(cyl(0.09 * s, 0.11 * s, 0.75 * s, C.trunk, { seg: 12 }));
  const r = (seed * 9301 + 49297) % 233280 / 233280;
  const blobs = [[0, 1.05, 0, 0.55], [0.28, 0.92, 0.12, 0.38], [-0.2, 1.3, -0.1, 0.36]];
  blobs.forEach(([x, y, z, rad], i) => {
    if (i === 2 && r < 0.4) return;
    g.add(sphere(rad * s, colors[(((i + seed) % colors.length) + colors.length) % colors.length], { x: x * s, y: y * s, z: z * s, detail: 22 }));
  });
  return g;
}

export function bush({ s = 1, color = C.leaf2 } = {}) {
  const b = sphere(0.32 * s, color, { y: 0.16 * s, detail: 18 });
  b.scale.y = 0.72;
  return b;
}

export function fence(len, { color = '#ffffff', posts = 6 } = {}) {
  const g = new THREE.Group();
  for (let i = 0; i < posts; i++) {
    g.add(rbox(0.07, 0.42, 0.07, 0.02, color, { x: -len / 2 + (len * i) / (posts - 1) }));
  }
  g.add(rbox(len, 0.06, 0.05, 0.02, color, { y: 0.3 }));
  g.add(rbox(len, 0.06, 0.05, 0.02, color, { y: 0.15 }));
  return g;
}

// ---------------------------------------------------------------------------------------------------------------
// Vehicles

// A service van, nose toward +z. .lights are the head and tail light materials (they glow at night), .beams the
// headlight cones, .wheels the wheels (they turn as it drives).
export function van({ stripe = C.stripe, ladder = true, body = C.van } = {}) {
  const g = new THREE.Group();
  const lift = 0.26;
  g.add(rbox(1.3, 1.08, 2.25, 0.2, body, { y: lift, z: -0.22 }));
  g.add(rbox(1.26, 0.62, 0.8, 0.18, body, { y: lift, z: 1.1 }));
  // windscreen and side windows
  const ws = rbox(1.08, 0.42, 0.08, 0.05, C.glass, { y: lift + 0.62, z: 0.92 });
  ws.rotation.x = -0.32;
  g.add(ws);
  for (const sx of [-1, 1]) g.add(rbox(0.06, 0.32, 0.5, 0.04, C.glass, { x: sx * 0.655, y: lift + 0.66, z: 0.62 }));
  for (const sx of [-1, 1]) g.add(rbox(0.06, 0.28, 0.62, 0.04, C.glass, { x: sx * 0.655, y: lift + 0.68, z: -0.3 }));
  // the stripe all the way round
  g.add(rbox(1.33, 0.15, 2.28, 0.06, stripe, { y: lift + 0.32, z: -0.22, cast: false }));
  g.add(rbox(1.29, 0.15, 0.82, 0.06, stripe, { y: lift + 0.32, z: 1.1, cast: false }));
  // bumper, lights
  g.add(rbox(1.2, 0.14, 0.12, 0.05, '#dfe5ee', { y: lift + 0.02, z: 1.5 }));
  g.lights = [];
  for (const sx of [-1, 1]) {
    const hl = ownMat('#fff4cc', { emissive: '#fff1c0', emissiveIntensity: 0.15 });
    g.lights.push(hl);
    g.add(rbox(0.22, 0.13, 0.05, 0.03, hl, { x: sx * 0.42, y: lift + 0.3, z: 1.505, cast: false }));
    const tl = ownMat('#ef5a4a', { emissive: '#ff3b2f', emissiveIntensity: 0.1 });
    g.lights.push(tl);
    g.add(rbox(0.14, 0.2, 0.04, 0.03, tl, { x: sx * 0.5, y: lift + 0.4, z: -1.36, cast: false }));
  }
  // wheels
  g.wheels = [];
  for (const [sx, sz] of [[-1, 0.9], [1, 0.9], [-1, -0.85], [1, -0.85]]) {
    const w = new THREE.Group();
    const tire = mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.22, 26), mat(C.tire));
    tire.rotation.z = Math.PI / 2;
    w.add(tire);
    const hub = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.24, 18), mat(C.hub), { cast: false });
    hub.rotation.z = Math.PI / 2;
    w.add(hub);
    w.position.set(sx * 0.6, 0.29, sz);
    g.add(w);
    g.wheels.push(w);
  }
  if (ladder) {
    for (const sx of [-1, 1]) g.add(rbox(0.06, 0.06, 1.9, 0.02, C.ladder, { x: sx * 0.32, y: lift + 1.12, z: -0.25 }));
    for (let i = 0; i < 7; i++) g.add(rbox(0.66, 0.045, 0.05, 0.015, C.ladder, { y: lift + 1.13, z: -1.1 + i * 0.29 }));
    for (const sz of [-0.95, 0.45]) for (const sx of [-1, 1]) g.add(rbox(0.05, 0.1, 0.05, 0.01, C.ladder, { x: sx * 0.32, y: lift + 1.06, z: sz }));
  }
  // headlight cones, shown at night
  g.beams = [];
  const coneMat = new THREE.MeshBasicMaterial({ color: '#fff3c0', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  for (const sx of [-1, 1]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3.2, 24, 1, true), coneMat);
    cone.rotation.x = -Math.PI / 2;
    cone.position.set(sx * 0.42, lift + 0.25, 1.5 + 1.6);
    g.add(cone);
    g.beams.push(cone);
  }
  g.beamMat = coneMat;
  return g;
}

// ---------------------------------------------------------------------------------------------------------------
// People. A chunky character in the style of the page's crew picture: a big head, a rounded body, short legs.

export function person({ shirt = C.techShirt, pants = C.pants, skin = C.skin[0], hat = 'cap', capColor = C.techCap,
  hair = C.hair[0], scale = 1 } = {}) {
  const g = new THREE.Group();
  const root = new THREE.Group();
  g.add(root);
  root.scale.setScalar(scale);
  // legs pivot at the hips
  const legs = [];
  for (const sx of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(sx * 0.11, 0.42, 0);
    const leg = capsule(0.1, 0.24, pants);
    leg.position.y = -0.21;
    hip.add(leg);
    root.add(hip);
    legs.push(hip);
  }
  const torso = new THREE.Group();
  torso.position.y = 0.42;
  root.add(torso);
  const body = capsule(0.25, 0.22, shirt);
  body.position.y = 0.3;
  torso.add(body);
  // arms pivot at the shoulders
  const arms = [];
  for (const sx of [-1, 1]) {
    const sh = new THREE.Group();
    sh.position.set(sx * 0.29, 0.5, 0);
    const arm = capsule(0.075, 0.26, shirt);
    arm.position.y = -0.17;
    sh.add(arm);
    const hand = sphere(0.075, skin, { y: -0.34, detail: 12 });
    sh.add(hand);
    sh.rotation.z = sx * 0.12;
    torso.add(sh);
    arms.push(sh);
  }
  const head = new THREE.Group();
  head.position.y = 0.92;
  torso.add(head);
  head.add(sphere(0.235, skin, { detail: 28 }));
  // face: eyes and a mouth that can smile or worry
  for (const sx of [-1, 1]) head.add(sphere(0.026, '#1a1d26', { x: sx * 0.078, y: 0.03, z: 0.215, detail: 10, cast: false }));
  const smile = mesh(new THREE.TorusGeometry(0.07, 0.016, 8, 20, Math.PI), mat('#1a1d26'), { cast: false });
  smile.rotation.z = Math.PI;
  smile.position.set(0, -0.045, 0.205);
  head.add(smile);
  const oMouth = mesh(new THREE.TorusGeometry(0.03, 0.014, 8, 16), mat('#1a1d26'), { cast: false });
  oMouth.position.set(0, -0.075, 0.21);
  oMouth.visible = false;
  head.add(oMouth);
  if (hat === 'cap') {
    // the crown covers the top of the head; the brim points forward
    const crown = mesh(new THREE.SphereGeometry(0.252, 26, 14, 0, Math.PI * 2, 0, Math.PI / 2), mat(capColor));
    crown.scale.set(1, 0.9, 1);
    crown.position.y = 0.03;
    head.add(crown);
    head.add(rbox(0.36, 0.04, 0.22, 0.018, capColor, { y: 0.03, z: 0.2 }));
    head.add(sphere(0.03, capColor, { y: 0.255, detail: 10, cast: false }));
  } else if (hat === 'hair' || hat === 'bun' || hat === 'long') {
    const top = mesh(new THREE.SphereGeometry(0.25, 24, 18, 0, Math.PI * 2, 0, Math.PI / 1.9), mat(hair));
    top.position.y = 0.01;
    top.rotation.x = -0.25;
    head.add(top);
    if (hat === 'bun') head.add(sphere(0.11, hair, { y: 0.24, z: -0.12, detail: 14 }));
    if (hat === 'long') {
      const back = rbox(0.42, 0.42, 0.14, 0.07, hair, { y: -0.3, z: -0.14 });
      head.add(back);
    }
  }
  // a phone the character can hold up; its screen can glow
  const phone = new THREE.Group();
  const screenMat = ownMat('#9ec9ff', { emissive: '#8fc2ff', emissiveIntensity: 0 });
  phone.add(rbox(0.13, 0.24, 0.025, 0.02, '#141b2b', { y: -0.12, cast: false }));
  phone.add(rbox(0.11, 0.21, 0.01, 0.01, screenMat, { y: -0.115, z: 0.014, cast: false }));
  phone.position.set(0, -0.36, 0.06);
  phone.visible = false;
  arms[1].add(phone);
  g.parts = { root, legs, torso, body, arms, head, smile, oMouth, phone, screenMat };
  return g;
}

// Poses, set every frame. walk: phase in cycles (0..n); wave: 0..1 strength with its own phase; phone: 0..1 raise.
// Poses, set every frame from t. walk: distance walked in strides; walking 0..1; wave 0..1; phone 0..1 (held up to
// read); call 0..1 (to the ear); sit 0..1 (legs forward: place the person so the hips, 0.42 up, meet the seat); type
// 0..1 (hands on a keyboard); worried shows an "o" mouth.
export function pose(p, { walk = 0, walking = 0, wave = 0, phone = 0, call = 0, worried = 0, bob = 0, lookY = 0, arms = 0, sit = 0, type = 0, t = 0 } = {}) {
  const P = p.parts;
  const s = Math.sin(walk * Math.PI * 2);
  P.legs[0].rotation.x = s * 0.55 * walking;
  P.legs[1].rotation.x = -s * 0.55 * walking;
  P.torso.position.y = 0.42 + Math.abs(Math.cos(walk * Math.PI * 2)) * 0.035 * walking + bob;
  P.arms[0].rotation.x = -s * 0.5 * walking;
  P.arms[1].rotation.x = s * 0.5 * walking;
  P.arms[0].rotation.z = -0.12 - arms * 0.5;
  P.arms[1].rotation.z = 0.12 + arms * 0.5;
  if (wave > 0) {
    // the right arm (on the character's left, +x) swings up and waves
    P.arms[1].rotation.z = 0.12 + wave * 2.55 + Math.sin(t * 9) * 0.28 * wave;
    P.arms[1].rotation.x = 0;
  }
  if (call > 0) {
    // a phone held to the ear
    P.arms[1].rotation.z = 0.12 + call * 2.15;
    P.arms[1].rotation.x = -call * 0.55;
    P.phone.visible = call > 0.3;
    P.phone.rotation.set(0, 0, 0);
  }
  if (phone > 0) {
    P.arms[1].rotation.x = -phone * 1.75;
    P.arms[1].rotation.z = 0.12 - phone * 0.35;
    P.phone.visible = phone > 0.05;
    P.phone.rotation.x = phone * 1.55;
    P.head.rotation.x = phone * 0.32;
  } else if (call <= 0) {
    P.phone.visible = false;
    P.head.rotation.x = 0;
  }
  if (sit > 0) { P.legs[0].rotation.x = -1.45 * sit; P.legs[1].rotation.x = -1.45 * sit; }
  if (type > 0) {
    P.arms[0].rotation.x = -1.15 * type + Math.sin(t * 17) * 0.05 * type;
    P.arms[1].rotation.x = -1.15 * type + Math.sin(t * 19 + 1) * 0.05 * type;
    P.arms[0].rotation.z = -0.05; P.arms[1].rotation.z = 0.05;
  }
  P.head.rotation.y = lookY;
  P.smile.visible = worried < 0.5;
  P.oMouth.visible = worried >= 0.5;
}

// ---------------------------------------------------------------------------------------------------------------
// Buildings for the two shops

function signTexture(lines, bg, fg = '#ffffff') {
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = 256;
  const x = cv.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, 1024, 256);
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = '700 104px Outfit, sans-serif';
  x.fillText(lines[0], 512, lines[1] ? 100 : 132);
  if (lines[1]) { x.font = '600 52px Geist, sans-serif'; x.globalAlpha = 0.85; x.fillText(lines[1], 512, 196); }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// A flat-roofed block with a sign: a shop, a workshop, an office, a clinic. garage: a roller door. .office is the window
// material (lit at night), .front the door position, .signMat the sign (it glows a little at night).
export function block({ wall = C.wallBlue, trim = C.roofNavy, sign = C.blue, words = ['YOUR COMPANY', 'WHAT IT DOES'], garage = true } = {}) {
  const g = new THREE.Group();
  const w = 4.6, d = 3.2, h = 2.1;
  g.add(rbox(w, h, d, 0.1, wall));
  g.add(rbox(w + 0.3, 0.26, d + 0.3, 0.08, trim, { y: h }));
  if (garage) {
    g.add(rbox(1.7, 1.45, 0.06, 0.03, '#e9eef5', { x: -1.05, z: d / 2 + 0.01 }));
    for (let i = 1; i < 6; i++) g.add(rbox(1.66, 0.025, 0.04, 0.01, '#cdd6e3', { x: -1.05, y: i * 0.24, z: d / 2 + 0.05, cast: false }));
  } else {
    g.add(rbox(1.7, 0.9, 0.07, 0.03, C.frame, { x: -1.05, y: 0.5, z: d / 2 + 0.02, cast: false }));
    g.add(rbox(1.56, 0.78, 0.06, 0.02, ownMat(C.pane, { roughness: 0.4 }), { x: -1.05, y: 0.56, z: d / 2 + 0.05, cast: false }));
  }
  // office door and window
  g.add(rbox(0.6, 1.05, 0.07, 0.03, trim, { x: 0.65, z: d / 2 + 0.02 }));
  const office = ownMat(C.pane, { roughness: 0.4 });
  g.add(rbox(1.0, 0.7, 0.07, 0.03, C.frame, { x: 1.6, y: 0.55, z: d / 2 + 0.02, cast: false }));
  g.add(rbox(0.88, 0.58, 0.06, 0.02, office, { x: 1.6, y: 0.61, z: d / 2 + 0.05, cast: false }));
  g.office = office;
  // the sign
  const tex = signTexture(words, sign);
  const signMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.08 });
  const board = rbox(2.9, 0.72, 0.12, 0.05, sign, { y: h - 0.42 + 0.0, z: d / 2 + 0.08 });
  board.position.y = h + 0.05;
  g.add(board);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(2.78, 0.62), signMat);
  face.position.set(0, h + 0.41, d / 2 + 0.145);
  g.add(face);
  g.signMat = signMat;
  g.front = new THREE.Vector3(0.65, 0, d / 2 + 0.6);
  // a lamp over the door
  const lamp = ownMat('#fff6d8', { emissive: '#ffe7a8', emissiveIntensity: 0 });
  g.add(rbox(0.3, 0.08, 0.18, 0.03, lamp, { x: 0.65, y: 1.25, z: d / 2 + 0.12, cast: false }));
  g.lamp = lamp;
  return g;
}

// A street lamp whose bulb glows at night.
export function streetLamp() {
  const g = new THREE.Group();
  g.add(cyl(0.05, 0.06, 2.3, '#9aa8bd', { seg: 10 }));
  const arm = rbox(0.5, 0.06, 0.06, 0.02, '#9aa8bd', { x: 0.22, y: 2.25 });
  g.add(arm);
  const bulb = ownMat('#fff3cf', { emissive: '#ffdf96', emissiveIntensity: 0 });
  g.add(rbox(0.26, 0.1, 0.2, 0.04, bulb, { x: 0.42, y: 2.17, cast: false }));
  g.bulb = bulb;
  const poolMat = new THREE.MeshBasicMaterial({ color: '#ffdc8a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1.25, 40), poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0.42, 0.03, 0);
  g.add(pool);
  g.pool = poolMat;
  return g;
}

// ---------------------------------------------------------------------------------------------------------------
// The brand as a 3D tile: a rounded square whose front face is painted by paint(ctx, size) on a 512 px canvas (draw the
// brand's mark from its SVG paths, a gradient, a letter). It can stand on a plinth or float (plinth: false).

function tileTexture(paint) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 512;
  paint(cv.getContext('2d'), 512);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export const paintLetter = (letter, from = '#2BD0FF', to = '#1A5CF0') => (x, n) => {
  const gr = x.createLinearGradient(0, 0, n, n);
  gr.addColorStop(0, from); gr.addColorStop(1, to);
  x.fillStyle = gr; x.fillRect(0, 0, n, n);
  x.fillStyle = '#fff'; x.font = `700 ${n * 0.6}px system-ui, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(letter, n / 2, n * 0.54);
};

// paint the mark from SVG path data drawn in a 64-unit box, white strokes on a gradient (most app-icon style marks)
export const paintPaths = (paths, { from = '#2BD0FF', mid = '#1F86FF', to = '#1A5CF0', width = 5.6 } = {}) => (x, n) => {
  const gr = x.createLinearGradient(n * 0.16, n * 0.06, n * 0.84, n * 0.94);
  gr.addColorStop(0, from); gr.addColorStop(0.52, mid); gr.addColorStop(1, to);
  x.fillStyle = gr; x.fillRect(0, 0, n, n);
  x.scale(n / 64, n / 64);
  x.lineCap = 'round'; x.lineJoin = 'round'; x.lineWidth = width; x.strokeStyle = '#fff';
  for (const d of paths) x.stroke(new Path2D(d));
};

export function brandTile({ size = 1.6, paint = paintLetter('A'), side = '#1f6fff', plinth = true } = {}) {
  const g = new THREE.Group();
  const tex = tileTexture(paint);
  const sideMat = new THREE.MeshStandardMaterial({ color: side, roughness: 0.45, metalness: 0.05 });
  const front = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.12 });
  const tile = new THREE.Mesh(rgeo(size, size, size * 0.32, size * 0.24, 5), [sideMat, sideMat, sideMat, sideMat, front, sideMat]);
  tile.castShadow = true;
  tile.position.y = size / 2 + 0.12;
  g.add(tile);
  if (plinth) g.add(rbox(size * 1.25, 0.12, size * 0.8, 0.05, '#f2f6fc'));
  g.tile = tile;
  return g;
}

// ---------------------------------------------------------------------------------------------------------------
// The ground, in layers. Two surfaces at one height fight for the same pixels and flicker between their colours
// (sidewalks once flickered white and green over the grass in every street shot). So every flat layer gets a height of
// its own above the ground top, and flat() refuses a layer that is not in the table. Keep layers 0.004 or more apart;
// glow pools and decals go above them all.
export const GROUND = 0.01;
export const LAYER = { path: GROUND - 0.002, walk: GROUND + 0.006, road: GROUND + 0.01, line: GROUND + 0.014, decal: GROUND + 0.018, pool: GROUND + 0.022 };
export function flat(parent, w, d, color, x, z, layer) {
  if (!(layer in LAYER)) throw new Error(`flat(): unknown layer "${layer}" (use one of ${Object.keys(LAYER).join(', ')})`);
  const m = mesh(new THREE.PlaneGeometry(w, d), typeof color === 'string' ? mat(color) : color, { cast: false });
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, LAYER[layer], z);
  parent.add(m);
  return m;
}

// A floating diorama slab: a rounded base and the ground on top (its top at GROUND). z0..z1 is its depth along z.
export function slab(width, z0, z1, { base = C.slab, top = C.grass } = {}) {
  const g = new THREE.Group();
  const dep = z1 - z0, cz = (z0 + z1) / 2;
  g.add(rbox(width, 1.4, dep, 1.2, base, { y: -1.45, z: cz, s: 6 }));
  g.add(rbox(width - 0.5, 0.25, dep - 0.5, 0.9, top, { y: GROUND - 0.25, z: cz, s: 5 }));
  return g;
}

// ---------------------------------------------------------------------------------------------------------------
// A workplace: desk, chair, laptop, monitor, plant, mug. Screens have their own material (glow at night, or a canvas
// texture via screenCanvas()).

export function desk({ w = 2.2, d = 1.0, h = 0.95, top = '#e9dcc8', legs = '#9aa8bd' } = {}) {
  const g = new THREE.Group();
  g.add(rbox(w, 0.08, d, 0.03, top, { y: h - 0.08 }));
  for (const [x, z] of [[-w / 2 + 0.1, -d / 2 + 0.1], [w / 2 - 0.1, -d / 2 + 0.1], [-w / 2 + 0.1, d / 2 - 0.1], [w / 2 - 0.1, d / 2 - 0.1]]) {
    g.add(rbox(0.07, h - 0.08, 0.07, 0.02, legs, { x, z }));
  }
  g.top = h;
  return g;
}

export function chair({ color = '#2e4363' } = {}) {
  const g = new THREE.Group();
  g.add(cyl(0.05, 0.05, 0.42, '#9aa8bd', { seg: 10 }));
  g.add(rbox(0.56, 0.1, 0.52, 0.04, color, { y: 0.42 }));
  g.add(rbox(0.56, 0.62, 0.1, 0.05, color, { y: 0.52, z: -0.24 }));
  g.seat = 0.52;
  return g;
}

// screen: { mat } is the screen material (colour, emissive); .screen is the screen mesh (for a canvas texture)
export function laptop({ body = '#c9d2de' } = {}) {
  const g = new THREE.Group();
  g.add(rbox(0.62, 0.03, 0.42, 0.015, body));
  const lid = new THREE.Group();
  lid.position.set(0, 0.03, -0.2);
  lid.rotation.x = -0.25;
  lid.add(rbox(0.62, 0.42, 0.025, 0.015, body, { z: 0 }));
  const sm = ownMat('#dbe8fb', { emissive: '#bcd6ff', emissiveIntensity: 0.25, roughness: 0.35 });
  const screen = rbox(0.56, 0.36, 0.01, 0.005, sm, { y: 0.03, z: 0.014, cast: false });
  lid.add(screen);
  g.add(lid);
  g.screenMat = sm; g.screen = screen;
  return g;
}

export function monitor({ body = '#2e4363', w = 1.0, h = 0.6 } = {}) {
  const g = new THREE.Group();
  g.add(rbox(0.32, 0.03, 0.22, 0.015, body));
  g.add(rbox(0.06, 0.32, 0.06, 0.02, body, { z: -0.04 }));
  g.add(rbox(w, h, 0.05, 0.03, body, { y: 0.3, z: -0.02 }));
  const sm = ownMat('#dbe8fb', { emissive: '#bcd6ff', emissiveIntensity: 0.25, roughness: 0.35 });
  const screen = rbox(w - 0.06, h - 0.06, 0.01, 0.01, sm, { y: 0.33, z: 0.01, cast: false });
  g.add(screen);
  g.screenMat = sm; g.screen = screen;
  return g;
}

export function plant({ s = 1 } = {}) {
  const g = new THREE.Group();
  g.add(cyl(0.11 * s, 0.09 * s, 0.18 * s, '#e8b98f', { seg: 18 }));
  g.add(sphere(0.16 * s, C.leaf2, { y: 0.3 * s, detail: 16 }));
  g.add(sphere(0.11 * s, C.leaf, { x: 0.08 * s, y: 0.4 * s, detail: 14 }));
  return g;
}

export function mug({ color = '#ffffff' } = {}) {
  return cyl(0.05, 0.045, 0.11, color, { seg: 16 });
}

// A canvas texture for a screen, redrawn in full by draw(ctx, w, h) every frame it shows (a frame must not depend on
// what an earlier frame painted). Most screens read better as 2D overlays projected onto them; use this for small ones.
export function screenCanvas(screenMesh, { w = 512, h = 320 } = {}) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  screenMesh.material = new THREE.MeshBasicMaterial({ map: tex });
  return { draw(fn) { const x = cv.getContext('2d'); x.clearRect(0, 0, w, h); fn(x, w, h); tex.needsUpdate = true; } };
}

// Night glows for a list of materials: lit windows and screens follow the mood, each scaled by its userData.on
// (set it in a shot to switch one off). Register the result: stage.glows.push(nightGlow([...]))
export function nightGlow(materials, { color = '#ffc865', lit = '#ffe3a3', day = '#c9dcf3', strength = 1.25 } = {}) {
  const c1 = new THREE.Color(day), c2 = new THREE.Color(lit);
  return (n) => {
    for (const m of materials) {
      const on = m.userData.on ?? 1;
      m.emissive.set(color);
      m.emissiveIntensity = n * on * strength;
      m.color.copy(c1).lerp(c2, n * on);
    }
  };
}
