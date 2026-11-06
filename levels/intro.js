/* MOLLY - Intro scene: the toy store. (A "scene" is like a level but has no creep / no catching.)
   Everything here is bright, happy and friendly.
   Flow: start OUTSIDE at the rainbow gate -> the gate opens ("Welcome to Toyland!") -> walk in -> click Molly on the big shelf
   (she goes into your hands) -> take her to the CHECKOUT counter -> press E: the cashier scans her, Mom pays, you get a bag
   -> "Welcome home..." -> level 1. */
(function () {
  'use strict';
  const B = window.Build, M = window.Mat, T = window.Tex, Snd = window.Snd;
  window.SCENES = window.SCENES || {};
  let seed = 5;
  const rnd = (a, b) => { seed = (seed * 16807) % 2147483647; return a + (seed / 2147483647) * (b - a); };   // fixed layout every time
  const R = (a, b) => a + Math.random() * (b - a);                                                           // free randomness (sparkles only)
  const lerp = (a, b, k) => a + (b - a) * k, ease = (k) => k * k * (3 - 2 * k);
  const angTo = (a, b) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a));   // the angle equal to b that is closest to a

  // layout (metres)
  const W = 7, D = 5, H = 3.4;
  const GATE_W = 1.5;                         // the doorway is x = -1.5 .. 1.5 in the front wall (z = D)
  const MOM = { x: 1.15, z: 3.45 };           // Mom waits just inside the gate
  const CNT = { x: 5.0, z: 3.8, w: 2.4 };     // checkout counter (customer side is z < 3.5)
  const CASH = { x: 5.0, z: 4.5 };            // cashier stands behind it
  const STAND = { x: 5.0, z: 1.7, yaw: Math.PI, pitch: -0.1 };   // where you stand during checkout
  const MOM_PAY = { x: 4.15, z: 3.0 };
  const HOLD = [0.28, -0.62, -0.66];          // where a held thing sits relative to your eyes (right, up, forward)
  const TOP = 0.9;                            // counter top height

  function signTex() {
    return T.canvas(1024, 160, (x, w, h) => {
      const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ff7aa8'); g.addColorStop(1, '#ff4f8b'); x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.strokeStyle = '#ffe27a'; x.lineWidth = 10; x.strokeRect(8, 8, w - 16, h - 16);
      for (let i = 0; i < 30; i++) { x.fillStyle = i % 2 ? '#fff' : '#ffe27a'; x.beginPath(); x.arc(30 + i * 32.5, 22, 5, 0, 7); x.arc(30 + i * 32.5, h - 22, 5, 0, 7); x.fill(); }
      const cols = ['#ffffff', '#ffe27a', '#8ff0ff', '#c8ffb0', '#ffffff', '#ffe27a', '#8ff0ff', '#c8ffb0', '#ffffff'], word = 'TOYLAND!';
      x.font = 'bold 104px "Trebuchet MS", "Segoe UI", sans-serif'; x.textBaseline = 'middle'; x.textAlign = 'center';
      let cx = 512 - (word.length - 1) * 56 / 1; cx = 512 - 3.5 * 62;
      for (let i = 0; i < word.length; i++) { x.save(); x.translate(cx + i * 62, 84 + Math.sin(i * 1.3) * 5); x.rotate(Math.sin(i * 2.1) * 0.08); x.shadowColor = 'rgba(120,0,50,0.5)'; x.shadowBlur = 6; x.shadowOffsetY = 4; x.fillStyle = cols[i]; x.fillText(word[i], 0, 0); x.restore(); }
    }, false);
  }
  function candyTex(c1) {   // diagonal candy stripes
    const t = T.canvas(64, 128, (x, w, h) => {
      x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); x.fillStyle = c1 || '#ff4f8b';
      for (let i = -1; i < 4; i++) { x.beginPath(); x.moveTo(0, i * 32); x.lineTo(w, i * 32 + 16); x.lineTo(w, i * 32 + 32); x.lineTo(0, i * 32 + 16); x.fill(); }
    }, true);
    t.repeat.set(2, 3);
    return t;
  }
  function screenTex() {
    const t = T.canvas(256, 160, (x, w, h) => { x.fillStyle = '#143d33'; x.fillRect(0, 0, w, h); }, false);
    t.userData.draw = function (l1, l2, col) {
      const x = t.image.getContext('2d'), w = 256, h = 160;
      x.fillStyle = '#143d33'; x.fillRect(0, 0, w, h); x.strokeStyle = '#4fe3b0'; x.lineWidth = 6; x.strokeRect(5, 5, w - 10, h - 10);
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = col || '#9bffd0';
      x.font = 'bold 40px "Courier New", monospace'; x.fillText(l1, w / 2, 62); x.font = 'bold 34px "Courier New", monospace'; x.fillText(l2, w / 2, 110);
      t.needsUpdate = true;
    };
    t.userData.draw('WELCOME', ':-)');
    return t;
  }

  function balloonBunch(L, x, z, y0, cols) {
    for (let i = 0; i < 4; i++) {
      const b = B.balloon(cols[i % cols.length], 0.2), bx = x + (i - 1.5) * 0.18, by = y0 + (i % 2) * 0.2 + i * 0.05, bz = z + (i % 3 - 1) * 0.1;
      b.position.set(bx, by, bz); L.scene.add(b);
      B.cyl(0.003, 0.003, by - 0.1, M.b(0xffffff), (bx + x) / 2, (by - 0.1) / 2, bz, L.scene, 3).rotation.z = Math.atan2(bx - x, by) * -1;
    }
    B.cyl(0.07, 0.09, 0.14, M.p(0xffd93d, 60, 0xffffff), x, 0.07, z, L.scene, 10);
  }

  function lollipopTree(L, x, z, s, c) {
    const g = new THREE.Group(); s = s || 1;
    B.cyl(0.07, 0.09, 1.5 * s, M.p(0xffffff, 40, 0x555555), 0, 0.75 * s, 0, g, 8);
    B.cyl(0.075, 0.095, 0.3 * s, M.t(candyTex('#ff6fa5')), 0, 0.5 * s, 0, g, 8);
    B.sph(0.62 * s, M.p(c, 70, 0x888888), 0, 1.95 * s, 0, g, 1, 1, 1, 16);
    B.sph(0.4 * s, M.p(c, 70, 0x888888), 0.35 * s, 1.55 * s, 0.1 * s, g, 1, 1, 1, 12);
    g.position.set(x, 0, z); L.scene.add(g); return g;
  }

  function cloud(L, x, y, z, s) {
    const g = new THREE.Group(), m = M.b(0xffffff);
    [[0, 0, 0, 1.6], [1.5, -0.2, 0.2, 1.2], [-1.6, -0.25, 0, 1.15], [0.6, 0.55, 0, 1.1], [-0.6, 0.35, 0.3, 0.9]].forEach((c) => B.sph(c[3], m, c[0], c[1], c[2], g, 1, 0.62, 0.9, 10));
    g.position.set(x, y, z); g.scale.setScalar(s || 1); L.scene.add(g);
  }

  function picketFence(L, x1, z1, x2, z2) {
    const g = new THREE.Group(), len = Math.hypot(x2 - x1, z2 - z1), n = Math.round(len / 0.24), cols = [0xffffff, 0xffd6e6, 0xfff3b0, 0xcdf0ff];
    for (let i = 0; i <= n; i++) {
      const x = -len / 2 + i * len / n, c = cols[i % 4];
      B.rbox(0.09, 0.7, 0.03, 0.012, M.p(c, 50, 0x666666), x, 0.35, 0, g); B.sph(0.05, M.p(c, 50, 0x666666), x, 0.72, 0, g, 1, 1.1, 0.5, 8);
    }
    B.rbox(len, 0.06, 0.05, 0.01, M.p(0xffffff, 50, 0x666666), 0, 0.2, 0.035, g); B.rbox(len, 0.06, 0.05, 0.01, M.p(0xffffff, 50, 0x666666), 0, 0.52, 0.035, g);
    B.bake(g); g.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2); g.rotation.y = -Math.atan2(z2 - z1, x2 - x1); L.scene.add(g);
  }

  function planter(L, x, z) {
    const g = new THREE.Group(), cols = [0xff5d8f, 0xffd93d, 0xffffff, 0xb48cff, 0xff9a4d];
    B.rbox(1.1, 0.38, 0.42, 0.04, M.p(0xff9ec2, 60, 0x888888), 0, 0.19, 0, g); B.box(1.0, 0.04, 0.34, M.l(0x5a3a22), 0, 0.37, 0, g);
    for (let i = 0; i < 14; i++) {
      const fx = -0.46 + i * 0.07 + (i % 2) * 0.02, fz = (i % 3 - 1) * 0.1, fh = 0.55 + (i % 4) * 0.06;
      B.cyl(0.006, 0.006, fh - 0.38, M.l(0x3f9a45), fx, 0.38 + (fh - 0.38) / 2, fz, g, 4); B.sph(0.04, M.p(cols[i % 5], 60, 0x888888), fx, fh, fz, g, 1, 0.7, 1, 8);
    }
    B.bake(g); g.position.set(x, 0, z); L.scene.add(g);
    L.solid(x - 0.6, z - 0.25, x + 0.6, z + 0.25, 'low'); L.blob(x, z, 1.5, 0.9);
  }

  /* ---------------- the cashier ---------------- */
  function buildCashier() {
    const ph = B.photoPerson && B.photoPerson('cashier', 1.75);   // photo billboard when the sprite exists
    if (ph) { ph.userData.photo = true; return ph; }
    const g = new THREE.Group(), u = g.userData;
    const skin = M.p(0xf2c9a5, 70, 0x554444), shirt = M.p(0x6ec6ff, 40, 0x445566), apron = M.p(0xffd23f, 50, 0x886600), apron2 = M.p(0xffb300, 50, 0x886600), pants = M.p(0x3f4f8f, 40, 0x222233);
    const shoe = M.p(0x6a2a4a, 80, 0x886666), hair = M.p(0x5a3318, 60, 0x443322), pink = M.p(0xff7aa8, 60, 0x884466), white = M.p(0xffffff, 40, 0x666666);
    [-1, 1].forEach((s) => { B.cyl(0.075, 0.068, 0.82, pants, s * 0.1, 0.46, 0, g, 12); B.sph(0.08, shoe, s * 0.1, 0.045, 0.04, g, 1, 0.55, 1.6, 12); });
    B.rbox(0.44, 0.12, 0.27, 0.045, pants, 0, 0.9, 0, g);
    B.rbox(0.42, 0.6, 0.26, 0.09, shirt, 0, 1.17, 0, g);
    B.rbox(0.38, 0.54, 0.035, 0.012, apron, 0, 1.06, 0.14, g);            // yellow apron
    B.rbox(0.22, 0.2, 0.035, 0.012, apron, 0, 1.4, 0.14, g);
    [-1, 1].forEach((s) => { const st = B.rbox(0.035, 0.22, 0.03, 0.01, apron2, s * 0.1, 1.5, 0.095, g); st.rotation.z = -s * 0.28; });
    B.rbox(0.44, 0.035, 0.29, 0.01, apron2, 0, 0.95, 0.01, g);              // apron belt
    B.rbox(0.2, 0.1, 0.04, 0.012, pink, 0, 0.88, 0.16, g);                  // pocket
    B.rbox(0.11, 0.06, 0.02, 0.008, white, 0.1, 1.36, 0.162, g); B.sph(0.013, M.p(0xff4f8b, 60, 0xffffff), 0.075, 1.36, 0.176, g, 1, 1, 0.5, 8);   // name badge
    B.cyl(0.045, 0.05, 0.1, skin, 0, 1.5, 0, g, 12);
    const head = new THREE.Group(); head.position.set(0, 1.5, 0); g.add(head); u.head = head;
    B.sph(0.125, skin, 0, 0.15, 0, head, 1, 1.08, 0.98, 24);
    B.sph(0.138, hair, 0, 0.19, -0.03, head, 1, 1.04, 1.0, 20);             // hair
    B.sph(0.125, hair, 0, 0.26, 0.025, head, 1, 0.42, 1.0, 16);             // fringe
    [-1, 1].forEach((s) => { B.sph(0.06, hair, s * 0.14, 0.1, -0.03, head, 1, 1.3, 1, 12); B.sph(0.022, pink, s * 0.15, 0.2, -0.03, head, 1, 1, 1, 8); });
    B.torus(0.133, 0.011, pink, 0, 0.2, -0.005, head, Math.PI * 1.1, 24).rotation.set(Math.PI / 2 * 0.2, 0, Math.PI * -0.05);
    [-1, 1].forEach((s) => {
      B.sph(0.015, M.b(0x2a1a14), s * 0.045, 0.165, 0.113, head, 1, 1.35, 0.6, 10); B.sph(0.005, M.b(0xffffff), s * 0.045 - 0.004, 0.172, 0.123, head, 1, 1, 0.6, 6);
      B.sph(0.022, M.p(0xff9aa8, 20, 0x444444), s * 0.08, 0.115, 0.1, head, 1, 0.6, 0.4, 8);
    });
    B.sph(0.012, M.p(0xe9b394, 20, 0x333333), 0, 0.14, 0.126, head, 1, 0.9, 0.9, 8);
    const sm = B.torus(0.036, 0.005, M.p(0xc94a62, 100, 0xffffff), 0, 0.123, 0.114, head, Math.PI * 0.85, 16); sm.rotation.z = -Math.PI / 2 - Math.PI * 0.425; sm.scale.y = 0.8;
    [-1, 1].forEach((s) => {
      const sh = new THREE.Group(); sh.position.set(s * 0.255, 1.4, 0); g.add(sh);
      B.sph(0.058, shirt, 0, 0, 0, sh, 1, 1, 1, 12); B.cyl(0.05, 0.044, 0.28, shirt, 0, -0.14, 0, sh, 10);
      const el = new THREE.Group(); el.position.set(0, -0.28, 0); sh.add(el);
      B.cyl(0.04, 0.035, 0.26, skin, 0, -0.13, 0, el, 10); B.sph(0.045, skin, 0, -0.28, 0, el, 1, 1.15, 0.8, 10);
      sh.rotation.z = s * 0.12; el.rotation.x = -0.25;
      if (s > 0) { u.armR = sh; u.elR = el; } else { u.armL = sh; u.elL = el; }
    });
    g.scale.setScalar(0.99);
    return g;
  }
  const POSES = {   // [shoulder x, shoulder z, elbow x] for the right and the left arm
    rest: { R: [0, 0.12, -0.25], L: [0, -0.12, -0.25] },
    wave: { R: [-0.1, 2.5, -0.2], L: [0, -0.12, -0.25] },
    desk: { R: [-0.85, 0.12, -0.75], L: [-0.85, -0.12, -0.75] },
    give: { R: [-1.3, 0.1, -0.12], L: [-1.3, -0.1, -0.12] }
  };

  window.SCENES.store = {
    id: 'store', scene: true, music: 'store',
    build(L, G) {
      const tmpV = new THREE.Vector3(), tmpE = new THREE.Euler();
      let clk = 0;
      L.fog0 = [0xcdeeff, 0.0022]; L.fog1 = L.fog0;
      L.ambient = new THREE.HemisphereLight(0xffffff, 0xffd0e0, 0.85); L.ambBase = 0.85; L.scene.add(L.ambient);
      L.wallDefaults = { trim: true }; L.trimColor = 0xffffff;
      L.spawn = { x: 0, z: 9.3, yaw: 0 };   // you start OUTSIDE, in front of the gate, looking at the store
      L.fx = []; L.cg = { pose: 'rest' }; L.clk = 0;
      const pink = M.t(T.toyWall('#ffc4da', '#ffffff')), yel = M.t(T.toyWall('#fff0a0', '#ffffff')), aqua = M.t(T.toyWall('#b3e6f5', '#ffffff')), mint = M.t(T.toyWall('#c3efc9', '#ffffff'));
      const outer = M.t(T.toyWall('#ffa8c8', '#ffffff'));
      const fl = M.tp(T.storeFloor(), 80, 0x777777);
      L.floor(-W, -D, W, D, fl, 2);
      L.ceil(-W, -D, W, D, M.l(0xffffff), H);
      L.wall(-W, -D, W, -D, { h: H, matA: pink });  // back (north)
      L.wallGaps(-W, D, W, D, [[-GATE_W, GATE_W]], { h: H, doorH: 2.75, matA: outer, matB: yel });   // front, with the gate doorway
      L.wall(-W, -D, -W, D, { h: H, matA: aqua });  // west
      L.wall(W, -D, W, D, { h: H, matB: mint });    // east
      // ceiling lights
      [[-4, -2], [0, -2], [4, -2], [-4, 2.5], [0, 2.5], [4, 2.5]].forEach((p) => L.lamp(p[0], H - 0.3, p[1], 0xfff4e0, 8, 14, 'dome'));
      // bunting
      [[[-W, 3.1, -4.4], [W, 3.1, -4.4], 22, 0.32], [[-W, 3.15, 0.2], [W, 3.15, 0.2], 22, 0.36], [[-W, 3.1, 4.2], [W, 3.1, 4.2], 22, 0.3]].forEach((b) => L.add(B.bunting(b[0], b[1], b[2], b[3])));
      // big sign + little sign
      B.plane(5.6, 0.875, M.tb(signTex()), 0, 2.95, -D + 0.12, L.scene);
      B.plane(2.6, 0.45, M.tb(T.card(512, 90, '#fff', [{ t: 'NEW!  Meet MOLLY', s: 44, c: '#d11a56' }], { border: '#ff4f8b', bw: 8 })), 0, 2.38, -D + 0.13, L.scene);
      // sunny window above the west shelves
      const win = B.window(3.2, 1.0, { y: 2.45, curtain: '#ffb3cf' }); win.position.set(-W + 0.12, 2.45, -0.6); win.rotation.y = Math.PI / 2; L.scene.add(win); L.sky(win.userData.sky);
      const win2 = B.window(2.4, 1.0, { y: 2.45, curtain: '#bfe4ff', beam: false }); win2.position.set(W - 0.12, 2.45, -0.6); win2.rotation.y = -Math.PI / 2; L.scene.add(win2);
      // balloon bunches (strings are thin and sit near the walls so they never block the view)
      const bc = [0xff5d8f, 0x5dc8ff, 0xffd93d, 0x7ee081, 0xb48cff, 0xff9a4d];
      [[-6.2, 4.2], [6.2, -4.2], [-6.3, -4.3], [-2.2, -4.4], [2.2, -4.4]].forEach((p, k) => balloonBunch(L, p[0], p[1], 2.25, bc.slice(k % 6).concat(bc)));
      // shelves full of toys
      const fill = (sh, n) => {
        sh.userData.levels.forEach((y, i) => {
          for (let k = 0; k < n; k++) {
            const x = -sh.userData.w / 2 + 0.35 + k * (sh.userData.w - 0.5) / Math.max(1, n - 1), r = rnd(0, 1); let t;
            if (r < 0.18) { t = B.teddy([0xb07a45, 0xe8a0b4, 0x8fb8ff, 0xf4c24a][(i + k) % 4]); t.scale.setScalar(0.72); }
            else if (r < 0.34) { t = B.bunny(); t.scale.setScalar(0.8); }
            else if (r < 0.5) t = B.robot([0x9aa5b1, 0xe85a5a, 0x5a9ae8, 0x7ed67e][k % 4]);
            else if (r < 0.62) t = B.toyCar([0xe53935, 0xfdd835, 0x1e88e5, 0x43a047][k % 4]);
            else if (r < 0.74) t = B.rocket();
            else if (r < 0.84) t = B.duck();
            else if (r < 0.93) t = B.toyBox([0xff6fa5, 0x6fb7ff, 0xffb347, 0x8fd16f][(i + k) % 4], ['DOLLS', 'CARS', 'FUN!', 'PLAY'][(i + k) % 4]);
            else t = B.toyBlocks(3);
            t.position.set(x, y + 0.04, 0); t.rotation.y = rnd(-0.4, 0.4); sh.add(t);
          }
        });
        B.bake(sh);
      };
      [-4.6, 4.6].forEach((x) => {
        const sh = B.shelfUnit(2.2, 2.0, 0.5, 4, 0xffffff); sh.userData.w = 2.2; fill(sh, 4);
        sh.position.set(x, 0, -D + 0.35); L.scene.add(sh); L.solid(x - 1.1, -D, x + 1.1, -D + 0.6);
      });
      [-2.4, 0.6].forEach((z) => {
        [-1, 1].forEach((s) => {
          const sh = B.shelfUnit(2.4, 1.8, 0.5, 3, 0xffffff); sh.userData.w = 2.4; fill(sh, 4);
          sh.position.set(s * (W - 0.35), 0, z - 0.2); sh.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; L.scene.add(sh);
          L.solid(s * W - (s > 0 ? 0.6 : 0), z - 1.4, s * W + (s > 0 ? 0 : 0.6), z + 1.0);
        });
      });
      // play rug in the middle of the aisle
      L.place(B.rug(4.2, 3.2, 0xff7aa8, 0xfff0f5), 0, 0, 0.4);
      // display tables
      [[-3.2, 0.2], [3.3, 0.6]].forEach((p, i) => {
        const t = B.table(1.6, 1.2, 0.7, M.p(0xff9ec2, 70, 0x888888), M.l(0xffffff)); t.position.set(p[0], 0, p[1]); L.scene.add(t); L.solid(p[0] - 0.8, p[1] - 0.6, p[0] + 0.8, p[1] + 0.6, 'low'); L.blob(p[0], p[1], 2.1, 1.7);
        const b = B.toyBlocks(5); b.position.set(p[0] - 0.4, 0.7, p[1]); L.scene.add(b);
        const te = B.teddy(i ? 0xe8a0b4 : 0xb07a45); te.position.set(p[0] + 0.4, 0.7, p[1] + 0.1); te.rotation.y = i ? -0.5 : 0.4; L.scene.add(te);
        const du = B.duck(); du.position.set(p[0] + 0.05, 0.7, p[1] - 0.3); L.scene.add(du);
        L.interact({ x: p[0], y: 0.9, z: p[1], r: 2.4, label: 'Look at the toys', onUse() { toyTalk(L, G, i); } });
      });
      // giant teddy and a pile of presents
      const big = B.teddy(0xc88a50); big.scale.setScalar(3.2); big.position.set(-5.8, 0, 3.5); big.rotation.y = 0.9; L.scene.add(big); L.solid(-6.5, 2.8, -5.1, 4.2); L.blob(-5.8, 3.5, 2.0, 2.0);
      [[6.1, 0.0, 0.5, 0xff6fa5], [6.5, 0.45, 0.4, 0x6fb7ff], [6.0, 0.6, 0.35, 0xffd93d]].forEach((p, i) => { const bx = B.rbox(p[2], p[2], p[2], 0.03, M.p(p[3], 50, 0x888888), 0, p[2] / 2, 0, L.scene); bx.position.set(p[0], p[2] / 2, p[1] + 2.2); B.rbox(p[2] + 0.02, 0.05, 0.06, 0.01, M.l(0xffffff), p[0], p[2] + 0.0, p[1] + 2.2, L.scene); });
      L.solid(5.7, 1.9, 6.9, 2.9, 'low');
      if (window.Secrets) window.Secrets.store(L, { duck: [-3.25, 0.7, 0.52], btn: [-4.6, 2.1, -D + 0.35] });   // bonus secrets (see secrets.js)

      /* ---------------- outside: pavement, fence, garden, hills, sky ---------------- */
      const grass = B.plane(400, 400, M.l(0xa6e6a0), 0, -0.04, 0, L.scene); grass.rotation.x = -Math.PI / 2;
      L.floor(-7.4, D, 7.4, 11.7, M.l(0xf7e9ee), 2.2, 0.0);
      L.place(B.rug(2.5, 6.6, 0xffd93d, 0xfff3b8), 0, 0, 8.4);   // the yellow path to the gate
      picketFence(L, -7.4, 11.6, 7.4, 11.6); picketFence(L, -7.4, 5.3, -7.4, 11.6); picketFence(L, 7.4, 5.3, 7.4, 11.6);
      L.solid(-7.7, 11.4, 7.7, 11.9); L.solid(-7.7, 5.0, -7.2, 11.9); L.solid(7.2, 5.0, 7.7, 11.9);
      planter(L, -3.4, 5.75); planter(L, 3.4, 5.75); planter(L, -5.4, 5.75); planter(L, 5.4, 5.75);
      [-1, 1].forEach((s) => {   // candy-cane lamp posts along the path
        const x = s * 2.4, z = 7.6;
        B.cyl(0.06, 0.06, 2.3, M.t(candyTex(s > 0 ? '#5dc8ff' : '#ff4f8b')), x, 1.15, z, L.scene, 10);
        B.sph(0.16, M.b(0xfff1b8), x, 2.42, z, L.scene, 1, 1, 1, 12); const g = B.glow('rgba(255,236,170,0.8)', 1.0); g.position.set(x, 2.42, z); L.scene.add(g);
        L.solid(x - 0.1, z - 0.1, x + 0.1, z + 0.1);
      });
      [[-6.4, 8.6, 0xff9ec2], [6.4, 9.6, 0xb8e986], [-6.6, 6.5, 0xb48cff], [6.5, 7, 0xffd93d]].forEach((t) => { lollipopTree(L, t[0], t[1], 1, t[2]); });
      [[-11, 14, 0xff9ec2], [-14, 4, 0xb8e986], [11, 12, 0xb48cff], [13, 3, 0xffd93d], [-9, 22, 0xb8e986], [9, 24, 0xff9ec2], [0, 28, 0xffd93d]].forEach((t) => { lollipopTree(L, t[0], t[1], 1.4, t[2]); });
      [[-30, -2, 38, 20], [14, -3, 44, 24], [46, -2, 12, 18], [-48, -3, 8, 17], [-8, -4, 60, 26], [34, -3, -20, 20], [-34, -3, -28, 22]].forEach((h) => { B.sph(h[3], M.l(h[2] % 2 ? 0x98e29a : 0xb2eaa0), h[0], h[1], h[2], L.scene, 1, 0.38, 1, 16); });
      [[-14, 22, 30, 1.6], [10, 26, 36, 2.1], [30, 20, 6, 1.5], [-32, 24, 12, 1.8], [-4, 28, -22, 2.2], [24, 21, 40, 1.4], [-24, 20, 44, 1.5]].forEach((c) => cloud(L, c[0], c[1], c[2], c[3]));
      L.lamp(0, 3.3, 7.4, 0xfff4e0, 5, 12, false);

      /* ---------------- the front: parapet with TOYLAND sign, rainbow arch and the gate ---------------- */
      const roof = B.box(W * 2 + 0.6, 0.25, D * 2 + 0.55, M.l(0xff8fb4), 0, H + 0.12, 0.0, L.scene); roof.userData.noShadow = true;
      const para = B.box(W * 2 + 0.6, 1.35, 0.24, M.l(0xff9fc0), 0, H + 0.675, D + 0.22, L.scene); para.userData.noShadow = true;
      B.box(W * 2 + 0.8, 0.12, 0.36, M.l(0xffffff), 0, H + 1.38, D + 0.22, L.scene).userData.noShadow = true;
      B.box(W * 2 + 0.7, 0.08, 0.3, M.l(0xffffff), 0, H + 0.04, D + 0.22, L.scene).userData.noShadow = true;
      B.plane(5.6, 0.875, M.tb(signTex()), 0, H + 0.72, D + 0.345, L.scene);
      L.add(B.bunting([-W + 0.3, H + 1.28, D + 0.4], [-3.2, H + 1.28, D + 0.4], 10, 0.28)); L.add(B.bunting([3.2, H + 1.28, D + 0.4], [W - 0.3, H + 1.28, D + 0.4], 10, 0.28));
      [-1, 1].forEach((s) => {   // shop-window posters either side
        B.plane(2.2, 0.9, M.tb(T.card(512, 210, '#ffffff', [{ t: s < 0 ? 'DOLLS & TEDDIES' : 'CARS & ROBOTS', s: 50, c: s < 0 ? '#d11a56' : '#1e6fb8' }, { t: 'come on in!', s: 36, c: '#555' }], { border: s < 0 ? '#ff4f8b' : '#5dc8ff', bw: 10 })), s * 4.7, 1.7, D + 0.115, L.scene);
      });
      // candy pillars, rainbow arch, fluffy clouds
      const GZ = D + 0.38, AY = 1.95, AR = 1.62;
      [-1, 1].forEach((s) => {
        B.cyl(0.17, 0.17, AY, M.t(candyTex(s < 0 ? '#ff4f8b' : '#5dc8ff')), s * AR, AY / 2, GZ, L.scene, 14);
        B.cyl(0.21, 0.21, 0.1, M.p(0xffffff, 60, 0x888888), s * AR, 0.05, GZ, L.scene, 14);
        [[0, 0, 0, 0.3], [0.2 * s, -0.05, 0.05, 0.24], [-0.2 * s, -0.08, 0.02, 0.22], [0.05, 0.1, 0.1, 0.22]].forEach((c) => B.sph(c[3], M.b(0xffffff), s * (AR - 0.25) + c[0], AY + c[1] + 0.02, GZ + c[2], L.scene, 1.2, 0.8, 1, 10));
        L.solid(s * AR - 0.19, GZ - 0.19, s * AR + 0.19, GZ + 0.19);
        balloonBunch(L, s * (AR + 0.75), D + 0.9, 1.5, bc.slice(s > 0 ? 2 : 0).concat(bc));
      });
      [0xff3b3b, 0xff8a1f, 0xffd91f, 0x4cd964, 0x2fb5ff, 0x4d5bff, 0xb06bff].forEach((c, i) => { B.torus(AR - i * 0.082, 0.05, M.p(c, 70, 0xffffff), 0, AY, GZ, L.scene, Math.PI, 28); });
      // the swinging gate (two leaves hinged at the doorway edges; they swing INTO the store)
      const gate = L.gate = { leaves: [], ang: 0, target: 0 };
      const pc = [0xff7aa8, 0xffe27a, 0x7fe0ff, 0x9be8a0], LW = GATE_W - 0.04;
      [-1, 1].forEach((s) => {
        const pivot = new THREE.Group(), dir = -s; pivot.position.set(s * GATE_W, 0, D - 0.02);
        const whiteM = M.p(0xffffff, 60, 0x888888);
        B.rbox(LW, 0.07, 0.06, 0.02, whiteM, dir * LW / 2, 1.2, 0, pivot); B.rbox(LW, 0.07, 0.06, 0.02, whiteM, dir * LW / 2, 0.3, 0, pivot);
        B.rbox(0.1, 1.45, 0.1, 0.03, M.p(0xff4f8b, 70, 0xffffff), dir * 0.05, 0.725, 0, pivot); B.rbox(0.08, 1.4, 0.08, 0.025, M.p(0xff4f8b, 70, 0xffffff), dir * (LW - 0.04), 0.7, 0, pivot);
        for (let i = 0; i < 9; i++) { const x = dir * (0.2 + i * 0.133), c = pc[(i + (s > 0 ? 2 : 0)) % 4]; B.rbox(0.07, 1.1, 0.045, 0.018, M.p(c, 60, 0x888888), x, 0.76, 0, pivot); B.sph(0.05, M.p(c, 60, 0x888888), x, 1.34, 0, pivot, 1, 1.1, 1, 10); }
        B.plane(0.95, 0.3, M.tb(T.card(380, 120, '#fff7d6', [{ t: s < 0 ? 'WELCOME!' : 'COME IN!', s: 54, c: '#d11a56' }], { border: '#ffb300', bw: 9 })), dir * LW / 2, 0.78, 0.04, pivot);
        B.sph(0.07, M.p(0xffd23f, 120, 0xffffff), dir * (LW - 0.04), 1.5, 0, pivot, 1, 1, 1, 12);
        L.scene.add(pivot); gate.leaves.push({ pivot: pivot, s: s });
      });
      gate.col = L.solid(-GATE_W, D - 0.14, GATE_W, D + 0.08);
      L.anims.push({
        update(dt) {
          gate.ang += (gate.target - gate.ang) * Math.min(1, dt * 2.4);
          gate.leaves[0].pivot.rotation.y = gate.ang; gate.leaves[1].pivot.rotation.y = -gate.ang;   // left leaf +, right leaf - : both swing into the store
        }
      });
      L.interact({ x: 0, y: 1.0, z: D + 0.4, r: 3.4, label: 'Open the gate', enabled() { return !L.gateOpen; }, onUse() { openGate(L, G); } });

      /* ---------------- checkout counter, cash register, scanner, bags, bell ---------------- */
      const cnt = B.counter(CNT.w, '#ff8fb4'); cnt.position.set(CNT.x, 0, CNT.z); L.scene.add(cnt);
      L.solid(CNT.x - CNT.w / 2 - 0.1, CNT.z - 0.34, CNT.x + CNT.w / 2 + 0.1, CNT.z + 0.34, 'low');
      L.solid(CNT.x - CNT.w / 2 - 0.1, CNT.z + 0.3, W - 0.05, D - 0.05, 'low');   // the staff area behind the counter (nobody walks back there)
      L.blob(CNT.x, CNT.z + 0.2, CNT.w + 0.7, 1.7);
      B.plane(1.9, 0.34, M.tb(T.card(512, 92, '#ff4f8b', [{ t: 'CHECKOUT', s: 52, c: '#ffffff' }], { border: '#ffe27a', bw: 8 })), CNT.x, 0.45, CNT.z - 0.302, L.scene).rotation.y = Math.PI;
      // hanging sign
      const hs = B.plane(1.9, 0.46, M.tb(T.card(512, 124, '#ffe27a', [{ t: 'CHECKOUT  ↓', s: 62, c: '#d11a56' }], { border: '#ff4f8b', bw: 10 }), { side: THREE.DoubleSide }), CNT.x, 2.75, CNT.z - 0.55, L.scene); hs.rotation.y = Math.PI;
      [-0.8, 0.8].forEach((dx) => B.cyl(0.006, 0.006, H - 2.98, M.b(0xffffff), CNT.x + dx, (H + 2.98) / 2, CNT.z - 0.55, L.scene, 3));
      L.signGlow = B.glow('rgba(255,226,122,0.9)', 2.6); L.signGlow.position.set(CNT.x, 2.75, CNT.z - 0.6); L.signGlow.visible = false; L.scene.add(L.signGlow);
      // poster on the wall behind the cashier + a little balloon bunch
      B.plane(1.9, 0.55, M.tb(T.card(512, 150, '#ffffff', [{ t: 'Thanks for visiting', s: 40, c: '#555' }, { t: 'TOYLAND!', s: 56, c: '#d11a56' }], { border: '#ff8fb4', bw: 10 })), CNT.x, 2.0, D - 0.115, L.scene).rotation.y = Math.PI;
      // register (screen faces the customer)
      const reg = new THREE.Group(); reg.position.set(5.65, TOP, 3.98); L.scene.add(reg); L.reg = reg;
      B.rbox(0.44, 0.12, 0.38, 0.03, M.p(0x3a4a66, 60, 0x888888), 0, 0.06, 0, reg);
      const keys = B.rbox(0.38, 0.04, 0.2, 0.012, M.p(0x2a3550, 60, 0x888888), 0, 0.15, 0.06, reg); keys.rotation.x = 0.28;
      for (let i = 0; i < 12; i++) { const k = B.sph(0.017, M.p([0xff5d8f, 0xffd93d, 0x7ee081, 0x5dc8ff][i % 4], 80, 0xffffff), -0.12 + (i % 4) * 0.08, 0.175 - (i >> 2) * 0.017, 0.12 - (i >> 2) * 0.05, reg, 1, 0.6, 1, 8); }
      B.cyl(0.014, 0.014, 0.16, M.p(0x2a3550, 60, 0x888888), 0, 0.2, -0.1, reg, 8);
      const scr = new THREE.Group(); scr.position.set(0, 0.36, -0.1); reg.add(scr);
      B.rbox(0.33, 0.22, 0.035, 0.012, M.p(0x2a3550, 60, 0x888888), 0, 0, 0.0, scr);
      L.screen = screenTex(); const sp = B.plane(0.29, 0.18, M.tb(L.screen), 0, 0, -0.0185, scr); sp.rotation.y = Math.PI;
      const drawer = L.drawer = B.rbox(0.36, 0.05, 0.32, 0.01, M.p(0xd9d4c8, 60, 0x888888), 0, 0.045, 0.0, reg);
      B.box(0.3, 0.012, 0.1, M.l(0x7fcf7f), 0, 0.072, 0.07, drawer); [0xffd23f, 0xe8e8e8, 0xffd23f].forEach((c, i) => B.cyl(0.028, 0.028, 0.008, M.p(c, 120, 0xffffff), -0.1 + i * 0.1, 0.074, -0.04, drawer, 10));
      // scanner
      const sc = new THREE.Group(); sc.position.set(4.7, TOP, 3.72); L.scene.add(sc);
      B.rbox(0.5, 0.05, 0.24, 0.02, M.p(0x2d3340, 60, 0x888888), 0, 0.025, 0, sc);
      L.laserMat = new THREE.MeshBasicMaterial({ color: 0xff3030, transparent: true, opacity: 0.25 });
      L.laser = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.006, 0.17), L.laserMat); L.laser.position.set(0, 0.056, 0); sc.add(L.laser);
      L.laserGlow = B.glow('rgba(255,70,70,0.9)', 0.4); L.laserGlow.position.set(0, 0.1, -0.02); L.laserGlow.visible = false; sc.add(L.laserGlow);
      // bag stack
      [0xff9ec2, 0xffffff, 0xffe27a, 0xffffff, 0xff9ec2].forEach((c, i) => { const b = B.rbox(0.3, 0.014, 0.22, 0.005, M.p(c, 40, 0x666666), 6.0 + (i % 2) * 0.01, TOP + 0.01 + i * 0.015, 3.95, L.scene); b.rotation.y = (i - 2) * 0.05; });
      // candy jar
      B.cyl(0.1, 0.1, 0.22, M.p(0xbfe9ff, 120, 0xffffff, { transparent: true, opacity: 0.7 }), 3.95, 1.0, 3.9, L.scene, 12);
      [0xff5d8f, 0xffd93d, 0x7ee081, 0x5dc8ff].forEach((c, i) => B.sph(0.035, M.p(c, 90, 0xffffff), 3.92 + (i % 2) * 0.06, 0.95 + (i >> 1) * 0.07, 3.88 + (i % 3 - 1) * 0.02, L.scene, 1, 1, 1, 8));
      // service bell
      const bell = L.bell = new THREE.Group(); bell.position.set(4.25, TOP, 3.66); L.scene.add(bell);
      B.cyl(0.09, 0.095, 0.02, M.p(0xd9a82a, 100, 0xffffff), 0, 0.01, 0, bell, 20); B.sph(0.07, M.p(0xffd23f, 140, 0xffffff), 0, 0.03, 0, bell, 1, 0.75, 1, 20); B.sph(0.016, M.p(0xffe27a, 140, 0xffffff), 0, 0.09, 0, bell, 1, 1, 1, 10);
      // the cashier
      const cashier = L.cashier = buildCashier(); cashier.position.set(CASH.x, 0, CASH.z); cashier.rotation.y = Math.PI; L.scene.add(cashier); L.blob(CASH.x, CASH.z, 0.9, 0.7);
      L.cashierSay = 0; const cashLines = [
        '<b>Cashier:</b> Hi there! Welcome to Toyland! Ring my bell if you need help.',
        '<b>Cashier:</b> Found your toy yet? Take your time, there is no rush!',
        '<b>Cashier:</b> I love my job. I get to see happy faces all day!'
      ];
      L.interact({ x: CASH.x, y: 1.45, z: CASH.z, r: 3.4, label: 'Say hi to the cashier', enabled() { return !L.picked && !L.checking; }, onUse() { wave(L, 1.6); G.say(cashLines[L.cashierSay++ % cashLines.length], 4600); } });
      L.interact({ x: 4.25, y: 1.0, z: 3.66, r: 2.0, label: 'Ring the bell', enabled() { return !L.picked && !L.checking; }, onUse() { ringBell(L); wave(L, 1.6); G.say('<b>Cashier:</b> Ding ding! I am here! How can I help?', 3600); } });

      // Molly's display
      const mshelf = B.shelfUnit(2.0, 2.1, 0.5, 3, 0xffffff); mshelf.position.set(0, 0, -D + 0.35); L.scene.add(mshelf);
      L.solid(-1.0, -D, 1.0, -D + 0.6);
      B.rbox(1.96, 0.02, 0.48, 0.008, M.l(0xffd1e0), 0, 0.99, -D + 0.35, L.scene);
      const lv = mshelf.userData.levels;
      [-0.6, 0.6].forEach((x, i) => { const t = i ? B.bunny() : B.teddy(0xe8a0b4); t.scale.setScalar(0.8); t.position.set(x, lv[0] + 0.04, -D + 0.35); L.scene.add(t); });
      [-0.6, 0.6].forEach((x, i) => { const t = i ? B.robot(0xe85a5a) : B.toyCar(0x1e88e5); t.position.set(x, lv[2] + 0.04, -D + 0.35); L.scene.add(t); });
      const doll = B.molly(0.62); doll.position.set(0, lv[1] + 0.04, -D + 0.35); L.scene.add(doll); L.doll = doll;
      doll.userData.setSmile(1);
      L.anims.push(B.dollFriend(doll, { bodyTurn: false, baseYaw: 0, waveRange: 9, waveLen: 3.2, waveGap: 3.5, firstWave: 3, onWave() { if (!L.picked) Snd.hello(); } }));
      B.box(1.98, 0.16, 0.02, M.tb(T.card(512, 40, '#ff6fa5', [{ t: '*  MOLLY  -  your new best friend  *', s: 26, c: '#fff' }])), 0, 0.89, -D + 0.6, L.scene);
      L.lamp(0, 2.0, -D + 1.6, 0xfff0d0, 12, 6, false);
      const spark = B.glow('rgba(255,210,120,0.45)', 0.8); spark.position.set(0, lv[1] + 0.3, -D + 0.2); spark.scale.set(0.8, 0.8, 1); L.scene.add(spark); L.spark = spark;
      L.sparks = []; for (let i = 0; i < 6; i++) { const s = B.glow('rgba(255,236,170,0.8)', 0.18); L.scene.add(s); L.sparks.push({ s: s, a: i * 1.05, r: 0.5 + (i % 3) * 0.18 }); }
      // Mom
      const mom = B.mom(); mom.position.set(MOM.x, 0, MOM.z); L.scene.add(mom); L.mom = mom; L.momCol = L.solid(MOM.x - 0.3, MOM.z - 0.3, MOM.x + 0.3, MOM.z + 0.3); L.blob(MOM.x, MOM.z, 0.9, 0.9);
      const momLines = [
        '<b>Mom:</b> Pick ONE toy, sweetie. Take your time! (But not till closing time. I have soup at home.)',
        '<b>Mom:</b> That robot is cute! ...Wait, is it looking at me? Ha ha, silly Mom.',
        '<b>Mom:</b> Remember: the toy has to fit in the car. The giant teddy does NOT fit in the car.',
        '<b>Mom:</b> I am so proud of you, Emily. Now where did I put my glasses... oh, they are on my head!',
        '<b>Mom:</b> Ooh, look at the doll on the big shelf. She is waving at you!'
      ];
      const momLines2 = [
        '<b>Mom:</b> Take Molly to the checkout counter, sweetie. It is the pink one by the front, on the right.',
        '<b>Mom:</b> Follow the yellow CHECKOUT sign! Then we can go home.',
        '<b>Mom:</b> Molly looks so happy in your arms!'
      ];
      let momI = 0;
      L.interact({ x: MOM.x, y: 1.3, z: MOM.z, r: 2.4, label: 'Talk to Mom', enabled() { return !L.checking; }, onUse() { G.say((L.picked ? momLines2 : momLines)[momI++ % (L.picked ? momLines2 : momLines).length], 4800); } });
      // the one choice
      let mollyGreeted = false;
      L.interact({
        x: 0, y: lv[1] + 0.35, z: -D + 0.5, r: 2.8, label: 'Take Molly!',
        enabled() { return !L.sold; }, onUse() { pickMolly(L, G); }
      });
      // the checkout (only once Molly is in your hands)
      L.interact({
        x: CNT.x, y: 1.0, z: CNT.z - 0.3, r: 3.4, label: 'Check out with Molly',
        enabled() { return L.picked && !L.checking && !L.done; }, onUse() { checkout(L, G); }
      });
      // shelves toys (other choices)
      [[-4.6, -D + 0.8], [4.6, -D + 0.8], [-W + 0.8, -2.4], [W - 0.8, 0.6]].forEach((p, i) => {
        L.interact({ x: p[0], y: 1.1, z: p[1], r: 2.4, label: 'Look at the toys', onUse() { toyTalk(L, G, i + 2); } });
      });

      const handPos = (p, out, off) => { tmpE.set(p.pitch, p.yaw, 0, 'YXZ'); out.set(off[0], off[1], off[2]).applyEuler(tmpE); out.x += p.x; out.y += p.h; out.z += p.z; return out; };
      L.handPos = handPos;
      let momW = 0, momArm = 0, nextRemind = 28;
      L.update = function (dt, t) {
        clk += dt; L.clk = clk;
        const p = G.player, mu = L.mom.userData, mm = L.mom.position;
        // Mom: looks at you (or at the cashier while paying)
        const lookX = L.momScript ? CASH.x : p.x, lookZ = L.momScript ? CASH.z : p.z;
        const yaw = Math.atan2(lookX - mm.x, lookZ - mm.z);
        mu.head.rotation.y += (Math.max(-0.9, Math.min(0.9, L.momScript ? 0 : yaw)) - mu.head.rotation.y) * Math.min(1, dt * 4);
        const ty = L.momScript ? yaw : yaw * 0.5; L.mom.rotation.y += (ty - L.mom.rotation.y) * Math.min(1, dt * 3);
        momW += ((clk < 6 && !L.momScript ? 1 : 0) - momW) * Math.min(1, dt * 4);
        momArm += ((L.momPay ? 1 : 0) - momArm) * Math.min(1, dt * 6);
        mu.armR.rotation.z = 0.12 + momW * (2.4 + Math.sin(clk * 8) * 0.25 - 0.12); mu.armR.rotation.x = -1.25 * momArm; mu.head.rotation.z = Math.sin(clk * 1.1) * 0.03;
        // the cashier: idles, nods at you, waves, scans, hands things over
        const cu = L.cashier.userData, cg = L.cg;
        if (!cu.photo && cu.armR) {
          const P = POSES[cg.pose] || POSES.rest, k = Math.min(1, dt * 7), bob = Math.sin(clk * 1.7) * 0.012;
          [[cu.armR, cu.elR, P.R, 1], [cu.armL, cu.elL, P.L, -1]].forEach((a) => {
            let sx = a[2][0], sz = a[2][1], ex = a[2][2];
            if (cg.pose === 'desk') sx += Math.sin(clk * 6 + a[3]) * 0.06;
            if (cg.pose === 'wave' && a[3] > 0) sz += Math.sin(clk * 10) * 0.18;
            a[0].rotation.x += (sx - a[0].rotation.x) * k; a[0].rotation.z += (sz - a[0].rotation.z) * k; a[1].rotation.x += (ex - a[1].rotation.x) * k;
          });
          const ca = Math.atan2(p.x - CASH.x, p.z - CASH.z) - Math.PI;
          cu.head.rotation.y += (Math.max(-0.8, Math.min(0.8, Math.atan2(Math.sin(ca), Math.cos(ca)))) - cu.head.rotation.y) * Math.min(1, dt * 3);
          cu.head.rotation.x = bob * 2; cu.head.rotation.z = Math.sin(clk * 0.9) * 0.03;
        }
        if (cg.waveT > 0) { cg.waveT -= dt; if (cg.waveT <= 0 && cg.pose === 'wave') cg.pose = L.checking ? 'desk' : 'rest'; }
        // the scanner laser
        if (L.scanning) { L.laser.position.x = Math.sin(clk * 14) * 0.18; L.laserMat.opacity = 0.9; L.laserGlow.visible = true; L.laserGlow.position.x = L.laser.position.x; }
        else { L.laserMat.opacity = 0.25 + Math.sin(clk * 3) * 0.08; L.laserGlow.visible = false; }
        if (L.bellT > 0) { L.bellT -= dt; L.bell.scale.set(1 + Math.sin(L.bellT * 40) * 0.05, 1 - Math.sin(L.bellT * 40) * 0.08, 1 + Math.sin(L.bellT * 40) * 0.05); if (L.bellT <= 0) L.bell.scale.set(1, 1, 1); }
        // sparkly coins / stars
        for (let i = L.fx.length - 1; i >= 0; i--) {
          const f = L.fx[i]; f.life += dt; f.vy -= 1.6 * dt; f.s.position.x += f.vx * dt; f.s.position.y += f.vy * dt; f.s.position.z += f.vz * dt;
          f.s.material.opacity = Math.max(0, 1 - f.life / 1.3);
          if (f.life > 1.3) { L.scene.remove(f.s); L.fx.splice(i, 1); }
        }
        // what you are holding
        const hd = L.hold;
        if (hd) {
          handPos(p, tmpV, HOLD); tmpV.y += Math.sin(clk * 2.2) * 0.008;
          if (hd.mode === 'hand') { hd.obj.position.copy(tmpV); hd.obj.rotation.y = p.yaw; hd.obj.rotation.z = 0.06 + Math.sin(clk * 1.6) * 0.03; }
          else if (hd.mode === 'fly') {
            const k = Math.min(1, (clk - hd.t0) / hd.dur), e = ease(k);
            hd.obj.position.set(lerp(hd.from.x, tmpV.x, e), lerp(hd.from.y, tmpV.y, e) + Math.sin(Math.PI * k) * 0.3, lerp(hd.from.z, tmpV.z, e));
            hd.obj.scale.setScalar(lerp(hd.s0, hd.s1, e)); hd.obj.rotation.y = lerp(hd.r0, angTo(hd.r0, p.yaw), e);
            if (k >= 1) hd.mode = 'hand';
          }
        }
        if (L.signGlow) { L.signGlow.visible = !!L.picked && !L.checking; L.signGlow.material.opacity = 0.35 + Math.sin(clk * 4) * 0.2; }
        // the gate: opens when you come close (or when its timer fires)
        if (!L.gateOpen && Math.hypot(p.x, p.z - (D + 0.4)) < 3.5) openGate(L, G);
        if (L.gateOpen && !L.entered && p.z < D - 0.6) { L.entered = true; if (!L.picked) G.setObjective('Mom says you can pick <b>ONE</b> toy. Look around the store!'); }
        if (L.spark) { L.spark.visible = !L.sold; if (!L.sold) { L.spark.material.opacity = 0.6 + Math.sin(clk * 3) * 0.25; L.spark.scale.setScalar(0.8 + Math.sin(clk * 3) * 0.1); } }
        L.sparks.forEach((q) => { q.a += dt * 0.7; q.s.position.set(Math.cos(q.a) * q.r, lv[1] + 0.3 + Math.sin(q.a * 1.7) * 0.22, -D + 0.5 + Math.sin(q.a) * 0.15); q.s.material.opacity = 0.5 + Math.sin(clk * 4 + q.a * 3) * 0.4; q.s.visible = !L.sold; });
        if (!mollyGreeted && !L.sold && Math.hypot(p.x - 0, p.z + D) < 3.6) { mollyGreeted = true; Snd.hello(); G.say('<b>Molly:</b> Hi Emily! I have been waiting for you! Will you be my friend?', 5200); }
        // gentle reminder if you wander off with Molly
        if (L.picked && !L.checking && !L.done && G.state === 'play') {
          nextRemind -= dt;
          if (nextRemind <= 0) { nextRemind = 30; G.say('<b>Mom:</b> The checkout counter is the pink one by the front door, Emily. Press E there to pay!', 5200); }
        }
      };
      L.hint = () => !L.gateOpen ? 'Walk up to the rainbow gate. It opens when you get close (or press E).'
        : !L.picked ? 'Walk up to the doll on the big shelf at the back, Molly, and press E (or click) to take her.'
        : 'Walk to the pink CHECKOUT counter by the front door (on the right) and press E to pay for Molly.';
      // debug: __molly.solve() opens the gate, picks Molly and checks out (fast)
      L.debugApi = {
        solve() { if (!L.gateOpen) openGate(L, G, true); if (!L.picked) pickMolly(L, G, true); G.teleport(STAND.x, STAND.z, STAND.yaw); return checkout(L, G, true); },
        pick() { return pickMolly(L, G, true); }, checkout() { return checkout(L, G, true); }, gate() { openGate(L, G, true); }
      };
    },
    start(L, G) {
      const id = G.flowId;
      G.setObjective('Walk up to the <b>rainbow gate</b>. Toyland is open!');
      setTimeout(() => { if (id === G.flowId && G.level === L && !L.gateOpen) openGate(L, G); }, 1300);
      const lines = [[8500, () => L.entered ? '<b>Mom:</b> Take your time, sweetie. Look around! I will be right here, pretending I am not also looking at toys.' : '<b>Mom:</b> Come on in, Emily! The gate is open!'],
        [19000, () => '<b>Mom:</b> Oh, look at that doll on the big shelf... she is waving at you!']];
      lines.forEach((l) => setTimeout(() => { if (id === G.flowId && !L.sold && G.level === L && !L.talking && G.state === 'play') G.say(l[1](), 5400); }, l[0]));
    }
  };

  /* ---------------- helpers used by the scene ---------------- */
  const talk = [
    'Ooh, that is cute... but I keep looking at the doll on the big shelf.',
    'Hee hee, this teddy is so fluffy! But the doll at the back keeps waving at me.',
    'Fun! But Mom said ONE toy. The doll on the shelf feels special.',
    'Nice, but... Molly is waiting for me on the back shelf.',
    'Cool toys! Still... that doll with the nurse hat.',
    'This one is good, but I want the doll.'
  ];
  function toyTalk(L, G, i) { G.say('<b>Emily:</b> ' + (L.picked ? 'Nice toys! But I already have Molly. Time to pay for her!' : talk[i % talk.length]), 4000); }
  function wave(L, secs) { L.cg.pose = 'wave'; L.cg.waveT = secs; Snd.hello(); }
  function ringBell(L) { L.bellT = 0.5; Snd.chime(); }
  function burst(L, x, y, z, n, col) {
    for (let i = 0; i < n; i++) {
      const s = B.glow(col || 'rgba(255,220,90,0.95)', R(0.1, 0.2)); s.position.set(x, y, z); L.scene.add(s);
      L.fx.push({ s: s, vx: R(-0.7, 0.7), vy: R(0.8, 1.7), vz: R(-0.7, 0.3), life: 0 });
    }
  }
  function openGate(L, G, quiet) {
    if (L.gateOpen) return; L.gateOpen = true; L.gate.target = Math.PI * 0.5 * 0.96; L.gate.col.enabled = false;
    if (G.level !== L) return;
    if (L.picked || L.entered) return;
    G.setObjective('Walk through the gate into <b>Toyland</b>!');
    if (quiet) return;
    Snd.chime();
    G.say('<b>Mom:</b> Welcome to Toyland, Emily! You may pick <b>ONE</b> toy today.', 5400);
  }

  // click Molly: she jumps into your hands and the next job is the checkout counter
  async function pickMolly(L, G, instant) {
    if (L.sold) return; L.sold = true; L.picked = true; L.talking = true; const id = G.flowId;
    Snd.pickup(); Snd.hello(); const d = L.doll; d.userData.waveOn = true;
    d.traverse((o) => { o.castShadow = false; });
    L.hold = { obj: d, mode: 'fly', t0: L.clk || 0, dur: 0.8, from: d.position.clone(), s0: d.scale.x, s1: 0.4, r0: d.rotation.y };
    G.setInventory('<span class="chip">Molly (in your hands)</span>');
    G.setObjective('Take <b>Molly</b> to the <b>checkout counter</b>');
    if (instant) return;
    G.say('<b>Molly:</b> Yay!! You picked me! This is the best day ever!', 3000);
    await G.wait(3000); if (id !== G.flowId) return;
    G.say('<b>Mom:</b> Molly! What a lovely choice. Let\'s go pay at the checkout counter and take her home!', 4400);
  }

  // press E at the counter: friendly checkout, then the original "Welcome home..." transition
  async function checkout(L, G, fast) {
    if (!L.picked || L.checking || L.done || G.level !== L) return;
    L.checking = true; const id = G.token(), ok = () => id === G.flowId && G.level === L;
    let F = fast ? 0.12 : 1;
    const skipKey = (e) => { if (e.code === 'Space' || e.code === 'Enter') F = 0.25; };
    document.addEventListener('keydown', skipKey);
    setTimeout(() => document.removeEventListener('keydown', skipKey), 60000);
    if (!fast) setTimeout(() => { if (ok()) G.toast('Press Space to speed up'); }, 1500);
    const wait = (ms) => G.wait(ms * F), tw = (ms, fn) => G.tween(Math.max(30, ms * F), (k) => { if (ok()) fn(k); });
    const p = G.player, mom = L.mom, doll = L.doll, say = (h, ms) => { if (ok()) G.say(h, ms); };
    G.state = 'trans';
    const pr = document.getElementById('prompt'), ch = document.getElementById('crosshair'); if (pr) pr.classList.remove('show'); if (ch) ch.classList.remove('hot');
    G.setObjective('Checking out...'); Snd.click();
    L.momScript = true; L.momCol.enabled = false;
    // 1. step up to the counter, Mom comes along
    const p0 = { x: p.x, z: p.z, yaw: p.yaw, pitch: p.pitch }, yawT = angTo(p.yaw, STAND.yaw), m0 = { x: mom.position.x, z: mom.position.z };
    await tw(1100, (k) => {
      const e = ease(k); p.x = lerp(p0.x, STAND.x, e); p.z = lerp(p0.z, STAND.z, e); p.yaw = lerp(p0.yaw, yawT, e); p.pitch = lerp(p0.pitch, STAND.pitch, e);
      mom.position.x = lerp(m0.x, MOM_PAY.x, e); mom.position.z = lerp(m0.z, MOM_PAY.z, e);
    }); if (!ok()) return;
    // 2. hello
    wave(L, 2.0); say('<b>Cashier:</b> Hello! Great choice, this is Molly!', 3000);
    await wait(3000); if (!ok()) return;
    // 3. Molly goes on the scanner: beep
    L.cg.pose = 'desk'; L.hold.mode = 'free'; const d0 = doll.position.clone(), s0 = doll.scale.x, SP = { x: 4.7, y: TOP + 0.03, z: 3.5 };
    await tw(800, (k) => { const e = ease(k); doll.position.set(lerp(d0.x, SP.x, e), lerp(d0.y, SP.y, e) + Math.sin(Math.PI * k) * 0.25, lerp(d0.z, SP.z, e)); doll.scale.setScalar(lerp(s0, 0.4, e)); doll.rotation.y = lerp(doll.rotation.y, angTo(doll.rotation.y, Math.PI), e); doll.rotation.z = lerp(doll.rotation.z, 0, e); }); if (!ok()) return;
    L.scanning = true; await wait(450); if (!ok()) return;
    Snd.coin(); L.screen.userData.draw('MOLLY', '$19.99'); burst(L, 4.7, 1.0, 3.6, 5, 'rgba(255,90,90,0.9)');
    say('<b>Cashier:</b> <i>*beep!*</i> That will be $19.99, please!', 3200);
    await wait(500); L.scanning = false; await wait(2300); if (!ok()) return;
    // 4. Mom pays
    say('<b>Mom:</b> Here you go!', 2600); L.momPay = true; Snd.pickup();
    const bill = B.rbox(0.16, 0.006, 0.075, 0.002, M.p(0x5fc46a, 40, 0x666666), 0, 0, 0, L.scene), mp = mom.position;
    const b0 = { x: mp.x + 0.3, y: 1.05, z: mp.z + 0.4 };
    await tw(700, (k) => { const e = ease(k); bill.position.set(lerp(b0.x, 4.55, e), lerp(b0.y, TOP + 0.02, e) + Math.sin(Math.PI * k) * 0.15, lerp(b0.z, 3.55, e)); bill.rotation.y = k * 3; }); if (!ok()) return;
    L.momPay = false; await wait(300); if (!ok()) return;
    await tw(600, (k) => { const e = ease(k); bill.position.set(lerp(4.55, 5.65, e), lerp(TOP + 0.02, TOP + 0.12, e), lerp(3.55, 3.9, e)); bill.scale.setScalar(1 - 0.7 * e); }); if (!ok()) return;
    L.scene.remove(bill);
    // cha-ching: drawer pops open, coins sparkle
    Snd.clank(); setTimeout(() => { Snd.pickup(); Snd.coin(); }, 120); setTimeout(() => { if (ok()) Snd.chime(); }, 380);
    L.screen.userData.draw('PAID!', 'THANK YOU', '#ffe27a'); burst(L, 5.65, 1.3, 3.9, 12);
    say('<b>Cashier:</b> <i>*cha-ching!*</i> All paid. Thank you!', 3000);
    tw(300, (k) => { L.drawer.position.z = 0.2 * ease(k); });
    await wait(2000); if (!ok()) return;
    tw(300, (k) => { L.drawer.position.z = 0.2 * (1 - ease(k)); });
    // 5. the cashier takes a bag, Molly hops in, the bag is handed to you
    const bag = makeBag(); bag.position.set(6.0, TOP + 0.05, 3.95); bag.rotation.y = Math.PI; L.scene.add(bag);
    L.cg.pose = 'give';
    await tw(600, (k) => { const e = ease(k); bag.position.set(lerp(6.0, 4.95, e), lerp(TOP + 0.05, TOP + 0.02, e) + Math.sin(Math.PI * k) * 0.2, lerp(3.95, 3.55, e)); }); if (!ok()) return;
    const dd = doll.position.clone();
    await tw(500, (k) => { const e = ease(k); doll.position.set(lerp(dd.x, 4.95, e), lerp(dd.y, TOP + 0.05, e) + Math.sin(Math.PI * k) * 0.3, lerp(dd.z, 3.55, e)); }); if (!ok()) return;
    L.scene.remove(doll); bag.add(doll); doll.position.set(0, 0.03, 0); doll.rotation.set(0, 0, 0); doll.scale.setScalar(0.4);
    Snd.pickup(); burst(L, 4.95, 1.2, 3.55, 6, 'rgba(255,170,220,0.95)');
    say('<b>Cashier:</b> And here is your bag, with Molly inside. Have a wonderful day!', 3600);
    await tw(900, (k) => { const e = ease(k); bag.position.set(lerp(4.95, STAND.x - 0.1, e), TOP + 0.02 + Math.sin(Math.PI * k) * 0.1, lerp(3.55, 3.25, e)); }); if (!ok()) return;
    // you take the bag
    L.hold = { obj: bag, mode: 'fly', t0: L.clk, dur: 0.9, from: bag.position.clone(), s0: 1, s1: 1, r0: bag.rotation.y };
    G.setInventory('<span class="chip">Molly (in her bag)</span>'); Snd.hello();
    await wait(1100); if (!ok()) return;
    L.cg.pose = 'rest'; wave(L, 2.2);
    say('<b>Mom:</b> Thank you!', 2400);
    await wait(2500); if (!ok()) return;
    L.done = true;
    // --- the original ending of the store scene (unchanged) ---
    G.state = 'trans';
    await G.fade(true, 1400, '#2a1830'); if (id !== G.flowId) return;
    Snd.music('home'); L.scene.remove(L.doll); L.scene.remove(bag);
    await G.bigText('Welcome home...', 3400, 'warm'); if (id !== G.flowId) return;
    Snd.chime();
    await G.bigText('Hmm... the front door has a little music lock.<br>Molly wants to play a game. Let\'s find the tune!', 4600, 'warm'); if (id !== G.flowId) return;
    G.goLevel(1);
  }

  function makeBag() {
    const g = new THREE.Group(), pk = M.p(0xff9ec2, 40, 0x666666), wh = M.p(0xffffff, 40, 0x666666);
    B.rbox(0.28, 0.32, 0.13, 0.015, pk, 0, 0.16, 0, g); B.box(0.285, 0.05, 0.135, wh, 0, 0.21, 0, g);
    [-1, 1].forEach((s) => B.sph(0.05, M.p(0xffe27a, 80, 0xffffff), 0, 0.16, s * 0.068, g, 1, 1, 0.12, 10));   // star stickers (both sides)
    B.torus(0.07, 0.007, wh, 0, 0.32, 0, g, Math.PI, 14);   // handle
    return g;
  }
})();
