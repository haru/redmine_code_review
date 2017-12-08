# Code Review plugin for Redmine
# Copyright (C) 2012  Haruyuki Iida
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

require 'simplecov'
require 'simplecov-rcov'
SimpleCov.formatter = SimpleCov::Formatter::RcovFormatter
SimpleCov.start

require 'fileutils'
testdir = File.dirname(File.expand_path(__FILE__))

Dir::chdir("#{testdir}/..")

require "#{testdir}/test_helper"

Dir::glob("#{testdir}/fixtures/*.yml").each { |f|
  FileUtils.copy(f, "#{testdir}/../../../test/fixtures/")
}

Dir::glob("#{testdir}/**/*test.rb").each { |f|
  require f
}
