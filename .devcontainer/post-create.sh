#!/bin/sh
cd /usr/local/redmine

cp plugins/redmine_code_review/Gemfile_for_test plugins/redmine_code_review/Gemfile 
bundle install 

initdb() {
    bundle exec rake db:create
    bundle exec rake db:migrate
    bundle exec rake redmine:plugins:migrate

    bundle exec rake db:drop RAILS_ENV=test
    bundle exec rake db:create RAILS_ENV=test
    bundle exec rake db:migrate RAILS_ENV=test
    bundle exec rake redmine:plugins:migrate RAILS_ENV=test
}

export DB=sqlite3

initdb

export DB=postgres

initdb

export DB=mysql

initdb