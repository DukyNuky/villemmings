// Alle Welten und Level. Die Karten liegen je Welt in levels/.

import overworld from './levels/overworld.js';
import caves from './levels/caves.js';
import nether from './levels/nether.js';
import end from './levels/end.js';

export const WORLDS = [
  { id: 'oberwelt', name: 'Oberwelt', difficulty: 'Friedlich', theme: 'overworld', levels: overworld },
  { id: 'hoehlen', name: 'Höhlen', difficulty: 'Einfach', theme: 'caves', levels: caves },
  { id: 'nether', name: 'Nether', difficulty: 'Normal', theme: 'nether', levels: nether },
  { id: 'ende', name: 'Das Ende', difficulty: 'Schwer', theme: 'end', levels: end },
];

// Wiese für den Hintergrund der Menüs: Die Villager laufen nur hin und her.
export const TITLE_LEVEL = {
  name: 'Titel',
  villagers: 14, save: 14, rate: 70, time: 99999,
  map: [
    '                                                                                ',
    '                                                                     H          ',
    '                                                                   XXXXX        ',
    '                                                                                ',
    '                  T                       lll                                   ',
    '                                         lllll                                  ',
    '      lll                                lllll              llll                ',
    '     lllll                                 L                lllll               ',
    '     lllll                                 L      f          LL                 ',
    '  C    L    "  f   "      y     "    "     L   "    "  y     LL   "   f     " C ',
    'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
    'uuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu',
    'SSSSSScSSSSSSSSSSSSSiSSSSSSSSSScSSSSSSSSSSSSSSSSSSSSSScSSSSSSSSSSSSiSSSSSSSSScSSS',
  ],
};
