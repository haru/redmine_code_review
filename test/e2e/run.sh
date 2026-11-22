#!/usr/bin/env bash
# Runs the Playwright E2E tests in an isolated workspace (<redmine>/tmp/e2e).
# Usage: run.sh [playwright test args...]
set -euo pipefail

E2E_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REDMINE_ROOT="$(cd "$E2E_DIR/../../../.." && pwd)"
WORK_DIR="$REDMINE_ROOT/tmp/e2e"
PORT=4500

for cmd in git node; do
  command -v "$cmd" >/dev/null || { echo "error: required command not found: $cmd" >&2; exit 1; }
done
if [ ! -d "$E2E_DIR/node_modules" ]; then
  echo "error: $E2E_DIR/node_modules not found; run 'npm ci' in test/e2e first" >&2
  exit 1
fi
if (exec 3<>"/dev/tcp/127.0.0.1/$PORT") 2>/dev/null; then
  echo "error: port $PORT is already in use" >&2
  exit 1
fi

cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR"

echo "==> Creating test Git repository"
REPO="$WORK_DIR/repo"
mkdir -p "$REPO/src"
git_e2e() { git -C "$REPO" -c user.name=E2E -c user.email=e2e@example.invalid "$@"; }
git -C "$REPO" init --quiet --initial-branch=main
printf 'def hello\n  puts "hello"\nend\n' > "$REPO/src/hello.rb"
git_e2e add src/hello.rb
git_e2e commit --quiet -m "Add hello.rb"
printf 'def hello(name = "world")\n  puts "hello, #{name}"\n  puts "bye"\nend\n\nhello\n' > "$REPO/src/hello.rb"
git_e2e commit --quiet -am "Update hello.rb"

echo "==> Preparing E2E database"
cd "$REDMINE_ROOT"
export RAILS_ENV=test DB=sqlite3 DB_NAME="$WORK_DIR/db.sqlite3" REDMINE_LANG=en
bin/rake db:create db:migrate redmine:load_default_data
bin/rails runner plugins/redmine_code_review/test/e2e/support/seed.rb

echo "==> Running Playwright"
cd "$E2E_DIR"
npx playwright test "$@"
