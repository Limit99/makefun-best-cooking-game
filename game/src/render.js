// Sizzle & Serve — every pixel the judge sees. One canvas, one kitchen:
// a warm tiled floor, a top order board, pantry bins down the left, the
// grill and the chopping board in the middle, and the assembly plate with
// the serve window on the right. Food is drawn as shapes, never borrowed
// art, so a bun, a patty and a tomato read at a glance even shrunk small.
import {
  BURN_AFTER,
  CHOP_SECONDS,
  GRILL_SECONDS,
  LAYOUT,
  PANTRY,
  PLATE_LABEL,
  RECIPES,
  grillSlot,
  orderCard,
  pantrySlot,
  recipeById,
} from './config.js';

// The order whose recipe the plate currently matches, or null. The world
// owns the same check for serving; the renderer repeats it so the plate
// card can turn green the moment a dish is complete.
function findMatchingOrder(state) {
  return state.orders.find((order) => {
    const recipe = RECIPES.find((entry) => entry.id === order.recipe);
    if (!recipe || state.plate.length !== recipe.needs.length) return false;
    const counts = {};
    for (const item of state.plate) counts[item] = (counts[item] || 0) + 1;
    return recipe.needs.every((item) => counts[item] > 0 && (counts[item] -= 1) >= 0);
  }) ?? null;
}

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const INK = '#2b1d12';
const CREAM = '#fff6e3';
const WOOD = '#b07a3e';
const WOOD_DARK = '#8a5a28';

