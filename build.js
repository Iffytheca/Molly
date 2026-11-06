/* MOLLY - procedural textures, materials and geometry helpers (everything is drawn with canvas + primitives).
   Models (Molly, Mom, furniture, toys) live in models.js and extend window.Build. */
(function () {
  'use strict';
  const T = (window.Tex = {}), M = (window.Mat = {}), B = (window.Build = {});
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ---------------- small colour / random helpers ---------------- */
  function hexs(n) { return typeof n === 'string' ? n : '#' + ('000000' + (n >>> 0).toString(16)).slice(-6); }
  function rgb(c) {
    c = hexs(c); if (c.length === 4) c = '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
    return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)];
  }
  function css(c, a) { c = c.map((v) => Math.round(clamp(v, 0, 255))); return a === undefined ? 'rgb(' + c + ')' : 'rgba(' + c + ',' + a + ')'; }
  function shade(c, k) { return c.map((v) => v * k); }
  function mixc(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function hash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function R(seed) { // deterministic random so textures look the same every run
    let s = seed >>> 0;
    return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  B.hexs = hexs; B.rgb = rgb; B.css = css;
  B.mixc = mixc; B.shade = shade; B.R = R; B.hash = hash;

  /* ---------------- textures ---------------- */
  function mk(w, h, fn) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); fn(x, w, h); return c;
  }
  function toTex(c, repeat) {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = repeat === false ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
    t.anisotropy = 8;
    return t;
  }
  const cache = {};
  function cached(key, fn) { return cache[key] || (cache[key] = fn()); }
  B._h = { mk: mk, toTex: toTex, cached: cached, blob: blob, speckle: speckle, clamp: clamp };
  function speckle(x, w, h, n, cols, a, r, sz) {
    r = r || Math.random;
    for (let i = 0; i < n; i++) { x.globalAlpha = (a || 0.15) * (0.4 + r() * 0.8); x.fillStyle = cols[i % cols.length]; const s = sz || 2; x.fillRect(r() * w, r() * h, s, s); }
    x.globalAlpha = 1;
  }
  // soft blob that wraps around the edges so tiling textures stay seamless
  function blob(x, w, h, cx, cy, rad, col, a) {
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
      const px = cx + ox * w, py = cy + oy * h; if (px + rad < 0 || px - rad > w || py + rad < 0 || py - rad > h) continue;
      const g = x.createRadialGradient(px, py, 0, px, py, rad); g.addColorStop(0, css(col, a)); g.addColorStop(1, css(col, 0));
      x.fillStyle = g; x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    }
  }

  T.wood = (base, dark) => cached('wood' + base + dark, () => toTex(mk(512, 512, (x, w, h) => {
    const r = R(hash(base + dark)), n = 6, ph = h / n, cb = rgb(base), cd = rgb(dark);
    for (let i = 0; i < n; i++) {
      const y0 = i * ph, col = mixc(cb, cd, clamp(r() * 0.85 + (i % 2) * 0.12, 0, 1));
      const g = x.createLinearGradient(0, y0, 0, y0 + ph);
      g.addColorStop(0, css(shade(col, 1.07))); g.addColorStop(0.5, css(col)); g.addColorStop(1, css(shade(col, 0.92)));
      x.fillStyle = g; x.fillRect(0, y0, w, ph);
      for (let k = 0; k < 30; k++) {
        const yy = y0 + 3 + r() * (ph - 6), amp = r() * 2.2, f = (Math.PI * 2 * (1 + ((r() * 3) | 0))) / w, p0 = r() * 6;
        x.strokeStyle = r() < 0.55 ? 'rgba(70,35,12,' + (0.04 + r() * 0.1) + ')' : 'rgba(255,232,196,' + (0.04 + r() * 0.07) + ')';
        x.lineWidth = 0.6 + r() * 1.3; x.beginPath();
        for (let px = 0; px <= w; px += 16) { const py = yy + Math.sin(px * f + p0) * amp; if (px) x.lineTo(px, py); else x.moveTo(px, py); }
        x.stroke();
      }
      if (r() < 0.5) { // knot
        const kx = 40 + r() * (w - 80), ky = y0 + ph * (0.3 + r() * 0.4);
        for (let q = 5; q > 0; q--) { x.strokeStyle = 'rgba(60,28,8,' + (0.07 + q * 0.03) + ')'; x.lineWidth = 1.2; x.beginPath(); x.ellipse(kx, ky, q * 4.5, q * 2.2, 0, 0, 7); x.stroke(); }
        x.fillStyle = 'rgba(50,22,6,0.4)'; x.beginPath(); x.ellipse(kx, ky, 3, 1.6, 0, 0, 7); x.fill();
      }
      const jx = r() * w; x.fillStyle = 'rgba(30,14,4,0.5)'; x.fillRect(jx, y0, 2, ph); x.fillStyle = 'rgba(255,240,210,0.1)'; x.fillRect(jx + 2, y0, 1, ph);
      x.fillStyle = 'rgba(25,12,4,0.6)'; x.fillRect(0, y0 + ph - 2, w, 2); x.fillStyle = 'rgba(255,238,205,0.14)'; x.fillRect(0, y0, w, 1.5);
    }
    speckle(x, w, h, 1200, ['#000', '#fff'], 0.05, r);
  })));
  // small repeating wood grain for furniture (1 tile per metre)
  T.woodGrain = (c) => cached('wg' + c, () => toTex(mk(128, 128, (x, w, h) => {
    const r = R(hash(c)), col = rgb(c); x.fillStyle = css(col); x.fillRect(0, 0, w, h);
    for (let k = 0; k < 28; k++) { const yy = r() * h, f = (Math.PI * 2 * (1 + ((r() * 2) | 0))) / w, a = r() * 3, p = r() * 6; x.strokeStyle = r() < 0.6 ? 'rgba(40,18,5,' + (0.05 + r() * 0.1) + ')' : 'rgba(255,230,190,' + (0.05 + r() * 0.07) + ')'; x.lineWidth = 0.5 + r() * 1.3; x.beginPath(); for (let px = 0; px <= w; px += 8) { const py = yy + Math.sin(px * f + p) * a; if (px) x.lineTo(px, py); else x.moveTo(px, py); } x.stroke(); }
  })));
  T.fabric = (c) => cached('fab' + c, () => toTex(mk(128, 128, (x, w, h) => {
    const col = rgb(c); x.fillStyle = css(col); x.fillRect(0, 0, w, h);
    const r = R(hash(c));
    for (let i = 0; i < w; i += 3) { x.fillStyle = 'rgba(255,255,255,0.05)'; x.fillRect(i, 0, 1, h); x.fillStyle = 'rgba(0,0,0,0.05)'; x.fillRect(0, i, w, 1); }
    speckle(x, w, h, 1800, ['#fff', '#000'], 0.07, r);
  })));
  T.carpet = (c) => cached('carpet' + c, () => toTex(mk(256, 256, (x, w, h) => {
    const r = R(hash(c)), col = rgb(c); x.fillStyle = css(col); x.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) { const t = r(); x.strokeStyle = t < 0.5 ? css(shade(col, 0.88), 0.35) : css(shade(col, 1.12), 0.35); x.lineWidth = 1; x.beginPath(); const px = r() * w, py = r() * h, a = r() * 6.3; x.moveTo(px, py); x.lineTo(px + Math.cos(a) * 3, py + Math.sin(a) * 3); x.stroke(); }
    blob(x, w, h, 70, 80, 90, [255, 255, 255], 0.05); blob(x, w, h, 190, 190, 80, [0, 0, 0], 0.05);
  })));
  T.tile = (a, b) => cached('tile' + a + b, () => toTex(mk(256, 256, (x, w, h) => {
    const ca = rgb(a), cb = rgb(b), r = R(hash(a + b));
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const c = (i + j) % 2 ? cb : ca, x0 = i * 128, y0 = j * 128;
      const g = x.createLinearGradient(x0, y0, x0 + 128, y0 + 128); g.addColorStop(0, css(shade(c, 1.12))); g.addColorStop(1, css(shade(c, 0.92)));
      x.fillStyle = g; x.fillRect(x0, y0, 128, 128);
      blob(x, w, h, x0 + 30 + r() * 70, y0 + 30 + r() * 70, 50, [255, 255, 255], 0.07);
      x.strokeStyle = 'rgba(255,255,255,0.28)'; x.lineWidth = 3; x.beginPath(); x.moveTo(x0 + 3, y0 + 125); x.lineTo(x0 + 3, y0 + 3); x.lineTo(x0 + 125, y0 + 3); x.stroke();
      x.strokeStyle = 'rgba(0,0,0,0.25)'; x.beginPath(); x.moveTo(x0 + 125, y0 + 3); x.lineTo(x0 + 125, y0 + 125); x.lineTo(x0 + 3, y0 + 125); x.stroke();
      x.strokeStyle = 'rgba(20,20,25,0.55)'; x.lineWidth = 2; x.strokeRect(x0 + 1, y0 + 1, 126, 126);
    }
    speckle(x, w, h, 1500, ['#000', '#fff'], 0.05, r);
  })));
  T.wallpaper = (base, stripe) => cached('wp' + base + stripe, () => toTex(mk(512, 512, (x, w, h) => {
    const r = R(hash(base + stripe)), cb = rgb(base), cs = rgb(stripe);
    x.fillStyle = css(cb); x.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) { // soft stripes
      const cx = i * 128 + 64, g = x.createLinearGradient(cx - 22, 0, cx + 22, 0);
      g.addColorStop(0, css(cs, 0)); g.addColorStop(0.5, css(cs, 0.42)); g.addColorStop(1, css(cs, 0)); x.fillStyle = g; x.fillRect(cx - 22, 0, 44, h);
      x.fillStyle = css(shade(cs, 0.92), 0.5); x.fillRect(cx - 21, 0, 1, h); x.fillRect(cx + 21, 0, 1, h);
    }
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { // little flowers between the stripes
      const fx = i * 128 + 0, fy = j * 128 + (i % 2 ? 64 : 0) + 20;
      x.save(); x.translate(fx, fy); x.fillStyle = css(cs, 0.55);
      for (let k = 0; k < 5; k++) { x.rotate(Math.PI * 2 / 5); x.beginPath(); x.ellipse(0, -7, 3.6, 6.4, 0, 0, 7); x.fill(); }
      x.fillStyle = css(shade(cs, 0.8), 0.8); x.beginPath(); x.arc(0, 0, 2.6, 0, 7); x.fill(); x.restore();
      x.fillStyle = css(cs, 0.35); x.beginPath(); x.ellipse(fx + 14, fy + 20, 2.6, 6, 0.6, 0, 7); x.fill(); x.beginPath(); x.ellipse(fx - 14, fy + 20, 2.6, 6, -0.6, 0, 7); x.fill();
    }
    for (let i = 0; i < w; i += 2) { x.fillStyle = 'rgba(255,255,255,0.03)'; x.fillRect(i, 0, 1, h); }
    speckle(x, w, h, 2500, ['#000', '#fff'], 0.04, r);
  })));
  T.plaster = (c) => cached('pl' + c, () => toTex(mk(256, 256, (x, w, h) => {
    const r = R(hash(c)), col = rgb(c); x.fillStyle = css(col); x.fillRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) blob(x, w, h, r() * w, r() * h, 40 + r() * 70, r() < 0.5 ? [255, 255, 255] : [0, 0, 0], 0.04 + r() * 0.035);
    speckle(x, w, h, 2200, ['#fff', '#000'], 0.05, r);
  })));
  T.toyWall = (c, dot) => cached('tw' + c + dot, () => toTex(mk(256, 256, (x, w, h) => {
    const col = rgb(c); x.fillStyle = css(col); x.fillRect(0, 0, w, h);
    const r = R(hash(c));
    blob(x, w, h, 70, 70, 120, [255, 255, 255], 0.12); blob(x, w, h, 200, 190, 100, [0, 0, 0], 0.04);
    x.fillStyle = css(rgb(dot || '#ffffff'), 0.65);
    [[64, 64], [192, 64], [128, 192], [0, 192], [256, 192]].forEach((p) => { x.beginPath(); x.arc(p[0], p[1], 14, 0, 7); x.fill(); });
    x.fillStyle = css(rgb(dot || '#ffffff'), 0.4); [[0, 64], [128, 64], [256, 64], [64, 192], [192, 192]].forEach((p) => { x.beginPath(); x.arc(p[0], p[1], 7, 0, 7); x.fill(); });
    speckle(x, w, h, 900, ['#fff', '#000'], 0.04, r);
  })));
  T.concrete = () => cached('conc', () => toTex(mk(512, 512, (x, w, h) => {
    const r = R(77); x.fillStyle = '#5d6065'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) blob(x, w, h, r() * w, r() * h, 40 + r() * 90, r() < 0.5 ? [255, 255, 255] : [10, 10, 14], 0.05 + r() * 0.05);
    speckle(x, w, h, 14000, ['#fff', '#000', '#888'], 0.12, r);
    x.strokeStyle = 'rgba(0,0,0,0.4)'; x.lineWidth = 3; x.strokeRect(0, 0, w, h);
    x.strokeStyle = 'rgba(0,0,0,0.18)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(60, 0); x.lineTo(120, 240); x.lineTo(80, 512); x.stroke();
    x.fillStyle = 'rgba(180,140,40,0.08)'; x.fillRect(0, 250, w, 8);
  })));
  T.metal = (c) => cached('metal' + c, () => toTex(mk(256, 256, (x, w, h) => {
    const r = R(hash(c || 'm')), col = rgb(c || '#6d737a'); x.fillStyle = css(col); x.fillRect(0, 0, w, h);
    const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, 'rgba(255,255,255,0.1)'); g.addColorStop(1, 'rgba(0,0,0,0.15)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 256; i += 2) { x.fillStyle = 'rgba(255,255,255,' + (0.02 + r() * 0.05) + ')'; x.fillRect(0, i, w, 1); }
    x.strokeStyle = 'rgba(0,0,0,0.55)'; x.lineWidth = 4; x.strokeRect(2, 2, w - 4, h - 4);
    x.strokeStyle = 'rgba(255,255,255,0.18)'; x.lineWidth = 2; x.strokeRect(6, 6, w - 12, h - 12);
    [[18, 18], [w - 18, 18], [18, h - 18], [w - 18, h - 18], [w / 2, 18], [w / 2, h - 18]].forEach((p) => { x.fillStyle = 'rgba(0,0,0,0.5)'; x.beginPath(); x.arc(p[0] + 1, p[1] + 1, 4, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,0.3)'; x.beginPath(); x.arc(p[0], p[1], 3.5, 0, 7); x.fill(); });
    for (let i = 0; i < 5; i++) blob(x, w, h, r() * w, 200 + r() * 56, 20 + r() * 20, [120, 70, 30], 0.12);
    speckle(x, w, h, 1500, ['#000', '#fff'], 0.07, r);
  })));
  T.hazard = () => cached('haz', () => toTex(mk(128, 64, (x, w, h) => {
    x.fillStyle = '#e8b800'; x.fillRect(0, 0, w, h); x.fillStyle = '#222';
    for (let i = -h; i < w + h; i += 32) { x.beginPath(); x.moveTo(i, h); x.lineTo(i + 16, h); x.lineTo(i + 16 + h, 0); x.lineTo(i + h, 0); x.fill(); }
    speckle(x, w, h, 500, ['#000'], 0.1);
  })));
  T.belt = () => cached('belt', () => toTex(mk(64, 64, (x, w, h) => {
    x.fillStyle = '#26282b'; x.fillRect(0, 0, w, h); x.strokeStyle = '#3d4046'; x.lineWidth = 4;
    for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(0, i * 16 + 8); x.lineTo(w / 2, i * 16 + 2); x.lineTo(w, i * 16 + 8); x.stroke(); }
  })));
  T.storeFloor = () => cached('sf', () => toTex(mk(256, 256, (x, w, h) => {
    const cols = ['#ffd0e2', '#fff1a8', '#bfe9ff', '#d3f5cc'], r = R(5);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const c = rgb(cols[(i * 2 + j) % 4]), x0 = i * 128, y0 = j * 128, g = x.createLinearGradient(x0, y0, x0 + 128, y0 + 128);
      g.addColorStop(0, css(shade(c, 1.04))); g.addColorStop(1, css(shade(c, 0.93))); x.fillStyle = g; x.fillRect(x0, y0, 128, 128);
      blob(x, w, h, x0 + 40, y0 + 36, 55, [255, 255, 255], 0.2);
      x.strokeStyle = 'rgba(255,255,255,0.6)'; x.lineWidth = 3; x.strokeRect(x0 + 3, y0 + 3, 122, 122);
      x.strokeStyle = 'rgba(120,90,110,0.35)'; x.lineWidth = 2; x.strokeRect(x0 + 1, y0 + 1, 126, 126);
    }
    speckle(x, w, h, 700, ['#fff', '#a88'], 0.06, r);
  })));
  T.mirror = () => cached('mirror', () => toTex(mk(256, 256, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#d4e8f4'); g.addColorStop(0.5, '#8fa9ba'); g.addColorStop(1, '#dcebf4');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.globalAlpha = 0.35; x.fillStyle = '#ffffff';
    x.beginPath(); x.moveTo(40, 0); x.lineTo(90, 0); x.lineTo(20, h); x.lineTo(-30, h); x.fill();
    x.beginPath(); x.moveTo(150, 0); x.lineTo(170, 0); x.lineTo(100, h); x.lineTo(80, h); x.fill();
    x.globalAlpha = 0.12; x.fillStyle = '#12304a'; x.fillRect(0, h * 0.55, w, h * 0.45);
    x.globalAlpha = 1;
    const fg = x.createLinearGradient(0, 0, w, 0); fg.addColorStop(0, '#7a6636'); fg.addColorStop(0.5, '#caa857'); fg.addColorStop(1, '#7a6636');
    x.strokeStyle = fg; x.lineWidth = 16; x.strokeRect(0, 0, w, h);
    x.strokeStyle = '#f0d98a'; x.lineWidth = 3; x.strokeRect(11, 11, w - 22, h - 22);
  })));
  T.sky = () => cached('sky', () => toTex(mk(256, 256, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#5aa8f0'); g.addColorStop(0.6, '#bfe3ff'); g.addColorStop(1, '#eaf8ff');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    blob(x, w * 3, h * 3, 190, 60, 90, [255, 248, 200], 0.55);
    const cloud = (cx, cy, s) => { x.fillStyle = 'rgba(255,255,255,0.92)'; [[0, 0, 22], [24, -8, 26], [52, 0, 22], [26, 8, 24], [-18, 6, 14], [72, 6, 14]].forEach((p) => { x.beginPath(); x.arc(cx + p[0] * s, cy + p[1] * s, p[2] * s, 0, 7); x.fill(); }); };
    cloud(50, 70, 0.9); cloud(160, 40, 0.6); cloud(120, 110, 0.5);
    x.fillStyle = '#8ec47a'; x.beginPath(); x.moveTo(0, 190); x.quadraticCurveTo(80, 160, 150, 185); x.quadraticCurveTo(210, 170, 256, 182); x.lineTo(256, 256); x.lineTo(0, 256); x.fill();
    x.fillStyle = '#5fa851'; x.beginPath(); x.moveTo(0, 215); x.quadraticCurveTo(100, 195, 256, 212); x.lineTo(256, 256); x.lineTo(0, 256); x.fill();
    [[40, 200, 22], [90, 210, 16], [210, 200, 24], [236, 206, 14]].forEach((t) => { x.fillStyle = '#6b4a2a'; x.fillRect(t[0] - 2, t[1], 4, 14); x.fillStyle = '#3f8a3a'; x.beginPath(); x.arc(t[0], t[1] - 2, t[2] * 0.75, 0, 7); x.fill(); x.fillStyle = '#58a84c'; x.beginPath(); x.arc(t[0] - 4, t[1] - 6, t[2] * 0.5, 0, 7); x.fill(); });
  }), false));
  T.books = () => cached('books', () => toTex(mk(128, 128, (x, w, h) => {
    const r = R(9); x.fillStyle = '#4a2f1d'; x.fillRect(0, 0, w, h);
    const cols = ['#c0392b', '#2980b9', '#27ae60', '#f1c40f', '#8e44ad', '#e67e22', '#16a085', '#d35400'];
    for (let q = 0; q < 4; q++) { let px = 3; while (px < w - 8) { const bw = 6 + r() * 7, bh = 22 + r() * 7; x.fillStyle = cols[(r() * cols.length) | 0]; x.fillRect(px, (q + 1) * 32 - 3 - bh, bw, bh); px += bw + 1; } x.fillStyle = '#2e1c10'; x.fillRect(0, (q + 1) * 32 - 3, w, 3); }
  })));
  T.cabinet = (c) => cached('cab' + c, () => toTex(mk(256, 256, (x, w, h) => {
    const col = rgb(c), r = R(hash(c)); x.fillStyle = css(col); x.fillRect(0, 0, w, h);
    for (let d = 0; d < 2; d++) {
      const x0 = d * 128 + 10;
      x.fillStyle = css(shade(col, 1.08)); x.fillRect(x0, 14, 108, 196);
      x.strokeStyle = css(shade(col, 0.72)); x.lineWidth = 4; x.strokeRect(x0, 14, 108, 196);
      x.strokeStyle = css(shade(col, 1.25), 0.8); x.lineWidth = 2; x.strokeRect(x0 + 14, 28, 80, 168);
      x.strokeStyle = css(shade(col, 0.7), 0.8); x.strokeRect(x0 + 16, 30, 80, 168);
      x.fillStyle = '#e6e2d6'; x.fillRect(d ? x0 + 14 : x0 + 84, 100, 8, 34); x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(d ? x0 + 22 : x0 + 92, 101, 2, 34);
    }
    x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(0, 226, w, 30);
    speckle(x, w, h, 1200, ['#fff', '#000'], 0.05, r);
  })));
  T.curtain = (c) => cached('cur' + c, () => toTex(mk(128, 256, (x, w, h) => {
    const col = rgb(c); for (let i = 0; i < w; i++) { const k = 0.82 + 0.22 * Math.sin(i / w * Math.PI * 2 * 4); x.fillStyle = css(shade(col, k)); x.fillRect(i, 0, 1, h); }
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(0,0,0,0.18)'); g.addColorStop(0.3, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.12)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  })));
  T.quilt = (c1, c2) => cached('qu' + c1 + c2, () => toTex(mk(256, 256, (x, w, h) => {
    const a = rgb(c1), b = rgb(c2), r = R(hash(c1 + c2));
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const c = (i + j) % 2 ? a : b; x.fillStyle = css(shade(c, 0.95 + r() * 0.1)); x.fillRect(i * 64, j * 64, 64, 64);
      x.strokeStyle = 'rgba(255,255,255,0.55)'; x.setLineDash([5, 4]); x.lineWidth = 1.5; x.strokeRect(i * 64 + 4, j * 64 + 4, 56, 56); x.setLineDash([]);
      x.fillStyle = 'rgba(255,255,255,0.5)'; x.beginPath(); x.arc(i * 64 + 32, j * 64 + 32, 7, 0, 7); x.fill();
    }
    speckle(x, w, h, 1500, ['#fff', '#000'], 0.05, r);
  })));
  T.rug = (c1, c2, c3) => cached('rug' + c1 + c2 + c3, () => toTex(mk(512, 512, (x, w, h) => {
    const a = rgb(c1), b = rgb(c2), c = rgb(c3 || '#ffffff'), r = R(hash(c1 + c2));
    x.fillStyle = css(b); x.fillRect(0, 0, w, h);
    x.fillStyle = css(a); x.fillRect(0, 0, w, 34); x.fillRect(0, h - 34, w, 34); x.fillRect(0, 0, 34, h); x.fillRect(w - 34, 0, 34, h);
    x.strokeStyle = css(c, 0.85); x.lineWidth = 4; x.strokeRect(44, 44, w - 88, h - 88);
    for (let i = 0; i < 20; i++) { x.fillStyle = css(c, 0.8); x.fillRect(60 + i * 20.5, 14, 12, 6); x.fillRect(60 + i * 20.5, h - 20, 12, 6); x.fillRect(14, 60 + i * 20.5, 6, 12); x.fillRect(w - 20, 60 + i * 20.5, 6, 12); }
    x.save(); x.translate(w / 2, h / 2);
    for (let q = 4; q > 0; q--) { x.fillStyle = css(q % 2 ? a : c, q % 2 ? 0.85 : 0.9); x.beginPath(); x.moveTo(0, -q * 52); x.lineTo(q * 52, 0); x.lineTo(0, q * 52); x.lineTo(-q * 52, 0); x.closePath(); x.fill(); }
    x.fillStyle = css(b); for (let k = 0; k < 8; k++) { x.rotate(Math.PI / 4); x.beginPath(); x.ellipse(0, -22, 7, 16, 0, 0, 7); x.fill(); }
    x.restore();
    speckle(x, w, h, 5000, ['#fff', '#000'], 0.08, r);
  })));
  T.hair = () => cached('hair', () => toTex(mk(256, 256, (x, w, h) => {
    const r = R(31); const base = [236, 196, 96];
    x.fillStyle = css(base); x.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) {
      const px = r() * w, k = r(); x.strokeStyle = k < 0.35 ? css([255, 232, 150], 0.45) : k < 0.7 ? css([206, 160, 64], 0.4) : css([255, 246, 200], 0.3);
      x.lineWidth = 0.8 + r() * 1.6; x.beginPath(); x.moveTo(px, 0); x.bezierCurveTo(px + (r() - 0.5) * 12, h * 0.33, px + (r() - 0.5) * 12, h * 0.66, px + (r() - 0.5) * 6, h); x.stroke();
    }
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,0.25)'); g.addColorStop(0.15, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(120,70,10,0.18)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  })));
  T.hairBrown = () => cached('hairb', () => toTex(mk(256, 256, (x, w, h) => {
    const r = R(41); x.fillStyle = '#6a4028'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { const px = r() * w, k = r(); x.strokeStyle = k < 0.4 ? 'rgba(150,100,60,0.45)' : k < 0.75 ? 'rgba(40,20,10,0.4)' : 'rgba(200,150,100,0.3)'; x.lineWidth = 0.8 + r() * 1.6; x.beginPath(); x.moveTo(px, 0); x.bezierCurveTo(px + (r() - 0.5) * 10, h * 0.33, px + (r() - 0.5) * 10, h * 0.66, px + (r() - 0.5) * 6, h); x.stroke(); }
  })));
  // porcelain doll head: sphere UV, front (+z) is at u=0.25 v=0.5. 1024x512 => ~163px per radian
  T.dollFace = (o) => { o = o || {}; return cached('face' + (o.skin || 'd') + (o.blush === undefined ? 1 : o.blush), () => toTex(mk(1024, 512, (x, w, h) => {
    const skin = rgb(o.skin || '#fbe1d1'), r = R(12);
    x.fillStyle = css(skin); x.fillRect(0, 0, w, h);
    blob(x, w, h, 256, 200, 150, [255, 255, 255], 0.35); blob(x, w, h, 770, 260, 200, [200, 140, 120], 0.12);
    const cx = 256, cy = 256, px = 163; // px per radian
    const bl = o.blush === undefined ? 1 : o.blush;
    [-1, 1].forEach((s) => {
      blob(x, w, h, cx + s * 0.62 * px, cy + 0.3 * px, 0.3 * px, [245, 120, 130], 0.5 * bl);
      blob(x, w, h, cx + s * 0.62 * px, cy + 0.3 * px, 0.15 * px, [240, 100, 110], 0.28 * bl);
      // brows
      x.strokeStyle = 'rgba(110,68,34,0.95)'; x.lineWidth = 5; x.lineCap = 'round'; x.beginPath(); x.moveTo(cx + s * 0.26 * px, cy - 0.50 * px); x.quadraticCurveTo(cx + s * 0.46 * px, cy - 0.62 * px, cx + s * 0.66 * px, cy - 0.50 * px); x.stroke();
      // freckles
      x.fillStyle = 'rgba(190,110,80,0.35)'; for (let k = 0; k < 7; k++) { x.beginPath(); x.arc(cx + s * (0.45 + r() * 0.25) * px, cy + (0.2 + r() * 0.15) * px, 1.5, 0, 7); x.fill(); }
      // eye socket shade
      blob(x, w, h, cx + s * 0.4 * px, cy - 0.05 * px, 0.25 * px, [190, 120, 110], 0.12);
    });
    speckle(x, w, h, 4000, ['#fff', '#c88'], 0.05, r);
  }))); };
  // card with text (labels, signs, notes)
  T.card = function (w, h, bg, lines, o) {
    o = o || {};
    const c = mk(w, h, (x) => {
      x.fillStyle = bg; x.fillRect(0, 0, w, h);
      if (o.border) { x.strokeStyle = o.border; x.lineWidth = o.bw || 8; x.strokeRect(o.bw ? o.bw / 2 : 4, o.bw ? o.bw / 2 : 4, w - (o.bw || 8), h - (o.bw || 8)); }
      if (o.draw) o.draw(x, w, h);
      const items = lines.map((l) => (typeof l === 'string' ? { t: l } : l));
      const total = items.reduce((s, l) => s + (l.s || 40) * 1.25, 0);
      let y = (h - total) / 2 + 4;
      items.forEach((l) => {
        const s = l.s || 40; y += s * 1.0;
        x.font = (l.f || ('bold ' + s + 'px "Comic Sans MS", "Trebuchet MS", "Segoe UI", sans-serif')).replace('$S', s);
        x.fillStyle = l.c || o.fg || '#222'; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
        x.fillText(l.t, w / 2, y); y += s * 0.25;
      });
    });
    return toTex(c, false);
  };
  T.canvas = (w, h, fn, repeat) => toTex(mk(w, h, fn), repeat);
  T.letterBlock = (ch, col) => cached('lb' + ch + col, () => toTex(mk(128, 128, (x, w, h) => {
    const c = rgb(col); const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, css(shade(c, 1.12))); g.addColorStop(1, css(shade(c, 0.9))); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(255,255,255,0.45)'; x.lineWidth = 6; x.strokeRect(6, 6, w - 12, h - 12);
    x.fillStyle = '#fff'; x.font = 'bold 84px "Trebuchet MS", "Segoe UI", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = 'rgba(0,0,0,0.3)'; x.shadowBlur = 4; x.fillText(ch, w / 2, h / 2 + 4);
  }), false));
  T.glowTex = (color) => cached('glow' + color, () => toTex(mk(64, 64, (x) => {
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  }), false));
  T.blobShadow = () => cached('blob', () => toTex(mk(64, 64, (x) => {
    const g = x.createRadialGradient(32, 32, 2, 32, 32, 31); g.addColorStop(0, 'rgba(0,0,0,0.85)'); g.addColorStop(0.55, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  }), false));
  T.dust = () => cached('dust', () => toTex(mk(32, 32, (x) => {
    const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 32, 32);
  }), false));
  // light shaft: bright near the window, fading away and with soft sides
  T.beam = () => cached('beam', () => toTex(mk(64, 64, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.5, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0.04)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'destination-in'; const v = x.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.25, 'rgba(0,0,0,1)'); v.addColorStop(0.75, 'rgba(0,0,0,1)'); v.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = v; x.fillRect(0, 0, w, h);
  }), false));
  T.sunPatch = () => cached('sunp', () => toTex(mk(128, 128, (x, w, h) => {
    x.fillStyle = 'rgba(255,255,255,0)'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const x0 = 14 + i * 56, y0 = 14 + j * 56; const g = x.createRadialGradient(x0 + 24, y0 + 24, 4, x0 + 24, y0 + 24, 38); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(x0 - 8, y0 - 8, 64, 64); }
  }), false));

  /* ---------------- materials ---------------- */
  const mc = {};
  function ck(c) { return c && c.isColor ? c.getHexString() : c; }
  M.l = (c, o) => { const k = 'l' + ck(c) + (o ? JSON.stringify(o) : ''); return mc[k] || (mc[k] = new THREE.MeshLambertMaterial(Object.assign({ color: c }, o || {}))); };
  M.p = (c, shin, spec, o) => { const k = 'p' + ck(c) + shin + spec + (o ? JSON.stringify(o) : ''); return mc[k] || (mc[k] = new THREE.MeshPhongMaterial(Object.assign({ color: c, shininess: shin || 30, specular: spec === undefined ? 0x222222 : spec }, o || {}))); };
  M.b = (c, o) => { const k = 'b' + ck(c) + (o ? JSON.stringify(o) : ''); return mc[k] || (mc[k] = new THREE.MeshBasicMaterial(Object.assign({ color: c }, o || {}))); };
  M.t = (tex, o) => { const k = 't' + tex.uuid + (o ? JSON.stringify(o) : ''); return mc[k] || (mc[k] = new THREE.MeshLambertMaterial(Object.assign({ map: tex }, o || {}))); };
  M.tp = (tex, shin, spec, o) => { const k = 'tp' + tex.uuid + shin + spec + (o ? JSON.stringify(o) : ''); return mc[k] || (mc[k] = new THREE.MeshPhongMaterial(Object.assign({ map: tex, shininess: shin || 30, specular: spec === undefined ? 0x222222 : spec }, o || {}))); };
  M.tb = (tex, o) => { const k = 'tb' + tex.uuid + (o ? JSON.stringify(o) : ''); return mc[k] || (mc[k] = new THREE.MeshBasicMaterial(Object.assign({ map: tex }, o || {}))); };
  M.vc = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true });   // flat colours baked into vertices (see B.bake)
  M.vcP = new THREE.MeshPhongMaterial({ color: 0xffffff, vertexColors: true, shininess: 40, specular: 0x333333 });
  // wood-grain furniture material from a colour
  M.wood = (c, shin) => M.tp(T.woodGrain(hexs(c)), shin === undefined ? 28 : shin, 0x2a2118);
  M.fab = (c) => M.t(T.fabric(hexs(c)));

  /* ---------------- geometry helpers ---------------- */
  function put(m, x, y, z, parent) { m.position.set(x || 0, y || 0, z || 0); if (parent) parent.add(m); return m; }
  B.box = (w, h, d, mat, x, y, z, parent) => put(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), x, y, z, parent);
  B.cyl = (rt, rb, h, mat, x, y, z, parent, seg) => put(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 16), mat), x, y, z, parent);
  B.sph = (r, mat, x, y, z, parent, sx, sy, sz, seg) => { const m = put(new THREE.Mesh(new THREE.SphereGeometry(r, seg || 16, Math.max(8, (seg || 16) * 0.7 | 0)), mat), x, y, z, parent); if (sx) m.scale.set(sx, sy === undefined ? sx : sy, sz === undefined ? sx : sz); return m; };
  B.plane = (w, h, mat, x, y, z, parent) => put(new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat), x, y, z, parent);
  B.uvScale = function (geo, su, sv) {
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
    uv.needsUpdate = true; return geo;
  };
  // rounded box (shared geometry, UV in metres)
  const rbc = {};
  B.rbGeo = function (w, h, d, r) {
    r = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
    const key = [w, h, d, r].map((v) => v.toFixed(4)).join('_'); if (rbc[key]) return rbc[key];
    const g = new THREE.BoxGeometry(w, h, d, 4, 4, 4), p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
    const hw = w / 2 - r, hh = h / 2 - r, hd = d / 2 - r, v = new THREE.Vector3(), q = new THREE.Vector3();
    const snap = (a, half, inner) => { const aa = Math.abs(a); return aa < 1e-6 ? 0 : Math.sign(a) * (aa < half - 1e-6 ? inner : half); };
    for (let i = 0; i < p.count; i++) {
      const ox = p.getX(i), oy = p.getY(i), oz = p.getZ(i), nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i));
      const x = snap(ox, w / 2, hw), y = snap(oy, h / 2, hh), z = snap(oz, d / 2, hd);
      v.set(x, y, z); q.set(clamp(x, -hw, hw), clamp(y, -hh, hh), clamp(z, -hd, hd)); v.sub(q);
      const l = v.length(); if (l > 1e-6) { v.multiplyScalar(1 / l); p.setXYZ(i, q.x + v.x * r, q.y + v.y * r, q.z + v.z * r); n.setXYZ(i, v.x, v.y, v.z); } else p.setXYZ(i, x, y, z);
      if (nx > 0.5) uv.setXY(i, oz, oy); else if (ny > 0.5) uv.setXY(i, ox, oz); else uv.setXY(i, ox, oy);
    }
    rbc[key] = g; return g;
  };
  B.rbox = (w, h, d, r, mat, x, y, z, parent) => put(new THREE.Mesh(B.rbGeo(w, h, d, r), mat), x, y, z, parent);
  B.lathe = (pts, mat, x, y, z, parent, seg, phiStart, phiLen) => put(new THREE.Mesh(new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg || 24, phiStart || 0, phiLen || Math.PI * 2), mat), x, y, z, parent);
  B.torus = (R_, r, mat, x, y, z, parent, arc, seg) => put(new THREE.Mesh(new THREE.TorusGeometry(R_, r, 8, seg || 24, arc || Math.PI * 2), mat), x, y, z, parent);
  // tapered tube along a curve (hair strands, ribbons, tails). u runs around the tube, v along it.
  B.taperTube = function (pts, r0, r1, tub, rad, mat) {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
    tub = tub || 16; rad = rad || 5;
    const frames = curve.computeFrenetFrames(tub, false), pos = [], nor = [], uvs = [], idx = [];
    const P = new THREE.Vector3(), N = new THREE.Vector3();
    for (let i = 0; i <= tub; i++) {
      const t = i / tub; curve.getPointAt(t, P); const rr = r0 + (r1 - r0) * Math.pow(t, 0.8), nm = frames.normals[i], bn = frames.binormals[i];
      for (let j = 0; j <= rad; j++) {
        const a = j / rad * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
        N.set(c * nm.x + s * bn.x, c * nm.y + s * bn.y, c * nm.z + s * bn.z);
        pos.push(P.x + N.x * rr, P.y + N.y * rr, P.z + N.z * rr); nor.push(N.x, N.y, N.z); uvs.push(j / rad, t);
      }
    }
    for (let i = 0; i < tub; i++) for (let j = 0; j < rad; j++) { const a = i * (rad + 1) + j, b = (i + 1) * (rad + 1) + j; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(idx);
    return new THREE.Mesh(g, mat);
  };

  /* ---- bake: merge all meshes below `root` into as few meshes as possible (same material => one draw call).
         Flat-coloured Lambert/Phong materials are converted to vertex colours so they all merge together. ---- */
  const _m4 = new THREE.Matrix4(), _v = new THREE.Vector3(), _n3 = new THREE.Matrix3();
  function collect(obj, mat, out) {
    obj.children.slice().forEach((ch) => {
      if (ch.userData.keep) return;
      ch.updateMatrix(); const m = mat.clone().multiply(ch.matrix);
      if (ch.isMesh && ch.visible && !Array.isArray(ch.material) && ch.geometry.attributes.position) out.push({ mesh: ch, m: m });
      else if (!ch.isMesh && !ch.isSprite && !ch.isLight && !ch.isPoints) collect(ch, m, out);
    });
  }
  function plainMat(m) {
    if (m === M.vc || m === M.vcP || m === M.vcG) return null;
    if (m.map || m.alphaMap || m.transparent || m.side !== THREE.FrontSide || m.vertexColors || m.emissiveMap || m.fog === false || m.depthWrite === false) return null;
    if (m.isMeshStandardMaterial && !m.isMeshPhysicalMaterial && m.emissive.getHex() === 0 && m.metalness < 0.3 && m.roughness > 0.08 && !m.envMap) return m.roughness < 0.38 && M.vcG ? M.vcG : M.vcP;
    if (m.isMeshLambertMaterial && m.emissive.getHex() === 0) return M.vc;
    if (m.isMeshPhongMaterial && m.emissive.getHex() === 0 && m.shininess <= 60 && m.specular.getHex() <= 0x444444) return M.vcP;
    return null;
  }
  B.mergeGeos = function (list, withColor) {
    let nv = 0, ni = 0; list.forEach((g) => { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; });
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), col = withColor ? new Float32Array(nv * 3) : null, idx = nv > 65000 ? new Uint32Array(ni) : new Uint16Array(ni);
    let vo = 0, io = 0;
    list.forEach((g) => {
      const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv, c = g.attributes.color;
      pos.set(p.array, vo * 3); if (n) nor.set(n.array, vo * 3); if (u) uv.set(u.array, vo * 2); if (col && c) col.set(c.array, vo * 3);
      if (g.index) for (let i = 0; i < g.index.count; i++) idx[io + i] = g.index.array[i] + vo; else for (let i = 0; i < p.count; i++) idx[io + i] = vo + i;
      io += g.index ? g.index.count : p.count; vo += p.count;
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    if (col) out.setAttribute('color', new THREE.BufferAttribute(col, 3)); out.setIndex(new THREE.BufferAttribute(idx, 1));
    out.computeBoundingSphere(); return out;
  };
  B.bake = function (root) {
    const items = []; collect(root, new THREE.Matrix4(), items);
    const buckets = new Map();
    items.forEach((it) => {
      let mat = it.mesh.material, vcMat = plainMat(mat), color = null; const isVc = mat === M.vc || mat === M.vcP || mat === M.vcG;
      if (vcMat) { color = mat.color; mat = vcMat; }
      let b = buckets.get(mat); if (!b) { b = { mat: mat, geos: [], vc: !!vcMat || isVc }; buckets.set(mat, b); }
      const g = it.mesh.geometry.clone(); g.applyMatrix4(it.m);
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      if (!g.attributes.normal) g.computeVertexNormals();
      if (b.vc && color) { const c = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < g.attributes.position.count; i++) { c[i * 3] = color.r; c[i * 3 + 1] = color.g; c[i * 3 + 2] = color.b; } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); }
      b.geos.push(g); if (it.mesh.parent) it.mesh.parent.remove(it.mesh);
    });
    buckets.forEach((b) => { const m = new THREE.Mesh(B.mergeGeos(b.geos, b.vc), b.mat); m.userData.baked = true; root.add(m); });
    return root;
  };
  B.colorGeo = function (geo, hex) { const c = new THREE.Color(hex), n = geo.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); return geo; };

  /* ---- glow sprites, light shafts, windows ---- */
  B.glow = function (color, size) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glowTex(color), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
    s.scale.set(size || 0.4, size || 0.4, 1);
    return s;
  };
  B.window = function (w, h, o) {
    o = o || {};
    const g = new THREE.Group(), yw = o.y || 1.5, curtains = o.curtains !== false;
    const skyMat = new THREE.MeshBasicMaterial({ map: T.sky(), color: 0xffffff });
    B.plane(w, h, skyMat, 0, 0, 0.0, g);
    const frame = new THREE.Group(), fm = M.p(0xf6f1e6, 30, 0x333333), t = 0.06;
    B.rbox(w + 0.2, 0.09, 0.1, 0.02, fm, 0, h / 2 + 0.045, 0.04, frame); B.rbox(w + 0.2, 0.09, 0.1, 0.02, fm, 0, -h / 2 - 0.045, 0.04, frame);
    B.rbox(0.09, h, 0.1, 0.02, fm, -w / 2 - 0.045, 0, 0.04, frame); B.rbox(0.09, h, 0.1, 0.02, fm, w / 2 + 0.045, 0, 0.04, frame);
    B.rbox(0.05, h, 0.06, 0.015, fm, 0, 0, 0.035, frame); B.rbox(w, 0.05, 0.06, 0.015, fm, 0, 0.0, 0.035, frame);
    B.rbox(w + 0.34, 0.05, 0.22, 0.02, fm, 0, -h / 2 - 0.115, 0.1, frame);                   // sill
    B.bake(frame); g.add(frame);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.06, depthWrite: false, blending: THREE.AdditiveBlending, map: T.mirror() })); glass.position.z = 0.02; g.add(glass);
    if (curtains) {
      const cm = M.t(T.curtain(o.curtain || '#f2b8c8'), { side: THREE.DoubleSide }), cw = Math.min(0.5, w * 0.28);
      [-1, 1].forEach((s) => { B.rbox(cw, h + 0.34, 0.07, 0.03, cm, s * (w / 2 + cw / 2 - 0.1), 0.06, 0.13, g); });
      B.cyl(0.015, 0.015, w + 0.7, M.p(0xb08a40, 60, 0x887744), 0, h / 2 + 0.2, 0.13, g, 8).rotation.z = Math.PI / 2;
    }
    // sunbeams (additive, fade away at night)
    if (o.beam !== false) {
      const beams = [], tilt = 1.2, top = h / 2, bot = -h / 2, floor = -yw + 0.03, mat = new THREE.MeshBasicMaterial({ map: T.beam(), color: o.beamColor || 0xfff0c8, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
      const slat = (xi) => {
        const zN = (bot - floor) * tilt, zF = (top - floor) * tilt;
        const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute([xi, top, 0.06, xi, bot, 0.06, xi, floor, zN + 0.06, xi, floor, zF + 0.06], 3));
        gg.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 1, 1], 2)); gg.setIndex([0, 1, 2, 0, 2, 3]);
        const m = new THREE.Mesh(gg, mat); m.renderOrder = 2; g.add(m);
      };
      [-0.32, 0, 0.32].forEach((k) => slat(k * w));
      const patchMat = new THREE.MeshBasicMaterial({ map: T.sunPatch(), color: 0xffe8b0, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
      const zN = (bot - floor) * tilt, zF = (top - floor) * tilt, patch = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.05, zF - zN), patchMat);
      patch.rotation.x = -Math.PI / 2; patch.position.set(0, floor, (zN + zF) / 2 + 0.06); patch.renderOrder = 2; g.add(patch);
      mat.userData.base = 0.22; patchMat.userData.base = 0.4; beams.push(mat, patchMat); skyMat.userData.beams = beams;
    }
    g.userData.sky = skyMat;
    return g;
  };
  // soft fake shadow disc used under furniture (merged per level by Level.flush)
  B.blobGeo = function (w, d, ry, x, z, y) {
    const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); if (ry) g.rotateY(ry); g.translate(x, y || 0.006, z); return g;
  };
  B.fixBulbs = null;
})();
