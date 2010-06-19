# Code Review plugin for Redmine
# Copyright (C) 2010  Haruyuki Iida
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

require File.expand_path(File.dirname(__FILE__) + '/../../../../test/test_helper')
require File.expand_path(File.dirname(__FILE__) + '/code_review_object_daddy_helpers')
include CodeReviewObjectDaddyHelpers

my_exemplars_path = File.expand_path(File.join(File.dirname(__FILE__), 'exemplars'))
test_exemplars_path = File.expand_path(File.join(RAILS_ROOT, 'test', 'exemplars'))
spec_exemplars_path = File.expand_path(File.join(RAILS_ROOT, 'spec', 'exemplars'))

Dir::foreach(my_exemplars_path) do |file|
  next unless /exemplar\.rb$/ =~ file
  FileUtils.cp(File.join(my_exemplars_path, file), test_exemplars_path)
end if File.exist?(test_exemplars_path)

Dir::foreach(test_exemplars_path) do |file|
  next unless /exemplar\.rb$/ =~ file
  FileUtils.cp(File.join(test_exemplars_path, file), spec_exemplars_path)
end if File.exist?(spec_exemplars_path)

# Ensure that we are using the temporary fixture path
Engines::Testing.set_fixture_path

# Mock out a file
  def mock_file
    file = 'a_file.png'
    file.stubs(:size).returns(32)
    file.stubs(:original_filename).returns('a_file.png')
    file.stubs(:content_type).returns('image/png')
    file.stubs(:read).returns(false)
    file
  end
