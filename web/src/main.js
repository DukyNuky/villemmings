// Einstieg: Bildschirme, Bedienung per Touch/Maus, Spielschleife.

import { Game, TICK_HZ } from './sim.js';
import { Renderer, preloadSprites } from './render.js';
import { WORLDS, TITLE_LEVEL } from './levels.js';
import { SKILLS } from './level.js';
import { drawText, textWidth, wrapText, FONT_H } from './font.js';
import { drawIcon } from './icons.js';
import { drawDirt, drawButton, drawSlot, drawTooltip, hit } from './ui.js';
import { play, unlockAudio, setSound, setMusic, startMusic, stopMusic, suspendAudio } from './audio.js';
import { averageColor, getTextures } from './textures.js';
import { LIQUID_WATER, LIQUID_LAVA } from './terrain.js';
import { M } from './materials.js';

export const SKILL_INFO = {
  climber: { name: 'Kletterer', text: 'Klettert senkrechte Wände hinauf. Bleibt dauerhaft.' },
  floater: { name: 'Gleiter', text: 'Öffnet bei tiefen Stürzen die Elytren. Bleibt dauerhaft.' },
  bomber: { name: 'Sprenger', text: 'Zündet TNT: nach 5 Sekunden reißt er ein Loch ins Gelände.' },
  blocker: { name: 'Blocker', text: 'Bleibt stehen und schickt alle anderen zurück.' },
  builder: { name: 'Treppenbauer', text: 'Baut eine Treppe aus 12 Birkenholzstufen.' },
  basher: { name: 'Tunnelgräber', text: 'Gräbt mit der Axt waagerecht durch Wände.' },
  miner: { name: 'Bergmann', text: 'Gräbt mit der Spitzhacke schräg nach unten.' },
  digger: { name: 'Buddler', text: 'Gräbt mit der Schaufel senkrecht nach unten.' },
};

const STATE_NAMES = {
  walker: 'Läuft', faller: 'Fällt', floater: 'Gleitet', climbing: 'Klettert', hoister: 'Klettert',
  blocker: 'Blocker', builder: 'Baut', shrugger: 'Fertig', basher: 'Tunnelt', miner: 'Baut ab',
  digger: 'Buddelt', ohno: 'Oh nein!', exiting: 'Zuhause!', splatter: 'Autsch', drowning: 'Ertrinkt',
  burning: 'Brennt', crushed: 'Zerquetscht',
};

const VERSION = (() => {
  try { return window.Android?.versionName?.() ?? 'Web'; } catch { return 'Web'; }
})();

const SPLASHES = [
  'Hmm!', 'Jetzt mit Villagern!', 'Auch ohne Creeper!', 'Mit echtem TNT!', 'Hrmm hmm!',
  'Smaragde nicht inklusive!', 'Die Dorfbewohner zählen auf dich!', 'Treppen aus Birkenholz!',
];

// ------------------------------------------------------------ Speicher

const STORE = 'villemmings.v1';
const save = (() => {
  try { return JSON.parse(localStorage.getItem(STORE)) ?? {}; } catch { return {}; }
})();
save.done ??= {};
save.sound ??= true;
save.music ??= true;
save.haptics ??= true;
function persist() {
  try { localStorage.setItem(STORE, JSON.stringify(save)); } catch { /* privater Modus */ }
}
setSound(save.sound);
setMusic(save.music);

function levelId(w, i) { return `${WORLDS[w].id}-${i + 1}`; }
function isDone(w, i) { return save.done[levelId(w, i)] !== undefined; }
function isUnlocked(w, i) { return i === 0 || isDone(w, i - 1) || isDone(w, i); }
function worldProgress(w) { return WORLDS[w].levels.filter((_, i) => isDone(w, i)).length; }

// ------------------------------------------------------------ Grundgerüst

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const app = {
  screen: 'title',
  W: 0, H: 0, dpr: 1, s: 2,
  buttons: [],
  pressedId: null,
  world: 0,
  level: 0,
  splash: SPLASHES[Math.floor(Math.random() * SPLASHES.length)],
  confirmReset: 0,
};

function resize() {
  app.dpr = Math.min(3, window.devicePixelRatio || 1);
  app.W = window.innerWidth;
  app.H = window.innerHeight;
  canvas.width = Math.round(app.W * app.dpr);
  canvas.height = Math.round(app.H * app.dpr);
  app.s = Math.max(1, Math.min(4, Math.round(Math.min(app.W, app.H * 1.6) / 300)));
  if (play_.game) clampCam();
}
window.addEventListener('resize', resize);

function go(screen) {
  app.screen = screen;
  app.pressedId = null;
  if (screen === 'title' || screen === 'worlds' || screen === 'levels') ensureTitleScene();
  if (screen !== 'play' && screen !== 'results') {
    if (save.music) startMusic('overworld');
  }
}

function button(b) {
  b.pressed = app.pressedId === b.id;
  app.buttons.push(b);
  return b;
}

// ------------------------------------------------------------ Spielzustand

const play_ = {
  game: null,
  renderer: null,
  cam: { x: 0, y: 0, zoom: 2, dpr: 1, top: 0 },
  skill: null,
  paused: false,
  menu: false,
  speed: 1,
  acc: 0,
  nukeArmed: 0,
  hover: null,
  hoverUntil: 0,
  hoverCount: 0,
  minimap: null,
  minimapAge: 0,
  pinch: null,
  finishedAt: 0,
  toast: '',
  toastUntil: 0,
};

function startLevel(w, i) {
  app.world = w;
  app.level = i;
  const def = WORLDS[w].levels[i];
  const g = new Game(def);
  play_.game = g;
  play_.renderer = new Renderer(g, WORLDS[w].theme);
  play_.paused = false;
  play_.menu = false;
  play_.speed = 1;
  play_.acc = 0;
  play_.nukeArmed = 0;
  play_.hover = null;
  play_.finishedAt = 0;
  play_.pinch = null;
  play_.skill = SKILLS.find((s) => g.skills[s] > 0) ?? null;
  play_.minimap = null;
  const lay = layout();
  const cam = play_.cam;
  cam.zoom = Math.max(lay.minZoom, Math.min(3, Math.max(1.6, lay.viewH / g.terrain.h)));
  const e = g.entrances[0];
  cam.x = e.x - lay.viewW / cam.zoom / 2;
  cam.y = e.y + 30 - lay.viewH / cam.zoom / 2;
  clampCam();
  go('play');
  if (save.music) startMusic(WORLDS[w].theme);
  else stopMusic();
}

