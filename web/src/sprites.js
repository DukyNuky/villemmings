// Villager-Bilder, Pixel für Pixel erzeugt. Ein Bild ist 32×44 Pixel groß,
// zwei Pixel je Geländepunkt; die Füße stehen bei (16, 40).

import { hex } from './textures.js';

export const SW = 32;
export const SH = 44;
export const AX = 16;
export const AY = 40;

class Pix {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = new Uint32Array(w * h);
  }
  px(x, y, c) {
    x = Math.round(x); y = Math.round(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.data[y * this.w + x] = c;
  }
  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c);
  }
  // Dicke Linie aus kleinen Quadraten
  line(x0, y0, x1, y1, c, thick = 1) {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n;
      this.rect(Math.round(x - (thick - 1) / 2), Math.round(y - (thick - 1) / 2), thick, thick, c);
    }
  }
}

const C = {
  skin: hex('#b58566'), skinDark: hex('#94604a'), skinLight: hex('#c99a7c'),
  nose: hex('#a06a50'), noseDark: hex('#8a5a42'), brow: hex('#3d2414'),
  eye: hex('#2f8a3b'), eyeWhite: hex('#ececec'),
  wood: hex('#6b4a26'), iron: hex('#d8d8d8'), ironDark: hex('#9a9a9a'),
  diamond: hex('#4fe0d6'), diamondDark: hex('#1f9f98'),
  plank: hex('#d6c58a'), plankDark: hex('#a8975e'),
  wingA: hex('#8f8fb5'), wingB: hex('#6d6d96'), wingC: hex('#b3b3d6'),
};

export const PROFESSION_LOOK = {
  farmer: { robe: '#7d5a33', dark: '#5e4224', hat: 'straw' },
  librarian: { robe: '#e3ded2', dark: '#b8b0a0', trim: '#a8322c' },
  cleric: { robe: '#7b3fa0', dark: '#5a2b78', trim: '#e2b33c' },
  smith: { robe: '#3f3f3f', dark: '#2a2a2a', apron: '#6b4a2e' },
  fisher: { robe: '#4f6f80', dark: '#3a5260', hat: 'fisher' },
  nitwit: { robe: '#3f7a2c', dark: '#2c5a1e' },
  shepherd: { robe: '#a99b86', dark: '#857862', hat: 'shepherd' },
  butcher: { robe: '#6b4b2e', dark: '#4e3620', apron: '#ececec', stain: '#a33a32' },
};

function look(prof) {
  const l = PROFESSION_LOOK[prof] ?? PROFESSION_LOOK.nitwit;
  return {
    robe: hex(l.robe), dark: hex(l.dark),
    trim: l.trim ? hex(l.trim) : null,
    apron: l.apron ? hex(l.apron) : null,
    stain: l.stain ? hex(l.stain) : null,
    hat: l.hat ?? null,
  };
}

// ----------------------------------------------------------- Bausteine

function headSide(p, L, dy = 0, dx = 0) {
  const x = AX - 4 + dx, y = AY - 32 + dy;
  p.rect(x, y, 8, 10, C.skin);
  p.rect(x, y, 8, 1, C.skinDark);
  p.rect(x, y, 1, 10, C.skinDark);
  p.rect(x + 7, y + 1, 1, 9, C.skinLight);
  p.rect(x + 5, y + 3, 3, 1, C.brow);
  p.px(x + 5, y + 4, C.eyeWhite);
  p.px(x + 6, y + 4, C.eye);
  p.rect(x + 8, y + 5, 2, 4, C.nose);
  p.px(x + 9, y + 8, C.noseDark);
  hat(p, L, x, y, false);
}

