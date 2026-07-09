# Swoosh 🎰

A mobile-first match-3 puzzle game with casino-style aesthetics — jewel tones, neon glow, spring-physics animations, particle explosions.

## Play locally

```
python3 -m http.server 8000
# open http://localhost:8000
```

No build step, no dependencies. Vanilla JS ES modules + HTML5 Canvas. Static-hostable anywhere.

## Structure
- `js/engine.js` — pure match-3 logic (no DOM, testable in node)
- `js/levels.js` — level definitions
- `js/renderer.js` — canvas board renderer with spring physics
- `js/particles.js` — particle FX / screen shake / fireworks
- `js/audio.js` — audio manager (mp3 files with WebAudio synth fallback)
- `js/ui.js` — DOM chrome: level map, HUD, modals
- `js/storage.js` — localStorage persistence
- `js/main.js` — bootstrap, input, game loop
- `docs/ARCHITECTURE.md` — binding module contract

Run engine tests: `node tests/engine.test.mjs`
