// Swoosh — particles.js
// FX layer: object-pooled particles, additive blending, screen shake.
// All coordinates are board-canvas CSS px (same space as Renderer.cellToXY).
// No DOM access at import time — everything lives inside the FX class.

const PALETTE = {
  ruby:     ['#ff2d55', '#b3123a'],
  amber:    ['#ffb300', '#ff8f00'],
  emerald:  ['#00d97a', '#00a05a'],
  sapphire: ['#2e8bff', '#1259c3'],
  amethyst: ['#b44cff', '#7a1fd0'],
  pearl:    ['#f4f6ff', '#c0c9e0'],
  gold:     ['#ffd54a', '#ff8f00'],
  white:    ['#ffffff', '#ffd54a'],
};
const RAINBOW = ['#ff2d55', '#ffb300', '#00d97a', '#2e8bff', '#b44cff', '#f4f6ff'];

const POOL_CAP = 800;
const TAU = Math.PI * 2;
const R = Math.random;

function rand(a, b) { return a + R() * (b - a); }
function pick(arr) { return arr[(R() * arr.length) | 0]; }
function paletteOf(name) { return PALETTE[name] || PALETTE.gold; }

// Particle types (p.kind):
//  'glow'     soft additive dot (sparkle / ember / twinkle via flags)
//  'shard'    rotating solid quad (candy fragments)
//  'ring'     expanding (or contracting) stroked circle
//  'comet'    fast streak stretched along its velocity, optionally emits trail sparks
//  'arc'      jittering electric bolt from an origin
//  'confetti' fluttering paper rect (drawn source-over, not additive)

export class FX {
  constructor(fxCanvas) {
    this.canvas = fxCanvas;
    this.ctx = fxCanvas.getContext('2d');
    this.cssW = fxCanvas.width;
    this.cssH = fxCanvas.height;
    this.dpr = 1;

    // Object pool — preallocated, never grows.
    this.pool = new Array(POOL_CAP);
    for (let i = 0; i < POOL_CAP; i++) this.pool[i] = { active: false };
    this._free = [];
    for (let i = POOL_CAP - 1; i >= 0; i--) this._free.push(i);
    this._liveCount = 0;
    this._idleCleared = false;   // canvas already blank — skip idle repaints
    this._avgDt = 0.016;         // rolling frame-time avg → celebration budgets

    // Screen shake (trauma model: amplitude ∝ trauma², linear decay ≈ 400ms).
    this._trauma = 0;
    this._time = 0;
    this.shakeOffset = { x: 0, y: 0 };

    // Scheduled firework bursts: [{t, x, y, color}] (t counts down in seconds).
    this._queue = [];

    // Pre-rendered glow dot sprites, keyed by hex color (lazy).
    this._glowCache = new Map();
  }

  resize(cssW, cssH, dpr) {
    this.cssW = cssW;
    this.cssH = cssH;
    this.dpr = dpr;
    this.canvas.width = Math.max(1, Math.round(cssW * dpr));
    this.canvas.height = Math.max(1, Math.round(cssH * dpr));
    this.canvas.style.width = cssW + 'px';
    this.canvas.style.height = cssH + 'px';
    this._idleCleared = false;
  }

  // ---------------------------------------------------------------- update

