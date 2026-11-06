/* MOLLY - Level 2: THE TOY FACTORY.
   Puzzle: find all 7 doll parts, read BOTH blueprint halves (office + exit gate), then put the parts
   on the assembly line (console at the start of the long belt) in this order:
   LEFT LEG, RIGHT LEG, BODY, LEFT ARM, RIGHT ARM, HEAD, NURSE HAT.  Wrong order = parts scatter again. */
(function () {
  'use strict';
  const B = window.Build, M = window.Mat, T = window.Tex, Snd = window.Snd;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ORDER = ['legL', 'legR', 'body', 'armL', 'armR', 'head', 'hat'];
  const NAMES = { legL: 'Left leg', legR: 'Right leg', body: 'Body', armL: 'Left arm', armR: 'Right arm', head: 'Head', hat: 'Nurse hat' };
  const ICON = { legL: '🦵', legR: '🦵', body: '👗', armL: '💪', armR: '💪', head: '😶', hat: '👒' };

  function blueprint(half) {
    return T.canvas(320, 380, (x, w, h) => {
      x.fillStyle = '#1b4f8f'; x.fillRect(0, 0, w, h);
      x.strokeStyle = 'rgba(255,255,255,0.18)'; x.lineWidth = 1;
      for (let i = 0; i < w; i += 20) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); }
      for (let i = 0; i < h; i += 20) { x.beginPath(); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); }
      x.strokeStyle = '#fff'; x.lineWidth = 4; x.strokeRect(6, 6, w - 12, h - 12);
      x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = 'bold 24px "Trebuchet MS", sans-serif';
      x.fillText('MOLLY BUILD ORDER', w / 2, 40);
      x.font = '16px "Trebuchet MS", sans-serif'; x.fillText(half === 1 ? '(page 1 of 2: steps 1 to 4)' : '(page 2 of 2: steps 5 to 7)', w / 2, 62);
      const list = half === 1 ? [0, 1, 2, 3] : [4, 5, 6];
      list.forEach((idx, k) => {
        const y = 100 + k * 66, id = ORDER[idx];
        x.fillStyle = '#ffd76a'; x.beginPath(); x.arc(46, y, 24, 0, 7); x.fill();
        x.fillStyle = '#143a6b'; x.font = 'bold 30px sans-serif'; x.textAlign = 'center'; x.fillText(String(idx + 1), 46, y + 10);
        x.fillStyle = '#fff'; x.textAlign = 'left'; x.font = 'bold 28px "Trebuchet MS", sans-serif'; x.fillText(NAMES[id].toUpperCase(), 88, y + 10);
      });
      x.fillStyle = '#9fd0ff'; x.font = 'italic 17px sans-serif'; x.textAlign = 'center';
      x.fillText(half === 2 ? 'Then the doll is ready!' : '...page 2 is by the big gate', w / 2, 340);
    }, false);
  }

  window.LEVELS.push({
    id: 2, name: 'The Toy Factory', music: 'lullaby', hum: true, creepBase: 0.3, creepTime: 420, grace: 90, dangerAt: 0.5,
    dread: 1.0,
    look: { expo: 0.05, con: 0.02, amb: 0.04, kill: 0.35 },
    ease: { hold: 20, ramp: 70, floor: 0.1 },    // starts a little spooky, but eases in
    boxTune: [6, 5, 3, 1, 3],
    card: '<small>LEVEL 2</small><h2>THE TOY FACTORY</h2><small>This is where Molly was made...</small>',
    build(L, G) {
      L.fog0 = [0x4a4f5c, 0.026]; L.fog1 = [0x140f1c, 0.07];
      L.ambient = new THREE.HemisphereLight(0x9fb0d0, 0x3a2a2a, 0.8); L.ambBase = 0.8; L.scene.add(L.ambient);
      L.spawn = { x: 0, z: 7.3, yaw: 0 }; L.bounds = [-12, -9, 12, 9];
      L.carryLight = new THREE.PointLight(0xffe8c0, 5, 8, 2);
      const st = { bp1: false, bp2: false, placed: [], held: [], done: false };
      L.st = st;
      const conc = M.t(T.concrete()), metalW = M.t(T.metal('#59606a'));
      L.floor(-12, -9, 12, 9, conc, 3);
      L.ceil(-12, -9, 12, 9, M.l(0x2a2c32), 5.2);
      const WH = 5.2, wopt = { h: WH, mat: metalW, tile: 3 };
      L.wallGaps(-12, -9, 12, -9, [[0.7, 1.9]], Object.assign({}, wopt, { doorH: 2.1 }));   // (the gap hides the painting secret, see secrets.js)
      L.wall(-12, 9, 12, 9, wopt);
      L.wall(-12, -9, -12, 9, wopt);
      L.wallGaps(12, -9, 12, 9, [[-4.1, -0.9]], Object.assign({}, wopt, { doorH: 3.2 }));
      // hazard stripes on the floor by the belt
      [-3.6, -1.4].forEach((z) => { const s = new THREE.Mesh(B.uvScale(new THREE.PlaneGeometry(13, 0.3), 13, 1), M.t(T.hazard())); s.rotation.x = -Math.PI / 2; s.position.set(0, 0.012, z); L.scene.add(s); });
      // ---- ceiling beams + hanging lamps ----
      for (let i = -3; i <= 3; i++) B.box(0.4, 0.5, 18, M.l(0x30343a), i * 3.6, 4.95, 0, L.scene);
      [[-7, -5], [0, -5], [7, -5], [-7, 3], [0, 3], [7, 3], [-5, 7.5], [5, 7.5], [10, -2.5]].forEach((p) => {
        B.cyl(0.015, 0.015, 1.2, M.l(0x222222), p[0], 4.4, p[1], L.scene, 4);
        B.cyl(0.05, 0.4, 0.3, M.l(0x2f3a30), p[0], 3.7, p[1], L.scene, 12);
        L.lamp(p[0], 3.55, p[1], 0xffd9a0, 22, 13, true);
      });
      // ---- main assembly line ----
      const belt = B.conveyor(13, 1.1); belt.position.set(0, 0, -2.5); L.scene.add(belt); L.solid(-6.6, -3.2, 6.6, -1.8, 'low');
      const belt2 = B.conveyor(11, 1.1); belt2.position.set(0.5, 0, 3.3); L.scene.add(belt2); L.solid(-5.1, 2.6, 6.1, 4.0, 'low');
      L.belts = [belt.userData.tex, belt2.userData.tex];
      // console where parts are placed
      const con = new THREE.Group(); con.position.set(-7.4, 0, -2.5); L.scene.add(con);
      B.box(0.9, 1.0, 1.4, M.p(0x30466a, 40, 0x444444), 0, 0.5, 0, con);
      const scr = B.box(0.05, 0.5, 1.0, M.b(0x33ff88), -0.25, 1.15, 0, con); scr.rotation.z = -0.3;
      B.box(0.08, 0.08, 0.08, M.b(0xff3030), 0.1, 1.04, 0.4, con);
      L.solid(-7.9, -3.2, -6.9, -1.8, 'low');
      L.interact({ x: -7.0, y: 1.0, z: -2.5, r: 2.6, label: 'Use the assembly console', enabled: () => !st.done, onUse() { openAssembly(L, G); } });
      L.slots = []; for (let i = 0; i < 7; i++) L.slots.push({ x: -5.2 + i * 1.7, y: 0.68, z: -2.5 });
      for (let i = 0; i < 7; i++) {
        const s = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), new THREE.MeshBasicMaterial({ map: T.card(64, 64, '#2b2b2b', [{ t: String(i + 1), s: 44, c: '#e8b800' }]), opacity: 0.8, transparent: true }));
        s.rotation.x = -Math.PI / 2; s.position.set(L.slots[i].x, 0.612, L.slots[i].z); L.scene.add(s);
      }
      // ---- machines ----
      const mach = [[-10.4, -1.6, 2.2, 2.6, 1.8, 0x5a7a9a, 0xff4040], [9.2, -6.2, 2.4, 2.4, 1.8, 0x8a5a4a, 0x66ff66], [8.6, 6.4, 2.2, 2.2, 1.6, 0x4a8a6a, 0xffcc33], [-3.5, 7.4, 2.4, 2.0, 1.4, 0x7a6a9a, 0xff6a6a], [-9.5, -7.2, 2.0, 2.4, 1.6, 0x9a8a4a, 0x66ccff]];
      L.machines = mach.map((m) => { const g = B.machine(m[2], m[3], m[4], m[5], m[6]); g.position.set(m[0], 0, m[1]); L.scene.add(g); L.solid(m[0] - m[2] / 2 - 0.05, m[1] - m[4] / 2 - 0.05, m[0] + m[2] / 2 + 0.05, m[1] + m[4] / 2 + 0.05); return g; });
      L.gears = [];
      [[0, 4.2, -8.8, 1.4], [6, 3.0, -8.85, 0.9], [-7, 3.4, -8.85, 0.7]].forEach((p, i) => { const g = B.gear(p[3], 10); g.position.set(p[0], p[1], p[2]); L.scene.add(g); L.gears.push({ g: g, s: (i % 2 ? -1 : 1) * (0.5 + i * 0.2) }); });
      // pillars
      [[-6, -6], [0, -6], [6, -6], [-3, 5.6], [5, 0.5], [-6.5, 0.5]].forEach((p) => { B.box(0.8, 5.2, 0.8, M.t(T.metal('#464c55')), p[0], 2.6, p[1], L.scene); L.solid(p[0] - 0.4, p[1] - 0.4, p[0] + 0.4, p[1] + 0.4); B.box(0.85, 1.2, 0.85, M.t(T.hazard()), p[0], 0.6, p[1], L.scene); });
      // crates, barrels, tables, shelves
      const crateM = M.l(0x9a7040), crateD = M.l(0x6f4f2a);
      const crate = (x, y, z, s) => { B.box(s, s, s, crateM, x, y, z, L.scene); L.solid(x - s / 2, z - s / 2, x + s / 2, z + s / 2); B.box(s + 0.02, 0.1, s + 0.02, crateD, x, y + s / 2 - 0.05, z, L.scene); B.box(s + 0.02, 0.1, s + 0.02, crateD, x, y - s / 2 + 0.05, z, L.scene); };
      crate(-10, 0.6, -6.5, 1.2); crate(-8.5, 0.4, -6.9, 0.8); crate(-10.2, 1.55, -6.4, 0.7);
      crate(10.5, 0.5, 4.0, 1.0); crate(10.6, 1.4, 4.1, 0.8); crate(11.0, 0.4, 2.9, 0.8);
      const barrel = (x, z) => { B.cyl(0.4, 0.4, 0.9, M.l(0x3a6a8a), x, 0.45, z, L.scene, 12); L.solid(x - 0.4, z - 0.4, x + 0.4, z + 0.4); };
      barrel(11, -8); barrel(10, -8.2); barrel(-11, 4.8);
      const tbl = B.table(1.8, 0.9, 0.85, M.l(0x77797c), M.l(0x444444)); tbl.position.set(6.2, 0, -8.0); L.scene.add(tbl); L.solid(5.3, -8.45, 7.1, -7.55, 'low');
      const shelfN = B.shelfUnit(2.4, 2.4, 0.6, 4, 0x6a7078); shelfN.position.set(-4, 0, -8.6); L.scene.add(shelfN); L.solid(-5.2, -9, -2.8, -8.3);
      const shelfE = B.shelfUnit(2.4, 2.4, 0.6, 4, 0x6a7078); shelfE.position.set(11.6, 0, 7.4); shelfE.rotation.y = -Math.PI / 2; L.scene.add(shelfE); L.solid(11.3, 6.2, 12, 8.6);
      L.heads = [];
      [shelfN, shelfE].forEach((sh, si) => sh.userData.levels.forEach((y, i) => {
        if ((si === 0 && i === 2) || (si === 1 && i === 2)) return; // keep spots free for doll parts
        for (let k = 0; k < 3; k++) {
          const bx = -0.8 + k * 0.8;
          if ((i + k) % 2) { const h = B.sph(0.11, M.p(0xf7d9c6, 20, 0x222222), bx, y + 0.15, 0, sh); L.heads.push(h); B.sph(0.012, M.b(0x111111), bx - 0.04, y + 0.17, 0.1, sh); B.sph(0.012, M.b(0x111111), bx + 0.04, y + 0.17, 0.1, sh); }
          else B.box(0.4, 0.28, 0.4, M.l([0x8a6a4a, 0x6a8a9a, 0x9a6a6a][k]), bx, y + 0.18, 0, sh);
        }
      }));
      B.plane(7, 1.3, M.tb(T.card(700, 130, '#2a2e36', [{ t: 'MOLLY TOY FACTORY', s: 72, c: '#ffd76a' }], { border: '#ffd76a', bw: 10 })), 0, 3.9, -8.88, L.scene);
      // ---- office (south-west corner) ----
      const omat = M.t(T.plaster('#8a8f7a'));
      L.wall(-12, 4, -8, 4, { h: 3.0, mat: omat, tile: 3 });
      L.wallGaps(-8, 4, -8, 9, [[5.3, 6.5]], { h: 3.0, mat: omat, tile: 3 });
      L.ceil(-12, 4, -8, 9, M.l(0x555a50), 3.0);
      const desk = B.table(1.8, 0.8, 0.8, M.l(0x7a5a38), M.l(0x4a3320)); desk.position.set(-10.2, 0, 7.8); L.scene.add(desk); L.solid(-11.1, 7.4, -9.3, 8.2, 'low');
      const deskChair = B.chair(M.l(0x2a3a5a)); deskChair.position.set(-10.2, 0, 6.8); deskChair.rotation.y = Math.PI; L.scene.add(deskChair);
      L.lamp(-10, 2.6, 6.5, 0xffe2b0, 10, 8, true);
      const bp1 = B.box(1.1, 1.3, 0.04, M.tb(blueprint(1)), -11.88, 1.6, 6.4, L.scene); bp1.rotation.y = Math.PI / 2;
      const bp1g = B.glow('rgba(120,200,255,0.7)', 0.8); bp1g.position.set(-11.6, 1.6, 6.4); L.scene.add(bp1g);
      L.interact({
        x: -11.6, y: 1.5, z: 6.4, r: 2.6, label: 'Read the blueprint (page 1)', onUse() {
          if (!st.bp1) { st.bp1 = true; Snd.pickup(); bp1g.visible = false; }
          G.say('<b>Blueprint, page 1:</b> 1. LEFT LEG &nbsp; 2. RIGHT LEG &nbsp; 3. BODY &nbsp; 4. LEFT ARM &nbsp;... <b>(page 2 is hung up by the big gate)</b>', 9000); updateInv(L, G);
        }
      });
      B.box(0.7, 1.5, 0.6, M.l(0x5a6a6a), -11.5, 0.75, 4.6, L.scene); L.solid(-11.85, 4.3, -11.15, 4.9);
      // ---- exit gate (east wall) ----
      const gate = new THREE.Mesh(B.uvScale(new THREE.BoxGeometry(0.3, 3.2, 3.2), 3, 3), M.t(T.hazard())); gate.position.set(11.85, 1.6, -2.5); L.scene.add(gate);
      const gateCol = L.solid(11.6, -4.1, 12.1, -0.9); L.gate = gate; L.gateCol = gateCol;
      const exitGlow = B.plane(8, 5, M.b(0xfff0c8), 14, 2.0, -2.5, L.scene); exitGlow.rotation.y = -Math.PI / 2; exitGlow.visible = false;
      const exitLight = new THREE.PointLight(0xffe9a8, 0, 16, 2); exitLight.position.set(10.5, 1.6, -2.5); L.scene.add(exitLight);
      const bp2 = B.box(1.1, 1.3, 0.04, M.tb(blueprint(2)), 11.88, 1.6, -5.4, L.scene); bp2.rotation.y = -Math.PI / 2;
      const bp2g = B.glow('rgba(120,200,255,0.7)', 0.8); bp2g.position.set(11.6, 1.6, -5.4); L.scene.add(bp2g);
      L.interact({
        x: 11.4, y: 1.5, z: -5.4, r: 2.6, label: 'Read the blueprint (page 2)', onUse() {
          if (!st.bp2) { st.bp2 = true; Snd.pickup(); bp2g.visible = false; }
          G.say('<b>Blueprint, page 2:</b> 5. RIGHT ARM &nbsp; 6. HEAD &nbsp; 7. NURSE HAT. <b>(page 1 is in the little office, back left)</b>', 9000); updateInv(L, G);
        }
      });
      L.interact({ x: 11.2, y: 1.2, z: -2.5, r: 2.2, label: 'The gate is shut', enabled: () => !st.done, onUse() { G.say('<b>Emily:</b> The big gate is locked. The assembly line must finish a doll to open it...', 5500); Snd.clank(); } });
      L.trigger({ x: 11.0, z: -2.5, r: 1.3, enabled: () => st.done, onEnter() { G.completeLevel(); } });
      // ---- doll parts to find ----
      L.partSpots = [[-10, 1.2, -6.5], [6.2, 0.85, -8.0], [-4.6, 1.38, -8.6], [4.2, 0.02, 5.2], [10.9, 0.02, 2.0], [-10.2, 0.8, 7.8], [10.5, 1.0, 4.0], [-9.5, 0.02, -3.6], [11.0, 0.9, -8.0], [11.2, 1.45, 7.4], [-1.8, 0.62, 3.3], [-8.2, 0.02, 1.8], [-10.2, 1.9, -6.4]];
      L.parts = ORDER.map((id) => {
        const mesh = B.part(id); L.scene.add(mesh);
        const glow = B.glow('rgba(255,235,140,0.8)', 0.55); L.scene.add(glow);
        const p = { id: id, mesh: mesh, glow: glow, state: 'floor', spot: null };
        p.interactable = L.interact({
          x: 0, y: 1, z: 0, r: 2.4, label: () => 'Pick up: ' + NAMES[id], enabled: () => p.state === 'floor',
          onUse() { p.state = 'held'; st.held.push(id); mesh.visible = false; glow.visible = false; Snd.pickup(); G.toast('Picked up: ' + NAMES[id] + ' (' + (st.held.length + st.placed.length) + '/7 found)'); updateInv(L, G); if (st.held.length + st.placed.length === 7) G.say('<b>Emily:</b> That is all seven parts! Now to the assembly console...', 5000); }
        });
        return p;
      });
      L.scatter = (list) => {
        const free = L.partSpots.slice().sort(() => Math.random() - 0.5);
        list.forEach((p, i) => {
          const s = free[i % free.length]; p.spot = s; p.state = 'floor';
          p.mesh.position.set(s[0], s[1], s[2]); p.mesh.rotation.set(0, rnd(0, 6.28), 0); p.mesh.visible = true; p.mesh.scale.setScalar(1);
          p.glow.position.set(s[0], s[1] + 0.3, s[2]); p.glow.visible = true;
          p.interactable.x = s[0]; p.interactable.y = s[1] + 0.2; p.interactable.z = s[2];
        });
      };
      L.scatter(L.parts);
      L.spots = [{ x: -10, z: -3.6 }, { x: -7.8, z: -7.5 }, { x: 0, z: -7.4 }, { x: 4.5, z: -3.8 }, { x: 8.0, z: -2.8 }, { x: 10.5, z: -0.5 }, { x: 3.0, z: 1.3 }, { x: -3.0, z: 1.2 }, { x: -5.5, z: 6.0 }, { x: 0.5, z: 5.8 }, { x: 5.5, z: 5.2 }, { x: 10.2, z: 7.8 }, { x: -9.5, z: 5.2 }, { x: -6.5, z: 3.4 }, { x: 8.0, z: 0.8 }, { x: -1.5, z: -4.8 }, { x: 3.0, z: -6.0 }, { x: 7.2, z: -4.2 }];
      L.event(0.4, () => { L.beltSpeed = 0; Snd.clank(); });
      L.event(0.5, () => { L.turnHeads = true; });
      L.event(0.62, () => { L.lamps.forEach((l, i) => { if (i % 2) l.light.color.setHex(0xff7040); }); });
      L.event(0.8, () => { L.lamps.forEach((l) => l.light.color.setHex(0xff5030)); Snd.thump(0.3); });
      L.beltSpeed = 0.4;
      L.progress = () => (st.held.length + st.placed.length) / 7 * 0.45 + ((st.bp1 ? 0.1 : 0) + (st.bp2 ? 0.1 : 0)) + st.placed.length / 7 * 0.3 + (st.done ? 0.05 : 0);
      L.hint = () => {
        if (st.done) return 'The gate is open! Walk through the bright light.';
        if (!st.bp1 || !st.bp2) {
          const need = []; if (!st.bp1) need.push('page 1 is in the little office in the back-left (south-west) corner'); if (!st.bp2) need.push('page 2 is on the wall next to the big gate at the east end');
          return 'You need the blueprint to know the building order. ' + need.join(', and ') + '.';
        }
        const miss = L.parts.filter((p) => p.state === 'floor');
        if (miss.length) {
          const dist = (p) => Math.hypot(p.mesh.position.x - G.player.x, p.mesh.position.z - G.player.z);
          const p = miss.sort((a, b) => dist(a) - dist(b))[0];
          const dx = p.mesh.position.x - G.player.x, dz = p.mesh.position.z - G.player.z;
          let ang = Math.atan2(-dx, -dz) - G.player.yaw; ang = Math.atan2(Math.sin(ang), Math.cos(ang));
          const dir = Math.abs(ang) < 0.7 ? 'straight ahead' : Math.abs(ang) > 2.3 ? 'behind you' : ang > 0 ? 'to your right' : 'to your left';
          return 'You have found ' + (st.held.length + st.placed.length) + ' of 7 parts. The closest glowing part (' + NAMES[p.id] + ') is ' + dir + ', about ' + Math.round(dist(p)) + ' steps away. Parts sit on crates, shelves, tables and the floor.';
        }
        return 'Use the console at the start of the long belt and place the parts in order: ' + ORDER.map((id, i) => (i + 1) + '. ' + NAMES[id]).join(', ') + '.';
      };
      L.debugApi.solve = () => { st.bp1 = st.bp2 = true; L.parts.forEach((p) => { if (p.state === 'floor') { p.state = 'held'; st.held.push(p.id); p.mesh.visible = false; p.glow.visible = false; } }); ORDER.forEach((id) => placePart(L, G, id)); return st.done; };
      L.debugApi.order = ORDER;
      L.debugApi.place = (id) => placePart(L, G, id);
      L.update = (dt, t) => {
        L.belts.forEach((tx) => { tx.offset.x -= dt * L.beltSpeed; });
        L.gears.forEach((g) => { g.g.rotation.z += dt * g.s * (G.creep > 0.7 ? 2 : 1); });
        L.machines.forEach((m, i) => { const b = m.userData.bulb; if (b) b.visible = Math.sin(t * 3 + i * 2) > -0.3; });
        L.parts.forEach((p) => { if (p.state === 'floor') { p.mesh.rotation.y += dt * 0.8; p.glow.material.opacity = 0.6 + Math.sin(t * 3 + p.mesh.position.x) * 0.3; p.glow.visible = Math.hypot(p.mesh.position.x - G.player.x, p.mesh.position.z - G.player.z) < 9; } });
        if (L.turnHeads) L.heads.forEach((h) => { const w = new THREE.Vector3(); h.getWorldPosition(w); h.parent.updateWorldMatrix(true, false); const a = Math.atan2(G.player.x - w.x, G.player.z - w.z); h.rotation.y = a - h.parent.rotation.y; });
        if (st.done) { const k = Math.min(1, (L.time - st.doneT) / 3); L.gate.position.y = 1.6 + k * 3.3; L.gateCol.enabled = k < 0.5; exitLight.intensity = 55 * k; if (L.doll) L.doll.position.x = Math.min(10.4, L.doll.position.x + dt * 1.5); }
      };
      L.finish = () => {
        st.done = true; st.doneT = L.time; exitGlow.visible = true; Snd.chime(); Snd.clank();
        const doll = B.molly(0.8); doll.position.set(L.slots[3].x, 0.64, -2.5); doll.rotation.y = Math.PI / 2; L.scene.add(doll); L.doll = doll;
        L.parts.forEach((p) => { p.mesh.visible = false; });
        G.setObjective('The gate is opening! Go through the <b>bright light</b>.'); G.say('<b>The machine hums... a doll is finished. The big gate rumbles open!</b>', 6000);
        G.bumpCreep(0.05);
      };
      if (window.Dread && window.Secrets) { const pf = window.Dread.level2(L, G, {}); window.Secrets.level2(L, { portrait: pf, metal: metalW }); }
      updateInv(L, G);
    },
    start(L, G) {
      G.setObjective('Find the <b>7 doll parts</b> and the <b>blueprint</b>. Build the doll on the assembly line to open the gate.');
      G.say('<b>Emily:</b> A toy factory... this is where Molly was made. There must be a way out through the big gate.', 7000);
    }
  });

  function updateInv(L, G) {
    const st = L.st; if (!st) return;
    let h = '<div class="chip">Blueprint: ' + (st.bp1 ? 'page 1' : '<s>page 1</s>') + ' &nbsp;' + (st.bp2 ? 'page 2' : '<s>page 2</s>') + '</div><br>';
    h += '<div class="chip">Bag: ' + (st.held.length ? st.held.map((id) => NAMES[id]).join(', ') : 'empty') + '</div><br>';
    h += '<div class="chip">On the belt: ' + st.placed.length + ' / 7</div>';
    G.setInventory(h);
  }

  function placePart(L, G, id) {
    const st = L.st, i = st.held.indexOf(id); if (i < 0 || st.done) return;
    st.held.splice(i, 1);
    const p = L.parts.filter((q) => q.id === id)[0], n = st.placed.length;
    p.state = 'belt'; p.mesh.visible = true; p.mesh.position.set(L.slots[n].x, 0.66, L.slots[n].z); p.mesh.rotation.set(0, Math.PI / 2, 0);
    st.placed.push(id);
    if (ORDER[n] === id) {
      Snd.coin(); Snd.clank();
      if (st.placed.length === 7) L.finish(); else G.toast('Click! Step ' + (n + 1) + ' done.');
    } else {
      Snd.spooky(); G.bumpCreep(0.06);
      G.say('<b>The machine shrieks...</b> Wrong order! The parts on the belt scatter across the factory.', 5500);
      G.fl.dur = 0.6; G.fl.black = true;
      const back = st.placed.map((pid) => L.parts.filter((q) => q.id === pid)[0]); st.placed = [];
      L.scatter(back);
    }
    updateInv(L, G);
    if (G.panel && G.panel.refresh) G.panel.refresh();
  }

  function openAssembly(L, G) {
    const st = L.st;
    const el = document.createElement('div'); el.className = 'panel';
    el.innerHTML = '<h3>Assembly Line Console</h3><div class="sub" id="asub"></div><div class="row" id="acards"></div><div class="sub" id="amsg" style="margin-top:8px;min-height:22px"></div><div><button id="a-close">Close (E)</button></div>';
    const closeSoon = () => { if (st.done) setTimeout(() => { G.closePanel(); G.lockPointer(); }, 1200); };
    const refresh = () => {
      el.querySelector('#asub').innerHTML = (st.bp1 && st.bp2) ? 'Click the part to put next on the belt. Placed so far: <b>' + st.placed.length + '/7</b>' : 'Tip: find both blueprint pages first, so you know the order!';
      const row = el.querySelector('#acards'); row.innerHTML = '';
      if (!st.held.length) row.innerHTML = '<div class="sub">Your bag is empty. Find doll parts around the factory.</div>';
      st.held.forEach((id, k) => {
        const c = document.createElement('div'); c.className = 'pcard'; c.innerHTML = '<div class="pic">' + ICON[id] + '</div><b>' + (k + 1) + '</b> ' + NAMES[id];
        c.addEventListener('mousedown', (e) => { e.preventDefault(); const before = st.placed.length; placePart(L, G, id); el.querySelector('#amsg').textContent = st.placed.length > before ? 'Placed: ' + NAMES[id] : (st.done ? 'Finished!' : 'Wrong order!'); closeSoon(); });
        row.appendChild(c);
      });
    };
    el.querySelector('#a-close').onclick = () => { G.closePanel(); G.lockPointer(); };
    G.openPanel(el, {
      refresh: refresh,
      onKey(e) { const m = /^(Digit|Numpad)([1-9])$/.exec(e.code); if (!m) return; const id = st.held[+m[2] - 1]; if (id) { placePart(L, G, id); closeSoon(); } }
    });
    refresh();
  }
})();
