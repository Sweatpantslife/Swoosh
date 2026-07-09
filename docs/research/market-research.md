# Swoosh — Market Research Report

**Match-3 Puzzle Game with a Casino/Premium Jewel-Tone Aesthetic**

*Prepared: July 2026*

> Swoosh is a new mobile-first, web-friendly match-3 puzzle game: structured levels with specific goals, 1–3 stars per level, satisfying "juice" and animations, and persistent game state — positioned as *"slot machine excitement meets puzzle elegance."* This report synthesizes competitive, mechanical, monetization, and audience research into concrete recommendations for v1.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Competitive Landscape](#2-competitive-landscape)
3. [Casino/Premium Aesthetic & Game-Feel Precedent](#3-casinopremium-aesthetic--game-feel-precedent)
4. [Core Mechanics Comparison](#4-core-mechanics-comparison)
5. [Level Design & Goal Types](#5-level-design--goal-types)
6. [Monetization & Retention Models](#6-monetization--retention-models)
7. [Target Audience & Session Patterns](#7-target-audience--session-patterns)
8. [Market Gaps & Differentiation](#8-market-gaps--differentiation)
9. [Concrete Recommendations for Swoosh v1](#9-concrete-recommendations-for-swoosh-v1)
10. [Sources](#10-sources)

---

## 1. Executive Summary

The match-3 market is enormous, mature, and still growing — **~$12.8B in 2025, projected to $28.6B by 2034** ([MarketIntelo](https://marketintelo.com/report/match-3-games-market)) — and it is winnable at the margins by a small team that picks the right wedge. The twelve most important findings:

1. **Royal Match has dethroned Candy Crush.** Dream Games' Royal Match first out-grossed Candy Crush Saga in July 2023 ($112M vs $104M) and ended 2024 as the #3 grossing mobile game of *any* genre at **$1.46B** vs Candy Crush's ~$1.1B IAP ([Sensor Tower](https://sensortower.com/blog/royal-match-surpasses-candy-crush-saga-in-revenue-and-downloads-for-the); [mobilegamer.biz](https://mobilegamer.biz/the-top-grossing-mobile-games-of-2024/)). It won on **polish, tuning, and live-ops — not a new mechanic**. The lesson for any new entrant: out-*execute*, don't out-*invent*.
2. **Swap-match is the dominant and right core for a spectacle-driven game.** Swapping holds **~59% of the top-grossing tile-matching market** (collapse 22%, bubble 15%, linking 3% — [GameRefinery](https://www.gamerefinery.com/match3-meta-layers-matching-types/)), and it uniquely supports the deep special-piece/combo matrix and cascades that produce the "casino jackpot" feeling.
3. **The special-piece combo matrix *is* the product.** Striped/wrapped/color-bomb pieces and their pairwise combinations (up to full board-clear) form an escalating variable-reward ladder — structurally the same psychology as a slot machine's payout tiers.
4. **Royal Match's two copyable feel tricks:** only **4 colors on the board** (more accidental cascades and combos) and the **fastest, shortest power-up animations in the genre** (spectacle never becomes friction) ([Sezer](https://medium.com/@ekinmelissezer/game-analysis-for-royal-match-and-toon-blast-9c4bff8ef48b); [Unity LevelUp](https://medium.com/ironsource-levelup/design-deep-dive-02-royal-match-948f7af96f04)).
5. **The audience is older and female, and plays for relaxation.** ~55–60% of match-3 players are women (up to ~81% in puzzle specifically); the core spenders are **women 35+**, playing ~38 min/day in short bursts; **~84% cite relaxation** as their primary motivation ([Naavik](https://naavik.co/digest/what-leading-match-3-and-merge-games-do-differently/); [Sci-Tech Today](https://www.sci-tech-today.com/stats/candy-crush-saga-statistics/)).
6. **Revenue is whale-concentrated; the casual majority monetizes via ads.** In Candy Crush, **~4% of players generate ~95% of IAP revenue** — but even IAP giants run ad businesses (Candy Crush ~$200M/yr in ads). For a web-first indie, ads (rewarded-video-first) are the realistic v1 business.
7. **Web portals are a real, no-UA-budget distribution channel.** Poki reaches **30M–60M+ MAU with ~1B monthly plays**; CrazyGames ~30–35M MAU and ~300M plays/month. Developer ad rev-share runs **~50–80%** depending on portal and deal. Match Masters' browser port via GameDistribution proves polished match-3 crosses over to web.
8. **Instant play converts dramatically better at the top of funnel** — D1 retention of **~50–65% vs ~30% app-store average** — but web loses on re-engagement (no OS push notifications) and must be **interactive within 3–5 seconds** of load ([nothing2install](https://www.nothing2install.com/2024/12/16/boost-your-mobile-game-ua-how-instant-play-reduces-cpi-and-increases-ltv/); [Naavik](https://naavik.co/digest/web-gaming-strikes-back/)).
9. **Lives systems suppress the session frequency a web game needs.** Match-3 titles with *no* lives/energy gate see **~10.2 sessions/day** vs far fewer for lives-gated games ([Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2025/2/3/hybridcasual-puzzles-expanding-the-puzzle-market)). Web v1 should use a *soft* lives system with rewarded-ad refills, not Candy Crush's hated 30-minute wall.
10. **The jewel-tone/casino-premium aesthetic is under-occupied and historically validated.** Market leaders cluster in candy/cartoon/cozy-renovation palettes; the genre's *original* aesthetic (Bejeweled's faceted gems, later licensed into real slot machines) is exactly Swoosh's lane. Frame it as **"premium sparkle/reward," not literal gambling**, to avoid portal policy friction and audience alienation.
11. **"Juice" is a solved, documented craft** — the GDC "Juice It or Lose It" playbook (particles, screen shake, easing/anticipation, escalating audio, big-win celebration) is achievable through polish and creativity rather than budget, making game-feel the clearest indie-winnable axis ([GDC Vault](https://www.gdcvault.com/play/1016487/Juice-It-or-Lose)).
12. **Retention benchmarks are sobering and define success criteria:** casual D1 ≈ 26%, D7 ≈ 10%, D30 < 4% (puzzle-specific reads as low as D7 4.5%/D30 1.2%). **D7 < 10% signals a broken core loop that no marketing can fix.**

**Recommendation in one paragraph:** Build Swoosh as a **web-first HTML5 swap-match game with a 4–5 color board and the full special-piece combo matrix**, wrapped in a **jewel-tone, premium-sparkle casino aesthetic** with slot-grade celebration juice. Distribute via **Poki/CrazyGames portal rev-share**, monetize **rewarded-video-first**, persist state in **localStorage/IndexedDB** (cloud save later), pace sessions with a **soft lives system**, and ship a tight v1 scope (~40–60 levels, 4–5 goal types, stars, saga map, daily streak). Defer IAP, battle pass, leaderboards, and deep meta until retention is proven. Full detail in [Section 9](#9-concrete-recommendations-for-swoosh-v1).

---

## 2. Competitive Landscape

### 2.1 Mobile market context: Royal Match dethrones Candy Crush

For roughly a decade Candy Crush Saga was the undisputed revenue king of puzzle. That ended in **July 2023**, when Dream Games' **Royal Match** exceeded Candy Crush in both downloads (14.6M vs 14.4M) and gross revenue ($112M vs $104M) in a single month for the first time ([Sensor Tower](https://sensortower.com/blog/royal-match-surpasses-candy-crush-saga-in-revenue-and-downloads-for-the); [Appfigures](https://appfigures.com/resources/insights/20230804?f=4)). By full-year 2024 Royal Match had pulled clearly ahead, and by 2025 it had crossed **$6B cumulative revenue**:

| Rank (puzzle, 2024–25) | Game | 2024 revenue | 2023 revenue | Trajectory |
|---|---|---|---|---|
| 1 | **Royal Match** | **$1.46B** (3rd of ALL mobile games) | $932M | ▲ +$530M |
| 2 | **Candy Crush Saga** | ~$1.09–1.1B IAP | ~$1.0B | ▲ slight, but dropped ranks |
| 3 (merge) | Gossip Harbor | $650M (2025) | — | ▲ fast |
| 4 | Gardenscapes | $504M | ~$634M | ▼ −$130M |
| — | Toon Blast | $287–333M (record) | ~$200–246M | ▲ resurgence |
| — | Homescapes | ~$219M | ~$329M | ▼ −$110M |

Sources: [mobilegamer.biz — top grossing 2024](https://mobilegamer.biz/the-top-grossing-mobile-games-of-2024/); [Naavik — What leading match-3 & merge games do differently](https://naavik.co/digest/what-leading-match-3-and-merge-games-do-differently/).

In 2025 the picture held: **Royal Match was the #1 highest-grossing puzzle game worldwide at ~$1.4B IAP (ARPDAU $0.17), with Candy Crush Saga #2 at ~$1.1B IAP (ARPDAU $0.11)** ([Naavik](https://naavik.co/digest/what-leading-match-3-and-merge-games-do-differently/)). In a representative single month (August 2025), Royal Match grossed >$114M IAP vs Candy Crush's ~$90M ([Statista](https://www.statista.com/statistics/1405596/top-grossing-match-3-gaming-titles/)).

*Why Royal Match won* (analyzed further in [Section 8](#8-market-gaps--differentiation)): not a new mechanic — a **better-tuned difficulty curve, cleaner renovation meta, premium polish, and monetization efficiency** ($0.17 vs $0.11 IAP ARPDAU) on a smaller (~55M MAU) but higher-spending base, plus aggressive paid UA (~61.5% of installs paid vs Candy Crush's ~15–25%).

### 2.2 Per-title deep dive

**Royal Match** — *Dream Games (Istanbul, founded 2019); released Feb 2021.*
- **Mechanic:** classic swap-match with tap-to-activate power-ups (rocket, bomb, propeller, light ball) that feel more potent and satisfying than King's or Playrix's.
- **Hook/meta:** "King Robert restores his castle" renovation story, plus an unusually deep slate of **minigame live-ops events** with bespoke visuals.
- **Visual style:** high production value, vibrant "royal" premium look; often described as "the speed, fluidity and palette of Toon Blast with the level diversity and power-ups of Homescapes."
- **Metrics:** ~55M MAU; $102M in first six months; $1.46B (2024) / ~$1.4B IAP (2025); ships ~200 new levels/month. Pixar co-founder Edwin Catmull joined as advisor; sequel **Royal Kingdom** launched Nov 2024. ([Wikipedia](https://en.wikipedia.org/wiki/Royal_Match); [Naavik deep dive](https://naavik.co/deep-dives/royal-match/))

**Candy Crush Saga** — *King (Microsoft/Activision Blizzard); 2012.*
- **Mechanic:** the genre-defining swap-match; striped/wrapped/color-bomb special candies and cascades.
- **Hook/meta:** the **"saga map"** — an endless linear level path (16,370+ levels, 45–60 added weekly) with no story; social PvP/co-op events added later.
- **Metrics/longevity:** **$20B+ lifetime** (franchise, Sept 2023 milestone); ~$1.09B IAP 2024; ~170–176M MAU and ~20M DAU; ~$200M/yr in ad revenue. Still #2 after 13+ years — the benchmark for longevity. ([Game World Observer](https://gameworldobserver.com/2023/09/27/candy-crush-saga-revenue-20-billion-king); [Business of Apps](https://www.businessofapps.com/data/candy-crush-statistics/))

**Candy Crush Soda Saga** — *King; 2014.* Swap-match variant with soda/fluid mechanics. **$2.9B lifetime — the only Candy Crush sequel past $1B.** ([Business of Apps](https://www.businessofapps.com/data/puzzle-games-market/))

**Toon Blast** — *Peak Games (Zynga); 2017.*
- **Mechanic:** **tap-blast-collapse** — tap groups of 2+ same-color cubes to clear them; combining big clears makes rockets/bombs/discos.
- **Hook/meta:** cartoon-character world with light team + tournament meta (no renovation story).
- **Metrics:** **~$2.5–2.6B lifetime**; record 2024 (~$333M, a resurgence driven by 3D YouTube animation ads); DAU ~2M. With **Toy Blast**, the two blast titles account for Peak's **$5B** in lifetime user spending. ([PocketGamer.biz](https://www.pocketgamer.biz/toon-blast-surpasses-25-billion-with-newfound-revenue-resurgence/); [AppMagic](https://appmagic.rocks/blog/peak-games-5-billion-user-spending))

**Toy Blast** — *Peak Games; 2015.* Same tap-blast-collapse mechanic, bright toy-box theme; **$1B+ lifetime**. ([Sensor Tower](https://sensortower.com/blog/peak-games-revenue-1-billion))

**Homescapes** — *Playrix; 2017.*
- **Mechanic:** swap-match with tap-to-use boosters.
- **Hook/meta:** **mansion renovation + narrative** with butler character Austin — the archetypal "story meta" match-3.
- **Metrics:** **$3.49B lifetime**, 540M+ downloads, ARPDAU ~$1.08; declining recently (~$219M 2024 vs ~$329M prior). ([Udonis](https://www.blog.udonis.co/mobile-marketing/mobile-games/homescapes-monetization))

**Gardenscapes** — *Playrix; 2016.* The title that **invented the meta-driven match-3 trend.** Swap-match + garden restoration story. **$3B+ lifetime — Playrix's biggest lifetime earner**; $504M in 2024 (down from ~$634M). ([Business of Apps](https://www.businessofapps.com/data/gardenscapes-statistics/); [Udonis — Playrix](https://www.blog.udonis.co/game-publishers/playrix))

**Fishdom** — *Playrix; web 2008 → mobile 2013.* Swap-match + **aquarium-decoration meta** with a "beauty index" that boosts coin earnings. **$2.1B lifetime**, ~$28.6M/month. Notable as a match-3 that began life as a *web* game. ([Business of Apps](https://www.businessofapps.com/data/puzzle-games-market/))

**Match Masters** — *Candivore; 2020.*
- **Mechanic:** swap-match, but **real-time head-to-head PvP** — two players alternate turns on a shared board.
- **Hook/meta:** a risk-reward **booster "betting" economy** (30+ boosters of varying rarity) and a competitive ladder.
- **Metrics:** **75M+ downloads, $211M+ lifetime IAP.** Also shipped a **web/browser version via GameDistribution** — direct proof that mobile match-3 ports to web portals. ([Naavik deconstruction](https://naavik.co/deep-dives/match-masters-deconstruction/); [GameDistribution blog](https://blog.gamedistribution.com/match-masters-web-version/))

**Empires & Puzzles** — *Small Giant Games (Zynga); 2017. (Hybrid.)*
- **Mechanic:** **match-3 RPG hybrid** — matching tiles charges hero attacks in turn-based battles; layered with gacha hero collection, base-building, alliances and PvP raids.
- **Metrics:** **~$1.6B lifetime, 95M+ downloads**, ARPD ~$12 (far higher than casual match-3). Proof that match-3 mechanics can carry a midcore, high-ARPU economy. ([Sensor Tower](https://sensortower.com/blog/empires-and-puzzles-revenue-500-million))

**Project Makeover** — *Magic Tavern; 2020.*
- **Mechanic:** swap-match core.
- **Hook/meta:** the first **"Meta-Heavy Match-3"** — fashion/makeover/decoration meta (dress-up + room makeover + drama story), monetized on ad-creative-driven UA.
- **Metrics:** once generated **~45% of ALL iOS match-3 downloads**; **~$600M lifetime**, but declined to ~$12M/month — a cautionary tale about meta-fad durability. ([Udonis](https://medium.com/udonis/project-makeover-monetization-bringing-match-3-back-to-life-c567a3e96cf4); [Naavik — Fall From Grace](https://naavik.co/deep-dives/project-makeover-fall-from-grace/))

**What the leaders do differently:**
- **Audience-first theming:** puzzle skews heavily to relaxation-seeking players and women; the top games optimize for calm, pretty, female-resonating themes.
- **Deceptively deep live-ops:** Playrix-style map events and especially Royal Match's high-volume **minigame events** break level-grind monotony.
- **Hybrid monetization:** IAP is the core, but ads matter — Candy Crush earns ~$200M/yr from ads; merge leader Gossip Harbor gets 15–20% of revenue (~$100M) from ads. ([Naavik](https://naavik.co/digest/what-leading-match-3-and-merge-games-do-differently/))

### 2.3 Web / HTML5 portal landscape

The web-game portals are a large, under-discussed distribution channel with an **instant-play, no-install** model.

**Portal scale and traffic.** Sources disagree on exact MAU figures, so ranges are presented with both citations:

| Portal | Scale (reconciled) | Notes |
|---|---|---|
| **Poki** | **30M–60M+ MAU**; **700M+ sessions/month, passing ~1B monthly plays**; studio has announced a **625M+ players reached** milestone | ~30M MAU per [Game Developer](https://www.gamedeveloper.com/business/the-huge-hidden-web-game-market-no-one-talks-about-and-how-to-get-in-); 60M+ MAU (2.6× nearest competitor) per [Naavik](https://naavik.co/digest/web-gaming-strikes-back/); ~1B monthly plays per [TFN](https://techfundingnews.com/browser-gaming-website-poki-won-big-at-the-dutch-game-awards-celebrating-hitting-1-billion-monthly-plays/) and [Poki milestone](https://finance.yahoo.com/sectors/technology/articles/poki-announces-milestone-625-million-050000965.html) |
| **CrazyGames** | **~30–35M MAU, ~300M+ gameplays/month** | ~35M per [Grokipedia](https://grokipedia.com/page/CrazyGames); ~30M per [Game Developer](https://www.gamedeveloper.com/business/the-huge-hidden-web-game-market-no-one-talks-about-and-how-to-get-in-)/Naavik. Accepts heavier mid-core/Unity-WebGL titles |
| **GameDistribution** (Azerion) | Syndication network + ad platform serving **2,000+ web publishers** | Distributes one game across many sites ([GameDistribution](https://gamedistribution.com/developers/partnership/)) |
| **Y8 / Miniclip / Kongregate / Newgrounds** | Second-tier, long-standing casual portals | Same instant-play family |

The web-game market overall is growing: ~**$1.03B (2021) → ~$3.09B projected (2028)**, driven by HTML5/WebGL/WASM maturity and social-platform embedding (Discord, Telegram, YouTube, TikTok).

**Which match-3 titles perform on portals.** Portal match-3 skews toward **short-session, level-based, and merge/mahjong-adjacent** designs:
- **Poki:** Papa Cherry Saga (classic saga-style), Sweet World, Match Arena, Fruity Party, Alchemix, Zuma Boom (shooter), plus the standout merge hit **Mergest Kingdom** ([Poki match-3](https://poki.com/en/match-3)).
- **CrazyGames:** Skydom, Candy Riddles, Goods Triple Match 3D, Tower Swap, Piece of Cake, and again Mergest Kingdom ([CrazyGames match-3](https://www.crazygames.com/t/match-3)).
- **Adjacent formats that thrive:** bubble shooters, mahjong-connect, and **merge** — arguably the strongest-performing "matching" format on portals right now.
- **Cross-over proof:** **Match Masters shipped a browser version via GameDistribution** ([GameDistribution blog](https://blog.gamedistribution.com/match-masters-web-version/)).

**Portal-specific norms & constraints:**
- **Instant load / no install:** games must boot fast in-browser (HTML5/WebGL, small footprint). Flash's 2020 EOL pushed everything to HTML5/WebGL; lightweight, quick-to-first-play builds win.
- **Ad SDK is mandatory and exclusive:** monetization is **ad revenue share** — only ads served through the portal's own SDK are permitted (CrazyGames SDK, GameDistribution SDK, Poki SDK). SDKs also handle rewarded/interstitial placement, user auth, and cloud save ([CrazyGames docs](https://docs.crazygames.com/); [CrazyGames developer portal](https://developer.crazygames.com/)).
- **Revenue share (reconciled):** figures vary by source and are negotiated per deal. **Poki's split is commonly described as ~50/50** ([Poki dev docs](https://developers.poki.com/guide/monetization)), while other reporting describes ~70/30-class splits in the developer's favor at top platforms ([Game Developer](https://www.gamedeveloper.com/business/the-huge-hidden-web-game-market-no-one-talks-about-and-how-to-get-in-)); across the portal ecosystem developer share runs **~50–80%** (e.g., Arkadium 75%, Gameflare 50% — [IndieGameBusiness](https://indiegamebusiness.com/web-gaming-for-indie-developers/)). **CrazyGames offers a +50% rev-share boost** for integrating its SDK, running ads, allowing cross-portal distribution, and a 2-month launch exclusivity ([CrazyGames dev portal](https://developer.crazygames.com/)). Portals also sign **licensing deals** (upfront or ongoing) for games they want to feature — a real path to a guaranteed revenue floor.
- **Economics:** web games are cheap and fast to produce — the channel is characterized by **~1–3 month builds under ~$10k**, versus mobile's heavy UA + 30% store tax. A **first web game typically earns ~$500–$3,000/month**; the ceiling comes from building a catalog — studios that made ~$50K/yr five years ago now reach up to ~$1M/yr across a portfolio (Dutch Games Association 2024, via [IndieGameBusiness](https://indiegamebusiness.com/web-gaming-for-indie-developers/); [Game Developer](https://www.gamedeveloper.com/business/the-huge-hidden-web-game-market-no-one-talks-about-and-how-to-get-in-)).
- **Visual/UX norms:** bright, high-readability, responsive for mobile-web, designed for a few minutes per session. Deep story/renovation metas are rare on portals; core-loop quality and quick dopamine dominate.

**Implication for Swoosh:** the portal channel rewards a fast-loading, session-friendly build with a punchy core loop and SDK-native ad monetization. A casino/slot "juice" aesthetic is a genuine differentiation lever because most portal match-3 art is generic — but high-ARPU story metas belong on mobile, not portals.

---

## 3. Casino/Premium Aesthetic & Game-Feel Precedent

### 3.1 The jewel/casino visual lineage

- **Bejeweled** (PopCap, 2001) **invented the modern gem match-3**: an 8×8 grid of **faceted, glossy jewel-tone gems** with a rich, "expensive" specular sheen, deep-voiced audio rewards ("Excellent!", "Ka-ching!"), and cascade payoffs. It is the direct visual ancestor of the casino/slot-machine look ([GamesRadar — legacy of match-three](https://www.gamesradar.com/the-legacy-of-match-three-games-from-bejeweled-to-candy-crush/)).
- **Bejeweled Blitz** distilled this into a **60-second timed, slot-machine-style dopamine loop** — escalating multipliers, "Blazing Speed," big-score celebrations, viral leaderboard sharing — the closest mainstream precedent to "slot machine excitement meets puzzle." Bejeweled's gem language was even **licensed into real casino slot machines**, underscoring how directly the aesthetic maps to slot visual grammar.
- **Candy Crush's "juice"** is the mass-market benchmark: glossy candies, satisfying drop-physics cascades, striped/wrapped/color-bomb explosions, screen shake, particle bursts, and layered voiceover payoffs ("Delicious!", "Divine!", "Sugar Crush!"). Each clear feels like a small payout.
- **Royal Match** shows the current **premium ceiling**: "next-level" artwork, cinematic soundtrack, and animated, tap-to-activate power-ups that "make players feel smart." Its premium perception comes from **consistent art direction + high-fidelity animation + satisfying feedback**, not novel mechanics ([Naavik — Royal Match](https://naavik.co/deep-dives/royal-match/)). As one analysis put it: "Players return for the feeling, not just the puzzle" ([Sensemitter](https://sensemitter.com/blog/how-royal-match-redefined-success-without-breaking-trust/)).

### 3.2 The "juice" / game-feel canon

- **"Juice It or Lose It"** — Martin Jonasson & Petri Purho, **GDC Europe 2012** — is the seminal talk. They take a plain block-breaker and iteratively layer **particles, screen shake, tweening/easing, anticipation/overshoot (squash-and-stretch), sound, and combos**, showing how each layer transforms a flat game into one that "feels alive and responds to everything you do — tons of cascading action and response for minimal user input" ([GDC Vault](https://www.gdcvault.com/play/1016487/Juice-It-or-Lose); [YouTube](https://www.youtube.com/watch?v=Fy0aCDmgnxg)).
- This pairs with Steve Swink's **"Game Feel"** concept ([Wikipedia](https://en.wikipedia.org/wiki/Game_feel)): satisfaction comes from tight input→response coupling with rich multi-sensory feedback.
- For indies specifically: polished VFX/sound/responsiveness are the genre baseline, but "once fundamentals are in place, differentiation is the real challenge" — and juice is achievable **through polish and creativity rather than budget** ([Blood Moon Interactive](https://www.bloodmooninteractive.com/articles/juice.html); [Wardrome](https://wardrome.com/game-feel-the-secret-sauce-behind-addictive-indie-gameplay/)).

### 3.3 What makes these feel premium & satisfying — design checklist for Swoosh

- **Saturated jewel-tone palette + gloss/specular highlights** (the Bejeweled "expensive gem" look) reads as premium/casino instantly.
- **Escalating, layered feedback per action:** particle bursts, easing/anticipation on tile movement, squash-and-stretch, screen shake on big clears.
- **Slot-machine reward psychology:** cascades act like "free spins," combos escalate the celebration, and level/board clears trigger big-win moments — anticipation → payoff → celebration.
- **Layered audio:** rising pitch on chains, chunky match SFX, and voiceover/"win" stingers (the Candy Crush / Bejeweled voice reward).
- **Consistent art direction and high animation fidelity** separate "premium" from "generic" — Royal Match's edge is polish, not mechanics.
- **Restraint matters:** the "Juice It or Lose It" authors caution against over-juicing to the point of illegibility — the board must stay readable under all effects.
- **Framing caution:** literal casino/slot-machine framing risks (a) content-policy friction on some portals and (b) alienating part of the relaxation-seeking core who dislike gambling cues. Lean **"premium jewel / sparkle / reward"**, not literal gambling (see risk analysis in [Section 8.4](#84-honest-risk-assessment)).

---

## 4. Core Mechanics Comparison

### 4.1 The four dominant interaction models

Tile-puzzle games split into four matching archetypes, and market share between them is lopsided. GameRefinery's tracking of top-grossing titles puts the split at roughly **swapping 59%, collapse/blast 22%, bubble-shooter 15%, and line-linking 3%**, with collapse the only model still gaining share ([GameRefinery](https://www.gamerefinery.com/match3-meta-layers-matching-types/)).

**A. Swap-adjacent match (Candy Crush, Bejeweled, Royal Match, all Playrix titles) — the incumbent.**
Swap two neighboring tiles to line up 3+ of a color; the board refills from the top and can cascade. The most intuitive and most *strategic* model — the player reads a static board and plans a move that sets up a special piece or a cascade. **Feel:** deliberate, "puzzle-y," rewards planning. **Difficulty curve:** gentle at first (any legal swap is valid); hard levels come from blockers and move limits, not the input. **Skill vs luck:** meaningful skill ceiling (setting up combos), but board seeds and cascade randomness inject luck — measured win rates for the *same* level range from ~0.75 on an easy seed to ~0.15 on a hard one ([Würzburg "Royal Crush" study](https://downloads.hci.informatik.uni-wuerzburg.de/2024-CoG-RoyalCrush.pdf)). **Why it dominates:** 59% share, the deepest special-piece system, the largest evergreen installed base.

**B. Tap-to-blast / collapse (Toon Blast, Toy Blast, Pet Rescue Saga) — the challenger.**
Tap any group of 2+ adjacent same-color blocks; they pop and columns collapse to fill gaps (Toon/Toy Blast are technically *match-2* collapse games). **Feel:** direct and immediate — you tap exactly what you want gone, with far lower mental load, ideal for short relaxing sessions. Collapse has *more than doubled* its share of top performers since 2018 and out-grosses swap on newer launches ([GameRefinery](https://www.gamerefinery.com/match3-meta-layers-matching-types/)) — though the tap-blast subgenre has also been on a multi-year declining trend at the very top of the charts. **Difficulty curve:** Toon Blast deliberately withholds hard levels until 100+ levels in ([Om Tandon, Unity LevelUp](https://medium.com/ironsource-levelup/how-to-crack-the-match-3-code-part-ii-c3722afd6c67)). **Risk:** "board stalemate" — a run of bad taps can leave an area with no adjacent matches. **Skill vs luck:** lower skill floor *and* ceiling; the tension is efficiency (creating rockets/bombs from big groups) rather than planning.

**C. Bubble-shooter (Panda Pop, Puzzle Bobble) — the aim niche.**
Aim and launch a colored bubble into a hanging cluster; 3+ same-color detach and drop. The only model with *motor/aim* skill: trajectory calculation, bank shots, reading the guideline ([Academy SMART](https://academysmart.com/insights/how-to-develop-a-bubble-shooter-game/); [MPL](https://www.mplgames.com/blog/how-to-play-bubble-shooter-game/)). Tension comes from a descending ceiling. "Easy to learn, hard to master"; 15% share, a distinct audience, steady but not the growth engine.

**D. Merge / hybrid (Gossip Harbor, Merge Mansion, Travel Town) — the monetization outlier.**
Drag-combine two identical items into a higher-tier item that fills orders. Included because it now *out-earns* match-3 at the very top: **Gossip Harbor hit $77.7M in Feb 2026, edging past Candy Crush's $71.7M**, with Q1 revenue up 172% YoY while Candy Crush fell 7% ([Deconstructor of Fun](https://www.deconstructoroffun.com/blog/does-merge-2-monetize-better-than-match-3)). The structural reason matters for design: **match-3 levels are built to *end* (feel finishable), which caps selling opportunities per session; merge boards never finish, so the selling window never closes.**

### 4.2 Which model best fits a "juicy, casino-feel" game

For Swoosh's casino/premium, spectacle-driven positioning, the **swap-adjacent match-3 model is the right core**:

- **It has the richest special-piece/combo system** — the actual engine of spectacle and dopamine. Tap-blast games have rockets/bombs but a much smaller combination matrix.
- **Cascades are the "casino" moment.** After a swap, auto-matches can chain unpredictably — "a simple move at the bottom creates a spectacular chain reaction that clears half the board" — and that unpredictability is exactly the variable-reward, slot-machine feeling ([Bootcamp/Medium](https://medium.com/design-bootcamp/design-analysis-of-match-3-games-fb63879ecd8f); [PlayableMaker](https://playablemaker.com/what-makes-match3-games-tick/)).
- **Royal Match's two concrete feel techniques are directly copyable:** a **4-color board** (vs Candy Crush's 5–6), which dramatically raises the rate of accidental cascades and combos, and the **fastest, shortest, most fluid swap/power-up animations** in the genre, so spectacle never becomes friction ([Sezer](https://medium.com/@ekinmelissezer/game-analysis-for-royal-match-and-toon-blast-9c4bff8ef48b); [Unity LevelUp](https://medium.com/ironsource-levelup/design-deep-dive-02-royal-match-948f7af96f04)).

If mobile-web session length and instant readability ever become a concern, a **collapse core is the fallback** (lowest cognitive load, best for quick web sessions) — but it sacrifices the deep combo matrix that produces the casino spectacle.

### 4.3 Special pieces & the combo matrix as a design system

Special pieces are created by matching *more than three*; each formation maps to a spectacle payoff (Candy Crush canonical set — [King support](https://candycrush.zendesk.com/hc/en-us/articles/211939685-How-can-I-create-Special-Candies)):

| Special piece | How it's made | Effect |
|---|---|---|
| **Striped** | Match 4 in a line | Clears an entire row *or* column (direction = match orientation) |
| **Wrapped** | Match 5 in an L or T | Explodes a 3×3, then explodes again after tiles fall (two blasts) |
| **Color bomb** | Match 5 in a straight line | Removes every tile of one chosen color from the board |
| **(Fish / rocket / propeller variants)** | Genre-specific extras | Homing clears toward objectives |

The **combination matrix** is where satisfaction compounds — swapping two specials together yields a much bigger effect than either alone ([King support](https://candycrush.zendesk.com/hc/en-us/articles/360000754697-Learn-all-about-Special-Candies); [BlueStacks](https://www.bluestacks.com/blog/game-guides/candy-crush/ccs-booster-guide-en.html); [Without the Sarcasm](https://www.withoutthesarcasm.com/posts/candy-crush-saga-special-candy-combos/)):

| Combo | Result |
|---|---|
| Striped + Striped | Clears a full row **and** column (a "plus" from the swap point) |
| Striped + Wrapped | Giant plus: clears **3 rows + 3 columns** |
| Striped + Color bomb | Turns **every tile of that color into a striped candy**, all firing at once |
| Wrapped + Wrapped | Larger double-blast, ~5×5 (16 surrounding tiles) |
| Wrapped + Color bomb | Effect of **two color bombs** (second color is random) |
| **Color bomb + Color bomb** | **Clears the entire board** — the "jackpot" moment |

**Why combos feel rewarding — the design levers:**
1. **Escalating spectacle tiers.** The player learns a legible ladder — single special (small), special+special (medium), color-bomb+color-bomb (board-clear). The rarest combo is the biggest payoff: the variable-ratio jackpot structure of a slot machine.
2. **Chain reactions & cascades.** A special detonation drops new tiles that auto-match into more specials, producing surprise secondary explosions the player didn't fully plan — "you never know when a simple match triggers a spectacular chain," which keeps the brain "alert and excited" and releases dopamine on each pop ([PlayableMaker](https://playablemaker.com/what-makes-match3-games-tick/); [Pogo](https://www.pogo.com/what-are-match-3-games)).
3. **Audiovisual "juice."** Screen shake, particle bursts, escalating pitch, score pop-ups on every match — this layer "is not cosmetic, it is the habit loop" ([Sensemitter](https://sensemitter.com/blog/how-royal-match-redefined-success-without-breaking-trust/)).
4. **Player agency + luck.** The player *creates* the special (skill) but the cascade's extent is partly random (luck) — the exact blend that makes a payoff feel earned yet thrilling.

---

## 5. Level Design & Goal Types

### 5.1 Goal / objective types

Top match-3 games rotate a small canonical set of objectives to keep one core loop feeling varied ([Candy Crush Wiki – Level](https://candycrush.fandom.com/wiki/Level); [Fran Ruiz level-design study](https://fran-ruiz.medium.com/match-3-level-design-study-building-three-candy-crush-levels-60f88465af7b)):

- **Score / target-score** — hit N points within a move (or time) limit. The default "reach the threshold" level.
- **Clear jelly / blockers** — remove jelly (or crates, ice, spreading chocolate) by matching on top of it. Blockers are the primary difficulty dial.
- **Collect / order** — gather a set quantity of specific tiles or ingredients.
- **Bring-down / ingredients** — escort objects (cherries, nuts, chests) down through the board to exits at the bottom.
- **Timed** — objective under a countdown rather than a move budget.

Objectives are gated by a **move limit** (most common in swap games) or a time limit; running out = level fail. A "true fail" that hard-blocks progress is used *sparingly* in casual — designers assume it "will put people off" — so many levels instead offer a paid **"+5 moves" continue** at the fail screen, a key monetization surface ([arXiv difficulty modelling](https://arxiv.org/pdf/2107.03305)).

### 5.2 Stars, saga map, and progression

- **1–3 stars per level, tied to score thresholds.** One star = pass; two/three stars require progressively higher scores, pushing players to *replay and master* earlier levels ([USPTO match-3 patent](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11883740)). Stars aggregate into meta-progress (unlocking events, chests, map areas).
- **Saga map** — a linear, winding node path where each node is one level; completed nodes light up, the next unlocks on completion. It gives a visible sense of journey and is where "gates" live. Candy Crush's map now spans 16,370+ levels with 45–60 added weekly — content cadence is a real operational commitment at scale.

### 5.3 Difficulty pacing

- **Attempts-to-complete, not pass-rate, is the modern control variable.** Playrix and others tune by the *average/median number of attempts* a level should take, then playtest actual player curves against the intended curve ([Playrix via Game World Observer](https://gameworldobserver.com/2019/09/27/playrix-levels-elements-match-3); [arXiv](https://arxiv.org/pdf/2107.03305)).
- **Sawtooth curve:** an easy onboarding stretch (Toon Blast withholds hard levels until 100+), then alternating easy/hard so a frustrating level is followed by an easy "reward" level.
- **Dynamic Difficulty Adjustment (DDA):** heuristics detect boredom/frustration and quietly nudge board seeds easier or harder to keep players in flow ([GameAnalytics](https://www.gameanalytics.com/blog/crack-the-match-3-code-part-2)). The same level's win rate can be seeded from ~0.15 to ~0.75.
- **Hard/Super-hard levels** are intentional friction spikes where booster purchases and life loss concentrate.

### 5.4 Lives system and persistence

- **Classic model: 5 lives max; lose one per failed level; each life regenerates in ~30 minutes** (≈2.5 hrs full refill). Out of lives = can't play; the refill dialog offers buy-with-currency, wait, or ask friends ([King support](https://candycrush.zendesk.com/hc/en-us/articles/360000750878-How-do-lives-work); [Candy Crush Wiki – Lives](https://candycrush.fandom.com/wiki/Lives)). This is the core session-pacing/monetization gate — and also "the most hated element" of the genre, with major implications for a web-first game (see [Section 7.2](#72-session-patterns)).
- **State to persist:** current level index, stars per level, lives count + regeneration timestamp, soft/hard currency balances, booster inventory, and event progress. On mobile this is local + cloud-synced to an account; **on web, persistence is the single biggest engineering decision** — localStorage/IndexedDB works with zero backend for v1, with portal-SDK cloud save or an account system as the later upgrade path.

---

## 6. Monetization & Retention Models

### 6.1 The revenue picture

Match-3 is IAP-led with a meaningful hybrid ad layer. Roughly **61.5% of global match-3 revenue (~$7.9B in 2025) is IAP** ([Udonis](https://www.blog.udonis.co/mobile-marketing/mobile-games/royal-match-analysis)). Top lines for 2025: Royal Match ~$1.4B IAP, Candy Crush ~$1.1B IAP, Gossip Harbor ~$650M ([Naavik](https://naavik.co/digest/what-leading-match-3-and-merge-games-do-differently/)). Even IAP-first titles run large ad businesses: Candy Crush ~$200M/yr from opt-in ads; Gossip Harbor draws 15–20% of revenue (~$100M) from ads. The **IAP:ad split for top match-3 is ≈ 80/20 to 85/15** in favor of IAP.

### 6.2 The monetization stack

- **Lives / energy** — the pacing gate that manufactures the friction moment where players spend ([Section 5.4](#54-lives-system-and-persistence)).
- **Boosters, pre-level and in-level.** Pre-level (chosen at level start, e.g., start with a color bomb) and in-level (hammer/shuffle mid-board). Design pattern: **give boosters free early so players feel their value, then withdraw the generosity** so they buy at fail states — boosters act simultaneously as reward, live-ops incentive, and paid advantage ([Udonis/Project Makeover](https://medium.com/udonis/project-makeover-monetization-bringing-match-3-back-to-life-c567a3e96cf4)).
- **Rewarded video** — opt-in, player-initiated: watch an ad for a free life, extra moves at fail, a booster, or a doubled daily reward. The highest-value, least intrusive ad format; casual/puzzle carries the highest rewarded ad volume of any genre ([MAF](https://maf.ad/en/blog/rewarded-ads-stats/)).
- **Interstitials** — forced full-screen between levels/sessions. Higher volume, lower value, higher retention risk; premium/IAP-heavy games use them sparingly.
- **IAP for currency** — soft (coins) + hard ("gold bars"/gems) bundles in tiered SKUs; hard currency buys lives, boosters, continues. Starter packs and "value" bundles anchor pricing.
- **Cosmetics / decoration meta** — customization as spend sink and retention hook; meta attach rates among top titles: base-building 31%, character collection 23%, none 46% ([GameRefinery](https://www.gamerefinery.com/match3-meta-layers-matching-types/)).
- **Battle pass** — Royal Match's Royal Pass unlocks at level 37, ~30 reward steps over a month, free + premium tracks ([Royal Match help center](https://dreamgames.helpshift.com/hc/en/3-royal-match/section/23-events-and-tournaments/)).
- **Events / leaderboards / teams** — Royal Match runs competitive (King's Cup, Sky Race, Team Battle), solo-challenge (Book of Treasure, Lightning Rush), and cooperative team events. These create recurring, timeboxed "spend/play now" moments that lift ARPDAU without hurting retention ([Naavik](https://naavik.co/digest/what-leading-match-3-and-merge-games-do-differently/)).
- **Daily rewards & streaks** — escalating 7-day cycles with the biggest drop on day 7, often via a **lucky wheel / mystery box** for variable reward. They work on habit formation + loss aversion; casual pacing = 3–5 days per milestone ([MAF daily login](https://maf.ad/en/blog/daily-login-rewards-engagement-retention/); [Critical Hit](https://www.criticalhit.net/gaming/how-daily-bonuses-support-player-retention-in-modern-games)).

### 6.3 Benchmarks

**Monetization:**

| Metric | Benchmark | Source |
|---|---|---|
| Puzzle ARPDAU (blended) | **≈ $0.08** (AppsFlyer 2025) | [Juego Studio](https://www.juegostudio.com/blog/arpdau-benchmarks-by-game-genre) |
| IAP ARPDAU, top titles | Gossip Harbor **$0.31** (merge) · Royal Match **$0.17** · Candy Crush **$0.11** | [Naavik](https://naavik.co/digest/what-leading-match-3-and-merge-games-do-differently/) |
| Rewarded video eCPM (US tier-1) | ~$16.49 Android / ~$19.63 iOS (range **$15–40**) | [MAF](https://maf.ad/en/blog/rewarded-ads-stats/); [BidsCube](https://bidscube.com/blog/2025/07/28/how-much-do-mobile-games-make-per-ad/) |
| Interstitial eCPM (US tier-1) | ~$14.08 / ~$14.32 (often $5–12 blended) | [MAF](https://maf.ad/en/blog/rewarded-ads-stats/) |
| IAP : ad split (top match-3) | ≈ 80/20 to 85/15 | [Naavik](https://naavik.co/digest/what-leading-match-3-and-merge-games-do-differently/) |
| Whale concentration | ~4% of players ≈ ~95% of IAP revenue, spending $25–35/month (Candy Crush) | [Sci-Tech Today](https://www.sci-tech-today.com/stats/candy-crush-saga-statistics/) |

**Retention (casual, 2025–2026 — note the genre-wide decline):**

| Metric | Benchmark | Source |
|---|---|---|
| Casual industry averages | **D1 ≈ 26%, D7 ≈ 10%, D30 < 4%**; 75% of games see D28 < 3% | [GameAnalytics via Juego Studio](https://www.juegostudio.com/blog/how-to-increase-user-retention-and-increase-your-games-lifetime); [AppAgent](https://appagent.com/blog/mobile-game-retention-benchmarks/) |
| Quality bands | Top-quartile D7 ≥ 25%; all-genre average 15–20% (broader read than the casual-specific ≈ 10% above); **D7 < 10% = broken core loop** | [AppAgent](https://appagent.com/blog/mobile-game-retention-benchmarks/) |
| Pessimistic puzzle-specific read | D7 ≈ 4.5%, D30 ≈ 1.2% | [MAF](https://maf.ad/en/blog/rewarded-ads-stats/) |

Treat the 10%/4% figures as aspirational targets and single-digit D30 as realistic. Match-3's retention *surplus* comes from the meta layer + live-ops, not the puzzle core — hybrid meta is the 2026 breakout pattern.

### 6.4 What fits a web-first indie (no UA budget)

- **Portal (Poki/CrazyGames) rev-share: the recommended v1 model.** Portals handle traffic, moderation, and ad demand; you integrate their SDK and take an ad revenue share (see reconciled rates in [Section 2.3](#23-web--html5-portal-landscape)). Realistic first-game earnings: **$500–$3,000/month**, with licensing deals as a possible floor.
- **Self-hosted: defer.** Running your own site means buying your own traffic (no UA budget = no players) and wiring your own ad mediation and payments. Only worth it once Swoosh has a returning audience worth owning.
- **The v1 monetization thesis:** on web with no UA budget, **ad revenue (portal rev-share, rewarded-first) is your business, retention is your only growth engine, and IAP is a phase-2 upgrade.** IAP monetization only pays off at scale — at ~$0.08 ARPDAU you need volume, payments infrastructure, a backend economy, and a whale population, none of which exist at v1.
- **What's realistic in v1 vs deferred** is specified as the definitive scope list in [Section 9.4](#94-feature-scope-v1-vs-defer).

---

## 7. Target Audience & Session Patterns

### 7.1 Who plays match-3 — segments and motivations

**The headline demographic fact — verified across multiple independent sources: casual match-3 skews older and female.**

- **Gender skew.** Women are roughly **55–60% of active match-3 players globally**; in the puzzle sub-category the skew is sharper — GameRefinery/Naavik data puts it at **~81% women**, with **84% of puzzle gamers citing relaxation as their primary motivation** ([Naavik](https://naavik.co/digest/what-leading-match-3-and-merge-games-do-differently/); [MarketIntelo](https://marketintelo.com/report/match-3-games-market)).
- **Candy Crush is the archetype.** Women are ~54% of its players, and the core spending demographic — **women 35+** — is who King designed for from the start. In the U.S. it is the **#1 game among women aged 35–55**; ~48% of players are parents, ~30% play alongside family ([Sci-Tech Today](https://www.sci-tech-today.com/stats/candy-crush-saga-statistics/)).
- **Age distribution by revenue.** Adults 25–45 account for **~54% of genre revenue**; teens 13–24 ~30%; under-13s ~16%. Match-3's deepest commercial roots are **working adults playing in short leisure windows** ([MarketIntelo](https://marketintelo.com/report/match-3-games-market)).
- **Casual dominance.** Non-hardcore players are ~78% of the active base.

**Core motivations, ranked:** relaxation/stress relief (dominant, ~84%) → completion and progression ("just one more level") → collection and decoration → mild, non-threatening competition. Notably absent: twitch skill, mastery pressure, social status — those repel the core audience.

**The three commercial segments to model separately:**

| Segment | ~% of players / revenue | What they want | Design implication |
|---|---|---|---|
| **Snack / casual players** | Large majority of players, small share of direct revenue | Frictionless "kill 3 minutes" sessions, guaranteed wins, calming feedback, zero commitment. Monetize via **ads** (rewarded video). | Fast level cadence, generous early difficulty, instant restart. On web this is the *entire* addressable base at first. |
| **Progression grinders** | The retention backbone (mid-spenders + heavy ad-watchers) | A **meta to pursue** (renovation, collection, map events), daily streaks, live-ops variety. Why D14–D30 retention exists. | Games relying purely on level progression with **no meta hit a retention cliff at day 14–30** ([Galaxy4Games](https://galaxy4games.com/en/knowledgebase/blog/why-match-3-games-are-still-one-of-the-most-profitable-mobile-genres)). |
| **Whales** | **~4% of players ≈ ~95% of IAP revenue**; $25–35/month | Acceleration and recovery — extra moves, lives, boosters at moments of near-loss. | The "near-win" loop (losing by one move) is the single biggest IAP driver; requires careful difficulty tuning. |

A **fourth, underserved segment worth naming: the casual-competitive male and the younger web player.** *Chrome Valley Customs* proved a male audience can be pulled into match-3 with the right theme/meta ([Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2023/8/14/chrome-valley-customs-a-new-contender-in-the-match-3-race)), and the web-portal audience (Poki/CrazyGames) skews **younger and more mixed-gender** than the mobile match-3 core — directly relevant to Swoosh's web-first plan.

### 7.2 Session patterns

**Session length is bimodal — short bursts, high frequency — but engaged match-3 players rack up serious daily minutes:**

- Median mobile gaming session: **~5–6 minutes**; casual titles median ~4 minutes; top quartile 8–9 minutes ([Udonis](https://www.blog.udonis.co/mobile-marketing/mobile-games/session-length); [TechRT](https://techrt.com/mobile-gaming-time-statistics/)).
- **Puzzle over-indexes on daily minutes despite short sessions:** puzzle averaged **19.1 min/day among female mobile gamers** (Statista, 2024); top puzzle titles average ~40 min/day; Candy Crush's core plays **~38 min/day** accumulated across many short sittings ([Sci-Tech Today](https://www.sci-tech-today.com/stats/candy-crush-saga-statistics/)).
- **Sessions/day:** casual/hybrid players average 2–6 sessions/day. Critical finding: **match-3 titles with NO lives/energy system see ~10.2 sessions/day** vs far fewer for lives-gated games ([Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2025/2/3/hybridcasual-puzzles-expanding-the-puzzle-market)).
- **Play contexts:** interstitial time — commuting, lunch breaks, waiting in line, watching TV, in bed. The value proposition is "fill a gap without commitment."

**How lives shape cadence — and the web tension.** The classic lives system deliberately caps a session and forces a break, which (a) prevents rage-quit on hard levels, (b) creates timed re-engagement hooks, and (c) sells lives/boosters to whales ([Galaxy4Games](https://galaxy4games.com/en/knowledgebase/blog/why-match-3-games-are-still-one-of-the-most-profitable-mobile-genres)). But it **suppresses session frequency — the opposite of what a no-UA web game needs**, since removing lives roughly doubles-to-triples sessions/day. For a web-first game whose survival depends on ad impression volume and organic return visits, a **lighter energy gate monetized via rewarded video** is the right early call.

**Web-portal behavior vs installed-app behavior:**

- **Instant play crushes friction.** No install/update, zero storage, playable in seconds. Instant-play flows deliver **D1 retention of ~50–65% vs ~30% app-store average** (60–80% higher), because players experience the game *before* committing ([nothing2install](https://www.nothing2install.com/2024/12/16/boost-your-mobile-game-ua-how-instant-play-reduces-cpi-and-increases-ltv/)).
- **The hard 3–5 second rule.** If the game is not **interactive within 3–5 seconds** of load, web retention collapses. Load time is a first-class feature on web ([GameSpace](https://gamespace.com/all-articles/news/instant-play-browser-games-are-back-no-download-just-press-start/)).
- **But web loses on engagement depth and re-engagement.** Installed apps capture 80–90% of mobile minutes and see ~2× longer sessions than mobile web. Web's structural weakness is **no OS-level push notifications** — the biggest lever for lives-based re-engagement is unavailable, though **PWA "add to home screen"** partially recovers it ([Naavik](https://naavik.co/digest/web-gaming-strikes-back/)).

Net: **web wins on top-of-funnel and trial, loses on long-tail retention** — so Swoosh should optimize for instant delight + shareability, and treat PWA install (and an eventual native app) as the retention bridge for grinders and whales.

---

## 8. Market Gaps & Differentiation

### 8.1 Saturation: real, but not a wall

- **Size and growth.** Match-3 was ~$12.8B in 2025, projected $28.6B by 2034 (9.3% CAGR); 9.7B downloads in 2024 with +14% YoY IAP growth ([MarketIntelo](https://marketintelo.com/report/match-3-games-market)). Puzzle overall generated $10B+ IAP in 2025, with match-3 + merge holding ~70–75% of puzzle revenue ([Naavik](https://naavik.co/digest/what-leading-match-3-and-merge-games-do-differently/)).
- **What's saturated:** direct **Candy Crush clones** and the **renovation-meta clone field** pioneered by Playrix (Homescapes/Gardenscapes) and perfected by Royal Match. Competing in this crowded center head-on requires the one thing an indie lacks: a massive paid-UA war chest (Royal Match drove 61.5% of installs through paid ads).
- **What's growing / underserved:** genre growth is now coming from **newer subgenres — Sort, Block, and "Screw" puzzles, and lean merge — not classic match-3**; and within match-3, **simplified-meta games are overtaking deep-meta games** ("faster-paced games are growing revenue and taking audiences from slower, more complex titles") ([Naavik](https://naavik.co/digest/what-leading-match-3-and-merge-games-do-differently/)).

### 8.2 Breakout case studies — why they won a saturated market

- **Royal Match (Dream Games).** See [Section 2.1](#21-mobile-market-context-royal-match-dethrones-candy-crush) for the full revenue story. *Why it won:* not a new mechanic — better-tuned difficulty, cleaner meta, premium polish, and monetization efficiency ($0.17 vs $0.11 IAP ARPDAU) on a smaller but higher-spending base. **Pattern: out-execute, don't out-invent — polish + tuning + live-ops discipline.**
- **Match Factory! (Peak/Zynga).** PocketGamer's mobile game of the year 2024; broke in via a **novel core (3D sort-and-match)** and a differentiated App-Store-exclusive launch. **Pattern: a genuinely fresh core mechanic in an adjacent subgenre, not another board of gems.**
- **Travel Town (Moon Active).** Biggest merge game on mobile — **$117M YTD, +231% YoY** — by being **lean: core merge-2 gameplay front-and-center with the meta stripped down** ([Naavik](https://naavik.co/digest/why-travel-town-is-dominating-mobile-merge/)). **Pattern: strip complexity, make the core loop the star.**
- **Gossip Harbor (Microfun, merge).** ~$650M in 2025 with far fewer MAUs than Candy Crush, on **$0.31 IAP ARPDAU** (nearly 2× rivals) and a story/character meta. **Pattern: niche narrative + monetization depth beats raw scale.**

**The synthesized pattern:** winners paired **(a) a tightly polished, distinctive core loop** with **(b) either a fresh mechanic OR a fresh theme/meta**, and **(c) ruthless tuning + live-ops**. Two of the biggest recent wins (Match Factory, Travel Town) explicitly won on **core-loop differentiation and simplicity, not deeper meta** — precisely the wedge available to a small team.

### 8.3 The wedge for a web-first indie

**Is "casino aesthetic + extreme juice + instant web play" viable positioning? Cautiously yes — as a top-of-funnel and game-feel wedge, not a monetization-depth play.**

**Why the aesthetic wedge is real:**
- The **jewel-tone / premium / casino-sparkle look is under-occupied** in modern match-3. Market leaders cluster in candy, cartoon, and cozy-renovation palettes aimed at the 35+ female core. Ironically, the *original* match-3 aesthetic (Bejeweled's gems) was jewel-toned — Candy Crush deliberately moved away from it. A premium, gold-and-gem, slot-machine-juicy identity is therefore **both differentiated from the current field and validated by genre history**, and overlaps naturally with the **social-casino audience** (also skews older/female, also relaxation-driven).
- **Game feel is the clearest indie-winnable axis** ([Section 3.2](#32-the-juice--game-feel-canon)). Extreme, casino-grade cascade juice — chained explosions, coin showers, screen shake, escalating audio — is a legitimate signature a two-person team can nail where a UA-driven clone won't bother.

**Why web-first fits a small team with no UA budget:**
- **Distribution without paying for installs.** Poki (30M–60M+ MAU, ~1B monthly plays) and CrazyGames (~30–35M MAU) provide **organic discovery** — the thing indies can't buy on mobile ([Section 2.3](#23-web--html5-portal-landscape)).
- **Economics favor the little guy.** No 15–30% app-store tax, no forced UA; developer ad rev-share ~50–80%; realistic first-game revenue $500–$3,000/month with top web performers reaching up to ~$1M/year across catalogs ([§2.3](#23-web--html5-portal-landscape)).
- **The web market is growing** (~$1.03B 2021 → ~$3.09B 2028) on HTML5/WebGL/WASM maturity and social-platform embedding.

**Channels and audiences that fit Swoosh:**
- **Primary:** Poki + CrazyGames (curated, high-traffic, rev-share). These reward instant load, immediate juice, and strong D1 — exactly the aesthetic wedge's strengths.
- **Secondary:** **itch.io** (community/press credibility, demos, no revenue cut), **embeddable/whitelabel** placements (GameDistribution/Azerion, Famobi reach thousands of sites), and **social embeds** (Telegram/Discord mini-games; TikTok/YouTube Shorts as organic virality engines showing off the juice).
- **Audience sequencing:** start with the **web-native younger/mixed-gender snack player** (portal traffic), while keeping art and pacing legible to the **35+ casual-relaxation core** targeted when a PWA/native app ships for retention and IAP.

### 8.4 Honest risk assessment

1. **Web monetizes shallow.** Revenue is ad-driven and per-play modest; whale economics require graduating players to a PWA/native app with IAP. Plan web as **audience-building and validation**, not the endgame.
2. **No push notifications = weak re-engagement.** Web's structural retention gap is real. Mitigate with PWA install prompts, streak mechanics, and an eventual native build.
3. **Aesthetic ≠ moat.** A look can be copied in a month. The **defensible** version of the wedge is *aesthetic + genuinely superior game-feel + tuned difficulty* together — juice and tuning are harder to clone than a color palette.
4. **"Casino" connotations.** Literal slot-machine framing risks portal content-policy friction and can alienate part of the relaxation-seeking core who dislike gambling cues. Lean **"premium jewel / sparkle / reward,"** not literal gambling.
5. **Saturation is still saturation.** Clones-with-marketing succeed; Swoosh has no marketing — so it must win on **the first 3 seconds and the first 3 minutes**: instant load, immediate delight, obvious visual distinctiveness in a thumbnail. That is the entire indie web thesis.

---

## 9. Concrete Recommendations for Swoosh v1

These are decisions, not options. Each is justified from the research above.

### 9.1 Platform & distribution — **web-first HTML5, portal-distributed**

- **Build a web-first HTML5 game, mobile-responsive (portrait-friendly), interactive within 3–5 seconds of load.** Rationale: portals are the only no-UA-budget distribution with real reach (Poki 30M–60M+ MAU/~1B plays; CrazyGames ~30–35M MAU); instant play delivers 50–65% D1 vs ~30% app-store; and the 3–5s rule is a hard retention gate ([§2.3](#23-web--html5-portal-landscape), [§7.2](#72-session-patterns)). Keep the initial payload lean (target well under ~30 MB; ideally a few MB before first interaction, streaming the rest).
- **Persist all game state to localStorage/IndexedDB** — current level, stars per level, lives + regen timestamp, currency, booster inventory, streak state. Zero backend for v1; adopt portal-SDK cloud save when integrating, and defer accounts ([§5.4](#54-lives-system-and-persistence)).
- **Launch on CrazyGames and Poki as primary channels** (submit to both; consider CrazyGames' +50% rev-share boost terms and 2-month exclusivity trade-off), with itch.io as a secondary credibility/demo channel and GameDistribution syndication once stable. **Do not self-host as the primary channel** — no traffic without UA ([§6.4](#64-what-fits-a-web-first-indie-no-ua-budget)).
- **Plan the PWA "add to home screen" prompt early** (post-level-10, after demonstrated delight) as the web retention bridge; treat a native/app-store build as phase 2+ ([§7.2](#72-session-patterns)).

### 9.2 Core mechanic — **swap-match, 4–5 colors, full special-piece combo matrix**

- **Swap-adjacent match-3** is the core: it holds ~59% of the top-grossing market and is the only model with a combo system deep enough to generate casino-grade spectacle ([§4.1–4.2](#4-core-mechanics-comparison)).
- **Ship with 4 colors on the board (5 as a difficulty dial on later levels).** Royal Match's 4-color board is the single highest-leverage feel decision in the genre — it materially raises accidental cascades and combo frequency, which *is* the slot-machine sensation ([§4.2](#42-which-model-best-fits-a-juicy-casino-feel-game)).
- **Implement the full special-piece set and pairwise combo matrix from day one:** striped (match-4), wrapped (L/T match-5), color bomb (line match-5), and all six combinations up to the bomb+bomb board-clear "jackpot" ([§4.3](#43-special-pieces--the-combo-matrix-as-a-design-system)). This is the product; do not ship a subset.
- **Keep all animations fast and interruptible** — copy Royal Match's short, fluid swap/power-up animations so spectacle never becomes friction. Support cascades resolving quickly with escalating (not lengthening) celebration.

### 9.3 Aesthetic direction — **jewel-tone "premium sparkle," not literal gambling**

- **Saturated jewel-tone gems with gloss/specular highlights** (the Bejeweled lineage) on a dark, rich background; gold/velvet UI accents. This lane is under-occupied among current leaders and historically validated ([§3.1](#31-the-jewelcasino-visual-lineage), [§8.3](#83-the-wedge-for-a-web-first-indie)).
- **Frame the casino energy as "premium sparkle/reward"** — big-win celebrations, escalating multiplier-style combo fanfare, coin-shower particles — while **avoiding literal slot reels, chips, or gambling iconography**, which risk portal policy friction and alienate the relaxation-seeking core ([§8.4](#84-honest-risk-assessment)).
- **Follow the "Juice It or Lose It" playbook as a build checklist:** tweening/easing + anticipation/overshoot on every tile move; particles and screen shake scaled to clear size; rising audio pitch on chains; a distinct celebration tier per combo level; voice/stinger on big wins and level clears ([§3.2–3.3](#32-the-juice--game-feel-canon)). **Constraint: the board must remain readable under maximum effects.**

### 9.4 Feature scope: v1 vs defer

**v1 (cheap, high-impact, no scale required):**

| Feature | Why v1 |
|---|---|
| Juicy swap core + full combo matrix + cascades | The product and the differentiator; costs polish, not scale ([§4](#4-core-mechanics-comparison)) |
| ~40–60 structured levels rotating 4–5 goal types (score, clear-jelly/blockers, collect/order, bring-down; timed sparingly) | Canonical variety over one loop ([§5.1](#51-goal--objective-types)) |
| 1–3 stars per level + saga map | Replay/mastery loop and visible progression ([§5.2](#52-stars-saga-map-and-progression)) |
| Sawtooth difficulty tuned by attempts-to-complete; failure-free first ~10 levels | Portal requirement: win the first 3 minutes ([§5.3](#53-difficulty-pacing), [§8.4](#84-honest-risk-assessment)) |
| **Soft lives system**: 5 lives, fast regen (5–10 min, not 30), rewarded-ad refill always available | Lives-free games see ~10 sessions/day; the classic gate is the genre's most-hated element and suppresses the frequency a web game needs ([§7.2](#72-session-patterns)) |
| Rewarded video via portal SDK (free life, +5 moves at fail, double daily reward) | Best-fit monetization: opt-in, $15–40 tier-1 eCPM, retention-safe, no payment infra ([§6.2–6.3](#62-the-monetization-stack)) |
| Daily reward + 7-day streak with lucky wheel | Pure retention, trivial to build, no backend ([§6.2](#62-the-monetization-stack)) |
| A small free-booster taste (pre-level + in-level hammer/shuffle) earned via play/ads | Teaches booster value ahead of phase-2 IAP ([§6.2](#62-the-monetization-stack)) |
| Light interstitials between levels (sparingly, per portal rules) | Secondary ad revenue without retention damage ([§6.2](#62-the-monetization-stack)) |
| localStorage/IndexedDB persistence + PWA install prompt | Zero-backend persistence; the web retention bridge ([§9.1](#91-platform--distribution--web-first-html5-portal-distributed)) |

**Defer (requires scale, backend, or content cadence):**

- **IAP / hard-currency store, coin bundles, starter packs** — needs payments, a backend economy, and enough DAU/whales to matter ([§6.4](#64-what-fits-a-web-first-indie-no-ua-budget)).
- **Battle pass** — requires a 30-day content cadence and live-ops tooling ([§6.2](#62-the-monetization-stack)).
- **Leaderboards, teams, tournaments, PvP** — need accounts, server auth (web cheating), and critical-mass concurrency.
- **Deep decoration/narrative meta** — high content cost; add a *light* collection meta (e.g., a trophy room / gem vault that fills with stars) only after the core loop proves retention, since no-meta games hit a D14–D30 cliff ([§7.1](#71-who-plays-match-3--segments-and-motivations)).
- **Cloud save/accounts, self-hosting, own ad mediation, native app** — post-audience.

### 9.5 Positioning statement

> **Swoosh is the jewel-box match-3: slot-machine excitement meets puzzle elegance, playable instantly in your browser.** Every match pays out — cascading gem explosions, gold-shower combos, and jackpot board-clears — in a premium jewel-tone world that respects your time: no install, no paywall, sessions that fit any break. For the player who loved Bejeweled's sparkle and Candy Crush's satisfaction but wants it *right now*, with more shine and less nagging.

### 9.6 Success metrics & targets

| Metric | Target | Basis |
|---|---|---|
| Time to interactive (portal load) | **< 3–5 s** | Hard web retention gate ([§7.2](#72-session-patterns)) |
| D1 retention (portal instant-play) | **≥ 35–40%** (stretch: 50%+) | Instant-play delivers 50–65% D1 vs ~30% app average ([§7.2](#72-session-patterns)) |
| D7 retention | **≥ 10%** (kill/rework threshold if < 10%) | D7 < 10% = broken core loop; casual avg ≈ 10% ([§6.3](#63-benchmarks)) |
| D30 retention | **≥ 3–4%** aspirational; low single digits acceptable | Casual D30 < 4%; puzzle reads as low as 1.2% ([§6.3](#63-benchmarks)) |
| Avg session length | **5–8 min** | Casual median 4–6; top quartile 8–9 ([§7.2](#72-session-patterns)) |
| Sessions/day (returning players) | **≥ 3** (soft-lives design should beat lives-gated norms) | Lives-free titles reach ~10/day ([§7.2](#72-session-patterns)) |
| Rewarded-ad engagement | **≥ 25–30% of DAU opting in ≥ 1/day** | Puzzle leads all genres in rewarded volume ([§6.2](#62-the-monetization-stack)) |
| Level 1–10 completion (funnel) | **≥ 90%** finish level 10 | Failure-free onboarding requirement ([§5.3](#53-difficulty-pacing)) |
| Revenue (months 1–6 on portals) | **$500–$3,000/month** realistic band; portal licensing/feature deal = upside | First-web-game benchmark ([§2.3](#23-web--html5-portal-landscape)) |
| Qualitative bar | A stranger's first cascade visibly delights them ("the first 3 seconds and first 3 minutes") | The indie web thesis ([§8.4](#84-honest-risk-assessment)) |

**Decision gates:** if D7 ≥ 10% and rewarded engagement is healthy after portal launch, invest in phase 2 (light collection meta, more levels, cloud save, IAP groundwork, native/PWA push). If D7 < 10%, fix the core loop — more content or meta will not save it.

---

## 10. Sources

**Market data & competitive:**
[Sensor Tower — Royal Match surpasses Candy Crush](https://sensortower.com/blog/royal-match-surpasses-candy-crush-saga-in-revenue-and-downloads-for-the) · [Appfigures — first overtake](https://appfigures.com/resources/insights/20230804?f=4) · [mobilegamer.biz — top grossing 2024](https://mobilegamer.biz/the-top-grossing-mobile-games-of-2024/) · [PocketGamer.biz — top grossing 2024](https://www.pocketgamer.biz/the-top-grossing-mobile-games-of-2024/) · [Statista — top grossing match-3](https://www.statista.com/statistics/1405596/top-grossing-match-3-gaming-titles/) · [Naavik — What leading match-3 & merge games do differently](https://naavik.co/digest/what-leading-match-3-and-merge-games-do-differently/) · [Naavik — Royal Match deep dive](https://naavik.co/deep-dives/royal-match/) · [Naavik — Royal Kingdom](https://naavik.co/digest/royal-kingdom-and-expanding-the-royal-universe/) · [Wikipedia — Royal Match](https://en.wikipedia.org/wiki/Royal_Match) · [Game World Observer — Candy Crush $20B](https://gameworldobserver.com/2023/09/27/candy-crush-saga-revenue-20-billion-king) · [Business of Apps — Candy Crush](https://www.businessofapps.com/data/candy-crush-statistics/) · [Business of Apps — puzzle market](https://www.businessofapps.com/data/puzzle-games-market/) · [Business of Apps — Gardenscapes](https://www.businessofapps.com/data/gardenscapes-statistics/) · [PocketGamer.biz — Toon Blast $2.5B](https://www.pocketgamer.biz/toon-blast-surpasses-25-billion-with-newfound-revenue-resurgence/) · [AppMagic — Peak $5B](https://appmagic.rocks/blog/peak-games-5-billion-user-spending) · [Sensor Tower — Toy Blast $1B](https://sensortower.com/blog/peak-games-revenue-1-billion) · [Udonis — Homescapes](https://www.blog.udonis.co/mobile-marketing/mobile-games/homescapes-monetization) · [Udonis — Playrix](https://www.blog.udonis.co/game-publishers/playrix) · [Naavik — Match Masters deconstruction](https://naavik.co/deep-dives/match-masters-deconstruction/) · [Sensor Tower — Empires & Puzzles](https://sensortower.com/blog/empires-and-puzzles-revenue-500-million) · [Udonis — Project Makeover](https://medium.com/udonis/project-makeover-monetization-bringing-match-3-back-to-life-c567a3e96cf4) · [Naavik — Project Makeover fall](https://naavik.co/deep-dives/project-makeover-fall-from-grace/) · [MarketIntelo — match-3 market report](https://marketintelo.com/report/match-3-games-market) · [Deconstructor of Fun — Chrome Valley Customs](https://www.deconstructoroffun.com/blog/2023/8/14/chrome-valley-customs-a-new-contender-in-the-match-3-race) · [Naavik — Travel Town](https://naavik.co/digest/why-travel-town-is-dominating-mobile-merge/) · [Deconstructor of Fun — merge vs match-3 monetization](https://www.deconstructoroffun.com/blog/does-merge-2-monetize-better-than-match-3)

**Web/HTML5 portals:**
[Game Developer — the huge hidden web game market](https://www.gamedeveloper.com/business/the-huge-hidden-web-game-market-no-one-talks-about-and-how-to-get-in-) · [Naavik — Web gaming strikes back](https://naavik.co/digest/web-gaming-strikes-back/) · [TFN — Poki 1B monthly plays](https://techfundingnews.com/browser-gaming-website-poki-won-big-at-the-dutch-game-awards-celebrating-hitting-1-billion-monthly-plays/) · [Poki — 625M players milestone](https://finance.yahoo.com/sectors/technology/articles/poki-announces-milestone-625-million-050000965.html) · [Poki — match-3 category](https://poki.com/en/match-3) · [Poki developer docs — monetization](https://developers.poki.com/guide/monetization) · [CrazyGames — match-3 category](https://www.crazygames.com/t/match-3) · [CrazyGames docs](https://docs.crazygames.com/) · [CrazyGames developer portal](https://developer.crazygames.com/) · [Grokipedia — CrazyGames](https://grokipedia.com/page/CrazyGames) · [GameDistribution — partnership](https://gamedistribution.com/developers/partnership/) · [GameDistribution — Match Masters web version](https://blog.gamedistribution.com/match-masters-web-version/) · [IndieGameBusiness — web gaming for indies](https://indiegamebusiness.com/web-gaming-for-indie-developers/) · [nothing2install — instant play & LTV](https://www.nothing2install.com/2024/12/16/boost-your-mobile-game-ua-how-instant-play-reduces-cpi-and-increases-ltv/) · [GameSpace — instant-play browser games](https://gamespace.com/all-articles/news/instant-play-browser-games-are-back-no-download-just-press-start/)

**Mechanics & level design:**
[GameRefinery — meta layers & matching types](https://www.gamerefinery.com/match3-meta-layers-matching-types/) · [Om Tandon — crack the match-3 code II](https://medium.com/ironsource-levelup/how-to-crack-the-match-3-code-part-ii-c3722afd6c67) · [GameAnalytics — crack the match-3 code](https://www.gameanalytics.com/blog/crack-the-match-3-code-part-2) · [Sezer — Royal Match & Toon Blast analysis](https://medium.com/@ekinmelissezer/game-analysis-for-royal-match-and-toon-blast-9c4bff8ef48b) · [Unity LevelUp — Royal Match design deep dive](https://medium.com/ironsource-levelup/design-deep-dive-02-royal-match-948f7af96f04) · [Würzburg — "Royal Crush" difficulty study](https://downloads.hci.informatik.uni-wuerzburg.de/2024-CoG-RoyalCrush.pdf) · [arXiv — match-3 difficulty modelling](https://arxiv.org/pdf/2107.03305) · [King support — creating special candies](https://candycrush.zendesk.com/hc/en-us/articles/211939685-How-can-I-create-Special-Candies) · [King support — special candies](https://candycrush.zendesk.com/hc/en-us/articles/360000754697-Learn-all-about-Special-Candies) · [King support — lives](https://candycrush.zendesk.com/hc/en-us/articles/360000750878-How-do-lives-work) · [BlueStacks — combo guide](https://www.bluestacks.com/blog/game-guides/candy-crush/ccs-booster-guide-en.html) · [Without the Sarcasm — combo matrix](https://www.withoutthesarcasm.com/posts/candy-crush-saga-special-candy-combos/) · [Candy Crush Wiki — Level](https://candycrush.fandom.com/wiki/Level) · [Candy Crush Wiki — Lives](https://candycrush.fandom.com/wiki/Lives) · [Fran Ruiz — level design study](https://fran-ruiz.medium.com/match-3-level-design-study-building-three-candy-crush-levels-60f88465af7b) · [USPTO — match-3 patent](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11883740) · [Playrix via Game World Observer — level tuning](https://gameworldobserver.com/2019/09/27/playrix-levels-elements-match-3) · [PlayableMaker — what makes match-3 tick](https://playablemaker.com/what-makes-match3-games-tick/) · [Bootcamp — design analysis of match-3](https://medium.com/design-bootcamp/design-analysis-of-match-3-games-fb63879ecd8f) · [Pogo — what are match-3 games](https://www.pogo.com/what-are-match-3-games) · [Academy SMART — bubble shooter dev](https://academysmart.com/insights/how-to-develop-a-bubble-shooter-game/) · [MPL — bubble shooter](https://www.mplgames.com/blog/how-to-play-bubble-shooter-game/)

**Aesthetic & game feel:**
[GDC Vault — Juice It or Lose It](https://www.gdcvault.com/play/1016487/Juice-It-or-Lose) · [YouTube — Juice It or Lose It](https://www.youtube.com/watch?v=Fy0aCDmgnxg) · [Wikipedia — Game feel](https://en.wikipedia.org/wiki/Game_feel) · [GamesRadar — legacy of match-three](https://www.gamesradar.com/the-legacy-of-match-three-games-from-bejeweled-to-candy-crush/) · [Sensemitter — how Royal Match redefined success](https://sensemitter.com/blog/how-royal-match-redefined-success-without-breaking-trust/) · [Blood Moon Interactive — juice](https://www.bloodmooninteractive.com/articles/juice.html) · [Wardrome — game feel](https://wardrome.com/game-feel-the-secret-sauce-behind-addictive-indie-gameplay/)

**Monetization, retention & audience:**
[Udonis — Royal Match analysis](https://www.blog.udonis.co/mobile-marketing/mobile-games/royal-match-analysis) · [Juego Studio — ARPDAU benchmarks](https://www.juegostudio.com/blog/arpdau-benchmarks-by-game-genre) · [Juego Studio — retention](https://www.juegostudio.com/blog/how-to-increase-user-retention-and-increase-your-games-lifetime) · [AppAgent — retention benchmarks](https://appagent.com/blog/mobile-game-retention-benchmarks/) · [MAF — rewarded ads stats](https://maf.ad/en/blog/rewarded-ads-stats/) · [MAF — daily login rewards](https://maf.ad/en/blog/daily-login-rewards-engagement-retention/) · [BidsCube — ad revenue per game](https://bidscube.com/blog/2025/07/28/how-much-do-mobile-games-make-per-ad/) · [Critical Hit — daily bonuses](https://www.criticalhit.net/gaming/how-daily-bonuses-support-player-retention-in-modern-games) · [Royal Match help center — events](https://dreamgames.helpshift.com/hc/en/3-royal-match/section/23-events-and-tournaments/) · [Sci-Tech Today — Candy Crush statistics](https://www.sci-tech-today.com/stats/candy-crush-saga-statistics/) · [Galaxy4Games — why match-3 is profitable](https://galaxy4games.com/en/knowledgebase/blog/why-match-3-games-are-still-one-of-the-most-profitable-mobile-genres) · [Udonis — session length](https://www.blog.udonis.co/mobile-marketing/mobile-games/session-length) · [TechRT — mobile gaming time](https://techrt.com/mobile-gaming-time-statistics/) · [Deconstructor of Fun — hybridcasual puzzles](https://www.deconstructoroffun.com/blog/2025/2/3/hybridcasual-puzzles-expanding-the-puzzle-market)

---

*Report synthesized July 2026 from three primary research workstreams: (1) competitive landscape — mobile & web portals; (2) mechanics, level design & monetization/retention; (3) target audience, session patterns & market gaps. Where sources disagreed on figures (portal MAU, revenue shares, retention bands), ranges are presented with both citations rather than a silently chosen value.*