function headFront(p, L, dy = 0, dx = 0) {
  const x = AX - 4 + dx, y = AY - 32 + dy;
  p.rect(x, y, 8, 10, C.skin);
  p.rect(x, y, 8, 1, C.skinDark);
  p.rect(x + 1, y + 3, 6, 1, C.brow);
  p.px(x + 1, y + 4, C.eyeWhite); p.px(x + 2, y + 4, C.eye);
  p.px(x + 5, y + 4, C.eye); p.px(x + 6, y + 4, C.eyeWhite);
  p.rect(x + 3, y + 4, 2, 5, C.nose);
  p.rect(x + 3, y + 8, 2, 1, C.noseDark);
  hat(p, L, x, y, true);
}

function hat(p, L, x, y, front) {
  if (L.hat === 'straw') {
    const straw = hex('#d8b34a'), band = hex('#9a7a2a');
    p.rect(x - 3, y + 1, 14, 1, straw);
    p.rect(x, y - 2, 8, 3, straw);
    p.rect(x, y, 8, 1, band);
  } else if (L.hat === 'fisher') {
    const c = hex('#c9a96e'), d = hex('#8f7448');
    p.rect(x - 1, y - 1, 10, 2, c);
    p.rect(x - 1, y + 1, 10, 1, d);
  } else if (L.hat === 'shepherd') {
    const c = hex('#7a5a3a');
    p.rect(x - 2, y, 12, 1, c);
    p.rect(x + 1, y - 2, 6, 2, c);
  }
  if (front && L.trim) p.rect(x, y + 9, 8, 1, L.trim);
}

function robeSide(p, L, dy = 0) {
  const x = AX - 3, y = AY - 22 + dy;
  p.rect(x, y, 6, 17 - dy, L.robe);
  p.rect(x, y, 1, 17 - dy, L.dark);
  p.rect(x, AY - 6, 6, 1, L.dark);
  if (L.trim) p.rect(x + 5, y, 1, 17 - dy, L.trim);
  if (L.apron) {
    p.rect(x + 4, y + 3, 2, 12 - dy, L.apron);
    if (L.stain) { p.px(x + 5, y + 8, L.stain); p.px(x + 4, y + 10, L.stain); }
  }
}

function robeFront(p, L, dy = 0) {
  const x = AX - 4, y = AY - 22 + dy;
  p.rect(x, y, 8, 17 - dy, L.robe);
  p.rect(x, AY - 6, 8, 1, L.dark);
  p.rect(x + 3, y, 2, 17 - dy, L.dark);
  if (L.trim) { p.rect(x, y, 1, 17 - dy, L.trim); p.rect(x + 7, y, 1, 17 - dy, L.trim); }
  if (L.apron) {
    p.rect(x + 1, y + 3, 6, 12 - dy, L.apron);
    if (L.stain) { p.px(x + 2, y + 7, L.stain); p.px(x + 5, y + 9, L.stain); }
  }
}

function legsSide(p, L, phase) {
  // phase 0..7, Beine schwingen gegenläufig
  const swing = [0, 1, 2, 1, 0, -1, -2, -1][phase & 7];
  const back = hex('#3b2a1a'), front = hex('#4e3a26');
  p.rect(AX - 2 - swing, AY - 5, 3, 4, back);
  p.rect(AX - 2 - swing + (swing < 0 ? -1 : 0), AY - 1, 3, 1, back);
  p.rect(AX - 1 + swing, AY - 5, 3, 4, front);
  p.rect(AX - 1 + swing + (swing > 0 ? 1 : 0), AY - 1, 3, 1, front);
}

function legsFront(p) {
  const c = hex('#4e3a26');
  p.rect(AX - 3, AY - 5, 2, 5, c);
  p.rect(AX + 1, AY - 5, 2, 5, c);
}

function armsCrossed(p, L, dy = 0) {
  p.rect(AX + 2, AY - 19 + dy, 4, 4, L.dark);
  p.rect(AX + 3, AY - 18 + dy, 3, 2, C.skin);
}

