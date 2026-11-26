/* nishantsharma.co.uk — V29.3 3D world (Mont-Fort idiom): terrain + cloud sea + sky + weather,
   camera flown by scroll through the active panel; plus a draggable 3D globe. */
import * as THREE from './vendor/three.module.min.js';

const D = document, W = window;
const RM = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
const MOBILE = W.innerWidth < 760;
/* Build the 3D scene only after the opening sequence hands over, so the first paint is not competing for the main thread. */
await new Promise(res => {
  const H = D.documentElement;
  if (H.classList.contains('ready') || !D.getElementById('pre')) return res();
  const mo = new MutationObserver(() => { if (H.classList.contains('ready')) { mo.disconnect(); setTimeout(res, 60); } });
  mo.observe(H, { attributes: true, attributeFilter: ['class'] });
  setTimeout(res, 6000);
});
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const sstep = t => t * t * (3 - 2 * t);

/* ---------- noise ---------- */
function hash(x, y) { let h = x * 374761393 + y * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}
function fbm(x, y, o = 5) { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= .5; } return s; }
function ridged(x, y, o = 5) { let s = 0, a = .55, f = 1, w = 1; for (let i = 0; i < o; i++) { let n = 1 - Math.abs(vnoise(x * f + 17.3, y * f - 9.1)); n *= n * w; w = clamp(n * 1.6, 0, 1); s += n * a; f *= 2.1; a *= .5; } return s; }
function height(x, z) {
  const r = Math.hypot(x, z);
  const peak = 96 * Math.exp(-(r * r) / (2 * 32 * 32)) * (0.72 + 0.42 * ridged(x * .035, z * .035, 5));
  const glen = Math.exp(-Math.pow((r - 150) / 42, 2));
  const range = (ridged(x * .009, z * .009) * 58 + ridged(x * .03, z * .03, 4) * 10) * clamp((r - 40) / 90, 0, 1) * (1 - .78 * glen);
  const base = fbm(x * .006, z * .006) * 16;
  const valley = -22 * glen;
  return peak + range + base + valley - 14;
}

/* ---------- presets (palette = House of Sharma) ---------- */
const C = h => new THREE.Color(h);
const P = [
  { top: '#0d0b22', hor: '#6e5688', fog: '#352c55', sun: '#ffb48a', el: .07, cloud: '#b4a6cc', dens: 1.0, stars: .12, rain: 0, emb: 0, terr: '#aea6c0' }, // 0 gloaming dusk
  { top: '#14120a', hor: '#a8904a', fog: '#45432c', sun: '#ffe0a0', el: .12, cloud: '#cbc49e', dens: 1.0, stars: 0, rain: 0, emb: 0, terr: '#a6a47c' },  // 1 Assam tea mist, muga sun
  { top: '#1f1608', hor: '#d9a64c', fog: '#6a5a36', sun: '#ffd98a', el: .16, cloud: '#e2c99a', dens: .55, stars: 0, rain: 0, emb: 0, terr: '#b8a37a' }, // 2 Punjab saffron dust
  { top: '#020209', hor: '#17152e', fog: '#0e0d1e', sun: '#a7b4e8', el: .35, cloud: '#34304c', dens: .7, stars: 1, rain: 0, emb: 0, terr: '#4e4c6a' },   // 3 the crossing, night
  { top: '#100d14', hor: '#3a3440', fog: '#2a2630', sun: '#c8c0d0', el: .30, cloud: '#7a7282', dens: 1.0, stars: 0, rain: 1, emb: 0, terr: '#6a6470' },  // 4 Glasgow rain
  { top: '#06061a', hor: '#36335e', fog: '#1a1836', sun: '#ffb46e', el: .04, cloud: '#575078', dens: .7, stars: .35, rain: 0, emb: 0, terr: '#6c6682' }, // 5 Edinburgh night, lamplight
  { top: '#0e0303', hor: '#7a2810', fog: '#2e0c06', sun: '#ff9a4a', el: .03, cloud: '#5e2c1e', dens: .6, stars: .2, rain: 0, emb: 1, terr: '#7a4232' },  // 6 the fire
  { top: '#2a2a56', hor: '#e2b480', fog: '#6c6082', sun: '#fff0c4', el: .13, cloud: '#e8dad2', dens: .9, stars: 0, rain: 0, emb: 0, terr: '#b4a6a8' },   // 7 muga dawn, the building
  { top: '#0b0a1d', hor: '#4b4070', fog: '#1d1a38', sun: '#efaa64', el: .06, cloud: '#6f6590', dens: .75, stars: .2, rain: 0, emb: 0, terr: '#857d9c' }, // 8 deep gloaming
].map(p => ({ ...p, top: C(p.top), hor: C(p.hor), fog: C(p.fog), sun: C(p.sun), cloud: C(p.cloud), terr: C(p.terr) }));
const ALT = [46, 40, 36, 76, 28, 38, 32, 42, 52];

