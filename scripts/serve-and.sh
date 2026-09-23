#!/usr/bin/env bash
# serve-and.sh — start dzpharm dev server, wait for ready, run a command, then kill server.
# Usage: scripts/serve-and.sh <timeout_sec> -- <command...>
# The Kata sandbox kills backgrounded procs between Bash tool calls, so we keep
# everything inside one Bash invocation: start server → wait → run cmd → cleanup.
set -uo pipefail
cd /home/z/my-project/dzpharm

TIMEOUT="${1:-120}"; shift
if [[ "$1" == "--" ]]; then shift; fi
[[ $# -eq 0 ]] && { echo "no command given"; exit 2; }

# Start dev server detached within this shell session
setsid bun run dev > /home/z/my-project/dev.log 2>&1 &
DEVPID=$!
# Trap to ensure cleanup
trap 'kill -TERM $DEVPID 2>/dev/null; sleep 1; kill -KILL $DEVPID 2>/dev/null' EXIT

# Wait for server to accept connections (max 60s)
for i in $(seq 1 60); do
  if curl -sfo /dev/null http://localhost:3000/ --max-time 3 2>/dev/null; then
    break
  fi
  sleep 1
done

# Give turbopack time to finish first compile
sleep 5

# Run the requested command with the remaining timeout
timeout "$TIMEOUT" "$@"
EXIT=$?

# Show recent dev log for diagnostics
echo "--- dev.log (last 12) ---"
tail -12 /home/z/my-project/dev.log 2>/dev/null
exit $EXIT
