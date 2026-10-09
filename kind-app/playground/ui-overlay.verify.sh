#!/usr/bin/env bash
# bash playground/ui-overlay.verify.sh [out-file]
# The whole ui-overlay verification, in order. A step is retried once if the dev server hot-reloaded the page under it
# (another agent touched a shared file: "navigation", "createRoot", timeouts) — those are harness races, not failures.
cd "$(dirname "$0")/.." || exit 1
OUT="${1:-/tmp/ui-overlay-verify.txt}"
: > "$OUT"
step() {
  local name="$1"; shift
  for attempt in 1 2; do
    echo "=== $name (attempt $attempt)" >> "$OUT"
    timeout 290 "$@" > /tmp/ui-overlay-step.txt 2>&1
    cat /tmp/ui-overlay-step.txt >> "$OUT"
    if grep -qE "navigation|createRoot|TimeoutError|Execution context" /tmp/ui-overlay-step.txt; then continue; fi
    break
  done
}
step "physics iphone"  node playground/ui-overlay.physics.mjs iphone
step "physics lowend"  node playground/ui-overlay.physics.mjs lowend
step "features iphone" node playground/ui-overlay.features.mjs iphone
step "features lowend" node playground/ui-overlay.features.mjs lowend
step "wide"            node playground/ui-overlay.wide.mjs
LITE=0 step "shots"    node playground/ui-overlay.shots.mjs g
LITE=1 DEVICES=iphone step "shots lite" node playground/ui-overlay.shots.mjs g
step "flow iphone"     node playground/ui-overlay.flow.mjs g iphone
step "flow lowend"     node playground/ui-overlay.flow.mjs g lowend
step "zoom"            node playground/ui-overlay.zoom.mjs g .k-rings@0 .k-gauge@0 .k-hex@3 .k-dock@0 .k-toast
echo done >> "$OUT"