/* ---------- renderer ---------- */
const host = D.getElementById('atmos');
let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' }); }
catch (e) { renderer = null; }
if (!renderer || !host) { D.documentElement.classList.add('no-world'); }
else {
host.appendChild(renderer.domElement);
renderer.setPixelRatio(Math.min(W.devicePixelRatio || 1, MOBILE ? 1 : 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = .92;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(46, 1, .5, 2400);
scene.fog = new THREE.FogExp2(0x5e5478, .0065);

/* terrain */
const SIZE = 760, SEG = MOBILE ? 120 : 260;
const tg = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG); tg.rotateX(-Math.PI / 2);
const pos = tg.attributes.position;
/* Build the terrain in slices so no single task blocks the main thread for long. */
const yieldNow = () => new Promise(r => (W.scheduler && W.scheduler.yield) ? W.scheduler.yield().then(r) : setTimeout(r, 0));
let tSlice = performance.now();
const slice = async i => { if ((i & 255) === 0 && performance.now() - tSlice > 8) { await yieldNow(); tSlice = performance.now(); } };
for (let i = 0; i < pos.count; i++) { pos.setY(i, height(pos.getX(i), pos.getZ(i))); await slice(i); }
await yieldNow();
tg.computeVertexNormals();
const nor = tg.attributes.normal, col = new Float32Array(pos.count * 3);
const cLow = C('#2a0c10'), cMid = C('#6e4448'), cHigh = C('#efe4d4'), tmp = new THREE.Color();
await yieldNow(); tSlice = performance.now();
for (let i = 0; i < pos.count; i++) {
  await slice(i);
  const y = pos.getY(i), ny = nor.getY(i);
  const t1 = clamp((y + 10) / 45, 0, 1), t2 = clamp((y - 30) / 30, 0, 1) * clamp((ny - .35) / .35, 0, 1);
  tmp.copy(cLow).lerp(cMid, t1).lerp(cHigh, t2 * .95);
  const n = .9 + .1 * vnoise(pos.getX(i) * .2, pos.getZ(i) * .2);
  col[i * 3] = tmp.r * n; col[i * 3 + 1] = tmp.g * n; col[i * 3 + 2] = tmp.b * n;
}
tg.setAttribute('color', new THREE.BufferAttribute(col, 3));
const terrMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, color: 0xffffff });
const terrain = new THREE.Mesh(tg, terrMat); scene.add(terrain);

/* sky dome */
const skyU = { top: { value: C('#2a0810') }, hor: { value: C('#d29a6a') }, sunDir: { value: new THREE.Vector3(0, .1, -1) }, sun: { value: C('#ffd8a8') } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(1600, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: 'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: 'uniform vec3 top,hor,sun,sunDir;varying vec3 vP;void main(){float h=vP.y;vec3 c=mix(hor,top,smoothstep(-.02,.55,h));c=mix(c,hor*.55,smoothstep(.0,-.3,h));float s=max(dot(normalize(vP),normalize(sunDir)),0.);c+=sun*(pow(s,1400.)*1.6+pow(s,60.)*.28+pow(s,6.)*.10);gl_FragColor=vec4(c,1.);}'
}));
scene.add(sky);

/* lights */
const hemi = new THREE.HemisphereLight(0xffe8d8, 0x2a0c10, .9); scene.add(hemi);
const sunL = new THREE.DirectionalLight(0xffd8a8, 2.4); scene.add(sunL); scene.add(sunL.target);

