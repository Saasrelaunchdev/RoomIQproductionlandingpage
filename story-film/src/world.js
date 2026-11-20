// The film's world, built once: Lakeview (the page's made-up market) as a miniature town on a floating slab, the
// six-room house at 1207 Greenway Drive that opens to show its rooms, the operator and the renters, and the operator's
// desk at home (a separate set far from the town). Colours are the GTM walkthrough's town palette, sampled from
// roomiq.io, and the page's tokens. Every builder returns plain objects; story.js poses them from t on every frame.
import { rng } from './anim.js';

export const PAL = {
  grass: '#CDE7C1', grass2: '#C2E0B4', park: '#BFE0B0', slab: '#E7EFFF', road: '#C7D1DC', roadLine: '#FFFFFF', walk: '#F1F4F7',
  path: '#E9EEF3', creek: '#BFE3F2', lake: '#C9E8F5', trail: '#F4EFE6',
  walls: ['#FBF8F2', '#E6EEF7', '#F5E8D8', '#FFFFFF', '#EAF2F0'], roofs: ['#4D5D82', '#3D6C8E', '#6E7C99', '#5A6A8F', '#465B78'],
  door: '#0077B6', doors: ['#0077B6', '#03045E', '#3D6C8E', '#6E625C'], glass: '#BCE2F0', frame: '#FFFFFF',
  leaf: '#7CC08E', leaf2: '#5FAA76', leaf3: '#94CE9E', trunk: '#8C6B4F', wood: '#E3CBA8', woodRoom: '#EADBC4', bed: '#FFFFFF',
  tile: '#E4EEF6', tub: '#FFFFFF', navy: '#03045E', cyan: '#00B4D8', blue: '#0077B6', amber: '#F2B442',
};

