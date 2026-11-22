// Values exported by run.sh. Raises when the tests are not started through it.
function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set; run the E2E tests through test/e2e/run.sh`);
  }
  return value;
}

module.exports = {
  redmineRoot: required('E2E_REDMINE_ROOT'),
  workDir: required('E2E_WORK_DIR'),
  port: required('E2E_PORT'),
};
