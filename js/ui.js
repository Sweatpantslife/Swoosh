// Swoosh — DOM UI: level map, HUD, modals, banners.
// Contract: docs/ARCHITECTURE.md (§ js/ui.js). UI manipulates only its own
// DOM — the canvases inside #board-wrap belong to renderer/fx.

import { LEVELS } from './levels.js';
import { storage } from './storage.js';

// Casino suit glyph per color id (matches candy silhouettes in the contract).
const GOAL_GLYPHS = ['♥', '♦', '♣', '★', '♠', '◉'];
const COLOR_CLASS = ['gi-ruby', 'gi-amber', 'gi-emerald', 'gi-sapphire', 'gi-amethyst', 'gi-pearl'];

const STAR_FIRST_DELAY = 600;   // ms until star 1 pops in the win modal
const STAR_STAGGER = 450;       // ms between star pops

function fmt(n) {
  n = n | 0;
  if (n >= 10000) return (Math.round(n / 100) / 10) + 'k';
  return String(n);
}

// Human noun for a remaining goal, pluralised ("2 more rubies", "1 more jelly").
const COLOR_NAMES = ['ruby', 'amber gem', 'emerald', 'sapphire', 'amethyst', 'pearl'];
function goalNoun(g, n) {
  if (g.type === 'jelly') return n === 1 ? 'jelly' : 'jellies';
  if (g.type === 'locks') return n === 1 ? 'lock' : 'locks';
  const base = COLOR_NAMES[g.color] || 'gem';
  if (n === 1) return base;
  return base === 'ruby' ? 'rubies' : base + 's';
}

function reducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (_) {
    return false;
  }
}

export class UI {
  /**
   * @param {HTMLElement} root  the #app element
   * @param {object} cb  {onPlayLevel(id), onRetry(), onNext(), onQuit(),
   *                      onMusic(b), onSfx(b), onButtonSound()}
   */
  constructor(root, cb) {
    this.root = root;
    this.cb = cb;

    const $ = (id) => root.querySelector('#' + id) || document.getElementById(id);
    this.el = {
      screenMap: $('screen-map'),
      screenGame: $('screen-game'),
      mapScroll: $('map-scroll'),
      mapPath: $('map-path'),
      hudLevelName: $('hud-level-name'),
      hudScore: $('hud-score'),
      hudMoves: $('hud-moves'),
      hudGoals: $('hud-goals'),
      hudStars: $('hud-stars'),
      banner: $('banner'),
      modalWin: $('modal-win'),
      modalFail: $('modal-fail'),
      modalPause: $('modal-pause'),
      winTitle: $('win-title'),
      winScore: $('win-score'),
      failText: $('fail-text'),
      toggleMusic: $('toggle-music'),
      toggleSfx: $('toggle-sfx'),
    };

    this._starTimers = [];
    this._scoreRaf = 0;
    this._lastScore = 0;
    this._currentNode = null;

    // --- button wiring (every button: sound first, then action) ---
    const wire = (id, fn) => {
      const el = $(id);
      if (el) el.addEventListener('click', () => { this.cb.onButtonSound(); fn(); });
    };
    wire('btn-pause', () => this._showModal(this.el.modalPause));
    wire('btn-pause-resume', () => this.hideModals());
    wire('btn-pause-retry', () => { this.hideModals(); this.cb.onRetry(); });
    wire('btn-pause-quit', () => { this.hideModals(); this.cb.onQuit(); });
    wire('btn-win-next', () => { this.hideModals(); this.cb.onNext(); });
    wire('btn-win-retry', () => { this.hideModals(); this.cb.onRetry(); });
    wire('btn-win-map', () => { this.hideModals(); this.cb.onQuit(); });
    wire('btn-fail-retry', () => { this.hideModals(); this.cb.onRetry(); });
    wire('btn-fail-map', () => { this.hideModals(); this.cb.onQuit(); });

    // --- settings toggles (visual state seeded from storage) ---
    const settings = storage.getSettings();
    this._initToggle(this.el.toggleMusic, settings.music, (b) => this.cb.onMusic(b));
    this._initToggle(this.el.toggleSfx, settings.sfx, (b) => this.cb.onSfx(b));
  }

