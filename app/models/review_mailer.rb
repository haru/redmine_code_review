# Code Review plugin for Redmine
# Copyright (C) 2009  Haruyuki Iida
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

class ReviewMailer < Mailer

  def review_add(project, review)
    redmine_headers 'Project' => review.project.identifier,
                    'Review-Id' => review.id,
                    'Review-Author' => review.user.login
    
    mail_addresses = [ review.user.mail ]
    mail_addresses << review.change.changeset.user.mail if review.change.changeset.user
    
    recipients mail_addresses.compact.uniq

    subject "[#{review.project.name} - #{l(:label_review_new)} - #{l(:label_review)}##{review.id}] "
    body :review => review,
         :review_url => url_for(:controller => 'code_review', :action => 'show', :id => project, :review_id => review.id)
  end
  
  def review_reply(project, review)
    redmine_headers 'Project' => review.project.identifier,
      'Review-Id' => review.id,
      'Review-Author' => review.user.login

    mail_addresses = []
    review.root.users.each{|u|
      mail_addresses << u.mail
    }
    mail_addresses << review.change.changeset.user.mail if review.change.changeset.user

    recipients mail_addresses.compact.uniq

    subject "[#{review.project.name} - Updated - #{l(:label_review)}##{review.root.id}] "
    body :review => review,
      :review_url => url_for(:controller => 'code_review', :action => 'show', :id => project, :review_id => review.root.id)

  end

  def review_status_changed(project, review)
    redmine_headers 'Project' => review.project.identifier,
      'Review-Id' => review.id,
      'Review-Author' => review.user.login

    mail_addresses = []
    review.root.users.each{|u|
      mail_addresses << u.mail
    }
    mail_addresses << review.change.changeset.user.mail if review.change.changeset.user

    recipients mail_addresses.compact.uniq

    new_status = l(:label_review_open) if review.status_changed_to == CodeReview::STATUS_OPEN
    new_status = l(:label_review_closed) if review.status_changed_to == CodeReview::STATUS_CLOSED

    subject "[#{review.project.name} - Updated - #{l(:label_review)}##{review.root.id}] Status changed to #{new_status}."
    body :review => review,
      :review_url => url_for(:controller => 'code_review', :action => 'show', :id => project, :review_id => review.root.id)


  end
  
end
