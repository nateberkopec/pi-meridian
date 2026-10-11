#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -d "$root/node_modules" && ! -L "$root/node_modules" ]]; then
  printf '%s\n' 'Move the old root node_modules directory before setting up development dependencies.' >&2
  exit 1
fi
cd "$root/development"
aube install --config.lockfile=true --frozen-lockfile --ignore-scripts
ln -sfn development/node_modules "$root/node_modules"
