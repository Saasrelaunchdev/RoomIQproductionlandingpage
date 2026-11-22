// RoomIQ, "See the investment inside the house": the film shot by shot, built from brief.md and beats.md.
//
// The contract (src/frame.js): everything is built here once (the world in world.js, every overlay element, the
// pools); then each shot sets, from t alone, what it shows. No state is kept between frames, nothing is created in a
// shot, and lights, glows and mood are set in the shot and applied after it.
//
// Colour meanings follow the page: cyan is evidence (observed, counted, labelled), amber is the number nobody has
// checked, warm window light is an occupied room. Rooms glow cyan when RoomIQ shows them, never "full": no outcome is
// shown or claimed. Every house, market and figure is the page's made-up sample (1207 Greenway Drive, Lakeview).
import { keys, ease, prog, lerp, inOut, clamp, along } from './anim.js';
import { buildWorld, PAL } from './world.js';

const USE = (id) => `<svg class="ic" aria-hidden="true"><use href="#${id}"/></svg>`;
const SVG = {
  send: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>',
  bed: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/></svg>',
  bath: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1-.5C4.68 3 4 3.68 4 4.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><path d="M2 12h20M7 19v2M17 19v2"/></svg>',
  alert: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M12 8v4M12 16h.01"/></svg>',
  rewind: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
  pin: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
  cursor: '<svg viewBox="0 0 44 56" aria-hidden="true"><path d="M4 3 L4 45 L15 35 L23 53 L31 49 L23 32 L38 31 Z" fill="#fff" stroke="#03045E" stroke-width="3" stroke-linejoin="round"/></svg>',
};
const money = (v) => '$' + Math.round(v).toLocaleString('en-US');
const MEDIA = '/site/media/';

