/* MOLLY - Level 3: THE MIRROR MAZE.
   Real path (start at the bottom, walking north): at each junction take
   LEFT, LEFT, RIGHT (written on note #1, found at the start)
   then STRAIGHT, RIGHT, LEFT, STRAIGHT (follow the GOLD floor arrows; note #2 says gold = truth, pink = lies).
   Any wrong branch ends in a mirror dead end that teleports you back to the start. */
(function () {
  'use strict';
  const B = window.Build, M = window.Mat, T = window.Tex, Snd = window.Snd;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const W = 19, H = 15, CS = 2.6, WALL_H = 3.4;
  const DIRS = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
  const YAW = { N: 0, E: -Math.PI / 2, S: Math.PI, W: Math.PI / 2 };

  // junctions: cell, correct first cell of the branch, direction, and where the decoys go
  const SPINE = [[9, 13, 9, 9], [9, 9, 5, 9], [5, 9, 5, 12], [5, 12, 2, 12], [2, 12, 2, 3], [2, 3, 8, 3], [8, 3, 8, 1], [8, 1, 16, 1]];
  const DECOYS = [[10, 9, 12, 9], [9, 8, 9, 7], [5, 8, 5, 7], [4, 9, 4, 9], [6, 12, 7, 12], [5, 13, 5, 13], [1, 6, 1, 6], [3, 6, 4, 6], [1, 3, 1, 3], [2, 2, 2, 1], [8, 4, 8, 6], [9, 3, 10, 3], [12, 2, 12, 4]];
  const TRAPS = [[12, 9], [9, 7], [5, 7], [4, 9], [7, 12], [5, 13], [1, 6], [4, 6], [1, 3], [2, 1], [8, 6], [10, 3], [12, 4]];
  // arrows: [junction index, cell c, r, direction pointing away from the junction, isCorrect]
  const ARROWS = [
    [1, 8, 9, 'W', 1], [1, 10, 9, 'E', 0], [1, 9, 8, 'N', 0],
    [2, 5, 10, 'S', 1], [2, 5, 8, 'N', 0], [2, 4, 9, 'W', 0],
    [3, 4, 12, 'W', 1], [3, 6, 12, 'E', 0], [3, 5, 13, 'S', 0],
    [4, 2, 5, 'N', 1], [4, 1, 6, 'W', 0], [4, 3, 6, 'E', 0],
    [5, 3, 3, 'E', 1], [5, 1, 3, 'W', 0], [5, 2, 2, 'N', 0],
    [6, 8, 2, 'N', 1], [6, 8, 4, 'S', 0], [6, 9, 3, 'E', 0],
    [7, 13, 1, 'E', 1], [7, 12, 2, 'S', 0]
  ];
  const JUNCTIONS = [[9, 9], [5, 9], [5, 12], [2, 6], [2, 3], [8, 3], [12, 1]];

  function arrowTex(gold) {
    return T.canvas(128, 128, (x, w, h) => {
      const c = gold ? '#ffd24a' : '#ff6fb5';
      x.clearRect(0, 0, w, h);
      x.fillStyle = 'rgba(0,0,0,0.55)'; x.beginPath(); x.arc(64, 64, 58, 0, 7); x.fill();
      x.strokeStyle = c; x.lineWidth = 6; x.beginPath(); x.arc(64, 64, 55, 0, 7); x.stroke();
      x.fillStyle = c; x.beginPath(); x.moveTo(64, 14); x.lineTo(104, 62); x.lineTo(78, 62); x.lineTo(78, 112); x.lineTo(50, 112); x.lineTo(50, 62); x.lineTo(24, 62); x.closePath(); x.fill();
    }, false);
  }
  function mollyReflection() {
    return T.canvas(128, 256, (x, w, h) => {
      x.clearRect(0, 0, w, h);
      x.fillStyle = '#bfe3ff';
      x.beginPath(); x.moveTo(50, 130); x.lineTo(78, 130); x.lineTo(112, 232); x.lineTo(16, 232); x.closePath(); x.fill();
      x.fillStyle = '#ffffff'; x.beginPath(); x.moveTo(54, 140); x.lineTo(74, 140); x.lineTo(98, 232); x.lineTo(30, 232); x.closePath(); x.fill();
      x.fillStyle = '#f2d98a'; x.beginPath(); x.ellipse(64, 78, 34, 44, 0, 0, 7); x.fill();
      x.fillStyle = '#ffe7d6'; x.beginPath(); x.ellipse(64, 82, 24, 28, 0, 0, 7); x.fill();
      x.fillStyle = '#ffffff'; x.fillRect(36, 28, 56, 20); x.fillStyle = '#e02a2a'; x.fillRect(62, 31, 4, 14); x.fillRect(57, 36, 14, 4);
      x.fillStyle = '#05070a'; x.beginPath(); x.arc(53, 82, 8, 0, 7); x.arc(75, 82, 8, 0, 7); x.fill();
      x.fillStyle = '#ffb0c4'; x.beginPath(); x.ellipse(64, 104, 8, 4, 0, 0, 7); x.fill();
    }, false);
  }

  window.LEVELS.push({
    id: 3, name: 'The Mirror Maze', music: 'lullaby', creepBase: 0.45, creepTime: 360, grace: 80, dangerAt: 0.55,
    dread: 1.12,
    look: { expo: 0.12, con: 0.04, amb: 0.08 },
    ease: { hold: 15, ramp: 70, floor: 0.18 },
    boxTune: [3, 5, 6, 4],
    card: '<small>LEVEL 3</small><h2>THE MIRROR MAZE</h2><small>Which way is real?</small>',
    build(L, G) {
      L.fog0 = [0x1a2433, 0.04]; L.fog1 = [0x08050c, 0.095];
      L.ambient = new THREE.HemisphereLight(0xa0b8d8, 0x202030, 1.0); L.ambBase = 1.0; L.scene.add(L.ambient);
      L.carryLight = new THREE.PointLight(0xdcecff, 9, 11, 2);
      const st = { n1: false, n2: false, stage: 0, tele: 0 };
      L.st = st;
      const grid = []; for (let r = 0; r < H; r++) { grid.push(new Array(W).fill(1)); }
      const line = (c1, r1, c2, r2) => {
        const dc = Math.sign(c2 - c1), dr = Math.sign(r2 - r1); let c = c1, r = r1;
        for (let i = 0; i < 100; i++) { grid[r][c] = 0; if (c === c2 && r === r2) break; c += dc; r += dr; }
      };
      SPINE.forEach((s) => line(s[0], s[1], s[2], s[3])); DECOYS.forEach((s) => line(s[0], s[1], s[2], s[3]));
      L.grid = grid;
      const X = (c) => c * CS, Z = (r) => r * CS;
      L.spawn = { x: X(9), z: Z(13), yaw: 0 }; L.bounds = [-CS, -CS, W * CS, H * CS];
      // floor + ceiling
      L.floor(X(-1), Z(-1), X(W), Z(H), M.p(0xffffff, 60, 0x666666, { map: T.tile('#2a3342', '#18202c') }), CS);
      L.ceil(X(-1), Z(-1), X(W), Z(H), M.l(0x080a10), WALL_H);
      // mirror walls: merge horizontal runs; only cells touching a corridor
      const mir = M.phys ? M.phys({ map: T.mirror(), color: 0xffffff, metalness: 0.8, roughness: 0.14, emissive: 0x1d2a38 }, 1.3) : new THREE.MeshPhongMaterial({ map: T.mirror(), color: 0xffffff, specular: 0xffffff, shininess: 120, emissive: 0x1d2a38 });
      const SECRET = (c, r) => c === 9 && r === 14;      // this cell is the secret mirror alcove behind the start (see secrets.js)
      const open = (c, r) => c >= 0 && r >= 0 && c < W && r < H && grid[r][c] === 0;
      const near = (c, r) => { for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (open(c + dc, r + dr)) return true; return false; };
      for (let r = 0; r < H; r++) {
        let c = 0;
        while (c < W) {
          if (grid[r][c] === 1 && near(c, r) && !SECRET(c, r)) {
            let e = c; while (e + 1 < W && grid[r][e + 1] === 1 && near(e + 1, r) && !SECRET(e + 1, r)) e++;
            L.wall(X(c), Z(r), X(e), Z(r), { t: CS, h: WALL_H, mat: mir, tile: CS });
            c = e + 1;
          } else c++;
        }
      }
      // ----- floor arrows -----
      const gold = new THREE.MeshBasicMaterial({ map: arrowTex(true), transparent: true, depthWrite: false }), pink = new THREE.MeshBasicMaterial({ map: arrowTex(false), transparent: true, depthWrite: false });
      L.arrowMeshes = [];
      ARROWS.forEach((a) => {
        const isGold = a[4] && a[0] >= 4;
        const g = new THREE.Group(); g.position.set(X(a[1]), 0.03, Z(a[2])); g.rotation.y = YAW[a[3]];
        const p = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), isGold ? gold : pink); p.rotation.x = -Math.PI / 2; g.add(p); L.scene.add(g); L.arrowMeshes.push(g);
      });
      // ----- notes on pedestals -----
      const mkNote = (c, r, ox, tex, label, text, which) => {
        const px = X(c) + ox, pz = Z(r);
        B.box(0.5, 0.85, 0.5, M.p(0x39485a, 40, 0x666666), px, 0.425, pz, L.scene); L.solid(px - 0.3, pz - 0.3, px + 0.3, pz + 0.3, 'low');
        const note = B.plane(0.6, 0.8, M.tb(tex), px, 1.35, pz, L.scene); note.material.side = THREE.DoubleSide;
        const g = B.glow('rgba(255,225,120,0.35)', 0.7); g.position.set(px, 1.35, pz); L.scene.add(g);
        L.interact({
          x: px, y: 1.2, z: pz, r: 2.5, label: label, onUse() {
            if (!st[which]) { st[which] = true; Snd.pickup(); updateInv(L, G); G.toast('Note saved in your notebook'); }
            G.say(text, 11000);
          }
        });
        return { note: note, glow: g, which: which };
      };
      L.notes = [
        mkNote(9, 12, 0.95, T.card(240, 320, '#fff6d8', [{ t: "Molly's way", s: 34, c: '#a02030' }, { t: 'LEFT', s: 46, c: '#222' }, { t: 'LEFT', s: 46, c: '#222' }, { t: 'RIGHT', s: 46, c: '#222' }, { t: '(at each turn)', s: 20 }], { border: '#a02030', bw: 8 }), 'Read the note on the pedestal', '<b>Note #1:</b> "Molly\'s secret way out starts like this: <b>LEFT, LEFT, RIGHT</b>... at the first three junctions. Left and right are from YOUR point of view as you walk."', 'n1'),
        mkNote(2, 10, 0.95, T.card(240, 320, '#fff6d8', [{ t: 'Careful!', s: 36, c: '#a02030' }, { t: 'GOLD arrows', s: 30, c: '#b8860b' }, { t: 'tell the truth', s: 26 }, { t: 'PINK arrows', s: 30, c: '#d6336c' }, { t: 'LIE!', s: 40, c: '#d6336c' }], { border: '#a02030', bw: 8 }), 'Read the note on the pedestal', '<b>Note #2:</b> "Careful! The <b>GOLD</b> arrows on the floor tell the truth. The <b>PINK</b> arrows LIE. Follow gold, and never trust pink!"', 'n2')
      ];
      // ----- exit -----
      const exitX = X(16) + CS / 2 - 0.04;
      const ex = B.plane(2.4, 3.0, M.b(0xfffbe0), exitX, 1.5, Z(1), L.scene); ex.rotation.y = -Math.PI / 2;
      const exitLight = new THREE.PointLight(0xfff0c0, 22, 12, 2); exitLight.position.set(X(16) - 0.5, 1.5, Z(1)); L.scene.add(exitLight);
      L.exitGlow = B.glow('rgba(255,245,190,0.9)', 5); L.exitGlow.position.set(exitX - 0.6, 1.5, Z(1)); L.scene.add(L.exitGlow);
      L.trigger({ x: X(16), z: Z(1), r: 1.1, onEnter() { G.completeLevel(); } });
      L.interact({ x: X(15), y: 1.4, z: Z(1), r: 2.2, label: 'A glowing doorway!', onUse() { G.say('<b>Emily:</b> Light! The way out is right there!', 3000); } });
      // ----- junction progress + traps -----
      JUNCTIONS.forEach((j, i) => L.trigger({ x: X(j[0]), z: Z(j[1]), r: 1.2, once: false, onEnter() { if (st.stage < i + 1) { st.stage = i + 1; G.bumpCreep(0.01); updateInv(L, G); } } }));
      const teleport = async () => {
        if (st.tele) return; st.tele = 1; Snd.whoosh();
        await G.fade(true, 220, '#fff');
        G.teleport(L.spawn.x, L.spawn.z, 0); G.player.pitch = 0; st.stage = Math.min(st.stage, 0);
        G.say('<b>The mirrors spin...</b> You are back at the start. Read your notes and think!', 5500);
        G.bumpCreep(0.03);
        await G.fade(false, 700); st.tele = 0;
      };
      L.teleportBack = teleport;
      TRAPS.forEach((t) => L.trigger({ x: X(t[0]), z: Z(t[1]), r: 0.85, once: false, onEnter() { if (G.state === 'play') teleport(); } }));
      // ----- Molly reflections -----
      const rt = mollyReflection();
      L.refl = [];
      const wallFaces = [];
      for (let r = 1; r < H - 1; r++) for (let c = 1; c < W - 1; c++) if (grid[r][c] === 0) ['N', 'E', 'S', 'W'].forEach((d) => { const nc = c + DIRS[d][0], nr = r + DIRS[d][1]; if (grid[nr][nc] === 1 && !(c === 9 && r === 13 && d === 'S')) wallFaces.push([c, r, d]); });
      for (let i = 0; i < 12; i++) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.8), new THREE.MeshBasicMaterial({ map: rt, transparent: true, opacity: 0, depthWrite: false, color: 0xcfeaff }));
        m.visible = false; L.scene.add(m); L.refl.push({ mesh: m, cool: rnd(0, 6), on: false });
      }
      L.moveRefl = (rf) => {
        const f = wallFaces[Math.random() * wallFaces.length | 0], d = DIRS[f[2]];
        rf.mesh.position.set(X(f[0]) + d[0] * (CS / 2 - 0.04), 0.95, Z(f[1]) + d[1] * (CS / 2 - 0.04));
        rf.mesh.rotation.y = Math.atan2(-d[0], -d[1]);
      };
      L.refl.forEach((rf) => L.moveRefl(rf));
      if (window.Dread && window.Secrets) { const pf = window.Dread.level3(L, G, { wallFaces: wallFaces, X: X, Z: Z, CS: CS }); window.Secrets.level3(L, { mir: mir, X: X, Z: Z, CS: CS, cell: [9, 14], portrait: pf }); }
      // ----- Molly's hiding places: corridor cells -----
      L.spots = []; const cells = [[9, 11], [7, 9], [5, 11], [3, 12], [2, 8], [2, 4], [5, 3], [7, 3], [8, 2], [10, 1], [13, 1], [15, 1], [12, 9], [9, 7], [5, 7], [7, 12], [5, 13], [1, 6], [4, 6], [10, 3], [12, 4], [8, 6], [11, 9], [2, 11]];
      cells.forEach((c) => L.spots.push({ x: X(c[0]), z: Z(c[1]) }));
      // ----- events -----
      L.event(0.55, () => { L.arrowMeshes.forEach((a, i) => { if (i % 5 === 0) a.visible = true; }); Snd.creak(0.1); });
      L.event(0.7, () => { G.toast('The mirrors are whispering...'); Snd.whisper(0.1); });
      L.progress = () => (st.n1 ? 0.1 : 0) + (st.n2 ? 0.1 : 0) + st.stage / 7 * 0.8;
      L.hint = () => {
        const sp = Math.hypot(G.player.x - X(9), G.player.z - Z(13));
        if (!st.n1) return 'Go back to the start of the maze (south) and read the note on the pedestal with E. It tells you the first three turns.';
        if (st.stage < 3) return 'Your note says LEFT, LEFT, RIGHT. At the 1st junction turn left, at the 2nd junction turn left, at the 3rd junction turn right. (Left and right are from your own point of view.) Dead ends send you back to the start.';
        if (!st.n2) return 'After the third turn the path goes north along the west side of the maze. There is a second note on a pedestal there. It explains the floor arrows.';
        if (st.stage < 7) return 'Now follow the GOLD arrows on the floor at every junction, and ignore the PINK ones. They lie!';
        return 'Keep going straight along the long corridor to the east. The bright doorway is the way out!';
      };
      L.debugApi.solve = () => { G.teleport(X(16), Z(1), -Math.PI / 2); return 'at exit'; };
      L.debugApi.path = () => SPINE;
      L.debugApi.grid = grid;
      L.debugApi.cs = CS;
      L.update = (dt, t) => {
        L.notes.forEach((n) => { n.note.position.y = 1.35 + Math.sin(t * 2 + n.which.length) * 0.06; n.note.rotation.y += dt * 0.8; n.glow.visible = !st[n.which]; });
        L.exitGlow.material.opacity = 0.7 + Math.sin(t * 3) * 0.2;
        const c = G.creep, want = Math.round(c * 12);
        L.refl.forEach((rf, i) => {
          const m = rf.mesh, p = G.player;
          if (i >= want || c < 0.1) { m.visible = false; rf.on = false; return; }
          rf.cool -= dt;
          if (!rf.on && rf.cool <= 0) { rf.on = true; m.visible = true; }
          if (rf.on) {
            m.material.opacity = 0.4 + Math.sin(t * 1.7 + i) * 0.18;
            const d = Math.hypot(m.position.x - p.x, m.position.z - p.z);
            if (d < 3.6 && G.isSeen(m.position.x, m.position.z, 0.3, 1.6)) { rf.on = false; m.visible = false; rf.cool = rnd(5, 10); L.moveRefl(rf); if (Math.random() < 0.5) Snd.giggle(0.07); }
          }
        });
      };
      updateInv(L, G);
    },
    start(L, G) {
      G.setObjective('Find the <b>real way</b> out of the mirror maze. Wrong turns send you back to the start!');
      G.say('<b>Emily:</b> Mirrors everywhere... I see myself, and sometimes someone else. There is a note ahead on a stand. I should read it.', 8000);
    }
  });

  function updateInv(L, G) {
    const st = L.st; if (!st) return;
    let h = '<div class="chip">Note 1: ' + (st.n1 ? 'LEFT, LEFT, RIGHT' : '?') + '</div><br>';
    h += '<div class="chip">Note 2: ' + (st.n2 ? 'GOLD arrows = truth, PINK = lies' : '?') + '</div><br>';
    h += '<div class="chip">Junctions passed: ' + st.stage + ' / 7</div>';
    G.setInventory(h);
  }
})();
