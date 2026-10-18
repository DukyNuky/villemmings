// Selbst erzeugte 16×16-Texturen im Stil der bekannten Blöcke. Jede Textur
// ist ein Uint32Array (RGBA, little endian) für ImageData.

import { M } from './materials.js';

export const TEX = 16;

export function rgba(r, g, b, a = 255) {
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

export function hex(h, a = 255) {
  const n = parseInt(h.slice(1), 16);
  return rgba((n >> 16) & 255, (n >> 8) & 255, n & 255, a);
}

export function unpack(c) {
  return [c & 255, (c >> 8) & 255, (c >> 16) & 255, c >>> 24];
}

export function shade(c, f) {
  const [r, g, b, a] = unpack(c);
  const k = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return rgba(k(r), k(g), k(b), a);
}

function makeRng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

// Kachelbares, weiches Rauschen (Werte 0..1)
function smoothNoise(rnd, cells = 4) {
  const g = [];
  for (let i = 0; i < cells * cells; i++) g.push(rnd());
  const step = TEX / cells;
  return (x, y) => {
    const gx = x / step, gy = y / step;
    const x0 = Math.floor(gx), y0 = Math.floor(gy);
    const fx = gx - x0, fy = gy - y0;
    const at = (a, b) => g[((b % cells + cells) % cells) * cells + ((a % cells + cells) % cells)];
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const top = at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx;
    const bot = at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx;
    return top * (1 - sy) + bot * sy;
  };
}

function make(fn) {
  const t = new Uint32Array(TEX * TEX);
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) t[y * TEX + x] = fn(x, y);
  return t;
}

// Rauschen aus einer Palette, dunkel → hell sortiert
function noisy(seed, palette, opts = {}) {
  const rnd = makeRng(seed);
  const pal = palette.map((p) => hex(p));
  const sn = smoothNoise(rnd, opts.cells ?? 4);
  const blend = opts.blend ?? 0.55;
  return make((x, y) => {
    const v = sn(x, y) * blend + rnd() * (1 - blend);
    return pal[Math.min(pal.length - 1, Math.floor(v * pal.length))];
  });
}

function overlay(base, fn) {
  const t = base.slice();
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
    const c = fn(x, y, t[y * TEX + x]);
    if (c !== undefined) t[y * TEX + x] = c;
  }
  return t;
}

function ore(seed, colors) {
  const rnd = makeRng(seed);
  const pal = colors.map((c) => hex(c));
  const spots = [];
  for (let i = 0; i < 5; i++) spots.push([Math.floor(rnd() * 13) + 1, Math.floor(rnd() * 13) + 1]);
  return overlay(stone, (x, y, c) => {
    for (const [sx, sy] of spots) {
      const dx = x - sx, dy = y - sy;
      if (dx >= 0 && dx < 2 && dy >= 0 && dy < 2) return pal[(dx + dy + sx) % pal.length];
      if (dx === -1 && dy === 0 && (sx + sy) % 2) return pal[pal.length - 1];
      if (dx === 2 && dy === 1 && (sx + sy) % 3 === 0) return pal[0];
    }
    return c;
  });
}

function cells(seed, n, palette, edge) {
  // Pflastersteinartige Zellen (Voronoi, kachelbar)
  const rnd = makeRng(seed);
  const pts = [];
  for (let i = 0; i < n; i++) pts.push([rnd() * TEX, rnd() * TEX, Math.floor(rnd() * palette.length)]);
  const pal = palette.map((p) => hex(p));
  const edgeC = hex(edge);
  return make((x, y) => {
    let d1 = 1e9, d2 = 1e9, best = 0;
    for (const [px, py, ci] of pts) {
      for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
        const dx = x + 0.5 - (px + ox * TEX), dy = y + 0.5 - (py + oy * TEX);
        const d = dx * dx + dy * dy;
        if (d < d1) { d2 = d1; d1 = d; best = ci; } else if (d < d2) d2 = d;
      }
    }
    if (Math.sqrt(d2) - Math.sqrt(d1) < 1.1) return edgeC;
    const c = pal[best];
    return rnd() < 0.2 ? shade(c, 0.92) : c;
  });
}

