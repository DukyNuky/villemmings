Die Beschreibung des Projekts steht in [README.md](README.md). Wichtig beim Arbeiten:

- Nach jeder Änderung an Spielablauf oder Leveln `npm test` laufen lassen – jedes Level braucht eine Lösung in `tools/solutions.js`.
- `android/signing/release.age` nie ersetzen; entschlüsseln kann ihn nur der private SSH-Schlüssel des Nutzers.
- Optik im Headless-Chromium prüfen: `tools/shot.mjs` und `tools/replay.mjs`.