  update(dt) {
    const dts = FX._dts(dt);
    this._time += dts;
    this._avgDt += (dts - this._avgDt) * 0.1;

    // Shake: trauma decays linearly over ~0.4s; offset is trauma² noise.
    if (this._trauma > 0) {
      this._trauma = Math.max(0, this._trauma - dts / 0.4);
      const s = this._trauma * this._trauma * 13;
      const t = this._time;
      this.shakeOffset.x = s * (Math.sin(t * 61.7) * 0.6 + Math.sin(t * 137.3 + 1.7) * 0.4);
      this.shakeOffset.y = s * (Math.cos(t * 53.1 + 0.9) * 0.6 + Math.sin(t * 149.9) * 0.4);
    } else {
      this.shakeOffset.x = 0;
      this.shakeOffset.y = 0;
    }

    // Fire scheduled firework bursts.
    if (this._queue.length) {
      const due = [];
      for (const e of this._queue) {
        e.t -= dts;
        if (e.t <= 0) due.push(e);
      }
      if (due.length) {
        this._queue = this._queue.filter(e => e.t > 0);
        for (const e of due) this._burst(e.x, e.y, e.color);
      }
    }

    // Integrate particles.
    for (let i = 0; i < POOL_CAP; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      if (p.delay > 0) { p.delay -= dts; continue; }
      p.age += dts;
      if (p.age >= p.life) { this._release(i); continue; }
      if (p.kind === 'ring' || p.kind === 'arc') continue; // no physics
      p.vy += p.g * dts;
      const drag = Math.pow(p.drag, dts * 60);
      p.vx *= drag;
      p.vy *= drag;
      p.x += p.vx * dts;
      p.y += p.vy * dts;
      p.rot += p.vr * dts;
      if (p.kind === 'confetti') {
        // Flutter: sway horizontally while drifting down.
        p.x += Math.sin(p.age * p.flut + p.seed) * 42 * dts;
      }
      if (p.kind === 'comet' && p.emit) {
        p.emitAcc += dts;
        while (p.emitAcc > 0.016) {
          p.emitAcc -= 0.016;
          this._spawn({
            kind: 'glow', x: p.x + rand(-2, 2), y: p.y + rand(-2, 2),
            vx: rand(-30, 30), vy: rand(-30, 30), g: 60, drag: 0.9,
            life: rand(0.22, 0.4), size: rand(2, 4), color: p.color,
          });
        }
      }
    }
  }

  // ---------------------------------------------------------------- render

  render() {
    // Idle: nothing live — clear once, then skip repaints entirely.
    if (this._liveCount === 0) {
      if (this._idleCleared) return;
      this._idleCleared = true;
    } else {
      this._idleCleared = false;
    }
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, this.cssW, this.cssH);

