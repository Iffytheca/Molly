/* MOLLY - engine: renderer, input, player, collisions, creep system, Molly AI, jumpscare, UI, flow. */
(function () {
  'use strict';
  /* ===== CREEP_SCALE: how strong the NEW creepy effects are once creep rises (dread.js: post grade, fog, lights dying, peeking Molly, scripted scares...).
     1.0 = the intended spookiness | 0 = the old, gentler game | 1.4 = extra scary | it never touches the friendly start (creep 0). Documented in README.md. ===== */
  const CREEP_SCALE = 1.0;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const B = window.Build, M = window.Mat, Snd = window.Snd, Tex = window.Tex;
  window.LEVELS = window.LEVELS || [];
  window.SCENES = window.SCENES || {};

  const G = (window.G = {
    state: 'boot', creep: 0, bump: 0, level: null, scene: null, keys: {}, locked: false, noLock: false,
    uiOpen: false, panel: null, time: 0, lightMul: 1, flowId: 0,
    debug: /[?&]debug/.test(location.search), CREEP_SCALE: CREEP_SCALE,
    player: { x: 0, z: 0, yaw: 0, pitch: 0, h: 1.2, r: 0.28, moved: 0, bob: 0 },
    molly: { mesh: null, timer: 8, pending: 0, seen: 0, dist: 99, wasVisible: false, present: false, vanish: 0 },
    clamp, lerp, rnd
  });
  let renderer, camera, titleScene = null, titleMolly = null, titleT = 0;
  const tmpV = new THREE.Vector3();

  /* ======================= LEVEL CONTEXT ======================= */
  class Level {
    constructor(def) {
      this.def = def; this.scene = new THREE.Scene();
      this.colliders = []; this.interactables = []; this.triggers = []; this.lamps = []; this.spots = [];
      this.shifters = []; this.events = []; this.anims = []; this.skies = []; this.fns = [];
      this.molly = def.scene ? false : def.molly !== false;
      this.fog0 = [0x8a7a68, 0.012]; this.fog1 = [0x2a2a38, 0.055];
      this.ambient = null; this.ambBase = 1; this.spawn = { x: 0, z: 0, yaw: 0 };
      this.time = 0; this.fired = {}; this.bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff1c0 });
      this.update = null; this.hint = null; this.progress = null; this.carryLight = null;
      this.grace = def.grace !== undefined ? def.grace : 100; this.dangerAt = def.dangerAt !== undefined ? def.dangerAt : 0.5;
      this.mollyStart = def.mollyStart !== undefined ? def.mollyStart : 0.07; this.mollyScale = def.mollyScale || 1;
      this.shiftTimer = 14; this.debugApi = {};
      this.wallDefaults = {}; this.trims = []; this.blobs = []; this.trimColor = 0xf7efe0; this.palActive = false; this.dust = null;
    }
    addTrim(w, h, d, x, y, z) { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); this.trims.push(g); }
    // soft fake shadow under furniture (all merged into one mesh in flush())
    blob(x, z, w, d, ry) { this.blobs.push(B.blobGeo(w, d, ry || 0, x, z, 0.03)); }
    // merge the collected trims and blob shadows into single meshes (called once after build)
    flush() {
      if (this.trims.length) { const m = new THREE.Mesh(B.mergeGeos(this.trims, false), M.p(this.trimColor, 36, 0x333333)); this.scene.add(m); this.trims = []; }
      if (this.blobs.length) {
        const m = new THREE.Mesh(B.mergeGeos(this.blobs, false), new THREE.MeshBasicMaterial({ map: Tex.blobShadow(), transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
        m.renderOrder = 1; this.scene.add(m); this.blobs = [];
      }
    }
    add(o) { this.scene.add(o); return o; }
    place(o, x, y, z, ry) { o.position.set(x, y || 0, z); if (ry) o.rotation.y = ry; this.scene.add(o); return o; }
    solid(x1, z1, x2, z2, low) {
      const c = { minX: Math.min(x1, x2), maxX: Math.max(x1, x2), minZ: Math.min(z1, z2), maxZ: Math.max(z1, z2), enabled: true, low: !!low };
      this.colliders.push(c); return c;
    }
    // box mesh centered at x,y,z; solid: true (blocks) | 'low' (blocks walking but not sight)
    box(w, h, d, mat, x, y, z, solid) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); this.scene.add(m);
      if (solid) { m.userData.col = this.solid(x - w / 2, z - d / 2, x + w / 2, z + d / 2, solid === 'low'); if (h > 0.5 && w < 4 && d < 4) this.blob(x, z, w + 0.4, d + 0.4); }
      return m;
    }
    // solid furniture: object placed on floor at (x,z) with footprint w x d
    furn(obj, x, z, ry, w, d, low) {
      obj.position.set(x, obj.position.y || 0, z); if (ry) obj.rotation.y = ry; this.scene.add(obj);
      if (w) { const sw0 = Math.abs(Math.cos(ry || 0)) > 0.7 ? w : d, sd0 = Math.abs(Math.cos(ry || 0)) > 0.7 ? d : w; this.blob(x, z, sw0 + 0.45, sd0 + 0.45); }
      if (w) { const sw = Math.abs(Math.cos(ry || 0)) > 0.7 ? w : d, sd = Math.abs(Math.cos(ry || 0)) > 0.7 ? d : w; obj.userData.col = this.solid(x - sw / 2, z - sd / 2, x + sw / 2, z + sd / 2, low !== false); }
      return obj;
    }
    wall(x1, z1, x2, z2, o) {
      o = Object.assign({}, this.wallDefaults, o || {});
      const horiz = Math.abs(z2 - z1) < Math.abs(x2 - x1), t = o.t || 0.2, h = o.h || 2.7, y0 = o.y0 || 0;
      let a = horiz ? Math.min(x1, x2) : Math.min(z1, z2), b = horiz ? Math.max(x1, x2) : Math.max(z1, z2);
      a -= o.e1 === undefined ? t / 2 : o.e1; b += o.e2 === undefined ? t / 2 : o.e2;
      const len = b - a, c = (a + b) / 2, pos = horiz ? z1 : x1;
      const w = horiz ? len : t, d = horiz ? t : len, tile = o.tile || 2.2;
      const base = o.mat || M.l(0xeeeeee), A = o.matA || base, Bm = o.matB || base, E = o.matE || base;
      const g = new THREE.BoxGeometry(w, h, d);
      // uv scale per face so textures tile in world units
      const uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
      for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0] / tile, uv.getY(k) * dims[f][1] / tile); }
      const mesh = new THREE.Mesh(g, horiz ? [E, E, E, E, A, Bm] : [A, Bm, E, E, E, E]);
      mesh.position.set(horiz ? c : pos, y0 + h / 2, horiz ? pos : c); this.scene.add(mesh);
      if (o.trim) { // skirting boards + crown moulding, merged later
        [-1, 1].forEach((sd) => {
          const off = sd * (t / 2 + 0.011);
          if (y0 === 0) {
            if (horiz) { this.addTrim(len, 0.13, 0.022, c, 0.065, pos + off); this.addTrim(len, 0.02, 0.034, c, 0.14, pos + sd * (t / 2 + 0.017)); }
            else { this.addTrim(0.022, 0.13, len, pos + off, 0.065, c); this.addTrim(0.034, 0.02, len, pos + sd * (t / 2 + 0.017), 0.14, c); }
          }
          if (y0 + h > 2.4) { const yy = y0 + h - 0.04; if (horiz) this.addTrim(len, 0.08, 0.04, c, yy, pos + sd * (t / 2 + 0.02)); else this.addTrim(0.04, 0.08, len, pos + sd * (t / 2 + 0.02), yy, c); }
        });
      }
      if (o.solid !== false) mesh.userData.col = this.solid(mesh.position.x - w / 2, mesh.position.z - d / 2, mesh.position.x + w / 2, mesh.position.z + d / 2);
      return mesh;
    }
    // wall with doorway gaps: gaps = [[from,to],...] along the wall axis; lintel on top
    wallGaps(x1, z1, x2, z2, gaps, o) {
      o = Object.assign({}, this.wallDefaults, o || {});
      const horiz = Math.abs(z2 - z1) < Math.abs(x2 - x1), a = horiz ? Math.min(x1, x2) : Math.min(z1, z2), b = horiz ? Math.max(x1, x2) : Math.max(z1, z2);
      const h = o.h || 2.7, dh = o.doorH || 2.1;
      gaps = gaps.slice().sort((p, q) => p[0] - q[0]);
      let cur = a, first = true;
      const seg = (s, e, e1, e2) => {
        if (e - s < 0.02) return;
        const oo = Object.assign({}, o, { e1: e1, e2: e2 });
        horiz ? this.wall(s, z1, e, z1, oo) : this.wall(x1, s, x1, e, oo);
      };
      gaps.forEach((g) => {
        seg(cur, g[0], first ? undefined : 0, 0); first = false; cur = g[1];
        const oo = Object.assign({}, o, { e1: 0, e2: 0, y0: dh, h: h - dh, solid: false });
        horiz ? this.wall(g[0], z1, g[1], z1, oo) : this.wall(x1, g[0], x1, g[1], oo);
        if (o.trim) { // door casing
          const t = o.t || 0.2, cw = 0.06, cd = t + 0.05, mid = (g[0] + g[1]) / 2, span = g[1] - g[0];
          if (horiz) { this.addTrim(cw, dh, cd, g[0] + cw / 2, dh / 2, z1); this.addTrim(cw, dh, cd, g[1] - cw / 2, dh / 2, z1); this.addTrim(span, 0.07, cd, mid, dh - 0.035, z1); }
          else { this.addTrim(cd, dh, cw, x1, dh / 2, g[0] + cw / 2); this.addTrim(cd, dh, cw, x1, dh / 2, g[1] - cw / 2); this.addTrim(cd, 0.07, span, x1, dh - 0.035, mid); }
        }
      });
      seg(cur, b, first ? undefined : 0, undefined);
    }
    floor(x1, z1, x2, z2, mat, tile, y) {
      const w = Math.abs(x2 - x1), d = Math.abs(z2 - z1);
      const g = B.uvScale(new THREE.PlaneGeometry(w, d, Math.max(1, Math.round(w / 2.5)), Math.max(1, Math.round(d / 2.5))), w / (tile || 2), d / (tile || 2));
      const m = new THREE.Mesh(g, mat); m.rotation.x = -Math.PI / 2; m.position.set((x1 + x2) / 2, y || 0, (z1 + z2) / 2); this.scene.add(m); return m;
    }
    ceil(x1, z1, x2, z2, mat, y, tile) {
      if (mat && mat.color && !mat.map && !Array.isArray(mat) && (mat.isMeshStandardMaterial || mat.isMeshLambertMaterial) && B.photo.stucco) {   // plain ceiling colour -> real plaster
        const em = mat.emissive ? mat.emissive.getHex() : 0; mat = M.t(Tex.plaster('#' + mat.color.getHexString()), em ? { emissive: em } : undefined);
      }
      const w = Math.abs(x2 - x1), d = Math.abs(z2 - z1);
      const g = B.uvScale(new THREE.PlaneGeometry(w, d, Math.max(1, Math.round(w / 2.5)), Math.max(1, Math.round(d / 2.5))), w / (tile || 2), d / (tile || 2));
      const m = new THREE.Mesh(g, mat); m.rotation.x = Math.PI / 2; m.userData.noShadow = true; m.position.set((x1 + x2) / 2, y || 2.7, (z1 + z2) / 2); this.scene.add(m); return m;
    }
    lamp(x, y, z, color, intensity, dist, bulb) {
      const l = new THREE.PointLight(color, intensity, dist || 12, 2); l.position.set(x, y, z); this.scene.add(l);
      const e = { light: l, base: intensity, flick: true }; this.lamps.push(e);
      if (bulb !== false) e.bulb = this.bulbMat.clone();     // every visible bulb has its own material, so one light can die on its own
      if (bulb === 'dome') { // ceiling light fixture with a glowing shade
        const f = B.ceilLight(0.22, e.bulb); f.position.set(x, y + 0.15, z); this.scene.add(f);
        const h = B.glow('rgba(255,222,150,0.55)', 1.6); h.position.set(x, y + 0.02, z); this.scene.add(h); e.halo = h;
      } else if (bulb !== false) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), e.bulb); b.position.set(x, y + 0.05, z); this.scene.add(b);
        const h = B.glow('rgba(255,222,150,0.55)', 0.95); h.position.set(x, y + 0.05, z); this.scene.add(h); e.halo = h;
      }
      return e;
    }
    interact(o) { o.r = o.r || 2.1; o.y = o.y === undefined ? 1.0 : o.y; this.interactables.push(o); return o; }
    trigger(o) { this.triggers.push(o); return o; }
    event(at, run) { this.events.push({ at: at, run: run, done: false }); }
    sky(mat, night) { this.skies.push({ mat: mat, day: mat.color.clone(), night: new THREE.Color(night || 0x1a1428), beams: (mat.userData && mat.userData.beams) || [] }); }
    shifter(obj, alt) { obj.userData.home = { x: obj.position.x, y: obj.position.y, z: obj.position.z, ry: obj.rotation.y, rz: obj.rotation.z }; this.shifters.push({ obj: obj, alt: alt, moved: false }); }
    // swinging door. axis 'x': wall along x. pivot at hinge. returns controller
    door(o) {
      const axis = o.axis || 'x', w = o.w || 1.0, h = o.h || 2.1, t = o.t || 0.07;
      const pivot = new THREE.Group(); pivot.position.set(o.x, 0, o.z);
      const dm = o.mat || M.l(0x8a5a30), panel = axis === 'x' ? B.rbox(w, h, t, 0.012, dm, w / 2, h / 2, 0, pivot) : B.rbox(t, h, w, 0.012, dm, 0, h / 2, w / 2, pivot);
      const pm = new THREE.MeshLambertMaterial({ color: dm.color.clone().multiplyScalar(0.82) });
      [[0.3, 0.7], [0.75, 0.7]].forEach((pp, i) => { const ph = i ? 0.5 : 0.6, py = i ? 1.5 : 0.55; [1, -1].forEach((sd) => { if (axis === 'x') B.rbox(w * 0.7, ph, 0.012, 0.004, pm, w / 2, py, sd * (t / 2 + 0.002), pivot); else B.rbox(0.012, ph, w * 0.7, 0.004, pm, sd * (t / 2 + 0.002), py, w / 2, pivot); }); });
      [1, -1].forEach((sd) => { const kn = B.sph(0.04, M.p(0xd4b04a, 90, 0xffeeaa), axis === 'x' ? w - 0.12 : sd * (t / 2 + 0.03), 1.0, axis === 'x' ? sd * (t / 2 + 0.03) : w - 0.12, pivot, 1, 1, 1, 12); });
      pivot.rotation.y = o.closedRot || 0; this.scene.add(pivot);
      const col = axis === 'x' ? this.solid(o.x, o.z - 0.1, o.x + w, o.z + 0.1) : this.solid(o.x - 0.1, o.z, o.x + 0.1, o.z + w);
      const d = { pivot: pivot, col: col, closed: o.closedRot || 0, open: o.openRot !== undefined ? o.openRot : -Math.PI / 2 * 0.92, target: o.closedRot || 0, locked: !!o.locked, panel: panel, isOpen: false };
      d.setOpen = (v, silent) => { d.target = v ? d.open : d.closed; d.isOpen = v; if (v) col.enabled = false; if (!silent) Snd.door(); };
      d.update = (dt) => { pivot.rotation.y += (d.target - pivot.rotation.y) * Math.min(1, dt * 3); if (!d.isOpen) col.enabled = Math.abs(pivot.rotation.y - d.closed) < 0.4; };
      this.anims.push(d); return d;
    }
  }

  /* ======================= INIT / RENDER ======================= */
  function initGL() {
    try {
      renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true, powerPreference: 'high-performance' });
    } catch (e) {
      $('fatal').classList.remove('hidden'); return false;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
    if (B.initEnv) B.initEnv(renderer);
    try { G.maxAniso = renderer.capabilities.getMaxAnisotropy(); } catch (e) {}
    camera = new THREE.PerspectiveCamera(72, 1, 0.05, 90);
    camera.rotation.order = 'YXZ';
    G.camera = camera; G.renderer = renderer;
    onResize(); addEventListener('resize', onResize);
    return true;
  }
  function onResize() {
    const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  /* ======================= INPUT ======================= */
  function onLockFail() {
    if (G.hadLock) { if (G.state === 'play' && !G.debug) G.pause(); } else G.noLock = true;
  }
  function lockPointer() {
    G.lockGrace = performance.now() + 900;
    try { const p = $('c').requestPointerLock(); if (p && p.catch) p.catch(onLockFail); } catch (e) { onLockFail(); }
  }
  G.lockPointer = lockPointer;
  function initInput() {
    addEventListener('keydown', (e) => {
      G.keys[e.code] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].indexOf(e.code) >= 0) e.preventDefault();
      if (e.repeat) return;
      if (e.code === 'KeyM' && !(G.uiOpen && G.panel && G.panel.typing)) { const m = Snd.toggleMute(); G.toast(m ? 'Sound OFF (M)' : 'Sound ON (M)'); return; }
      if (G.uiOpen) {
        if (e.code === 'Escape' || (e.code === 'KeyE' && !(G.panel && G.panel.typing))) { G.closePanel(); lockPointer(); }
        else if (G.panel && G.panel.onKey) G.panel.onKey(e);
        return;
      }
      if (G.state === 'play') {
        if (e.code === 'KeyE') G.interact();
        else if (e.code === 'KeyH') G.showHint();
      }
    });
    addEventListener('keyup', (e) => { G.keys[e.code] = false; });
    addEventListener('blur', () => { G.keys = {}; });
    addEventListener('mousemove', (e) => {
      if (G.state !== 'play' || G.uiOpen) return;
      if (G.locked || (G.noLock && (e.buttons & 1))) {
        const p = G.player; p.yaw -= e.movementX * 0.0022; p.pitch = clamp(p.pitch - e.movementY * 0.0022, -1.3, 1.3);
      }
    });
    addEventListener('mousedown', (e) => { if (G.state === 'play' && !G.uiOpen && (G.locked || G.noLock) && e.button === 0) G.interact(); });
    document.addEventListener('pointerlockchange', () => {
      G.locked = document.pointerLockElement === $('c');
      if (G.locked) { G.hadLock = true; G.noLock = false; }
      if (G.locked && G.state === 'paused') { G.state = 'play'; $('pause').classList.add('hidden'); }
      if (!G.locked && G.state === 'play' && !G.uiOpen && !G.debug && !G.noLock) G.pause();
    });
    document.addEventListener('pointerlockerror', () => { onLockFail(); if (G.noLock && G.state === 'paused') { G.state = 'play'; $('pause').classList.add('hidden'); } });
    $('pause').addEventListener('click', () => { lockPointer(); setTimeout(() => { if (G.state === 'paused' && G.noLock) { G.state = 'play'; $('pause').classList.add('hidden'); } }, 250); });
  }
  G.pause = function () {
    if (G.state !== 'play') return;
    G.state = 'paused'; $('pause').classList.remove('hidden');
  };

  /* ======================= UI HELPERS ======================= */
  let sayT = 0, hintT = 0, toastT = 0;
  G.wait = (ms) => new Promise((r) => setTimeout(r, ms));
  G.say = function (text, ms) {
    const el = $('subtitle'); el.innerHTML = text; el.classList.add('show'); clearTimeout(sayT);
    const who = /^<b>([A-Za-z]+):/.exec(text); el.dataset.who = who ? who[1].toLowerCase() : '';
    sayT = setTimeout(() => el.classList.remove('show'), ms || 4500);
  };
  G.toast = function (text) {
    const el = $('toast'); el.textContent = text; el.classList.add('show'); clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove('show'), 1800);
  };
  G.setObjective = (t) => { $('objective').innerHTML = t; };
  G.setInventory = (h) => { $('inventory').innerHTML = h; };
  G.showHint = function () {
    const L = G.level; if (!L || !L.hint) { G.toast('No hint right now'); return; }
    G.hintsUsed = G.hintsUsed || 0;
    if (G.hintsUsed >= 3) { G.toast('No hints left! (3 hints in the whole game)'); return; }
    G.hintsUsed++; try { localStorage.setItem('molly_hints', String(G.hintsUsed)); } catch (e) {}
    const t = L.hint(); const el = $('hintbox');
    el.innerHTML = '<b>Hint ' + G.hintsUsed + ' of 3:</b> ' + t; el.classList.add('show'); clearTimeout(hintT);
    hintT = setTimeout(() => el.classList.remove('show'), 9000);
  };
  G.fade = function (toBlack, ms, color) {
    const f = $('fade'); f.style.transition = 'opacity ' + (ms || 800) + 'ms linear'; f.style.background = color || '#000';
    f.style.opacity = toBlack ? 1 : 0; return G.wait(ms || 800);
  };
  G.bigText = function (html, ms, cls) {
    const el = $('bigtext'); el.className = 'show ' + (cls || ''); el.innerHTML = html;
    return G.wait(ms || 2500).then(() => { el.classList.remove('show'); return G.wait(600); });
  };
  G.token = () => ++G.flowId;
  G.tween = function (ms, fn) {
    return new Promise((res) => {
      const t0 = performance.now();
      (function step() {
        const k = Math.min(1, (performance.now() - t0) / ms); fn(k);
        if (k < 1) setTimeout(step, 16); else res();
      })();
    });
  };
  G.hideAll = function () { ['title', 'pause', 'caught', 'endcard'].forEach((i) => $(i).classList.add('hidden')); };
  G.openPanel = function (el, opts) {
    const root = $('panelroot'); root.innerHTML = ''; root.appendChild(el); root.classList.remove('hidden');
    G.uiOpen = true; G.panel = Object.assign({ el: el }, opts || {});
    if (document.exitPointerLock) document.exitPointerLock();
  };
  G.closePanel = function () {
    if (!G.uiOpen) return;
    const p = G.panel; G.uiOpen = false; G.panel = null; $('panelroot').classList.add('hidden'); $('panelroot').innerHTML = '';
    if (p && p.onClose) p.onClose();
  };

  /* ======================= LEVEL LOADING ======================= */
  function disposeLevel() {
    const L = G.level; if (!L) return;
    L.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    if (L.cleanup) L.cleanup();
    G.level = null;
  }
  G.loadLevel = function (def, o) {
    o = o || {};
    G.closePanel(); disposeLevel(); $('hud').style.visibility = '';
    const L = new Level(def); G.level = L; G.scene = L.scene;
    def.build(L, G);
    L.flush();
    G.setupSun(L);
    L.scene.fog = new THREE.FogExp2(L.fog0[0], L.fog0[1]);
    L.scene.background = new THREE.Color(L.fog0[0]);
    if (L.carryLight) L.scene.add(L.carryLight);
    const M_ = G.molly; M_.mesh = null; M_.present = false; M_.timer = rnd(6, 10); M_.pending = 0; M_.seen = 0; M_.wasVisible = false; M_.vanish = 0; M_.defer = null; M_.silT = 0; M_.stance = 'face';
    if (L.molly) {
      M_.mesh = B.molly(L.mollyScale); M_.mesh.visible = false; L.scene.add(M_.mesh);
      M_.mesh.userData.setSmile(0.3);      // a plain, patient face when she is lurking
      // one permanent light for her (so the light count never changes and nothing recompiles when she appears)
      G.mollyLight = new THREE.PointLight(0xfff0e0, 0, 4.5, 2); L.scene.add(G.mollyLight);
    } else G.mollyLight = null;
    makeDust(L);
    camera.fov = 72; camera.updateProjectionMatrix(); shakeAmt = 0; Snd.tension && Snd.tension(0);
    const p = G.player; p.x = L.spawn.x; p.z = L.spawn.z; p.yaw = L.spawn.yaw || 0; p.pitch = 0; p.moved = 0; p.h = 1.2;
    G.bump = 0; G.creep = def.ease ? Math.min(def.creepBase || 0, def.ease.floor) : (def.creepBase || 0); G.lightMul = 1; G.fl = { next: rnd(12, 20), dur: 0, tick: 0, mul: 1, black: false };
    G.sfx = { giggle: rnd(20, 30), whisper: rnd(25, 40), creak: rnd(15, 25), box: rnd(30, 50), heart: 0 };
    G.stepAcc = 0; G.lastFilter = '';
    G.setObjective(''); G.setInventory(''); $('hintbox').classList.remove('show'); $('subtitle').classList.remove('show');
    Snd.setCreep(G.creep); Snd.detune = 0;
    if (def.music !== undefined) Snd.music(def.music);
    Snd.hum(!!def.hum);
    if (G.dread) G.dread.onLoad(L);
    if (window.Secrets) window.Secrets.onLevel(L);
    G.applyEnv(); updateCamera(0);
    if (def.onLoad) def.onLoad(L, G);
  };

  /* ======================= REALISM: image-based light + one real shadow-casting sun per level ======================= */
  const SUN_DIR = new THREE.Vector3(0.3, 1, 0.2).normalize();
  function flagShadows(scene) {
    scene.traverse((o) => {
      if (!o.isMesh) return; const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (!m || m.isMeshBasicMaterial || m.transparent || m.blending === THREE.AdditiveBlending || o.userData.noShadow || o.userData.noShadowTree) { o.castShadow = false; o.receiveShadow = false; return; }
      o.castShadow = true; o.receiveShadow = true;
    });
  }
  G.makeSun = function (scene, cx, cz, r, color, intensity, mapSize) {
    const sun = new THREE.DirectionalLight(color || 0xfff0dc, intensity); sun.castShadow = true; sun.shadow.mapSize.set(mapSize || 2048, mapSize || 2048);
    const c = sun.shadow.camera; c.left = -r; c.right = r; c.top = r; c.bottom = -r; c.near = 1; c.far = 90; c.updateProjectionMatrix();
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
    sun.position.set(cx + SUN_DIR.x * 40, SUN_DIR.y * 40, cz + SUN_DIR.z * 40); sun.target.position.set(cx, 0, cz); scene.add(sun); scene.add(sun.target);
    return sun;
  };
  G.setupSun = function (L) {
    L.scene.environment = B.envTex || null;
    let x1 = 1e9, z1 = 1e9, x2 = -1e9, z2 = -1e9;
    L.colliders.forEach((c) => { x1 = Math.min(x1, c.minX); z1 = Math.min(z1, c.minZ); x2 = Math.max(x2, c.maxX); z2 = Math.max(z2, c.maxZ); });
    if (L.bounds) { x1 = L.bounds[0]; z1 = L.bounds[1]; x2 = L.bounds[2]; z2 = L.bounds[3]; }
    const span = Math.max(x2 - x1, z2 - z1);
    G.sunOn = false; L.sun = null;
    if (L.def.noSun || !(span > 2) || span > 40) { flagShadows(L.scene); return; }   // (the huge mirror maze skips real shadows)
    const r = Math.hypot(x2 - x1, z2 - z1) / 2 + 1.5, base = L.def.sunBase !== undefined ? L.def.sunBase : 1.0;
    L.sun = G.makeSun(L.scene, (x1 + x2) / 2, (z1 + z2) / 2, r, 0xfff0dc, base, span > 18 ? 2048 : 1024);
    L.lamps.push({ light: L.sun, base: base, flick: true, ck: 0.92 });
    flagShadows(L.scene); G.sunOn = true; G.shadowDirty = 3;
  };

  /* ======================= CREEP / ENVIRONMENT ======================= */
  const _c1 = new THREE.Color(), _c2 = new THREE.Color();
  G.applyEnv = function () {
    const L = G.level; if (!L) return; const c = G.creep, mul = G.lightMul;
    _c1.setHex(L.fog0[0]); _c2.setHex(L.fog1[0]); _c1.lerp(_c2, c);
    L.scene.fog.color.copy(_c1); L.scene.background.copy(_c1); L.scene.fog.density = lerp(L.fog0[1], L.fog1[1], c * c * 0.4 + c * 0.6);
    if (L.ambient) L.ambient.intensity = L.ambBase * (1 - 0.5 * c) * mul;
    L.lamps.forEach((l) => { l.light.intensity = l.base * (1 - (l.ck || 0.3) * c) * (l.flick ? mul : 1); if (l.halo) l.halo.material.opacity = 0.9 * (l.flick ? mul : 1) * (1 - 0.4 * c); });
    L.bulbMat.color.setRGB(1 * mul, 0.92 * mul, 0.72 * mul);
    L.lamps.forEach((l) => { if (l.bulb) l.bulb.color.setRGB(1 * mul, 0.92 * mul, 0.72 * mul); });
    L.skies.forEach((s) => { s.mat.color.copy(s.day).lerp(s.night, clamp(c * 1.4, 0, 1)); const k = 1 - clamp(c * 1.7, 0, 1); s.beams.forEach((b) => { b.opacity = b.userData.base * k; }); });
    if (B.setEnvLevel) B.setEnvLevel((1 - 0.7 * c) * (0.35 + 0.65 * mul));
    const cs = L.def.scene ? 0 : c, f = cs < 0.03 ? '' : 'saturate(' + (1 - 0.6 * cs).toFixed(2) + ')';
    if (f !== G.lastFilter) { $('c').style.filter = f; G.lastFilter = f; }
    $('vignette').style.opacity = (0.22 + 0.62 * cs).toFixed(2);
    $('glow').style.opacity = (0.95 * (1 - clamp(cs * 1.6, 0, 1))).toFixed(2);
    if (G.dread) G.dread.env(L);
  };
  G.bumpCreep = function (a) { G.bump = Math.min(0.5, G.bump + a); };
  function updateCreep(dt) {
    const L = G.level, def = L.def; if (def.scene) return;
    const base = def.creepBase || 0, span = def.creepTime || 480;
    const prog = L.progress ? clamp(L.progress(), 0, 1) : 0;
    let target = base + (0.95 - base) * clamp(0.55 * (L.time / span) + 0.45 * prog, 0, 1) + G.bump * (1 - base);
    // friendly start: the creep level may only rise as fast as this slowly opening cap allows
    const ez = def.ease;
    if (ez) { const k = clamp((L.time - ez.hold) / ez.ramp, 0, 1), sm = k * k * (3 - 2 * k); target = Math.min(target, ez.floor + (1 - ez.floor) * sm); }
    if (G.creepOverride !== undefined) target = G.creepOverride;
    target = clamp(target, 0, 1);
    G.creep += (target - G.creep) * Math.min(1, dt * (ez && G.creepOverride === undefined ? 0.3 : 0.6));
    if (Math.abs(G.creep - (G._sc || 0)) > 0.01) { G._sc = G.creep; Snd.setCreep(G.creep); }
    L.events.forEach((e) => { if (!e.done && G.creep >= e.at) { e.done = true; e.run(L, G); } });
  }
  function updateFlicker(dt) {
    const f = G.fl, c = G.creep, L = G.level;
    if (f.dur > 0) {
      f.dur -= dt; f.tick -= dt;
      if (f.black) f.mul = f.blackMul !== undefined ? f.blackMul : 0.03;
      else if (f.tick <= 0) { f.mul = Math.random() < 0.55 ? rnd(0.05, 0.4) : 1; f.tick = rnd(0.03, 0.1); }
      if (f.dur <= 0) { f.mul = 1; f.black = false; f.blackMul = undefined; }
    } else if (!L.def.scene && c > 0.12 && !G.uiOpen) {
      f.next -= dt * (0.5 + c * 2);
      if (f.next <= 0) {
        f.dur = rnd(0.35, 0.9); f.tick = 0; f.next = rnd(14, 28) * (1.3 - c);
        if (c > 0.25 && G.molly.present && Math.random() < 0.7) { f.black = true; f.dur = 0.35; G.molly.pending = 0.15; G.molly.blackout = true; }
        Snd.click(); if (c > 0.3) Snd.thump(0.12);
      }
    }
    G.lightMul = f.mul;
  }

  /* ======================= COLLISION ======================= */
  function blocked(x, z) {
    const r = G.player.r, cs = G.level.colliders;
    for (let i = 0; i < cs.length; i++) { const c = cs[i]; if (c.enabled !== false && x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) return true; }
    return false;
  }
  G.blockedAt = blocked;
  function pointInSolid(x, z, m) {
    const cs = G.level.colliders;
    for (let i = 0; i < cs.length; i++) { const c = cs[i]; if (c.enabled !== false && x + m > c.minX && x - m < c.maxX && z + m > c.minZ && z - m < c.maxZ) return true; }
    return false;
  }
  // line of sight (2D) against non-low colliders
  function los(x1, z1, x2, z2) {
    const cs = G.level.colliders, dx = x2 - x1, dz = z2 - z1;
    for (let i = 0; i < cs.length; i++) {
      const c = cs[i]; if (c.enabled === false || c.low) continue;
      let t0 = 0, t1 = 1;
      if (Math.abs(dx) < 1e-9) { if (x1 < c.minX || x1 > c.maxX) continue; } else {
        let a = (c.minX - x1) / dx, b = (c.maxX - x1) / dx; if (a > b) { const t = a; a = b; b = t; } t0 = Math.max(t0, a); t1 = Math.min(t1, b);
      }
      if (Math.abs(dz) < 1e-9) { if (z1 < c.minZ || z1 > c.maxZ) continue; } else {
        let a = (c.minZ - z1) / dz, b = (c.maxZ - z1) / dz; if (a > b) { const t = a; a = b; b = t; } t0 = Math.max(t0, a); t1 = Math.min(t1, b);
      }
      if (t0 <= t1 && t1 > 0.001 && t0 < 0.999) return false;
    }
    return true;
  }
  G.los = los;

  /* ======================= PLAYER ======================= */
  function movePlayer(dt) {
    const p = G.player, k = G.keys;
    let f = 0, s = 0;
    if (k.KeyW || k.ArrowUp) f += 1; if (k.KeyS || k.ArrowDown) f -= 1;
    if (k.KeyD || k.ArrowRight) s += 1; if (k.KeyA || k.ArrowLeft) s -= 1;
    if (G.noLock && !G.locked) { /* fallback turning with Q / Z */ if (k.KeyQ) p.yaw += dt * 1.8; if (k.KeyZ) p.yaw -= dt * 1.8; }
    if (!f && !s) { p.bob *= 0.9; return; }
    const l = Math.hypot(f, s); f /= l; s /= l;
    const speed = (k.ShiftLeft || k.ShiftRight ? 4.0 : 2.6) * dt;
    const sy = Math.sin(p.yaw), cy = Math.cos(p.yaw);
    const dx = (-sy * f + cy * s) * speed, dz = (-cy * f - sy * s) * speed;
    let moved = 0;
    if (blocked(p.x, p.z)) { p.x += dx; p.z += dz; moved += Math.abs(dx) + Math.abs(dz); }   // already overlapping a (sliding) collider: let the player walk out instead of being stuck
    else {
      if (!blocked(p.x + dx, p.z)) { p.x += dx; moved += Math.abs(dx); }
      if (!blocked(p.x, p.z + dz)) { p.z += dz; moved += Math.abs(dz); }
    }
    p.moved += moved; p.bob += moved * 5.5;
    G.stepAcc += moved; if (G.stepAcc > 0.85) { G.stepAcc = 0; Snd.step(0.045); }
  }
  G.teleport = function (x, z, yaw) { const p = G.player; p.x = x; p.z = z; if (yaw !== undefined) p.yaw = yaw; };
  let shakeAmt = 0;
  function updateCamera(dt) {
    const p = G.player;
    const bob = Math.sin(p.bob) * 0.025;
    camera.position.set(p.x, p.h + bob, p.z);
    camera.rotation.set(p.pitch, p.yaw, 0);
    if (shakeAmt > 0) { camera.position.x += rnd(-1, 1) * shakeAmt; camera.position.y += rnd(-1, 1) * shakeAmt; camera.rotation.z = rnd(-1, 1) * shakeAmt * 1.5; }
    const L = G.level;
    if (L && L.carryLight) L.carryLight.position.set(p.x, p.h + 0.2, p.z);
  }
  function forward(out) { const p = G.player; return out.set(-Math.sin(p.yaw) * Math.cos(p.pitch), Math.sin(p.pitch), -Math.cos(p.yaw) * Math.cos(p.pitch)); }

  /* ======================= INTERACTION ======================= */
  const _f = new THREE.Vector3();
  function updateInteract() {
    const L = G.level, p = G.player; let best = null, bs = -1;
    if (G.state === 'play' && !G.uiOpen) {
      forward(_f);
      for (let i = 0; i < L.interactables.length; i++) {
        const o = L.interactables[i];
        if (o.enabled && !(typeof o.enabled === 'function' ? o.enabled() : o.enabled)) continue;
        if (o.hidden) continue;
        const dx = o.x - p.x, dy = (o.y) - p.h, dz = o.z - p.z, d = Math.hypot(dx, dy, dz);
        if (d > o.r) continue;
        const dot = (dx * _f.x + dy * _f.y + dz * _f.z) / (d || 1);
        const need = d < 0.9 ? 0.2 : 0.8;
        if (dot < need) continue;
        const sc = dot - d * 0.08; if (sc > bs) { bs = sc; best = o; }
      }
    }
    G.target = best;
    const el = $('prompt');
    if (best) { el.innerHTML = '<b>E</b> ' + (typeof best.label === 'function' ? best.label() : best.label); el.classList.add('show'); $('crosshair').classList.add('hot'); }
    else { el.classList.remove('show'); $('crosshair').classList.remove('hot'); }
  }
  G.interact = function () { const t = G.target; if (t && G.state === 'play' && !G.uiOpen) { t.onUse(t); } };
  function updateTriggers() {
    const L = G.level, p = G.player;
    L.triggers.forEach((t) => {
      if (t.done || (t.enabled && !(typeof t.enabled === 'function' ? t.enabled() : t.enabled))) return;
      if (Math.hypot(p.x - t.x, p.z - t.z) < t.r) { if (t.once !== false) t.done = true; t.onEnter(t); }
    });
  }

  /* ======================= MOLLY AI ======================= */
  const _v = new THREE.Vector3();
  function isSeen(x, z, y0, y1) {
    const p = G.player; forward(_f);
    if (!los(p.x, p.z, x, z)) return false;
    const ys = [y0, (y0 + y1) / 2, y1];
    for (let i = 0; i < 3; i++) {
      _v.set(x, ys[i], z).sub(camera.position); const l = _v.length(); if (l < 0.01) return true;
      if (_v.dot(_f) / l < 0.1) continue;
      _v.set(x, ys[i], z).project(camera);
      if (_v.z < 1 && Math.abs(_v.x) < 1.02 && Math.abs(_v.y) < 1.05) return true;
    }
    return false;
  }
  G.isSeen = isSeen;
  function dangerOn() {
    const L = G.level;
    if (G.dangerForce !== undefined) return G.dangerForce;
    return L.molly && L.def.danger !== false && !G.uiOpen && L.time > L.grace && G.creep >= L.dangerAt;
  }
  function ringSpot(r) {
    const p = G.player;
    for (let i = 0; i < 28; i++) {
      const a = rnd(0, Math.PI * 2), rr = r * rnd(0.9, 1.1), x = p.x + Math.cos(a) * rr, z = p.z + Math.sin(a) * rr;
      if (pointInSolid(x, z, 0.35)) continue;
      if (G.level.bounds && (x < G.level.bounds[0] || x > G.level.bounds[2] || z < G.level.bounds[1] || z > G.level.bounds[3])) continue;
      if (isSeen(x, z, 0.1, 1.1)) continue;
      if (r < 9 && !los(p.x, p.z, x, z)) continue;
      return { x: x, z: z, y: 0 };
    }
    return null;
  }
  function pickSpot(avoidDist) {
    const L = G.level, p = G.player, c = G.creep, td = lerp(13, 3.6, Math.pow(c, 1.1));
    let best = null, bs = -1e9;
    L.spots.forEach((s) => {
      const d = Math.hypot(s.x - p.x, s.z - p.z); if (d < 1.9) return;
      if (isSeen(s.x, s.z, (s.y || 0) + 0.1, (s.y || 0) + 1.1)) return;
      let sc = -Math.abs(d - td) + (los(p.x, p.z, s.x, s.z) ? 2.5 : 0) + rnd(0, 3.5);
      if (G.molly.last === s) sc -= 5;
      if (sc > bs) { bs = sc; best = s; }
    });
    return best;
  }
  // a spot just outside the edge of your view (about 60-75 degrees to the side): one small head turn and she is right there
  function edgeSpot(r) {
    const p = G.player, L = G.level;
    for (let i = 0; i < 30; i++) {
      const th = (Math.random() < 0.5 ? -1 : 1) * rnd(1.0, 1.3), rr = r * rnd(0.9, 1.1), fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), c = Math.cos(th), sn = Math.sin(th);
      const x = p.x + (fx * c - fz * sn) * rr, z = p.z + (fx * sn + fz * c) * rr;
      if (pointInSolid(x, z, 0.35)) continue;
      if (L.bounds && (x < L.bounds[0] || x > L.bounds[2] || z < L.bounds[1] || z > L.bounds[3])) continue;
      if (isSeen(x, z, 0.1, 1.1) || !los(p.x, p.z, x, z)) continue;
      return { x: x, z: z, y: 0 };
    }
    return null;
  }
  function placeMolly(s) {
    const M_ = G.molly, p = G.player, m = M_.mesh, dk = G.dread ? G.dread.k : 0;
    m.position.set(s.x, s.y || 0, s.z); m.rotation.y = Math.atan2(p.x - s.x, p.z - s.z) + (s.face !== undefined ? 0 : rnd(-0.25, 0.25));
    if (s.face !== undefined) m.rotation.y = s.face;
    // how she stands: facing you, head tilted (grows while you watch), or (3D doll only) turned away until you look at her
    M_.stance = 'face'; M_.faceT = 0;
    if (s.face === undefined && dk > 0.3) { const r = Math.random(); if (r < 0.1 + 0.32 * dk) M_.stance = 'tilt'; else if (r < 0.18 + 0.42 * dk && !m.userData.billboard) M_.stance = 'away'; }
    m.rotation.z = M_.stance === 'tilt' ? (Math.random() < 0.5 ? -1 : 1) * rnd(0.2, 0.3) : rnd(-0.07, 0.07);
    if (M_.stance === 'away') m.rotation.y += Math.PI;
    M_.tiltDir = m.rotation.z < 0 ? -1 : 1;
    m.visible = true; M_.present = true; M_.last = s; M_.seen = 0;
    m.userData.lookEyes(0, 0);
  }
  G.placeMollyEdge = function (a, b) {
    const M_ = G.molly, L = G.level; if (!L.molly || !M_.mesh || L.palActive || G.creep < L.mollyStart) return false;
    const s = edgeSpot(rnd(a, b)); if (!s) return false; placeMolly(s); M_.dist = Math.hypot(s.x - G.player.x, s.z - G.player.z); M_.timer = rnd(5, 8); return true;
  };
  function relocate() {
    const M_ = G.molly, L = G.level, c = G.creep, p = G.player;
    const danger = dangerOn();
    let spot = null;
    if (danger) {
      const cur = M_.present ? M_.dist : 12;
      let r = M_.present ? cur - rnd(1.2, 2.6) : rnd(8, 10);
      if (M_.vanishUntil && L.time < M_.vanishUntil) { M_.timer = 1.5; return; }
      if (r < 1.3 && M_.present) { M_.mesh.visible = true; G.caughtBy = 'grab'; G.caught(); return; }
      r = clamp(r, 1.3, 11);
      spot = ringSpot(r);
      if (G.dread && G.dread.k > 0.4 && r > 3 && Math.random() < 0.16 + 0.16 * G.dread.k) spot = edgeSpot(r) || spot;
      M_.timer = lerp(6.5, 3.6, c) + rnd(0, 1.6);
    } else {
      spot = pickSpot();
      if (G.dread && G.dread.k > 0.4 && Math.random() < 0.15 + 0.15 * G.dread.k) spot = edgeSpot(lerp(9, 4.5, c)) || spot;
      if (!spot && Math.random() < 0.5) spot = ringSpot(lerp(12, 5, c));
      M_.timer = lerp(17, 7, c) + rnd(0, 4);
    }
    if (!spot) { M_.timer = 1.5; return; }
    // tension: sometimes everything goes silent for a moment, and only then she is there... (or she is not: if you turned, nothing appears)
    const dd0 = Math.hypot(spot.x - p.x, spot.z - p.z);
    if (G.dread && G.dread.k > 0.45 && dd0 < 7 && L.time > (M_.silT || 0) && Math.random() < 0.4) {
      M_.silT = L.time + 26; G.hideMolly(); Snd.duck(0.95, 1.4, 0.5); M_.defer = { spot: spot, t: 1.15 }; M_.timer = 4; return;
    }
    placeMolly(spot);
    M_.dist = Math.hypot(spot.x - p.x, spot.z - p.z);
    const cc = G.creep;
    if (cc > 0.2 && M_.dist < 14) { if (Math.random() < 0.6) Snd.boxNote(1 + (Math.random() * 7 | 0), 0, 0.12); if (cc > 0.45 && Math.random() < 0.5) Snd.giggle(0.1); }
  }
  G.hideMolly = function () { const m = G.molly; if (m.mesh) m.mesh.visible = false; m.present = false; };
  G.placeMolly = function (x, z, y) { if (!G.molly.mesh) return; placeMolly({ x: x, z: z, y: y || 0 }); G.molly.dist = Math.hypot(x - G.player.x, z - G.player.z); };
  function updateMolly(dt) {
    const M_ = G.molly, L = G.level, p = G.player;
    if (!L.molly || !M_.mesh || G.uiOpen) return;
    if (L.palActive) return;      // the friendly Molly is still sitting in the room
    if (G.creep < L.mollyStart && !G.dangerForce) { M_.defer = null; if (M_.present && !L.keepMolly) G.hideMolly(); return; }
    if (M_.defer) {      // the silence before she appears
      const df = M_.defer; df.t -= dt;
      if (df.t <= 0) {
        M_.defer = null; const s = df.spot;
        if (!isSeen(s.x, s.z, 0.1, 1.1) && !pointInSolid(s.x, s.z, 0.3)) { placeMolly(s); M_.dist = Math.hypot(s.x - p.x, s.z - p.z); Snd.heartbeat(0.22); if (M_.dist < 6) Snd.breath(0.05); }
        else Snd.thump(0.1);       // you turned in time: nothing is there
      }
      return;
    }
    const m = M_.mesh;
    M_.dist = Math.hypot(m.position.x - p.x, m.position.z - p.z);
    const sc = L.mollyScale;
    const seen = m.visible && isSeen(m.position.x, m.position.z, m.position.y + 0.1 * sc, m.position.y + 1.1 * sc);
    M_.timer -= dt;
    if (seen) M_.seen += dt; else M_.seen = 0;
    const dk = G.dread ? G.dread.k : 0;
    if (seen && !M_.wasVisible && dk > 0.4 && M_.dist < 10) { Snd.thump(0.1); G.dread.pulse = Math.max(G.dread.pulse, 0.4); }
    // while you watch her she holds perfectly still... but her head slowly tilts, or (3D doll) she slowly turns to face you
    if (seen && M_.stance === 'tilt') m.rotation.z += (M_.tiltDir * 0.5 - m.rotation.z) * Math.min(1, dt * 0.2);
    if (seen && M_.stance === 'away') { M_.faceT += dt; if (M_.faceT > 0.9) { let d = Math.atan2(p.x - m.position.x, p.z - m.position.z) - m.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); m.rotation.y += d * Math.min(1, dt * 1.3); } }
    // when you are not looking she creeps closer, very slowly, but never nearer than 2.6 m by herself
    if (dk > 0.45 && !seen && M_.present && M_.dist > 2.6 && dangerOn() && los(p.x, p.z, m.position.x, m.position.z)) {
      const sp = lerp(0.1, 0.28, clamp((dk - 0.45) / 0.55, 0, 1)) * dt, nx = m.position.x + (p.x - m.position.x) / M_.dist * sp, nz = m.position.z + (p.z - m.position.z) / M_.dist * sp;
      if (!pointInSolid(nx, nz, 0.3)) { m.position.x = nx; m.position.z = nz; }
    }
    if (M_.wasVisible && !seen && M_.present && G.creep > 0.1 && Math.random() < 0.8) M_.pending = rnd(0.15, 0.7);
    M_.wasVisible = seen;
    if (M_.pending > 0) { M_.pending -= dt; if (M_.pending <= 0 && !seen) { relocate(); M_.blackout = false; } }
    if (M_.timer <= 0 && !seen) relocate();
    // if she is watched for a long while while close, she gives up and vanishes (fair play)
    if (dangerOn() && seen && M_.dist < 6 && M_.seen > 2.4) { G.hideMolly(); M_.vanishUntil = L.time + rnd(7, 11); M_.timer = rnd(8, 12); Snd.giggle(0.08); }
    // idle sway when she is in view
    if (m.visible && seen && m.userData.head) m.userData.head.rotation.z = Math.sin(L.time * 0.8) * 0.04;
    if (dangerOn() && M_.present && M_.dist < 1.05) { G.caughtBy = 'touch'; G.caught(); }
  }

  /* ======================= AMBIENT SOUND ======================= */
  function updateSounds(dt) {
    const c = G.creep, S = G.sfx, M_ = G.molly, L = G.level;
    if (L.def.scene || G.uiOpen) return;
    const evt = (key, min, a, b, fn) => { if (c < min) return; S[key] -= dt; if (S[key] <= 0) { S[key] = lerp(a, b, c) * rnd(0.7, 1.3); fn(); } };
    evt('creak', 0.1, 32, 11, () => Snd.creak(0.06 + c * 0.06));
    evt('giggle', 0.18, 45, 10, () => Snd.giggle(0.05 + c * 0.08));
    evt('whisper', 0.3, 30, 9, () => Snd.whisper(0.05 + c * 0.06));
    evt('box', 0.22, 55, 16, () => {
      const notes = L.def.boxTune || [3, 5, 6, 5, 3, 1].slice(0, 4 + (Math.random() * 3 | 0));
      Snd.boxMelody(notes, 0.6, 0.07 + c * 0.05, rnd(-0.6, 0.6));
    });
    // heartbeat
    let hi = clamp((c - 0.55) / 0.45, 0, 1) * 0.7;
    if (M_.present && M_.dist < 8 && (dangerOn() || (G.dread && G.dread.k > 0.4))) hi = Math.max(hi, (8 - M_.dist) / 8);
    if (hi > 0.05) { S.heart -= dt; if (S.heart <= 0) { S.heart = lerp(1.15, 0.5, hi); Snd.heartbeat(0.1 + hi * 0.3); } }
  }

  /* ======================= WORLD CHANGES ======================= */
  function updateShifters(dt) {
    const L = G.level, c = G.creep; if (!L.shifters.length || c < 0.2 || G.uiOpen) return;
    L.shiftTimer -= dt * (0.6 + c * 2);
    if (L.shiftTimer > 0) return;
    L.shiftTimer = rnd(10, 18);
    const cand = L.shifters.filter((s) => !isSeen(s.obj.position.x, s.obj.position.z, s.obj.position.y, s.obj.position.y + 0.5));
    if (!cand.length) return;
    const s = cand[Math.random() * cand.length | 0], o = s.obj, h = o.userData.home;
    if (!s.moved) { o.position.set(s.alt.x !== undefined ? s.alt.x : h.x, s.alt.y !== undefined ? s.alt.y : h.y, s.alt.z !== undefined ? s.alt.z : h.z); o.rotation.y = s.alt.ry !== undefined ? s.alt.ry : h.ry; if (s.alt.rz !== undefined) o.rotation.z = s.alt.rz; s.moved = true; }
    else { o.position.set(h.x, h.y, h.z); o.rotation.y = h.ry; o.rotation.z = h.rz || 0; s.moved = false; }
    if (c > 0.3) Snd.thump(0.08);
  }

  /* ======================= JUMPSCARE ======================= */
  G.caught = function () {
    if (G.state !== 'play' && G.state !== 'trans') return;
    if (!G.molly.mesh) return;
    G.state = 'scare'; G.closePanel(); G.token();
    const m = G.molly.mesh, p = G.player;
    G.scareT = 0; m.visible = true; m.userData.setScare(false); m.rotation.z = 0;
    Snd.jump(); Snd.jumpTail && Snd.jumpTail(); m.userData.glitch = true; document.exitPointerLock && document.exitPointerLock();
    G.scareLight = G.mollyLight; G.scareLight.intensity = 3; G.scareLight.distance = 6;
    $('prompt').classList.remove('show'); $('hintbox').classList.remove('show'); $('subtitle').classList.remove('show'); $('hud').style.visibility = 'hidden';
    p.pitch = 0;
  };
  function updateScare(dt) {
    const t = (G.scareT += dt), p = G.player, m = G.molly.mesh, sc = G.level.mollyScale * 1.35;
    const k = clamp(t / 0.22, 0, 1), dist = lerp(2.2, 0.68, k * k * (3 - 2 * k));
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
    // turn the camera to her first (she is somewhere), then place her right in front of the player
    m.scale.setScalar(sc * (1 + Math.min(0.35, t * 0.25)));
    m.position.set(p.x + fx * dist, p.h - 0.97 * m.scale.y + 0.02, p.z + fz * dist);
    m.rotation.y = Math.atan2(-fx, -fz);
    if (t > 0.12) m.userData.setScare(true);
    m.userData.head.rotation.z = Math.sin(t * 40) * 0.08;
    G.scareLight.position.set(p.x + fx * 0.3, p.h + 0.2, p.z + fz * 0.3);
    // stronger: a fast zoom-in punch that slowly creeps further, harder shake, VHS / scanline tear + colour split in dread.js (one decaying flash, no strobing)
    const zk = clamp(t / 0.14, 0, 1), zz = zk * zk * (3 - 2 * zk), back = clamp((t - 0.45) / 1.8, 0, 1);
    camera.fov = 72 - 19 * zz + 5 * back; camera.updateProjectionMatrix();
    shakeAmt = t < 2.0 ? (t < 0.5 ? 0.085 : 0.07 * (1 - (t - 0.5) / 1.5)) : 0;
    if (G.dread) G.dread.scareFx = t < 0.6 ? 1 : clamp(1 - (t - 0.6) / 1.6, 0, 1);
    const fl = $('flash'); fl.style.opacity = t < 0.08 ? 1 : 0.4 * Math.max(0, 1 - (t - 0.08) / 0.55);
    fl.style.background = t < 0.08 ? '#fff' : '#c9d8ff';
    if (t > 2.3 && G.state === 'scare') {
      G.state = 'caught'; shakeAmt = 0; fl.style.opacity = 0; G.scareLight.intensity = 0; G.scareLight.distance = 4.5;
      camera.fov = 72; camera.updateProjectionMatrix(); if (G.dread) G.dread.scareFx = 0; m.userData.glitch = false;
      m.userData.setScare(false); m.scale.setScalar(G.level.mollyScale);
      $('caught').classList.remove('hidden'); Snd.heartbeat(0.2);
    }
  }
  G.restartLevel = function () {
    const def = G.level.def; $('caught').classList.add('hidden'); shakeAmt = 0; camera.fov = 72; camera.updateProjectionMatrix(); if (G.dread) G.dread.scareFx = 0;
    const id = G.token();
    G.state = 'trans';
    G.fade(true, 300).then(() => {
      if (id !== G.flowId) return;
      G.loadLevel(def); G.lockPointer();
      return G.fade(false, 700);
    }).then(() => { if (id === G.flowId) { G.state = 'play'; if (def.start) def.start(G.level, G); G.say('Try again... you can do it, Emily.', 3500); } });
  };

  /* ======================= FLOW ======================= */
  G.levelById = (n) => window.LEVELS.filter((l) => l.id === n)[0];
  G.save = function (n) { try { localStorage.setItem('molly_save', JSON.stringify({ level: n })); } catch (e) {} };
  G.loadSave = function () { try { const s = JSON.parse(localStorage.getItem('molly_save') || 'null'); return s && s.level ? s.level : 0; } catch (e) { return 0; } };
  G.startScene = async function (name) {
    const id = G.token(); G.hideAll(); G.state = 'trans';
    await G.fade(true, 400); if (id !== G.flowId) return;
    G.loadLevel(window.SCENES[name]); Snd.init();
    await G.fade(false, 900); if (id !== G.flowId) return;
    G.state = 'play'; if (G.level.def.start) G.level.def.start(G.level, G);
  };
  G.goLevel = async function (n) {
    const def = G.levelById(n);
    if (!def) { return G.startScene('ending'); }
    const id = G.token(); G.hideAll(); G.state = 'trans'; G.closePanel();
    await G.fade(true, 700); if (id !== G.flowId) return;
    Snd.music(null); Snd.hum(false); $('c').style.filter = ''; G.lastFilter = '';
    if (def.card) await G.bigText(def.card, 3200, 'card'); if (id !== G.flowId) return;
    G.loadLevel(def); Snd.init(); G.save(n);
    if (!G.noLock && !G.locked) lockPointer();
    await G.fade(false, 1000); if (id !== G.flowId) return;
    G.state = 'play'; if (def.start) def.start(G.level, G);
  };
  G.completeLevel = async function () {
    if (G.state !== 'play') return;
    const def = G.level.def, id = G.token(); G.state = 'trans'; G.closePanel();
    Snd.chime();
    await G.fade(true, 1400, '#fff'); if (id !== G.flowId) return;
    G.save(def.id + 1 > 4 ? 1 : def.id + 1);
    G.goLevel(def.id + 1);
  };
  G.newGame = function () { G.hintsUsed = 0; try { localStorage.setItem('molly_hints', '0'); } catch (e) {} Snd.init(); lockPointer(); G.hideAll(); G.startScene('store'); };
  G.continueGame = function () { try { G.hintsUsed = Math.min(3, parseInt(localStorage.getItem('molly_hints') || '0', 10) || 0); } catch (e) {} const n = G.loadSave(); Snd.init(); lockPointer(); G.hideAll(); if (n) G.goLevel(n); else G.newGame(); };
  G.toTitle = function () {
    G.token(); G.closePanel(); document.exitPointerLock && document.exitPointerLock();
    if (window.Secrets) window.Secrets.show(false);
    G.state = 'title'; ['caught', 'pause', 'endcard'].forEach((i) => $(i).classList.add('hidden')); $('title').classList.remove('hidden');
    G.setObjective(''); G.setInventory(''); $('hintbox').classList.remove('show'); $('subtitle').classList.remove('show'); $('prompt').classList.remove('show');
    $('hud').style.visibility = ''; $('fade').style.opacity = 0; $('c').style.filter = ''; G.lastFilter = ''; $('vignette').style.opacity = 0.5;
    shakeAmt = 0; camera.fov = 72; camera.updateProjectionMatrix(); if (G.dread) { G.dread.scareFx = 0; G.dread.k = 0; } Snd.tension && Snd.tension(0);
    Snd.stopAll(); Snd.music('lullaby'); refreshContinue(); disposeLevel(); G.scene = titleScene; G.level = null;
  };
  function refreshContinue() { const n = G.loadSave(); const b = $('btn-continue'); b.classList.toggle('hidden', !n); if (n) b.textContent = 'Continue (Level ' + n + ')'; }

  /* ======================= DUST + MOLLY LIGHT ======================= */
  const DUST_N = 130, DUST_R = 5.5;
  function makeDust(L) {
    const pos = new Float32Array(DUST_N * 3), vel = [];
    for (let i = 0; i < DUST_N; i++) { pos[i * 3] = rnd(-DUST_R, DUST_R); pos[i * 3 + 1] = rnd(0.1, 2.6); pos[i * 3 + 2] = rnd(-DUST_R, DUST_R); vel.push([rnd(-0.03, 0.03), rnd(-0.015, 0.02), rnd(-0.03, 0.03), rnd(0, 6)]); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ map: Tex.dust(), size: 0.032, sizeAttenuation: true, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff0cc }));
    pts.frustumCulled = false; L.scene.add(pts); L.dust = { pts: pts, vel: vel, pos: pos };
  }
  function updateDust(L, dt, cx, cz, t) {
    const d = L.dust; if (!d) return; const a = d.pos, v = d.vel;
    for (let i = 0; i < DUST_N; i++) {
      const o = i * 3; a[o] += (v[i][0] + Math.sin(t * 0.3 + v[i][3]) * 0.02) * dt; a[o + 1] += (v[i][1] + Math.sin(t * 0.5 + v[i][3]) * 0.012) * dt; a[o + 2] += (v[i][2] + Math.cos(t * 0.27 + v[i][3]) * 0.02) * dt;
      if (a[o] - cx > DUST_R) a[o] -= DUST_R * 2; else if (a[o] - cx < -DUST_R) a[o] += DUST_R * 2;
      if (a[o + 2] - cz > DUST_R) a[o + 2] -= DUST_R * 2; else if (a[o + 2] - cz < -DUST_R) a[o + 2] += DUST_R * 2;
      if (a[o + 1] > 2.7) a[o + 1] = 0.1; else if (a[o + 1] < 0.05) a[o + 1] = 2.6;
    }
    d.pts.geometry.attributes.position.needsUpdate = true;
    d.pts.material.opacity = 0.55 * (1 - 0.45 * clamp(G.creep * 1.4, 0, 1));
  }
  function updateMollyLight() {
    const ml = G.mollyLight, mm = G.molly.mesh; if (!ml || !mm || G.state === 'scare' || G.state === 'caught') return;
    if (mm.visible) { const ry = mm.rotation.y, k = mm.scale.y; ml.position.set(mm.position.x + Math.sin(ry) * 0.9 * k, mm.position.y + 0.9 * k, mm.position.z + Math.cos(ry) * 0.9 * k); ml.intensity = 2.2; } else ml.intensity = 0;
  }

  /* ======================= TITLE SCENE ======================= */
  function buildTitle() {
    titleScene = new THREE.Scene(); titleScene.background = new THREE.Color(0x1c1226); titleScene.fog = new THREE.FogExp2(0x1c1226, 0.045);
    titleScene.environment = B.envTex || null;
    titleScene.add(new THREE.HemisphereLight(0xb8a8e0, 0x6a4a40, 1.25));
    const l = new THREE.PointLight(0xffb878, 34, 14, 2); l.position.set(1.8, 2.1, 2.4); titleScene.add(l);
    const l2 = new THREE.PointLight(0x7a8cff, 12, 14, 2); l2.position.set(-2.4, 1.6, -1.0); titleScene.add(l2);
    const floor = new THREE.Mesh(B.uvScale(new THREE.PlaneGeometry(14, 14), 5, 5), M.t(Tex.wood('#a87a4b', '#8d5f36'))); floor.rotation.x = -Math.PI / 2; titleScene.add(floor);
    const wall = new THREE.Mesh(B.uvScale(new THREE.PlaneGeometry(14, 5), 5, 2), M.t(Tex.wallpaper('#d9c2cf', '#b88aa6'))); wall.position.set(0, 2.5, -3.6); titleScene.add(wall);
    const rug = B.rug(3.4, 2.4, 0xd96a8a, 0xf6d6df); rug.position.set(0.9, 0, 0.2); titleScene.add(rug);
    titleMolly = B.molly(1.5); titleScene.add(titleMolly); titleMolly.userData.sit(false);
    titleMolly.userData.waveOn = false;
    const bl = B.toyBlocks(5); bl.position.set(-0.9, 0, 0.6); bl.rotation.y = 0.4; titleScene.add(bl);
    const t1 = B.teddy(0xb07a45); t1.position.set(-1.7, 0, -0.4); t1.rotation.y = 0.6; t1.scale.setScalar(1.6); titleScene.add(t1);
    const b1 = B.bunny(); b1.position.set(-0.4, 0, 1.3); b1.rotation.y = 0.3; b1.scale.setScalar(1.3); titleScene.add(b1);
    const c1 = B.toyCar(0xe53935); c1.position.set(2.5, 0, 1.0); c1.rotation.y = -0.6; c1.scale.setScalar(1.7); titleScene.add(c1);
    const sh = B.shelfUnit(2.2, 2.0, 0.5, 3, 0xffffff); sh.position.set(-2.8, 0, -3.3); titleScene.add(sh);
    sh.userData.levels.forEach((y, i) => { const t = [B.teddy(0xe8a0b4), B.robot(0x5a9ae8), B.bunny()][i]; t.position.set(-0.3 + i * 0.1, y + 0.04, 0); sh.add(t); });
    const sh2 = B.shelfUnit(2.2, 2.0, 0.5, 3, 0xffffff); sh2.position.set(3.2, 0, -3.3); titleScene.add(sh2);
    sh2.userData.levels.forEach((y, i) => { const t = [B.rocket(), B.toyBlocks(3), B.duck()][i]; t.position.set(0.1, y + 0.04, 0); sh2.add(t); });
    B.bake(sh); B.bake(sh2);
    const win = B.window(1.4, 1.5, { beam: false, y: 1.6, curtain: '#e8a6c0' }); win.position.set(0.9, 1.9, -3.55); titleScene.add(win); win.userData.sky.color.setHex(0x40407a);
    for (let i = 0; i < 4; i++) { const g = B.glow('rgba(255,210,150,0.5)', 0.5); g.position.set(rnd(-2, 3), rnd(0.5, 2.2), rnd(-1, 1.5)); titleScene.add(g); }
    titleDust = { scene: titleScene, dust: null }; makeDust(titleDust);
  }
  let titleDust = null;
  function renderTitle(dt) {
    titleT += dt; const m = titleMolly, u = m.userData;
    m.rotation.y = -0.4 + Math.sin(titleT * 0.4) * 0.2; m.position.set(0.9, 0, 0);
    u.lookEyes(Math.sin(titleT * 0.5) * 0.8, 0.1);
    u.waveOn = (titleT % 9) > 5.5; u.tick(dt, titleT);
    updateDust(titleDust, dt, 0.9, 0.5, titleT);
    camera.fov = 45; camera.updateProjectionMatrix();
    camera.position.set(0.8 + Math.sin(titleT * 0.2) * 0.1, 1.25, 3.3); camera.rotation.set(-0.02, 0.02, 0);
    renderer.render(titleScene, camera);
    camera.fov = 72; camera.updateProjectionMatrix();
  }

  /* ======================= MAIN LOOP ======================= */
  let last = 0, fpsT = 0, fpsN = 0, fps = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    G.time += dt; fpsT += dt; fpsN++; if (fpsT > 0.5) { fps = fpsN / fpsT; fpsT = 0; fpsN = 0; }
    if (G.state === 'title') { G.sunOn = false; renderTitle(dt); return; }
    const L = G.level; if (!L) return;
    if (G.state === 'play' && !G.uiOpen && G.hadLock && !G.locked && !G.noLock && !G.debug && performance.now() > (G.lockGrace || 0)) G.pause();
    const playing = G.state === 'play' && !G.uiOpen;
    if (G.state === 'scare') updateScare(dt);
    if (playing) { movePlayer(dt); L.time += dt; }
    if (G.state === 'play' || G.state === 'trans') {
      if (playing || G.state === 'trans') { updateCreep(dt); }
      updateFlicker(dt);
      if (playing) { updateMolly(dt); updateSounds(dt); updateShifters(dt); updateTriggers(); }
      L.anims.forEach((a) => a.update(dt, L.time));
      if (L.update) L.update(dt, L.time);
      if (G.dread) G.dread.tick(dt);
      G.applyEnv();
    }
    if (G.state === 'play' || G.state === 'paused') updateInteract();
    updateCamera(dt);
    updateMollyLight(); updateDust(L, dt, G.player.x, G.player.z, G.time);
    if (G.sunOn) { if (G.shadowDirty > 0 || now - (G.lastShadow || 0) > 90) { renderer.shadowMap.needsUpdate = true; G.lastShadow = now; if (G.shadowDirty > 0) G.shadowDirty--; } }
    if (G.dread) G.dread.render(renderer, L.scene, camera); else renderer.render(L.scene, camera);
    if (G.debug) $('dbg').textContent = 'fps ' + fps.toFixed(0) + ' | ' + G.state + ' | creep ' + G.creep.toFixed(2) + ' | molly ' + (G.molly.present ? G.molly.dist.toFixed(1) : '-') + ' | pos ' + G.player.x.toFixed(1) + ',' + G.player.z.toFixed(1) + ' | calls ' + renderer.info.render.calls;
  }

  /* ======================= BOOT ======================= */
  function boot() {
    if (!initGL()) return;
    initInput(); buildTitle();
    $('btn-start').onclick = () => { G.newGame(); };
    $('btn-continue').onclick = () => { G.continueGame(); };
    $('btn-retry').onclick = () => { G.restartLevel(); };
    $('btn-title').onclick = () => { G.toTitle(); };
    $('btn-pause-title').onclick = (e) => { e.stopPropagation(); G.toTitle(); };
    $('btn-hint').onclick = () => G.showHint();
    $('btn-mute').onclick = () => { const m = Snd.toggleMute(); G.toast(m ? 'Sound OFF (M)' : 'Sound ON (M)'); };
    $('btn-again').onclick = () => { G.toTitle(); };
    if (G.debug) $('dbg').classList.remove('hidden');
    document.body.addEventListener('click', () => Snd.init(), { once: true });
    G.state = 'title'; refreshContinue(); G.scene = titleScene;
    $('hud').classList.remove('hidden');
    requestAnimationFrame(frame);
    // debug hooks
    window.__molly = {
      G: G,
      startLevel: (n) => { Snd.init(); G.noLock = true; G.hideAll(); G.state = 'play'; const d = G.levelById(n); G.loadLevel(d); G.state = 'play'; if (d.start) d.start(G.level, G); },
      startScene: (name) => { G.noLock = true; G.hideAll(); G.loadLevel(window.SCENES[name]); G.state = 'play'; const d = window.SCENES[name]; if (d.start) d.start(G.level, G); },
      teleport: (x, z, yaw, pitch) => { G.teleport(x, z, yaw); if (pitch !== undefined) G.player.pitch = pitch; },
      look: (yaw, pitch) => { G.player.yaw = yaw; G.player.pitch = pitch || 0; },
      setCreep: (c) => { G.creepOverride = c; G.creep = c; },
      danger: (on) => { G.dangerForce = on; },
      molly: (x, z, y) => G.placeMolly(x, z, y),
      scare: () => { G.state = 'play'; G.caught(); },
      solve: () => { const L = G.level; return L && L.debugApi && L.debugApi.solve && L.debugApi.solve(); },
      api: () => (G.level ? G.level.debugApi : null),
      dread: () => ({ k: G.dread && G.dread.k, scale: G.CREEP_SCALE, creep: G.creep }),
      setScale: (v) => { G.CREEP_SCALE = v; },
      settle: () => { if (G.dread && G.level) { G.dread.k = G.dread.target(G.level); for (let i = 0; i < 40; i++) G.dread.tick(0.05); G.applyEnv(); } },
      run: (id) => G.dread && G.dread.run(id, {}),
      glitch: () => G.dread && G.dread.glitchFrame(),
      secrets: () => window.Secrets && { found: Object.assign({}, window.Secrets.found), count: window.Secrets.count() },
      resetSecrets: () => window.Secrets && window.Secrets.reset(),
      info: () => ({ state: G.state, creep: G.creep, level: G.level && G.level.def.id, pos: [G.player.x, G.player.z, G.player.yaw], calls: renderer.info.render.calls, tris: renderer.info.render.triangles, molly: G.molly.present ? [G.molly.mesh.position.x, G.molly.mesh.position.z] : null })
    };
  }
  function start() {
    const go = () => {
      try { if (window.TEX && TEX.grain) { const gr = $('grain'); gr.style.backgroundImage = 'url(' + TEX.grain + ')'; let n = 0; setInterval(() => { if (++n % 2) gr.style.backgroundPosition = ((Math.random() * 256) | 0) + 'px ' + ((Math.random() * 256) | 0) + 'px'; }, 90); } } catch (e) {}
      boot();
    };
    // wait (at most a few seconds) until the embedded photo textures are decoded, so every level starts with the realistic look
    (B.ready || Promise.resolve()).then(go, go);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
