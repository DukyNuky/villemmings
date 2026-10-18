// Spielablauf eines Levels, unabhängig von Grafik und Ton, damit er sich auch
// ohne Browser testen lässt (tools/test-levels.mjs). Ein Takt = 1/25 Sekunde.
//
// Koordinaten in Geländepunkten (8 pro Block). Ein Villager steht bei (x, y):
// y ist die Zeile des Bodens unter seinen Füßen, sein Körper reicht von
// y-16 bis y-1.

import { parseLevel, SKILLS } from './level.js';
import { LIQUID_WATER, LIQUID_LAVA, BLOCK } from './terrain.js';
import { M } from './materials.js';

export const TICK_HZ = 25;

export const HEIGHT = 16;
const STEP_UP = 8;           // bis zu einem Block steigt ein Villager einfach hoch
const STEP_DOWN = 4;         // tiefer als ein halber Block: er fällt
const FALL_SPEED = 3;
const SAFE_FALL = 80;        // mehr als 10 Blöcke Sturz überlebt nur ein Gleiter
const GLIDER_OPENS = 16;
const BLOCKER_FIELD = 6;
const BRICKS = 12;
const BRICK_TICKS = 20;
const BOMB_TICKS = 5 * TICK_HZ;
const OHNO_TICKS = 20;
const EXPLOSION_RADIUS = 13;
const HATCH_OPENS = 20;
const FIRST_SPAWN = 45;
const END_DELAY = 2 * TICK_HZ;

const PROFESSIONS = ['farmer', 'librarian', 'cleric', 'smith', 'fisher', 'nitwit', 'shepherd', 'butcher'];

// Diese Zustände gelten als "steht auf dem Boden und tut etwas"
const GROUND_STATES = new Set(['walker', 'shrugger', 'builder', 'basher', 'miner', 'digger']);
const DYING = new Set(['splatter', 'drowning', 'burning', 'crushed', 'exploded', 'exiting', 'fellout']);

export function spawnInterval(rate) {
  return Math.round((53 - rate / 2) * TICK_HZ / 17);
}

export class Game {
  constructor(def) {
    this.def = def;
    const lvl = parseLevel(def);
    this.level = lvl;
    this.terrain = lvl.terrain;
    this.entrances = lvl.entrances;
    this.exits = lvl.exits;
    this.traps = lvl.traps;
    this.fires = lvl.fires;
    this.total = def.villagers;
    this.needed = def.save;
    this.minRate = def.rate ?? 50;
    this.rate = this.minRate;
    this.skills = {};
    for (const s of SKILLS) this.skills[s] = def.skills?.[s] ?? 0;
    this.timeLeft = (def.time ?? 300) * TICK_HZ;
    this.tick = 0;
    this.villagers = [];
    this.spawned = 0;
    this.saved = 0;
    this.dead = 0;
    this.nextSpawn = FIRST_SPAWN;
    this.spawnIndex = 0;
    this.nuking = false;
    this.finished = false;
    this.endTimer = -1;
    this.hatchOpen = 0;       // 0..1 für die Grafik
    this.events = [];
    this.seed = 12345;
    this.nextId = 0;
  }

