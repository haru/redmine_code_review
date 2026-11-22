#!/usr/bin/env bash
# Single entry point for RuboCop, shared by CI and local runs.
# Usage: build-scripts/rubocop.sh [rubocop args...]   (e.g. -a to autocorrect)
# Runs from any directory; the RuboCop version is pinned by tools/rubocop/Gemfile.lock.
set -euo pipefail

if [ -z "${BASH_VERSION:-}" ]; then
  echo "rubocop.sh: bash is required" >&2
  exit 1
fi

cd "$(dirname "${BASH_SOURCE[0]}")/.."
export BUNDLE_GEMFILE="$PWD/tools/rubocop/Gemfile"

if ! command -v bundle > /dev/null; then
  echo "rubocop.sh: 'bundle' (Bundler) is not installed" >&2
  exit 1
fi

bundle install --quiet
bundle exec rubocop --version

# --ignore-parent-exclusion: inside a Redmine checkout the parent .rubocop.yml
# excludes plugins/, which would silently inspect 0 files.
targets=$(bundle exec rubocop --ignore-parent-exclusion --list-target-files | wc -l)
if [ "$targets" -eq 0 ]; then
  echo "rubocop.sh: RuboCop found 0 target files; refusing to report success" >&2
  exit 1
fi

exec bundle exec rubocop --ignore-parent-exclusion "$@"