// Aufteilung des Spielbildschirms: oben Statuszeile, unten die Leiste
function layout() {
  const { W, H } = app;
  const panelH = Math.round(Math.max(56, Math.min(96, H * 0.17)));
  const mapW = Math.round(Math.max(110, Math.min(320, W * 0.22)));
  const gap = 4;
  const slots = 13;
  const slotW = Math.floor((W - mapW - gap * (slots + 3)) / slots);
  const viewW = W, viewH = H - panelH;
  const g = play_.game;
  const minZoom = g ? Math.max(0.6, Math.min(viewW / g.terrain.w, viewH / g.terrain.h)) : 1;
  return { panelH, mapW, gap, slotW, viewW, viewH, panelY: H - panelH, minZoom, maxZoom: 7 };
}

function clampCam() {
  const g = play_.game;
  if (!g) return;
  const lay = layout();
  const cam = play_.cam;
  cam.zoom = Math.max(lay.minZoom, Math.min(lay.maxZoom, cam.zoom));
  const vw = lay.viewW / cam.zoom, vh = lay.viewH / cam.zoom;
  const t = g.terrain;
  cam.x = vw >= t.w ? (t.w - vw) / 2 : Math.max(0, Math.min(t.w - vw, cam.x));
  cam.y = vh >= t.h ? (t.h - vh) / 2 : Math.max(0, Math.min(t.h - vh, cam.y));
}

function screenToWorld(sx, sy) {
  const cam = play_.cam;
  return [cam.x + sx / cam.zoom, cam.y + (sy - cam.top) / cam.zoom];
}

// Villager unter dem Finger: großzügige Trefferfläche, passende zuerst
function pickVillager(sx, sy, skill) {
  const g = play_.game;
  const cam = play_.cam;
  const [wx, wy] = screenToWorld(sx, sy);
  const tol = 16;
  let best = null, bestScore = Infinity, count = 0;
  for (const v of g.villagers) {
    if (v.gone) continue;
    const dx = Math.abs(wx - (v.x + 0.5)) * cam.zoom;
    const dy = Math.abs(wy - (v.y - 8)) * cam.zoom;
    if (dx > 5 * cam.zoom + tol || dy > 9 * cam.zoom + tol) continue;
    count++;
    const ok = skill ? g.canAssign(v, skill) : true;
    const score = dx * dx + dy * dy + (ok ? 0 : 1e6);
    if (score < bestScore) { bestScore = score; best = v; }
  }
  return { v: best, count, ok: best && skill ? g.canAssign(best, skill) : false };
}

function describe(v) {
  let s = STATE_NAMES[v.state] ?? '';
  if (v.climber && v.floater) s += ' · Athlet';
  else if (v.climber) s += ' · Kletterer';
  else if (v.floater) s += ' · Gleiter';
  if (v.bomb >= 0) s += ' · TNT';
  return s;
}

function toast(text, ms = 1600) {
  play_.toast = text;
  play_.toastUntil = performance.now() + ms;
}

function vibrate(ms) {
  if (save.haptics && navigator.vibrate) navigator.vibrate(ms);
}

function tryAssign(sx, sy) {
  const g = play_.game;
  const skill = play_.skill;
  const pick = pickVillager(sx, sy, skill);
  if (pick.v) {
    play_.hover = pick.v;
    play_.hoverCount = pick.count;
    play_.hoverUntil = performance.now() + 1500;
  }
  if (!pick.v || !skill || g.finished) return false;
  if (!g.skills[skill]) {
    toast(`Keine ${SKILL_INFO[skill].name} mehr übrig`);
    return false;
  }
  if (!pick.ok) return false;
  if (g.assign(pick.v, skill)) {
    vibrate(12);
    if (skill === 'bomber') play('fuse');
    return true;
  }
  return false;
}

// ------------------------------------------------------------ Eingabe

const pointers = new Map();

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  canvas.setPointerCapture?.(e.pointerId);
  unlockAudio();
  const p = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, mode: null, button: null };
  pointers.set(e.pointerId, p);

  const b = [...app.buttons].reverse().find((bt) => !bt.disabled && hit(bt, p.x, p.y));
  if (b) {
    p.button = b;
    app.pressedId = b.id;
    if (b.onDown) b.onDown(p);
    if (b.repeat) {
      p.repeat = setTimeout(function rep() { b.onDown(p); p.repeat = setTimeout(rep, 70); }, 350);
    }
    return;
  }
  if (app.screen === 'play' && !play_.menu) playDown(p);
}, { passive: false });

canvas.addEventListener('pointermove', (e) => {
  const p = pointers.get(e.pointerId);
  if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX;
  p.y = e.clientY;
  if (Math.hypot(p.x - p.sx, p.y - p.sy) > 10) p.moved = true;
  if (p.button) {
    if (p.button.drag) p.button.drag(p);
    else if (!hit(p.button, p.x, p.y)) app.pressedId = null;
    return;
  }
  if (app.screen === 'play') playMove(p, dx, dy);
});

function endPointer(e, cancelled) {
  const p = pointers.get(e.pointerId);
  if (!p) return;
  pointers.delete(e.pointerId);
  if (p.repeat) clearTimeout(p.repeat);
  if (p.button) {
    const b = p.button;
    app.pressedId = null;
    if (!cancelled && b.onTap && hit(b, p.x, p.y)) {
      play('click');
      b.onTap(p);
    }
    return;
  }
  if (app.screen === 'play') playUp(p);
}
canvas.addEventListener('pointerup', (e) => endPointer(e, false));
canvas.addEventListener('pointercancel', (e) => endPointer(e, true));

canvas.addEventListener('wheel', (e) => {
  if (app.screen !== 'play') return;
  e.preventDefault();
  zoomAt(e.clientX, e.clientY, play_.cam.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12));
}, { passive: false });

function zoomAt(sx, sy, zoom) {
  const cam = play_.cam;
  const [wx, wy] = screenToWorld(sx, sy);
  const lay = layout();
  cam.zoom = Math.max(lay.minZoom, Math.min(lay.maxZoom, zoom));
  cam.x = wx - sx / cam.zoom;
  cam.y = wy - (sy - cam.top) / cam.zoom;
  clampCam();
}