    // Pass 1: additive (glowy) particles.
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < POOL_CAP; i++) {
      const p = this.pool[i];
      if (!p.active || p.delay > 0 || p.kind === 'confetti') continue;
      this._draw(ctx, p);
    }

    // Pass 2: confetti (opaque paper reads better without additive wash-out).
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < POOL_CAP; i++) {
      const p = this.pool[i];
      if (!p.active || p.delay > 0 || p.kind !== 'confetti') continue;
      this._draw(ctx, p);
    }
    ctx.restore();
  }

  _draw(ctx, p) {
    const k = p.age / p.life;          // 0..1
    const fade = 1 - k;
    switch (p.kind) {
      case 'glow': {
        let a = fade * fade * (p.alpha ?? 1);
        if (p.tw) a *= 0.55 + 0.45 * Math.sin(p.age * 34 + p.seed); // twinkle flicker
        if (a <= 0.01) return;
        const spr = this._glow(p.color);
        const s = p.size * (p.grow ? 1 + k * p.grow : 1) * 2.6;
        ctx.globalAlpha = Math.min(1, a);
        ctx.drawImage(spr, p.x - s / 2, p.y - s / 2, s, s);
        ctx.globalAlpha = 1;
        break;
      }
      case 'shard': {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.min(1, fade * 1.4);
        const s = p.size * (0.5 + fade * 0.5);
        ctx.fillStyle = p.color;
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.fillStyle = p.color2;
        ctx.fillRect(-s / 2, 0, s, s / 2);
        ctx.restore();
        ctx.globalAlpha = 1;
        break;
      }
      case 'ring': {
        const ease = 1 - Math.pow(1 - k, 3); // ease-out expansion
        const r = p.size + (p.size2 - p.size) * ease;
        if (r <= 0.5) return;
        ctx.globalAlpha = fade * (p.alpha ?? 0.9);
        ctx.lineWidth = Math.max(1, p.lw * fade);
        ctx.strokeStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      }
      case 'comet': {
        const spd = Math.hypot(p.vx, p.vy) || 1;
        const len = Math.min(p.size * 7, spd * 0.05);
        const ang = Math.atan2(p.vy, p.vx);
        const spr = this._glow(p.color);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(ang);
        ctx.globalAlpha = Math.min(1, fade * 1.5);
        // Stretched streak body + hot round head.
        ctx.drawImage(spr, -len, -p.size, len * 1.25, p.size * 2);
        const hs = p.size * 2.4;
        ctx.drawImage(this._glow('#ffffff'), -hs / 2, -hs / 2, hs, hs);
        ctx.restore();
        ctx.globalAlpha = 1;
        break;
      }
      case 'arc': {
        // Jagged bolt re-jittered every frame — cheap electric crackle.
        const segs = 6;
        const ex = p.x + Math.cos(p.rot) * p.size2;
        const ey = p.y + Math.sin(p.rot) * p.size2;
        const nx = -Math.sin(p.rot), ny = Math.cos(p.rot);
        ctx.globalAlpha = fade * 0.9;
        for (let pass = 0; pass < 2; pass++) {
          ctx.strokeStyle = pass === 0 ? p.color : '#ffffff';
          ctx.lineWidth = pass === 0 ? 3.5 : 1.4;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          for (let s = 1; s < segs; s++) {
            const t = s / segs;
            const j = (R() - 0.5) * 16 * fade;
            ctx.lineTo(p.x + (ex - p.x) * t + nx * j, p.y + (ey - p.y) * t + ny * j);
          }
          ctx.lineTo(ex, ey);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        break;
      }
      case 'confetti': {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        // Fold illusion: width oscillates as the paper tumbles.
        const w = p.size * Math.max(0.25, Math.abs(Math.sin(p.age * 9 + p.seed)));
        ctx.globalAlpha = k > 0.82 ? (1 - k) / 0.18 : 1;
        ctx.fillStyle = p.color;
        ctx.fillRect(-w / 2, -p.size * 0.62, w, p.size * 1.24);
        ctx.restore();
        ctx.globalAlpha = 1;
        break;
      }
    }
  }

  // ---------------------------------------------------------------- effects

  /** Color-matched glowing shards + sparkles at a cleared tile. */
  matchBurst(x, y, colorName, count = 14) {
    const [c1, c2] = paletteOf(colorName);
    const nShard = Math.round(count * 0.55);
    const nSpark = Math.round(count * 0.55);
    for (let i = 0; i < nShard; i++) {
      const a = R() * TAU, sp = rand(70, 260);
      this._spawn({
        kind: 'shard', x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rand(20, 90),
        g: 460, drag: 0.9, life: rand(0.4, 0.75),
        size: rand(3.5, 6.5), rot: R() * TAU, vr: rand(-12, 12),
        color: c1, color2: c2,
      });
    }
    for (let i = 0; i < nSpark; i++) {
      const a = R() * TAU, sp = rand(40, 190);
      this._spawn({
        kind: 'glow', x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        g: 90, drag: 0.88, life: rand(0.3, 0.6),
        size: rand(2.5, 5), color: i % 3 === 0 ? '#ffffff' : c1, tw: i % 2 === 0,
      });
    }
    // Quick core flash.
    this._spawn({ kind: 'glow', x, y, vx: 0, vy: 0, g: 0, drag: 1, life: 0.16, size: 15, color: c1, alpha: 0.9 });
  }

  /** Converging sparkle implosion — a special candy being born. */
  specialCreate(x, y, colorName) {
    const [c1] = paletteOf(colorName);
    const n = 18;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + R() * 0.4;
      const r0 = rand(34, 54);
      const t = rand(0.24, 0.34);
      this._spawn({
        kind: 'glow',
        x: x + Math.cos(a) * r0, y: y + Math.sin(a) * r0,
        vx: -Math.cos(a) * (r0 / t), vy: -Math.sin(a) * (r0 / t),
        g: 0, drag: 1, life: t, size: rand(2.5, 4.5),
        color: i % 4 === 0 ? '#ffd54a' : c1,
      });
    }
    // Ring contracting inward, then a birth flash once everything lands.
    this._spawn({ kind: 'ring', x, y, life: 0.3, size: 48, size2: 5, lw: 3, color: c1, alpha: 0.8 });
    this._spawn({ kind: 'glow', x, y, delay: 0.26, life: 0.24, size: 20, grow: 0.6, color: '#ffffff', alpha: 0.95, vx: 0, vy: 0, g: 0, drag: 1 });
  }

  /** Striped candy: comet trails streaking both directions along a row/column. */
  lineBlast(x, y, dir, lengthPx) {
    const gold = PALETTE.gold[0];
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const sp = rand(950, 1350);
        const life = lengthPx / sp + 0.12;
        this._spawn({
          kind: 'comet', x, y,
          vx: dir === 'h' ? s * sp : rand(-14, 14),
          vy: dir === 'v' ? s * sp : rand(-14, 14),
          g: 0, drag: 1, life, delay: i * 0.03,
          size: rand(6, 9), color: i === 0 ? '#ffffff' : gold,
          emit: true, emitAcc: 0,
        });
      }
    }
    this._spawn({ kind: 'glow', x, y, vx: 0, vy: 0, g: 0, drag: 1, life: 0.2, size: 22, color: '#ffffff', alpha: 0.95 });
    this._spawn({ kind: 'ring', x, y, life: 0.25, size: 6, size2: 34, lw: 5, color: gold });
  }

  /** Wrapped candy: ring shockwave + ember burst. */
  wrapBlast(x, y, radiusPx) {
    this._spawn({ kind: 'ring', x, y, life: 0.38, size: 10, size2: radiusPx * 1.15, lw: 11, color: PALETTE.gold[0] });
    this._spawn({ kind: 'ring', x, y, delay: 0.07, life: 0.42, size: 6, size2: radiusPx * 0.9, lw: 6, color: '#ffffff', alpha: 0.7 });
    const embers = 26;
    for (let i = 0; i < embers; i++) {
      const a = R() * TAU, sp = rand(110, 340);
      this._spawn({
        kind: 'glow', x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rand(30, 110),
        g: 520, drag: 0.92, life: rand(0.5, 0.95),
        size: rand(2.5, 5.5), tw: true,
        color: pick(['#ffd54a', '#ff8f00', '#ff2d55', '#ffffff']),
      });
    }
    this._spawn({ kind: 'glow', x, y, vx: 0, vy: 0, g: 0, drag: 1, life: 0.22, size: 34, color: '#ffb300', alpha: 0.95 });
  }

  /** Color bomb: rainbow nova + electric arcs. */
  colorBombNova(x, y) {
    this._spawn({ kind: 'glow', x, y, vx: 0, vy: 0, g: 0, drag: 1, life: 0.32, size: 44, grow: 1.2, color: '#ffffff', alpha: 1 });
    RAINBOW.forEach((hex, i) => {
      this._spawn({ kind: 'ring', x, y, delay: i * 0.035, life: 0.45, size: 12, size2: 150 + i * 22, lw: 7, color: hex, alpha: 0.85 });
    });
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * TAU + R() * 0.2, sp = rand(160, 420);
      this._spawn({
        kind: 'glow', x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        g: 200, drag: 0.9, life: rand(0.45, 0.9),
        size: rand(3, 6), tw: i % 2 === 0, color: RAINBOW[i % RAINBOW.length],
      });
    }
    for (let i = 0; i < 7; i++) {
      this._spawn({
        kind: 'arc', x, y, life: rand(0.2, 0.32), delay: R() * 0.08,
        rot: R() * TAU, size2: rand(60, 115),
        color: pick(['#b44cff', '#2e8bff', '#f4f6ff']),
      });
    }
  }

  /** Multi-burst celebratory fireworks with gravity and twinkle. */
  fireworks(durationMs) {
    const n = Math.max(3, Math.round(durationMs / 220));
    for (let i = 0; i < n; i++) {
      this._queue.push({
        t: i * (durationMs / 1000 / n) * rand(0.75, 1.2),
        x: this.cssW * rand(0.14, 0.86),
        y: this.cssH * rand(0.1, 0.52),
        color: pick(RAINBOW),
      });
    }
  }

  _burst(x, y, color) {
    const n = this._avgDt > 0.025 ? 14 : 28; // halve on struggling devices
    this._spawn({ kind: 'glow', x, y, vx: 0, vy: 0, g: 0, drag: 1, life: 0.22, size: 26, color: '#ffffff', alpha: 0.95 });
    this._spawn({ kind: 'ring', x, y, life: 0.4, size: 8, size2: 78, lw: 4, color, alpha: 0.6 });
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + R() * 0.25, sp = rand(120, 320);
      this._spawn({
        kind: 'glow', x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        g: 270, drag: 0.93, life: rand(0.8, 1.5),
        size: rand(2.5, 5), tw: true,
        color: i % 5 === 0 ? '#ffffff' : color,
      });
    }
  }

  /** Fluttering confetti rain across the whole canvas. */
  confettiWin() {
    const n = this._avgDt > 0.025 ? 60 : 120; // halve on struggling devices
    const colors = [...RAINBOW, PALETTE.gold[0], PALETTE.gold[0]];
    for (let i = 0; i < n; i++) {
      this._spawn({
        kind: 'confetti',
        x: R() * this.cssW, y: -20 - R() * this.cssH * 0.35,
        vx: rand(-60, 60), vy: rand(50, 140),
        g: 230, drag: 0.985, life: rand(2.4, 3.4), delay: R() * 0.6,
        size: rand(5, 9), rot: R() * TAU, vr: rand(-7, 7),
        flut: rand(2, 5), color: pick(colors),
      });
    }
  }

  /** Screen shake, 0..1 intensity, ~400ms decay. Renderer reads shakeOffset. */
  shake(intensity) {
    this._trauma = Math.min(1, Math.max(this._trauma, intensity));
  }

  // ---------------------------------------------------------------- pool

  _spawn(props) {
    if (this._free.length === 0) return null; // cap reached — drop gracefully
    const i = this._free.pop();
    const p = this.pool[i];
    p.active = true;
    p.kind = props.kind;
    p.x = props.x; p.y = props.y;
    p.vx = props.vx || 0; p.vy = props.vy || 0;
    p.g = props.g || 0;
    p.drag = props.drag ?? 1;
    p.life = props.life;
    p.age = 0;
    p.delay = props.delay || 0;
    p.size = props.size || 4;
    p.size2 = props.size2 || 0;
    p.lw = props.lw || 3;
    p.rot = props.rot || 0;
    p.vr = props.vr || 0;
    p.color = props.color || '#ffffff';
    p.color2 = props.color2 || p.color;
    p.alpha = props.alpha;
    p.tw = !!props.tw;
    p.grow = props.grow || 0;
    p.emit = !!props.emit;
    p.emitAcc = 0;
    p.flut = props.flut || 3;
    p.seed = R() * TAU;
    this._liveCount++;
    return p;
  }

  _release(i) {
    this.pool[i].active = false;
    this._free.push(i);
    this._liveCount--;
  }

  /** Pre-rendered radial glow dot per color (drawn via drawImage — never shadowBlur). */
  _glow(hex) {
    let c = this._glowCache.get(hex);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = c.height = 48;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(24, 24, 0, 24, 24, 24);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.22, hex);
    grad.addColorStop(1, hex + '00'); // 8-digit hex → fully transparent edge
    g.fillStyle = grad;
    g.fillRect(0, 0, 48, 48);
    this._glowCache.set(hex, c);
    return c;
  }

  static _dts(dt) {
    let s = dt > 1.5 ? dt / 1000 : dt; // accept ms or seconds
    if (!(s > 0)) s = 0.016;
    return Math.min(s, 0.05);
  }
}
