#!/usr/bin/env bash
set -euo pipefail

ref="${1:?usage: tools/sync-upstream.sh <meridian-ref> [repository]}"
repository="${2:-https://github.com/rynfar/meridian.git}"
root="$(cd "$(dirname "$0")/.." && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

git -C "$work" init -q
git -C "$work" fetch -q --depth 1 "$repository" "$ref"
commit="$(git -C "$work" rev-parse FETCH_HEAD)"
git -C "$work" archive FETCH_HEAD plugin/pi plugin/priority-attestation.ts | tar -x -C "$work"

target="$root/extensions/meridian"
rm -rf "$target"
mkdir -p "$target"
cp -R "$work/plugin/pi" "$target/pi"
cp "$work/plugin/priority-attestation.ts" "$target/priority-attestation.ts"
printf 'export { default } from "./pi/index"\n' > "$target/index.ts"
printf '%s\n%s\n' "$repository" "$commit" > "$root/UPSTREAM"
printf 'Synced extensions/meridian from %s at %s\n' "$repository" "$commit"
