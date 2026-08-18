#!/usr/bin/env bash
# Install the freshly-built Coach Microphone driver for LOCAL development.
#
# This is the dev path — it ad-hoc signs the bundle and drops it into the system
# HAL plug-in folder, which needs sudo and restarts coreaudiod (a brief audio
# glitch for every app). The SHIPPING path (Developer ID signed + notarized +
# .pkg installed on first run from inside Coach) is documented in README.md.
#
# After running, open "Audio MIDI Setup" (or any app's mic list) — you should
# see "Coach Microphone".
set -euo pipefail

cd "$(dirname "$0")"

DRIVER="build/CoachMicrophone.driver"
DEST="/Library/Audio/Plug-Ins/HAL"

if [ ! -d "$DRIVER" ]; then
  echo "error: $DRIVER not found — run ./build.sh first." >&2
  exit 1
fi

# Ad-hoc sign so coreaudiod will load it on a dev machine. (A shipped build must
# be Developer ID signed + notarized instead — ad-hoc won't pass Gatekeeper.)
echo "Ad-hoc signing…"
codesign --force --deep -s - "$DRIVER"

echo "Installing to $DEST (needs sudo)…"
sudo mkdir -p "$DEST"
sudo rm -rf "$DEST/CoachMicrophone.driver"
sudo cp -R "$DRIVER" "$DEST/"
sudo chown -R root:wheel "$DEST/CoachMicrophone.driver"

echo "Restarting coreaudiod (brief audio interruption)…"
sudo killall coreaudiod || true

echo ""
echo "Done. Look for \"Coach Microphone\" in Audio MIDI Setup / any app's mic list."
echo "Uninstall with: sudo rm -rf \"$DEST/CoachMicrophone.driver\" && sudo killall coreaudiod"
