# Code Review plugin for Redmine
# Copyright (C) 2009-2010  Haruyuki Iida
#rev
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

require 'redmine/utils'

class CodeReviewApplicationHooks < Redmine::Hook::ViewListener
  render_on :view_layouts_base_html_head, :partial => 'code_review/html_header'
  render_on :view_layouts_base_body_bottom, :partial => 'code_review/body_bottom'
end