function playDown(p) {
  const lay = layout();
  if (p.y >= lay.panelY) return;
  const others = [...pointers.values()].filter((o) => o !== p && !o.button);
  if (others.length >= 1) {
    // Zweiter Finger: Zoomen und Verschieben
    const o = others[0];
    o.mode = 'pinch';
    p.mode = 'pinch';
    const cx = (p.x + o.x) / 2, cy = (p.y + o.y) / 2;
    const [wx, wy] = screenToWorld(cx, cy);
    play_.pinch = { a: o, b: p, d0: Math.hypot(p.x - o.x, p.y - o.y) || 1, z0: play_.cam.zoom, wx, wy };
    return;
  }
  if (tryAssign(p.x, p.y)) p.mode = 'assigned';
  else p.mode = 'pan';
}

function playMove(p, dx, dy) {
  const cam = play_.cam;
  if (p.mode === 'pinch' && play_.pinch) {
    const { a, b, d0, z0, wx, wy } = play_.pinch;
    const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    const lay = layout();
    cam.zoom = Math.max(lay.minZoom, Math.min(lay.maxZoom, z0 * d / d0));
    const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    cam.x = wx - cx / cam.zoom;
    cam.y = wy - (cy - cam.top) / cam.zoom;
    clampCam();
    return;
  }
  if (p.mode === 'pan' || (p.mode === 'assigned' && p.moved)) {
    cam.x -= dx / cam.zoom;
    cam.y -= dy / cam.zoom;
    clampCam();
  }
}

function playUp(p) {
  if (p.mode === 'pinch') {
    play_.pinch = null;
    for (const o of pointers.values()) if (o.mode === 'pinch') o.mode = 'none';
  }
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' || e.key === 'Backspace') { handleBack(); return; }
  if (app.screen !== 'play' || !play_.game) return;
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= 8) selectSkill(SKILLS[n - 1]);
  else if (e.key === 'p' || e.key === ' ') togglePause();
  else if (e.key === 'f') play_.speed = play_.speed === 1 ? 3 : 1;
  else if (e.key === '+') play_.game.setRate(play_.game.rate + 5);
  else if (e.key === '-') play_.game.setRate(play_.game.rate - 5);
  else if (e.key === 'ArrowLeft') { play_.cam.x -= 40; clampCam(); }
  else if (e.key === 'ArrowRight') { play_.cam.x += 40; clampCam(); }
  else if (e.key === 'ArrowUp') { play_.cam.y -= 40; clampCam(); }
  else if (e.key === 'ArrowDown') { play_.cam.y += 40; clampCam(); }
});

function selectSkill(s) {
  if (!play_.game) return;
  if (play_.skill !== s) play('select');
  play_.skill = s;
  toast(`${SKILL_INFO[s].name}: ${play_.game.skills[s]} übrig`, 1100);
}

function togglePause() {
  play_.paused = !play_.paused;
}

// Zurück-Taste (Android) und Escape
function handleBack() {
  switch (app.screen) {
    case 'play':
      if (play_.game?.finished) return true;
      play_.menu = !play_.menu;
      return true;
    case 'results': go('levels'); return true;
    case 'preview': go('levels'); return true;
    case 'levels': go('worlds'); return true;
    case 'help': if (app.helpPage) app.helpPage = 0; else go('title'); return true;
    case 'worlds': case 'options': go('title'); return true;
    default: return false;
  }
}
window.villemmingsBack = () => handleBack();

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (app.screen === 'play' && play_.game && !play_.game.finished) play_.menu = true;
    suspendAudio(true);
    stopMusic();
  } else {
    suspendAudio(false);
    if (save.music) startMusic(app.screen === 'play' ? WORLDS[app.world].theme : 'overworld');
  }
});

// ------------------------------------------------------------ Spielschleife

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  app.buttons = [];
  ctx.setTransform(app.dpr, 0, 0, app.dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  try {
    SCREENS[app.screen](dt, now);
    if (app.H > app.W * 1.05) drawRotateHint();
  } catch (err) {
    console.error(err);
  }
  requestAnimationFrame(frame);
}

function stepGame(g, r, dt, speed) {
  play_.acc += dt * speed;
  const tick = 1 / TICK_HZ;
  let steps = 0;
  while (play_.acc >= tick && steps < 12) {
    testHooks.beforeStep?.(g);
    g.step();
    r.tickEffects();
    for (const e of g.events) handleGameEvent(e);
    g.events.length = 0;
    play_.acc -= tick;
    steps++;
  }
  if (steps >= 12) play_.acc = 0;
}

function handleGameEvent(e) {
  const r = play_.renderer;
  r.handleEvent(e);
  const lay = layout();
  const cam = play_.cam;
  const pan = e.x !== undefined ? ((e.x - cam.x) * cam.zoom / lay.viewW - 0.5) * 1.4 : 0;
  if (e.type === 'sound') play(e.name, { pan, mat: e.mat });
  else if (e.type === 'explosion') { play('explosion', { pan }); vibrate(30); }
}

// ------------------------------------------------------------ Bildschirme

const SCREENS = {
  title: drawTitle,
  worlds: drawWorlds,
  levels: drawLevels,
  preview: drawPreview,
  play: drawPlay,
  results: drawResults,
  help: drawHelp,
  options: drawOptions,
};

// Im Hintergrund der Menüs laufen ein paar Villager herum
const titleScene = { game: null, renderer: null, cam: { x: 0, y: 0, zoom: 3, dpr: 1, top: 0 }, acc: 0 };

function ensureTitleScene() {
  if (titleScene.game) return;
  titleScene.game = new Game(TITLE_LEVEL);
  titleScene.renderer = new Renderer(titleScene.game, 'overworld');
}