/* cloud sprites */
function cloudTex(seed) {
  // Built pixel by pixel (white RGB, alpha only). Canvas radial gradients are dithered per channel in Safari;
  // in the near-transparent edges that dither became visible multicolour specks once uploaded to WebGL.
  const s = 256, data = new Uint8Array(s * s * 4); const A = new Float32Array(s * s);
  let r = seed * 9301 + 49297; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 26; i++) {
    const px = s * (.22 + .56 * rnd()), py = s * (.38 + .28 * rnd()), rad = s * (.1 + .17 * rnd());
    const x0 = Math.max(0, Math.floor(px - rad)), x1 = Math.min(s - 1, Math.ceil(px + rad)), y0 = Math.max(0, Math.floor(py - rad)), y1 = Math.min(s - 1, Math.ceil(py + rad));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x + .5 - px, y + .5 - py) / rad; if (d >= 1) continue;
      const a = d < .55 ? .42 + (.16 - .42) * (d / .55) : .16 * (1 - (d - .55) / .45);
      const k = y * s + x; A[k] = A[k] + a * (1 - A[k]);
    }
  }
  for (let k = 0; k < s * s; k++) { const o = k * 4; data[o] = data[o + 1] = data[o + 2] = 255; data[o + 3] = Math.round(A[k] * 255); }
  const t = new THREE.DataTexture(data, s, s, THREE.RGBAFormat); t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; return t;
}
const cloudMats = [1, 2, 3].map(k => new THREE.SpriteMaterial({ map: cloudTex(k), transparent: true, depthWrite: false, fog: true, opacity: .8, color: 0xf3dcd4 }));
const clouds = [];
const NC = MOBILE ? 110 : 190;
for (let i = 0; i < NC; i++) {
  const sp = new THREE.Sprite(cloudMats[i % 3]);
  const a = Math.random() * Math.PI * 2, rr = 30 + Math.sqrt(Math.random()) * 330;
  sp.position.set(Math.cos(a) * rr, 10 + Math.random() * 16 + (i % 9 === 0 ? 14 : 0), Math.sin(a) * rr);
  const sc = 46 + Math.random() * 80; sp.scale.set(sc, sc * (.42 + Math.random() * .2), 1);
  sp.userData.v = .6 + Math.random() * 1.4; scene.add(sp); clouds.push(sp);
}

