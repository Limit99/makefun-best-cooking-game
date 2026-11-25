// Sizzle & Serve — the kitchen rules. No drawing here: the world only owns
// state and answers questions, so the renderer and the screenshot stager can
// both drive the same rules. A "hand" holds one item at a time; stations turn
// raw pantry items into plated ones; the plate matches an order by multiset.
import {
  BURN_AFTER,
  CHOP_SECONDS,
  GRILL_SECONDS,
  MAX_ORDERS,
  ORDER_PATIENCE,
  PANTRY,
  PREPPED,
  RECIPES,
  RUSH_AT,
  SHIFT_SECONDS,
  SPAWN_EVERY,
  SPAWN_RUSH_EVERY,
} from './config.js';

export const EVENT_SERVED = 1;
export const EVENT_MISSED = 2;
export const EVENT_OVER = 4;
export const EVENT_WRONG = 8;
export const EVENT_BURNT = 16;

export function createWorld(random) {
  let nextOrderId = 1;

  function blankState() {
    return {
      elapsed: 0,
      remaining: SHIFT_SECONDS,
      coins: 0,
      served: 0,
      missed: 0,
      combo: 0,
      bestCombo: 0,
      strikes: 0,
      hand: null,
      plate: [],
      grill: [null, null, null],
      board: null,
      orders: [],
      spawnIn: 2,
      rush: false,
      over: false,
      lastServe: null,
      shakePlate: 0,
      shakeServe: 0,
      flash: 0,
    };
  }

  const state = blankState();

  function spawnOrder() {
    if (state.orders.length >= MAX_ORDERS) return;
    const recipe = random.pick(RECIPES);
    const patience = ORDER_PATIENCE * (state.rush ? 0.8 : 1);
    state.orders.push({
      id: nextOrderId,
      recipe: recipe.id,
      patience,
      maxPatience: patience,
      reward: recipe.reward,
    });
    nextOrderId += 1;
  }

  function plateMatches(recipeId) {
    const recipe = RECIPES.find((entry) => entry.id === recipeId);
    if (!recipe || state.plate.length !== recipe.needs.length) return false;
    const counts = {};
    for (const item of state.plate) counts[item] = (counts[item] || 0) + 1;
    for (const item of recipe.needs) {
      if (!counts[item]) return false;
      counts[item] -= 1;
    }
    return true;
  }

  function matchingOrder() {
    return state.orders.find((order) => plateMatches(order.recipe)) ?? null;
  }

  const world = {
    state,

    reset() {
      const fresh = blankState();
      for (const key of Object.keys(fresh)) state[key] = fresh[key];
      nextOrderId = 1;
      spawnOrder();
      spawnOrder();
    },

    // Advance timers only; player actions are separate methods below so a
    // screenshot stager can call the same verbs a player would.
    step(dt) {
      if (state.over) return 0;
      let events = 0;
      state.elapsed += dt;
      state.remaining = Math.max(0, SHIFT_SECONDS - state.elapsed);
      state.rush = state.elapsed >= RUSH_AT;
      if (state.shakePlate > 0) state.shakePlate = Math.max(0, state.shakePlate - dt);
      if (state.shakeServe > 0) state.shakeServe = Math.max(0, state.shakeServe - dt);
      if (state.flash > 0) state.flash = Math.max(0, state.flash - dt);

      state.spawnIn -= dt;
      if (state.spawnIn <= 0) {
        spawnOrder();
        state.spawnIn = state.rush ? SPAWN_RUSH_EVERY : SPAWN_EVERY;
      }
      for (const order of state.orders) order.patience -= dt;
      const expired = state.orders.filter((order) => order.patience <= 0);
      if (expired.length > 0) {
        state.orders = state.orders.filter((order) => order.patience > 0);
        state.missed += expired.length;
        state.strikes += expired.length;
        state.combo = 0;
        events |= EVENT_MISSED;
      }
      for (const slot of state.grill) {
        if (slot && slot.state === 'cooking') {
          slot.progress += dt;
          if (slot.progress >= BURN_AFTER) {
            slot.state = 'burnt';
            events |= EVENT_BURNT;
          }
        }
      }
      if (state.board && state.board.state === 'chopping') {
        state.board.progress += dt;
        if (state.board.progress >= CHOP_SECONDS) state.board.state = 'ready';
      }
      if (state.remaining <= 0 || state.strikes >= 3) {
        state.over = true;
        events |= EVENT_OVER;
      }
      return events;
    },

    grabPantry(id) {
      const item = PANTRY.find((entry) => entry.id === id);
      if (!item || state.hand || state.over) return false;
      state.hand = item.id;
      return true;
    },

    placeOnGrill(slotIndex) {
      const slot = state.grill[slotIndex];
      if (slot || state.hand !== 'patty' || state.over) return false;
      state.grill[slotIndex] = { kind: 'patty', progress: 0, state: 'cooking' };
      state.hand = null;
      return true;
    },

    takeFromGrill(slotIndex) {
      const slot = state.grill[slotIndex];
      if (!slot || state.hand || state.over) return false;
      if (slot.state === 'burnt') {
        state.grill[slotIndex] = null;
        return 'burnt';
      }
      if (slot.progress < GRILL_SECONDS) return false;
      state.grill[slotIndex] = null;
      state.hand = PREPPED.patty;
      return true;
    },

    placeOnBoard() {
      const item = PANTRY.find((entry) => entry.id === state.hand);
      if (!item || item.prep !== 'board' || state.board || state.over) return false;
      state.board = { kind: item.id, progress: 0, state: 'chopping' };
      state.hand = null;
      return true;
    },

    takeFromBoard() {
      if (!state.board || state.hand || state.board.state !== 'ready' || state.over) return false;
      state.hand = PREPPED[state.board.kind];
      state.board = null;
      return true;
    },

    addToPlate() {
      if (!state.hand || state.over) return false;
      const plated = state.hand;
      const fits = RECIPES.some((recipe) => {
        const counts = {};
        for (const item of [...state.plate, plated]) counts[item] = (counts[item] || 0) + 1;
        const wanted = {};
        for (const item of recipe.needs) wanted[item] = (wanted[item] || 0) + 1;
        return Object.keys(counts).every((key) => counts[key] <= (wanted[key] || 0));
      });
      if (!fits) {
        state.shakePlate = 0.4;
        return 'wrong';
      }
      state.plate.push(plated);
      state.hand = null;
      return true;
    },

    servePlate() {
      if (state.over) return false;
      const order = matchingOrder();
      if (!order) {
        state.shakeServe = 0.4;
        return 'wrong';
      }
      const tip = Math.ceil((order.patience / order.maxPatience) * 6);
      const earned = order.reward + tip + Math.min(state.combo, 5);
      state.coins += earned;
      state.served += 1;
      state.combo += 1;
      state.bestCombo = Math.max(state.bestCombo, state.combo);
      state.lastServe = { coins: earned, at: state.elapsed };
      state.orders = state.orders.filter((entry) => entry.id !== order.id);
      state.plate = [];
      state.flash = 0.5;
      return earned;
    },

    trashHand() {
      if (!state.hand) return false;
      state.hand = null;
      return true;
    },

    clearPlate() {
      if (state.plate.length === 0) return false;
      state.plate = [];
      return true;
    },

    // The grill slot's visible state: raw, sizzling, ready to lift, or burnt.
    grillState(slot) {
      if (!slot) return 'empty';
      if (slot.state === 'burnt') return 'burnt';
      return slot.progress >= GRILL_SECONDS ? 'ready' : 'cooking';
    },

    orderForPlate() {
      return matchingOrder();
    },
  };

  return world;
}