export function buildWorld({ S, THREE, kit }) {
  const { C, setPalette, rbox, sphere, cyl, mesh, mat, ownMat, gableHouse, tree, bush, person, slab, flat, LAYER, GROUND, streetLamp,
    desk, chair, laptop, plant, mug, nightGlow } = kit;
  setPalette({
    grass: PAL.grass, grass2: PAL.grass2, slab: PAL.slab, road: PAL.road, roadLine: PAL.roadLine, walk: PAL.walk, path: PAL.path,
    pane: PAL.glass, frame: PAL.frame, leaf: PAL.leaf, leaf2: PAL.leaf2, leaf3: PAL.leaf3, trunk: PAL.trunk,
    skin: ['#E8B892', '#C99D7B', '#A86F4C', '#7A4A2F', '#F2D2B6'], hair: ['#3B2A20', '#1D1A1A', '#7A4B2A', '#C9A06A', '#4A3426'],
  });
  initRibbon(THREE, kit);
  const R = rng(11);
  const pick = (a) => a[Math.floor(R() * a.length)];
  const town = new THREE.Group();
  S.scene.add(town);

  // ------------------------------------------------------------------ the slab and the ground layers
  const SX = 76, Z0 = -27, Z1 = 27;
  town.add(slab(SX, Z0, Z1, { base: PAL.slab, top: PAL.grass }));
  const roads = [
    { name: 'Greenway Drive', axis: 'x', at: 3.2, w: 2.6, a: -SX / 2 + 0.6, b: SX / 2 - 0.6 },
    { name: 'North Lane', axis: 'x', at: -9.6, w: 2.3, a: -SX / 2 + 0.6, b: SX / 2 - 0.6 },
    { name: 'High Street', axis: 'x', at: -23.0, w: 2.3, a: -SX / 2 + 0.6, b: SX / 2 - 0.6 },
    { name: 'Park Road', axis: 'z', at: -14.5, w: 2.3, a: Z0 + 0.6, b: 3.2 },
    { name: 'Mill Lane', axis: 'z', at: 11.0, w: 2.3, a: Z0 + 0.6, b: 3.2 },
    { name: 'Elm Street', axis: 'z', at: 27.5, w: 2.3, a: Z0 + 0.6, b: 3.2 },
  ];
  for (const r of roads) {
    const len = r.b - r.a, mid = (r.a + r.b) / 2;
    if (r.axis === 'x') {
      flat(town, len, r.w + 1.3, PAL.walk, mid, r.at, 'walk');
      flat(town, len, r.w, PAL.road, mid, r.at, 'road');
      for (let x = r.a + 1; x < r.b - 1; x += 2.2) flat(town, 1.0, 0.12, PAL.roadLine, x + 0.5, r.at, 'line');
    } else {
      flat(town, r.w + 1.3, len, PAL.walk, r.at, mid, 'walk');
      flat(town, r.w, len, PAL.road, r.at, mid, 'road');
      for (let z = r.a + 1; z < r.b - 2.5; z += 2.2) flat(town, 0.12, 1.0, PAL.roadLine, r.at, z + 0.5, 'line');
    }
  }
  // the greenway south of Greenway Drive: a winding creek and a trail beside it
  const creekPts = [], trailPts = [];
  for (let x = -SX / 2 + 1; x <= SX / 2 - 1; x += 1) {
    const z = 12.5 + 2.2 * Math.sin(x / 7.5) + 0.8 * Math.sin(x / 3.1 + 1);
    creekPts.push([x, z]);
    trailPts.push([x, z - 3.0 - 0.6 * Math.sin(x / 5)]);
  }
  ribbon(town, trailPts, 1.1, PAL.trail, LAYER.walk);
  ribbon(town, creekPts, 1.9, PAL.creek, LAYER.road);
  // the lake (south-west) and City Park (north-west)
  const lake = mesh(new THREE.CircleGeometry(1, 48), mat(PAL.lake), { cast: false });
  lake.rotation.x = -Math.PI / 2; lake.scale.set(8.5, 5.5, 1); lake.position.set(-28, LAYER.line, 20);
  town.add(lake);
  flat(town, 18, 9.3, PAL.park, -26.5, -16.25, 'walk');

  // ------------------------------------------------------------------ trees, lamps
  const trees = [];
  const addTree = (x, z, s = 1) => { const t = tree({ s, seed: Math.floor(R() * 9) }); t.position.set(x, 0, z); town.add(t); trees.push(t); return t; };
  for (let i = 0; i < 26; i++) { const p = creekPts[Math.floor(R() * creekPts.length)]; addTree(p[0] + (R() - 0.5) * 3, p[1] + (R() > 0.5 ? 2.6 : -1.6) + R(), 0.9 + R() * 0.4); }
  for (let i = 0; i < 14; i++) addTree(-34 + R() * 15, -20.5 + R() * 8.5, 0.9 + R() * 0.5);
  for (let i = 0; i < 8; i++) addTree(-16 + R() * 50, 24.6 + R() * 1.4, 0.85 + R() * 0.3);
  const lamps = [];
  for (const x of [-30, -18, -8, 8, 18, 30]) { const l = streetLamp(); l.position.set(x, 0, 1.55); l.rotation.y = Math.PI / 2; town.add(l); lamps.push(l); }
  S.glows.push((n) => {
    for (const l of lamps) { l.bulb.emissiveIntensity = n * 1.6; l.pool.opacity = n * 0.42; }
  });

  // ------------------------------------------------------------------ the houses on their lots
  // rows: z of the house centre, which way it faces, and the x spans between the cross roads
  const rows = [
    { z: -0.7, face: 1, spans: [[-37, -16], [-13, 9.6], [12.4, 26], [29, 37]] },
    { z: -6.1, face: -1, spans: [[-37, -16], [-13, 9.6], [12.4, 26], [29, 37]] },
    { z: -13.2, face: 1, spans: [[-13, 9.6], [12.4, 26], [29, 37]] },
    { z: -19.4, face: -1, spans: [[-13, 9.6], [12.4, 26], [29, 37]] },
    { z: 22.4, face: -1, spans: [[-18, 37]] },
  ];
  const HOUSE = [0, -1.95];       // 1207 Greenway Drive, the candidate: its centre
  const houses = [];              // every other house: { g, x, z, d (distance to the candidate), windows }
  for (const row of rows) {
    for (const [a, b] of row.spans) {
      const n = Math.floor((b - a) / 4.4);
      const step = (b - a) / n;
      for (let i = 0; i < n; i++) {
        const x = a + step * (i + 0.5) + (R() - 0.5) * 0.5;
        if (row.z === -0.7 && Math.abs(x - HOUSE[0]) < 6.2) continue;          // the candidate's lot
        const g = gableHouse({ w: 3.0 + R() * 0.5, d: 2.7 + R() * 0.3, h: 1.6 + R() * 0.3, wall: pick(PAL.walls), roof: pick(PAL.roofs),
          door: pick(PAL.doors), chimney: R() > 0.45, flip: R() > 0.5 });
        g.position.set(x, 0, row.z);
        g.rotation.y = row.face > 0 ? 0 : Math.PI;
        town.add(g);
        for (const m of g.windows) m.userData.on = 1;
        houses.push({ g, x, z: row.z, face: row.face, d: Math.hypot(x - HOUSE[0], row.z - HOUSE[1]) });
        if (R() > 0.55) { const b = bush({ s: 1.1 }); b.position.set(x + 1.9 * (R() > 0.5 ? 1 : -1), 0, row.z + row.face * 1.9); town.add(b); }
      }
    }
  }
  // the operator's own two houses (west, outside the ring), and the seventeen co-living houses inside it
  const RING = 21;
  const mine = houses.filter((h) => h.z === -0.7 && h.x < -16).sort((p, q) => p.x - q.x).slice(-2);
  const inside = houses.filter((h) => h.d < RING - 1.8 && !mine.includes(h)).sort((p, q) => p.d - q.d);
  const coliving = inside.filter((_, i) => i % 5 !== 3).slice(0, 17);   // seventeen of them rent rooms; a few do not
  const glowWin = [];
  for (const h of houses) glowWin.push(...h.g.windows);
  S.glows.push(nightGlow(glowWin, { color: '#ffc865', lit: '#ffe3a3', day: PAL.glass, strength: 1.2 }));

  // ------------------------------------------------------------------ 1207 Greenway Drive: six rooms, opens
  const H = roomHouse({ THREE, kit });
  H.g.position.set(HOUSE[0], 0, HOUSE[1]);
  town.add(H.g);
  S.glows.push(H.glow);
  // the For sale sign and its Sold rider, in the front yard
  const sign = yardSign({ THREE, kit });
  sign.g.position.set(HOUSE[0] + 3.2, 0, HOUSE[1] + 2.85);
  sign.g.rotation.y = -0.35;
  town.add(sign.g);
  // a mailbox
  const mbox = new THREE.Group();
  mbox.add(cyl(0.04, 0.04, 0.8, '#8a96a8', { seg: 8 }));
  mbox.add(rbox(0.32, 0.26, 0.5, 0.08, PAL.navy, { y: 0.78 }));
  mbox.position.set(HOUSE[0] - 1.9, 0, HOUSE[1] + 2.95);
  town.add(mbox);

  // ------------------------------------------------------------------ people
  const looks = [
    { shirt: '#8FA8C4', pants: '#3D4A66', skin: C.skin[0], hat: 'hair', hair: C.hair[2] },
    { shirt: '#86C595', pants: '#2F3B57', skin: C.skin[3], hat: 'bun', hair: C.hair[1] },
    { shirt: '#E6C9A8', pants: '#46506B', skin: C.skin[1], hat: 'hair', hair: C.hair[0] },
    { shirt: '#B6E8F7', pants: '#2A3550', skin: C.skin[2], hat: 'long', hair: C.hair[4] },
    { shirt: '#C3D1DE', pants: '#3A4560', skin: C.skin[4], hat: 'hair', hair: C.hair[3] },
    { shirt: '#A9C3DA', pants: '#2B3A5A', skin: C.skin[3], hat: 'hair', hair: C.hair[1] },
    { shirt: '#D9C7E8', pants: '#3D4A66', skin: C.skin[1], hat: 'long', hair: C.hair[0] },
    { shirt: '#9FD3C7', pants: '#2F3B57', skin: C.skin[0], hat: 'bun', hair: C.hair[2] },
  ];
  const opLook = { shirt: PAL.blue, pants: PAL.navy, skin: C.skin[1], hat: 'long', hair: '#3B2A20' };
  const op = person(opLook);
  town.add(op);
  const renters = looks.map((l) => { const p = person(l); town.add(p); return p; });
  const extra = looks.slice(0, 6).map((l, i) => { const p = person({ ...l, shirt: looks[(i + 3) % looks.length].shirt }); town.add(p); return p; });

  // two small cars for life on Greenway Drive
  const cars = [car({ kit, body: '#FFFFFF', THREE }), car({ kit, body: '#6E7C99', THREE })];
  for (const c of cars) town.add(c);

  // ------------------------------------------------------------------ the desk at home (far from the town)
  const D = deskSet({ S, THREE, kit, opLook });

  return { town, roads, houses, HOUSE, RING, mine, coliving, H, sign, op, renters, extra, cars, trees, lamps, D, creekPts };
}

