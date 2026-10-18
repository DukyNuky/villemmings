// Zeichnet Stil-Entwürfe derselben Spielszene als PNG nach docs/entwuerfe/.
//   node tools/entwuerfe.mjs
// Stil A (der aktuelle Stand) kommt als echtes Bildschirmfoto aus tools/shot.mjs.

import { mkdirSync } from 'node:fs';
import { writePng } from './png.mjs';
import { Game } from '../web/src/sim.js';
import { WORLDS } from '../web/src/levels.js';
import { SOLUTIONS, pickTarget } from './solutions.js';
import { getTextures, TEX, hex, shade, unpack, rgba } from '../web/src/textures.js';
import { villagerFrame, SW, SH, AX, AY } from '../web/src/sprites.js';
import { ICONS, ICON_PALETTE } from '../web/src/icons.js';
import { glyph, FONT_H } from '../web/src/font.js';
import { AIR } from '../web/src/materials.js';
import { BLOCK, LIQUID_WATER, LIQUID_LAVA } from '../web/src/terrain.js';
import { SKILLS } from '../web/src/level.js';

const OUT = 'docs/entwuerfe';
mkdirSync(OUT, { recursive: true });

// ------------------------------------------------------------ Rasterbild

class Img {
  constructor(w, h, bg = 0) {
    this.w = w; this.h = h;
    this.d = new Uint32Array(w * h).fill(bg);
  }
  set(x, y, c) {
    if (!(c >>> 24) || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.d[y * this.w + x] = c;
  }
  get(x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : this.d[y * this.w + x]; }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
  blit(src, sw, sh, dx, dy, flip = false) {
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      this.set(dx + x, dy + y, src[y * sw + (flip ? sw - 1 - x : x)]);
    }
  }
  scaled(k) {
    const o = new Img(this.w * k, this.h * k);
    for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) o.d[y * o.w + x] = this.d[Math.floor(y / k) * this.w + Math.floor(x / k)];
    return o;
  }
  text(str, x, y, color, scale = 1, shadow = null) {
    if (shadow) this.text(str, x + scale, y + scale, shadow, scale);
    let cx = x;
    for (const ch of str) {
      const g = glyph(ch);
      g.rows.forEach((row, j) => {
        for (let i = 0; i < row.length; i++) if (row[i] === 'x') this.rect(cx + i * scale, y + j * scale, scale, scale, color);
      });
      cx += (g.w + 1) * scale;
    }
    return cx - x;
  }
  save(name) {
    writePng(`${OUT}/${name}`, this.w, this.h, new Uint8Array(this.d.buffer));
    console.log(`${OUT}/${name}`);
  }
}

const textW = (str, scale = 1) => [...str].reduce((w, ch) => w + (glyph(ch).w + 1) * scale, 0) - scale;

// Farbe auf 12 Bit runden wie beim Amiga
const amiga = (c) => {
  const [r, g, b, a] = unpack(c);
  const q = (v) => Math.round(v / 17) * 17;
  return rgba(q(r), q(g), q(b), a);
};

// ------------------------------------------------------------ Szene

const KEY = 'oberwelt-8';
const def = WORLDS[0].levels[7];
const game = new Game(def);
const actions = SOLUTIONS[KEY].map((a) => ({ ...a }));
while (game.tick < 30 * 25) {
  for (const a of actions) {
    if (a.done || (a.tick !== undefined && game.tick < a.tick)) continue;
    if (a.after !== undefined && !actions[a.after].done) continue;
    const v = pickTarget(game, a, actions);
    if (v && game.assign(v, a.skill)) { a.done = true; a.chosen = v.id; }
  }
  game.step();
  game.events.length = 0;
}
const T = game.terrain;
const VIEW = { x: 20, y: 40, w: 320, h: 168 };

// ------------------------------------------------------------ Stil B: Retro 1991