  random() {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  emit(type, data) {
    this.events.push({ type, ...data });
  }

  get alive() {
    let n = 0;
    for (const v of this.villagers) if (!v.gone) n++;
    return n;
  }

  get savedPercent() {
    return Math.floor((this.saved * 100) / this.total);
  }

  get neededPercent() {
    return Math.ceil((this.needed * 100) / this.total);
  }

  get won() {
    return this.saved >= this.needed;
  }

  setRate(rate) {
    this.rate = Math.max(this.minRate, Math.min(99, rate));
  }

  nuke() {
    if (this.nuking || this.finished) return;
    this.nuking = true;
    this.emit('sound', { name: 'nuke' });
  }

  // ---------------------------------------------------------------- Takt

  step() {
    if (this.finished) return;
    this.tick++;
    this.prevTick();

    if (this.tick === HATCH_OPENS) this.emit('sound', { name: 'hatch' });
    if (this.tick >= HATCH_OPENS) this.hatchOpen = Math.min(1, (this.tick - HATCH_OPENS) / 15);
    if (this.tick === HATCH_OPENS + 15) this.emit('sound', { name: 'letsgo' });

    this.spawn();
    if (this.nuking) this.nukeNext();

    for (const t of this.traps) if (t.busy > 0) t.busy--;

    for (const v of this.villagers) {
      if (v.gone) continue;
      v.anim++;
      this.updateBomb(v);
      if (v.gone) continue;
      this.updateVillager(v);
      if (!v.gone && !DYING.has(v.state)) this.checkSurroundings(v);
    }

    if (this.timeLeft > 0) this.timeLeft--;
    if (this.timeLeft === 0) {
      this.finish();
      return;
    }

    const allOut = this.spawned >= this.total || this.nuking;
    if (allOut && this.alive === 0) {
      if (this.endTimer < 0) this.endTimer = END_DELAY;
      else if (--this.endTimer === 0) this.finish();
    }
  }

  prevTick() {
    for (const v of this.villagers) { v.px = v.x; v.py = v.y; }
  }

  finish() {
    this.finished = true;
    this.emit('finished', {});
  }

  spawn() {
    if (this.nuking || this.spawned >= this.total || this.tick < this.nextSpawn) return;
    const e = this.entrances[this.spawnIndex % this.entrances.length];
    this.spawnIndex++;
    const v = {
      id: this.nextId++,
      x: e.x, y: e.y, px: e.x, py: e.y,
      dir: e.dir,
      state: 'faller',
      fallDist: 0,
      climber: false,
      floater: false,
      bomb: -1,
      bricks: 0,
      t: 0,
      anim: 0,
      gone: false,
      prof: PROFESSIONS[Math.floor(this.random() * PROFESSIONS.length)],
    };
    this.villagers.push(v);
    this.spawned++;
    this.nextSpawn = this.tick + spawnInterval(this.rate);
  }

  nukeNext() {
    for (const v of this.villagers) {
      if (!v.gone && v.bomb < 0 && !DYING.has(v.state)) {
        v.bomb = BOMB_TICKS;
        return;
      }
    }
  }

  setState(v, state) {
    v.state = state;
    v.t = 0;
    v.anim = 0;
  }

  kill(v, state, sound) {
    this.setState(v, state);
    v.bomb = -1;
    if (sound) this.emit('sound', { name: sound, x: v.x, y: v.y });
  }

  remove(v, saved) {
    v.gone = true;
    if (saved) this.saved++;
    else this.dead++;
  }

  // ------------------------------------------------------------ Fähigkeiten

  canAssign(v, skill) {
    if (v.gone || DYING.has(v.state) || v.state === 'ohno') return false;
    switch (skill) {
      case 'climber': return !v.climber;
      case 'floater': return !v.floater;
      case 'bomber': return v.bomb < 0;
      case 'blocker':
        if (!GROUND_STATES.has(v.state)) return false;
        // Zwei Blocker dürfen sich nicht überlappen
        return !this.villagers.some((o) => o !== v && !o.gone && o.state === 'blocker'
          && Math.abs(o.x - v.x) <= BLOCKER_FIELD * 2 && Math.abs(o.y - v.y) < HEIGHT);
      case 'builder':
      case 'basher':
      case 'miner':
      case 'digger':
        return GROUND_STATES.has(v.state) && v.state !== skill;
      default: return false;
    }
  }

  assign(v, skill) {
    if (!this.skills[skill] || !this.canAssign(v, skill)) return false;
    this.skills[skill]--;
    switch (skill) {
      case 'climber': v.climber = true; break;
      case 'floater': v.floater = true; break;
      case 'bomber': v.bomb = BOMB_TICKS; break;
      case 'blocker': this.setState(v, 'blocker'); break;
      case 'builder': this.setState(v, 'builder'); v.bricks = BRICKS; break;
      default: this.setState(v, skill);
    }
    this.emit('sound', { name: 'assign' });
    return true;
  }

  updateBomb(v) {
    if (v.bomb < 0 || DYING.has(v.state) || v.state === 'ohno') return;
    if (--v.bomb > 0) return;
    v.bomb = -1;
    if (v.state === 'blocker' || GROUND_STATES.has(v.state)) {
      this.setState(v, 'ohno');
      this.emit('sound', { name: 'ohno', x: v.x, y: v.y });
    } else {
      this.explode(v);
    }
  }

  explode(v) {
    const t = this.terrain;
    // Reicht einen Block unter die Füße: dünne Böden fliegen weg
    t.carveCircle(v.x, v.y - 5, EXPLOSION_RADIUS);
    this.emit('explosion', { x: v.x, y: v.y - 5, mat: t.lastMat });
    this.setState(v, 'exploded');
    this.remove(v, false);
  }

  // --------------------------------------------------------- Bewegungen

  updateVillager(v) {
    v.t++;
    switch (v.state) {
      case 'walker': this.walk(v); break;
      case 'faller': this.fall(v); break;
      case 'floater': this.float(v); break;
      case 'climbing': this.climb(v); break;
      case 'hoister': this.hoist(v); break;
      case 'blocker': this.block(v); break;
      case 'builder': this.build(v); break;
      case 'shrugger': if (v.t >= 12) this.setState(v, 'walker'); break;
      case 'basher': this.bash(v); break;
      case 'miner': this.mine(v); break;
      case 'digger': this.dig(v); break;
      case 'ohno':
        if (v.t >= OHNO_TICKS) this.explode(v);
        else if (!this.terrain.solid(v.x, v.y)) this.fallSilently(v);
        break;
      case 'exiting': if (v.t >= 16) this.remove(v, true); break;
      case 'splatter': if (v.t >= 16) this.remove(v, false); break;
      case 'drowning': if (v.t >= 25) this.remove(v, false); break;
      case 'burning': if (v.t >= 25) this.remove(v, false); break;
      case 'crushed': if (v.t >= 10) this.remove(v, false); break;
      case 'fellout': this.remove(v, false); break;
    }
  }

  // Ein "Oh nein!"-Villager über einem Loch fällt mit, bleibt aber Bombe
  fallSilently(v) {
    for (let i = 0; i < FALL_SPEED && !this.terrain.solid(v.x, v.y); i++) v.y++;
    if (v.y >= this.terrain.h) this.kill(v, 'fellout');
  }

  walk(v) {
    const t = this.terrain;
    const nx = v.x + v.dir;
    if (t.solid(nx, v.y - 1)) {
      // Hindernis: wie hoch ist es?
      let up = 1;
      while (up <= STEP_UP && t.solid(nx, v.y - 1 - up)) up++;
      if (up > STEP_UP || nx < 0 || nx >= t.w) {
        if (v.climber && nx >= 0 && nx < t.w) {
          this.setState(v, 'climbing');
        } else {
          v.dir = -v.dir;
        }
        return;
      }
      v.x = nx;
      v.y -= up;
      return;
    }
    v.x = nx;
    if (t.solid(v.x, v.y)) return;
    let down = 0;
    while (down < STEP_DOWN && !t.solid(v.x, v.y)) { v.y++; down++; }
    if (!t.solid(v.x, v.y)) {
      this.setState(v, 'faller');
      v.fallDist = down;
    }
  }

  fall(v) {
    const t = this.terrain;
    for (let i = 0; i < FALL_SPEED; i++) {
      if (t.solid(v.x, v.y)) {
        this.land(v);
        return;
      }
      if (this.inLiquid(v, v.x, v.y)) return;
      v.y++;
      v.fallDist++;
      if (v.y >= t.h) { this.kill(v, 'fellout'); return; }
    }
    if (v.floater && v.fallDist > GLIDER_OPENS) {
      this.setState(v, 'floater');
      this.emit('sound', { name: 'glide', x: v.x, y: v.y });
    }
  }

  float(v) {
    const t = this.terrain;
    const speed = v.t % 2 ? 1 : 2;
    for (let i = 0; i < speed; i++) {
      if (t.solid(v.x, v.y)) {
        v.fallDist = 0;
        this.setState(v, 'walker');
        return;
      }
      if (this.inLiquid(v, v.x, v.y)) return;
      v.y++;
      if (v.y >= t.h) { this.kill(v, 'fellout'); return; }
    }
  }

  land(v) {
    if (v.fallDist > SAFE_FALL) {
      this.kill(v, 'splatter', 'splat');
    } else {
      this.setState(v, 'walker');
    }
    v.fallDist = 0;
  }

  climb(v) {
    const t = this.terrain;
    if (v.t % 3 === 0) return;
    // Oben ist die Decke: zurückfallen
    if (v.y - HEIGHT - 1 < 0 || t.solid(v.x, v.y - HEIGHT - 1)) {
      v.dir = -v.dir;
      v.x += v.dir;
      this.setState(v, 'faller');
      v.fallDist = 0;
      return;
    }
    v.y--;
    if (!t.solid(v.x + v.dir, v.y - 1)) this.setState(v, 'hoister');
  }

  hoist(v) {
    if (v.t < 8) return;
    const t = this.terrain;
    v.x += v.dir;
    let up = 0;
    while (up < STEP_UP && t.solid(v.x, v.y - 1)) { v.y--; up++; }
    this.setState(v, 'walker');
    if (!t.solid(v.x, v.y)) { this.setState(v, 'faller'); v.fallDist = 0; }
  }

  block(v) {
    const t = this.terrain;
    if (!t.solid(v.x, v.y) && !t.solid(v.x - 1, v.y) && !t.solid(v.x + 1, v.y)) {
      this.setState(v, 'faller');
      v.fallDist = 0;
    }
  }

  build(v) {
    const t = this.terrain;
    if (v.t === 10) {
      const x0 = v.x, x1 = v.x + v.dir * 5;
      t.fillRect(x0, v.y - 2, x1, v.y - 1, M.built);
      v.bricks--;
      this.emit('sound', { name: v.bricks < 3 ? 'brickwarn' : 'brick', x: v.x, y: v.y });
      this.emit('dust', { x: v.x + v.dir * 3, y: v.y - 2, mat: M.built, n: 2 });
    }
    if (v.t < BRICK_TICKS) return;
    v.t = 0;
    // Kopf an die Decke oder Wand vor der nächsten Stufe: umdrehen
    const wall = t.anySolid(v.x + v.dir * 2, v.y - 4, v.x + v.dir * 5, v.y - 3)
      || t.anySolid(v.x + v.dir * 1, v.y - HEIGHT - 2, v.x + v.dir * 4, v.y - HEIGHT - 2);
    if (wall) {
      v.dir = -v.dir;
      this.setState(v, 'walker');
      return;
    }
    v.x += v.dir * 4;
    v.y -= 2;
    if (v.bricks === 0) this.setState(v, 'shrugger');
  }

  bash(v) {
    const t = this.terrain;
    if (v.t % 2) return;
    const near = v.x + v.dir, far = v.x + v.dir * 8;
    // Stahl oder eine Einbahnwand in Gegenrichtung direkt voraus: Schluss
    if (t.blocked(near, v.y - 14, near + v.dir * 3, v.y - 1, v.dir)) {
      this.emit('sound', { name: 'ting', x: v.x, y: v.y });
      this.setState(v, 'walker');
      return;
    }
    if (t.carveRect(near, v.y - HEIGHT - 1, far, v.y - 1, v.dir) && v.t % 8 === 0) {
      this.emit('dust', { x: far, y: v.y - 8, mat: t.lastMat, n: 3 });
      this.emit('sound', { name: 'dig', x: v.x, y: v.y, mat: t.lastMat });
    }
    v.x += v.dir;
    if (!t.solid(v.x, v.y)) {
      let down = 0;
      while (down < 3 && !t.solid(v.x, v.y)) { v.y++; down++; }
      if (!t.solid(v.x, v.y)) {
        this.setState(v, 'faller');
        v.fallDist = down;
        return;
      }
    }
    if (!t.anySolid(v.x + v.dir, v.y - 14, v.x + v.dir * 10, v.y - 2)) this.setState(v, 'walker');
  }

  mine(v) {
    const t = this.terrain;
    if (v.t % 8 !== 4) return;
    if (t.blocked(v.x + v.dir, v.y - 14, v.x + v.dir * 7, v.y, v.dir)) {
      this.emit('sound', { name: 'ting', x: v.x, y: v.y });
      this.setState(v, 'walker');
      return;
    }
    t.carveRect(v.x + v.dir, v.y - HEIGHT - 1, v.x + v.dir * 7, v.y - 1, v.dir);
    const top = t.lastMat;
    t.carveRect(v.x + v.dir * 2, v.y, v.x + v.dir * 7, v.y, v.dir);
    const mat = t.lastMat || top;
    if (mat) {
      this.emit('dust', { x: v.x + v.dir * 5, y: v.y - 2, mat, n: 3 });
      this.emit('sound', { name: 'dig', x: v.x, y: v.y, mat });
    }
    v.x += v.dir * 2;
    v.y += 1;
    if (!t.solid(v.x, v.y)) {
      this.setState(v, 'faller');
      v.fallDist = 0;
    }
  }

  dig(v) {
    const t = this.terrain;
    if (v.t % 3) return;
    if (t.blocked(v.x - 4, v.y, v.x + 4, v.y, 0)) {
      this.emit('sound', { name: 'ting', x: v.x, y: v.y });
      this.setState(v, 'walker');
      return;
    }
    if (t.carveRect(v.x - 4, v.y, v.x + 4, v.y, 0) && v.t % 9 === 0) {
      this.emit('dust', { x: v.x, y: v.y, mat: t.lastMat, n: 2 });
      this.emit('sound', { name: 'dig', x: v.x, y: v.y, mat: t.lastMat });
    }
    v.y++;
    if (v.y >= t.h) { this.kill(v, 'fellout'); return; }
    if (!t.anySolid(v.x - 3, v.y, v.x + 3, v.y)) {
      this.setState(v, 'faller');
      v.fallDist = 0;
    }
  }

  // ------------------------------------------- Umgebung: Ausgang, Gefahren

  inLiquid(v, x, y) {
    const l = this.terrain.liquidAt(x, y);
    if (l === LIQUID_WATER) { this.kill(v, 'drowning', 'splash'); return true; }
    if (l === LIQUID_LAVA) { this.kill(v, 'burning', 'burn'); return true; }
    return false;
  }

  checkSurroundings(v) {
    if (v.state !== 'climbing' && v.state !== 'hoister' && this.inLiquid(v, v.x, v.y - 1)) return;

    for (const f of this.fires) {
      if (v.x >= f.bx * BLOCK && v.x < (f.bx + 1) * BLOCK && v.y - 1 >= f.by * BLOCK && v.y - 1 < (f.by + 1) * BLOCK + 2) {
        this.kill(v, 'burning', 'burn');
        return;
      }
    }

    if (v.state !== 'blocker') {
      for (const e of this.exits) {
        if (Math.abs(v.x - e.x) <= 3 && v.y >= e.y - 6 && v.y <= e.y + 2) {
          v.x = e.x;
          this.kill(v, 'exiting', 'exit');
          return;
        }
      }
    }

    for (const tr of this.traps) {
      if (tr.busy === 0 && Math.abs(v.x - tr.x) <= 3 && v.y >= tr.y - 6 && v.y <= tr.y + 2) {
        tr.busy = 50;
        v.x = tr.x;
        this.kill(v, 'crushed', 'piston');
        this.emit('trap', { trap: tr });
        return;
      }
    }

    if (v.state === 'walker' || v.state === 'shrugger' || v.state === 'builder'
        || v.state === 'basher' || v.state === 'miner') {
      for (const b of this.villagers) {
        if (b === v || b.gone || b.state !== 'blocker') continue;
        if (Math.abs(b.y - v.y) > 10) continue;
        const d = b.x - v.x;
        if ((v.dir > 0 && d >= 1 && d <= BLOCKER_FIELD) || (v.dir < 0 && d <= -1 && d >= -BLOCKER_FIELD)) {
          v.dir = -v.dir;
          if (v.state === 'basher' || v.state === 'miner') this.setState(v, 'walker');
          break;
        }
      }
    }
  }
}
