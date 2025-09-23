# Copilot Instructions: Redmine Code Review Plugin

## Overview

This is a Redmine plugin that adds code review functionality to the repository browser. Code reviews are linked to Redmine issues and integrate deeply with Redmine's permission system, hooks, and project modules.

## Core Architecture

### Plugin Structure
- **Standard Redmine Plugin**: Uses `init.rb` to register the plugin with permissions and project module
- **MVC Pattern**: Controllers (`app/controllers/`), Models (`app/models/`), Views (`app/views/`)
- **Deep Integration**: Patches core Redmine classes via files in `lib/` directory

### Key Models
- `CodeReview`: Central model linked to Redmine issues, changes, and attachments
- `CodeReviewAssignment`: Handles reviewer assignments with auto-assignment logic
- `CodeReviewProjectSetting`: Project-specific configuration (trackers, auto-assignment)
- `CodeReviewUserSetting`: User preferences

### Integration Points
The plugin extends Redmine through:
- **Monkey Patches**: Files like `code_review_change_patch.rb` add associations to core models
- **View Hooks**: `CodeReviewApplicationHooks` injects HTML into Redmine layouts
- **Permission System**: Custom permissions defined in `init.rb` project module
- **Routes**: Custom routes in `config/routes.rb` for `/projects/:id/code_review/*`

## Development Workflows

### Testing
```bash
# Run plugin tests with coverage
bundle exec rake redmine:plugins:test NAME=redmine_code_review

# Use test runner (includes SimpleCov with RcovFormatter)
ruby test/test_runner.rb
```

### Build Scripts
Located in `build-scripts/`:
- `install.sh` - Development environment setup
- `build.sh` - Test execution with coverage reporting
- `cleanup.sh` - Post-test cleanup

### Database Migrations
- Mixed migration formats: numbered (`0001_*.rb`) and timestamped (`20220312104356_*.rb`)
- Run migrations: `rake redmine:plugins:migrate RAILS_ENV=production`

## Code Patterns

### Model Associations
Code reviews are deeply interconnected:
```ruby
# CodeReview belongs_to :project, :change, :issue, :attachment
# Change has_many :code_reviews (via patch)
```

### Status Management
Code reviews use Redmine issue statuses rather than custom status fields:
```ruby
def is_closed?
  issue.closed?  # Delegates to linked issue
end
```

### Path Resolution
Complex logic in `CodeReview#path` handles repository URL variations and attachment-based reviews.

### Auto-Assignment
`CodeReviewAssignment` model with `after_save :review_auto_assign` callback on Change model.

## File Organization

- **Controllers**: Handle CRUD operations and diff views
- **Lib Patches**: Extend core Redmine classes (Change, Changeset, Issue, etc.)
- **Migrations**: Mix of numbered and timestamped formats
- **Locales**: Extensive i18n support in `config/locales/`
- **Assets**: Custom CSS/JS for code review UI
- **Tests**: Use Object Daddy for fixtures, SimpleCov for coverage

## Critical Considerations

1. **Issue Linking**: Every code review requires a linked Redmine issue
2. **Permission Checks**: Respect Redmine's role-based permissions
3. **Repository Integration**: Handle various repository types and URL schemes
4. **Backwards Compatibility**: Requires Redmine 5.1.0+ (see `init.rb`)
5. **Patch Loading**: All patches loaded in `init.rb` - order matters

## Development Guidelines

### Git Commit Messages
- **Always write commit messages in English**: Use clear, concise English for all git commit messages
- Follow conventional commit format when possible: `type(scope): description`
- Examples: `fix(review): handle null repository URLs`, `feat(assignment): add auto-assign logic`

### Code Comments
- **Write all code comments in English**: Use clear, descriptive English for all inline comments, documentation, and code explanations
- Follow existing comment patterns in the codebase for consistency
- Document complex logic, especially in patch files and integration points