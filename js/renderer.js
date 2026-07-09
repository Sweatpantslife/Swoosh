// Swoosh — renderer.js
// Canvas board renderer: per-tile springs, staggered gravity, squash & stretch,
// pre-rendered glow sprites (never per-frame shadowBlur), felt cell backgrounds,
// jelly/lock overlays, selection ring, hint pulse.
// playSteps() OWNS the resolution timeline: it invokes fx.* and audio.play()
// itself at the exact animation moments (per the step→effect mapping policy in
// the main.js contract section) and reports back through hooks.
// No DOM access at import time — everything lives inside the Renderer class.

const COLOR_NAMES = ['ruby', 'amber', 'emerald', 'sapphire', 'amethyst', 'pearl'];
const PALETTE = {
  ruby:     ['#ff2d55', '#b3123a'],
  amber:    ['#ffb300', '#ff8f00'],
  emerald:  ['#00d97a', '#00a05a'],
  sapphire: ['#2e8bff', '#1259c3'],
  amethyst: ['#b44cff', '#7a1fd0'],
  pearl:    ['#f4f6ff', '#c0c9e0'],
};
const GOLD = '#ffd54a';
const TAU = Math.PI * 2;

// Spring tuned per contract: stiffness ≈220, damping ≈16, mass 1 → visible
// bouncy overshoot; a one-cell swap settles with a ~180ms "feel".
class Axis {
  constructor(v, k = 220, d = 16) {
    this.p = v; this.v = 0; this.t = v; this.k = k; this.d = d;
  }
  snap(v) { this.p = v; this.t = v; this.v = 0; }
  step(dt) {
    // Semi-implicit Euler with ≤8ms substeps for stability.
    const n = Math.max(1, Math.ceil(dt / 0.008));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      this.v += (-this.k * (this.p - this.t) - this.d * this.v) * h;
      this.p += this.v * h;
    }
  }
  get settled() { return Math.abs(this.p - this.t) < 0.15 && Math.abs(this.v) < 2; }
}

function easeInQuad(t) { return t * t; }
function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }

