/* MOLLY - Ending scene: back in the bedroom... and the final twist. */
(function () {
  'use strict';
  const B = window.Build, M = window.Mat, T = window.Tex, Snd = window.Snd;
  window.SCENES = window.SCENES || {};

  window.SCENES.ending = {
    id: 'ending', scene: true, music: 'calm',
    build(L, G) {
      L.fog0 = [0xf4e8d8, 0.004]; L.fog1 = L.fog0;
      L.ambient = new THREE.HemisphereLight(0xfff4e0, 0xd8b890, 1.5); L.ambBase = 1.5; L.scene.add(L.ambient);
      const wp = M.t(T.wallpaper('#f9d9e3', '#eaa8c0')), edge = M.l(0xf0d8dc);
      L.floor(-3.5, -3, 3.5, 3, M.t(T.wood('#b88a58', '#a87a4a')), 2);
      L.ceil(-3.5, -3, 3.5, 3, M.l(0xfdf8f0), 2.7);
      L.wall(-3.5, -3, 3.5, -3, { mat: wp, matE: edge }); L.wall(-3.5, 3, 3.5, 3, { mat: wp, matE: edge });
      L.wall(-3.5, -3, -3.5, 3, { mat: wp, matE: edge }); L.wall(3.5, -3, 3.5, 3, { mat: wp, matE: edge });
      L.wallDefaults = { trim: true };
      const win = B.window(1.6, 1.2, { y: 1.6, beam: false }); win.position.set(0.5, 1.6, -2.88); L.scene.add(win);
      const sun = new THREE.PointLight(0xfff0c0, 30, 12, 2); sun.position.set(0.5, 1.8, -2.0); L.scene.add(sun);
      L.lamp(0, 2.4, 0, 0xfff0d8, 10, 9, true).flick = false;
      const bed = B.bed(0xe07a9a); bed.position.set(-2.4, 0, 0); bed.rotation.y = Math.PI / 2; L.scene.add(bed);
      const rug = B.rug(2.4, 1.8, 0xe9a0bd, 0xfff0f5); rug.position.set(0.5, 0, 0.8); L.scene.add(rug);
      B.box(0.5, 0.55, 0.45, M.l(0x8a5a30), -3.1, 0.275, -1.3, L.scene);
      B.box(0.2, 0.12, 0.16, M.l(0xb5651d), -3.1, 0.61, -1.3, L.scene);
      B.box(1.2, 0.9, 0.5, M.l(0x9c6b3a), -1.0, 0.45, 2.6, L.scene);
      // shelf with Molly (east wall)
      B.box(0.4, 0.05, 1.6, M.l(0xf4e3c8), 3.28, 1.1, 0, L.scene);
      B.box(0.06, 0.2, 0.06, M.l(0xa07a4a), 3.3, 1.0, -0.7, L.scene); B.box(0.06, 0.2, 0.06, M.l(0xa07a4a), 3.3, 1.0, 0.7, L.scene);
      const t1 = B.teddy(0xb07a45); t1.scale.setScalar(0.7); t1.position.set(3.25, 1.125, -0.6); t1.rotation.y = -1.2; L.scene.add(t1);
      const t2 = B.bunny(); t2.scale.setScalar(0.7); t2.position.set(3.25, 1.125, 0.6); t2.rotation.y = -1.6; L.scene.add(t2);
      const molly = B.molly(0.7, { model3d: true }); molly.position.set(3.2, 1.125, 0); molly.rotation.y = -Math.PI / 2; L.scene.add(molly); L.molly_ = molly;
      molly.userData.lookEyes(-1, 0); molly.userData.head.rotation.y = 0.9;
      L.spawn = { x: -1.2, z: 0, yaw: -Math.PI / 2 };
      L.hint = () => 'Just look around... you are home.';
    },
    async start(L, G) {
      const id = G.flowId, p = G.player, cam = G.camera, ud = L.molly_.userData, fadeEl = document.getElementById('fade');
      G.state = 'trans'; p.pitch = 1.05; p.h = 0.9; p.yaw = -Math.PI / 2 + 0.2;
      document.getElementById('c').style.filter = '';
      Snd.music('calm');
      await G.wait(1600); if (id !== G.flowId) return;
      await G.bigText('You escaped!', 3600, 'warm'); if (id !== G.flowId) return;
      G.say('<b>Emily:</b> I am... in my bedroom. It was all just a bad dream. Wasn\'t it?', 5500);
      await G.tween(3500, (k) => { const e = k * k * (3 - 2 * k); p.pitch = 1.05 - e * 0.925; p.h = 0.9 + e * 0.35; p.yaw = -Math.PI / 2 + 0.2 - e * 0.2; });
      if (id !== G.flowId) return;
      await G.wait(2200); if (id !== G.flowId) return;
      G.say('<b>Emily:</b> Phew... Everything is fine. Mom must have put Molly on the shelf.', 4500);
      await G.wait(4800); if (id !== G.flowId) return;
      // the twist: slowly zoom toward the doll
      Snd.music(null);
      const startFov = cam.fov;
      await G.tween(5000, (k) => { const e = k * k * (3 - 2 * k); cam.fov = startFov + (17 - startFov) * e; cam.updateProjectionMatrix(); });
      if (id !== G.flowId) return;
      Snd.boxNote(3, 0, 0.15); await G.wait(1200); Snd.boxNote(1, 0, 0.12);
      // her button eyes slowly turn to look at you...
      await G.tween(5500, (k) => { const e = k * k * (3 - 2 * k); ud.lookEyes(-1 + e, 0, 1); ud.head.rotation.y = 0.9 * (1 - Math.min(1, e * 1.4)); });
      if (id !== G.flowId) return;
      await G.wait(900); Snd.giggle(0.1);
      await G.wait(1400); if (id !== G.flowId) return;
      Snd.heartbeat(0.3);
      // cut to black
      fadeEl.style.transition = 'none'; fadeEl.style.opacity = 1; fadeEl.style.background = '#000';
      cam.fov = 72; cam.updateProjectionMatrix(); Snd.thump(0.3);
      await G.wait(1800); if (id !== G.flowId) return;
      await G.bigText('To be continued...', 4200, 'big'); if (id !== G.flowId) return;
      G.save(1);
      try{document.exitPointerLock&&document.exitPointerLock();}catch(e){}
      try { if (window.Secrets) window.Secrets.endCard(); } catch (e) {}
      document.getElementById('endcard').classList.remove('hidden');
    }
  };
})();
