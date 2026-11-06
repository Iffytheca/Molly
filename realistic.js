/* MOLLY - "realistic" layer. Loaded after build.js and before models.js.
   - photographic textures (img/textures.js -> window.TEX data URIs, so it works from file:// with no loader/CORS issues)
     replace / enrich the procedural canvas textures (Tex.*) whenever a photo exists. If the photos fail to load, the
     old procedural textures are used unchanged.
   - PBR materials (roughness, bump maps, reflections from a small procedural room environment map).
   Material API (Mat.l / p / t / tp / wood ...) is unchanged, so levels and models do not need to know. */
(function () {
  'use strict';
  const T = window.Tex, M = window.Mat, B = window.Build, H = B._h;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rgb = B.rgb, css = B.css, mixc = B.mixc, hexs = B.hexs, mk = H.mk, toTex = H.toTex, cached = H.cached;
  const IMG = {}, DET = {}, STAT = {};
  B.photo = IMG; B.envMats = [];

  /* ---------- load the embedded photos (data URIs) before the game starts ---------- */
  B.ready = new Promise((resolve) => {
    const names = Object.keys(window.TEX || {}); if (!names.length) { resolve(); return; }
    let left = names.length, fin = false;
    const done = () => { if (--left === 0 && !fin) { fin = true; resolve(); } };
    names.forEach((k) => { const im = new Image(); im.onload = () => { IMG[k] = im; done(); }; im.onerror = done; im.src = window.TEX[k]; });
    setTimeout(() => { if (!fin) { fin = true; resolve(); } }, 8000);
  });
  const has = (n) => !!IMG[n];

  /* ---------- pixel helpers ---------- */
  function ctxOf(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return { c: c, x: c.getContext('2d', { willReadFrequently: true }) }; }
  function stats(n) { // mean colour (0..1) and 3%/97% luminance of a photo
    if (STAT[n]) return STAT[n];
    const o = ctxOf(64, 64); o.x.drawImage(IMG[n], 0, 0, 64, 64); const d = o.x.getImageData(0, 0, 64, 64).data, m = [0, 0, 0], ls = [];
    for (let i = 0; i < d.length; i += 4) { m[0] += d[i]; m[1] += d[i + 1]; m[2] += d[i + 2]; ls.push(0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]); }
    ls.sort((a, b) => a - b); const N = d.length / 4;
    return (STAT[n] = { mean: m.map((v) => v / N / 255), lo: ls[(N * 0.04) | 0] / 255, hi: ls[(N * 0.97) | 0] / 255 });
  }
  function detail(n, size) { // grayscale detail map (0..1) as Float32Array(size*size)
    const key = n + size; if (DET[key]) return DET[key];
    const o = ctxOf(size, size); o.x.drawImage(IMG[n], 0, 0, size, size); const d = o.x.getImageData(0, 0, size, size).data, g = new Float32Array(size * size);
    for (let i = 0; i < g.length; i++) g[i] = d[i * 4] / 255;
    return (DET[key] = g);
  }
  // multiply a canvas by a photographic detail map (amt = how strong)
  function overlay(cv, n, amt) {
    const w = cv.width, h = cv.height, x = cv.getContext('2d'), id = x.getImageData(0, 0, w, h), p = id.data, S = 512, g = detail(n, S);
    let mean = 0; for (let i = 0; i < g.length; i += 7) mean += g[i]; mean /= Math.ceil(g.length / 7);
    for (let j = 0; j < h; j++) { const row = (((j * S / h) | 0) * S); for (let i = 0; i < w; i++) {
      const k = 1 + (g[row + ((i * S / w) | 0)] - mean) * 2 * amt, q = (j * w + i) * 4; p[q] *= k; p[q + 1] *= k; p[q + 2] *= k;
    } }
    x.putImageData(id, 0, 0); return cv;
  }
  // photo scaled to w x h and re-coloured so its average colour becomes target (0..1 rgb); k = how much of the gain to apply
  function tinted(n, w, h, target, k) {
    const o = ctxOf(w, h); o.x.drawImage(IMG[n], 0, 0, w, h); const id = o.x.getImageData(0, 0, w, h), p = id.data, m = stats(n).mean, g = [0, 1, 2].map((i) => Math.pow(clamp(target[i] / Math.max(m[i], 0.01), 0.2, 4), k === undefined ? 1 : k));
    for (let i = 0; i < p.length; i += 4) { p[i] = Math.min(255, p[i] * g[0]); p[i + 1] = Math.min(255, p[i + 1] * g[1]); p[i + 2] = Math.min(255, p[i + 2] * g[2]); }
    o.x.putImageData(id, 0, 0); return o.c;
  }
  // luminance of the photo mapped between two colours (0..255 rgb)
  function duotone(n, w, h, lo, hi, gamma) {
    const o = ctxOf(w, h); o.x.drawImage(IMG[n], 0, 0, w, h); const id = o.x.getImageData(0, 0, w, h), p = id.data, s = stats(n), a = s.lo, b = s.hi;
    for (let i = 0; i < p.length; i += 4) {
      let t = clamp(((0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2]) / 255 - a) / (b - a), 0, 1.1); t = Math.pow(Math.min(t, 1), gamma || 1);
      p[i] = lo[0] + (hi[0] - lo[0]) * t; p[i + 1] = lo[1] + (hi[1] - lo[1]) * t; p[i + 2] = lo[2] + (hi[2] - lo[2]) * t;
    }
    o.x.putImageData(id, 0, 0); return o.c;
  }
  function lum(c) { return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]; }
  // height map (gray canvas) from a canvas' luminance; size capped at 512
  function bumpOf(cv, blur) {
    const S = Math.min(512, cv.width), Sy = Math.min(512, cv.height), o = ctxOf(S, Sy); if (blur) o.x.filter = 'blur(' + blur + 'px)';
    o.x.drawImage(cv, 0, 0, S, Sy); o.x.filter = 'none'; const id = o.x.getImageData(0, 0, S, Sy), p = id.data;
    for (let i = 0; i < p.length; i += 4) { const l = 0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2]; p[i] = p[i + 1] = p[i + 2] = l; }
    o.x.putImageData(id, 0, 0);
    const t = new THREE.CanvasTexture(o.c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
  }
  // finish a texture: anisotropy + the PBR parameters that Mat.* will use
  function pbr(tex, o) {
    tex.anisotropy = 16;
    tex.userData.pbr = Object.assign({ rough: 0.8, env: 0.2, metal: 0, bump: null, bumpScale: 1 }, o || {});
    return tex;
  }
  function link(tex, bump) { if (bump) { bump.repeat.copy(tex.repeat); } return tex; }

  /* ---------- upgraded textures ---------- */
  const orig = {}; Object.keys(T).forEach((k) => { orig[k] = T[k]; });
  const OT = (k) => orig[k];

  T.wood = (base, dark) => {
    if (!has('oak_a')) return OT('wood')(base, dark);
    return cached('Pwood' + base + dark, () => {
      const t = mixc(rgb(base), rgb(dark), 0.5).map((v) => v / 255), src = lum(t) < 0.27 && has('walnut') ? 'walnut' : 'oak_a';
      const cv = tinted(src, 1024, 1024, t, 0.92), tex = toTex(cv); tex.repeat.set(1.5, 1.5);
      const bump = bumpOf(cv, 0.6); link(tex, bump);
      return pbr(tex, { rough: 0.5, env: 0.55, bump: bump, bumpScale: 1.4 });
    });
  };
  T.woodGrain = (c) => {
    if (!has('woodgrain')) return OT('woodGrain')(c);
    return cached('Pwg' + c, () => {
      const cv = mk(256, 256, (x, w, h) => { x.fillStyle = css(rgb(c)); x.fillRect(0, 0, w, h); }); overlay(cv, 'woodgrain', 0.95);
      const tex = toTex(cv), bump = bumpOf(cv); return pbr(tex, { rough: 0.5, env: 0.5, bump: bump, bumpScale: 0.6 });
    });
  };
  T.plaster = (c) => {
    if (!has('stucco')) return OT('plaster')(c);
    return cached('Ppl' + c, () => {
      const cv = mk(512, 512, (x, w, h) => { x.fillStyle = css(rgb(c)); x.fillRect(0, 0, w, h); }); overlay(cv, 'stucco', 0.2);
      const tex = toTex(cv), bump = bumpOf(cv, 0.4); return pbr(tex, { rough: 0.93, env: 0.2, bump: bump, bumpScale: 0.6 });
    });
  };
  T.wallpaper = (base, stripe) => {
    const b = rgb(base), pink = b[0] > b[1] + 12 && b[0] > b[2] + 6;       // the rose photo is used for the pink rooms; the striped one keeps its pattern + real paper texture
    if (!pink || !has('wallpaper_roses')) return cached('Pwp0' + base + stripe, () => { const t = OT('wallpaper')(base, stripe); if (has('stucco')) { overlay(t.image, 'stucco', 0.16); t.needsUpdate = true; const bump = bumpOf(t.image, 0.5); link(t, bump); pbr(t, { rough: 0.85, env: 0.15, bump: bump, bumpScale: 0.6 }); } return t; });
    return cached('Pwp' + base + stripe, () => {
      const lo = B.shade(rgb(stripe), 1.08), hi = B.shade(rgb(base), 1.04), img = IMG.wallpaper_roses;
      const cv = duotone('wallpaper_roses', img.width, img.height, lo, hi, 1.25); overlay(cv, 'stucco', 0.1);
      const tex = toTex(cv); tex.repeat.set(2.2, 2.2 * img.width / img.height); const bump = bumpOf(cv, 0.8); link(tex, bump);
      return pbr(tex, { rough: 0.85, env: 0.15, bump: bump, bumpScale: 0.5 });
    });
  };
  function wrap(name, detailName, amt, o) { // keep the procedural drawing, add photographic micro-detail + PBR
    const f = OT(name); if (!f) return;
    T[name] = function () {
      const t = f.apply(T, arguments);
      if (!t.userData.ph && has(detailName)) {
        t.userData.ph = 1; const cv = t.image; overlay(cv, detailName, amt); t.needsUpdate = true;
        const bump = bumpOf(cv, (o && o.blur) || 0); link(t, bump); pbr(t, Object.assign({ bump: bump }, o || {}));
      }
      return t;
    };
  }
  wrap('toyWall', 'stucco', 0.18, { rough: 0.9, env: 0.2, bumpScale: 0.5 });
  T.fabric = (c) => {
    if (!has('weave_fine')) return OT('fabric')(c);
    return cached('Pfab' + c, () => {
      const cv = mk(512, 512, (x, w, h) => { x.fillStyle = css(rgb(c)); x.fillRect(0, 0, w, h); }); overlay(cv, 'weave_fine', 0.32);
      const tex = toTex(cv), bump = bumpOf(cv, 0.3); return pbr(tex, { rough: 0.9, env: 0.12, bump: bump, bumpScale: 0.3 });
    });
  };
  wrap('quilt', 'weave_fine', 0.45, { rough: 0.95, env: 0.1, bumpScale: 0.7 });
  wrap('rug', 'weave_fine', 0.5, { rough: 1, env: 0.08, bumpScale: 0.8 });
  wrap('curtain', 'weave_fine', 0.4, { rough: 0.95, env: 0.1, bumpScale: 0.5 });
  wrap('cabinet', 'woodgrain', 0.28, { rough: 0.5, env: 0.4, bumpScale: 0.4 });
  wrap('hazard', 'concrete', 0.55, { rough: 0.7, env: 0.2, bumpScale: 0.8 });
  wrap('belt', 'concrete', 0.5, { rough: 0.8, env: 0.15, bumpScale: 0.6 });
  wrap('books', 'weave_fine', 0.2, { rough: 0.7, env: 0.2, bumpScale: 0.3 });
  wrap('dollFace', 'stucco', 0.05, { rough: 0.25, env: 0.6, bumpScale: 0.2 });

  T.carpet = (c) => {
    if (!has('carpet')) return OT('carpet')(c);
    return cached('Pcar' + c, () => {
      const cv = mk(512, 512, (x, w, h) => { x.fillStyle = css(rgb(c)); x.fillRect(0, 0, w, h); }); overlay(cv, 'carpet', 0.75);
      const tex = toTex(cv), bump = bumpOf(cv); return pbr(tex, { rough: 1, env: 0.06, bump: bump, bumpScale: 1.6 });
    });
  };
  T.tile = (a, b) => {
    if (!has('tile_ceramic')) return OT('tile')(a, b);
    return cached('Ptile' + a + b, () => {
      const cv = duotone('tile_ceramic', 1024, 1024, B.shade(rgb(b), 0.95), B.shade(rgb(a), 1.04), 1.0);
      const tex = toTex(cv); tex.repeat.set(0.5, 0.5); const bump = bumpOf(cv, 0.5); link(tex, bump);
      return pbr(tex, { rough: 0.18, env: 0.6, bump: bump, bumpScale: 0.6 });
    });
  };
  T.storeFloor = () => cached('Psf', () => {
    const cols = ['#ffd0e2', '#fff1a8', '#bfe9ff', '#d3f5cc'], r = B.R(5);
    const cv = mk(512, 512, (x, w, h) => {
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
        const c = rgb(cols[(i * 2 + j) % 4]), x0 = i * 256, y0 = j * 256, g = x.createLinearGradient(x0, y0, x0 + 256, y0 + 256);
        g.addColorStop(0, css(B.shade(c, 1.03))); g.addColorStop(1, css(B.shade(c, 0.94))); x.fillStyle = g; x.fillRect(x0, y0, 256, 256);
        x.strokeStyle = 'rgba(150,120,135,0.55)'; x.lineWidth = 3; x.strokeRect(x0 + 1.5, y0 + 1.5, 253, 253);   // grout
        x.strokeStyle = 'rgba(255,255,255,0.5)'; x.lineWidth = 2; x.strokeRect(x0 + 5, y0 + 5, 246, 246);
        for (let k = 0; k < 14; k++) { x.strokeStyle = 'rgba(255,255,255,' + (0.05 + r() * 0.12) + ')'; x.lineWidth = 1; x.beginPath(); const px = x0 + 12 + r() * 230, py = y0 + 12 + r() * 230, a = -0.6 + r() * 0.2; x.moveTo(px, py); x.lineTo(px + Math.cos(a) * (20 + r() * 60), py + Math.sin(a) * (20 + r() * 60)); x.stroke(); } // scuffs
      }
    });
    if (has('stucco')) overlay(cv, 'stucco', 0.1);
    const tex = toTex(cv), bump = bumpOf(cv, 0.5); return pbr(tex, { rough: 0.24, env: 0.6, bump: bump, bumpScale: 0.35 });
  });
  T.concrete = () => {
    if (!has('concrete')) return OT('concrete')();
    return cached('Pconc', () => {
      const cv = tinted('concrete', 1024, 1024, [0.4, 0.41, 0.435], 1), x = cv.getContext('2d'), w = 1024, h = 1024, r = B.R(77);
      for (let i = 0; i < 7; i++) H.blob(x, w, h, r() * w, r() * h, 60 + r() * 120, i % 2 ? [20, 18, 15] : [200, 190, 170], 0.1 + r() * 0.08);   // stains / patches
      x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 5; x.strokeRect(0, 0, w, h); x.strokeStyle = 'rgba(255,255,255,0.1)'; x.lineWidth = 2; x.strokeRect(6, 6, w - 12, h - 12);
      x.strokeStyle = 'rgba(0,0,0,0.28)'; x.lineWidth = 2; x.beginPath(); x.moveTo(120, 0); x.lineTo(210, 380); x.lineTo(150, 560); x.lineTo(190, 1024); x.stroke();
      const tex = toTex(cv), bump = bumpOf(cv, 0.6); return pbr(tex, { rough: 0.8, env: 0.35, bump: bump, bumpScale: 1.2 });
    });
  };
  T.metal = (c) => {
    if (!has('rust_metal')) return OT('metal')(c);
    return cached('Pmetal' + c, () => {
      const t = rgb(c || '#6d737a').map((v) => v / 255), cv = tinted('rust_metal', 1024, 1024, t.map((v) => v * 1.0), 0.0);
      // blend the photo's cold steel + a little of the rust with the requested tint (keeps the factory readable but real)
      const x = cv.getContext('2d'); x.globalCompositeOperation = 'soft-light'; x.fillStyle = css(t.map((v) => v * 255), 0.55); x.fillRect(0, 0, 1024, 1024); x.globalCompositeOperation = 'source-over';
      const tex = toTex(cv), bump = bumpOf(cv, 0.8); return pbr(tex, { rough: 0.55, env: 1.0, bump: bump, bumpScale: 1.6 });
    });
  };
  // mirror glass: slightly foxed silvered glass inside the gold frame
  T.mirror = () => cached('Pmirror', () => {
    const t = OT('mirror')(), cv = t.image;
    if (has('stucco')) overlay(cv, 'stucco', 0.06);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.anisotropy = 16;
    return pbr(tex, { rough: 0.08, env: 1.6, metal: 0.9 });
  });

  /* ---------- materials: PBR with the same call signatures ---------- */
  const mc = {};
  const ck = (c) => (c && c.isColor ? c.getHexString() : c);
  function std(o, env) { const m = new THREE.MeshStandardMaterial(o); m.userData.env = env; m.envMapIntensity = env; B.envMats.push(m); return m; }
  const rough = (shin) => clamp(1.04 - (shin || 30) / 150, 0.1, 0.96);
  const clean = (o) => { o = Object.assign({}, o || {}); delete o.specular; delete o.shininess; delete o.reflectivity; return o; };
  function withTex(o) { // a plain material given a photo-ish map through options gets the same bump/roughness
    const t = o.map; if (t && t.userData && t.userData.pbr) { const p = t.userData.pbr; if (p.bump && !o.bumpMap) { o.bumpMap = p.bump; o.bumpScale = p.bumpScale; } if (o.roughness === undefined) o.roughness = p.rough; if (o.metalness === undefined) o.metalness = p.metal; return p.env; }
    return null;
  }
  M.l = (c, o) => { const k = 'l' + ck(c) + (o ? JSON.stringify(o) : ''); return mc[k] || (mc[k] = std(Object.assign({ color: c, roughness: 0.9, metalness: 0 }, clean(o)), 0.2)); };
  M.p = (c, shin, spec, o) => {
    const k = 'p' + ck(c) + shin + spec + (o ? JSON.stringify(o, (kk, v) => (v && v.isTexture ? v.uuid : v)) : '');
    if (mc[k]) return mc[k];
    const so = Object.assign({ color: c, roughness: rough(shin), metalness: 0 }, clean(o)), pe = withTex(so), sl = lum(rgb(hexs(spec === undefined ? 0x222222 : spec)).map((v) => v / 255));
    return (mc[k] = std(so, pe !== null ? pe : clamp(0.18 + sl * 1.5, 0.2, 1.1)));
  };
  M.t = (tex, o) => {
    const k = 't' + tex.uuid + (o ? JSON.stringify(o) : ''); if (mc[k]) return mc[k];
    const p = tex.userData && tex.userData.pbr;
    if (!p) return (mc[k] = new THREE.MeshLambertMaterial(Object.assign({ map: tex }, o || {})));
    const so = Object.assign({ map: tex }, clean(o)), pe = withTex(so); return (mc[k] = std(so, pe));
  };
  M.tp = (tex, shin, spec, o) => {
    const k = 'tp' + tex.uuid + shin + spec + (o ? JSON.stringify(o) : ''); if (mc[k]) return mc[k];
    const so = Object.assign({ map: tex, roughness: rough(shin), metalness: 0 }, clean(o)), pe = withTex(so), sl = lum(rgb(hexs(spec === undefined ? 0x222222 : spec)).map((v) => v / 255));
    return (mc[k] = std(so, pe !== null ? pe : clamp(0.15 + sl * 1.2, 0.15, 1)));
  };
  M.vc = std({ color: 0xffffff, vertexColors: true, roughness: 0.9, metalness: 0 }, 0.2);
  M.vcP = std({ color: 0xffffff, vertexColors: true, roughness: 0.55, metalness: 0 }, 0.5);
  M.vcG = std({ color: 0xffffff, vertexColors: true, roughness: 0.22, metalness: 0 }, 0.9);
  M.vcFor = (m) => (m.roughness < 0.38 ? M.vcG : m.roughness < 0.75 ? M.vcP : M.vc);
  M.wood = (c, shin) => M.tp(T.woodGrain(hexs(c)), shin === undefined ? 28 : shin, 0x2a2118);
  M.fab = (c) => M.t(T.fabric(hexs(c)));


  M.phys = (o, env) => { const m = new THREE.MeshPhysicalMaterial(o); m.userData.env = env === undefined ? 1 : env; m.envMapIntensity = m.userData.env; B.envMats.push(m); return m; };


  /* ---------- Mom's painted face (sphere UVs: front at u=.25 v=.5, ~163 px per radian) ---------- */
  T.momFace = () => cached('PmomFace', () => {
    const rr = B.R(99), cv = mk(1024, 512, (x, w, h) => {
      const skin = [240, 200, 170], cx = 256, cy = 256, px = 163;
      x.fillStyle = css(skin); x.fillRect(0, 0, w, h);
      const sh = (X, Y, rad, col, a) => H.blob(x, w, h, X, Y, rad, col, a);
      sh(cx, cy - 70, 150, [255, 235, 215], 0.35);                                   // forehead light
      sh(cx - 95, cy + 55, 70, [235, 130, 125], 0.22); sh(cx + 95, cy + 55, 70, [235, 130, 125], 0.22);   // cheeks
      sh(cx, cy + 36, 28, [190, 120, 100], 0.2);                                      // under the nose
      sh(cx, cy + 118, 70, [205, 150, 125], 0.22);                                    // chin shade
      sh(770, 260, 200, [150, 90, 70], 0.15);                                         // back of head
      [-1, 1].forEach((s) => {
        const ex = cx + s * 59, ey = cy - 20;
        sh(ex, ey - 12, 34, [160, 110, 100], 0.32);                                   // eye socket / lid shadow
        x.strokeStyle = 'rgba(60,35,25,0.85)'; x.lineWidth = 3.4; x.lineCap = 'round'; x.beginPath(); x.moveTo(ex - s * 20, ey + 1); x.quadraticCurveTo(ex, ey - 15, ex + s * 22, ey - 2); x.stroke();   // upper lash line
        x.strokeStyle = 'rgba(70,40,30,0.35)'; x.lineWidth = 1.4; x.beginPath(); x.moveTo(ex - s * 17, ey + 4); x.quadraticCurveTo(ex, ey + 12, ex + s * 19, ey + 2); x.stroke();                // lower lid
        x.strokeStyle = 'rgba(150,100,85,0.55)'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(ex - s * 18, ey - 12); x.quadraticCurveTo(ex, ey - 24, ex + s * 22, ey - 11); x.stroke();            // lid crease
        const bx = cx + s * 62, by = cy - 52; x.strokeStyle = 'rgba(78,48,30,0.9)'; x.lineCap = 'round';                                    // brow: tapered strokes
        for (let k = 0; k < 34; k++) { const t = k / 33, X0 = bx - s * 30 + s * 62 * t, Y0 = by + 8 - Math.sin(t * Math.PI) * 9 + t * 5; x.lineWidth = 1.1 + (1 - Math.abs(t - 0.3)) * 1.4; x.globalAlpha = 0.5 + rr() * 0.4; x.beginPath(); x.moveTo(X0, Y0); x.lineTo(X0 + s * 5, Y0 - 3 - rr() * 3); x.stroke(); }
        x.globalAlpha = 1;
      });
      x.strokeStyle = 'rgba(150,100,90,0.35)'; x.lineWidth = 2; [-1, 1].forEach((s) => { x.beginPath(); x.moveTo(cx + s * 13, cy + 28); x.quadraticCurveTo(cx + s * 22, cy + 38, cx + s * 12, cy + 42); x.stroke(); });   // nostrils
      x.strokeStyle = 'rgba(150,95,85,0.22)'; x.lineWidth = 2.2; [-1, 1].forEach((s) => { x.beginPath(); x.moveTo(cx + s * 28, cy + 40); x.quadraticCurveTo(cx + s * 52, cy + 70, cx + s * 44, cy + 98); x.stroke(); });   // smile lines
      for (let i = 0; i < 5200; i++) { x.fillStyle = rr() < 0.5 ? 'rgba(120,70,50,0.07)' : 'rgba(255,240,225,0.09)'; x.fillRect(rr() * w, rr() * h, 1.6, 1.6); }   // skin pores
    });
    const tex = toTex(cv); tex.wrapS = THREE.RepeatWrapping; return pbr(tex, { rough: 0.6, env: 0.4 });
  });

  /* ---------- hair: fine glossy strands (canvas is mapped along the length of each lock) ---------- */
  function strands(key, seed, palette, n, hl) {
    return cached(key, () => {
      const r = B.R(seed), cv = mk(512, 512, (x, w, h) => {
        const g = x.createLinearGradient(0, 0, w, 0); palette.base.forEach((c, i) => g.addColorStop(i / (palette.base.length - 1), css(c))); x.fillStyle = g; x.fillRect(0, 0, w, h);
        for (let i = 0; i < n; i++) {
          const px = r() * w, k = r(), c = k < 0.3 ? palette.hi : k < 0.65 ? palette.mid : palette.lo, wob = (r() - 0.5) * 14;
          x.strokeStyle = css(c, 0.18 + r() * 0.5); x.lineWidth = 0.5 + r() * 1.5; x.beginPath(); x.moveTo(px, 0); x.bezierCurveTo(px + wob, h * 0.33, px - wob * 0.6, h * 0.66, px + wob * 0.4, h); x.stroke();
        }
        const v = x.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(0,0,0,0.28)'); v.addColorStop(0.12, 'rgba(0,0,0,0)'); v.addColorStop(0.55, 'rgba(255,255,255,' + hl + ')'); v.addColorStop(0.7, 'rgba(255,255,255,0)'); v.addColorStop(1, 'rgba(0,0,0,0.2)'); x.fillStyle = v; x.fillRect(0, 0, w, h);
      });
      const tex = toTex(cv), bump = bumpOf(cv, 0.3); return pbr(tex, { rough: 0.4, env: 0.7, bump: bump, bumpScale: 0.5 });
    });
  }
  T.hair = () => strands('Phair', 31, { base: [[214, 170, 86], [236, 198, 108], [208, 160, 78]], hi: [255, 240, 176], mid: [232, 190, 100], lo: [150, 104, 40] }, 2600, 0.22);
  T.hairBrown = () => strands('Phairb', 41, { base: [[88, 54, 34], [112, 70, 42], [82, 50, 30]], hi: [176, 124, 84], mid: [120, 76, 46], lo: [40, 22, 12] }, 2600, 0.16);

  /* ---------- environment (reflections + soft bounce light), built once from a tiny procedural room ---------- */
  B.initEnv = function (renderer) {
    try {
      const pm = new THREE.PMREMGenerator(renderer), s = new THREE.Scene();
      const faces = [[0.62, 0.56, 0.5], [0.62, 0.56, 0.5], [0.95, 0.9, 0.82], [0.34, 0.25, 0.18], [0.66, 0.6, 0.54], [0.58, 0.54, 0.5]].map((c) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c[0], c[1], c[2]), side: THREE.BackSide }));
      s.add(new THREE.Mesh(new THREE.BoxGeometry(12, 5, 12), faces)).position.y = 2.5;
      const lamp = (x, z, c, w, h, y, rx) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c[0], c[1], c[2]), side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.x = rx; s.add(m); };
      [[-2.2, -2.2], [2.2, -2.2], [-2.2, 2.2], [2.2, 2.2]].forEach((p) => lamp(p[0], p[1], [7, 6.3, 5.2], 1.6, 1.6, 4.96, Math.PI / 2));
      lamp(0, -5.95, [2.6, 3.0, 3.6], 3.4, 2.2, 2.6, 0);          // a big bright window
      lamp(5.95, 1, [1.6, 1.5, 1.3], 0.01, 0.01, 2.6, 0);
      B.envTex = pm.fromScene(s, 0.02).texture; pm.dispose();
    } catch (e) { B.envTex = null; }
    return B.envTex;
  };
  // darken reflections / bounce as the level gets scarier or the lights flicker (1 = normal)
  B.setEnvLevel = function (k) { const a = B.envMats; for (let i = 0; i < a.length; i++) a[i].envMapIntensity = a[i].userData.env * k; };
})();
