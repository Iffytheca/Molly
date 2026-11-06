/* MOLLY - Level 4: THE SCHOOL (at night).
   Puzzle: four riddles (two blackboards, a note on a locker, a note in the library). Each riddle's answer is a thing
   that is in the title of exactly ONE book on the library shelves. The FIRST LETTER of each correct book's title,
   in riddle order #1..#4, spells the 4-letter code for the exit doors:
     #1 CLOCK    -> "Dong! The Clock Strikes Thirteen"   D
     #2 PIANO    -> "Old Piano, Sing Me Home"             O
     #3 UMBRELLA -> "Lost Umbrella of Larkspur Lane"      L
     #4 MIRROR   -> "Look Who's in the Mirror"            L     => DOLL
   Wrong books give a funny/spooky quip and a tiny creep bump. */
(function () {
  'use strict';
  const B = window.Build, M = window.Mat, T = window.Tex, Snd = window.Snd;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const H = 3.2;                       // ceiling height
  const PI = Math.PI;

  /* ============================== PUZZLE DATA ============================== */
  const RIDDLES = [
    { n: 1, answer: 'CLOCK', place: 'the blackboard in Classroom 1 (first door on the left)', short: 'a face and hands, on the wall',
      lines: ['RIDDLE #1', 'I have a face, but no eyes.', 'I have two hands, but I cannot clap.', 'I hang on the wall and tell you', 'when it is time to go home.', 'What am I?'] },
    { n: 2, answer: 'PIANO', place: 'the blackboard in Classroom 2 (second door on the left)', short: '88 keys, but no door',
      lines: ['RIDDLE #2', 'I have 88 keys, but I cannot open a door.', 'Press my keys and I will sing.', 'Mom plays me at home.', 'What am I?'] },
    { n: 3, answer: 'UMBRELLA', place: 'a note taped to a locker in the hallway', short: 'keeps you dry, opens like a flower',
      lines: ['RIDDLE #3', 'I keep you dry when the sky is crying.', 'I open up like a flower,', 'but I am not a flower.', 'What am I?'] },
    { n: 4, answer: 'MIRROR', place: 'a note on the reading table in the library', short: 'copies you, never speaks',
      lines: ['RIDDLE #4', 'I show your face, but I never speak.', 'I copy every move you make.', 'Look too long... and someone smiles back.', 'What am I?'] }
  ];
  // r = the riddle this book answers (the correct books); q = the funny / spooky quip for a wrong book
  const SHELVES = [
    { id: 'A', books: [
      { t: 'Dong! The Clock Strikes Thirteen', r: 1 },
      { t: 'Tick-Tock, the Runaway Wristwatch', q: 'A wristwatch! ...but riddle #1 hangs on a WALL. The watch ticks very loudly in the quiet. Tick. Tock. Tick.' },
      { t: 'The Hourglass Girl', q: 'The sand inside is all at the bottom. Who turned it upside down just now?' },
      { t: 'Calendar Cats of June', q: 'Every page says "Tuesday". Every single page. Weird.' },
      { t: 'Dusty Dinosaur Bones', q: 'Achoo! A cloud of dust. Something giggled in the dust cloud.' } ] },
    { id: 'B', books: [
      { t: 'Violin Lessons for Ghosts', q: 'Lesson one: "How to go BOO in B flat". Not what you need, Emily.' },
      { t: 'Old Piano, Sing Me Home', r: 2 },
      { t: 'The Little Drum That Would Not Stop', q: 'Boom boom boom... the book is drumming by itself! You quickly put it back.' },
      { t: 'Harp of the Hush-Hush Woods', q: 'Shhh... the book whispers "shhh" back at you.' },
      { t: 'The Accordion Who Wheezed', q: 'It has keys, but riddle #2 says 88 of them. This one wheezes. Wheeeeze.' } ] },
    { id: 'C', books: [
      { t: 'Raincoat Ricky and the Puddle', q: 'A raincoat keeps you dry, but it does not open like a flower. Splash! Your shoes feel wet.' },
      { t: 'Lost Umbrella of Larkspur Lane', r: 3 },
      { t: 'Parasol Princess of Pemberley', q: 'A parasol is for the SUN. The riddle says the sky is CRYING. Hmm.' },
      { t: 'Thunder, Lightning and Lunch', q: 'BOOM! Just the book. Your tummy rumbles too.' },
      { t: 'The Snowman\'s Secret Scarf', q: 'Brrr! The pages are cold as ice. Your breath makes a little cloud.' } ] },
    { id: 'D', books: [
      { t: 'Window on Willow Street', q: 'A window shows what is outside. The riddle is about something that copies YOU. A shadow waved from the window page.' },
      { t: 'Photo Album of Forgotten Faces', q: 'Rows of faces, all looking right at you. One of them is wearing a bow tie... and button eyes.' },
      { t: 'Look Who\'s in the Mirror', r: 4 },
      { t: 'The Glass Slipper Mystery', q: 'A slipper, not a looking glass. It does not fit you either. Sorry.' },
      { t: 'Spectacles for Spiders', q: 'Eight tiny pairs of glasses stare up at you. Eight little blinks.' } ] },
    { id: 'E', books: [
      { t: 'Molly\'s Big Book of Hide and Seek', q: 'Page 1: "I am behind you." You turn around... nobody. Phew. You put it back fast.', big: 1 },
      { t: 'Math Is Magic (Seven Times Eight)', q: 'Fifty-six! ...That is not a letter. Back on the shelf.' },
      { t: 'Pirates of Pudding Pond', q: 'Yo ho ho! The pirates want you to find a book, not a treasure.' },
      { t: 'A Very Quiet Library', q: 'The book says SHHHH so loudly that the whole shelf rattles.' },
      { t: 'Cooking with Ghost Peppers', q: 'Page 5 is a recipe for "Boo-berry Pie". It smells like spooky blueberries. Not helpful!' } ] }
  ];
  // the code = first letter of each correct book's title, in riddle order
  const LETTER = {};
  SHELVES.forEach((s) => s.books.forEach((b) => { if (b.r) LETTER[b.r] = b.t.replace(/[^A-Za-z]/g, '').charAt(0).toUpperCase(); }));
  const CODE = [1, 2, 3, 4].map((n) => LETTER[n]).join('');       // = DOLL
  const BOOK_COL = ['#7a2e2e', '#2e5a7a', '#3c6e3c', '#6e4a8a', '#8a6a2e', '#2e6e6e', '#8a3c5a', '#4a4a7a'];

  const GENERIC_QUIPS = ['The pages are blank. All of them. Even the last page is blank.', 'It smells like old paper and a little bit like cold cookies.', 'A spider climbs out and waves a tiny leg. Eek!'];

  /* ============================== TEXTURES ============================== */
  const CHALK_FONT = 'bold $Spx "Comic Sans MS", "Chalkboard SE", "Segoe Print", "Trebuchet MS", sans-serif';
  function boardTex(w, h, draw) {
    return T.canvas(w, h, (x) => {
      const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#27483a'); g.addColorStop(1, '#183024'); x.fillStyle = g; x.fillRect(0, 0, w, h);
      const r = B.R(w + h);
      for (let i = 0; i < 34; i++) { x.fillStyle = 'rgba(225,235,225,' + (0.02 + r() * 0.03) + ')'; x.beginPath(); x.ellipse(r() * w, r() * h, 30 + r() * 140, 8 + r() * 26, r() * 3, 0, 7); x.fill(); }
      x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 10; x.strokeRect(0, 0, w, h);
      if (draw) draw(x, w, h);
    }, false);
  }
  function chalkLines(x, lines, w, h, size, color) {
    const lh = size * 1.32, y0 = (h - lines.length * lh) / 2 + size * 0.92;
    lines.forEach((ln, i) => {
      x.save(); x.translate(w / 2, y0 + i * lh); x.rotate((i % 2 ? 0.008 : -0.008)); x.textAlign = 'center';
      const sz = i === 0 ? size * 1.15 : size; x.font = CHALK_FONT.replace('$S', Math.round(sz));
      x.fillStyle = i === 0 ? '#ffe9a0' : (color || '#f1f4ea'); x.shadowColor = 'rgba(255,255,255,0.45)'; x.shadowBlur = 3; x.fillText(ln, 0, 0); x.restore();
    });
  }
  function riddleBoard(rd) {
    return boardTex(1200, 380, (x, w, h) => { chalkLines(x, rd.lines, w, h, rd.lines.length > 5 ? 44 : 50); });
  }
  function clockFace() {
    return T.canvas(256, 256, (x, w, h) => {
      x.fillStyle = '#2b2b2b'; x.beginPath(); x.arc(128, 128, 126, 0, 7); x.fill();
      x.fillStyle = '#f4efe0'; x.beginPath(); x.arc(128, 128, 114, 0, 7); x.fill();
      x.strokeStyle = '#222'; x.fillStyle = '#222'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = 'bold 26px serif';
      for (let i = 1; i <= 12; i++) { const a = i / 12 * PI * 2 - PI / 2; x.fillText(String(i), 128 + Math.cos(a) * 90, 128 + Math.sin(a) * 90); }
      for (let i = 0; i < 60; i++) { const a = i / 60 * PI * 2; x.lineWidth = i % 5 ? 1.5 : 3; x.beginPath(); x.moveTo(128 + Math.cos(a) * 108, 128 + Math.sin(a) * 108); x.lineTo(128 + Math.cos(a) * 114, 128 + Math.sin(a) * 114); x.stroke(); }
    }, false);
  }
  function exitTex() {
    return T.canvas(512, 160, (x, w, h) => {
      x.fillStyle = '#05301a'; x.fillRect(0, 0, w, h);
      x.strokeStyle = '#baffd0'; x.lineWidth = 8; x.strokeRect(6, 6, w - 12, h - 12);
      x.fillStyle = '#7dffa8'; x.font = 'bold 118px "Trebuchet MS", "Segoe UI", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = '#3dff7a'; x.shadowBlur = 24; x.fillText('EXIT', w / 2, h / 2 + 6);
    }, false);
  }
  function gridTex() {
    return T.canvas(128, 128, (x, w, h) => { x.clearRect(0, 0, w, h); x.strokeStyle = 'rgba(60,60,58,0.55)'; x.lineWidth = 4; x.strokeRect(0, 0, w, h); x.strokeStyle = 'rgba(60,60,58,0.28)'; x.lineWidth = 2; x.beginPath(); x.moveTo(64, 0); x.lineTo(64, 128); x.moveTo(0, 64); x.lineTo(128, 64); x.stroke(); });
  }
  function worldMap() {
    return T.canvas(480, 300, (x, w, h) => {
      x.fillStyle = '#7fc0e8'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#7fb36a';
      [[90, 100, 60, 45], [150, 190, 38, 55], [250, 90, 55, 38], [270, 175, 40, 52], [360, 100, 70, 42], [400, 215, 38, 24], [40, 55, 26, 20]].forEach((c) => { x.beginPath(); x.ellipse(c[0], c[1], c[2], c[3], 0.3, 0, 7); x.fill(); });
      x.fillStyle = '#e8c872'; x.beginPath(); x.ellipse(268, 148, 24, 16, 0.2, 0, 7); x.fill();
      x.strokeStyle = 'rgba(255,255,255,0.35)'; x.lineWidth = 1; for (let i = 1; i < 6; i++) { x.beginPath(); x.moveTo(0, i * 50); x.lineTo(w, i * 50); x.stroke(); x.beginPath(); x.moveTo(i * 80, 0); x.lineTo(i * 80, h); x.stroke(); }
      x.fillStyle = '#c0392b'; x.font = 'bold 22px serif'; x.fillText('X', 140, 124); x.fillStyle = '#123'; x.font = 'bold 26px serif'; x.textAlign = 'center'; x.fillText('THE WORLD', w / 2, 30);
    }, false);
  }
  function corkBoard() {
    return T.canvas(512, 320, (x, w, h) => {
      x.fillStyle = '#b98a58'; x.fillRect(0, 0, w, h); const r = B.R(9);
      for (let i = 0; i < 1800; i++) { x.fillStyle = r() < 0.5 ? 'rgba(90,55,25,0.28)' : 'rgba(240,200,150,0.25)'; x.fillRect(r() * w, r() * h, 2 + r() * 3, 2 + r() * 2); }
      const cols = ['#fff7c4', '#ffd0e0', '#cfe8ff', '#d8f5cf', '#ffe0b8'];
      for (let i = 0; i < 9; i++) { const px = 20 + (i % 5) * 96 + r() * 8, py = 22 + Math.floor(i / 5) * 140 + r() * 20; x.save(); x.translate(px + 40, py + 50); x.rotate((r() - 0.5) * 0.2); x.fillStyle = cols[i % 5]; x.fillRect(-40, -50, 80, 100); x.fillStyle = '#c33'; x.beginPath(); x.arc(0, -42, 5, 0, 7); x.fill();
        x.strokeStyle = 'rgba(0,0,0,0.4)'; x.lineWidth = 3; for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(-30, -22 + k * 20); x.lineTo(-30 + 30 + r() * 28, -22 + k * 20); x.stroke(); }
        if (i % 3 == 0) { x.fillStyle = '#e8607a'; x.beginPath(); x.arc(0, 20, 14, 0, 7); x.fill(); } x.restore(); }
    }, false);
  }
  function keypadScreen(txt) {
    return T.canvas(256, 96, (x, w, h) => {
      x.fillStyle = '#04140b'; x.fillRect(0, 0, w, h); x.strokeStyle = '#1d6a3a'; x.lineWidth = 6; x.strokeRect(3, 3, w - 6, h - 6);
      x.fillStyle = '#7dffa8'; x.font = 'bold 56px monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = '#3dff7a'; x.shadowBlur = 12; x.fillText(txt, w / 2, h / 2 + 4);
    }, false);
  }

  /* ============================== LEVEL ============================== */
  window.LEVELS.push({
    id: 4, name: 'The School', music: 'lullaby', hum: true, creepBase: 0.5, creepTime: 420, grace: 90, dangerAt: 0.55, sunBase: 0.28,
    dread: 1.25,
    look: { expo: 0.1, con: 0.04, amb: 0.08 },
    ease: { hold: 20, ramp: 85, floor: 0.2 },          // spookier than level 1 from the start, but it eases in
    boxTune: [3, 2, 1, 2, 3],
    card: '<small>LEVEL 4</small><h2>THE SCHOOL</h2><small>The bell rang a long time ago...</small>',
    build(L, G) {
      L.fog0 = [0x1b2430, 0.032]; L.fog1 = [0x06070c, 0.085];
      L.ambient = new THREE.HemisphereLight(0x9db0c8, 0x34343c, 0.95); L.ambBase = 0.95; L.scene.add(L.ambient);
      L.carryLight = new THREE.PointLight(0xdfeaff, 5, 7.5, 2);
      L.spawn = { x: -12.4, z: 0, yaw: -PI / 2 };
      L.bounds = [-13.8, -9.8, 13.8, 9.8];
      const st = { r: {}, b: {}, solved: false, tries: 0, wrong: 0, pulse: 0, enteredLib: false, chalkN: 0, chalkOn: false, chalkT: 0, bell: 0, ratT: 14, doorT: 26, last: null };
      L.st = st; L.RIDDLES = RIDDLES; L.CODE = CODE;
      L.wallDefaults = { trim: true };

      /* ---------- materials ---------- */
      const cream = M.t(T.plaster('#d8d1b6')), green = M.t(T.plaster('#4f7060')), roomA = M.t(T.plaster('#d9d4a6')), roomB = M.t(T.plaster('#b9cfd8'));
      const libWall = M.t(T.wallpaper('#7a3f45', '#5e2f36')), edge = M.l(0xcfc8b0);
      const tileFloor = M.t(T.tile('#b8b296', '#56665a')), woodFloor = M.t(T.wood('#b3874f', '#8a6034')), carpet = M.t(T.carpet('#4d3a52'));
      const ceilM = M.t(T.plaster('#c9c9c0'));
      const deskTop = M.wood(0xcaa26a), chairM = M.l(0x3a6ea5), woodDk = M.wood(0x5a3a22);
      const metalDark = M.t(T.metal('#505860'));

      /* ---------- floors, ceiling ---------- */
      L.floor(-14, -2, 14, 2, tileFloor, 1.3);
      L.floor(-14, -10, 6, -2, woodFloor, 2.4);
      L.floor(-2, 2, 8, 10, carpet, 3);
      L.floor(14, -1.2, 16.5, 1.2, M.t(T.concrete()), 3);
      L.ceil(-14.2, -10.2, 14.2, 10.2, ceilM, H, 3);
      const grid = new THREE.Mesh(B.uvScale(new THREE.PlaneGeometry(28.4, 20.4), 28.4 / 1.2, 20.4 / 1.2), new THREE.MeshBasicMaterial({ map: gridTex(), transparent: true, depthWrite: false, fog: true }));
      grid.rotation.x = PI / 2; grid.position.set(0, H - 0.01, 0); grid.userData.noShadow = true; L.scene.add(grid);
      L.ceil(14, -1.2, 16.5, 1.2, M.l(0xe8e8e0, { emissive: 0x303028 }), H);

      /* ---------- walls ---------- */
      const wopt = (a, b) => ({ h: H, t: 0.25, matA: a, matB: b, matE: edge, doorH: 2.3, tile: 2.6 });
      const C1G = [[-9.2, -7.9]], C2G = [[0.7, 2.0]], LIBG = [[2.2, 3.5]];
      L.wallGaps(-14, -2, 14, -2, C1G.concat(C2G), wopt(cream, roomA));                    // hallway north wall (+z face = hallway)
      L.wallGaps(-14, 2, 14, 2, LIBG, wopt(libWall, cream));                               // hallway south wall (-z face = hallway)
      L.wall(-14, -10, -14, -2, wopt(roomA, edge)); L.wall(-14, -2, -14, 2, wopt(cream, edge));   // west wall
      L.wall(-14, -10, -4, -10, wopt(roomA, edge)); L.wall(-4, -10, 6, -10, wopt(roomB, edge));   // classroom back walls
      L.wall(-4, -10, -4, -2, wopt(roomB, roomA));                                          // between the classrooms
      L.wall(6, -10, 6, -2, wopt(edge, roomB));                                             // east wall of classroom 2
      L.wallGaps(-2, 2, -2, 10, [[8.3, 9.2]], Object.assign(wopt(libWall, edge), { doorH: 2.2 })); L.wall(8, 2, 8, 10, wopt(edge, libWall)); L.wall(-2, 10, 8, 10, wopt(edge, libWall));   // library
      // exit end wall with a double-door opening
      L.wallGaps(14, -2, 14, 2, [[-1.2, 1.2]], { h: H, t: 0.25, matA: concreteWall(), matB: cream, matE: edge, doorH: 2.3, tile: 2.6 });
      function concreteWall() { return M.t(T.concrete()); }
      L.wall(14, -1.3, 16.5, -1.3, { h: H, t: 0.2, mat: M.t(T.concrete()), tile: 2.6, trim: false });
      L.wall(14, 1.3, 16.5, 1.3, { h: H, t: 0.2, mat: M.t(T.concrete()), tile: 2.6, trim: false });
      L.wall(16.5, -1.3, 16.5, 1.3, { h: H, t: 0.2, mat: M.b(0xfff6dc), trim: false });
      // void blocks (behind walls) so nothing is ever placed there
      L.solid(6.13, -10, 14, -2.13); L.solid(-14, 2.13, -2.13, 7.3); L.solid(-14, 7.3, -5.1, 10);   // (the strip x -5..-2, z 7.4..9.9 is the secret closet, see secrets.js)
       L.solid(8.13, 2.13, 14, 10);
      // green wainscot along the hallway + rail
      const wain = (axis, fixed, a, b, side, gaps) => {
        const segs = []; let cur = a; (gaps || []).slice().sort((p, q) => p[0] - q[0]).forEach((g) => { segs.push([cur, g[0]]); cur = g[1]; }); segs.push([cur, b]);
        segs.forEach((s) => {
          if (s[1] - s[0] < 0.05) return; const len = s[1] - s[0], c = (s[0] + s[1]) / 2, off = fixed + side * 0.145;
          if (axis === 'x') { B.box(len, 1.1, 0.04, green, c, 0.55, off, L.scene); B.box(len, 0.06, 0.07, woodDk, c, 1.12, fixed + side * 0.155, L.scene); }
          else { B.box(0.04, 1.1, len, green, off, 0.55, c, L.scene); B.box(0.07, 0.06, len, woodDk, fixed + side * 0.155, 1.12, c, L.scene); }
        });
      };
      wain('x', -2, -13.9, 13.9, 1, C1G.concat(C2G)); wain('x', 2, -13.9, 13.9, -1, LIBG); wain('z', -14, -2, 2, 1, []);

      /* ---------- doors ---------- */
      const doorM = M.wood(0x7a5230);
      const door1 = L.door({ x: -9.2, z: -2, w: 1.3, h: 2.3, axis: 'x', mat: doorM, openRot: -PI / 2 * 0.94 });
      const door2 = L.door({ x: 0.7, z: -2, w: 1.3, h: 2.3, axis: 'x', mat: doorM, openRot: -PI / 2 * 0.94 });
      const door3 = L.door({ x: 2.2, z: 2, w: 1.3, h: 2.3, axis: 'x', mat: doorM, openRot: PI / 2 * 0.94 });
      door3.setOpen(true, true);
      L.doors = [door1, door2, door3];
      [[door1, -8.55, 'Open the Classroom 1 door'], [door2, 1.35, 'Open the Classroom 2 door']].forEach((d) => {
        L.interact({ x: d[1], y: 1.1, z: -1.4, r: 2.4, label: d[2], enabled: () => !d[0].isOpen, onUse() { d[0].setOpen(true); } });
      });
      // door name plates
      [[-8.55, 'CLASS 1'], [1.35, 'CLASS 2'], [2.85, 'LIBRARY']].forEach((p) => {
        const sg = B.plane(0.8, 0.22, M.tb(T.card(256, 70, '#e9e2c8', [{ t: p[1], s: 44, c: '#3a2a1a' }], { border: '#3a2a1a', bw: 6 })), p[0], 2.5, p[1] === 'LIBRARY' ? 1.86 : -1.86, L.scene); if (p[1] === 'LIBRARY') sg.rotation.y = PI;
      });

      /* ---------- ceiling lights (fluorescent tubes) ---------- */
      const fixtures = []; L.fixtures = fixtures;
      const addFixture = (x, z, power, along) => {
        const tm = new THREE.MeshBasicMaterial({ color: 0xe8f2ff });
        const lw = along === 'x' ? 1.3 : 0.34, ld = along === 'x' ? 0.34 : 1.3;
        B.box(lw, 0.07, ld, M.p(0xb9bec2, 40, 0x555555), x, H - 0.035, z, L.scene);
        B.box(lw - 0.1, 0.03, ld - 0.1, tm, x, H - 0.08, z, L.scene).userData.noShadow = true;
        const gl = B.glow('rgba(205,225,255,0.55)', 2.2); gl.position.set(x, H - 0.2, z); L.scene.add(gl);
        const lamp = L.lamp(x, H - 0.3, z, 0xdfeaff, power, 10, false); lamp.ck = 0.25;
        fixtures.push({ mat: tm, glow: gl, lamp: lamp, base: power, k: 1, t: rnd(8, 24), fl: 0, dead: false, x: x, z: z });
      };
      [-11.5, -6.5, -1.5, 3.5, 8.5, 12.2].forEach((x) => addFixture(x, 0, 15, 'x'));
      [[-9, -4.2], [-9, -7.8], [1, -4.2], [1, -7.8]].forEach((p) => addFixture(p[0], p[1], 11, 'x'));
      [[3, 4.6], [3, 7.6]].forEach((p) => addFixture(p[0], p[1], 10, 'x'));
      // windows (night sky outside)
      [[-12.3, -9.86], [-5.6, -9.86], [-2.3, -9.86], [4.3, -9.86]].forEach((w) => {
        const g = B.window(1.1, 1.2, { y: 1.75, curtains: false, beam: false }); g.position.set(w[0], 1.75, w[1]); L.scene.add(g); g.userData.sky.color.setHex(0x1b2850); L.sky(g.userData.sky, 0x03040a);
      });
      const lw = B.window(1.1, 1.2, { y: 1.75, curtains: false, beam: false }); lw.position.set(7.86, 1.8, 4.2); lw.rotation.y = -PI / 2; L.scene.add(lw); lw.userData.sky.color.setHex(0x1b2850); L.sky(lw.userData.sky, 0x03040a);

      /* ---------- lockers ---------- */
      const banks = []; L.banks = banks;
      const lockerBank = (x1, x2, zFace, dir, doorMat, num) => {
        const n = Math.max(1, Math.round((x2 - x1) / 0.41)), w = (x2 - x1) / n, g = new THREE.Group();
        g.position.set((x1 + x2) / 2, 0, zFace + dir * 0.225);
        B.box(x2 - x1, 1.95, 0.45, M.l(0x44505c), 0, 0.975, 0, g);
        const dark = M.l(0x0c0f14), handle = M.p(0xc9ccd0, 90, 0xffffff);
        for (let i = 0; i < n; i++) {
          const lx = -(x2 - x1) / 2 + (i + 0.5) * w;
          B.box(w - 0.014, 1.9, 0.02, doorMat, lx, 0.975, dir * 0.225, g);
          B.box(0.035, 0.14, 0.035, handle, lx + w * 0.28, 1.0, dir * 0.248, g);
          for (let j = 0; j < 3; j++) { B.box(w * 0.55, 0.018, 0.01, dark, lx, 1.68 + j * 0.05, dir * 0.236, g); B.box(w * 0.55, 0.018, 0.01, dark, lx, 0.2 + j * 0.05, dir * 0.236, g); }
          B.box(0.1, 0.05, 0.01, M.l(0xe6e1c8), lx, 1.5, dir * 0.236, g);
        }
        B.bake(g); L.scene.add(g);
        L.solid(x1, Math.min(zFace, zFace + dir * 0.45), x2, Math.max(zFace, zFace + dir * 0.45), 'low');
        const b = { g: g, home: g.position.clone(), x: (x1 + x2) / 2, z: zFace + dir * 0.4, dir: dir }; banks.push(b); return b;
      };
      const lk1 = M.t(T.metal('#46688a')), lk2 = M.t(T.metal('#4b7a68')), lk3 = M.t(T.metal('#7a5a48'));
      lockerBank(-13.75, -9.65, -1.875, 1, lk1); lockerBank(-7.5, -4.2, -1.875, 1, lk2); lockerBank(-3.9, -0.25, -1.875, 1, lk1);
      lockerBank(2.4, 5.4, -1.875, 1, lk2); lockerBank(10.2, 13.75, -1.875, 1, lk3);
      lockerBank(-13.75, -8.9, 1.875, -1, lk2); lockerBank(-8.5, -2.4, 1.875, -1, lk1); lockerBank(4.3, 9.4, 1.875, -1, lk3); lockerBank(9.8, 13.1, 1.875, -1, lk1);

      /* ---------- the hallway (props) ---------- */
      // clocks (hands spin when it gets creepy)
      L.clocks = [];
      const makeClock = (x, y, z, ry) => {
        const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; L.scene.add(g);
        B.plane(0.55, 0.55, M.tb(clockFace(), { transparent: true, alphaTest: 0.5 }), 0, 0, 0.03, g);
        B.cyl(0.285, 0.285, 0.05, M.l(0x2a2a2a), 0, 0, 0.0, g, 20).rotation.x = PI / 2;
        const hh = new THREE.Group(); hh.position.z = 0.045; g.add(hh); B.box(0.026, 0.14, 0.008, M.b(0x111111), 0, 0.07, 0, hh);
        const mm = new THREE.Group(); mm.position.z = 0.05; g.add(mm); B.box(0.018, 0.21, 0.008, M.b(0x111111), 0, 0.105, 0, mm);
        hh.rotation.z = -0.4; mm.rotation.z = -1.6; L.clocks.push({ h: hh, m: mm, g: g });
      };
      makeClock(-3, 2.5, -1.86, 0); makeClock(-6.4, 2.8, -9.86, 0);
      // hall chalkboard (the chalk writes by itself later)
      const hallTex = boardTex(768, 384);
      const drawHall = () => {
        const x = hallTex.image.getContext('2d'), w = 768, h = 384;
        const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#27483a'); g.addColorStop(1, '#183024'); x.fillStyle = g; x.fillRect(0, 0, w, h);
        x.fillStyle = 'rgba(225,235,225,0.05)'; for (let i = 0; i < 20; i++) { x.beginPath(); x.ellipse((i * 97) % w, (i * 61) % h, 70, 14, i, 0, 7); x.fill(); }
        x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 10; x.strokeRect(0, 0, w, h);
        x.textAlign = 'center'; x.font = CHALK_FONT.replace('$S', 46); x.fillStyle = '#ffe9a0'; x.fillText("TODAY'S LUNCH", w / 2, 62);
        x.font = CHALK_FONT.replace('$S', 34); x.fillStyle = '#f1f4ea'; x.fillText('Pizza and fruit cups', w / 2, 112); x.fillText('Walk, do not run!', w / 2, 158);
        const txt = 'PLAY WITH ME', n = st.chalkN;
        if (n > 0) { x.save(); x.translate(w / 2, 270); x.rotate(-0.04); x.font = CHALK_FONT.replace('$S', 84); x.fillStyle = '#ff9ec4'; x.shadowColor = 'rgba(255,200,230,0.6)'; x.shadowBlur = 5; x.textAlign = 'left'; const full = x.measureText(txt).width; x.fillText(txt.slice(0, n), -full / 2, 0); x.restore(); }
        hallTex.needsUpdate = true;
      };
      drawHall(); L.drawHall = drawHall;
      const hallB = new THREE.Group(); hallB.position.set(7.8, 1.7, -1.86); L.scene.add(hallB);
      B.box(2.96, 1.54, 0.06, woodDk, 0, 0, -0.03, hallB); B.plane(2.8, 1.4, M.tb(hallTex, { color: 0xc8d2c8 }), 0, 0, 0.005, hallB);
      L.hallBoard = hallB;
      L.interact({ x: 7.8, y: 1.6, z: -0.9, r: 3.2, label: 'Read the hall chalkboard', onUse() {
        if (st.chalkN > 0) { G.say('<b>Emily:</b> "PLAY WITH ME"... Who wrote that?! That was NOT there before. The chalk dust is still floating down.', 6000); G.bumpCreep(0.01); }
        else G.say('<b>The hall chalkboard:</b> "Today\'s lunch: pizza and fruit cups. Walk, do not run!"', 4800);
      } });
      // bulletin board + welcome sign + "EXIT" arrow
      B.box(1.7, 1.1, 0.05, woodDk, -0.3, 1.75, 1.88, L.scene);
      B.plane(1.6, 1.0, M.tb(corkBoard()), -0.3, 1.75, 1.85, L.scene).rotation.y = PI;
      const welc = B.frame(2.2, 0.8, T.card(440, 160, '#f3ecd2', [{ t: 'WILLOW CREEK', s: 52, c: '#2c4a6a' }, { t: 'ELEMENTARY SCHOOL', s: 34, c: '#2c4a6a' }], { border: '#2c4a6a', bw: 10 }), { wood: true }); welc.position.set(-13.84, 1.95, 0); welc.rotation.y = PI / 2; L.scene.add(welc);
      const exitArrow = B.plane(1.5, 0.4, M.tb(T.card(300, 80, '#145a2e', [{ t: 'EXIT  >>>', s: 50, c: '#e8ffe8' }], { border: '#baffd0', bw: 6 }), { side: THREE.DoubleSide }), -8, 2.7, 0, L.scene); exitArrow.rotation.y = -PI / 2;
      [-0.12, 0.12].forEach((o) => B.cyl(0.008, 0.008, 0.5, M.l(0x333333), -8, 2.95, o * 2.5, L.scene, 4));
      // fire extinguisher, trash can, wet floor sign
      B.cyl(0.07, 0.07, 0.4, M.p(0xc0261b, 80, 0xffffff), -1.9, 1.0, 1.8, L.scene, 12);
      B.cyl(0.2, 0.17, 0.5, M.t(T.metal('#6a7078')), -12.5, 0.25, -1.45, L.scene, 14); L.solid(-12.75, -1.7, -12.25, -1.2, 'low');
      const wet = B.box(0.4, 0.62, 0.04, M.l(0xf2c230), 6.2, 0.31, 0.5, L.scene); wet.rotation.y = 0.5; L.solid(5.95, 0.25, 6.45, 0.75, 'low');
      const wet2 = B.plane(0.34, 0.5, M.tb(T.card(120, 170, '#f2c230', [{ t: 'WET', s: 40 }, { t: 'FLOOR', s: 36 }], { border: '#222', bw: 6 })), 6.2, 0.33, 0.53, L.scene); wet2.rotation.y = 0.5;
      // a janitor bucket
      B.cyl(0.19, 0.15, 0.3, M.l(0x3a6a9a), 10.6, 0.15, 1.1, L.scene, 14); B.cyl(0.015, 0.015, 1.3, M.l(0x7a5a38), 10.8, 0.65, 1.15, L.scene, 6).rotation.z = 0.25; L.solid(10.35, 0.85, 10.85, 1.35, 'low');

      /* ---------- the locker note (riddle #3) ---------- */
      const noteTex = (rd, bg) => T.card(300, 380, bg, rd.lines.map((ln, i) => ({ t: ln, s: i === 0 ? 34 : 21, c: i === 0 ? '#a02030' : '#222' })), { border: '#a02030', bw: 8 });
      const notes = [];   // glow sprites for the 4 riddles
      const addGlow = (n, x, y, z, size) => { const g = B.glow('rgba(255,225,120,0.75)', size || 0.55); g.position.set(x, y, z); L.scene.add(g); notes[n] = g; };
      const note3 = B.plane(0.3, 0.38, M.tb(noteTex(RIDDLES[2], '#fff6c8')), -5.4, 1.5, 1.425 - 0.012, L.scene); note3.rotation.y = PI; note3.rotation.z = 0.06;
      B.box(0.06, 0.02, 0.01, M.l(0xdddddd), -5.4, 1.7, 1.41, L.scene);
      addGlow(3, -5.4, 1.5, 1.2, 0.6);

      /* ---------- the exit: double doors, EXIT sign, keypad ---------- */
      const leafM = M.t(T.metal('#5d7466'));
      const leaf = (zz, dirz) => {
        const p = new THREE.Group(); p.position.set(13.92, 0, zz); L.scene.add(p);
        B.rbox(0.09, 2.3, 1.18, 0.012, leafM, 0, 1.15, dirz * 0.59, p);
        B.box(0.1, 0.55, 0.42, M.b(0x1d2c3a), 0, 1.6, dirz * 0.59, p);
        B.box(0.1, 0.07, 0.8, M.p(0xcfc9b0, 90, 0xffffff), -0.06, 1.0, dirz * 0.6, p);
        return p;
      };
      const leafA = leaf(-1.2, 1), leafB = leaf(1.2, -1);
      const exitCol = L.solid(13.75, -1.25, 14.1, 1.25);
      const exitSign = B.plane(1.1, 0.34, M.tb(exitTex()), 13.84, 2.72, 0, L.scene); exitSign.rotation.y = -PI / 2;
      const exitGlow = B.glow('rgba(80,255,140,0.8)', 2.4); exitGlow.position.set(13.5, 2.7, 0); L.scene.add(exitGlow);
      const exitLight = new THREE.PointLight(0x4dff8a, 6, 7, 2); exitLight.position.set(13.0, 2.5, 0); L.scene.add(exitLight);
      // the keypad box on the wall
      const kp = new THREE.Group(); kp.position.set(13.8, 1.35, 1.65); L.scene.add(kp);
      B.rbox(0.07, 0.5, 0.34, 0.01, M.p(0x2c3138, 60, 0x777777), 0.02, 0, 0, kp);
      const scr = B.plane(0.28, 0.1, M.tb(keypadScreen('_ _ _ _')), -0.02, 0.14, 0, kp); scr.rotation.y = -PI / 2; L.keyScr = scr;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) B.box(0.02, 0.05, 0.07, M.l(0xd8dce2), -0.02, 0.01 - i * 0.07, -0.09 + j * 0.09, kp);
      const keyLed = B.glow('rgba(255,70,60,0.9)', 0.12); keyLed.position.set(-0.05, 0.22, 0.12); kp.add(keyLed); L.keyLed = keyLed;
      const keyGlow = B.glow('rgba(120,255,170,0.6)', 0.7); keyGlow.position.set(13.5, 1.5, 1.65); L.scene.add(keyGlow);
      L.interact({ x: 13.0, y: 1.3, z: 1.0, r: 2.7, label: () => 'Use the keypad (4-letter code)', enabled: () => !st.solved, onUse() { openKeypad(L, G); } });
      L.interact({ x: 13.0, y: 1.3, z: -0.8, r: 2.4, label: 'Push the exit doors', enabled: () => !st.solved, onUse() {
        Snd.rattle(0.05); G.say('<b>Emily:</b> The exit doors are locked tight. The keypad next to them wants a 4-letter code. Four letters... from the riddles?', 6500);
      } });
      // the bright outside (hidden until the doors open)
      const outside = B.plane(2.6, 3.2, M.b(0xfffbe4), 16.38, 1.6, 0, L.scene); outside.rotation.y = -PI / 2; outside.visible = false;
      const outLight = new THREE.PointLight(0xfff2c8, 0, 12, 2); outLight.position.set(15.2, 1.5, 0); L.scene.add(outLight);
      const rays = []; for (let i = 0; i < 3; i++) { const g = B.glow('rgba(255,244,190,0.7)', 3.4); g.position.set(15.6 + i * 0.3, 1.4, 0); g.visible = false; L.scene.add(g); rays.push(g); }
      L.trigger({ x: 15.3, z: 0, r: 0.9, enabled: () => st.solved, onEnter() { G.completeLevel(); } });
      let doorOpen = 0;
      L.unlock = () => {
        if (st.solved) return; st.solved = true; exitCol.enabled = false; outside.visible = true; rays.forEach((r) => { r.visible = true; }); outLight.intensity = 50;
        Snd.chime(); setTimeout(() => Snd.door(), 500);
        G.say('<b>CLICK! BEEP!</b> The keypad turns green and the exit doors swing open... a warm light shines outside!', 6500);
        G.setObjective('Run through the <b>light</b> outside!'); G.bumpCreep(0.03); updateKeyScreen('OPEN');
        L.keyLed.material.color.setHex(0x44ff88); L.keyLed.material.needsUpdate = true;
      };
      const updateKeyScreen = (txt) => { const m = L.keyScr.material; m.map = keypadScreen(txt); m.needsUpdate = true; };
      L.updateKeyScreen = updateKeyScreen;

      /* ---------- CLASSROOMS ---------- */
      const board = (cx, cz, rd, glowN) => {
        const g = new THREE.Group(); g.position.set(cx, 1.7, cz + 0.19); L.scene.add(g);
        B.box(3.9, 1.46, 0.06, woodDk, 0, 0, -0.04, g);
        B.plane(3.7, 1.17, M.tb(riddleBoard(rd), { color: 0xcfd8cf }), 0, 0, 0.0, g);
        B.box(3.7, 0.05, 0.12, woodDk, 0, -0.72, 0.03, g);
        B.box(0.12, 0.02, 0.03, M.l(0xf4f4ea), -1.0, -0.69, 0.06, g); B.box(0.12, 0.02, 0.03, M.l(0xf4c0d0), -0.8, -0.69, 0.06, g);
        addGlow(glowN, cx, 2.25, cz + 0.4, 0.7);
      };
      board(-9, -10, RIDDLES[0], 1); board(1, -10, RIDDLES[1], 2);
      const readRiddle = (rd, extra) => () => {
        const first = !st.r[rd.n]; st.r[rd.n] = true;
        G.say('<b>Riddle #' + rd.n + ':</b> ' + rd.lines.slice(1).join(' ') + (extra || ''), 11000);
        if (first) { Snd.pickup(); G.toast('Riddle ' + rd.n + ' saved in your notebook'); updateInv(L, G); updateObjective(L, G); }
      };
      L.interact({ x: -9, y: 1.6, z: -8.1, r: 3.4, label: 'Read the blackboard', onUse: readRiddle(RIDDLES[0]) });
      L.interact({ x: 1, y: 1.6, z: -8.1, r: 3.4, label: 'Read the blackboard', onUse: readRiddle(RIDDLES[1]) });
      L.interact({ x: -5.4, y: 1.5, z: 0.9, r: 2.7, label: 'Read the note on the locker', onUse: readRiddle(RIDDLES[2]) });
      // alphabet strip above board 1 / calendar above board 2
      B.plane(3.6, 0.36, M.tb(T.canvas(720, 72, (x, w, h) => { x.fillStyle = '#f2e9c9'; x.fillRect(0, 0, w, h); const cl = ['#d9534f', '#f0ad4e', '#5cb85c', '#5bc0de', '#9b6bd1']; for (let i = 0; i < 26; i++) { x.fillStyle = cl[i % 5]; x.font = 'bold 40px "Comic Sans MS", sans-serif'; x.textAlign = 'center'; x.fillText(String.fromCharCode(65 + i), 14 + i * 27.4, 52); } }, false)), -9, 2.8, -9.86, L.scene);
      // desks
      const deskUnits = [];
      const deskUnit = (x, z, shift) => {
        const g = new THREE.Group(); g.position.set(x, 0, z);
        g.add(B.table(0.72, 0.5, 0.72, deskTop, M.l(0x555b63)));
        const c = B.chair(chairM); c.position.set(0, 0, 0.52); c.rotation.y = PI; g.add(c); L.scene.add(g);
        L.solid(x - 0.38, z - 0.28, x + 0.38, z + 0.8, 'low'); L.blob(x, z + 0.25, 0.95, 1.3);
        if (shift) L.shifter(c, { x: 0.3, z: 0.95, ry: PI + 0.9 });
        deskUnits.push(g); return g;
      };
      const rows = [-7.2, -6.0, -4.8, -3.6];
      let di = 0;
      [-12.7, -11.4, -10.1, -6.9, -5.6].forEach((x) => rows.forEach((z) => deskUnit(x, z, (di++ % 7) === 3)));
      [-2.8, -1.5, -0.2, 3.7, 5.0].forEach((x) => rows.forEach((z) => { if (x === 5.0 && z === -7.2) return; deskUnit(x, z, (di++ % 7) === 5); }));
      // teacher desks
      const teach = (x, z) => {
        L.furn(B.table(1.5, 0.7, 0.78, woodDk, M.l(0x3a2a1a)), x, z, 0, 1.5, 0.7);
        const c = B.chair(M.l(0x6a3a2a)); c.position.set(x, 0, z - 0.7); L.scene.add(c); L.solid(x - 0.25, z - 0.95, x + 0.25, z - 0.45, 'low');
        B.box(0.28, 0.06, 0.2, M.l(0xb53a3a), x - 0.4, 0.81, z, L.scene); B.box(0.26, 0.05, 0.19, M.l(0x3a6ea5), x - 0.4, 0.865, z, L.scene); B.sph(0.05, M.l(0xd33a2a), x + 0.3, 0.83, z + 0.05, L.scene);
      };
      teach(-6.2, -8.6); teach(4.0, -8.6);
      // bookshelves + map + posters
      L.furn(B.bookshelf(2.2, 1.9, 0.4), -13.65, -6.0, PI / 2, 2.2, 0.4, false); L.furn(B.bookshelf(2.2, 1.9, 0.4), -13.65, -3.7, PI / 2, 2.2, 0.4, false);
      L.furn(B.bookshelf(2.2, 1.9, 0.4), -3.65, -8.6, PI / 2, 2.2, 0.4, false); L.furn(B.bookshelf(1.6, 1.9, 0.4), 5.65, -3.6, -PI / 2, 1.6, 0.4, false);
      L.furn(B.bookshelf(2.0, 1.9, 0.4), 5.65, -8.6, -PI / 2, 2.0, 0.4, false);
      const mapF = B.frame(2.0, 1.25, worldMap(), { wood: true }); mapF.position.set(5.84, 1.75, -6.1); mapF.rotation.y = -PI / 2; L.scene.add(mapF);
      const pos1 = B.frame(0.8, 1.0, T.card(240, 300, '#ffe9a8', [{ t: 'READ', s: 56, c: '#a02030' }, { t: 'EVERY', s: 44 }, { t: 'DAY!', s: 56, c: '#a02030' }], { border: '#a02030', bw: 8 }), { wood: true }); pos1.position.set(-13.84, 1.7, -8.4); pos1.rotation.y = PI / 2; L.scene.add(pos1);
      const pos2 = B.frame(0.9, 0.7, T.card(300, 220, '#d6ecff', [{ t: 'Be kind.', s: 44, c: '#1565c0' }, { t: 'Be quiet.', s: 44, c: '#1565c0' }, { t: 'Be gone?', s: 36, c: '#a02030' }], { border: '#1565c0', bw: 8 }), { wood: true }); pos2.position.set(-3.84, 1.7, -3.1); pos2.rotation.y = PI / 2; L.scene.add(pos2);
      pos2.visible = true;
      const globe = new THREE.Group(); B.sph(0.14, M.t(T.canvas(64, 32, (x, w, h) => { x.fillStyle = '#4a90c8'; x.fillRect(0, 0, w, h); x.fillStyle = '#6eaa5a'; x.fillRect(8, 8, 14, 10); x.fillRect(36, 6, 12, 14); }, false)), 0, 0.14, 0, globe); B.cyl(0.02, 0.05, 0.1, M.l(0x333333), 0, 0.03, 0, globe, 8); globe.position.set(4.6, 0.78, -8.6); L.scene.add(globe);
      // Molly's seat: an empty small chair in the corner of classroom 1 (just a little creepy)
      const lonelyChair = B.chair(M.l(0xcc5a7a)); lonelyChair.position.set(-13.0, 0, -9.0); lonelyChair.rotation.y = 0.9; L.scene.add(lonelyChair); L.solid(-13.25, -9.25, -12.75, -8.75, 'low');
      L.shifter(lonelyChair, { x: -12.2, z: -8.2, ry: 2.4 });
      // sticky "BOO!" doodle on the classroom 1 chalk tray is created later by the chalk event on the hall board only

      /* ---------- LIBRARY ---------- */
      L.place(B.rug(3.4, 2.5, 0x5a3f4a, 0xd8c8a8), 4.6, 0, 6.0);
      L.furn(B.table(2.1, 0.95, 0.76, woodDk, M.l(0x3a2a1a)), 4.6, 6.0, 0, 2.1, 0.95);
      [[3.6, 5.2, 0], [5.6, 5.2, 0], [3.6, 6.8, PI], [5.6, 6.8, PI]].forEach((c) => { const ch = B.chair(M.wood(0x8a5a30)); ch.position.set(c[0], 0, c[1]); ch.rotation.y = c[2]; L.scene.add(ch); L.solid(c[0] - 0.24, c[1] - 0.24, c[0] + 0.24, c[1] + 0.24, 'low'); });
      B.box(0.42, 0.04, 0.3, M.l(0xdb4a4a), 4.1, 0.78, 5.85, L.scene); B.box(0.4, 0.04, 0.28, M.l(0x3f7ac2), 4.12, 0.82, 5.86, L.scene);
      const note4 = B.plane(0.32, 0.4, M.tb(noteTex(RIDDLES[3], '#fff6c8')), 5.0, 0.775, 6.0, L.scene); note4.rotation.x = -PI / 2; note4.rotation.z = 0.3;
      addGlow(4, 5.0, 1.0, 6.0, 0.7);
      L.interact({ x: 5.0, y: 0.8, z: 6.0, r: 2.8, label: 'Read the note on the table', onUse: readRiddle(RIDDLES[3]) });
      // the librarian's desk by the door
      L.furn(B.table(1.4, 0.6, 0.8, woodDk, M.l(0x3a2a1a)), 6.9, 3.4, 0, 1.4, 0.6);
      B.cyl(0.02, 0.02, 0.28, M.l(0x333333), 6.6, 0.94, 3.4, L.scene, 6); const dl = L.lamp(6.6, 1.15, 3.4, 0xffc878, 5, 5, false); dl.ck = 0.5;
      B.sph(0.08, M.l(0xffe2a0, { emissive: 0x806020 }), 6.6, 1.1, 3.4, L.scene);
      L.place(B.plant(1.1), 7.5, 0, 9.3); L.blob(7.5, 9.3, 0.8, 0.8); L.solid(7.25, 9.05, 7.75, 9.55, 'low');
      L.place(B.floorLamp(), -1.3, 0, 3.0); L.solid(-1.5, 2.8, -1.1, 3.2, 'low'); const fl = L.lamp(-1.3, 1.5, 3.0, 0xffc878, 4, 5, false); fl.ck = 0.6;
      // bookshelves = the puzzle shelves
      const shelfPos = { A: [0.3, 9.65, PI], B: [3.1, 9.65, PI], C: [5.9, 9.65, PI], D: [-1.65, 6.4, PI / 2], E: [7.65, 7.0, -PI / 2] };
      L.shelfObjs = {};
      SHELVES.forEach((sh) => {
        const sp = shelfPos[sh.id], bs = B.bookshelf(2.4, 2.2, 0.42);
        L.furn(bs, sp[0], sp[1], sp[2], 2.4, 0.42, false); L.shelfObjs[sh.id] = bs;
        const lab = B.plane(0.5, 0.3, M.tb(T.card(150, 90, '#f2e9c9', [{ t: 'SHELF', s: 24, c: '#3a2a1a' }, { t: sh.id, s: 48, c: '#a02030' }], { border: '#3a2a1a', bw: 6 })), 0, 2.4, 0.22, bs);
        const gx = sp[0] + Math.sin(sp[2]) * 1.0, gz = sp[1] + Math.cos(sp[2]) * 1.0;
        L.interact({ x: sp[0] + Math.sin(sp[2]) * 0.55, y: 1.3, z: sp[1] + Math.cos(sp[2]) * 0.55, r: 3.0, label: 'Look at the books on Shelf ' + sh.id, onUse() { openShelf(L, G, sh); } });
      });
      // one more (plain) bookshelf on the west wall: it hides the secret closet
      const secretBs = B.bookshelf(1.2, 2.2, 0.42); L.furn(secretBs, -1.65, 8.75, PI / 2, 1.2, 0.42, false);
      B.plane(2.4, 0.5, M.tb(T.card(480, 100, '#f2e9c9', [{ t: 'LIBRARY - Shhh!', s: 54, c: '#3a2a1a' }], { border: '#3a2a1a', bw: 8 })), 3.1, 2.9, 9.84, L.scene).rotation.y = PI;
      L.trigger({ x: 2.85, z: 4.0, r: 1.5, onEnter() {
        st.enteredLib = true;
        G.say('<b>Emily:</b> So many books! The riddles talk about things like a clock or a piano... maybe each answer is hiding in one of these book titles.', 8000);
      } });
      L.trigger({ x: -8.5, z: -4.0, r: 1.8, onEnter() { if (!st.r[1]) G.say('<b>Emily:</b> A classroom... in the middle of the night. There is writing on the blackboard.', 5500); } });
      L.trigger({ x: 1.3, z: -4.0, r: 1.8, onEnter() { if (!st.r[2]) G.say('<b>Emily:</b> Another classroom. The blackboard here has something written on it too.', 5500); } });

      /* ---------- Molly's hiding places ---------- */
      L.spots = [
        { x: -12.4, z: 0.4 }, { x: -9.5, z: -0.6 }, { x: -6.5, z: 0.5 }, { x: -3.0, z: -0.4 }, { x: 0.2, z: 0.6 }, { x: 4.0, z: -0.3 }, { x: 7.0, z: 0.5 }, { x: 10.5, z: -0.2 }, { x: 12.6, z: 0.4 },
        { x: -8.5, z: -8.7 }, { x: -8.5, z: -5.0 }, { x: -12.9, z: -2.7 }, { x: -3.2, z: -8.9 }, { x: -8.5, z: -3.0 },
        { x: 1.4, z: -8.6 }, { x: 1.4, z: -5.0 }, { x: 5.2, z: -2.7 }, { x: -2.9, z: -2.8 },
        { x: 3.0, z: 3.4 }, { x: 0.4, z: 4.8 }, { x: 1.5, z: 8.6 }, { x: 6.8, z: 4.6 }, { x: -0.8, z: 8.4 }, { x: 4.5, z: 8.5 }
      ];

      /* ---------- creepy events (all driven by creep) ---------- */
      const ringBell = () => { Snd.bell(0.05); st.pulse = 1.6; };
      L.event(0.3, () => { setTimeout(ringBell, 600); G.toast('...was that the school bell?'); });
      L.event(0.38, () => { if (!door1.isOpen) { Snd.rattle(0.07); } });
      L.event(0.45, () => { Snd.whisper(0.08); G.toast('Someone is whispering in the hall...'); });
      L.event(0.52, () => { if (!door2.isOpen && !G.isSeen(1.35, -2, 0.2, 2)) { door2.setOpen(true); } else { Snd.creak(0.1); } });
      L.event(0.6, () => { st.chalkOn = true; st.chalkT = 0; });
      L.event(0.7, () => { const f = fixtures[2]; if (f) f.dead = true; Snd.thump(0.2); });
      L.event(0.8, () => { const f = fixtures[4]; if (f) f.dead = true; st.pulse = 1.2; Snd.giggle(0.1); });
      L.event(0.88, () => { ringBell(); });

      /* ---------- progress, hints ---------- */
      const nR = () => Object.keys(st.r).length, nB = () => Object.keys(st.b).length;
      L.progress = () => nR() / 4 * 0.3 + nB() / 4 * 0.5 + (st.solved ? 0.2 : 0);
      L.hint = () => {
        if (st.solved) return 'The exit doors are open! Walk through the light at the end of the hall.';
        const needR = RIDDLES.filter((r) => !st.r[r.n]);
        if (nB() >= 4) return 'You have all four books. Put the first letters in riddle order (1, 2, 3, 4) and type the word on the keypad by the exit doors at the end of the hall.';
        if (needR.length === 4 && nB() === 0) return 'Four riddles are hiding in the school: blackboards in the two classrooms (doors on the left side of the hall), a note on a locker, and a note in the library (door on the right side). Each answer is a thing named in one library book title.';
        if (needR.length) return 'You still need riddle #' + needR[0].n + ': look for ' + needR[0].place + '. Each riddle answer is a thing that is in one book title in the library.';
        const open = RIDDLES.filter((r) => !st.b[r.n])[0];
        const sh = SHELVES.filter((s) => s.books.some((b) => b.r === open.n))[0];
        return 'Riddle #' + open.n + ' ("' + open.short + '") is a ' + open.answer + '. Find the book with a ' + open.answer.toLowerCase() + ' in its title: it is on Shelf ' + sh.id + ' in the library. The code letter is the FIRST letter of that title.';
      };
      L.debugApi.solve = () => { RIDDLES.forEach((r) => { st.r[r.n] = true; st.b[r.n] = true; }); updateInv(L, G); L.unlock(); G.teleport(15.2, 0, -PI / 2); return 'unlocked, at exit'; };
      L.debugApi.code = CODE;
      L.debugApi.shelves = SHELVES; L.debugApi.riddles = RIDDLES;
      L.debugApi.pick = (shelfId, i) => pickBook(L, G, SHELVES.filter((s) => s.id === shelfId)[0], i);
      L.debugApi.attempt = (code) => attempt(L, G, code);
      L.debugApi.state = () => ({ r: st.r, b: st.b, solved: st.solved, wrong: st.wrong, chalkN: st.chalkN });
      L.debugApi.openAll = () => { door1.setOpen(true, true); door2.setOpen(true, true); };
      L.debugApi.doors = L.doors;
      L.debugApi.exitCol = exitCol;

      /* ---------- per-frame effects ---------- */
      const fx = { rat: null, door: null };
      L.update = (dt, t) => {
        const c = G.creep, lm = G.lightMul;
        // flickering fluorescent tubes
        st.pulse = Math.max(0, st.pulse - dt);
        fixtures.forEach((f, i) => {
          let k = 1;
          if (f.dead) k = 0;
          else {
            f.t -= dt;
            if (f.fl > 0) { f.fl -= dt; k = Math.random() < 0.55 ? rnd(0.04, 0.45) : 1; }
            else if (c > 0.15 && f.t <= 0) { f.fl = rnd(0.25, 1.0); f.t = rnd(9, 26) * (1.45 - c) * (0.8 + (i % 4) * 0.12); if (c > 0.3 && Math.random() < 0.5) Snd.click(); }
            if (st.pulse > 0 && Math.random() < 0.5) k *= 0.12;
          }
          f.k = k; f.lamp.base = f.base * k;
          const v = k * lm; f.mat.color.setRGB(0.91 * v + 0.03, 0.95 * v + 0.03, 1.0 * v + 0.04); f.glow.visible = k * lm > 0.3; f.glow.material.opacity = 0.55 * k * lm;
        });
        // clocks: the hands begin to spin when it is very creepy
        L.clocks.forEach((cl, i) => { const sp = c > 0.55 ? (c - 0.5) * 5 : 0.02; cl.m.rotation.z -= dt * sp * (i ? 1 : 1.3); cl.h.rotation.z -= dt * sp / 12; });
        // glows on unread riddles
        for (let n = 1; n <= 4; n++) { const g = notes[n]; if (g) { g.visible = !st.r[n]; g.material.opacity = 0.6 + Math.sin(t * 2.6 + n) * 0.3; } }
        keyGlow.material.opacity = st.solved ? 0 : 0.55 + Math.sin(t * 3) * 0.2;
        L.keyLed.visible = Math.sin(t * 4) > -0.3 || st.solved;
        exitGlow.material.opacity = (0.7 + Math.sin(t * 3.3) * 0.2) * (c > 0.75 && Math.random() < 0.02 ? 0.2 : 1) * lm;
        exitLight.intensity = 6 * (0.6 + 0.4 * lm);
        // exit doors swing open
        const tgt = st.solved ? 1 : 0; doorOpen += (tgt - doorOpen) * Math.min(1, dt * 1.6);
        leafA.rotation.y = doorOpen * 1.42; leafB.rotation.y = -doorOpen * 1.42;
        if (st.solved) { outLight.intensity = 46 + Math.sin(t * 3) * 6; rays.forEach((r, i) => { r.material.opacity = 0.5 + Math.sin(t * 2 + i) * 0.2; }); }
        // chalk writes "PLAY WITH ME" on the hall board
        if (st.chalkOn && st.chalkN < 12) {
          st.chalkT += dt;
          if (st.chalkT > 0.55) { st.chalkT = 0; st.chalkN++; drawHall(); Snd.chalk(0.045); }
        }
        // school bell now and then, locker + door rattles
        if (c > 0.42 && G.state === 'play') {
          st.bell -= dt; if (st.bell <= 0) { st.bell = rnd(75, 120) * (1.4 - c); if (st.bell < 40) st.bell = 40; ringBell(); }
          st.ratT -= dt;
          if (st.ratT <= 0) {
            st.ratT = rnd(18, 34) * (1.4 - c);
            const cand = banks.filter((b) => !G.isSeen(b.x, b.z, 0.2, 1.8));
            if (cand.length) { const b = cand[Math.random() * cand.length | 0]; fx.rat = { b: b, t: 0, d: rnd(1.0, 1.8) }; Snd.rattle(0.07); }
          }
          st.doorT -= dt;
          if (st.doorT <= 0) {
            st.doorT = rnd(30, 50) * (1.4 - c);
            const closed = L.doors.filter((d) => !d.isOpen); if (closed.length) { fx.door = { d: closed[Math.random() * closed.length | 0], t: 0, dd: 1.2 }; Snd.rattle(0.06); }
          }
        }
        if (fx.rat) { const r = fx.rat; r.t += dt; const e = Math.max(0, 1 - r.t / r.d), j = Math.sin(r.t * 70) * 0.014 * e; r.b.g.position.set(r.b.home.x + j * 0.4, r.b.home.y, r.b.home.z + j); if (r.t > r.d) { r.b.g.position.copy(r.b.home); fx.rat = null; } }
        if (fx.door) { const r = fx.door; r.t += dt; const e = Math.max(0, 1 - r.t / r.dd); if (!r.d.isOpen) r.d.pivot.rotation.y = r.d.closed + Math.sin(r.t * 55) * 0.035 * e; if (r.t > r.dd) fx.door = null; }
      };
      if (window.Secrets) window.Secrets.level4(L, { bs: secretBs });
      if (window.Dread) window.Dread.level4(L, G, { fixtures: fixtures, door1: door1, door2: door2 });
      updateInv(L, G); updateObjective(L, G);
    },
    start(L, G) {
      G.say('<b>Emily:</b> A school... at night. The bell rang once and now it is so quiet. The exit doors are at the end of the hall, but they have a keypad.', 9000);
      updateInv(L, G); updateObjective(L, G);
    }
  });

  /* ============================== HUD ============================== */
  function letters(L) { return [1, 2, 3, 4].map((n) => (L.st.b[n] ? LETTER[n] : '_')); }
  function updateInv(L, G) {
    const st = L.st; if (!st) return;
    const nr = Object.keys(st.r).length, nb = Object.keys(st.b).length;
    let h = '<div class="chip">Notebook: riddles ' + nr + '/4 &nbsp;|&nbsp; books ' + nb + '/4</div><div>';
    RIDDLES.forEach((r) => {
      if (st.b[r.n]) h += '<span class="chip">#' + r.n + ': letter <b>' + LETTER[r.n] + '</b></span>';
      else if (st.r[r.n]) h += '<span class="chip">#' + r.n + ': ' + r.short + '</span>';
      else h += '<span class="chip">#' + r.n + ': ?</span>';
    });
    G.setInventory(h + '</div>');
  }
  function updateObjective(L, G) {
    const st = L.st; if (!st || st.solved) return;
    const nr = Object.keys(st.r).length, nb = Object.keys(st.b).length;
    if (nb >= 4) G.setObjective('You have all four letters! Type the code on the <b>keypad</b> by the exit doors (end of the hall).');
    else G.setObjective('Open the <b>exit doors</b> with a 4-letter code. Find the riddles (<b>' + nr + '/4</b>), then the matching books in the library (<b>' + nb + '/4</b>).');
  }

  /* ============================== LIBRARY SHELF PANEL ============================== */
  function pickBook(L, G, sh, i) {
    const st = L.st, bk = sh.books[i], msg = document.getElementById('bkmsg');
    if (bk.r) {
      const first = !st.b[bk.r]; st.b[bk.r] = true;
      const seen = st.r[bk.r] ? '' : ' (You have not found that riddle yet, but this book is surely important.)';
      if (msg) msg.innerHTML = '<b>Yes!</b> This is the book for riddle #' + bk.r + ': a ' + RRD(bk.r).answer + '! The first letter of its title is <b>' + LETTER[bk.r] + '</b>.' + seen;
      if (first) { Snd.pickup(); setTimeout(() => Snd.chime(), 180); G.toast('Book found: letter ' + LETTER[bk.r]); updateInv(L, G); updateObjective(L, G); }
      return true;
    }
    st.wrong++; Snd.click(); setTimeout(() => Snd.spooky && st.wrong % 3 === 0 ? Snd.spooky() : Snd.thump(0.08), 120);
    G.bumpCreep(bk.big ? 0.03 : 0.012);
    if (msg) msg.innerHTML = (bk.q || GENERIC_QUIPS[st.wrong % GENERIC_QUIPS.length]) + ' <i>Not this one.</i>';
    return false;
  }
  function RRD(n) { return RIDDLES[n - 1]; }
  function openShelf(L, G, sh) {
    const el = document.createElement('div'); el.className = 'panel';
    el.innerHTML = '<h3>Library - Shelf ' + sh.id + '</h3><div class="sub">Pull out a book to look at it. Which title matches a riddle answer?</div><div class="bookrow" id="bkrow"></div><div class="bkmsg" id="bkmsg">Click a book.</div><div><button id="bk-close">Close (E)</button></div>';
    const row = el.querySelector('#bkrow');
    sh.books.forEach((b, i) => {
      const d = document.createElement('div'); d.className = 'bk'; d.style.background = BOOK_COL[(i * 3 + sh.id.charCodeAt(0)) % BOOK_COL.length];
      d.innerHTML = b.t + '<small>' + (b.r && L.st.b[b.r] ? 'Found! Letter ' + LETTER[b.r] : 'book ' + (i + 1)) + '</small>';
      if (b.r && L.st.b[b.r]) d.classList.add('got');
      d.dataset.i = i;
      d.addEventListener('click', () => { const ok = pickBook(L, G, sh, i); if (ok) { d.classList.add('got'); d.querySelector('small').textContent = 'Found! Letter ' + LETTER[b.r]; } });
      row.appendChild(d);
    });
    el.querySelector('#bk-close').onclick = () => { G.closePanel(); G.lockPointer(); };
    G.openPanel(el, {});
  }

  /* ============================== KEYPAD PANEL ============================== */
  function attempt(L, G, code) {
    const st = L.st; if (st.solved) return true;
    st.tries++;
    if (code === CODE) {
      const m = document.getElementById('kmsg'); if (m) m.innerHTML = 'Beep beep... <b>CLICK!</b> The code is right!';
      Snd.chime(); L.updateKeyScreen(CODE.split('').join(' '));
      const fid = G.flowId;
      setTimeout(() => { if (fid !== G.flowId) return; G.closePanel(); G.lockPointer(); L.unlock(); }, 1100);
      st.opening = true;
      return true;
    }
    Snd.buzz(); G.bumpCreep(0.02); st.wrong++;
    const m = document.getElementById('kmsg');
    if (m) m.innerHTML = st.tries >= 3 ? 'Bzzzt! Wrong code. Hint: the code comes from the BOOKS, not from guessing. First letter of each book title, in riddle order.' : 'Bzzzt! That is not the code.';
    const cs = document.getElementById('kslots'); if (cs) { cs.classList.remove('shake'); void cs.offsetWidth; cs.classList.add('shake'); }
    L.updateKeyScreen('ERROR'); setTimeout(() => { if (G.level === L && !L.st.solved) L.updateKeyScreen('_ _ _ _'); }, 900);
    return false;
  }
  function openKeypad(L, G) {
    const st = L.st; let cur = '';
    const el = document.createElement('div'); el.className = 'panel';
    el.innerHTML = '<h3>Exit door keypad</h3><div class="sub">Type the 4-letter code. Click the letters or use your keyboard. <b>Backspace</b> erases, <b>Enter</b> opens.</div><div class="codeslots" id="kslots"></div><div class="kpad" id="kpad"></div><div id="kmsg" class="sub" style="min-height:44px;max-width:640px;margin:4px auto"></div><div><button id="k-erase">Erase</button><button id="k-ok">Open!</button><button id="k-close">Close (Esc)</button></div>';
    const slots = el.querySelector('#kslots'), pad = el.querySelector('#kpad'), msg = el.querySelector('#kmsg');
    const render = () => { let h = ''; for (let i = 0; i < 4; i++) h += cur[i] ? '<i>' + cur[i] + '</i>' : '<i class="empty"></i>'; slots.innerHTML = h; };
    const known = letters(L).join(' ');
    msg.innerHTML = 'Your notebook letters so far: <b>' + known + '</b>';
    const type = (ch) => { if (st.opening || st.solved) return; if (cur.length < 4) { cur += ch; Snd.beep(); render(); L.updateKeyScreen(cur.split('').join(' ') + (cur.length < 4 ? ' _' : '')); } };
    const erase = () => { if (st.opening || st.solved) return; cur = cur.slice(0, -1); Snd.beep(); render(); L.updateKeyScreen(cur ? cur.split('').join(' ') : '_ _ _ _'); };
    const submit = () => { if (st.opening || st.solved) return; if (cur.length < 4) { msg.textContent = 'The code has 4 letters.'; Snd.buzz(); return; } if (!attempt(L, G, cur)) { cur = ''; render(); } };
    for (let i = 0; i < 26; i++) {
      const ch = String.fromCharCode(65 + i), b = document.createElement('button'); b.className = 'kkey'; b.textContent = ch; b.dataset.k = ch;
      b.addEventListener('mousedown', (e) => { e.preventDefault(); b.classList.add('down'); setTimeout(() => b.classList.remove('down'), 110); type(ch); });
      pad.appendChild(b);
    }
    el.querySelector('#k-erase').onclick = erase; el.querySelector('#k-ok').onclick = submit;
    el.querySelector('#k-close').onclick = () => { G.closePanel(); G.lockPointer(); };
    G.openPanel(el, {
      typing: true,
      onClose() { if (!st.solved && !st.opening) L.updateKeyScreen('_ _ _ _'); },
      onKey(e) {
        const m = /^Key([A-Z])$/.exec(e.code);
        if (m) { const kb = pad.children[m[1].charCodeAt(0) - 65]; kb.classList.add('down'); setTimeout(() => kb.classList.remove('down'), 110); type(m[1]); }
        else if (e.code === 'Backspace' || e.code === 'Delete') { e.preventDefault && e.preventDefault(); erase(); }
        else if (e.code === 'Enter' || e.code === 'NumpadEnter') submit();
      }
    });
    render();
  }
})();
