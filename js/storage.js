// Swoosh — localStorage persistence.
// Contract: docs/ARCHITECTURE.md (§ js/storage.js)
// Single key `swoosh.v1`. Every method is try/catch safe (private mode,
// quota exceeded, disabled storage — all degrade to in-memory defaults).

const KEY = 'swoosh.v1';

const DEFAULTS = () => ({
  levels: {},                       // { [id]: {stars, bestScore} }
  run: null,                        // { levelId, boardJSON } | null
  settings: { music: true, sfx: true },
});

// In-memory fallback so the game still behaves sanely for the session
// even when localStorage is completely unavailable.
let memState = null;

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const base = DEFAULTS();
        return {
          levels: (parsed.levels && typeof parsed.levels === 'object') ? parsed.levels : base.levels,
          run: parsed.run ?? null,
          settings: { ...base.settings, ...(parsed.settings || {}) },
        };
      }
    }
  } catch (_) { /* fall through */ }
  return memState ? { ...memState } : DEFAULTS();
}

function write(state) {
  memState = state;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (_) { /* private mode / quota — memState keeps the session alive */ }
}

export const storage = {
  /** Full persisted state object. */
  load() {
    try {
      return read();
    } catch (_) {
      return DEFAULTS();
    }
  },

  /** → {stars, bestScore} | null */
  getLevelResult(id) {
    try {
      const r = read().levels[id];
      return r ? { stars: r.stars | 0, bestScore: r.bestScore | 0 } : null;
    } catch (_) {
      return null;
    }
  },

  /** Persists the BEST of existing/new stars and score. */
  setLevelResult(id, { stars, score }) {
    try {
      const state = read();
      const prev = state.levels[id] || { stars: 0, bestScore: 0 };
      state.levels[id] = {
        stars: Math.max(prev.stars | 0, stars | 0),
        bestScore: Math.max(prev.bestScore | 0, score | 0),
      };
      write(state);
    } catch (_) { /* ignore */ }
  },

  /** Highest playable level id (1-based): best completed + 1. */
  unlockedLevel() {
    try {
      const levels = read().levels;
      let maxDone = 0;
      for (const id of Object.keys(levels)) {
        const n = Number(id);
        if (levels[id] && (levels[id].stars | 0) >= 1 && n > maxDone) maxDone = n;
      }
      return maxDone + 1;
    } catch (_) {
      return 1;
    }
  },

  /** Persist mid-level board state so a reload can resume. */
  saveRun(levelId, boardJSON) {
    try {
      const state = read();
      state.run = { levelId, boardJSON };
      write(state);
    } catch (_) { /* ignore */ }
  },

  /** → {levelId, boardJSON} | null */
  getRun() {
    try {
      const run = read().run;
      return (run && run.levelId && run.boardJSON) ? run : null;
    } catch (_) {
      return null;
    }
  },

  clearRun() {
    try {
      const state = read();
      state.run = null;
      write(state);
    } catch (_) { /* ignore */ }
  },

  /** → {music: bool, sfx: bool} */
  getSettings() {
    try {
      const s = read().settings;
      return { music: s.music !== false, sfx: s.sfx !== false };
    } catch (_) {
      return { music: true, sfx: true };
    }
  },

  setSettings(patch) {
    try {
      const state = read();
      state.settings = { ...state.settings, ...(patch || {}) };
      write(state);
    } catch (_) { /* ignore */ }
  },
};
