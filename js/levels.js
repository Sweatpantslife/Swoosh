// Swoosh — 24 level definitions + helpers.
// Contract: docs/ARCHITECTURE.md (§ js/levels.js)
//
// Design notes (from docs/research/):
// - Sawtooth difficulty: pulses around L5, L10, L16, L20, L23 with a breather right after.
// - Goal rotation: score (L1-3) -> collect (L4) -> jelly (L6) -> holes (L8) -> locks (L10),
//   then mixed goals; one new mechanic at a time, introduced on an easy board.
// - 4 colors is the cascade-friendly default; 5 is the mid-game dial; 6 is the hard mode dial (L18+).
// - Move budgets 15-25. starScores[0] is reachable by simply winning; starScores[2] demands cascade play.
// - Layout chars: '.'=normal '#'=hole '1'=jelly x1 '2'=jelly x2 'L'=locked candy.

export const LEVELS = [
  // --- Act 1: warm welcome (score tutorials, failure-free pacing) ---
  {
    id: 1, name: 'First Facet',
    rows: 7, cols: 7, colors: 4, moves: 24,
    goals: [{ type: 'score', target: 1500 }],
    starScores: [1500, 3200, 6000],
  },
  {
    id: 2, name: 'Double Shine',
    rows: 7, cols: 7, colors: 4, moves: 22,
    goals: [{ type: 'score', target: 2600 }],
    starScores: [2600, 4600, 7000],
  },
  {
    id: 3, name: 'Triple Sparkle',
    rows: 8, cols: 8, colors: 4, moves: 22,
    goals: [{ type: 'score', target: 3800 }],
    starScores: [3800, 5800, 8600],
  },

  // --- Collect goals arrive (L4), first pulse at L5 ---
  {
    id: 4, name: 'Ruby Rush',
    rows: 8, cols: 8, colors: 4, moves: 20,
    goals: [{ type: 'collect', color: 0, target: 32 }],
    starScores: [2600, 8000, 14000],
  },
  {
    id: 5, name: 'Treasure Trove', // pulse: two collect goals at once
    rows: 8, cols: 8, colors: 5, moves: 21,
    goals: [
      { type: 'collect', color: 0, target: 18 },
      { type: 'collect', color: 3, target: 18 },
    ],
    starScores: [3000, 8000, 13500],
  },

  // --- Jelly arrives (L6) on a small friendly board ---
  {
    id: 6, name: 'Jelly Gleam',
    rows: 7, cols: 7, colors: 4, moves: 20,
    goals: [{ type: 'jelly' }],
    layout: [
      '.......',
      '.......',
      '..111..',
      '..111..',
      '..111..',
      '.......',
      '.......',
    ],
    starScores: [2400, 7000, 12500],
  },
  {
    id: 7, name: 'Sticky Streak', // breather: more jelly but 4 colors = cascade city
    rows: 8, cols: 8, colors: 4, moves: 22,
    goals: [{ type: 'jelly' }],
    layout: [
      '........',
      '........',
      '........',
      '.111111.',
      '.111111.',
      '........',
      '........',
      '........',
    ],
    starScores: [3000, 10000, 18000],
  },

  // --- Shaped boards arrive (L8) ---
  {
    id: 8, name: 'The Donut',
    rows: 8, cols: 8, colors: 4, moves: 20,
    goals: [{ type: 'score', target: 5200 }],
    layout: [
      '........',
      '........',
      '........',
      '...##...',
      '...##...',
      '........',
      '........',
      '........',
    ],
    starScores: [5200, 6800, 8200],
  },
  {
    id: 9, name: 'Twin Treasures', // first mixed goal: collect + a jelly strip
    rows: 9, cols: 9, colors: 5, moves: 21,
    goals: [
      { type: 'collect', color: 2, target: 22 },
      { type: 'jelly' },
    ],
    layout: [
      '.........',
      '.........',
      '.........',
      '.........',
      '..11111..',
      '.........',
      '.........',
      '.........',
      '.........',
    ],
    starScores: [3200, 8000, 13500],
  },

  // --- Locks arrive (L10): pulse, then breather ---
  {
    id: 10, name: 'Caged Gems', // pulse
    rows: 7, cols: 7, colors: 4, moves: 20,
    goals: [{ type: 'locks' }],
    layout: [
      '.......',
      '.......',
      '..L.L..',
      '.L...L.',
      '..L.L..',
      '.......',
      '.......',
    ],
    starScores: [2600, 8000, 14000],
  },
  {
    id: 11, name: 'Lucky Break', // breather
    rows: 8, cols: 8, colors: 4, moves: 24,
    goals: [{ type: 'score', target: 4800 }],
    starScores: [4800, 7000, 9800],
  },
  {
    id: 12, name: 'Neon Nights',
    rows: 8, cols: 8, colors: 5, moves: 21,
    goals: [
      { type: 'collect', color: 4, target: 20 },
      { type: 'collect', color: 1, target: 20 },
    ],
    starScores: [3200, 8500, 14000],
  },

  // --- Act 2: layered pressure ---
  {
    id: 13, name: 'Jelly Junction', // double-layer jelly debuts
    rows: 8, cols: 8, colors: 5, moves: 22,
    goals: [{ type: 'jelly' }],
    layout: [
      '........',
      '..1111..',
      '..1221..',
      '..1221..',
      '..1111..',
      '........',
      '........',
      '........',
    ],
    starScores: [3200, 8000, 13000],
  },
  {
    id: 14, name: 'Vault Doors',
    rows: 8, cols: 8, colors: 5, moves: 22,
    goals: [
      { type: 'locks' },
      { type: 'score', target: 4000 },
    ],
    layout: [
      '........',
      '.L....L.',
      '.L....L.',
      '........',
      '........',
      '.L....L.',
      '.L....L.',
      '........',
    ],
    starScores: [4000, 9000, 15000],
  },
  {
    id: 15, name: 'The Pyramid',
    rows: 9, cols: 9, colors: 5, moves: 22,
    goals: [
      { type: 'collect', color: 0, target: 16 },
      { type: 'collect', color: 2, target: 16 },
    ],
    layout: [
      '####.####',
      '###...###',
      '##.....##',
      '#.......#',
      '.........',
      '.........',
      '.........',
      '.........',
      '.........',
    ],
    starScores: [3200, 8000, 13000],
  },
  {
    id: 16, name: 'Sticky Cage', // pulse: jelly + locks together
    rows: 8, cols: 8, colors: 5, moves: 21,
    goals: [{ type: 'jelly' }, { type: 'locks' }],
    layout: [
      '........',
      '..1111..',
      '..1LL1..',
      '..1LL1..',
      '..1111..',
      '........',
      '........',
      '........',
    ],
    starScores: [3200, 8000, 13500],
  },
  {
    id: 17, name: 'Cool Down', // breather
    rows: 8, cols: 8, colors: 4, moves: 24,
    goals: [{ type: 'score', target: 6000 }],
    starScores: [6000, 8400, 11500],
  },
  {
    id: 18, name: 'Six Facets', // 6th color debuts on a clean board
    rows: 8, cols: 8, colors: 6, moves: 22,
    goals: [{ type: 'collect', color: 5, target: 16 }],
    starScores: [3000, 7500, 12500],
  },

  // --- Act 3: the show floor ---
  {
    id: 19, name: 'The Cross',
    rows: 9, cols: 9, colors: 5, moves: 22,
    goals: [{ type: 'jelly' }],
    layout: [
      '###...###',
      '###...###',
      '###111###',
      '.........',
      '.11...11.',
      '.........',
      '###111###',
      '###...###',
      '###...###',
    ],
    starScores: [3000, 6200, 9600],
  },
  {
    id: 20, name: 'Treasure House', // pulse: collect + locks
    rows: 8, cols: 8, colors: 5, moves: 20,
    goals: [
      { type: 'collect', color: 1, target: 18 },
      { type: 'locks' },
    ],
    layout: [
      '........',
      '........',
      '..L..L..',
      '........',
      '........',
      '..L..L..',
      '........',
      '........',
    ],
    starScores: [3400, 8000, 13000],
  },
  {
    id: 21, name: 'Velvet Rope', // breather: big board, 4 colors, jelly ring
    rows: 9, cols: 9, colors: 4, moves: 24,
    goals: [{ type: 'jelly' }],
    layout: [
      '.........',
      '.1111111.',
      '.1.....1.',
      '.1.....1.',
      '.1.....1.',
      '.1.....1.',
      '.1.....1.',
      '.1111111.',
      '.........',
    ],
    starScores: [6000, 18000, 42000],
  },
  {
    id: 22, name: 'Diamond Vault', // pre-finale breather: 5 colors keeps cascades alive
    rows: 9, cols: 9, colors: 5, moves: 22,
    goals: [
      { type: 'locks' },
      { type: 'score', target: 5000 },
    ],
    layout: [
      '###...###',
      '##.....##',
      '#..L.L..#',
      '....L....',
      '..L...L..',
      '....L....',
      '#..L.L..#',
      '##.....##',
      '###...###',
    ],
    starScores: [5000, 7500, 9800],
  },
  {
    id: 23, name: 'Crown Jewels', // pulse: double jelly core + collect
    rows: 9, cols: 9, colors: 5, moves: 22,
    goals: [
      { type: 'jelly' },
      { type: 'collect', color: 3, target: 18 },
    ],
    layout: [
      '.........',
      '.........',
      '.........',
      '.........',
      '...222...',
      '...222...',
      '.........',
      '.........',
      '.........',
    ],
    starScores: [4000, 11000, 19000],
  },
  {
    id: 24, name: 'Jackpot Finale', // everything at once, generous moves
    rows: 9, cols: 9, colors: 6, moves: 25,
    goals: [
      { type: 'score', target: 9000 },
      { type: 'jelly' },
      { type: 'locks' },
    ],
    layout: [
      '.........',
      '..L...L..',
      '.11...11.',
      '.........',
      '.........',
      '.........',
      '.11...11.',
      '..L...L..',
      '.........',
    ],
    starScores: [9000, 12500, 16500],
  },
];

/** Get a level definition by 1-based id (null if out of range). */
export function getLevel(id) {
  return LEVELS.find((l) => l.id === id) || null;
}

export const LEVEL_COUNT = LEVELS.length;
