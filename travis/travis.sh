#!/bin/bash

set -e

cd `dirname $0`
. env.sh
cd ..

if [ "$NAME_OF_PLUGIN" == "" ]
then
  export NAME_OF_PLUGIN=`basename $PATH_TO_PLUGIN`
fi

cd $PATH_TO_REDMINE

bundle exec rake db:structure:dump

# create scms for test
bundle exec rake test:scm:setup:all

# run tests
# bundle exec rake TEST=test/unit/role_test.rb
bundle exec rake redmine:plugins:test NAME=$NAME_OF_PLUGIN