function planks(seed, base, dark, light) {
  const rnd = makeRng(seed);
  const b = hex(base), d = hex(dark), l = hex(light);
  const seams = [3, 11, 7, 14];
  return make((x, y) => {
    const row = Math.floor(y / 4);
    if (y % 4 === 3) return d;
    if (x === seams[row]) return d;
    if (y % 4 === 0 && rnd() < 0.3) return l;
    const r = rnd();
    return r < 0.15 ? shade(b, 0.9) : r > 0.92 ? l : b;
  });
}

function bricksTex(seed, brick, brickDark, mortar, rowH = 4, w = 8) {
  const rnd = makeRng(seed);
  const b = hex(brick), bd = hex(brickDark), m = hex(mortar);
  return make((x, y) => {
    const row = Math.floor(y / rowH);
    const off = row % 2 ? w / 2 : 0;
    if (y % rowH === rowH - 1) return m;
    if ((x + off) % w === w - 1) return m;
    return rnd() < 0.25 ? bd : b;
  });
}

function bevel(t, light, dark) {
  const l = hex(light), d = hex(dark);
  return overlay(t, (x, y, c) => {
    if (x === 0 || y === 0) return l;
    if (x === TEX - 1 || y === TEX - 1) return d;
    return c;
  });
}

const stone = noisy(11, ['#686868', '#747474', '#7f7f7f', '#888888', '#949494'], { cells: 4, blend: 0.6 });

const dirt = noisy(12, ['#5d4130', '#79553a', '#866043', '#866043', '#966c4a', '#9b7653'], { blend: 0.35 });

function grassSide() {
  const rnd = makeRng(13);
  const greens = ['#4f8a26', '#5d9b2f', '#6aac39', '#79c04a'].map((c) => hex(c));
  const drip = [];
  for (let x = 0; x < TEX; x++) drip.push(2 + Math.floor(rnd() * 3) + (rnd() < 0.2 ? 1 : 0));
  return overlay(dirt, (x, y, c) => {
    if (y < drip[x]) return greens[Math.floor(rnd() * greens.length)];
    return c;
  });
}

const cobble = cells(14, 9, ['#7a7a7a', '#8c8c8c', '#6c6c6c', '#9a9a9a'], '#4a4a4a');

