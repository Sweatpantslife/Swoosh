// Swoosh — audio manager (contract: docs/ARCHITECTURE.md)
// Loads sfx mp3s from assets/audio/, falls back per-name to built-in WebAudio
// synth voices. The music loop streams via an <audio> element (routed through
// a MediaElementAudioSourceNode) rather than decodeAudioData — decoding the
// 76s mp3 would pin ~27MB of float32 PCM all session and front-load a 1.5MB
// download onto the first tap.
// init() and play() never throw. One console.info max about missing files.

const SFX_NAMES = [
  'sfx-swap', 'sfx-match-3', 'sfx-match-4',
  'sfx-special-striped', 'sfx-special-wrapped', 'sfx-color-bomb',
  'sfx-cascade-1', 'sfx-cascade-2', 'sfx-cascade-3',
  'sfx-level-win', 'sfx-level-fail', 'sfx-star-earned', 'sfx-button',
];

// C-major pentatonic ladder used by the synth voices (keeps everything in key).
const N = {
  C3: 130.81, A2: 110.0, E3: 164.81, G3: 196.0, C4: 261.63, D4: 293.66,
  E4: 329.63, G4: 392.0, A4: 440.0, C5: 523.25, D5: 587.33, E5: 659.25,
  G5: 783.99, A5: 880.0, C6: 1046.5, D6: 1174.66, E6: 1318.51, G6: 1567.98,
  A6: 1760.0, C7: 2093.0,
};

export class AudioMan {
  constructor() {
    this.musicOn = true;
    this.sfxOn = true;
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.buffers = new Map();
    this._noiseBuf = null;
    this._bgmEl = null;      // HTMLAudioElement streaming the music loop
    this._bgmNode = null;    // MediaElementAudioSourceNode → musicGain
    this._bgmPlaying = false;
    this._pad = null;
    this._initPromise = null;
    this._loaded = false;
    this._musicPending = false;
  }

  // ---- lifecycle -----------------------------------------------------------

  async init() {
    if (this._initPromise) return this._initPromise;
    this._initPromise = this._initInner().catch(() => {});
    return this._initPromise;
  }

  async _initInner() {
    try {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 1;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.35;
      this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.9;
      this.sfxGain.connect(this.master);
      if (this.ctx.state === 'suspended') await this.ctx.resume().catch(() => {});
    } catch {
      this.ctx = null;
      return;
    }

    // Music: streamed, never decoded to a full PCM buffer.
    try {
      const el = new Audio();
      el.loop = true;
      el.preload = 'none'; // nothing downloads until music actually starts
      el.src = 'assets/audio/bgm-main-loop.mp3';
      el.addEventListener('error', () => {
        const wasPlaying = this._bgmPlaying;
        this._teardownBgm();
        if (wasPlaying && this.musicOn && !this._pad) this._startPad();
      }, { once: true });
      this._bgmNode = this.ctx.createMediaElementSource(el);
      this._bgmNode.connect(this.musicGain);
      this._bgmEl = el;
    } catch { /* no <audio> support — synth pad fallback */ }

    const missing = [];
    await Promise.all(SFX_NAMES.map(async (name) => {
      try {
        const res = await fetch(`assets/audio/${name}.mp3`);
        if (!res.ok) throw new Error('http');
        const raw = await res.arrayBuffer();
        const buf = await this.ctx.decodeAudioData(raw);
        this.buffers.set(name, buf);
      } catch {
        missing.push(name);
      }
    }));
    this._loaded = true;
    if (missing.length) {
      console.info(`[audio] synth fallback for: ${missing.join(', ')}`);
    }
    if (this._musicPending && this.musicOn) {
      this._musicPending = false;
      this.startMusic();
    }
  }

  _resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // ---- public API ----------------------------------------------------------

  play(name) {
    try {
      if (!this.ctx) return;
      if (name === 'bgm-main-loop') { this.startMusic(); return; }
      if (!this.sfxOn) return;
      this._resume();
      const buf = this.buffers.get(name);
      if (buf) {
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        src.connect(this.sfxGain);
        src.start();
      } else {
        this._synth(name);
      }
    } catch { /* never throws */ }
  }

