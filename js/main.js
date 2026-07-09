// Swoosh — bootstrap, asset loading, input, main loop, event wiring.
// Contract: docs/ARCHITECTURE.md (§ js/main.js + Clarifications v1.1).
// Renderer.playSteps owns the fx/audio timeline; main.js handles HUD,
// banners, persistence and win/fail flow via hooks, plus all input.

import { Board } from './engine.js';
import { getLevel } from './levels.js';
import { storage } from './storage.js';
import { AudioMan } from './audio.js';
import { Renderer } from './renderer.js';
import { FX } from './particles.js';
import { UI } from './ui.js';

const VERSION = '1.0.0';
const SPRITE_KEYS = [
  'candy-ruby', 'candy-amber', 'candy-emerald', 'candy-sapphire',
  'candy-amethyst', 'candy-pearl', 'candy-bomb', 'lock',
];
const HINT_DELAY_MS = 5000;
const DRAG_THRESHOLD = 0.35; // × cell size

// ---------------------------------------------------------------- DOM refs

const appEl = document.getElementById('app');
const boardWrap = document.getElementById('board-wrap');
const canvasBoard = document.getElementById('canvas-board');
const canvasFx = document.getElementById('canvas-fx');

// ---------------------------------------------------------------- modules

const sprites = new Map();           // key → HTMLCanvasElement (shared with renderer)
const svgImages = new Map();         // key → HTMLImageElement (re-rasterized on resize)
let spriteSize = 0;

const audio = new AudioMan();
const renderer = new Renderer(canvasBoard, sprites);
const fx = new FX(canvasFx);

// ---------------------------------------------------------------- state

let board = null;
let currentDef = null;
let levelOver = false;
let inputLocked = false;
let selected = null;
let drag = null;
let hintTimer = 0;
let audioReady = false;
let epoch = 0; // bumped on level enter/exit; stale async work checks it and bails

// FX spawn coordinates are board-canvas CSS px; when #canvas-fx is inset
// beyond the board this shim translates them into fx-canvas space (the offset
// is measured in resizeBoard). Delegates keep `this === fx` so pool/trauma
// state stays on the real FX instance.
const fxOffset = { x: 0, y: 0 };
const fxBoard = {
  get shakeOffset() { return fx.shakeOffset; },
  shake: (i) => fx.shake(i),
  fireworks: (ms) => fx.fireworks(ms),
  confettiWin: () => fx.confettiWin(),
  matchBurst: (x, y, ...rest) => fx.matchBurst(x + fxOffset.x, y + fxOffset.y, ...rest),
  specialCreate: (x, y, ...rest) => fx.specialCreate(x + fxOffset.x, y + fxOffset.y, ...rest),
  lineBlast: (x, y, ...rest) => fx.lineBlast(x + fxOffset.x, y + fxOffset.y, ...rest),
  wrapBlast: (x, y, ...rest) => fx.wrapBlast(x + fxOffset.x, y + fxOffset.y, ...rest),
  colorBombNova: (x, y) => fx.colorBombNova(x + fxOffset.x, y + fxOffset.y),
};

// ---------------------------------------------------------------- sprites

async function loadSvgImages() {
  await Promise.all(SPRITE_KEYS.map(async (key) => {
    try {
      const res = await fetch(`assets/svg/${key}.svg`);
      if (!res.ok) throw new Error(String(res.status));
      let text = await res.text();
      // Give the SVG an intrinsic size so drawImage scaling is reliable everywhere.
      if (!/<svg[^>]*\swidth=/.test(text)) {
        text = text.replace(/<svg /, '<svg width="128" height="128" ');
      }
      const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }));
      try {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error('svg decode'));
          img.src = url;
        });
        svgImages.set(key, img);
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (_) {
      // Missing sprite: renderer draws a gradient-disc fallback; never fatal.
    }
  }));
}

/** Rasterize every SVG to an offscreen canvas at 2× the current cell size. */
function rasterizeSprites(cellPx) {
  const size = Math.max(32, Math.round(cellPx * 2));
  if (size === spriteSize) return;
  spriteSize = size;
  for (const [key, img] of svgImages) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    cv.getContext('2d').drawImage(img, 0, 0, size, size);
    sprites.set(key, cv);
  }
}

// ---------------------------------------------------------------- resize

function resizeBoard() {
  const rect = boardWrap.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.resize(w, h, dpr);
  // The FX canvas may be inset beyond the board (CSS lets blasts overhang):
  // size it to its own rect and record the board→fx coordinate offset.
  const fxRect = canvasFx.getBoundingClientRect();
  fx.resize(
    Math.max(1, Math.round(fxRect.width)),
    Math.max(1, Math.round(fxRect.height)),
    dpr,
  );
  fxOffset.x = rect.left - fxRect.left;
  fxOffset.y = rect.top - fxRect.top;
  if (renderer.layout) rasterizeSprites(renderer.layout.cell);
}

