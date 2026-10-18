# Villemmings

Lemmings in Klötzchenwelten: Statt Lemmingen müssen Dorfbewohner (Villager)
aus der Falltür sicher ins Dorfhaus gebracht werden. Gebaut für Android-Handys
im Querformat und für die Bedienung per Touch. Kein offizielles
Minecraft-Produkt, alle Grafiken und Töne werden im Spiel selbst erzeugt.

## Spielen

- **Android:** `android/release/villemmings.apk` installieren (Bau siehe unten).
  Die App läuft komplett offline.
- **Browser:** `npm run serve` und <http://localhost:8080> öffnen.
  Mit Maus: Klick = Tippen, Mausrad = Zoom, Tasten 1–8 Fähigkeiten,
  P Pause, F Schnellvorlauf, Pfeiltasten scrollen.

## Was drin ist

Alle Fähigkeiten und Regeln wie im Original:

| Fähigkeit | Original | Wirkung |
|---|---|---|
| Kletterer | Climber | klettert Wände hoch (dauerhaft) |
| Gleiter | Floater | Elytren gegen tödliche Stürze (dauerhaft) |
| Sprenger | Bomber | TNT, 5 Sekunden Countdown |
| Blocker | Blocker | dreht alle anderen um |
| Treppenbauer | Builder | 12 Stufen, die letzten drei mit Warnton |
| Tunnelgräber | Basher | waagerecht graben |
| Bergmann | Miner | schräg nach unten graben |
| Buddler | Digger | senkrecht graben |

Dazu Freisetzungsrate (– / +), Pause (Fähigkeiten lassen sich auch pausiert
vergeben), Creeper-Knopf zum Sprengen aller (zweimal tippen), Schnellvorlauf,
Minikarte, Zeitlimit, unzerstörbare Blöcke (Obsidian, Grundgestein,
Eisenblock), Einbahnwände (Pfeilblöcke), Wasser, Lava, Feuer und
Kolbenfallen. Fallen aus mehr als 10 Blöcken Höhe ist tödlich.

32 Level in vier Welten: Oberwelt (Friedlich), Höhlen (Einfach),
Nether (Normal), Das Ende (Schwer). Der Fortschritt wird auf dem Gerät
gespeichert, in jeder Welt schaltet ein geschafftes Level das nächste frei.

## Aufbau

```
web/                 das Spiel (HTML5-Canvas, ES-Module, ohne Abhängigkeiten)
  src/sim.js         Spielablauf, ohne Grafik – auch in Node lauffähig
  src/terrain.js     zerstörbares Gelände (8 Geländepunkte pro Block)
  src/level.js       liest die Blockkarten
  src/levels/*.js    die Level, je Welt eine Datei
  src/render.js      Gelände, Objekte, Villager, Partikel
  src/textures.js    erzeugt die Blocktexturen
  src/sprites.js     erzeugt die Villager-Bilder
  src/audio.js       Geräusche und Musik (WebAudio)
  src/main.js        Bildschirme, Touch-Bedienung, Spielschleife
android/             WebView-Hülle (lädt web/ aus den Assets der App)
tools/               Leveltest, Lösungen, Bildschirmfotos, App-Symbol
```

## Level bauen

Ein Level ist eine Blockkarte aus Textzeilen, ein Zeichen pro Block:

| Zeichen | Bedeutung |
|---|---|
| `D` | Erde, wird oben zu Gras |
| `u` `G` `S` `C` `M` `R` `A` `Z` | Erde, Gras, Stein, Bruchstein, bemooster Bruchstein, Kies, Sand, Sandstein |
| `W` `w` `L` `l` `h` `a` `B` `Y` | Eichen- und Fichtenholz, Stamm, Laub, Heuballen, Wolle, Ziegel, Steinziegel |
| `c` `i` `o` `x` `r` `s` | Kohle-, Eisen-, Gold-, Diamant-, Redstone-, Smaragderz |
| `N` `n` `Q` `K` `U` `J` | Netherrack, Netherziegel, Quarz, Glowstone, Seelensand, Schwarzstein |
| `E` `e` `P` `V` `g` `v` `F` `k` | Endstein, Endsteinziegel, Purpur, Tiefenschiefer, Goldblock, Glas, Schnee, Eis |
| `O` `X` `I` | **unzerstörbar:** Obsidian, Grundgestein, Eisenblock |
| `>` `<` | Einbahnwand, nur in Pfeilrichtung durchgrabbar |
| `~` `%` | Wasser, Lava |
| `T` | Falltür (linker von zwei Blöcken), `H` Haustür des Ausgangs (unterer Block) |
| `p` | Kolbenfalle (Block, in dem die Füße stehen), `^` Lagerfeuer, `*` Feuer |
| `t` `f` `y` `"` `m` `b` `j` `q` `z` | Deko: Fackel, Mohn, Löwenzahn, Gras, Pilze, Laterne, Truhe, Spinnennetz |

Ein Villager ist zwei Blöcke hoch, steigt einen Block hoch, und ein Sturz über
mehr als zehn Blöcke ist tödlich – auch aus der Falltür heraus.

Jedes Level braucht eine Lösung in `tools/solutions.js`. `npm test` spielt
alle Level mit ihrer Lösung durch und prüft, dass sie ohne Fähigkeiten nicht
zu schaffen sind:

```
npm test                         # alle Level
node tools/test-levels.mjs ende-4   # ein Level mit Verlauf
```

Bildschirmfotos aus dem Headless-Chromium (`npm i` für playwright-core):

```
node tools/shot.mjs /tmp/titel
LEVEL=nether-3 TIMES=10,40 node tools/shot.mjs /tmp/n tools/replay.mjs
```

## Android-App

```
android/build.sh
```

baut `android/release/villemmings.apk` (vorher läuft der Leveltest). Werkzeuge
wie bei der Spielrunde (`spielrunde/android/setup-toolchain.sh`). Neue Fassung:
`versionCode`/`versionName` in `android/app/build.gradle.kts` erhöhen.

Der Signaturschlüssel liegt nur verschlüsselt in `android/signing/release.age`
(age, Empfänger in `empfaenger.txt` = SSH-Schlüssel von github.com/DukyNuky.keys).
`build.sh` entschlüsselt ihn mit `~/.ssh/id_ed25519` (anderer Schlüssel:
`VILLEMMINGS_SSH_KEY=…`). **`release.age` nie ersetzen**, sonst lassen sich
installierte Apps nicht mehr aktualisieren.

Die App sucht beim Start still nach einem neueren GitHub-Release von
`DukyNuky/villemmings` und bietet es zur Installation an (Optionen →
„Nach Updates suchen“). Das funktioniert nur, solange das Repository
öffentlich ist.
