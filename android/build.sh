#!/usr/bin/env bash
#
# Baut die Android-App nach android/release/villemmings.apk.
#
# Der Signaturschlüssel liegt verschlüsselt in android/signing/. Er muss erhalten
# bleiben: Android nimmt ein Update nur an, wenn es mit demselben Schlüssel
# signiert ist.
set -euo pipefail

android_dir="$(dirname "$(readlink -f "$0")")"

# Dieselben Werkzeuge wie für die Spielrunde (spielrunde/android/setup-toolchain.sh)
tools="${VILLEMMINGS_ANDROID_TOOLS:-$HOME/.local/share/spielrunde-android}"
export JAVA_HOME="${JAVA_HOME:-$tools/jdk}"
export ANDROID_HOME="${ANDROID_HOME:-$tools/sdk}"
if [ ! -x "$JAVA_HOME/bin/java" ] || [ ! -d "$ANDROID_HOME/platforms" ]; then
  echo "JDK oder Android-SDK fehlen ($tools)."
  echo "Einmalig einrichten mit: spielrunde/android/setup-toolchain.sh"
  exit 1
fi

# Der Schlüssel liegt verschlüsselt im Repository (android/signing/release.age),
# lesbar nur mit einem der SSH-Schlüssel aus android/signing/empfaenger.txt.
# Entschlüsselt wird nur für diesen Bau in ein temporäres Verzeichnis.
signing="$android_dir/signing"
age_bin="$(command -v age || echo "$tools/age/age")"
if [ ! -x "$age_bin" ]; then
  echo "age fehlt. Einmalig einrichten mit: spielrunde/android/setup-toolchain.sh"
  exit 1
fi
secrets="$(mktemp -d)"
trap 'rm -rf "$secrets"' EXIT
keystore="$secrets/release.jks"
password_file="$secrets/release.passwort"
if [ -f "$signing/release.age" ]; then
  identity="${VILLEMMINGS_SSH_KEY:-$HOME/.ssh/id_ed25519}"
  if ! "$age_bin" -d -i "$identity" "$signing/release.age" | tar -x -C "$secrets"; then
    echo "Signaturschlüssel nicht entschlüsselbar mit $identity."
    echo "Anderen SSH-Schlüssel angeben: VILLEMMINGS_SSH_KEY=~/.ssh/… android/build.sh"
    exit 1
  fi
else
  ( umask 077; head -c 24 /dev/urandom | base64 | tr -d '/+=' > "$password_file" )
  "$JAVA_HOME/bin/keytool" -genkeypair -keystore "$keystore" -alias villemmings \
    -keyalg RSA -keysize 4096 -validity 20000 -dname "CN=Villemmings" \
    -storepass "$(cat "$password_file")" -keypass "$(cat "$password_file")" >/dev/null
  tar -c -C "$secrets" release.jks release.passwort | "$age_bin" -e -R "$signing/empfaenger.txt" -o "$signing/release.age"
  echo
  echo "Neuer Signaturschlüssel, verschlüsselt in $signing/release.age."
  echo "Committen! Ohne ihn lässt sich die App nie wieder aktualisieren."
  echo
fi
export VILLEMMINGS_KEYSTORE="$keystore"
export VILLEMMINGS_KEYSTORE_PASSWORD="$(cat "$password_file")"

# Vor dem Bau sicherstellen, dass alle Level lösbar sind
node "$android_dir/../tools/test-levels.mjs" >/dev/null || {
  echo "Leveltest fehlgeschlagen – erst 'npm test' reparieren."
  exit 1
}

cd "$android_dir"
./gradlew --no-daemon --quiet :app:assembleRelease

apk="$android_dir/app/build/outputs/apk/release/app-release.apk"
aapt2="$(ls -d "$ANDROID_HOME"/build-tools/*/ | sort -V | tail -1)aapt2"
badging="$("$aapt2" dump badging "$apk" | sed -n 1p)"
version_name="$(sed -n "s/.*versionName='\([^']*\)'.*/\1/p" <<< "$badging")"
size="$(stat -c %s "$apk")"

release="$android_dir/release"
mkdir -p "$release"
cp "$apk" "$release/villemmings.apk"

echo "Villemmings $version_name gebaut, $((size / 1024)) KB:"
echo "  $release/villemmings.apk"
echo "Als GitHub-Release veröffentlichen (dann bieten installierte Apps das Update an):"
echo "  gh release create v$version_name android/release/villemmings.apk"