/* stars */
const sg = new THREE.BufferGeometry(), sv = [];
for (let i = 0; i < (MOBILE ? 1200 : 2200); i++) { const u = Math.random() * 2 - 1, th = Math.random() * 6.283; const y = Math.abs(u) * .9 + .05, r = Math.sqrt(1 - y * y); sv.push(Math.cos(th) * r * 1400, y * 1400, Math.sin(th) * r * 1400); }
sg.setAttribute('position', new THREE.Float32BufferAttribute(sv, 3));
const starMat = new THREE.PointsMaterial({ color: 0xf5ede1, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
scene.add(new THREE.Points(sg, starMat));

/* rain around the camera */
const NR = MOBILE ? 260 : 1000, rg = new THREE.BufferGeometry(), rv = new Float32Array(NR * 6);
for (let i = 0; i < NR; i++) { const x = (Math.random() - .5) * 60, y = Math.random() * 40 - 20, z = (Math.random() - .5) * 60; rv.set([x, y, z, x + .15, y - 1.6, z], i * 6); }
rg.setAttribute('position', new THREE.BufferAttribute(rv, 3));
const rainMat = new THREE.LineBasicMaterial({ color: 0xc8c0d0, transparent: true, opacity: 0, fog: false, depthWrite: false });
const rain = new THREE.LineSegments(rg, rainMat); scene.add(rain);

/* embers around the camera */
const NE = MOBILE ? 200 : 420, eg = new THREE.BufferGeometry(), ev = new Float32Array(NE * 3), es = new Float32Array(NE);
for (let i = 0; i < NE; i++) { ev.set([(Math.random() - .5) * 70, Math.random() * 40 - 20, (Math.random() - .5) * 70], i * 3); es[i] = Math.random(); }
eg.setAttribute('position', new THREE.BufferAttribute(ev, 3));
const embMat = new THREE.PointsMaterial({ color: 0xff9a40, size: 3, sizeAttenuation: false, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
const embers = new THREE.Points(eg, embMat); scene.add(embers);

/* ---------- camera path from the active panel's [data-scene] markers ---------- */
let marks = [], scrollY = 0, vh = W.innerHeight;
function poseFor(k, s, el) {
  const ang = .55 + k * .34, R = 148 + 26 * Math.sin(k * 1.27);
  let alt = ALT[s] ?? 36;
  if (el && el.classList.contains('hero')) alt = 64;
  if (el && el.classList.contains('partcard')) alt = 21;             // fly through the cloud layer between parts
  if (el && el.classList.contains('nextp')) alt = 22;
  const p = new THREE.Vector3(Math.cos(ang) * R, 0, Math.sin(ang) * R);
  p.y = Math.max(height(p.x, p.z) + 16, alt);
  const ahead = ang + .42, peakTop = new THREE.Vector3(0, 52, 0);
  const fwd = new THREE.Vector3(Math.cos(ahead) * R * .72, alt * .35, Math.sin(ahead) * R * .72);
  const l = fwd.lerp(peakTop, el && el.classList.contains('hero') ? .85 : .42);
  return { p, l, s };
}
function measure() {
  const panel = D.querySelector('.panel.on') || D.body;
  const els = Array.from(panel.querySelectorAll('[data-scene]')).filter(e => e.offsetParent !== null || e === panel);
  vh = W.innerHeight;
  marks = els.map((e, k) => { const r = e.getBoundingClientRect(); return { top: r.top + W.pageYOffset, pose: poseFor(k, +e.dataset.scene, e) }; })
             .sort((a, b) => a.top - b.top);
  if (!marks.length) marks = [{ top: 0, pose: poseFor(0, 0, null) }];
}
function sample() {
  const y = scrollY + vh * .55;
  if (y <= marks[0].top || marks.length === 1) return { a: marks[0].pose, b: marks[0].pose, t: 0 };
  for (let i = 0; i < marks.length - 1; i++) {
    if (y < marks[i + 1].top) { const t = (y - marks[i].top) / Math.max(1, marks[i + 1].top - marks[i].top); return { a: marks[i].pose, b: marks[i + 1].pose, t: sstep(clamp(t, 0, 1)) }; }
  }
  const L = marks[marks.length - 1].pose; return { a: L, b: L, t: 0 };
}

/* ---------- state + loop ---------- */
const st = { p: new THREE.Vector3(120, 64, 90), l: new THREE.Vector3(0, 50, 0), mix: { ...P[0], top: P[0].top.clone(), hor: P[0].hor.clone(), fog: P[0].fog.clone(), sun: P[0].sun.clone(), cloud: P[0].cloud.clone(), terr: P[0].terr.clone() } };
const mouse = new THREE.Vector2(), lm = new THREE.Vector2();
W.addEventListener('pointermove', e => { mouse.set(e.clientX / W.innerWidth * 2 - 1, e.clientY / W.innerHeight * 2 - 1); }, { passive: true });
function resize() { const w = W.innerWidth, h = W.innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 62 : 46; camera.updateProjectionMatrix(); measure(); }
W.addEventListener('resize', resize);
const tp = new THREE.Vector3(), tl = new THREE.Vector3(), right = new THREE.Vector3(), tc = new THREE.Color();
let last = performance.now(), first = true, visible = true, lastDraw = 0, lastMove = performance.now();
D.addEventListener('visibilitychange', () => { visible = !D.hidden; });
W.addEventListener('scroll', () => { lastMove = performance.now(); }, { passive: true });
W.addEventListener('pointermove', () => { lastMove = performance.now(); }, { passive: true });
function lerpPreset(out, a, b, t, k) {
  ['top', 'hor', 'fog', 'sun', 'cloud', 'terr'].forEach(n => { tc.copy(a[n]).lerp(b[n], t); out[n].lerp(tc, k); });
  ['el', 'dens', 'stars', 'rain', 'emb'].forEach(n => { out[n] += ((a[n] + (b[n] - a[n]) * t) - out[n]) * k; });
}
let fN = 0, fT = 0, tier = 0;
function adapt(dtRaw) {           // step quality down on slow devices
  if (tier > 1) return; fN++; fT += dtRaw;
  if (fN === 90) { const avg = fT / fN; fN = 0; fT = 0;
    if (avg > .034) { tier++; renderer.setPixelRatio(tier === 1 ? .8 : .6); renderer.setSize(W.innerWidth, W.innerHeight, false);
      clouds.forEach((c, i) => { if (i % (tier + 1)) c.visible = false; }); } }
}
function frame(now) {
  requestAnimationFrame(frame);
  if (!visible) return;
  /* 30 fps on phones, and on any device once scrolling stops */
  const minDt = (MOBILE || now - lastMove > 2500) ? 32 : 0;
  if (now - lastDraw < minDt) return;
  lastDraw = now;
  const dtRaw = (now - last) / 1000; adapt(minDt ? dtRaw * .6 : dtRaw);
  const dt = Math.min(.05, dtRaw); last = now;
  scrollY = W.pageYOffset;
  const s = sample();
  tp.copy(s.a.p).lerp(s.b.p, s.t); tl.copy(s.a.l).lerp(s.b.l, s.t);
  lm.lerp(mouse, 1 - Math.exp(-dt * 3));
  right.subVectors(tl, tp).cross(camera.up).normalize();
  tp.addScaledVector(right, lm.x * 3.2).add(new THREE.Vector3(0, -lm.y * 2.2, 0));
  const k = first || RM ? 1 : 1 - Math.exp(-dt * 2.2);
  st.p.lerp(tp, k); st.l.lerp(tl, k);
  lerpPreset(st.mix, P[s.a.s] || P[0], P[s.b.s] || P[0], s.t, first || RM ? 1 : 1 - Math.exp(-dt * 1.6));
  first = false;
  const m = st.mix;
  camera.position.copy(st.p); camera.lookAt(st.l);
  // palette
  skyU.top.value.copy(m.top); skyU.hor.value.copy(m.hor); skyU.sun.value.copy(m.sun);
  const sunDir = new THREE.Vector3(-.92, m.el, -.38).normalize(); skyU.sunDir.value.copy(sunDir);
  sunL.position.copy(sunDir).multiplyScalar(500); sunL.color.copy(m.sun); sunL.intensity = 1.2 + 2.2 * clamp(m.el * 4, .2, 1);
  hemi.color.copy(m.hor); hemi.groundColor.copy(m.fog).multiplyScalar(.4);
  scene.fog.color.copy(m.fog); scene.fog.density = .0024 + .0020 * m.dens;
  terrMat.color.copy(m.terr).multiplyScalar(1.15);
  cloudMats.forEach(cm => { cm.color.copy(m.cloud); cm.opacity = .72 * m.dens; });
  starMat.opacity = m.stars;
  rainMat.opacity = m.rain * .32; embMat.opacity = m.emb * .95;
  // motion
  const tsec = now / 1000;
  if (!RM) {
    for (const c of clouds) { c.position.x += c.userData.v * dt * 1.6; if (c.position.x > 380) c.position.x = -380; }
    if (m.rain > .01) { const a = rg.attributes.position.array; for (let i = 0; i < NR; i++) { let y = a[i * 6 + 1] - dt * 46; if (y < -20) y += 40; a[i * 6 + 1] = y; a[i * 6 + 4] = y - 1.6; } rg.attributes.position.needsUpdate = true; }
    if (m.emb > .01) { const a = eg.attributes.position.array; for (let i = 0; i < NE; i++) { a[i * 3 + 1] += dt * (3 + es[i] * 5); a[i * 3] += Math.sin(tsec * 1.3 + es[i] * 30) * dt * 1.2; if (a[i * 3 + 1] > 20) a[i * 3 + 1] = -20; } eg.attributes.position.needsUpdate = true; }
  }
  rain.position.copy(camera.position); embers.position.copy(camera.position);
  renderer.render(scene, camera);
}
resize();
requestAnimationFrame(t => { host.classList.add('on'); frame(t); });
W.World = { panel: () => { measure(); first = false; }, measure };
setTimeout(measure, 600); W.addEventListener('load', measure);
}

/* =================== 3D globe (draggable, scroll-turned) =================== */
const gc = D.getElementById('globe');
if (gc) {
  let gr; try { gr = new THREE.WebGLRenderer({ canvas: gc, alpha: true, antialias: true }); } catch (e) { gr = null; }
  if (gr) {
    gr.setPixelRatio(Math.min(W.devicePixelRatio || 1, MOBILE ? 1.5 : 2)); gr.outputColorSpace = THREE.SRGBColorSpace;
    const gs = new THREE.Scene(), gcam = new THREE.PerspectiveCamera(32, 1, .1, 50); gcam.position.set(0, 0, 4.1);
    const world = new THREE.Group(); world.rotation.order = 'XYZ'; gs.add(world);
    const V = (la, lo, r = 1) => { la *= Math.PI / 180; lo *= Math.PI / 180; return new THREE.Vector3(Math.cos(la) * Math.sin(lo) * r, Math.sin(la) * r, Math.cos(la) * Math.cos(lo) * r); };
    world.add(new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), new THREE.ShaderMaterial({
      uniforms: { a: { value: C('#2a2348') }, b: { value: C('#de9a5e') } },
      vertexShader: 'varying vec3 vN;varying vec3 vV;void main(){vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'uniform vec3 a,b;varying vec3 vN;varying vec3 vV;void main(){float f=pow(1.-max(dot(vN,vV),0.),3.);float l=.45+.75*max(dot(vN,normalize(vec3(-.4,.5,.8))),0.);gl_FragColor=vec4(a*l*1.25+b*f*.35,1.);}'
    })));
    gs.add(new THREE.Mesh(new THREE.SphereGeometry(1.1, 48, 32), new THREE.ShaderMaterial({
      side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      vertexShader: 'varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'varying vec3 vN;void main(){float i=pow(clamp(.62-dot(vN,vec3(0.,0.,1.)),0.,1.),2.4);gl_FragColor=vec4(.8,.62,.33,1.)*i*.55;}'
    })));
    // land dots
    const land = [];
    try { const raw = atob(gc.dataset.land), by = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) by[i] = raw.charCodeAt(i); const a = new Int16Array(by.buffer); for (let i = 0; i < a.length; i += 2) { const v = V(a[i] / 100, a[i + 1] / 100, 1.004); land.push(v.x, v.y, v.z); } } catch (e) {}
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(land, 3));
    world.add(new THREE.Points(lg, new THREE.PointsMaterial({ color: 0xf2dcb4, size: .017, transparent: true, opacity: .92, depthWrite: false })));
    // pins + arcs
    let pins = []; try { pins = JSON.parse(gc.dataset.pins); } catch (e) {}
    const home = pins[0], arcs = [], labels = [];
    const wrap = gc.parentNode; wrap.style.position = 'relative';
    const COL = { home: 0xf5ede1, origin: 0xf6b144, market: 0xde9a5e, retail: 0xde9a5e, planned: 0x9c93c8 };
    const ring = []; const LBL = { Edinburgh: 1, Dibrugarh: 1, Dubai: 1, Mumbai: 1, Singapore: 1, 'Hong Kong': 1, Ontario: 1, 'USA, 2027': 1, Delhi: 1 };
    pins.forEach((p, i) => {
      const v = V(p[1], p[2], 1.008), big = p[3] === 'home' || p[3] === 'origin';
      const dot = new THREE.Mesh(new THREE.SphereGeometry(big ? .018 : .011, 12, 8), new THREE.MeshBasicMaterial({ color: COL[p[3]] }));
      dot.position.copy(v); world.add(dot);
      if (big) { const r = new THREE.Mesh(new THREE.RingGeometry(.02, .026, 32), new THREE.MeshBasicMaterial({ color: COL[p[3]], transparent: true, side: THREE.DoubleSide, depthWrite: false })); r.position.copy(v); r.lookAt(v.clone().multiplyScalar(2)); world.add(r); ring.push(r); }
      if (LBL[p[0]]) { const s = D.createElement('span'); s.className = 'glbl' + (big ? ' big' : ''); s.textContent = p[0]; wrap.appendChild(s); labels.push({ s, v }); }
      if (i === 0) return;
      const a = V(home[1], home[2], 1), b = V(p[1], p[2], 1), ang = a.angleTo(b), N = 64, pts = [];
      for (let k = 0; k <= N; k++) { const t = k / N, q = new THREE.Vector3().copy(a).lerp(b, t).normalize(); q.multiplyScalar(1.004 + Math.sin(Math.PI * t) * .22 * Math.min(1, ang)); pts.push(q); }
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = p[3] === 'planned' ? new THREE.LineDashedMaterial({ color: COL.planned, dashSize: .02, gapSize: .02, transparent: true, opacity: .9 }) : new THREE.LineBasicMaterial({ color: p[3] === 'origin' ? 0xf6b144 : 0xde9a5e, transparent: true, opacity: p[3] === 'origin' ? 1 : .6 });
      const line = new THREE.Line(g, mat); if (p[3] === 'planned') line.computeLineDistances(); g.setDrawRange(0, 0); world.add(line); arcs.push({ g, N, i });
    });
    // drag (Mont-Fort's dragger) + scroll rotation
    let drag = null, dLon = 0, dLat = 0, lLon = 0, lLat = 0, gvis = false;
    gc.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, lo: dLon, la: dLat }; gc.setPointerCapture(e.pointerId); gc.classList.add('drag'); });
    gc.addEventListener('pointermove', e => { if (!drag) return; dLon = drag.lo + (e.clientX - drag.x) * .35; dLat = clamp(drag.la + (e.clientY - drag.y) * .25, -40, 40); });
    const up = () => { drag = null; gc.classList.remove('drag'); }; gc.addEventListener('pointerup', up); gc.addEventListener('pointercancel', up);
    new IntersectionObserver(es => { gvis = es[0].isIntersecting; }, { rootMargin: '150px' }).observe(gc);
    const reach = D.querySelector('.reach');
    function gframe(now) {
      requestAnimationFrame(gframe);
      if (!gvis) return;
      const r = gc.getBoundingClientRect(), w = Math.round(r.width), h = Math.round(r.height);
      if (gc.width !== Math.round(w * gr.getPixelRatio())) { gr.setSize(w, h, false); gcam.aspect = w / h; gcam.updateProjectionMatrix(); }
      let p = 0; if (reach) { const rr = reach.getBoundingClientRect(); p = clamp(-rr.top / Math.max(1, rr.height - W.innerHeight), 0, 1); }
      const e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      if (!drag) { dLon *= .985; dLat *= .985; }
      lLon += (dLon - lLon) * .12; lLat += (dLat - lLat) * .12;
      const lon = -8 + 92 * e + (RM ? 0 : Math.sin(now * .00012) * 3) + lLon, lat = 38 - 16 * e + lLat;
      world.rotation.y = -lon * Math.PI / 180; world.rotation.x = lat * Math.PI / 180;
      const ap = clamp((p - .08) / .62, 0, 1);
      arcs.forEach(a => a.g.setDrawRange(0, Math.floor((a.N + 1) * clamp(ap * 1.6 - a.i * .04, 0, 1))));
      const pulse = RM ? .5 : (now * .0008) % 1; ring.forEach(rg => { rg.scale.setScalar(1 + pulse * 2.4); rg.material.opacity = 1 - pulse; });
      gr.render(gs, gcam);
      const wr = wrap.getBoundingClientRect(), ox = r.left - wr.left, oy = r.top - wr.top;
      const tv = new THREE.Vector3(), camDir = new THREE.Vector3();
      labels.forEach(L => { tv.copy(L.v).applyMatrix4(world.matrixWorld); const facing = tv.clone().normalize().dot(camDir.copy(gcam.position).normalize()); tv.project(gcam);
        L.s.style.transform = `translate(${ox + (tv.x * .5 + .5) * w + 10}px,${oy + (-tv.y * .5 + .5) * h - 7}px)`; L.s.style.opacity = facing > .25 ? Math.min(1, (facing - .25) * 4) * (L.s.classList.contains('big') ? 1 : clamp(ap * 2, 0, 1)) : 0; });
    }
    requestAnimationFrame(gframe);
  }
}