function drawMenuBackground(dt) {
  const { W, H } = app;
  ensureTitleScene();
  const g = titleScene.game, r = titleScene.renderer;
  titleScene.acc += dt;
  while (titleScene.acc > 1 / TICK_HZ) {
    titleScene.acc -= 1 / TICK_HZ;
    g.step();
    r.tickEffects();
    g.events.length = 0;
    if (g.finished) { titleScene.game = null; ensureTitleScene(); return; }
  }
  const cam = titleScene.cam;
  cam.dpr = app.dpr;
  cam.zoom = Math.max(H / g.terrain.h, W / 500);
  const vw = W / cam.zoom;
  cam.x = (g.terrain.w - vw) / 2 + Math.sin(performance.now() / 9000) * (g.terrain.w - vw) / 2.2;
  cam.y = Math.max(0, g.terrain.h - H / cam.zoom);
  r.draw(ctx, cam, W, H, titleScene.acc * TICK_HZ, dt, {});
  ctx.setTransform(app.dpr, 0, 0, app.dpr, 0, 0);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, 0, W, H);
}

function drawLogo(cx, y, scale) {
  const text = 'VILLEMMINGS';
  const w = textWidth(text) * scale;
  const x = Math.round(cx - w / 2);
  const depth = Math.round(scale * 0.8);
  for (let k = depth; k >= 1; k--) drawText(ctx, text, x + k, y + k, scale, k === depth ? '#1c1c1c' : '#3a3a3a', { shadow: false });
  drawText(ctx, text, x, y, scale, '#bdbdbd', { shadow: false });
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, scale * 3);
  ctx.clip();
  drawText(ctx, text, x, y, scale, '#e8e8e8', { shadow: false });
  ctx.restore();
  return w;
}

function drawTitle(dt, now) {
  const { W, H, s } = app;
  drawMenuBackground(dt);
  const logoScale = Math.max(3, Math.min(10, Math.floor(W / 90)));
  const logoY = Math.round(H * 0.1);
  const lw = drawLogo(W / 2, logoY, logoScale);
  // Gelber Spruch, schräg und pulsierend
  ctx.save();
  ctx.translate(W / 2 + lw / 2 - 10 * s, logoY + 7 * logoScale);
  ctx.rotate(-0.33);
  const k = 1 + Math.sin(now / 140) * 0.06;
  ctx.scale(k, k);
  drawText(ctx, app.splash, 0, 0, s, '#ffff00', { align: 'center' });
  ctx.restore();
  drawText(ctx, 'Rette die Dorfbewohner!', W / 2, logoY + 9 * logoScale + 6 * s, s, '#e0e0e0', { align: 'center' });

  const bw = Math.min(W * 0.6, 200 * s), bh = 20 * s;
  let y = Math.round(H * 0.5);
  const x = Math.round(W / 2 - bw / 2);
  button({ id: 'play', x, y, w: bw, h: bh, label: 'Spielen', onTap: () => go('worlds') });
  y += bh + 4 * s;
  button({ id: 'help', x, y, w: bw / 2 - 2 * s, h: bh, label: 'Anleitung', onTap: () => go('help') });
  button({ id: 'opt', x: x + bw / 2 + 2 * s, y, w: bw / 2 - 2 * s, h: bh, label: 'Optionen', onTap: () => go('options') });
  for (const b of app.buttons) drawButton(ctx, b, s);
  drawText(ctx, `Villemmings ${VERSION}`, 2 * s, H - 10 * s, s, '#ffffff');
  drawText(ctx, 'Kein offizielles Minecraft-Produkt', W - 2 * s, H - 10 * s, s, '#ffffff', { align: 'right' });
}

const WORLD_BLOCK = { overworld: M.grass, caves: M.diamondore, nether: M.netherrack, end: M.endstone };

function drawBlockIcon(mat, x, y, size) {
  const t = getTextures()[mat];
  const px = size / 16;
  for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
    const c = t[j * 16 + i];
    ctx.fillStyle = `rgb(${c & 255},${(c >> 8) & 255},${(c >> 16) & 255})`;
    ctx.fillRect(x + i * px, y + j * px, Math.ceil(px), Math.ceil(px));
  }
}

function drawWorlds(dt) {
  const { W, H, s } = app;
  drawMenuBackground(dt);
  drawText(ctx, 'Welt auswählen', W / 2, 8 * s, s * 2, '#ffffff', { align: 'center' });
  const cols = 2;
  const gap = 6 * s;
  const bw = Math.min((W - gap * 3) / cols, 260 * s), bh = Math.min((H - 70 * s) / 2 - gap, 70 * s);
  const x0 = (W - (bw * cols + gap)) / 2;
  const y0 = 30 * s;
  WORLDS.forEach((w, i) => {
    const x = x0 + (i % cols) * (bw + gap), y = y0 + Math.floor(i / cols) * (bh + gap);
    const b = button({ id: 'world' + i, x, y, w: bw, h: bh, onTap: () => { app.world = i; go('levels'); } });
    drawButton(ctx, b, s);
    const icon = Math.min(bh - 12 * s, 40 * s);
    drawBlockIcon(WORLD_BLOCK[w.theme], x + 6 * s, y + (bh - icon) / 2, icon);
    const tx = x + icon + 12 * s;
    drawText(ctx, w.name, tx, y + bh / 2 - 13 * s, s * 2, b.pressed ? '#ffffa0' : '#ffffff');
    drawText(ctx, w.difficulty, tx, y + bh / 2 + 4 * s, s, '#c8c8c8');
    const done = worldProgress(i);
    drawText(ctx, `${done}/${w.levels.length} geschafft`, tx, y + bh / 2 + 14 * s, s, done === w.levels.length ? '#7dff6a' : '#a0a0a0');
  });
  const back = button({ id: 'back', x: W / 2 - 50 * s, y: H - 26 * s, w: 100 * s, h: 20 * s, label: 'Zurück', onTap: () => go('title') });
  drawButton(ctx, back, s);
}

