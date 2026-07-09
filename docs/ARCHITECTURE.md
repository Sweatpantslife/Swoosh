# Swoosh — Architecture Contract v1

This contract is BINDING for all modules. Every cross-module signature lives here. Do not deviate; if you must, update this doc in the same commit.

## Stack
Vanilla JS ES modules. No build step, no runtime dependencies. Two layered `<canvas>` elements (board + particle FX), DOM for all chrome/UI. Static-hostable; dev via `python3 -m http.server 8000`.

## File ownership
| File | Contents |
|---|---|
| `index.html` | Shell, screens, canvases, modals |
| `css/styles.css` | Casino theme, UI styling, DOM animations |
| `js/engine.js` | Pure game logic — ZERO DOM, must run under node |
| `js/levels.js` | 24 level definitions + helpers |
| `js/storage.js` | localStorage persistence |
| `js/audio.js` | Audio manager |
| `js/renderer.js` | Canvas board renderer, spring animation |
| `js/particles.js` | FX: particles, trails, shake, fireworks |
| `js/ui.js` | DOM UI: map, HUD, modals, banners |
| `js/main.js` | Bootstrap, asset load, input, loop, event wiring |
| `assets/svg/*` | Original SVG sprites |
| `tests/engine.test.mjs` | Node test suite for engine |

## Shared conventions
- Cell coordinates are `{r, c}`, row 0 at top.
- Color ids `0..5` map to `COLOR_NAMES = ['ruby','amber','emerald','sapphire','amethyst','pearl']`.
- Candy silhouettes are casino-themed per color: ruby=heart, amber=diamond(suit), emerald=club, sapphire=star, amethyst=spade, pearl=poker chip.
- Special codes: `null | 'h' | 'v' | 'wrap' | 'bomb'`. `'h'` clears its ROW when fired; `'v'` clears its COLUMN.
- Every candy has a unique monotonic integer `id` assigned by the engine (stable across moves — used by renderer to track tiles).
- Shared palette (hex): ruby `#ff2d55`/dark `#b3123a`; amber `#ffb300`/`#ff8f00`; emerald `#00d97a`/`#00a05a`; sapphire `#2e8bff`/`#1259c3`; amethyst `#b44cff`/`#7a1fd0`; pearl `#f4f6ff`/`#c0c9e0`; gold accent `#ffd54a`; bg deep purple `#1a0b2e`→`#2d1050`.

## `js/engine.js`
Exports: `COLOR_NAMES`, `mulberry32(seed)` (returns `() => float [0,1)` PRNG), `class Board`.

```js
class Board {
  constructor(levelDef, rng = Math.random)
  rows, cols                     // ints
  cells                          // cells[r][c] = null (hole/empty) | {id, color, special, lock}
                                 // lock: 0 or 1 (1 = caged)
  jelly                          // jelly[r][c] = 0|1|2 (layers)
  mask                           // mask[r][c] = true if playable cell (false = hole)
  score, movesLeft               // ints
  collected                      // {colorId: count} cleared so far
  isAdjacent(a, b)               // bool, orthogonal
  trySwap(a, b)                  // → {valid: bool, steps: Step[]}
                                 //   invalid: valid=false, steps=[{type:'swap-fail',a,b}], NO move consumed
                                 //   valid: full cascade resolved synchronously; movesLeft decremented once
  hint()                         // → {a,b} | null   (a valid move)
  goals()                        // → [{type, color?, target, current, done}]
  isWin(), isFail()              // fail = movesLeft===0 && !isWin() (checked after resolution)
  stars()                        // 0..3 (score >= levelDef.starScores[i]); winning guarantees >= 1
  serialize()                    // → plain JSON object
  static deserialize(json, levelDef)  // → Board
}
```

