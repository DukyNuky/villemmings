// Alle Geräusche werden mit WebAudio erzeugt, es gibt keine Tondateien.

import { M } from './materials.js';

let ac = null;
let master = null;
let sfxGain = null;
let musicGain = null;
let noiseBuf = null;
const lastPlayed = new Map();

export const audio = {
  sound: true,
  music: true,
  musicTheme: 'overworld',
};

function ensure() {
  if (ac) return ac;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ac = new AC();
  master = ac.createGain();
  master.gain.value = 0.8;
  master.connect(ac.destination);
  sfxGain = ac.createGain();
  sfxGain.gain.value = audio.sound ? 1 : 0;
  sfxGain.connect(master);
  musicGain = ac.createGain();
  musicGain.gain.value = audio.music ? 0.35 : 0;
  musicGain.connect(master);
  noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ac;
}

// Muss aus einer Berührung heraus aufgerufen werden (Autoplay-Regeln)
export function unlockAudio() {
  const a = ensure();
  if (a && a.state === 'suspended') a.resume();
}

export function setSound(on) {
  audio.sound = on;
  if (sfxGain) sfxGain.gain.value = on ? 1 : 0;
}

export function setMusic(on) {
  audio.music = on;
  if (musicGain) musicGain.gain.setTargetAtTime(on ? 0.35 : 0, ac.currentTime, 0.3);
}

export function suspendAudio(yes) {
  if (!ac) return;
  if (yes) ac.suspend(); else ac.resume();
}

// ------------------------------------------------------------ Bausteine

function env(g, t, a, d, peak) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}

function noise(t, dur, { type = 'lowpass', freq = 1000, q = 1, gain = 0.5, attack = 0.005, sweep = null, pan = 0, dest = sfxGain } = {}) {
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = ac.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
  f.Q.value = q;
  const g = ac.createGain();
  env(g, t, attack, dur, gain);
  src.connect(f).connect(g);
  connectPan(g, pan, dest);
  src.start(t, Math.random() * 0.5);
  src.stop(t + attack + dur + 0.05);
}

function tone(t, freq, dur, { type = 'sine', gain = 0.3, attack = 0.005, slide = null, pan = 0, dest = sfxGain } = {}) {
  const o = ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  const g = ac.createGain();
  env(g, t, attack, dur, gain);
  o.connect(g);
  connectPan(g, pan, dest);
  o.start(t);
  o.stop(t + attack + dur + 0.05);
}

function connectPan(node, pan, dest) {
  if (pan && ac.createStereoPanner) {
    const p = ac.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    node.connect(p).connect(dest);
  } else {
    node.connect(dest);
  }
}

// Das typische nasale "Hmm" eines Dorfbewohners: Sägezahn durch zwei Formanten
function villagerVoice(t, { pitch = 1, dur = 0.32, contour = [1, 1.15, 0.9], gain = 0.22, pan = 0 } = {}) {
  const o = ac.createOscillator();
  o.type = 'sawtooth';
  const base = 150 * pitch * (0.95 + Math.random() * 0.1);
  o.frequency.setValueAtTime(base * contour[0], t);
  o.frequency.linearRampToValueAtTime(base * contour[1], t + dur * 0.35);
  o.frequency.linearRampToValueAtTime(base * contour[2], t + dur);
  const vib = ac.createOscillator();
  vib.frequency.value = 7;
  const vg = ac.createGain();
  vg.gain.value = base * 0.03;
  vib.connect(vg).connect(o.frequency);
  const out = ac.createGain();
  env(out, t, 0.03, dur, gain);
  for (const [f, q, a] of [[650, 6, 1], [1150, 8, 0.6], [280, 3, 0.7]]) {
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f;
    bp.Q.value = q;
    const g = ac.createGain();
    g.gain.value = a;
    o.connect(bp).connect(g).connect(out);
  }
  connectPan(out, pan, sfxGain);
  o.start(t); vib.start(t);
  o.stop(t + dur + 0.1); vib.stop(t + dur + 0.1);
}

// ------------------------------------------------------------ Geräusche