const R = {
  '.': 0, S: hex('#a0684a'), s: hex('#d89c70'), n: hex('#b06040'), b: hex('#301808'),
  e: hex('#40c040'), R: hex('#8a5a30'), D: hex('#5a3818'), L: hex('#302010'),
  H: hex('#e8c848'), p: hex('#f0e0a0'), i: hex('#e0e0e0'), t: hex('#906830'),
  W: hex('#b0b0e0'), w: hex('#f0f0f0'), k: hex('#101010'), T: hex('#e02020'),
};
const HEAD = ['..SSSS..', '.Sssss..', '.Ssbbbb.', '.Ssssens', '.Sssssnn', '..Ssss..'];
const BODY = ['..DRRR..', '.DRRRRR.', '.DRRssR.', '.DRRRRR.', '.DRRRR..', '.DRRRR..', '..DRRR..', '..DRRR..'];
const RETRO = {
  walk: [
    [...HEAD, ...BODY, '..L..L..', '.L....L.'],
    [...HEAD, ...BODY, '..L.L...', '..L.L...'],
    [...HEAD, ...BODY, '...LL...', '...LL...'],
    [...HEAD, ...BODY, '...L.L..', '..L..L..'],
  ],
  fall: [['.s....s.', '.s.SS.s.', '.sSsssS.', '.Ssbbbb.', '.Ssssens', '.Sssssnn', '..Ssss..',
    '..DRRR..', '.DRRRRR.', '.DRRRRR.', '.DRRRR..', '.DRRRR..', '..DRRR..', '..DRRR..', '..L..L..', '..L..L..']],
  build: [[...HEAD, '..DRRR..', '.DRRRRR.', '.DRRRssp', '.DRRRRpp', '.DRRRR..', '.DRRRR..', '..DRRR..', '..DRRR..', '..L..L..', '..L..L..']],
  block: [['....SSSS....', '...Sssss....', '...sbbbbs...', '...wesseb...', '....snns....', '....Ssss....',
    '...DRRRRD...', 'ssRRRRRRRRss', '...DRRRRD...', '...DRRRRD...', '...DRRRRD...', '...DRRRRD...',
    '...DRRRRD...', '....DRRD....', '....L..L....', '....L..L....']],
  float: [['W..........W', 'WW........WW', '.WW.SSSS.WW.', '..WSsssss W.', '...Ssbbbb...', '...Ssssens..',
    '...Sssssnn..', '....Ssss....', '....DRRR....', '...DRRRRR...', '...DRRssR...', '...DRRRRR...',
    '...DRRRR....', '....DRRR....', '....L..L....', '....L..L....']],
};

function retroSprite(pose, frame) {
  const rows = RETRO[pose][frame % RETRO[pose].length];
  const w = rows[0].length;
  return { w, h: rows.length, data: Uint32Array.from(rows.join(''), (ch) => R[ch] ?? 0) };
}

function retroPose(v) {
  switch (v.state) {
    case 'faller': return ['fall', 0];
    case 'builder': case 'shrugger': return ['build', 0];
    case 'blocker': return ['block', 0];
    case 'floater': return ['float', 0];
    default: return ['walk', v.anim >> 1];
  }
}

function texture8(mat) {
  // 16×16-Textur auf 8×8 verkleinern und auf Amiga-Farben runden
  const t = getTextures()[mat];
  const o = new Uint32Array(64);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const [cr, cg, cb, ca] = unpack(t[(y * 2 + dy) * 16 + x * 2 + dx]);
      r += cr; g += cg; b += cb; a += ca;
    }
    o[y * 8 + x] = amiga(rgba(r >> 2, g >> 2, b >> 2, a >> 2));
  }
  return o;
}

