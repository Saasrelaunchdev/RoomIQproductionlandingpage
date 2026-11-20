// The frame contract. Every frame of the film is a function of its time alone:
//
//   update(t) = restore the 3D world and the 2D layer exactly as built
//             -> rest(): everyone in their resting place
//             -> the shot that owns t sets what it shows
//             -> after(): state derived from what the shot set (glows, lights, sky), never before it
//             -> the stage applies its mood (light, night) and renders
//
// Why each step exists (each was a defect in an earlier film):
// - restore: a frame must not depend on what the browser drew before it (a parked van kept the wheel angle of the last
//   drive its browser drew; hidden cards kept their last place and changed how beams were drawn). The render shares
//   frames among browsers and re-draws a shuffled sample in a fresh one, byte for byte.
// - pools made up front (reserve) and sizes measured once (freeze): made lazily, they come out in a different order in
//   each browser.
// - after() and the stage's mood applied last: lights applied before the shot set them showed the previous state (the
//   scripted headlights never came on).
import { clamp, ease, prog } from './anim.js';

export function createFrame({ timings, config, stage = null, THREE = null }) {
  const W = config.width, H = config.height;
  const ov = document.getElementById('ov');
  const veil = document.getElementById('veil');
  const night = document.getElementById('bgn');
  const canvas = document.getElementById('gl');
  const beamsSvg = document.getElementById('beams');
  let frozen = false;

  // ------------------------------------------------------------------ narration timing
  const L = Object.fromEntries(timings.lines.map((l) => [l.id, l]));
  const need = (id) => { if (!L[id]) throw new Error(`no line ${id} in audio/timings.json`); return L[id]; };
  const s = (id) => need(id).start, e = (id) => need(id).end;
  const norm = (x) => x.toLowerCase().replace(/[^a-z0-9']/g, '');
  // when a word starts (the nth time it is said in the line); estimated from its place in the text without word timing
  function w(id, word, n = 0) {
    const l = need(id);
    if (l.words) { let c = 0; for (const x of l.words) if (norm(x.w) === norm(word) && c++ === n) return x.t; }
    const i = l.text.toLowerCase().indexOf(word.toLowerCase());
    if (i < 0) throw new Error(`"${word}" is not in line ${id}`);
    return l.start + (l.end - l.start) * (i / l.text.length);
  }

  // ------------------------------------------------------------------ the 2D layer
  const all = [];
  function mk(html, cls = '') {
    if (frozen) throw new Error('mk() after freeze(): make every overlay element while building the story');
    const d = document.createElement('div');
    d.className = 'o ' + cls;
    d.innerHTML = html;
    ov.appendChild(d);
    all.push(d);
    return d;
  }
  const measure = (el) => { el._w = el.offsetWidth; el._h = el.offsetHeight; };
  // show el this frame with its anchor point (ax, ay as fractions of its box) at (x, y). Elements not shown in a frame
  // are back to their built state (invisible) because the frame starts from it.
  function show(el, { o = 1, x = W / 2, y = H / 2, s = 1, r = 0, ax = 0.5, ay = 0.5, z, remeasure = false } = {}) {
    if (o <= 0.002) return;
    if (remeasure || el._w == null) measure(el);
    el.style.opacity = clamp(o).toFixed(3);
    el.style.transformOrigin = `${ax * 100}% ${ay * 100}%`;
    el.style.transform = `translate(${(x - ax * el._w).toFixed(1)}px,${(y - ay * el._h).toFixed(1)}px) scale(${s.toFixed(4)}) rotate(${r.toFixed(2)}deg)`;
    if (z != null) el.style.zIndex = z;
  }
  const pop = (t, a, d = 0.42) => ease.outBack(prog(t, a, a + d));
  const fade = (t, a, d = 0.35) => ease.out(prog(t, a, a + d));
  const gone = (t, a, d = 0.3) => 1 - ease.in(prog(t, a, a + d));

  // ------------------------------------------------------------------ 3D to screen
  let v3 = null;
  function proj(x, y, z, cam = stage && stage.camera, half = null) {
    if (!v3) v3 = new THREE.Vector3();
    v3.set(x, y, z).project(cam);
    if (half == null) return [((v3.x + 1) / 2) * W, ((1 - v3.y) / 2) * H];
    return [half * W / 2 + ((v3.x + 1) / 2) * (W / 2), ((1 - v3.y) / 2) * H];   // a half of a split screen
  }
  function projOf(obj, dy = 0, dx = 0, dz = 0, cam, half) {
    if (!v3) v3 = new THREE.Vector3();
    const p = new THREE.Vector3();
    obj.getWorldPosition(p);
    return proj(p.x + dx, p.y + dy, p.z + dz, cam, half);
  }
  function setCam(pos, tgt, fov = 26, cam = stage.camera) {
    cam.position.set(pos[0], pos[1], pos[2]);
    cam.fov = fov;
    cam.updateProjectionMatrix();
    cam.lookAt(tgt[0], tgt[1], tgt[2]);
    cam.updateMatrixWorld();
  }

  // ------------------------------------------------------------------ pools: made once, before freeze()
  const beamPool = [], glowPool = [], ringPool = [];
  let beamN = 0, glowN = 0, ringN = 0;
  function reserve({ beams = 12, glows = 12, rings = 9 } = {}) {
    for (let i = 0; i < beams; i++) {
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('pathLength', '1');
      p.setAttribute('stroke-dasharray', '1');
      p.style.display = 'none';
      beamsSvg.appendChild(p);
      beamPool.push(p);
    }
    for (let i = 0; i < glows; i++) glowPool.push(mk('', 'glow'));
    for (let i = 0; i < rings; i++) ringPool.push(mk('', 'ring'));
  }
  // an arc from screen point a to b, drawn from a as k goes 0..1
  function beam(a, b, k, { o = 1, lift = 0.3, cls = '' } = {}) {
    if (k <= 0 || o <= 0) return;
    const p = beamPool[beamN++];
    if (!p) throw new Error('more beams in one frame than reserve() made');
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 - Math.hypot(b[0] - a[0], b[1] - a[1]) * lift;
    p.setAttribute('d', `M${a[0].toFixed(1)} ${a[1].toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`);
    p.setAttribute('stroke-dashoffset', (1 - clamp(k)).toFixed(4));
    p.setAttribute('class', cls);
    p.style.opacity = o;
    p.style.display = '';
  }
  // a glowing dot where a beam lands
  function glow(x, y, k) {
    if (k <= 0) return;
    const g = glowPool[glowN++];
    if (!g) throw new Error('more glows in one frame than reserve() made');
    show(g, { x, y, o: clamp(k), s: 0.4 + 0.6 * ease.outBack(clamp(k)) });
  }
  // rings spreading from a point between a and b (a phone ringing, something arriving)
  function rings(x, y, t, a, b, color = 'var(--brand)', every = 0.55) {
    if (t < a || t > b) return;
    for (let i = 0; i < 3; i++) {
      const ph = (t - a) / every - i / 3;
      if (ph < 0) continue;
      const k = ph % 1;
      const r = ringPool[ringN++];
      if (!r) throw new Error('more rings in one frame than reserve() made');
      r.style.color = color;
      show(r, { x, y, s: 0.2 + k * 0.85, o: (1 - k) * 0.9 * fade(t, a, 0.2) * gone(t, b - 0.25, 0.25) });
    }
  }

  // the veil (a full-frame colour for dips and for the statistics' canvas) and the night sky behind the 3D
  function veilTo(o, color = 'var(--canvas)') { veil.style.background = color; veil.style.opacity = clamp(o).toFixed(3); }
  function sky(n) { night.style.opacity = clamp(n).toFixed(3); }
  function blur3d(px, dim = 0) { canvas.style.filter = px || dim ? `blur(${px.toFixed(1)}px) brightness(${(1 - dim).toFixed(3)})` : ''; }

  // ------------------------------------------------------------------ shots
  const shots = [], rests = [], afters = [];
  const shot = (t0, name, fn) => { shots.push({ t0, name, fn }); shots.sort((a, b) => a.t0 - b.t0); };
  const rest = (fn) => rests.push(fn);
  const after = (fn) => afters.push(fn);

  // ------------------------------------------------------------------ as built
  let restore = () => {};
  function freeze() {
    for (const el of all) measure(el);
    const objects = [], lights = [], looks = new Map(), nodes = [];
    if (stage) {
      stage.scene.traverse((o) => {
        objects.push([o, o.position.clone(), o.rotation.clone(), o.scale.clone(), o.visible, { ...o.userData }]);
        if (o.isLight) lights.push([o, o.intensity, o.color.clone(), o.groundColor ? o.groundColor.clone() : null]);
        for (const m of [].concat(o.material || [])) {
          if (!looks.has(m)) looks.set(m, [m.color ? m.color.clone() : null, m.emissive ? m.emissive.clone() : null, m.emissiveIntensity, m.opacity, m.visible, { ...m.userData }]);
        }
      });
    }
    (function walk(n) {
      if (n.nodeType !== Node.ELEMENT_NODE) { nodes.push([n, n.nodeValue]); return; }
      nodes.push([n, [...n.attributes].map((a) => [a.name, a.value]), [...n.childNodes]]);
      n.childNodes.forEach(walk);
    })(ov);
    const same = (data, was) => { for (const k in data) if (!(k in was)) delete data[k]; Object.assign(data, was); };
    restore = () => {
      for (const [o, p, r, sc, v, ud] of objects) { o.position.copy(p); o.rotation.copy(r); o.scale.copy(sc); o.visible = v; same(o.userData, ud); }
      for (const [l, i, c, g] of lights) { l.intensity = i; l.color.copy(c); if (g) l.groundColor.copy(g); }
      for (const [m, [c, em, ei, op, vis, ud]] of looks) {
        if (c) m.color.copy(c);
        if (em) m.emissive.copy(em);
        if (ei !== undefined) m.emissiveIntensity = ei;
        m.opacity = op; m.visible = vis;
        same(m.userData, ud);
      }
      for (const [n, was, kids] of nodes) {
        if (!kids) { if (n.nodeValue !== was) n.nodeValue = was; continue; }
        if (n.attributes.length !== was.length || was.some(([k, v]) => n.getAttribute(k) !== v)) {
          for (const { name } of [...n.attributes]) if (!was.some(([k]) => k === name)) n.removeAttribute(name);
          for (const [k, v] of was) if (n.getAttribute(k) !== v) n.setAttribute(k, v);
        }
        const now = n.childNodes;
        if (now.length !== kids.length || kids.some((c, i) => now[i] !== c)) n.replaceChildren(...kids);
      }
      for (const el of [veil, night, canvas]) el.removeAttribute('style');
    };
    frozen = true;
  }

  function update(t) {
    if (!frozen) throw new Error('freeze() before the first update');
    restore();
    beamN = 0; glowN = 0; ringN = 0;
    if (stage) stage.reset();
    for (const fn of rests) fn(t);
    let cur = shots[0];
    for (const sh of shots) if (t >= sh.t0) cur = sh;
    if (cur) cur.fn(t);
    for (const fn of afters) fn(t);
    // a fully opaque veil hides the 3D layer: it is not drawn under it (the picture is the same, the frame is faster)
    if (stage) { stage.apply(); if (!(+veil.style.opacity >= 0.999)) stage.render(); }
    return cur ? cur.name : '';
  }

  return {
    W, H, L, s, e, w, ov, veil, canvas, mk, show, measure, pop, fade, gone, proj, projOf, setCam,
    reserve, beam, glow, rings, veilTo, sky, blur3d, shot, rest, after, freeze, update,
    shots: () => shots.map((x) => [x.t0, x.name]), stage,
  };
}
