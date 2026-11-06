/* MOLLY - DREAD: everything that makes the game creepier as the creep level rises.
   Spooky like a kids' scary movie: atmosphere, tension and a few startling moments. Never gore, never violence.
   Nothing in here changes puzzles, answers, hints, saves or the catch rules; at creep 0 (toy store, first ~2.5 min of level 1)
   every function returns early, so the friendly start looks exactly like before.

   D.k  = "dread" 0..~1.25 = smoothstep(creep) * CREEP_SCALE (top of game.js) * the level's own `dread` multiplier.
   Loaded after game.js, before the levels. game.js calls: D.onLoad(L), D.tick(dt), D.env(L), D.render(...). Levels call D.levelN(L, G, refs). */
(function () {
  'use strict';
  const G = window.G, B = window.Build, M = window.Mat, T = window.Tex, Snd = window.Snd;
  const clamp = G.clamp, lerp = G.lerp, rnd = G.rnd;
  const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const D = (window.Dread = { k: 0, pulse: 0, vhs: 0, glitch: 0, scareFx: 0, eyesBoost: 0 });
  G.dread = D;
  const PI = Math.PI;

  /* ============================== per-level state ============================== */
  D.st = function (L) {
    if (!L.dr) L.dr = { peekSpots: [], dyn: null, decals: [], portraits: [], facers: [], doors: [], scripts: [], tubes: null, red: null, lastScript: -99, busy: false, snd: { box: rnd(25, 45), whisper: rnd(20, 35), stat: rnd(40, 70), breath: 6, fs: rnd(35, 60) }, fs: { active: false, left: 0, last: 0, acc: 0, idle: 0 }, peek: null, ghost: null, glow: [], killPlan: [], carry0: null, sunAng: null, emerg: 0, lm: 1 };
    return L.dr;
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ============================== post-processing (cold grade, vignette, chromatic aberration, grain, VHS / glitch) ============================== */
  let rt = null, postMat = null, postScene = null, postCam = null, rtW = 0, rtH = 0;
  const _sz = new THREE.Vector2();
  function initPost(renderer) {
    postMat = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uK: { value: 0 }, uCA: { value: 0 }, uGrain: { value: 0 }, uVig: { value: 0 }, uDesat: { value: 0 }, uCold: { value: 0 }, uExp: { value: 1 }, uPulse: { value: 0 }, uVhs: { value: 0 }, uGlitch: { value: 0 }, uAspect: { value: 1.7 }, uCon: { value: 0 }, uRes: { value: new THREE.Vector2(1280, 720) }, uLift: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: [
        'uniform sampler2D tDiffuse; uniform float uTime, uK, uCA, uGrain, uVig, uDesat, uCold, uExp, uPulse, uVhs, uGlitch, uAspect, uLift, uCon; uniform vec2 uRes; varying vec2 vUv;',
        'float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }',
        'void main(){',
        '  vec2 uv = vUv; vec2 c = uv - 0.5;',
        '  float tk = floor(uTime * 14.0);',
        // VHS tearing: a few random horizontal bands slide sideways; glitch frames shove bigger blocks
        '  float band = floor(uv.y * 46.0);',
        '  float on = step(0.82, h(vec2(band * 1.7, tk))) * uVhs + step(0.9, h(vec2(floor(uv.y * 9.0), tk + 3.0))) * uGlitch;',
        '  uv.x += (h(vec2(band, tk)) - 0.5) * 0.06 * on;',
        '  uv.y += uVhs * 0.004 * sin(uTime * 40.0 + uv.x * 6.0);',
        '  float r2 = dot(c, c);',
        '  vec2 off = c * (uCA * (0.35 + 2.4 * r2));',
        '  vec3 col = vec3(texture2D(tDiffuse, uv + off).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - off).b);',
        // cold, drained colour
        '  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));',
        '  col = mix(col, vec3(l) * vec3(0.84, 0.97, 1.12), uDesat);',
        '  col *= mix(vec3(1.0), vec3(0.88, 0.98, 1.08), uCold);',
        '  col *= uExp * (1.0 + uPulse);',
        '  col = pow(max(col, vec3(0.0)), vec3(1.0 + uCon));',     // deeper shadows, the lit pools stay bright
        // keep the darks from going pure black (readable and playable)
        '  col += uLift * (1.0 - smoothstep(0.0, 0.10, l)) * vec3(0.8, 0.95, 1.1);',
        '  float vg = smoothstep(0.28, 0.95, length(c * vec2(uAspect * 0.62, 1.0) * 1.55));',
        '  col *= 1.0 - uVig * vg;',
        '  col += (h(uv * uRes + uTime * 61.0) - 0.5) * uGrain;',
        '  col *= 1.0 - uVhs * 0.22 * (0.5 + 0.5 * sin(uv.y * uRes.y * 1.5708));',
        '  col += uVhs * 0.05 * (h(uv * vec2(40.0, 300.0) + tk) - 0.5);',
        '  gl_FragColor = vec4(max(col, 0.0), 1.0);',
        '  #include <tonemapping_fragment>',
        '  #include <colorspace_fragment>',
        '}'
      ].join('\n'),
      depthTest: false, depthWrite: false
    });
    postScene = new THREE.Scene(); postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat); q.frustumCulled = false; postScene.add(q);
    renderer.info.autoReset = false;
  }
  D.render = function (renderer, scene, camera) {
    renderer.info.reset();
    const L = G.level, need = L && !L.def.scene && (D.k > 0.02 || D.pulse > 0.01 || D.glitch > 0.01 || D.vhs > 0.01 || D.scareFx > 0.01);
    if (!need || D.broken) { renderer.render(scene, camera); return; }
    try { D.renderPost(renderer, scene, camera); } catch (e) { D.broken = true; renderer.setRenderTarget(null); renderer.render(scene, camera); }
  };
  D.renderPost = function (renderer, scene, camera) {
    const L = G.level;
    if (!postMat) initPost(renderer);
    renderer.getDrawingBufferSize(_sz);
    if (!rt || rtW !== _sz.x || rtH !== _sz.y) {
      if (rt) rt.dispose();
      rtW = _sz.x; rtH = _sz.y;
      rt = new THREE.WebGLRenderTarget(rtW, rtH, { type: THREE.HalfFloatType, samples: 4, depthBuffer: true });
    }
    const k = D.k, u = postMat.uniforms, s = D.scareFx;
    u.uTime.value = performance.now() * 0.001; u.uK.value = k;
    u.uCA.value = 0.0005 + 0.0021 * k + D.pulse * 0.004 + D.glitch * 0.011 + s * 0.012;
    u.uGrain.value = 0.016 * k + 0.05 * s + 0.03 * D.glitch;
    u.uVig.value = clamp(0.58 * k + 0.2 * s, 0, 0.78);
    u.uDesat.value = clamp(0.26 * k + 0.2 * s, 0, 0.45);
    u.uCold.value = clamp(k, 0, 1);
    const lk = (L && L.def.look) || {};
    u.uExp.value = 1 - (lk.expo !== undefined ? lk.expo : 0.27) * clamp(k, 0, 1.1);
    u.uCon.value = (lk.con !== undefined ? lk.con : 0.12) * clamp(k, 0, 1.1);
    u.uPulse.value = D.pulse * 0.18;
    u.uVhs.value = clamp(D.vhs + s * 0.9, 0, 1); u.uGlitch.value = D.glitch;
    u.uAspect.value = _sz.x / _sz.y; u.uRes.value.set(_sz.x, _sz.y);
    u.uLift.value = 0.02 * clamp(k, 0, 1);
    u.tDiffuse.value = rt.texture;
    renderer.setRenderTarget(rt); renderer.render(scene, camera);
    renderer.setRenderTarget(null); renderer.render(postScene, postCam);
  };
  D.resize = function () { if (rt) { rt.dispose(); rt = null; } };

  /* ============================== helpers: canvas art ============================== */
  // handwritten-looking scrawl (crayon / chalk / finger-writing in fog). Never red, never dripping paint.
  function scrawlTex(text, kind) {
    const W = 640, H = 200;
    return T.canvas(W, H, (x, w, h) => {
      x.clearRect(0, 0, w, h);
      let fs = 120; x.font = 'bold ' + fs + 'px "Segoe Print","Bradley Hand","Comic Sans MS","Chalkboard SE",cursive';
      const mw = x.measureText(text).width; fs = Math.min(fs, Math.floor(fs * (w * 0.9) / mw)); x.font = 'bold ' + fs + 'px "Segoe Print","Bradley Hand","Comic Sans MS","Chalkboard SE",cursive';
      const cw = x.measureText(text).width; let px = (w - cw) / 2; x.textBaseline = 'middle'; x.textAlign = 'left';
      const col = kind === 'fog' ? 'rgba(236,246,255,0.9)' : kind === 'chalk' ? 'rgba(244,241,228,0.92)' : 'rgba(255,170,206,0.95)';
      for (let i = 0; i < text.length; i++) {
        const ch = text[i], cwid = x.measureText(ch).width;
        x.save(); x.translate(px + cwid / 2, h / 2 + rnd(-9, 9)); x.rotate(rnd(-0.14, 0.14));
        if (kind === 'fog') { x.shadowColor = 'rgba(230,240,255,0.9)'; x.shadowBlur = 9; }
        x.fillStyle = col; x.textAlign = 'center'; x.fillText(ch, 0, 0);
        x.globalAlpha = 0.5; x.strokeStyle = col; x.lineWidth = 3; x.strokeText(ch, rnd(-1.5, 1.5), rnd(-1.5, 1.5));
        x.restore(); px += cwid;
      }
      if (kind === 'fog') { x.globalAlpha = 0.35; x.fillStyle = 'rgba(236,246,255,0.8)'; for (let i = 0; i < 9; i++) x.fillRect(w * 0.1 + Math.random() * w * 0.8, h * 0.62, 2, rnd(8, 34)); }
      x.globalAlpha = 1; x.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 900; i++) { x.fillStyle = 'rgba(0,0,0,' + rnd(0.15, 0.55) + ')'; x.fillRect(Math.random() * w, Math.random() * h, rnd(1, 4), rnd(1, 3)); }
    }, false);
  }
  // the portrait of a pale girl in a nurse cap whose eyes follow you
  function drawPortrait(x, w, h, ex, ey, cr) {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2b2a2c'); g.addColorStop(1, '#14161a'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    const cx = w / 2, fy = h * 0.43, sc = w / 256;
    x.fillStyle = '#26364f'; x.beginPath(); x.moveTo(cx - 100 * sc, h); x.quadraticCurveTo(cx - 90 * sc, fy + 100 * sc, cx, fy + 92 * sc); x.quadraticCurveTo(cx + 90 * sc, fy + 100 * sc, cx + 100 * sc, h); x.fill();
    x.fillStyle = '#e9e4d6'; x.beginPath(); x.moveTo(cx - 40 * sc, fy + 92 * sc); x.lineTo(cx, fy + 128 * sc); x.lineTo(cx + 40 * sc, fy + 92 * sc); x.lineTo(cx + 62 * sc, fy + 100 * sc); x.lineTo(cx, fy + 150 * sc); x.lineTo(cx - 62 * sc, fy + 100 * sc); x.fill();
    x.fillStyle = '#5a3a22'; x.beginPath(); x.ellipse(cx, fy - 6 * sc, 74 * sc, 86 * sc, 0, 0, 7); x.fill();
    x.fillStyle = '#efdccd'; x.beginPath(); x.ellipse(cx, fy + 6 * sc, 56 * sc, 70 * sc, 0, 0, 7); x.fill();
    x.fillStyle = '#5a3a22'; x.beginPath(); x.moveTo(cx - 58 * sc, fy - 24 * sc); x.quadraticCurveTo(cx, fy - 78 * sc, cx + 58 * sc, fy - 24 * sc); x.quadraticCurveTo(cx + 20 * sc, fy - 40 * sc, cx - 8 * sc, fy - 24 * sc); x.quadraticCurveTo(cx - 36 * sc, fy - 34 * sc, cx - 58 * sc, fy - 24 * sc); x.fill();
    x.fillStyle = '#f4f4f4'; x.fillRect(cx - 34 * sc, fy - 98 * sc, 68 * sc, 24 * sc);                       // nurse cap (the little red cross is on the doll's cap)
    x.fillStyle = '#c9363c'; x.fillRect(cx - 3 * sc, fy - 94 * sc, 6 * sc, 16 * sc); x.fillRect(cx - 8 * sc, fy - 89 * sc, 16 * sc, 6 * sc);
    x.fillStyle = 'rgba(230,150,150,0.35)'; [-1, 1].forEach((s) => { x.beginPath(); x.ellipse(cx + s * 34 * sc, fy + 28 * sc, 13 * sc, 8 * sc, 0, 0, 7); x.fill(); });
    const ew = 17 * sc * (1 + 0.1 * cr), eh = 12.5 * sc * (1 + 0.2 * cr);
    [-1, 1].forEach((s) => {
      const ox = cx + s * 24 * sc, oy = fy - 2 * sc;
      x.fillStyle = '#f7f7f2'; x.beginPath(); x.ellipse(ox, oy, ew, eh, 0, 0, 7); x.fill();
      x.strokeStyle = '#3a2418'; x.lineWidth = 2 * sc; x.stroke();
      const px = ox + ex * (ew - 7 * sc), py = oy + ey * (eh - 6 * sc);
      x.fillStyle = '#2a3f66'; x.beginPath(); x.arc(px, py, (7.5 + 1.5 * cr) * sc, 0, 7); x.fill();
      x.fillStyle = '#05060a'; x.beginPath(); x.arc(px, py, 3.8 * sc, 0, 7); x.fill();
      x.fillStyle = '#fff'; x.beginPath(); x.arc(px - 2 * sc, py - 2.4 * sc, 1.5 * sc, 0, 7); x.fill();
    });
    x.strokeStyle = '#a65a60'; x.lineWidth = 3 * sc; x.lineCap = 'round'; x.beginPath();
    const sm_ = 4 + 20 * clamp(cr - 0.35, 0, 1);      // her smile slowly grows when it gets creepy (closed mouth, no teeth)
    x.moveTo(cx - 17 * sc, fy + 44 * sc); x.quadraticCurveTo(cx, fy + (46 + sm_) * sc, cx + 17 * sc, fy + 44 * sc); x.stroke();
    x.fillStyle = 'rgba(10,0,20,' + (0.28 + 0.22 * cr) + ')'; x.beginPath(); x.ellipse(cx - 24 * sc, fy + 12 * sc, 17 * sc, 6 * sc, 0, 0, 7); x.ellipse(cx + 24 * sc, fy + 12 * sc, 17 * sc, 6 * sc, 0, 0, 7); x.fill();
  }

  /* ============================== portraits whose eyes turn ============================== */
  // returns the frame group (so a level can hang it on a secret door). o: {x,y,z,ry,w,h,at (dread threshold to appear; 0 = always), free (do not add to the scene yet)}
  D.portrait = function (L, o) {
    const st = D.st(L), w = o.w || 0.8, h = o.h || 1.0;
    const tex = T.canvas(256, Math.round(256 * h / w), (x, cw, ch) => drawPortrait(x, cw, ch, 0, 0, 0), false);
    const fr = B.frame(w, h, tex, { wood: true }); fr.position.set(o.x || 0, o.y || 0, o.z || 0); fr.rotation.y = o.ry || 0; if (!o.free) L.scene.add(fr);
    const p = { g: fr, tex: tex, w: w, h: h, at: o.at || 0, ex: 0, ey: 0, cr: 0, t: 0, shown: !o.at };
    if (o.at) fr.visible = false;
    st.portraits.push(p); return fr;
  };
  const _pv = new THREE.Vector3();
  function tickPortraits(L, dt) {
    const st = L.dr, k = D.k, pl = G.player;
    st.portraits.forEach((p) => {
      if (!p.g.parent) return;
      p.g.updateWorldMatrix(true, false); const e = p.g.matrixWorld.elements; _pv.set(e[12], e[13], e[14]);
      const wx = _pv.x, wy = _pv.y, wz = _pv.z;
      if (!p.shown) { if (k >= p.at && !G.isSeen(wx, wz, wy - p.h / 2, wy + p.h / 2)) { p.shown = true; p.g.visible = true; } return; }
      p.t -= dt; if (p.t > 0) return;
      p.t = 0.09;
      const dx = pl.x - wx, dz = pl.z - wz, d = Math.hypot(dx, dz); if (d > 16) return;
      const rx = e[0], rz = e[2], nx = e[8], nz = e[10];      // the frame's right and facing directions in the world
      const lx = dx * rx + dz * rz, ln = dx * nx + dz * nz;
      let ex = 0, ey = 0;
      if (k > 0.22 || D.eyesBoost > 0) { ex = ln > 0.2 ? clamp(lx / Math.max(0.6, ln) * 1.1, -1, 1) : 0; ey = clamp((wy - pl.h) / Math.max(1, d) * 2.2, -1, 1); }
      const cr = clamp((k - 0.25) / 0.6, 0, 1) + (D.eyesBoost > 0 ? 0.4 : 0);
      if (Math.abs(ex - p.ex) > 0.07 || Math.abs(ey - p.ey) > 0.1 || Math.abs(cr - p.cr) > 0.05) {
        p.ex = ex; p.ey = ey; p.cr = cr; drawPortrait(p.tex.image.getContext('2d'), p.tex.image.width, p.tex.image.height, ex, ey, cr); p.tex.needsUpdate = true;
      }
    });
    if (D.eyesBoost > 0) D.eyesBoost -= dt;
  }
  D.scrawlTexture = scrawlTex;

  /* ============================== writing on walls and mirrors ============================== */
  // o: {text, kind:'crayon'|'chalk'|'fog', x,y,z, ry, w, at}
  D.scrawl = function (L, o) {
    const st = D.st(L), w = o.w || 1.8, h = w * 200 / 640;
    const mat = new THREE.MeshBasicMaterial({ map: scrawlTex(o.text, o.kind || 'crayon'), transparent: true, depthWrite: false, opacity: 0, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(o.x, o.y, o.z); m.rotation.y = o.ry || 0; m.visible = false; m.userData.noShadow = true; L.scene.add(m);
    const d = { m: m, mat: mat, at: o.at || 0.4, x: o.x, y: o.y, z: o.z, w: w, h: h, state: 0, op: 0, max: o.max || 0.92, dyn: !!o.dyn };
    st.decals.push(d); return d;
  };
  function tickDecals(L, dt) {
    const st = L.dr, k = D.k, p = G.player;
    st.decals.forEach((d) => {
      if (d.state === 0) {
        if (d.dyn || k < d.at) return;
        if (G.isSeen(d.x, d.z, d.y - d.h / 2, d.y + d.h / 2)) return;
        d.state = 1; d.m.visible = true;
        if (Math.hypot(d.x - p.x, d.z - p.z) < 10) { Snd.chalk(0.05); setTimeout(() => Snd.chalk(0.045), 380); setTimeout(() => Snd.chalk(0.04), 800); }
      } else if (d.state === 1) { d.op = Math.min(d.max, d.op + dt * 0.35); d.mat.opacity = d.op * (0.85 + 0.15 * Math.sin(L.time * 1.3 + d.x)); if (d.op >= d.max) d.state = 2; }
      else d.mat.opacity = d.max * (0.88 + 0.12 * Math.sin(L.time * 1.3 + d.x));
    });
  }
  // finger-writing in the fog on the mirrors (maze): a few decals that hop to a mirror near you when you are not looking
  D.mirrorWriter = function (L, faces, X, Z, CS, texts) {
    const st = D.st(L); st.mw = { faces: faces, X: X, Z: Z, CS: CS, items: [], texts: texts, cool: 8 };
    const DIRS = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
    texts.forEach((t) => {
      const d = D.scrawl(L, { text: t, kind: 'fog', x: 0, y: 1.55, z: 0, ry: 0, w: 1.7, at: 99, dyn: true }); d.m.visible = false; d.mat.opacity = 0; d.state = 0; d.dyn = true; st.mw.items.push({ d: d, on: false, life: 0 });
    });
    st.mw.DIRS = DIRS;
  };
  function tickMirrorWriter(L, dt) {
    const mw = L.dr.mw; if (!mw) return;
    const k = D.k, p = G.player;
    mw.cool -= dt;
    mw.items.forEach((it) => {
      const d = it.d;
      if (it.on) {
        it.life += dt; d.op = Math.min(0.88, d.op + dt * 0.5); d.mat.opacity = d.op * (it.life > 22 ? Math.max(0, 1 - (it.life - 22) / 4) : 1);
        if (it.life > 26) { it.on = false; d.m.visible = false; d.op = 0; }
      }
    });
    if (k < 0.3 || mw.cool > 0 || G.uiOpen) return;
    const free = mw.items.filter((i) => !i.on); if (!free.length) { mw.cool = 3; return; }
    for (let n = 0; n < 24; n++) {
      const f = mw.faces[Math.random() * mw.faces.length | 0], dd = mw.DIRS[f[2]];
      const x = mw.X(f[0]) + dd[0] * (mw.CS / 2 - 0.03), z = mw.Z(f[1]) + dd[1] * (mw.CS / 2 - 0.03), dist = Math.hypot(x - p.x, z - p.z);
      if (dist < 3.2 || dist > 9.5 || G.isSeen(x, z, 0.8, 2.2)) continue;
      if (!G.los(p.x, p.z, mw.X(f[0]), mw.Z(f[1]))) continue;
      const it = free[Math.random() * free.length | 0], d = it.d;
      d.m.position.set(x, 1.55, z); d.m.rotation.y = Math.atan2(-dd[0], -dd[1]); d.d_x = x; d.m.visible = true; d.op = 0; d.mat.opacity = 0; it.on = true; it.life = 0;
      mw.cool = rnd(9, 18) * (1.4 - clamp(k, 0, 1));
      if (dist < 8) Snd.whisperClose(0.045);
      return;
    }
    mw.cool = 2;
  }

  /* ============================== Molly's photo shows up in more places ============================== */
  function makeBillboard(L, scale) {
    const m = B.molly(scale); m.visible = false; L.scene.add(m);
    const mesh = m.userData.billboard ? m.children[0] : null;
    if (m.userData.setSmile) m.userData.setSmile(0.15);
    return { g: m, mesh: mesh, mat: mesh && mesh.material, shadow: m.userData.billboard ? m.children[1] : null };
  }
  function tint(b, mode) {
    if (!b.mat) return;
    if (mode === 'window') { b.mat.color.setRGB(0.42, 0.5, 0.72); b.mat.emissive.setRGB(0.14, 0.19, 0.32); b.mat.emissiveIntensity = 1; }
    else if (mode === 'mirror') { b.mat.color.setRGB(0.55, 0.75, 0.95); b.mat.emissive.setRGB(0.6, 0.75, 1); b.mat.emissiveIntensity = 0.3; }
    else { b.mat.color.setRGB(1, 1, 1); b.mat.emissive.setRGB(1, 1, 1); b.mat.emissiveIntensity = 0.32; }
    if (b.shadow) b.shadow.visible = !(mode === 'window' || mode === 'mirror');
  }
  // spots: {x,z,y?, type:'far'|'window'|'behind'|'mirror', s?: scale}
  D.peek = function (L, spots) { D.st(L).peekSpots = D.st(L).peekSpots.concat(spots); };
  function vanishPeek(L, why) {
    const pk = L.dr.peek; if (!pk || !pk.on) return; pk.on = false; pk.b.g.visible = false; pk.cool = rnd(16, 34) * (1.35 - clamp(D.k, 0, 1));
    if (why === 'seen') { D.pulse = Math.max(D.pulse, 0.55); D.glitch = Math.max(D.glitch, 0.5); Snd.static(0.13, 0.07); G.fl.dur = Math.max(G.fl.dur, 0.22); G.fl.black = false; G.fl.tick = 0; }
  }
  function tickPeek(L, dt) {
    const st = L.dr; if (!st.peek) return;
    const pk = st.peek, k = D.k, p = G.player, M_ = G.molly;
    if (pk.on) {
      pk.life += dt;
      const s = pk.spot, seen = G.isSeen(s.x, s.z, (s.y || 0) + 0.05, (s.y || 0) + 0.9 * (pk.scale || 1)), d = Math.hypot(s.x - p.x, s.z - p.z);
      if (seen) pk.seenT += dt; else pk.seenT = Math.max(0, pk.seenT - dt * 0.5);
      if ((seen && pk.seenT > pk.stare) || (seen && d < 2.6)) vanishPeek(L, 'seen');
      else if (pk.life > 38 && !seen) vanishPeek(L, 'quiet');
      return;
    }
    pk.cool -= dt;
    if (pk.cool > 0 || k < 0.32 || G.uiOpen || G.state !== 'play') return;
    if (M_.present && M_.mesh && M_.mesh.visible && M_.dist < 11) { pk.cool = 3; return; }       // the real Molly is around: do not confuse things
    const list = st.peekSpots.slice(); if (st.dyn) { const e = st.dyn(); if (e) list.push(e); }
    for (let n = 0; n < 14 && list.length; n++) {
      const s = list[Math.random() * list.length | 0], d = Math.hypot(s.x - p.x, s.z - p.z);
      const lo = s.type === 'window' ? 2.8 : s.type === 'behind' ? 2.8 : s.type === 'mirror' ? 3 : 6, hi = s.type === 'far' ? 20 : 11;
      if (d < lo || d > hi) continue;
      if (!G.los(p.x, p.z, s.x, s.z) || G.isSeen(s.x, s.z, (s.y || 0) + 0.05, (s.y || 0) + 0.9)) continue;
      tint(pk.b, s.type); pk.scale = s.s || (s.type === 'mirror' ? 1.55 : s.type === 'far' ? 1.5 : 1.25);
      pk.b.g.scale.setScalar(pk.scale); pk.b.g.position.set(s.x, s.y || 0, s.z); pk.b.g.visible = true; pk.spot = s;
      pk.on = true; pk.life = 0; pk.seenT = 0; pk.stare = rnd(0.7, 1.4);
      return;
    }
    pk.cool = 2.5;
  }
  // a single quick frame in which she is much closer (a ghost image, not her real position). Never strobes: one short flash.
  D.glitchFrame = function () {
    const L = G.level, st = L && L.dr; if (!st || !st.ghost || st.ghost.on) return;
    const p = G.player, gh = st.ghost;
    for (let n = 0; n < 10; n++) {
      const a = p.yaw + rnd(-0.4, 0.4), r = rnd(1.7, 2.7), x = p.x - Math.sin(a) * r, z = p.z - Math.cos(a) * r;
      if (G.blockedAt(x, z) || !G.los(p.x, p.z, x, z)) continue;
      gh.g.position.set(x, 0, z); gh.g.scale.setScalar(1.45); gh.g.visible = true; gh.on = true; gh.t = rnd(0.11, 0.17);
      D.glitch = 1; D.pulse = Math.max(D.pulse, 0.7); Snd.static(0.16, 0.09); Snd.thump(0.12);
      return;
    }
  };
  function tickGhost(L, dt) { const gh = L.dr.ghost; if (gh && gh.on) { gh.t -= dt; if (gh.t <= 0) { gh.on = false; gh.g.visible = false; } } }

  /* ============================== glow on things you can use (keeps puzzles readable in the dark) ============================== */
  function tickGlow(L, dt, t) {
    const st = L.dr, k = D.k, pool = st.glow, p = G.player, amt = sm(0.28, 0.7, k);
    if (amt <= 0.01 || G.state !== 'play') { pool.forEach((s) => { s.visible = false; }); return; }
    const c = [];
    L.interactables.forEach((o) => {
      if (o.hidden || o.noGlow) return; if (o.enabled && !(typeof o.enabled === 'function' ? o.enabled() : o.enabled)) return;
      const d = Math.hypot(o.x - p.x, o.z - p.z); if (d < 1.2 || d > 7.5) return; c.push({ o: o, d: d });
    });
    c.sort((a, b) => a.d - b.d);
    pool.forEach((s, i) => {
      const e = c[i]; if (!e) { s.visible = false; return; }
      s.visible = true; s.position.set(e.o.x, e.o.y === undefined ? 1 : e.o.y, e.o.z);
      s.material.opacity = amt * (0.22 + 0.1 * Math.sin(t * 2.3 + i * 1.7)) * (1 - 0.5 * sm(5, 7.5, e.d));
    });
  }

  /* ============================== toys that turn to face you, doors that open by themselves ============================== */
  D.facers = function (L, objs) { D.st(L).facers = D.st(L).facers.concat(objs); };
  function tickFacers(L, dt) {
    const k = D.k, p = G.player; if (k < 0.35) return;
    L.dr.facers.forEach((o) => {
      if (!o.parent) return;
      if (G.isSeen(o.position.x, o.position.z, o.position.y, o.position.y + 0.5)) return;
      const want = Math.atan2(p.x - o.position.x, p.z - o.position.z); let d = want - o.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
      if (Math.abs(d) < 0.02) return; o.rotation.y += clamp(d, -dt * 0.9 * (0.5 + k), dt * 0.9 * (0.5 + k));
    });
  }
  // o: {d: door, x,z (where she can be seen), at: dread threshold}
  D.creepDoors = function (L, list) { D.st(L).doors = D.st(L).doors.concat(list.map((o) => Object.assign({ at: 0.32, wait: rnd(10, 25), t: 0, dur: 16, moving: false, done: false, cr: 0 }, o))); };
  function tickDoors(L, dt) {
    const k = D.k;
    L.dr.doors.forEach((o) => {
      const d = o.d; if (o.done) return; if (d.isOpen) { o.done = true; return; }
      if (k < o.at) return;
      o.wait -= dt; if (o.wait > 0) return;
      const seen = G.isSeen(o.x, o.z, 0.3, 2); if (seen) return;     // like a weeping angel: it only moves while nobody is looking
      if (!o.moving) { o.moving = true; Snd.creak(0.08, 2); }
      o.t += dt / o.dur; o.cr -= dt; if (o.cr <= 0) { o.cr = rnd(3, 5); Snd.creak(0.05, 1.6); }
      const f = Math.min(1, o.t), e = f * f * (3 - 2 * f);
      d.target = d.closed + (d.open - d.closed) * e;
      if (f >= 1) { d.setOpen(true, true); o.done = true; }
    });
  }

  /* ============================== lights: they die one by one, emergency red, long moving moon shadows ============================== */
  function planKills(L) {
    const st = L.dr, lamps = L.lamps.filter((l) => l.light !== L.sun && l.light.isPointLight && l.base > 1 && !l.noKill);
    // never kill the lamp nearest the spawn and keep about half of them alive
    const sp = L.spawn; lamps.sort((a, b) => Math.hypot(a.light.position.x - sp.x, a.light.position.z - sp.z) - Math.hypot(b.light.position.x - sp.x, b.light.position.z - sp.z));
    const pool = lamps.slice(1); for (let i = pool.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    st.killPlan = pool.slice(0, Math.floor(lamps.length * ((L.def.look && L.def.look.kill) || 0.5)));
    lamps.forEach((l) => { l.dk = 1; l.dkT = 1; });
  }
  function tickLights(L, dt, t) {
    const st = L.dr, k = D.k;
    st.killPlan.forEach((l, i) => { if (!l.dead && k >= 0.26 + i * 0.1) { l.dead = true; l.spu = 0.7; Snd.click(); Snd.thump(0.1); } });
    L.lamps.forEach((l) => {
      if (l.dk === undefined) return;
      if (l.dead) { if (l.spu > 0) { l.spu -= dt; l.dk = Math.random() < 0.5 ? rnd(0.1, 0.9) : 1; } else l.dk += (0.05 - l.dk) * Math.min(1, dt * 4); }
      else l.dk = 1;
    });
    // school tubes (level 4 owns its fixtures): kill them in order as dread rises
    if (st.tubes && st.tubePlan) st.tubePlan.forEach((tp) => { if (!tp.done && k >= tp.at) { tp.done = true; const f = st.tubes[tp.i]; if (f) { f.dead = true; Snd.thump(0.14); Snd.click(); } } });
    // emergency red light (factory / school): fades in around dread 0.55 and breathes
    const rd = st.red; st.emerg = rd ? sm(rd.at, rd.at + 0.25, k) : 0;
    // long moving shadows: the sun turns into slow moonlight that slides across the floor
    if (L.sun && G.sunOn && k > 0.04) {
      if (st.sunAng === null) st.sunAng = Math.atan2(0.2, 0.3);
      st.sunAng += dt * 0.03 * (0.3 + k);
      const ky = sm(0.04, 0.9, k), hz = lerp(0.36, 1.0, ky), y = lerp(1.0, 0.62, ky), n = Math.hypot(hz, y), tg = L.sun.target.position;
      L.sun.position.set(tg.x + Math.cos(st.sunAng) * hz / n * 40, y / n * 40, tg.z + Math.sin(st.sunAng) * hz / n * 40);
    }
  }
  // D.env(L): called at the end of G.applyEnv every frame (after the base creep look is set)
  D.env = function (L) {
    if (L.def.scene) return;
    const st = L.dr, k = D.k; if (!st) return;
    // dying lamps
    L.lamps.forEach((l) => {
      if (l.dk !== undefined && l.dk !== 1) { l.light.intensity *= l.dk; if (l.halo) l.halo.material.opacity *= l.dk; }
      if (l.bulb && l.dk !== undefined && l.dk !== 1) l.bulb.color.multiplyScalar(l.dk);
    });
    if (k <= 0.01) return;
    // deeper fog, a bit less ambient light (never below a safe floor)
    const f = L.scene.fog; f.density = Math.min(f.density * (1 + 0.45 * clamp(k, 0, 1.2)), 0.118);
    if (L.ambient) L.ambient.intensity *= (1 - ((L.def.look && L.def.look.amb !== undefined) ? L.def.look.amb : 0.2) * clamp(k, 0, 1));
    // cold moonlight (shadows from the sun get long and pale)
    if (L.sun) { const e = L.lamps.filter((l) => l.light === L.sun)[0]; if (e) L.sun.intensity += e.base * 0.2 * clamp(k, 0, 1) * G.lightMul; L.sun.color.setRGB(lerp(1, 0.72, clamp(k, 0, 1)), lerp(0.94, 0.82, clamp(k, 0, 1)), lerp(0.86, 1, clamp(k, 0, 1))); }
    // the light you carry flickers and breathes a little (the factory, the maze and the school)
    if (L.carryLight) {
      if (st.carry0 === null) st.carry0 = L.carryLight.intensity;
      const t = L.time, dip = Math.max(0, Math.sin(t * 0.9 + 1.3) * Math.sin(t * 2.3) - 0.55) * 1.6;
      L.carryLight.intensity = st.carry0 * (1 - clamp(k, 0, 1) * (0.22 * dip + 0.04 * Math.sin(t * 7))) * (G.lightMul < 0.5 ? 0.7 : 1);
    }
    // emergency red
    if (st.emerg > 0.01 && st.red) {
      const br = 0.55 + 0.45 * Math.sin(L.time * 1.9), e = st.emerg;
      L.lamps.forEach((l, i) => {
        if (l.light === L.sun || !l.light.isPointLight || l.noRed) return;
        if (st.red.every ? ((i + (st.red.off || 0)) % st.red.every) : false) return;
        l.light.color.setRGB(1, lerp(0.9, 0.04, e), lerp(0.78, 0.025, e)); l.light.intensity *= lerp(1, 0.55 + 0.5 * br, e);
      });
      if (st.tubes) st.tubes.forEach((f, i) => { if (st.red.every && ((i + (st.red.off || 0)) % st.red.every)) return; f.lamp.light.color.setRGB(1, lerp(0.95, 0.04, e), lerp(1, 0.025, e)); const c = f.mat.color; c.g = lerp(c.g, c.g * 0.3, e); c.b = lerp(c.b, c.b * 0.22, e); });
    }
  };

  /* ============================== scripted scary moments ============================== */
  // S = {at (dread threshold), id, say?}
  D.script = function (L, list) { D.st(L).scripts = list.map((s) => Object.assign({ done: false }, s)); };
  function ready(L) { return G.state === 'play' && !G.uiOpen && L.time > 12 && L.time - L.dr.lastScript > 24 && !L.dr.busy && !(G.molly.present && G.molly.dist < 3); }
  function tickScripts(L) {
    const st = L.dr; if (!st.scripts.length || !ready(L)) return;
    const s = st.scripts.find((q) => !q.done && D.k >= q.at); if (!s) return;
    s.done = true; D.run(s.id, s);
  }
  D.run = async function (id, s) {
    const L = G.level, st = L && L.dr; if (!st || st.busy) return; const fid = G.flowId; st.busy = true; st.lastScript = L.time;
    const ok = () => fid === G.flowId && G.level === L && (G.state === 'play' || G.state === 'trans');
    try { await SCRIPTS[id](L, s || {}, ok); } catch (e) { console.warn('script', id, e); }
    st.busy = false; if (G.level === L) st.lastScript = L.time;
  };
  const SCRIPTS = {
    // 3 seconds of darkness: a giggle, a whisper, and Molly standing just at the edge of your vision when the lights come back
    async lightsOut(L, s, ok) {
      Snd.swell(0.8, 0.05); await wait(750); if (!ok()) return;
      G.fl.black = true; G.fl.blackMul = 0.12; G.fl.dur = 3.0; G.fl.tick = 0; Snd.click(); Snd.thump(0.16); Snd.duck(0.6, 0.7, 0.9); D.pulse = 0.5;
      await wait(650); if (!ok()) return; Snd.giggle(0.1);
      await wait(950); if (!ok()) return; Snd.whisperClose(0.07);
      await wait(700); if (!ok()) return;
      if (G.placeMollyEdge) G.placeMollyEdge(3.6, 6.5);
      await wait(900); if (!ok()) return; if (s.say) G.say(s.say, 4200);
    },
    // heart racing, sudden silence, a slam and running footsteps... and nothing is there
    async fakeOut(L, s, ok) {
      Snd.swell(1.3, 0.05); await wait(1250); if (!ok()) return;
      Snd.duck(0.97, 1.8, 0.5); Snd.heartbeat(0.22); await wait(1300); if (!ok()) return; Snd.heartbeat(0.26);
      await wait(900); if (!ok()) return;
      Snd.slam(0.3); D.pulse = 1; G.fl.dur = 0.35; G.fl.black = false; G.fl.tick = 0; Snd.runAway(7, 0.09); D.glitch = 0.4;
      await wait(1700); if (!ok()) return; G.say(s.say || '<b>Emily:</b> ...Nobody there. It was just my imagination. Right?', 4600);
    },
    // every portrait and doll looks right at you
    async eyes(L, s, ok) {
      D.eyesBoost = 6; Snd.whisperClose(0.07); await wait(800); if (!ok()) return; Snd.giggle(0.08);
      L.dr.facers.forEach((o) => { if (o.parent) { const p = G.player; o.rotation.y = Math.atan2(p.x - o.position.x, p.z - o.position.z); } });
      if (L.turnHeads !== undefined) L.turnHeads = true; D.pulse = 0.6;
      await wait(1200); if (!ok()) return; if (s.say) G.say(s.say, 4200);
    },
    // a long breath and the writing in the fog on the mirrors
    async mirrorWrite(L, s, ok) {
      Snd.breath(0.07); const mw = L.dr.mw; if (mw) mw.cool = 0; await wait(1500); if (!ok()) return; Snd.whisperClose(0.07); D.glitchFrame(); await wait(1500); if (s.say && ok()) G.say(s.say, 4200);
    },
    // the lights in the hall go out one after another, coming closer, and the bell rings
    async hallLights(L, s, ok) {
      const tubes = L.dr.tubes; if (!tubes) return; const p = G.player;
      const order = tubes.map((f, i) => ({ f: f, i: i, d: Math.hypot(f.x - p.x, f.z - p.z) })).filter((q) => q.i < 6 && !q.f.dead).sort((a, b) => b.d - a.d).slice(0, 4);
      Snd.swell(1.0, 0.05); await wait(900);
      for (let i = 0; i < order.length; i++) { if (!ok()) break; order[i].f.dead = true; order[i].f.temp = true; Snd.click(); Snd.thump(0.14); await wait(650); }
      if (ok()) { Snd.bell(0.05); Snd.rattle(0.07); D.pulse = 0.8; }
      await wait(3200); order.forEach((q) => { if (q.f.temp) { q.f.dead = false; q.f.temp = false; Snd.click(); } }); if (s.say && ok()) G.say(s.say, 4200);
    },
    // all the dolls on the shelves snap their heads toward you
    async dolls(L, s, ok) { D.eyesBoost = 5; L.turnHeads = true; Snd.giggle(0.09); Snd.static(0.12, 0.06); D.glitchFrame(); await wait(1500); if (s.say && ok()) G.say(s.say, 4200); }
  };

  /* ============================== sounds driven by dread ============================== */
  function tickSounds(L, dt) {
    const k = D.k, S = L.dr.snd, M_ = G.molly; if (k < 0.25 || G.uiOpen) return;
    // tension throb from how close and how threatening she is
    let tn = sm(0.4, 1, k) * 0.2;
    if (M_.present && M_.mesh && M_.mesh.visible) tn = Math.max(tn, clamp((9 - M_.dist) / 9, 0, 1) * (0.5 + 0.5 * sm(0.3, 0.8, k)));
    if (Math.abs(tn - (S.tn || 0)) > 0.04 || (S.tnT = (S.tnT || 0) + dt) > 3) { S.tn = tn; S.tnT = 0; Snd.tension(tn); }
    if (G.state !== 'play') return;
    S.box -= dt; if (k > 0.3 && S.box <= 0) { S.box = lerp(70, 28, clamp(k, 0, 1)) * rnd(0.8, 1.3); Snd.farBox([[6, 5, 3, 1, 3, 2], [3, 5, 6, 4, 2], [1, 3, 5, 3, 1, 6]][Math.random() * 3 | 0], 0.06 + 0.04 * k); }
    S.whisper -= dt; if (k > 0.45 && S.whisper <= 0) { S.whisper = lerp(48, 18, clamp(k, 0, 1)) * rnd(0.8, 1.3); Snd.whisperClose(0.05 + 0.04 * k); }
    S.stat -= dt; if (k > 0.55 && S.stat <= 0) { S.stat = lerp(80, 35, clamp(k, 0, 1)) * rnd(0.8, 1.3); Snd.static(0.18, 0.05 + 0.04 * k); D.pulse = Math.max(D.pulse, 0.35); }
    S.breath -= dt; if (S.breath <= 0) { S.breath = rnd(7, 12); if (k > 0.4 && M_.present && M_.dist < 5.5 && !(M_.mesh && M_.mesh.visible && G.isSeen(M_.mesh.position.x, M_.mesh.position.z, 0, 1))) Snd.breath(0.05 + 0.05 * k); }
    // footsteps that follow you (they copy your steps a moment late, and stop when you stop)
    const f = L.dr.fs, p = G.player;
    S.fs -= dt;
    if (!f.active && k > 0.55 && S.fs <= 0) { f.active = true; f.left = 5 + (Math.random() * 6 | 0); f.last = p.moved; f.acc = 0; f.idle = 0; }
    if (f.active) {
      const mv = p.moved - f.last; f.last = p.moved;
      if (mv > 0.001) { f.idle = 0; f.acc += mv; while (f.acc > 0.85) { f.acc -= 0.85; f.left--; setTimeout(() => Snd.stepBehind(0.07 + 0.05 * k), 280); } }
      else { f.idle += dt; if (f.idle > 0.9) { setTimeout(() => Snd.stepBehind(0.06), 450); f.left = 0; } }
      if (f.left <= 0) { f.active = false; S.fs = rnd(50, 90); }
    }
  }

  /* ============================== main tick (called every frame while playing) ============================== */
  D.target = function (L) { const lm = L.def.dread !== undefined ? L.def.dread : 1; return L.def.scene ? 0 : clamp(sm(0.1, 0.95, G.creep) * G.CREEP_SCALE * lm, 0, 1.25); };
  D.tick = function (dt) {
    const L = G.level; if (!L) return;
    D.pulse *= Math.exp(-dt * 3.2); D.glitch *= Math.exp(-dt * 7); D.vhs *= Math.exp(-dt * 4);
    if (L.def.scene) { D.k = 0; return; }
    const st = D.st(L);
    D.k += (D.target(L) - D.k) * Math.min(1, dt * 3);
    if (G.uiOpen && G.state === 'play') return;
    if (G.state !== 'play' && G.state !== 'trans') return;
    tickLights(L, dt, L.time);
    tickGhost(L, dt);
    if (D.k < 0.02) return;
    tickPortraits(L, dt); tickDecals(L, dt); tickMirrorWriter(L, dt); tickFacers(L, dt); tickDoors(L, dt);
    if (G.state !== 'play') return;
    tickPeek(L, dt); tickGlow(L, dt, L.time); tickScripts(L); tickSounds(L, dt);
    // a rare glitch frame while she is in sight
    st.gl = (st.gl === undefined ? rnd(25, 40) : st.gl) - dt;
    const M_ = G.molly;
    if (st.gl <= 0) { if (D.k > 0.5 && M_.present && M_.mesh && M_.mesh.visible && M_.seen > 0.5 && M_.dist > 4) { D.glitchFrame(); st.gl = rnd(28, 55) * (1.5 - D.k); } else st.gl = 4; }
  };

  /* ============================== level load ============================== */
  D.onLoad = function (L) {
    const st = D.st(L); D.eyesBoost = 0; D.scareFx = 0; D.glitch = 0; D.vhs = 0; D.pulse = 0;
    D.k = L.def.scene ? 0 : D.target(L);
    if (L.def.scene) return;
    st.lm = L.def.dread !== undefined ? L.def.dread : 1;
    planKills(L);
    st.glow = []; for (let i = 0; i < 7; i++) { const s = B.glow('rgba(255,236,176,0.9)', 0.5); s.visible = false; s.material.opacity = 0; s.renderOrder = 5; L.scene.add(s); st.glow.push(s); }
    if (L.molly && B.hasSprite && B.hasSprite('molly')) {
      const b = makeBillboard(L, 1.3); st.peek = { b: b, on: false, cool: rnd(12, 24), life: 0, seenT: 0, stare: 1, spot: null, scale: 1.3 };
      st.ghost = Object.assign(makeBillboard(L, 1.45), { on: false, t: 0 });
    }
  };

  /* ============================== what each level gets (called from the level files' build()) ============================== */
  const E = (a) => a.filter(Boolean);
  // Level 1: the house. Starts at dread 0 (so nothing at all happens in the friendly first 2.5 minutes).
  D.level1 = function (L, G_, r) {
    D.portrait(L, { x: -2.4, y: 1.6, z: 0.115, ry: 0, w: 0.8, h: 1.0, at: 0.12 });                         // hall, north wall: appears when you are not looking
    D.scrawl(L, { text: 'PLAY WITH ME', kind: 'crayon', x: -6.5, y: 1.55, z: 2.62, ry: 0, w: 1.9, at: 0.2 });   // bedroom
    D.scrawl(L, { text: 'I SEE YOU', kind: 'crayon', x: 7.88, y: 1.65, z: -3.0, ry: -PI / 2, w: 1.9, at: 0.34 });   // kitchen, east wall
    D.scrawl(L, { text: 'MY TURN', kind: 'crayon', x: 5.7, y: 1.55, z: 2.38, ry: PI, w: 1.7, at: 0.5 });          // hall, south wall
    D.peek(L, [
      { x: -7.3, z: 1.25, type: 'far' }, { x: 7.0, z: 1.3, type: 'far' }, { x: 0.2, z: 1.2, type: 'far' },
      { x: -5.6, z: -0.55, type: 'behind' }, { x: -3.0, z: 4.4, type: 'behind' }, { x: 5.2, z: 4.6, type: 'behind' },
      { x: -1.0, z: -5.8, y: 0.95, type: 'window', s: 1.2 }, { x: 4.4, z: -5.8, y: 0.95, type: 'window', s: 1.2 }, { x: -7.8, z: 5.4, y: 0.95, type: 'window', s: 1.2 }
    ]);
    D.facers(L, E([r.lt, r.teddyBed, r.bear2]));
    if (r.playDoor) D.creepDoors(L, [{ d: r.playDoor, x: 3.55, z: 2.5, at: 0.1 }]);
    D.script(L, [{ at: 0.25, id: 'fakeOut' }, { at: 0.42, id: 'lightsOut', say: '<b>Emily:</b> The lights... Molly? Was that you laughing?' }, { at: 0.55, id: 'eyes', say: '<b>Emily:</b> Everything in this house is looking at me...' }]);
  };
  // Level 2: the toy factory. Returns the portrait frame (the secret door hangs it).
  D.level2 = function (L, G_, r) {
    const st = D.st(L); st.red = { at: 0.5, every: 2 };
    const pf = D.portrait(L, { w: 0.9, h: 1.15, free: true });
    D.scrawl(L, { text: 'PLAY WITH ME', kind: 'chalk', x: -11.88, y: 2.35, z: -5.2, ry: PI / 2, w: 2.6, at: 0.35 });
    D.scrawl(L, { text: 'I SEE YOU', kind: 'chalk', x: 3.4, y: 2.5, z: 8.88, ry: PI, w: 2.6, at: 0.5 });
    D.scrawl(L, { text: 'MY TURN', kind: 'chalk', x: -9.6, y: 3.05, z: -8.88, ry: 0, w: 2.2, at: 0.65 });
    D.peek(L, [
      { x: 5.55, z: 0.5, type: 'behind' }, { x: -6.5, z: 1.1, type: 'behind' }, { x: 0.0, z: -6.55, type: 'behind' }, { x: -3.0, z: 6.15, type: 'behind' }, { x: -8.9, z: -6.2, type: 'behind' }, { x: 9.2, z: -7.4, type: 'behind' },
      { x: -11.0, z: 7.4, type: 'far' }, { x: 11.0, z: -7.6, type: 'far' }, { x: 0.0, z: -8.1, type: 'far' }, { x: -11.2, z: 0.0, type: 'far' }, { x: 10.8, z: 5.5, type: 'far' }
    ]);
    D.script(L, [{ at: 0.3, id: 'lightsOut', say: '<b>Emily:</b> The power flickered... I think something just moved out there.' }, { at: 0.5, id: 'fakeOut' }, { at: 0.68, id: 'dolls', say: '<b>Emily:</b> All the dolls turned their heads... they are watching me.' }]);
    return pf;
  };
  // Level 3: the mirror maze. r = {wallFaces, X, Z, CS}. Returns the portrait frame.
  D.level3 = function (L, G_, r) {
    const pf = D.portrait(L, { w: 1.0, h: 1.25, free: true });
    D.mirrorWriter(L, r.wallFaces, r.X, r.Z, r.CS, ['I SEE YOU', 'PLAY WITH ME', "DON'T BLINK"]);
    D.peek(L, [[2, 4], [2, 9], [5, 10], [9, 10], [9, 5], [12, 1], [5, 4], [2, 11]].map((c) => ({ x: r.X(c[0]), z: r.Z(c[1]), type: 'far' })));
    const DIRS = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
    D.st(L).dyn = () => {                    // a pale reflection of her in a mirror wall near you
      const p = G.player;
      for (let n = 0; n < 40; n++) {
        const f = r.wallFaces[Math.random() * r.wallFaces.length | 0], d = DIRS[f[2]];
        const x = r.X(f[0]) + d[0] * (r.CS / 2 - 0.1), z = r.Z(f[1]) + d[1] * (r.CS / 2 - 0.1), dist = Math.hypot(x - p.x, z - p.z);
        if (dist > 3.4 && dist < 9) return { x: x, z: z, y: 0, type: 'mirror', s: 1.55 };
      }
      return null;
    };
    D.script(L, [{ at: 0.28, id: 'lightsOut', say: '<b>Emily:</b> Dark! ...and I heard her giggle in every mirror.' }, { at: 0.4, id: 'mirrorWrite', say: '<b>Emily:</b> Something is writing on the mirrors...' }, { at: 0.6, id: 'fakeOut' }]);
    return pf;
  };
  // Level 4: the school. r = {fixtures, door1, door2}
  D.level4 = function (L, G_, r) {
    const st = D.st(L); st.tubes = r.fixtures; st.red = { at: 0.5, every: 2, off: 1 };
    st.tubePlan = [{ i: 3, at: 0.3 }, { i: 6, at: 0.45 }, { i: 8, at: 0.6 }, { i: 10, at: 0.8 }, { i: 7, at: 0.95 }].map((q) => Object.assign({ done: false }, q));
    r.fixtures.forEach((f) => { f.lamp.noKill = true; });
    D.portrait(L, { x: 1.35, y: 1.65, z: 1.86, ry: PI, w: 0.8, h: 1.0, at: 0.1 });
    D.scrawl(L, { text: 'I SEE YOU', kind: 'chalk', x: -5.9, y: 2.62, z: -1.86, ry: 0, w: 2.4, at: 0.3 });
    D.scrawl(L, { text: 'STAY WITH ME', kind: 'chalk', x: 6.8, y: 2.6, z: 1.86, ry: PI, w: 2.6, at: 0.5 });
    if (r.door1) D.creepDoors(L, [{ d: r.door1, x: -8.55, z: -2, at: 0.12 }]);
    if (r.door2) D.creepDoors(L, [{ d: r.door2, x: 1.35, z: -2, at: 0.2 }]);
    D.peek(L, [-12, -8, -4, 0, 4, 8, 11].map((x) => ({ x: x, z: 0, type: 'far' })).concat([
      { x: -8.55, z: -2.75, type: 'behind' }, { x: 1.35, z: -2.75, type: 'behind' }, { x: 2.85, z: 2.8, type: 'behind' },
      { x: -12.3, z: -9.72, y: 0.95, type: 'window', s: 1.2 }, { x: 4.3, z: -9.72, y: 0.95, type: 'window', s: 1.2 }
    ]));
    D.script(L, [{ at: 0.33, id: 'lightsOut', say: '<b>Emily:</b> The hall lights died... something is standing at the end of the hall.' }, { at: 0.5, id: 'fakeOut' }, { at: 0.68, id: 'hallLights', say: '<b>Emily:</b> The lights are going out one by one. Coming closer...' }]);
  };
  window.Dread = D;
})();
