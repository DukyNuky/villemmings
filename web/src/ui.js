// Zeichenhilfen für Menüs und Leisten im Stil der Klötzchenwelt.

import { getTextures, TEX, shade } from './textures.js';
import { M } from './materials.js';
import { drawText, textWidth, FONT_H } from './font.js';

let dirtCanvas = null;

function dirtTile() {
  if (dirtCanvas) return dirtCanvas;
  const t = getTextures()[M.dirt];
  dirtCanvas = document.createElement('canvas');
  dirtCanvas.width = TEX;
  dirtCanvas.height = TEX;
  const ctx = dirtCanvas.getContext('2d');
  const img = ctx.createImageData(TEX, TEX);
  const buf = new Uint32Array(img.data.buffer);
  for (let i = 0; i < t.length; i++) buf[i] = shade(t[i], 0.32);
  ctx.putImageData(img, 0, 0);
  return dirtCanvas;
}

// Abgedunkelter Erdhintergrund wie in den Menüs des Originals
export function drawDirt(ctx, x, y, w, h, scale, offset = 0) {
  const pat = ctx.createPattern(dirtTile(), 'repeat');
  pat.setTransform(new DOMMatrix([scale, 0, 0, scale, -offset, 0]));
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = pat;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

export function drawButton(ctx, b, s) {
  const { x, y, w, h } = b;
  const disabled = b.disabled;
  const pressed = b.pressed;
  ctx.fillStyle = '#000000';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = disabled ? '#2c2c2c' : pressed ? '#7c86c4' : '#6f6f6f';
  ctx.fillRect(x + s, y + s, w - 2 * s, h - 2 * s);
  if (!disabled) {
    ctx.fillStyle = pressed ? '#a8b2f0' : '#a9a9a9';
    ctx.fillRect(x + s, y + s, w - 2 * s, s);
    ctx.fillRect(x + s, y + s, s, h - 2 * s);
    ctx.fillStyle = pressed ? '#4a5390' : '#4a4a4a';
    ctx.fillRect(x + s, y + h - 2 * s, w - 2 * s, s);
    ctx.fillRect(x + w - 2 * s, y + s, s, h - 2 * s);
  }
  if (b.label) {
    const ts = b.textScale ?? s;
    drawText(ctx, b.label, x + w / 2, y + (h - FONT_H * ts) / 2 + ts * 0.5, ts,
      disabled ? '#a0a0a0' : pressed ? '#ffffa0' : '#ffffff', { align: 'center' });
  }
}

// Inventarfeld: hell/dunkel abgesetzt wie im Spiel
export function drawSlot(ctx, x, y, w, h, s, selected, dim) {
  ctx.fillStyle = dim ? '#5a5a5a' : '#8b8b8b';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#373737';
  ctx.fillRect(x, y, w, s);
  ctx.fillRect(x, y, s, h);
  ctx.fillStyle = dim ? '#8a8a8a' : '#ffffff';
  ctx.fillRect(x, y + h - s, w, s);
  ctx.fillRect(x + w - s, y, s, h);
  if (selected) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2 * s;
    ctx.strokeRect(x - s, y - s, w + 2 * s, h + 2 * s);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = s;
    ctx.strokeRect(x - 2.5 * s, y - 2.5 * s, w + 5 * s, h + 5 * s);
  }
}

export function drawPanelBg(ctx, x, y, w, h) {
  ctx.fillStyle = '#c6c6c6';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, w, 2);
  ctx.fillStyle = '#555555';
  ctx.fillRect(x, y + h - 2, w, 2);
}

// Halbdurchsichtiges dunkles Feld (wie Chat/Tooltips)
export function drawTooltip(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(16,0,16,0.88)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#2b0b5c';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
}

export function hit(b, x, y) {
  return x >= b.x && y >= b.y && x < b.x + b.w && y < b.y + b.h;
}

export { drawText, textWidth, FONT_H };
