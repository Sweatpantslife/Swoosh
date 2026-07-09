# Swoosh

A mobile-first match-3 puzzle game with a casino-grade premium feel — jewel tones, neon accents, spring physics, and screen-shaking combos. Think slot-machine excitement meets puzzle elegance.

> **Status:** early development. Research and audio are merged; the core game is being built on `feature/core-game`. Expect the playable build to land here soon.

## Concept

Swoosh is a Candy Crush-inspired match-3 built for the phone first and the desktop second. You swap adjacent gems to line up three or more, clear structured levels with specific goals, and earn 1–3 stars per level based on performance. The twist is the presentation: deep purples, golds, crimsons, and emerald greens under dramatic lighting, with every match, cascade, and special-candy activation tuned to feel satisfying.

### The casino aesthetic

Rich jewel tones and neon accents, gradient overlays, and premium lighting. Special candies glow and pulse to stand out. Big combos shake the screen; Color Bomb combinations set off celebratory fireworks.

## Features

- **60fps juice** — bouncy tile movement with spring physics, smooth cascading drops with staggered delays for visual clarity.
- **Explosive feedback** — particle bursts on every match, distinct effects for 3-matches vs. special candies, and trail effects on special activations.
- **Special candies** — striped, wrapped, and Color Bomb, each with its own glow, sound, and payoff.
- **Level goals & stars** — structured levels with per-level objectives and 1–3 star scoring.
- **Persistence** — level progress, stars earned, and current board state saved locally via `localStorage`; no account needed.
- **Mobile-first, desktop-friendly** — portrait-optimized with large touch targets, and still crisp on desktop.
- **Original audio** — looping background music plus a full SFX set (see the [audio manifest](assets/audio/manifest.md)).

## Tech approach

Static HTML5 — no backend, no build server required to play. The game runs entirely client-side and persists state to `localStorage`, which keeps it trivially hostable on any static host (GitHub Pages, Netlify, S3, and the like).

## Running locally

The playable build isn't merged yet. Once it lands, Swoosh will run from any static file server — no install step. For example:

```bash
# Python
python3 -m http.server 8000

# or Node
npx serve .
```

Then open `http://localhost:8000` in your browser. Serving over HTTP (rather than opening the file directly) avoids browser restrictions on audio and module loading.

## Repo structure

```
Swoosh/
├── assets/
│   └── audio/              # original BGM + SFX (mp3) and the audio manifest
├── docs/
│   ├── README.md           # documentation index
│   └── research/           # market and game-design research reports
├── README.md
├── LICENSE
├── .editorconfig
└── .gitignore
```

Game code is incoming on the `feature/core-game` branch — source, `package.json`, and build tooling live there.

## Documentation

- [Market Research Report](docs/research/market-research.md) — competitive landscape, aesthetic precedent, monetization/retention, and v1 recommendations.
- [Game Design Research](docs/research/game-design-research.md) — game feel/juice, core-loop psychology, special-piece economy, level/difficulty design, and teardowns of the genre leaders.
- [Audio Manifest](assets/audio/manifest.md) — every music/SFX file with purpose, duration, loop points, and mixing notes.

## License

[MIT](LICENSE) © 2026 Sweatpantslife