  startMusic() {
    try {
      if (!this.ctx || !this.musicOn) return;
      if (this._bgmPlaying || this._pad) return;
      if (!this._loaded) { this._musicPending = true; return; }
      this._resume();
      if (this._bgmEl) {
        this._bgmPlaying = true;
        this._bgmEl.play().catch((err) => {
          this._bgmPlaying = false;
          try {
            if (err && err.name === 'NotAllowedError') {
              // Autoplay-blocked: retry on the next user gesture.
              window.addEventListener('pointerdown', () => {
                if (this.musicOn) this.startMusic();
              }, { once: true });
            } else if (this.musicOn && !this._pad) {
              // File missing/undecodable — same synth-pad fallback as before.
              this._teardownBgm();
              this._startPad();
            }
          } catch { /* never throws */ }
        });
        const t = this.ctx.currentTime;
        this.musicGain.gain.cancelScheduledValues(t);
        this.musicGain.gain.setValueAtTime(0.0001, t);
        this.musicGain.gain.exponentialRampToValueAtTime(0.35, t + 1.2);
      } else {
        this._startPad();
      }
    } catch { /* never throws */ }
  }

  stopMusic() {
    try {
      this._musicPending = false;
      if (this._bgmEl) {
        try { this._bgmEl.pause(); } catch { /* ok */ }
        try { this._bgmEl.currentTime = 0; } catch { /* not seekable yet */ }
      }
      this._bgmPlaying = false;
      if (this._pad) {
        for (const node of this._pad) {
          try { if (typeof node.stop === 'function') node.stop(); } catch { /* ok */ }
          try { node.disconnect(); } catch { /* ok */ }
        }
        this._pad = null;
      }
    } catch { /* never throws */ }
  }

  /** Drop the streamed-bgm element for good (load failure) — pad takes over. */
  _teardownBgm() {
    this._bgmPlaying = false;
    if (this._bgmEl) {
      try { this._bgmEl.pause(); } catch { /* ok */ }
      this._bgmEl = null;
    }
    if (this._bgmNode) {
      try { this._bgmNode.disconnect(); } catch { /* ok */ }
      this._bgmNode = null;
    }
  }

  setMusicOn(b) {
    this.musicOn = !!b;
    if (this.musicOn) this.startMusic();
    else this.stopMusic();
  }

  setSfxOn(b) {
    this.sfxOn = !!b;
  }

  // ---- synth fallback: ambient pad music ------------------------------------
  // Two soft chords (Cadd9 / Am7) crossfading via slow LFOs through a drifting
  // lowpass — a barely-there velvet-lounge hum. All nodes self-running.

  _startPad() {
    const ctx = this.ctx;
    const nodes = [];
    const padOut = ctx.createGain();
    padOut.gain.value = 0.12;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    filter.Q.value = 0.4;
    padOut.connect(filter);
    filter.connect(this.musicGain);
    nodes.push(padOut, filter);

    // filter drift
    const fLfo = ctx.createOscillator();
    fLfo.frequency.value = 0.03;
    const fLfoGain = ctx.createGain();
    fLfoGain.gain.value = 260;
    fLfo.connect(fLfoGain);
    fLfoGain.connect(filter.frequency);
    fLfo.start();
    nodes.push(fLfo, fLfoGain);

    const chords = [
      { freqs: [N.C3, N.G3, N.E4, N.D4], phase: 1 },   // Cadd9
      { freqs: [N.A2, N.E3, N.C4, N.G4], phase: -1 },  // Am7
    ];
    const xLfo = ctx.createOscillator();
    xLfo.frequency.value = 0.04; // full crossfade cycle ~25s
    xLfo.start();
    nodes.push(xLfo);

    for (const chord of chords) {
      const cGain = ctx.createGain();
      cGain.gain.value = 0.5;
      const xDepth = ctx.createGain();
      xDepth.gain.value = 0.45 * chord.phase;
      xLfo.connect(xDepth);
      xDepth.connect(cGain.gain);
      cGain.connect(padOut);
      nodes.push(cGain, xDepth);
      for (const f of chord.freqs) {
        for (const det of [-3, 3]) { // gentle chorus
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.value = f;
          osc.detune.value = det;
          const oGain = ctx.createGain();
          oGain.gain.value = 0.11;
          osc.connect(oGain);
          oGain.connect(cGain);
          osc.start();
          nodes.push(osc, oGain);
        }
      }
    }
    this._pad = nodes;
  }

  // ---- synth fallback: sfx voices -------------------------------------------