function roundRectPath(ctx, x, y, w, h, r) {
  if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export class Renderer {
  constructor(boardCanvas, sprites) {
    this.canvas = boardCanvas;
    this.ctx = boardCanvas.getContext('2d');
    this.sprites = sprites || new Map();

    this.board = null;
    this.layout = null;            // {cell, ox, oy}
    this.cssW = 0; this.cssH = 0; this.dpr = 1;

    this.tiles = new Map();        // id → tile visual
    this.grid = [];                // grid[r][c] = tile | null (renderer's logical snapshot)
    this.jellyLocal = [];          // renderer copy, decremented as steps play
    this.dying = [];               // pop-out tiles no longer on the grid
    this.lockBreaks = [];          // {x, y, t} cage-shatter overlays

    this._selected = null;
    this._hint = null;
    this._hintT = 0;
    this._t = 0;                   // ms clock from render()
    this._fxRef = null;            // last fx passed to playSteps (for shakeOffset)
    this._animating = false;
    this._lastWaveCleared = 0;     // previous wave size → scales the cascade beat
    this._staticDrawn = false;     // idle skip: board already painted this pose
    this._modalIdle = false;       // win/fail modal covers the board — stop repainting

    this._boardLayer = null;       // pre-rendered felt cells
    this._pre = null;              // pre-rendered glow/stripe/wrap/sparkle sprites
  }

  // ------------------------------------------------------------ public API

  setBoard(board) {
    this.board = board;
    this.dying.length = 0;
    this.lockBreaks.length = 0;
    this._selected = null;
    this._hint = null;
    this._modalIdle = false;
    this._staticDrawn = false;
    if (this.cssW > 0) {
      this._computeLayout();
      this._syncFromBoard(true);
      this._renderBoardLayer();
    } else {
      this._pendingSync = true; // resize() hasn't happened yet — defer
    }
  }

  resize(cssW, cssH, dpr) {
    this.cssW = cssW; this.cssH = cssH; this.dpr = dpr;
    this._staticDrawn = false;
    this.canvas.width = Math.max(1, Math.round(cssW * dpr));
    this.canvas.height = Math.max(1, Math.round(cssH * dpr));
    this.canvas.style.width = cssW + 'px';
    this.canvas.style.height = cssH + 'px';
    if (this.board) {
      this._computeLayout();
      this._buildPrerenders();
      this._renderBoardLayer();
      if (this._pendingSync) {
        this._pendingSync = false;
        this._syncFromBoard(true);
      }
      // Snap every live tile to its (possibly rescaled) cell position.
      for (const [id, tile] of this.tiles) {
        const at = this._findTile(id);
        if (at) { const p = this.cellToXY(at); tile.ax.snap(p.x); tile.ay.snap(p.y); }
      }
    }
  }

  cellToXY({ r, c }) {
    const L = this.layout;
    return { x: L.ox + (c + 0.5) * L.cell, y: L.oy + (r + 0.5) * L.cell };
  }

  pickCell(clientX, clientY) {
    // Arguments are canvas-relative CSS px per contract.
    const L = this.layout;
    // L.cell can be 0 if the container was resized while hidden; the resulting
    // NaN r/c would slip past the bounds check and crash on mask[r][c].
    if (!L || L.cell <= 0 || !this.board) return null;
    const c = Math.floor((clientX - L.ox) / L.cell);
    const r = Math.floor((clientY - L.oy) / L.cell);
    if (r < 0 || c < 0 || r >= this.board.rows || c >= this.board.cols) return null;
    if (!this.board.mask[r][c]) return null;
    return { r, c };
  }

  setSelected(cell) { this._selected = cell || null; this._staticDrawn = false; }

  showHint(move) { this._hint = move || null; this._hintT = this._t; this._staticDrawn = false; }

  // ------------------------------------------------------------ timeline

  /**
   * Animate a full resolution. Drives ALL step timing; fires fx + audio at the
   * exact right moments. hooks: {onMatchStep(step), onEnd(step)}.
   */
  async playSteps(steps, fx, audio, hooks = {}) {
    // Unmount/zero-size guard: bail before touching layout-dependent step
    // handlers. Early return from an async fn still resolves the promise, so
    // main.js's await never hangs.
    if (!this.layout || !this.board || !steps) return;
    this._fxRef = fx || this._fxRef;
    this.showHint(null);
    this.setSelected(null);
    this._modalIdle = false;
    this._animating = true;
    try {
      for (const step of steps) {
        switch (step.type) {
          case 'swap':      await this._stepSwap(step, audio); break;
          case 'swap-fail': await this._stepSwapFail(step, audio); break;
          case 'special':   await this._stepSpecial(step, fx, audio); break;
          case 'match':     await this._stepMatch(step, fx, audio, hooks); break;
          case 'gravity':   await this._stepGravity(step); break;
          case 'shuffle':   await this._stepShuffle(step, audio); break;
          case 'end':       await this._stepEnd(step, fx, audio, hooks); break;
        }
      }
      await Renderer._sleep(120); // let the last springs breathe
    } finally {
      this._animating = false;
      this._syncFromBoard(false);
    }
  }

  async _stepSwap(step, audio) {
    audio?.play('sfx-swap');
    const ta = this._at(step.a), tb = this._at(step.b);
    this._put(step.a, tb); this._put(step.b, ta);
    const pa = this.cellToXY(step.a), pb = this.cellToXY(step.b);
    if (ta) { ta.ax.t = pb.x; ta.ay.t = pb.y; this._pulseScale(ta, 1.1); }
    if (tb) { tb.ax.t = pa.x; tb.ay.t = pa.y; this._pulseScale(tb, 1.06); }
    await Renderer._sleep(185);
  }

  async _stepSwapFail(step, audio) {
    audio?.play('sfx-swap');
    const ta = this._at(step.a), tb = this._at(step.b);
    const pa = this.cellToXY(step.a), pb = this.cellToXY(step.b);
    // Push 55% of the way, then spring back home — reads as a refused wiggle.
    const lerp = (u, v, k) => u + (v - u) * k;
    if (ta) { ta.ax.t = lerp(pa.x, pb.x, 0.55); ta.ay.t = lerp(pa.y, pb.y, 0.55); }
    if (tb) { tb.ax.t = lerp(pb.x, pa.x, 0.55); tb.ay.t = lerp(pb.y, pa.y, 0.55); }
    await Renderer._sleep(95);
    if (ta) { ta.ax.t = pa.x; ta.ay.t = pa.y; this._wiggle(ta); }
    if (tb) { tb.ax.t = pb.x; tb.ay.t = pb.y; this._wiggle(tb); }
    await Renderer._sleep(230);
  }

  async _stepSpecial(step, fx, audio) {
    const { kind, origin, targets } = step;
    const o = this.cellToXY(origin);
    const cell = this.layout.cell;
    const boardW = this.board.cols * cell, boardH = this.board.rows * cell;
    const combo = kind.includes('+');

    // Telegraph: brighten the doomed targets a beat before they clear.
    for (const t of targets || []) {
      const tile = this._at(t);
      if (tile) tile.flashT = 1;
    }

    let wait = 180;
    switch (kind) {
      case 'h':
      case 'v':
        fx?.lineBlast(o.x, o.y, kind, kind === 'h' ? boardW : boardH);
        audio?.play('sfx-special-striped');
        wait = 170;
        break;
      case 'wrap':
        fx?.wrapBlast(o.x, o.y, cell * 1.7);
        audio?.play('sfx-special-wrapped');
        wait = 210;
        break;
      case 'bomb':
        fx?.colorBombNova(o.x, o.y);
        audio?.play('sfx-color-bomb');
        wait = 320;
        break;
      case 'stripe+stripe':
        fx?.lineBlast(o.x, o.y, 'h', boardW);
        fx?.lineBlast(o.x, o.y, 'v', boardH);
        audio?.play('sfx-special-striped');
        wait = 220;
        break;
      case 'stripe+wrap':
        for (let d = -1; d <= 1; d++) {
          fx?.lineBlast(o.x, o.y + d * cell, 'h', boardW);
          fx?.lineBlast(o.x + d * cell, o.y, 'v', boardH);
        }
        audio?.play('sfx-special-striped');
        audio?.play('sfx-special-wrapped');
        wait = 260;
        break;
      case 'wrap+wrap':
        fx?.wrapBlast(o.x, o.y, cell * 3);
        audio?.play('sfx-special-wrapped');
        wait = 280;
        break;
      case 'bomb+stripe': {
        fx?.colorBombNova(o.x, o.y);
        audio?.play('sfx-color-bomb');
        // The converted candies fire as stripes — echo a few line blasts.
        const picks = (targets || []).slice(0, 8);
        picks.forEach((t, i) => {
          const p = this.cellToXY(t);
          setTimeout(() => {
            fx?.lineBlast(p.x, p.y, i % 2 ? 'h' : 'v', i % 2 ? boardW : boardH);
          }, 120 + i * 45);
        });
        audio?.play('sfx-special-striped');
        wait = 420;
        break;
      }
      case 'bomb+wrap':
        fx?.colorBombNova(o.x, o.y);
        fx?.wrapBlast(o.x, o.y, cell * 2.4);
        audio?.play('sfx-color-bomb');
        wait = 360;
        break;
      case 'bomb+bomb':
        fx?.colorBombNova(o.x, o.y);
        fx?.fireworks(1500);
        audio?.play('sfx-color-bomb');
        wait = 520;
        break;
    }
    if (combo) fx?.shake(kind === 'bomb+bomb' ? 1 : 0.6);
    else if (kind === 'bomb') fx?.shake(0.35);
    else fx?.shake(0.25); // single stripe/wrap detonation — middle of the trauma ladder
    await Renderer._sleep(wait);
  }

  async _stepMatch(step, fx, audio, hooks) {
    // Anticipation beat between cascade waves (research: spend the big
    // audio-visual build on ~0.5s) — longer after a big previous wave.
    if (step.cascade >= 1) {
      await Renderer._sleep(this._lastWaveCleared >= 8 ? 500 : 300);
    }

    hooks.onMatchStep?.(step);

    // Audio mapping (main.js policy): wave 0 → match-3/4; chains → rising cascades.
    if (step.cascade === 0) {
      const big = step.cleared.length >= 4 || step.created.length > 0;
      audio?.play(big ? 'sfx-match-4' : 'sfx-match-3');
    } else {
      audio?.play(`sfx-cascade-${Math.min(step.cascade, 3)}`);
    }

    // Clear pops + color-matched bursts (budgeted for monster waves; tighter
    // still on large boards, where raster overdraw dominates the frame).
    const bigBoard = this.board.rows * this.board.cols > 64;
    const burstCount = step.cleared.length > 14 ? (bigBoard ? 6 : 8) : (bigBoard ? 10 : 14);
    for (const cl of step.cleared) {
      const tile = this._at(cl);
      const p = this.cellToXY(cl);
      fx?.matchBurst(p.x, p.y, COLOR_NAMES[cl.color] || 'gold', burstCount);
      if (tile) {
        this._put(cl, null);
        tile.pop = 0.0001; // start pop-out
        this.dying.push(tile);
        this.tiles.delete(tile.id);
      }
    }

    // Newly-born specials: implosion sparkle + a proud pulse (candy survives).
    for (const cr of step.created) {
      const tile = this._at(cr);
      const p = this.cellToXY(cr);
      fx?.specialCreate(p.x, p.y, COLOR_NAMES[cr.color] || 'gold');
      if (tile) {
        tile.special = cr.special;
        tile.glowPhase = Math.random() * TAU;
        this._pulseScale(tile, 1.28);
      }
    }

    // Cage shatter: lock lifts off with a pearl glitter puff.
    for (const lb of step.locksBroken) {
      const tile = this._at(lb);
      const p = this.cellToXY(lb);
      if (tile) tile.lock = 0;
      this.lockBreaks.push({ x: p.x, y: p.y, t: 0 });
      fx?.matchBurst(p.x, p.y, 'pearl', 8);
    }

    // Jelly squish.
    for (const jc of step.jellyCleared) {
      if (this.jellyLocal[jc.r]?.[jc.c] > 0) this.jellyLocal[jc.r][jc.c]--;
      const p = this.cellToXY(jc);
      fx?.matchBurst(p.x, p.y + this.layout.cell * 0.18, 'amethyst', 7);
    }

    // Special creation on the player's own move gets a small kick.
    if (step.cascade === 0 && step.created.length > 0) fx?.shake(0.2);

    // Big waves rattle the table.
    if (step.cleared.length >= 12) {
      fx?.shake(Math.min(1, 0.4 + step.cleared.length / 40));
    }

    this._lastWaveCleared = step.cleared.length;
    await Renderer._sleep(170); // hold so the pop is readable
  }

  async _stepGravity(step) {
    const cell = this.layout.cell;
    // Column stagger: a ripple, left→right; fall time ≈28ms per cell of drop.
    const cols = [...new Set([
      ...step.moves.map(m => m.to.c),
      ...step.spawns.map(s => s.to.c),
    ])].sort((a, b) => a - b);
    const colDelay = new Map(cols.map((c, i) => [c, i * 0.013]));

    let maxT = 0;
    const startFall = (tile, fromY, to, dist) => {
      const delay = colDelay.get(to.c) || 0;
      const dur = 0.07 + dist * 0.028;
      const target = this.cellToXY(to);
      tile.ax.snap(target.x);
      tile.fall = { fromY, toY: target.y, delay, dur, t: 0, dist };
      tile.ay.snap(fromY);
      maxT = Math.max(maxT, delay + dur);
    };

    // Detach movers first so positions never collide mid-shuffle of the grid.
    const movers = [];
    for (const m of step.moves) {
      const tile = this.tiles.get(m.id) || this._at(m.from);
      if (!tile) continue;
      if (this._at(m.from) === tile) this._put(m.from, null);
      movers.push({ tile, m });
    }
    for (const { tile, m } of movers) {
      this._put(m.to, tile);
      startFall(tile, tile.ay.p, m.to, Math.max(1, m.to.r - m.from.r));
    }
    for (const s of step.spawns) {
      const tile = this._makeTile(s.id, s.color, s.special, 0, s.to);
      this._put(s.to, tile);
      this.tiles.set(s.id, tile);
      // Clamp the fall start to this spawn's own column segment (contiguous
      // masked run containing the landing cell), so the tile never traverses
      // holes or the occupied upper segment visibly.
      let segTop = s.to.r;
      while (segTop > 0 && this.board.mask[segTop - 1][s.to.c]) segTop--;
      const fromY = Math.max(
        this.layout.oy + (s.fromRow + 0.5) * cell,
        this.layout.oy + segTop * cell - cell * 0.86,
      );
      startFall(tile, fromY, s.to, Math.max(1, s.to.r - s.fromRow));
    }

    await Renderer._sleep(maxT * 1000 + 150); // + landing bounce
  }

  async _stepShuffle(step, audio) {
    audio?.play('sfx-swap');
    // Lift all cells, re-target with tiny per-tile delays — a glittering ripple.
    const entries = [];
    for (const mv of step.cells) {
      const tile = this.tiles.get(mv.id) || this._at(mv.from);
      if (!tile) continue;
      if (this._at(mv.from) === tile) this._put(mv.from, null);
      entries.push({ tile, mv });
    }
    entries.forEach(({ tile, mv }, i) => {
      this._put(mv.to, tile);
      const p = this.cellToXY(mv.to);
      setTimeout(() => {
        tile.ax.t = p.x; tile.ay.t = p.y;
        this._pulseScale(tile, 1.12);
      }, i * 9);
    });
    await Renderer._sleep(entries.length * 9 + 480);
  }

  async _stepEnd(step, fx, audio, hooks) {
    this._syncFromBoard(false);
    if (step.win) {
      audio?.play('sfx-level-win');
      fx?.confettiWin();
      fx?.fireworks(2600);
    } else if (step.fail) {
      audio?.play('sfx-level-fail');
    }
    // The win/fail modal covers the board — stop repainting tiles under it.
    this._modalIdle = !!(step.win || step.fail);
    hooks.onEnd?.(step);
  }

  // ------------------------------------------------------------ frame

  render(tMs, dt) {
    const ctx = this.ctx;
    if (!this.board || !this.layout) return;
    this._t = tMs;
    const dts = Renderer._dts(dt);
    this._update(dts);

    // Table shake — read from fx every frame.
    const sh = this._fxRef ? this._fxRef.shakeOffset : null;

    // Idle skip: no timeline, no shake, and nothing animated on the board
    // (or a win/fail modal covers it) — paint the pose once, then stop.
    const shaking = !!sh && (sh.x !== 0 || sh.y !== 0);
    if (!this._animating && !shaking && (this._modalIdle || !this._hasActiveVisuals())) {
      if (this._staticDrawn) return;
      this._staticDrawn = true;
    } else {
      this._staticDrawn = false;
    }

    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.cssW, this.cssH);

    if (sh) ctx.translate(sh.x, sh.y);

    // 1. Felt cells (pre-rendered static layer).
    if (this._boardLayer) ctx.drawImage(this._boardLayer, 0, 0, this.cssW, this.cssH);

    // 2. Jelly gel sits IN the cell, under the candy.
    this._drawJelly(ctx, tMs);

    // 3. Hint pulse under tiles.
    this._drawHint(ctx, tMs);

    // 4. Tiles: clip so spawn-drops slide in from under the top edge.
    ctx.save();
    ctx.beginPath();
    const L = this.layout;
    ctx.rect(L.ox - 8, L.oy - 2, this.board.cols * L.cell + 16, this.board.rows * L.cell + 14);
    ctx.clip();
    for (const tile of this.tiles.values()) this._drawTile(ctx, tile, tMs);
    for (const tile of this.dying) this._drawTile(ctx, tile, tMs);
    // Cage-shatter overlays.
    for (const lb of this.lockBreaks) this._drawLockBreak(ctx, lb);
    ctx.restore();

    // 5. Selection ring on top.
    this._drawSelection(ctx, tMs);

    ctx.restore();
  }

  /** Anything on the board that animates frame-to-frame while no timeline runs. */
  _hasActiveVisuals() {
    if (this.dying.length || this.lockBreaks.length) return true;
    if (this._selected || this._hint) return true;
    for (const row of this.jellyLocal) {
      for (let c = 0; c < row.length; c++) if (row[c] > 0) return true; // gel wobbles
    }
    for (const tile of this.tiles.values()) {
      if (tile.special || tile.fall || tile.pop > 0 || tile.flashT > 0) return true;
      if (!tile.ax.settled || !tile.ay.settled) return true;
      if (Math.abs(tile.sx.p - 1) > 0.01 || Math.abs(tile.sx.v) > 0.1) return true;
      if (Math.abs(tile.sy.p - 1) > 0.01 || Math.abs(tile.sy.v) > 0.1) return true;
    }
    return false;
  }

  _update(dts) {
    for (const tile of this.tiles.values()) this._updateTile(tile, dts);
    for (let i = this.dying.length - 1; i >= 0; i--) {
      const tile = this.dying[i];
      tile.pop += dts;
      if (tile.pop >= 0.18) this.dying.splice(i, 1);
    }
    for (let i = this.lockBreaks.length - 1; i >= 0; i--) {
      this.lockBreaks[i].t += dts;
      if (this.lockBreaks[i].t >= 0.35) this.lockBreaks.splice(i, 1);
    }
  }

  _updateTile(tile, dts) {
    if (tile.fall) {
      const f = tile.fall;
      f.t += dts;
      const k = clamp01((f.t - f.delay) / f.dur);
      if (f.t >= f.delay) {
        tile.ay.snap(f.fromY + (f.toY - f.fromY) * easeInQuad(k));
        // Anticipation stretch while accelerating downward.
        tile.sy.p = Math.min(1.12, 1 + k * 0.1);
        tile.sx.p = Math.max(0.94, 1 - k * 0.05);
      }
      if (k >= 1) {
        const speed = (2 * Math.abs(f.toY - f.fromY)) / f.dur; // ease-in end speed
        tile.fall = null;
        tile.ay.snap(f.toY);
        tile.ay.v = -speed * 0.09;                    // tiny upward hop
        const squash = Math.max(0.7, 0.85 - f.dist * 0.012);
        tile.sy.p = squash;                           // squash…
        tile.sx.p = 1 + (1 - squash) * 0.9;           // …and stretch wide
      }
    } else {
      tile.ax.step(dts);
      tile.ay.step(dts);
    }
    tile.sx.step(dts);
    tile.sy.step(dts);
    if (tile.flashT > 0) tile.flashT = Math.max(0, tile.flashT - dts * 3.2);
  }

  // ------------------------------------------------------------ drawing

  _drawTile(ctx, tile, tMs) {
    const cell = this.layout.cell;
    const x = tile.ax.p, y = tile.ay.p;
    let scale = 1, alpha = 1;

    if (tile.pop > 0) { // pop-out: grow, then shrink + fade
      const k = clamp01(tile.pop / 0.18);
      if (k < 0.3) scale = 1 + (k / 0.3) * 0.3;
      else { scale = 1.3 * (1 - (k - 0.3) / 0.7); alpha = 1 - (k - 0.3) / 0.7; }
      if (scale <= 0.02) return;
    }

    const size = cell * 0.86 * scale;
    const sx = size * tile.sx.p, sy = size * tile.sy.p;

    // Fast path: plain candy, no overlays, full alpha — a single drawImage
    // with no save/translate/restore state churn (most tiles, most frames).
    if (!tile.special && !tile.lock && tile.pop === 0 && tile.flashT <= 0) {
      const spr = this.sprites.get(`candy-${COLOR_NAMES[tile.color]}`);
      if (spr) {
        ctx.drawImage(spr, x - sx / 2, y - sy / 2, sx, sy);
        return;
      }
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = alpha;

    // Idle glow for specials — pre-rendered sprite, sin(t) pulse. No shadowBlur.
    // During a step timeline, settled bystander specials skip the big glow
    // underlay: it is pure overdraw the eye can't track mid-wave.
    if (tile.special) {
      const bystander = this._animating && !tile.fall && tile.pop === 0
        && tile.flashT <= 0 && tile.ax.settled && tile.ay.settled;
      if (!bystander) {
        const isBomb = tile.special === 'bomb';
        const pulse = isBomb
          ? 0.75 + 0.25 * Math.sin(tMs * 0.006 + tile.glowPhase)
          : 0.5 + 0.32 * Math.sin(tMs * 0.006 + tile.glowPhase);
        const glow = isBomb ? this._pre.glowBomb : this._pre.glow[tile.color];
        const gs = cell * (isBomb ? 2.1 : 1.9)
          * (1 + 0.06 * Math.sin(tMs * 0.003 + tile.glowPhase));
        ctx.globalAlpha = alpha * pulse;
        ctx.drawImage(glow, -gs / 2, -gs / 2, gs, gs);
        ctx.globalAlpha = alpha;
      }
    }

    // Wrapped aura ring behind the candy.
    if (tile.special === 'wrap') {
      const ws = cell * (1.06 + 0.05 * Math.sin(tMs * 0.007 + tile.glowPhase));
      ctx.drawImage(this._pre.wrapAura, -ws / 2, -ws / 2, ws, ws);
    }

    // Candy sprite (bomb uses its own sprite).
    const key = tile.special === 'bomb' ? 'candy-bomb' : `candy-${COLOR_NAMES[tile.color]}`;
    const spr = this.sprites.get(key);
    if (spr) {
      ctx.drawImage(spr, -sx / 2, -sy / 2, sx, sy);
    } else {
      // Fallback disc so a missing sprite never blanks the board.
      const [c1, c2] = PALETTE[COLOR_NAMES[tile.color]] || [GOLD, '#ff8f00'];
      const g = ctx.createRadialGradient(-sx * 0.15, -sy * 0.2, sx * 0.05, 0, 0, sx * 0.52);
      g.addColorStop(0, c1); g.addColorStop(1, c2);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(0, 0, sx / 2, sy / 2, 0, 0, TAU); ctx.fill();
    }

    // Striped chevrons with a shimmer.
    if (tile.special === 'h' || tile.special === 'v') {
      ctx.globalAlpha = alpha * (0.72 + 0.28 * Math.sin(tMs * 0.008 + tile.glowPhase));
      const ov = tile.special === 'h' ? this._pre.stripeH : this._pre.stripeV;
      ctx.drawImage(ov, -sx / 2, -sy / 2, sx, sy);
      ctx.globalAlpha = alpha;
    }

    // Bomb: sparkles orbiting slowly around the orb.
    if (tile.special === 'bomb') {
      const rot = tMs * 0.0011 + tile.glowPhase;
      const rr = cell * 0.46;
      for (let i = 0; i < 4; i++) {
        const a = rot + (i / 4) * TAU;
        const ss = cell * (0.22 + 0.06 * Math.sin(tMs * 0.01 + i * 1.7));
        ctx.drawImage(this._pre.sparkle,
          Math.cos(a) * rr - ss / 2, Math.sin(a) * rr - ss / 2, ss, ss);
      }
    }

    // Doomed-target telegraph flash.
    if (tile.flashT > 0) {
      const gs = cell * 1.5;
      ctx.globalAlpha = alpha * tile.flashT * 0.85;
      ctx.drawImage(this._pre.glowWhite, -gs / 2, -gs / 2, gs, gs);
      ctx.globalAlpha = alpha;
    }

    // Cage on top of everything.
    if (tile.lock) {
      const lockSpr = this.sprites.get('lock');
      const ls = cell * 0.96;
      if (lockSpr) ctx.drawImage(lockSpr, -ls / 2, -ls / 2, ls, ls);
      else this._drawFallbackCage(ctx, ls);
    }

    ctx.restore();
  }

  _drawFallbackCage(ctx, s) {
    ctx.strokeStyle = 'rgba(226,232,255,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    roundRectPath(ctx, -s / 2, -s / 2, s, s, s * 0.16);
    for (let i = -1; i <= 1; i++) {
      ctx.moveTo(i * s * 0.25, -s / 2);
      ctx.lineTo(i * s * 0.25, s / 2);
    }
    ctx.stroke();
  }

  _drawLockBreak(ctx, lb) {
    const k = clamp01(lb.t / 0.35);
    const cell = this.layout.cell;
    const s = cell * 0.96 * (1 + k * 0.5);
    ctx.save();
    ctx.translate(lb.x, lb.y - k * cell * 0.25);
    ctx.rotate(k * 0.35);
    ctx.globalAlpha = 1 - k;
    const lockSpr = this.sprites.get('lock');
    if (lockSpr) ctx.drawImage(lockSpr, -s / 2, -s / 2, s, s);
    else this._drawFallbackCage(ctx, s);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  _drawJelly(ctx, tMs) {
    const b = this.board, L = this.layout;
    for (let r = 0; r < b.rows; r++) {
      for (let c = 0; c < b.cols; c++) {
        const layers = this.jellyLocal[r]?.[c] || 0;
        if (!layers) continue;
        const x = L.ox + c * L.cell, y = L.oy + r * L.cell;
        const inset = L.cell * 0.06;
        const wob = 1 + 0.02 * Math.sin(tMs * 0.004 + r * 1.3 + c * 2.1);
        ctx.save();
        ctx.translate(x + L.cell / 2, y + L.cell / 2);
        ctx.scale(wob, 2 - wob);
        ctx.translate(-(x + L.cell / 2), -(y + L.cell / 2));
        // Layer 1: translucent magenta gel with a glossy top highlight.
        ctx.beginPath();
        roundRectPath(ctx, x + inset, y + inset, L.cell - inset * 2, L.cell - inset * 2, L.cell * 0.2);
        ctx.fillStyle = layers >= 2 ? 'rgba(255,45,150,0.46)' : 'rgba(255,45,150,0.38)';
        ctx.fill();
        if (layers < 2) {
          // Layer-1 rim so single jelly reads as gel, not a lighting artifact.
          ctx.strokeStyle = 'rgba(255,90,180,0.55)';
          ctx.lineWidth = Math.max(1.5, L.cell * 0.03);
          ctx.stroke();
        }
        if (layers >= 2) {
          // Layer 2 reads deeper: darker rim + inner shade.
          ctx.strokeStyle = 'rgba(150,0,84,0.75)';
          ctx.lineWidth = Math.max(2, L.cell * 0.05);
          ctx.stroke();
          ctx.beginPath();
          roundRectPath(ctx, x + inset * 2.6, y + inset * 2.6,
            L.cell - inset * 5.2, L.cell - inset * 5.2, L.cell * 0.16);
          ctx.fillStyle = 'rgba(120,0,66,0.30)';
          ctx.fill();
        }
        // Gloss.
        ctx.beginPath();
        ctx.ellipse(x + L.cell * 0.34, y + L.cell * 0.26, L.cell * 0.2, L.cell * 0.09, -0.4, 0, TAU);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fill();
        ctx.restore();
      }
    }
  }

  _drawSelection(ctx, tMs) {
    if (!this._selected) return;
    const p = this.cellToXY(this._selected);
    const cell = this.layout.cell;
    const s = cell * (0.94 + 0.035 * Math.sin(tMs * 0.008));
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    roundRectPath(ctx, -s / 2, -s / 2, s, s, cell * 0.2);
    ctx.stroke();
    ctx.globalAlpha = 0.35 + 0.2 * Math.sin(tMs * 0.008);
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  _drawHint(ctx, tMs) {
    if (!this._hint) return;
    const cell = this.layout.cell;
    const k = 0.5 + 0.5 * Math.sin((tMs - this._hintT) * 0.005);
    for (const cellRef of [this._hint.a, this._hint.b]) {
      const p = this.cellToXY(cellRef);
      const s = cell * (0.9 + 0.08 * k);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.globalAlpha = 0.25 + 0.4 * k;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      roundRectPath(ctx, -s / 2, -s / 2, s, s, cell * 0.22);
      ctx.stroke();
      const gs = cell * 1.35;
      ctx.globalAlpha = 0.14 + 0.2 * k;
      ctx.drawImage(this._pre.glowGold, -gs / 2, -gs / 2, gs, gs);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------ layout & prerender

  _computeLayout() {
    const b = this.board;
    const cell = Math.floor(Math.min(this.cssW / b.cols, this.cssH / b.rows));
    const ox = Math.round((this.cssW - cell * b.cols) / 2);
    const oy = Math.round((this.cssH - cell * b.rows) / 2);
    this.layout = { cell, ox, oy };
    if (!this._pre) this._buildPrerenders();
  }

  /** Static felt-cell layer: alternating tint + faint gold inner borders. */
  _renderBoardLayer() {
    if (!this.board || !this.layout || this.cssW <= 0) return;
    const b = this.board, L = this.layout, dpr = this.dpr;
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(this.cssW * dpr));
    cv.height = Math.max(1, Math.round(this.cssH * dpr));
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (let r = 0; r < b.rows; r++) {
      for (let c = 0; c < b.cols; c++) {
        if (!b.mask[r][c]) continue; // holes: nothing at all
        const x = L.ox + c * L.cell, y = L.oy + r * L.cell;
        const pad = Math.max(1, L.cell * 0.035);
        const w = L.cell - pad * 2;
        const rad = L.cell * 0.18;
        const even = (r + c) % 2 === 0;
        const grad = g.createLinearGradient(0, y, 0, y + L.cell);
        if (even) { grad.addColorStop(0, '#31165c'); grad.addColorStop(1, '#241043'); }
        else { grad.addColorStop(0, '#2a1250'); grad.addColorStop(1, '#1e0c3a'); }
        g.beginPath();
        roundRectPath(g, x + pad, y + pad, w, w, rad);
        g.fillStyle = grad;
        g.fill();
        // Faint gold 1px inner border.
        g.beginPath();
        roundRectPath(g, x + pad + 1, y + pad + 1, w - 2, w - 2, rad - 1);
        g.strokeStyle = even ? 'rgba(255,213,74,0.14)' : 'rgba(255,213,74,0.09)';
        g.lineWidth = 1;
        g.stroke();
        // Whisper of a top sheen.
        g.beginPath();
        roundRectPath(g, x + pad + 2, y + pad + 2, w - 4, w * 0.3, rad - 2);
        g.fillStyle = 'rgba(255,255,255,0.025)';
        g.fill();
      }
    }
    this._boardLayer = cv;
  }

  /** Pre-rendered glow/stripe/aura/sparkle sprites (shadowBlur only HERE, once). */
  _buildPrerenders() {
    const cell = this.layout ? this.layout.cell : 64;
    const S = Math.max(32, Math.round(cell * 2));
    const mk = (draw) => {
      const c = document.createElement('canvas');
      c.width = c.height = S;
      draw(c.getContext('2d'), S);
      return c;
    };
    const radial = (hex) => mk((g, s) => {
      const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.25, hex);
      grad.addColorStop(1, hex + '00');
      g.fillStyle = grad;
      g.fillRect(0, 0, s, s);
    });

    this._pre = {
      glow: COLOR_NAMES.map(n => radial(PALETTE[n][0])),
      glowGold: radial(GOLD),
      glowWhite: radial('#ffffff'),
      glowBomb: mk((g, s) => {
        // Rainbow halo for the color bomb — hot white/gold core so the bomb
        // outshines a wrapped candy at idle.
        const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.25, '#ffd54a');
        grad.addColorStop(0.55, '#b44cff');
        grad.addColorStop(1, 'rgba(180,76,255,0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, s, s);
      }),
      stripeH: mk((g, s) => this._drawStripes(g, s, false)),
      stripeV: mk((g, s) => this._drawStripes(g, s, true)),
      wrapAura: mk((g, s) => {
        g.strokeStyle = GOLD;
        g.lineWidth = s * 0.05;
        g.shadowColor = GOLD;
        g.shadowBlur = s * 0.12;
        g.beginPath();
        g.arc(s / 2, s / 2, s * 0.42, 0, TAU);
        g.stroke();
        g.setLineDash([s * 0.09, s * 0.07]);
        g.lineWidth = s * 0.03;
        g.strokeStyle = '#ffffff';
        g.beginPath();
        g.arc(s / 2, s / 2, s * 0.34, 0, TAU);
        g.stroke();
      }),
      sparkle: mk((g, s) => {
        // 4-point star.
        g.translate(s / 2, s / 2);
        g.fillStyle = '#ffffff';
        g.shadowColor = GOLD;
        g.shadowBlur = s * 0.16;
        g.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU;
          const r = i % 2 === 0 ? s * 0.42 : s * 0.1;
          g[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * r, Math.sin(a) * r);
        }
        g.closePath();
        g.fill();
      }),
    };
  }

  _drawStripes(g, s, vertical) {
    g.save();
    g.translate(s / 2, s / 2);
    if (vertical) g.rotate(Math.PI / 2);
    const w = s * 0.62, h = s * 0.085;
    // Gold bars with a dark keyline so stripes read on every candy color —
    // flat white vanished on the white pearl sprite.
    const grad = g.createLinearGradient(-w / 2, 0, w / 2, 0);
    grad.addColorStop(0, '#fff3c4');
    grad.addColorStop(1, '#ffd54a');
    g.beginPath();
    for (let i = -1; i <= 1; i++) {
      const y = i * s * 0.16;
      roundRectPath(g, -w / 2, y - h / 2, w, h, h / 2);
    }
    g.shadowColor = GOLD;
    g.shadowBlur = s * 0.05;
    g.fillStyle = grad;
    g.fill();
    g.shadowBlur = 0;
    g.strokeStyle = 'rgba(30,10,50,0.55)';
    g.lineWidth = Math.max(1, s * 0.012);
    g.stroke();
    g.restore();
  }

  // ------------------------------------------------------------ tile bookkeeping

  _makeTile(id, color, special, lock, at) {
    const p = this.cellToXY(at);
    return {
      id, color, special: special || null, lock: lock || 0,
      ax: new Axis(p.x), ay: new Axis(p.y),
      sx: new Axis(1, 320, 12), sy: new Axis(1, 320, 12),
      glowPhase: Math.random() * TAU,
      pop: 0, fall: null, flashT: 0,
    };
  }

  _at({ r, c }) { return (this.grid[r] && this.grid[r][c]) || null; }
  _put({ r, c }, tile) { if (this.grid[r]) this.grid[r][c] = tile; }

  _findTile(id) {
    const b = this.board;
    for (let r = 0; r < b.rows; r++) {
      for (let c = 0; c < b.cols; c++) {
        if (b.cells[r][c] && b.cells[r][c].id === id) return { r, c };
      }
    }
    return null;
  }

  _pulseScale(tile, amt) { tile.sx.p = amt; tile.sy.p = amt; }
  _wiggle(tile) { tile.sx.p = 1.08; tile.sy.p = 0.92; }

  /** Rebuild the renderer's grid/tiles snapshot from the engine board. */
  _syncFromBoard(hard) {
    const b = this.board;
    if (!b || !this.layout) return;
    this.grid = Array.from({ length: b.rows }, () => new Array(b.cols).fill(null));
    this.jellyLocal = b.jelly.map(row => row.slice());
    const seen = new Set();
    for (let r = 0; r < b.rows; r++) {
      for (let c = 0; c < b.cols; c++) {
        const cand = b.cells[r][c];
        if (!cand) continue;
        seen.add(cand.id);
        let tile = this.tiles.get(cand.id);
        if (!tile || hard) {
          tile = this._makeTile(cand.id, cand.color, cand.special, cand.lock, { r, c });
          this.tiles.set(cand.id, tile);
        } else {
          tile.color = cand.color;
          tile.special = cand.special;
          tile.lock = cand.lock;
          const p = this.cellToXY({ r, c });
          // Nudge home; snap only if badly off (e.g. after a missed step).
          if (Math.hypot(tile.ax.p - p.x, tile.ay.p - p.y) > this.layout.cell * 1.5) {
            tile.ax.snap(p.x); tile.ay.snap(p.y);
          } else {
            tile.ax.t = p.x; tile.ay.t = p.y;
          }
        }
        this.grid[r][c] = tile;
      }
    }
    for (const id of [...this.tiles.keys()]) {
      if (!seen.has(id)) this.tiles.delete(id);
    }
  }

  // ------------------------------------------------------------ utils

  static _sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

  static _dts(dt) {
    let s = dt > 1.5 ? dt / 1000 : dt; // accept ms or seconds
    if (!(s > 0)) s = 0.016;
    return Math.min(s, 0.05);
  }
}