function drawLevels(dt) {
  const { W, H, s } = app;
  drawMenuBackground(dt);
  const w = WORLDS[app.world];
  drawText(ctx, `${w.name} – ${w.difficulty}`, W / 2, 8 * s, s * 2, '#ffffff', { align: 'center' });
  const cols = 2;
  const rows = Math.ceil(w.levels.length / cols);
  const gap = 4 * s;
  const bw = Math.min((W - gap * 3) / cols, 230 * s);
  const bh = Math.max(16 * s, Math.min(22 * s, (H - 64 * s) / rows - gap));
  const x0 = (W - (bw * cols + gap)) / 2;
  const y0 = 30 * s;
  w.levels.forEach((lv, i) => {
    const x = x0 + (i % cols) * (bw + gap), y = y0 + Math.floor(i / cols) * (bh + gap);
    const open = isUnlocked(app.world, i);
    const b = button({ id: 'lv' + i, x, y, w: bw, h: bh, disabled: !open, onTap: () => { app.level = i; go('preview'); } });
    drawButton(ctx, b, s);
    const ts = s;
    const icon = bh - 6 * s;
    drawText(ctx, `${i + 1}`, x + 6 * s, y + (bh - FONT_H * ts) / 2, ts, open ? '#ffff80' : '#808080');
    let name = lv.name;
    const maxW = bw - 30 * s - icon;
    while (textWidth(name) * ts > maxW && name.length > 3) name = name.slice(0, -2) + '…';
    drawText(ctx, name, x + 20 * s, y + (bh - FONT_H * ts) / 2, ts, open ? (b.pressed ? '#ffffa0' : '#ffffff') : '#808080');
    if (!open) drawIcon(ctx, 'lock', x + bw - icon - 3 * s, y + 3 * s, icon);
    else if (isDone(app.world, i)) drawIcon(ctx, 'check', x + bw - icon - 3 * s, y + 3 * s, icon);
  });
  const back = button({ id: 'back', x: W / 2 - 50 * s, y: H - 26 * s, w: 100 * s, h: 20 * s, label: 'Zurück', onTap: () => go('worlds') });
  drawButton(ctx, back, s);
}

// Kleine Übersichtskarte des Geländes (1 Pixel = 2×2 Geländepunkte)
function buildMinimap(game, old) {
  const t = game.terrain;
  const mw = Math.ceil(t.w / 2), mh = Math.ceil(t.h / 2);
  const c = old ?? document.createElement('canvas');
  c.width = mw;
  c.height = mh;
  const mctx = c.getContext('2d');
  const img = mctx.createImageData(mw, mh);
  const buf = new Uint32Array(img.data.buffer);
  const cols = new Map();
  const colorOf = (m) => {
    let v = cols.get(m);
    if (v === undefined) {
      const [r, g, b] = averageColor(m);
      v = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
      cols.set(m, v);
    }
    return v;
  };
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
    const m = t.mask[(y * 2) * t.w + x * 2] || t.mask[(y * 2 + 1) * t.w + x * 2 + 1];
    if (m) { buf[y * mw + x] = colorOf(m); continue; }
    const l = t.liquidAt(x * 2, y * 2);
    if (l === LIQUID_WATER) buf[y * mw + x] = 0xffd65a30;
    else if (l === LIQUID_LAVA) buf[y * mw + x] = 0xff1a6aff;
  }
  mctx.putImageData(img, 0, 0);
  return c;
}

let previewCache = { key: null, map: null, game: null };

function drawPreview(dt) {
  const { W, H, s } = app;
  drawDirt(ctx, 0, 0, W, H, 4 * s);
  const world = WORLDS[app.world];
  const def = world.levels[app.level];
  const key = `${app.world}-${app.level}`;
  if (previewCache.key !== key) {
    const g = new Game(def);
    previewCache = { key, game: g, map: buildMinimap(g) };
  }
  const g = previewCache.game;
  const map = previewCache.map;
  // Von unten nach oben planen: Knöpfe, Fähigkeiten, Text – der Rest für die Karte
  const bw = 100 * s, bh = 20 * s;
  const by = H - bh - 4 * s;
  const slot = 22 * s;
  const sy = by - slot - 5 * s;
  const hint = def.hint ? wrapText(def.hint, W * 0.86, s) : [];
  const textH = 11 * s + 20 * s + 12 * s + hint.length * 10 * s;
  const maxW = W - 20 * s, maxH = Math.max(30 * s, sy - textH - 14 * s);
  const k = Math.min(maxW / map.width, maxH / map.height);
  const mw = map.width * k, mh = map.height * k;
  const mx = (W - mw) / 2, my = 5 * s;
  ctx.fillStyle = '#000';
  ctx.fillRect(mx - s, my - s, mw + 2 * s, mh + 2 * s);
  ctx.fillStyle = world.theme === 'overworld' ? '#7fa8ff' : world.theme === 'nether' ? '#3a0c08' : world.theme === 'end' ? '#120a1e' : '#141217';
  ctx.fillRect(mx, my, mw, mh);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(map, mx, my, mw, mh);
  for (const e of g.entrances) { ctx.fillStyle = '#c69b5b'; ctx.fillRect(mx + (e.x - 8) / 2 * k, my + (e.y - 8) / 2 * k, 8 * k, 4 * k); }
  for (const e of g.exits) { ctx.fillStyle = '#ffd24a'; ctx.fillRect(mx + (e.x - 4) / 2 * k, my + (e.y - 16) / 2 * k, 4 * k, 8 * k); }

  let y = my + mh + 6 * s;
  drawText(ctx, `${world.name} · Level ${app.level + 1}`, W / 2, y, s, '#c0c0c0', { align: 'center' });
  y += 11 * s;
  drawText(ctx, def.name, W / 2, y, s * 2, '#ffff55', { align: 'center' });
  y += 20 * s;
  const time = def.time ?? 300;
  const facts = [
    `${def.villagers} Villager`,
    `${Math.ceil(def.save * 100 / def.villagers)}% retten (${def.save})`,
    `Rate ${def.rate ?? 50}`,
    `Zeit ${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')}`,
  ];
  drawText(ctx, facts.join('   ·   '), W / 2, y, s, '#ffffff', { align: 'center' });
  y += 12 * s;
  for (const line of hint) {
    drawText(ctx, line, W / 2, y, s, '#a8e0ff', { align: 'center' });
    y += 10 * s;
  }
  // Verfügbare Fähigkeiten
  const avail = SKILLS.filter((sk) => (def.skills?.[sk] ?? 0) > 0);
  let x = W / 2 - (avail.length * (slot + 3 * s) - 3 * s) / 2;
  for (const sk of avail) {
    drawSlot(ctx, x, sy, slot, slot, s, false, false);
    drawIcon(ctx, sk, x + 3 * s, sy + 3 * s, slot - 6 * s);
    drawText(ctx, String(def.skills[sk]), x + slot - 2 * s, sy + slot - 10 * s, s, '#ffffff', { align: 'right' });
    x += slot + 3 * s;
  }
  drawButton(ctx, button({ id: 'back', x: W / 2 - bw - 4 * s, y: by, w: bw, h: bh, label: 'Zurück', onTap: () => go('levels') }), s);
  drawButton(ctx, button({ id: 'start', x: W / 2 + 4 * s, y: by, w: bw, h: bh, label: 'Los geht\'s!', onTap: () => startLevel(app.world, app.level) }), s);
}

