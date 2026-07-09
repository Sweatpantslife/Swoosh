// Swoosh — pure game engine. ZERO DOM; runs under node and in the browser.
// Contract: docs/ARCHITECTURE.md (§ js/engine.js)

export const COLOR_NAMES = ['ruby', 'amber', 'emerald', 'sapphire', 'amethyst', 'pearl'];

/** Deterministic PRNG. Returns () => float in [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const K = (r, c) => r * 16 + c; // cols/rows are ≤ 9, so 16 is a safe stride
const isStripe = (s) => s === 'h' || s === 'v';

export class Board {
  constructor(levelDef, rng) {
    this.levelDef = levelDef;
    this.rng = rng || (levelDef.seed != null ? mulberry32(levelDef.seed) : Math.random);
    this.rows = levelDef.rows;
    this.cols = levelDef.cols;
    this.colors = levelDef.colors;
    this.score = 0;
    this.movesLeft = levelDef.moves;
    this.collected = {};
    this._nextId = 1;

    this.mask = [];
    this.jelly = [];
    this.cells = [];
    const locks = new Set();
    this._jellyTarget = 0;
    for (let r = 0; r < this.rows; r++) {
      const mrow = [], jrow = [], crow = [];
      for (let c = 0; c < this.cols; c++) {
        const ch = levelDef.layout ? levelDef.layout[r][c] : '.';
        mrow.push(ch !== '#');
        const j = ch === '1' ? 1 : ch === '2' ? 2 : 0;
        jrow.push(j);
        this._jellyTarget += j;
        if (ch === 'L') locks.add(K(r, c));
        crow.push(null);
      }
      this.mask.push(mrow);
      this.jelly.push(jrow);
      this.cells.push(crow);
    }
    this._jellyCleared = 0;
    this._locksTarget = locks.size;
    this._locksBroken = 0;
    this._fillInitial(locks);
  }

  // ---------- creation ----------

  _fillInitial(locks) {
    for (let attempt = 0; attempt < 20; attempt++) {
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (!this.mask[r][c]) { this.cells[r][c] = null; continue; }
          let color, guard = 0;
          do {
            color = (this.rng() * this.colors) | 0;
          } while (guard++ < 40 && this._wouldMatchAtFill(r, c, color));
          this.cells[r][c] = {
            id: this._nextId++, color, special: null,
            lock: locks.has(K(r, c)) ? 1 : 0,
          };
        }
      }
      if (this._findAnyMove()) return; // no pre-matches by construction + has a move
    }
    // relaxed after 20 attempts: accept the last fill
  }

  _wouldMatchAtFill(r, c, color) {
    const same = (rr, cc) => {
      const cell = rr >= 0 && cc >= 0 ? this.cells[rr]?.[cc] : null;
      return !!cell && cell.color === color;
    };
    return (same(r, c - 1) && same(r, c - 2)) || (same(r - 1, c) && same(r - 2, c));
  }

  // ---------- basic queries ----------

  isAdjacent(a, b) {
    return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
  }

  _cell(p) {
    return (p.r >= 0 && p.r < this.rows && p.c >= 0 && p.c < this.cols)
      ? this.cells[p.r][p.c] : null;
  }

  _swapCells(a, b) {
    const t = this.cells[a.r][a.c];
    this.cells[a.r][a.c] = this.cells[b.r][b.c];
    this.cells[b.r][b.c] = t;
  }

  /** Does the candy at (r,c) currently sit in a run of ≥3? */
  _matchAt(r, c) {
    const cell = this.cells[r][c];
    if (!cell) return false;
    const color = cell.color;
    let n = 1;
    for (let cc = c - 1; cc >= 0 && this.cells[r][cc]?.color === color; cc--) n++;
    for (let cc = c + 1; cc < this.cols && this.cells[r][cc]?.color === color; cc++) n++;
    if (n >= 3) return true;
    n = 1;
    for (let rr = r - 1; rr >= 0 && this.cells[rr][c]?.color === color; rr--) n++;
    for (let rr = r + 1; rr < this.rows && this.cells[rr][c]?.color === color; rr++) n++;
    return n >= 3;
  }

  _comboKind(ca, cb) {
    const sa = ca.special, sb = cb.special;
    if (sa === 'bomb' && sb === 'bomb') return 'bomb+bomb';
    if (sa === 'bomb' || sb === 'bomb') {
      const other = sa === 'bomb' ? sb : sa;
      if (isStripe(other)) return 'bomb+stripe';
      if (other === 'wrap') return 'bomb+wrap';
      return 'bomb'; // bomb + plain
    }
    if (!sa || !sb) return null;
    if (isStripe(sa) && isStripe(sb)) return 'stripe+stripe';
    if (sa === 'wrap' && sb === 'wrap') return 'wrap+wrap';
    if ((isStripe(sa) && sb === 'wrap') || (sa === 'wrap' && isStripe(sb))) return 'stripe+wrap';
    return null;
  }

  _findAnyMove() {
    const DIRS = [[0, 1], [1, 0]];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.cells[r][c];
        if (!cell || cell.lock) continue;
        for (const [dr, dc] of DIRS) {
          const nr = r + dr, nc = c + dc;
          if (nr >= this.rows || nc >= this.cols) continue;
          const other = this.cells[nr][nc];
          if (!other || other.lock) continue;
          if (this._comboKind(cell, other)) return { a: { r, c }, b: { r: nr, c: nc } };
          const a = { r, c }, b = { r: nr, c: nc };
          this._swapCells(a, b);
          const ok = this._matchAt(r, c) || this._matchAt(nr, nc);
          this._swapCells(a, b);
          if (ok) return { a, b };
        }
      }
    }
    return null;
  }

  hint() {
    return this._findAnyMove();
  }

  // ---------- the move ----------

  trySwap(a, b) {
    const fail = () => ({ valid: false, steps: [{ type: 'swap-fail', a: { ...a }, b: { ...b } }] });
    if (!this.isAdjacent(a, b)) return fail();
    const ca = this._cell(a), cb = this._cell(b);
    if (!ca || !cb || ca.lock || cb.lock) return fail();

    const combo = this._comboKind(ca, cb);
    if (!combo) {
      this._swapCells(a, b);
      const makesMatch = this._matchAt(a.r, a.c) || this._matchAt(b.r, b.c);
      this._swapCells(a, b);
      if (!makesMatch) return fail();
    }

    this.movesLeft--;
    const steps = [{ type: 'swap', a: { ...a }, b: { ...b } }];
    this._swapCells(a, b);
    this._runCascades(steps, 0, { a: { ...a }, b: { ...b }, combo });
    if (!this.isWin() && this.movesLeft > 0) this._ensureValidMove(steps);
    steps.push({
      type: 'end', win: this.isWin(), fail: this.isFail(),
      score: this.score, movesLeft: this.movesLeft,
    });
    return { valid: true, steps };
  }

  /** Resolve cascade waves starting at index `cascade`; returns next cascade index. */
  _runCascades(steps, cascade, swapInfo) {
    let guard = 0;
    while (guard++ < 300) {
      const wave = this._buildWave(cascade, swapInfo);
      swapInfo = null;
      if (!wave) break;
      for (const s of wave.specialSteps) steps.push(s);
      steps.push(wave.matchStep);
      const grav = this._applyGravity();
      if (grav.moves.length || grav.spawns.length) {
        steps.push({ type: 'gravity', moves: grav.moves, spawns: grav.spawns });
      }
      cascade++;
    }
    return cascade;
  }

  _ensureValidMove(steps) {
    let guard = 0;
    let cascade = 0;
    while (!this._findAnyMove() && guard++ < 5) {
      let movable = 0;
      for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
        const cell = this.cells[r][c];
        if (cell && !cell.lock) movable++;
      }
      if (movable < 3) break; // shuffling cannot help
      steps.push(this._shuffle());
      cascade = this._runCascades(steps, cascade, null); // relaxed shuffle may create matches
    }
  }

  // ---------- wave construction ----------

  _findRuns() {
    const runs = [];
    for (let r = 0; r < this.rows; r++) {
      let c = 0;
      while (c < this.cols) {
        const cell = this.cells[r][c];
        if (!cell) { c++; continue; }
        let end = c + 1;
        while (end < this.cols && this.cells[r][end]?.color === cell.color) end++;
        if (end - c >= 3) {
          const rc = [];
          for (let cc = c; cc < end; cc++) rc.push({ r, c: cc });
          runs.push({ horiz: true, color: cell.color, cells: rc });
        }
        c = end;
      }
    }
    for (let c = 0; c < this.cols; c++) {
      let r = 0;
      while (r < this.rows) {
        const cell = this.cells[r][c];
        if (!cell) { r++; continue; }
        let end = r + 1;
        while (end < this.rows && this.cells[end][c]?.color === cell.color) end++;
        if (end - r >= 3) {
          const rc = [];
          for (let rr = r; rr < end; rr++) rc.push({ r: rr, c });
          runs.push({ horiz: false, color: cell.color, cells: rc });
        }
        r = end;
      }
    }
    return runs;
  }

  _groupRuns(runs) {
    const parent = runs.map((_, i) => i);
    const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
    const cellOwner = new Map();
    runs.forEach((run, i) => {
      for (const { r, c } of run.cells) {
        const k = K(r, c);
        if (cellOwner.has(k)) parent[find(i)] = find(cellOwner.get(k));
        else cellOwner.set(k, i);
      }
    });
    const groups = new Map();
    runs.forEach((run, i) => {
      const root = find(i);
      if (!groups.has(root)) groups.set(root, { runs: [], keySet: new Set(), cells: [] });
      const g = groups.get(root);
      g.runs.push(run);
      for (const rc of run.cells) {
        const k = K(rc.r, rc.c);
        if (!g.keySet.has(k)) { g.keySet.add(k); g.cells.push(rc); }
      }
    });
    return [...groups.values()];
  }

  _plannedSpecial(group, swapCells, avoidKeys) {
    let maxRun = group.runs[0];
    for (const run of group.runs) if (run.cells.length > maxRun.cells.length) maxRun = run;
    const hasH = group.runs.some((r) => r.horiz);
    const hasV = group.runs.some((r) => !r.horiz);

    let special = null;
    if (maxRun.cells.length >= 5) special = 'bomb';
    else if (hasH && hasV) special = 'wrap';
    else if (maxRun.cells.length === 4) special = maxRun.horiz ? 'v' : 'h';
    if (!special) return null;

    // A cell can host the new special only if it is not caged, does not already
    // hold a special (an existing special must fire, not be swallowed), and is
    // not a combo cell being consumed this wave.
    const canHost = ({ r, c }) => {
      const cell = this.cells[r][c];
      // cell may be null (holes / already-cleared) — never host a special there.
      return !!cell && !cell.lock && !cell.special && !(avoidKeys && avoidKeys.has(K(r, c)));
    };

    // Position: swapped cell if it participated (and can host), else center/intersection.
    let pos = null;
    for (const sc of swapCells) {
      if (sc && group.keySet.has(K(sc.r, sc.c)) && canHost(sc)) { pos = sc; break; }
    }
    if (!pos && special === 'wrap') {
      // intersection: a cell present in both an h-run and a v-run of the group
      outer:
      for (const hr of group.runs) {
        if (!hr.horiz) continue;
        for (const vr of group.runs) {
          if (vr.horiz) continue;
          for (const hc of hr.cells) {
            if (vr.cells.some((vc) => vc.r === hc.r && vc.c === hc.c)) { pos = hc; break outer; }
          }
        }
      }
    }
    if (!pos) pos = maxRun.cells[(maxRun.cells.length / 2) | 0];
    if (!canHost(pos)) {
      pos = group.cells.find((rc) => canHost(rc)) || null;
      if (!pos) return null;
    }
    return { r: pos.r, c: pos.c, special };
  }

  _specialTargets(kind, r, c) {
    const t = [];
    if (kind === 'h') {
      for (let cc = 0; cc < this.cols; cc++) if (cc !== c && this.cells[r][cc]) t.push({ r, c: cc });
    } else if (kind === 'v') {
      for (let rr = 0; rr < this.rows; rr++) if (rr !== r && this.cells[rr][c]) t.push({ r: rr, c });
    } else if (kind === 'wrap') {
      for (let rr = r - 1; rr <= r + 1; rr++) for (let cc = c - 1; cc <= c + 1; cc++) {
        if (rr >= 0 && rr < this.rows && cc >= 0 && cc < this.cols
          && !(rr === r && cc === c) && this.cells[rr][cc]) t.push({ r: rr, c: cc });
      }
    } else if (kind === 'bomb') {
      // A bomb fired without a swap partner detonates the most common color on the board.
      const color = this._mostCommonColors(1)[0];
      if (color != null) {
        for (let rr = 0; rr < this.rows; rr++) for (let cc = 0; cc < this.cols; cc++) {
          const cell = this.cells[rr][cc];
          if (cell && cell.color === color && !(rr === r && cc === c)) t.push({ r: rr, c: cc });
        }
      }
    }
    return t;
  }

  _mostCommonColors(n) {
    const counts = new Array(6).fill(0);
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
      const cell = this.cells[r][c];
      if (cell && !cell.special) counts[cell.color]++;
    }
    return counts
      .map((count, color) => ({ count, color }))
      .filter((e) => e.count > 0)
      .sort((x, y) => y.count - x.count || x.color - y.color)
      .slice(0, n)
      .map((e) => e.color);
  }

  _cellsOfColor(color, exceptKeys) {
    const out = [];
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
      const cell = this.cells[r][c];
      if (cell && cell.color === color && !(exceptKeys && exceptKeys.has(K(r, c)))) out.push({ r, c });
    }
    return out;
  }

  _activateCombo(swapInfo, specialSteps, addClear, fired) {
    const { a, b, combo } = swapInfo;
    const cellA = this.cells[a.r][a.c], cellB = this.cells[b.r][b.c];
    const comboKeys = new Set([K(a.r, a.c), K(b.r, b.c)]);
    fired.add(cellA.id);
    fired.add(cellB.id);
    const targets = [];
    const seen = new Set();
    const push = (r, c) => {
      if (r < 0 || r >= this.rows || c < 0 || c >= this.cols || !this.cells[r][c]) return;
      const k = K(r, c);
      if (!seen.has(k)) { seen.add(k); targets.push({ r, c }); }
    };

    if (combo === 'stripe+stripe') {
      for (let cc = 0; cc < this.cols; cc++) push(b.r, cc);
      for (let rr = 0; rr < this.rows; rr++) push(rr, b.c);
    } else if (combo === 'stripe+wrap') {
      for (let rr = b.r - 1; rr <= b.r + 1; rr++) for (let cc = 0; cc < this.cols; cc++) push(rr, cc);
      for (let cc = b.c - 1; cc <= b.c + 1; cc++) for (let rr = 0; rr < this.rows; rr++) push(rr, cc);
    } else if (combo === 'wrap+wrap') {
      for (let rr = b.r - 2; rr <= b.r + 2; rr++) for (let cc = b.c - 2; cc <= b.c + 2; cc++) push(rr, cc);
    } else if (combo === 'bomb') {
      const plain = cellA.special === 'bomb' ? cellB : cellA;
      push(a.r, a.c); push(b.r, b.c);
      for (const { r, c } of this._cellsOfColor(plain.color, comboKeys)) push(r, c);
    } else if (combo === 'bomb+stripe') {
      const stripe = isStripe(cellA.special) ? cellA : cellB;
      push(a.r, a.c); push(b.r, b.c);
      for (const { r, c } of this._cellsOfColor(stripe.color, comboKeys)) {
        const cell = this.cells[r][c];
        if (!cell.lock && !cell.special) cell.special = this.rng() < 0.5 ? 'h' : 'v';
        push(r, c);
      }
    } else if (combo === 'bomb+wrap') {
      push(a.r, a.c); push(b.r, b.c);
      for (const color of this._mostCommonColors(2)) {
        for (const { r, c } of this._cellsOfColor(color, comboKeys)) push(r, c);
      }
    } else if (combo === 'bomb+bomb') {
      for (let rr = 0; rr < this.rows; rr++) for (let cc = 0; cc < this.cols; cc++) push(rr, cc);
    }

    specialSteps.push({
      type: 'special', kind: combo, origin: { r: b.r, c: b.c },
      targets: targets.map((t) => ({ ...t })),
    });
    addClear(a.r, a.c, true);
    addClear(b.r, b.c, true);
    for (const t of targets) addClear(t.r, t.c, true);
  }

  _buildWave(cascade, swapInfo) {
    const runs = this._findRuns();
    const combo = swapInfo && swapInfo.combo;
    if (!runs.length && !combo) return null;

    const specialSteps = [];
    const toClear = new Map();   // key -> {r, c, via}
    const lockBreaks = new Map();
    const fired = new Set();     // candy ids that already detonated
    const fireQueue = [];
    const createdPos = new Map();

    // Plan created specials first, so chain fire never clears them this wave.
    // Combo swap cells are being consumed by the combo — never plan a new
    // special on them (they must be cleared, not overwritten).
    const swapCells = swapInfo && !combo ? [swapInfo.b, swapInfo.a] : [];
    const comboCells = combo
      ? new Set([K(swapInfo.a.r, swapInfo.a.c), K(swapInfo.b.r, swapInfo.b.c)]) : null;
    for (const g of this._groupRuns(runs)) {
      const spec = this._plannedSpecial(g, swapCells, comboCells);
      if (spec) createdPos.set(K(spec.r, spec.c), spec);
    }

    const addClear = (r, c, via) => {
      const cell = this.cells[r][c];
      if (!cell) return;
      const k = K(r, c);
      if (cell.lock) { lockBreaks.set(k, { r, c }); return; }
      if (createdPos.has(k)) return;
      const prev = toClear.get(k);
      if (prev) { if (via) prev.via = true; return; }
      toClear.set(k, { r, c, via: !!via });
      if (cell.special && !fired.has(cell.id)) {
        fired.add(cell.id);
        fireQueue.push({ r, c, special: cell.special, id: cell.id });
      }
    };

    if (combo) this._activateCombo(swapInfo, specialSteps, addClear, fired);
    for (const run of runs) for (const { r, c } of run.cells) addClear(r, c, false);

    // Chain-fire: any special caught in the clear set detonates within this same wave.
    let guard = 0;
    while (fireQueue.length && guard++ < 500) {
      const f = fireQueue.shift();
      const targets = this._specialTargets(f.special, f.r, f.c);
      specialSteps.push({
        type: 'special', kind: f.special, origin: { r: f.r, c: f.c },
        targets: targets.map((t) => ({ ...t })),
      });
      for (const t of targets) addClear(t.r, t.c, true);
    }

    // Materialize the wave.
    const created = [];
    for (const sp of createdPos.values()) {
      const cell = this.cells[sp.r][sp.c];
      cell.special = sp.special;
      created.push({ r: sp.r, c: sp.c, color: cell.color, special: sp.special });
    }

    const cleared = [];
    const jellyCleared = [];
    let delta = 100 * created.length;
    for (const { r, c, via } of toClear.values()) {
      const cell = this.cells[r][c];
      cleared.push({ r, c, color: cell.color, special: cell.special });
      delta += 60 * (1 + 0.5 * cascade) + (via ? 30 : 0);
      this.collected[cell.color] = (this.collected[cell.color] || 0) + 1;
      if (this.jelly[r][c] > 0) {
        this.jelly[r][c]--;
        this._jellyCleared++;
        jellyCleared.push({ r, c });
      }
      this.cells[r][c] = null;
    }

    const locksBroken = [];
    for (const { r, c } of lockBreaks.values()) {
      this.cells[r][c].lock = 0;
      this._locksBroken++;
      locksBroken.push({ r, c });
    }

    if (!cleared.length && !locksBroken.length && !created.length) return null;

    delta = Math.round(delta);
    this.score += delta;

    return {
      specialSteps,
      matchStep: {
        type: 'match', cascade, cleared, created, jellyCleared, locksBroken,
        scoreDelta: delta, scoreTotal: this.score,
      },
    };
  }

  // ---------- gravity ----------

  _applyGravity() {
    const moves = [], spawns = [];
    for (let c = 0; c < this.cols; c++) {
      let r = 0;
      while (r < this.rows) {
        if (!this.mask[r][c] || this.cells[r][c]?.lock) { r++; continue; }
        let segEnd = r;
        while (segEnd < this.rows && this.mask[segEnd][c] && !this.cells[segEnd][c]?.lock) segEnd++;
        const segTop = r;
        // compact downwards within [segTop, segEnd)
        let write = segEnd - 1;
        for (let read = segEnd - 1; read >= segTop; read--) {
          const cell = this.cells[read][c];
          if (!cell) continue;
          if (write !== read) {
            this.cells[write][c] = cell;
            this.cells[read][c] = null;
            moves.push({ id: cell.id, from: { r: read, c }, to: { r: write, c } });
          }
          write--;
        }
        const empty = write - segTop + 1;
        for (let i = 0; i < empty; i++) {
          const rr = segTop + i;
          const candy = {
            id: this._nextId++, color: (this.rng() * this.colors) | 0,
            special: null, lock: 0,
          };
          this.cells[rr][c] = candy;
          spawns.push({
            id: candy.id, color: candy.color, special: null,
            // segment-relative spawn-above row: just above this segment's top
            // (always < to.r; negative only when the segment starts at row 0).
            to: { r: rr, c }, fromRow: segTop + i - empty,
          });
        }
        r = segEnd;
      }
    }
    return { moves, spawns };
  }

  // ---------- shuffle ----------

  _shuffle() {
    const spots = [], candies = [], origin = new Map();
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
      const cell = this.cells[r][c];
      if (cell && !cell.lock) {
        spots.push({ r, c });
        candies.push(cell);
        origin.set(cell.id, { r, c });
      }
    }
    for (let attempt = 0; attempt < 20; attempt++) {
      for (let i = candies.length - 1; i > 0; i--) {
        const j = (this.rng() * (i + 1)) | 0;
        [candies[i], candies[j]] = [candies[j], candies[i]];
      }
      for (let i = 0; i < spots.length; i++) this.cells[spots[i].r][spots[i].c] = candies[i];
      if (this._findRuns().length === 0 && this._findAnyMove()) break;
      // else relax after 20 attempts; any accidental matches resolve as cascades
    }
    const stepCells = [];
    for (let i = 0; i < spots.length; i++) {
      const from = origin.get(candies[i].id), to = spots[i];
      if (from.r !== to.r || from.c !== to.c) {
        stepCells.push({ id: candies[i].id, from: { ...from }, to: { ...to } });
      }
    }
    return { type: 'shuffle', cells: stepCells };
  }

  // ---------- goals / outcome ----------

  goals() {
    return this.levelDef.goals.map((g) => {
      if (g.type === 'score') {
        return { type: 'score', target: g.target, current: this.score, done: this.score >= g.target };
      }
      if (g.type === 'collect') {
        const cur = this.collected[g.color] || 0;
        return { type: 'collect', color: g.color, target: g.target, current: cur, done: cur >= g.target };
      }
      if (g.type === 'jelly') {
        return {
          type: 'jelly', target: this._jellyTarget, current: this._jellyCleared,
          done: this._jellyCleared >= this._jellyTarget,
        };
      }
      // locks
      return {
        type: 'locks', target: this._locksTarget, current: this._locksBroken,
        done: this._locksBroken >= this._locksTarget,
      };
    });
  }

  isWin() {
    return this.goals().every((g) => g.done);
  }

  isFail() {
    return this.movesLeft === 0 && !this.isWin();
  }

  stars() {
    let n = 0;
    for (const s of this.levelDef.starScores) if (this.score >= s) n++;
    if (n > 3) n = 3;
    if (n === 0 && this.isWin()) n = 1; // winning always yields at least one star
    return n;
  }

  // ---------- persistence ----------

  serialize() {
    return {
      levelId: this.levelDef.id,
      rows: this.rows,
      cols: this.cols,
      score: this.score,
      movesLeft: this.movesLeft,
      nextId: this._nextId,
      collected: { ...this.collected },
      cells: this.cells.map((row) => row.map((cell) => (cell ? { ...cell } : null))),
      jelly: this.jelly.map((row) => [...row]),
      mask: this.mask.map((row) => [...row]),
      jellyTarget: this._jellyTarget,
      jellyCleared: this._jellyCleared,
      locksTarget: this._locksTarget,
      locksBroken: this._locksBroken,
    };
  }

  static deserialize(json, levelDef, rng) {
    const b = Object.create(Board.prototype);
    b.levelDef = levelDef;
    b.rng = rng || (levelDef.seed != null ? mulberry32((levelDef.seed ^ 0x9e3779b9) >>> 0) : Math.random);
    b.rows = json.rows;
    b.cols = json.cols;
    b.colors = levelDef.colors;
    b.score = json.score;
    b.movesLeft = json.movesLeft;
    b._nextId = json.nextId;
    b.collected = { ...json.collected };
    b.cells = json.cells.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
    b.jelly = json.jelly.map((row) => [...row]);
    b.mask = json.mask.map((row) => [...row]);
    b._jellyTarget = json.jellyTarget;
    b._jellyCleared = json.jellyCleared;
    b._locksTarget = json.locksTarget;
    b._locksBroken = json.locksBroken;
    return b;
  }
}
