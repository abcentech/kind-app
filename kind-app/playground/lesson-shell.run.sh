#!/bin/sh
# Retries only when the shared Vite dev server hot-reloaded the page mid-run (other agents edit files all day).
cd "$(dirname "$0")/.." || exit 1
mkdir -p tools/out/lesson-shell
for i in 1 2 3; do
  node playground/lesson-shell.test.mjs > tools/out/lesson-shell/test.log 2>&1
  code=$?
  if [ $code -eq 0 ]; then break; fi
  if ! grep -q "Execution context was destroyed\|Timeout\|Target closed" tools/out/lesson-shell/test.log; then break; fi
  echo "attempt $i interrupted by a reload, retrying" >> tools/out/lesson-shell/test.retries
done
node playground/lesson-shell.shots.mjs > tools/out/lesson-shell/shots.log 2>&1
echo done > tools/out/lesson-shell/finished