function buildAll() {
  const T = [];
  T[M.dirt] = dirt;
  T[M.grass] = grassSide();
  T[M.stone] = stone;
  T[M.cobble] = cobble;
  T[M.planks] = planks(15, '#a0824f', '#6e5531', '#b8975e');
  T[M.spruce] = planks(16, '#6b5030', '#3f2d19', '#7d5f3a');
  T[M.built] = planks(17, '#c8b77a', '#8f7f4f', '#ddd09a');
  {
    const rnd = makeRng(18);
    const cols = ['#5a4428', '#6b5232', '#7a5f3a', '#4c3920'].map((c) => hex(c));
    const stripe = [];
    for (let x = 0; x < TEX; x++) stripe.push(Math.floor(rnd() * 3));
    T[M.log] = make((x, y) => (rnd() < 0.12 ? cols[3] : cols[(stripe[x] + (rnd() < 0.15 ? 1 : 0)) % 3]));
  }
  T[M.leaves] = overlay(noisy(19, ['#2b5c12', '#3b7a1a', '#4a8f26', '#5aa534'], { blend: 0.3 }), (x, y, c) => {
    return (x * 7 + y * 13) % 11 === 0 ? hex('#1f4a0b') : c;
  });
  T[M.sand] = noisy(20, ['#c9bf87', '#d4cb93', '#dbd3a0', '#e3dcae'], { blend: 0.3 });
  {
    const base = noisy(21, ['#d0c492', '#d8cb9b', '#e0d5a8'], { blend: 0.5 });
    T[M.sandstone] = overlay(base, (x, y, c) => (y === 4 || y === 11 ? hex('#bfb27f') : y < 2 ? hex('#e6dcb2') : c));
  }
  T[M.gravel] = noisy(22, ['#5e5a57', '#6d6865', '#857f7c', '#9a9390', '#a7a19e'], { cells: 8, blend: 0.2 });
  T[M.bricks] = bricksTex(23, '#966356', '#7f4f43', '#b5aaa0');
  {
    const b = bricksTex(24, '#7a7a7a', '#6e6e6e', '#5a5a5a', 8, 16);
    T[M.stonebricks] = overlay(b, (x, y, c) => {
      const row = Math.floor(y / 8);
      const off = row % 2 ? 8 : 0;
      const lx = (x + off) % 16, ly = y % 8;
      if (c === hex('#5a5a5a')) return c;
      if (ly === 0 || lx === 0) return hex('#8f8f8f');
      return c;
    });
  }
  T[M.mossy] = overlay(cobble, (x, y, c) => (((x * 3 + y * 5) % 7 < 2 && y > 3) ? hex((x + y) % 2 ? '#5b7a32' : '#4a6a28') : c));
  T[M.obsidian] = overlay(noisy(25, ['#0e0c14', '#14121d', '#1d1a29', '#241f33'], { blend: 0.5 }), (x, y, c) => {
    return (x * 11 + y * 7) % 23 === 0 ? hex('#4b3270') : c;
  });
  T[M.bedrock] = noisy(26, ['#1f1f1f', '#333333', '#575757', '#7a7a7a'], { cells: 8, blend: 0.4 });
  T[M.ironblock] = bevel(noisy(27, ['#c6c6c6', '#d2d2d2', '#dcdcdc'], { blend: 0.3 }), '#f0f0f0', '#8f8f8f');
  T[M.netherrack] = noisy(28, ['#4f2222', '#5e2b2b', '#6f3535', '#7d3d3d', '#8a4646'], { cells: 8, blend: 0.35 });
  T[M.netherbricks] = bricksTex(29, '#2c161a', '#3a1d22', '#160b0e', 4, 8);
  T[M.quartz] = bevel(noisy(30, ['#e2dbd2', '#ece6df', '#f5f1ea'], { blend: 0.5 }), '#fbf8f3', '#cfc6ba');
  T[M.glowstone] = noisy(31, ['#8f6a32', '#d4a54b', '#ffda74', '#fff1b0'], { cells: 8, blend: 0.45 });
  T[M.soulsand] = overlay(noisy(32, ['#3f2f25', '#513e32', '#5f4a3c'], { blend: 0.4 }), (x, y, c) => {
    const fx = x % 8, fy = y % 8;
    return (fy === 2 && (fx === 2 || fx === 5)) || (fy === 5 && fx >= 3 && fx <= 4) ? hex('#2a1e17') : c;
  });
  T[M.blackstone] = noisy(33, ['#1f1a1e', '#2a2328', '#3a3237'], { blend: 0.4 });
  T[M.endstone] = overlay(noisy(34, ['#c9cc8a', '#dbde9e', '#e4e7ad'], { blend: 0.4 }), (x, y, c) => {
    return (x * 5 + y * 3) % 13 === 0 ? hex('#b8bb7c') : c;
  });
  T[M.endbricks] = bricksTex(35, '#e0e3a8', '#d2d597', '#bfc286', 8, 8);
  {
    const base = noisy(36, ['#9d6f9d', '#a77ba7', '#b285b2'], { blend: 0.4 });
    T[M.purpur] = overlay(base, (x, y, c) => {
      const lx = x % 8, ly = y % 8;
      if (lx === 7 || ly === 7) return hex('#7f5a7f');
      if (lx === 0 || ly === 0) return hex('#c39ac3');
      return c;
    });
  }
  T[M.deepslate] = noisy(37, ['#36363a', '#3f3f42', '#4d4d50', '#5a5a5e'], { cells: 8, blend: 0.3 });
  T[M.goldblock] = bevel(noisy(38, ['#dba213', '#f9d849', '#fcee4b'], { blend: 0.4 }), '#fffbb0', '#a87b0c');
  T[M.coalore] = ore(40, ['#1a1a1a', '#2b2b2b', '#444444']);
  T[M.ironore] = ore(41, ['#af8e77', '#d8af93', '#e8c8b0']);
  T[M.goldore] = ore(42, ['#c9a10f', '#fcee4b', '#fff9a6']);
  T[M.diamondore] = ore(43, ['#1fa0a8', '#5decf5', '#d2fffc']);
  T[M.redstoneore] = ore(44, ['#7a0000', '#d40000', '#ff4a4a']);
  T[M.emeraldore] = ore(45, ['#0a8f3c', '#17dd62', '#87ffb5']);
  T[M.glass] = make((x, y) => {
    if (x === 0 || y === 0 || x === 15 || y === 15) return hex('#d9eef2');
    if ((x === y + 3 && x < 8) || (x === y + 4 && x < 7) || (x === 12 && y > 9 && y < 13)) return hex('#ffffff', 200);
    return 0;
  });
  T[M.snow] = noisy(46, ['#e4f2f2', '#f0fbfb', '#ffffff'], { blend: 0.4 });
  T[M.ice] = noisy(47, ['#7aa3ef', '#8db4fa', '#a5c3fb'], { blend: 0.6 });
  {
    const rnd = makeRng(48);
    const y1 = hex('#a88c1c'), y2 = hex('#c2a52a'), y3 = hex('#8a7016'), band = hex('#6e4f12');
    T[M.hay] = make((x, y) => (y === 2 || y === 3 || y === 12 || y === 13 ? band : [y1, y2, y3][Math.floor(rnd() * 3)]));
  }
  T[M.wool] = noisy(49, ['#d8dcdc', '#e9ecec', '#f5f7f7'], { cells: 8, blend: 0.3 });
  T[M.onewayRight] = arrowTex(1);
  T[M.onewayLeft] = arrowTex(-1);
  return T;
}

