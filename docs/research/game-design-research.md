# Match-3 Game Design Research — What Makes Match-3 Good, Fun, and Rewarding

**Purpose.** This document is the design research bible for **Swoosh** — a mobile-first match-3 puzzle game inspired by Candy Crush, with a casino-style aesthetic (deep purples, golds, crimsons, emerald greens; neon accents; "slot machine excitement meets puzzle elegance") and a core commitment to **ethical retention**: players return because the game genuinely feels good, never because of dark patterns.

**Scope.** Eight research areas, fully sourced: game feel/juice, core loop psychology, the special-piece economy, level goal variety, difficulty curves, ethical progression and rewards, board/grid design, and teardowns of the four genre leaders (Candy Crush Saga, Royal Match, Toon Blast, Homescapes/Gardenscapes). Section 9 distills everything into **20 prioritized design principles** for Swoosh.

**How to use this doc.** It briefs Swoosh's build and design sessions. Concrete numbers (timings, move budgets, win-rate benchmarks) are starting values to tune, not gospel — but they are the values shipped or recommended by the best practitioners in the genre, so deviate deliberately. Inline links point at the underlying evidence for every load-bearing claim; the consolidated source list is at the end.

---

## 1. Game Feel & Juice

### 1.1 What "juice" is and the one rule that governs it

