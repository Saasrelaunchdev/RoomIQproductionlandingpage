// The 3D stage: renderer, camera, light, and the mood (0 day, 1 night) that the shots set and the frame applies after
// them. Things that glow at night (windows, screens, lamps, headlights) register a function in `glows`; it runs when
// the mood is applied, after the shot code, so it sees what the shot set (userData.on, userData.lightsOn...).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { lerp } from './anim.js';

// Light that matched soft 3D clay art (rounded shapes, pastel colours, soft shadows). Tune against the page's own art.
export const LIGHT = {
  day: { hemi: 0.62, sky: '#ffffff', ground: '#c9e6c0', sun: 2.9, sunColor: '#ffffff', env: 0.38 },
  night: { hemi: 0.42, sky: '#7f95d6', ground: '#1b2a4e', sun: 0.5, sunColor: '#9db4ff', env: 0.16 },
  sunFrom: [-14, 30, 16],
};

export function makeStage(canvas, { width = 1920, height = 1080, light = LIGHT } = {}) {
  const q = new URLSearchParams(location.search);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: q.get('aa') !== '0', alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(width, height, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(26, width / height, 0.5, 400);
  const hemi = new THREE.HemisphereLight(light.day.sky, light.day.ground, light.day.hemi);
  const sun = new THREE.DirectionalLight(light.day.sunColor, light.day.sun);
  sun.castShadow = true;
  const sm = +(q.get('shadow') || 2048);
  sun.shadow.mapSize.set(sm, sm);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(hemi, sun, sun.target);

  const glows = [];
  let mood, split;
  const sky = new THREE.Color(), ground = new THREE.Color(), sunC = new THREE.Color();
  const D = light.day, N = light.night;

  // reset at the start of every frame; shots call setMood / setSplit
  function reset() { mood = { n: 0, focus: [0, 0, 0], span: 26 }; split = null; }
  function setMood(n, focus = [0, 0, 0], span = 26) { mood = { n, focus, span }; }
  function setSplit(cams) { split = cams; }
  function apply() {
    const n = mood.n;
    hemi.intensity = lerp(D.hemi, N.hemi, n);
    hemi.color.copy(sky.set(D.sky).lerp(new THREE.Color(N.sky), n));
    hemi.groundColor.copy(ground.set(D.ground).lerp(new THREE.Color(N.ground), n));
    sun.intensity = lerp(D.sun, N.sun, n);
    sun.color.copy(sunC.set(D.sunColor).lerp(new THREE.Color(N.sunColor), n));
    scene.environmentIntensity = lerp(D.env, N.env, n);
    // the sun stands over the part of the world on screen, and its shadow box covers it
    const f = new THREE.Vector3(...mood.focus);
    sun.target.position.copy(f);
    sun.position.copy(f).add(new THREE.Vector3(...light.sunFrom));
    const c = sun.shadow.camera;
    c.left = -mood.span; c.right = mood.span; c.top = mood.span; c.bottom = -mood.span; c.near = 1; c.far = 120;
    c.updateProjectionMatrix();
    for (const fn of glows) fn(n);
  }
  function render() {
    if (!split) { renderer.setViewport(0, 0, width, height); renderer.render(scene, camera); return; }
    renderer.setScissorTest(true);
    split.forEach((cam, i) => {
      renderer.setViewport(i * width / 2, 0, width / 2, height);
      renderer.setScissor(i * width / 2, 0, width / 2, height);
      renderer.render(scene, cam);
    });
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, width, height);
  }
  // a camera for one half of a split screen
  const halfCamera = () => new THREE.PerspectiveCamera(30, (width / 2) / height, 0.5, 400);
  reset();
  return { renderer, scene, camera, hemi, sun, glows, reset, setMood, setSplit, apply, render, halfCamera, mood: () => mood };
}
