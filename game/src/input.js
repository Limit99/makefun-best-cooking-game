// Keyboard and mouse for Sizzle & Serve. The canvas reports clicks in game
// coordinates (the renderer already scales the canvas); keys are the pantry
// shortcuts 1-6 plus the station verbs. Actions are drained once per frame,
// so a held key never double-fires.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_SERVE = 4;
export const ACTION_TRASH = 8;

const KEY_ACTIONS = {
  Enter: ACTION_CONFIRM,
  ' ': ACTION_CONFIRM,
  Escape: ACTION_PAUSE,
  p: ACTION_PAUSE,
  P: ACTION_PAUSE,
  s: ACTION_SERVE,
  S: ACTION_SERVE,
  t: ACTION_TRASH,
  T: ACTION_TRASH,
};

export function createInput(canvas, onClick, onPantryKey) {
  let actions = 0;
  const keys = new Set();

  function toGame(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 1280,
      y: ((event.clientY - rect.top) / rect.height) * 720,
    };
  }

  function onKeyDown(event) {
    if (event.repeat) return;
    const action = KEY_ACTIONS[event.key];
    if (action) {
      actions |= action;
      event.preventDefault();
    }
    const pantryIndex = ['1', '2', '3', '4', '5', '6'].indexOf(event.key);
    if (pantryIndex !== -1) onPantryKey(pantryIndex);
    keys.add(event.key.toLowerCase());
  }

  function onKeyUp(event) {
    keys.delete(event.key.toLowerCase());
  }

  function onMouse(event) {
    const point = toGame(event);
    onClick(point.x, point.y);
  }

  canvas.addEventListener('click', onMouse);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  return {
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    keyDown(key) {
      return keys.has(key.toLowerCase());
    },
  };
}
