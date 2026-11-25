// Sizzle & Serve — boot and the one loop. Input is read every frame, the
// world advances in fixed 1/60 s steps, and the renderer paints what is
// there. Clicks land on a station by the layout in config.js; keys 1-6 grab
// from the pantry, S serves, T trashes, P pauses, Space starts.
//
// ?seed=N fixes the order pattern. ?shot=start|play|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady so a screenshot tool knows the frame is done.
import { BEST_KEY, GRILL_SECONDS, LAYOUT, PANTRY, STEP, grillSlot, pantrySlot, pointIn } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_BURNT, EVENT_MISSED, EVENT_OVER } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_SERVE, ACTION_TRASH, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts one visit.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  // Paint twice right away, then flag readiness: a headless browser may
  // throttle requestAnimationFrame, and the frame must be done regardless.
  renderer.draw(world.state, { screen: scene.screen, best: scene.best }, 1 / 60);
  renderer.draw(world.state, { screen: scene.screen, best: scene.best }, 1 / 60);
  window.__shotReady = true;
  requestAnimationFrame(() => renderer.draw(world.state, { screen: scene.screen, best: scene.best }, 1 / 60));
}

function runGame() {
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let lastGrillReady = [false, false, false];

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    lastGrillReady = [false, false, false];
    screen = SCREEN_PLAY;
    announce('Playing. Serve orders before their timers run out.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.coins > best) {
      best = world.state.coins;
      saveBest(best);
    }
    announce(`Shift over. Served ${world.state.served}, earned ${world.state.coins} coins. Best ${best}.`);
  }

  function handleClick(x, y) {
    audio.unlock();
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      startGame();
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const state = world.state;
    // Pantry bins first: grabbing is the most common click.
    for (let index = 0; index < PANTRY.length; index += 1) {
      if (pointIn(pantrySlot(index), x, y)) {
        if (world.grabPantry(PANTRY[index].id)) audio.grab();
        else audio.wrong();
        return;
      }
    }
    // Grill slots: drop a raw patty in, or lift a cooked one out.
    for (let index = 0; index < 3; index += 1) {
      if (pointIn(grillSlot(index), x, y)) {
        if (state.grill[index] && state.grill[index].state === 'burnt') {
          world.takeFromGrill(index);
          audio.wrong();
        } else if (state.hand === 'patty' && !state.grill[index]) {
          if (world.placeOnGrill(index)) {
            audio.sizzle();
            announce('Patty on the grill.');
          }
        } else if (state.grill[index]) {
          const lifted = world.takeFromGrill(index);
          if (lifted === true) audio.grab();
          else if (lifted === false) audio.wrong();
        }
        return;
      }
    }
    // Chopping board: drop veg in, or take the chopped veg out.
    if (pointIn(LAYOUT.board, x, y)) {
      if (state.board && state.board.state === 'ready') {
        if (world.takeFromBoard()) audio.grab();
      } else if (world.placeOnBoard()) {
        audio.chop();
        announce('Chopping…');
      } else {
        audio.wrong();
      }
      return;
    }
    // Assembly plate: add the held item, or clear the plate with a second
    // click while the hand is empty.
    if (pointIn(LAYOUT.plate, x, y)) {
      if (state.hand) {
        const added = world.addToPlate();
        if (added === true) audio.place();
        else audio.wrong();
      } else if (state.plate.length > 0) {
        world.clearPlate();
        audio.wrong();
      }
      return;
    }
    // Trash bin drops whatever is in hand.
    if (pointIn(LAYOUT.trash, x, y)) {
      if (world.trashHand()) audio.wrong();
      return;
    }
  }

  function handlePantryKey(index) {
    if (screen !== SCREEN_PLAY) return;
    if (world.grabPantry(PANTRY[index].id)) audio.grab();
  }

  const input = createInput(canvas, handleClick, handlePantryKey);

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    } else if (actions & ACTION_SERVE && screen === SCREEN_PLAY) {
      const earned = world.servePlate();
      if (typeof earned === 'number') {
        audio.serve();
        renderer.burst(1096, 330, '#ffd166', 22);
        announce(`Served! +${earned} coins.`);
      } else {
        audio.wrong();
      }
    } else if (actions & ACTION_TRASH && screen === SCREEN_PLAY) {
      world.trashHand();
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      // The title screen shows a fresh kitchen, not a running shift: no
      // timers drain and no order can expire before the player starts.
      return;
    }
    const events = world.step(STEP);
    world.state.grill.forEach((slot, index) => {
      const ready = slot !== null && slot.state !== 'burnt' && slot.progress >= GRILL_SECONDS;
      if (ready && !lastGrillReady[index]) audio.ready();
      lastGrillReady[index] = ready;
    });
    if (events & EVENT_MISSED) {
      audio.expire();
      announce('An order walked out. 3 strikes end the shift.');
    }
    if (events & EVENT_BURNT) {
      audio.wrong();
      announce('A patty burnt on the grill!');
    }
    if (events & EVENT_OVER) endGame();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, { screen, best }, 1 / 60);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Sizzle and Serve. Press Space or click to start.');
  requestAnimationFrame(frame);
}

// Guard against a double boot (for example a harness re-importing the
// module): the first boot owns the loop and the listeners.
if (!window.__sizzleStarted) {
  window.__sizzleStarted = true;
  if (shot) runShot(shot);
  else runGame();
}