function drawRetro() {
  const PANEL = 32;
  const img = new Img(VIEW.w, VIEW.h + PANEL, hex('#000000'));
  const tex = new Map();
  for (let y = 0; y < VIEW.h; y++) for (let x = 0; x < VIEW.w; x++) {
    const wx = VIEW.x + x, wy = VIEW.y + y;
    const m = T.get(wx, wy);
    if (m !== AIR) {
      if (!tex.has(m)) tex.set(m, texture8(m));
      img.set(x, y, tex.get(m)[(wy % 8) * 8 + (wx % 8)]);
    } else if (T.liquidAt(wx, wy) === LIQUID_WATER) {
      img.set(x, y, (wx + wy * 3 + Math.floor(wy / 2)) % 7 === 0 ? hex('#6688ff') : hex('#2244cc'));
    } else if (T.liquidAt(wx, wy) === LIQUID_LAVA) {
      img.set(x, y, (wx + wy) % 5 === 0 ? hex('#ffcc00') : hex('#ee5500'));
    }
  }
  // Falltür und Haus in groben Pixeln
  for (const e of game.entrances) {
    const x = e.bx * BLOCK - VIEW.x, y = e.by * BLOCK - VIEW.y;
    img.rect(x - 2, y - 4, 20, 3, hex('#885522'));
    img.rect(x - 2, y - 1, 2, 9, hex('#663311'));
    img.rect(x + 16, y - 1, 2, 9, hex('#663311'));
    img.rect(x, y - 1, 16, 7, hex('#221100'));
    img.rect(x, y + 6, 2, 6, hex('#aa7744'));
    img.rect(x + 14, y + 6, 2, 6, hex('#aa7744'));
  }
  for (const v of game.villagers) {
    if (v.gone) continue;
    const [pose, f] = retroPose(v);
    const s = retroSprite(pose, f);
    const x = v.x - VIEW.x - Math.floor(s.w / 2), y = v.y - VIEW.y - s.h;
    img.blit(s.data, s.w, s.h, x, y, v.dir < 0 && pose !== 'block' && pose !== 'float');
    if (v.bomb >= 0) img.text(String(Math.ceil(v.bomb / 25)), v.x - VIEW.x - 2, y - 9, hex('#ffffff'));
  }
  // Leiste wie früher: Zahlen über den Feldern, grüne Statuszeile
  const py = VIEW.h;
  img.rect(0, py, VIEW.w, PANEL, hex('#000000'));
  const status = `RAUS ${game.villagers.filter((v) => !v.gone).length}   DRIN ${game.savedPercent}%   ZEIT ${Math.floor(game.timeLeft / 1500)}-${String(Math.floor(game.timeLeft / 25) % 60).padStart(2, '0')}`;
  img.text('BAUER 1', 2, py + 1, hex('#00ee00'));
  img.text(status, VIEW.w - textW(status) - 2, py + 1, hex('#00ee00'));
  const slots = ['minus', 'plus', ...SKILLS, 'pause', 'nuke'];
  const counts = { minus: game.minRate, plus: game.rate, ...game.skills };
  const sw = 18;
  slots.forEach((name, i) => {
    const x = 2 + i * (sw + 1), y = py + 11;
    img.rect(x, y, sw, 20, name === 'builder' ? hex('#ffffff') : hex('#444466'));
    img.rect(x + 1, y + 1, sw - 2, 18, name === 'builder' ? hex('#666699') : hex('#222244'));
    if (counts[name] !== undefined && counts[name] > 0) {
      const n = String(counts[name]);
      img.text(n, x + (sw - textW(n)) / 2, y + 2, hex('#ffffff'));
    }
    // Symbol auf 8×8 verkleinert
    const rows = ICONS[name];
    for (let j = 0; j < 8; j++) for (let k = 0; k < 8; k++) {
      const ch = rows[j * 2][k * 2] !== '.' ? rows[j * 2][k * 2] : rows[j * 2 + 1][k * 2 + 1];
      const col = ICON_PALETTE[ch];
      if (col) img.set(x + 5 + k, y + 10 + j, amiga(hex(col)));
    }
  });
  // Minikarte
  const mx = 2 + slots.length * (sw + 1) + 2, mw = VIEW.w - mx - 2;
  img.rect(mx, py + 11, mw, 20, hex('#000000'));
  for (let y = 0; y < 20; y++) for (let x = 0; x < mw; x++) {
    if (T.solid(Math.floor((x / mw) * T.w), Math.floor((y / 20) * T.h))) img.set(mx + x, py + 11 + y, hex('#00aa00'));
  }
  for (const v of game.villagers) if (!v.gone) img.set(mx + Math.floor((v.x / T.w) * mw), py + 11 + Math.floor(((v.y - 8) / T.h) * 20), hex('#ffff00'));
  img.scaled(3).save('stil-b-retro.png');
}

// ------------------------------------------------------------ Stil C: 16-Bit mit Konturen

function outlined(data, w, h) {
  const out = new Uint32Array(w * h);
  const black = hex('#101010');
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = data[y * w + x];
    if (c >>> 24) { out[y * w + x] = c; continue; }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && data[ny * w + nx] >>> 24) { out[y * w + x] = black; break; }
    }
  }
  return out;
}

