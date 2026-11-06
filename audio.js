/* MOLLY - procedural WebAudio sound + music. No audio files. */
(function () {
  'use strict';
  const Snd = (window.Snd = {});
  let ctx = null, master, musBus, sfxBus, ambBus, duckG, echoIn, comp, noiseBuf, drone = null;
  let musicTimer = null, musicName = null, nextT = 0, step = 0;
  Snd.muted = false;
  Snd.detune = 0; // cents applied to music (gets creepy as creep rises)
  Snd.creep = 0;

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  Snd.mtof = mtof;
  const rnd = (a, b) => a + Math.random() * (b - a);

  Snd.init = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { ctx = null; return false; }
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.2;
    master = ctx.createGain(); master.gain.value = Snd.muted ? 0 : 0.8;
    musBus = ctx.createGain(); musBus.gain.value = 0.5;
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9;
    // music + ambience go through a 'duck' gain so we can drop them into sudden silence before a scare; one-shot effects do not
    duckG = ctx.createGain(); ambBus = ctx.createGain();
    musBus.connect(duckG); ambBus.connect(duckG); duckG.connect(master); sfxBus.connect(master); master.connect(comp); comp.connect(ctx.destination);
    // one shared, permanent echo (a feedback delay) for giggles, whispers, far music box: distant, empty-room feeling
    echoIn = ctx.createGain(); echoIn.gain.value = 1;
    const ed = ctx.createDelay(1.2); ed.delayTime.value = 0.29;
    const ef = ctx.createGain(); ef.gain.value = 0.42;
    const el = ctx.createBiquadFilter(); el.type = 'lowpass'; el.frequency.value = 2100;
    const eo = ctx.createGain(); eo.gain.value = 0.55;
    echoIn.connect(ed); ed.connect(el); el.connect(ef); ef.connect(ed); el.connect(eo); eo.connect(sfxBus);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    makeDrone();
    if (musicName) { const n = musicName; musicName = null; Snd.music(n); }
    return true;
  };
  Snd.ready = () => !!ctx;
  Snd.toggleMute = function () {
    Snd.muted = !Snd.muted;
    if (master) master.gain.setTargetAtTime(Snd.muted ? 0 : 0.8, ctx.currentTime, 0.05);
    return Snd.muted;
  };

  function tone(f, t, dur, type, vol, bus, o) {
    o = o || {};
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    if (o.detune) osc.detune.value = o.detune;
    const a = o.attack || 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let out = g;
    osc.connect(g);
    if (o.pan !== undefined && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner(); p.pan.value = o.pan; g.connect(p); out = p;
    }
    out.connect(bus || sfxBus);
    osc.start(t); osc.stop(t + dur + 0.05);
    return osc;
  }
  function noise(t, dur, ftype, freq, q, vol, bus, o) {
    o = o || {};
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = ftype; f.frequency.setValueAtTime(freq, t); f.Q.value = q || 1;
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    const g = ctx.createGain();
    const a = o.attack || 0.01;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g);
    let out = g;
    if (o.pan !== undefined && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner(); p.pan.value = o.pan; g.connect(p); out = p;
    }
    out.connect(bus || sfxBus);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }
  const T = () => ctx.currentTime + 0.01;

  /* ---------- instruments ---------- */
  const PIANO = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88]; // C D E F G A B
  Snd.noteFreq = (i) => PIANO[i - 1];
  Snd.piano = function (i) {
    if (!ctx) return;
    const t = T(), f = PIANO[i - 1];
    tone(f, t, 1.6, 'triangle', 0.32, sfxBus);
    tone(f * 2, t, 0.9, 'sine', 0.1, sfxBus);
    tone(f * 3.01, t, 0.35, 'sine', 0.03, sfxBus);
    noise(t, 0.05, 'bandpass', 2200, 1, 0.04, sfxBus);
  };
  Snd.boxNote = function (i, when, vol, pan) {
    if (!ctx) return;
    const t = when || T(), f = PIANO[i - 1] * 2;
    vol = vol || 0.2;
    tone(f, t, 1.8, 'sine', vol, sfxBus, { pan: pan });
    tone(f * 2.76, t, 0.5, 'sine', vol * 0.35, sfxBus, { pan: pan });
    tone(f * 5.4, t, 0.2, 'sine', vol * 0.12, sfxBus, { pan: pan });
  };
  // play a melody (array of key numbers 1-7) like a music box
  Snd.boxMelody = function (notes, gap, vol, pan) {
    if (!ctx) return 0;
    gap = gap || 0.55;
    const t0 = T();
    notes.forEach((n, k) => Snd.boxNote(n, t0 + k * gap, vol, pan));
    return notes.length * gap;
  };
  Snd.giggle = function (vol, o) {
    if (!ctx) return;
    vol = (vol || 0.12);
    const t0 = T(), pan = rnd(-0.8, 0.8), base = rnd(650, 900), n = 4 + (Math.random() * 3 | 0);
    for (let k = 0; k < n; k++) {
      const t = t0 + k * rnd(0.11, 0.15), f = base * (1 + (k % 2) * 0.18) * (1 - k * 0.03);
      const osc = ctx.createOscillator(), bp = ctx.createBiquadFilter(), g = ctx.createGain(), p = ctx.createStereoPanner();
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(f, t); osc.frequency.exponentialRampToValueAtTime(f * 1.25, t + 0.07);
      bp.type = 'bandpass'; bp.frequency.value = 1500 + k * 60; bp.Q.value = 3;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      p.pan.value = pan;
      osc.connect(bp); bp.connect(g); g.connect(p); p.connect(sfxBus);
      if (echoIn && Snd.creep > 0.25) { const es = ctx.createGain(); es.gain.value = Math.min(0.9, 0.25 + Snd.creep * 0.7) * (o && o.echo !== undefined ? o.echo : 1); p.connect(es); es.connect(echoIn); }
      osc.start(t); osc.stop(t + 0.12);
    }
  };
  Snd.whisper = function (vol) {
    if (!ctx) return;
    vol = vol || 0.08;
    const t0 = T(), pan = rnd(-0.9, 0.9), n = 3 + (Math.random() * 4 | 0);
    for (let k = 0; k < n; k++) {
      noise(t0 + k * rnd(0.18, 0.3), rnd(0.12, 0.3), 'bandpass', rnd(2200, 4800), 4, vol, sfxBus, { pan: pan, attack: 0.04 });
    }
  };
  Snd.creak = function (vol, len) {
    if (!ctx) return;
    vol = vol || 0.07;
    const t = T(), d = rnd(0.7, 1.3) * (len || 1), f = rnd(70, 110);
    const osc = ctx.createOscillator(), bp = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(f, t); osc.frequency.linearRampToValueAtTime(f * rnd(1.3, 1.9), t + d);
    bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = 6;
    lfo.frequency.value = rnd(14, 30); lg.gain.value = vol * 0.6; lfo.connect(lg); lg.connect(g.gain);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    osc.connect(bp); bp.connect(g); g.connect(sfxBus);
    osc.start(t); osc.stop(t + d + 0.05); lfo.start(t); lfo.stop(t + d + 0.05);
  };
  Snd.thump = function (vol) {
    if (!ctx) return;
    const t = T(); tone(70, t, 0.35, 'sine', vol || 0.35, sfxBus, { to: 38 });
    noise(t, 0.12, 'lowpass', 300, 1, (vol || 0.35) * 0.4, sfxBus);
  };
  Snd.heartbeat = function (vol) {
    if (!ctx) return;
    vol = vol || 0.3;
    const t = T();
    tone(58, t, 0.22, 'sine', vol, sfxBus, { to: 40 });
    tone(52, t + 0.2, 0.26, 'sine', vol * 0.8, sfxBus, { to: 36 });
  };
  Snd.step = function (vol) {
    if (!ctx) return;
    noise(T(), 0.09, 'lowpass', rnd(260, 420), 1, vol || 0.05, sfxBus, { attack: 0.005 });
  };
  Snd.door = function () {
    if (!ctx) return;
    Snd.creak(0.12); setTimeout(() => ctx && Snd.thump(0.15), 700);
  };
  Snd.click = function () { if (ctx) tone(1200, T(), 0.05, 'square', 0.04, sfxBus); };
  Snd.pickup = function () {
    if (!ctx) return;
    const t = T(); tone(660, t, 0.12, 'sine', 0.18); tone(990, t + 0.09, 0.2, 'sine', 0.18);
  };
  Snd.chime = function () {
    if (!ctx) return;
    const t = T(); [523.25, 659.25, 783.99, 1046.5].forEach((f, k) => tone(f, t + k * 0.12, 0.9, 'sine', 0.2));
  };
  Snd.buzz = function () {
    if (!ctx) return;
    const t = T(); tone(110, t, 0.45, 'sawtooth', 0.14, sfxBus, { to: 70 }); tone(116, t, 0.45, 'square', 0.06, sfxBus, { to: 72 });
  };
  Snd.spooky = function () { // wrong answer sting
    if (!ctx) return;
    const t = T();
    tone(220, t, 1.2, 'sawtooth', 0.09, sfxBus, { to: 110 });
    tone(233, t, 1.2, 'sawtooth', 0.08, sfxBus, { to: 104 });
    noise(t, 1.0, 'bandpass', 900, 3, 0.07, sfxBus, { to: 200 });
    setTimeout(() => ctx && Snd.giggle(0.1), 500);
  };
  Snd.whoosh = function () { if (ctx) noise(T(), 0.9, 'bandpass', 300, 1.5, 0.12, sfxBus, { to: 3000, attack: 0.3 }); };
  Snd.jump = function () {
    if (!ctx) return;
    const t = T();
    noise(t, 0.9, 'highpass', 1500, 0.7, 0.35, sfxBus, { attack: 0.005 });
    [220, 233.1, 311.1, 466.2, 659.3].forEach((f) => tone(f, t, 1.1, 'sawtooth', 0.08, sfxBus, { to: f * 1.5, attack: 0.004 }));
    tone(1100, t, 0.8, 'square', 0.06, sfxBus, { to: 2400, attack: 0.004 });
    tone(55, t, 1.4, 'sine', 0.4, sfxBus, { to: 30, attack: 0.004 });
  };
  // a happy little "hello!" sparkle (friendly Molly waves)
  Snd.hello = function () {
    if (!ctx) return;
    const t = T(); [784, 988, 1319].forEach((f, k) => { tone(f, t + k * 0.09, 0.55, 'sine', 0.1, sfxBus); tone(f * 2.76, t + k * 0.09, 0.2, 'sine', 0.015, sfxBus); });
  };
  Snd.coin = function () { if (ctx) { const t = T(); tone(880, t, 0.1, 'square', 0.06); tone(1320, t + 0.08, 0.2, 'square', 0.06); } };

  /* ---------- creepier one-shots (all quiet; the shared compressor keeps the peak bounded) ---------- */
  // a little output chain for one sound: optional lowpass (distance / "behind you"), pan, echo send
  function chain(pan, echo, lp) {
    const g = ctx.createGain(); let out = g;
    if (lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; out.connect(f); out = f; }
    if (pan !== undefined && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; out.connect(p); out = p; }
    out.connect(sfxBus);
    if (echo && echoIn) { const e = ctx.createGain(); e.gain.value = echo; out.connect(e); e.connect(echoIn); }
    return g;
  }
  // a burst of TV static / a bad radio signal
  Snd.static = function (dur, vol) {
    if (!ctx) return;
    dur = dur || 0.35; vol = Math.min(0.14, vol || 0.07);
    const t = T(), src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1700;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
    for (let k = 0; k < dur / 0.022; k++) g.gain.setValueAtTime(vol * (Math.random() < 0.65 ? rnd(0.25, 1) : 0.04), t + k * 0.022);
    g.gain.setValueAtTime(0.0001, t + dur);
    src.connect(hp); hp.connect(g); g.connect(sfxBus); src.start(t, Math.random()); src.stop(t + dur + 0.05);
    tone(55, t, dur, 'square', vol * 0.35, sfxBus, { attack: 0.01 });
  };
  // slow breathing very close to you (in...out)
  Snd.breath = function (vol, pan) {
    if (!ctx) return;
    vol = Math.min(0.16, vol || 0.07); const t = T(), b = chain(pan === undefined ? rnd(-0.5, 0.5) : pan, 0.25, 2400);
    noise(t, 1.0, 'bandpass', 520, 0.9, vol, b, { to: 950, attack: 0.55 });
    noise(t + 1.2, 1.5, 'bandpass', 950, 0.9, vol * 0.8, b, { to: 430, attack: 0.35 });
  };
  // a whispering voice, close, with a few "syllables" (no words)
  Snd.whisperClose = function (vol, pan) {
    if (!ctx) return;
    vol = Math.min(0.14, vol || 0.08); const t0 = T(), b = chain(pan === undefined ? rnd(-0.9, 0.9) : pan, 0.6, 5200), n = 4 + (Math.random() * 4 | 0);
    let t = t0;
    for (let k = 0; k < n; k++) {
      const f = [1500, 2300, 3300, 1900][k % 4] * rnd(0.85, 1.2), d = rnd(0.09, 0.2);
      noise(t, d, 'bandpass', f, 5, vol * (k % 3 === 1 ? 1 : 0.7), b, { attack: 0.03, to: f * rnd(0.8, 1.25) });
      t += d + rnd(0.04, 0.12);
    }
  };
  // a heavy door slamming somewhere (quiet enough to be safe, with a long echo)
  Snd.slam = function (vol) {
    if (!ctx) return;
    vol = Math.min(0.4, vol || 0.28); const t = T(), b = chain(rnd(-0.6, 0.6), 0.7, 3500);
    tone(105, t, 0.55, 'sine', vol, b, { to: 36, attack: 0.003 });
    noise(t, 0.28, 'lowpass', 520, 1, vol * 0.9, b, { attack: 0.002 });
    noise(t, 0.07, 'bandpass', 1400, 2, vol * 0.5, b, { attack: 0.001 });
  };
  // one footstep that is NOT yours: muffled, a bit lower, a bit later
  Snd.stepBehind = function (vol) {
    if (!ctx) return;
    vol = Math.min(0.12, vol || 0.07); const t = T(), b = chain(rnd(-0.25, 0.25), 0.2, 700);
    noise(t, 0.11, 'lowpass', rnd(200, 300), 1, vol, b, { attack: 0.004 });
    tone(rnd(70, 95), t, 0.09, 'sine', vol * 0.6, b, { to: 50, attack: 0.003 });
  };
  // quick footsteps running away (fake-out)
  Snd.runAway = function (n, vol) {
    if (!ctx) return;
    for (let k = 0; k < (n || 6); k++) setTimeout(() => ctx && Snd.stepBehind((vol || 0.09) * (1 - k * 0.1)), k * 190);
  };
  // far-away, slowed, off-key music box (echoing in another room)
  Snd.farBox = function (notes, vol) {
    if (!ctx) return 0;
    vol = Math.min(0.12, vol || 0.07); notes = notes || [6, 5, 3, 1, 3, 2];
    const t0 = T(), b = chain(rnd(-0.8, 0.8), 0.85, 1500), gap = rnd(0.95, 1.3);
    notes.forEach((n, k) => {
      const det = (k % 2 ? 1 : -1) * rnd(25, 85) - k * 8, f = PIANO[(n - 1) % 7] * 2 * Math.pow(2, det / 1200), t = t0 + k * gap * (1 + (k > 3 ? 0.18 * (k - 3) : 0));
      tone(f, t, 2.6, 'sine', vol, b, { attack: 0.01 }); tone(f * 2.76, t, 0.6, 'sine', vol * 0.25, b, { attack: 0.01 });
    });
    return notes.length * gap;
  };
  // a dissonant swell for a startling (non-jumpscare) moment, low volume
  Snd.sting = function (vol) {
    if (!ctx) return;
    vol = Math.min(0.09, vol || 0.05); const t = T(), b = chain(0, 0.4, 2200);
    [233.1, 246.9, 349.2, 370].forEach((f) => tone(f, t, 1.0, 'sawtooth', vol * 0.5, b, { to: f * 0.97, attack: 0.03 }));
    noise(t, 0.5, 'bandpass', 1800, 2, vol * 0.7, b, { attack: 0.02 });
  };
  // soft low "swell then nothing" used just before the silence
  Snd.swell = function (dur, vol) {
    if (!ctx) return;
    dur = dur || 1.4; vol = Math.min(0.1, vol || 0.06); const t = T();
    tone(98, t, dur, 'sawtooth', vol, sfxBus, { to: 130, attack: dur * 0.9 }); tone(103.5, t, dur, 'sawtooth', vol * 0.8, sfxBus, { to: 138, attack: dur * 0.9 });
  };
  // the tail of the jumpscare: a sour music-box cluster and a low rumble, quieter than the main hit
  Snd.jumpTail = function () {
    if (!ctx) return;
    const t = T() + 0.25, b = chain(0, 0.5, 3000);
    [880, 932, 1318].forEach((f, k) => tone(f, t + k * 0.05, 1.8, 'sine', 0.05, b, { to: f * 0.96, attack: 0.01 }));
    noise(t, 1.0, 'lowpass', 700, 1, 0.1, b, { attack: 0.05 });
    tone(46, t, 1.4, 'sine', 0.12, b, { to: 32, attack: 0.02 });
  };
  // a silly goose-like HONK for squeaky toys, and a squeak
  Snd.honk = function (vol) {
    if (!ctx) return;
    vol = Math.min(0.2, vol || 0.15); const t = T(), o = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o2.type = 'square'; f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 1.6;
    o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(330, t + 0.06); o.frequency.exponentialRampToValueAtTime(250, t + 0.26);
    o2.frequency.setValueAtTime(95, t); o2.frequency.exponentialRampToValueAtTime(165, t + 0.06); o2.frequency.exponentialRampToValueAtTime(125, t + 0.26);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.setValueAtTime(vol, t + 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    o.connect(f); o2.connect(f); f.connect(g); g.connect(sfxBus); o.start(t); o2.start(t); o.stop(t + 0.35); o2.stop(t + 0.35);
  };
  Snd.squeak = function (vol) {
    if (!ctx) return;
    vol = Math.min(0.14, vol || 0.1); const t = T();
    tone(1250, t, 0.11, 'sine', vol, sfxBus, { to: 2300, attack: 0.008 }); tone(2400, t + 0.1, 0.1, 'sine', vol * 0.6, sfxBus, { to: 1700, attack: 0.006 });
  };
  // secret found: a bright, happy sparkle
  Snd.secret = function () {
    if (!ctx) return;
    const t = T(); [784, 988, 1175, 1568, 1976].forEach((f, k) => { tone(f, t + k * 0.09, 0.9, 'sine', 0.13); tone(f * 2.01, t + k * 0.09, 0.3, 'triangle', 0.03); });
  };
  Snd.slide = function () {   // a heavy stone/wood panel sliding
    if (!ctx) return;
    const t = T(); noise(t, 1.3, 'lowpass', 380, 1, 0.1, sfxBus, { to: 160, attack: 0.2 }); Snd.creak(0.07, 1.4);
  };

  /* ---------- ambient drone (creep driven) ---------- */
  function makeDrone() {
    const g = ctx.createGain(); g.gain.value = 0;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180;
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), o3 = ctx.createOscillator();
    o1.type = 'sawtooth'; o2.type = 'sawtooth'; o3.type = 'sine';
    o1.frequency.value = 55; o2.frequency.value = 55.8; o3.frequency.value = 82.4;
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.12; lg.gain.value = 60;
    lfo.connect(lg); lg.connect(lp.frequency);
    o1.connect(lp); o2.connect(lp); o3.connect(lp); lp.connect(g); g.connect(ambBus);
    o1.start(); o2.start(); o3.start(); lfo.start();
    // second layer: a sour, slowly wandering pair (a semitone-ish rub) that only fades in when it gets creepy
    const g4 = ctx.createGain(); g4.gain.value = 0;
    const lp4 = ctx.createBiquadFilter(); lp4.type = 'lowpass'; lp4.frequency.value = 260; lp4.Q.value = 2;
    const o4 = ctx.createOscillator(), o5 = ctx.createOscillator(); o4.type = 'triangle'; o5.type = 'sine'; o4.frequency.value = 58.3; o5.frequency.value = 87.3;
    const lfo2 = ctx.createOscillator(), lg2 = ctx.createGain(); lfo2.frequency.value = 0.07; lg2.gain.value = 45; lfo2.connect(lg2); lg2.connect(o4.detune); lg2.connect(o5.detune);
    o4.connect(lp4); o5.connect(lp4); lp4.connect(g4); g4.connect(ambBus); o4.start(); o5.start(); lfo2.start();
    // tension pulse: a low throb that grows when Molly is close (Snd.tension)
    const gt = ctx.createGain(); gt.gain.value = 0;
    const ot = ctx.createOscillator(); ot.type = 'sawtooth'; ot.frequency.value = 41;
    const lpt = ctx.createBiquadFilter(); lpt.type = 'lowpass'; lpt.frequency.value = 140;
    const tr = ctx.createGain(); tr.gain.value = 0.5;     // throb: 0..1 amplitude wobble
    const lt = ctx.createOscillator(), ltg = ctx.createGain(); lt.frequency.value = 1.6; ltg.gain.value = 0.5; lt.connect(ltg); ltg.connect(tr.gain);
    ot.connect(lpt); lpt.connect(tr); tr.connect(gt); gt.connect(ambBus); ot.start(); lt.start();
    drone = { g: g, o2: o2, o3: o3, g4: g4, o4: o4, o5: o5, gt: gt, ot: ot, lt: lt, kind: 'house' };
  }
  Snd.setCreep = function (c) {
    Snd.creep = c;
    Snd.detune = -c * 55;
    if (drone) {
      const t = ctx.currentTime;
      drone.g.gain.setTargetAtTime(Math.max(0, c - 0.08) * 0.16, t, 0.5);
      // the more creep, the more the drone detunes (fifth slides toward a tritone, the 55 Hz pair beats faster)
      drone.o2.frequency.setTargetAtTime(55.8 + c * 3.2, t, 1.0);
      drone.o3.frequency.setTargetAtTime(82.4 * Math.pow(2, c * 0.55 / 12), t, 1.0);
      drone.g4.gain.setTargetAtTime(Math.max(0, c - 0.3) * 0.12, t, 0.8);
    }
  };
  // 0..1: how close and threatening Molly is right now (a low pulsing throb, never loud)
  Snd.tension = function (v) {
    if (!drone) return; v = Math.max(0, Math.min(1, v));
    const t = ctx.currentTime;
    drone.gt.gain.setTargetAtTime(v * 0.075, t, 0.4); drone.lt.frequency.setTargetAtTime(1.3 + v * 2.4, t, 0.4);
  };
  // sudden silence: ambience + music drop away for `hold` seconds, then come back slowly
  Snd.duck = function (depth, hold, rel) {
    if (!ctx || !duckG) return;
    const t = ctx.currentTime, g = duckG.gain;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.setTargetAtTime(1 - Math.min(0.98, depth), t, 0.06); g.setTargetAtTime(1, t + (hold || 1.2), rel || 0.45);
  };

  /* ---------- machine hum for factory ---------- */
  let hum = null;
  Snd.hum = function (on) {
    if (!ctx) return;
    if (!on) { if (hum) { hum.g.gain.setTargetAtTime(0, ctx.currentTime, 0.3); const h = hum; setTimeout(() => { try { h.src.stop(); h.o.stop(); } catch (e) {} }, 1500); hum = null; } return; }
    if (hum) return;
    const g = ctx.createGain(); g.gain.value = 0;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 50;
    const og = ctx.createGain(); og.gain.value = 0.25;
    src.connect(f); f.connect(g); o.connect(og); og.connect(f); g.connect(ambBus);
    src.start(); o.start();
    g.gain.setTargetAtTime(0.1, ctx.currentTime, 0.5);
    hum = { g: g, src: src, o: o };
  };
  Snd.clank = function () { if (ctx) { const t = T(); noise(t, 0.2, 'bandpass', 1800, 8, 0.12); tone(180, t, 0.25, 'square', 0.05, sfxBus, { to: 90 }); } };
  // school bell: a rattling electric ring (moderate volume)
  Snd.bell = function (vol) {
    if (!ctx) return;
    vol = vol || 0.05;
    const t = T();
    for (let k = 0; k < 24; k++) {
      const tt = t + k * 0.075, f = k % 2 ? 1650 : 1980;
      tone(f, tt, 0.09, 'triangle', vol * (1 - k * 0.018), sfxBus, { attack: 0.003 });
      tone(f * 2.4, tt, 0.05, 'sine', vol * 0.25, sfxBus, { attack: 0.003 });
    }
    tone(1820, t, 1.9, 'sine', vol * 0.35, sfxBus, { attack: 0.01 });
  };
  // metal locker / door rattle
  Snd.rattle = function (vol) {
    if (!ctx) return;
    vol = vol || 0.07;
    const t = T(), pan = rnd(-0.8, 0.8);
    for (let k = 0; k < 10; k++) noise(t + k * rnd(0.05, 0.1), 0.07, 'bandpass', rnd(900, 2600), 5, vol * (1 - k * 0.06), sfxBus, { pan: pan, attack: 0.003 });
    tone(130, t, 0.6, 'square', vol * 0.25, sfxBus, { to: 90, pan: pan });
  };
  // chalk scratching on a board
  Snd.chalk = function (vol) {
    if (!ctx) return;
    noise(T(), 0.16, 'highpass', 3800, 1, vol || 0.045, sfxBus, { attack: 0.02, pan: rnd(-0.3, 0.3) });
  };
  // keypad beep
  Snd.beep = function (hi) { if (ctx) tone(hi ? 1500 : 1100, T(), 0.07, 'square', 0.035, sfxBus); };

  /* ---------- music sequencer ---------- */
  const M = {
    store: { bpm: 140, len: 32,
      play(s, t, d) {
        const mel = [72,0,76,0,79,0,76,0, 77,0,81,0,79,0,76,0, 74,0,77,0,81,0,77,0, 76,0,72,0,67,0,0,0];
        const m = mel[s % 32];
        if (m) { tone(mtof(m), t, d * 1.6, 'triangle', 0.13, musBus, { detune: Snd.detune }); tone(mtof(m + 12), t, d * 0.8, 'sine', 0.04, musBus, { detune: Snd.detune }); }
        if (s % 4 === 0) { const root = [48, 53, 55, 48][(s / 8 | 0) % 4]; tone(mtof(root), t, d * 3, 'sine', 0.16, musBus, { detune: Snd.detune }); }
        if (s % 2 === 1) noise(t, 0.03, 'highpass', 6000, 1, 0.015, musBus);
      } },
    home: { bpm: 78, len: 32,
      play(s, t, d) {
        const chords = [[53, 57, 60, 64], [57, 60, 64, 67], [58, 62, 65, 69], [48, 55, 60, 64]];
        const ch = chords[(s / 8 | 0) % 4];
        const n = ch[[0, 1, 2, 3, 2, 1, 2, 3][s % 8]] + (s % 8 === 3 ? 12 : 0);
        tone(mtof(n), t, d * 2.5, 'sine', 0.15, musBus, { detune: Snd.detune });
        tone(mtof(n + 12), t, d * 1.5, 'triangle', 0.04, musBus, { detune: Snd.detune });
        if (s % 8 === 0) tone(mtof(ch[0] - 12), t, d * 7, 'sine', 0.14, musBus, { detune: Snd.detune });
        // a sweet music-box tune on top (it fades and goes a little sour as the creep level rises)
        const mel = [77,0,76,0,72,0,69,0, 76,0,72,0,76,0,81,0, 77,0,74,0,70,0,74,0, 72,0,76,0,79,0,0,0];
        const mn = mel[s % 32];
        if (mn) {
          const v = 0.085 * (1 - Snd.creep * 0.75), dt2 = Snd.detune - Math.random() * Snd.creep * 60;
          tone(mtof(mn), t, 1.7, 'sine', v, musBus, { detune: dt2 }); tone(mtof(mn) * 2.76, t, 0.35, 'sine', v * 0.18, musBus, { detune: dt2 });
        }
      } },
    calm: { bpm: 60, len: 32,
      play(s, t, d) {
        const chords = [[48, 55, 64], [45, 52, 60], [53, 60, 69], [55, 59, 62]];
        const ch = chords[(s / 8 | 0) % 4];
        if (s % 2 === 0) tone(mtof(ch[(s / 2 | 0) % 3] + 12), t, d * 3, 'sine', 0.13, musBus);
        if (s % 8 === 0) { ch.forEach((n) => tone(mtof(n - 12), t, d * 7.5, 'sine', 0.07, musBus)); }
      } },
    // creepy music box lullaby in a minor key (used in later levels)
    lullaby: { bpm: 70, len: 32,
      play(s, t, d) {
        const mel = [69,0,72,0,76,0,75,0, 76,0,72,0,69,0,0,0, 68,0,71,0,76,0,75,0, 76,0,71,0,68,0,0,0];
        const m = mel[s % 32];
        if (m) {
          const f = mtof(m + 12) * Math.pow(2, (Snd.detune - Math.random() * 20) / 1200);
          tone(f, t, 1.6, 'sine', 0.1 * Math.min(1, 0.3 + Snd.creep), musBus);
          tone(f * 2.76, t, 0.4, 'sine', 0.03, musBus);
        }
      } }
  };
  Snd.music = function (name) {
    if (!ctx) { musicName = name; return; }
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    musicName = name;
    if (!name || !M[name]) return;
    const def = M[name];
    step = 0; nextT = ctx.currentTime + 0.1;
    const stepDur = 60 / def.bpm / 2;
    musicTimer = setInterval(() => {
      if (!ctx) return;
      while (nextT < ctx.currentTime + 0.4) {
        if (nextT > ctx.currentTime - 0.5) def.play(step, nextT, stepDur);
        nextT += stepDur; step++;
      }
    }, 120);
  };
  Snd.musicVol = function (v) { if (musBus) musBus.gain.setTargetAtTime(v, ctx.currentTime, 0.3); };
  Snd.stopAll = function () { Snd.music(null); Snd.hum(false); };
})();
