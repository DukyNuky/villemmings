// Startet das Spiel im Headless-Chromium und macht Bildschirmfotos.
//   node tools/shot.mjs <ausgabe-prefix> [skript.js]
// Das optionale Skript bekommt (page, shot) und steuert das Spiel.
import { chromium } from 'playwright-core';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const root = resolve('.');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer(async (req, res) => {
  try {
    const p = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    const data = await readFile(p.endsWith('/') ? p + 'index.html' : p);
    res.writeHead(200, { 'content-type': types[extname(p)] ?? 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const prefix = process.argv[2] ?? '/tmp/shot';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/usr/bin/chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: Number(process.env.W ?? 860), height: Number(process.env.H ?? 400) }, deviceScaleFactor: Number(process.env.DPR ?? 2), hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://localhost:${port}/web/index.html`);
await page.waitForTimeout(800);
let n = 0;
const shot = async (name) => { const f = `${prefix}-${name ?? n++}.png`; await page.screenshot({ path: f }); console.log(f); };
if (process.argv[3]) {
  const mod = await import(resolve(process.argv[3]));
  await mod.default(page, shot);
} else {
  await shot('title');
}
if (errors.length) console.log('FEHLER:\n' + errors.join('\n'));
await browser.close();
server.close();