const SOUNDS = {
  assign: (t) => { tone(t, 880, 0.05, { type: 'square', gain: 0.08 }); tone(t + 0.03, 1320, 0.05, { type: 'square', gain: 0.06 }); },
  click: (t) => { noise(t, 0.04, { type: 'bandpass', freq: 2500, q: 2, gain: 0.25 }); tone(t, 600, 0.03, { type: 'square', gain: 0.05 }); },
  select: (t) => { tone(t, 660, 0.04, { type: 'triangle', gain: 0.12 }); },
  hatch: (t) => { noise(t, 0.12, { freq: 400, gain: 0.6 }); tone(t, 110, 0.15, { type: 'triangle', gain: 0.3 }); noise(t + 0.1, 0.08, { freq: 900, gain: 0.3 }); },
  letsgo: (t, p) => villagerVoice(t, { pitch: 1.15, contour: [0.9, 1.25, 1.3], pan: p }),
  brick: (t, p) => noise(t, 0.05, { type: 'bandpass', freq: 900, q: 3, gain: 0.35, pan: p }),
  brickwarn: (t, p) => { noise(t, 0.05, { type: 'bandpass', freq: 900, q: 3, gain: 0.35, pan: p }); tone(t, 1200, 0.08, { type: 'square', gain: 0.05, pan: p }); },
  dig: (t, p, e) => {
    const hard = e?.hard;
    noise(t, hard ? 0.07 : 0.1, { type: 'bandpass', freq: hard ? 1800 : 500, q: 1.2, gain: hard ? 0.3 : 0.45, pan: p });
  },
  ting: (t, p) => { tone(t, 1900, 0.4, { gain: 0.15, pan: p }); tone(t, 2850, 0.25, { gain: 0.07, pan: p }); },
  ohno: (t, p) => { villagerVoice(t, { pitch: 1.3, contour: [1, 0.85, 1.35], dur: 0.4, pan: p }); noise(t, 0.9, { type: 'highpass', freq: 3500, gain: 0.12, pan: p }); },
  fuse: (t, p) => noise(t, 0.8, { type: 'highpass', freq: 3000, gain: 0.12, pan: p }),
  explosion: (t, p) => {
    noise(t, 1.1, { freq: 1600, sweep: 120, gain: 1.0, attack: 0.003, pan: p });
    tone(t, 90, 0.5, { type: 'sine', gain: 0.6, slide: 40, pan: p });
  },
  splat: (t, p) => { noise(t, 0.12, { freq: 300, gain: 0.7, pan: p }); villagerVoice(t + 0.05, { pitch: 0.75, contour: [1.1, 0.9, 0.7], dur: 0.35, pan: p }); },
  splash: (t, p) => { noise(t, 0.5, { type: 'bandpass', freq: 1200, sweep: 300, q: 0.8, gain: 0.45, pan: p }); villagerVoice(t + 0.1, { pitch: 0.8, contour: [1, 0.8, 0.7], pan: p }); },
  burn: (t, p) => { noise(t, 0.6, { type: 'highpass', freq: 2000, gain: 0.3, pan: p }); villagerVoice(t + 0.05, { pitch: 0.85, contour: [1.2, 1, 0.75], pan: p }); },
  piston: (t, p) => { noise(t, 0.08, { freq: 700, gain: 0.6, pan: p }); tone(t, 160, 0.1, { type: 'square', gain: 0.12, pan: p }); noise(t + 0.6, 0.06, { freq: 500, gain: 0.35, pan: p }); },
  exit: (t, p) => {
    // Erfahrungskugel-Klang und ein zufriedenes Hmm
    const f = 1400 + Math.random() * 900;
    tone(t, f, 0.18, { gain: 0.12, pan: p });
    tone(t + 0.06, f * 1.5, 0.22, { gain: 0.08, pan: p });
    villagerVoice(t + 0.05, { pitch: 1.1, contour: [1, 1.2, 1.1], dur: 0.25, gain: 0.15, pan: p });
  },
  glide: (t, p) => noise(t, 0.35, { type: 'bandpass', freq: 600, sweep: 1500, q: 1, gain: 0.2, pan: p }),
  nuke: (t) => { noise(t, 1.5, { type: 'highpass', freq: 2500, sweep: 5000, gain: 0.35 }); villagerVoice(t, { pitch: 1.4, contour: [1, 1.4, 1.5], dur: 0.5 }); },
  win: (t) => { [523, 659, 784, 1047].forEach((f, i) => tone(t + i * 0.12, f, 0.35, { type: 'triangle', gain: 0.18 })); },
  lose: (t) => { [392, 349, 311, 262].forEach((f, i) => tone(t + i * 0.16, f, 0.4, { type: 'triangle', gain: 0.16 })); },
  hmm: (t) => villagerVoice(t, {}),
};

