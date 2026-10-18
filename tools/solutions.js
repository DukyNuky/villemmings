// Lösungen zum automatischen Prüfen der Level (tools/test-levels.mjs).
// Eine Aktion feuert, sobald der Villager mit der Nummer id alle Bedingungen
// erfüllt (x/y exakt, state, dir, frühestens ab tick, erst nach Aktion Nr. after).
// Ohne id: { rate } oder { nuke }.

// Ziel einer Aktion: Villager mit Nummer id, mit id 'any' der erste passende
// (außer denen in not), mit sameAs: k derselbe wie bei Aktion k.
export function pickTarget(g, a, actions) {
  const fits = (v) => !v.gone
    && (a.x === undefined || v.x === a.x)
    && (a.y === undefined || v.y === a.y)
    && (a.state === undefined || v.state === a.state)
    && (a.dir === undefined || v.dir === a.dir);
  if (a.sameAs !== undefined) {
    const id = actions[a.sameAs].chosen;
    const v = g.villagers.find((u) => u.id === id);
    return v && fits(v) ? v : null;
  }
  if (a.id === 'any') return g.villagers.find((v) => !(a.not ?? []).includes(v.id) && fits(v)) ?? null;
  const v = g.villagers.find((u) => u.id === a.id);
  return v && fits(v) ? v : null;
}

const each = (ids, extra) => ids.map((id) => ({ id, ...extra }));
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