if (typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(() => {
    if (board && boardWrap.clientWidth > 0) resizeBoard();
  }).observe(boardWrap);
}
window.addEventListener('resize', () => {
  if (board && boardWrap.clientWidth > 0) resizeBoard();
});

// ---------------------------------------------------------------- audio

function ensureAudio() {
  if (audioReady) return Promise.resolve();
  audioReady = true;
  return audio.init().then(() => {
    if (audio.musicOn) audio.startMusic();
  });
}
// First user gesture anywhere unlocks the AudioContext.
window.addEventListener('pointerdown', () => { ensureAudio(); }, { once: true });

// ---------------------------------------------------------------- UI

const ui = new UI(appEl, {
  onPlayLevel: (id) => startLevel(id),
  onRetry: () => { if (currentDef) startLevel(currentDef.id); },
  onNext: () => {
    const nextId = currentDef ? currentDef.id + 1 : 1;
    if (getLevel(nextId)) startLevel(nextId);
    else showMapScreen();
  },
  onQuit: () => { storage.clearRun(); showMapScreen(); },
  onMusic: (b) => {
    storage.setSettings({ music: b });
    ensureAudio().then(() => audio.setMusicOn(b));
    if (!b) audio.setMusicOn(false);
  },
  onSfx: (b) => {
    storage.setSettings({ sfx: b });
    audio.setSfxOn(b);
  },
  onButtonSound: () => { ensureAudio(); audio.play('sfx-button'); },
});

// Seed audio flags from persisted settings (before any playback).
{
  const s = storage.getSettings();
  audio.musicOn = !!s.music;
  audio.sfxOn = !!s.sfx;
}

// ---------------------------------------------------------------- hint idle timer

function armHint() {
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => {
    if (board && !inputLocked && !levelOver) renderer.showHint(board.hint());
  }, HINT_DELAY_MS);
}

function touchHint() {
  renderer.showHint(null);
  armHint();
}

// ---------------------------------------------------------------- step hooks (HUD / banners / flow)

const hooks = {
  onMatchStep(step) {
    ui.updateHUD({
      score: step.scoreTotal,
      goals: board.goals(),
      stars: board.stars(),
    });
    if (step.cascade >= 2) {
      ui.banner(`CASCADE ×${step.cascade}!`);
    } else if (step.cascade === 0 && (step.created.length > 0 || step.cleared.length >= 6)) {
      ui.banner('SWEET!');
    }
  },
  onEnd(step) {
    ui.updateHUD({
      score: step.score,
      movesLeft: step.movesLeft,
      goals: board.goals(),
      stars: board.stars(),
    });
    if (step.win) finishWin(step.score);
    else if (step.fail) finishFail();
  },
};

function finishWin(score) {
  levelOver = true;
  clearTimeout(hintTimer);
  renderer.showHint(null);
  const stars = Math.max(1, board.stars());
  storage.setLevelResult(currentDef.id, { stars, score });
  storage.clearRun();
  // Let the on-board confetti/fireworks play before the modal covers them.
  const gen = epoch;
  const levelId = currentDef.id;
  setTimeout(() => {
    if (gen !== epoch) return; // quit/restarted meanwhile
    ui.showWin({
      stars,
      score,
      levelId,
      onStarShown: () => audio.play('sfx-star-earned'),
    });
  }, 1400);
}

function finishFail() {
  levelOver = true;
  clearTimeout(hintTimer);
  renderer.showHint(null);
  const goals = board.goals(); // captured before clearRun: near-miss framing
  storage.clearRun();
  ui.showFail({ levelId: currentDef.id, goals });
}

// ---------------------------------------------------------------- turn pipeline

/** The one true swap pipeline (user input AND __swoosh.swap use this). */
function doSwap(a, b) {
  if (!board || inputLocked || levelOver) {
    return Promise.resolve({ valid: false, steps: [] });
  }
  inputLocked = true;
  selected = null;
  drag = null;
  renderer.setSelected(null);
  renderer.showHint(null);
  clearTimeout(hintTimer);

  // Capture the epoch: if the level is quit/restarted mid-pipeline, every
  // hook and the settle handler below become no-ops instead of driving the
  // HUD/persistence of a board this run no longer owns.
  const gen = epoch;
  const runHooks = {
    onMatchStep: (step) => { if (gen === epoch) hooks.onMatchStep(step); },
    onEnd: (step) => { if (gen === epoch) hooks.onEnd(step); },
  };

  const result = board.trySwap(a, b);
  if (result.valid) ui.updateHUD({ movesLeft: board.movesLeft });

  return renderer.playSteps(result.steps, fxBoard, audio, runHooks)
    .catch(() => {})
    .then(() => {
      if (gen !== epoch) return result;
      if (result.valid && !levelOver) {
        storage.saveRun(currentDef.id, board.serialize());
      }
      inputLocked = false;
      if (!levelOver) armHint();
      return result;
    });
}

// ---------------------------------------------------------------- pointer input (#canvas-fx, top layer)

