# Sizzle & Serve

[![make.fun](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/c/best-cooking-game-20261125-0137)
[![Rank](https://make.fun/badge/best-cooking-game-20261125-0137/Limit99/makefun-best-cooking-game/rank.svg)](https://make.fun/c/best-cooking-game-20261125-0137)
[![Reward](https://make.fun/badge/best-cooking-game-20261125-0137/Limit99/makefun-best-cooking-game/reward.svg)](https://make.fun/c/best-cooking-game-20261125-0137)

A lunch-rush cooking game for the make.fun **best-cooking-game-20261125-0137** bounty: run your own little kitchen, grill patties, chop vegetables, stack plates and serve orders before their tickets run out.

## How to play

Open `game/index.html` in a desktop browser (or run `node serve.ts` and open http://localhost:8080). No network, no build step — every file the game loads lives under `game/`.

1. **Grab** an ingredient from the pantry — click it, or press keys `1`–`6`.
2. **Grill** the patty (5 seconds; it burns at 9), **chop** lettuce, tomato or onion on the chopping board.
3. **Stack** it on the assembly plate, in any order — the plate matches a ticket when it holds exactly the ticket's ingredients.
4. **Serve** (`S` or click SERVE) before the ticket's timer runs out. Fresh orders pay a tip; a combo builds as you serve in a row.

Three missed orders — or the 180-second shift timer running out — ends the shift. After 90 seconds the **rush hour** hits: orders arrive faster and their patience shrinks.

## Recipes

- **Sunny Classic** — bun + grilled patty + lettuce
- **Cheese Melt** — bun + grilled patty + cheese + onion
- **Garden Stack** — bun + lettuce + tomato + cheese
- **Double Sizzle** — bun + 2 grilled patties + cheese + tomato

## Files

- `game/` — the playable game (plain HTML + ES modules, canvas-drawn art, WebAudio sound, no libraries)
  - `game/src/config.js` — recipes, timings, kitchen layout
  - `game/src/world.js` — orders, grill, chopping board, plate, serving rules
  - `game/src/render.js` — the kitchen, the food, the order board
  - `game/src/input.js` — mouse + keyboard
  - `game/src/audio.js` — synthesised sizzle, chop and serve sounds
  - `game/src/shots.js` — deterministic screenshot scenes (`?shot=start|play|end`)
  - `game/src/random.js` — seeded generator
  - `game/src/main.js` — boot and the game loop
- `main.ts` — the entry program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
- `screenshots/` — real renders of the game in a browser
