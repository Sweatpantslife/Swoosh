// Swoosh engine test suite — plain node assertions, no framework.
// Run: node tests/engine.test.mjs   (exit 0 on pass)

import { Board, COLOR_NAMES, mulberry32 } from '../js/engine.js';
import { LEVELS, getLevel, LEVEL_COUNT } from '../js/levels.js';

let passed = 0, failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('ok  -', name);
  } catch (e) {
    failed++;
    console.error('FAIL -', name);
    console.error('      ', e && e.stack ? e.stack.split('\n').slice(0, 4).join('\n       ') : e);
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function assertEq(actual, expected, msg) {
  if (actual !== expected) throw new Error(`${msg || 'assertEq'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// ---------- fixtures ----------

let TID = 100000;
const candy = (color, special = null, lock = 0) => ({ id: TID++, color, special, lock });

function makeDef(over = {}) {
  return {
    id: 99, name: 'test', rows: 7, cols: 7, colors: 6, moves: 20,
    goals: [{ type: 'score', target: 999999 }],
    starScores: [1000, 2000, 3000],
    ...over,
  };
}
function makeBoard(over = {}, seed = 42) {
  return new Board(makeDef(over), mulberry32(seed));
}

// Inert background: color = (r%2)*2 + (c%2). No runs, and provably no valid
// swap (any swap only ever lines up 2 of a kind), so scenarios are surgical.
function bgFill(board) {
  for (let r = 0; r < board.rows; r++) for (let c = 0; c < board.cols; c++) {
    if (board.mask[r][c]) board.cells[r][c] = candy((r % 2) * 2 + (c % 2));
  }
}
function put(board, r, c, color, special = null, lock = 0) {
  board.cells[r][c] = candy(color, special, lock);
  return board.cells[r][c];
}

// independent match scanner (not the engine's)
function scanRuns(board) {
  let runs = 0;
  const color = (r, c) => board.cells[r]?.[c]?.color ?? -1 - (r * 100 + c); // nulls never equal
  for (let r = 0; r < board.rows; r++) for (let c = 0; c + 2 < board.cols; c++) {
    if (board.cells[r][c] && color(r, c) === color(r, c + 1) && color(r, c) === color(r, c + 2)) runs++;
  }
  for (let c = 0; c < board.cols; c++) for (let r = 0; r + 2 < board.rows; r++) {
    if (board.cells[r][c] && color(r, c) === color(r + 1, c) && color(r, c) === color(r + 2, c)) runs++;
  }
  return runs;
}
function boardFull(board) {
  for (let r = 0; r < board.rows; r++) for (let c = 0; c < board.cols; c++) {
    if (board.mask[r][c] && !board.cells[r][c]) return false;
    if (!board.mask[r][c] && board.cells[r][c]) return false;
  }
  return true;
}
function uniqueIds(board) {
  const seen = new Set();
  for (let r = 0; r < board.rows; r++) for (let c = 0; c < board.cols; c++) {
    const cell = board.cells[r][c];
    if (!cell) continue;
    if (seen.has(cell.id)) return false;
    seen.add(cell.id);
  }
  return true;
}
const firstStep = (steps, type) => steps.find((s) => s.type === type);
const stepsOf = (steps, type) => steps.filter((s) => s.type === type);
const hasCell = (list, r, c) => list.some((x) => x.r === r && x.c === c);

function checkStepInvariants(steps) {
  assert(steps.length > 0, 'steps not empty');
  assertEq(steps[steps.length - 1].type, 'end', 'last step is end');
  assertEq(stepsOf(steps, 'end').length, 1, 'exactly one end step');
  let lastTotal = -1;
  for (const s of steps) {
    if (s.type === 'match') {
      assert(s.scoreTotal >= lastTotal, 'scoreTotal monotonic');
      assert(Number.isInteger(s.scoreDelta), 'scoreDelta integer');
      lastTotal = s.scoreTotal;
    }
    if (s.type === 'gravity') for (const sp of s.spawns) assert(sp.fromRow < sp.to.r, 'spawn fromRow above its destination');
  }
}

// ---------- PRNG ----------

test('mulberry32: deterministic, bounded, seed-sensitive', () => {
  const a = mulberry32(123), b = mulberry32(123), c = mulberry32(124);
  const seqA = [], seqB = [], seqC = [];
  for (let i = 0; i < 50; i++) { seqA.push(a()); seqB.push(b()); seqC.push(c()); }
  for (let i = 0; i < 50; i++) {
    assertEq(seqA[i], seqB[i], 'same seed same sequence');
    assert(seqA[i] >= 0 && seqA[i] < 1, 'value in [0,1)');
  }
  assert(seqA.some((v, i) => v !== seqC[i]), 'different seeds diverge');
});

test('COLOR_NAMES per contract', () => {
  assertEq(JSON.stringify(COLOR_NAMES), JSON.stringify(['ruby', 'amber', 'emerald', 'sapphire', 'amethyst', 'pearl']));
});

// ---------- board creation ----------

test('creation: no pre-existing matches, always a valid move (many seeds)', () => {
  for (let seed = 1; seed <= 12; seed++) {
    const b = makeBoard({ colors: 4, rows: 8, cols: 8 }, seed);
    assertEq(scanRuns(b), 0, `seed ${seed}: no pre-matches`);
    assert(b.hint(), `seed ${seed}: has a valid move`);
    assert(boardFull(b), `seed ${seed}: board full`);
    assert(uniqueIds(b), `seed ${seed}: ids unique`);
  }
});

test('creation: layout parsing (holes, jelly, locks)', () => {
  const b = makeBoard({
    layout: [
      '##.....',
      '.12....',
      '.L.....',
      '.......',
      '.......',
      '.......',
      '.......',
    ],
    goals: [{ type: 'jelly' }, { type: 'locks' }],
  }, 3);
  assertEq(b.cells[0][0], null, 'hole is null');
  assertEq(b.mask[0][1], false, 'hole mask false');
  assertEq(b.mask[0][2], true, 'playable mask true');
  assertEq(b.jelly[1][1], 1, 'jelly x1');
  assertEq(b.jelly[1][2], 2, 'jelly x2');
  assertEq(b.cells[2][1].lock, 1, 'locked candy');
  const goals = b.goals();
  assertEq(goals[0].type, 'jelly'); assertEq(goals[0].target, 3, 'jelly target = total layers');
  assertEq(goals[1].type, 'locks'); assertEq(goals[1].target, 1, 'locks target');
});

test('isAdjacent', () => {
  const b = makeBoard();
  assert(b.isAdjacent({ r: 3, c: 3 }, { r: 3, c: 4 }));
  assert(b.isAdjacent({ r: 3, c: 3 }, { r: 2, c: 3 }));
  assert(!b.isAdjacent({ r: 3, c: 3 }, { r: 4, c: 4 }), 'diagonal not adjacent');
  assert(!b.isAdjacent({ r: 3, c: 3 }, { r: 3, c: 5 }), 'distance 2 not adjacent');
});

// ---------- swap validity ----------

test('swap-fail: no match produced, no move consumed', () => {
  const b = makeBoard();
  bgFill(b);
  const moves = b.movesLeft;
  const res = b.trySwap({ r: 0, c: 0 }, { r: 0, c: 1 });
  assertEq(res.valid, false);
  assertEq(res.steps.length, 1);
  assertEq(res.steps[0].type, 'swap-fail');
  assertEq(b.movesLeft, moves, 'no move consumed');
});

test('swap-fail: non-adjacent, holes, locked candies', () => {
  const b = makeBoard({ layout: ['#......', '.......', '.......', '.......', '.......', '.......', '.......'] });
  bgFill(b);
  put(b, 3, 3, 4, null, 1); // caged
  assertEq(b.trySwap({ r: 2, c: 2 }, { r: 4, c: 2 }).valid, false, 'non-adjacent');
  assertEq(b.trySwap({ r: 0, c: 0 }, { r: 0, c: 1 }).valid, false, 'hole cell');
  assertEq(b.trySwap({ r: 3, c: 3 }, { r: 3, c: 4 }).valid, false, 'locked cannot swap');
  assertEq(b.trySwap({ r: 2, c: 3 }, { r: 3, c: 3 }).valid, false, 'cannot swap into locked');
});

// ---------- matches & specials creation ----------

test('3-match horizontal: clears 3, scores 180, board refills', () => {
  const b = makeBoard();
  bgFill(b);
  put(b, 3, 0, 4); put(b, 3, 1, 4); put(b, 2, 2, 4);
  const res = b.trySwap({ r: 2, c: 2 }, { r: 3, c: 2 });
  assert(res.valid);
  checkStepInvariants(res.steps);
  assertEq(res.steps[0].type, 'swap');
  const m = firstStep(res.steps, 'match');
  assertEq(m.cascade, 0);
  assertEq(m.cleared.length, 3);
  assert(m.cleared.every((x) => x.color === 4), 'all cleared are color 4');
  assertEq(m.created.length, 0);
  assertEq(m.scoreDelta, 180, '3 × 60');
  assertEq(b.movesLeft, 19, 'one move consumed');
  assert(boardFull(b), 'refilled');
  assert(uniqueIds(b));
  assert(firstStep(res.steps, 'gravity'), 'gravity step emitted');
});

test('3-match vertical works', () => {
  const b = makeBoard();
  bgFill(b);
  put(b, 1, 5, 4); put(b, 2, 5, 4); put(b, 3, 4, 4);
  const res = b.trySwap({ r: 3, c: 4 }, { r: 3, c: 5 });
  assert(res.valid);
  const m = firstStep(res.steps, 'match');
  assertEq(m.cleared.length, 3);
  assert(hasCell(m.cleared, 1, 5) && hasCell(m.cleared, 2, 5) && hasCell(m.cleared, 3, 5));
});

test('match-4 horizontal creates "v" striped at the SWAPPED cell', () => {
  const b = makeBoard();
  bgFill(b);
  put(b, 4, 0, 5); put(b, 4, 1, 5); put(b, 4, 3, 5); put(b, 3, 2, 5);
  const res = b.trySwap({ r: 3, c: 2 }, { r: 4, c: 2 });
  assert(res.valid);
  const m = firstStep(res.steps, 'match');
  assertEq(m.created.length, 1);
  assertEq(m.created[0].special, 'v', 'horizontal 4 → v striped');
  assertEq(m.created[0].r, 4); assertEq(m.created[0].c, 2, 'created at swapped cell');
  assertEq(m.created[0].color, 5);
  assertEq(m.cleared.length, 3, 'created cell is NOT cleared');
  assert(!hasCell(m.cleared, 4, 2));
  assertEq(m.scoreDelta, 3 * 60 + 100, 'special creation bonus');
});

test('match-4 vertical creates "h" striped at the swapped cell', () => {
  const b = makeBoard();
  bgFill(b);
  put(b, 2, 6, 4); put(b, 3, 6, 4); put(b, 5, 6, 4); put(b, 4, 5, 4);
  const res = b.trySwap({ r: 4, c: 5 }, { r: 4, c: 6 });
  assert(res.valid);
  const m = firstStep(res.steps, 'match');
  assertEq(m.created.length, 1);
  assertEq(m.created[0].special, 'h', 'vertical 4 → h striped');
  assertEq(m.created[0].r, 4); assertEq(m.created[0].c, 6);
});

test('5-in-line creates a color bomb', () => {
  const b = makeBoard();
  bgFill(b);
  put(b, 2, 0, 5); put(b, 2, 1, 5); put(b, 2, 3, 5); put(b, 2, 4, 5); put(b, 1, 2, 5);
  const res = b.trySwap({ r: 1, c: 2 }, { r: 2, c: 2 });
  assert(res.valid);
  const m = firstStep(res.steps, 'match');
  assertEq(m.created.length, 1);
  assertEq(m.created[0].special, 'bomb');
  assertEq(m.created[0].r, 2); assertEq(m.created[0].c, 2, 'bomb at swapped cell');
  assertEq(m.cleared.length, 4);
  assertEq(m.scoreDelta, 4 * 60 + 100);
});

test('T/L intersection creates a wrapped candy', () => {
  const b = makeBoard();
  bgFill(b);
  put(b, 5, 2, 4); put(b, 5, 4, 4); put(b, 3, 3, 4); put(b, 4, 3, 4); put(b, 6, 3, 4);
  const res = b.trySwap({ r: 6, c: 3 }, { r: 5, c: 3 });
  assert(res.valid);
  const m = firstStep(res.steps, 'match');
  assertEq(m.created.length, 1);
  assertEq(m.created[0].special, 'wrap');
  assertEq(m.created[0].r, 5); assertEq(m.created[0].c, 3, 'wrap at swapped/intersection cell');
  assertEq(m.cleared.length, 4);
});

// ---------- special firing ----------

test('striped fires when cleared by a normal match (targets exclude origin)', () => {
  const b = makeBoard();
  bgFill(b);
  put(b, 1, 3, 4); put(b, 3, 3, 4, 'h'); put(b, 2, 4, 4);
  const res = b.trySwap({ r: 2, c: 4 }, { r: 2, c: 3 });
  assert(res.valid);
  const sp = firstStep(res.steps, 'special');
  assert(sp, 'special step emitted');
  assertEq(sp.kind, 'h');
  assertEq(sp.origin.r, 3); assertEq(sp.origin.c, 3);
  assertEq(sp.targets.length, 6, 'row of 7 minus origin');
  const m = firstStep(res.steps, 'match');
  assert(res.steps.indexOf(sp) < res.steps.indexOf(m), 'special step before match step');
  assertEq(m.cleared.length, 9, '3 run + 6 row cells');
  assertEq(m.scoreDelta, 9 * 60 + 6 * 30, '+30 per special-cleared cell');
});

test('wrapped fires as 3x3 blast when matched', () => {
  const b = makeBoard();
  bgFill(b);
  put(b, 1, 3, 4); put(b, 3, 3, 4, 'wrap'); put(b, 2, 4, 4);
  const res = b.trySwap({ r: 2, c: 4 }, { r: 2, c: 3 });
  assert(res.valid);
  const sp = firstStep(res.steps, 'special');
  assertEq(sp.kind, 'wrap');
  assertEq(sp.targets.length, 8, '3x3 minus center');
  const m = firstStep(res.steps, 'match');
  assertEq(m.cleared.length, 10, '3 run + 8 blast - 1 overlap');
  assertEq(m.scoreDelta, 10 * 60 + 8 * 30);
});

test('chain-firing: striped cleared by another striped fires in the SAME wave', () => {
  const b = makeBoard();
  bgFill(b);
  put(b, 1, 3, 4); put(b, 3, 3, 4, 'h'); put(b, 2, 4, 4);
  put(b, 3, 6, 5, 'v'); // sits in row 3; the h-stripe will hit it
  const res = b.trySwap({ r: 2, c: 4 }, { r: 2, c: 3 });
  assert(res.valid);
  const m = firstStep(res.steps, 'match');
  const before = res.steps.slice(0, res.steps.indexOf(m));
  const kinds = before.filter((s) => s.type === 'special').map((s) => s.kind).sort();
  assertEq(JSON.stringify(kinds), JSON.stringify(['h', 'v']), 'both specials fired before the match step');
  assertEq(m.cascade, 0, 'same wave');
  assertEq(m.cleared.length, 15, '3 run + 6 row + 6 column');
  for (let rr = 0; rr < 7; rr++) assert(hasCell(m.cleared, rr, 6), `column cell (${rr},6) cleared`);
});

// ---------- swap combos ----------

function comboBoard() {
  const b = makeBoard();
  bgFill(b);
  return b;
}

test('combo stripe+stripe: full cross from swap point', () => {
  const b = comboBoard();
  put(b, 3, 3, 4, 'h'); put(b, 3, 4, 5, 'v');
  const res = b.trySwap({ r: 3, c: 3 }, { r: 3, c: 4 });
  assert(res.valid);
  assertEq(res.steps[0].type, 'swap');
  const sp = firstStep(res.steps, 'special');
  assertEq(sp.kind, 'stripe+stripe');
  assertEq(sp.origin.r, 3); assertEq(sp.origin.c, 4);
  const m = firstStep(res.steps, 'match');
  assertEq(m.cleared.length, 13, 'row 7 + col 7 - 1 overlap');
  assertEq(b.movesLeft, 19);
});

test('combo stripe+wrap: 3 rows + 3 cols', () => {
  const b = comboBoard();
  put(b, 3, 3, 4, 'wrap'); put(b, 3, 4, 5, 'v');
  const res = b.trySwap({ r: 3, c: 3 }, { r: 3, c: 4 });
  assert(res.valid);
  assertEq(firstStep(res.steps, 'special').kind, 'stripe+wrap');
  const m = firstStep(res.steps, 'match');
  assertEq(m.cleared.length, 33, '21 + 21 - 9 overlap on a 7x7');
});

test('combo wrap+wrap: 5x5 blast', () => {
  const b = comboBoard();
  put(b, 3, 3, 4, 'wrap'); put(b, 3, 4, 5, 'wrap');
  const res = b.trySwap({ r: 3, c: 3 }, { r: 3, c: 4 });
  assert(res.valid);
  assertEq(firstStep(res.steps, 'special').kind, 'wrap+wrap');
  const m = firstStep(res.steps, 'match');
  assertEq(m.cleared.length, 25, '5x5 centered on swap point');
});

test('combo bomb+plain: clears all of that color (kind "bomb")', () => {
  const b = comboBoard();
  put(b, 3, 3, 4, 'bomb'); // (3,4) stays bg color 2
  const res = b.trySwap({ r: 3, c: 3 }, { r: 3, c: 4 });
  assert(res.valid, 'bomb+plain is a valid swap without a match');
  const sp = firstStep(res.steps, 'special');
  assertEq(sp.kind, 'bomb');
  const m = firstStep(res.steps, 'match');
  // bg color 2 = r odd, c even = 12 candies (one relocated by the swap) + the bomb
  assertEq(m.cleared.length, 13);
  assert(m.cleared.every((x) => x.color === 2 || x.color === 4), 'only bomb + plain color cleared');
});

test('combo bomb+stripe: infects color with stripes which all fire', () => {
  const b = comboBoard();
  put(b, 3, 3, 4, 'bomb'); put(b, 3, 4, 2, 'h');
  const res = b.trySwap({ r: 3, c: 3 }, { r: 3, c: 4 });
  assert(res.valid);
  const specials = stepsOf(res.steps, 'special');
  assertEq(specials[0].kind, 'bomb+stripe');
  const fired = specials.slice(1).filter((s) => s.kind === 'h' || s.kind === 'v');
  assert(fired.length >= 5, 'converted candies fired individually');
  const m = firstStep(res.steps, 'match');
  assert(m.cleared.some((x) => x.special === 'h' || x.special === 'v'), 'cleared cells carry stripe marks');
  assert(m.cleared.length >= 20, 'large blast');
  assertEq(m.cascade, 0, 'all within the same wave');
});

test('combo bomb+wrap: clears the two most-common colors', () => {
  const b = comboBoard();
  put(b, 3, 3, 4, 'bomb'); put(b, 3, 4, 5, 'wrap');
  const res = b.trySwap({ r: 3, c: 3 }, { r: 3, c: 4 });
  assert(res.valid);
  assertEq(firstStep(res.steps, 'special').kind, 'bomb+wrap');
  const m = firstStep(res.steps, 'match');
  // bg counts on 7x7: color0=16, color1=12 are the two most common
  assertEq(m.cleared.length, 16 + 12 + 2);
  assert(m.cleared.every((x) => [0, 1, 4, 5].includes(x.color)));
});

test('combo bomb+bomb: clears the ENTIRE board', () => {
  const b = comboBoard();
  put(b, 3, 3, 4, 'bomb'); put(b, 3, 4, 5, 'bomb');
  const res = b.trySwap({ r: 3, c: 3 }, { r: 3, c: 4 });
  assert(res.valid);
  assertEq(firstStep(res.steps, 'special').kind, 'bomb+bomb');
  const m = firstStep(res.steps, 'match');
  assertEq(m.cleared.length, 49, 'all 49 cells cleared');
  const g = firstStep(res.steps, 'gravity');
  assertEq(g.spawns.length, 49, 'full respawn');
  assert(g.spawns.every((s) => s.fromRow < 0));
  assert(boardFull(b));
});

test('combo swap that also completes a run: combo cells consumed, run special spawns elsewhere', () => {
  const b = comboBoard();
  put(b, 3, 3, 4, 'h'); put(b, 4, 3, 5, 'v');
  put(b, 4, 1, 4); put(b, 4, 2, 4); put(b, 4, 4, 4); put(b, 4, 5, 4);
  // stripe+stripe combo whose swap also completes a 5-run of color 4 on row 4
  const res = b.trySwap({ r: 3, c: 3 }, { r: 4, c: 3 });
  assert(res.valid);
  assertEq(firstStep(res.steps, 'special').kind, 'stripe+stripe');
  const m = firstStep(res.steps, 'match');
  assert(hasCell(m.cleared, 4, 3) && hasCell(m.cleared, 3, 3), 'both combo specials are consumed');
  assertEq(m.created.length, 1);
  assertEq(m.created[0].special, 'bomb', '5-run still yields its bomb');
  assert(!(m.created[0].r === 4 && m.created[0].c === 3)
    && !(m.created[0].r === 3 && m.created[0].c === 3), 'bomb not planted on a combo cell');
  assertEq(m.cleared.length, 12, 'row + column cross minus the created cell');
});

test('swapping a special into a run of its color: it fires, new special spawns elsewhere', () => {
  const b = makeBoard();
  bgFill(b);
  put(b, 3, 3, 4, 'h');
  put(b, 4, 1, 4); put(b, 4, 2, 4); put(b, 4, 4, 4); put(b, 4, 5, 4);
  // swapping the stripe down completes a 5-run through (4,3)
  const res = b.trySwap({ r: 3, c: 3 }, { r: 4, c: 3 });
  assert(res.valid);
  const sp = firstStep(res.steps, 'special');
  assert(sp, 'existing stripe fired instead of being swallowed');
  assertEq(sp.kind, 'h');
  assertEq(sp.origin.r, 4); assertEq(sp.origin.c, 3);
  const m = firstStep(res.steps, 'match');
  assertEq(m.created.length, 1);
  assertEq(m.created[0].special, 'bomb');
  assert(!(m.created[0].r === 4 && m.created[0].c === 3), 'bomb not planted on the fired stripe');
  assert(hasCell(m.cleared, 4, 3), 'stripe cell cleared, not overwritten');
  assertEq(m.cleared.length, 6, 'run + fired row minus the created cell');
});

// ---------- gravity ----------

test('gravity: holes split columns into independent segments', () => {
  const b = makeBoard({
    layout: ['.......', '.......', '.......', '...#...', '.......', '.......', '.......'],
  });
  bgFill(b);
  put(b, 4, 3, 4); put(b, 6, 3, 4); put(b, 5, 4, 4);
  const above = [b.cells[0][3].id, b.cells[1][3].id, b.cells[2][3].id];
  const res = b.trySwap({ r: 5, c: 4 }, { r: 5, c: 3 });
  assert(res.valid);
  const g = firstStep(res.steps, 'gravity');
  assert(g.moves.every((mv) => !(mv.from.c === 3 && mv.from.r <= 2)), 'upper segment of col 3 does not move');
  const col3spawns = g.spawns.filter((s) => s.to.c === 3);
  assertEq(col3spawns.length, 3, 'lower segment refills from its own top');
  // segment top is row 4 and 3 cells refill: fromRow is segment-relative (to.r - 3), just above row 4
  assert(col3spawns.every((s) => s.to.r >= 4 && s.fromRow === s.to.r - 3 && s.fromRow < 4));
  assertEq(b.cells[0][3].id, above[0]); assertEq(b.cells[1][3].id, above[1]); assertEq(b.cells[2][3].id, above[2]);
  assertEq(b.cells[3][3], null, 'hole stays empty');
});

test('gravity: locked candies anchor — they never move and split segments', () => {
  const b = makeBoard();
  bgFill(b);
  const locked = put(b, 2, 3, 4, null, 1);
  put(b, 4, 3, 5); put(b, 6, 3, 5); put(b, 5, 4, 5);
  const faller = b.cells[3][3].id;
  const aboveLock = [b.cells[0][3].id, b.cells[1][3].id];
  const res = b.trySwap({ r: 5, c: 4 }, { r: 5, c: 3 });
  assert(res.valid);
  const g = firstStep(res.steps, 'gravity');
  assert(g.moves.some((mv) => mv.id === faller && mv.to.r === 6 && mv.to.c === 3), 'candy below lock falls to bottom');
  assert(g.moves.every((mv) => mv.id !== locked.id), 'locked candy never moves');
  assert(g.spawns.every((s) => !(s.to.c === 3 && s.to.r <= 2)), 'no spawns above/at the lock');
  assertEq(b.cells[2][3].id, locked.id, 'lock still anchored');
  assertEq(b.cells[0][3].id, aboveLock[0]);
  assertEq(b.cells[1][3].id, aboveLock[1]);
});

test('gravity: refill fromRow is segment-relative for segments below row 0', () => {
  const b = makeBoard({
    layout: ['...#...', '...#...', '...#...', '.......', '.......', '.......', '.......'],
  });
  bgFill(b);
  b.cells[5][3] = null; b.cells[6][3] = null;
  const g = b._applyGravity();
  const col3 = g.spawns.filter((s) => s.to.c === 3).sort((x, y) => x.to.r - y.to.r);
  assertEq(col3.length, 2, 'two refills in the lower segment');
  // segment top is row 3, two empties: spawns animate from rows 1 and 2
  // (just above the segment's own top), NOT from -2/-1 above the whole board
  assertEq(col3[0].to.r, 3); assertEq(col3[0].fromRow, 1);
  assertEq(col3[1].to.r, 4); assertEq(col3[1].fromRow, 2);
  assert(col3.every((s) => s.fromRow < s.to.r));
  assert(boardFull(b));
});

// ---------- locks ----------

test('lock breaks when its candy participates in a match; candy stays; goal + win', () => {
  const b = makeBoard({
    goals: [{ type: 'locks' }],
    layout: ['.......', '.......', '.......', '...L...', '.......', '.......', '.......'],
  });
  bgFill(b);
  const locked = put(b, 3, 3, 4, null, 1);
  b.jelly[3][3] = 1; // hand-placed jelly: lock break must NOT clear jelly
  put(b, 1, 3, 4); put(b, 2, 4, 4);
  const res = b.trySwap({ r: 2, c: 4 }, { r: 2, c: 3 });
  assert(res.valid);
  const m = firstStep(res.steps, 'match');
  assertEq(m.cleared.length, 2, 'locked candy is not cleared');
  assert(!hasCell(m.cleared, 3, 3));
  assertEq(m.locksBroken.length, 1);
  assert(hasCell(m.locksBroken, 3, 3));
  assertEq(m.jellyCleared.length, 0, 'lock break does not clear jelly');
  assertEq(b.cells[3][3].id, locked.id, 'candy remains');
  assertEq(b.cells[3][3].lock, 0, 'cage gone');
  assert(b.goals()[0].done, 'locks goal complete');
  assert(b.isWin());
  assertEq(res.steps[res.steps.length - 1].win, true);
  assert(b.stars() >= 1, 'winning guarantees a star');
});

test('lock breaks when hit by a firing special (candy not cleared)', () => {
  const b = makeBoard();
  bgFill(b);
  const locked = put(b, 3, 6, 4, null, 1);
  put(b, 1, 3, 5); put(b, 3, 3, 5, 'h'); put(b, 2, 4, 5);
  const res = b.trySwap({ r: 2, c: 4 }, { r: 2, c: 3 });
  assert(res.valid);
  const m = firstStep(res.steps, 'match');
  assert(hasCell(m.locksBroken, 3, 6), 'special broke the cage');
  assert(!hasCell(m.cleared, 3, 6));
  assertEq(m.cleared.length, 8, '3 run + 5 unlocked row cells');
  assertEq(b.cells[3][6].id, locked.id);
  assertEq(b.cells[3][6].lock, 0);
});

// ---------- jelly ----------

test('jelly loses one layer per clear; layers tracked in goals', () => {
  const b = makeBoard({
    goals: [{ type: 'jelly' }],
    layout: ['.......', '.......', '.......', '...2...', '.......', '.......', '.......'],
  });
  bgFill(b);
  put(b, 1, 3, 4); put(b, 2, 3, 4); put(b, 3, 4, 4);
  assertEq(b.goals()[0].target, 2, 'two layers to clear');
  const res = b.trySwap({ r: 3, c: 4 }, { r: 3, c: 3 });
  assert(res.valid);
  const m = firstStep(res.steps, 'match');
  assertEq(m.jellyCleared.length, 1, 'exactly one layer per wave');
  assert(hasCell(m.jellyCleared, 3, 3));
  assert(b.goals()[0].current >= 1);
  assert(b.jelly[3][3] <= 1, 'one layer removed (cascades may remove the second)');
});

// ---------- cascades & scoring ----------

test('cascade wave scores with 1.5x multiplier and cascade index 1', () => {
  const b = makeBoard();
  bgFill(b);
  // vertical 4-clear in col 2 drops (1,2)=5 onto row 4 between two 5s
  put(b, 2, 2, 4); put(b, 4, 2, 4); put(b, 3, 3, 4);
  put(b, 1, 2, 5); put(b, 4, 1, 5); put(b, 4, 3, 5);
  const res = b.trySwap({ r: 3, c: 3 }, { r: 3, c: 2 });
  assert(res.valid);
  const matches = stepsOf(res.steps, 'match');
  assert(matches.length >= 2, 'a cascade happened');
  assertEq(matches[0].cascade, 0);
  assertEq(matches[0].scoreDelta, 180);
  assertEq(matches[1].cascade, 1);
  assert(hasCell(matches[1].cleared, 4, 1) && hasCell(matches[1].cleared, 4, 2) && hasCell(matches[1].cleared, 4, 3));
  assert(matches[1].scoreDelta >= 3 * 90, 'cascade 1 candies worth 90 each');
  checkStepInvariants(res.steps);
});

// ---------- goals / win / fail / stars ----------

test('collect goal counts every cleared candy of that color; win ends level', () => {
  const b = makeBoard({ goals: [{ type: 'collect', color: 4, target: 3 }], moves: 5 });
  bgFill(b);
  put(b, 3, 0, 4); put(b, 3, 1, 4); put(b, 2, 2, 4);
  const res = b.trySwap({ r: 2, c: 2 }, { r: 3, c: 2 });
  assert(res.valid);
  const g = b.goals()[0];
  assert(g.current >= 3 && g.done, 'collected 3 rubies... amethysts');
  assert(b.isWin());
  const end = res.steps[res.steps.length - 1];
  assertEq(end.type, 'end'); assertEq(end.win, true); assertEq(end.fail, false);
  assertEq(b.movesLeft, 4);
  assertEq((b.collected[4] || 0) >= 3, true);
});

test('fail when moves run out without winning', () => {
  const b = makeBoard({ moves: 1 });
  bgFill(b);
  put(b, 3, 0, 4); put(b, 3, 1, 4); put(b, 2, 2, 4);
  const res = b.trySwap({ r: 2, c: 2 }, { r: 3, c: 2 });
  const end = res.steps[res.steps.length - 1];
  assertEq(b.movesLeft, 0);
  assertEq(end.fail, true);
  assertEq(end.win, false);
  assert(b.isFail());
});

test('stars: thresholds from score; winning always gives at least 1', () => {
  const b = makeBoard({ goals: [{ type: 'collect', color: 4, target: 3 }], starScores: [900000, 950000, 999999] });
  bgFill(b);
  put(b, 3, 0, 4); put(b, 3, 1, 4); put(b, 2, 2, 4);
  assertEq(b.stars(), 0, 'no stars before winning');
  b.trySwap({ r: 2, c: 2 }, { r: 3, c: 2 });
  assert(b.isWin());
  assertEq(b.stars(), 1, 'win with low score still 1 star');

  const b2 = makeBoard({ starScores: [100, 150, 999999] });
  bgFill(b2);
  put(b2, 3, 0, 4); put(b2, 3, 1, 4); put(b2, 2, 2, 4);
  b2.trySwap({ r: 2, c: 2 }, { r: 3, c: 2 });
  const expected = b2.levelDef.starScores.filter((s) => b2.score >= s).length;
  assertEq(b2.stars(), Math.min(3, Math.max(expected, b2.isWin() ? 1 : 0)));
  assert(b2.stars() >= 2, 'score cleared two thresholds');
});

// ---------- shuffle ----------

test('stuck board: hint() is null; engine reshuffles into a movable board', () => {
  const b = makeBoard();
  bgFill(b); // checkerboard-ish pattern: provably zero valid moves
  assertEq(b.hint(), null, 'no valid moves on the inert pattern');
  const steps = [];
  b._ensureValidMove(steps);
  assert(steps.some((s) => s.type === 'shuffle'), 'shuffle step emitted');
  const sh = firstStep(steps, 'shuffle');
  assert(sh.cells.length > 0 && sh.cells.every((x) => x.id != null && x.from && x.to));
  assert(b.hint(), 'valid move exists after shuffle');
  assertEq(scanRuns(b), 0, 'shuffle leaves no instant matches');
  assert(boardFull(b) && uniqueIds(b));
});

test('resolution always leaves a playable board (public path)', () => {
  const b = makeBoard();
  bgFill(b);
  put(b, 3, 3, 4, 'bomb');
  const res = b.trySwap({ r: 3, c: 3 }, { r: 3, c: 4 }); // bomb+plain on an otherwise stuck board
  assert(res.valid);
  checkStepInvariants(res.steps);
  assert(b.hint(), 'move guaranteed after resolution');
  assert(boardFull(b));
});

// ---------- serialize / deserialize ----------

test('serialize/deserialize round-trip through JSON', () => {
  const def = makeDef({
    goals: [{ type: 'jelly' }, { type: 'score', target: 500 }],
    layout: ['.......', '.......', '..111..', '...#...', '..L....', '.......', '.......'],
  });
  const b = new Board(def, mulberry32(9));
  const mv = b.hint();
  assert(mv);
  b.trySwap(mv.a, mv.b);
  const json = JSON.parse(JSON.stringify(b.serialize()));
  const r = Board.deserialize(json, def);
  assertEq(r.rows, b.rows); assertEq(r.cols, b.cols);
  assertEq(r.score, b.score);
  assertEq(r.movesLeft, b.movesLeft);
  assertEq(JSON.stringify(r.collected), JSON.stringify(b.collected));
  assertEq(JSON.stringify(r.cells), JSON.stringify(b.cells), 'cells identical');
  assertEq(JSON.stringify(r.jelly), JSON.stringify(b.jelly));
  assertEq(JSON.stringify(r.mask), JSON.stringify(b.mask));
  assertEq(JSON.stringify(r.goals()), JSON.stringify(b.goals()), 'goal progress preserved');
  assertEq(r.stars(), b.stars());
  assertEq(r.isWin(), b.isWin());
  // restored board is playable
  r.rng = mulberry32(77);
  const mv2 = r.hint();
  assert(mv2, 'restored board has a move');
  const res2 = r.trySwap(mv2.a, mv2.b);
  assert(res2.valid && res2.steps[res2.steps.length - 1].type === 'end');
});

// ---------- levels ----------

test('all 24 levels: schema, constructs clean, has a valid move', () => {
  assertEq(LEVEL_COUNT, 24);
  assertEq(LEVELS.length, 24);
  const okChars = new Set(['.', '#', '1', '2', 'L']);
  LEVELS.forEach((lv, i) => {
    assertEq(lv.id, i + 1, 'ids sequential');
    assert(typeof lv.name === 'string' && lv.name.length > 0);
    assert(lv.rows >= 7 && lv.rows <= 9 && lv.cols >= 7 && lv.cols <= 9, `L${lv.id} size`);
    assert([4, 5, 6].includes(lv.colors), `L${lv.id} colors`);
    assert(lv.moves >= 15 && lv.moves <= 25, `L${lv.id} moves 15-25`);
    assert(Array.isArray(lv.starScores) && lv.starScores.length === 3, `L${lv.id} starScores`);
    assert(lv.starScores[0] < lv.starScores[1] && lv.starScores[1] < lv.starScores[2], `L${lv.id} stars ascending`);
    assert(lv.goals.length >= 1, `L${lv.id} has goals`);
    let layoutJelly = 0, layoutLocks = 0;
    if (lv.layout) {
      assertEq(lv.layout.length, lv.rows, `L${lv.id} layout rows`);
      for (const row of lv.layout) {
        assertEq(row.length, lv.cols, `L${lv.id} layout cols`);
        for (const ch of row) {
          assert(okChars.has(ch), `L${lv.id} bad layout char ${ch}`);
          if (ch === '1') layoutJelly += 1;
          if (ch === '2') layoutJelly += 2;
          if (ch === 'L') layoutLocks += 1;
        }
      }
    }
    for (const g of lv.goals) {
      assert(['score', 'collect', 'jelly', 'locks'].includes(g.type), `L${lv.id} goal type`);
      if (g.type === 'score') assert(g.target > 0);
      if (g.type === 'collect') {
        assert(g.color >= 0 && g.color < lv.colors, `L${lv.id} collect color within palette`);
        assert(g.target > 0);
      }
      if (g.type === 'jelly') assert(layoutJelly > 0, `L${lv.id} jelly goal needs jelly cells`);
      if (g.type === 'locks') assert(layoutLocks > 0, `L${lv.id} locks goal needs L cells`);
    }
    if (lv.goals.some((g) => g.type === 'score')) {
      const t = Math.max(...lv.goals.filter((g) => g.type === 'score').map((g) => g.target));
      assert(lv.starScores[0] <= t, `L${lv.id} 1-star reachable by just winning`);
    }
    // constructs without throwing, no pre-matches, has a move, layout honored
    const board = new Board(lv, mulberry32(lv.id * 1000 + 7));
    assertEq(scanRuns(board), 0, `L${lv.id} no pre-matches`);
    assert(board.hint(), `L${lv.id} has a valid move`);
    assert(boardFull(board), `L${lv.id} filled`);
    let locks = 0;
    for (let r = 0; r < board.rows; r++) for (let c = 0; c < board.cols; c++) {
      const ch = lv.layout ? lv.layout[r][c] : '.';
      assertEq(board.mask[r][c], ch !== '#', `L${lv.id} mask at ${r},${c}`);
      assertEq(board.jelly[r][c], ch === '1' ? 1 : ch === '2' ? 2 : 0, `L${lv.id} jelly at ${r},${c}`);
      if (board.cells[r][c]?.lock) locks++;
      if (board.cells[r][c]) assert(board.cells[r][c].color < lv.colors, `L${lv.id} color range`);
    }
    assertEq(locks, layoutLocks, `L${lv.id} locks placed`);
  });
  assertEq(getLevel(24).name, 'Jackpot Finale');
  assertEq(getLevel(25), null);
});

test('level creation is robust across many seeds', () => {
  for (const id of [1, 8, 10, 15, 19, 22, 24]) {
    const lv = getLevel(id);
    for (let seed = 1; seed <= 6; seed++) {
      const board = new Board(lv, mulberry32(seed * 31 + id));
      assertEq(scanRuns(board), 0, `L${id} seed ${seed} no pre-matches`);
      assert(board.hint(), `L${id} seed ${seed} has a move`);
    }
  }
});

test('soak: random playthroughs never wedge, corrupt, or loop', () => {
  for (const id of [3, 8, 13, 16, 19, 22, 24]) {
    const lv = getLevel(id);
    const board = new Board(lv, mulberry32(id * 7919 + 1));
    let guard = 0;
    while (board.movesLeft > 0 && !board.isWin() && guard++ < 40) {
      const mv = board.hint();
      assert(mv, `L${id}: engine guarantees a move (move ${guard})`);
      const res = board.trySwap(mv.a, mv.b);
      assert(res.valid, `L${id}: hint move is valid`);
      checkStepInvariants(res.steps);
      assert(boardFull(board), `L${id}: board full after move ${guard}`);
      assert(uniqueIds(board), `L${id}: unique ids after move ${guard}`);
      assert(scanRuns(board) === 0, `L${id}: no unresolved matches after move ${guard}`);
      const end = res.steps[res.steps.length - 1];
      assertEq(end.score, board.score);
      assertEq(end.movesLeft, board.movesLeft);
    }
    assert(board.isWin() || board.movesLeft === 0 || guard >= 40, `L${id} playthrough terminated sanely`);
  }
});

// ---------- summary ----------

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
