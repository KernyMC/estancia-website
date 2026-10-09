#!/usr/bin/env bash
# Helper for the Dokploy tRPC API. Source it, don't execute it:
#   source scripts/dokploy-api.sh
#   dget application.one '{"applicationId":"..."}'
#
# Why this exists: the Dokploy CLI (@dokploy/cli 0.3.0) builds GET queries as
# ?input={...} but the server uses the superjson transformer and expects
# ?input={"json":{...}} — every CLI read with a parameter (application one,
# project one, github get-github-repositories, etc.) 400s. Writes through the
# CLI (create, save-*, deploy) are fine, since apiPost already wraps in
# {json:...}. Reads go through here instead. Full context: docs/deploy-staging.md.
set -euo pipefail

# Built from $USERPROFILE (native Windows env var, "C:\Users\KEVIN") rather
# than bash's $HOME ("/c/Users/KEVIN"): a POSIX-style path embedded inside a
# `node -e` string gets mangled by Git Bash's argument conversion when it's
# passed to node.exe (a native Win32 binary) — same class of bug as the
# MSYS_NO_PATHCONV issue with `dokploy` CLI flags, confirmed by hand.
CFG="$(printf '%s' "$USERPROFILE" | tr '\\' '/')/AppData/Roaming/npm/node_modules/@dokploy/cli/config.json"

if [ ! -f "$CFG" ]; then
  echo "No se encontró $CFG — corre 'dokploy auth' primero." >&2
  return 1 2>/dev/null || exit 1
fi

URL=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$CFG','utf8')).url)")
TOKEN=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$CFG','utf8')).token)")

dget() { # dget <procedure> [json-params]
  local proc="$1" params="${2:-}" q=""
  if [ -n "$params" ]; then
    q="?input=$(node -e "console.log(encodeURIComponent(JSON.stringify({json:JSON.parse(process.argv[1])})))" "$params")"
  fi
  curl -s -H "x-api-key: $TOKEN" "$URL/api/trpc/$proc$q"
}

dpost() { # dpost <procedure> <json-body>
  curl -s -X POST -H "x-api-key: $TOKEN" -H 'Content-Type: application/json' \
    -d "{\"json\":$2}" "$URL/api/trpc/$1"
}
