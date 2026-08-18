#!/usr/bin/env bash
# Build a macOS installer package for the Coach Microphone driver.
#
# This is the NORMAL-USER install path: double-clicking the resulting .pkg shows
# the native macOS Installer with a graphical admin-password prompt — no Terminal,
# no `sudo`. (The dev `install-dev.sh` with terminal sudo is only for iterating.)
#
#   ./make-pkg.sh                                   # unsigned (dev / structure check)
#   INSTALLER_ID="Developer ID Installer: … (TEAMID)" ./make-pkg.sh   # signed for distribution
#
# A shipped .pkg must be signed with a "Developer ID Installer" identity AND the
# driver inside it signed with "Developer ID Application" + notarized, or
# Gatekeeper will block the install. See README.md.
set -euo pipefail

cd "$(dirname "$0")"

DRIVER="build/CoachMicrophone.driver"
PKG="build/CoachMicrophone.pkg"

if [ ! -d "$DRIVER" ]; then
  echo "error: $DRIVER not found — run ./build.sh first." >&2
  exit 1
fi

# Stage only the .driver so pkgbuild installs it directly under the HAL folder.
# `ditto` is the macOS-native tool for copying bundles (preserves the bundle
# structure and any code signature intact).
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
ditto "$DRIVER" "$STAGE/CoachMicrophone.driver"

pkgbuild \
  --root "$STAGE" \
  --identifier "com.saleshunter.coach.virtualmic" \
  --version "0.1.0" \
  --install-location "/Library/Audio/Plug-Ins/HAL" \
  --scripts "pkg/scripts" \
  "$PKG"

echo "built: $(pwd)/$PKG"

# Sign for distribution when a Developer ID Installer identity is provided.
if [ -n "${INSTALLER_ID:-}" ]; then
  productsign --sign "$INSTALLER_ID" "$PKG" "build/CoachMicrophone-signed.pkg"
  echo "signed: $(pwd)/build/CoachMicrophone-signed.pkg  (notarize before shipping)"
else
  echo "note: unsigned — double-clicking works locally, but a shipped .pkg needs INSTALLER_ID + notarization."
fi
