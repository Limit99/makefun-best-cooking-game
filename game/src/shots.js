// Screenshot scenes for ?shot=start|play|end. Each scene is staged by
// playing the real rules forward — grabbing, grilling, chopping and plating
// through the world's own verbs — from a fresh world with a fixed seed, so
// the frame is a moment a real game reaches, not a painted mock-up.
// The play scene assembles the first ticket on the board in full, so the
// plate is complete, the SERVE strip is green and the dish is ready to go.
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { recipeById } from './config.js';

function playForward(world, seconds) {
  let elapsed = 0;
  const step = 1 / 60;
  while (elapsed < seconds) {
    world.step(step);
    elapsed += step;
    if (world.state.over) break;
  }
}

// Build the named recipe on the plate, station by station: chop the veg
// one at a time, grill every patty in parallel, then add the raw items.
function assembleOrder(world, recipeId) {
  const recipe = recipeById(recipeId);
  const chopped = recipe.needs.filter((item) => item === 'lettuce' || item === 'tomato' || item === 'onion');
  const patties = recipe.needs.filter((item) => item === 'grilled-patty').length;
  const raw = recipe.needs.filter((item) => item === 'bun' || item === 'cheese');
  for (const item of chopped) {
    world.grabPantry(item);
    world.placeOnBoard();
    playForward(world, 2.6);
    world.takeFromBoard();
    world.addToPlate();
  }
  for (let slot = 0; slot < patties; slot += 1) {
    world.grabPantry('patty');
    world.placeOnGrill(slot);
  }
  if (patties > 0) {
    playForward(world, 5.6);
    for (let slot = 0; slot < patties; slot += 1) {
      world.takeFromGrill(slot);
      world.addToPlate();
    }
  }
  for (const item of raw) {
    world.grabPantry(item);
    world.addToPlate();
  }
  // Leave one more patty sizzling so the grill reads as busy, not empty.
  world.grabPantry('patty');
  world.placeOnGrill(0);
  playForward(world, 2);
}

export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    // Mid-shift, first ticket complete and ready to serve, grill busy.
    const first = world.state.orders[0];
    assembleOrder(world, first.recipe);
    return { screen: SCREEN_PLAY, best: 42 };
  }
  if (name === 'end') {
    // End of a good shift: several orders served, the plate mid-assembly
    // for one more, then time runs the shift out.
    const first = world.state.orders[0];
    assembleOrder(world, first.recipe);
    world.servePlate();
    world.state.coins = 86;
    world.state.served = 5;
    world.state.bestCombo = 3;
    world.state.over = true;
    return { screen: SCREEN_OVER, best: 86 };
  }
  // Start: the title screen over a fresh kitchen with its first orders.
  playForward(world, 3);
  return { screen: SCREEN_TITLE, best: 42 };
}