// ------------------------------------------------------------ Spiel

function fmtTime(ticks) {
  const sec = Math.ceil(ticks / TICK_HZ);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

function drawPlay(dt, now) {
  const { W, H, s } = app;
  const g = play_.game, r = play_.renderer;
  const lay = layout();
  const cam = play_.cam;
  cam.dpr = app.dpr;
  cam.top = 0;

  if (!play_.paused && !play_.menu && !g.finished) stepGame(g, r, dt, play_.speed);
  if (g.finished && !play_.finishedAt) {
    play_.finishedAt = now;
    recordResult();
  }
  if (play_.finishedAt && now - play_.finishedAt > 600) {
    go('results');
    play(g.won ? 'win' : 'lose');
    return;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, lay.viewH);
  ctx.clip();
  const showHover = play_.hover && now < play_.hoverUntil && !play_.hover.gone ? play_.hover : null;
  r.draw(ctx, cam, lay.viewW, lay.viewH, play_.paused || play_.menu ? 1 : Math.min(1, play_.acc * TICK_HZ), play_.paused || play_.menu ? 0 : dt * play_.speed, { highlight: showHover, markers: true });
  ctx.restore();
  ctx.setTransform(app.dpr, 0, 0, app.dpr, 0, 0);

  drawStatusBar(g, lay, showHover);
  drawSkillBar(g, lay, now);

  if (play_.paused && !play_.menu) {
    const tw = textWidth('Pause – Fähigkeiten kannst du trotzdem vergeben') * s + 12 * s;
    drawTooltip(ctx, W / 2 - tw / 2, 18 * s, tw, 16 * s);
    drawText(ctx, 'Pause – Fähigkeiten kannst du trotzdem vergeben', W / 2, 22 * s, s, '#ffffff', { align: 'center' });
  }
  if (now < play_.toastUntil && !play_.menu) {
    const tw = textWidth(play_.toast) * s + 12 * s;
    drawTooltip(ctx, W / 2 - tw / 2, lay.viewH - 22 * s, tw, 16 * s);
    drawText(ctx, play_.toast, W / 2, lay.viewH - 18 * s, s, '#ffffff', { align: 'center' });
  }
  if (play_.menu) {
    // Nur die Menüknöpfe sollen reagieren
    app.buttons = [];
    drawPauseMenu();
  }
}

function drawStatusBar(g, lay, hover) {
  const { W, s } = app;
  const h = 14 * s;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, W, h);
  const ty = (h - FONT_H * s) / 2 + s * 0.5;
  // Menüknopf rechts oben
  const mb = button({ id: 'menu', x: W - h - 2 * s, y: 0, w: h + 2 * s, h, onTap: () => { play_.menu = true; } });
  ctx.fillStyle = mb.pressed ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.12)';
  ctx.fillRect(mb.x, mb.y, mb.w, mb.h);
  drawIcon(ctx, 'menu', mb.x + s * 2, s, h - 2 * s);

  const out = g.villagers.filter((v) => !v.gone).length;
  const right = `Draußen ${out}   Gerettet ${g.saved}/${g.needed}   Zeit ${fmtTime(g.timeLeft)}`;
  const color = g.saved >= g.needed ? '#7dff6a' : '#ffffff';
  drawText(ctx, right, W - h - 6 * s, ty, s, color, { align: 'right' });
  if (hover) {
    const cnt = play_.hoverCount > 1 ? ` (${play_.hoverCount})` : '';
    drawText(ctx, describe(hover) + cnt, 4 * s, ty, s, '#ffff80');
  } else if (play_.skill) {
    drawText(ctx, SKILL_INFO[play_.skill].name, 4 * s, ty, s, '#c0c0c0');
  }
}

function drawSkillBar(g, lay, now) {
  const { W, s } = app;
  const y0 = lay.panelY;
  ctx.fillStyle = '#1b1b1b';
  ctx.fillRect(0, y0, W, lay.panelH);
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(0, y0, W, s);
  const slotH = lay.panelH - 8 - s;
  const sw = lay.slotW;
  const iy = y0 + 4 + s;
  let x = lay.gap;
  const iconSize = Math.min(sw, slotH) * 0.62;
  const ns = Math.max(1, Math.round(s * (lay.panelH < 70 ? 0.75 : 1)));

  const slotButton = (id, opts) => {
    const b = button({ id, x, y: iy, w: sw, h: slotH, ...opts });
    x += sw + lay.gap;
    return b;
  };
  const center = (b, icon, alpha = 1) => drawIcon(ctx, icon, b.x + (b.w - iconSize) / 2, b.y + (b.h - iconSize) / 2 - slotH * 0.06, iconSize, alpha);

  // Freisetzungsrate
  const minus = slotButton('rate-', { onDown: () => g.setRate(g.rate - 1), repeat: true });
  drawSlot(ctx, minus.x, minus.y, minus.w, minus.h, Math.max(1, s / 2), false, minus.pressed);
  center(minus, 'minus');
  drawText(ctx, String(g.minRate), minus.x + minus.w / 2, minus.y + minus.h - 9 * ns, ns, '#ffffff', { align: 'center' });
  const plus = slotButton('rate+', { onDown: () => g.setRate(g.rate + 1), repeat: true });
  drawSlot(ctx, plus.x, plus.y, plus.w, plus.h, Math.max(1, s / 2), false, plus.pressed);
  center(plus, 'plus');
  drawText(ctx, String(g.rate), plus.x + plus.w / 2, plus.y + plus.h - 9 * ns, ns, '#ffff80', { align: 'center' });

  x += lay.gap;
  for (const sk of SKILLS) {
    const n = g.skills[sk];
    const b = slotButton('sk-' + sk, { onDown: () => selectSkill(sk) });
    drawSlot(ctx, b.x, b.y, b.w, b.h, Math.max(1, s / 2), play_.skill === sk, n === 0);
    center(b, sk, n === 0 ? 0.35 : 1);
    if (n > 0) drawText(ctx, String(n), b.x + b.w - 2 * ns, b.y + b.h - 9 * ns, ns, '#ffffff', { align: 'right' });
  }
  x += lay.gap;
  const pause = slotButton('pause', { onDown: togglePause });
  drawSlot(ctx, pause.x, pause.y, pause.w, pause.h, Math.max(1, s / 2), play_.paused, false);
  center(pause, play_.paused ? 'play' : 'pause');
  const armed = now - play_.nukeArmed < 1500;
  const nuke = slotButton('nuke', {
    onDown: () => {
      if (g.nuking) return;
      if (armed) { g.nuke(); play_.nukeArmed = 0; vibrate(40); }
      else { play_.nukeArmed = performance.now(); toast('Nochmal tippen: Alle zünden ihr TNT!', 1500); }
    },
  });
  drawSlot(ctx, nuke.x, nuke.y, nuke.w, nuke.h, Math.max(1, s / 2), armed, g.nuking);
  center(nuke, 'nuke', g.nuking ? 0.4 : 1);
  const ff = slotButton('ff', { onDown: () => { play_.speed = play_.speed === 1 ? 3 : 1; } });
  drawSlot(ctx, ff.x, ff.y, ff.w, ff.h, Math.max(1, s / 2), play_.speed > 1, false);
  center(ff, 'ff');

  drawMinimap(g, lay, x, iy, W - x - lay.gap, slotH);
}

