# Swoosh — Audio Assets Manifest

Original music + SFX for **Swoosh**, a mobile-first match-3 jewel puzzle game
with a premium, sparkling gem-shimmer aesthetic — crystalline chimes, lush
shimmer, warm glassy textures and modern, elegant electronic music; every sound is
designed to feel like a small reward. All files generated with Higgsfield
(`sonilo_music` for the BGM, `mirelo_text_to_audio` for SFX), then trimmed /
normalized / encoded with ffmpeg.

## Global notes for integration
- **Format:** MPEG-1 Layer III (.mp3), 44.1 kHz. SFX are **mono** (smaller, positional panning is done in-engine); BGM is **stereo**.
- **Levels:** every SFX is **peak-normalized to ~-1 dBFS**, so they are all "as loud as possible" and equally hot. Use the per-file **suggested volume** column below to set the relative mix — do NOT play everything at 1.0. The BGM is loudness-normalized to ~-16 LUFS so it already sits *under* the SFX.
- **Edges:** all SFX have a 5 ms fade-in and a short fade-out baked in, and leading/trailing dead air was trimmed — safe to trigger rapidly without clicks.
- **Playback:** all SFX are **one-shot**. Only `bgm-main-loop.mp3` loops.
- Master/category volume knobs are expected on top of these values (e.g. a global SFX bus + a music bus + a user mute toggle).

## Files

| File | Purpose | Duration | Size | Play mode | Suggested vol (0-1) |
|------|---------|---------:|-----:|-----------|--------------------:|
| `bgm-main-loop.mp3` | Background music — uplifting modern electronic music with sparkling crystalline arpeggios, warm shimmer pads and glassy bell melodies; beautiful but non-fatiguing over long sessions | 76.07 s | 1.45 MB | **loop** | 0.55 |
| `sfx-swap.mp3` | Tile swap — soft whoosh + glassy tick | 1.04 s | 17 KB | one-shot | 0.45 |
| `sfx-match-3.mp3` | 3-match — bright crystalline pop/chime | 1.23 s | 20 KB | one-shot | 0.70 |
| `sfx-match-4.mp3` | 4-match — richer sparkle, more impact than match-3 | 0.78 s | 13 KB | one-shot | 0.80 |
| `sfx-special-striped.mp3` | Striped special (row/column blast) — fast energetic sweep/zap | 1.38 s | 22 KB | one-shot | 0.85 |
| `sfx-special-wrapped.mp3` | Wrapped special — warm explosion thump with shimmer | 1.62 s | 26 KB | one-shot | 0.85 |
| `sfx-color-bomb.mp3` | Color bomb — rising shimmer charge into a prismatic crystal burst with cascading sparkles and deep bass bloom | 2.53 s | 40 KB | one-shot | 0.95 |
| `sfx-cascade-1.mp3` | Chain cascade step 1 — chime (base pitch) | 1.46 s | 23 KB | one-shot | 0.60 |
| `sfx-cascade-2.mp3` | Chain cascade step 2 — same chime, +4 semitones | 1.44 s | 23 KB | one-shot | 0.70 |
| `sfx-cascade-3.mp3` | Chain cascade step 3 — same chime, +7 semitones | 1.44 s | 23 KB | one-shot | 0.80 |
| `sfx-level-win.mp3` | Level win — rising chime arpeggio blossoming into lush sparkling shimmer and a warm glassy bell chord | 2.82 s | 45 KB | one-shot | 0.90 |
| `sfx-level-fail.mp3` | Level fail — gentle sympathetic descending motif (not punishing) | 2.04 s | 32 KB | one-shot | 0.60 |
| `sfx-star-earned.mp3` | Star earned — short triumphant ding/shimmer | 1.33 s | 21 KB | one-shot | 0.80 |
| `sfx-button.mp3` | UI button — subtle premium click | 1.04 s | 17 KB | one-shot | 0.40 |

## BGM loop points
`bgm-main-loop.mp3` is authored as a **seamless loop**: the tail was crossfaded
over the head (4 s equal-power crossfade) so end-to-start playback is
continuous. Loop the **entire file** — there are no internal loop markers.

- **loopStart = 0.0**, **loopEnd = duration (~76.07 s)**.
- Web Audio API (recommended for gapless looping):
  ```js
  const src = audioCtx.createBufferSource();
  src.buffer = bgmBuffer;
  src.loop = true;
  src.loopStart = 0;
  src.loopEnd = bgmBuffer.duration; // ~76.07
  src.start();
  ```
- HTML5 `<audio loop>` also works but the element may insert a tiny gap at the
  wrap; prefer Web Audio API for a truly seamless music bed.

## Cascade set
`sfx-cascade-1/2/3` are pitch-shifted variants of a single crystalline chime
(0 / +4 / +7 semitones — a rising major-triad arpeggio) so a chain reaction
escalates in pitch and excitement. Trigger 1 → 2 → 3 as the cascade depth
increases; clamp at cascade-3 for chains of 3+ (or replay 3 with rising volume).

## Suggested usage tips
- **match-4 vs match-3:** both are peak-normalized, so play match-4 a touch
  louder (table above) and it also has a fuller bell timbre for extra "reward".
- **color-bomb / level-win** are the two loudest, most celebratory cues — give
  them the most headroom in the mix.
- **swap / button** are intentionally subtle; keep their volumes low so frequent
  UI interaction never becomes fatiguing.
