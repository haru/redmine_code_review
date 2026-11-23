#!/bin/bash

# Runs the Playwright E2E suite inside CI on the Redmine checkout that
# build-scripts/install.sh prepared. All workspace setup, seeding and test
# execution stay in test/e2e/run.sh; this script adds only the CI-specific
# steps: lockfile-exact dependencies, the browser, a clean server log and the
# JSON report consumed by build-scripts/e2e-summary.js (the E2E Summary step).

set -euo pipefail

cd `dirname $0`
. env.sh

if [ "${NAME_OF_PLUGIN:-}" == "" ]
then
  export NAME_OF_PLUGIN=`basename $PATH_TO_PLUGIN`
fi

cd $PATH_TO_REDMINE/plugins/$NAME_OF_PLUGIN/test/e2e

npm ci
npx playwright install --with-deps chromium

# Redmine master (#43209) only enables an SCM whose scm_<type>_path_regexp is set.
# The CI Redmine is throwaway and has no configuration.yml; refuse to overwrite one.
CONFIG=$PATH_TO_REDMINE/config/configuration.yml
if [ -e "$CONFIG" ]
then
  echo "$CONFIG already exists; e2e.sh will not overwrite it" >&2
  exit 1
fi
printf 'default:\n  scm_git_path_regexp: .*\n' > "$CONFIG"

# Empty the server log so the failure artifact holds only this E2E run.
: > $PATH_TO_REDMINE/log/test.log

PLAYWRIGHT_JSON_OUTPUT_FILE="$PATH_TO_PLUGIN/e2e-results.json" ./run.sh --forbid-only --retries=0 --reporter=list,json