function drawMinimap(g, lay, x, y, w, h) {
  const now = performance.now();
  if (!play_.minimap || now - play_.minimapAge > 400) {
    play_.minimap = buildMinimap(g, play_.minimap);
    play_.minimapAge = now;
  }
  const map = play_.minimap;
  const t = g.terrain;
  const k = Math.min(w / map.width, h / map.height);
  const mw = map.width * k, mh = map.height * k;
  const mx = x + (w - mw) / 2, my = y + (h - mh) / 2;
  ctx.fillStyle = '#000';
  ctx.fillRect(x, y, w, h);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(map, mx, my, mw, mh);
  const sc = mw / t.w;
  for (const v of g.villagers) {
    if (v.gone) continue;
    ctx.fillStyle = v.bomb >= 0 ? '#ff4040' : v.state === 'blocker' ? '#ffff40' : '#40ff60';
    ctx.fillRect(mx + v.x * sc - 1, my + (v.y - 8) * sc - 1, 2, 2);
  }
  const cam = play_.cam;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(mx + cam.x * sc, my + cam.y * sc, lay.viewW / cam.zoom * sc, lay.viewH / cam.zoom * sc);
  const jump = (p) => {
    cam.x = (p.x - mx) / sc - lay.viewW / cam.zoom / 2;
    cam.y = (p.y - my) / sc - lay.viewH / cam.zoom / 2;
    clampCam();
  };
  button({ id: 'minimap', x, y, w, h, onDown: jump, drag: jump });
}

function drawPauseMenu() {
  const { W, H, s } = app;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, W, H);
  drawText(ctx, 'Spiel pausiert', W / 2, H * 0.12, s * 2, '#ffffff', { align: 'center' });
  const bw = Math.min(W * 0.7, 200 * s), bh = 20 * s;
  const x = W / 2 - bw / 2;
  let y = H * 0.12 + 26 * s;
  const items = [
    ['resume', 'Weiter spielen', () => { play_.menu = false; }],
    ['restart', 'Level neu starten', () => startLevel(app.world, app.level)],
    ['sound', `Ton: ${save.sound ? 'An' : 'Aus'}   ·   Musik: ${save.music ? 'An' : 'Aus'}`, () => cycleSound()],
    ['quit', 'Level verlassen', () => { play_.game = null; go('levels'); }],
  ];
  for (const [id, label, fn] of items) {
    drawButton(ctx, button({ id: 'pm-' + id, x, y, w: bw, h: bh, label, onTap: fn }), s);
    y += bh + 4 * s;
  }
}

function cycleSound() {
  // An/An → An/Aus → Aus/Aus → An/An
  if (save.sound && save.music) save.music = false;
  else if (save.sound) save.sound = false;
  else { save.sound = true; save.music = true; }
  setSound(save.sound);
  setMusic(save.music);
  if (save.music) startMusic(app.screen === 'play' ? WORLDS[app.world].theme : 'overworld');
  else stopMusic();
  persist();
}

function recordResult() {
  const g = play_.game;
  if (!g.won) return;
  const id = levelId(app.world, app.level);
  save.done[id] = Math.max(save.done[id] ?? 0, g.savedPercent);
  persist();
}

function resultMessage(g) {
  const pct = g.savedPercent;
  if (g.saved === g.total) return 'Wahnsinn! Jeder einzelne Villager ist sicher zu Hause.';
  if (g.saved > g.needed) return 'Mehr als genug! Das ganze Dorf ist stolz auf dich.';
  if (g.saved === g.needed) return 'Genau richtig. Das war knapp!';
  if (g.saved === 0) return 'Kein einziger Villager hat es geschafft … Hrmm.';
  if (g.needed - g.saved <= Math.max(1, Math.round(g.total * 0.1))) return `So knapp! Nur ${g.needed - g.saved} mehr, und du hättest es geschafft.`;
  return pct < 20 ? 'Das war leider nichts. Versuch es gleich noch einmal!' : 'Nicht genug gerettet. Du schaffst das!';
}