// A flat ribbon along a polyline of [x, z] points, at a given height (a creek, a trail).
function ribbon(parent, pts, w, color, y) {
  const pos = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dz = b[1] - a[1];
    const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    pos.push([pts[i][0] - dz * w / 2, pts[i][1] + dx * w / 2], [pts[i][0] + dz * w / 2, pts[i][1] - dx * w / 2]);
  }
  ribbonMesh(parent, pos, color, y);
}
let ribbonMesh = () => {};
export function initRibbon(THREE, kit) {
  ribbonMesh = (parent, pos, color, y) => {
    const v = [], idx = [];
    pos.forEach(([x, z]) => v.push(x, 0, z));
    for (let i = 0; i < pos.length / 2 - 1; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = kit.mesh(g, kit.mat(color, { side: THREE.DoubleSide }), { cast: false });
    m.position.y = y;
    parent.add(m);
  };
}

// 1207 Greenway Drive: six bedrooms (rooms 1 and 2 with a private bath), two shared baths, a hallway. Walls cut down and
// the roof lifts away to show the rooms. Room floors glow by state: 'cyan' (evidence), 'warm' (occupied), 'dark'.
function roomHouse({ THREE, kit }) {
  const { rbox, mesh, mat, ownMat, sphere, cyl } = kit;
  const g = new THREE.Group();
  const W = 7.0, Dp = 4.9, Hh = 1.95, T = 0.14;
  g.add(rbox(W + 0.3, 0.14, Dp + 0.3, 0.06, '#E2E8F1'));                 // the base
  const walls = new THREE.Group(); walls.position.y = 0.14; g.add(walls);
  const wallMat = ownMat(PAL.walls[0]);
  const wall = (w, d, x, z) => { const m = rbox(w, Hh, d, 0.04, wallMat, { x, z }); walls.add(m); return m; };
  wall(W, T, 0, -Dp / 2 + T / 2); wall(T, Dp, -W / 2 + T / 2, 0); wall(T, Dp, W / 2 - T / 2, 0);
  // the front wall in three parts around the door
  const doorX = -0.35;
  wall(W / 2 + doorX - 0.45, T, (-W / 2 + doorX - 0.45) / 2 + 0.0, Dp / 2 - T / 2);
  wall(W / 2 - doorX - 0.45, T, (W / 2 + doorX + 0.45) / 2, Dp / 2 - T / 2);
  walls.add(rbox(0.9, Hh - 1.12, T, 0.03, wallMat, { x: doorX, y: 1.12, z: Dp / 2 - T / 2 }));
  const door = rbox(0.84, 1.1, 0.06, 0.03, PAL.door, { x: doorX, z: Dp / 2 + 0.01 });
  walls.add(door);
  // windows on the front and the sides (frames, panes that glow at night)
  const panes = [];
  const win = (x, z, rot) => {
    const w = new THREE.Group();
    w.add(rbox(0.8, 0.66, 0.06, 0.03, PAL.frame, { y: -0.33, cast: false }));
    const pm = ownMat(PAL.glass, { roughness: 0.4 });
    pm.userData.on = 1; panes.push(pm);
    w.add(rbox(0.66, 0.52, 0.05, 0.02, pm, { y: -0.26, z: 0.02, cast: false }));
    w.position.set(x, 1.45, z); w.rotation.y = rot;
    walls.add(w);
  };
  for (const x of [-2.6, -1.35, 1.0, 2.3]) win(x, Dp / 2 + 0.01, 0);
  win(-W / 2 - 0.01, -1.1, -Math.PI / 2); win(-W / 2 - 0.01, 1.1, -Math.PI / 2);
  win(W / 2 + 0.01, -1.1, Math.PI / 2); win(W / 2 + 0.01, 1.1, Math.PI / 2);
  // inside: two rows of three rooms either side of a hallway; shared baths at the hallway's ends
  const hall = 0.8, inW = W - 2 * T, inD = Dp - 2 * T;
  const rw = inW / 3, rd = (inD - hall) / 2;
  const rooms = [];
  const inner = new THREE.Group(); inner.position.y = 0.14; g.add(inner);
  const part = (w, d, x, z) => walls.add(rbox(w, Hh, d, 0.02, wallMat, { x, z }));
  const yFloor = 0.006;
  const order = [[0, -1], [1, -1], [2, -1], [0, 1], [1, 1], [2, 1]];   // rooms 1..6: back row, then front row
  order.forEach(([c, r], i) => {
    const x = -inW / 2 + rw * (c + 0.5), z = r * (hall / 2 + rd / 2);
    const fm = ownMat(PAL.woodRoom, { roughness: 0.75 });
    fm.userData.state = ''; fm.userData.k = 0;
    const floor = mesh(new THREE.PlaneGeometry(rw - 0.08, rd - 0.08), fm, { cast: false });
    floor.rotation.x = -Math.PI / 2; floor.position.set(x, yFloor, z);
    inner.add(floor);
    // a bed against the outer wall, a pillow and a blanket, a small rug, a desk
    const bz = z + r * (rd / 2 - 0.62), bx = x - rw / 2 + 0.62;
    const bed = new THREE.Group();
    bed.add(rbox(0.82, 0.26, 1.18, 0.06, '#C9B79C'));
    bed.add(rbox(0.78, 0.12, 1.12, 0.05, PAL.bed, { y: 0.24 }));
    bed.add(rbox(0.7, 0.07, 0.62, 0.04, ['#9FC6E0', '#B6D8C4', '#D9C7E8', '#E9D7B5', '#A9C3DA', '#F2C9B8'][i], { y: 0.34, z: 0.22 }));
    bed.add(rbox(0.5, 0.1, 0.22, 0.05, '#FFFFFF', { y: 0.34, z: -0.4 }));
    bed.position.set(bx, 0, bz); bed.rotation.y = r > 0 ? Math.PI : 0;
    inner.add(bed);
    if (i >= 2) inner.add(rbox(0.62, 0.42, 0.34, 0.03, PAL.wood, { x: x + rw / 2 - 0.5, z: z - r * (rd / 2 - 0.3) }));
    const rug = mesh(new THREE.CircleGeometry(0.42, 28), mat(['#DCE6F0', '#E8EFE6', '#EFE7F5', '#F3EBDD', '#E2ECF4', '#F4E6E0'][i]), { cast: false });
    rug.rotation.x = -Math.PI / 2; rug.position.set(x + 0.2, yFloor + 0.01, z + r * 0.05); inner.add(rug);
    // rooms 1 and 2 have their own bath: a tiled corner with a tub
    if (i < 2) {
      const bxx = x + rw / 2 - 0.55, bzz = z - r * (rd / 2 - 0.55);
      const tm = mesh(new THREE.PlaneGeometry(0.98, 0.98), mat(PAL.tile), { cast: false });
      tm.rotation.x = -Math.PI / 2; tm.position.set(bxx, yFloor + 0.005, bzz); inner.add(tm);
      inner.add(rbox(0.86, 0.3, 0.42, 0.12, PAL.tub, { x: bxx, z: bzz - r * 0.18 }));
      part(0.05, 1.0, bxx - 0.5, bzz);
    }
    rooms.push({ floor, fm, x, z, n: i + 1, bath: i < 2 ? 'private' : 'shared', row: r });
  });
  // partitions between rooms and along the hallway
  for (const r of [-1, 1]) {
    const zc = r * (hall / 2 + rd / 2);
    for (let c = 1; c < 3; c++) part(0.07, rd, -inW / 2 + rw * c, zc);
    part(inW, 0.07, 0, r * hall / 2);
  }
  // the shared baths at the hallway's two ends
  for (const s of [-1, 1]) {
    const x = s * (inW / 2 - 0.42);
    const tm = mesh(new THREE.PlaneGeometry(0.8, hall - 0.06), mat(PAL.tile), { cast: false });
    tm.rotation.x = -Math.PI / 2; tm.position.set(x, yFloor + 0.002, 0); inner.add(tm);
    inner.add(rbox(0.5, 0.36, 0.42, 0.1, PAL.tub, { x: x + s * 0.12, z: 0 }));
  }
  // the roof: two slopes, two gables and a ridge, in one group that lifts away
  const roof = new THREE.Group();
  const roofMat = ownMat('#4D5D82', { transparent: true, opacity: 1 });
  const gableMat = ownMat(PAL.walls[0], { transparent: true, opacity: 1 });
  const pitch = 0.5, over = 0.3, thick = 0.22;
  const roofH = (Dp / 2) * Math.tan(pitch);
  const slant = (Dp / 2 + over) / Math.cos(pitch);
  for (const side of [-1, 1]) {
    const p = rbox(W + over * 2, thick, slant, 0.08, roofMat);
    p.position.set(0, roofH / 2 - (over / 2) * Math.tan(pitch) + thick * 0.35 - thick / 2, side * (Dp / 4 + over / 2));
    p.rotation.x = side * pitch;
    roof.add(p);
  }
  const tri = new THREE.Shape();
  tri.moveTo(-Dp / 2 + 0.02, 0); tri.lineTo(Dp / 2 - 0.02, 0); tri.lineTo(0, roofH - 0.04); tri.closePath();
  for (const s of [-1, 1]) {
    const gm = mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.12, bevelEnabled: false }), gableMat);
    gm.rotation.y = Math.PI / 2; gm.position.set(s * (W / 2 - 0.08) - 0.06, 0, 0);
    roof.add(gm);
  }
  const ridge = rbox(W + over * 2 + 0.04, 0.18, 0.32, 0.08, roofMat, { y: roofH + thick * 0.2 - 0.09 });
  roof.add(ridge);
  const chim = rbox(0.42, 0.9, 0.42, 0.06, ownMat('#B9C6DC', { transparent: true, opacity: 1 }), { x: 2.1, y: roofH * 0.3, z: -0.9 });
  roof.add(chim);
  roof.position.y = 0.14 + Hh;
  g.add(roof);
  const roofMats = [roofMat, gableMat, chim.material];
  // a porch step and a path to the sidewalk
  g.add(rbox(1.3, 0.1, 0.5, 0.04, '#E9EEF3', { x: doorX, z: Dp / 2 + 0.35, cast: false }));

  // floors glow by state, after the shot set it (state, k); windows glow at night
  const cy = new THREE.Color('#5FD3EA'), wa = new THREE.Color('#FFD98A'), dk = new THREE.Color('#7D8597'), base = new THREE.Color(PAL.woodRoom);
  const glow = (n) => {
    for (const r of rooms) {
      const { state, k = 0 } = r.fm.userData;
      r.fm.color.copy(base); r.fm.emissive.set('#000000'); r.fm.emissiveIntensity = 0;
      if (state === 'cyan') { r.fm.color.copy(base).lerp(cy, k); r.fm.emissive.set('#00B4D8'); r.fm.emissiveIntensity = 0.85 * k; }
      if (state === 'warm') { r.fm.color.copy(base).lerp(wa, k); r.fm.emissive.set('#FFC865'); r.fm.emissiveIntensity = (0.35 + 0.7 * n) * k; }
      if (state === 'dark') { r.fm.color.copy(base).lerp(dk, k); }
    }
    for (const p of panes) { const on = p.userData.on ?? 1; p.emissive.set('#ffc865'); p.emissiveIntensity = n * on * 1.2; p.color.set(PAL.glass).lerp(new THREE.Color('#ffe3a3'), n * on); }
  };
  return { g, walls, roof, roofMats, rooms, inner, door, glow, W, D: Dp, Hh };
}

