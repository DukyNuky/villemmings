// Für tools/shot.mjs: spielt ein Level mit hinterlegter Lösung im Browser ab
// und macht zu den angegebenen Zeitpunkten (Sekunden Spielzeit) Fotos.
//   LEVEL=oberwelt-4 TIMES=5,20,40 node tools/shot.mjs /tmp/x tools/replay.mjs
export default async function (page, shot) {
  const level = process.env.LEVEL ?? 'oberwelt-1';
  const times = (process.env.TIMES ?? '5,15').split(',').map(Number);
  const speed = Number(process.env.SPEED ?? 4);
  await page.evaluate(async ({ level, speed }) => {
    const { SOLUTIONS, pickTarget } = await import('/tools/solutions.js');
    const { WORLDS } = await import('/web/src/levels.js');
    const [wid, n] = [level.slice(0, level.lastIndexOf('-')), Number(level.slice(level.lastIndexOf('-') + 1))];
    const w = WORLDS.findIndex((x) => x.id === wid);
    const V = window.__villemmings;
    V.startLevel(w, n - 1);
    V.play_.speed = speed;
    const actions = (SOLUTIONS[level] ?? []).map((a) => ({ ...a }));
    V.testHooks.beforeStep = (g) => {
      for (const a of actions) {
        if (a.done || (a.tick !== undefined && g.tick < a.tick)) continue;
        if (a.after !== undefined && !actions[a.after].done) continue;
        if (a.nuke) { g.nuke(); a.done = true; continue; }
        if (a.rate !== undefined) { g.setRate(a.rate); a.done = true; continue; }
        const v = pickTarget(g, a, actions);
        if (v && g.assign(v, a.skill)) { a.done = true; a.chosen = v.id; }
      }
    };
  }, { level, speed });
  for (const t of times) {
    await page.waitForFunction((t) => window.__villemmings.play_.game.tick >= t * 25 || window.__villemmings.app.screen !== 'play', t, { timeout: 120000 });
    await page.evaluate(() => { window.__villemmings.play_.speedBeforeShot = window.__villemmings.play_.speed; window.__villemmings.play_.speed = 0; });
    await page.waitForTimeout(150);
    await shot(`${level}-${t}`);
    await page.evaluate(() => { window.__villemmings.play_.speed = window.__villemmings.play_.speedBeforeShot; });
  }
}