function draw16bit() {
  const S = 2, PANEL = 36;
  const W = VIEW.w * S, H = VIEW.h * S;
  const img = new Img(W, H + PANEL);
  // Himmel mit Farbstufen und Rasterübergang
  const sky = ['#3858d8', '#4870e8', '#6090f0', '#80b0f8', '#a8d0ff'].map((c) => hex(c));
  for (let y = 0; y < H; y++) {
    const f = (y / H) * (sky.length - 1);
    const i = Math.floor(f), frac = f - i;
    for (let x = 0; x < W; x++) {
      const dither = ((x + y) % 2 === 0 ? 0.25 : 0.75) < frac;
      img.d[y * W + x] = sky[Math.min(sky.length - 1, i + (dither ? 1 : 0))];
    }
  }
  // Wolken und ferne Hügel
  const cloud = hex('#ffffff'), cloudShade = hex('#d8e8ff');
  for (const [cx, cy, cw] of [[60, 40, 70], [300, 24, 90], [520, 56, 60]]) {
    for (let k = 0; k < cw; k++) {
      const hh = Math.round(Math.sin((k / cw) * Math.PI) * 14);
      img.rect(cx + k, cy - hh, 1, hh, cloud);
      img.rect(cx + k, cy, 1, 3, cloudShade);
    }
  }
  for (let x = 0; x < W; x++) {
    const hh = 40 + Math.round(Math.sin(x / 37) * 12 + Math.sin(x / 13) * 4);
    img.rect(x, 230 - hh, 1, hh, hex('#5c9c5c'));
    img.rect(x, 230 - hh, 1, 2, hex('#7cc07c'));
  }
  const tex = getTextures();
  const outline = hex('#1a1208');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const wx = VIEW.x + Math.floor(x / S), wy = VIEW.y + Math.floor(y / S);
    const m = T.get(wx, wy);
    if (m === AIR) {
      // Kontur auf der Luftseite
      if (T.get(wx + 1, wy) || T.get(wx - 1, wy) || T.get(wx, wy + 1) || T.get(wx, wy - 1)) {
        const near = (dx, dy) => T.get(VIEW.x + Math.floor((x + dx) / S), VIEW.y + Math.floor((y + dy) / S)) !== AIR;
        if (near(1, 0) || near(-1, 0) || near(0, 1) || near(0, -1)) img.d[y * W + x] = outline;
      }
      const l = T.liquidAt(wx, wy);
      if (l === LIQUID_WATER) img.d[y * W + x] = (x + y) % 2 ? hex('#3060e0') : hex('#2850c8');
      if (l === LIQUID_LAVA) img.d[y * W + x] = hex('#f06010');
      continue;
    }
    let c = tex[m][((wy * S + (y % S)) % TEX) * TEX + ((wx * S + (x % S)) % TEX)];
    if (T.get(wx, wy - 1) === AIR) c = shade(c, 1.25);
    img.d[y * W + x] = c;
  }
  for (const e of game.entrances) {
    const x = (e.bx * BLOCK - VIEW.x) * S, y = (e.by * BLOCK - VIEW.y) * S;
    img.rect(x - 6, y - 10, 44, 10, outline);
    img.rect(x - 4, y - 8, 40, 6, hex('#a8763c'));
    img.rect(x - 4, y - 4, 40, 2, hex('#7a5228'));
    img.rect(x - 4, y - 2, 4, 18, hex('#5a3a18'));
    img.rect(x + 32, y - 2, 4, 18, hex('#5a3a18'));
    img.rect(x, y - 2, 32, 14, hex('#1a1008'));
  }
  for (const v of game.villagers) {
    if (v.gone) continue;
    const pose = { faller: 'fall', builder: 'build', shrugger: 'shrug', blocker: 'block', floater: 'float', basher: 'bash', digger: 'dig' }[v.state] ?? 'walk';
    const frame = villagerFrame(v.prof, pose, pose === 'walk' ? v.anim % 8 : 0, v.dir < 0);
    img.blit(outlined(frame, SW, SH), SW, SH, (v.x - VIEW.x) * S + 1 - AX, (v.y - VIEW.y) * S - AY);
    if (v.bomb >= 0) {
      const bx = (v.x - VIEW.x) * S - 7, by = (v.y - VIEW.y) * S - 52;
      img.rect(bx - 1, by - 1, 18, 18, outline);
      img.rect(bx, by, 16, 16, hex('#e83020'));
      img.rect(bx, by + 5, 16, 6, hex('#f8f8f8'));
      img.text(String(Math.ceil(v.bomb / 25)), bx + 6, by + 4, hex('#101010'));
    }
  }
  // Leiste: bunte Knöpfe mit Rand
  const py = H;
  img.rect(0, py, W, PANEL, hex('#28284c'));
  img.rect(0, py, W, 2, hex('#6060a0'));
  const slots = ['minus', 'plus', ...SKILLS, 'pause', 'nuke'];
  const counts = { minus: game.minRate, plus: game.rate, ...game.skills };
  const sw = 32;
  slots.forEach((name, i) => {
    const x = 4 + i * (sw + 3), y = py + 3;
    const sel = name === 'builder';
    img.rect(x, y, sw, 30, outline);
    img.rect(x + 1, y + 1, sw - 2, 28, sel ? hex('#f8d848') : hex('#8888c0'));
    img.rect(x + 2, y + 2, sw - 4, 26, sel ? hex('#c89828') : hex('#5858a0'));
    const rows = ICONS[name];
    rows.forEach((row, j) => { for (let k = 0; k < 16; k++) { const col = ICON_PALETTE[row[k]]; if (col) img.set(x + 8 + k, y + 7 + j, hex(col)); } });
    if (counts[name] > 0) {
      const n = String(counts[name]);
      img.text(n, x + sw - 3 - textW(n), y + 3, hex('#ffffff'), 1, hex('#101010'));
    }
  });
  const mx = 4 + slots.length * (sw + 3) + 4, mw = W - mx - 4;
  img.rect(mx, py + 3, mw, 30, outline);
  for (let y = 0; y < 28; y++) for (let x = 0; x < mw - 2; x++) {
    img.set(mx + 1 + x, py + 4 + y, T.solid(Math.floor((x / (mw - 2)) * T.w), Math.floor((y / 28) * T.h)) ? hex('#78b048') : hex('#3858a8'));
  }
  img.scaled(2).save('stil-c-16bit.png');
}

