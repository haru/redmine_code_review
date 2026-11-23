[![build](https://github.com/haru/redmine_code_review/actions/workflows/build.yml/badge.svg)](https://github.com/haru/redmine_code_review/actions/workflows/build.yml)
[![Maintainability](https://api.codeclimate.com/v1/badges/adc7bcbf7bfd8e80a97b/maintainability)](https://codeclimate.com/github/haru/redmine_code_review/maintainability)
[![codecov](https://codecov.io/gh/haru/redmine_code_review/branch/develop/graph/badge.svg?token=37CJ55KBUU)](https://codecov.io/gh/haru/redmine_code_review)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/haru/redmine_code_review)
![Redmine](https://img.shields.io/badge/redmine->=6.0-blue?logo=redmine&logoColor=%23B32024&labelColor=f0f0f0&link=https%3A%2F%2Fwww.redmine.org)

# Redmine Code Review Plugin

A comprehensive code review plugin for Redmine that enables collaborative source code annotation and review within the repository browser. This plugin integrates deeply with Redmine's issue tracking, permission system, and project management features.

## Features

- **In-browser Code Review**: Annotate and review source code directly in Redmine's repository browser
- **Issue Integration**: Link code reviews to Redmine issues for comprehensive project tracking
- **Reviewer Assignment**: Automatic and manual reviewer assignment with notification support
- **Project Configuration**: Per-project settings for trackers and auto-assignment rules
- **Permission Control**: Granular permissions integrated with Redmine's role-based access control
- **Multi-repository Support**: Works with various repository types (Git, Subversion, etc.)
- **Attachment Reviews**: Review code changes from attached patches and files
- **Email Notifications**: Automatic notifications for review assignments and updates

## Requirements

- **Redmine**: Version 6.0.0 or higher
- **Ruby**: Compatible with Redmine-supported Ruby versions
- **Database**: Any database supported by Redmine (MySQL, PostgreSQL, SQLite)
- **Repository**: Git, Subversion, or other VCS supported by Redmine

## Installation

### 1. Download and Install Plugin

```bash
cd /path/to/redmine/plugins
git clone https://github.com/haru/redmine_code_review.git
```

Or download and extract the plugin archive to `plugins/redmine_code_review`.

### 2. Install Dependencies

```bash
cd /path/to/redmine
bundle install
```

### 3. Run Database Migration

```bash
# For production environment
rake redmine:plugins:migrate RAILS_ENV=production
```

### 4. Restart Redmine

Restart your Redmine application server (Apache, Nginx, Passenger, etc.).

### 5. Enable Plugin Module

1. Go to your project's **Settings** tab
2. Click on the **Modules** tab
3. Check **Code Review** to enable the module for this project

### 6. Configure Permissions

1. Go to **Administration** → **Roles and permissions**
2. For each role that should use code reviews, grant appropriate permissions:
   - **View code review**: View existing code reviews
   - **Add code review**: Create new code reviews and comments
   - **Edit code review**: Modify existing code reviews
   - **Delete code review**: Remove code reviews
   - **Assign code review**: Assign reviewers to code reviews
   - **Code review setting**: Configure project-specific code review settings

### 7. Configure Project Settings

1. In your project, go to **Settings** → **Code Review**
2. Select which **tracker** should be used for code review issues
3. Configure auto-assignment rules if desired

## Usage

### Creating Code Reviews

1. **From Repository Browser**:
   - Navigate to a file in your project's repository
   - Click on a line number to add a review comment
   - Select the appropriate issue or create a new one

2. **From Changesets**:
   - View a changeset in the repository
   - Click "Review" to create a review for the entire changeset
   - Add comments to specific lines or files

3. **From Attachments**:
   - Attach a patch file to an issue
   - Navigate to the attachment and click "Review"
   - Review the patch contents line by line

### Managing Reviews

- **Assign Reviewers**: Use the assignment interface to designate specific reviewers
- **Track Progress**: Reviews are linked to issues, allowing full lifecycle tracking
- **Auto-assignment**: Configure rules for automatic reviewer assignment based on file paths or authors

### Notifications

The plugin sends email notifications for:
- New review assignments
- Review comments and replies
- Review status changes
- Assignment changes

## Development

### Setting Up Development Environment

```bash
# Clone the repository
git clone https://github.com/haru/redmine_code_review.git
cd redmine_code_review

# Install dependencies
bundle install

# Set up test environment
cp config/database.yml.example config/database.yml
# Edit database.yml with your test database settings

# Run migrations
rake db:migrate RAILS_ENV=test
rake redmine:plugins:migrate RAILS_ENV=test
```

### Running Tests

```bash
# Run all plugin tests
bundle exec rake redmine:plugins:test NAME=redmine_code_review

# Run with coverage reporting
ruby test/test_runner.rb

# Use build script (includes coverage and cleanup)
./build-scripts/build.sh
```

### Build Scripts

The `build-scripts/` directory contains useful development tools:

- `install.sh` - Set up development environment
- `build.sh` - Run tests with coverage reporting
- `cleanup.sh` - Clean up after test runs
- `env.sh` - Environment configuration

### Test Coverage

The plugin includes comprehensive test coverage with:
- **Unit Tests**: Model and helper testing
- **Functional Tests**: Controller and integration testing
- **Coverage Reporting**: SimpleCov with Cobertura format
- **Fixtures**: Object Daddy for test data generation

Current test coverage reports are available in the `coverage/` directory.

## Architecture

### Core Models

- **CodeReview**: Central model linking reviews to issues, changes, and attachments
- **CodeReviewAssignment**: Handles reviewer assignment and auto-assignment logic
- **CodeReviewProjectSetting**: Project-specific configuration
- **CodeReviewUserSetting**: User preferences and settings

### Integration Points

The plugin extends Redmine through:
- **Model Patches**: Extends core Redmine models (Change, Changeset, Issue, etc.)
- **View Hooks**: Injects UI elements into Redmine's interface
- **Permission System**: Integrates with Redmine's role-based permissions
- **Email Notifications**: Uses Redmine's mailer system
- **Project Modules**: Registers as a standard Redmine project module

### Database Schema

The plugin creates several database tables:
- `code_reviews` - Main review data
- `code_review_assignments` - Reviewer assignments
- `code_review_project_settings` - Project configuration
- `code_review_user_settings` - User preferences

Migration files are located in `db/migrate/` with both numbered and timestamped formats.

## Contributing

1. Fork the repository
2. Create a feature branch from `develop` (`git checkout -b feature/amazing-feature develop`)
3. Make your changes with tests
4. Run the test suite (`bundle exec rake redmine:plugins:test NAME=redmine_code_review`)
5. Commit your changes (`git commit -m 'Add some amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request **against the `develop` branch** (not `main`)

### Coding Guidelines

- Write all commit messages in English
- Follow Ruby and Rails conventions
- Include tests for new functionality
- Update documentation as needed
- Maintain backwards compatibility when possible

## License

This program is free software; you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation; either version 2 of the License, or (at your option) any later version.

See [GPL.txt](GPL.txt) for the full license text.

## Support

- **Issues**: Report bugs and feature requests on [GitHub Issues](https://github.com/haru/redmine_code_review/issues)
- **Wiki**: Additional documentation at [R-Labs Wiki](http://www.r-labs.org/wiki/r-labs/Code_Review)
- **Plugin Directory**: [Redmine.org Plugin Directory](http://www.redmine.org/plugins/redmine_code_review)

## Authors

- **Haruyuki Iida** ([@haru_iida](http://twitter.com/haru_iida)) - Original author and maintainer

## Changelog

### Version 1.2.2
- Current stable release
- Requires Redmine 5.1.0 or higher
- Various bug fixes and improvements

For detailed changelog, see the commit history on GitHub.