function canvasPos(e) {
  // Board-canvas space: #canvas-fx (the input layer) may be inset beyond it.
  const r = canvasBoard.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

canvasFx.addEventListener('pointerdown', (e) => {
  if (!board || inputLocked || levelOver) return;
  touchHint();
  const p = canvasPos(e);
  const cell = renderer.pickCell(p.x, p.y);
  if (!cell || !board.cells[cell.r][cell.c]) {
    selected = null;
    renderer.setSelected(null);
    return;
  }
  // Tap-then-tap-adjacent completes a swap.
  if (selected && !(selected.r === cell.r && selected.c === cell.c)
      && board.isAdjacent(selected, cell)) {
    doSwap(selected, cell);
    return;
  }
  selected = cell;
  renderer.setSelected(cell);
  drag = { cell, x: p.x, y: p.y, id: e.pointerId };
  try { canvasFx.setPointerCapture(e.pointerId); } catch (_) { /* ok */ }
});

canvasFx.addEventListener('pointermove', (e) => {
  if (!drag || !board || inputLocked || levelOver) return;
  const p = canvasPos(e);
  const dx = p.x - drag.x;
  const dy = p.y - drag.y;
  const threshold = (renderer.layout ? renderer.layout.cell : 64) * DRAG_THRESHOLD;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return;
  const horiz = Math.abs(dx) >= Math.abs(dy);
  const from = drag.cell;
  const to = horiz
    ? { r: from.r, c: from.c + (dx > 0 ? 1 : -1) }
    : { r: from.r + (dy > 0 ? 1 : -1), c: from.c };
  drag = null;
  if (to.r < 0 || to.r >= board.rows || to.c < 0 || to.c >= board.cols
      || !board.cells[to.r][to.c]) {
    return; // dragged off the board / into a hole — keep the selection
  }
  doSwap(from, to);
});

const endDrag = () => { drag = null; };
canvasFx.addEventListener('pointerup', endDrag);
canvasFx.addEventListener('pointercancel', endDrag);

// ---------------------------------------------------------------- screens / level flow

function showMapScreen() {
  epoch++; // orphan any in-flight playSteps pipeline
  board = null;
  levelOver = false;
  inputLocked = false;
  selected = null;
  drag = null;
  clearTimeout(hintTimer);
  ui.hideModals();
  ui.showMap(storage.load().levels, storage.unlockedLevel());
  ui.setScreen('map');
}

function startLevel(id) {
  const def = getLevel(id);
  if (!def) return;
  currentDef = def;
  board = new Board(def);
  storage.saveRun(id, board.serialize());
  enterGame();
}

function resumeRun(run) {
  const def = getLevel(run.levelId);
  if (!def || !run.boardJSON) return false;
  try {
    board = Board.deserialize(run.boardJSON, def);
    currentDef = def;
    enterGame();
  } catch (_) {
    // Corrupt/legacy payload (may deserialize yet still blow up in
    // enterGame): drop it so it can't re-brick every subsequent boot.
    storage.clearRun();
    board = null;
    return false;
  }
  return true;
}

function enterGame() {
  epoch++; // orphan any in-flight playSteps pipeline
  levelOver = false;
  inputLocked = false;
  selected = null;
  drag = null;
  ui.hideModals();
  ui.showHUD(currentDef);
  ui.setScreen('game');       // unhide first so #board-wrap has dimensions
  renderer.setBoard(board);
  resizeBoard();              // layout + sprite rasterization at the new cell size
  ui.updateHUD({
    score: board.score,
    movesLeft: board.movesLeft,
    goals: board.goals(),
    stars: board.stars(),
  });
  armHint();
}

// ---------------------------------------------------------------- main loop

let lastT = performance.now();
function frame(t) {
  const dt = t - lastT;
  lastT = t;
  fx.update(dt);
  // Map screen (board === null): skip repainting the hidden board canvas —
  // renderer.setBoard(null) is not part of its contract, so gate here.
  if (board) renderer.render(t, dt);
  fx.render();
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- test hooks

function setAllMuted(m) {
  audio.setSfxOn(!m);
  audio.setMusicOn(!m);
}

window.__swoosh = {
  version: VERSION,
  board: () => board,
  ui,
  gotoLevel: (id) => startLevel(id),
  forceEnd: (win) => {
    if (!board || levelOver) return;
    hooks.onEnd({
      type: 'end', win: !!win, fail: !win,
      score: board.score, movesLeft: board.movesLeft,
    });
  },
  swap: async (a, b) => {
    // Exact user pipeline: engine trySwap + playSteps + persistence.
    while (inputLocked) await new Promise((r) => setTimeout(r, 40));
    return doSwap(a, b);
  },
  muted: setAllMuted,
};

// ---------------------------------------------------------------- boot

(async function boot() {
  // Start the loop first: no failure below may ever leave a dead page.
  requestAnimationFrame(frame);
  try {
    await loadSvgImages();
    const run = storage.getRun();
    if (run && resumeRun(run)) return;
  } catch (_) {
    try { storage.clearRun(); } catch (_) { /* ignore */ }
  }
  showMapScreen();
})();
