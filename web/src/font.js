// Pixelschrift im Stil der Klötzchenwelt: 8 Zeilen je Zeichen, Grundlinie
// in Zeile 6, Unterlängen in Zeile 7. "x" = Pixel gesetzt.

const G = {
  A: '.xxx. x...x x...x xxxxx x...x x...x x...x .....',
  B: 'xxxx. x...x xxxx. x...x x...x x...x xxxx. .....',
  C: '.xxx. x...x x.... x.... x.... x...x .xxx. .....',
  D: 'xxxx. x...x x...x x...x x...x x...x xxxx. .....',
  E: 'xxxxx x.... xxx.. x.... x.... x.... xxxxx .....',
  F: 'xxxxx x.... xxx.. x.... x.... x.... x.... .....',
  G: '.xxxx x.... x..xx x...x x...x x...x .xxx. .....',
  H: 'x...x x...x xxxxx x...x x...x x...x x...x .....',
  I: 'xxx .x. .x. .x. .x. .x. xxx ...',
  J: '....x ....x ....x ....x ....x x...x .xxx. .....',
  K: 'x...x x..x. xxx.. x..x. x...x x...x x...x .....',
  L: 'x.... x.... x.... x.... x.... x.... xxxxx .....',
  M: 'x...x xx.xx x.x.x x...x x...x x...x x...x .....',
  N: 'x...x xx..x x.x.x x..xx x...x x...x x...x .....',
  O: '.xxx. x...x x...x x...x x...x x...x .xxx. .....',
  P: 'xxxx. x...x xxxx. x.... x.... x.... x.... .....',
  Q: '.xxx. x...x x...x x...x x...x x..x. .xx.x .....',
  R: 'xxxx. x...x xxxx. x...x x...x x...x x...x .....',
  S: '.xxxx x.... .xxx. ....x ....x x...x .xxx. .....',
  T: 'xxxxx ..x.. ..x.. ..x.. ..x.. ..x.. ..x.. .....',
  U: 'x...x x...x x...x x...x x...x x...x .xxx. .....',
  V: 'x...x x...x x...x x...x .x.x. .x.x. ..x.. .....',
  W: 'x...x x...x x...x x...x x.x.x xx.xx x...x .....',
  X: 'x...x .x.x. ..x.. .x.x. x...x x...x x...x .....',
  Y: 'x...x .x.x. ..x.. ..x.. ..x.. ..x.. ..x.. .....',
  Z: 'xxxxx ....x ...x. ..x.. .x... x.... xxxxx .....',
  a: '..... ..... .xxx. ....x .xxxx x...x .xxxx .....',
  b: 'x.... x.... x.xx. xx..x x...x x...x xxxx. .....',
  c: '..... ..... .xxx. x...x x.... x...x .xxx. .....',
  d: '....x ....x .xx.x x..xx x...x x...x .xxxx .....',
  e: '..... ..... .xxx. x...x xxxxx x.... .xxxx .....',
  f: '..xx .x.. xxxx .x.. .x.. .x.. .x.. ....',
  g: '..... ..... .xxxx x...x x...x .xxxx ....x xxxx.',
  h: 'x.... x.... x.xx. xx..x x...x x...x x...x .....',
  i: 'x . x x x x x .',
  j: '...x .... ...x ...x ...x ...x x..x .xx.',
  k: 'x... x... x..x x.x. xx.. x.x. x..x ....',
  l: 'x. x. x. x. x. x. .x ..',
  m: '..... ..... xx.x. x.x.x x.x.x x...x x...x .....',
  n: '..... ..... xxxx. x...x x...x x...x x...x .....',
  o: '..... ..... .xxx. x...x x...x x...x .xxx. .....',
  p: '..... ..... x.xx. xx..x x...x xxxx. x.... x....',
  q: '..... ..... .xx.x x..xx x...x .xxxx ....x ....x',
  r: '..... ..... x.xx. xx..x x.... x.... x.... .....',
  s: '..... ..... .xxxx x.... .xxx. ....x xxxx. .....',
  t: '.x.. .x.. xxxx .x.. .x.. .x.. ..xx ....',
  u: '..... ..... x...x x...x x...x x...x .xxxx .....',
  v: '..... ..... x...x x...x x...x .x.x. ..x.. .....',
  w: '..... ..... x...x x...x x.x.x x.x.x .xxxx .....',
  x: '..... ..... x...x .x.x. ..x.. .x.x. x...x .....',
  y: '..... ..... x...x x...x x...x .xxxx ....x xxxx.',
  z: '..... ..... xxxxx ...x. ..x.. .x... xxxxx .....',
  0: '.xxx. x...x x..xx x.x.x xx..x x...x .xxx. .....',
  1: '..x.. .xx.. ..x.. ..x.. ..x.. ..x.. xxxxx .....',
  2: '.xxx. x...x ....x ..xx. .x... x...x xxxxx .....',
  3: '.xxx. x...x ....x ..xx. ....x x...x .xxx. .....',
  4: '...xx ..x.x .x..x x...x xxxxx ....x ....x .....',
  5: 'xxxxx x.... xxxx. ....x ....x x...x .xxx. .....',
  6: '..xx. .x... x.... xxxx. x...x x...x .xxx. .....',
  7: 'xxxxx x...x ....x ...x. ..x.. ..x.. ..x.. .....',
  8: '.xxx. x...x x...x .xxx. x...x x...x .xxx. .....',
  9: '.xxx. x...x x...x .xxxx ....x ...x. .xx.. .....',
  ' ': '... ... ... ... ... ... ... ...',
  '.': '. . . . . . x .',
  ',': '. . . . . . x x',
  ':': '. . x . . . x .',
  ';': '. . x . . . x x',
  '!': 'x x x x x . x .',
  '?': '.xxx. x...x ....x ...x. ..x.. ..... ..x.. .....',
  '-': '..... ..... ..... xxxxx ..... ..... ..... .....',
  '+': '..... ..x.. ..x.. xxxxx ..x.. ..x.. ..... .....',
  '=': '..... ..... xxxxx ..... xxxxx ..... ..... .....',
  '/': '....x ...x. ...x. ..x.. .x... .x... x.... .....',
  '%': 'x...x x..x. ...x. ..x.. .x... .x..x x...x .....',
  '(': '..x .x. x.. x.. x.. .x. ..x ...',
  ')': 'x.. .x. ..x ..x ..x .x. x.. ...',
  "'": 'x x . . . . . .',
  '"': 'x.x x.x ... ... ... ... ... ...',
  '>': 'x... .x.. ..x. ...x ..x. .x.. x... ....',
  '<': '...x ..x. .x.. x... .x.. ..x. ...x ....',
  '·': '. . . x . . . .',
  '…': '..... ..... ..... ..... ..... ..... x.x.x .....',
  '×': '..... ..... x...x .x.x. ..x.. .x.x. x...x .....',
  '#': '.x.x. .x.x. xxxxx .x.x. xxxxx .x.x. .x.x. .....',
  '&': '.xx.. x..x. .xx.. .x... x.x.x x..x. .xx.x .....',
  Ä: 'x...x .xxx. x...x xxxxx x...x x...x x...x .....',
  Ö: 'x...x .xxx. x...x x...x x...x x...x .xxx. .....',
  Ü: 'x...x ..... x...x x...x x...x x...x .xxx. .....',
  ä: '..... .x.x. .xxx. ....x .xxxx x...x .xxxx .....',
  ö: '..... .x.x. .xxx. x...x x...x x...x .xxx. .....',
  ü: '..... .x.x. x...x x...x x...x x...x .xxxx .....',
  ß: '.xxx. x...x x..x. x.xx. x...x x...x x.xx. x....',
  '–': '..... ..... ..... xxxxx ..... ..... ..... .....',
};

