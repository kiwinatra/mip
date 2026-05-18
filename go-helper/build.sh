#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR/go-helper/checksha"

go env -w CGO_ENABLED=0 >/dev/null 2>&1 || true

go build -trimpath -ldflags="-s -w" -o "$ROOT_DIR/go-helper/checksha/checksha" ./main.go

echo "built: $ROOT_DIR/go-helper/checksha/checksha"

