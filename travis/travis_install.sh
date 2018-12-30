#!/bin/bash

set -e

cd `dirname $0`
. env.sh
cd ..

if [[ ! "$TESTSPACE" = /* ]] ||
   [[ ! "$PATH_TO_REDMINE" = /* ]] ||
   [[ ! "$PATH_TO_PLUGIN" = /* ]];
then
  echo "You should set"\
       " TESTSPACE, PATH_TO_REDMINE,"\
       " PATH_TO_PLUGIN"\
       " environment variables"
  echo "You set:"\
       "$TESTSPACE"\
       "$PATH_TO_REDMINE"\
       "$PATH_TO_PLUGIN"
  exit 1;
fi

if [ "$REDMINE_VER" = "" ]
then
  export REDMINE_VER=master
fi

if [ "$NAME_OF_PLUGIN" == "" ]
then
  export NAME_OF_PLUGIN=`basename $PATH_TO_PLUGIN`
fi

mkdir -p $TESTSPACE

export REDMINE_GIT_REPO=git://github.com/redmine/redmine.git
export REDMINE_GIT_TAG=$REDMINE_VER
export BUNDLE_GEMFILE=$PATH_TO_REDMINE/Gemfile

if [ -f Gemfile_for_test ]
then
  cp Gemfile_for_test Gemfile
fi

# checkout redmine
git clone $REDMINE_GIT_REPO $PATH_TO_REDMINE

cd $PATH_TO_REDMINE
if [ ! "$REDMINE_GIT_TAG" = "master" ];
then
  git checkout -b $REDMINE_GIT_TAG origin/$REDMINE_GIT_TAG
fi

# create a link to the backlogs plugin
ln -sf $PATH_TO_PLUGIN plugins/$NAME_OF_PLUGIN


cat << EOS > config/database.yml
test:
  adapter: sqlite3
  database: db/test.sqlite3
EOS


# install gems
bundle install

# run redmine database migrations
bundle exec rake db:migrate

# run plugin database migrations
bundle exec rake redmine:plugins:migrate