export const FONT_H = 8;
const glyphs = {};
for (const [ch, s] of Object.entries(G)) {
  const rows = s.split(' ');
  glyphs[ch] = { w: rows[0].length, rows };
}

export function glyph(ch) {
  return glyphs[ch] ?? glyphs[ch.toUpperCase?.()] ?? glyphs['?'];
}

// Breite in Schriftpixeln (1 Pixel Abstand zwischen Zeichen)
export function textWidth(str) {
  let w = 0;
  for (const ch of str) w += glyph(ch).w + 1;
  return Math.max(0, w - 1);
}

const atlasCache = new Map();

// Weiße Zeichen auf einer Leinwand, wird pro Farbe eingefärbt zwischengespeichert
function atlas(color) {
  let a = atlasCache.get(color);
  if (a) return a;
  const chars = Object.keys(glyphs);
  let w = 0;
  const pos = {};
  for (const ch of chars) { pos[ch] = w; w += glyphs[ch].w + 1; }
  const c = document.createElement('canvas');
  c.width = w;
  c.height = FONT_H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = color;
  for (const ch of chars) {
    const g = glyphs[ch];
    g.rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) if (row[x] === 'x') ctx.fillRect(pos[ch] + x, y, 1, 1);
    });
  }
  a = { canvas: c, pos };
  atlasCache.set(color, a);
  return a;
}

function shadowOf(color) {
  // Schatten wie im Original: dieselbe Farbe, auf ein Viertel abgedunkelt
  const m = /^#([0-9a-f]{6})$/i.exec(color);
  if (!m) return '#202020';
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) >> 2, g = ((n >> 8) & 255) >> 2, b = (n & 255) >> 2;
  return `rgb(${r},${g},${b})`;
}

// Zeichnet Text; x/y oben links, scale = Bildschirmpixel je Schriftpixel
export function drawText(ctx, str, x, y, scale = 2, color = '#ffffff', opts = {}) {
  const align = opts.align ?? 'left';
  const w = textWidth(str) * scale;
  if (align === 'center') x -= w / 2;
  else if (align === 'right') x -= w;
  x = Math.round(x);
  y = Math.round(y);
  if (opts.shadow !== false) drawRaw(ctx, str, x + scale, y + scale, scale, opts.shadowColor ?? shadowOf(color));
  drawRaw(ctx, str, x, y, scale, color);
  return w;
}

function drawRaw(ctx, str, x, y, scale, color) {
  const a = atlas(color);
  const smooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  let cx = x;
  for (const ch of str) {
    const g = glyph(ch);
    const key = glyphs[ch] ? ch : glyphs[ch.toUpperCase?.()] ? ch.toUpperCase() : '?';
    ctx.drawImage(a.canvas, a.pos[key], 0, g.w, FONT_H, cx, y, g.w * scale, FONT_H * scale);
    cx += (g.w + 1) * scale;
  }
  ctx.imageSmoothingEnabled = smooth;
}

// Bricht Text an Leerzeichen um; Breite in Bildschirmpixeln
export function wrapText(str, maxWidth, scale) {
  const lines = [];
  for (const para of str.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const test = line ? line + ' ' + word : word;
      if (textWidth(test) * scale > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    lines.push(line);
  }
  return lines;
}