// Arm vom Schulterpunkt in Richtung angle (Grad, 0 = vorn, 90 = unten)
function armTool(p, L, angle, tool, len = 6) {
  const sx = AX + 1, sy = AY - 20;
  const a = (angle * Math.PI) / 180;
  const ex = sx + Math.cos(a) * len, ey = sy + Math.sin(a) * len;
  p.line(sx, sy, ex, ey, L.dark, 3);
  p.rect(Math.round(ex - 1), Math.round(ey - 1), 2, 2, C.skin);
  if (!tool) return;
  const hx = ex + Math.cos(a) * 8, hy = ey + Math.sin(a) * 8;
  if (tool === 'plank') {
    p.rect(Math.round(ex), Math.round(ey) - 1, 6, 3, C.plank);
    p.rect(Math.round(ex), Math.round(ey) + 1, 6, 1, C.plankDark);
    return;
  }
  p.line(ex, ey, hx, hy, C.wood, 1);
  // Kopf quer zum Stiel
  const nx = -Math.sin(a), ny = Math.cos(a);
  if (tool === 'pickaxe') {
    for (let i = -4; i <= 4; i++) {
      const bend = Math.abs(i) * 0.35;
      p.px(hx + nx * i - Math.cos(a) * bend, hy + ny * i - Math.sin(a) * bend, Math.abs(i) > 2 ? C.diamondDark : C.diamond);
    }
  } else if (tool === 'axe') {
    for (let i = 0; i <= 4; i++) {
      for (let j = 0; j < 3; j++) {
        p.px(hx + nx * -i - Math.cos(a) * j, hy + ny * -i - Math.sin(a) * j, i > 2 ? C.ironDark : C.iron);
      }
    }
  } else if (tool === 'shovel') {
    for (let i = -1; i <= 1; i++) for (let j = 0; j < 4; j++) {
      p.px(hx + nx * i + Math.cos(a) * j, hy + ny * i + Math.sin(a) * j, j === 3 ? C.ironDark : C.iron);
    }
  }
}

function wings(p, phase) {
  const flap = phase % 2;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 12; i++) {
      const x = AX + side * (3 + i), y = AY - 24 - Math.round(i * (0.9 - flap * 0.25));
      p.rect(x, y, 1, 7 - Math.floor(i / 3), i % 3 === 0 ? C.wingB : C.wingA);
      p.px(x, y, C.wingC);
    }
  }
}

// ----------------------------------------------------------- Posen

const POSES = {
  walk: 8, fall: 2, climb: 4, hoist: 2, float: 2, block: 2, build: 4,
  bash: 4, mine: 4, dig: 4, ohno: 4, shrug: 2, stand: 1, exit: 4,
};
export const POSE_FRAMES = POSES;

