// Prüft jedes Level ohne Browser: Mit der hinterlegten Lösung muss es zu
// schaffen sein, ohne jede Fähigkeit dagegen nicht (außer es ist so gewollt).
//
//   node tools/test-levels.mjs            alle Level
//   node tools/test-levels.mjs nether-3   nur dieses, mit Verlauf

import { Game } from '../web/src/sim.js';
import { WORLDS } from '../web/src/levels.js';
import { SOLUTIONS, pickTarget } from './solutions.js';

const only = process.argv[2];
const verbose = !!only;
let failed = 0;

function run(def, actions, log) {
  const g = new Game(def);
  const pending = actions.map((a) => ({ ...a }));
  const maxTicks = (def.time ?? 300) * 25 + 10;
  if (actions.rate) g.setRate(actions.rate);
  while (!g.finished && g.tick < maxTicks) {
    for (const a of pending) {
      if (a.done) continue;
      if (a.after !== undefined && !pending[a.after].done) continue;
      if (a.tick !== undefined && g.tick < a.tick) continue;
      if (a.nuke) { g.nuke(); a.done = true; continue; }
      if (a.rate !== undefined) { g.setRate(a.rate); a.done = true; continue; }
      const v = pickTarget(g, a, pending);
      if (!v) continue;
      if (g.assign(v, a.skill)) {
        a.done = true;
        a.chosen = v.id;
        if (log) console.log(`  t=${g.tick} #${v.id} ${a.skill} bei (${v.x},${v.y}) ${v.state}`);
      }
    }
    g.step();
    if (log) {
      for (const e of g.events) {
        if (e.type === 'sound' && ['splat', 'splash', 'burn', 'piston', 'exit'].includes(e.name)) console.log(`  t=${g.tick} ${e.name} (${e.x},${e.y})`);
      }
    }
    g.events.length = 0;
  }
  const missed = pending.filter((a) => !a.done && !a.optional);
  return { saved: g.saved, needed: g.needed, total: g.total, won: g.won, missed, ticks: g.tick, g };
}

for (const w of WORLDS) {
  w.levels.forEach((def, i) => {
    const id = `${w.id}-${i + 1}`;
    if (only && id !== only) return;
    const sol = SOLUTIONS[id];
    const base = run(def, []);
    let line = `${id.padEnd(13)} ${def.name.padEnd(34)} ohne: ${String(base.saved).padStart(3)}/${def.save}`;
    let bad = false;
    // Der Sturz aus der Falltür darf nicht tödlich sein
    for (const e of base.g.entrances) {
      let y = e.y;
      while (y < base.g.terrain.h && !base.g.terrain.solid(e.x, y)) y++;
      if (y - e.y > 80) { line += `  FALLTÜR ZU HOCH (${y - e.y})`; bad = true; }
    }
    if (base.won && !def.trivial) { line += '  ZU LEICHT'; bad = true; }
    if (!sol) {
      line += '  KEINE LÖSUNG';
      bad = true;
    } else {
      if (verbose) console.log(`${id}: Lösung`);
      const r = run(def, sol, verbose);
      line += `  mit: ${String(r.saved).padStart(3)}/${def.save} (${r.total}) in ${(r.ticks / 25).toFixed(0)}s`;
      if (!r.won) { line += '  NICHT GESCHAFFT'; bad = true; }
      if (r.missed.length) { line += `  ${r.missed.length} Aktion(en) nicht ausgelöst`; bad = true; }
    }
    if (bad) failed++;
    console.log((bad ? '✗ ' : '✓ ') + line);
  });
}
if (failed) {
  console.log(`\n${failed} Level mit Problemen`);
  process.exit(1);
}