Steve Swink's *Game Feel* defines game feel as "real-time control of virtual objects in a simulated space, with interactions emphasised by **polish**" — the polish layer is what practitioners call "juice": aesthetic feedback that makes interaction satisfying without changing the simulation ([Game Feel, Wikipedia](https://en.wikipedia.org/wiki/Game_feel)). The canonical reference is Jonasson & Purho's GDC Europe 2012 talk ["Juice It or Lose It"](https://www.youtube.com/watch?v=Fy0aCDmgnxg), which layers tweening, easing, shake, particles, and sound onto a plain block-breaker to show how each layer transforms feel. The counter-caution: over-juicing buries readability — juice must be [tuned, not maximized](https://www.gamedeveloper.com/design/video-indies-resist-the-urge-to-juice-it-or-lose-it-).

**The governing rule: "the more common an action, the simpler the juice."** Frequent actions (a normal swap, a plain 3-match) get restrained feedback; rare actions (a 5-match, a big cascade, a combo) get the full stack — otherwise effects oversaturate and annoy ([GameAnalytics](https://www.gameanalytics.com/blog/squeezing-more-juice-out-of-your-game-design)). This rule applies to VFX, SFX, shake, and haptics equally.

PopCap founder **Jason Kapalka** (Bejeweled) attributes much of that game's feel to getting the **gravity of falling gems** exactly right — the small physics of how gems fall and settle were treated as make-or-break, and "polish" is cited as PopCap's single largest contribution to the genre ([Game Developer — Kapalka interview](https://www.gamedeveloper.com/design/casual-game-design-popcap-s-jason-kapalka-and-i-bejeweled-twist-i-)).

### 1.2 Concrete starting values — the numbers table

| Element | Starting value | Source |
|---|---|---|
| Swap tween | ~250 ms | [gamedev.net](https://www.gamedev.net/forums/topic/702077-moving-tile-in-match-3-game-smoothly-or-simulating-physics-effects/) |
| Tile clear/destroy | ~150 ms | [gamedev.net](https://www.gamedev.net/forums/topic/702077-moving-tile-in-match-3-game-smoothly-or-simulating-physics-effects/) |
| Tile fall | ~200 ms, ease-in (accelerating) | [gamedev.net](https://www.gamedev.net/forums/topic/702077-moving-tile-in-match-3-game-smoothly-or-simulating-physics-effects/) |
| Pop-in / spawn scale | 0.8 → 1.0, Bounce.Out easing, ~300 ms | [dev.to — Match-3 in Pixi.js](https://dev.to/roman_guivan_17680f142e28/match-3-game-in-pixijs-103-juice-and-polish-3fff) |
| Land-settle keyframes | 0.9 → 1.1 → 1.0 (undershoot, overshoot, settle) | [dev.to](https://dev.to/roman_guivan_17680f142e28/match-3-game-in-pixijs-103-juice-and-polish-3fff) |
| Cascade inter-step beat | ~0.5 s linger after a big clear before new pieces drop | [johndechancie — Visual Layer Timing](https://johndechancie.com/visual-layer-timing-in-cascading-animation-design/) |
| Cascade stagger offsets | ~100 / 200 / 300 ms per layer (then replace with eased tweens) | [johndechancie](https://johndechancie.com/visual-layer-timing-in-cascading-animation-design/) |
| Overshoot rule of thumb | push ~30% past "feels about right" — subtle motion doesn't read on phones | [12 principles of animation](https://en.wikipedia.org/wiki/Twelve_basic_principles_of_animation) |
| Screen-shake model | trauma scalar in [0,1]; shake = trauma² (or trauma³) | [Eiserloh, GDC 2016](https://archive.org/stream/GDC2016Eiserloh/GDC2016-Eiserloh_djvu.txt) |
| Shake offset limit | ~100×75 px translational | [Godot Recipes](https://kidscancode.org/godot_recipes/4.x/2d/screen_shake/index.html) |
| Shake roll limit | ~0.1 rad (~5.7°) — "use sparingly" | [Godot Recipes](https://kidscancode.org/godot_recipes/4.x/2d/screen_shake/index.html) |
| Shake trauma decay | ~0.8 / frame, linear | [Godot Recipes](https://kidscancode.org/godot_recipes/4.x/2d/screen_shake/index.html) |

### 1.3 Tile motion: springs, easing, and the settle

- **Never lerp linearly.** Easings "represent inertia" and read as physical weight; falling tiles get accelerating ease-in, landings get an overshoot curve (Back/Elastic/Bounce) ([GameAnalytics](https://www.gameanalytics.com/blog/squeezing-more-juice-out-of-your-game-design); [johndechancie](https://johndechancie.com/visual-layer-timing-in-cascading-animation-design/)).
- **Model the landing as a damped sine wave** whose initial amplitude is seeded from the tile's ending fall velocity, blending fall and bounce into one continuous motion instead of a hard stop ([GameDev.net](https://www.gamedev.net/forums/topic/702077-moving-tile-in-match-3-game-smoothly-or-simulating-physics-effects/)). Spring/damper motion is *why* overshoot-and-settle "feels right" ([Eiserloh](https://archive.org/stream/GDC2016Eiserloh/GDC2016-Eiserloh_djvu.txt)).
- **Squash-and-stretch and anticipation** (a tiny wind-up dip before a swap launches) are the two Disney principles that map most directly onto match-3 tiles ([Twelve basic principles](https://en.wikipedia.org/wiki/Twelve_basic_principles_of_animation)).

### 1.4 Cascades: legible sequence, not a blur

- **Compute-then-stagger:** calculate every tile's destination first, then assign per-tile delays across the whole set so the fall reads as a wave, not a simultaneous dump ([Flutter Crush](https://medium.com/flutter-community/flutter-crush-debee5f389c3)).
- **Insert the ~0.5 s beat** between cascade steps after a big clear — the visual equivalent of hit-pause; it heightens anticipation and lets the player register the chain ([johndechancie](https://johndechancie.com/visual-layer-timing-in-cascading-animation-design/)).
- **Tiles always physically fall from above**, never pop into place — visible motion sells the cause-and-effect that match-3 thrives on ([gamedev.net](https://www.gamedev.net/forums/topic/702077-moving-tile-in-match-3-game-smoothly-or-simulating-physics-effects/)).
- **Keep it short and skippable.** Toon Blast and Royal Match are best-in-class because drop/power-up/debris animations are "just enough to feel satisfying yet not overwhelm the board" and most animations are skippable so momentum never stalls ([Royal Match/Toon Blast analysis](https://medium.com/@ekinmelissezer/game-analysis-for-royal-match-and-toon-blast-9c4bff8ef48b)).

### 1.5 Particles: escalate with match size

- **3-match:** small pop + light sparkle — the everyday confirmation.
- **4/5-match and special creation/detonation:** the full stack — a 4-match should visibly read as "a larger blast," and the sense of satisfaction grows with the blast radius ([snoukdesignnotes](https://snoukdesignnotes.blog/2018/06/21/design-analysis-match-3/)). Specials are explicitly designed to "clear huge chunks of the board in the most satisfying way possible" ([Royal Match/Toon Blast analysis](https://medium.com/@ekinmelissezer/game-analysis-for-royal-match-and-toon-blast-9c4bff8ef48b)).
- **Construction:** layer multiple emitters (core flash + sparks + dust), randomize particle size/speed/rotation, fade color over lifetime; keep debris light enough not to obscure the board ([Unity burst-particle practice](https://learn.unity.com/pathway/creative-core/unit/creative-core-vfx/tutorial/create-a-burst-particle-3)).

### 1.6 Screen shake: the trauma model

Screen shake is the highest-risk juice — used wrong it causes nausea and accessibility complaints, so use sparingly and honor motion-sensitivity settings ([Godot Recipes](https://kidscancode.org/godot_recipes/4.x/2d/screen_shake/index.html)).

**Use Squirrel Eiserloh's trauma model** ([GDC 2016 slides](http://www.mathforgameprogrammers.com/gdc2016/GDC2016_Eiserloh_Squirrel_JuicingYourCameras.pdf); [transcript](https://archive.org/stream/GDC2016Eiserloh/GDC2016-Eiserloh_djvu.txt)): maintain a `trauma` scalar in [0,1]; events *add* trauma (bigger events add more); trauma decays linearly; derived shake = **trauma²**. The exponent buys perceptual escalation:

| trauma | resulting shake (trauma²) |
|---|---|
| 0.30 | ~3% |
| 0.60 | ~22% |
| 0.90 | ~73% |

Small combos stay subtle; only genuinely big combos read as violent. Craft notes: use **smoothed noise (Perlin/OpenSimplex), not raw random** (feels better, survives pause/slow-mo); **separate noise seeds per axis** (offsetX, offsetY, roll); in 2D combine **translational + rotational** — a fraction of a degree of roll "reads as force" ([Eiserloh](https://archive.org/stream/GDC2016Eiserloh/GDC2016-Eiserloh_djvu.txt)). Reference parameters: `max_offset ≈ (100, 75)` px, `max_roll ≈ 0.1` rad, `decay ≈ 0.8`/frame, OpenSimplex noise `period 4, octaves 2` ([Godot Recipes](https://kidscancode.org/godot_recipes/4.x/2d/screen_shake/index.html)).

**For Swoosh:** *no* shake on a normal 3-match; small trauma on 4/5-matches and special detonations; high trauma reserved for cascade finales and big combos. Pair big impacts with a brief hit-pause/freeze-frame ([GameAnalytics](https://www.gameanalytics.com/blog/squeezing-more-juice-out-of-your-game-design)).

### 1.7 Audio-visual reward coupling: rising pitch, layering, haptics

- **Rising-pitch cascades.** Each successive cascade step plays a higher pitch — a deliberate anticipation device borrowed from slot machines' pre-resolution chime build-ups ([slot audio design](https://enallaktikiagenda.gr/slot-game-thrills-your-guide-to-reels-bonuses-and)). This maps perfectly onto Swoosh's "slot machine excitement" brand. For long chains that should feel endless, use a **Shepard tone** — stacked octave-separated sines that create the illusion of forever-ascending pitch ([Wikipedia](https://en.wikipedia.org/wiki/Shepard_tone); [Splice](https://splice.com/blog/how-shepard-tone-works/)). Practical mapping: quantize combo-step pitches to a **musical scale**, one note up per cascade step, reset on a new move.
- **Sound layering and mix.** Compressed, full-bodied core match SFX that "pops out"; ambient soundscape separate from music; **strategic silence before a big impact** makes the payoff land harder ([GameAnalytics](https://www.gameanalytics.com/blog/squeezing-more-juice-out-of-your-game-design)). Distinct audio tiers per event: plain "pop" for 3-match, rushing swoosh for big combos, escalating stingers ([match-3 SFX design](https://www.asoundeffect.com/sound-library/match-3-games/)). Kapalka's shorthand: the crisp "clink clink clink" of gems landing — the audio *is* the reward ([Game Developer](https://www.gamedeveloper.com/design/casual-game-design-popcap-s-jason-kapalka-and-i-bejeweled-twist-i-)).
- **Level-complete crescendo.** Gate the full audio-visual celebration behind level completion — Royal Match fires trumpets + fireworks on win and animates coins physically flying into the total ([Royal Match/Toon Blast analysis](https://medium.com/@ekinmelissezer/game-analysis-for-royal-match-and-toon-blast-9c4bff8ef48b)).
- **Haptics.** Tune length and force to the magnitude of the on-screen action: light tick on swap/match, stronger pulse on special detonation or big combo ([Interhaptics](https://interhaptics.medium.com/mobile-gaming-ux-how-haptic-feedback-can-change-the-game-3ef689f889bc)). Well-timed haptics correlate with longer sessions because users subconsciously trust a responsive interface ([Maxima](https://maximagamingstudio.com/the-role-of-haptic-feedback-in-modern-game-design/)) — but never fire them on every trivial event (same "common action = simpler juice" rule), and respect battery/accessibility settings.

---

## 2. The Core Loop & Psychology

### 2.1 Why matching is intrinsically satisfying

- **Pattern recognition is self-rewarding.** Human brains are wired to spot patterns; in match-3 the player *rewards themselves* for the discovery. **Three is the smallest number of elements that forms a recognizable pattern** — the match-3 threshold sits at a cognitively natural minimum ([Design Analysis of Match-3 Games](https://medium.com/design-bootcamp/design-analysis-of-match-3-games-fb63879ecd8f); [snoukdesignnotes](https://snoukdesignnotes.blog/2018/06/21/design-analysis-match-3/)).
- **Cascades are the emotional engine — agency plus emergent payoff.** One deliberate 3-swap can trigger a chain clearing far more than the player set up; players "enjoy seeing their actions produce consequences greater than their initial expectations" ([snoukdesignnotes](https://snoukdesignnotes.blog/2018/06/21/design-analysis-match-3/); [Grokipedia — Compulsion loop](https://grokipedia.com/page/Compulsion_loop)).
- **Order-from-chaos relief.** Match-3 taps the urge for tidiness and completion — Obsession → Anxiety → Compulsion → Relief; clearing clutter delivers psychological relief ([Design Analysis](https://medium.com/design-bootcamp/design-analysis-of-match-3-games-fb63879ecd8f); [UX Reviewer](https://www.uxreviewer.com/home/2020/5/9/how-to-crack-the-match-3-code-part-1)).
- **Consequence-free failure.** Invalid moves snap back with no penalty; matches only ever increase score. With "no punishment for incorrect moves," the loop is almost pure positive reinforcement, which lowers the barrier to the next action and sustains flow ([snoukdesignnotes](https://snoukdesignnotes.blog/2018/06/21/design-analysis-match-3/)).

### 2.2 Variable reward and where dopamine actually lands

- **Cascades are match-3's variable-ratio reward** — you never know how large a chain a move will trigger. Variable-ratio reinforcement produces the highest, most extinction-resistant response rates; it is the same mathematical backbone as slot machines ([Variable Ratio Reinforcement Beyond the Skinner Box](https://medium.com/design-bootcamp/variable-ratio-reinforcement-beyond-the-skinner-box-191d3e86d86f)).
- **Dopamine peaks on ANTICIPATION, not the reward itself.** Reward-prediction-error neuroscience shows dopamine spikes during the waiting/expectation window. The design implication is foundational for Swoosh: **the anticipatory beat before a cascade resolves is where the neurochemical payoff actually lands** — so the pre-cascade pause, rising pitch, and building particles from Section 1 are not cosmetic; they *are* the reward mechanism ([Variable Ratio Reinforcement](https://medium.com/design-bootcamp/variable-ratio-reinforcement-beyond-the-skinner-box-191d3e86d86f); [teachboston](https://www.teachboston.org/variable-reward-schedules-gambling/)).
- **The compulsion loop = Anticipation → Activity → Reward**, with the reward re-seeding the next anticipation. Juice (cascades, particles, audio) is what "reinforces every successful match and forms the habit loop" — calibrating juice richness *is* calibrating the loop ([Grokipedia](https://grokipedia.com/page/Compulsion_loop); [GameAnalytics](https://www.gameanalytics.com/blog/the-compulsion-loop-explained)).
- **Ethical note:** these are the same structures as gambling reinforcement. Swoosh's rule (expanded in Section 6): use them to make *play* feel great; never couple them to money.

### 2.3 Near-miss science: the single most important study

**Larche, Musielak & Dixon — "The Candy Crush Sweet Tooth"** (n = 57 experienced players) measured wins vs. losses vs. near-misses ([NCBI/PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC5445157/)):

- Near-misses produced **elevated heart rate vs. regular losses** (p = .05) and **arousal comparable to actual wins** — despite being losses.
- Near-misses were rated **more frustrating than losses** (p = .04) and **more subjectively arousing** (p = .03).
- **Most important:** near-misses triggered a **significantly greater "urge to continue play"** than ordinary losses (p = .05).
- **Post-reinforcement pause** (hesitation before the next attempt): **~1.85 s after near-misses** vs. **~12.05 s after wins** — players re-engage *fastest* after an almost-win.

Candy Crush operationalizes this with the explicit "Out of moves! You only needed 2 more jellies" message — spotlighting how close the failure was converts a loss into a motivating near-miss. The authors conclude "anticipatory arousal can be a primary motivator of future behaviour without the necessity of monetary reward" ([NCBI/PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC5445157/)).

Supporting gambling literature: near-misses recruit the *same* reward circuitry as wins (Clark et al. 2009, *Neuron*); Reid (1986) first showed gamblers treat near-misses as a signal to keep going ([Psychology of Games](https://www.psychologyofgames.com/2016/09/the-near-miss-effect-and-game-rewards/); [Reid PDF](https://www.stat.berkeley.edu/~aldous/157/Papers/near_miss.pdf)). A related lever: **more visible progress thresholds** (e.g., 5 pips instead of 3) manufacture more "almost had it" moments ([Psychology of Games](https://www.psychologyofgames.com/2016/09/the-near-miss-effect-and-game-rewards/)).

**Design translation for Swoosh:** surface the near-miss honestly ("1 more gem!"), keep retry cost tiny, make re-entry instant — the 1.85 s finding says the frustration→retry impulse is strongest *immediately*, so a fast, low-friction Retry beats a slow fail screen. (The ethics line: *reporting* a real near-miss is fine; *engineering* levels to manufacture near-misses as a purchase funnel is not — see Section 6.)

### 2.4 Flow: the calibration target

Flow lives in the diagonal channel where **challenge ≈ skill**; challenge >> skill produces **anxiety**, skill >> challenge produces **boredom**. Flow requires clear goals, immediate feedback, and total concentration simultaneously ([Yu-kai Chou — Flow Theory](https://yukaichou.com/gamification-analysis/flow-theory-complete-guide-csikszentmihalyi-optimal-experience/); [Jenova Chen — Flow in Games thesis](https://www.jenovachen.com/flowingames/Flow_in_games_final.pdf)). Match-3 satisfies the prerequisites unusually well: tight per-level objectives define the decision space, and the juice layer supplies the immediate feedback flow demands ([GameAnalytics — Crack the Match-3 Code](https://www.gameanalytics.com/blog/how-to-crack-the-match-3-code-part-1)). Mastery grows because cascades reward planning; the loss-aversion framing ("that setback was the board's randomness, not me") preserves optimism and keeps players in-channel ([snoukdesignnotes](https://snoukdesignnotes.blog/2018/06/21/design-analysis-match-3/)). Session shape: the genre is built for **~2–4 minute "snacking" sessions** ([UX Reviewer](https://www.uxreviewer.com/home/2020/5/9/how-to-crack-the-match-3-code-part-1)).

### 2.5 Nested anticipation loops (micro / level / meta)

A strong match-3 stacks anticipation→payoff loops at three time scales:

1. **Micro (seconds):** the pre-cascade beat → cascade resolution.
2. **Level (minutes):** objective progress → the level-complete crescendo (trumpets, fireworks, coins flying into the counter — Royal Match's explicit payoff ritual) ([Royal Match/Toon Blast analysis](https://medium.com/@ekinmelissezer/game-analysis-for-royal-match-and-toon-blast-9c4bff8ef48b)).
3. **Meta (days):** a meta-layer (map progress, renovation/collection) that reframes matching as a means to an end. A robust meta loop is "arguably the most critical feature for long-term retention" because "meta goals start dominating core-loop goals" ([UX Reviewer](https://www.uxreviewer.com/home/2020/5/9/how-to-crack-the-match-3-code-part-1); [Deconstructor of Fun — Match 3D](https://www.deconstructoroffun.com/blog/the-making-of-match-3d)).

**Caution on re-entry timers:** life/energy systems create scheduled anticipation, but timers/stress kill retention *unless the base loop is genuinely satisfying first* ([Design Analysis](https://medium.com/design-bootcamp/design-analysis-of-match-3-games-fb63879ecd8f)). Juice and honest near-miss framing come first; any pacing systems only work on top of a loop that already feels good.

---

## 3. Special Candy Economy

### 3.1 The universal three-tier taxonomy

Every leading match-3/blast game runs the **same three-tier special economy** — line-clear, area-blast, whole-color clear — just reskinned, with a fourth "smart targeting" piece in the Playrix/Dream Games lineage:

| Function | Candy Crush Saga | Royal Match | Toon Blast | Homescapes |
|---|---|---|---|---|
| **Line clear** (row/column) | Striped Candy | Rocket | Rocket | Rocket |
| **Area blast** (radius explosion) | Wrapped Candy | TNT | Bomb | Bomb |
| **Whole-color clear** | Color Bomb | Light Ball | Disco Ball | Rainbow Ball |
| **Smart / random targeting** | (Coconut Wheel / Jelly Fish variants) | Propeller | — | Paper Plane |

Confirmed by each game's own help center: [Candy Crush](https://candycrush.zendesk.com/hc/en-us/articles/360000754697-Learn-all-about-Special-Candies), [Royal Match](https://dreamgames.helpshift.com/hc/en/3-royal-match/faq/6-creating-and-using-the-power-ups/), [Toon Blast](https://peakgames.helpshift.com/hc/en/4-toon-blast/faq/7-what-are-the-special-items/), [Homescapes](https://homescapes.fandom.com/wiki/Power-ups).

**Takeaway: the taxonomy is a solved problem.** Ship the three core tiers (line, area, color) and optionally a fourth "smart" piece; players already have muscle memory for what each does. Differentiate on *feel and generosity*, not new categories.

### 3.2 Creation rules — exact match shapes

Creation is tied to match **shape**, and piece strength scales with how hard the shape is to build:

| Match shape | Candy Crush | Royal Match | Homescapes |
|---|---|---|---|
| **4 in a straight line** | Striped Candy | Rocket | Rocket |
| **4 in a 2×2 square** | (none in classic Saga) | Propeller | Paper Plane |
| **5 in an L or T** | Wrapped Candy | TNT | Bomb |
| **5 in a straight line** | Color Bomb | Light Ball | Rainbow Ball |

Sources: [Candy Crush creation rules](https://candycrush.zendesk.com/hc/en-us/articles/360000754697-Learn-all-about-Special-Candies); [Royal Match](https://medium.com/@ekinmelissezer/game-analysis-for-royal-match-and-toon-blast-9c4bff8ef48b); [Homescapes](https://homescapes.fandom.com/wiki/Power-ups).

**The striped-orientation nuance (a real skill lever):** in Candy Crush, a *vertical* swap creating a match-4 yields a striped candy that clears a **column**; a horizontal swap yields a **row**-clearer — the player has partial control over blast direction at creation time. One of the genre's subtlest mastery signals; Swoosh should keep it.

**Blast games use group size instead of shape:** Toon Blast (tap-to-collapse) creates a [Rocket from ~5–6 cubes, Bomb from ~7–8, Disco Ball from 9](https://medium.com/@ekinmelissezer/game-analysis-of-toon-blast-mechanics-level-design-difficulty-patterns-and-monetization-signals-022748ae51b4); the Disco Ball [takes the color of the cubes that created it](https://toonblast.fandom.com/wiki/Disco_Ball).

**Cost→power monotonicity.** Royal Match's effect potency is deliberately ["logically in line with the creation difficulty"](https://medium.com/@ekinmelissezer/game-analysis-for-royal-match-and-toon-blast-9c4bff8ef48b): color-clear is hardest to build (5-line), area blast mid (5 L/T), line-clear cheapest (match-4). **Preserve this monotonic relationship or the economy inverts** and players stop building the expensive pieces.

### 3.3 The full combo matrix

Combos come from **swapping two specials into each other**. The families are strikingly consistent across games — adopt the canonical matrix.

**Candy Crush Saga** ([Without the Sarcasm](https://www.withoutthesarcasm.com/posts/candy-crush-saga-special-candy-combos/)):
- **Striped + Striped** → one full row AND one full column from the swap point (a cross), regardless of stripe directions.
- **Striped + Wrapped** → the same cross but **3 candies wide in each arm** — clears **3 rows and 3 columns** ("one of the best combos").
- **Wrapped + Wrapped** → large double area-explosion (each burst ~2 tiles wider); best for dense obstacle clusters.
- **Striped + Color Bomb** → every candy of that color becomes a striped candy (random orientations) and all detonate — potential full-board clear.
- **Wrapped + Color Bomb** → every candy of that color becomes wrapped and detonates in two waves (rated the least strategically valuable combo).
- **Color Bomb + Color Bomb** → **clears the entire board** — the single most powerful move and a "rare treat."

**Royal Match** (tile counts are published — [Royal Match Wiki](https://royalmatch.fandom.com/wiki/Power-up_Combinations)):
- **Rocket + Rocket** → one row + one column (cross).
- **Rocket + TNT** → **3 rows and 3 columns** centered on the combine point.
- **TNT + TNT** → expands to a **4-tile radius, ~80 tiles total**.
- **Rocket + Propeller** → the Propeller carries the Rocket to a high-value target.
- **Light Ball + Rocket/TNT/Propeller** → turns all of the most-common tile type into that power-up, then fires them all.
- **Light Ball + Light Ball** → clears the whole board AND strips one layer off every obstacle.

**Toon Blast** ([Toon Blast Wiki](https://toonblast.fandom.com/wiki/Disco_Ball)): Rocket+Rocket → row+column; Rocket+Bomb → 3 rows + 3 columns; Bomb+Bomb → enlarged radius; Disco+Rocket/Bomb → all cubes of the disco's color become Rockets/Bombs; Disco+Disco → clears all cubes and hits every breakable once. Critically, [chaining 3+ specials still caps at the two strongest effects, preventing runaway scaling](https://medium.com/@ekinmelissezer/game-analysis-of-toon-blast-mechanics-level-design-difficulty-patterns-and-monetization-signals-022748ae51b4).

**Homescapes** (adds the smart plane — [Playrix help center](https://playrix.helpshift.com/hc/en/14-homescapes/faq/16363-what-power-up-combinations-are-available-in-the-game/)): Rocket+Rocket → row+column; Bomb+Bomb → double radius; Bomb+Rocket → 3 rows + 3 columns; Bomb/Rocket+Plane → plane carries it to a target; Plane+Plane → three planes to three targets; Rainbow+Rocket/Bomb/Plane → converts all of the most-common type into that power-up; Rainbow+Rainbow → board clear.

**The universal combo grammar (adopt as Swoosh's spec):**
1. **Line + Line = cross** (1 row + 1 column).
2. **Line + Area = fat cross** (3 rows + 3 columns).
3. **Area + Area = enlarged/double blast**.
4. **Color + Line/Area = "infect and detonate"** — convert all of one color into that special and fire them all.
5. **Color + Color = board wipe** (the money shot).

### 3.4 Why combos are the skill ceiling — and the spectacle rationale

- **The spectacle moment is the core psychological hook.** The first time a player makes a special and watches the chain reaction, they learn that ["bigger, more satisfying wins are possible" — the hook that drives continued engagement](https://medium.com/@chinwe.lucyy/case-study-candy-crush-saga-the-game-that-made-waiting-fun-again-b711a615955d). Escalating combos ration out ever-bigger versions of that hit.
- **Combos separate playing from mastering.** Base matches are pattern-spotting; deliberately *positioning two specials adjacent and swapping them* is a two-step plan. The color-conversion and board-wipe combos are strongest and rarest to set up, so they function as the skill ceiling ([Without the Sarcasm](https://www.withoutthesarcasm.com/posts/candy-crush-saga-special-candy-combos/)).
- **Generosity and juice beat difficulty for feel.** Royal Match's edge is explicitly feel: ["the most vigorous" blasts, the biggest bomb radii, and a Propeller that re-targets mid-flight](https://www.deconstructoroffun.com/blog/2021/3/21/royal-match-the-new-king-from-turkey) if its original target disappears. Naavik: Royal Match evolved power-ups ["into a truly frictionless experience" and "wants you to win"](https://naavik.co/deep-dives/royal-match/), including **concurrent matching** so you can keep moving during a cascade.
- **Agency at activation is a modern must.** The Playrix/Dream lineage moved to **tap-to-activate** power-ups ([more agency](https://www.deconstructoroffun.com/blog/2021/3/21/royal-match-the-new-king-from-turkey)), and Royal Match removed the anti-pattern of *forcing* a power-up to fire when no match exists.

### 3.5 Balance rules

- **Rarity scales with power** — match-4 pieces common, 5-line color pieces rare; keep the curve monotonic.
- **Reserve board wipes for genuine rarity.** Color+Color must stay hard to assemble by design; when it trivially recurs the spectacle deflates.
- **Cap combo stacking** at the two strongest effects (Toon Blast's rule) — without a cap, chain reactions clear boards accidentally and erase difficulty tuning ([Toon Blast analysis](https://medium.com/@ekinmelissezer/game-analysis-of-toon-blast-mechanics-level-design-difficulty-patterns-and-monetization-signals-022748ae51b4)).
- **Specials double as the relief valve.** Royal Match seeds pre-made power-ups (the "Butler's Gift") so a struggling player can blast ["through the initial layers of blockers like a knife through butter"](https://naavik.co/deep-dives/royal-match/). Balance in-level drop rate against store price.
- **Readability caps spectacle.** Royal Match uses [bigger, bolder, more saturated pieces so the eye can parse a chaotic post-combo board](https://medium.com/ironsource-levelup/design-deep-dive-02-royal-match-948f7af96f04). A powerful special is wasted if the player can't read the aftermath — doubly important against Swoosh's rich casino backgrounds.

---

## 4. Level Goal Variety

### 4.1 Goal types

Candy Crush's canonical goal set is the reference vocabulary ([Candy Crush Wiki — Level Types](https://candycrush.fandom.com/wiki/Level_Types)):

| Goal type | Objective | Status |
|---|---|---|
| **Moves / Score target** | Reach a target score within a move limit | Retired in Saga Aug 2021, but still the base of most other games |
| **Timed** | Reach a target score within a time limit | Retired in Saga May 2018; stressful, niche |
| **Clear the Jelly** | Remove all jelly tiles | Core |
| **Ingredients (drop)** | Bring ingredients down to exits at the bottom | Core |
| **Candy Order (collect)** | Collect specified quantities/types of candies or specials | Core |
| **Mixed Mode** | Two or more combined | The single most common type (~35% of levels) |
| **Rainbow Rapids** | Clear a path to route rainbow candies | Newer/rare |

Competitors mostly collapse to two meta-goals: **clear-all-obstacles** (Royal Match — simple to communicate, but teardowns flag pure "clear everything" as a weakness versus targeted objectives where other obstacles are merely ["part of the puzzle"](https://www.deconstructoroffun.com/blog/2021/3/21/royal-match-the-new-king-from-turkey)) and **collect/order** (Toon Blast, Homescapes), often fed by [spawner obstacles like the mailbox or magic hat](https://medium.com/@ekinmelissezer/game-analysis-for-royal-match-and-toon-blast-9c4bff8ef48b).

**Takeaway:** ship at minimum **score/moves, jelly-style area-clear, collect/order, and a drop/ingredient goal** plus mixed levels. The drop goal is uniquely valuable because it interacts with board *geometry* (Section 4.4). **Reserve timed levels for special events** — they change the whole feel and read as stressful in the core loop.

### 4.2 Blocker / obstacle taxonomy

Blockers are the primary difficulty lever. King groups them by *function*: [prevent access, occupy space, disable a special, multiply/spread, or spawn other blockers](https://candycrush-cheats.com/blockers/). The canonical set:

| Blocker | Behavior | Cleared by |
|---|---|---|
| **Jelly** (single/double layer) | Coats a tile; often the win goal itself | Match on top of it (twice for double) |
| **Frosting/Meringue** (multilayered) | The [most abundant blocker; occupies space, gains layers deeper in the game](https://candycrush.fandom.com/wiki/Multilayered_Frosting) | Adjacent match, once per layer |
| **Chocolate** (spreading) | [Regrows/spreads one tile each turn if not touched](https://candycrush-cheats.com/blockers/) | Adjacent match each turn to contain |
| **Liquorice Lock / Cage** | [Locks a candy so it can't be swapped](https://candycrush.fandom.com/wiki/Liquorice_Lock) | Match the locked candy, or a special |
| **Marmalade** | [Encases a candy or even a special, freezing it](https://candycrush-cheats.com/blockers/) | Adjacent match or special hit |
| **Liquorice Swirl / Shell** | Inert occupier; can absorb/deaden a special's effect | Adjacent match; shell absorbs one hit |
| **Candy/Time Bombs** | Countdown; lose if any reaches 0 | Clear before timer expires |
| **Spawners** (fountains, mixers, cannons) | [Generate new blockers or candies each turn](https://candycrush-cheats.com/blockers/) | Neutralize the source |

Competitor sets follow the same functional families: Royal Match's [single-match (Box, Egg, Grass), multi-match (Cupboard ≈8 matches), spawner (Mailbox), and conditional (Potion needs all four colors nearby)](https://medium.com/@ekinmelissezer/game-analysis-for-royal-match-and-toon-blast-9c4bff8ef48b); Toon Blast's [Balloon (1-adjacent) up to Can Toss (~9 matches), multi-layer Crates, Magic Hat spawners](https://medium.com/@ekinmelissezer/game-analysis-of-toon-blast-mechanics-level-design-difficulty-patterns-and-monetization-signals-022748ae51b4).

**Modern blocker philosophy (King designer):** older blockers just restricted space or absorbed moves; modern ones are built to ["create interesting choices rather than pure obstruction"](https://www.pocketgamer.biz/crafting-candy-crushs-difficulty-blockers-level-design-ai-and-the-complexity-staircase/). Design blockers that force *prioritization*, not grinding.

### 4.3 Freshness rules — what keeps levels from feeling repetitive

1. **One new mechanic at a time, on an easy level.** Tutorial/introduction levels should be [super-easy with only 1–3 mechanics on the field](https://www.gamigion.com/match-3-level-design-principles/) so the new element is learned in isolation.
2. **The complexity staircase.** King introduces blockers [on a "complexity staircase" — newer players get simpler obstacles, veterans get intricate ones — and rolls new blockers out gradually to gather data](https://www.pocketgamer.biz/crafting-candy-crushs-difficulty-blockers-level-design-ai-and-the-complexity-staircase/).
3. **Recombine, don't only invent.** Freshness comes mostly from *new combinations of known mechanics*; King's new levels ["typically feature a mix of both recent and long-established blockers"](https://www.pocketgamer.biz/crafting-candy-crushs-difficulty-blockers-level-design-ai-and-the-complexity-staircase/), and Royal Match's whole thesis is [fresh challenges "without reinventing mechanics" — winning on execution, not novelty](https://medium.com/ironsource-levelup/design-deep-dive-02-royal-match-948f7af96f04).
4. **Don't repeat a mechanic/idea for ~50 levels** ([Gamigion studio guideline](https://www.gamigion.com/match-3-level-design-principles/)).
5. **Vary board shape and size continuously.** ["Players shouldn't feel like they just played the same level, even if the elements have changed"](https://www.gamigion.com/match-3-level-design-principles/); use [symmetry, field shape, color scheme, even themed silhouettes](https://room8studio.com/news/smart-casual-the-state-of-tile-puzzle-games-level-design-part-1/). Board shape is a free difficulty *and* freshness lever.
6. **Treat each level as a mini-story with an emotional intent.** The six-category emotional palette: [Tutorial, "Wow-effect" (big cascades), "Fuu-effect" (near-miss frustration), Procrastinating/comfort, Skill (multi-attempt), Visualization (themed board)](https://room8studio.com/news/smart-casual-the-state-of-tile-puzzle-games-level-design-part-1/). Sequencing *feelings*, not just difficulty, is what prevents fatigue.
7. **Bot-test, then human-judge.** King [runs bot simulations to estimate difficulty pre-release, treating AI as "a support tool rather than a replacement for human judgement"](https://www.pocketgamer.biz/crafting-candy-crushs-difficulty-blockers-level-design-ai-and-the-complexity-staircase/); also [play the final level ~10 times — two reshuffles in one attempt means fix the level](https://www.gamigion.com/match-3-level-design-principles/).

### 4.4 How goal type shapes difficulty and pacing

- **The goal dictates where difficulty lives:** jelly levels get hard when jelly sits in corners/behind blockers cascades rarely reach; **drop levels are governed by board geometry** (narrow columns, split boards, blockers on the drop path); collect levels are paced by spawn rates; clear-all levels scale via blocker count and layer depth.
- **Objective, difficulty, and target audience are decided up-front**, then blockers are chosen to serve that intent ([King designer](https://www.pocketgamer.biz/crafting-candy-crushs-difficulty-blockers-level-design-ai-and-the-complexity-staircase/)).
- **Pacing is a sawtooth, not a ramp** — a challenging level should be ["followed by something lighter, giving players a sense of variation and momentum"](https://www.pocketgamer.biz/crafting-candy-crushs-difficulty-blockers-level-design-ai-and-the-complexity-staircase/). Competitors run [5–10-level difficulty cycles with peaks around levels 5 and 10, then a soft reset](https://medium.com/@ekinmelissezer/game-analysis-of-toon-blast-mechanics-level-design-difficulty-patterns-and-monetization-signals-022748ae51b4); Candy Crush marks [at most one "super hard" level per episode](https://community.king.com/en/candy-crush-saga/discussion/360672/%EF%B8%8F-criteria-for-hard-super-hard-and-nightmarishly-hard-levels); Royal Match inserts [optional bonus levels every ~10 levels as relief-and-reward valves](https://naavik.co/deep-dives/royal-match/).
- **Rotate goal types** (jelly → collect → drop → mixed) so consecutive levels don't share a win condition; Mixed levels are the variety workhorse (~1/3 of content).

**Consolidated pacing spec:** new mechanic solo on an easy board → 2–3 levels of the same mechanic in harder/reshaped boards → recombine with an established blocker → difficulty peak every ~5th/~10th level, breather immediately after → rotate goals → vary board shape continuously → bot-test difficulty, human-playtest ~10× for feel.

---

## 5. Difficulty Curves & Pacing

### 5.1 The target: the flow channel

Keep the median player in the **flow channel** — the diagonal band where challenge ≈ skill; above is anxiety, below is boredom ([Yu-kai Chou](https://yukaichou.com/gamification-analysis/flow-theory-complete-guide-csikszentmihalyi-optimal-experience/); [Flow — Wikipedia](https://en.wikipedia.org/wiki/Flow_(psychology))). Crucially, **level design — not the core mechanic — is where match-3 games are won or lost**: it is "the most labor-intensive and most impactful discipline" ([Galaxy4Games](https://galaxy4games.com/en/knowledgebase/blog/match-3-game-development-complete-guide-for-mobile-games)).

### 5.2 The sawtooth pattern

Top titles do **not** ramp smoothly. They run a **sawtooth**: strings of winnable levels punctuated by deliberate spikes, each hard cluster followed by a **breather level** ([Galaxy4Games](https://galaxy4games.com/en/knowledgebase/blog/match-3-game-development-complete-guide-for-mobile-games)). "Every handful of levels the player will face a stage that is considerably harder than the ones that precede or follow it," creating the feeling that ["fun is always just one level away"](https://riptidelab.com/candy-crush-saga-review/). Structure: **5–10-level cycles with peaks at ~5 and ~10, then a soft reset** ([Toon Blast analysis](https://medium.com/@ekinmelissezer/game-analysis-of-toon-blast-mechanics-level-design-difficulty-patterns-and-monetization-signals-022748ae51b4)).

Why spikes matter — and their double edge: players who fail with **1–2 moves remaining** are far more likely to retry than those failing with 10 left — "proximity to success," not raw difficulty, is the retention lever ([Gamigion](https://www.gamigion.com/match-3-level-design-principles/); [Room 8 Studio](https://room8studio.com/news/smart-casual-the-state-of-tile-puzzle-games-level-design-part-1/)). Candy Crush's infamous **Level 65** became simultaneously the highest-converting level ever *and* the biggest churn source ([Riptide Lab](https://riptidelab.com/candy-crush-saga-review/); [Deconstructor of Fun](https://www.deconstructoroffun.com/blog/tag/Candy+Crush+Saga)). **Ethical takeaway:** spikes are legitimate pacing/mastery beats; they become predatory only when the sole exit is the wallet. The breather-after-spike rhythm keeps a spike feeling like a challenge, not a shakedown.

### 5.3 Move budgets — the master difficulty dial

- **Modern norm: ~15–20 moves per level** (down from ~50 a decade ago) ([Gamigion](https://www.gamigion.com/match-3-level-design-principles/)); Royal Match runs a **~25-move average vs ~35 in older competitors** ([Naavik](https://naavik.co/digest/why-dream-games-success-is-a-challenge-to-replicate/)) — so treat **~15–25** as the working range, with pressure coming from goals/blockers rather than a starved move count (Royal Match players often [win with ~15 moves to spare](https://naavik.co/deep-dives/royal-match/)).
- **Extra moves cut difficulty exponentially.** "If a level's difficulty has been calibrated to 20 moves and a player is given 23, each additional move reduces the difficulty exponentially" ([Gamigion](https://www.gamigion.com/match-3-level-design-principles/)) — which is why "+5 moves" is the flagship power-up and must be priced/gifted carefully.
- **Statistical tuning:** Socialpoint models moves-to-win as a **shifted negative binomial**; their production model predicts win-rate change from a move change with **~1.5 percentage-points error per move increment**. Boosters distort the data, so model a "vanilla win rate" without boosters first ([Socialpoint](https://socialpoint-analytics.medium.com/tuning-level-difficulty-in-match-3-games-a-data-driven-framework-7b3cc07b2116)).
- **The tuning ritual:** play the finished level ~10 times back-to-back; record goals-remaining on losses and moves-remaining on wins ([Gamigion](https://www.gamigion.com/match-3-level-design-principles/)).

### 5.4 Star thresholds

Two dominant models — choose deliberately:

- **Score-based (Candy Crush lineage):** 1 star = beat the level; 2–3 stars = higher score bands. Rewards efficiency and combo skill without gating progression.
- **Objective-completion (Homescapes/Royal lineage):** every win yields 1 star as meta currency; special hard levels grant more ([Homescapes](https://homescapes.fandom.com/wiki/Levels); [Royal Match analysis](https://www.blog.udonis.co/mobile-marketing/mobile-games/royal-match-analysis)).

**Swoosh rule: 1 star = win, always — so progression never hard-blocks on a difficulty spike.** Use score and/or moves-remaining for the 2–3 star bands, giving mastery-seekers a replay chase without penalizing everyone else.

### 5.5 Luck vs. skill — keeping RNG feeling fair

- The failure mode: levels with "restricted board space" and "little in the way of meaningful choices," where "winning required getting a fortune opening from the RNG," feel like ["taking pulls from a slot machine"](https://riptidelab.com/candy-crush-saga-review/) — ironic for Swoosh's aesthetic, and precisely what the *gameplay* must avoid.
- Boards *can* be silently rigged either way — anti-player generation suppresses combos, pro-player generation biases spawns toward matches, via [a probability slider that "changes difficulty without changing the visible rules"](https://blog.macuyiko.com/post/2020/rigging-match-3-games.html). The lever's existence is neutral; which direction and how honestly you use it is the ethics.
- How the fairest-feeling game (Royal Match) maximizes agency against RNG ([Naavik](https://naavik.co/digest/why-dream-games-success-is-a-challenge-to-replicate/)): **free reshuffle** when no moves remain; **smart power-ups** that re-target mid-flight so a lucky cascade never wastes them; **fewer colors + fast animations** so variance averages out faster and each loss stings less.

**Rule of thumb: RNG creates *variety*, never decides the *win*.** If a level is unwinnable on a bad seed, that's an unfair level, not a hard one. Guarantee a solvable board (no dead starts, always ≥1 legal move, free auto-reshuffle) and let skill convert a decent seed into a win.

### 5.6 Dynamic Difficulty Adjustment — a capped safety net

DDA monitors win/loss, attempts, and resource use, then quietly nudges parameters ([Adrian Crook](https://adriancrook.com/dynamic-difficulty-adjustment-in-freemium-games/)). In match-3 the quiet levers are **color drop chances and bonus seeding**, not visible move counts:

- Drop-chance changes of **±20–30% go unnoticed** — e.g., halving one color's spawn weight to make a needed piece more likely ([Gamigion — automatic difficulty adjustment](https://www.gamigion.com/automatic-difficulty-adjustment-in-match3-levels/)).
- Reliability needs data: **~1,000 completions to configure** an auto-tuner, **~100,000 for accuracy**, with ~10% error on hard levels ([Gamigion](https://www.gamigion.com/automatic-difficulty-adjustment-in-match3-levels/)).
- King profiles player skill "in months or even weeks," then maps skill cohorts against level designs ([MobileGamer.biz](https://mobilegamer.biz/how-king-defines-a-good-candy-crush-saga-level-and-why-it-constantly-prunes-the-bad-ones/)).

**The ethics line:** "DDA should support mastery, not manipulation" ([Design Bootcamp](https://medium.com/design-bootcamp/product-design-and-psychology-the-use-of-dynamic-difficulty-adjustment-in-video-game-design-7a1e2d919b96)). Covert DDA that *tightens* difficulty before an offer is a dark pattern; covert DDA that *eases* a struggling player toward flow is defensible as a **safety net, not a spend-optimizer**. Best practice: cap how far it can swing, never tie it to spend propensity, use it only to prevent churn/frustration ([Adrian Crook](https://adriancrook.com/dynamic-difficulty-adjustment-in-freemium-games/)).

### 5.7 Benchmark numbers

| Metric | Working benchmark | Source |
|---|---|---|
| Moves per level (modern) | ~15–20 typical; Royal Match ~25 avg | [Gamigion](https://www.gamigion.com/match-3-level-design-principles/), [Naavik](https://naavik.co/digest/why-dream-games-success-is-a-challenge-to-replicate/) |
| Level win rate — outliers to review | **<30% or >90%** | [Room 8 Studio](https://room8studio.com/news/smart-casual-the-state-of-tile-puzzle-games-level-design-part-1/) |
| Move-change → win-rate model error | ~1.5 pp per move | [Socialpoint](https://socialpoint-analytics.medium.com/tuning-level-difficulty-in-match-3-games-a-data-driven-framework-7b3cc07b2116) |
| Invisible drop-chance DDA range | ±20–30% unnoticed | [Gamigion](https://www.gamigion.com/automatic-difficulty-adjustment-in-match3-levels/) |
| Data to trust auto-difficulty | ~1k to configure / ~100k for accuracy | [Gamigion](https://www.gamigion.com/automatic-difficulty-adjustment-in-match3-levels/) |
| D7 retention (good) | >20% | [GameAnalytics metrics guide](https://www.gameanalytics.com/blog/match-3-games-metrics-guide) |
| Payer conversion | ~1.69% baseline; 3.5–4% top | [GameAnalytics](https://www.gameanalytics.com/blog/match-3-games-metrics-guide) |
| Session length (genre) | ~30 min | [GameAnalytics](https://www.gameanalytics.com/blog/match-3-games-metrics-guide) |
| Board health flag | >2 reshuffles/attempt = redesign the level | [Gamigion](https://www.gamigion.com/automatic-difficulty-adjustment-in-match3-levels/) |

---

## 6. Progression & Reward Systems (Ethical)

### 6.1 The healthy backbone: stars, maps, world progression

The ethical spine is a **visible, generous meta-layer** where puzzle wins convert into tangible world-building: Homescapes/Royal Match award stars spent decorating a mansion/castle, so ["each time you win a level you unlock new furniture, decorations, and parts of the house"](https://www.blog.udonis.co/mobile-marketing/mobile-games/royal-match-analysis) — an immediate visual reward that gives the grind narrative meaning, satisfying competence + progress intrinsically. Candy Crush's **Saga Map** turns the puzzle into a *journey* with visible progress ([Game Developer](https://www.gamedeveloper.com/business/the-recipe-for-candy-crush-saga-luck-skill-and-puzzles)). **Keep the gate cheap: 1 star = 1 win**, so the story never hard-stops on a spike. The meta-map is the reward for *playing*, not for *paying*.

### 6.2 Streaks done right

Streaks are the most double-edged retention tool — delightful when generous, coercive when weaponized. They lean on habit loops and **loss aversion**, with progress reset on a miss ([Design Bootcamp on streaks](https://medium.com/design-bootcamp/streaks-and-daily-rewards-as-habit-forming-systems-dab7f5a34539)).

**Good example — Candy Crush "Sweet Streak"** (win 6 in a row → +3 moves and 5 pre-game boosters): cited as an "incredibly generous" implementation ([Abhay Ramakrishnan](https://medium.com/@abhayram/the-design-of-streak-systems-in-match-3-games-e9c6787a1a9e)).

**The ethical benchmark — Duolingo** (and its forgiving mechanics *increased* engagement — [UX Magazine](https://uxmag.com/articles/the-psychology-of-hot-streak-game-design-how-to-keep-players-coming-back-every-day-without-shame)):
- **Streak Freezes / Weekend Amulets:** users offered weekend flexibility were **4% more likely to return** a week later and **5% less likely to lose their streak**.
- **Earn-back, not pay-back:** lost streaks recoverable by doing extra lessons — reinforcing the core behavior instead of billing anxiety.
- **Lower the bar:** letting one short lesson keep the streak alive raised 7+ day streaks by **>40%**.
- **Progress-over-perfection framing:** "You've completed 47 of the last 50 days" beats highlighting the 3 misses.
- **Never confirmshame:** no "Are you *really* going to give up now?"

The failure line: streaks turn predatory when "indifferent to user context" (illness, travel punished like disinterest) and when paired with **paid recovery** — extracting money "during emotional vulnerability" ([UX Magazine](https://uxmag.com/articles/the-psychology-of-hot-streak-game-design-how-to-keep-players-coming-back-every-day-without-shame)). Match-3-specific safeguards: keep the biggest "+moves" boosts behind win-based streaks rather than purchasable ones; prefer short-duration unlimited-booster rewards over permanent power creep ([Abhay Ramakrishnan](https://medium.com/@abhayram/the-design-of-streak-systems-in-match-3-games-e9c6787a1a9e)).

### 6.3 Generosity wins commercially — the load-bearing evidence

- **King:** after pruning its **100 least-engaging levels** and easing frustration, King concluded that making levels easier lowers immediate spend but **"retention always wins"** — happy players compound like interest and spend more later ([MobileGamer.biz](https://mobilegamer.biz/how-king-defines-a-good-candy-crush-saga-level-and-why-it-constantly-prunes-the-bad-ones/)).
- **Royal Match:** economy is **~5× as generous as Candy Crush** (higher round rewards, lower costs), awards **>2× the daily unlimited-boosts and lives** of competitors, and avoids aggressive purchase prompts during onboarding — building a "trust bank" before any friction ([Udonis](https://www.blog.udonis.co/mobile-marketing/mobile-games/royal-match-analysis); [emhance/Sensemitter](https://www.emhance.ai/blog/how-royal-match-redefined-success-without-breaking-trust)). It also lets special challenge levels be **skipped**, raising perceived fairness and autonomy.
- **Duolingo:** the forgiving streak mechanics above measurably improved retention.

This is the strongest commercial evidence that the ethical (generous) path is also the *better long-run business*.

### 6.4 Variable reward: in PLAY, never in PURCHASE

Variable-ratio reinforcement is the most powerful and most dangerous tool: behaviors it reinforces are "extremely resistant to extinction" — the slot-machine mechanism ([Yu-kai Chou on operant conditioning](https://yukaichou.com/gamification-study/gamification-and-operant-conditioning/)).

- **Delight:** unpredictable *cascade/combo* payoffs, surprise board-clears, lucky chains — the reward costs the player nothing but attention and amplifies mastery. The randomness *is* the fun.
- **Manipulation:** VR tied to *money* — loot boxes, power-up gacha, mystery chests bought with premium currency — maps directly onto gambling schedules and is associated with financial harm ([arXiv — Dark Patterns in Mobile Games](https://arxiv.org/html/2412.05039v1)).

**Rule for Swoosh:** the casino *aesthetic* (lights, chimes, jackpot moments) lives entirely in the free play experience; **no purchasable chance of any kind**.

### 6.5 Dark patterns to avoid — the checklist

From the largest empirical taxonomy (**1,496 games, 85,388 dark-pattern instances; only 10.76% of games had zero**), four families ([arXiv 2412.05039](https://arxiv.org/html/2412.05039v1); [DarkPattern.games](https://www.darkpattern.games/pattern/30/wait-to-play.html)):

- **Temporal (steal time):** Wait-To-Play / energy timers · Grinding · Playing-by-Appointment (daily login *requirement*) · Can't-Pause-or-Save · manipulative Daily-Reward loops.
- **Monetary (extract money):** Pay-to-Skip · Pay-to-Win · obfuscated Premium Currency · Loot Boxes / gacha · Artificial Scarcity / false urgency ("offer ends in 5:00") · Accidental-Purchase traps.
- **Social (weaponize relationships):** Social Pyramid Schemes · Friend Spam / Impersonation · FOMO · Social Obligation ("don't let your team down").
- **Psychological (exploit biases):** paid Variable Rewards · Invested/Endowed Value (sunk cost) · Illusion of Control · Complete-the-Collection · Optimism/Frequency-bias exploitation · Confirmshaming.

Empirically, "dark" games averaged ~22 temporal, ~31 monetary, ~14 social dark patterns each vs. ~5 / ~4 / ~1.5 for healthy games — avoiding these is what statistically *defines* a healthy game ([arXiv](https://arxiv.org/html/2412.05039v1)).

Known genre-specific traps: lives/energy walls (5 lives, ~30 min each, ~2.5 hrs to refill in Candy Crush) that gate the loser exactly when they want to retry, [combined with pay-to-skip](https://riptidelab.com/candy-crush-saga-review/) ([DarkPattern.games — Wait To Play](https://www.darkpattern.games/pattern/30/wait-to-play.html)); the **manufactured near-miss + extra-moves squeeze** (Candy Crush "hovers for a full second on the board after defeat to let the player see just how close they were" ([Riptide Lab](https://riptidelab.com/candy-crush-saga-review/)); Dream Games places a rocket booster on the second continue screen 100% of the time — ["doesn't force you to open your wallet, but is expertly engineered to make you want to"](https://naavik.co/digest/why-dream-games-success-is-a-challenge-to-replicate/)); and Candy Crush's old Facebook bridge gates (pay or pester 3 friends every ~15 levels) — a classic Social Pyramid + Pay-to-Skip combo ([Riptide Lab](https://riptidelab.com/candy-crush-saga-review/)). Paywalls placed right after a difficulty spike are the textbook predatory pattern that even King concluded *loses* long-run value ([MobileGamer.biz](https://mobilegamer.biz/how-king-defines-a-good-candy-crush-saga-level-and-why-it-constantly-prunes-the-bad-ones/)).

### 6.6 Ethical alternatives that still retain

| Dark pattern | Ethical alternative that still retains |
|---|---|
| Energy/lives + pay-to-skip | Optional lives as a *natural stopping cue*, generously refilled via free social help, never the only path back to play ([Udonis](https://www.blog.udonis.co/mobile-marketing/mobile-games/royal-match-analysis)) |
| Paywall after a spike | Breather level after the spike; free reshuffle; **skippable** challenge levels ([emhance](https://www.emhance.ai/blog/how-royal-match-redefined-success-without-breaking-trust)) |
| Manufactured near-miss to sell moves | Offer retry/continue *without* engineering the near-miss; keep 1 star = win so failure never blocks the story |
| Paid streak insurance | Free streak freezes + earn-back-by-playing (Duolingo: +4% return, +40% long streaks) ([UX Magazine](https://uxmag.com/articles/the-psychology-of-hot-streak-game-design-how-to-keep-players-coming-back-every-day-without-shame)) |
| Loot boxes / paid gacha | Variable reward lives in *gameplay* cascades; monetize **cosmetics** and generous bundles, not chance ([arXiv](https://arxiv.org/html/2412.05039v1)) |
| FOMO / false urgency | Genuine, recurring events; honest timers; no fake countdowns |
| Confirmshaming | Neutral, encouraging copy; progress-over-perfection framing |
| Covert difficulty tightening to sell | DDA as a *capped safety net* to keep players in flow, decoupled from spend ([Adrian Crook](https://adriancrook.com/dynamic-difficulty-adjustment-in-freemium-games/)) |
| Grind for grind's sake | Meaningful meta-progress (world-building), mastery goals (3-star chase), cosmetic collection |

**Summary line for the bible:** Retain through *flow* (challenge ≈ skill), *mastery* (skill and combos genuinely matter; RNG adds variety, never decides the win), and *genuine reward* (generous economy, visible world progress, cosmetics, forgiving streaks) — and monetize *desire and cosmetics*, never *forced friction or chance*.

---

## 7. Board & Grid Design

### 7.1 The 9×9 envelope as a mask

The industry reference frame is **Candy Crush's 9×9 grid** — 81 cells maximum; every level's playable shape is carved *out of* that envelope ([King community](https://community.king.com/en/candy-crush-saga/discussion/356422/multiple-boards-on-some-levels)). The cap is deliberate: it fits a portrait phone at comfortable tap-target size, keeps the whole board readable at a glance, and forces variety through *shape and blockers* rather than raw size. **Standardize Swoosh on a 9×9 maximum envelope; treat the "real" board as a mask inside it; use effective playable area — not nominal grid — as the difficulty dial.**

### 7.2 The size ↔ cascade trade-off

Board size has a counter-intuitive, non-linear effect ([RocketBrush](https://rocketbrush.com/blog/how-to-make-a-match-3-game-guide-to-creating-addictive-gameplay)):

- **Larger boards:** easier to find an initial match, but *fewer* long cascades — the odds of the right color falling into exactly the right slot shrink as the board grows.
- **Smaller boards:** the first match is harder to spot, but pieces are concentrated so cascades and chains are more likely once a match resolves.

So a constricted board is a **difficulty lever**; a large open board is a **spectacle/relief lever**. For scale: in a standard 9×9, 6-color board, only **~0.040% of random colorings are "valid"** (no pre-existing matches, ≥1 legal move) ([arXiv — Counting Candy Crush Configurations](https://arxiv.org/pdf/1908.09996)).

### 7.3 Irregular shapes, zones, and funnels

Because size is capped, **shape is the primary source of variety and challenge**:

- **Zones:** levels are partitioned into distinct regions (a jelly zone, a top-mid board, a bottom board) that funnel attention and moves region by region ([Fran Ruiz](https://fran-ruiz.medium.com/match-3-level-design-study-building-three-candy-crush-levels-60f88465af7b)).
- **Progressive space-opening:** start with much of the grid locked, unlock more by collecting elements — restrict early, then expand for a combo-rich finale ([Fran Ruiz](https://fran-ruiz.medium.com/match-3-level-design-study-building-three-candy-crush-levels-60f88465af7b); [45 Match-3 Mechanics](https://www.gamedeveloper.com/design/45-match-3-mechanics)).
- **Walls and split sub-boards:** pieces can't swap across a wall, effectively creating semi-independent puzzles; some King levels run [multiple physically separate boards](https://community.king.com/en/candy-crush-saga/discussion/356422/multiple-boards-on-some-levels).
- **Direction-change zones:** refill gravity can be steered through arrow-marked bends and channels ([45 Match-3 Mechanics](https://www.gamedeveloper.com/design/45-match-3-mechanics)).
- **Funnels to exits:** ingredient levels route pieces down narrow columns to fixed exit slots — holes and necks dictate viable drop paths ([Candy Crush Wiki — Ingredient](https://candycrush.fandom.com/wiki/Ingredient)).
- **Shape does emotional work:** field silhouettes are deliberately shaped like hearts/characters for visual comfort and theming ([Room 8 Studio](https://room8studio.com/news/smart-casual-the-state-of-tile-puzzle-games-level-design-part-1/)) — for Swoosh: card suits, chips, diamonds, a roulette wheel.

### 7.4 Boards teach mechanics

- **One new thing at a time**, mastered before combining; the first genuinely new mechanic is often held until ~level 5 ([designthegame](https://www.designthegame.com/learning/tutorial/critical-design-elements-engaging-match-2-match-3-mobile-games)).
- **Tutorial levels = "super-easy levels with 1–3 mechanics on the field"** ([Room 8 Studio](https://room8studio.com/news/smart-casual-the-state-of-tile-puzzle-games-level-design-part-1/)); introduce a blocker in a **low-stakes pocket** so its rule is learned by placement before it sits on a critical path; decide element-introduction order *before* building levels.
- **King's per-level rule set:** every level has a distinctive *hook*, uses **no more than ~4 element types**, and is **winnable without boosters** ([Fran Ruiz](https://fran-ruiz.medium.com/match-3-level-design-study-building-three-candy-crush-levels-60f88465af7b)). Playrix's near-identical rules: ≤3–4 elements per level, a compatibility document forbidding problematic element pairings, "each level needs a distinct strategic concept" ([Game World Observer](https://gameworldobserver.com/2019/09/27/playrix-levels-elements-match-3)).
- **Front-load novelty, then taper** — introduce new elements at a high rate early, lean on recombination later ([Game World Observer](https://gameworldobserver.com/2019/09/27/playrix-levels-elements-match-3)).
- **Open layouts allow combos/cascades; constrained layouts with narrow sections raise challenge** by limiting options ([Galaxy4Games](https://galaxy4games.com/en/knowledgebase/blog/match-3-game-development-complete-guide-for-mobile-games)).

### 7.5 Spawn rules and dead-board handling

**How tiles enter:** default gravity refill (collapse down, spawn at top of each open column) ([Azumo](https://azumo.com/insights/the-logic-behind-match-3-games)); **dispensers/cannons** that release specific elements above a column ([Candy Crush Wiki — Candy Cannon](https://candycrush.fandom.com/wiki/Candy_Cannon)); **spawners/generators** that yield elements on adjacent matches, including "evil spawners" seeding spreading hazards ([45 Match-3 Mechanics](https://www.gamedeveloper.com/design/45-match-3-mechanics); [Candy Crush Wiki — Spawners](https://candycrush.fandom.com/wiki/Category:Spawners)); **column taps** feeding specific pieces into funnels.

**Guaranteeing a solvable board:**
- **Two-phase generation:** on fill, avoid spawning pre-made matches (they auto-resolve and feel unearned) *and* guarantee ≥1 legal move ([Logic Simplified](https://logicsimplified.com/newgames/key-algorithmic-tricks-for-match-3-game-development/)).
- **Dead-board detection:** simulate a swap of every tile with each neighbor, looking for ≥1 swap that forms a match; if none, the board is dead → **reshuffle** into a valid configuration or spawn a helpful tile ([Logic Simplified](https://logicsimplified.com/newgames/key-algorithmic-tricks-for-match-3-game-development/)). A construction trick to keep boards live: seat at least one matching adjacent pair next to each 3+ group ([GameDev.net](https://www.gamedev.net/forums/topic/709760-needs-some-help-about-match3-game-techniquespossible-moves-and-avoid-lock/5438441/)).
- **Reshuffle as a quality signal:** >2 reshuffles in one attempt = mis-tuned level ([Gamigion](https://www.gamigion.com/match-3-level-design-principles/)). Royal Match's board [**"almost never reshuffles"**](https://naavik.co/deep-dives/royal-match/) — near-zero reshuffle is itself a premium-feel differentiator, because a reshuffle silently erases the plan the player was forming.

### 7.6 Color count as difficulty dial — and the casino-palette warning

- **More colors = harder.** Low levels use 3–4 colors, high levels 6+; fewer colors produce long same-color runs that make matches and cascades easy ([GameDev.net](https://www.gamedev.net/forums/topic/677073-match-3-puzzle-game-algorithms/)). **5 → 6 is a meaningful jump** — it materially lowers match density and cascade frequency, a standard mid/late-game escalation. Candy Crush's palette tops out at six; levels draw "two to six" of them by target difficulty ([Candy Crush Wiki](https://candycrush.fandom.com/wiki/Candy_Crush_Saga)).
- **Royal Match uses four board colors** (vs. five in older competitors) specifically to raise cascade frequency and per-attempt speed ([Naavik](https://naavik.co/digest/why-dream-games-success-is-a-challenge-to-replicate/)). Default Swoosh to **4–5 colors**, holding the 6th as a hard-mode dial.
- **Critical for Swoosh's casino palette:** six colors is near the ceiling for at-a-glance discrimination, and Royal Match's clarity edge comes from *large, high-contrast, distinctly-shaped* pieces that pop against the background ([Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2021/3/21/royal-match-the-new-king-from-turkey)). A rich jewel-tone palette (deep purple, gold, crimson, emerald) on ornate backgrounds **must differentiate pieces by SHAPE + value (brightness) contrast, not hue alone** — this is also the colorblind-accessibility requirement.

**Quick difficulty-lever reference:** shrink effective board area · add a 6th color · reduce move budget · add/layer blockers · reduce goal-color drop probability · narrow funnels ([Gamigion](https://www.gamigion.com/match-3-level-design-principles/)).

---

## 8. Competitor Teardowns & Lessons

### 8.1 Candy Crush Saga (King) — juice, saga map, "luck in the right places"

- **The postmortem thesis (Tommy Palm, GDC 2013): "luck in the right places"** — luck engineered *out* of development but sprinkled *into* levels so wins feel earned and losses feel like near-misses rather than unfairness ([GDC Vault](https://www.gdcvault.com/play/1018053/Candy-Crush-Saga-Postmortem-Luck); [Game Developer](https://www.gamedeveloper.com/business/the-recipe-for-candy-crush-saga-luck-skill-and-puzzles)). Tactile feedback — cascades, sounds, the "Sweet!"/"Delicious!" voice — is the genre's juice template.
- **The Saga Map** turns a puzzle into a journey: gated linear levels, visible progress, social overtakes ([Wikipedia](https://en.wikipedia.org/wiki/Candy_Crush_Saga)).
- **Specials & combos** provide the depth ceiling (Section 3); heavy A/B testing before shipping any mechanic; the formula produced **>$20B lifetime revenue by Sept 2023** ([Wikipedia](https://en.wikipedia.org/wiki/Candy_Crush_Saga)).
- **Lesson:** win the *feel* first (juice + fair-feeling luck), wrap it in a visible progression map, add depth via combinable specials. Cautionary notes: Level 65 (spike churn), lives + pay-to-skip, and the old friend-pester bridge gates (Section 6.5).

### 8.2 Royal Match (Dream Games) — the frictionless benchmark

Built by five ex-Peak founders; one of only two new titles in five years to reach top-10 grossing puzzle games ([Naavik](https://naavik.co/deep-dives/royal-match/)). Three pillars:

1. **Fanatical core-experience optimization:** ranked best-in-class for clarity/legibility among nine surveyed switchers; "one of, if not the, fastest"; removed loading between retries; supports **concurrent matching** (move while cascades resolve) ([Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2021/3/21/royal-match-the-new-king-from-turkey)).
2. **Player-favorable power-ups:** largest bomb radius in class, mid-air re-targeting propellers, **no forced power-up activation** when no match exists, near-zero reshuffle ([Naavik](https://naavik.co/deep-dives/royal-match/)).
3. **Deliberately lightweight meta:** a "Puzzle & Decorate-*lite*" castle renovation with pre-set locations, keeping focus on the board ([Naavik](https://naavik.co/deep-dives/royal-match/)).

Plus: **generous economy** (~5× Candy Crush — Section 6.3), **honest ads** (its top creative "Save the King" is an actual in-game challenge, not a fake ([Naavik](https://naavik.co/deep-dives/royal-match/))), heavy live-ops (**~36 competition events/month vs. <10 for the average top match-3**; King's Cup leaderboards in cohorts of 50 ([Balancy](https://balancy.co/blog/2023/03/13/how-to-set-up-liveops-in-match-3-games-case-royal-match/); [Heroic Labs](https://heroiclabs.com/docs/hiro/guides/gameplay-mechanics/event-leaderboard/))), and **premium pricing sustained by polish** (~$2 first extra-moves pack escalating to $8.95; $10+ Royal Pass vs. Homescapes' $4.99 ([Naavik](https://naavik.co/deep-dives/royal-match/))). Ethics gray zone to note: routine 1–2-move near-miss tuning with King Robert's face mirroring the stakes, and a rocket booster on the second continue screen 100% of the time ([Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2021/3/21/royal-match-the-new-king-from-turkey); [Naavik](https://naavik.co/digest/why-dream-games-success-is-a-challenge-to-replicate/)).

- **Lesson:** you don't need a new core or meta — "cherry-pick the strongest mechanics from the best games" and relentlessly remove friction. Caveat: the polish+UA blueprint is capital-intensive and hard to replicate ([Naavik](https://naavik.co/digest/why-dream-games-success-is-a-challenge-to-replicate/)).

### 8.3 Toon Blast / Toy Blast (Peak) — the verb is a strategic choice

- **Different core verb:** tap-to-collapse (technically match-2), not swap — tap 2+ adjacent same-color cubes ([Toon Blast analysis](https://medium.com/@ekinmelissezer/game-analysis-of-toon-blast-mechanics-level-design-difficulty-patterns-and-monetization-signals-022748ae51b4)). Tapping is faster and lower-friction than planning a swap — "faster-paced gameplay with potentially less puzzle contemplation" — lowering the skill floor and raising session speed; collapse's market share **more than doubled since 2018 (~22% of top matches vs. swap's ~59%)** ([GameRefinery](https://www.gamerefinery.com/match3-meta-layers-matching-types/)).
- **Depth via cluster size** (rockets/bombs/disco balls from bigger taps) rather than swap shapes; clean readability and cartoon personality drove **100M users in year one**; Peak's puzzle games reached **400M+ players** ([Grokipedia — Peak Games](https://grokipedia.com/page/Peak_Games)).
- **Lesson for Swoosh:** the *verb* sets the pace and audience. Swoosh is a swap game (deliberate puzzle depth fits "puzzle elegance"), but should borrow blast-game *speed* — Royal Match did exactly that, taking Toon Blast's speed and palette while keeping swap ([Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2021/3/21/royal-match-the-new-king-from-turkey)).

### 8.4 Homescapes / Gardenscapes (Playrix) — meta power and the ads cautionary tale

- **Meta-layer template:** play levels → earn stars → renovate a home/garden and advance a story with characters. Decoration/building meta appears in ~31% of top matches and deepens retention beyond level-solving ([GameRefinery](https://www.gamerefinery.com/match3-meta-layers-matching-types/)). Underneath sits disciplined level craft: ≤3–4 elements per level, compatibility rules, boosters-optional, A/B-tuned ([Game World Observer](https://gameworldobserver.com/2019/09/27/playrix-levels-elements-match-3)).
- **The misleading-ads ban — a dark pattern to avoid:** Playrix's pin-pulling "save the character" ad mini-puzzles represented perhaps **~1% of actual gameplay**; in **2020 the UK ASA banned the ads** — the first publisher banned for misrepresenting gameplay — rejecting the "not all images represent actual gameplay" disclaimer ([Game Developer](https://www.gamedeveloper.com/business/uk-regulator-bans-misleading-i-homescapes-i-i-gardenscapes-i-pin-puzzle-ads); [PocketGamer.biz](https://www.pocketgamer.biz/master-the-meta-why-playrixs-misleading-ads-finally-got-banned/)).
- **Lesson:** fake ads "work" for installs but are a reputational/regulatory liability and inflate churn from mismatched expectations. Royal Match went the other way and won on trust. **For Swoosh: what you show must be what you ship** — the casino aesthetic naturally supports genuine "crack the vault / jackpot cascade" hooks without fakery.

---

## 9. Design Principles for Swoosh

Twenty one-sentence principles, numbered in priority order. **P0 = foundation, build first and never violate; P1 = build early, core to competitiveness; P2 = important, can follow.** Each is tagged with its source area.

### P0 — Foundations

1. **[Feel]** Nail the tumble before anything else: swap ~250 ms, clear ~150 ms, fall ~200 ms with accelerating ease-in, pop-in 0.8→1.0 Bounce.Out ~300 ms, land-settle 0.9→1.1→1.0, all locked at 60 fps on mid-tier phones — the falling-gem physics *is* the product (Kapalka's Bejeweled lesson).
2. **[Feel]** Scale juice to rarity ("common action = simpler juice"): a plain 3-match gets a light pop and haptic tick; 4/5-matches, specials, and cascade finales get the full stack — particles, trauma-based shake (shake = trauma², roll ≤0.1 rad, none on 3-matches), rising-pitch chimes, and stronger haptic pulses.
3. **[Psychology]** Spend the biggest audio-visual build on the ~0.5 s anticipation beat *before* a cascade resolves — dopamine peaks on anticipation, not payoff — using rising musical-scale pitches (Shepard-tone flavor for long chains) that make Swoosh's slot-machine excitement literal in the free play loop.
4. **[Psychology/Ethics]** Surface near-misses honestly ("1 more gem!") with an instant, penalty-free retry — the urge to continue is strongest ~1.85 s after an almost-win vs. ~12 s after a win — but never *engineer* near-misses or defeat-screen lingering as a purchase funnel.
5. **[Boards]** Differentiate Swoosh's jewel pieces by silhouette SHAPE and value (brightness) contrast, never hue alone — the deep-purple/gold/crimson/emerald casino palette is unreadable (and colorblind-hostile) otherwise, and legibility caps how much spectacle can land.
6. **[Specials]** Ship the canonical three-tier special economy (line / area / color, created by match-4 with swap-direction orientation, 5-in-L/T, and 5-in-line) with the universal combo grammar — cross, 3×3 fat cross, double blast, infect-and-detonate, color+color board wipe — keeping cost→power strictly monotonic and combo chains capped at the two strongest effects.
7. **[Difficulty]** 1 star = level win, always, so meta progression never hard-blocks on a spike; reserve score and moves-remaining for the 2–3 star mastery chase that gives skilled players a replay reason.
8. **[Difficulty/Fairness]** Guarantee no dead boards — block pre-made matches on fill, always ensure at least one legal move, auto-reshuffle free (and rarely: >2 reshuffles per attempt means redesign the level) — because RNG must add variety, never decide the win.
9. **[Ethics]** Variable reward lives in PLAY, never in PURCHASE: cascades, lucky chains, and jackpot moments are free spectacle; loot boxes, gacha, and paid chance of any kind are banned outright.
10. **[Ethics]** Adopt the four-family dark-pattern ban list as a hard product requirement — no pay-to-skip energy walls, false urgency, confirmshaming, social pyramids, paid streak repair, or spend-linked difficulty — since "healthy" games are statistically defined by their absence.

### P1 — Core competitiveness

11. **[Goals]** Launch with four goal types (score/moves, jelly-style clear, collect/order, ingredient-drop) plus mixed levels (~1/3 of content), rotating win conditions between consecutive levels, and keep timed modes event-only.
12. **[Goals/Boards]** Introduce exactly one new mechanic at a time on an easy board, keep ≤4 element types per level, make every level winnable without boosters, and don't repeat the same mechanic-idea for ~50 levels.
13. **[Difficulty]** Pace difficulty as a sawtooth in 5–10-level cycles with peaks around levels ~5 and ~10 and a breather immediately after every spike, on move budgets of ~15–25 — remembering each extra move cuts difficulty exponentially, so tune moves last and precisely.
14. **[Difficulty]** Tune with data: flag win rates <30% or >90% as outliers, playtest each level ~10× recording moves-remaining/goals-remaining, and use DDA only as an invisible, capped safety net (±20–30% drop-chance goes unnoticed) to rescue struggling players — never tied to spend.
15. **[Progression/Ethics]** Be generous on principle and by the numbers — Royal Match runs ~5× Candy Crush's economy and King's own data says "retention always wins" over squeezing — because the generous path is empirically the better long-run business.
16. **[Feel/Teardowns]** Remove friction ruthlessly, Royal Match-style: zero loading between retries, concurrent matching during cascades, short skippable celebration animations, tap-to-activate specials, and no forced power-up activation.
17. **[Boards]** Build every level as a mask inside a 9×9 envelope, defaulting to 4–5 colors (6th color = hard-mode dial), and use shape, zones, funnels, and effective playable area — smaller = harder but cascade-richer — as the primary variety and difficulty levers.

### P2 — Important follow-ons

18. **[Progression/Ethics]** If streaks ship, copy Duolingo and Sweet Streak: win-based rewards, free streak freezes, earn-back-by-playing, progress-over-perfection copy — never paid streak insurance or guilt messaging.
19. **[Progression/Teardowns]** Keep the meta light and on-theme — a casino "build your resort / crack the vault" map with pre-set upgrades where 1 star = 1 step — so the board stays the star and content costs stay controlled, with a nested payoff at every scale (cascade beat → level crescendo with coins flying to the counter → map progress).
20. **[Brand/Ethics]** Show only real gameplay in ads and store creative (Playrix's ASA ban is the cautionary tale; Royal Match's honest "Save the King" creative is the model) — Swoosh's "slot machine excitement" must live entirely in juice and cascades, never in gambling mechanics or bait.

---

## Sources

### Game feel / juice
- Steve Swink, *Game Feel* — definition and polish layer: https://en.wikipedia.org/wiki/Game_feel
- Jonasson & Purho, "Juice It or Lose It" (GDC Europe 2012): https://www.youtube.com/watch?v=Fy0aCDmgnxg
- Game Developer — "resist the urge to juice it or lose it": https://www.gamedeveloper.com/design/video-indies-resist-the-urge-to-juice-it-or-lose-it-
- Squirrel Eiserloh, "Juicing Your Cameras With Math" (GDC 2016) — slides: http://www.mathforgameprogrammers.com/gdc2016/GDC2016_Eiserloh_Squirrel_JuicingYourCameras.pdf
- Eiserloh GDC 2016 — transcript: https://archive.org/stream/GDC2016Eiserloh/GDC2016-Eiserloh_djvu.txt
- Godot Recipes — trauma-based screen shake (concrete params): https://kidscancode.org/godot_recipes/4.x/2d/screen_shake/index.html
- GameMaker — Juicy Screenshake tutorial: https://gamemaker.io/en/tutorials/coffee-break-tutorials-juicy-screenshake-gml
- GameAnalytics — Squeezing more juice out of your game design: https://www.gameanalytics.com/blog/squeezing-more-juice-out-of-your-game-design
- dev.to — Match-3 in Pixi.js: Juice and Polish (durations/easing/scale): https://dev.to/roman_guivan_17680f142e28/match-3-game-in-pixijs-103-juice-and-polish-3fff
- GameDev.net — smooth/physics tile motion, spring settle: https://www.gamedev.net/forums/topic/702077-moving-tile-in-match-3-game-smoothly-or-simulating-physics-effects/
- johndechancie — Visual Layer Timing in Cascading Animation: https://johndechancie.com/visual-layer-timing-in-cascading-animation-design/
- Flutter Crush — building a Candy-Crush-style match-3 (cascade delays): https://medium.com/flutter-community/flutter-crush-debee5f389c3
- Twelve Basic Principles of Animation: https://en.wikipedia.org/wiki/Twelve_basic_principles_of_animation
- Game Developer — Casual Game Design: Jason Kapalka & Bejeweled Twist: https://www.gamedeveloper.com/design/casual-game-design-popcap-s-jason-kapalka-and-i-bejeweled-twist-i-
- Shepard tone — Wikipedia: https://en.wikipedia.org/wiki/Shepard_tone
- Splice — how the Shepard tone works: https://splice.com/blog/how-shepard-tone-works/
- Slot audio design overview (rising-pitch build-ups): https://enallaktikiagenda.gr/slot-game-thrills-your-guide-to-reels-bonuses-and
- A Sound Effect — match-3 SFX libraries/design: https://www.asoundeffect.com/sound-library/match-3-games/
- Unity Learn — burst particle construction: https://learn.unity.com/pathway/creative-core/unit/creative-core-vfx/tutorial/create-a-burst-particle-3
- Interhaptics — Mobile Gaming UX: haptics: https://interhaptics.medium.com/mobile-gaming-ux-how-haptic-feedback-can-change-the-game-3ef689f889bc
- Maxima — role of haptic feedback in game design: https://maximagamingstudio.com/the-role-of-haptic-feedback-in-modern-game-design/

### Core loop / psychology
- Larche, Musielak & Dixon — "The Candy Crush Sweet Tooth" (near-miss study, n=57): https://pmc.ncbi.nlm.nih.gov/articles/PMC5445157/
- Psychology of Games — The Near-Miss Effect and Game Rewards: https://www.psychologyofgames.com/2016/09/the-near-miss-effect-and-game-rewards/
- Reid — "The Psychology of the Near Miss" (PDF): https://www.stat.berkeley.edu/~aldous/157/Papers/near_miss.pdf
- teachboston — Variable Reward Schedules (gambling): https://www.teachboston.org/variable-reward-schedules-gambling/
- Design Bootcamp (Medium) — Variable Ratio Reinforcement Beyond the Skinner Box: https://medium.com/design-bootcamp/variable-ratio-reinforcement-beyond-the-skinner-box-191d3e86d86f
- Design Bootcamp (Medium) — Skinner Box mechanics in game design: https://medium.com/design-bootcamp/product-design-and-psychology-the-mechanism-of-skinner-box-techniques-in-video-game-design-5b7315e2d7b4
- Grokipedia — Compulsion loop: https://grokipedia.com/page/Compulsion_loop
- GameAnalytics — The Compulsion Loop explained: https://www.gameanalytics.com/blog/the-compulsion-loop-explained
- gamemakers.com — The Compulsion Loop explained: https://www.gamemakers.com/p/the-compulsion-loop-explained
- snoukdesignnotes — Design Analysis: Match-3: https://snoukdesignnotes.blog/2018/06/21/design-analysis-match-3/
- Design Bootcamp (Medium) — Design Analysis of Match-3 Games: https://medium.com/design-bootcamp/design-analysis-of-match-3-games-fb63879ecd8f
- Om Tandon / UX Reviewer — How to Crack the Match-3 Code, Part 1: https://www.uxreviewer.com/home/2020/5/9/how-to-crack-the-match-3-code-part-1
- GameAnalytics — How to Crack the Match-3 Code, Part 1: https://www.gameanalytics.com/blog/how-to-crack-the-match-3-code-part-1
- Deconstructor of Fun — The Making of Match 3D (meta-loop and retention): https://www.deconstructoroffun.com/blog/the-making-of-match-3d
- Yu-kai Chou — Flow Theory (Csikszentmihalyi) complete guide: https://yukaichou.com/gamification-analysis/flow-theory-complete-guide-csikszentmihalyi-optimal-experience/
- Jenova Chen — "Flow in Games" MFA thesis (PDF): https://www.jenovachen.com/flowingames/Flow_in_games_final.pdf
- Game Developer — The Flow applied to game design: https://www.gamedeveloper.com/design/the-flow-applied-to-game-design
- Wikipedia — Flow (psychology): https://en.wikipedia.org/wiki/Flow_(psychology)

### Special candy economy
- King / Candy Crush help center — special candy creation: https://candycrush.zendesk.com/hc/en-us/articles/360000754697-Learn-all-about-Special-Candies
- Candy Crush Saga Wiki — Special Candy: https://candycrush.fandom.com/wiki/Special_Candy
- Without the Sarcasm — Candy Crush special candy combos: https://www.withoutthesarcasm.com/posts/candy-crush-saga-special-candy-combos/
- Royal Match Wiki — Power-up Combinations: https://royalmatch.fandom.com/wiki/Power-up_Combinations
- Dream Games / Royal Match help center — creating power-ups: https://dreamgames.helpshift.com/hc/en/3-royal-match/faq/6-creating-and-using-the-power-ups/
- Peak Games / Toon Blast help center — special items: https://peakgames.helpshift.com/hc/en/4-toon-blast/faq/7-what-are-the-special-items/
- Toon Blast Wiki — Disco Ball: https://toonblast.fandom.com/wiki/Disco_Ball
- Homescapes Wiki — Power-ups: https://homescapes.fandom.com/wiki/Power-ups
- Playrix / Homescapes help center — power-up combinations: https://playrix.helpshift.com/hc/en/14-homescapes/faq/16363-what-power-up-combinations-are-available-in-the-game/
- ironSource LevelUp (Medium) — Design Deep Dive: Royal Match: https://medium.com/ironsource-levelup/design-deep-dive-02-royal-match-948f7af96f04
- Lucy Michael (Medium) — Candy Crush case study (spectacle hook): https://medium.com/@chinwe.lucyy/case-study-candy-crush-saga-the-game-that-made-waiting-fun-again-b711a615955d

### Level goals, blockers, freshness
- Candy Crush Saga Wiki — Level Types: https://candycrush.fandom.com/wiki/Level_Types
- Candy Crush Cheats — Blockers and Obstacles: https://candycrush-cheats.com/blockers/
- Candy Crush Saga Wiki — Multilayered Frosting/Meringue: https://candycrush.fandom.com/wiki/Multilayered_Frosting
- Candy Crush Saga Wiki — Liquorice Lock: https://candycrush.fandom.com/wiki/Liquorice_Lock
- PocketGamer.biz — Crafting Candy Crush's difficulty: the "complexity staircase" (King designer interview): https://www.pocketgamer.biz/crafting-candy-crushs-difficulty-blockers-level-design-ai-and-the-complexity-staircase/
- Gamigion — Match-3 Level Design Principles: https://www.gamigion.com/match-3-level-design-principles/
- Room 8 Studio — Tile Puzzle Games Level Design (Part 1): https://room8studio.com/news/smart-casual-the-state-of-tile-puzzle-games-level-design-part-1/
- Ekin Melis Sezer (Medium) — Royal Match & Toon Blast game analysis: https://medium.com/@ekinmelissezer/game-analysis-for-royal-match-and-toon-blast-9c4bff8ef48b
- Ekin Melis Sezer (Medium) — Toon Blast analysis (difficulty cycles, combo caps): https://medium.com/@ekinmelissezer/game-analysis-of-toon-blast-mechanics-level-design-difficulty-patterns-and-monetization-signals-022748ae51b4
- King Community — Criteria for Hard / Super Hard / Nightmarishly Hard levels: https://community.king.com/en/candy-crush-saga/discussion/360672/%EF%B8%8F-criteria-for-hard-super-hard-and-nightmarishly-hard-levels

### Difficulty, tuning, metrics
- Riptide Lab — Candy Crush Saga review (sawtooth, near-miss, lives, RNG feel, bridge gates): https://riptidelab.com/candy-crush-saga-review/
- MobileGamer.biz — How King defines a good Candy Crush level ("retention always wins," pruning 100 worst levels): https://mobilegamer.biz/how-king-defines-a-good-candy-crush-saga-level-and-why-it-constantly-prunes-the-bad-ones/
- Deconstructor of Fun — Candy Crush Saga hub (Level 65): https://www.deconstructoroffun.com/blog/tag/Candy+Crush+Saga
- Socialpoint Analytics — Tuning Level Difficulty in Match-3 (negative binomial, ~1.5pp/move): https://socialpoint-analytics.medium.com/tuning-level-difficulty-in-match-3-games-a-data-driven-framework-7b3cc07b2116
- Gamigion — Automatic Difficulty Adjustment in Match-3 (±20–30% drop chance, 1k/100k data): https://www.gamigion.com/automatic-difficulty-adjustment-in-match3-levels/
- Galaxy4Games — Match-3 Development Complete Guide (sawtooth, breathers, level-design primacy): https://galaxy4games.com/en/knowledgebase/blog/match-3-game-development-complete-guide-for-mobile-games
- Macuyiko — Rigging Match-3 Games (board RNG manipulation): https://blog.macuyiko.com/post/2020/rigging-match-3-games.html
- Adrian Crook & Associates — Dynamic Difficulty Adjustment in Freemium Games: https://adriancrook.com/dynamic-difficulty-adjustment-in-freemium-games/
- Design Bootcamp (Medium) — DDA & behavioral control ("mastery not manipulation"): https://medium.com/design-bootcamp/product-design-and-psychology-the-use-of-dynamic-difficulty-adjustment-in-video-game-design-7a1e2d919b96
- GameAnalytics — Match-3 Metrics Guide (D7 >20%, conversion, sessions): https://www.gameanalytics.com/blog/match-3-games-metrics-guide

### Progression, rewards, ethics
- Udonis — Royal Match analysis (generosity-first economy, ~5× Candy Crush, stars→castle meta): https://www.blog.udonis.co/mobile-marketing/mobile-games/royal-match-analysis
- emhance / Sensemitter — How Royal Match redefined success without breaking trust: https://www.emhance.ai/blog/how-royal-match-redefined-success-without-breaking-trust
- Abhay Ramakrishnan (Medium) — The Design of Streak Systems in Match-3 (Sweet Streak, safeguards): https://medium.com/@abhayram/the-design-of-streak-systems-in-match-3-games-e9c6787a1a9e
- UX Magazine — The Psychology of Hot Streak Game Design (Duolingo streak freezes, +4%/+40%): https://uxmag.com/articles/the-psychology-of-hot-streak-game-design-how-to-keep-players-coming-back-every-day-without-shame
- Design Bootcamp (Medium) — Streaks & Daily Rewards as Habit-Forming Systems: https://medium.com/design-bootcamp/streaks-and-daily-rewards-as-habit-forming-systems-dab7f5a34539
- arXiv 2412.05039 — Level Up or Game Over: Dark Patterns in Mobile Games (4-family taxonomy, 1,496 games): https://arxiv.org/html/2412.05039v1
- DarkPattern.games — Wait-To-Play / dark pattern taxonomy: https://www.darkpattern.games/pattern/30/wait-to-play.html
- Yu-kai Chou — Operant Conditioning in Games (variable-ratio, Skinner critique): https://yukaichou.com/gamification-study/gamification-and-operant-conditioning/
- Homescapes Wiki — Level & star system: https://homescapes.fandom.com/wiki/Levels

### Board / grid design
- King Community — 9×9 grid and multiple boards: https://community.king.com/en/candy-crush-saga/discussion/356422/multiple-boards-on-some-levels
- Fran Ruiz (Medium) — Candy Crush level design study (zones, hooks, ≤4 elements): https://fran-ruiz.medium.com/match-3-level-design-study-building-three-candy-crush-levels-60f88465af7b
- Game World Observer / Playrix — creating levels & elements (≤3–4 elements, compatibility doc, A/B): https://gameworldobserver.com/2019/09/27/playrix-levels-elements-match-3
- RocketBrush — board size vs. cascades trade-off: https://rocketbrush.com/blog/how-to-make-a-match-3-game-guide-to-creating-addictive-gameplay
- Logic Simplified — dead-board detection & reshuffle logic: https://logicsimplified.com/newgames/key-algorithmic-tricks-for-match-3-game-development/
- Azumo — match-3 fill/collapse logic: https://azumo.com/insights/the-logic-behind-match-3-games
- GameDev.net — keep-board-live construction: https://www.gamedev.net/forums/topic/709760-needs-some-help-about-match3-game-techniquespossible-moves-and-avoid-lock/5438441/
- GameDev.net — colors vs. difficulty (3–4 low, 6+ high): https://www.gamedev.net/forums/topic/677073-match-3-puzzle-game-algorithms/
- arXiv — Counting Candy Crush Configurations (9×9 6-color validity ~0.040%): https://arxiv.org/pdf/1908.09996
- Game Developer — 45 Match-3 Mechanics (walls, taps, generators, direction change): https://www.gamedeveloper.com/design/45-match-3-mechanics
- Candy Crush Wiki — Candy Cannon / dispenser: https://candycrush.fandom.com/wiki/Candy_Cannon
- Candy Crush Wiki — Ingredient (funnels to exits): https://candycrush.fandom.com/wiki/Ingredient
- Candy Crush Wiki — Spawners: https://candycrush.fandom.com/wiki/Category:Spawners
- Candy Crush Wiki — colors/blockers overview: https://candycrush.fandom.com/wiki/Candy_Crush_Saga
- designthegame — onboarding / one-mechanic-at-a-time: https://www.designthegame.com/learning/tutorial/critical-design-elements-engaging-match-2-match-3-mobile-games

### Teardowns
- GDC Vault — Candy Crush Saga Postmortem: Luck in the Right Places: https://www.gdcvault.com/play/1018053/Candy-Crush-Saga-Postmortem-Luck
- Game Developer — The recipe for Candy Crush Saga: luck, skill and puzzles: https://www.gamedeveloper.com/business/the-recipe-for-candy-crush-saga-luck-skill-and-puzzles
- Game Developer — Candy Crush Saga: A Sweet Journey into Monetization: https://www.gamedeveloper.com/design/candy-crush-saga-a-sweet-journey-into-monetization
- Wikipedia — Candy Crush Saga (>$20B lifetime revenue): https://en.wikipedia.org/wiki/Candy_Crush_Saga
- Naavik — Royal Match deep dive: https://naavik.co/deep-dives/royal-match/
- Naavik — Why Dream Games' success is hard to replicate: https://naavik.co/digest/why-dream-games-success-is-a-challenge-to-replicate/
- Deconstructor of Fun — Royal Match: The New King from Turkey: https://www.deconstructoroffun.com/blog/2021/3/21/royal-match-the-new-king-from-turkey
- GameRefinery — Match-3 meta layers & matching types (swap vs. collapse share): https://www.gamerefinery.com/match3-meta-layers-matching-types/
- Grokipedia — Peak Games (Toon/Toy Blast reach): https://grokipedia.com/page/Peak_Games
- Game Developer — UK regulator bans misleading Homescapes/Gardenscapes ads: https://www.gamedeveloper.com/business/uk-regulator-bans-misleading-i-homescapes-i-i-gardenscapes-i-pin-puzzle-ads
- PocketGamer.biz — Why Playrix's misleading ads got banned: https://www.pocketgamer.biz/master-the-meta-why-playrixs-misleading-ads-finally-got-banned/
- Udonis — Homescapes analysis (meta loop + ad strategy): https://www.blog.udonis.co/mobile-marketing/mobile-games/homescapes-analysis
- Balancy — Royal Match live-ops case (~36 events/month): https://balancy.co/blog/2023/03/13/how-to-set-up-liveops-in-match-3-games-case-royal-match/
- Gamigion — The Dream Live-Ops Playbook: https://www.gamigion.com/the-dream-live-ops-playbook/
- Heroic Labs — King's Cup event leaderboard (cohorts of 50): https://heroiclabs.com/docs/hiro/guides/gameplay-mechanics/event-leaderboard/
- Playliner — Competition events in Royal Match: https://playliner.com/tpost/s7tspng391-competition-events-played-a-significant
