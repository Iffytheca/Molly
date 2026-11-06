/* MOLLY - Level 1: THE HOUSE.
   Puzzle: Molly's music box plays a 6 note tune. Six clues around the house tell the notes.
   Play the tune on the piano (living room) to unlock the front door.
   MELODY = [3,5,6,4,5,1]  =  E G A F G C  (yellow, blue, purple, green, blue, red) */
(function () {
  'use strict';
  const B = window.Build, M = window.Mat, T = window.Tex, Snd = window.Snd;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const MELODY = [3, 5, 6, 4, 5, 1];
  const KEYS = B.KEYS;
  const ROOMS = { 1: 'the living room (a painting)', 2: 'the kitchen (the fridge)', 3: 'the hallway (a family photo)', 4: 'the playroom (toy blocks)', 5: 'the bedroom (Teddy on the bed)', 6: 'the hallway near the front door (a sign)' };

  function sunflower() {
    return T.canvas(256, 320, (x, w, h) => {
      x.fillStyle = '#bfe3ff'; x.fillRect(0, 0, w, h); x.fillStyle = '#7bbf6a'; x.fillRect(0, h * 0.78, w, h * 0.22);
      x.strokeStyle = '#2f7a2a'; x.lineWidth = 8; x.beginPath(); x.moveTo(128, 300); x.lineTo(128, 150); x.stroke();
      x.fillStyle = '#3f9a3a'; x.beginPath(); x.ellipse(98, 235, 28, 12, -0.5, 0, 7); x.fill(); x.beginPath(); x.ellipse(160, 215, 28, 12, 0.5, 0, 7); x.fill();
      for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; x.fillStyle = '#ffd400'; x.beginPath(); x.ellipse(128 + Math.cos(a) * 52, 110 + Math.sin(a) * 52, 28, 13, a, 0, 7); x.fill(); }
      x.fillStyle = '#6b3d14'; x.beginPath(); x.arc(128, 110, 32, 0, 7); x.fill();
      x.fillStyle = '#ffeb3b'; x.fillRect(180, 262, 56, 44); x.fillStyle = '#222'; x.font = 'bold 34px sans-serif'; x.textAlign = 'center'; x.fillText('#1', 208, 296);
      x.fillStyle = '#fff'; x.font = 'bold 15px sans-serif'; x.fillText('YELLOW', 208, 276);
    }, false);
  }
  function familyPhoto(withMolly) {
    return T.canvas(320, 220, (x, w, h) => {
      x.fillStyle = '#f2e7cf'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#a8d4f0'; x.fillRect(215, 25, 80, 90); x.strokeStyle = '#fff'; x.lineWidth = 4; x.strokeRect(215, 25, 80, 90); x.beginPath(); x.moveTo(255, 25); x.lineTo(255, 115); x.stroke();
      x.fillStyle = '#8b5a2b'; x.fillRect(0, 170, w, 50);
      // piano and Mom
      x.fillStyle = '#222'; x.fillRect(20, 110, 130, 66); x.fillStyle = '#fff'; x.fillRect(24, 150, 122, 16);
      for (let i = 0; i < 9; i++) { x.fillStyle = '#111'; x.fillRect(32 + i * 13, 150, 5, 10); }
      x.fillStyle = '#e07a9a'; x.fillRect(150, 100, 34, 70); x.fillStyle = '#f0c8a8'; x.beginPath(); x.arc(167, 88, 15, 0, 7); x.fill(); x.fillStyle = '#5a3420'; x.beginPath(); x.arc(167, 80, 15, Math.PI, 0); x.fill();
      x.fillStyle = '#3d5a8a'; x.fillRect(100, 106, 28, 60); x.fillStyle = '#f0c8a8'; x.beginPath(); x.arc(114, 94, 13, 0, 7); x.fill();
      x.fillStyle = '#222'; x.font = 'bold 16px Georgia'; x.fillText('Our family', 20, 30); x.font = '13px Georgia'; x.fillText('Mom plays "La, la, lullaby"', 20, 50);
      x.fillStyle = '#9b27af'; x.beginPath(); x.arc(300, 195, 10, 0, 7); x.fill();
      if (withMolly) {
        x.fillStyle = '#f6f6ff'; x.fillRect(244, 62, 22, 52); x.fillStyle = '#f7d9c6'; x.beginPath(); x.arc(255, 56, 11, 0, 7); x.fill();
        x.fillStyle = '#111'; x.beginPath(); x.arc(251, 55, 2.4, 0, 7); x.arc(259, 55, 2.4, 0, 7); x.fill();
        x.fillStyle = '#fff'; x.fillRect(247, 42, 16, 7); x.fillStyle = '#d00'; x.fillRect(254, 43, 2, 5);
      }
    }, false);
  }


  // little pictures for the walls
  function art(kind) {
    return T.canvas(256, 200, (x, w, h) => {
      if (kind === 'hills') { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#9fd4ff'); g.addColorStop(1, '#e8f6ff'); x.fillStyle = g; x.fillRect(0, 0, w, h); x.fillStyle = '#ffe27a'; x.beginPath(); x.arc(200, 50, 24, 0, 7); x.fill(); x.fillStyle = '#7fc36d'; x.beginPath(); x.moveTo(0, 150); x.quadraticCurveTo(80, 90, 170, 140); x.quadraticCurveTo(220, 120, 256, 135); x.lineTo(256, 200); x.lineTo(0, 200); x.fill(); x.fillStyle = '#5aa84f'; x.beginPath(); x.moveTo(0, 175); x.quadraticCurveTo(120, 130, 256, 170); x.lineTo(256, 200); x.lineTo(0, 200); x.fill(); x.fillStyle = '#e66a7a'; x.fillRect(100, 128, 40, 30); x.fillStyle = '#8a4b2a'; x.beginPath(); x.moveTo(94, 128); x.lineTo(120, 104); x.lineTo(146, 128); x.fill(); }
      else if (kind === 'kitty') { x.fillStyle = '#ffe9f0'; x.fillRect(0, 0, w, h); x.fillStyle = '#f0a860'; x.beginPath(); x.arc(128, 110, 56, 0, 7); x.fill(); x.beginPath(); x.moveTo(84, 78); x.lineTo(92, 30); x.lineTo(120, 62); x.fill(); x.beginPath(); x.moveTo(172, 78); x.lineTo(164, 30); x.lineTo(136, 62); x.fill(); x.fillStyle = '#222'; x.beginPath(); x.arc(108, 106, 7, 0, 7); x.arc(148, 106, 7, 0, 7); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(110, 103, 2.4, 0, 7); x.arc(150, 103, 2.4, 0, 7); x.fill(); x.fillStyle = '#e8607a'; x.beginPath(); x.arc(128, 124, 5, 0, 7); x.fill(); x.strokeStyle = '#7a4a20'; x.lineWidth = 3; x.beginPath(); x.arc(118, 126, 9, 0.2, 1.4); x.arc(138, 126, 9, 1.7, 2.9); x.stroke(); }
      else { x.fillStyle = '#fff6d8'; x.fillRect(0, 0, w, h); x.fillStyle = '#7fb8e8'; x.fillRect(0, 0, w, 90); for (let i = 0; i < 6; i++) { const cx = 30 + i * 40, c = ['#ff6f91', '#ffc75f', '#f9f871', '#b39cd0', '#ff9671', '#4fc3a1'][i]; x.strokeStyle = '#4a9a40'; x.lineWidth = 4; x.beginPath(); x.moveTo(cx, 190); x.lineTo(cx, 120 - (i % 2) * 10); x.stroke(); x.fillStyle = c; for (let k = 0; k < 6; k++) { x.beginPath(); x.arc(cx + Math.cos(k * 1.05) * 12, 112 - (i % 2) * 10 + Math.sin(k * 1.05) * 12, 9, 0, 7); x.fill(); } x.fillStyle = '#ffe14a'; x.beginPath(); x.arc(cx, 112 - (i % 2) * 10, 7, 0, 7); x.fill(); } }
    }, false);
  }

  window.LEVELS.push({
    id: 1, name: 'The House', music: 'home', creepBase: 0, creepTime: 600, grace: 130, dangerAt: 0.55,
    dread: 0.9,         // how strong the new creepy effects get in this level (x CREEP_SCALE), see dread.js
    look: { expo: 0.52, con: 0.34, amb: 0.42, kill: 0.8 },
    ease: { hold: 150, ramp: 300, floor: 0 },   // friendly start: creep stays at 0 for 2.5 minutes, then opens up slowly over 5 more
    boxTune: MELODY,
    card: '<small>LEVEL 1</small><h2>THE HOUSE</h2><small>A cozy day at home...</small>',
    build(L, G) {
      L.fog0 = [0xf3e5c9, 0.0032]; L.fog1 = [0x1b1a28, 0.075];
      L.ambient = new THREE.HemisphereLight(0xfff4e0, 0xd8b088, 1.45); L.ambBase = 1.45; L.scene.add(L.ambient);
      L.spawn = { x: -4.2, z: -1.2, yaw: 0 };
      L.bounds = [-8, -6, 8, 8];
      L.melody = MELODY;
      const found = {}, st = { heard: false, solved: false, played: [] };
      L.found = found; L.st = st;

      const wm = {
        living: M.t(T.wallpaper('#eadcc0', '#bccaa0')), kitchen: M.t(T.plaster('#f6e7a6')), hall: M.t(T.plaster('#e8d5b5')),
        bed: M.t(T.wallpaper('#f9d9e3', '#eaa8c0')), play: M.t(T.plaster('#bfe0f4')), out: M.t(T.plaster('#cbb99a')), edge: M.l(0xd9c9aa)
      };
      const H = 2.7; L.wallDefaults = { trim: true };
      // ----- floors & ceiling -----
      L.floor(-8, -6, 0, 0, M.t(T.wood('#a87a4b', '#966a3c')), 2);
      L.floor(0, -6, 8, 0, M.t(T.tile('#f4f1e8', '#9ec4d8')), 1.6);
      L.floor(-8, 0, 8, 2.5, M.t(T.wood('#8d5f36', '#7c502b')), 2);
      L.floor(-8, 2.5, -1, 8, M.t(T.carpet('#e9a9bf')), 3);
      L.floor(-1, 2.5, 8, 8, M.t(T.carpet('#7fb4dc')), 3);
      L.ceil(-8, -6, 8, 8, M.l(0xfaf5ea, { emissive: 0x3a3226 }), H);
      // ----- outer walls -----
      L.wall(-8, -6, 0, -6, { matA: wm.living, matB: wm.out, matE: wm.edge });
      L.wall(0, -6, 8, -6, { matA: wm.kitchen, matB: wm.out, matE: wm.edge });
      L.wall(-8, 8, -1, 8, { matB: wm.bed, matA: wm.out, matE: wm.edge });
      L.wall(-1, 8, 8, 8, { matB: wm.play, matA: wm.out, matE: wm.edge });
      L.wallGaps(-8, -6, -8, 0, [[-4.7, -3.3]], { matA: wm.living, matB: wm.out, matE: wm.edge, doorH: 2.0 });   // (the gap hides the bookshelf secret, see secrets.js)
      L.wall(-8, 0, -8, 2.5, { matA: wm.hall, matB: wm.out, matE: wm.edge });
      L.wall(-8, 2.5, -8, 8, { matA: wm.bed, matB: wm.out, matE: wm.edge });
      L.wall(8, -6, 8, 0, { matB: wm.kitchen, matA: wm.out, matE: wm.edge });
      L.wallGaps(8, 0, 8, 2.5, [[0.7, 1.8]], { matB: wm.hall, matA: wm.out, matE: wm.edge });
      L.wall(8, 2.5, 8, 8, { matB: wm.play, matA: wm.out, matE: wm.edge });
      // ----- inner walls -----
      L.wallGaps(-8, 0, 0, 0, [[-5.5, -4.2]], { matA: wm.hall, matB: wm.living, matE: wm.edge });
      L.wallGaps(0, 0, 8, 0, [[4, 5.3]], { matA: wm.hall, matB: wm.kitchen, matE: wm.edge });
      L.wallGaps(0, -6, 0, 0, [[-3.6, -1.6]], { matA: wm.kitchen, matB: wm.living, matE: wm.edge });
      L.wallGaps(-8, 2.5, -1, 2.5, [[-5, -4]], { matA: wm.bed, matB: wm.hall, matE: wm.edge });
      L.wallGaps(-1, 2.5, 8, 2.5, [[3, 4.1]], { matA: wm.play, matB: wm.hall, matE: wm.edge });
      L.wall(-1, 2.5, -1, 8, { matA: wm.play, matB: wm.bed, matE: wm.edge });
      // baseboards (one thin box per wall run is overkill; just paint a stripe at the floor with a long box)
      // ----- doors -----
      const bedDoor = L.door({ x: -5, z: 2.5, w: 1.0, axis: 'x', mat: M.l(0xc9a577) });
      const playDoor = L.door({ x: 3, z: 2.5, w: 1.1, axis: 'x', mat: M.l(0xc9a577) });
      [[bedDoor, -4.5, 'Open the bedroom door'], [playDoor, 3.55, 'Open the playroom door']].forEach((d) => {
        L.interact({ x: d[1], y: 1.1, z: 2.5, r: 2.2, label: d[2], enabled: () => !d[0].isOpen, onUse() { d[0].setOpen(true); } });
      });
      const frontDoor = L.door({ x: 8, z: 0.7, w: 1.1, axis: 'z', mat: M.l(0x7a4a2a), open: 1.35, openRot: 1.35, locked: true });
      [0.28, 0.82].forEach((zz) => { B.box(0.02, 0.6, 0.36, M.l(0x5a3519), -0.045, 1.5, zz, frontDoor.pivot); B.box(0.02, 0.7, 0.36, M.l(0x5a3519), -0.045, 0.62, zz, frontDoor.pivot); });
      const glowPlane = B.plane(14, 8, M.b(0xfff3c4), 11.5, 2, 1.25, L.scene); glowPlane.rotation.y = -Math.PI / 2; glowPlane.visible = false;
      const exitLight = new THREE.PointLight(0xffe9a8, 0, 14, 2); exitLight.position.set(7.2, 1.4, 1.25); L.scene.add(exitLight);
      const rays = []; for (let i = 0; i < 4; i++) { const g = B.glow('rgba(255,240,170,0.7)', 3.2); g.position.set(8.8 + i * 0.4, 1.3, 1.25); g.visible = false; L.scene.add(g); rays.push(g); }
      L.frontDoor = frontDoor;
      L.interact({ x: 7.4, y: 1.2, z: 1.25, r: 1.9, label: 'Try the front door', enabled: () => !st.solved, onUse() { G.say('<b>Emily:</b> It is locked... There is a little music symbol on the lock. I need a TUNE!', 6000); Snd.buzz(); } });
      L.trigger({ x: 8.3, z: 1.25, r: 0.9, enabled: () => st.solved, onEnter() { G.completeLevel(); } });

      // ----- lights -----
      [[-4, 1.3, -3, 24], [4, 1.3, -3, 24], [-4, 1.3, 1.25, 20], [4, 1.3, 1.25, 20], [-4.5, 1.3, 5.2, 22], [3.5, 1.3, 5.2, 22]].forEach((p, i) => {
        const l = L.lamp(p[0], 2.55, p[2], 0xffe6b8, p[3], 11, 'dome');
        if (i === 1) L.kitchenLamp = l;
      });
      // windows (sky turns dark as creep rises)
      const wins = [[-1.0, 1.55, -5.88, 0, 1.3], [4.4, 1.55, -5.88, 0, 1.3], [-7.88, 1.5, 5.4, Math.PI / 2, 1.2], [5.0, 1.5, 7.88, Math.PI, 1.4], [-7.88, 1.5, -2.2, Math.PI / 2, 1.2]];
      wins.forEach((w, wi) => { const g = B.window(w[4], 1.15, { y: w[1], curtain: ['#f4b8c8', '#cfe3f5', '#f7e2a8', '#d6ecd0', '#f4b8c8'][wi] }); g.position.set(w[0], w[1], w[2]); g.rotation.y = w[3]; L.scene.add(g); L.sky(g.userData.sky, 0x1a1030); });

      // ================= LIVING ROOM =================
      const piano = B.piano(); piano.position.set(-3.0, 0, -5.45); L.scene.add(piano);
      L.solid(-3.85, -5.9, -2.15, -4.95, 'low');
      L.interact({ x: -3.0, y: 1.0, z: -4.5, r: 2.5, label: 'Play the piano', enabled: () => !st.solved, onUse() { openPiano(L, G); } });
      L.interact({ x: -3.0, y: 1.0, z: -4.5, r: 2.5, label: 'The piano (it is quiet now)', enabled: () => st.solved, onUse() { G.say('The piano is silent now. Go to the front door!', 3000); } });
      L.furn(B.sofa(2.1, M.l(0x9b3d3d)), -5.6, -1.6, Math.PI, 2.1, 0.9);
      L.furn(B.table(1.1, 0.6, 0.42, M.l(0xb98a55)), -5.5, -3.4, 0, 1.1, 0.6);
      L.place(B.rug(3.0, 2.2, 0x4d6a8c, 0xf1e2b6), -5.4, 0, -3.3);
      L.furn(B.sofa(0.9, M.l(0x3d5a8a)), -1.0, -3.0, -Math.PI / 2, 0.9, 0.9);
      const bs = B.bookshelf(1.5, 2.0, 0.35); L.furn(bs, -7.7, -4.0, Math.PI / 2, 1.5, 0.35, false);
      L.furn(B.floorLamp(), -7.3, -0.9, 0, 0.3, 0.3, false);
      const lampLight = L.lamp(-7.3, 1.45, -0.9, 0xffc878, 6, 5, false);
      L.place(B.plant(1.3), -1.0, 0, -5.2); L.blob(-1.0, -5.2, 0.9, 0.9);
      L.place(B.plant(0.8), -7.4, 0, -6.0 + 0.6); L.blob(-7.4, -5.4, 0.6, 0.6);
      // rocking-chair like toy shifters
      const lt = B.teddy(0xd8a060); lt.position.set(-5.6, 0.62, -1.9); lt.rotation.y = Math.PI; L.scene.add(lt); L.shifter(lt, { x: -6.5, z: -0.6, y: 0, ry: 2.2, rz: 0 });
      // clue 1: sunflower painting
      const pic1 = B.frame(0.9, 1.1, sunflower()); pic1.position.set(-6.0, 1.55, -5.85); L.scene.add(pic1);
      clue(L, G, found, 1, -6.0, 1.5, -5.6, 'Look at the painting', '<b>A painting of a sunflower.</b> A sticker says: <b>"Note #1 is as YELLOW as the sun!"</b>', pic1);

      // ================= KITCHEN =================
      L.furn(B.counter(3.4, '#8aa57a'), 3.0, -5.6, 0, 3.4, 0.6);
      L.furn(B.counter(1.6, '#8aa57a'), 6.0, -5.6, 0, 1.6, 0.6);
      const fridge = B.fridge(); fridge.position.set(7.35, 0, -5.45); L.furn(fridge, 7.35, -5.45, 0, 0.8, 0.75);
      const st1 = B.box(0.6, 0.8, 0.6, M.p(0x2a2d31, 40, 0x555555), 1.2, 0.45, -5.6, L.scene); L.solid(0.9, -5.9, 1.5, -5.3);
      [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => B.cyl(0.11, 0.11, 0.02, M.b(0x111111), 1.2 + sx * 0.14, 0.86, -5.6 + sz * 0.14, L.scene, 12)));
      const kt = B.table(1.5, 1.0, 0.75, M.l(0xc9a577)); L.furn(kt, 3.8, -2.6, 0, 1.5, 1.0);
      const chairs = [[3.8, -3.6, 0], [3.8, -1.6, Math.PI], [2.7, -2.6, Math.PI / 2], [4.9, -2.6, -Math.PI / 2]];
      chairs.forEach((c, i) => { const ch = B.chair(M.l(0xd9b27a)); ch.position.set(c[0], 0, c[1]); ch.rotation.y = c[2]; L.scene.add(ch); L.solid(c[0] - 0.22, c[1] - 0.22, c[0] + 0.22, c[1] + 0.22, 'low'); L.shifter(ch, { x: c[0] + (i % 2 ? 0.5 : -0.5), z: c[1] + 0.3, ry: c[2] + 0.9 }); });
      const bowl = B.sph(0.14, M.l(0xe53935), 3.6, 0.82, -2.5, L.scene, 1, 0.6, 1);
      B.sph(0.07, M.l(0xffd54f), 3.95, 0.8, -2.7, L.scene); B.sph(0.07, M.l(0x66bb6a), 3.85, 0.8, -2.45, L.scene);
      // clue 2: fridge magnets
      const note2 = B.plane(0.5, 0.36, M.tb(T.card(300, 215, '#d9efff', [{ t: '#2', s: 60, c: '#1565c0' }, { t: 'as deep as the', s: 28 }, { t: 'OCEAN BLUE', s: 40, c: '#1e88e5' }], { border: '#1e88e5', bw: 10 })), 7.15, 1.35, -5.07, L.scene);
      B.sph(0.03, M.l(0xe53935), 6.95, 1.5, -5.06, L.scene); B.sph(0.03, M.l(0xfdd835), 7.35, 1.5, -5.06, L.scene);
      clue(L, G, found, 2, 7.15, 1.35, -4.7, 'Read the fridge note', '<b>A note on the fridge:</b> <b>"Note #2 is as deep as the OCEAN. Blue!"</b>', note2);
      L.kitchenWall = B.frame(0.6, 0.45, T.card(240, 180, '#fff4cc', [{ t: 'Kitchen', s: 40 }, { t: 'Rules', s: 40 }, { t: 'No toys at the table!', s: 22 }], { border: '#c9a000' })); L.kitchenWall.position.set(1.0, 1.7, -5.88); L.scene.add(L.kitchenWall);

      // ================= HALLWAY =================
      for (let i = 0; i < 5; i++) L.place(B.rug(3, 1.4, 0xa13b3b, 0xd8786a, 2.14, 1), -6 + i * 3, 0, 1.25);
      const photoMat = new THREE.MeshBasicMaterial({ map: familyPhoto(false) });
      const photo = B.frame(0.9, 0.62, familyPhoto(false)); photo.children[1].material = photoMat; photo.position.set(-1.5, 1.55, 2.39); photo.rotation.y = Math.PI; L.scene.add(photo);
      L.photoMat = photoMat;
      clue(L, G, found, 3, -1.5, 1.5, 2.1, 'Look at the family photo', '<b>Mom playing the piano.</b> Written under it: <b>"Note #3 is LA, from our \'La, la, lullaby\'. Purple!"</b>', photo);
      const console_ = B.table(1.2, 0.35, 0.8, M.l(0x6b4423)); L.furn(console_, 1.0, 2.25, 0, 1.2, 0.35);
      B.cyl(0.08, 0.06, 0.2, M.l(0x4aa3c8), 0.8, 0.9, 2.25, L.scene); B.sph(0.09, M.l(0xff8fb0), 0.8, 1.08, 2.25, L.scene);
      // coat rack
      const rack = B.cyl(0.03, 0.03, 1.7, M.l(0x4a2c15), -7.5, 0.85, 0.4, L.scene, 6);
      [0, 1, 2].forEach((i) => { const c = B.box(0.3, 0.7, 0.1, M.l([0xd9534f, 0x5bc0de, 0xf0ad4e][i]), -7.5, 1.1, 0.4 + (i - 1) * 0.12, L.scene); c.rotation.y = 0.4; });
      L.solid(-7.7, 0.2, -7.3, 0.6);
      // clue 6: Home Sweet Home sampler near the front door
      const sampler = B.frame(0.8, 0.55, T.card(320, 220, '#fff0f0', [{ t: 'HOME', s: 46, c: '#c62828' }, { t: 'sweet home', s: 30 }, { t: 'Note #6: DO (red heart)', s: 24, c: '#c62828' }], { border: '#c62828', bw: 10, draw(x) { x.fillStyle = '#e53935'; x.beginPath(); x.arc(150, 180, 14, 0, 7); x.arc(172, 180, 14, 0, 7); x.fill(); x.beginPath(); x.moveTo(137, 188); x.lineTo(161, 214); x.lineTo(185, 188); x.fill(); } }));
      sampler.position.set(6.9, 1.55, 0.12); L.scene.add(sampler);
      clue(L, G, found, 6, 6.9, 1.5, 0.5, 'Read the sign', '<b>A cross-stitch sign: "HOME SWEET HOME".</b> The heart is red. <b>"Note #6 is DO, as red as this heart!"</b>', sampler);
      // door mat
      B.rbox(0.9, 0.03, 1.3, 0.012, M.t(T.rug('#7a5a2a', '#c9a96a', '#fff3d0')), 7.3, 0.015, 1.25, L.scene);

      // ================= BEDROOM =================
      const bed = B.bed(0xe07a9a); bed.position.set(-6.9, 0, 7.0); bed.rotation.y = Math.PI / 2; L.scene.add(bed); L.solid(-7.95, 6.45, -5.85, 7.55, 'low');
      const ns = B.box(0.5, 0.55, 0.45, M.l(0x8a5a30), -7.7, 0.275, 5.9, L.scene); L.solid(-7.95, 5.65, -7.45, 6.15, 'low');
      // music box
      const mb = new THREE.Group(); mb.position.set(-7.7, 0.55, 5.9); L.scene.add(mb);
      B.box(0.26, 0.12, 0.2, M.p(0xb5651d, 50, 0x666666), 0, 0.06, 0, mb); B.box(0.27, 0.03, 0.21, M.l(0xe0b04a), 0, 0.14, 0, mb);
      const ballerina = new THREE.Group(); ballerina.position.set(0, 0.17, 0); mb.add(ballerina);
      B.cyl(0.0, 0.05, 0.05, M.l(0xff9ec2), 0, 0.03, 0, ballerina, 10); B.cyl(0.012, 0.012, 0.04, M.l(0xf7d9c6), 0, 0.075, 0, ballerina, 6); B.sph(0.016, M.l(0xf7d9c6), 0, 0.105, 0, ballerina);
      L.ballerina = ballerina;
      const mbGlow = B.glow('rgba(255,215,106,0.8)', 0.5); mbGlow.position.set(-7.7, 0.85, 5.9); L.scene.add(mbGlow); L.mbGlow = mbGlow;
      L.interact({
        x: -7.7, y: 0.75, z: 5.9, r: 2.4, label: 'Wind up the music box', onUse() {
          const d = Snd.boxMelody(MELODY, 0.62, 0.22); st.heard = true; st.boxT = L.time + d + 0.5;
          G.say('<b>The music box plays six notes...</b> Listen carefully. Press E again to hear it again.', 5200);
          updateObjective(); mbGlow.visible = false;
        }
      });
      const teddyBed = B.teddy(0xb07a45); teddyBed.position.set(-6.15, 0.64, 6.95); teddyBed.rotation.y = -2.2; L.scene.add(teddyBed);
      const tag = B.plane(0.3, 0.2, M.tb(T.card(240, 160, '#fff8dc', [{ t: 'Teddy says:', s: 26 }, { t: 'Note #5 sounds', s: 30, c: '#1565c0' }, { t: 'just like #2!', s: 30, c: '#1565c0' }], { border: '#b8860b' })), -6.15, 0.98, 6.62, L.scene);
      clue(L, G, found, 5, -6.15, 0.85, 6.95, 'Read the tag on Teddy', '<b>A tag tied to Teddy:</b> <b>"Note #5 sounds just like Note #2!"</b>', tag);
      L.place(B.rug(2.0, 1.5, 0xe9a0bd, 0xfff0f5), -4.0, 0, 5.2);
      const wardrobe = B.box(1.2, 2.1, 0.6, M.l(0x9c6b3a), -1.7, 1.05, 3.0, L.scene); L.solid(-2.3, 2.7, -1.1, 3.3);
      L.wardrobe = wardrobe;
      const toyShelf = B.shelfUnit(1.6, 1.5, 0.4, 3, 0xf4e3c8); toyShelf.position.set(-3.5, 0, 7.75); L.scene.add(toyShelf); L.solid(-4.3, 7.5, -2.7, 8);
      toyShelf.userData.levels.forEach((y, i) => { const t = i === 1 ? B.bunny() : B.teddy([0xe8a0b4, 0x8fb8ff, 0xb07a45][i]); t.scale.setScalar(0.6); t.position.set(-0.4 + i * 0.35, y + 0.04, 0); t.rotation.y = rnd(-0.3, 0.3); toyShelf.add(t); });
      const bear2 = B.teddy(0x8fb8ff); bear2.scale.setScalar(0.8); bear2.position.set(-3.5, 0.0, 6.6); L.scene.add(bear2); L.shifter(bear2, { x: -2.2, z: 5.4, ry: 3.5 });

      // ================= PLAYROOM =================
      const pt = B.table(1.3, 0.9, 0.55, M.l(0xffd54f), M.l(0x666666)); L.furn(pt, 4.0, 5.0, 0, 1.3, 0.9);
      const blockF = B.box(0.18, 0.18, 0.18, M.tb(T.card(128, 128, '#43a047', [{ t: 'F', s: 100, c: '#fff' }], { border: '#1b5e20', bw: 8 })), 4.1, 0.64, 5.0, L.scene);
      B.box(0.14, 0.14, 0.14, M.l(0xe53935), 3.75, 0.62, 4.9, L.scene); B.box(0.14, 0.14, 0.14, M.l(0x1e88e5), 3.6, 0.62, 5.1, L.scene);
      clue(L, G, found, 4, 4.1, 0.8, 5.0, 'Look at the letter block', '<b>A big green block with the letter F.</b> Carved on it: <b>"Note #4 is the letter F, like FROG (green)!"</b>', blockF);
      const chest = B.box(1.0, 0.55, 0.55, M.l(0xc0392b), 0.4, 0.275, 7.6, L.scene); L.solid(-0.1, 7.3, 0.9, 7.9, 'low'); B.box(1.04, 0.08, 0.6, M.l(0x7b241c), 0.4, 0.58, 7.6, L.scene);
      const blocks = B.toyBlocks(8); blocks.position.set(6.2, 0, 7.0); L.scene.add(blocks); L.shifter(blocks, { x: 5.2, z: 4.0, ry: 1.2 });
      const ball = B.ball(0xe53935, 0.14); ball.position.set(1.8, 0, 4.0); L.scene.add(ball); L.shifter(ball, { x: 6.5, z: 5.5 });
      const car = B.toyCar(0xfdd835); car.scale.setScalar(1.6); car.position.set(2.4, 0, 6.0); L.scene.add(car); L.shifter(car, { x: 2.4, z: 3.5, ry: 2.0 });
      const horse = new THREE.Group(); horse.position.set(6.6, 0, 3.5); L.scene.add(horse);
      B.box(0.7, 0.4, 0.25, M.l(0xb87a45), 0, 0.55, 0, horse); B.box(0.2, 0.4, 0.2, M.l(0xb87a45), 0.3, 0.9, 0, horse); B.box(0.32, 0.12, 0.18, M.l(0xb87a45), 0.42, 0.98, 0, horse);
      [-0.25, 0.25].forEach((x) => B.box(0.06, 0.4, 0.06, M.l(0x7a4f28), x, 0.2, 0, horse)); L.horse = horse; L.solid(6.2, 3.2, 7.0, 3.8, 'low');
      const easel = B.box(0.7, 0.9, 0.05, M.tb(T.card(280, 360, '#fffdf4', [{ t: 'my house', s: 34 }], { border: '#999', draw(x) { x.fillStyle = '#e57373'; x.fillRect(80, 160, 120, 90); x.fillStyle = '#6d4c41'; x.beginPath(); x.moveTo(70, 160); x.lineTo(140, 100); x.lineTo(210, 160); x.fill(); x.fillStyle = '#ffd54f'; x.beginPath(); x.arc(230, 70, 20, 0, 7); x.fill(); } })), 7.3, 1.2, 5.5, L.scene); easel.rotation.y = -Math.PI / 2; L.solid(7.0, 5.1, 7.7, 5.9);
      const map = B.rug(2.4, 2.0, 0x4caf50, 0xc8e6c9); map.position.set(2.8, 0, 6.4); L.scene.add(map);

      // ----- cosy decorations (pictures, shelf bits) -----
      const deco = [
        ['hills', -3.0, 1.95, -5.88, 0, 0.7], ['kitty', 2.2, 1.7, 7.86, Math.PI, 0.5],
        ['flowers', -7.88, 1.6, 1.25, Math.PI / 2, 0.55], ['hills', 6.0, 1.7, -5.88, 0, 0.6], ['kitty', 7.0, 1.55, 7.86, Math.PI, 0.5], ['flowers', -7.88, 1.6, -0.95, Math.PI / 2, 0.45]
      ];
      deco.forEach((d) => { const f = B.frame(d[5] * 1.28, d[5], art(d[0]), { wood: d[0] === 'kitty' }); f.position.set(d[1], d[2], d[3]); f.rotation.y = d[4]; L.scene.add(f); L.frames_ = L.frames_ || []; L.frames_.push(f); });
      // a clock-ish round mirror in the hall and a flower vase on the kitchen table
      B.cyl(0.07, 0.05, 0.16, M.p(0x7fb8e8, 90, 0xffffff), 3.8, 0.83, -2.6, L.scene, 12); B.sph(0.07, M.l(0xff7aa0), 3.8, 0.97, -2.6, L.scene, 1, 0.8, 1, 10); B.sph(0.05, M.l(0xffd54f), 3.88, 0.95, -2.55, L.scene, 1, 0.8, 1, 8);
      B.rbox(0.5, 0.05, 0.22, 0.01, M.wood(0x7a4e2a), -1.0, 1.35, -5.8, L.scene); B.sph(0.07, M.l(0xffd54f), -1.15, 1.43, -5.8, L.scene); B.sph(0.07, M.l(0xe85a7a), -0.95, 1.43, -5.8, L.scene);

      // ----- friendly Molly: sits on the living room rug and waves hello (until the creepy part starts) -----
      const pal = B.molly(1.0); pal.userData.sit(true); pal.userData.setSmile(1); pal.position.set(-4.35, 0, -3.7); pal.rotation.y = 0.05; L.scene.add(pal); L.pal = pal; L.palActive = true;
      const palCol = L.solid(-4.7, -4.05, -4.0, -3.35, 'low'); L.blob(-4.35, -3.7, 0.9, 0.9);
      const palGlow = B.glow('rgba(255,220,140,0.4)', 0.7); palGlow.position.set(-4.35, 0.55, -3.7); L.scene.add(palGlow);
      const palLines = [
        '<b>Molly:</b> Hi Emily! I am so happy you picked me! Do you want to play?',
        '<b>Molly:</b> I hid my favourite song around the house. Can you find all six notes?',
        '<b>Molly:</b> Look at the pictures, notes and signs. Press E on them!',
        '<b>Molly:</b> Psst... my music box in the bedroom plays the whole song.',
        '<b>Molly:</b> Do you like my dress? It is blue like the sky!',
        '<b>Molly:</b> You are the best friend ever, Emily!'
      ];
      let palI = 0, palSaid = false;
      const palSay = () => { G.say(palLines[palI % palLines.length], 5200); palI++; };
      L.interact({ x: -4.35, y: 0.6, z: -3.7, r: 2.3, label: 'Say hi to Molly', enabled: () => L.palActive, onUse() { Snd.hello(); palSay(); } });
      L.anims.push(B.dollFriend(pal, { bodyTurn: true, waveRange: 9, waveLen: 3.4, waveGap: 6, firstWave: 2.5, onWave() { if (!palSaid) { palSaid = true; Snd.hello(); palSay(); } } }));
      L.palStep = (dt) => {
        if (!L.palActive) return;
        const c = G.creep;
        palGlow.material.opacity = 0.6 + Math.sin(L.time * 2.4) * 0.2;
        if (L.time > 40 && !L.said40) { L.said40 = true; palSay(); }
        if (L.time > 95 && !L.said95) { L.said95 = true; palSay(); }
        const seen = G.isSeen(pal.position.x, pal.position.z, 0.05, 0.8);
        if (c > 0.035 && (!seen || c > 0.1)) { L.palGone = true; }
        if (L.palGone) { // she quietly slips away (shrinks) and the real hide-and-seek begins
          pal.scale.multiplyScalar(Math.max(0.0, 1 - dt * 3.5)); if (pal.scale.x < 0.06) { pal.visible = false; palGlow.visible = false; palCol.enabled = false; L.palActive = false; }
        }
      };

      // spooky frames that tilt later
      L.frames = [pic1, photo, sampler].concat(L.frames_ || []);

      // ----- Molly's hiding spots -----
      L.spots = [
        { x: -7.0, z: -5.2 }, { x: -1.4, z: -0.7 }, { x: -6.5, z: -0.5 }, { x: -5.0, z: -4.9 },
        { x: 6.6, z: -1.2 }, { x: 0.7, z: -4.2 }, { x: 5.0, z: -0.8 }, { x: 0.8, z: -1.0 },
        { x: -6.6, z: 1.2 }, { x: 0.5, z: 1.3 }, { x: 4.2, z: 1.0 }, { x: 7.0, z: 2.0 }, { x: -2.0, z: 1.4 },
        { x: -7.2, z: 3.6 }, { x: -2.0, z: 7.3 }, { x: -3.2, z: 4.3 }, { x: -5.6, z: 5.1 },
        { x: 0.3, z: 6.7 }, { x: 6.0, z: 5.9 }, { x: 3.0, z: 3.4 }, { x: 5.6, z: 7.4 }, { x: 1.2, z: 4.6 }
      ];

      // ----- creep events (world changes) -----
      L.event(0.12, () => { if (!bedDoor.isOpen && !G.isSeen(-4.5, 2.5, 0.5, 2)) { bedDoor.setOpen(true); } else L.events.push({ at: 0.14, done: false, run: () => bedDoor.setOpen(true) }); });
      L.event(0.22, () => { Snd.piano(1); G.toast('...was that the piano?'); });
      L.event(0.3, () => { photoMat.map = familyPhoto(true); photoMat.needsUpdate = true; });
      L.event(0.42, () => { if (!playDoor.isOpen) playDoor.setOpen(true); Snd.creak(0.12); });
      L.event(0.5, () => { wardrobe.position.x = -1.2; wardrobe.rotation.y = 0.0; Snd.creak(0.12); L.spots.push({ x: -1.7, z: 3.8 }); });
      L.event(0.62, () => { L.frames.forEach((f) => { f.rotation.z = rnd(-0.2, 0.2); }); Snd.thump(0.2); if (L.kitchenLamp) L.kitchenLamp.flick = true; });
      L.event(0.75, () => { Snd.boxMelody([3, 5, 6, 4, 5, 1], 0.7, 0.18, 0.3); lampLight.base = 2; });

      // ----- hints / progress -----
      L.progress = () => (Object.keys(found).length / 6) * 0.8 + (st.heard ? 0.1 : 0) + (st.solved ? 0.1 : 0);
      L.hint = () => {
        const n = Object.keys(found).length;
        if (st.solved) return 'The front door is open! Walk through the golden light.';
        if (n === 0) return 'The front door needs a TUNE. There are 6 notes. Look for pictures, notes and signs around the house and press E on them. A music box in the bedroom plays the tune too.';
        if (n < 6) {
          const miss = []; for (let i = 1; i <= 6; i++) if (!found[i]) miss.push('#' + i + ' in ' + ROOMS[i]);
          return 'You found ' + n + ' of 6 clues. Still missing: ' + miss.slice(0, 2).join(' and ') + '.';
        }
        return 'Go to the piano in the living room and play the six notes in order: ' + MELODY.map((m) => KEYS[m - 1].name).join(', ') + '. (Number keys 1 to 7 work too: ' + MELODY.join(' ') + ')';
      };
      L.debugApi.solve = () => { for (let i = 1; i <= 6; i++) found[i] = true; updateInv(); MELODY.forEach((n) => pressKey(L, G, n)); return 'solved'; };
      L.debugApi.melody = MELODY;
      L.update = (dt, t) => {
        L.palStep(dt);
        L.ballerina.rotation.y += dt * (st.boxT && L.time < st.boxT ? 4 : 0.0);
        L.mbGlow.material.opacity = 0.6 + Math.sin(t * 3) * 0.3;
        if (G.creep > 0.55 && L.horse) L.horse.rotation.z = Math.sin(t * 1.6) * 0.08 * Math.min(1, (G.creep - 0.55) * 4);
        if (L.glows) L.glows.forEach((g) => { g.sprite.visible = !found[g.slot] && G.player.x !== undefined && Math.hypot(g.sprite.position.x - G.player.x, g.sprite.position.z - G.player.z) < 7.5; g.sprite.material.opacity = 0.55 + Math.sin(t * 2.5 + g.slot) * 0.3; });
        if (st.solved) { exitLight.intensity = 50 + Math.sin(t * 3) * 6; rays.forEach((r, i) => { r.material.opacity = 0.5 + Math.sin(t * 2 + i) * 0.2; }); }
      };
      L.unlock = () => {
        st.solved = true; frontDoor.setOpen(true); glowPlane.visible = true; exitLight.intensity = 50; rays.forEach((r) => { r.visible = true; });
        G.say('<b>CLICK!</b> The front door swings open... a golden light shines outside!', 6000); G.setObjective('Run through the <b>golden light</b>!'); Snd.chime();
        G.bumpCreep(0.04);
      };
      if (window.Secrets) window.Secrets.level1(L, { bs: bs });
      if (window.Dread) window.Dread.level1(L, G, { lt: lt, teddyBed: teddyBed, bear2: bear2, playDoor: playDoor });
      updateInv();
    },
    start(L, G) {
      G.setObjective('The front door has a music lock. Find the tune to open it! <b>Press E</b> on things to look at them.');
      G.say('<b>Emily:</b> Home sweet home! ...but the front door has a little music lock. I need to find a tune!', 7000);
      updateInv();
    }
  });

  // ---- helpers ----
  function clue(L, G, found, slot, x, y, z, label, html, mesh) {
    L.glows = L.glows || [];
    const spr = B.glow('rgba(255,225,120,0.7)', 0.42); spr.position.set(mesh.position.x, mesh.position.y + (mesh.isGroup ? 0.55 : 0.28), mesh.position.z); L.scene.add(spr);
    const gl = { sprite: spr, slot: slot }; L.glows.push(gl);
    L.interact({
      x: x, y: y, z: z, r: 2.4, label: label, onUse() {
        const first = !found[slot]; found[slot] = true;
        G.say(html, 8000);
        if (first) { Snd.pickup(); G.toast('Clue ' + Object.keys(found).length + ' of 6 saved in your notebook'); updateInv(); updateObjective(); }
      }
    });
  }
  function updateInv() {
    const G = window.G, L = G.level; if (!L || !L.found) return;
    const f = L.found, n = Object.keys(f).length;
    const MEL = L.melody;
    const slot = (i) => {
      if (!f[i]) return '<span class="chip">' + i + ': ?</span>';
      if (i === 5 && !f[2]) return '<span class="chip">5: same as #2</span>';
      const k = KEYS[MEL[i - 1] - 1];
      return '<span class="chip"><span class="dot" style="background:' + k.color + '"></span>' + i + ': ' + k.letter + '</span>';
    };
    let h = '<div class="chip">Notebook: clues ' + n + '/6' + (L.st.heard ? ' &nbsp;|&nbsp; music box heard' : '') + '</div><div>';
    for (let i = 1; i <= 6; i++) h += slot(i);
    G.setInventory(h + '</div>');
  }
  function updateObjective() {
    const G = window.G, L = G.level; if (!L || !L.found) return; const n = Object.keys(L.found).length;
    if (L.st.solved) return;
    G.setObjective(n < 6 ? 'Find <b>Molly\'s tune</b> to unlock the front door. Clues: <b>' + n + '/6</b>' + (L.st.heard ? '' : ' &nbsp;(the music box is in the bedroom)') : 'You have all the clues! Play the tune on the <b>piano</b> in the living room.');
  }

  // ---- piano panel ----
  function pressKey(L, G, n) {
    const st = L.st; if (st.solved) return;
    Snd.piano(n); st.played.push(n); if (st.played.length > 6) st.played.shift();
    renderPlayed(L);
    if (st.played.length === 6 && st.played.every((v, i) => v === MELODY[i])) {
      st.solved = true; st.played = [];
      setTimeout(() => { Snd.boxMelody(MELODY, 0.28, 0.2); }, 500);
      const fid = G.flowId;
      setTimeout(() => { if (fid !== G.flowId) return; G.closePanel(); G.lockPointer(); L.unlock(); }, 2200);
      const s = document.getElementById('pmsg'); if (s) s.innerHTML = 'That is Molly\'s tune! Something clicked...';
      return;
    }
    st.sinceReset = (st.sinceReset || 0) + 1;
    if (st.sinceReset >= 6 && st.sinceReset % 6 === 0) {
      const s = document.getElementById('pmsg'); if (s) s.innerHTML = 'Hmm... that does not sound like the music box. Look for more clues!';
      G.bumpCreep(0.02); setTimeout(() => Snd.buzz(), 350);
    }
  }
  function renderPlayed(L) {
    const el = document.getElementById('pl'); if (!el) return; let h = '';
    for (let i = 0; i < 6; i++) { const n = L.st.played[i]; h += n ? '<i style="background:' + KEYS[n - 1].color + '">' + KEYS[n - 1].letter + '</i>' : '<i class="empty"></i>'; }
    el.innerHTML = h;
  }
  function openPiano(L, G) {
    const el = document.createElement('div'); el.className = 'panel';
    el.innerHTML = '<h3>Emily\'s Piano</h3><div class="sub">Play Molly\'s tune: six notes, in order. Click the keys or press <b>1</b> to <b>7</b>.</div><div class="row" id="pk"></div><div class="played" id="pl"></div><div id="pmsg" class="sub" style="min-height:22px"></div><div><button id="p-reset">Start over</button><button id="p-hear">Hear the music box tune</button><button id="p-close">Close (E)</button></div>';
    const row = el.querySelector('#pk');
    KEYS.forEach((k) => {
      const d = document.createElement('div'); d.className = 'pkey';
      d.innerHTML = '<div class="dotc" style="background:' + k.color + '"></div><b>' + k.n + '</b><span>' + k.letter + ' &middot; ' + k.solf + '</span>';
      const down = () => { d.classList.add('down'); pressKey(L, G, k.n); setTimeout(() => d.classList.remove('down'), 120); };
      d.addEventListener('mousedown', (e) => { e.preventDefault(); down(); });
      d.dataset.n = k.n; row.appendChild(d);
    });
    el.querySelector('#p-reset').onclick = () => { L.st.played = []; L.st.sinceReset = 0; renderPlayed(L); el.querySelector('#pmsg').textContent = ''; };
    const hear = el.querySelector('#p-hear');
    hear.onclick = () => { if (!L.st.heard) { el.querySelector('#pmsg').innerHTML = 'Wind up the music box in the bedroom first!'; return; } Snd.boxMelody(MELODY, 0.62, 0.22); };
    el.querySelector('#p-close').onclick = () => { G.closePanel(); G.lockPointer(); };
    G.openPanel(el, {
      onKey(e) {
        const m = /^(Digit|Numpad)([1-7])$/.exec(e.code); if (!m) return;
        const n = +m[2]; const kd = row.children[n - 1]; kd.classList.add('down'); setTimeout(() => kd.classList.remove('down'), 120); pressKey(L, G, n);
      }
    });
    L.st.sinceReset = 0; renderPlayed(L);
  }
})();
