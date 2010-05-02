# Code Review plugin for Redmine
# Copyright (C) 2009-2010  Haruyuki Iida
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

module CodeReviewAutoAssignSettings
  class AutoAssignSettings
    def initialize(yml_string = nil)
      yml_string = {:enabled => false}.to_yaml unless yml_string
      load_yml(yml_string)
    end
      
    def self.load(yml_string)
      AutoAssignSettings.new(yml_string)
    end

    def enabled=(flag)
      @yml[:enabled] = flag
    end

    def enabled?
      return false unless @yml
      @yml[:enabled] == true or @yml[:enabled] == 'true'
    end

    def author_id=(id)
      @yml[:author_id] = id
    end

    def author_id
      @yml[:author_id].to_i unless @yml[:author_id].blank?
    end

    def to_s
      return YAML.dump(@yml) if @yml
      nil
    end
    private
    def load_yml(yml_string)
      @yml = YAML.load(yml_string)
    end
      
  end
end
