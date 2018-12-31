# Code Review plugin for Redmine
# Copyright (C) 2009-2012  Haruyuki Iida
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
      yml_string = {:enabled => false}.to_yaml if yml_string.blank?
      load_yml(yml_string)
    end

    def self.load(yml_string)
      AutoAssignSettings.new(yml_string)
    end

    def enabled=(flag)
      yml[:enabled] = flag
    end

    def enabled?
      return false unless yml
      yml[:enabled] == true or yml[:enabled] == 'true'
    end

    def author_id=(id)
      yml[:author_id] = id
    end

    def author_id
      yml[:author_id].to_i unless yml[:author_id].blank?
    end

    def assignable_list=(list)
      yml[:assignable_list] = list
    end

    def assignable_list
      return nil unless yml[:assignable_list]
      yml[:assignable_list].collect { |id| id.to_i }
    end

    def assignable?(user)
      return false unless assignable_list
      assignable_list.index(user.id) != nil
    end

    def select_assign_to(project, commiter = nil)
      commiter_id = commiter.id if commiter
      select_assign_to_with_list(project, assignable_list, commiter_id)
    end

    def description=(desc)
      yml[:description] = desc
    end

    def description
      Redmine::CodesetUtil.to_utf8_by_setting(yml[:description])
    end

    def subject=(sbj)
      yml[:subject] = sbj
    end

    def subject
      Redmine::CodesetUtil.to_utf8_by_setting(yml[:subject])
    end

    def filter_enabled=(flag)
      yml[:filter_enabled] = flag
    end

    def filter_enabled?
      yml[:filter_enabled] == true or yml[:filter_enabled] == 'true'
    end

    def to_s
      return YAML.dump(yml)
      nil
    end

    def filters=(list)
      unless list
        return yml[:filters] = nil
      end
      yml[:filters] = list.collect do |filter|
        filter.attributes
      end
    end

    def filters
      return [] unless yml[:filters]
      list = yml[:filters].collect do |hash|
        filter = AssignmentFilter.new
        filter.attributes = (hash)
        filter
      end
      list.sort { |a, b| a.order <=> b.order }
    end

    def add_filter(filter)
      yml[:filters] ||= []
      yml[:filters] << filter.attributes
    end

    def accept_for_default=(flag)
      yml[:accept_for_default] = flag
    end

    def accept_for_default
      yml[:accept_for_default] == true or yml[:accept_for_default] == 'true'
    end

    def match_with_changeset?(changeset)
      return true unless filter_enabled?
      changeset.filechanges.each { |change|
        return if match_with_change?(change)
      }
      return false
    end

    def match_with_change?(change)
      filters.each { |filter|
        next unless filter.match?(change.path)
        return filter.accept?
      }
      return accept_for_default
    end

    def attributes
      yml
    end

    private

    def yml
      unless @yml
        yml_string = {:enabled => false}.to_yaml
        load_yml(yml_string)
      end
      @yml
    end

    def load_yml(yml_string)
      @yml = YAML.load(yml_string)
    end

    def select_assign_to_with_list(project, list, commiter_id = nil)
      return nil unless list
      return nil if list.empty?
      list.collect! { |item| item.to_i }
      list.delete(commiter_id)
      return nil if list.empty?
      assign_to = list.at(rand(list.size))
      project.users.each do |user|
        return assign_to if assign_to.to_i == user.id
      end
      list.delete(assign_to)
      select_assign_to_with_list(project, list)
    end
  end

  class AssignmentFilter
    attr_accessor :accept
    attr_accessor :expression

    def order
      return 0 unless @order
      @order.to_i
    end

    def order=(num)
      @order = num
    end

    def accept?
      @accept == true or @accept == 'true'
    end

    def attributes=(attrs)
      attrs ||= {}
      @accept = attrs[:accept]
      @expression = attrs[:expression]
      @order = attrs[:order].to_i unless attrs[:order].blank?
    end

    def attributes
      attrs = Hash.new
      attrs[:accept] = accept?
      attrs[:expression] = @expression
      attrs[:order] = @order
      attrs
    end

    def match?(path)
      return false unless @expression
      return false unless path
      reqexp = Regexp.compile(@expression)
      reqexp.match(path) != nil
    end
  end
end