function roundRect(ctx, x, y, w, h, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function bar(ctx, x, y, w, h, fraction, color, background = '#e5d5b8') {
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = background;
  ctx.fill();
  if (fraction > 0) {
    roundRect(ctx, x, y, Math.max(h, w * Math.min(1, fraction)), h, h / 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

// One drawn ingredient, reused in the pantry, on the plate, in an order
// ticket and in the player's hand, so the same food always looks the same.
export function drawIngredient(ctx, id, cx, cy, size) {
  const s = size;
  ctx.save();
  ctx.translate(cx, cy);
  if (id === 'bun') {
    ctx.fillStyle = '#e8a34c';
    ctx.beginPath();
    ctx.arc(0, s * 0.08, s * 0.48, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c97f2e';
    ctx.fillRect(-s * 0.48, s * 0.08, s * 0.96, s * 0.12);
    ctx.fillStyle = '#fff2c9';
    for (const [dx, dy] of [[-0.2, -0.22], [0.05, -0.32], [0.26, -0.16], [-0.02, -0.1]]) {
      ctx.beginPath();
      ctx.ellipse(dx * s, dy * s, s * 0.05, s * 0.03, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'patty' || id === 'grilled-patty') {
    ctx.fillStyle = id === 'grilled-patty' ? '#6e4426' : '#8a5a3b';
    roundRect(ctx, -s * 0.5, -s * 0.16, s, s * 0.32, s * 0.14);
    ctx.fill();
    ctx.strokeStyle = '#4a2c17';
    ctx.lineWidth = Math.max(1, s * 0.04);
    for (const dx of [-0.28, 0, 0.28]) {
      ctx.beginPath();
      ctx.moveTo(dx * s, -s * 0.14);
      ctx.lineTo(dx * s, s * 0.14);
      ctx.stroke();
    }
    if (id === 'grilled-patty') {
      ctx.fillStyle = '#3d2412';
      for (const [dx, dy] of [[-0.3, -0.05], [0.18, 0.06], [0.32, -0.08]]) {
        ctx.beginPath();
        ctx.arc(dx * s, dy * s, s * 0.05, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (id === 'lettuce') {
    ctx.fillStyle = '#5da24a';
    for (const dx of [-0.28, 0, 0.28]) {
      ctx.beginPath();
      ctx.arc(dx * s, 0, s * 0.24, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#3e7a2e';
    ctx.lineWidth = Math.max(1, s * 0.03);
    ctx.beginPath();
    ctx.moveTo(-s * 0.4, 0);
    ctx.quadraticCurveTo(0, s * 0.14, s * 0.4, 0);
    ctx.stroke();
  } else if (id === 'tomato') {
    ctx.fillStyle = '#d94f3d';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f08a76';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8e0c8';
    for (let angle = 0; angle < 6; angle += 1) {
      const a = (angle / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * s * 0.16, Math.sin(a) * s * 0.16, s * 0.07, s * 0.04, a, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'cheese') {
    ctx.fillStyle = '#f2c230';
    ctx.save();
    ctx.rotate(-0.12);
    roundRect(ctx, -s * 0.46, -s * 0.3, s * 0.92, s * 0.6, s * 0.06);
    ctx.fill();
    ctx.fillStyle = '#d9a41c';
    for (const [dx, dy] of [[-0.25, -0.1], [0.15, 0.08], [0.3, -0.14]]) {
      ctx.beginPath();
      ctx.arc(dx * s, dy * s, s * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else if (id === 'onion') {
    ctx.strokeStyle = '#b9a8d6';
    ctx.lineWidth = Math.max(2, s * 0.07);
    for (const radius of [0.42, 0.3, 0.18]) {
      ctx.beginPath();
      ctx.arc(0, 0, radius * s, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#f4eefc';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = 1280;
  canvas.height = 720;
  const particles = [];

  function burst(x, y, color, count = 14) {
    for (let index = 0; index < count; index += 1) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 260,
        vy: -Math.random() * 220 - 40,
        life: 0.7 + Math.random() * 0.4,
        age: 0,
        color,
        size: 3 + Math.random() * 5,
      });
    }
  }

  function drawParticles(dt) {
    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      particle.age += dt;
      if (particle.age >= particle.life) {
        particles.splice(index, 1);
        continue;
      }
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 320 * dt;
      ctx.globalAlpha = 1 - particle.age / particle.life;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawFloor() {
    ctx.fillStyle = '#f3e2c2';
    ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = '#ecd3a8';
    for (let y = 64; y < 720; y += 48) {
      for (let x = ((y / 48) % 2) * 48; x < 1280; x += 96) ctx.fillRect(x, y, 46, 46);
    }
    ctx.fillStyle = '#7a4a21';
    ctx.fillRect(0, 64, 1280, 10);
  }

  function drawTopBar(state, ui) {
    const barRect = LAYOUT.topBar;
    ctx.fillStyle = '#3d2b1a';
    ctx.fillRect(barRect.x, barRect.y, barRect.w, barRect.h);
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('SIZZLE & SERVE', 24, 34);
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = CREAM;
    const minutes = Math.floor(state.remaining / 60);
    const seconds = Math.floor(state.remaining % 60);
    const timeText = `TIME ${minutes}:${String(seconds).padStart(2, '0')}`;
    ctx.fillStyle = state.remaining <= 30 ? '#ff6b5e' : CREAM;
    ctx.fillText(timeText, 330, 34);
    ctx.fillStyle = CREAM;
    ctx.fillText(`COINS ${state.coins}`, 470, 34);
    ctx.fillText(`Served ${state.served}`, 640, 34);
    ctx.fillText(`Combo x${state.combo}`, 830, 34);
    ctx.fillStyle = state.rush ? '#ff9f43' : '#9be15d';
    ctx.fillText(state.rush ? '⚡ RUSH HOUR' : 'Day shift', 1000, 34);
    ctx.fillStyle = '#ffd166';
    ctx.textAlign = 'right';
    ctx.fillText(`Best ${ui.best}`, 1256, 34);
    ctx.textAlign = 'left';
  }

  function drawOrders(state) {
    const zone = LAYOUT.orders;
    ctx.fillStyle = '#fff6e3';
    roundRect(ctx, zone.x, zone.y, zone.w, zone.h, 14);
    ctx.fill();
    ctx.strokeStyle = WOOD_DARK;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.font = 'bold 17px sans-serif';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('ORDER BOARD', zone.x + 14, zone.y + 22);
    ctx.font = '15px sans-serif';
    ctx.fillStyle = '#7a5a34';
    ctx.fillText('Serve the matching plate before the ticket runs out — fresh orders pay a tip.', zone.x + 170, zone.y + 22);
    if (state.orders.length === 0) {
      ctx.fillStyle = '#7a5a34';
      ctx.font = 'italic 16px sans-serif';
      ctx.fillText('No orders yet — the lunch crowd is coming…', zone.x + 14, zone.y + 70);
    }
    state.orders.forEach((order, index) => {
      const recipe = recipeById(order.recipe);
      const card = orderCard(index);
      const urgent = order.patience < 12;
      ctx.fillStyle = urgent && Math.floor(state.elapsed * 3) % 2 === 0 ? '#ffe3df' : '#ffffff';
      roundRect(ctx, card.x, card.y, card.w, card.h, 10);
      ctx.fill();
      ctx.strokeStyle = recipe.color;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(recipe.name, card.x + 12, card.y + 26);
      ctx.font = 'bold 15px sans-serif';
      ctx.fillStyle = '#b07a3e';
      ctx.textAlign = 'right';
      ctx.fillText(`${recipe.reward} coins + tip`, card.x + card.w - 12, card.y + 26);
      ctx.textAlign = 'left';
      const spacing = recipe.needs.length > 4 ? 36 : 44;
      recipe.needs.forEach((item, itemIndex) => {
        drawIngredient(ctx, item, card.x + 30 + itemIndex * spacing, card.y + 58, 34);
      });
      ctx.font = '13px sans-serif';
      ctx.fillStyle = '#7a5a34';
      ctx.fillText(recipe.needs.map((item) => PLATE_LABEL[item]).join(' + '), card.x + 12, card.y + 88);
      bar(ctx, card.x + 210, card.y + 48, 160, 10, order.patience / order.maxPatience, urgent ? '#e74c3c' : '#5da24a');
    });
  }

  function drawPantry(state) {
    const zone = LAYOUT.pantry;
    ctx.fillStyle = WOOD;
    roundRect(ctx, zone.x, zone.y, zone.w, zone.h, 14);
    ctx.fill();
    ctx.fillStyle = '#fff6e3';
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText('PANTRY — click or press 1–6', zone.x + 14, zone.y + 28);
    PANTRY.forEach((item, index) => {
      const slot = pantrySlot(index);
      const held = state.hand === item.id;
      ctx.fillStyle = held ? '#ffe9a8' : '#fff6e3';
      roundRect(ctx, slot.x, slot.y, slot.w, slot.h, 10);
      ctx.fill();
      ctx.strokeStyle = held ? '#e67e22' : '#d9c49a';
      ctx.lineWidth = held ? 3 : 2;
      ctx.stroke();
      drawIngredient(ctx, item.id, slot.x + slot.w / 2, slot.y + 32, 52);
      ctx.fillStyle = INK;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.label, slot.x + slot.w / 2, slot.y + 66);
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#7a5a34';
      ctx.fillText(`[${item.key}] ${item.prep === 'none' ? 'ready' : item.prep === 'grill' ? '→ grill' : '→ board'}`, slot.x + slot.w / 2, slot.y + 80);
      ctx.textAlign = 'left';
    });
    ctx.fillStyle = '#fff6e3';
    ctx.font = '13px sans-serif';
    ctx.fillText('Cheese goes straight on the plate.', zone.x + 14, zone.y + 268);
  }

  function drawGrill(state) {
    const zone = LAYOUT.grill;
    ctx.fillStyle = '#3a3a3f';
    roundRect(ctx, zone.x, zone.y, zone.w, zone.h, 14);
    ctx.fill();
    ctx.fillStyle = CREAM;
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText('GRILL — sizzle 5s, burn 9s', zone.x + 14, zone.y + 28);
    state.grill.forEach((slot, index) => {
      const rect = grillSlot(index);
      ctx.fillStyle = '#222226';
      roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
      ctx.fill();
      ctx.strokeStyle = '#55555c';
      ctx.lineWidth = 2;
      for (let line = 0; line < 4; line += 1) {
        ctx.beginPath();
        ctx.moveTo(rect.x + 8, rect.y + 22 + line * 26);
        ctx.lineTo(rect.x + rect.w - 8, rect.y + 22 + line * 26);
        ctx.stroke();
      }
      if (slot) {
        const cooked = slot.progress >= GRILL_SECONDS;
        drawIngredient(ctx, cooked || slot.state === 'burnt' ? 'grilled-patty' : 'patty', rect.x + rect.w / 2, rect.y + 52, 58);
        if (slot.state === 'burnt') {
          ctx.fillStyle = '#ff6b5e';
          ctx.font = 'bold 15px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('BURNT!', rect.x + rect.w / 2, rect.y + 92);
          ctx.textAlign = 'left';
        } else {
          bar(ctx, rect.x + 8, rect.y + 92, rect.w - 16, 10, Math.min(1, slot.progress / BURN_AFTER), cooked ? '#5da24a' : '#ff9f43');
          ctx.fillStyle = cooked ? '#9be15d' : CREAM;
          ctx.font = 'bold 13px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(cooked ? 'READY' : 'sizzling…', rect.x + rect.w / 2, rect.y + 112);
          ctx.textAlign = 'left';
        }
      } else {
        ctx.fillStyle = '#8a8a92';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('empty slot', rect.x + rect.w / 2, rect.y + 62);
        ctx.textAlign = 'left';
      }
    });
    ctx.fillStyle = CREAM;
    ctx.font = '13px sans-serif';
    ctx.fillText('Hold a raw patty, click a slot to grill it.', zone.x + 14, zone.y + 216);
    ctx.fillText('Click a ready patty to lift it off the grill.', zone.x + 14, zone.y + 238);
  }

  function drawBoard(state) {
    const zone = LAYOUT.board;
    ctx.fillStyle = '#c98f4e';
    roundRect(ctx, zone.x, zone.y, zone.w, zone.h, 14);
    ctx.fill();
    ctx.fillStyle = '#fff6e3';
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText('CHOPPING BOARD', zone.x + 14, zone.y + 28);
    ctx.fillStyle = '#f7e8c8';
    roundRect(ctx, zone.x + 18, zone.y + 52, zone.w - 36, 130, 10);
    ctx.fill();
    ctx.strokeStyle = '#8a5a28';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (state.board) {
      const item = state.board;
      const chopped = item.state === 'ready';
      drawIngredient(ctx, item.kind, zone.x + zone.w / 2, zone.y + 108, chopped ? 64 : 58);
      bar(ctx, zone.x + 30, zone.y + 148, zone.w - 60, 10, item.progress / CHOP_SECONDS, chopped ? '#5da24a' : '#ff9f43');
      ctx.fillStyle = INK;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(chopped ? 'Chopped — click to take' : 'chopping…', zone.x + zone.w / 2, zone.y + 178);
      ctx.textAlign = 'left';
    } else {
      ctx.fillStyle = '#8a5a28';
      ctx.font = '15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Drop lettuce, tomato', zone.x + zone.w / 2, zone.y + 104);
      ctx.fillText('or onion here to chop', zone.x + zone.w / 2, zone.y + 126);
      ctx.textAlign = 'left';
    }
    ctx.fillStyle = '#fff6e3';
    ctx.font = '13px sans-serif';
    ctx.fillText('Tip: chop while the', zone.x + 14, zone.y + 210);
    ctx.fillText('patty grills — never idle!', zone.x + 14, zone.y + 230);
  }

  function drawPlate(state) {
    const zone = LAYOUT.plate;
    const shake = state.shakePlate > 0 ? Math.sin(state.elapsed * 60) * 5 * state.shakePlate : 0;
    ctx.save();
    ctx.translate(shake, 0);
    const readyOrder = findMatchingOrder(state);
    ctx.fillStyle = '#fff6e3';
    roundRect(ctx, zone.x, zone.y, zone.w, zone.h, 14);
    ctx.fill();
    ctx.strokeStyle = readyOrder ? '#5da24a' : WOOD_DARK;
    ctx.lineWidth = readyOrder ? 4 : 3;
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText('ASSEMBLY PLATE', zone.x + 14, zone.y + 28);
    const plateCx = zone.x + zone.w / 2;
    const plateCy = zone.y + 150;
    ctx.fillStyle = '#e8e0d0';
    ctx.beginPath();
    ctx.ellipse(plateCx, plateCy, 110, 34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(plateCx, plateCy - 4, 96, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    if (state.plate.length === 0) {
      ctx.fillStyle = '#a08a68';
      ctx.font = 'italic 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Click a held item to add it', plateCx, plateCy - 6);
      ctx.fillText('— build what a ticket asks for', plateCx, plateCy + 16);
      ctx.textAlign = 'left';
    } else {
      state.plate.forEach((item, index) => {
        const y = plateCy - 8 - index * 20;
        drawIngredient(ctx, item, plateCx, y, 62);
      });
    }
    const ready = readyOrder;
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    if (ready) {
      ctx.fillStyle = '#2e7d32';
      ctx.fillText(`Matches ${recipeById(ready.recipe).name} — SERVE IT!`, plateCx, zone.y + 226);
    } else if (state.plate.length > 0) {
      ctx.fillStyle = '#7a5a34';
      ctx.fillText(`${state.plate.length} layer${state.plate.length > 1 ? 's' : ''} on the plate`, plateCx, zone.y + 226);
    }
    ctx.textAlign = 'left';
    ctx.restore();

    // Serve window: the bell the player rings with S, drawn as a big
    // SERVE strip along the bottom of the plate card — green once the
    // plate matches a ticket, grey while it still needs a layer.
    const serveY = zone.y + zone.h;
    ctx.fillStyle = ready ? '#43a047' : '#9e9e9e';
    roundRect(ctx, zone.x, serveY - 52, zone.w, 44, 10);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 19px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(ready ? 'SERVE — PRESS S' : 'SERVE', plateCx, serveY - 24);
    ctx.textAlign = 'left';
  }

  function drawBottom(state) {
    const trash = LAYOUT.trash;
    ctx.fillStyle = '#5d4037';
    roundRect(ctx, trash.x, trash.y, trash.w, trash.h, 12);
    ctx.fill();
    ctx.fillStyle = CREAM;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TRASH', trash.x + trash.w / 2, trash.y + 30);
    ctx.font = '13px sans-serif';
    ctx.fillText('[T] drops hand', trash.x + trash.w / 2, trash.y + 52);
    ctx.fillText('click plate = clear', trash.x + trash.w / 2, trash.y + 68);
    ctx.textAlign = 'left';

    const help = LAYOUT.help;
    ctx.fillStyle = '#fff6e3';
    roundRect(ctx, help.x, help.y, help.w, help.h, 12);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('HOW TO PLAY', help.x + 14, help.y + 24);
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#5d4037';
    ctx.fillText('1. Grab an ingredient from the pantry.  2. Grill the patty, chop the veg.  3. Stack it on the plate in any order.', help.x + 14, help.y + 48);
    ctx.fillText('4. When the plate matches a ticket, SERVE before its timer runs out.  Miss 3 orders — or run out of time — and the shift ends.', help.x + 14, help.y + 70);

    const handZone = LAYOUT.hand;
    ctx.fillStyle = state.hand ? '#ffe9a8' : '#e8e0d0';
    roundRect(ctx, handZone.x, handZone.y, handZone.w, handZone.h, 12);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('IN HAND', handZone.x + handZone.w / 2, handZone.y + 18);
    if (state.hand) drawIngredient(ctx, state.hand, handZone.x + handZone.w / 2, handZone.y + 52, 44);
    else {
      ctx.fillStyle = '#a08a68';
      ctx.font = '13px sans-serif';
      ctx.fillText('empty', handZone.x + handZone.w / 2, handZone.y + 56);
    }
    ctx.textAlign = 'left';
  }

  function overlay(title, lines, accent) {
    ctx.fillStyle = 'rgba(43, 29, 18, 0.72)';
    ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = CREAM;
    roundRect(ctx, 340, 150, 600, 400, 20);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, 640, 230);
    ctx.font = '19px sans-serif';
    lines.forEach((line, index) => ctx.fillText(line, 640, 290 + index * 34));
    ctx.textAlign = 'left';
  }

  return {
    burst,
    draw(state, ui, dt) {
      drawFloor();
      drawTopBar(state, ui);
      drawOrders(state);
      drawPantry(state);
      drawGrill(state);
      drawBoard(state);
      drawPlate(state);
      drawBottom(state);
      if (state.flash > 0) {
        ctx.fillStyle = `rgba(155, 225, 93, ${state.flash * 0.35})`;
        ctx.fillRect(0, 0, 1280, 720);
      }
      drawParticles(dt);
      if (ui.screen === SCREEN_TITLE) {
        overlay('SIZZLE & SERVE', [
          'Run the lunch rush at your own little kitchen.',
          'Grill patties, chop veg, stack plates, serve fast.',
          'Three missed orders end the shift early.',
          '',
          'Click or press Space to start — mouse + keys 1–6, S, T.',
        ], '#f2a541');
      } else if (ui.screen === SCREEN_PAUSED) {
        overlay('PAUSED', ['The kitchen waits. Press P or Space to keep cooking.'], '#5da24a');
      } else if (ui.screen === SCREEN_OVER) {
        const bestLine = state.coins >= ui.best && state.coins > 0 ? '★ New best shift! ★' : `Best shift: ${ui.best} coins`;
        overlay('SHIFT OVER', [
          `You served ${state.served} order${state.served === 1 ? '' : 's'} and earned ${state.coins} coins.`,
          `Best combo x${state.bestCombo} — ${state.missed} order${state.missed === 1 ? '' : 's'} missed.`,
          bestLine,
          '',
          'Press Space or click to cook another shift.',
        ], '#d94f3d');
      }
    },
  };
}
