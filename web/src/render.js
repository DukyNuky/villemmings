// Zeichnet ein laufendes Level: Hintergrund, Gelände, Objekte, Villager, Partikel.
// Weltkoordinaten in Geländepunkten; das Gelände liegt in doppelter Auflösung vor.

import { getTextures, TEX, hex, shade, unpack, averageColor, makeRng } from './textures.js';
import { villagerFrame, POSE_FRAMES, SW, SH, AX, AY, PROFESSIONS } from './sprites.js';
import { BLOCK, LIQUID_WATER, LIQUID_LAVA } from './terrain.js';
import { M, AIR } from './materials.js';
import { drawText } from './font.js';

const RES = 2; // Texturpixel je Geländepunkt

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// ------------------------------------------------------------ Villager-Atlas

const POSES = Object.keys(POSE_FRAMES);
const atlases = new Map();

function villagerAtlas(prof) {
  let a = atlases.get(prof);
  if (a) return a;
  const rows = POSES.length * 2 + 2;
  const c = canvas(8 * SW, rows * SH);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(c.width, c.height);
  const buf = new Uint32Array(img.data.buffer);
  const blit = (data, col, row) => {
    for (let y = 0; y < SH; y++) {
      buf.set(data.subarray(y * SW, (y + 1) * SW), (row * SH + y) * c.width + col * SW);
    }
  };
  const rowOf = {};
  POSES.forEach((pose, i) => {
    rowOf[pose] = i * 2;
    for (let f = 0; f < POSE_FRAMES[pose]; f++) {
      blit(villagerFrame(prof, pose, f, false), f, i * 2);
      blit(villagerFrame(prof, pose, f, true), f, i * 2 + 1);
    }
  });
  // Rot getönt für Schaden (Sturz, Feuer, Wasser)
  const hurtRow = POSES.length * 2;
  for (let d = 0; d < 2; d++) {
    const src = villagerFrame(prof, 'stand', 0, d === 1);
    const red = src.map((px) => {
      if (!(px >>> 24)) return 0;
      const [r, g, b] = unpack(px);
      return ((255 << 24) | ((b * 0.45) << 16) | ((g * 0.45) << 8) | Math.min(255, r * 0.6 + 110)) >>> 0;
    });
    blit(red, 0, hurtRow + d);
  }
  ctx.putImageData(img, 0, 0);
  a = { canvas: c, rowOf, hurtRow };
  atlases.set(prof, a);
  return a;
}

export function preloadSprites() {
  for (const p of PROFESSIONS) villagerAtlas(p);
}

// Welche Pose und welches Einzelbild gehört zu welchem Zustand?
function poseOf(v) {
  const a = v.anim;
  switch (v.state) {
    case 'walker': return ['walk', a % 8];
    case 'faller': return ['fall', (a >> 2) % 2];
    case 'floater': return ['float', (a >> 2) % 2];
    case 'climbing': return ['climb', (a >> 1) % 4];
    case 'hoister': return ['hoist', v.t > 3 ? 1 : 0];
    case 'blocker': return ['block', (a >> 3) % 2];
    case 'builder': return ['build', Math.min(3, v.t >> 2) % 4];
    case 'shrugger': return ['shrug', (a >> 2) % 2];
    case 'basher': return ['bash', (a >> 1) % 4];
    case 'miner': return ['mine', Math.min(3, (v.t % 8) >> 1)];
    case 'digger': return ['dig', a % 4];
    case 'ohno': return ['ohno', (a >> 1) % 4];
    case 'exiting': return ['exit', (a >> 2) % 4];
    default: return ['stand', 0];
  }
}

// ------------------------------------------------------------ Hintergründe

