# Seeds E2E data into the isolated DB. Invoked by run.sh only (it exports E2E_WORK_DIR,
# DB, DB_NAME and RAILS_ENV=test and creates <work_dir>/repo). Writes seed.json for
# the Playwright helpers.
require "json"

PASSWORD = "e2e-Passw0rd!".freeze
work_dir = Pathname.new(ENV.fetch("E2E_WORK_DIR"))
repo_dir = work_dir.join("repo")

db = ActiveRecord::Base.connection_db_config.database.to_s
unless db.start_with?(work_dir.to_s)
  raise "E2E seed: refusing to run against #{db}; expected a DB under #{work_dir} " \
        "(does config/database.yml honor DB_NAME?)"
end
unless Repository::Git.scm_available
  raise "E2E seed: Git repositories are unavailable: check scm_git_command, and on Redmine master " \
        "(#43209) set scm_git_path_regexp in config/configuration.yml"
end

permissions = %i[view_code_review add_code_review edit_code_review
                 delete_code_review assign_code_review code_review_setting]
role = Role.find_by!(name: "Manager")
role.add_permission!(*permissions)

# Can see reviews but not add, edit or delete them.
viewer_role = Role.create!(name: "E2E Viewer", permissions: %i[view_issues browse_repository view_changesets view_code_review])

def create_user(login, password)
  user = User.new(login: login, firstname: "E2E", lastname: login,
                  mail: "#{login}@example.invalid", language: "en")
  user.password = password
  user.password_confirmation = password
  user.must_change_passwd = false
  user.save!
  user
end

user = create_user("e2e-reviewer", PASSWORD)
viewer = create_user("e2e-viewer", PASSWORD)
outsider = create_user("e2e-outsider", PASSWORD)

project = Project.new(name: "E2E Project", identifier: "e2e-project", is_public: true)
project.enabled_module_names = %w[issue_tracking repository code_review]
project.trackers = Tracker.all.to_a
project.save!

Member.create!(project: project, principal: user, roles: [ role ])
Member.create!(project: project, principal: viewer, roles: [ viewer_role ])

repository = Repository::Git.create!(project: project, identifier: "e2e", is_default: true,
                                     url: repo_dir.join(".git").to_s)
# fetch_changesets returns silently when git fails, so verify the result.
repository.fetch_changesets
count = repository.changesets.count
unless count == 2
  raise "E2E seed: expected 2 changesets from #{repository.url}, got #{count} (see log/test.log)"
end

CodeReviewProjectSetting.find_or_create(project)

# Private project: only the reviewer is a member (the outsider and anonymous are not).
private_project = Project.new(name: "E2E Private", identifier: "e2e-private", is_public: false)
private_project.enabled_module_names = %w[issue_tracking repository code_review]
private_project.trackers = Tracker.all.to_a
private_project.save!
Member.create!(project: private_project, principal: user, roles: [ role ])

# Project for settings and auto-assign scenarios, so the main project's settings stay untouched.
# It points at the same git repository; the setting is created first (auto-assign disabled)
# so importing the two seeded commits creates no assignment.
settings_project = Project.new(name: "E2E Settings", identifier: "e2e-settings", is_public: true)
settings_project.enabled_module_names = %w[issue_tracking repository code_review]
settings_project.trackers = Tracker.all.to_a
settings_project.save!
raise "E2E seed: the settings project needs at least two trackers" if settings_project.trackers.size < 2
Member.create!(project: settings_project, principal: user, roles: [ role ])
Member.create!(project: settings_project, principal: viewer, roles: [ viewer_role ])
CodeReviewProjectSetting.find_or_create(settings_project)
settings_repository = Repository::Git.create!(project: settings_project, identifier: "e2e-settings",
                                              is_default: true, url: repo_dir.join(".git").to_s)
settings_repository.fetch_changesets
count = settings_repository.changesets.count
unless count == 2
  raise "E2E seed: expected 2 changesets for #{settings_repository.identifier}, got #{count} (see log/test.log)"
end

# An issue with a unified-diff attachment, for reviewing patch files.
tracker = project.trackers.first
patch_issue = Issue.create!(project: project, tracker: tracker, author: user, subject: "E2E patch issue",
                            priority: IssuePriority.first, status: IssueStatus.first)
patch_content = <<~PATCH
  --- a/src/hello.rb
  +++ b/src/hello.rb
  @@ -1,3 +1,4 @@
   def hello
  -  puts "hello"
  +  puts "hello, patch"
  +  puts "bye"
   end
PATCH
patch_file = Tempfile.new([ "e2e", ".patch" ])
patch_file.write(patch_content)
patch_file.rewind
upload = ActionDispatch::Http::UploadedFile.new(tempfile: patch_file, filename: "e2e.patch",
                                                type: "text/x-diff")
patch_attachment = Attachment.new(container: patch_issue, author: user)
patch_attachment.file = upload
patch_attachment.save!
raise "E2E seed: e2e.patch is not recognized as a diff" unless patch_attachment.is_diff?

# A parent issue and a child issue linked to the first commit: the review dialog opened on
# that revision suggests the parent issue.
parent_issue = Issue.create!(project: project, tracker: tracker, author: user, subject: "E2E parent issue",
                             priority: IssuePriority.first, status: IssueStatus.first)
child_issue = Issue.create!(project: project, tracker: tracker, author: user, subject: "E2E child issue",
                            priority: IssuePriority.first, status: IssueStatus.first,
                            parent_issue_id: parent_issue.id)
first_changeset = repository.changesets.find_by!(comments: "Add hello.rb")
first_changeset.issues << child_issue

File.write(work_dir.join("seed.json"), JSON.pretty_generate(
  user: { login: user.login, password: PASSWORD },
  viewer: { login: viewer.login, password: PASSWORD },
  outsider: { login: outsider.login, password: PASSWORD },
  project: project.identifier,
  privateProject: private_project.identifier,
  settingsProject: settings_project.identifier,
  settingsRepository: settings_repository.identifier,
  repository: repository.identifier,
  revision: repository.changesets.find_by!(comments: "Update hello.rb").revision,
  path: "src/hello.rb",
  patchAttachment: { id: patch_attachment.id, filename: patch_attachment.filename },
  patchIssue: patch_issue.id,
  parentSuggestion: { revision: first_changeset.revision, parentIssue: parent_issue.id }
))
