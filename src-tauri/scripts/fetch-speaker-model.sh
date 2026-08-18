#!/usr/bin/env bash
# Fetch + verify the CAM++ speaker-embedding model used by diarization, so it can
# be re-hosted on infrastructure we control.
#
# WHY: the app downloads this model at first use. Its only source today is a
# THIRD-PARTY GitHub release (k2-fsa/sherpa-onnx). If that release is retired or
# renamed, diarization silently breaks for every NEW install — existing installs
# keep their cached copy, so the failure would not show up until a fresh machine.
#
# Run this once, upload the resulting file to our own storage, then build with
#   COACH_MODEL_MIRROR=https://<our-host>/models/  (trailing slash = a prefix)
#   COACH_MODEL_MIRROR=https://<our-host>/campplus_zh_en_16k.onnx  (exact file)
# The upstream URL stays compiled in as a fallback, and the SHA-256 is verified
# on every download, so a wrong mirror degrades to upstream rather than shipping
# a different model.
#
# The model is Apache-2.0 (3D-Speaker CAM++), so re-hosting it is permitted;
# keep the licence and attribution alongside the file.
set -euo pipefail

URL="https://github.com/k2-fsa/sherpa-onnx/releases/download/speaker-recongition-models/3dspeaker_speech_campplus_sv_zh_en_16k-common_advanced.onnx"
# Must match MODEL_FILE / MODEL_SHA256 in src-tauri/src/diarize.rs.
FILE="campplus_zh_en_16k.onnx"
SHA256="aa3cfc16963a10586a9393f5035d6d6b57e98d358b347f80c2a30bf4f00ceba2"

DEST_DIR="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/models}"
DEST="$DEST_DIR/$FILE"

mkdir -p "$DEST_DIR"

if [ -f "$DEST" ] && command -v shasum >/dev/null 2>&1 &&
   [ "$(shasum -a 256 "$DEST" | cut -d' ' -f1)" = "$SHA256" ]; then
  echo "Already present and verified → $DEST"
  exit 0
fi

echo "Downloading CAM++ speaker model (~27 MB)…"
curl --fail --location --progress-bar "$URL" -o "$DEST.part"

if command -v shasum >/dev/null 2>&1; then
  GOT="$(shasum -a 256 "$DEST.part" | cut -d' ' -f1)"
elif command -v sha256sum >/dev/null 2>&1; then
  GOT="$(sha256sum "$DEST.part" | cut -d' ' -f1)"
else
  echo "No shasum/sha256sum available — refusing to publish an unverified model." >&2
  rm -f "$DEST.part"
  exit 1
fi

if [ "$GOT" != "$SHA256" ]; then
  echo "Checksum mismatch!" >&2
  echo "  expected $SHA256" >&2
  echo "  got      $GOT" >&2
  rm -f "$DEST.part"
  exit 1
fi

mv "$DEST.part" "$DEST"
echo "Verified → $DEST"
echo
echo "Next: upload it to our own storage, keeping the file name '$FILE', then"
echo "build with COACH_MODEL_MIRROR pointing at it. For example:"
echo "  aws s3 cp \"$DEST\" s3://<bucket>/models/$FILE --acl public-read"
echo "  COACH_MODEL_MIRROR=https://<host>/models/ bun run tauri build"