function drawPose(p, L, pose, f) {
  switch (pose) {
    case 'stand':
      legsSide(p, L, 0); robeSide(p, L); headSide(p, L); armsCrossed(p, L);
      break;
    case 'walk': {
      const bob = f % 4 === 2 ? -1 : 0;
      legsSide(p, L, f); robeSide(p, L, bob); headSide(p, L, bob); armsCrossed(p, L, bob);
      break;
    }
    case 'exit':
      legsFront(p); robeFront(p, L);
      headFront(p, L, f % 2 ? -1 : 0);
      // Arme jubelnd hoch
      p.line(AX - 4, AY - 20, AX - 8, AY - 28 - (f % 2), L.dark, 3);
      p.line(AX + 3, AY - 20, AX + 7, AY - 28 - ((f + 1) % 2), L.dark, 3);
      p.rect(AX - 9, AY - 30 - (f % 2), 2, 2, C.skin);
      p.rect(AX + 7, AY - 30 - ((f + 1) % 2), 2, 2, C.skin);
      break;
    case 'fall': {
      legsSide(p, L, f ? 2 : 6); robeSide(p, L); headSide(p, L);
      const up = f ? -100 : -80;
      armTool(p, L, up, null, 8);
      armTool(p, L, up - 30, null, 7);
      break;
    }
    case 'float':
      wings(p, f);
      legsSide(p, L, 0); robeSide(p, L); headSide(p, L);
      armTool(p, L, -70, null, 7);
      break;
    case 'climb': {
      const o = [0, -1, -2, -1][f];
      p.rect(AX - 2, AY - 5 + o, 3, 4, hex('#3b2a1a'));
      p.rect(AX, AY - 7 - o, 3, 4, hex('#4e3a26'));
      robeSide(p, L); headSide(p, L);
      armTool(p, L, -60 - o * 10, null, 7);
      armTool(p, L, -30 + o * 10, null, 6);
      break;
    }
    case 'hoist':
      legsSide(p, L, f ? 3 : 1); robeSide(p, L, 1); headSide(p, L, 2, 1);
      armTool(p, L, f ? -10 : -40, null, 6);
      break;
    case 'block':
      legsFront(p); robeFront(p, L); headFront(p, L);
      for (const s of [-1, 1]) {
        const x = s < 0 ? AX - 12 : AX + 4;
        p.rect(x, AY - 21, 8, 3, L.dark);
        p.rect(s < 0 ? x - 1 : x + 8, AY - 22 + (f && s > 0 ? -1 : 0), 2, 3, C.skin);
      }
      break;
    case 'shrug':
      legsFront(p); robeFront(p, L); headFront(p, L, f ? -1 : 0);
      p.line(AX - 4, AY - 20, AX - 9, AY - 23, L.dark, 3);
      p.line(AX + 3, AY - 20, AX + 8, AY - 23, L.dark, 3);
      p.rect(AX - 11, AY - 25, 2, 2, C.skin);
      p.rect(AX + 9, AY - 25, 2, 2, C.skin);
      break;
    case 'ohno': {
      const s = [0, 1, 0, -1][f];
      legsFront(p); robeFront(p, L); headFront(p, L, 0, s);
      p.line(AX - 4, AY - 21, AX - 6, AY - 30, L.dark, 3);
      p.line(AX + 3, AY - 21, AX + 5, AY - 30, L.dark, 3);
      p.rect(AX - 6 + s, AY - 32, 2, 2, C.skin);
      p.rect(AX + 4 + s, AY - 32, 2, 2, C.skin);
      break;
    }
    case 'build': {
      const bend = f >= 2 ? 1 : 0;
      legsSide(p, L, 0); robeSide(p, L, bend); headSide(p, L, bend * 2, bend);
      armTool(p, L, [0, 30, 55, 30][f], 'plank', 6);
      break;
    }
    case 'bash':
      legsSide(p, L, f % 2 ? 1 : 7); robeSide(p, L); headSide(p, L);
      armTool(p, L, [-130, -70, -10, 30][f], 'axe', 6);
      break;
    case 'mine':
      legsSide(p, L, 0); robeSide(p, L, f > 1 ? 1 : 0); headSide(p, L, f > 1 ? 1 : 0);
      armTool(p, L, [-140, -80, -10, 40][f], 'pickaxe', 6);
      break;
    case 'dig': {
      const d = f % 2;
      legsSide(p, L, d ? 1 : 7); robeSide(p, L, d); headSide(p, L, d + 1, 1);
      armTool(p, L, [55, 75, 60, 80][f], 'shovel', 5);
      break;
    }
  }
}

export function villagerFrame(prof, pose, f, mirrored = false) {
  const p = new Pix(SW, SH);
  drawPose(p, look(prof), pose, f);
  if (!mirrored) return p.data;
  // Der Körper liegt symmetrisch um die Bildmitte, Spiegeln genügt
  const m = new Uint32Array(SW * SH);
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) m[y * SW + x] = p.data[y * SW + (SW - 1 - x)];
  return m;
}

export const PROFESSIONS = Object.keys(PROFESSION_LOOK);
export const POSE_LIST = Object.keys(POSES);