// A yard sign: a white For sale board and a navy Sold rider that can drop onto it.
function yardSign({ THREE, kit }) {
  const { rbox, cyl, ownMat } = kit;
  const g = new THREE.Group();
  g.add(cyl(0.05, 0.05, 1.7, '#FFFFFF', { x: -0.62, seg: 10 }));
  g.add(rbox(1.42, 0.07, 0.07, 0.02, '#FFFFFF', { y: 1.55 }));
  const board = new THREE.Group();
  board.position.set(0, 1.12, 0);
  board.add(rbox(1.2, 0.72, 0.06, 0.04, '#FFFFFF', { y: -0.36 }));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 0.64), new THREE.MeshStandardMaterial({ map: textTex(THREE, ['FOR SALE', ''], '#FFFFFF', '#03045E'), roughness: 0.6 }));
  face.position.set(0, -0.36, 0.032);
  board.add(face);
  g.add(board);
  const rider = new THREE.Group();
  rider.add(rbox(1.2, 0.34, 0.06, 0.04, '#03045E', { y: -0.17 }));
  const rf = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 0.3), new THREE.MeshStandardMaterial({ map: textTex(THREE, ['SOLD'], '#03045E', '#FFFFFF', 3.73), roughness: 0.6, emissive: '#ffffff', emissiveIntensity: 0.05 }));
  rf.position.set(0, -0.17, 0.032);
  rider.add(rf);
  rider.position.set(0, 1.12 + 0.36, 0.04);
  g.add(rider);
  return { g, board, rider };
}

