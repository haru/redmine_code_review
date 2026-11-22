# Seeds E2E data into the isolated DB. Invoked by run.sh only (it exports E2E_WORK_DIR,
# DB, DB_NAME and RAILS_ENV=test and creates <work_dir>/repo). Writes seed.json for
# the Playwright helpers.
require 'json'

PASSWORD = 'e2e-Passw0rd!'.freeze
work_dir = Pathname.new(ENV.fetch('E2E_WORK_DIR'))
repo_dir = work_dir.join('repo')

db = ActiveRecord::Base.connection_db_config.database.to_s
unless db.start_with?(work_dir.to_s)
  raise "E2E seed: refusing to run against #{db}; expected a DB under #{work_dir} " \
        '(does config/database.yml honor DB_NAME?)'
end
raise 'E2E seed: git is not available to Redmine (scm_git_command)' unless Repository::Git.scm_available

permissions = %i[view_code_review add_code_review edit_code_review
                 delete_code_review assign_code_review code_review_setting]
role = Role.find_by!(name: 'Manager')
role.add_permission!(*permissions)

# Can see reviews but not add, edit or delete them.
viewer_role = Role.create!(name: 'E2E Viewer', permissions: %i[view_issues browse_repository view_changesets view_code_review])

def create_user(login, password)
  user = User.new(login: login, firstname: 'E2E', lastname: login,
                  mail: "#{login}@example.invalid", language: 'en')
  user.password = password
  user.password_confirmation = password
  user.must_change_passwd = false
  user.save!
  user
end

user = create_user('e2e-reviewer', PASSWORD)
viewer = create_user('e2e-viewer', PASSWORD)

project = Project.new(name: 'E2E Project', identifier: 'e2e-project', is_public: true)
project.enabled_module_names = %w[issue_tracking repository code_review]
project.trackers = Tracker.all.to_a
project.save!

Member.create!(project: project, principal: user, roles: [role])
Member.create!(project: project, principal: viewer, roles: [viewer_role])

repository = Repository::Git.create!(project: project, identifier: 'e2e', is_default: true,
                                     url: repo_dir.join('.git').to_s)
# fetch_changesets returns silently when git fails, so verify the result.
repository.fetch_changesets
count = repository.changesets.count
unless count == 2
  raise "E2E seed: expected 2 changesets from #{repository.url}, got #{count} (see log/test.log)"
end

CodeReviewProjectSetting.find_or_create(project)

File.write(work_dir.join('seed.json'), JSON.pretty_generate(
  user: { login: user.login, password: PASSWORD },
  viewer: { login: viewer.login, password: PASSWORD },
  project: project.identifier,
  repository: repository.identifier,
  revision: repository.changesets.find_by!(comments: 'Update hello.rb').revision,
  path: 'src/hello.rb'
))
