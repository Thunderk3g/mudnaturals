#!/usr/bin/env bash
# Pushes main as soon as the network comes back.
#
# The build finished while this machine had no outbound TCP at all — not even
# DNS to 1.1.1.1:53 — so the final `git push` could not run. This watches for
# connectivity and pushes once, then exits.
#
#   bash scripts/push-when-online.sh
#
# Safe to run more than once; it exits immediately if there is nothing to push.

set -u
cd "$(dirname "$0")/.." || exit 1

INTERVAL=60
DEADLINE=$(( $(date +%s) + 4*60*60 ))   # give up after four hours

pending() { git log --oneline '@{u}..HEAD' 2>/dev/null | wc -l | tr -d ' '; }

if [ "$(pending)" = "0" ]; then
  echo "nothing to push — main is already up to date with origin"
  exit 0
fi

echo "$(pending) commit(s) waiting. Watching for connectivity every ${INTERVAL}s…"

while [ "$(date +%s)" -lt "$DEADLINE" ]; do
  if git push origin main 2>/dev/null; then
    echo "$(date '+%H:%M:%S')  pushed. Vercel builds from GitHub, so the deploy is now running."
    echo "Next: run 'npm run security' once the deploy finishes — it must print PASS."
    exit 0
  fi
  echo "$(date '+%H:%M:%S')  still offline; retrying in ${INTERVAL}s"
  sleep "$INTERVAL"
done

echo "gave up after four hours — the network never returned. Run 'git push origin main' by hand."
exit 1
