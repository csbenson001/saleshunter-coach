#!/usr/bin/env bash
set -e

DMG_PATH="$1"
if [ -z "$DMG_PATH" ]; then
    echo "Usage: $0 <path-to-dmg>"
    exit 1
fi

echo "==> Mounting $DMG_PATH..."
MOUNT_POINT=$(hdiutil attach "$DMG_PATH" -nobrowse | grep "/Volumes/" | awk '{print $3,$4,$5}' | sed 's/[[:space:]]*$//')
echo "==> Mounted at: $MOUNT_POINT"

echo "==> Installing SalesHunter Coach.app to /Applications..."
cp -R "$MOUNT_POINT/SalesHunter Coach.app" /Applications/

echo "==> Unmounting $MOUNT_POINT..."
hdiutil detach "$MOUNT_POINT" -force

echo "==> Clearing macOS quarantine attributes..."
xattr -cr "/Applications/SalesHunter Coach.app"

echo "==> Applying clean ad-hoc signature..."
codesign --force --deep --sign - "/Applications/SalesHunter Coach.app"

echo "==> Verifying signature..."
codesign -v --verbose=2 "/Applications/SalesHunter Coach.app"

echo "==> Launching SalesHunter Coach..."
open "/Applications/SalesHunter Coach.app"

echo "==> Installation & launch complete!"