export async function build({ F, S, THREE, kit, config }) {
  const { s, e, w, mk, show, pop, fade, gone } = F;
  const { pose, brandTile } = kit;
  const W = F.W, Hh = F.H;
  const world = buildWorld({ S, THREE, kit });
  const { town, HOUSE, RING, mine, coliving, H, sign, op, renters, extra, cars, D, houses } = world;
  const OP = D.op;                      // the operator at her desk (the town has its own: op)
  const hx = HOUSE[0], hz = HOUSE[1];

  // the RoomIQ mark as a 3D tile: the logo's cyan rounded square
  const tile = brandTile({ size: 1.5, plinth: false, side: '#009FBF', paint: (x, n) => {
    const gr = x.createLinearGradient(0, 0, n, n);
    gr.addColorStop(0, '#2CC6E4'); gr.addColorStop(1, '#00A6C9');
    x.fillStyle = gr; x.fillRect(0, 0, n, n);
  } });
  tile.visible = false;
  town.add(tile);

  // ------------------------------------------------------------------ the 2D layer, made once
  const addr = mk(`<span class="pill cy">${USE('i-home')}<b>1207 Greenway Drive</b><span class="sub">· 6 bedrooms · 4 baths</span></span>`);
  const madeUp = mk(`<span class="note" style="padding:8px 18px;border-radius:999px;background:rgba(255,255,255,.86)">A made-up house in a made-up market</span>`);

  // the napkin: lost (borrowed numbers) and won (the same rows with their evidence). Same size, same rows.
  const napL = mk(`<div class="nap">
    <div class="kick">The napkin math</div>
    <h3>What could the house earn by the room?</h3>
    <div class="fx"><span class="t1">6 rooms</span><span class="t2 x">×</span><span class="t3 q">$200/wk</span><span class="t4 x">×</span><span class="t5 q">90%</span><span class="t6 x">× 4.35 weeks</span><span class="t7 ok" style="margin-left:auto;color:#0B7A57">${USE('i-check')}</span></div>
    <div class="res"><b class="num">$4,698</b><small>a month</small></div>
    <div class="rows">
      <div class="nr r1"><span class="k">Rent per room</span><span class="v q">$200/wk</span><span class="e"><span class="tag borrowed">you picked it</span><span class="ghost" style="flex:1"></span></span></div>
      <div class="nr r2"><span class="k">Occupancy</span><span class="v q">90%</span><span class="e"><span class="tag borrowed">a guess</span><span class="ghost" style="flex:1"></span></span></div>
      <div class="nr r3"><span class="k">Supply nearby</span><span class="v q">?</span><span class="e"><span class="tag">never counted</span><span class="ghost" style="flex:1"></span></span></div>
      <div class="nr r4"><span class="k">Confidence</span><span class="v q">?</span><span class="e"><span class="tag">never shown</span><span class="ghost" style="flex:1"></span></span></div>
    </div>
    <div class="foot"><span class="send">${SVG.send}Send offer</span></div>
  </div>`);
  // the same card after the turn: the page's own ledger, the napkin's numbers struck, RoomIQ's evidence beside each
  const napW = mk(`<div class="nap">
    <div class="kick brand"><svg viewBox="0 0 136 30" aria-hidden="true"><use href="#logo-h"/></svg>The RoomIQ version</div>
    <h3>What could the house earn by the room?</h3>
    <div class="fx"><span class="on">6 rooms</span><span class="on x">×</span><span class="on">rent</span><span class="on x">×</span><span class="on">occupancy</span><span class="on x">× 4.35 weeks</span><span class="on" style="margin-left:auto;color:#0B7A57">${USE('i-check')}</span></div>
    <div class="res endrow"><span class="end">Same formula. Four inputs you can check.</span></div>
    <div class="rows">
      <div class="nr r1"><span class="k">Rent per room</span><span class="v struck">$200/wk</span><span class="e">${USE('i-check')}<span>By bath type and size, from observed rooms nearby</span></span></div>
      <div class="nr r2"><span class="k">Occupancy</span><span class="v struck">90%</span><span class="e">${USE('i-check')}<span>Observed in comparable rooms, with fill times</span></span></div>
      <div class="nr r3"><span class="k">Supply nearby</span><span class="v struck">?</span><span class="e">${USE('i-check')}<span>Counted and mapped within about 3 miles</span></span></div>
      <div class="nr r4"><span class="k">Confidence</span><span class="v struck">?</span><span class="e">${USE('i-check')}<span>Labeled, with the comps and their distance</span></span></div>
    </div>
    <div class="foot"><span class="end" style="font-size:34px;color:var(--ink2)">Every number with its evidence</span><span class="send">${SVG.send}Send offer</span></div>
  </div>`);
  // the deal, on the real Deal Calculator, with the page's own words for it
  const dealCard = mk(`<div class="dealcard"><div class="t"><b>5</b><span>Carry it into the deal</span></div><p>Cash flow, cash-on-cash, DSCR and cap rate under your own assumptions.</p><small>Informational only. Not financial or lending advice.</small></div>`);
  const cursor = mk(`<div class="cursor">${SVG.cursor}</div>`);
  const tapEl = mk('', 'tap');
  const sentL = mk(`<span class="pill am big">${SVG.send}Offer sent<span class="sub" style="color:var(--signalText)">· on two guesses</span></span>`);
  const sentW = mk(`<span class="pill cy big">${SVG.send}Offer sent<span class="sub">· with its evidence</span></span>`);
  const supplyQ = mk(`<span class="pill am big">${USE('i-home')}Supply nearby?</span>`);
  const sold = mk(`<span class="pill navy big">${USE('i-check')}The house is yours</span>`);
  const vac = [0, 1].map(() => mk(`<span class="rc vac">${SVG.bed}<span>Vacant · week <b class="num">1</b></span></span>`));
  const countL = mk(`<span class="count am"><b class="num">0</b><span>houses renting rooms<small>within about 3 miles</small></span></span>`);
  const countR = mk(`<span class="count cy"><b class="num">0</b><span>houses renting rooms<small>within about 3 miles, mapped</small></span></span>`);
  const pins = coliving.map(() => mk('', 'pin'));
  const roomChips = H.rooms.map((r, i) => mk(i < 2 ? `<span class="rc pv">${SVG.bath}Private bath</span>`
    : i < 5 ? `<span class="rc">${SVG.bath}Shared bath</span>` : `<span class="rc vac">${SVG.alert}Room 6 not entered</span>`));
  const before = mk(`<span class="pill navy big">${SVG.rewind}Before the offer</span>`);
  const wm = mk(`<div class="wm"><span style="font:800 104px/1 var(--f-d);letter-spacing:-.02em;color:var(--ink)">RoomIQ</span></div>`);

  // the cost: the page's napkin what-if
  const cost = mk(`<div class="cost">
    <div class="q">If rooms fill <em>75%</em> of the time, not 90%</div>
    <div class="bar b1"><span class="l">Your plan<b>at 90%</b></span><span class="t"><span class="f num" style="width:100%">$4,698</span></span></div>
    <div class="bar b2"><span class="l">The house<b>at 75%</b></span><span class="t"><span class="f am num" style="width:83.33%">$3,915</span><span class="gap" style="left:83.33%;width:16.67%"></span></span></div>
    <div class="off"><b class="num">$783</b><span>a month off your plan</span></div>
    <div class="src">Illustrative arithmetic on a made-up house: 6 rooms × $200 a week × 4.35 weeks a month.</div>
  </div>`);
  const costOff = cost.querySelector('.off b');

  // the product, on REAL screens of the RoomIQ web app (the page's own, cleaned for public use), each cropped to what the
  // line names and captioned the way the page captions real screens. No demo figure is ever typed onto a real screen.
  const REAL = 'Real screen · RoomIQ web app · Nov 2026', HID = ' · personal details hidden';
  const real = (file, { w = 1300, ar, top = 0, cap = REAL, extra = '' }) => mk(`<div class="real" style="width:${w}px"><div class="scr" style="aspect-ratio:${ar}"><img src="${MEDIA}${file}" alt="" style="top:${top}%">${extra}</div><div class="proof">${cap}</div></div>`);
  // the Predictor's first step, cropped to the steps and the address field (the address itself is hidden)
  const r11 = real('real11-screen-1920.webp', { ar: '1920/730', cap: REAL + HID, extra: '<div class="hl addr" style="left:20%;top:89%;width:76.5%;height:8.5%"></div>' });
  // the baseline profile: the bathroom mix
  const r12 = real('real12-screen-779.webp', { w: 860, ar: '779/590', cap: REAL + HID, extra: '<div class="hl bath" style="left:3.6%;top:53%;width:93%;height:44%"></div>' });
  // the Analyzer's room segments: rent and 90-day occupancy by bath and size
  const r07 = real('real07-screen-1500.webp', { ar: '1500/470', extra: '<div class="hl seg" style="left:4%;top:2%;width:73.5%;height:22%"></div><div class="hl seg2" style="left:4%;top:38%;width:73.5%;height:55%"></div>' });
  // the forecast, cropped to its result card: the labels, the revenue, the formula, the comps
  const r14 = real('real14-screen-1920.webp', { ar: '1920/653' });
  // the Deal Calculator, whole: its scenarios light on "test the deal", its purchase price and closing costs on "your own costs"
  const r15 = real('real15-screen-1920.webp', { ar: '1920/1094', extra: '<div class="hl scn" style="left:39.6%;top:23.4%;width:21.6%;height:6.7%"></div><div class="hl buy" style="left:5.1%;top:73.9%;width:27.7%;height:6.5%"></div><div class="hl cls" style="left:33.2%;top:89.4%;width:27.7%;height:6.5%"></div>' });
  const hsp = (n, label, cls = '') => mk(`<div class="hs2 ${cls}"><span class="n">${n}</span><span class="ln"></span><span class="lb">${label}</span></div>`);
  const hs = [hsp(1, 'The formula, printed'), hsp(2, 'Comps and their distance'), hsp(3, 'Support and confidence')];
  const thin = mk(`<div class="thinlift"><div class="chips"><span class="chip fb">Fallback support</span><span class="chip lo">Confidence Low</span></div>
    <p>The local evidence was sparse, so RoomIQ used <b>fallback market support</b>. Median comp distance: <b>82.88 mi</b>.</p></div>`);

  // the brand: the logo in the corner, and the journey through the product
  const logoBug = mk(`<div class="bug"><svg viewBox="0 0 136 30" aria-hidden="true"><use href="#logo-h"/></svg></div>`);
  const rail = mk(`<div class="rail">
    ${['Address', 'Rooms and baths', 'Comparable rooms', 'The estimate', 'The deal'].map((x, i) => `${i ? '<span class="sep"></span>' : ''}<span class="st"><b>${i + 1}</b>${x}</span>`).join('')}</div>`);
  const railSteps = [...rail.querySelectorAll('.st')];
  // the turn: from guesswork to a defensible offer
  const turnTitle = mk(`<div class="tt">From <em>guesswork</em> to <b>a defensible offer</b>.</div>`);
  const wipe = mk('', 'wipe');

  // the close: the page's hero, rebuilt at film size
  const heroHead = mk(`<div class="herohead"><div class="eb">For co-living operators and investors</div>
    <h2>See the investment inside the house.</h2>
    <p>Room rents, how fast rooms fill and nearby supply for one address, each with its evidence.</p>
    <span class="btn">Run a free forecast${USE('i-arrow')}</span><div class="small">Free plan. No card needed. Three forecasts a month.</div></div>`);
  const heroH2 = heroHead.querySelector('h2'), heroP = heroHead.querySelector('p'), heroBtn = heroHead.querySelector('.btn'), heroEb = heroHead.querySelector('.eb');
  const heroWeb = mk(`<div class="slab" style="width:1020px"><div class="scr"><img src="${MEDIA}forecast-screen-1920.webp" alt="" style="filter:blur(.6px) saturate(.9)"><div class="wash" style="background:rgba(255,255,255,.24)"></div></div></div>`);
  const heroSide = mk(`<div class="slab" style="width:470px"><div class="scr" style="aspect-ratio:960/617;border-radius:18px"><img src="${MEDIA}location-supply-960.webp" alt=""></div></div>`);
  const heroLift = mk(`<div class="lift" style="width:560px;padding:26px 30px 28px;border-radius:22px">
    <div class="chips" style="gap:10px;margin-bottom:12px"><span class="chip ok" style="font-size:20px;padding:8px 14px">Local support</span><span class="chip" style="font-size:20px;padding:8px 14px">Confidence Medium</span></div>
    <div class="k" style="font-size:17px">Monthly revenue</div>
    <div class="big" style="margin:6px 0 4px"><b class="num" style="font-size:96px">$5,057</b><span style="font-size:36px">/mo</span></div>
    <div class="fml" style="font-size:22px">Price x rooms x occupancy x 4.35 weeks = <b>$5,057</b></div></div>`);
  const heroProof = mk(`<div class="proof" style="margin:0">Product preview · demo data · web app · the operator</div>`);
  const drifts = ['$200/wk?', '90%?', 'Supply?'].map((t) => mk(`<span class="drift">${t}</span>`));
  const logoTop = mk(`<div class="logo"><svg viewBox="0 0 136 30" style="height:64px;width:290px"><use href="#logo-h"/></svg></div>`);
  const fine2 = mk(`<div class="fine">Every house, market and figure in this film is made up. Product previews use demo data.</div>`);

  F.reserve({ beams: 6, glows: 2, rings: 3 });
  // the three-mile ring: a dashed line and a soft fill, drawn from projected points every frame
  const svg = document.getElementById('beams');
  const ringFill = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  ringFill.setAttribute('class', 'ringfill'); ringFill.style.display = 'none'; svg.insertBefore(ringFill, svg.firstChild);
  const ringLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  ringLine.setAttribute('class', 'ring'); ringLine.style.display = 'none'; svg.appendChild(ringLine);

  // every picture must be decoded before the first frame (a frame must not depend on load timing)
  await Promise.all([...F.ov.querySelectorAll('img')].map((i) => i.decode().catch(() => { throw new Error('image failed: ' + i.src); })));

  // child offsets measured once, unscaled, for anchoring the pointer on a button
  const at = (card, sel) => { const c = card.querySelector(sel); let x = c.offsetWidth / 2, y = c.offsetHeight / 2, n = c;
    while (n && n !== card) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; } return [x, y]; };
  const btnL = at(napL, '.send'), btnW = at(napW, '.send');
  // the two napkin cards line up row for row, so the turn can wipe one into the other
  napW.querySelector('.res').style.height = napL.querySelector('.res').offsetHeight + 'px';

  // ------------------------------------------------------------------ helpers used by the shots
  const T = (id, word, n) => w(id, word, n);
  // place an element with a 3D tilt about its anchor (perspective on the element itself, no 3D children)
  function tilt(el, { x, y, s: sc = 1, o = 1, rx = 0, ry = 0, rz = 0, ax = 0.5, ay = 0.5, persp = 2600, z }) {
    if (o <= 0.002) return;
    show(el, { x, y, s: sc, o, ax, ay, z });
    el.style.transform = `translate(${(x - ax * el._w).toFixed(1)}px,${(y - ay * el._h).toFixed(1)}px) perspective(${persp}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg) scale(${sc.toFixed(4)})`;
  }
  // a point inside an element shown with show(): its offset (ox, oy) from the element's top-left
  const inside = (el, { x, y, s: sc = 1, ax = 0.5, ay = 0.5 }, [ox, oy]) => [x + (ox - ax * el._w) * sc, y + (oy - ay * el._h) * sc];
  const house3 = (h, dy = 2.6) => F.projOf(h.g, dy);
  const roomPt = (r, dy = 0.9) => F.proj(hx + r.x, dy, hz + r.z);
  function ring(k, { cls = 'ring am', fill = 0, R = RING } = {}) {
    if (k <= 0) return;
    const n = 96, pts = [];
    for (let i = 0; i <= Math.round(n * clamp(k)); i++) {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
      pts.push(F.proj(hx + Math.cos(a) * R, 0.06, hz + Math.sin(a) * R));
    }
    if (pts.length < 2) return;
    const d = 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
    ringLine.setAttribute('d', d); ringLine.setAttribute('class', cls); ringLine.style.display = '';
    if (fill > 0) { ringFill.setAttribute('d', d + ' Z'); ringFill.style.opacity = fill; ringFill.style.display = ''; }
  }
  // the house opens: the roof lifts and fades, the walls step down to show the rooms
  function openHouse(k, cut = 0) {
    const a = ease.inOut(clamp(k));
    H.roof.position.y = 0.14 + H.Hh + a * 3.2;
    H.roof.rotation.x = -a * 0.12;
    for (const m of H.roofMats) m.opacity = 1 - 0.92 * a;
    H.roof.visible = a < 0.995;
    H.walls.scale.y = 1 - 0.58 * ease.inOut(clamp(cut));
  }
  const room = (i, state, k) => { H.rooms[i].fm.userData.state = state; H.rooms[i].fm.userData.k = clamp(k); };
  // a renter walking from a to b (polyline of [x, z]) between t0 and t1
  function walkP(p, pts, t, t0, t1, speed = 1.6) {
    const k = prog(t, t0, t1);
    const [x, z, hd] = along(pts, k);
    p.position.set(x, 0, z); p.rotation.y = hd;
    pose(p, { walk: (t - t0) * speed, walking: k > 0 && k < 1 ? 1 : 0 });
  }
  // the journey rail: the step on screen in cyan, the steps before it checked
  function railShow(step, o) {
    if (o <= 0.002) return;
    railSteps.forEach((el, i) => { el.className = 'st' + (i < step ? ' done' : i === step ? ' on' : ''); });
    show(rail, { x: W - 40, y: 34, ax: 1, ay: 0, o, z: 35 });
  }
  // a point (px, py in percent of the image) on a flat real screen shown with show() at (x, y), scale sc, centred
  const onReal = (el, { x, y, s: sc = 1 }, px, py) => {
    const scr = el.querySelector('.scr'), w0 = el._w, h0 = el._h;
    return [x - 0.5 * w0 * sc + (px / 100) * scr.offsetWidth * sc, y - 0.5 * h0 * sc + (py / 100) * scr.offsetHeight * sc];
  };
  // houses of the seventeen, in the order they are counted (nearest first)
  const pinAt = (i) => house3(coliving[i], 3.0);

  // ------------------------------------------------------------------ every frame starts here
  F.rest((t) => {
    S.setMood(0, [hx, 0, hz], 34);
    pose(op, {}); op.visible = false;
    for (const p of [...renters, ...extra]) { p.visible = false; pose(p, {}); }
    pose(OP, { sit: 1 });
    openHouse(0, 0);
    for (let i = 0; i < 6; i++) room(i, '', 0);
    sign.rider.visible = false;
    // the cars drive Greenway Drive, all the time
    cars.forEach((c, i) => {
      const len = 80, x = ((t * (i ? -3.2 : 2.6) + (i ? 16.9 : 50)) % len + len) % len - len / 2;
      c.position.set(x, 0, 3.2 + (i ? -0.65 : 0.65)); c.rotation.y = i ? -Math.PI / 2 : Math.PI / 2;
      for (const wh of c.wheels) wh.rotation.x = t * 6;
    });
    for (const h of houses) for (const m of h.g.windows) m.userData.on = 1;
  });

  // ================================================================== 1. You run a few houses by the room, and you run them well.
  const myH = mine[mine.length - 1];
  F.shot(0, 'lakeview', (t) => {
    S.setMood(0, [myH.x + 6, 0, -2], 30);
    const t1 = s('A2') - 0.25;
    F.setCam(keys(t, [[0, [myH.x + 20, 26, 40]], [t1, [myH.x + 6.5, 5.4, 13.5], 'inOut']]),
      keys(t, [[0, [myH.x + 6, 0, -2]], [t1, [myH.x + 0.2, 1.2, 0.4], 'inOut']]), 26);
    // the operator at her front door with a new lamp; a renter comes out and waves
    op.visible = true;
    op.position.set(myH.x + 0.9, 0, myH.z + 2.3); op.rotation.y = -0.5;
    pose(op, { arms: 0.35, bob: Math.sin(t * 2) * 0.004 });
    const r0 = renters[0];
    r0.visible = true;
    walkP(r0, [[myH.x - 0.3, myH.z + 1.5], [myH.x - 1.3, myH.z + 2.2], [myH.x - 2.6, myH.z + 2.25]], t, 2.0, 4.5);
    if (t > 4.5) { r0.rotation.y = 0.9; pose(r0, { wave: inOut(t, 4.55, 9, 0.35, 0.3), t }); }
  });

  // ================================================================== 2. Now you've found the next one, a six-bedroom house near the greenway.
  F.shot(s('A2') - 0.25, 'next-house', (t) => {
    const a = s('A2') - 0.25, b = s('B1') - 0.6;
    S.setMood(0, [hx - 4, 0, hz], 26);
    const arrive = T('A2', 'next') + 0.15;
    F.setCam(keys(t, [[a, [myH.x + 9, 5.4, 13.5]], [arrive, [hx + 7.2, 7.4, 18.6], 'inOut'], [b, [hx + 6.5, 7.8, 19.5]]]),
      keys(t, [[a, [myH.x + 6, 1.2, 0.4]], [arrive, [hx + 1.4, 2.2, hz + 0.6], 'inOut'], [b, [hx + 1.0, 2.3, hz + 0.6]]]), 26);
    op.visible = true;
    op.position.set(hx + 1.6, 0, 1.55); op.rotation.y = Math.PI + 0.25;
    pose(op, { lookY: 0.1 });
    const at = T('A2', 'next') + 0.1;
    const [px, py] = F.projOf(H.g, 4.6);
    show(addr, { x: px, y: py - 30, ay: 1, o: fade(t, at), s: pop(t, at) });
    show(madeUp, { x: px, y: py + 26, ay: 0, o: fade(t, at + 0.6) * 0.95 });
  });

  // ================================================================== 3. The napkin: rooms, times weekly rent, times occupancy
  const deskCam = (t, k = 0) => F.setCam([D.ox + lerp(1.9, 1.6, k), lerp(2.35, 2.2, k), lerp(1.55, 1.2, k)], [D.ox + 0.15, 1.05, -1.75], 30);
  function napkin(t, { o = 1, y = 140, sc = 1, terms = 6, res = 1, rows = 0, tags = [1, 1, 1, 1], ghost = 0, glowNums = 0, fxOk = 0, send = 0 }) {
    for (let i = 1; i <= 6; i++) napL.querySelector('.t' + i).classList.toggle('on', i <= terms);
    napL.querySelector('.t7').style.opacity = fxOk.toFixed(3);
    const rs = napL.querySelector('.res'); rs.style.opacity = res.toFixed(3); if (res <= 0.001) rs.style.display = 'none';
    napL.querySelector('.rows').style.display = rows > 0.001 ? '' : 'none';
    napL.querySelectorAll('.nr').forEach((r, i) => {
      r.style.opacity = clamp(rows - i).toFixed(3);
      if (rows - i <= 0.001) r.style.display = 'none';
      const tg = r.querySelector('.tag'); tg.style.opacity = clamp(tags[i]).toFixed(3);
      r.querySelector('.ghost').style.opacity = clamp(ghost - i * 0.25).toFixed(3);
      if (i < 2 && glowNums > 0) r.querySelector('.v').style.textShadow = `0 0 ${(18 * glowNums).toFixed(1)}px rgba(242,180,66,${(0.9 * glowNums).toFixed(3)})`;
    });
    const ft = napL.querySelector('.foot'); ft.style.opacity = send.toFixed(3); if (send <= 0.001) ft.style.display = 'none';
    show(napL, { x: W / 2, y, o, s: sc, ay: 0 });
    return { x: W / 2, y, s: sc, ay: 0 };
  }
  F.shot(s('B1') - 0.6, 'napkin', (t) => {
    const a = s('B1') - 0.6;
    S.setMood(0.55, [D.ox, 0, -1.5], 6);
    F.sky(0.55);
    deskCam(t, prog(t, a, a + 6));
    pose(OP, { sit: 1, type: 1, t });
    const ins = ease.inOut(prog(t, s('B1') + 0.2, s('B1') + 1.0));
    F.blur3d(6 * ins, 0.25 * ins);
    const terms = (t > T('B1', 'rooms') - 0.1) + (t > T('B1', 'weekly') - 0.2) * 2 + (t > T('B1', 'occupancy') - 0.15) * 2 + (t > T('B1', 'occupancy') + 0.35);
    napkin(t, {
      o: ins, y: 150, sc: lerp(0.94, 1, ins), terms, res: fade(t, T('B1', 'occupancy') + 0.5),
      fxOk: fade(t, T('B2', 'formula') - 0.1),
      rows: fade(t, T('B2', 'picked') - 0.25, 0.3) + fade(t, T('B2', 'ninety') - 0.15, 0.3) + fade(t, T('B3', 'counted') - 0.2, 0.3) + fade(t, T('B3', 'counted') + 0.5, 0.3),
      tags: [fade(t, T('B2', 'picked')), fade(t, T('B2', 'guess') - 0.1), fade(t, T('B3', 'counted') + 0.1), fade(t, T('B3', 'counted') + 0.6)],
    });
  });

  // ================================================================== 4. And nobody has counted the other houses renting rooms nearby.
  F.shot(T('B3', 'counted') + 1.2, 'dusk-town', (t) => {
    const a = T('B3', 'counted') + 1.2, b = s('C1') - 0.4;
    S.setMood(0.72, [hx, 0, hz - 4], 40);
    F.sky(0.72);
    F.setCam(keys(t, [[a, [hx + 24, 30, 40]], [b, [hx + 20, 26, 34], 'inOut']]), [hx, 0, hz - 5], 26);
    for (const h of houses) for (const m of h.g.windows) m.userData.on = 0.55;
    const [px, py] = F.projOf(H.g, 5);
    show(supplyQ, { x: px, y: py - 20, ay: 1, o: fade(t, a + 0.3), s: pop(t, a + 0.3) });
  });

  // ================================================================== 5. You make the offer on those numbers (the moment of truth, lost)
  function offerCard(t, card, btn, sent, tapAt, opts) {
    const place = { x: W / 2, y: 100, s: 0.94, ay: 0 };
    const tc = inOut(t, tapAt - 1.4, tapAt + 1.2, 0.4, 0.3);
    const [bx, by] = inside(card, { ...place }, btn);
    if (tc > 0) {
      const k = ease.inOut(prog(t, tapAt - 1.3, tapAt - 0.1));
      show(cursor, { x: lerp(bx + 260, bx + 14, k), y: lerp(by + 170, by + 22, k), ax: 0.1, ay: 0.06, o: tc, z: 30 });
      if (t > tapAt - 0.08) show(tapEl, { x: bx, y: by, s: 0.4 + 0.9 * prog(t, tapAt - 0.08, tapAt + 0.45), o: 1 - prog(t, tapAt + 0.05, tapAt + 0.5), z: 29 });
    }
    show(sent, { x: W / 2, y: by + 74, o: fade(t, tapAt + 0.25) * gone(t, tapAt + 2.4), s: pop(t, tapAt + 0.25), z: 31 });
    return place;
  }
  F.shot(s('C1') - 0.4, 'offer-lost', (t) => {
    S.setMood(0.62, [D.ox, 0, -1.5], 6);
    F.sky(0.62);
    deskCam(t, 1);
    pose(OP, { sit: 1, type: 0.5, t });
    F.blur3d(6, 0.25);
    const tapAt = T('C1', 'offer');
    const place = offerCard(t, napL, btnL, sentL, tapAt);
    napkin(t, { o: 1, y: place.y, sc: place.s, terms: 6, res: 1, rows: 4, fxOk: 1, send: 1 });
  });

  // ================================================================== 6. ...and the house is yours.
  F.shot(T('C1', 'house') - 0.1, 'sold', (t) => {
    const a = T('C1', 'house') - 0.1;
    S.setMood(0.18, [hx, 0, hz], 18);
    F.sky(0.1);
    for (const c of cars) c.visible = false;
    F.setCam(keys(t, [[a, [hx + 5.5, 3.6, 13.8]], [s('C2'), [hx + 4.8, 3.9, 12.6], 'inOut']]), [hx + 2.6, 1.3, hz + 2.4], 26);
    sign.rider.visible = true;
    const drop = ease.outBack(prog(t, T('C1', 'yours') - 0.25, T('C1', 'yours') + 0.3));
    sign.rider.position.y = lerp(3.4, 1.12 + 0.36, drop);
    op.visible = true;
    op.position.set(hx + 1.7, 0, 1.45); op.rotation.y = Math.PI * 0.9;
    pose(op, { arms: 0.2 });
    const [px, py] = F.projOf(sign.g, 2.3);
    show(sold, { x: px, y: py - 20, ay: 1, o: fade(t, T('C1', 'yours') + 0.15), s: pop(t, T('C1', 'yours') + 0.15) });
  });

  // ================================================================== 7. Then the rooms go up for rent, and two of them sit empty for weeks.
  const occupied = [0, 1, 3, 5], vacant = [2, 4];
  F.shot(s('C2') - 0.2, 'empty-rooms', (t) => {
    const a = s('C2') - 0.2, b = s('C3') - 0.25;
    S.setMood(0.4, [hx, 0, hz], 14);
    F.sky(0.32);
    for (const c of cars) c.visible = false;
    F.setCam(keys(t, [[a, [hx + 4.5, 10.5, 10.5]], [b, [hx + 2.6, 12.5, 8.6], 'inOut']]), [hx + 0.2, 0.3, hz + 0.2], 30);
    sign.rider.visible = true;
    const op1 = prog(t, T('C2', 'rooms') - 0.2, T('C2', 'rooms') + 1.1);
    openHouse(op1, op1);
    occupied.forEach((ri, k) => {
      const at = T('C2', 'rent') - 0.2 + k * 0.32;
      room(ri, 'warm', fade(t, at, 0.4));
      const p = renters[1 + k];
      if (t > at) {
        p.visible = true;
        const r = H.rooms[ri];
        p.position.set(hx + r.x + 0.35, 0.15, hz + r.z + 0.1);
        p.rotation.y = r.row > 0 ? Math.PI * 0.85 : 0.3;
        p.scale.setScalar(ease.outBack(prog(t, at, at + 0.35)) || 0.001);
        pose(p, { bob: 0 });
      }
    });
    vacant.forEach((ri, k) => {
      const at = T('C2', 'empty') - 0.25 + k * 0.2;
      room(ri, 'dark', fade(t, at - 0.3, 0.4));
      const [x, y] = roomPt(H.rooms[ri], 1.0);
      const wk = 1 + Math.min(2, Math.floor(prog(t, T('C2', 'empty'), T('C2', 'weeks') + 0.35) * 2.999));
      vac[k].querySelector('b').textContent = String(wk);
      show(vac[k], { x, y, ay: 1, o: fade(t, at), s: pop(t, at) });
    });
  });

  // ================================================================== 8. Seventeen other houses within three miles were renting rooms all along.
  F.shot(s('C3') - 0.25, 'seventeen', (t) => {
    const a = s('C3') - 0.25, b = s('D1') - 0.5;
    S.setMood(0.62, [hx, 0, hz - 3], 40);
    F.sky(0.6);
    F.setCam(keys(t, [[a, [hx + 6, 15, 15]], [a + 2.8, [hx + 22, 58, 58], 'inOut'], [b, [hx + 21, 56, 55]]]), keys(t, [[a, [hx, 0, hz]], [a + 2.8, [hx - 1, 0, hz - 1]]]), 26);
    sign.rider.visible = true;
    openHouse(1, 1);
    occupied.forEach((ri) => room(ri, 'warm', 1));
    vacant.forEach((ri) => room(ri, 'dark', 1));
    for (const h of houses) for (const m of h.g.windows) m.userData.on = 0.12;
    ring(ease.inOut(prog(t, s('C3') + 0.1, T('C3', 'miles') + 0.4)), { cls: 'ring am' });
    let n = 0;
    coliving.forEach((h, i) => {
      const at = s('C3') + 0.25 + i * ((T('C3', 'renting') - s('C3')) / coliving.length);
      const k = fade(t, at, 0.3);
      if (k > 0) n++;
      for (const m of h.g.windows) m.userData.on = 0.12 + 0.95 * k;
      const [x, y] = pinAt(i);
      pins[i].className = 'o pin warm';
      show(pins[i], { x, y, o: k, s: pop(t, at, 0.35) });
    });
    countL.querySelector('b').textContent = String(n);
    show(countL, { x: W / 2, y: 120, o: fade(t, s('C3') + 0.1), s: pop(t, s('C3') + 0.1), z: 20 });
    // renters on the streets, walking to those houses
    extra.forEach((p, i) => {
      p.visible = true;
      const h = coliving[(i * 3) % coliving.length];
      const street = h.face > 0 ? (h.z > -4 ? 3.2 : -9.6) : (h.z > -10 ? -9.6 : -23.0);
      const sz = street - h.face * 1.55, sx = h.x + (i % 2 ? 8 : -8);
      walkP(p, [[sx, sz], [h.x, sz], [h.x, h.z + h.face * 1.9]], t, a + i * 0.25, a + 4.8 + i * 0.25, 1.8);
    });
  });

  // ================================================================== 9. The cost: seventy-five percent instead of ninety
  F.shot(s('D1') - 0.5, 'cost', (t) => {
    const a = s('D1') - 0.5;
    S.setMood(0.62, [hx, 0, hz], 40);
    F.sky(0.6);
    F.setCam([hx + 21, 56, 55], [hx - 1, 0, hz - 1], 26);
    sign.rider.visible = true;
    openHouse(1, 1);
    F.veilTo(ease.inOut(prog(t, a, a + 0.55)));
    const k1 = fade(t, a + 0.35), k2 = fade(t, T('D1', 'seventy-five') - 0.2);
    cost.querySelector('.q').style.opacity = k1.toFixed(3);
    cost.querySelector('.b1').style.opacity = fade(t, a + 0.7).toFixed(3);
    cost.querySelector('.b2').style.opacity = k2.toFixed(3);
    const gk = ease.out(prog(t, T('D1', 'ninety') - 0.2, T('D1', 'ninety') + 0.7));
    const gap = cost.querySelector('.gap'); gap.style.opacity = gk.toFixed(3);
    gap.style.width = (16.67 * gk).toFixed(2) + '%';
    const offK = ease.out(prog(t, T('D1', 'seven') - 0.1, T('D1', 'plan')));
    costOff.textContent = money(783 * offK);
    cost.querySelector('.off').style.opacity = fade(t, T('D1', 'seven') - 0.2).toFixed(3);
    cost.querySelector('.src').style.opacity = fade(t, T('D1', 'plan') - 0.4).toFixed(3);
    show(cost, { x: W / 2, y: 540, o: fade(t, a + 0.3), s: 1, z: 20 });
  });

  // ================================================================== 10. The formula was fine all along. The numbers inside it just had nothing behind them.
  F.shot(s('D2') - 0.35, 'nothing', (t) => {
    F.setCam([hx + 21, 56, 55], [hx - 1, 0, hz - 1], 26);
    F.veilTo(1);
    napkin(t, {
      o: fade(t, s('D2') - 0.35, 0.4), y: 205, sc: 0.94, terms: 6, res: 1, rows: 4, fxOk: fade(t, T('D2', 'fine') - 0.2),
      glowNums: inOut(t, T('D2', 'numbers') - 0.2, s('E1') - 0.5, 0.4, 0.3), ghost: 2.0 * ease.out(prog(t, T('D2', 'nothing') - 0.3, T('D2', 'behind') + 0.4)),
    });
  });

  // ================================================================== 11. RoomIQ puts evidence behind each of those numbers, before you make the offer.
  // The turn, problem to solution: on "RoomIQ" the title arrives; on "evidence" a cyan wipe turns the napkin card into
  // the RoomIQ version, the empty boxes behind each number filled with its evidence. On "before" the film rewinds to the
  // town before the offer, and the RoomIQ tile lands by the house.
  F.shot(s('E1') - 0.6, 'turn', (t) => {
    const ev = T('E1', 'evidence'), rw = T('E1', 'before') - 0.35;
    S.setMood(0, [hx, 0, hz], 22);
    F.setCam(keys(t, [[rw, [hx + 2, 7.2, 18.5]], [s('F1'), [hx + 1, 9, 22], 'inOut']]), [hx - 2.6, 1.6, hz + 0.8], 26);
    for (const c of cars) c.visible = false;
    F.veilTo(1 - ease.inOut(prog(t, rw, rw + 0.6)));
    const cardO = gone(t, rw - 0.05, 0.4);
    // the napkin, as D2 left it, and the RoomIQ version wiping over it
    napkin(t, { o: cardO, y: 205, sc: 0.94, terms: 6, res: 1, rows: 4, fxOk: 1, ghost: 2 });
    const wk = ease.inOut(prog(t, ev - 0.15, ev + 1.2));
    if (wk > 0) {
      napW.querySelector('.foot').style.display = 'none';
      napW.style.clipPath = `inset(-40px ${(100 - wk * 100).toFixed(2)}% -40px -40px)`;
      show(napW, { x: W / 2, y: 205, ay: 0, s: 0.94, o: cardO, z: 6 });
      const left = W / 2 - 0.5 * napW._w * 0.94, h = napW.offsetHeight * 0.94;
      wipe.style.height = h.toFixed(0) + 'px';
      show(wipe, { x: left + wk * napW._w * 0.94, y: 205, ay: 0, o: inOut(t, ev - 0.15, ev + 1.35, 0.15, 0.3) * cardO, z: 7 });
    }
    show(turnTitle, { x: W / 2, y: 112, o: fade(t, T('E1', 'RoomIQ') - 0.1) * cardO, s: 0.97 + 0.03 * ease.out(prog(t, T('E1', 'RoomIQ') - 0.1, T('E1', 'RoomIQ') + 0.6)) });
    // the rewind: the Sold rider lifts off; the house is for sale again
    sign.rider.visible = t < rw + 0.75;
    sign.rider.position.y = lerp(1.48, 3.6, ease.in(prog(t, rw + 0.1, rw + 0.7)));
    show(before, { x: W / 2, y: 862, o: inOut(t, rw + 0.35, s('F1') + 0.8, 0.3, 0.35), s: pop(t, rw + 0.35) });
    // the RoomIQ tile lands beside the house, its name beside it
    tile.visible = t > rw + 0.2;
    const drop = prog(t, rw + 0.35, rw + 1.05);
    tile.position.set(hx - 7.2, lerp(11, 3.6, ease.outBack(drop)), hz + 1.9);
    tile.rotation.y = -0.45 + 0.35 * ease.out(drop);
    if (t > rw + 0.2) {
      const [tx, ty] = F.projOf(tile, 1.4);
      show(wm, { x: tx + 105, y: ty - 6, ax: 0, ay: 0.5, o: fade(t, rw + 0.8), s: pop(t, rw + 0.8) });
      F.rings(tx, ty, t, rw + 0.95, rw + 2.2);
    }
  });

  // ================================================================== 12. Type in the address, and it counts and maps the co-living houses within about three miles.
  F.shot(s('F1') - 0.3, 'supply', (t) => {
    const a = s('F1') - 0.3, b = s('F2') - 0.35;
    S.setMood(0, [hx, 0, hz - 3], 40);
    F.setCam(keys(t, [[a, [hx + 1, 9, 22]], [T('F1', 'counts') - 0.4, [hx + 22, 40, 33], 'inOut'], [b, [hx + 21, 41, 31]]]),
      keys(t, [[a, [hx - 2.6, 1.6, hz + 0.8]], [T('F1', 'counts') - 0.4, [hx + 13, 0, hz - 4], 'inOut'], [b, [hx + 13, 0, hz - 4]]]), 28);
    tile.visible = true; tile.position.set(hx - 7.2, 3.6, hz + 1.9); tile.rotation.y = -0.1;
    show(wm, { ...(() => { const [tx, ty] = F.projOf(tile, 1.4); return { x: tx + 105, y: ty - 6 }; })(), ax: 0, ay: 0.5, o: gone(t, s('F1') + 0.1, 0.5) });
    for (const c of cars) c.visible = false;
    railShow(0, fade(t, s('F1') - 0.1));
    // the real Predictor slides in: the address field lights on "Type ... address"
    const sl = ease.outQuint(prog(t, a, a + 0.8));
    r11.querySelector('.addr').style.opacity = inOut(t, s('F1') - 0.05, T('F1', 'counts') + 0.4, 0.25, 0.4).toFixed(3);
    tilt(r11, { x: lerp(2300, 1395, sl), y: 600, s: 0.68, o: sl, ry: -12, rx: 3 });
    // the same count on the made-up town: the cyan ring, a pin on each of the seventeen
    const counts = T('F1', 'counts');
    ring(ease.inOut(prog(t, counts - 0.1, counts + 1.4)), { cls: 'ring cy', fill: 0.9 * fade(t, counts + 0.8, 0.6) });
    let c = 0;
    coliving.forEach((h, i) => {
      const at2 = counts + 0.1 + i * 0.1, k = fade(t, at2, 0.25);
      if (k > 0) c++;
      const [x, y] = pinAt(i);
      pins[i].className = 'o pin';
      show(pins[i], { x, y, o: k, s: pop(t, at2, 0.3) });
    });
    countR.querySelector('b').textContent = String(c);
    show(countR, { x: 40, y: 132, ax: 0, ay: 0, o: fade(t, T('F1', 'maps')), s: pop(t, T('F1', 'maps')), z: 20 });
  });

  // ================================================================== 13. Add each room and its bath, and the rent and occupancy come from comparable rooms nearby.
  F.shot(s('F2') - 0.35, 'rooms', (t) => {
    const a = s('F2') - 0.35, b = s('F3') - 0.35, sw = T('F2', 'rent') - 0.25;
    S.setMood(0, [hx, 0, hz], 16);
    for (const c of cars) c.visible = false;
    F.setCam(keys(t, [[a, [hx + 4.5, 12.5, 9.5]], [b, [hx + 3.8, 13.0, 8.2], 'inOut']]), [hx + 3.4, 0, hz - 0.2], 30);
    const op1 = prog(t, s('F2') - 0.3, s('F2') + 0.9);
    openHouse(op1, op1);
    for (let i = 0; i < 6; i++) {
      const at = T('F2', 'room') - 0.1 + i * 0.32;
      if (i < 5) room(i, 'cyan', fade(t, at, 0.4));
      const ca = T('F2', 'bath') - 0.2 + i * 0.22;
      const [x, y] = roomPt(H.rooms[i], 0.7);
      show(roomChips[i], { x, y: y + (H.rooms[i].row > 0 ? 18 : -12), o: fade(t, ca), s: pop(t, ca) * 0.84 });
    }
    // comparable rooms nearby: arcs from five of the seventeen to the house
    const cmp = T('F2', 'comparable') - 0.3;
    for (let i = 0; i < 5; i++) {
      const [x0, y0] = house3(coliving[i], 1.8);
      const [x1, y1] = F.proj(hx, 1.2, hz);
      F.beam([x0, y0], [x1, y1], ease.inOut(prog(t, cmp + i * 0.12, cmp + 0.7 + i * 0.12)), { lift: 0.25, o: gone(t, b - 0.3, 0.3) });
    }
    railShow(t < sw + 0.2 ? 1 : 2, 1);
    // the real baseline profile, its bathroom mix lit on "bath"; then the real Analyzer's rooms by bath and size
    const k12 = ease.outQuint(prog(t, a + 0.1, a + 0.8)) * gone(t, sw, 0.35);
    r12.querySelector('.bath').style.opacity = fade(t, T('F2', 'bath') - 0.2).toFixed(3);
    show(r12, { x: 1450, y: 590, o: k12, s: 0.98 });
    const k07 = ease.outQuint(prog(t, sw + 0.1, sw + 0.8));
    r07.querySelector('.seg').style.opacity = fade(t, T('F2', 'occupancy') - 0.1).toFixed(3);
    r07.querySelector('.seg2').style.opacity = fade(t, T('F2', 'comparable') - 0.1).toFixed(3);
    show(r07, { x: 1405, y: 600, o: k07, s: 0.68 });
  });

  // ================================================================== 14. Then it prints the estimate with its formula, its comps, and a label for how sure it is.
  // ================================================================== 14b. And when the evidence is thin, it says so.
  F.shot(s('F3') - 0.35, 'forecast', (t) => {
    const a = s('F3') - 0.35, th = s('F4') - 0.2;
    S.setMood(0, [hx, 0, hz], 16);
    F.setCam([hx + 3.8, 13.0, 8.2], [hx + 3.4, 0, hz - 0.2], 30);
    openHouse(1, 1);
    F.veilTo(ease.inOut(prog(t, a, a + 0.5)));
    railShow(3, 1);
    // the real forecast, flat and large; on "thin" it moves left and the labels lift off it
    const sl = ease.outQuint(prog(t, a + 0.1, a + 0.8)), zk = ease.inOut(prog(t, th, th + 0.8));
    const place = { x: lerp(lerp(1500, 960, sl), 720, zk), y: lerp(500, 520, zk), s: lerp(1.16, 0.92, zk) };
    show(r14, { ...place, o: sl, z: 5 });
    // the three marks, each on its word (the page's own evidence callouts)
    const marks = [
      { el: hs[0], at: T('F3', 'formula') - 0.1, p: [31.2, 55.4] },
      { el: hs[1], at: T('F3', 'comps') - 0.1, p: [54.4, 84.0] },
      { el: hs[2], at: T('F3', 'label') - 0.1, p: [26.8, 29.4] },
    ];
    marks.forEach(({ el, at, p }) => {
      const [x, y] = onReal(r14, place, p[0], p[1]);
      const o = fade(t, at, 0.3) * gone(t, th, 0.3);
      show(el, { x: x - 23, y, ax: 0, o, s: pop(t, at, 0.4), z: 9 });
    });
    // when the evidence is thin, it says so: the labels and the comp distance, lifted, in their own words
    show(thin, { x: 1400, y: 560, o: fade(t, T('F4', 'thin') - 0.3, 0.35), s: pop(t, T('F4', 'thin') - 0.3, 0.45), z: 10 });
  });

  // ================================================================== 15. The same table, the same formula, with its evidence (the moment of truth, won)
  F.shot(s('G1') - 0.45, 'offer-won', (t) => {
    const a = s('G1') - 0.45;
    S.setMood(0.62, [D.ox, 0, -1.5], 6);
    F.sky(0.62);
    deskCam(t, 1);
    pose(OP, { sit: 1, type: 0.6, t });
    const ins = ease.inOut(prog(t, a + 0.9, a + 1.6));
    F.blur3d(6 * ins, 0.25 * ins);
    // every number has its evidence: each row's evidence lights in turn; then the labels are read before the numbers
    const rows = [...napW.querySelectorAll('.nr')];
    rows.forEach((r, i) => {
      const ev = r.querySelector('.e');
      const lit = T('G1', 'every') - 0.1 + i * 0.3, rl = T('G2', 'label') - 0.15 + i * 0.28;
      const on = (t > lit && t < lit + 0.9) || (t > rl && t < rl + 0.9);
      ev.style.color = on ? 'var(--brandDeep)' : '';
      ev.style.textShadow = on ? '0 0 18px rgba(0,180,216,.45)' : '';
    });
    const tapAt = T('G3', 'offer');
    const dk = fade(t, T('G2', 'test') - 0.3, 0.45) * gone(t, s('G3') - 0.4, 0.5);
    napW.querySelector('.send').style.opacity = fade(t, s('G3') - 0.3).toFixed(3);
    const place = { x: W / 2, y: 125, s: 0.94, ay: 0 };
    show(napW, { ...place, o: ins * (1 - dk) });
    // the deal: the real Deal Calculator, its scenarios and then your own costs lit, and the page's words for it
    railShow(4, dk);
    const sl = ease.outQuint(prog(t, T('G2', 'test') - 0.3, T('G2', 'test') + 0.5));
    [[ '.scn', T('G2', 'test') + 0.2], ['.buy', T('G2', 'own') - 0.2], ['.cls', T('G2', 'own') + 0.1]].forEach(([c, at]) => { r15.querySelector(c).style.opacity = fade(t, at, 0.3).toFixed(3); });
    show(r15, { x: lerp(800, 735, sl), y: 520, o: dk, s: 0.9 });
    show(dealCard, { x: 1370, y: 520, ax: 0, o: dk * fade(t, T('G2', 'test') + 0.05, 0.4), s: 0.96 + 0.04 * ease.out(fade(t, T('G2', 'test') + 0.05, 0.4)) });
    const [bx, by] = inside(napW, place, btnW);
    if (t > s('G3') - 1.5) {
      const tc = inOut(t, tapAt - 1.0, tapAt + 1.0, 0.35, 0.3);
      const k = ease.inOut(prog(t, tapAt - 1.2, tapAt - 0.1));
      show(cursor, { x: lerp(bx + 240, bx + 14, k), y: lerp(by + 160, by + 22, k), ax: 0.1, ay: 0.06, o: tc, z: 30 });
      if (t > tapAt - 0.08) show(tapEl, { x: bx, y: by, s: 0.4 + 0.9 * prog(t, tapAt - 0.08, tapAt + 0.45), o: 1 - prog(t, tapAt + 0.05, tapAt + 0.5), z: 29 });
      show(sentW, { x: W / 2, y: by + 74, o: fade(t, tapAt + 0.25), s: pop(t, tapAt + 0.25), z: 31 });
    }
  });

  // ================================================================== 16. ...knowing what each number rests on: the house, opened
  F.shot(T('G3', 'offer') + 0.85, 'open-house', (t) => {
    const a = T('G3', 'offer') + 0.85, b = s('H1') - 0.6;
    S.setMood(0.2, [hx, 0, hz], 16);
    F.sky(0.15);
    for (const c of cars) c.visible = false;
    F.setCam(keys(t, [[a, [hx + 5.5, 10.5, 12.5]], [b, [hx + 4.2, 13.5, 10.2], 'inOut']]), [hx + 0.3, 0.4, hz + 0.3], 30);
    const op1 = prog(t, a, a + 1.0);
    openHouse(op1, op1);
    for (let i = 0; i < 6; i++) room(i, i < 5 ? 'cyan' : '', fade(t, a + 0.4 + i * 0.12, 0.4));
    for (let i = 0; i < 6; i++) {
      const [x, y] = roomPt(H.rooms[i], 0.7);
      show(roomChips[i], { x, y: y + (H.rooms[i].row > 0 ? 18 : -12), o: fade(t, a + 0.6 + i * 0.1), s: 0.8 });
    }
    op.visible = true;
    op.position.set(hx + 1.7, 0, 1.45); op.rotation.y = Math.PI * 0.9;
    pose(op, {});
    ring(1, { cls: 'ring cy', fill: 0.5 });
  });

  // ================================================================== 17. RoomIQ. See the investment inside the house. (the page's hero, then its end card)
  F.shot(s('H1') - 0.6, 'hero', (t) => {
    const a = s('H1') - 0.6;
 F.setCam([hx + 4.2, 13.5, 10.2], [hx + 0.3, 0.4, hz + 0.3], 30);
    openHouse(1, 1);
    F.veilTo(ease.inOut(prog(t, a, a + 0.5)), 'radial-gradient(42% 55% at 74% 46%, #E8F9FC 0%, transparent 72%), #DEF2FA');
    for (const c of cars) c.visible = false;
    // the hero's visual: the forecast tilted, its revenue card lifted with the cyan glow, the supply map at its corner
    const r1 = ease.outQuint(prog(t, a + 0.15, a + 1.0)), r2 = ease.outQuint(prog(t, a + 0.4, a + 1.25)), lk = ease.outBack(prog(t, a + 0.8, a + 1.4));
    tilt(heroWeb, { x: 1395, y: 470 + 40 * (1 - r1), s: 1, o: r1, ry: -17, rx: 9, rz: 1.5 });
    tilt(heroSide, { x: 1560, y: 760 + 40 * (1 - r2), s: 1, o: r2, ry: -14, rx: 7 });
    tilt(heroLift, { x: 1150, y: 520 + 14 * (1 - lk), s: 0.96 + 0.04 * lk, o: clamp(lk * 1.5), ry: -17, rx: 9, rz: 1.5 });
    show(heroProof, { x: 1215, y: 968, ax: 0, o: fade(t, a + 1.2) });
    // three guesses drift away
    const dr = [[1030, 215, -60, -50], [1765, 268, 70, -40], [995, 805, -60, 60]];
    drifts.forEach((d, i) => {
      const k = prog(t, a + 0.9 + i * 0.15, a + 4.3 + i * 0.15);
      const o = k < 0.22 ? k / 0.22 : 1 - (k - 0.22) / 0.78;
      show(d, { x: dr[i][0] + dr[i][2] * ease.out(k), y: dr[i][1] + dr[i][3] * ease.out(k), o: clamp(o) * (k > 0 ? 1 : 0) });
    });
    // the headline as on the page; the wordmark arrives on "RoomIQ"
    show(logoTop, { x: 150, y: 96, ax: 0, o: fade(t, T('H1', 'RoomIQ') - 0.1) });
    heroEb.style.opacity = fade(t, a + 0.6).toFixed(3);
    heroH2.style.opacity = fade(t, T('H1', 'See') - 0.15).toFixed(3);
    heroP.style.opacity = fade(t, T('H1', 'house') + 0.5).toFixed(3);
    heroBtn.style.opacity = fade(t, T('H1', 'house') + 0.9).toFixed(3);
    heroHead.querySelector('.small').style.opacity = fade(t, T('H1', 'house') + 1.2).toFixed(3);
    show(heroHead, { x: 150, y: 575, ax: 0, o: fade(t, a + 0.5) });
    show(fine2, { x: 150, y: 1022, ax: 0, o: fade(t, T('H1', 'house') + 1.5) * 0.95 });
  });

  // ------------------------------------------------------------------ after the shot: the logo in the corner, until the close
  F.after((t) => {
    show(logoBug, { x: 40, y: 34, ax: 0, ay: 0, o: fade(t, 0.15, 0.6) * gone(t, s('H1') - 0.75, 0.5), z: 40 });
  });
}
