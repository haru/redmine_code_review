# Seeds E2E data. Run via `bin/rails runner` with RAILS_ENV=test against the E2E DB.
# Writes tmp/e2e/seed.json for the Playwright helpers.
require 'json'

PASSWORD = 'e2e-Passw0rd!'.freeze
work_dir = Rails.root.join('tmp', 'e2e')
repo_dir = work_dir.join('repo')

permissions = %i[view_code_review add_code_review edit_code_review
                 delete_code_review assign_code_review code_review_setting]
role = Role.find_by!(name: 'Manager')
role.add_permission!(*permissions)

user = User.new(login: 'e2e-reviewer', firstname: 'E2E', lastname: 'Reviewer',
                mail: 'e2e-reviewer@example.invalid', language: 'en')
user.password = PASSWORD
user.password_confirmation = PASSWORD
user.must_change_passwd = false
user.save!

project = Project.new(name: 'E2E Project', identifier: 'e2e-project', is_public: true)
project.enabled_module_names = %w[issue_tracking repository code_review]
project.trackers = Tracker.all.to_a
project.save!

Member.create!(project: project, principal: user, roles: [role])

repository = Repository::Git.new(project: project, identifier: 'e2e', is_default: true,
                                 url: repo_dir.join('.git').to_s)
repository.save!
repository.fetch_changesets

CodeReviewProjectSetting.find_or_create(project)

revision = repository.changesets.order(:id).last.revision

File.write(work_dir.join('seed.json'), JSON.pretty_generate(
  baseURL: 'http://127.0.0.1:4500',
  user: { login: user.login, password: PASSWORD },
  project: project.identifier,
  repository: repository.identifier,
  revision: revision,
  path: 'src/hello.rb'
))