  _synth(name) {
    const t = this.ctx.currentTime + 0.01;
    switch (name) {
      case 'sfx-button': this._vButton(t); break;
      case 'sfx-swap': this._vWhoosh(t, 0.16, 500, 1700, 0.28); break;
      case 'sfx-match-3': this._vPop(t, 620, 0.5); break;
      case 'sfx-match-4': this._vPop(t, 760, 0.6, true); break;
      case 'sfx-cascade-1': this._vPlucks(t, [N.E5, N.G5], 0.06, 0.4); break;
      case 'sfx-cascade-2': this._vPlucks(t, [N.G5, N.C6, N.D6], 0.055, 0.42); break;
      case 'sfx-cascade-3': this._vPlucks(t, [N.C6, N.D6, N.E6, N.G6], 0.05, 0.44); break;
      case 'sfx-special-striped':
        this._vWhoosh(t, 0.36, 300, 2600, 0.4, 3);
        this._tone({ t, freq: 300, end: 900, type: 'sine', dur: 0.3, vol: 0.14 });
        break;
      case 'sfx-special-wrapped':
        this._vThump(t, 180, 50, 0.4, 0.8);
        this._vPlucks(t + 0.05, [N.C6, N.E6, N.G6], 0.05, 0.22);
        this._vWhoosh(t, 0.25, 1200, 3500, 0.12, 1);
        break;
      case 'sfx-color-bomb':
        this._vThump(t, 130, 36, 0.55, 1.0);
        this._vPlucks(t + 0.06, [N.C5, N.E5, N.G5, N.C6, N.E6, N.G6], 0.055, 0.26);
        this._vWhoosh(t, 0.5, 400, 4500, 0.22, 2);
        break;
      case 'sfx-level-win': this._vWin(t); break;
      case 'sfx-star-earned':
        this._vPlucks(t, [N.C6, N.E6, N.G6], 0.07, 0.42);
        this._vWhoosh(t + 0.12, 0.22, 3000, 6000, 0.08, 1);
        break;
      case 'sfx-level-fail': this._vFail(t); break;
      default: this._vPop(t, 500, 0.3); break;
    }
  }

  // one shared 1s white-noise buffer
  _noise() {
    if (!this._noiseBuf) {
      const len = this.ctx.sampleRate;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
      this._noiseBuf = buf;
    }
    return this._noiseBuf;
  }

  // enveloped oscillator: freq glides to `end` over dur
  _tone({ t, freq, end = freq, type = 'sine', dur = 0.2, vol = 0.3, attack = 0.005 }) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (end !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(end, 20), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  // filtered noise sweep (whoosh / sparkle-air)
  _vWhoosh(t, dur, from, to, vol, q = 1.4) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this._noise();
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.Q.value = q;
    filt.frequency.setValueAtTime(from, t);
    filt.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(this.sfxGain);
    src.start(t);
    src.stop(t + dur + 0.03);
  }

  // soft filtered pop for matches; `bright` adds a sweeter two-tone tail
  _vPop(t, freq, vol, bright = false) {
    this._tone({ t, freq, end: freq * 0.3, type: 'sine', dur: 0.1, vol });
    // tiny air puff
    this._vWhoosh(t, 0.07, 900, 500, vol * 0.25, 0.8);
    // musical hint on top
    this._pluck(t + 0.015, bright ? N.C6 : N.G5, 0.18, vol * 0.28);
    if (bright) this._pluck(t + 0.06, N.E6, 0.2, vol * 0.22);
  }

  // single decaying pluck through a lowpass — the pentatonic voice
  _pluck(t, freq, dur = 0.3, vol = 0.35) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(freq * 5, t);
    filt.frequency.exponentialRampToValueAtTime(freq * 1.4, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(filt);
    filt.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  _vPlucks(t, freqs, stagger, vol) {
    freqs.forEach((f, i) => this._pluck(t + i * stagger, f, 0.32, vol));
  }

  // deep thump (pitch-dropping sine + a click of noise)
  _vThump(t, from, to, dur, vol) {
    this._tone({ t, freq: from, end: to, type: 'sine', dur, vol, attack: 0.003 });
    this._vWhoosh(t, 0.06, 300, 120, vol * 0.3, 0.7);
  }

  _vButton(t) {
    this._tone({ t, freq: 1400, end: 900, type: 'triangle', dur: 0.05, vol: 0.22 });
    this._vWhoosh(t, 0.03, 3200, 2400, 0.08, 1);
  }

  // ascending sparkle arpeggio + closing chord
  _vWin(t) {
    const run = [N.C5, N.E5, N.G5, N.C6, N.E6, N.G6];
    run.forEach((f, i) => this._pluck(t + i * 0.09, f, 0.4, 0.4));
    const chordT = t + run.length * 0.09 + 0.05;
    [N.C5, N.E5, N.G5, N.C6].forEach((f) => this._pluck(chordT, f, 0.9, 0.3));
    this._vWhoosh(chordT, 0.5, 2500, 6000, 0.1, 1);
  }

  // gentle descending phrase, soft and sympathetic
  _vFail(t) {
    const run = [N.G4, N.E4, N.D4, N.C4];
    run.forEach((f, i) => this._pluck(t + i * 0.18, f, 0.5, 0.3));
    this._tone({ t, freq: N.C3, type: 'sine', dur: 1.0, vol: 0.12, attack: 0.1 });
  }
}