// ------------------------------------------------------------ Figuren im Vergleich

function drawSheet() {
  const K = 4;
  const img = new Img(860, 380, hex('#2a2a3a'));
  const label = (s, x, y) => img.text(s, x, y, hex('#ffff80'), 2, hex('#101010'));
  label('A  Aktuell (32 Pixel hoch)', 16, 12);
  label('B  Retro 1991 (16 Pixel hoch)', 16, 132);
  label('C  16-Bit mit Kontur', 16, 252);
  const poses = [['walk', 0], ['walk', 2], ['walk', 4], ['fall', 0], ['build', 2], ['block', 0], ['float', 0], ['dig', 1], ['mine', 1], ['bash', 2]];
  const profs = ['farmer', 'librarian', 'cleric', 'smith', 'nitwit', 'butcher', 'fisher', 'shepherd', 'farmer', 'librarian'];
  poses.forEach(([pose, f], i) => {
    const d = villagerFrame(profs[i], pose, f);
    const big = (data, w, h, k, ox, oy) => {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) img.rect(ox + x * k, oy + y * k, k, k, data[y * w + x]);
    };
    big(d, SW, SH, 2, 16 + i * 82, 34);
    big(outlined(d, SW, SH), SW, SH, 2, 16 + i * 82, 274);
  });
  const retroPoses = [['walk', 0], ['walk', 1], ['walk', 2], ['walk', 3], ['fall', 0], ['build', 0], ['block', 0], ['float', 0]];
  retroPoses.forEach(([pose, f], i) => {
    const s = retroSprite(pose, f);
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) img.rect(16 + i * 82 + x * K + (12 - s.w) * 2, 160 + y * K, K, K, s.data[y * s.w + x]);
  });
  img.save('figuren.png');
}

drawRetro();
draw16bit();
drawSheet();