### Step schema (returned by trySwap, consumed by renderer/fx/audio via main.js)
Emitted in this order per resolution wave:
- `{type:'swap', a, b}` — positional swap animation (also precedes special-combo activations).
- `{type:'swap-fail', a, b}` — wiggle-and-return.
- `{type:'special', kind, origin:{r,c}, targets:[{r,c}]}` — one per special activation, emitted BEFORE the match step that clears its targets. `kind` ∈ `'h','v','wrap','bomb','bomb+bomb','bomb+stripe','bomb+wrap','stripe+stripe','stripe+wrap','wrap+wrap'`.
- `{type:'match', cascade, cleared:[{r,c,color,special}], created:[{r,c,color,special}], jellyCleared:[{r,c}], locksBroken:[{r,c}], scoreDelta, scoreTotal}` — `cascade` is 0 for the wave caused directly by the swap, 1+ for chain reactions. `created` cells are newly-formed specials (NOT cleared). `locksBroken` cells had their cage removed (candy remains, is not cleared that wave).
- `{type:'gravity', moves:[{id, from:{r,c}, to:{r,c}}], spawns:[{id, color, special:null, to:{r,c}, fromRow}]}` — `fromRow` is the board-space row the spawn animates from, SEGMENT-relative: `segmentTop - segmentRefillCount + i`, i.e. just above the spawn's own segment. Always `fromRow < to.r`; negative only when the segment starts at row 0 (lower segments below holes/locks yield `fromRow >= 0`).
- `{type:'shuffle', cells:[{id, from:{r,c}, to:{r,c}}]}` — auto reshuffle when no moves.
- `{type:'end', win, fail, score, movesLeft}` — always last.