function textTex(THREE, lines, bg, fg, aspect = 1.75) {
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = Math.round(1024 / aspect);
  const x = cv.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, cv.width, cv.height);
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `800 ${Math.round(cv.height * (lines.length > 1 ? 0.27 : 0.6))}px "Bricolage Grotesque", sans-serif`;
  x.fillText(lines[0], cv.width / 2, cv.height * (lines.length > 1 ? 0.44 : 0.54));
  if (lines[1]) { x.font = `600 ${Math.round(cv.height * 0.14)}px "Instrument Sans", sans-serif`; x.fillText(lines[1], cv.width / 2, cv.height * 0.74); }
  if (lines.length > 1 && !lines[1]) {
    // the For sale board: a cyan bar along its foot, the page's accent
    x.fillStyle = '#00B4D8'; x.fillRect(0, cv.height * 0.84, cv.width, cv.height * 0.16);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// A small car, nose to +z.
function car({ kit, body = '#FFFFFF', THREE }) {
  const { rbox, mesh, mat } = kit;
  const g = new THREE.Group();
  g.add(rbox(1.15, 0.5, 2.1, 0.18, body, { y: 0.22 }));
  g.add(rbox(1.0, 0.42, 1.1, 0.16, body, { y: 0.66, z: -0.12 }));
  g.add(rbox(1.02, 0.3, 1.02, 0.12, '#1B2A44', { y: 0.72, z: -0.12, cast: false }));
  g.wheels = [];
  for (const [sx, sz] of [[-1, 0.66], [1, 0.66], [-1, -0.66], [1, -0.66]]) {
    const w = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.16, 20), mat('#1B2335'));
    w.rotation.z = Math.PI / 2; w.position.set(sx * 0.52, 0.22, sz);
    g.add(w); g.wheels.push(w);
  }
  return g;
}

