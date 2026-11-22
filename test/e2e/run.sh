#!/usr/bin/env bash
# Runs the Playwright E2E tests in an isolated workspace (<redmine>/tmp/e2e).
# Usage: run.sh [playwright test args...]
# This script is the single source of the workspace path, port and Rails env:
# playwright.config.js, support/helpers.js and support/seed.rb read them from here.
# Must run before any bash-only syntax: `sh run.sh` (dash) cannot parse it.
[ -n "${BASH_VERSION:-}" ] || { echo "error: run this script with bash (./run.sh or 'bash run.sh'), not sh" >&2; exit 1; }
set -euo pipefail

E2E_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export E2E_REDMINE_ROOT="$(cd "$E2E_DIR/../../../.." && pwd)"
export E2E_WORK_DIR="$E2E_REDMINE_ROOT/tmp/e2e"
export E2E_PORT=4500

for cmd in git node; do
  command -v "$cmd" >/dev/null || { echo "error: required command not found: $cmd" >&2; exit 1; }
done
if [ ! -d "$E2E_DIR/node_modules" ]; then
  echo "error: $E2E_DIR/node_modules not found; run 'npm ci' in test/e2e first" >&2
  exit 1
fi
# Fails fast before the slow DB setup; Playwright's webServer (reuseExistingServer: false)
# is the backstop if this probe is unavailable.
if (exec 3<>"/dev/tcp/127.0.0.1/$E2E_PORT") 2>/dev/null; then
  echo "error: port $E2E_PORT is already in use (a server from an interrupted run may still be running; try 'lsof -i :$E2E_PORT')" >&2
  exit 1
fi

# Keep the workspace after a failed run so the DB, repository and seed can be inspected;
# the next run recreates it.
cleanup() {
  local status=$?
  if [ "$status" -eq 0 ]; then
    rm -rf "$E2E_WORK_DIR"
  else
    echo "E2E workspace kept for inspection: $E2E_WORK_DIR" >&2
  fi
}
trap cleanup EXIT

rm -rf "$E2E_WORK_DIR"

echo "==> Creating test Git repository"
REPO="$E2E_WORK_DIR/repo"
mkdir -p "$REPO/src"
git_e2e() { git -C "$REPO" -c user.name=E2E -c user.email=e2e@example.invalid "$@"; }
git_e2e init --quiet --initial-branch=main
printf 'def hello\n  puts "hello"\nend\n' > "$REPO/src/hello.rb"
git_e2e add src/hello.rb
git_e2e commit --quiet -m "Add hello.rb"
printf 'def hello(name = "world")\n  puts "hello, #{name}"\n  puts "bye"\nend\n\nhello\n' > "$REPO/src/hello.rb"
git_e2e commit --quiet -am "Update hello.rb"

echo "==> Preparing E2E database"
cd "$E2E_REDMINE_ROOT"
# The test environment's config/database.yml appends "_test" to DB_NAME (db.sqlite3_test).
export RAILS_ENV=test DB=sqlite3 DB_NAME="$E2E_WORK_DIR/db.sqlite3" REDMINE_LANG=en
bin/rake db:create db:migrate redmine:load_default_data
bin/rails runner plugins/redmine_code_review/test/e2e/support/seed.rb

echo "==> Running Playwright"
cd "$E2E_DIR"
npx playwright test "$@"