  _initToggle(el, on, onChange) {
    if (!el) return;
    this._setToggle(el, on);
    el.addEventListener('click', () => {
      this.cb.onButtonSound();
      const next = !el.classList.contains('on');
      this._setToggle(el, next);
      onChange(next);
    });
  }

  _setToggle(el, on) {
    el.classList.toggle('on', !!on);
    el.setAttribute('aria-checked', on ? 'true' : 'false');
  }

  /** Optional helper for main.js: sync toggle visuals to external state. */
  setToggles({ music, sfx } = {}) {
    if (music !== undefined && this.el.toggleMusic) this._setToggle(this.el.toggleMusic, music);
    if (sfx !== undefined && this.el.toggleSfx) this._setToggle(this.el.toggleSfx, sfx);
  }

  // ========================================================================
  // Level map
  // ========================================================================

  /**
   * @param {Map|object} results  id -> {stars, bestScore}
   * @param {number} unlockedId   highest playable level (1-based)
   */
  showMap(results, unlockedId) {
    const res = (id) => {
      if (!results) return null;
      if (typeof results.get === 'function') return results.get(id) || results.get(String(id)) || null;
      return results[id] || results[String(id)] || null;
    };

    const n = LEVELS.length;
    const spacing = 112;
    const padTop = 46;
    const padBottom = 66;
    const height = padTop + (n - 1) * spacing + padBottom;
    const currentId = Math.min(Math.max(1, unlockedId | 0), n);

    const path = this.el.mapPath;
    path.innerHTML = '';
    path.style.height = height + 'px';
    this._currentNode = null;

    // Node centers: level 1 at the bottom, winding left/right up the felt.
    const pts = [];
    for (let i = 0; i < n; i++) {
      const x = 50 + Math.sin(i * 1.02 + 0.6) * 29;       // percent of width
      const y = padTop + (n - 1 - i) * spacing;           // px from top
      pts.push({ x, y });
    }

    // Winding gold trail behind the nodes (percent-x viewBox, uniform stroke
    // via vector-effect so it stays crisp at any column width).
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'map-trail');
    svg.setAttribute('viewBox', `0 0 100 ${height}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    const trail = document.createElementNS(svgNS, 'path');
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2;
      const my = (pts[i].y + pts[i + 1].y) / 2;
      d += ` Q ${pts[i].x} ${pts[i].y} ${mx} ${my}`;
    }
    if (pts.length > 1) d += ` L ${pts[n - 1].x} ${pts[n - 1].y}`;
    trail.setAttribute('d', d);
    svg.appendChild(trail);
    path.appendChild(svg);

    for (let i = 0; i < n; i++) {
      const def = LEVELS[i];
      const id = def.id;
      const r = res(id);
      const locked = id > currentId;
      const node = document.createElement('button');
      node.type = 'button';
      node.className = 'map-node' + (locked ? ' locked' : '') + (id === currentId ? ' current' : '');
      node.style.left = pts[i].x + '%';
      node.style.top = pts[i].y + 'px';
      node.setAttribute('aria-label', locked
        ? `Level ${id} locked`
        : `Play level ${id}: ${def.name}${r ? `, ${r.stars} stars` : ''}`);
      if (locked) {
        node.disabled = true;
        const num = document.createElement('span');
        num.className = 'locked-num';
        num.setAttribute('aria-hidden', 'true');
        num.textContent = String(id);
        const lock = document.createElement('span');
        lock.className = 'lock-glyph';
        lock.setAttribute('aria-hidden', 'true');
        lock.textContent = '\u{1F512}';
        node.append(num, lock);
      } else {
        node.textContent = String(id);
        const stars = document.createElement('span');
        stars.className = 'node-stars';
        stars.setAttribute('aria-hidden', 'true');
        const earned = r ? (r.stars | 0) : 0;
        for (let s = 0; s < 3; s++) {
          const star = document.createElement('i');
          if (s < earned) star.className = 'lit';
          stars.appendChild(star);
        }
        node.appendChild(stars);
        node.addEventListener('click', () => {
          this.cb.onButtonSound();
          this.cb.onPlayLevel(id);
        });
      }
      if (id === currentId) this._currentNode = node;
      path.appendChild(node);
    }

    requestAnimationFrame(() => this._scrollToCurrent());
  }

  _scrollToCurrent() {
    const scroll = this.el.mapScroll;
    const node = this._currentNode;
    if (!scroll || !node) return;
    scroll.scrollTop = Math.max(0, node.offsetTop - scroll.clientHeight * 0.55);
  }

  // ========================================================================
  // Screens
  // ========================================================================

  setScreen(name) {
    const map = name === 'map';
    this.el.screenMap.hidden = !map;
    this.el.screenGame.hidden = map;
    document.body.classList.toggle('in-game', !map);
    if (map) this._scrollToCurrent();
  }

  // ========================================================================
  // HUD
  // ========================================================================

  showHUD(levelDef) {
    this.el.hudLevelName.textContent = `${levelDef.id} · ${levelDef.name}`;
    this.el.hudMoves.textContent = String(levelDef.moves);
    this.el.hudMoves.classList.remove('low');
    this.el.hudScore.textContent = '0';
    this._lastScore = 0;

    // Build one chip per goal; updateHUD refreshes them by index.
    const wrap = this.el.hudGoals;
    wrap.innerHTML = '';
    this._goalChips = (levelDef.goals || []).map((g) => {
      const chip = document.createElement('span');
      chip.className = 'goal-chip';
      const icon = document.createElement('span');
      icon.setAttribute('aria-hidden', 'true');
      const count = document.createElement('span');
      count.className = 'goal-count';
      if (g.type === 'collect') {
        icon.className = 'goal-icon ' + (COLOR_CLASS[g.color] || 'gi-score');
        icon.textContent = GOAL_GLYPHS[g.color] || '♥';
      } else if (g.type === 'jelly') {
        icon.className = 'goal-icon gi-jelly';
        icon.textContent = '◈';
      } else if (g.type === 'locks') {
        icon.className = 'goal-icon gi-locks';
        icon.textContent = '\u{1F512}';
      } else { // score
        icon.className = 'goal-icon gi-score';
        icon.textContent = '✦';
      }
      count.textContent = `0/${fmt(g.target ?? 0)}`;
      chip.append(icon, count);
      wrap.appendChild(chip);
      return { chip, count };
    });

    for (const s of this.el.hudStars.querySelectorAll('.mini-star')) s.classList.remove('lit');
  }

  /** @param {object} p {score, movesLeft, goals, stars} — goals from board.goals() */
  updateHUD({ score, movesLeft, goals, stars }) {
    if (score !== undefined) {
      if (score !== this._lastScore) {
        this.el.hudScore.textContent = (score | 0).toLocaleString('en-US');
        this._retrigger(this.el.hudScore, 'bump');
        this._lastScore = score;
      }
    }
    if (movesLeft !== undefined) {
      this.el.hudMoves.textContent = String(movesLeft);
      this.el.hudMoves.classList.toggle('low', movesLeft <= 5);
      if (movesLeft <= 5) this._retrigger(this.el.hudMoves, 'bump');
    }
    if (goals && this._goalChips) {
      goals.forEach((g, i) => {
        const c = this._goalChips[i];
        if (!c) return;
        const cur = Math.min(g.current | 0, g.target | 0);
        c.count.textContent = g.done ? '✓' : `${fmt(cur)}/${fmt(g.target)}`;
        c.chip.classList.toggle('done', !!g.done);
      });
    }
    if (stars !== undefined) {
      this.el.hudStars.querySelectorAll('.mini-star').forEach((s, i) => {
        s.classList.toggle('lit', i < stars);
      });
    }
  }

  // ========================================================================
  // Modals
  // ========================================================================

  /**
   * Win celebration. Stars pop sequentially (~450ms apart); onStarShown(i)
   * fires at each pop so main.js can play sfx-star-earned in sync.
   * @param {object} p {stars, score, levelId, onStarShown}
   */
  showWin({ stars, score, levelId, onStarShown }) {
    this.hideModals();
    this.el.winTitle.textContent = `Level ${levelId} Clear!`;
    for (const socket of this.el.modalWin.querySelectorAll('.star-socket')) {
      socket.classList.remove('earned');
    }
    this._showModal(this.el.modalWin);
    this._countUp(this.el.winScore, score | 0);

    const count = Math.max(0, Math.min(3, stars | 0));
    const sockets = this.el.modalWin.querySelectorAll('.star-socket');
    for (let i = 0; i < count; i++) {
      this._starTimers.push(setTimeout(() => {
        if (sockets[i]) sockets[i].classList.add('earned');
        if (typeof onStarShown === 'function') onStarShown(i);
      }, STAR_FIRST_DELAY + i * STAR_STAGGER));
    }
  }

  /**
   * @param {object} p {levelId, goals} — goals (optional) from board.goals();
   * when present the message reports what was actually left, so a near-miss
   * reads as one ("only 2 more jellies!") instead of a generic quip.
   */
  showFail({ levelId, goals }) {
    this.hideModals();
    if (this.el.failText) {
      let text = `The house wins level ${levelId} this time… double down and try again?`;
      if (Array.isArray(goals) && goals.length) {
        const parts = [];
        let itemsLeft = 0;      // countable pieces (gems/jellies/locks) still needed
        let scoreGoal = false;  // score targets aren't "items" for the near-miss rule
        let totalTarget = 0;
        let totalCurrent = 0;
        for (const g of goals) {
          const target = g.target | 0;
          const current = Math.min(g.current | 0, target);
          totalTarget += target;
          totalCurrent += current;
          const rem = target - current;
          if (rem <= 0) continue;
          if (g.type === 'score') {
            scoreGoal = true;
            parts.push(`${fmt(rem)} more points`);
          } else {
            itemsLeft += rem;
            parts.push(`${rem} more ${goalNoun(g, rem)}`);
          }
        }
        if (parts.length) {
          const list = parts.join(', ');
          const progress = totalTarget > 0 ? totalCurrent / totalTarget : 0;
          if ((!scoreGoal && itemsLeft <= 3) || progress >= 0.9) {
            text = `So close — only ${list} to go!`;
          } else {
            text = `${list} left — the house wins level ${levelId} this time… double down and try again?`;
          }
        }
      }
      this.el.failText.textContent = text;
    }
    this._showModal(this.el.modalFail);
  }

  hideModals() {
    for (const t of this._starTimers) clearTimeout(t);
    this._starTimers.length = 0;
    if (this._scoreRaf) { cancelAnimationFrame(this._scoreRaf); this._scoreRaf = 0; }
    this.el.modalWin.hidden = true;
    this.el.modalFail.hidden = true;
    this.el.modalPause.hidden = true;
  }

  _showModal(modal) {
    if (modal) modal.hidden = false;
  }

  /** Rolling count-up for the win-modal score (instant under reduced motion). */
  _countUp(el, target) {
    if (!el) return;
    if (reducedMotion() || target <= 0) {
      el.textContent = target.toLocaleString('en-US');
      return;
    }
    const dur = 800;
    const t0 = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(target * eased).toLocaleString('en-US');
      this._scoreRaf = k < 1 ? requestAnimationFrame(tick) : 0;
    };
    this._scoreRaf = requestAnimationFrame(tick);
  }

  // ========================================================================
  // Banner — big center flash over the board ('SWEET!' / 'CASCADE ×3!')
  // ========================================================================

  banner(text) {
    const el = this.el.banner;
    if (!el) return;
    el.textContent = text;
    this._retrigger(el, 'show');
  }

  /** Remove+reflow+add so a CSS animation restarts even mid-flight. */
  _retrigger(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }
}