export const SOLUTIONS = {
  'oberwelt-1': [{ id: 0, x: 100, skill: 'digger' }],
  'oberwelt-2': each(range(0, 7), { state: 'walker', skill: 'floater' }),
  'oberwelt-3': [{ id: 0, x: 300, dir: 1, skill: 'blocker' }],
  'oberwelt-4': [
    ...each(range(0, 7), { state: 'walker', skill: 'climber' }),
    { id: 0, x: 280, y: 128, dir: 1, state: 'walker', skill: 'miner' },
  ],
  'oberwelt-5': [173, 317, 461, 589].map((x) => ({ id: 0, x, dir: 1, state: 'walker', skill: 'basher' })),
  'oberwelt-6': [
    { id: 0, x: 120, dir: -1, skill: 'blocker' },
    { id: 1, x: 164, dir: 1, state: 'walker', skill: 'bomber' },
  ],
  'oberwelt-7': [
    { id: 0, x: 200, dir: 1, state: 'walker', skill: 'builder' },
    { id: 0, x: 460, dir: 1, state: 'walker', skill: 'builder' },
  ],
  'oberwelt-8': [
    { id: 0, x: 173, dir: 1, state: 'walker', skill: 'basher' },
    { id: 1, x: 212, dir: 1, state: 'walker', skill: 'blocker' },
    { id: 0, x: 244, dir: 1, state: 'walker', skill: 'builder' },
    { id: 0, state: 'shrugger', skill: 'builder' },
    { id: 1, tick: 700, skill: 'bomber' },
    { id: 0, x: 470, dir: 1, state: 'walker', skill: 'digger' },
  ],

  'hoehlen-1': [
    { id: 0, x: 150, dir: 1, state: 'walker', skill: 'digger' },
    { id: 0, x: 320, dir: 1, state: 'walker', skill: 'digger' },
  ],
  'hoehlen-2': [
    { id: 0, x: 200, dir: 1, state: 'walker', skill: 'builder' },
    { id: 0, x: 477, dir: 1, state: 'walker', skill: 'basher' },
  ],
  'hoehlen-3': [
    { id: 0, x: 264, dir: 1, state: 'walker', skill: 'miner' },
    { id: 0, y: 176, state: 'miner', skill: 'basher' },
  ],
  'hoehlen-4': [
    { id: 0, skill: 'climber' },
    { id: 0, x: 240, dir: 1, state: 'walker', skill: 'builder' },
    { id: 0, state: 'shrugger', skill: 'builder' },
    { id: 1, x: 80, dir: 1, tick: 800, state: 'walker', skill: 'builder' },
  ],
  'hoehlen-5': [
    { id: 0, x: 150, dir: 1, state: 'walker', skill: 'digger' },
    { id: 0, y: 104, dir: 1, state: 'walker', skill: 'basher' },
    { id: 0, x: 400, state: 'basher', skill: 'digger' },
  ],
  'hoehlen-6': [
    ...each(range(0, 7), { skill: 'climber' }),
    ...each(range(0, 7), { skill: 'floater' }),
  ],
  'hoehlen-7': [
    { id: 0, x: 165, dir: 1, state: 'walker', skill: 'basher' },
    { id: 0, x: 264, state: 'basher', skill: 'miner' },
  ],
  'hoehlen-8': [
    { id: 0, skill: 'climber' },
    { id: 0, x: 232, dir: 1, state: 'walker', skill: 'builder' },
    { id: 0, x: 392, dir: 1, state: 'walker', skill: 'miner' },
    { id: 0, y: 176, state: 'miner', skill: 'basher' },
    { id: 0, x: 600, dir: 1, state: 'walker', skill: 'builder' },
    { id: 1, x: 60, dir: 1, tick: 900, state: 'walker', skill: 'builder' },
  ],

  'nether-1': [
    { id: 0, x: 128, dir: 1, state: 'walker', skill: 'builder' },
    { id: 1, x: 100, dir: 1, state: 'walker', skill: 'blocker' },
    { id: 0, state: 'shrugger', y: 120, skill: 'builder' },
    { id: 0, x: 356, dir: 1, state: 'walker', skill: 'builder' },
    { id: 1, tick: 1000, skill: 'bomber' },
  ],
  'nether-2': [
    { id: 0, x: 330, dir: 1, state: 'walker', skill: 'digger' },
    { id: 0, x: 108, y: 136, dir: -1, state: 'walker', skill: 'digger' },
  ],
  'nether-3': [
    { id: 0, skill: 'climber' },
    { id: 0, x: 210, dir: 1, state: 'walker', skill: 'builder' },
    { id: 0, x: 437, dir: 1, state: 'walker', skill: 'basher' },
    { id: 1, x: 110, dir: 1, tick: 600, state: 'walker', skill: 'basher' },
  ],
  'nether-4': [
    { id: 0, x: 160, dir: 1, state: 'walker', skill: 'miner' },
    { id: 0, y: 176, dir: 1, state: 'walker', skill: 'basher' },
  ],
  'nether-5': [
    { rate: 99 },
    { id: 0, x: 317, dir: 1, state: 'walker', skill: 'basher' },
    { id: 0, x: 600, dir: 1, state: 'walker', skill: 'digger' },
  ],
  'nether-6': [
    { id: 0, x: 175, dir: 1, state: 'walker', skill: 'bomber' },
    { id: 1, x: 260, y: 160, dir: 1, state: 'walker', skill: 'bomber' },
  ],
  'nether-7': [205, 325, 445, 565].map((x) => ({ id: 0, x, dir: 1, state: 'walker', skill: 'builder' })),
  'nether-8': [
    { id: 0, skill: 'climber' },
    { id: 0, x: 315, dir: 1, state: 'walker', skill: 'builder' },
    { id: 0, x: 477, dir: 1, state: 'walker', skill: 'basher' },
    { id: 0, x: 600, dir: 1, state: 'walker', skill: 'digger' },
    { id: 0, x: 757, dir: 1, state: 'walker', skill: 'basher' },
    { id: 1, x: 97, dir: 1, tick: 600, state: 'walker', skill: 'basher' },
  ],

  'ende-1': [
    { id: 0, x: 140, dir: 1, state: 'walker', skill: 'builder' },
    { id: 1, x: 110, dir: 1, state: 'walker', skill: 'blocker' },
    { id: 0, state: 'shrugger', y: 104, skill: 'builder' },
    { id: 0, x: 352, dir: 1, state: 'walker', skill: 'builder' },
    { id: 1, tick: 1100, skill: 'bomber' },
  ],
  'ende-2': [
    { id: 0, x: 490, dir: 1, y: 48, state: 'walker', skill: 'digger' },
    { id: 0, x: 242, dir: -1, y: 120, state: 'walker', skill: 'basher' },
    { id: 0, x: 108, y: 120, state: 'walker', skill: 'digger', after: 1 },
  ],
  'ende-3': [
    { id: 0, skill: 'climber' },
    { id: 0, x: 190, dir: -1, y: 160, state: 'walker', skill: 'basher' },
    { id: 'any', x: 260, y: 160, state: 'walker', skill: 'digger', after: 1 },
  ],
  'ende-4': [
    { id: 0, x: 81, y: 232, dir: 1, state: 'walker', skill: 'builder' },
    { id: 0, dir: -1, state: 'walker', skill: 'builder', after: 0 },
    { id: 0, dir: 1, state: 'walker', skill: 'builder', after: 1 },
    { id: 0, dir: -1, state: 'walker', skill: 'builder', after: 2 },
    { id: 0, dir: 1, state: 'walker', skill: 'builder', after: 3 },
  ],
  'ende-5': [
    { id: 0, x: 200, dir: 1, state: 'walker', skill: 'miner' },
    { id: 0, y: 144, dir: 1, state: 'walker', skill: 'basher', after: 0 },
  ],
  'ende-6': [
    { id: 0, x: 150, y: 48, dir: 1, state: 'walker', skill: 'miner' },
    { id: 0, y: 128, dir: 1, state: 'walker', skill: 'basher', after: 0 },
    { id: 0, x: 380, state: 'basher', skill: 'miner', after: 1 },
  ],
  'ende-7': [
    { id: 0, x: 320, dir: 1, state: 'walker', skill: 'builder' },
    { id: 1, x: 300, dir: 1, state: 'walker', skill: 'blocker' },
    { rate: 99, after: 1 },
    { id: 1, tick: 450, skill: 'bomber', after: 1 },
  ],
  'ende-8': [
    { id: 0, skill: 'climber' },
    { id: 0, skill: 'floater' },
    { id: 0, x: 176, dir: -1, y: 240, state: 'walker', skill: 'basher', tick: 700 },
    { id: 1, x: 169, y: 240, dir: 1, state: 'walker', skill: 'builder', after: 2 },
    { id: 1, dir: -1, state: 'walker', skill: 'builder', after: 3 },
    { id: 1, dir: 1, state: 'walker', skill: 'builder', after: 4 },
    { id: 1, dir: -1, state: 'walker', skill: 'builder', after: 5 },
    { id: 1, dir: 1, state: 'walker', skill: 'builder', after: 6 },
    { id: 1, dir: -1, state: 'walker', skill: 'builder', after: 7 },
    { id: 1, x: 397, y: 144, dir: 1, state: 'walker', skill: 'basher', after: 8 },
    { id: 'any', not: [0, 1], x: 420, y: 144, dir: 1, state: 'walker', skill: 'blocker', after: 9 },
    { id: 1, x: 480, dir: 1, state: 'walker', skill: 'builder', after: 9 },
    { sameAs: 10, skill: 'bomber', after: 11 },
  ],
};