function tilePattern(mats, brightness, seed) {
  const T = getTextures();
  const n = 4;
  const c = canvas(TEX * n, TEX * n);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(c.width, c.height);
  const buf = new Uint32Array(img.data.buffer);
  const rnd = makeRng(seed);
  for (let by = 0; by < n; by++) for (let bx = 0; bx < n; bx++) {
    const m = mats[Math.floor(rnd() * rnd() * mats.length)];
    const t = T[m];
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      buf[(by * TEX + y) * c.width + bx * TEX + x] = shade(t[y * TEX + x] | 0xff000000, brightness);
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

const THEMES = {
  overworld: { sky: ['#6f9fff', '#a9c8ff', '#d7e6ff'] },
  caves: { sky: ['#0b0a0d', '#141217'], wall: [[M.stone, M.stone, M.stone, M.coalore, M.cobble, M.ironore, M.deepslate], 0.32] },
  nether: { sky: ['#1f0505', '#3d0d0a', '#5a1a0c'], wall: [[M.netherrack, M.netherrack, M.netherrack, M.soulsand, M.blackstone], 0.3] },
  end: { sky: ['#07040c', '#140c22', '#1e1430'] },
};

// ------------------------------------------------------------ Renderer

export class Renderer {
  constructor(game, theme) {
    this.game = game;
    this.t = game.terrain;
    this.theme = THEMES[theme] ? theme : 'overworld';
    this.terrainCanvas = canvas(this.t.w * RES, this.t.h * RES);
    this.tctx = this.terrainCanvas.getContext('2d');
    this.img = this.tctx.createImageData(this.terrainCanvas.width, this.terrainCanvas.height);
    this.buf = new Uint32Array(this.img.data.buffer);
    this.particles = [];
    this.goneSeen = new Set();
    this.trapAnim = new Map();
    this.flash = 0;
    this.shake = 0;
    this.time = 0;
    this.rnd = makeRng(99);
    this.redrawAll();
    this.buildStatics();
  }

  // --------------------------------------------------------- Gelände

  redrawAll() {
    this.paint(0, 0, this.t.w - 1, this.t.h - 1);
    this.tctx.putImageData(this.img, 0, 0);
    this.t.dirty.length = 0;
  }

  // Färbt Geländepunkte neu ein. Frisch freigelegte Kanten werden etwas
  // abgedunkelt, damit Tunnel und Löcher gut zu sehen sind.
  paint(x0, y0, x1, y1) {
    const t = this.t, T = getTextures();
    const W = this.terrainCanvas.width;
    x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1);
    x1 = Math.min(t.w - 1, x1 + 1); y1 = Math.min(t.h - 1, y1 + 1);
    const mask = t.mask, orig = t.orig, w = t.w;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * w + x;
        const m = mask[i];
        const px = x * RES, py = y * RES;
        if (m === AIR) {
          for (let dy = 0; dy < RES; dy++) for (let dx = 0; dx < RES; dx++) this.buf[(py + dy) * W + px + dx] = 0;
          continue;
        }
        let edge = false;
        if (m !== M.built) {
          const n = [i - 1, i + 1, i - w, i + w];
          const ok = [x > 0, x < w - 1, y > 0, y < t.h - 1];
          for (let k = 0; k < 4; k++) if (ok[k] && mask[n[k]] === AIR && orig[n[k]] !== AIR) edge = true;
        }
        const tex = T[m];
        for (let dy = 0; dy < RES; dy++) {
          const ty = (py + dy) % TEX;
          for (let dx = 0; dx < RES; dx++) {
            let c = tex[ty * TEX + ((px + dx) % TEX)];
            if (edge) c = shade(c, 0.62);
            this.buf[(py + dy) * W + px + dx] = c;
          }
        }
      }
    }
  }

  flushTerrain() {
    const d = this.t.dirty;
    if (!d.length) return;
    let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
    for (const r of d) {
      this.paint(r[0], r[1], r[2], r[3]);
      x0 = Math.min(x0, r[0] - 1); y0 = Math.min(y0, r[1] - 1);
      x1 = Math.max(x1, r[2] + 1); y1 = Math.max(y1, r[3] + 1);
    }
    d.length = 0;
    x0 = Math.max(0, x0); y0 = Math.max(0, y0);
    x1 = Math.min(this.t.w - 1, x1); y1 = Math.min(this.t.h - 1, y1);
    this.tctx.putImageData(this.img, 0, 0, x0 * RES, y0 * RES, (x1 - x0 + 1) * RES, (y1 - y0 + 1) * RES);
  }

  // --------------------------------------------------------- Statisches

  buildStatics() {
    const th = THEMES[this.theme];
    if (th.wall) this.wallTile = tilePattern(th.wall[0], th.wall[1], 7);
    this.exitImg = buildHouse(this.theme);
    this.lavaFrames = [];
    for (let f = 0; f < 8; f++) this.lavaFrames.push(lavaTex(f));
    // Sterne für das Ende, Wolken für die Oberwelt
    const rnd = makeRng(5);
    this.stars = [];
    for (let i = 0; i < 160; i++) this.stars.push([rnd(), rnd(), rnd()]);
    this.clouds = [];
    for (let i = 0; i < 14; i++) {
      this.clouds.push({ x: rnd() * 2000, y: 10 + rnd() * 80, w: 3 + Math.floor(rnd() * 6), h: 1 + Math.floor(rnd() * 2) });
    }
    this.hills = [];
    let hh = 20;
    for (let i = 0; i < 400; i++) {
      hh = Math.max(4, Math.min(40, hh + Math.round((rnd() - 0.5) * 6)));
      this.hills.push(hh);
    }
    this.liquids = [];
    const t = this.t;
    for (let by = 0; by < t.bh; by++) for (let bx = 0; bx < t.bw; bx++) {
      const l = t.liquid[by * t.bw + bx];
      if (l) this.liquids.push({ bx, by, l, top: by === 0 || t.liquid[(by - 1) * t.bw + bx] !== l });
    }
  }

  // --------------------------------------------------------- Ereignisse

  handleEvent(e) {
    switch (e.type) {
      case 'dust': this.burst(e.x, e.y, e.mat, e.n ?? 3, 0.6); break;
      case 'explosion':
        this.burst(e.x, e.y, e.mat || M.stone, 18, 2.2);
        for (let i = 0; i < 16; i++) {
          const a = this.rnd() * Math.PI * 2, s = this.rnd() * 1.6;
          this.particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.3, g: -0.01, life: 30 + this.rnd() * 25, max: 55, size: 3 + this.rnd() * 4, color: this.rnd() < 0.5 ? '#e8e8e8' : '#bdbdbd', kind: 'smoke' });
        }
        this.flash = 1;
        this.shake = 8;
        break;
      case 'trap': this.trapAnim.set(e.trap, 0); break;
    }
  }

  burst(x, y, mat, n, speed) {
    const [r, g, b] = averageColor(mat || M.dirt);
    for (let i = 0; i < n; i++) {
      const f = 0.75 + this.rnd() * 0.5;
      this.particles.push({
        x: x + (this.rnd() - 0.5) * 4, y: y + (this.rnd() - 0.5) * 4,
        vx: (this.rnd() - 0.5) * speed, vy: -this.rnd() * speed * 1.2,
        g: 0.12, life: 18 + this.rnd() * 18, max: 36, size: 1 + this.rnd() * 1.2,
        color: `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`,
      });
    }
  }

  spawn(kind, x, y, n) {
    for (let i = 0; i < n; i++) {
      const p = { x: x + (this.rnd() - 0.5) * 8, y: y - this.rnd() * 14, vx: (this.rnd() - 0.5) * 0.4, vy: -0.2 - this.rnd() * 0.4, g: 0, life: 25 + this.rnd() * 20, max: 45, size: 1.5, kind };
      if (kind === 'poof') { p.size = 2 + this.rnd() * 2.5; p.color = this.rnd() < 0.5 ? '#f2f2f2' : '#cfcfcf'; p.vy *= 0.6; }
      if (kind === 'happy') { p.color = '#3fdc4a'; p.size = 1.5; }
      if (kind === 'bubble') { p.color = '#b6dcff'; p.size = 1.2; p.vy = -0.4; }
      if (kind === 'flame') { p.color = this.rnd() < 0.5 ? '#ffb02e' : '#ff6a00'; p.size = 1.5 + this.rnd(); p.vy = -0.5; }
      this.particles.push(p);
    }
  }

  // Rückmeldungen, die nur die Grafik betreffen (pro Takt aufgerufen)
  tickEffects() {
    const g = this.game;
    for (const v of g.villagers) {
      if (v.gone) {
        if (!this.goneSeen.has(v.id)) {
          this.goneSeen.add(v.id);
          if (v.state === 'exiting') this.spawn('happy', v.x, v.y, 8);
          else if (v.state !== 'exploded' && v.state !== 'fellout') this.spawn('poof', v.x, v.y - 4, 10);
        }
        continue;
      }
      if (v.state === 'drowning' && v.t % 4 === 0) this.spawn('bubble', v.x, v.y - 4, 1);
      if (v.state === 'burning' && v.t % 2 === 0) this.spawn('flame', v.x, v.y - 2, 1);
      if (v.state === 'exiting' && v.t === 1) this.spawn('happy', v.x, v.y - 8, 6);
      if (v.state === 'crushed' && v.t === 1) this.spawn('poof', v.x, v.y - 2, 8);
    }
    for (const [tr, f] of this.trapAnim) {
      if (f > 30) this.trapAnim.delete(tr);
      else this.trapAnim.set(tr, f + 1);
    }
  }

  // --------------------------------------------------------- Zeichnen

  draw(ctx, cam, viewW, viewH, alpha, dt, opts = {}) {
    this.time += dt;
    this.flushTerrain();
    for (const p of this.particles) {
      p.x += p.vx * dt * 25; p.y += p.vy * dt * 25; p.vy += p.g * dt * 25; p.life -= dt * 25;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    const dpr = cam.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.drawBackground(ctx, cam, viewW, viewH);

    let sx = 0, sy = 0;
    if (this.shake > 0) {
      sx = (this.rnd() - 0.5) * this.shake * 0.4;
      sy = (this.rnd() - 0.5) * this.shake * 0.4;
      this.shake = Math.max(0, this.shake - dt * 25);
    }
    const z = cam.zoom * dpr;
    const ox = Math.round(-(cam.x + sx) * z), oy = Math.round(-(cam.y + sy) * z) + Math.round(cam.top * dpr);
    ctx.setTransform(z, 0, 0, z, ox, oy);
    ctx.imageSmoothingEnabled = false;

    const view = { x0: cam.x - 20, y0: cam.y - 20, x1: cam.x + viewW / cam.zoom + 20, y1: cam.y + viewH / cam.zoom + 20 };

    this.drawDeco(ctx, view);
    this.drawExits(ctx);
    this.drawEntrances(ctx);
    ctx.drawImage(this.terrainCanvas, 0, 0, this.t.w, this.t.h);
    this.drawTraps(ctx);
    this.drawFires(ctx);
    this.drawVillagers(ctx, alpha, view, opts);
    this.drawLiquids(ctx, view);
    this.drawParticles(ctx);
    if (opts.highlight) this.drawHighlight(ctx, opts.highlight, alpha);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.flash * 0.35})`;
      ctx.fillRect(0, cam.top, viewW, viewH);
      this.flash = Math.max(0, this.flash - dt * 4);
    }
  }

  drawBackground(ctx, cam, w, h) {
    const th = THEMES[this.theme];
    const top = cam.top;
    const grad = ctx.createLinearGradient(0, top, 0, top + h);
    th.sky.forEach((c, i) => grad.addColorStop(i / Math.max(1, th.sky.length - 1), c));
    ctx.fillStyle = grad;
    ctx.fillRect(0, top, w, h);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, top, w, h);
    ctx.clip();
    const z = cam.zoom;
    if (this.theme === 'overworld') {
      // Sonne, Wolken, ferne Hügel
      const sunX = w * 0.78 - cam.x * z * 0.05, sunY = top + h * 0.12 - cam.y * z * 0.05;
      ctx.fillStyle = '#fff8c8';
      ctx.fillRect(sunX, sunY, 28 * z / 2, 28 * z / 2);
      ctx.fillStyle = '#ffffff';
      const cz = z * 0.75;
      for (const c of this.clouds) {
        const cx = ((c.x + this.time * 3 - cam.x * 0.2) % 2000 + 2000) % 2000 * cz - 200;
        const cy = top + c.y * cz - cam.y * z * 0.15;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(cx, cy, c.w * 12 * cz, c.h * 6 * cz);
        ctx.fillRect(cx + 6 * cz, cy - 4 * cz, (c.w - 1) * 12 * cz * 0.6, 4 * cz);
      }
      ctx.globalAlpha = 1;
      this.drawHills(ctx, cam, w, h, '#a9c4e6', 0.25, 0.55);
      this.drawHills(ctx, cam, w, h, '#93b6dc', 0.4, 0.7, 120);
    } else if (this.theme === 'end') {
      for (const [sx, sy, b] of this.stars) {
        const x = ((sx * 3000 - cam.x * z * 0.1) % 3000 + 3000) % 3000 * (w / 1500) - w * 0.1;
        const y = top + sy * h;
        ctx.fillStyle = b > 0.8 ? '#ffffff' : b > 0.5 ? '#c9b6ff' : '#6f5c99';
        const s = b > 0.9 ? 3 : 2;
        ctx.fillRect(Math.round(x), Math.round(y), s, s);
      }
      this.drawHills(ctx, cam, w, h, '#2a1f3d', 0.2, 0.78, 60);
    } else if (th.wall) {
      const pat = ctx.createPattern(this.wallTile, 'repeat');
      const s = (z / RES) * 1.0;
      const px = -cam.x * z * 0.6, py = -cam.y * z * 0.6 + top;
      pat.setTransform(new DOMMatrix([s, 0, 0, s, px, py]));
      ctx.fillStyle = pat;
      ctx.imageSmoothingEnabled = false;
      ctx.fillRect(0, top, w, h);
      if (this.theme === 'nether') {
        const g2 = ctx.createLinearGradient(0, top, 0, top + h);
        g2.addColorStop(0, 'rgba(60,8,4,0.35)');
        g2.addColorStop(1, 'rgba(255,90,20,0.25)');
        ctx.fillStyle = g2;
        ctx.fillRect(0, top, w, h);
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(0, top, w, h);
      }
    }
    ctx.restore();
  }

  drawHills(ctx, cam, w, h, color, parallax, base, offset = 0) {
    const z = cam.zoom;
    const step = 8 * z * 0.9;
    ctx.fillStyle = color;
    const shift = cam.x * z * parallax;
    const first = Math.floor(shift / step);
    const groundY = cam.top + h * base - cam.y * z * parallax * 0.5;
    for (let i = first; i * step - shift < w; i++) {
      const hh = this.hills[((i + offset) % this.hills.length + this.hills.length) % this.hills.length];
      const x = i * step - shift;
      ctx.fillRect(Math.floor(x), Math.floor(groundY - hh * z * 0.9), Math.ceil(step) + 1, h);
    }
  }

  drawDeco(ctx, view) {
    const t = this.t;
    for (const d of this.game.level.deco) {
      const x = d.bx * BLOCK, y = d.by * BLOCK;
      if (x > view.x1 || x + 8 < view.x0 || y > view.y1 || y + 8 < view.y0) continue;
      if (d.kind !== 'cobweb' && d.kind !== 'lantern' && !t.solid(x + 4, y + 8)) continue;
      drawDecoItem(ctx, d.kind, x, y, this.time);
    }
  }

  drawEntrances(ctx) {
    const open = this.game.hatchOpen;
    for (const e of this.game.entrances) drawHatch(ctx, e.bx * BLOCK, e.by * BLOCK, open);
  }

  drawExits(ctx) {
    for (const e of this.game.exits) {
      const x = (e.bx - 3) * BLOCK, y = (e.by - 5) * BLOCK;
      ctx.drawImage(this.exitImg, x, y, this.exitImg.width / RES, this.exitImg.height / RES);
      // Fackeln flackern
      const fl = Math.sin(this.time * 9 + e.bx) > 0 ? '#ffd24a' : '#ffaa22';
      for (const tx of [e.bx * BLOCK - 7, e.bx * BLOCK + 13]) {
        ctx.fillStyle = '#6b4a26';
        ctx.fillRect(tx, e.by * BLOCK - 7, 1, 4);
        ctx.fillStyle = fl;
        ctx.fillRect(tx - 0.5, e.by * BLOCK - 9, 2, 2);
      }
    }
  }

  drawTraps(ctx) {
    for (const tr of this.game.traps) {
      const x = tr.bx * BLOCK, y = (tr.by - 2) * BLOCK;
      const f = this.trapAnim.get(tr);
      let ext = 0;
      if (f !== undefined) ext = f < 4 ? f / 4 : f < 16 ? 1 : Math.max(0, 1 - (f - 16) / 10);
      drawPiston(ctx, x, y, ext);
    }
  }

  drawFires(ctx) {
    for (const f of this.game.fires) {
      if (f.kind === 'fire') drawFire(ctx, f.bx * BLOCK, f.by * BLOCK, this.time);
      else drawCampfire(ctx, f.bx * BLOCK, f.by * BLOCK, this.time);
    }
  }

  drawLiquids(ctx, view) {
    const lava = this.lavaFrames[Math.floor(this.time * 6) % this.lavaFrames.length];
    for (const q of this.liquids) {
      const x = q.bx * BLOCK, y = q.by * BLOCK;
      if (x > view.x1 || x + 8 < view.x0 || y > view.y1 || y + 8 < view.y0) continue;
      const top = q.top ? 1 : 0;
      if (q.l === LIQUID_WATER) {
        ctx.fillStyle = 'rgba(48,92,214,0.72)';
        ctx.fillRect(x, y + top, 8, 8 - top);
        if (q.top) {
          ctx.fillStyle = 'rgba(160,200,255,0.8)';
          const o = Math.floor(this.time * 4 + q.bx * 3) % 8;
          ctx.fillRect(x, y + 1, 8, 0.5);
          ctx.fillRect(x + o, y + 1.5, 2, 0.5);
        }
      } else if (q.l === LIQUID_LAVA) {
        ctx.drawImage(lava, 0, top * RES, 16, 16 - top * RES, x, y + top, 8, 8 - top);
        if (q.top) {
          ctx.fillStyle = 'rgba(255,240,140,0.6)';
          ctx.fillRect(x, y + 1, 8, 0.5);
        }
      }
    }
  }

  drawVillagers(ctx, alpha, view, opts) {
    for (const v of this.game.villagers) {
      if (v.gone) continue;
      const x = v.px + (v.x - v.px) * alpha;
      const y = v.py + (v.y - v.py) * alpha;
      if (x < view.x0 || x > view.x1 || y < view.y0 || y - 20 > view.y1) continue;
      const atlas = villagerAtlas(v.prof);
      const dirRow = v.dir > 0 ? 0 : 1;
      const dx = x + 0.5 - AX / RES, dy = y - AY / RES;

      if (v.state === 'splatter' || v.state === 'burning' || v.state === 'drowning') {
        // Wie im Original: rot aufleuchten und umkippen
        const k = Math.min(1, v.t / 8);
        ctx.save();
        ctx.translate(x + 0.5, y);
        ctx.rotate(k * Math.PI / 2 * (v.dir > 0 ? -1 : 1));
        if (v.state === 'drowning') ctx.translate(0, v.t * 0.25);
        ctx.drawImage(atlas.canvas, 0, (atlas.hurtRow + dirRow) * SH, SW, SH, -AX / RES, -AY / RES, SW / RES, SH / RES);
        ctx.restore();
        continue;
      }
      if (v.state === 'crushed') continue;

      const [pose, frame] = poseOf(v);
      const row = atlas.rowOf[pose] + dirRow;
      if (v.state === 'exiting') ctx.globalAlpha = Math.max(0, 1 - v.t / 16);
      ctx.drawImage(atlas.canvas, frame * SW, row * SH, SW, SH, dx, dy, SW / RES, SH / RES);
      if (v.state === 'ohno' && (v.t >> 1) % 2 === 0) {
        ctx.globalAlpha = 0.6;
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(atlas.canvas, frame * SW, row * SH, SW, SH, dx, dy, SW / RES, SH / RES);
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.globalAlpha = 1;

      if (v.bomb >= 0) drawTnt(ctx, x + 0.5, y - 22, Math.ceil(v.bomb / 25), v.bomb % 25 < 6);
      if (opts.markers && (v.climber || v.floater)) {
        // kleine Abzeichen für Dauerfähigkeiten
        let mx = x - 4;
        if (v.climber) { ctx.fillStyle = '#c69b5b'; ctx.fillRect(mx, y - 19, 2, 2); mx += 3; }
        if (v.floater) { ctx.fillStyle = '#a3a3d6'; ctx.fillRect(mx, y - 19, 2, 2); }
      }
    }
  }

  drawParticles(ctx) {
    for (const p of this.particles) {
      const a = Math.max(0, Math.min(1, p.life / (p.max * 0.5)));
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.kind === 'happy') {
        ctx.fillRect(p.x - 0.5, p.y - 1.5, 1, 3);
        ctx.fillRect(p.x - 1.5, p.y - 0.5, 3, 1);
      } else {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    }
    ctx.globalAlpha = 1;
  }

  // Auswahlrahmen wie beim Anvisieren eines Blocks
  drawHighlight(ctx, v, alpha) {
    const x = v.px + (v.x - v.px) * alpha, y = v.py + (v.y - v.py) * alpha;
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.lineWidth = 0.6;
    ctx.strokeRect(x - 5, y - 18, 11, 18);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 0.3;
    ctx.strokeRect(x - 5.6, y - 18.6, 12.2, 19.2);
  }
}

// ------------------------------------------------------------ Einzelobjekte

function drawTnt(ctx, cx, y, n, blink) {
  const x = cx - 4;
  ctx.fillStyle = blink ? '#ffffff' : '#db2f1f';
  ctx.fillRect(x, y, 8, 8);
  if (!blink) {
    ctx.fillStyle = '#a3170f';
    ctx.fillRect(x, y, 8, 1);
    ctx.fillRect(x, y + 7, 8, 1);
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(x, y + 2.5, 8, 3);
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(0.5, 0.5);
  drawText(ctx, String(n), 8, 4, 1, blink ? '#db2f1f' : '#202020', { align: 'center', shadow: false });
  ctx.restore();
}

function drawHatch(ctx, x, y, open) {
  // Rahmen aus Fichtenholz, darunter eine zweiteilige Falltür
  ctx.fillStyle = '#4c3920';
  ctx.fillRect(x - 2, y - 4, 20, 4);
  ctx.fillStyle = '#6b5232';
  ctx.fillRect(x - 2, y - 4, 20, 1);
  ctx.fillStyle = '#3f2d19';
  ctx.fillRect(x - 2, y, 2, 8);
  ctx.fillRect(x + 16, y, 2, 8);
  ctx.fillStyle = '#1a120a';
  ctx.fillRect(x, y, 16, 7);
  const w = 8 - 6.5 * open, h = 1.5 + 5.5 * open;
  ctx.fillStyle = '#9c7f4e';
  ctx.fillRect(x, y + 7 - (1 - open) * 0.5, w, h * (open > 0 ? 1 : 0.6) + (open > 0 ? 0 : 1));
  ctx.fillRect(x + 16 - w, y + 7 - (1 - open) * 0.5, w, h * (open > 0 ? 1 : 0.6) + (open > 0 ? 0 : 1));
  if (open < 0.5) {
    ctx.fillStyle = '#5a4428';
    ctx.fillRect(x + 2, y + 7, 1.5, 1);
    ctx.fillRect(x + 12.5, y + 7, 1.5, 1);
  }
}

function drawPiston(ctx, x, y, ext) {
  // Kolbengehäuse (Bruchstein mit Holzkopf), Stempel fährt nach unten
  ctx.fillStyle = '#6c6c6c';
  ctx.fillRect(x, y, 8, 8);
  ctx.fillStyle = '#8c8c8c';
  ctx.fillRect(x + 1, y + 1, 6, 4);
  ctx.fillStyle = '#a0824f';
  ctx.fillRect(x, y + 6, 8, 2);
  const reach = ext * 12;
  if (reach > 0) {
    ctx.fillStyle = '#7a6040';
    ctx.fillRect(x + 3, y + 8, 2, reach);
    ctx.fillStyle = '#a0824f';
    ctx.fillRect(x, y + 6 + reach, 8, 2.5);
    ctx.fillStyle = '#6e5531';
    ctx.fillRect(x, y + 8 + reach, 8, 0.5);
  }
}

function drawCampfire(ctx, x, y, time) {
  ctx.fillStyle = '#4c3920';
  ctx.fillRect(x, y + 6, 8, 2);
  ctx.fillStyle = '#6b5232';
  ctx.fillRect(x + 1, y + 5, 6, 1);
  const f = Math.floor(time * 10);
  const flames = [[2, 1, 4], [3, 0, 5], [5, 2, 3], [1, 3, 2]];
  flames.forEach(([fx, fy, fh], i) => {
    const wob = (f + i) % 3 === 0 ? 1 : 0;
    ctx.fillStyle = i % 2 ? '#ff9a1f' : '#ffd23f';
    ctx.fillRect(x + fx, y + fy + wob, 1.5, fh - wob + 1);
  });
  ctx.fillStyle = 'rgba(255,170,60,0.18)';
  ctx.fillRect(x - 3, y - 3, 14, 12);
}

// Offenes Feuer (Nether): Flammenzungen über die ganze Blockbreite
function drawFire(ctx, x, y, time) {
  const f = Math.floor(time * 12);
  for (let i = 0; i < 8; i++) {
    const h = 3 + ((i * 7 + f * 3) % 5);
    ctx.fillStyle = i % 3 === 0 ? '#ffe36b' : i % 3 === 1 ? '#ff9a1f' : '#e8590c';
    ctx.fillRect(x + i, y + 8 - h, 1, h);
  }
  ctx.fillStyle = 'rgba(255,140,40,0.18)';
  ctx.fillRect(x - 1, y - 2, 10, 10);
}

function drawDecoItem(ctx, kind, x, y, time) {
  switch (kind) {
    case 'torch': {
      ctx.fillStyle = '#6b4a26';
      ctx.fillRect(x + 3.25, y + 2.5, 1.5, 5.5);
      ctx.fillStyle = Math.sin(time * 11 + x) > 0 ? '#ffd24a' : '#ffaa22';
      ctx.fillRect(x + 2.75, y + 0.5, 2.5, 2.5);
      ctx.fillStyle = '#fff6c8';
      ctx.fillRect(x + 3.5, y + 1.25, 1, 1);
      break;
    }
    case 'poppy':
      ctx.fillStyle = '#3f7a2c'; ctx.fillRect(x + 3.5, y + 4, 1, 4);
      ctx.fillStyle = '#d8231b'; ctx.fillRect(x + 2.5, y + 2, 3, 2.5);
      ctx.fillStyle = '#2a1a10'; ctx.fillRect(x + 3.5, y + 3, 1, 1);
      break;
    case 'dandelion':
      ctx.fillStyle = '#3f7a2c'; ctx.fillRect(x + 3.5, y + 4.5, 1, 3.5);
      ctx.fillStyle = '#f5d916'; ctx.fillRect(x + 2.5, y + 3, 3, 2);
      break;
    case 'tallgrass':
      ctx.fillStyle = '#5d9b2f';
      ctx.fillRect(x + 1, y + 4, 1, 4); ctx.fillRect(x + 3, y + 2, 1, 6);
      ctx.fillRect(x + 5, y + 3, 1, 5); ctx.fillRect(x + 6.5, y + 5, 1, 3);
      break;
    case 'redshroom':
      ctx.fillStyle = '#e8dccb'; ctx.fillRect(x + 3.5, y + 5, 1, 3);
      ctx.fillStyle = '#c4231b'; ctx.fillRect(x + 2, y + 3.5, 4, 2);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 3, y + 4, 0.7, 0.7);
      break;
    case 'brownshroom':
      ctx.fillStyle = '#e8dccb'; ctx.fillRect(x + 3.5, y + 5.5, 1, 2.5);
      ctx.fillStyle = '#9b6e4c'; ctx.fillRect(x + 2, y + 4.5, 4, 1.5);
      break;
    case 'lantern':
      ctx.fillStyle = '#3a3a44'; ctx.fillRect(x + 2.5, y + 3, 3, 4);
      ctx.fillStyle = '#ffcc55'; ctx.fillRect(x + 3, y + 4, 2, 2);
      break;
    case 'chest':
      ctx.fillStyle = '#8a5f2a'; ctx.fillRect(x + 0.5, y + 1.5, 7, 6.5);
      ctx.fillStyle = '#5c3d17'; ctx.fillRect(x + 0.5, y + 3.5, 7, 0.5);
      ctx.fillStyle = '#c9c9c9'; ctx.fillRect(x + 3.5, y + 3, 1, 1.5);
      break;
    case 'cobweb':
      ctx.strokeStyle = 'rgba(235,235,235,0.7)';
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + 8, y + 8);
      ctx.moveTo(x + 8, y); ctx.lineTo(x, y + 8);
      ctx.moveTo(x + 4, y); ctx.lineTo(x + 4, y + 8);
      ctx.moveTo(x, y + 4); ctx.lineTo(x + 8, y + 4);
      ctx.stroke();
      break;
  }
}

// Dorfhaus als Ausgang, aus echten Blocktexturen zusammengesetzt (7×6 Blöcke)
const HOUSE = [
  '..sss..',
  '.sssss.',
  'sLWWWLs',
  '.LWvWL.',
  '.LWdWL.',
  '.CCdCC.',
];

function buildHouse(theme) {
  const T = getTextures();
  const pal = {
    s: theme === 'nether' ? M.netherbricks : theme === 'end' ? M.purpur : M.spruce,
    L: theme === 'nether' ? M.blackstone : theme === 'end' ? M.endbricks : M.log,
    W: theme === 'nether' ? M.netherbricks : theme === 'end' ? M.endstone : M.planks,
    C: theme === 'end' ? M.obsidian : theme === 'nether' ? M.blackstone : M.cobble,
    v: M.glass,
  };
  const w = HOUSE[0].length * TEX, h = HOUSE.length * TEX;
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const buf = new Uint32Array(img.data.buffer);
  const dark = hex('#1d140b'), warm = hex('#3a2612');
  HOUSE.forEach((row, by) => {
    for (let bx = 0; bx < row.length; bx++) {
      const ch = row[bx];
      if (ch === '.') continue;
      for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
        let col;
        if (ch === 'd') {
          // offene Tür: dunkles, warm beleuchtetes Inneres mit Türrahmen
          col = x < 1 || x > 14 ? hex('#6e5531') : (y + by * 16) % 9 === 0 ? warm : dark;
        } else if (ch === 'v') {
          const t = T[M.glass][y * TEX + x];
          col = (t >>> 24) ? t : hex('#ffd77a');
        } else {
          col = T[pal[ch]][y * TEX + x];
          // Dachkanten leicht abdunkeln (Treppenoptik)
          if (ch === 's' && y > 11) col = shade(col, 0.8);
          if (theme !== 'end' && theme !== 'nether' && ch === 'W') col = shade(col, 0.95);
        }
        buf[(by * TEX + y) * w + bx * TEX + x] = col | 0;
      }
    }
  });
  // Halbdurchsichtig dunkler als das Spielfeld, damit klar ist: Hintergrund
  for (let i = 0; i < buf.length; i++) if (buf[i]) buf[i] = shade(buf[i] >>> 0, 0.85);
  ctx.putImageData(img, 0, 0);
  return c;
}

function lavaTex(frame) {
  const c = canvas(TEX, TEX);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(TEX, TEX);
  const buf = new Uint32Array(img.data.buffer);
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
    const v = Math.sin((x + frame) * 0.8) + Math.sin((y * 0.9 + frame * 0.5)) + Math.sin((x + y + frame * 2) * 0.45);
    const k = (v + 3) / 6;
    const col = k > 0.75 ? '#ffd23f' : k > 0.55 ? '#ff9a1f' : k > 0.35 ? '#e8590c' : '#c2410c';
    buf[y * TEX + x] = hex(col);
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