// The operator's desk at home, in the evening: floor, two walls, a window onto Lakeview's lights, the desk, a lamp,
// the laptop, a mug and a plant; the operator sits in the chair. Placed far from the town so their shadows never meet.
function deskSet({ S, THREE, kit, opLook }) {
  const { rbox, mesh, mat, ownMat, desk, chair, laptop, plant, mug, person, cyl, sphere } = kit;
  const g = new THREE.Group();
  g.position.set(300, 0, 0);
  S.scene.add(g);
  g.add(rbox(9, 0.2, 7, 0.06, '#E9DFD2', { y: -0.2 }));                              // floor
  g.add(rbox(9, 3.6, 0.2, 0.04, '#EEF2F8', { z: -3.4 }));                             // back wall
  g.add(rbox(0.2, 3.6, 7, 0.04, '#E6ECF5', { x: -4.4 }));                             // side wall
  // the window onto the town at dusk: a canvas painted once (it never changes)
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 640;
  const x = cv.getContext('2d');
  const sky = x.createLinearGradient(0, 0, 0, 640);
  sky.addColorStop(0, '#0A1466'); sky.addColorStop(0.55, '#2D50B7'); sky.addColorStop(1, '#83A8FF');
  x.fillStyle = sky; x.fillRect(0, 0, 1024, 640);
  const rr = rng(5);
  for (let i = 0; i < 26; i++) {               // rooftops and lit windows
    const bx = i * 42 - 20 + rr() * 10, bw = 36 + rr() * 30, bh = 90 + rr() * 140;
    x.fillStyle = '#081980'; x.fillRect(bx, 640 - bh, bw, bh);
    x.beginPath(); x.moveTo(bx - 4, 640 - bh); x.lineTo(bx + bw / 2, 640 - bh - 26); x.lineTo(bx + bw + 4, 640 - bh); x.fill();
    for (let k = 0; k < 3; k++) if (rr() > 0.35) { x.fillStyle = rr() > 0.5 ? '#FFD27A' : '#FFE3A3'; x.fillRect(bx + 6 + k * 11, 640 - bh + 24 + (k % 2) * 30, 8, 10); }
  }
  const wt = new THREE.CanvasTexture(cv); wt.colorSpace = THREE.SRGBColorSpace;
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.0), new THREE.MeshBasicMaterial({ map: wt }));
  pane.position.set(0.6, 2.05, -3.29); g.add(pane);
  g.add(rbox(3.4, 0.12, 0.12, 0.03, '#FFFFFF', { x: 0.6, y: 0.99, z: -3.26 }));
  g.add(rbox(3.4, 0.12, 0.12, 0.03, '#FFFFFF', { x: 0.6, y: 3.05, z: -3.26 }));
  g.add(rbox(0.12, 2.18, 0.12, 0.03, '#FFFFFF', { x: -1.04, y: 0.96, z: -3.26 }));
  g.add(rbox(0.12, 2.18, 0.12, 0.03, '#FFFFFF', { x: 2.24, y: 0.96, z: -3.26 }));
  g.add(rbox(0.08, 2.0, 0.1, 0.02, '#FFFFFF', { x: 0.6, y: 1.05, z: -3.25 }));
  const dk = desk({ w: 2.6, d: 1.1, top: '#E3CBA8', legs: '#8C97AA' }); dk.position.set(0.2, 0, -1.7); g.add(dk);
  const lap = laptop({ body: '#C9D2DE' }); lap.position.set(0.25, dk.top, -1.75); lap.rotation.y = 0; g.add(lap);
  const mg = mug({ color: '#FFFFFF' }); mg.position.set(-0.6, dk.top, -1.45); g.add(mg);
  const pl = plant({ s: 1.1 }); pl.position.set(1.25, dk.top, -2.0); g.add(pl);
  // a notebook and a pen
  g.add(rbox(0.42, 0.03, 0.32, 0.01, '#FFFFFF', { x: 0.95, y: dk.top, z: -1.35 }));
  g.add(rbox(0.3, 0.02, 0.025, 0.01, PAL.blue, { x: 0.95, y: dk.top + 0.035, z: -1.38 }));
  // the lamp: base, arm, shade and a bulb that glows; a warm pool on the desk
  const lamp = new THREE.Group();
  lamp.add(cyl(0.12, 0.14, 0.04, '#03045E', { seg: 20 }));
  const arm = rbox(0.035, 0.62, 0.035, 0.012, '#03045E', { y: 0.04 }); arm.rotation.z = 0.25; lamp.add(arm);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.2, 24, 1, true), mat('#03045E', { side: THREE.DoubleSide }));
  shade.position.set(-0.12, 0.66, 0.05); shade.rotation.z = -0.5; lamp.add(shade);
  const bulb = ownMat('#FFF3CF', { emissive: '#FFDF96', emissiveIntensity: 1.2 });
  lamp.add(sphere(0.06, bulb, { x: -0.1, y: 0.6, z: 0.05, detail: 12, cast: false }));
  lamp.position.set(-1.0, dk.top, -2.0);
  g.add(lamp);
  const poolMat = new THREE.MeshBasicMaterial({ color: '#FFD98A', transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(0.9, 40), poolMat);
  pool.rotation.x = -Math.PI / 2; pool.position.set(-0.7, dk.top + 0.006, -1.75); g.add(pool);
  // the chair and the operator in it
  const ch = chair({ color: '#03045E' }); ch.position.set(0.25, 0, -0.75); ch.rotation.y = Math.PI; g.add(ch);
  const op = person(opLook);
  op.position.set(0.25, ch.seat - 0.46, -0.82); op.rotation.y = Math.PI;
  g.add(op);
  const lapGlow = lap.screenMat;
  S.glows.push((n) => { lapGlow.emissiveIntensity = 0.35 + 0.65 * n; bulb.emissiveIntensity = 0.6 + 1.4 * n; poolMat.opacity = 0.1 + 0.32 * n; });
  return { g, desk: dk, lap, op, ox: 300 };
}
