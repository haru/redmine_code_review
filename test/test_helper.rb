# Code Review plugin for Redmine
# Copyright (C) 2010-2012  Haruyuki Iida
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.

require File.expand_path(File.dirname(__FILE__) + '/../../../test/test_helper')

# Ensure that we are using the temporary fixture path
#ngines::Testing.set_fixture_path

# Mock out a file
def mock_file
  file = 'a_file.png'
  file.stubs(:size).returns(32)
  file.stubs(:original_filename).returns('a_file.png')
  file.stubs(:content_type).returns('image/png')
  file.stubs(:read).returns(false)
  file
end

FactoryGirl.define do

  factory :attachment do
  
    container{
      Project.find(1)
    }
    file {
      ActiveSupport::TestCase.mock_file
    }
    author {
      User.find(1)
    }
  end
  
  factory :repository do
    project_id 1
    url "file:///#{Rails.root}/tmp/test/subversion_repository"
    root_url "file:///#{Rails.root}/tmp/test/subversion_repository"
    password ""
    login ""
    type {
      scm = 'Subversion'
      unless Setting.enabled_scm.include?(scm)
        Setting.enabled_scm << scm
      end
      scm
    }
    is_default true
  end
  
  factory :changeset do
    sequence(:revision, 1000)
    committed_on{
      Date.today
    }
    #association :repository
    repository {
      scm = 'Subversion'
      unless Setting.enabled_scm.include?(scm)
        Setting.enabled_scm << scm
      end
      Repository.find(10)
    }
  end
  
  factory :change do
    action {
      "A"
    }
    sequence(:path){ |n|
      "test/dir/aaa#{n}"
    }
    changeset {
      FactoryGirl.create(:changeset)
    }
  end
  
  factory :code_review_assignment do
    issue_id 1
  end
  
  factory :issue do
    subject 'hoge'
    author{
      User.find(1)
    }
  end
  
  factory :code_review do
    issue_id 1
    updated_by_id 1
    line 10
    action_type 'diff'
  end
  
  factory :code_review_project_setting do
    project_id 1
    tracker_id 1
    assignment_tracker_id 1
  end
  
  factory :enabled_module do
    
  end

end