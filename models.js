/* MOLLY - models: the doll, Mom, furniture, toys, factory parts. Extends window.Build (see build.js). */
(function () {
  'use strict';
  const T = window.Tex, M = window.Mat, B = window.Build;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  // seeded random for model details so every doll / room looks the same each run
  function seeded(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /* ======================= hair helpers ======================= */
  // points of a falling, curling lock: starts at root, leaves along dir, gravity pulls it down
  function lock(root, dir, len, amp, turns, ph, grav) {
    const d = V3(dir[0], dir[1], dir[2]).normalize(), a = Math.abs(d.y) < 0.9 ? V3(0, 1, 0) : V3(1, 0, 0);
    const u = V3(0, 0, 0).crossVectors(d, a).normalize(), v = V3(0, 0, 0).crossVectors(d, u), pts = [], N = 9;
    for (let i = 0; i <= N; i++) {
      const t = i / N, c = Math.cos(ph + turns * TAU * t) * amp * t, s = Math.sin(ph + turns * TAU * t) * amp * t;
      pts.push([root[0] + d.x * len * t + u.x * c + v.x * s, root[1] + d.y * len * t + u.y * c + v.y * s - (grav === undefined ? 0.3 : grav) * len * t * t, root[2] + d.z * len * t + u.z * c + v.z * s]);
    }
    return pts;
  }
  function surf(theta, phi, r, cy) { return [-r * Math.cos(phi) * Math.sin(theta), cy + r * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta)]; }

  /* ======================= the doll: MOLLY ======================= */
  let dm = null;
  function dollMats() {
    if (dm) return dm;
    const white = M.tp(T.fabric('#fcfcff'), 14, 0x333344), blue = M.tp(T.fabric('#86aee8'), 14, 0x333355);
    dm = {
      face: M.phys({ map: T.dollFace(), roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.1, bumpMap: T.dollFace().userData.pbr ? T.dollFace().userData.pbr.bump : null, bumpScale: 0.2 }, 1.1), skin: M.phys({ color: 0xf9ddcc, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.12 }, 1.0),
      hair: M.tp(T.hair(), 95, 0xaa9977, { side: THREE.DoubleSide }),
      white: white, blue: blue, whiteD: M.tp(T.fabric('#fcfcff'), 14, 0x333344, { side: THREE.DoubleSide }), blueD: M.tp(T.fabric('#86aee8'), 14, 0x333355, { side: THREE.DoubleSide }),
      shoe: M.p(0x4a2418, 110, 0xaa8877), button: M.phys({ color: 0x050507, roughness: 0.08, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.02 }, 0.55), rim: M.p(0x202026, 60, 0x555555), thread: M.b(0x8d8a80), hole: M.b(0x000000),
      glint: M.b(0xffffff), rose: M.phys({ color: 0xdc5f86, roughness: 0.28, clearcoat: 0.7, clearcoatRoughness: 0.15 }, 1.0), roseD: M.p(0xb84367, 80, 0xaaaaaa), nose: M.p(0xf2b8a2, 30, 0x444444),
      red: M.l(0xd3202c, { emissive: 0x400408 }), ribbon: M.tp(T.fabric('#6c9be6'), 20, 0x445577, { side: THREE.DoubleSide }), gold: M.p(0xd9b24a, 90, 0xffeeaa)
    };
    return dm;
  }
  function mollyEye(sx, m, H) {
    const e = new THREE.Group();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.04, 28, 18), m.button); dome.scale.set(1, 1, 0.42); e.add(dome);
    B.torus(0.0385, 0.003, m.rim, 0, 0, 0.0055, e, TAU, 32);
    [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach((p) => {
      const h = new THREE.Mesh(new THREE.CircleGeometry(0.0046, 12), m.hole); h.position.set(p[0] * 0.0108, p[1] * 0.0108, 0.0157); e.add(h);
      B.torus(0.0046, 0.0013, m.thread, p[0] * 0.0108, p[1] * 0.0108, 0.0157, e, TAU, 12);
    });
    [Math.PI / 4, -Math.PI / 4].forEach((a) => { const t = B.box(0.056, 0.003, 0.0022, m.thread, 0, 0, 0.0170, e); t.rotation.z = a; });
    B.sph(0.0058, m.glint, -0.0135, 0.0145, 0.0161, e, 1, 1, 0.3, 10); B.sph(0.0025, m.glint, 0.0125, -0.0115, 0.0161, e, 1, 1, 0.3, 8);
    e.userData.home = V3(sx * 0.066, H(0.985), 0.146); e.position.copy(e.userData.home);
    return e;
  }
  B.molly = function (scale) {
    const m = dollMats(), g = new THREE.Group(), u = g.userData, rig = new THREE.Group(); g.add(rig); u.rig = rig;
    const HY = 0.85, H = (y) => y - HY;
    /* ---- legs: white tights + Mary Jane shoes ---- */
    u.legs = [];
    [-1, 1].forEach((s) => {
      const leg = new THREE.Group(); leg.position.set(s * 0.07, 0.3, 0); rig.add(leg); u.legs.push(leg);
      B.cyl(0.031, 0.027, 0.27, m.white, 0, -0.135, 0, leg, 16);
      const shoe = new THREE.Group(); shoe.position.set(0, -0.272, 0.0); leg.add(shoe);
      B.sph(0.034, m.shoe, 0, 0.0, 0.03, shoe, 1.0, 0.6, 1.85, 16);
      B.cyl(0.036, 0.038, 0.012, M.l(0x2a1209), 0, -0.014, 0.03, shoe, 16).scale.z = 1.9;
      const strap = B.torus(0.029, 0.0075, m.shoe, 0, 0.012, 0.0, shoe, Math.PI, 16); strap.rotation.x = Math.PI / 2; strap.rotation.z = 0;
      B.sph(0.007, m.gold, 0.026 * s, 0.014, 0.0, shoe);
      B.torus(0.029, 0.007, m.white, 0, 0.065, 0, shoe, TAU, 16).rotation.x = Math.PI / 2;     // frilly sock edge
      B.bake(shoe);
    });
    /* ---- dress ---- */
    const dress = new THREE.Group(); rig.add(dress);
    B.lathe([[0.1, 0.64], [0.135, 0.585], [0.185, 0.48], [0.24, 0.37], [0.272, 0.27]], m.blueD, 0, 0, 0, dress, 40);
    for (let i = 0; i < 36; i++) { const a = i / 36 * TAU; B.sph(0.03, m.blue, Math.sin(a) * 0.272, 0.272, Math.cos(a) * 0.272, dress, 1, 0.55, 1, 8); }
    B.lathe([[0.1, 0.64], [0.093, 0.69], [0.086, 0.75], [0.084, 0.805]], m.blueD, 0, 0, 0, dress, 24);
    // apron (front part) + ruffles
    B.lathe([[0.104, 0.64], [0.138, 0.585], [0.188, 0.48], [0.243, 0.37], [0.277, 0.295]], m.whiteD, 0, 0, 0, dress, 32, -1.0, 2.0);
    for (let i = 0; i < 17; i++) { const a = -1.0 + 2.0 * i / 16; B.sph(0.027, m.white, Math.sin(a) * 0.279, 0.292, Math.cos(a) * 0.279, dress, 1, 0.6, 1, 8); B.sph(0.02, m.white, Math.sin(a) * 0.271, 0.31, Math.cos(a) * 0.271, dress, 1, 0.7, 1, 8); }
    B.lathe([[0.1, 0.655], [0.094, 0.69], [0.0885, 0.75], [0.0865, 0.805]], m.whiteD, 0, 0, 0, dress, 20, -0.7, 1.4);
    B.torus(0.098, 0.006, m.white, 0, 0.652, 0, dress, TAU, 24).rotation.x = Math.PI / 2;
    [-1, 1].forEach((s) => { const st = B.box(0.016, 0.1, 0.006, m.white, s * 0.05, 0.84, 0.078, dress); st.rotation.set(-0.5, 0, s * -0.25); });
    // peter-pan collar + little bow
    B.lathe([[0.042, 0.858], [0.09, 0.84], [0.135, 0.805], [0.142, 0.795]], m.whiteD, 0, 0, 0, dress, 32);
    B.torus(0.14, 0.006, m.white, 0, 0.797, 0, dress, TAU, 32).rotation.x = Math.PI / 2 + 0.2;
    [-1, 1].forEach((s) => { const lp = B.cyl(0.0, 0.026, 0.05, m.ribbon, s * 0.028, 0.835, 0.105, dress, 8); lp.rotation.z = s * Math.PI / 2; lp.scale.set(1, 1, 0.5); });
    B.sph(0.011, m.ribbon, 0, 0.835, 0.105, dress);
    B.cyl(0.032, 0.034, 0.06, m.skin, 0, 0.846, 0, dress, 14);
    B.bake(dress);
    /* ---- arms ---- */
    u.arms = [];
    [-1, 1].forEach((s) => {
      const arm = new THREE.Group(); arm.position.set(s * 0.128, 0.778, 0); rig.add(arm); u.arms.push(arm);
      B.sph(0.054, m.blue, 0, -0.005, 0, arm, 1, 0.92, 1, 20);
      B.torus(0.04, 0.008, m.white, 0, -0.045, 0, arm, TAU, 16).rotation.x = Math.PI / 2;
      B.cyl(0.0225, 0.02, 0.2, m.skin, 0, -0.13, 0, arm, 14);
      B.sph(0.028, m.skin, 0, -0.238, 0, arm, 1, 1.05, 0.9, 14); B.sph(0.011, m.skin, s * 0.02, -0.228, 0.014, arm, 1, 1, 1, 8);
      arm.rotation.z = s * 0.14; arm.rotation.x = -0.12;
    });
    /* ---- head (pivot at the neck so it can tilt) ---- */
    const head = new THREE.Group(); head.position.set(0, HY, 0); rig.add(head); u.head = head;
    const hs = new THREE.Mesh(new THREE.SphereGeometry(0.16, 56, 40), m.face); hs.position.set(0, H(0.97), 0); hs.scale.set(1, 1.02, 1); head.add(hs);
    [-1, 1].forEach((s) => B.sph(0.022, m.skin, s * 0.153, H(0.955), -0.01, head, 0.6, 1.2, 0.9, 10));   // ears (mostly hidden)
    /* hair: scalp cap, bangs, side locks, back curtain with curls, side ponytail with many strands */
    const hair = new THREE.Group(); head.add(hair);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.173, 56, 32, Math.PI / 2 + 0.78, TAU - 1.56, 0, 2.15), m.hair); cap.position.set(0, H(0.975), -0.008); hair.add(cap);
    const back = new THREE.Mesh(new THREE.SphereGeometry(0.168, 40, 28, Math.PI * 1.5 - 1.55, 3.1, 0.5, 2.1), m.hair); back.position.set(0, H(0.9), -0.02); back.scale.set(1.07, 1.45, 0.96); hair.add(back);
    const sr = seeded(7), CY = 0.975;
    for (let i = 0; i < 12; i++) { // bangs: swept from the crown parting across the forehead
      const side = i < 6 ? 1 : -1, k = (i % 6) / 5, th0 = 0.3, ph0 = Math.PI / 2 - side * 0.12, th1 = 1.0 + k * 0.35, ph1 = Math.PI / 2 + side * (0.38 + k * 0.78);
      const pts = []; for (let q = 0; q <= 4; q++) { const t = q / 4, e = t * t * 0.4 + t * 0.6; pts.push(surf(th0 + (th1 - th0) * e, ph0 + (ph1 - ph0) * t, 0.176 + Math.sin(t * Math.PI) * 0.006, H(CY - 0.0 + 0.0) + 0.0)); }
      pts.forEach((p) => { p[2] += 0.0; }); hair.add(B.taperTube(pts.map((p) => [p[0], p[1], p[2] - 0.006]), 0.0125, 0.0025, 10, 6, m.hair));
    }
    [-1, 1].forEach((s) => { // side locks falling over the shoulders
      for (let i = 0; i < 5; i++) hair.add(B.taperTube(lock([s * (0.148 + i * 0.004), H(1.0 - i * 0.012), 0.045 + i * 0.012], [s * 0.12, -1, 0.3], 0.33 - i * 0.012, 0.008, 1.2 + sr() * 0.8, sr() * 6, 0.1), 0.015, 0.002, 16, 6, m.hair));
    });
    for (let i = 0; i < 16; i++) { // long curled ends at the back
      const a = Math.PI * 1.5 + (i / 15 - 0.5) * 2.5, rr = 0.15;
      hair.add(B.taperTube(lock([Math.cos(a) * rr * 1.1, H(0.8), Math.sin(a) * rr * 0.9 - 0.02], [Math.cos(a) * 0.35, -1, Math.sin(a) * 0.35], 0.19, 0.009, 1.4, sr() * 6, 0.05), 0.017, 0.002, 12, 6, m.hair));
    }
    const pt = [0.075, H(1.05), -0.12]; // ponytail on the viewer's right
    for (let i = 0; i < 14; i++) hair.add(B.taperTube(lock([pt[0] + sr() * 0.02, pt[1] - sr() * 0.015, pt[2] + sr() * 0.02], [0.12 + sr() * 0.1, -1, -0.15 + sr() * 0.2], 0.26 + sr() * 0.04, 0.012, 2.2 + sr() * 0.4, sr() * 6, 0.05), 0.019, 0.002, 18, 6, m.hair));
    B.sph(0.036, m.hair, pt[0], pt[1], pt[2], hair);
    [-1, 1].forEach((s) => { const lp = B.cyl(0.0, 0.034, 0.075, m.ribbon, pt[0] + 0.02, pt[1] + 0.012 + s * 0.0, pt[2] + s * 0.045, hair, 8); lp.rotation.x = s * Math.PI / 2 * 0.95; lp.rotation.z = -0.4; lp.scale.set(1, 1, 0.55); });
    B.sph(0.016, m.ribbon, pt[0] + 0.02, pt[1] + 0.012, pt[2], hair);
    B.bake(hair);
    /* face: button eyes, nose, smile, brows/blush are painted on the head texture */
    u.eyes = [mollyEye(-1, m, H), mollyEye(1, m, H)]; u.eyes.forEach((e) => head.add(e));
    B.sph(0.0125, m.nose, 0, H(0.952), 0.1585, head, 1, 0.9, 0.9, 12);
    const lips = new THREE.Group(); lips.position.set(0, H(0.915), 0.1505); head.add(lips); u.lips = lips;
    const smile = B.torus(0.03, 0.0046, m.rose, 0, 0, 0, lips, Math.PI * 0.78, 20); smile.rotation.z = -Math.PI / 2 - Math.PI * 0.39;
    [-1, 1].forEach((s) => B.sph(0.0042, m.roseD, s * 0.0283, -0.0107, 0.0, lips, 1, 1, 1, 6));
    const lower = B.sph(0.0125, m.rose, 0, -0.027, 0.004, lips, 1.5, 0.5, 0.6, 12);
    const mouth = B.sph(0.026, M.b(0x180305), 0, H(0.91), 0.146, head, 1.2, 1.0, 0.45, 14); mouth.visible = false; u.mouth = mouth;
    /* nurse hat with a red cross */
    const hat = new THREE.Group(); hat.position.set(0, H(1.135), 0.035); hat.rotation.x = -0.2; head.add(hat);
    B.rbox(0.25, 0.075, 0.105, 0.02, m.white, 0, 0, 0, hat); B.rbox(0.21, 0.03, 0.095, 0.012, m.white, 0, 0.047, -0.006, hat);
    B.rbox(0.014, 0.05, 0.006, 0.002, m.red, 0, 0.002, 0.0535, hat); B.rbox(0.05, 0.014, 0.006, 0.002, m.red, 0, 0.002, 0.0535, hat);
    [-1, 1].forEach((s) => B.sph(0.006, m.gold, s * 0.105, 0.01, 0.052, hat));
    B.bake(hat);
    /* ---- controls ---- */
    u.smile = 1;
    u.setSmile = function (k) { u.smile = k; lips.scale.set(1, 0.25 + 0.85 * k, 1); lower.visible = true; };
    u.setSmile(1);
    u.lookEyes = function (tx, ty, k) {
      u.eyes.forEach((e) => { e.position.set(e.userData.home.x + tx * 0.012, e.userData.home.y + (ty || 0) * 0.008, e.userData.home.z); e.rotation.y = tx * 0.5 * (k === undefined ? 1 : k); e.rotation.x = -(ty || 0) * 0.4; });
    };
    u.sitting = false; u.armBase = [0.14, 0.14];
    u.sit = function (on) { u.sitting = on; rig.position.y = on ? -0.2 : 0; u.legs.forEach((l) => { l.rotation.x = on ? -Math.PI / 2 : 0; }); };
    u.scared = false;
    u.setScare = function (on) {
      u.scared = on; mouth.visible = on; lips.visible = !on; lips.scale.set(on ? 1.5 : 1, on ? 1.5 : 0.25 + 0.85 * u.smile, 1);
      u.eyes.forEach((e) => e.scale.setScalar(on ? 1.35 : 1));
      u.arms.forEach((a, i) => { a.rotation.x = on ? -1.35 : -0.12; a.rotation.z = (i ? 1 : -1) * (on ? 0.5 : 0.14); });
    };
    // friendly animation: gentle idle sway + optional wave (u.waveOn)
    u.waveOn = false; u._w = 0; u.tilt = 0.06;
    u.tick = function (dt, t) {
      if (u.scared) return;
      u._w += ((u.waveOn ? 1 : 0) - u._w) * Math.min(1, dt * 5);
      const w = u._w, a = u.arms[1];
      a.rotation.z = 0.14 + w * (2.35 + Math.sin(t * 9) * 0.3 - 0.14); a.rotation.x = -0.12 + w * 0.12;
      u.arms[0].rotation.z = -0.14 - Math.sin(t * 1.2) * 0.02 * (1 - w);
      head.rotation.z = u.tilt * Math.sin(t * 0.9 + 1) * 0.6 + (w > 0.5 ? 0.06 : 0);
    };
    if (scale) g.scale.setScalar(scale);
    return g;
  };
  // makes a doll friendly: she faces you, her eyes follow, and she waves now and then. Returns an animation object for L.anims.
  B.dollFriend = function (doll, o) {
    o = o || {}; const u = doll.userData, st = { t: Math.random() * 5, wave: 0, cd: o.firstWave === undefined ? 1.5 : o.firstWave, yaw: doll.rotation.y };
    return {
      update(dt, t) {
        const G = window.G, p = G.player; st.t += dt;
        const dx = p.x - doll.position.x, dz = p.z - doll.position.z, d = Math.hypot(dx, dz);
        let target = Math.atan2(dx, dz); const base = o.baseYaw !== undefined ? o.baseYaw : doll.rotation.y;
        if (o.bodyTurn === false) { target = base; }
        let diff = Math.atan2(Math.sin(target - doll.rotation.y), Math.cos(target - doll.rotation.y));
        if (o.bodyTurn !== false) { doll.rotation.y += clamp(diff, -dt * 1.6, dt * 1.6) * (d < 12 ? 1 : 0.2); diff = Math.atan2(Math.sin(Math.atan2(dx, dz) - doll.rotation.y), Math.cos(Math.atan2(dx, dz) - doll.rotation.y)); }
        else diff = Math.atan2(Math.sin(Math.atan2(dx, dz) - doll.rotation.y), Math.cos(Math.atan2(dx, dz) - doll.rotation.y));
        const hy = clamp(diff, -0.9, 0.9); u.head.rotation.y += (hy - u.head.rotation.y) * Math.min(1, dt * 3);
        u.lookEyes(clamp(diff * 1.2, -1, 1), clamp(-0.1 + (p.h - 1.0 - doll.position.y) * 0.1, -0.6, 0.6));
        st.cd -= dt;
        if (st.cd <= 0) { u.waveOn = !u.waveOn; st.cd = u.waveOn ? (o.waveLen || 3.2) : (o.waveGap || 7) + Math.random() * 3; if (u.waveOn && d > (o.waveRange || 9)) { u.waveOn = false; st.cd = 2; } else if (u.waveOn && o.onWave) o.onWave(d); }
        u.tick(dt, t);
      }
    };
  };

  /* ======================= Mom ======================= */
  B.mom = function () {
    const g = new THREE.Group(), u = g.userData, r = seeded(3);
    const skin = M.p(0xf0c8a8, 75, 0x554444), face = M.tp(T.momFace ? T.momFace() : T.dollFace({ skin: '#f3cdae', blush: 0.8 }), 75, 0x554444), top = M.tp(T.fabric('#1f8f8b'), 55, 0x667777, { side: THREE.DoubleSide }), shirt = M.tp(T.fabric('#fff6e6'), 20, 0x222222);
    const skirt = M.tp(T.fabric('#6e2f5e'), 40, 0x443344, { side: THREE.DoubleSide }), hair = M.tp(T.hairBrown(), 90, 0x887766, { side: THREE.DoubleSide });
    const shoeM = M.p(0x3a2a2a, 90, 0x886666), tights = M.p(0xe4b996, 70, 0x554444);
    /* legs (slim, slightly tapered), ballet flats */
    [-1, 1].forEach((s) => {
      B.lathe([[0.034, 0.08], [0.042, 0.2], [0.05, 0.36], [0.058, 0.52], [0.062, 0.7]], tights, s * 0.075, 0, 0, g, 16);
      B.sph(0.05, shoeM, s * 0.075, 0.03, 0.035, g, 0.9, 0.5, 2.1, 14);
    });
    /* pleated skirt (plum) + waist band */
    B.lathe([[0.125, 0.98], [0.14, 0.93], [0.185, 0.82], [0.235, 0.7], [0.262, 0.6]], skirt, 0, 0, 0, g, 36).scale.z = 0.82;
    B.torus(0.127, 0.012, M.p(0x3c1a35, 60, 0x333333), 0, 0.985, 0, g, TAU, 20).rotation.x = Math.PI / 2;
    /* teal top: waist -> bust -> shoulders (elliptical, narrower front to back) */
    const torso = B.lathe([[0.12, 0.97], [0.135, 1.06], [0.152, 1.18], [0.168, 1.27], [0.17, 1.34], [0.13, 1.405], [0.058, 1.44]], top, 0, 0, 0, g, 32); torso.scale.set(1.12, 1, 0.72);
    B.lathe([[0.062, 1.425], [0.066, 1.4], [0.09, 1.372]], shirt, 0, 0, 0.018, g, 18, -1.3, 2.6);               // soft collar
    B.cyl(0.043, 0.05, 0.11, skin, 0, 1.465, 0, g, 14);
    B.torus(0.058, 0.0035, M.p(0xe8d6a8, 120, 0xffffff), 0, 1.41, 0.012, g, TAU, 20).rotation.x = Math.PI / 2;       // necklace
    u.armR = null;
    [-1, 1].forEach((s) => {
      const arm = new THREE.Group(); arm.position.set(s * 0.215, 1.36, 0); g.add(arm);
      B.sph(0.056, top, 0, -0.005, 0, arm, 1, 1.0, 1, 16);
      B.lathe([[0.05, 0.0], [0.046, -0.14], [0.042, -0.27]], top, 0, 0, 0, arm, 14);                                 // short sleeve + upper arm
      const fore = new THREE.Group(); fore.position.set(0, -0.285, 0); fore.rotation.x = -0.18; arm.add(fore);
      B.lathe([[0.04, 0.02], [0.034, -0.12], [0.027, -0.255]], skin, 0, 0, 0, fore, 14);
      B.sph(0.04, skin, 0, -0.29, 0.0, fore, 0.8, 1.35, 0.55, 14); B.sph(0.014, skin, s * 0.03, -0.265, 0.012, fore, 1, 1.5, 0.8, 8); // hand + thumb
      arm.rotation.z = s * 0.1; if (s > 0) u.armR = arm; else u.armL = arm;
    });
    const head = new THREE.Group(); head.position.set(0, 1.56, 0); g.add(head); u.head = head;
    const hd = new THREE.Mesh(new THREE.SphereGeometry(0.135, 40, 28), face); hd.scale.set(1, 1.08, 1); hd.position.y = 0.08; head.add(hd);
    const hc = new THREE.Mesh(new THREE.SphereGeometry(0.147, 40, 24, Math.PI / 2 + 0.85, TAU - 1.7, 0, 2.2), hair); hc.position.set(0, 0.095, -0.012); head.add(hc);
    const hb = new THREE.Mesh(new THREE.SphereGeometry(0.143, 32, 22, Math.PI * 1.5 - 1.5, 3.0, 0.45, 2.2), hair); hb.position.set(0, -0.02, -0.03); hb.scale.set(1.12, 1.9, 1.0); head.add(hb);
    for (let i = 0; i < 12; i++) { const side = i < 6 ? 1 : -1, k = (i % 6) / 5; const pts = []; for (let q = 0; q <= 4; q++) { const t = q / 4; pts.push(surf(0.3 + (1.0 + k * 0.3 - 0.3) * (t * t * 0.4 + t * 0.6), Math.PI / 2 - side * 0.1 + side * (0.45 + k * 0.7 + 0.1) * t, 0.152, 0.095)); } head.add(B.taperTube(pts.map((p) => [p[0], p[1], p[2] - 0.005]), 0.011, 0.007, 10, 5, hair)); }
    [-1, 1].forEach((s) => { for (let i = 0; i < 4; i++) head.add(B.taperTube(lock([s * (0.13 + i * 0.004), 0.07 - i * 0.01, 0.01 + i * 0.012], [s * 0.05, -1, 0.1], 0.42, 0.012, 1.6 + r() * 0.3, r() * 6, 0.05), 0.017, 0.007, 14, 5, hair)); });
    
    B.bake(head);   // hair + bun in one go (the face sphere has its own material and stays separate)
    const eyeW = M.phys({ color: 0xf6f2ee, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.03 }, 1.2), iris = M.phys({ color: 0x5a3418, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.03 }, 1.2), pup = M.b(0x050505);
    [-1, 1].forEach((s) => {
      const e = new THREE.Group(); e.position.set(s * 0.048, 0.1, 0.116); head.add(e); e.rotation.y = s * 0.38;
      B.sph(0.022, eyeW, 0, 0, 0, e, 1, 1.0, 0.5, 16); B.sph(0.0135, iris, 0, -0.001, 0.008, e, 1, 1, 0.5, 14); B.sph(0.0068, pup, 0, -0.001, 0.0125, e, 1, 1, 0.5, 8); B.sph(0.0035, M.b(0xffffff), -0.005, 0.005, 0.0155, e, 1, 1, 0.5, 6);
      B.sph(0.0235, skin, 0, 0.009, 0.002, e, 1, 0.5, 0.62, 14);   // upper eyelid
    });
    B.sph(0.014, M.p(0xe9b394, 20, 0x333333), 0, 0.062, 0.14, head, 1, 0.9, 0.9, 10);
    const sm = B.torus(0.034, 0.0055, M.p(0xc94a62, 100, 0xffffff), 0, 0.058, 0.12, head, Math.PI * 0.85, 20); sm.rotation.z = -Math.PI / 2 - Math.PI * 0.425; sm.position.y = 0.083; sm.scale.y = 0.8;
    [-1, 1].forEach((s) => B.sph(0.007, M.p(0xe8c860, 100, 0xffffff), s * 0.138, 0.04, 0.0, head, 1, 1.4, 1, 8));
    return g;
  };

  /* ======================= furniture ======================= */
  const woodDk = M.wood(0x7a4e2a), woodLt = M.wood(0xb98a55);
  B.table = function (w, d, h, topMat, legMat) {
    const g = new THREE.Group(), top = topMat || woodLt, leg = legMat || woodDk;
    B.rbox(w, 0.05, d, 0.02, top, 0, h - 0.025, 0, g);
    B.rbox(w - 0.14, 0.07, d - 0.14, 0.01, leg, 0, h - 0.085, 0, g);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach((p) => B.cyl(0.032, 0.022, h - 0.05, leg, p[0] * (w / 2 - 0.07), (h - 0.05) / 2, p[1] * (d / 2 - 0.07), g, 10));
    return B.bake(g);
  };
  B.chair = function (mat) {
    const g = new THREE.Group(); mat = mat || woodLt;
    B.rbox(0.44, 0.05, 0.44, 0.02, mat, 0, 0.45, 0, g);
    B.rbox(0.4, 0.06, 0.03, 0.012, mat, 0, 0.9, -0.2, g); B.rbox(0.4, 0.05, 0.03, 0.012, mat, 0, 0.78, -0.2, g);
    [-1, 1].forEach((s) => B.rbox(0.035, 0.52, 0.035, 0.012, woodDk, s * 0.18, 0.7, -0.2, g));
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach((p) => B.cyl(0.024, 0.017, 0.43, woodDk, p[0] * 0.18, 0.215, p[1] * 0.18, g, 8));
    B.rbox(0.4, 0.03, 0.4, 0.014, M.l(0xf2e6cc), 0, 0.49, 0.0, g);
    return B.bake(g);
  };
  function fabricOf(mat) { return mat && mat.color ? M.fab(mat.color.getHex()) : M.fab(0x9b3d3d); }
  B.sofa = function (w, mat) {
    const g = new THREE.Group(); w = w || 2.1; const fm = fabricOf(mat), col = mat && mat.color ? mat.color.getHex() : 0x9b3d3d, lighter = M.fab(new THREE.Color(col).offsetHSL(0, 0, 0.07).getHex());
    B.rbox(w, 0.24, 0.9, 0.06, fm, 0, 0.26, 0, g);
    B.rbox(w, 0.55, 0.22, 0.09, fm, 0, 0.62, -0.34, g);
    [-1, 1].forEach((s) => B.rbox(0.2, 0.46, 0.9, 0.08, fm, s * (w / 2 - 0.1), 0.45, 0, g));
    const n = w > 1.5 ? 2 : 1, cw = (w - 0.4) / n - 0.02;
    for (let i = 0; i < n; i++) { const cx = -(w - 0.4) / 2 + (i + 0.5) * (w - 0.4) / n; B.rbox(cw, 0.15, 0.62, 0.06, lighter, cx, 0.46, 0.1, g); const bk = B.rbox(cw, 0.34, 0.14, 0.06, lighter, cx, 0.68, -0.19, g); bk.rotation.x = -0.18; }
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach((p) => B.cyl(0.035, 0.025, 0.1, woodDk, p[0] * (w / 2 - 0.1), 0.05, p[1] * 0.38, g, 8));
    const pm = M.t(T.quilt('#f6c3d5', '#fff6f0'));
    [-1, 1].forEach((s, i) => { if (w < 1.5 && i) return; const p = B.rbox(0.3, 0.3, 0.1, 0.045, pm, s * (w / 2 - 0.36), 0.65, 0.0, g); p.rotation.set(-0.2, s * 0.35, s * 0.18); });
    return B.bake(g);
  };
  B.bed = function (blanket) {
    const g = new THREE.Group(), qm = M.t(T.quilt(B.hexs(blanket || 0xe07a9a), '#fff1f6')), sheet = M.fab(0xfaf5ec);
    B.rbox(1.0, 0.22, 2.0, 0.04, woodDk, 0, 0.26, 0, g);
    B.rbox(0.94, 0.2, 1.94, 0.06, sheet, 0, 0.5, 0, g);
    B.rbox(0.98, 0.1, 1.28, 0.05, qm, 0, 0.62, 0.34, g);
    B.rbox(0.99, 0.16, 0.12, 0.05, sheet, 0, 0.62, -0.28, g);
    [-1, 1].forEach((s) => { const p = B.rbox(0.4, 0.13, 0.28, 0.06, M.fab(0xffffff), s * 0.22, 0.68, -0.78, g); p.rotation.z = s * 0.06; });
    B.rbox(1.04, 0.85, 0.07, 0.03, woodDk, 0, 0.72, -1.0, g); B.sph(0.05, woodDk, -0.48, 1.18, -1.0, g); B.sph(0.05, woodDk, 0.48, 1.18, -1.0, g);
    B.rbox(1.04, 0.4, 0.06, 0.025, woodDk, 0, 0.42, 1.0, g);
    return B.bake(g);
  };
  B.bookshelf = function (w, h, d) {
    const g = new THREE.Group(); w = w || 1.2; h = h || 2.0; d = d || 0.35; const r = seeded(11), rows = 5, step = (h - 0.06) / rows;
    B.rbox(0.04, h, d, 0.01, woodDk, -w / 2 + 0.02, h / 2, 0, g); B.rbox(0.04, h, d, 0.01, woodDk, w / 2 - 0.02, h / 2, 0, g);
    B.box(w - 0.08, h, 0.02, M.wood(0x4a2f1a), 0, h / 2, -d / 2 + 0.01, g);
    for (let i = 0; i <= rows; i++) B.rbox(w, 0.035, d, 0.008, woodDk, 0, 0.0175 + i * step, 0, g);
    B.rbox(w + 0.04, 0.05, d + 0.04, 0.012, woodDk, 0, h - 0.015, 0, g);
    const cols = [0xc0392b, 0x2e86c1, 0x27ae60, 0xf1c40f, 0x8e44ad, 0xe67e22, 0x16a085, 0xd35400, 0xec7063, 0x5dade2];
    const books = []; const geo = new THREE.BoxGeometry(1, 1, 1);
    for (let i = 0; i < rows; i++) {
      let x = -w / 2 + 0.07; const y0 = 0.035 + i * step;
      while (x < w / 2 - 0.1) {
        if (r() < 0.07) { x += 0.08; continue; }
        const bw = 0.025 + r() * 0.03, bh = step * (0.55 + r() * 0.38), bd = d * (0.6 + r() * 0.25), tilt = r() < 0.06 ? 0.2 : 0;
        const bg = geo.clone(); bg.scale(bw, bh, bd); bg.rotateZ(tilt); bg.translate(x + bw / 2, y0 + bh / 2, 0.01 + (d * 0.8 - bd) * 0.1); B.colorGeo(bg, cols[(r() * cols.length) | 0]); books.push(bg); x += bw + 0.004;
      }
    }
    g.add(new THREE.Mesh(B.mergeGeos(books, true), M.vc));
    return B.bake(g);
  };
  B.frame = function (w, h, tex, o) {
    o = o || {}; const g = new THREE.Group(), fr = new THREE.Group(), gold = o.wood ? M.wood(0x5a3a22) : M.p(0xcaa24c, 70, 0xffeeaa), t = o.thick || 0.06;
    B.rbox(w + t * 2, t, 0.06, 0.015, gold, 0, h / 2 + t / 2, 0, fr); B.rbox(w + t * 2, t, 0.06, 0.015, gold, 0, -h / 2 - t / 2, 0, fr);
    B.rbox(t, h, 0.06, 0.015, gold, -w / 2 - t / 2, 0, 0, fr); B.rbox(t, h, 0.06, 0.015, gold, w / 2 + t / 2, 0, 0, fr);
    B.box(w + 0.02, h + 0.02, 0.02, M.l(0x2a1a10), 0, 0, -0.012, fr);
    B.bake(fr); g.add(fr);
    B.plane(w, h, M.tb(tex), 0, 0, 0.02, g);
    const glass = B.plane(w, h, new THREE.MeshBasicMaterial({ map: T.mirror(), color: 0xffffff, transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending }), 0, 0, 0.024, g);
    return g;
  };
  B.rug = function (w, d, color, color2, rx, rz) {
    const g = new THREE.Group(), mat = M.t(T.rug(B.hexs(color), B.hexs(color2), '#ffffff'));
    const geo = B.rbGeo(w, 0.024, d, 0.011).clone(), uv = geo.attributes.uv, p = geo.attributes.position; rx = rx || 1; rz = rz || 1;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) / w + 0.5) * rx, (0.5 - p.getZ(i) / d) * rz);
    const top = new THREE.Mesh(geo, mat); top.position.y = 0.012; g.add(top);
    return g;
  };
  B.floorLamp = function (shade) {
    const g = new THREE.Group(), brass = M.p(0xb8893a, 90, 0xffeeaa);
    B.lathe([[0.001, 0], [0.16, 0], [0.17, 0.02], [0.12, 0.045], [0.04, 0.07], [0.018, 0.1]], brass, 0, 0, 0, g, 20);
    B.cyl(0.014, 0.014, 1.3, brass, 0, 0.75, 0, g, 8); B.sph(0.03, brass, 0, 1.4, 0, g);
    const sm = M.l(shade || 0xffe0a0, { emissive: 0xa07828, side: THREE.DoubleSide });
    B.lathe([[0.15, 1.34], [0.17, 1.42], [0.2, 1.62], [0.14, 1.7]].reverse(), sm, 0, 0, 0, g, 24).geometry.computeVertexNormals();
    const halo = B.glow('rgba(255,214,130,0.55)', 1.5); halo.position.y = 1.55; g.add(halo);
    return g;
  };
  B.ceilLight = function (r, mat) {
    r = r || 0.2; const g = new THREE.Group();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 10, 0, TAU, Math.PI / 2, Math.PI / 2), mat); g.add(dome);
    B.torus(r, 0.012, M.p(0xf4ead2, 60, 0xffffff), 0, 0, 0, g, TAU, 24).rotation.x = Math.PI / 2;
    return g;
  };
  B.teddy = function (color) {
    const g = new THREE.Group(), fur = M.fab(color || 0xb07a45), lt = M.fab(0xe9ceA4), dark = M.p(0x120a08, 200, 0xffffff), pink = M.l(0xf2a0b4);
    B.sph(0.14, fur, 0, 0.17, 0, g, 1, 1.1, 0.9, 18); B.sph(0.095, lt, 0, 0.17, 0.085, g, 1, 1.1, 0.5, 14);
    const head = new THREE.Group(); head.position.set(0, 0.4, 0.01); g.add(head);
    B.sph(0.108, fur, 0, 0, 0, head, 1, 0.95, 0.95, 20); B.sph(0.05, lt, 0, -0.03, 0.085, head, 1, 0.8, 0.8, 12); B.sph(0.014, dark, 0, -0.012, 0.128, head, 1, 0.8, 0.8, 8);
    [-1, 1].forEach((s) => { B.sph(0.04, fur, s * 0.075, 0.09, 0, head, 1, 1, 0.6, 12); B.sph(0.024, pink, s * 0.075, 0.09, 0.012, head, 1, 1, 0.5, 8); B.sph(0.015, dark, s * 0.04, 0.025, 0.098, head, 1, 1, 0.8, 8); B.sph(0.0045, M.b(0xffffff), s * 0.04 - 0.004, 0.03, 0.108, head, 1, 1, 1, 6); });
    [-1, 1].forEach((s) => { const a = B.sph(0.045, fur, s * 0.15, 0.2, 0.03, g, 1, 1.5, 1, 12); a.rotation.z = s * -0.5; const l = B.sph(0.055, fur, s * 0.085, 0.045, 0.06, g, 1, 0.9, 1.3, 12); B.sph(0.03, lt, s * 0.085, 0.04, 0.105, g, 1, 0.9, 0.5, 8); });
    const bow = M.l(0xe53948); [-1, 1].forEach((s) => { const c = B.cyl(0, 0.03, 0.06, bow, s * 0.035, 0.31, 0.07, g, 8); c.rotation.z = s * Math.PI / 2; }); B.sph(0.014, bow, 0, 0.31, 0.07, g);
    return B.bake(g);
  };
  B.toyBlocks = function (n) {
    const g = new THREE.Group(), cols = ['#e53935', '#fdd835', '#1e88e5', '#43a047', '#fb8c00'], letters = ['A', 'B', 'C', '1', '2'], r = seeded(n * 13 + 1);
    for (let i = 0; i < n; i++) { const mat = M.t(T.letterBlock(letters[i % 5], cols[i % 5])); const b = B.rbox(0.14, 0.14, 0.14, 0.02, mat, (i % 2) * 0.15 - 0.07 + (r() - 0.5) * 0.04, 0.07 + ((i / 2) | 0) * 0.14, (r() - 0.5) * 0.04, g); b.rotation.y = (r() - 0.5) * 0.6; }
    return g;
  };
  B.ball = (c, r) => { r = r || 0.12; const g = new THREE.Group(); B.sph(r, M.p(c, 90, 0xffffff), 0, r, 0, g, 1, 1, 1, 20); const st = B.torus(r * 1.0, r * 0.12, M.l(0xffffff), 0, r, 0, g, TAU, 24); st.rotation.x = 0.4; return g; };
  B.fridge = function () {
    const g = new THREE.Group(), body = M.p(0xe8eef2, 70, 0x888888), metal = M.p(0xb9c0c6, 90, 0xffffff);
    B.rbox(0.8, 1.85, 0.75, 0.04, body, 0, 0.925, 0, g);
    B.box(0.78, 0.012, 0.01, M.l(0x555a60), 0, 1.25, 0.376, g);
    [1.55, 0.95].forEach((y, i) => B.rbox(0.03, i ? 0.7 : 0.4, 0.04, 0.012, metal, 0.3, y, 0.4, g));
    B.rbox(0.82, 0.07, 0.6, 0.02, M.l(0x30343a), 0, 0.035, 0.05, g);
    return B.bake(g);
  };
  B.counter = function (w, cabColor) {
    const g = new THREE.Group(), tex = T.cabinet(cabColor || '#7b8f6a'), mat = M.tp(tex, 20, 0x222222);
    const geo = B.uvScale(new THREE.BoxGeometry(w, 0.85, 0.6), w / 0.9, 1); const cab = new THREE.Mesh(geo, mat); cab.position.y = 0.425; g.add(cab);
    B.rbox(w + 0.04, 0.05, 0.66, 0.015, M.p(0xf1ece0, 60, 0x888888), 0, 0.875, 0.01, g);
    return g;
  };
  B.piano = function () {
    const g = new THREE.Group(), dark = M.p(0x1b1512, 90, 0x886655), white = M.p(0xfaf6ea, 40, 0x555555), blk = M.p(0x101010, 90, 0x777777);
    B.rbox(1.6, 1.15, 0.55, 0.03, dark, 0, 0.575, -0.1, g);
    B.rbox(1.64, 0.05, 0.6, 0.02, dark, 0, 1.17, -0.1, g);
    B.rbox(1.6, 0.08, 0.4, 0.02, dark, 0, 0.74, 0.2, g);
    B.rbox(1.5, 0.04, 0.22, 0.01, M.l(0xffffff), 0, 0.8, 0.26, g);
    for (let i = 0; i < 14; i++) B.rbox(0.1, 0.03, 0.2, 0.006, white, -0.69 + i * 0.106, 0.825, 0.26, g);
    [0, 1, 3, 4, 5, 7, 8, 10, 11, 12].forEach((i) => B.rbox(0.055, 0.04, 0.12, 0.008, blk, -0.64 + i * 0.106, 0.85, 0.22, g));
    ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa', '#ec407a'].forEach((c, i) => B.cyl(0.026, 0.026, 0.004, M.b(c), -0.318 + i * 0.106, 0.846, 0.32, g, 14));
    [-0.7, 0.7].forEach((x) => B.cyl(0.04, 0.03, 0.7, dark, x, 0.35, 0.35, g, 10));
    B.rbox(1.3, 0.5, 0.03, 0.01, M.wood(0x2a1c14), 0, 1.0, 0.16, g);
    B.rbox(0.8, 0.28, 0.02, 0.01, M.l(0xfff6dc), 0, 1.04, 0.145, g);
    [-0.25, 0.25].forEach((x) => B.box(0.06, 0.02, 0.08, M.p(0xb8893a, 90, 0xffeeaa), x, 0.07, 0.4, g));
    B.rbox(1.1, 0.07, 0.4, 0.03, M.l(0x7a2a2a), 0, 0.5, 0.85, g); B.rbox(1.14, 0.04, 0.42, 0.015, woodDk, 0, 0.45, 0.85, g);
    [-0.45, 0.45].forEach((x) => B.cyl(0.03, 0.022, 0.45, woodDk, x, 0.225, 0.85, g, 8));
    return B.bake(g);
  };
  B.plant = function (s) {
    s = s || 1; const g = new THREE.Group(), r = seeded(21);
    B.lathe([[0.001, 0], [0.13, 0], [0.17, 0.3], [0.19, 0.31], [0.19, 0.36], [0.16, 0.36], [0.15, 0.3]], M.p(0xc2622d, 30, 0x442211, { side: THREE.DoubleSide }), 0, 0, 0, g, 20);
    B.cyl(0.15, 0.15, 0.01, M.l(0x3a2a1a), 0, 0.33, 0, g, 12);
    const leafM = [M.l(0x3f9a45), M.l(0x2f8038), M.l(0x58b04f)];
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU + r(), tl = 0.5 + r() * 0.55, lf = B.sph(0.07, leafM[i % 3], Math.sin(a) * 0.1, 0.33 + tl * 0.45, Math.cos(a) * 0.1, g, 0.9, 3.4 + r(), 0.28, 8); lf.rotation.set(Math.cos(a) * (0.5 + r() * 0.5), a, 0); lf.rotation.order = 'YXZ'; lf.rotation.x = 0.35 + r() * 0.5; }
    g.scale.setScalar(s); return B.bake(g);
  };
  B.balloon = function (color, r) {
    r = r || 0.22; const g = new THREE.Group();
    B.sph(r, M.p(color, 120, 0xffffff), 0, 0, 0, g, 1, 1.18, 1, 16); B.cyl(0.0, 0.025, 0.04, M.p(color, 60, 0x888888), 0, -r * 1.2, 0, g, 6).rotation.x = Math.PI;
    B.sph(r * 0.16, M.b(0xffffff), -r * 0.35, r * 0.45, r * 0.78, g, 1, 1.4, 0.3, 6);
    return g;
  };
  // string of little flags between two points
  B.bunting = function (a, b, n, sag, cols) {
    const pos = [], col = [], c = new THREE.Color(), idx = []; cols = cols || [0xff5d8f, 0x5dc8ff, 0xffd93d, 0x7ee081, 0xb48cff, 0xff9a4d];
    const pt = (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, a[2] + (b[2] - a[2]) * t];
    for (let i = 0; i < n; i++) {
      const p0 = pt((i + 0.15) / n), p1 = pt((i + 0.85) / n), pm = pt((i + 0.5) / n); c.set(cols[i % cols.length]);
      const base = pos.length / 3; pos.push(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], pm[0], pm[1] - 0.3, pm[2]);
      for (let k = 0; k < 3; k++) col.push(c.r, c.g, c.b); idx.push(base, base + 1, base + 2);
    }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); gg.setIndex(idx); gg.computeVertexNormals();
    return new THREE.Mesh(gg, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, emissive: 0x333333 }));
  };
  B.toyBox = function (color, label) {
    const g = new THREE.Group(); const tex = T.card(128, 160, B.hexs(color), [{ t: label || 'TOY', s: 34, c: '#fff' }], { border: '#fff', bw: 6, draw(x, w, h) { x.fillStyle = 'rgba(255,255,255,0.35)'; x.beginPath(); x.ellipse(64, 108, 38, 30, 0, 0, 7); x.fill(); } });
    B.rbox(0.2, 0.26, 0.09, 0.01, M.l(color), 0, 0.13, 0, g); B.plane(0.18, 0.225, M.tb(tex), 0, 0.13, 0.047, g);
    return g;
  };
  B.duck = function () { const g = new THREE.Group(), y = M.p(0xffd23f, 70, 0xffffff); B.sph(0.09, y, 0, 0.09, 0, g, 1, 0.85, 1.1, 14); B.sph(0.055, y, 0, 0.19, 0.05, g, 1, 1, 1, 12); B.sph(0.03, M.p(0xff8a1f, 40, 0x666666), 0, 0.18, 0.1, g, 1.2, 0.5, 1, 8); B.sph(0.009, M.b(0x111111), 0.025, 0.205, 0.088, g); B.sph(0.009, M.b(0x111111), -0.025, 0.205, 0.088, g); return B.bake(g); };

  /* ======================= toys (bright and cheerful) ======================= */
  B.bunny = function () {
    const g = new THREE.Group(), fur = M.fab(0xfaf4f7), pink = M.l(0xffa0b8), dark = M.p(0x120a08, 200, 0xffffff);
    B.sph(0.12, fur, 0, 0.13, 0, g, 1, 1.1, 0.95, 16); B.sph(0.09, fur, 0, 0.3, 0.02, g, 1, 0.95, 0.95, 16);
    [-1, 1].forEach((s) => { const e = B.sph(0.032, fur, s * 0.045, 0.46, 0, g, 1, 3.4, 0.8, 10); e.rotation.z = s * -0.12; B.sph(0.018, pink, s * 0.045, 0.46, 0.012, g, 1, 3.0, 0.5, 8).rotation.z = s * -0.12; B.sph(0.012, dark, s * 0.035, 0.32, 0.088, g, 1, 1, 0.8, 8); B.sph(0.004, M.b(0xffffff), s * 0.035 - 0.003, 0.325, 0.097, g, 1, 1, 1, 6); B.sph(0.04, fur, s * 0.07, 0.03, 0.06, g, 1, 0.7, 1.4, 10); });
    B.sph(0.02, pink, 0, 0.288, 0.105, g, 1, 0.8, 0.8, 8); B.sph(0.04, fur, 0, 0.12, -0.12, g, 1, 1, 1, 10);
    return B.bake(g);
  };
  B.robot = function (c) {
    const g = new THREE.Group(), m = M.p(c || 0x9aa5b1, 80, 0x888888), acc = M.p(0xffd23f, 60, 0x888888);
    B.rbox(0.2, 0.22, 0.14, 0.03, m, 0, 0.25, 0, g); B.rbox(0.16, 0.13, 0.13, 0.03, m, 0, 0.43, 0, g);
    [-1, 1].forEach((s) => { B.rbox(0.05, 0.2, 0.05, 0.015, m, s * 0.14, 0.25, 0, g); B.rbox(0.065, 0.15, 0.065, 0.015, m, s * 0.06, 0.075, 0, g); B.sph(0.022, M.b(0x66ff99), s * 0.04, 0.44, 0.066, g, 1, 1, 0.5, 8); B.sph(0.012, acc, s * 0.09, 0.43, 0, g); });
    B.cyl(0.008, 0.008, 0.07, m, 0, 0.53, 0, g, 6); B.sph(0.02, M.b(0xff4466), 0, 0.57, 0, g, 1, 1, 1, 8);
    B.rbox(0.1, 0.07, 0.01, 0.005, M.b(0x203040), 0, 0.26, 0.072, g); [-1, 0, 1].forEach((i) => B.sph(0.009, M.b([0xff4040, 0xffd040, 0x40ff60][i + 1]), i * 0.03, 0.26, 0.08, g, 1, 1, 0.5, 6));
    return B.bake(g);
  };
  B.toyCar = function (c) {
    const g = new THREE.Group(), body = M.p(c, 90, 0xffffff);
    B.rbox(0.3, 0.07, 0.14, 0.03, body, 0, 0.075, 0, g); B.rbox(0.15, 0.07, 0.12, 0.03, body, -0.02, 0.135, 0, g); B.rbox(0.12, 0.045, 0.125, 0.015, M.b(0xbfe9ff), -0.02, 0.138, 0, g);
    B.sph(0.016, M.b(0xfff6b0), 0.15, 0.085, 0.045, g); B.sph(0.016, M.b(0xfff6b0), 0.15, 0.085, -0.045, g);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach((p) => { B.cyl(0.04, 0.04, 0.03, M.l(0x222222), p[0] * 0.1, 0.04, p[1] * 0.07, g, 12).rotateX(Math.PI / 2); B.cyl(0.02, 0.02, 0.032, M.p(0xe8e8e8, 90, 0xffffff), p[0] * 0.1, 0.04, p[1] * 0.07, g, 8).rotateX(Math.PI / 2); });
    return B.bake(g);
  };
  B.rocket = function () {
    const g = new THREE.Group();
    B.cyl(0.06, 0.06, 0.3, M.p(0xf4f4fb, 90, 0xffffff), 0, 0.2, 0, g, 16); B.cyl(0, 0.06, 0.13, M.p(0xe53935, 90, 0xffffff), 0, 0.415, 0, g, 16);
    B.sph(0.026, M.p(0x58b8ff, 120, 0xffffff), 0, 0.26, 0.055, g, 1, 1, 0.5, 10);
    [0, 1, 2].forEach((i) => { const f = B.box(0.02, 0.11, 0.08, M.l(0xe53935), Math.cos(i * 2.09) * 0.07, 0.08, Math.sin(i * 2.09) * 0.07, g); f.rotation.y = -i * 2.09; });
    return B.bake(g);
  };
  B.shelfUnit = function (w, h, d, shelves, color) {
    const g = new THREE.Group(), cm = M.p(color || 0xf2f2f2, 40, 0x555555), back = M.t(T.toyWall('#cfe6ff', '#ffffff'));
    B.rbox(0.04, h, d, 0.01, cm, -w / 2, h / 2, 0, g); B.rbox(0.04, h, d, 0.01, cm, w / 2, h / 2, 0, g);
    const bk = B.box(w, h, 0.03, back, 0, h / 2, -d / 2, g); bk.geometry = B.uvScale(new THREE.BoxGeometry(w, h, 0.03), w / 1.4, h / 1.4);
    for (let i = 0; i <= shelves; i++) B.rbox(w, 0.04, d, 0.01, cm, 0, 0.02 + i * (h - 0.04) / shelves, 0, g);
    g.userData.levels = []; for (let i = 0; i < shelves; i++) g.userData.levels.push(0.04 + i * (h - 0.04) / shelves);
    return B.bake(g);
  };

  /* ======================= factory pieces ======================= */
  B.conveyor = function (len, w) {
    const g = new THREE.Group(); w = w || 1.0;
    B.box(len, 0.5, w + 0.2, M.tp(T.metal('#4a5059'), 40, 0x444444), 0, 0.35, 0, g);
    const tex = T.belt().clone(); tex.needsUpdate = true; tex.repeat.set(len * 2, w * 1.5); tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    const belt = B.plane(len, w, new THREE.MeshLambertMaterial({ map: tex }), 0, 0.605, 0, g); belt.rotation.x = -Math.PI / 2;
    g.userData.tex = tex;
    const legs = new THREE.Group(); g.add(legs);
    for (let i = 0; i <= len; i += 1.2) { const x = -len / 2 + i; [-1, 1].forEach((s) => B.box(0.1, 0.35, 0.1, M.l(0x30343a), x, 0.1, s * (w / 2 + 0.05), legs)); }
    [-1, 1].forEach((s) => B.rbox(len, 0.1, 0.06, 0.02, M.p(0xe8b800, 50, 0x888888), 0, 0.68, s * (w / 2 + 0.08), legs));
    B.bake(legs);
    return g;
  };
  B.gear = function (r, teeth, mat) {
    const g = new THREE.Group(); mat = mat || M.p(0xb08a40, 60, 0x887744);
    B.cyl(r, r, 0.1, mat, 0, 0, 0, g, 24).rotation.x = Math.PI / 2;
    for (let i = 0; i < teeth; i++) { const a = i / teeth * TAU; const t = B.box(r * 0.28, r * 0.28, 0.1, mat, Math.cos(a) * r * 1.07, Math.sin(a) * r * 1.07, 0, g); t.rotation.z = a; }
    B.cyl(r * 0.25, r * 0.25, 0.14, M.l(0x333333), 0, 0, 0, g, 12).rotation.x = Math.PI / 2;
    return B.bake(g);
  };
  B.machine = function (w, h, d, color, lightColor) {
    const g = new THREE.Group();
    B.rbox(w, h, d, 0.06, M.p(color, 50, 0x555555), 0, h / 2, 0, g);
    B.rbox(w + 0.1, 0.12, d + 0.1, 0.03, M.l(0x2a2c30), 0, 0.06, 0, g);
    B.rbox(w * 0.6, h * 0.25, 0.04, 0.01, M.l(0x15181b), 0, h * 0.62, d / 2 + 0.02, g);
    const bulb = B.sph(0.07, M.b(lightColor || 0x66ff66), -w / 2 + 0.2, h * 0.88, d / 2 + 0.03, g);
    g.userData.bulb = bulb;
    B.cyl(0.07, 0.07, h * 0.6, M.p(0x8a929a, 70, 0xaaaaaa), w / 2 - 0.15, h + h * 0.3 - 0.1, -d / 4, g, 12);
    for (let i = 0; i < 3; i++) B.cyl(0.04, 0.04, 0.03, M.b([0xff4040, 0xffd040, 0x40ff60][i]), -w * 0.2 + i * w * 0.2, h * 0.4, d / 2 + 0.03, g, 12).rotation.x = Math.PI / 2;
    const rest = new THREE.Group(); g.children.slice().forEach((c) => { if (c !== bulb) { g.remove(c); rest.add(c); } }); B.bake(rest); g.add(rest);
    return g;
  };
  // doll parts (pickup items) - same look as the real doll
  B.part = function (kind) {
    const m = dollMats(), g = new THREE.Group();
    if (kind === 'head') {
      const hs = new THREE.Mesh(new THREE.SphereGeometry(0.12, 28, 20), m.face); hs.position.y = 0.12; hs.rotation.y = -Math.PI / 2 * 0 ; g.add(hs);
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.13, 28, 16, 0, TAU, 0, 1.75), m.hair); h.position.y = 0.125; g.add(h);
      [-1, 1].forEach((s) => { const e = B.sph(0.03, m.button, s * 0.05, 0.135, 0.105, g, 1, 1, 0.4, 12); B.sph(0.007, m.glint, s * 0.05 - 0.01, 0.145, 0.12, g, 1, 1, 0.4, 6); });
      B.sph(0.012, m.nose, 0, 0.1, 0.12, g);
    } else if (kind === 'body') {
      B.lathe([[0.001, 0.0], [0.17, 0.0], [0.15, 0.1], [0.09, 0.22], [0.075, 0.33]], m.blueD, 0, 0, 0, g, 24); B.cyl(0.078, 0.08, 0.1, m.white, 0, 0.34, 0, g, 16);
      B.lathe([[0.173, 0.0], [0.153, 0.1], [0.095, 0.22]], m.whiteD, 0, 0, 0, g, 16, -0.9, 1.8);
    } else if (kind === 'armL' || kind === 'armR') {
      B.cyl(0.03, 0.025, 0.28, m.skin, 0, 0.14, 0, g, 12); B.sph(0.055, m.blue, 0, 0.27, 0, g); B.sph(0.032, m.skin, 0, 0, 0, g);
      g.rotation.z = Math.PI / 2;
      const w = new THREE.Group(); w.add(g); return w;
    } else if (kind === 'legL' || kind === 'legR') {
      B.cyl(0.04, 0.035, 0.32, m.white, 0, 0.18, 0, g, 12); B.sph(0.045, m.shoe, 0, 0.03, 0.03, g, 1, 0.6, 1.7, 12);
      g.rotation.z = Math.PI / 2;
      const w = new THREE.Group(); w.add(g); return w;
    } else if (kind === 'hat') {
      B.rbox(0.24, 0.08, 0.1, 0.02, m.white, 0, 0.05, 0, g); B.rbox(0.2, 0.03, 0.09, 0.012, m.white, 0, 0.1, 0, g);
      B.rbox(0.014, 0.05, 0.006, 0.002, m.red, 0, 0.05, 0.052, g); B.rbox(0.05, 0.014, 0.006, 0.002, m.red, 0, 0.05, 0.052, g);
    }
    return g;
  };

  B.KEYS = [
    { n: 1, letter: 'C', solf: 'Do', color: '#e53935', name: 'RED' },
    { n: 2, letter: 'D', solf: 'Re', color: '#fb8c00', name: 'ORANGE' },
    { n: 3, letter: 'E', solf: 'Mi', color: '#fdd835', name: 'YELLOW' },
    { n: 4, letter: 'F', solf: 'Fa', color: '#43a047', name: 'GREEN' },
    { n: 5, letter: 'G', solf: 'Sol', color: '#1e88e5', name: 'BLUE' },
    { n: 6, letter: 'A', solf: 'La', color: '#8e24aa', name: 'PURPLE' },
    { n: 7, letter: 'B', solf: 'Ti', color: '#ec407a', name: 'PINK' }
  ];

  /* ======================= photographic billboard characters (window.SPRITES) =======================
     img/sprites.js (graphics/realistic/tools/cut_sprites.py + make_sprites_js.py) embeds cut-out photos: molly, mom, cashier.
     B.molly() / B.mom() then return an upright, camera-facing photo billboard with the SAME userData API as the 3D models
     (head, eyes, arms/armL/armR, legs, rig, setSmile, lookEyes, sit, setScare, tick, waveOn, ...), so game.js and the levels do not change.
     If a sprite is missing or fails to decode, the 3D models above are used unchanged. B.molly(scale, {model3d:true}) forces 3D (ending scene:
     her eyes have to turn there). B.photoPerson(key, heightMeters) gives any other sprite as a billboard (or null). */
  (function () {
    const M3 = { molly: B.molly, mom: B.mom };
    const SP = window.SPRITES || {}, TX = {}, ASP = {};
    const META = { molly: { h: 0.95, eye: 0.16 }, mom: { h: 1.7 }, cashier: { h: 0.9, shadow: false } };   // real-world height (m) of the whole cut-out; eye = eye height as fraction from the top
    // decode the embedded images before the game starts (B.ready is awaited by game.js)
    const loading = Object.keys(META).filter((k) => typeof SP[k] === 'string').map((k) => new Promise((res) => {
      try {
        const im = new Image();
        im.onload = () => { try { const t = new THREE.Texture(im); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.needsUpdate = true; TX[k] = t; ASP[k] = (SP.aspect && SP.aspect[k]) || im.width / im.height; } catch (e) {} res(); };
        im.onerror = () => res(); im.src = SP[k];
      } catch (e) { res(); }
    }));
    B.ready = Promise.all([Promise.resolve(B.ready)].concat(loading)).then(() => {}, () => {});
    B.hasSprite = (k) => !!TX[k];
    const q = new THREE.Quaternion(), eu = new THREE.Euler(0, 0, 0, 'YXZ'), P = new THREE.Vector3(), S = new THREE.Vector3(), CP = new THREE.Vector3();
    const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0, 0.5, 0);
    function billboard(key, H, o) {
      const base = TX[key]; if (!base) return null; o = o || {};
      const meta = META[key] || { h: 1 }, asp = ASP[key], isMolly = key === 'molly', isMom = key === 'mom';
      const g = new THREE.Group(), u = g.userData;
      const map = base.clone(); map.needsUpdate = true;      // own offset/repeat per billboard (image stays shared); used to crop (sitting / jumpscare)
      // lit by the scene (so she gets dark and foggy with the level) but never pitch black: a little self-illumination from the photo itself
      const mat = new THREE.MeshLambertMaterial({ map: map, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: o.glow !== undefined ? o.glow : 0.32, side: THREE.DoubleSide, transparent: true, alphaTest: 0.5 });
      const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.userData.noShadow = true; g.add(mesh);
      if (meta.shadow !== false && o.shadow !== false) {   // soft blob shadow on the floor
        const sw = Math.max(0.42, H * asp * 1.25), sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: T.blobShadow(), transparent: true, opacity: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
        sh.rotation.x = -Math.PI / 2; sh.position.y = 0.012; sh.scale.set(sw, sw * 0.7, 1); sh.renderOrder = 1; sh.userData.noShadow = true; g.add(sh);
      }
      // the same handles the 3D models expose, so game code / levels do not change
      u.rig = new THREE.Group(); u.head = new THREE.Object3D(); u.eyes = [new THREE.Group(), new THREE.Group()]; u.eyes.forEach((e) => { e.userData.home = V3(0, 0, 0); });
      u.arms = [new THREE.Object3D(), new THREE.Object3D()]; u.armL = u.arms[0]; u.armR = u.arms[1]; u.armR.rotation.z = 0.12; u.legs = [];
      u.billboard = true; u.photo = key; u.smile = 1; u.sitting = false; u.scared = false; u.waveOn = false; u._w = 0; u.tilt = 0.06; u.gaze = 0; u.armBase = [0.14, 0.14];
      u.setSmile = (k) => { u.smile = k; }; u.lookEyes = (tx) => { u.gaze = tx || 0; };
      u.sit = (on) => { u.sitting = on; }; u.setScare = (on) => { u.scared = on; };
      u.tick = (dt) => { u._w += ((u.waveOn ? 1 : 0) - u._w) * Math.min(1, dt * 5); };
      mesh.onBeforeRender = (renderer, scene, cam) => {
        const e = g.matrixWorld.elements, tt = performance.now() * 0.001;
        P.set(e[12], e[13], e[14]);
        const sx = Math.hypot(e[0], e[1], e[2]), sy = Math.hypot(e[4], e[5], e[6]);
        cam.getWorldPosition(CP);
        // pose: crop (fraction of the image height cut off at the bottom), enlargement, height of the image bottom above the feet
        let v0 = 0, k = 1, y0 = 0;
        if (isMolly && u.scared) { v0 = 0.5; k = 1.3; y0 = 0.97 - (1 - meta.eye - v0) * H * k; }       // jumpscare: face + shoulders, eyes at the same height as the 3D head
        else if (isMolly && u.sitting) { v0 = 0.25; }                                                    // sitting on the rug: dress down to the hem, no legs
        map.offset.y = v0; map.repeat.y = 1 - v0;
        // jumpscare: the photo tears like a bad VHS tape (horizontal jitter + a few shifted bands)
        map.offset.x = (u.scared && u.glitch) ? (Math.random() - 0.5) * 0.03 : 0;
        if (u.scared && u.glitch && Math.random() < 0.35) map.offset.y = v0 + (Math.random() - 0.5) * 0.02;
        let w = isMolly ? u._w : (isMom ? Math.max(0, Math.min(1, (u.armR.rotation.z - 0.12) / 2.2)) : 0);   // waving: a little bounce + lean (the photo has one pose)
        if (u.scared) w = 0;
        const roll = g.rotation.z + u.head.rotation.z * 0.7 + w * 0.045 * Math.sin(tt * 9);
        eu.set(0, Math.atan2(CP.x - P.x, CP.z - P.z), roll); q.setFromEuler(eu);
        const hh = H * (1 - v0) * k * (1 + 0.004 * Math.sin(tt * 1.7));
        S.set(sx * H * asp * k, sy * hh, 1); P.y += sy * (y0 + 0.014 * w * Math.abs(Math.sin(tt * 9)));
        mesh.matrixWorld.compose(P, q, S);
      };
      return g;
    }
    B.molly = function (scale, o) { const b = (o && o.model3d) ? null : billboard('molly', META.molly.h, o); if (!b) return M3.molly(scale); if (scale) b.scale.setScalar(scale); return b; };
    B.mom = function (o) { return ((o && o.model3d) ? null : billboard('mom', META.mom.h, o)) || M3.mom(); };
    // any sprite as an upright, camera-facing billboard: B.photoPerson('cashier', 0.9) -> Group with its base at y=0 (null if the sprite is missing)
    B.photoPerson = function (key, heightMeters, o) { return billboard(key, heightMeters || (META[key] && META[key].h) || 1.7, o); };
  })();
})();
