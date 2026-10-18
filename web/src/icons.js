// 16×16-Symbole für Fähigkeiten und Knöpfe, als Zeichenketten gemalt.

const PAL = {
  '.': null,
  o: '#1e1e1e', b: '#6b4a26', w: '#9c7f4e', W: '#b8975e',
  a: '#3c3c5a', e: '#8f8fb5', c: '#b3b3d6',
  r: '#db2f1f', R: '#a3170f', k: '#202020', x: '#f2f2f2',
  i: '#c6c6c6', I: '#e8e8e8', s: '#7a7a7a',
  p: '#d6c58a', P: '#ece0a8', d: '#8f7f4f',
  g: '#5bbd3a', G: '#4a9a2f', h: '#7fd65a',
  t: '#3fd3c8', T: '#a8fff6', D: '#1f8f88',
  y: '#ffd23f', Y: '#fff2a8',
};

function mirror(rows) {
  return rows.map((r) => r + [...r].reverse().join(''));
}

const ICONS = {
  climber: [
    '...bb......bb...',
    '...bw......bw...',
    '...bwWWWWWWbw...',
    '...bbbbbbbbbb...',
    '...bw......bw...',
    '...bw......bw...',
    '...bwWWWWWWbw...',
    '...bbbbbbbbbb...',
    '...bw......bw...',
    '...bw......bw...',
    '...bwWWWWWWbw...',
    '...bbbbbbbbbb...',
    '...bw......bw...',
    '...bw......bw...',
    '...bw......bw...',
    '...bb......bb...',
  ],
  floater: mirror([
    '........', '.aaa....', 'aeeea...', 'aecea...', 'aecceaa.', 'aecceeaa', 'aeccceea', '.aecceea',
    '.aeccca.', '.aeccca.', '..aecca.', '..aecca.', '...aeca.', '...aeca.', '....aea.', '.....a..',
  ]),
  bomber: [
    'rrRrrRrrRrrRrrRr',
    'rrRrrRrrRrrRrrRr',
    'rrRrrRrrRrrRrrRr',
    'rrRrrRrrRrrRrrRr',
    'RRRRRRRRRRRRRRRR',
    'xxxxxxxxxxxxxxxx',
    'xxkkkxkxxkxkkkxx',
    'xxxkxxkkxkxxkxxx',
    'xxxkxxkxkkxxkxxx',
    'xxxkxxkxxkxxkxxx',
    'xxxxxxxxxxxxxxxx',
    'RRRRRRRRRRRRRRRR',
    'rrRrrRrrRrrRrrRr',
    'rrRrrRrrRrrRrrRr',
    'rrRrrRrrRrrRrrRr',
    'rrRrrRrrRrrRrrRr',
  ],
  blocker: [
    '..oooooooooooo..',
    '.oiiiiiiiiiiiio.',
    '.oiwwwwwwwwwwio.',
    '.oiwWwwwwwwWwio.',
    '.oiwwwwbbwwwwio.',
    '.oiwwwbIIbwwwio.',
    '.oiwwwbIibwwwio.',
    '.oiwwwwbbwwwwio.',
    '.oiwwwwwwwwwwio.',
    '.oiwWwwwwwwWwio.',
    '..oiwwwwwwwwio..',
    '..oiwwwwwwwwio..',
    '...oiwwwwwwio...',
    '....oiiwwiio....',
    '.....ooiioo.....',
    '.......oo.......',
  ],
  builder: [
    '................',
    '................',
    '................',
    '............PPPP',
    '............pppp',
    '............dddd',
    '........PPPPpppp',
    '........pppppppp',
    '........dddddddd',
    '....PPPPpppppppp',
    '....pppppppppppp',
    '....dddddddddddd',
    'PPPPpppppppppppp',
    'pppppppppppppppp',
    'pppppppppppppppp',
    'dddddddddddddddd',
  ],
  basher: [
    '................',
    '.......oooo.....',
    '......oIIiio....',
    '.....oIIiiiio...',
    '.....oIiiioboo..',
    '.....oiiiobwo...',
    '......oooobo....',
    '........obwo.ss.',
    '.......obwo.....',
    '......obwo......',
    '.....obwo.......',
    '....obwo........',
    '...obwo.........',
    '..obwo..........',
    '..oo............',
    '................',
  ],
  miner: [
    '................',
    '....ooooooo.....',
    '...oTTttttDDo...',
    '....oooottttDo..',
    '.......obotDDo..',
    '......obwo.otDo.',
    '.....obwo..otDo.',
    '....obwo....oDo.',
    '...obwo.....oo..',
    '..obwo..........',
    '.obwo...........',
    'obwo............',
    'oo..............',
    '................',
    '................',
    '................',
  ],
  digger: [
    '................',
    '..........ooo...',
    '.........oIIio..',
    '........oIIiiio.',
    '........oIiiiso.',
    '.........oiisso.',
    '........obosoo..',
    '.......obwo.....',
    '......obwo......',
    '.....obwo.......',
    '....obwo........',
    '...obwo.........',
    '..obwo..........',
    '.oowo...........',
    '.ooo............',
    '................',
  ],
  nuke: [
    'GGgGGgGgGGgGgGGg',
    'gGGgGGgGGgGGgGGG',
    'GgGGgGGgGGgGGgGG',
    'GGkkkkGGGGkkkkgG',
    'gGkkkkgGGgkkkkGg',
    'GgkkkkGgGGkkkkGG',
    'gGkkkkGGgGkkkkGg',
    'GGGgGGkkkkGgGGgG',
    'gGgGGgkkkkGGgGGg',
    'GGgGkkkkkkkkGgGG',
    'gGGgkkkkkkkkGGgG',
    'GgGGkkkkkkkkgGGg',
    'GGgGkkkGGkkkGGgG',
    'gGGgkkkgGkkkGgGG',
    'GgGGgGgGGgGGgGgG',
    'gGgGGgGGgGGgGGgG',
  ],
  pause: [
    '................', '................', '...xxxx..xxxx...', '...xxxx..xxxx...',
    '...xxxx..xxxx...', '...xxxx..xxxx...', '...xxxx..xxxx...', '...xxxx..xxxx...',
    '...xxxx..xxxx...', '...xxxx..xxxx...', '...xxxx..xxxx...', '...xxxx..xxxx...',
    '...xxxx..xxxx...', '...xxxx..xxxx...', '................', '................',
  ],
  play: [
    '................', '................', '....xx..........', '....xxxx........',
    '....xxxxxx......', '....xxxxxxxx....', '....xxxxxxxxxx..', '....xxxxxxxxxxx.',
    '....xxxxxxxxxxx.', '....xxxxxxxxxx..', '....xxxxxxxx....', '....xxxxxx......',
    '....xxxx........', '....xx..........', '................', '................',
  ],
  ff: [
    '................', '................', '................', '.x......x.......',
    '.xxx....xxx.....', '.xxxxx..xxxxx...', '.xxxxxxx.xxxxxx.', '.xxxxxxxxxxxxxxx',
    '.xxxxxxxxxxxxxxx', '.xxxxxxx.xxxxxx.', '.xxxxx..xxxxx...', '.xxx....xxx.....',
    '.x......x.......', '................', '................', '................',
  ],
  minus: [
    '................', '................', '................', '................',
    '................', '................', '..xxxxxxxxxxxx..', '..xxxxxxxxxxxx..',
    '..xxxxxxxxxxxx..', '................', '................', '................',
    '................', '................', '................', '................',
  ],
  plus: [
    '................', '................', '......xxxx......', '......xxxx......',
    '......xxxx......', '......xxxx......', '..xxxxxxxxxxxx..', '..xxxxxxxxxxxx..',
    '..xxxxxxxxxxxx..', '..xxxxxxxxxxxx..', '......xxxx......', '......xxxx......',
    '......xxxx......', '......xxxx......', '................', '................',
  ],
  menu: [
    '................', '................', '................', '..xxxxxxxxxxxx..',
    '..xxxxxxxxxxxx..', '................', '................', '..xxxxxxxxxxxx..',
    '..xxxxxxxxxxxx..', '................', '................', '..xxxxxxxxxxxx..',
    '..xxxxxxxxxxxx..', '................', '................', '................',
  ],
  lock: [
    '................', '.....oooooo.....', '....oiiiiiio....', '...oio....oio...',
    '...oio....oio...', '...oio....oio...', '..oooooooooooo..', '..oyyyyyyyyyyo..',
    '..oyYYYYYYYYyo..', '..oyyyyookyyyo..', '..oyyyyokkyyyo..', '..oyyyyyokyyyo..',
    '..oyyyyyokyyyo..', '..oyyyyyyyyyyo..', '..oooooooooooo..', '................',
  ],
  check: [
    '................', '................', '..............o.', '.............ogo',
    '............oggo', '...........oggo.', '..o.......oggo..', '.ogo.....oggo...',
    'ogggo...oggo....', '.ogggo.oggo.....', '..ogggoggo......', '...ogggggo......',
    '....ogggo.......', '.....ogo........', '......o.........', '................',
  ],
  emerald: [
    '................', '......oooo......', '.....ohhhgo.....', '....ohhggggo....',
    '...ohhgggGGGo...', '...ohggggGGGo...', '..ohhggggGGGGo..', '..ohgggggGGGGo..',
    '..ohgggggGGGGo..', '..ohggggGGGGGo..', '...ogggGGGGGo...', '...ogggGGGGGo...',
    '....ogGGGGGo....', '.....oGGGGo.....', '......oooo......', '................',
  ],
};

const cache = new Map();

export function icon(name) {
  let c = cache.get(name);
  if (c) return c;
  const rows = ICONS[name];
  if (!rows) return null;
  c = document.createElement('canvas');
  c.width = 16;
  c.height = 16;
  const ctx = c.getContext('2d');
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = PAL[row[x]];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  });
  cache.set(name, c);
  return c;
}

export function drawIcon(ctx, name, x, y, size, alpha = 1) {
  const c = icon(name);
  if (!c) return;
  const s = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = alpha;
  ctx.drawImage(c, Math.round(x), Math.round(y), Math.round(size), Math.round(size));
  ctx.globalAlpha = 1;
  ctx.imageSmoothingEnabled = s;
}

export { ICONS, PAL as ICON_PALETTE };