// Stein klingt heller als Erde
const HARD = new Set(['stone', 'cobble', 'mossy', 'bricks', 'stonebricks', 'netherbricks', 'quartz', 'blackstone',
  'endstone', 'endbricks', 'purpur', 'deepslate', 'coalore', 'ironore', 'goldore', 'diamondore', 'redstoneore',
  'emeraldore', 'glass', 'ice'].map((n) => M[n]));

export function play(name, opts = {}) {
  if (!audio.sound || !ensure() || ac.state !== 'running') return;
  const fn = SOUNDS[name];
  if (!fn) return;
  const now = ac.currentTime;
  const minGap = name === 'dig' || name === 'brick' ? 0.06 : name === 'exit' ? 0.05 : 0.03;
  if ((lastPlayed.get(name) ?? -1) > now - minGap) return;
  lastPlayed.set(name, now);
  fn(now + 0.005, opts.pan ?? 0, { hard: HARD.has(opts.mat) });
}

// ------------------------------------------------------------ Musik

// Ruhige, zufällig gespielte Klaviertöne – je Welt eine andere Tonleiter
const SCALES = {
  overworld: [0, 2, 4, 7, 9],
  caves: [0, 3, 5, 7, 10],
  nether: [0, 1, 3, 7, 8],
  end: [0, 2, 3, 7, 9],
};
const ROOTS = { overworld: 60, caves: 57, nether: 52, end: 55 };

let musicTimer = null;
let delayNode = null;

function piano(t, midi, vel) {
  const f = 440 * Math.pow(2, (midi - 69) / 12);
  const out = ac.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(vel, t + 0.01);
  out.gain.exponentialRampToValueAtTime(vel * 0.35, t + 0.4);
  out.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1800;
  for (const [mult, type, g] of [[1, 'triangle', 1], [2, 'sine', 0.35], [3, 'sine', 0.12]]) {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.value = f * mult;
    const og = ac.createGain();
    og.gain.value = g;
    o.connect(og).connect(lp);
    o.start(t);
    o.stop(t + 3.3);
  }
  lp.connect(out);
  out.connect(musicGain);
  out.connect(delayNode);
}

function setupDelay() {
  if (delayNode) return;
  delayNode = ac.createDelay(1.5);
  delayNode.delayTime.value = 0.42;
  const fb = ac.createGain();
  fb.gain.value = 0.38;
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1200;
  delayNode.connect(lp).connect(fb).connect(delayNode);
  lp.connect(musicGain);
}

function phrase() {
  if (!ac || ac.state !== 'running' || !audio.music) return;
  setupDelay();
  const scale = SCALES[audio.musicTheme] ?? SCALES.overworld;
  const root = ROOTS[audio.musicTheme] ?? 60;
  const t = ac.currentTime + 0.05;
  const notes = 2 + Math.floor(Math.random() * 4);
  let deg = Math.floor(Math.random() * scale.length);
  for (let i = 0; i < notes; i++) {
    deg = Math.max(0, Math.min(scale.length * 2 - 1, deg + Math.floor(Math.random() * 5) - 2));
    const midi = root + scale[deg % scale.length] + 12 * Math.floor(deg / scale.length);
    piano(t + i * (0.35 + Math.random() * 0.4), midi, 0.12 + Math.random() * 0.06);
  }
  if (Math.random() < 0.6) piano(t, root - 12 + scale[Math.floor(Math.random() * 3)], 0.08);
}

export function startMusic(theme) {
  audio.musicTheme = theme;
  stopMusic();
  const loop = () => {
    phrase();
    musicTimer = setTimeout(loop, 3500 + Math.random() * 4500);
  };
  musicTimer = setTimeout(loop, 800);
}

export function stopMusic() {
  if (musicTimer) clearTimeout(musicTimer);
  musicTimer = null;
}
