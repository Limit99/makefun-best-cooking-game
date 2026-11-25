// Sizzle & Serve — every tuneable number and every recipe lives here, so the
// kitchen can be rebalanced without touching the rules in world.js or the
// drawing in render.js. Coordinates are in the game's own 1280x720 space;
// the renderer scales that space to whatever window it is given.
export const VIEW = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const SHIFT_SECONDS = 180;
export const MAX_ORDERS = 3;
export const ORDER_PATIENCE = 48;
export const RUSH_AT = 90;
export const SPAWN_EVERY = 13;
export const SPAWN_RUSH_EVERY = 8;
export const GRILL_SECONDS = 5;
export const BURN_AFTER = 9;
export const CHOP_SECONDS = 2.2;
export const BEST_KEY = 'sizzle-and-serve-best';

// One pantry item per key, in the order they sit on the counter. `prep` says
// what station turns the raw item into the plated one: grill, board or none.
export const PANTRY = [
  { id: 'bun', label: 'Bun', key: '1', prep: 'none', color: '#e8a34c' },
  { id: 'patty', label: 'Patty', key: '2', prep: 'grill', color: '#8a5a3b' },
  { id: 'lettuce', label: 'Lettuce', key: '3', prep: 'board', color: '#5da24a' },
  { id: 'tomato', label: 'Tomato', key: '4', prep: 'board', color: '#d94f3d' },
  { id: 'cheese', label: 'Cheese', key: '5', prep: 'none', color: '#f2c230' },
  { id: 'onion', label: 'Onion', key: '6', prep: 'board', color: '#e8e0f0' },
];

// What a prepped item is called once it is ready to plate.
export const PREPPED = {
  patty: 'grilled-patty',
  lettuce: 'lettuce',
  tomato: 'tomato',
  onion: 'onion',
};

export const PLATE_LABEL = {
  bun: 'Bun',
  'grilled-patty': 'Grilled patty',
  lettuce: 'Lettuce',
  tomato: 'Tomato',
  cheese: 'Cheese',
  onion: 'Onion',
};

// Recipes are multisets of plated items. The plate matches an order when it
// holds exactly these items, in any order — so the player plans the route,
// not a memorised sequence.
export const RECIPES = [
  {
    id: 'classic',
    name: 'Sunny Classic',
    needs: ['bun', 'grilled-patty', 'lettuce'],
    reward: 14,
    color: '#f2a541',
  },
  {
    id: 'melt',
    name: 'Cheese Melt',
    needs: ['bun', 'grilled-patty', 'cheese', 'onion'],
    reward: 20,
    color: '#f2c230',
  },
  {
    id: 'garden',
    name: 'Garden Stack',
    needs: ['bun', 'lettuce', 'tomato', 'cheese'],
    reward: 18,
    color: '#7cb84f',
  },
  {
    id: 'double',
    name: 'Double Sizzle',
    needs: ['bun', 'grilled-patty', 'grilled-patty', 'cheese', 'tomato'],
    reward: 28,
    color: '#d94f3d',
  },
];

export function recipeById(id) {
  return RECIPES.find((recipe) => recipe.id === id) ?? RECIPES[0];
}

// Fixed kitchen layout, shared by the renderer and the click mapping in
// main.js so a drawn station and its clickable area can never drift apart.
export const LAYOUT = {
  topBar: { x: 0, y: 0, w: 1280, h: 64 },
  orders: { x: 24, y: 76, w: 1232, h: 138 },
  pantry: { x: 24, y: 226, w: 300, h: 290 },
  grill: { x: 348, y: 226, w: 300, h: 290 },
  board: { x: 672, y: 226, w: 240, h: 290 },
  plate: { x: 936, y: 226, w: 320, h: 290 },
  serve: { x: 936, y: 226, w: 320, h: 290 },
  trash: { x: 24, y: 528, w: 140, h: 110 },
  help: { x: 188, y: 528, w: 1068, h: 110 },
  hand: { x: 1140, y: 528, w: 116, h: 110 },
};

export function pantrySlot(index) {
  const cols = 3;
  const col = index % cols;
  const row = Math.floor(index / cols);
  return {
    x: LAYOUT.pantry.x + 16 + col * 92,
    y: LAYOUT.pantry.y + 52 + row * 96,
    w: 80,
    h: 84,
  };
}

export function grillSlot(index) {
  return {
    x: LAYOUT.grill.x + 18 + index * 94,
    y: LAYOUT.grill.y + 62,
    w: 84,
    h: 120,
  };
}

export function orderCard(index) {
  return {
    x: LAYOUT.orders.x + 12 + index * 404,
    y: LAYOUT.orders.y + 32,
    w: 388,
    h: 96,
  };
}

export function pointIn(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}
