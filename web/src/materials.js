// Blockarten des Geländes. Die Zahl steht pro Geländepunkt in Terrain.mask,
// 0 ist Luft. Ein Block ist 8×8 Geländepunkte groß.

export const AIR = 0;

const list = [];
const byName = {};

function mat(name, char, props = {}) {
  const id = list.length + 1;
  const m = { id, name, char, steel: false, oneway: 0, ...props };
  list.push(m);
  byName[name] = m;
  return m;
}

mat('dirt', 'u');
mat('grass', 'G');
mat('stone', 'S');
mat('cobble', 'C');
mat('planks', 'W');
mat('spruce', 'w');
mat('log', 'L');
mat('leaves', 'l');
mat('sand', 'A');
mat('sandstone', 'Z');
mat('gravel', 'R');
mat('bricks', 'B');
mat('stonebricks', 'Y');
mat('mossy', 'M');
mat('obsidian', 'O', { steel: true });
mat('bedrock', 'X', { steel: true });
mat('ironblock', 'I', { steel: true });
mat('netherrack', 'N');
mat('netherbricks', 'n');
mat('quartz', 'Q');
mat('glowstone', 'K');
mat('soulsand', 'U');
mat('blackstone', 'J');
mat('endstone', 'E');
mat('endbricks', 'e');
mat('purpur', 'P');
mat('deepslate', 'V');
mat('goldblock', 'g');
mat('coalore', 'c');
mat('ironore', 'i');
mat('goldore', 'o');
mat('diamondore', 'x');
mat('redstoneore', 'r');
mat('emeraldore', 's');
mat('glass', 'v');
mat('snow', 'F');
mat('ice', 'k');
mat('hay', 'h');
mat('wool', 'a');
mat('onewayRight', '>', { oneway: 1 });
mat('onewayLeft', '<', { oneway: -1 });
// Von Treppenbauern gelegte Stufen (Birkenholz, damit man sie erkennt)
mat('built', null);

export const MATERIALS = [null, ...list];
export const M = Object.fromEntries(list.map((m) => [m.name, m.id]));

// Erdblock, der zu Gras wird, wenn Luft darüber ist
export const AUTO_DIRT = 'D';

export const CHAR_TO_MAT = {};
for (const m of list) if (m.char) CHAR_TO_MAT[m.char] = m.id;
CHAR_TO_MAT[AUTO_DIRT] = M.dirt;

export const IS_STEEL = new Uint8Array(256);
export const ONEWAY = new Int8Array(256);
for (const m of list) {
  IS_STEEL[m.id] = m.steel ? 1 : 0;
  ONEWAY[m.id] = m.oneway;
}

export { byName as MATERIAL_BY_NAME };
