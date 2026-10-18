// Erzeugt das App-Symbol (Villager-Kopf vor einem Grasblock) in allen Größen.
//   node tools/make-icon.mjs
import { mkdirSync } from 'node:fs';
import { writePng } from './png.mjs';

const ART = [
  'gGgggGgggGgggGgg',
  'ggGgggGgggGgGggg',
  'gGGkkkkkkkkkkgGg',
  'dgdsssssssssskdg',
  'ddksssssssssssdd',
  'dddsbbbbbbbbssdd',
  'ddkswesNNseswsdd',
  'dddssssNNssssddd',
  'ddksssNNNNsssdkd',
  'dddssssnnssssddd',
  'ddksssssssssssdd',
  'ddkssssssssssddd',
  'dddRRRRRRRRRRddd',
  'ddRRrRRRRRRrRRdd',
  'dRRRRrRRRRrRRRRd',
  'dRRRRRRRRRRRRRRd',
];
const PAL = {
  g: [93, 155, 47], G: [121, 192, 74], d: [134, 96, 67], k: [148, 96, 74],
  s: [181, 133, 102], b: [61, 36, 20], w: [236, 236, 236], e: [47, 138, 59],
  N: [160, 106, 80], n: [138, 90, 66], R: [125, 90, 51], r: [94, 66, 36],
};

const sizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [dpi, size] of Object.entries(sizes)) {
  const img = new Uint8Array(size * size * 4);
  const r = size * 0.18; // abgerundete Ecken
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const cx = Math.min(x, size - 1 - x), cy = Math.min(y, size - 1 - y);
    if (cx < r && cy < r && (r - cx) ** 2 + (r - cy) ** 2 > r * r) continue;
    const ch = ART[Math.floor((y * 16) / size)][Math.floor((x * 16) / size)];
    const [R, G, B] = PAL[ch];
    img.set([R, G, B, 255], (y * size + x) * 4);
  }
  const dir = `android/app/src/main/res/mipmap-${dpi}`;
  mkdirSync(dir, { recursive: true });
  writePng(`${dir}/ic_launcher.png`, size, size, img);
}
writePng('/tmp/icon-preview.png', 192, 192, (() => {
  const s = 192, img = new Uint8Array(s * s * 4);
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const [R, G, B] = PAL[ART[Math.floor(y / 12)][Math.floor(x / 12)]];
    img.set([R, G, B, 255], (y * s + x) * 4);
  }
  return img;
})());
console.log('Symbole geschrieben');