// Glasierte Keramik mit großem Pfeil: Einbahnwand
function arrowTex(dir) {
  const bg = hex('#b9409f'), bg2 = hex('#cf5bb6'), arrow = hex('#fff2a8'), outline = hex('#5e1a4f');
  const inArrow = (x, y) => {
    if (x >= 2 && x <= 8 && y >= 6 && y <= 9) return true;
    const d = x - 8;
    return d >= 0 && d <= 5 && Math.abs(y - 7.5) <= 5.5 - d;
  };
  return make((x0, y) => {
    const x = dir > 0 ? x0 : 15 - x0;
    if (inArrow(x, y)) return arrow;
    if (inArrow(x - 1, y) || inArrow(x + 1, y) || inArrow(x, y - 1) || inArrow(x, y + 1)) return outline;
    if (x === 0 || y === 0 || x === 15 || y === 15) return outline;
    return (x * 3 + y) % 7 === 0 ? bg2 : bg;
  });
}

let cached = null;

export function getTextures() {
  if (!cached) cached = buildAll();
  return cached;
}

// Durchschnittsfarbe (für Krümel, Minikarte)
export function averageColor(mat) {
  const t = getTextures()[mat];
  if (!t) return [128, 128, 128];
  let r = 0, g = 0, b = 0, n = 0;
  for (const c of t) {
    if ((c >>> 24) < 128) continue;
    const [cr, cg, cb] = unpack(c);
    r += cr; g += cg; b += cb; n++;
  }
  if (!n) return [200, 220, 230];
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

export { makeRng };