### Rules
- A swap is valid iff cells are adjacent, both exist, neither is locked, and it either produces ≥1 match or involves ≥1 special in a combo pairing (any special+special, or bomb+plain).
- Match of 4 in a horizontal line → `'v'` striped; 4 in a vertical line → `'h'` striped (Candy Crush convention). 5+ in a straight line → `'bomb'`. Intersection (T/L: a cell shared by a horizontal ≥3 and vertical ≥3 run) → `'wrap'`. Special spawns at the swapped cell if it participated, else at the run center/intersection. When a candy that IS a special gets cleared by a normal match, it fires (emit its `special` step in the same wave).
- Specials fired by swap combos: `stripe+stripe` = full row + column cross from swap point; `stripe+wrap` = 3 rows + 3 cols centered; `wrap+wrap` = 5×5 blast; `bomb+plain` = clear all of that color; `bomb+stripe` = all candies of that color become striped (random h/v) and fire; `bomb+wrap` = clear the two most-common colors; `bomb+bomb` = clear ENTIRE board (fireworks moment).
- `wrap` fired normally = 3×3 blast.
- Locked (caged) candies: cannot be swapped, do not fall (they anchor in place; gravity treats them as solid floor). Matching the caged candy's cell (it can still be part of a match) or hitting it with a special breaks the lock — candy stays, cage gone (`locksBroken`). Next wave it behaves normally.
- Jelly: when a candy on a jelly cell is cleared (or lock broken on it — no, only cleared), jelly loses one layer → `jellyCleared` entry per layer removed.
- Gravity: per column, split into segments by holes AND by locked cells; within each segment candies fall straight down; new candies spawn from the top of each segment (`fromRow` is segment-relative — just above that segment's own top row, so it can be ≥ 0 for segments lower in the column). No diagonal filling in v1.
- After every resolution (and at board creation), guarantee ≥1 valid move: reshuffle silently at creation, via `shuffle` step mid-game. Board creation must also avoid pre-existing matches. Max 20 shuffle attempts, then relax.
- Scoring: each cleared candy = `60 × (1 + 0.5 × cascade)`; +100 bonus per special created; +30 per cell cleared by a firing special; round to int. `scoreDelta` per match step; `scoreTotal` running.
- Collect goals count every cleared candy of that color (any cause).

## `js/levels.js`
```js
export const LEVELS = [ /* 24 defs */ ]
// levelDef = {
//   id: 1-based int, name: string,
//   rows, cols (7–9), colors: 4|5|6 (uses first N color ids),
//   moves: int,
//   goals: [ {type:'score', target} | {type:'collect', color, target} | {type:'jelly'} | {type:'locks'} ],
//   starScores: [oneStar, twoStar, threeStar],
//   layout?: array of `rows` strings, `cols` chars each:
//     '.'=normal  '#'=hole  '1'=jelly x1  '2'=jelly x2  'L'=locked candy
//   seed?: int  (optional fixed PRNG seed)
// }
```
Design guidance: L1–3 gentle score-goal tutorials (4–5 colors, generous moves); collect goals from L4; jelly from L6; locks from L10; holes/shaped boards from L8; difficulty pulses (a spike then relief); later levels combine goal types; keep holes only in layouts where every non-hole cell can refill (segments spawn from their own tops, so any layout is legal). `starScores[0]` should be achievable by simply winning; 3★ demands cascade play.

## `js/storage.js`
```js
export const storage = {
  load(), // full state object
  getLevelResult(id),            // → {stars, bestScore} | null
  setLevelResult(id, {stars, score}),  // keeps max
  unlockedLevel(),               // highest playable level id (1-based)
  saveRun(levelId, boardJSON),   // persist mid-level state
  getRun(),                      // → {levelId, boardJSON} | null
  clearRun(),
  getSettings(), setSettings(patch)  // {music: bool, sfx: bool}
}
```
Single localStorage key `swoosh.v1`. All methods try/catch (private mode safe).

## `js/audio.js`
```js
export class AudioMan {
  async init()            // call once on first user gesture; never throws
  play(name)              // fire-and-forget sfx
  startMusic(), stopMusic()
  setMusicOn(b), setSfxOn(b)   // also persists nothing (caller persists)
  musicOn, sfxOn          // bools
}
```
Exact names: `bgm-main-loop, sfx-swap, sfx-match-3, sfx-match-4, sfx-special-striped, sfx-special-wrapped, sfx-color-bomb, sfx-cascade-1, sfx-cascade-2, sfx-cascade-3, sfx-level-win, sfx-level-fail, sfx-star-earned, sfx-button`. Try `assets/audio/<name>.mp3` first (fetch → decodeAudioData); any missing/failed file falls back to a built-in WebAudio synth voice for that name (pentatonic plucks rising per cascade tier, soft pop for matches, shimmer arpeggio for win, descending for fail, sparkle for star). Missing files must be SILENT failures at load (no console spam beyond one info line, definitely no throws).

## `js/renderer.js`
```js
export class Renderer {
  constructor(boardCanvas, sprites)   // sprites: Map<string, HTMLCanvasElement> keys 'candy-ruby'...'candy-pearl','candy-bomb','lock'
  setBoard(board)                     // engine Board (read-only use)
  resize(cssW, cssH, dpr)             // recompute layout {cell, ox, oy}
  cellToXY({r,c})                     // board-space px center
  pickCell(clientX, clientY)          // canvas-relative px → {r,c}|null
  setSelected(cell|null)
  showHint(move|null)                 // gentle pulse on hint cells
  async playSteps(steps, fx, audio, hooks)  // animate resolution; resolves when settled.
      // hooks: {onMatchStep(step), onEnd(step)} for main.js (banners, HUD updates)
  render(tMs, dt)                     // draw frame; called every rAF by main.js
}
```
- Tile positions animated by per-tile springs (stiffness ≈ 220, damping ≈ 16, mass 1) — visible overshoot/bounce. Swaps ~180ms feel; gravity drops staggered ~28ms per cell of fall distance per column; squash-and-stretch (scaleY dip ~0.82) on landing.
- Specials idle-glow: pre-rendered glow sprite pulsing via sin(t); bomb slowly rotates sparkles.
- Reads `fx.shakeOffset` `{x,y}` each frame and applies as canvas translate.
- Board cells: rounded dark felt squares, alternating tint, faint gold 1px inner border; jelly = translucent magenta gel overlay (layer 2 = deeper + darker rim); lock = `lock` sprite overlay.
- Never use per-frame shadowBlur on tiles; all glow pre-rendered.

## `js/particles.js`
```js
export class FX {
  constructor(fxCanvas)
  resize(cssW, cssH, dpr)
  update(dt), render()
  shakeOffset                     // {x,y} read by renderer
  matchBurst(x, y, colorName, count=14)
  specialCreate(x, y, colorName)  // converging sparkle implosion
  lineBlast(x, y, dir, lengthPx)  // dir 'h'|'v'; streaking comet trails both directions
  wrapBlast(x, y, radiusPx)       // ring shockwave + ember burst
  colorBombNova(x, y)             // rainbow nova + electric arcs
  fireworks(durationMs)           // multi-burst celebratory fireworks
  confettiWin()
  shake(intensity)                // 0..1, decays ~400ms
}
```
Object-pooled, cap ~800 live particles, additive blending (`globalCompositeOperation='lighter'`) for glow feel. All coordinates in board-canvas CSS px (same space as `Renderer.cellToXY`).

## `js/ui.js`
```js
export class UI {
  constructor(root, cb)  // cb: {onPlayLevel(id), onRetry(), onNext(), onQuit(), onMusic(b), onSfx(b), onButtonSound()}
  showMap(results, unlockedId)    // results: Map/obj id→{stars,bestScore}
  setScreen('map'|'game')
  showHUD(levelDef)
  updateHUD({score, movesLeft, goals, stars})  // goals from board.goals()
  showWin({stars, score, levelId, onStarShown})  // stars pop sequentially, call onStarShown(i) per star (audio timing)
  showFail({levelId})
  hideModals()
  banner(text)                    // big center flash 'SWEET!' / 'CASCADE ×3!'
}
```
DOM contract in index.html: `#app`, `#screen-map`, `#screen-game`, `#hud`, `#board-wrap` (position:relative) containing `#canvas-board` and `#canvas-fx` (absolute, stacked), modals `#modal-win`, `#modal-fail`, `#modal-pause`. UI manipulates only its own DOM; canvases belong to renderer/fx.

## `js/main.js`
Owns: SVG sprite loading (fetch `assets/svg/*.svg` → Image → rasterize to offscreen canvas at 2× cell size), resize plumbing (dpr cap 2), pointer input on `#canvas-fx` (top layer): pointerdown selects, drag past 0.35×cell toward a neighbor = swap, or tap-then-tap-adjacent; input locked while `playSteps` is running. Maps steps → fx/audio: match cascade 0 → `sfx-match-3` (or `-4` if ≥4 cleared in one run / special created), cascades 1..3+ → `sfx-cascade-1..3` + banner at cascade ≥2, special steps → their fx + sfx, ≥12 cleared in a wave or any combo kind with '+' → `fx.shake`, `bomb+bomb` → `fireworks`. Win → `sfx-level-win` + confetti + fireworks; star pops → `sfx-star-earned`. Persists run state after every settled move (`storage.saveRun`), clears on win/fail. Exposes ALWAYS: `window.__swoosh = {version, board: () => currentBoard, ui, gotoLevel(id), forceEnd(win: bool), muted: setAllMuted}` for tests.

## `index.html` / `css/styles.css`
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">`, safe-area-inset padding.
- Portrait-first single column, max-width 520px centered; board canvas square-ish fitting `min(94vw, 62vh)`; on desktop everything scales up gracefully, page never scrolls in game screen.
- Casino theme: layered background — deep purple radial gradients (`#2d1050` → `#12081f`), subtle animated gold bokeh dots (pure CSS), vignette; if `assets/img/backdrop.jpg` exists it layers under the gradients (CSS handles missing file gracefully via `background-image` stack).
- Gold-gradient pill buttons (min touch target 48px), press = scale(.96) + glow; glass-morphism HUD cards (blur, 1px gold border, inner shadow); title 'SWOOSH' in gold gradient text with shine sweep animation.
- Fonts: Google Fonts `Cinzel` (display) + `Nunito` (UI) via `<link>`, robust fallback stacks.
- Level map: vertical winding path of round nodes (numbered, 0–3 star row under each, locked = dim + 🔒), current level pulses.
- All transitions 60fps-friendly: transform/opacity only.

## Testing hooks
- `tests/engine.test.mjs`: plain-node assertions (`node tests/engine.test.mjs`, exit 0 on pass) covering: match detection (h/v/3/4/5/T/L), special creation & firing, all combo pairings, gravity/segment refill with holes & locks, jelly layers, lock breaking, no-pre-matches at spawn, shuffle-when-stuck, scoring, goals/win/fail/stars, serialize/deserialize round-trip.
- `window.__swoosh` (above) for browser automation.

## Clarifications (v1.1)
- Timeline ownership: Renderer.playSteps drives ALL step timing and invokes fx.* and audio.play(...) effects itself at the exact animation moments, following the step-to-effect mapping policy written in the main.js section. main.js supplies the fx/audio/hooks objects and handles HUD updates, banners, persistence and win/fail flow via hooks {onMatchStep(step), onEnd(step)}.
- window.__swoosh must also expose swap(a, b) -> Promise which runs the exact same pipeline as user input (engine trySwap + playSteps + persistence), for automated testing.
