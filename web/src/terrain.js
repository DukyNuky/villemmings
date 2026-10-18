import { AIR, IS_STEEL, ONEWAY, M } from './materials.js';

export const BLOCK = 8;

export const LIQUID_NONE = 0;
export const LIQUID_WATER = 1;
export const LIQUID_LAVA = 2;

// Zerstörbares Gelände in Geländepunkten (8 pro Block). Links und rechts
// begrenzen unsichtbare Wände, nach unten fällt man aus der Welt.
export class Terrain {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.mask = new Uint8Array(w * h);
    this.orig = null;
    this.bw = Math.ceil(w / BLOCK);
    this.bh = Math.ceil(h / BLOCK);
    this.liquid = new Uint8Array(this.bw * this.bh);
    this.dirty = [];
  }

  freeze() {
    this.orig = this.mask.slice();
  }

  get(x, y) {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return AIR;
    return this.mask[y * this.w + x];
  }

  solid(x, y) {
    if (x < 0 || x >= this.w) return true;
    if (y < 0 || y >= this.h) return false;
    return this.mask[y * this.w + x] !== AIR;
  }

  liquidAt(x, y) {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return LIQUID_NONE;
    return this.liquid[(y >> 3) * this.bw + (x >> 3)];
  }

  anySolid(x0, y0, x1, y1) {
    if (x0 > x1) [x0, x1] = [x1, x0];
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) if (this.solid(x, y)) return true;
    }
    return false;
  }

  // Liegt im Bereich etwas, das beim Graben in Richtung dir nicht nachgibt?
  // dir = 0 heißt senkrecht graben: Einbahnwände geben dann nach.
  blocked(x0, y0, x1, y1, dir) {
    if (x0 > x1) [x0, x1] = [x1, x0];
    for (let y = Math.max(0, y0); y <= Math.min(this.h - 1, y1); y++) {
      for (let x = x0; x <= x1; x++) {
        if (x < 0 || x >= this.w) return true;
        const m = this.mask[y * this.w + x];
        if (m === AIR) continue;
        if (IS_STEEL[m]) return true;
        if (dir !== 0 && ONEWAY[m] !== 0 && ONEWAY[m] !== dir) return true;
      }
    }
    return false;
  }

  // Entfernt Gelände im Rechteck (Grenzen inklusive). Stahl bleibt immer,
  // Einbahnwände nur, wenn gegen ihre Richtung gegraben wird.
  carveRect(x0, y0, x1, y1, dir = 0) {
    if (x0 > x1) [x0, x1] = [x1, x0];
    x0 = Math.max(0, x0); x1 = Math.min(this.w - 1, x1);
    y0 = Math.max(0, y0); y1 = Math.min(this.h - 1, y1);
    if (x0 > x1 || y0 > y1) return 0;
    let removed = 0;
    let firstMat = AIR;
    for (let y = y0; y <= y1; y++) {
      let i = y * this.w + x0;
      for (let x = x0; x <= x1; x++, i++) {
        const m = this.mask[i];
        if (m === AIR || IS_STEEL[m]) continue;
        if (dir !== 0 && ONEWAY[m] !== 0 && ONEWAY[m] !== dir) continue;
        if (firstMat === AIR) firstMat = m;
        this.mask[i] = AIR;
        removed++;
      }
    }
    if (removed) this.markDirty(x0, y0, x1, y1);
    this.lastMat = firstMat;
    return removed;
  }

  carveCircle(cx, cy, r) {
    let removed = 0;
    const r2 = r * r + r;
    const x0 = Math.max(0, cx - r), x1 = Math.min(this.w - 1, cx + r);
    const y0 = Math.max(0, cy - r), y1 = Math.min(this.h - 1, cy + r);
    let firstMat = AIR;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy > r2) continue;
        const i = y * this.w + x;
        const m = this.mask[i];
        if (m === AIR || IS_STEEL[m]) continue;
        if (firstMat === AIR) firstMat = m;
        this.mask[i] = AIR;
        removed++;
      }
    }
    if (removed) this.markDirty(x0, y0, x1, y1);
    this.lastMat = firstMat;
    return removed;
  }

  // Füllt nur Luft auf (Stufen der Treppenbauer)
  fillRect(x0, y0, x1, y1, mat = M.built) {
    if (x0 > x1) [x0, x1] = [x1, x0];
    x0 = Math.max(0, x0); x1 = Math.min(this.w - 1, x1);
    y0 = Math.max(0, y0); y1 = Math.min(this.h - 1, y1);
    let n = 0;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * this.w + x;
        if (this.mask[i] === AIR && this.liquid[(y >> 3) * this.bw + (x >> 3)] === LIQUID_NONE) {
          this.mask[i] = mat;
          n++;
        }
      }
    }
    if (n) this.markDirty(x0, y0, x1, y1);
    return n;
  }

  markDirty(x0, y0, x1, y1) {
    this.dirty.push([x0, y0, x1, y1]);
  }
}
