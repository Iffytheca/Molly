/* MOLLY - SECRETS: hidden rooms behind a painting / bookshelf, golden buttons (5 in total), squeaky toys, a funny key combo,
   a scrawled "Made by Alizay". None of this is needed to finish the game: no puzzle, answer, hint, save or exit depends on it,
   and nothing here can lock you in (a secret door stays open once it is open and its room is a dead end with the door side open).
   Golden buttons are remembered in localStorage ('molly_secrets'). Locations are listed in README.md ("Secrets").
   Loaded after dread.js and before the levels; the levels call Secrets.levelN(L, G, refs) at the end of build(). */
(function () {
  'use strict';
  const G = window.G, B = window.Build, M = window.Mat, T = window.Tex, Snd = window.Snd;
  const PI = Math.PI, rnd = G.rnd;
  const S = (window.Secrets = { total: 5, ids: ['store', 'l1', 'l2', 'l3', 'l4'], KEY: 'molly_secrets', found: {}, honks: 0 });
  const $ = (id) => document.getElementById(id);

  /* ---------- saved state (localStorage, always in try/catch: the game works without it) ---------- */
  S.load = function () {
    try { const o = JSON.parse(localStorage.getItem(S.KEY) || 'null'); if (o && o.found) S.ids.forEach((id) => { if (o.found[id]) S.found[id] = 1; }); } catch (e) {}
  };
  S.save = function () { try { localStorage.setItem(S.KEY, JSON.stringify({ found: S.found })); } catch (e) {} };
  S.count = () => S.ids.filter((id) => S.found[id]).length;
  S.has = (id) => !!S.found[id];
  S.all = () => S.count() >= S.total;
  S.reset = function () { S.found = {}; S.save(); S.hud(); };
  S.hud = function () {
    const el = $('secrets'); if (!el) return;
    el.innerHTML = '<span class="gb"></span>Secrets <b>' + S.count() + '/' + S.total + '</b>';
    el.classList.toggle('all', S.all());
  };
  S.show = function (on) { const el = $('secrets'); if (el) el.classList.toggle('hidden', !on); };
  S.onLevel = function (L) { S.show(!(L && L.def && L.def.id === 'ending')); S.hud(); };
  // bonus line for the final "To be continued" card
  S.endCard = function () {
    const el = $('endbonus'); if (!el) return;
    el.textContent = S.all() ? 'You found all the secrets! Molly smiles... for now.' : '';
    el.classList.toggle('hidden', !S.all());
    const c = $('endsecrets'); if (c) c.textContent = 'Golden buttons found: ' + S.count() + ' / ' + S.total;
  };

  /* ---------- golden button ---------- */
  S.collect = function (id) {
    if (S.found[id]) return false;
    S.found[id] = 1; S.save(); S.hud(); Snd.secret();
    const el = $('secrets'); if (el) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
    G.toast('Golden button found!  Secrets ' + S.count() + '/' + S.total);
    G.say(S.all() ? '<b>That is all five golden buttons!</b> Somewhere, a doll just smiled...' : '<b>A golden button!</b> It is warm and shiny, with a tiny <b>M</b> stitched on it. You found a secret!  (' + S.count() + ' of ' + S.total + ')', 6500);
    return true;
  };
  // id: 'store'|'l1'..'l4'. Returns the group (invisible when this button was already found before).
  S.button = function (L, o) {
    const g = new THREE.Group(); g.position.set(o.x, o.y, o.z); L.scene.add(g);
    const gold = M.p(0xffc933, 120, 0xffffff), dark = M.l(0x3a2a08);
    B.cyl(0.075, 0.075, 0.018, gold, 0, 0.009, 0, g, 24);
    B.torus(0.068, 0.011, gold, 0, 0.02, 0, g, PI * 2, 24).rotation.x = PI / 2;
    [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach((q) => B.cyl(0.0085, 0.0085, 0.006, dark, q[0] * 0.022, 0.02, q[1] * 0.022, g, 8));
    g.scale.setScalar(o.scale || 1.5); g.rotation.x = o.tilt === undefined ? 0.35 : o.tilt;
    const glint = B.glow('rgba(255,214,90,0.95)', 0.5); glint.position.set(o.x, o.y + 0.08, o.z); L.scene.add(glint);
    const st = { taken: S.has(o.id), g: g, glint: glint };
    if (st.taken) { g.visible = false; glint.visible = false; }
    L.anims.push({ update(dt, t) { if (st.taken) return; g.rotation.y += dt * 0.9; glint.material.opacity = 0.45 + Math.sin(t * 3.1 + o.x) * 0.3; } });
    L.interact({
      x: o.x, y: o.y + 0.06, z: o.z, r: o.r || 2.1, label: 'Pick up the golden button', noGlow: true, enabled: () => !st.taken,
      onUse() { st.taken = true; g.visible = false; glint.visible = false; S.collect(o.id); }
    });
    L.secretBtn = st; return st;
  };

  /* ---------- squeaky toy you can honk (a bit of fun, hidden or not) ---------- */
  const HONKS = ['HONK!', 'Squeeeak!', 'HONK HONK!', 'Squeak squeak!', 'HOOONK!', 'Honk! (Molly would not approve...)'];
  S.toy = function (L, o) {
    const t = B.duck(); t.scale.setScalar(o.scale || 1.5); t.position.set(o.x, o.y || 0, o.z); t.rotation.y = o.ry === undefined ? rnd(0, 6.28) : o.ry; L.scene.add(t);
    if (o.blob !== false) L.blob(o.x, o.z, 0.5, 0.5);
    L.interact({
      x: o.x, y: (o.y || 0) + 0.2, z: o.z, r: o.r || 1.9, label: o.label || 'Squeeze the squeaky toy',
      onUse() {
        S.honks++; (S.honks % 2 ? Snd.honk : Snd.squeak)(); setTimeout(() => (S.honks % 3 ? Snd.squeak : Snd.honk)(), 190);
        t.scale.setScalar((o.scale || 1.5) * 0.8); setTimeout(() => t.scale.setScalar(o.scale || 1.5), 140);
        G.toast(HONKS[(Math.random() * HONKS.length) | 0]);
      }
    });
    return t;
  };

  /* ---------- sliding secret door (bookshelf / painting panel): moves objects + colliders along the wall, stays open ---------- */
  // o: {hide: Group of the room (hidden until opened), objs:[Object3D], cols:[collider], zOnly:[objs or colliders that ignore dx], dx, dz, dur, label, x,y,z (interact spot), r, say, after(), twoStep (move along x first, then z), voids:[collider] (kept solid until it is open)}
  S.slider = function (L, o) {
    const st = { open: false, moving: false, t: 0 }, home = o.objs.map((m) => ({ x: m.position.x, z: m.position.z })), chome = o.cols.map((c) => ({ a: c.minX, b: c.maxX, c: c.minZ, d: c.maxZ }));
    const zo = (m) => o.zOnly && o.zOnly.indexOf(m) >= 0;
    if (o.hide) o.hide.visible = false;      // the closed room is fully walled in: do not draw it until the secret is opened (saves draw calls)
    const apply = (e) => {
      const ex = o.twoStep ? Math.min(1, e / 0.45) : e, ez = o.twoStep ? Math.max(0, Math.min(1, (e - 0.4) / 0.6)) : e;
      o.objs.forEach((m, i) => { m.position.x = home[i].x + (zo(m) ? 0 : o.dx * ex); m.position.z = home[i].z + o.dz * ez; });
      o.cols.forEach((c, i) => { const dxx = (o.zOnly && o.zOnly.indexOf(c) >= 0) ? 0 : o.dx * ex; c.minX = chome[i].a + dxx; c.maxX = chome[i].b + dxx; c.minZ = chome[i].c + o.dz * ez; c.maxZ = chome[i].d + o.dz * ez; });
    };
    L.anims.push({ update(dt) {
      if (!st.moving) return; st.t += dt / (o.dur || 2.2); const f = Math.min(1, st.t), e = f * f * (3 - 2 * f); apply(e);
      if (f >= 1) { st.moving = false; st.open = true; (o.voids || []).forEach((c) => { c.enabled = false; }); if (o.after) o.after(); }
    } });
    L.interact({
      x: o.x, y: o.y === undefined ? 1.2 : o.y, z: o.z, r: o.r || 1.9, label: o.label, noGlow: true, enabled: () => !st.open && !st.moving,
      onUse() { st.moving = true; if (o.hide) o.hide.visible = true; Snd.slide(); G.say(o.say, 7000); }
    });
    L.secretDoor = st; L.debugApi = L.debugApi || {}; L.debugApi.openSecret = () => { st.moving = true; st.t = 1; if (o.hide) o.hide.visible = true; };
    return st;
  };

  /* ---------- a little room: three new walls + floor + ceiling around a doorway you cut into a wall of the level ---------- */
  // o: {x1,z1,x2,z2, h, wall, floor, ceil, open: the side that is the old wall ('E'|'W'|'N'|'S')}
  function buildRoom(L, o) {
    const h = o.h || 2.5, w = { h: h, mat: o.wall, t: 0.2, trim: false, tile: o.tile || 2.2 };
    if (o.open !== 'N') L.wall(o.x1, o.z1, o.x2, o.z1, w);
    if (o.open !== 'S') L.wall(o.x1, o.z2, o.x2, o.z2, w);
    if (o.open !== 'W') L.wall(o.x1, o.z1, o.x1, o.z2, w);
    if (o.open !== 'E') L.wall(o.x2, o.z1, o.x2, o.z2, w);
    L.floor(o.x1, o.z1, o.x2, o.z2, o.floor, 2, 0.002); L.ceil(o.x1, o.z1, o.x2, o.z2, o.ceil, h);
  }
  // move everything added to the scene since `mark` into one group (except `keep`), so a closed secret room costs nothing to draw
  function wrap(L, mark, keep) {
    const rg = new THREE.Group(), list = L.scene.children.slice(mark).filter((c) => keep.indexOf(c) < 0);
    list.forEach((c) => rg.add(c)); L.scene.add(rg); return rg;
  }
  function twinkles(L, list) {   // soft fairy-light dots (sprites only, no extra lights)
    const sp = list.map((p) => { const s = B.glow('rgba(255,224,150,0.9)', 0.22); s.position.set(p[0], p[1], p[2]); L.scene.add(s); return s; });
    L.anims.push({ update(dt, t) { sp.forEach((s, i) => { s.material.opacity = 0.35 + 0.35 * Math.sin(t * 2.2 + i * 1.9); }); } });
  }
  function drawing(L, x, y, z, ry, w, h, lines, bg) { const p = B.plane(w, h, M.tb(T.card(300, Math.round(300 * h / w), bg || '#fff6d8', lines, { border: '#c9a26a', bw: 8 })), x, y, z, L.scene); p.rotation.y = ry; return p; }
  function crayonWall(L, text, x, y, z, ry, w, kind) {   // permanent (always visible) scrawl on a wall
    const mat = new THREE.MeshBasicMaterial({ map: window.Dread.scrawlTexture(text, kind || 'crayon'), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 200 / 640), mat); m.position.set(x, y, z); m.rotation.y = ry; m.userData.noShadow = true; L.scene.add(m); return m;
  }

  /* ============================== LEVEL 1: the house. Bookshelf in the living room slides aside -> a hidden clubhouse ============================== */
  S.level1 = function (L, o) {
    // o: {bs (bookshelf group), living (wall material)}   wall gap z -4.7..-3.3 in the west wall (x = -8)
    const mk = L.scene.children.length;
    const wallM = M.t(T.wallpaper('#d6e4f8', '#a9c3ea')), floorM = M.t(T.wood('#9a6b3c', '#865a30')), ceilM = M.l(0xf1ecdc);
    buildRoom(L, { x1: -10.7, z1: -5.5, x2: -8.0, z2: -2.5, h: 2.5, wall: wallM, floor: floorM, ceil: ceilM, open: 'E' });
    const slab = B.box(0.16, 2.0, 1.4, M.l(0x3a2a1c), -8.0, 1.0, -4.0, L.scene);
    const col = L.solid(-8.1, -4.7, -7.9, -3.3);
    L.place(B.rug(1.9, 1.5, 0x6a8ccf, 0xf3e7c8), -9.6, 0, -4.0);
    const stool = B.table(0.6, 0.5, 0.48, M.l(0xc58a52), M.l(0x7a4a28)); L.furn(stool, -10.1, -4.0, 0, 0.6, 0.5, true);
    B.rbox(0.34, 0.07, 0.3, 0.03, M.l(0xd94a6a), -10.1, 0.5, -4.0, L.scene);                       // a cushion for the button
    const chest = B.box(0.8, 0.45, 0.45, M.l(0x8a4a2a), -9.6, 0.225, -5.15, L.scene); L.solid(-10.0, -5.4, -9.2, -4.9, 'low');
    const t1 = B.teddy(0xe8a0b4); t1.scale.setScalar(0.8); t1.position.set(-10.3, 0, -2.95); t1.rotation.y = 2.4; L.scene.add(t1);
    drawing(L, -10.58, 1.45, -3.2, PI / 2, 0.62, 0.46, [{ t: 'ME + MOLLY', s: 34, c: '#d6336c' }, { t: 'best friends', s: 24 }]);
    drawing(L, -10.58, 1.5, -4.8, PI / 2, 0.55, 0.42, [{ t: 'SECRET', s: 34, c: '#1565c0' }, { t: 'CLUBHOUSE', s: 30, c: '#1565c0' }], '#e6f2ff');
    twinkles(L, [[-10.5, 2.3, -5.2], [-10.0, 2.35, -4.9], [-9.4, 2.3, -4.7], [-8.8, 2.35, -4.6], [-8.6, 2.3, -3.2], [-9.2, 2.35, -2.9], [-9.9, 2.3, -2.7], [-10.5, 2.3, -3.0]]);
    S.button(L, { id: 'l1', x: -10.1, y: 0.55, z: -4.0 });
    const rg = wrap(L, mk, [slab]);
    S.slider(L, {
      hide: rg,
      objs: [o.bs, slab], cols: [o.bs.userData.col, col], dx: 0, dz: 1.62, x: -7.1, y: 1.1, z: -4.0, r: 2.2, label: 'Look at the bookshelf', voids: [L.solid(-10.65, -5.45, -8.2, -2.55)],
      say: '<b>Emily:</b> One book is sticking out... I pushed it... <b>CLICK!</b> The whole bookshelf slides aside! A secret room!'
    });
    // a squeaky toy, hidden behind the big plant in the corner of the living room
    S.toy(L, { x: -1.9, z: -5.55, y: 0 });
  };

  /* ============================== LEVEL 2: the factory. A painting (it follows you with its eyes) hides a doorway in the north wall ============================== */
  S.level2 = function (L, o) {
    // o: {portrait (frame group), metal (wall material)}  wall gap x 0.7..1.9 in the north wall (z = -9)
    const mk = L.scene.children.length;
    const wallM = M.t(T.plaster('#7a6a58')), floorM = M.t(T.wood('#7a5a3a', '#684a2c')), ceilM = M.l(0x3a3430);
    buildRoom(L, { x1: -0.6, z1: -11.8, x2: 3.2, z2: -9.0, h: 2.7, wall: wallM, floor: floorM, ceil: ceilM, open: 'S', tile: 2.4 });
    const pivot = new THREE.Group(); pivot.position.set(1.3, 0, -9.0); L.scene.add(pivot);
    const geo = B.uvScale(new THREE.BoxGeometry(1.2, 2.1, 0.14), 1.2 / 3, 2.1 / 3), slab = new THREE.Mesh(geo, o.metal); slab.position.set(0, 1.05, 0); pivot.add(slab);
    o.portrait.position.set(0, 1.25, 0.11); o.portrait.rotation.y = 0; pivot.add(o.portrait);
    const col = L.solid(0.7, -9.1, 1.9, -8.9);
    // workshop: bench, old toys, sketches, and the scrawl
    const bench = B.table(1.8, 0.7, 0.85, M.l(0x8a6a44), M.l(0x4a3320)); L.furn(bench, 1.3, -11.0, 0, 1.8, 0.7);
    B.rbox(0.5, 0.2, 0.34, 0.03, M.l(0x30466a), 0.7, 0.95, -11.0, L.scene);
    const drum = B.cyl(0.16, 0.16, 0.2, M.p(0xd94a4a, 60, 0xffffff), 1.7, 0.95, -11.05, L.scene, 16);
    S.button(L, { id: 'l2', x: 1.7, y: 1.06, z: -11.05 });
    const t = B.teddy(0xb07a45); t.scale.setScalar(0.9); t.position.set(2.6, 0, -11.2); t.rotation.y = -0.6; L.scene.add(t);
    B.box(0.7, 0.9, 0.5, M.l(0x7a7a80), -0.15, 0.45, -11.4, L.scene); L.solid(-0.5, -11.7, 0.2, -11.15);
    drawing(L, -0.5, 1.5, -10.2, PI / 2, 0.6, 0.45, [{ t: 'MOLLY v1', s: 34, c: '#1565c0' }, { t: '(she smiles)', s: 22 }], '#e6f2ff');
    drawing(L, 3.08, 1.45, -10.3, -PI / 2, 0.6, 0.45, [{ t: 'ME + MOLLY', s: 32, c: '#d6336c' }, { t: 'forever', s: 24 }]);
    crayonWall(L, 'Made by Alizay', 1.3, 1.75, -11.68, 0, 1.9, 'crayon');       // the hidden signature
    twinkles(L, [[-0.4, 2.5, -10.0], [0.3, 2.55, -11.5], [1.4, 2.6, -11.6], [2.3, 2.55, -11.5], [3.0, 2.5, -10.1]]);
    const rg = wrap(L, mk, [pivot]);
    S.slider(L, {
      hide: rg,
      objs: [pivot], cols: [col], dx: 1.45, dz: 0, x: 1.3, y: 1.3, z: -8.1, r: 2.1, label: 'Look at the painting',
      say: '<b>Emily:</b> This painting is following me with its eyes... the frame is loose! I pulled it... <b>CLICK!</b> It slides along the wall! A secret room!'
    });
    // a squeaky toy tucked under the table by the north wall
    S.toy(L, { x: 7.0, z: -8.45, y: 0 });
  };

  /* ============================== LEVEL 3: the mirror maze. The painting on the wall behind where you start hides a mirror alcove ============================== */
  S.level3 = function (L, o) {
    // o: {mir (mirror material), X, Z, CS, cell:[9,14], portrait (frame group)}   the cell was left out of the mirror wall loop by level3.js
    const mk = L.scene.children.length;
    const cx = o.X(o.cell[0]), zc = o.Z(o.cell[1]), zN = zc - o.CS / 2;       // zN = north edge of the secret cell (the wall face you see from the start)
    const pivot = new THREE.Group(); pivot.position.set(cx, 0, zN + 0.13); L.scene.add(pivot);
    const geo = B.uvScale(new THREE.BoxGeometry(o.CS, 3.4, 0.24), 1, 3.4 / o.CS), slab = new THREE.Mesh(geo, o.mir); slab.position.set(0, 1.7, 0); pivot.add(slab);
    const col = L.solid(cx - o.CS / 2, zN, cx + o.CS / 2, zN + 0.27);
    L.wall(cx - o.CS / 2, zc + o.CS / 2 - 0.16, cx + o.CS / 2, zc + o.CS / 2 - 0.16, { t: 0.32, h: 3.4, mat: o.mir, tile: o.CS, trim: false });   // back wall of the alcove
    // the painting on the maze side (it looks north, back into the maze, right behind where you start)
    o.portrait.position.set(0, 1.55, -0.118); o.portrait.rotation.y = PI; pivot.add(o.portrait);
    // pedestal with the golden button
    const px = cx, pz = zN + 1.5;
    B.box(0.5, 0.8, 0.5, M.p(0x39485a, 40, 0x666666), px, 0.4, pz, L.scene); L.solid(px - 0.3, pz - 0.3, px + 0.3, pz + 0.3, 'low');
    S.button(L, { id: 'l3', x: px, y: 0.88, z: pz, scale: 1.6 });
    const g = B.glow('rgba(255,225,120,0.4)', 1.2); g.position.set(px, 1.0, pz); L.scene.add(g);
    L.anims.push({ update(dt, t) { g.material.opacity = 0.35 + Math.sin(t * 2) * 0.12; } });
    crayonWall(L, 'Made by Alizay', cx, 1.35, zc + o.CS / 2 - 0.335, PI, 1.7, 'chalk');
    const rg = wrap(L, mk, [pivot]);
    S.slider(L, {
      hide: rg,
      objs: [pivot], cols: [col], dx: -o.CS, dz: 0, x: cx, y: 1.5, z: zN - 0.75, r: 2.3, label: 'Look at the painting',
      voids: [L.solid(cx - 1.2, zN + 0.3, cx + 1.2, zc + o.CS / 2 - 0.35)],
      say: '<b>Emily:</b> A painting hung right behind the start... and the mirror behind it is loose! <b>CLICK!</b> It slides away. A tiny secret room!'
    });
    // a squeaky toy in a decoy corridor (not a trap), a little way off the main path
    S.toy(L, { x: o.X(9) + 0.75, z: o.Z(8) + 0.55, y: 0, blob: false });
  };

  /* ============================== LEVEL 4: the school. A bookshelf at the west end of the library rolls aside: the old lost-and-found closet ============================== */
  S.level4 = function (L, o) {
    // o: {bs (bookshelf group, 1.2 wide, at x -1.65 z 8.75)}   wall gap z 8.3..9.2 in the library's west wall (x = -2), see level4.js
    const mk = L.scene.children.length;
    const wallM = M.t(T.plaster('#9a9a82')), floorM = M.t(T.wood('#7a5a3a', '#684a2c')), ceilM = M.l(0x7a7a70);
    buildRoom(L, { x1: -5.0, z1: 7.4, x2: -2.0, z2: 9.9, h: 2.6, wall: wallM, floor: floorM, ceil: ceilM, open: 'E' });
    const slab = B.box(0.16, 2.2, 0.9, M.l(0x3a2a1c), -2.0, 1.1, 8.75, L.scene);
    const col = L.solid(-2.1, 8.3, -1.9, 9.2);
    L.place(B.rug(1.7, 1.3, 0x5a3f4a, 0xd8c8a8), -3.6, 0, 8.65);
    const stool = B.table(0.6, 0.5, 0.5, M.l(0xc58a52), M.l(0x7a4a28)); L.furn(stool, -4.35, 8.65, 0, 0.6, 0.5, true);
    B.rbox(0.34, 0.07, 0.3, 0.03, M.l(0x3a6ea5), -4.35, 0.52, 8.65, L.scene);
    S.button(L, { id: 'l4', x: -4.35, y: 0.57, z: 8.65 });
    // lost & found: boxes, a school bag, a tiny bunny... and drawings of Molly by the kids who went here
    B.box(0.7, 0.5, 0.5, M.l(0x9a7040), -3.2, 0.25, 7.75, L.scene); L.solid(-3.55, 7.5, -2.85, 8.0, 'low');
    B.box(0.5, 0.4, 0.45, M.l(0x7a6a50), -4.55, 0.2, 9.5, L.scene); L.solid(-4.8, 9.25, -4.3, 9.75, 'low');
    const t = B.bunny(); t.scale.setScalar(1.0); t.position.set(-4.55, 0.4, 9.5); L.scene.add(t);
    drawing(L, -4.88, 1.5, 8.0, PI / 2, 0.62, 0.46, [{ t: 'LOST &', s: 32, c: '#a02030' }, { t: 'FOUND', s: 32, c: '#a02030' }], '#fff3d6');
    drawing(L, -4.88, 1.45, 9.2, PI / 2, 0.6, 0.45, [{ t: 'I drew Molly!', s: 30, c: '#d6336c' }, { t: ':)', s: 40 }]);
    crayonWall(L, 'Made by Alizay', -3.5, 1.9, 9.78, PI, 1.5, 'chalk');
    twinkles(L, [[-4.8, 2.4, 7.6], [-4.0, 2.45, 7.55], [-3.2, 2.4, 7.6], [-4.8, 2.4, 9.7], [-3.8, 2.45, 9.75], [-3.0, 2.4, 9.7]]);
    const rg = wrap(L, mk, [slab]);
    S.slider(L, {
      hide: rg,
      objs: [o.bs, slab], cols: [o.bs.userData.col, col], dx: 0.5, dz: -1.0, twoStep: true, zOnly: [slab, col], x: -1.0, y: 1.1, z: 8.75, r: 2.2, label: 'Look at the bookshelf',
      voids: [L.solid(-4.95, 7.45, -2.15, 9.85)],
      say: '<b>Emily:</b> A book is stuck... I tugged it... <b>CLICK!</b> The bookshelf rolls away! A hidden lost-and-found closet!'
    });
    // a squeaky toy in the quiet corner of the library
    S.toy(L, { x: 7.4, z: 8.62, y: 0 });
  };

  /* ============================== THE TOY STORE (bonus golden button + a squeaky toy you can honk) ============================== */
  S.store = function (L, o) {
    // a big squeaky duck on the first display table (always visible, loved by everyone)
    const d = S.toy(L, { x: o.duck[0], y: o.duck[1], z: o.duck[2], scale: 2.4, ry: 0.3, label: 'Squeeze the squeaky duck', blob: false, r: 2.4 });
    // the golden button sits high on top of the left back shelf, twinkling
    S.button(L, { id: 'store', x: o.btn[0], y: o.btn[1], z: o.btn[2], scale: 1.8, r: 2.6 });
  };

  /* ---------- a funny key combo: type B O N K -> a silly, wobbly "nurse hat Molly" pops up and honks ---------- */
  let seq = [], seqT = 0, sillyT = 0;
  S.silly = function () {
    const el = $('silly'); if (!el || !el.classList.contains('hidden')) return;
    const img = $('silly-img'); try { if (window.SPRITES && SPRITES.molly) img.src = SPRITES.molly; else img.src = 'img/molly.png'; } catch (e) {}
    el.classList.remove('hidden'); void el.offsetWidth; el.classList.add('go');
    Snd.honk(); setTimeout(() => Snd.squeak(), 220); setTimeout(() => Snd.honk(), 520); setTimeout(() => Snd.squeak(), 740);
    G.toast('Nurse Molly says: BONK!');
    setTimeout(() => { el.classList.add('hidden'); el.classList.remove('go'); }, 4600);
  };
  S.initKeys = function () {
    const WANT = ['KeyB', 'KeyO', 'KeyN', 'KeyK'];
    addEventListener('keydown', (e) => {
      if (e.repeat || G.state !== 'play' || G.uiOpen) { return; }
      const now = performance.now(); if (now - seqT > 2500) seq = []; seqT = now;
      if (e.code === WANT[seq.length]) { seq.push(e.code); if (seq.length === WANT.length) { seq = []; S.silly(); } }
      else seq = e.code === WANT[0] ? [e.code] : [];
    });
  };
  S.load(); S.initKeys();
  window.addEventListener('DOMContentLoaded', () => S.hud());
})();
