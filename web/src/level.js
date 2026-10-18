import { CHAR_TO_MAT, AUTO_DIRT, M } from './materials.js';
import { Terrain, BLOCK, LIQUID_WATER, LIQUID_LAVA } from './terrain.js';

export const SKILLS = ['climber', 'floater', 'bomber', 'blocker', 'builder', 'basher', 'miner', 'digger'];

const DECO = {
  t: 'torch', f: 'poppy', y: 'dandelion', '"': 'tallgrass', m: 'redshroom',
  b: 'brownshroom', j: 'lantern', q: 'chest', z: 'cobweb',
};

// Ein Level ist eine Blockkarte aus Textzeilen, ein Zeichen pro Block.
// Legende siehe materials.js und unten (Eingang, Ausgang, Fallen, Deko).
export function parseLevel(def) {
  const rows = def.map;
  const bh = rows.length;
  const bw = Math.max(...rows.map((r) => r.length));
  const t = new Terrain(bw * BLOCK, bh * BLOCK);
  const entrances = [];
  const exits = [];
  const traps = [];
  const fires = [];
  const deco = [];
  const charAt = (bx, by) => (by >= 0 && by < bh ? rows[by][bx] ?? ' ' : ' ');

  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      const ch = charAt(bx, by);
      let mat = CHAR_TO_MAT[ch];
      if (ch === AUTO_DIRT) {
        const above = charAt(bx, by - 1);
        const aboveMat = CHAR_TO_MAT[above];
        mat = aboveMat === undefined && above !== '~' && above !== '%' ? M.grass : M.dirt;
      }
      if (mat !== undefined) {
        fillBlock(t, bx, by, mat);
        continue;
      }
      switch (ch) {
        case '~': t.liquid[by * t.bw + bx] = LIQUID_WATER; break;
        case '%': t.liquid[by * t.bw + bx] = LIQUID_LAVA; break;
        case 'T': entrances.push({ bx, by, x: bx * BLOCK + BLOCK, y: by * BLOCK + BLOCK }); break;
        case 'H': exits.push({ bx, by, x: bx * BLOCK + BLOCK / 2, y: (by + 1) * BLOCK }); break;
        case 'p': traps.push({ kind: 'piston', bx, by, x: bx * BLOCK + BLOCK / 2, y: (by + 1) * BLOCK, busy: 0 }); break;
        case '^': fires.push({ bx, by, kind: 'campfire' }); break;
        case '*': fires.push({ bx, by, kind: 'fire' }); break;
        default:
          if (DECO[ch]) deco.push({ kind: DECO[ch], bx, by });
      }
    }
  }
  t.freeze();

  if (!entrances.length) throw new Error(`Level "${def.name}" hat keinen Eingang (T)`);
  if (!exits.length) throw new Error(`Level "${def.name}" hat keinen Ausgang (H)`);

  const dirs = def.entranceDirs ?? [];
  entrances.forEach((e, i) => { e.dir = dirs[i] ?? 1; });

  return { def, terrain: t, entrances, exits, traps, fires, deco, bw, bh };
}

function fillBlock(t, bx, by, mat) {
  for (let y = by * BLOCK; y < (by + 1) * BLOCK; y++) {
    t.mask.fill(mat, y * t.w + bx * BLOCK, y * t.w + (bx + 1) * BLOCK);
  }
}