function drawResults(dt) {
  const { W, H, s } = app;
  const g = play_.game;
  drawDirt(ctx, 0, 0, W, H, 4 * s);
  const world = WORLDS[app.world];
  let y = H * 0.1;
  drawText(ctx, g.won ? 'Level geschafft!' : 'Level nicht geschafft', W / 2, y, s * 3, g.won ? '#7dff6a' : '#ff8080', { align: 'center' });
  y += 34 * s;
  drawText(ctx, `Gerettet: ${g.savedPercent}%  (${g.saved} von ${g.total})`, W / 2, y, s * 2, '#ffffff', { align: 'center' });
  y += 20 * s;
  drawText(ctx, `Nötig: ${g.neededPercent}%  (${g.needed})`, W / 2, y, s * 2, '#c0c0c0', { align: 'center' });
  y += 24 * s;
  for (const line of wrapText(resultMessage(g), W * 0.85, s)) {
    drawText(ctx, line, W / 2, y, s, '#ffff80', { align: 'center' });
    y += 11 * s;
  }
  const hasNext = app.level + 1 < world.levels.length;
  const bw = Math.min(110 * s, (W - 30 * s) / 3), bh = 20 * s;
  const by = H - bh - 10 * s;
  const btns = [];
  if (g.won && hasNext) btns.push(['next', 'Nächstes Level', () => { app.level++; go('preview'); }]);
  btns.push(['retry', 'Nochmal', () => startLevel(app.world, app.level)]);
  btns.push(['list', 'Levelauswahl', () => go('levels')]);
  let x = W / 2 - (btns.length * bw + (btns.length - 1) * 6 * s) / 2;
  for (const [id, label, fn] of btns) {
    drawButton(ctx, button({ id: 'r-' + id, x, y: by, w: bw, h: bh, label, onTap: fn }), s);
    x += bw + 6 * s;
  }
  if (g.won && !hasNext) {
    drawText(ctx, `Du hast alle Level der Welt „${world.name}“ geschafft!`, W / 2, by - 16 * s, s, '#7dff6a', { align: 'center' });
  }
}

const RULES = [
  'Bringe genug Villager aus der Falltür ins Dorfhaus.',
  'Fähigkeit unten wählen, dann einen Villager antippen – auch während der Pause.',
  'Ein Finger verschiebt die Ansicht, zwei Finger zoomen. Die Karte rechts unten springt an die angetippte Stelle.',
  '– und + ändern das Tempo, in dem Villager kommen. Creeper zweimal antippen: Alle zünden ihr TNT.',
  'Obsidian, Grundgestein und Eisen sind unzerstörbar. Pfeilblöcke nur in Pfeilrichtung durchgraben.',
  'Mehr als 10 Blöcke Sturz, Wasser, Lava, Feuer und Kolben sind tödlich. Gleiter überleben den Sturz.',
];

function drawHelp() {
  const { W, H, s } = app;
  drawDirt(ctx, 0, 0, W, H, 4 * s);
  const page = app.helpPage ?? 0;
  drawText(ctx, page === 0 ? 'Anleitung: Fähigkeiten' : 'Anleitung: Regeln', W / 2, 6 * s, s * 2, '#ffffff', { align: 'center' });
  const top = 26 * s, bottom = H - 28 * s;
  if (page === 0) {
    const colW = W / 2 - 12 * s;
    const rowH = (bottom - top) / 4;
    const icon = Math.min(16 * s, rowH - 4 * s);
    SKILLS.forEach((sk, i) => {
      const x = 8 * s + Math.floor(i / 4) * (colW + 8 * s);
      const y = top + (i % 4) * rowH;
      drawIcon(ctx, sk, x, y, icon);
      const tx = x + icon + 5 * s;
      drawText(ctx, SKILL_INFO[sk].name, tx, y, s, '#ffff80');
      wrapText(SKILL_INFO[sk].text, colW - icon - 8 * s, s).slice(0, Math.max(1, Math.floor((rowH - 10 * s) / (9 * s))))
        .forEach((line, j) => drawText(ctx, line, tx, y + (10 + 9 * j) * s, s, '#e0e0e0'));
    });
  } else {
    let y = top;
    for (const r of RULES) {
      for (const line of wrapText(r, W - 24 * s, s)) {
        drawText(ctx, line, 12 * s, y, s, '#ffffff');
        y += 9 * s;
      }
      y += 3 * s;
    }
  }
  const bw = 100 * s, bh = 18 * s, by = H - bh - 6 * s;
  drawButton(ctx, button({ id: 'back', x: W / 2 - bw - 4 * s, y: by, w: bw, h: bh, label: 'Zurück',
    onTap: () => { if (page === 0) go('title'); else app.helpPage = 0; } }), s);
  drawButton(ctx, button({ id: 'next', x: W / 2 + 4 * s, y: by, w: bw, h: bh, label: page === 0 ? 'Regeln' : 'Fertig',
    onTap: () => { if (page === 0) app.helpPage = 1; else { app.helpPage = 0; go('title'); } } }), s);
}

function drawOptions(dt) {
  const { W, H, s } = app;
  drawMenuBackground(dt);
  drawText(ctx, 'Optionen', W / 2, 10 * s, s * 2, '#ffffff', { align: 'center' });
  const bw = Math.min(W * 0.7, 200 * s), bh = 20 * s;
  const x = W / 2 - bw / 2;
  let y = 36 * s;
  const toggle = (id, label, key, after) => {
    drawButton(ctx, button({
      id, x, y, w: bw, h: bh, label: `${label}: ${save[key] ? 'An' : 'Aus'}`,
      onTap: () => { save[key] = !save[key]; persist(); after?.(); },
    }), s);
    y += bh + 4 * s;
  };
  toggle('o-sound', 'Ton', 'sound', () => setSound(save.sound));
  toggle('o-music', 'Musik', 'music', () => { setMusic(save.music); if (save.music) startMusic('overworld'); else stopMusic(); });
  toggle('o-hap', 'Vibration', 'haptics');
  const confirming = performance.now() - app.confirmReset < 3000;
  drawButton(ctx, button({
    id: 'o-reset', x, y, w: bw, h: bh, label: confirming ? 'Wirklich alles löschen?' : 'Fortschritt zurücksetzen',
    onTap: () => {
      if (confirming) { save.done = {}; persist(); app.confirmReset = 0; }
      else app.confirmReset = performance.now();
    },
  }), s);
  y += bh + 4 * s;
  if (window.Android?.checkUpdate) {
    drawButton(ctx, button({ id: 'o-update', x, y, w: bw, h: bh, label: 'Nach Updates suchen', onTap: () => window.Android.checkUpdate() }), s);
  }
  drawButton(ctx, button({ id: 'back', x, y: H - bh - 8 * s, w: bw, h: bh, label: 'Fertig', onTap: () => go('title') }), s);
}

function drawRotateHint() {
  const { W, H, s } = app;
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(0, 0, W, H);
  drawText(ctx, 'Bitte das Handy quer halten', W / 2, H / 2 - 4 * s, s, '#ffffff', { align: 'center' });
}

// ------------------------------------------------------------ Start

resize();
preloadSprites();
go('title');
requestAnimationFrame(frame);

// Für die automatischen Tests im Browser
const testHooks = {};
window.__villemmings = { app, play_, startLevel, go, testHooks };
