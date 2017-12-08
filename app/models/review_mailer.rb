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

    recipients get_mail_addresses(review)

    subject "[#{review.project.name} - #{l(:label_review_new)} - #{l(:label_review)}##{review.id}] "
    review_url = url_for(:controller => 'code_review', :action => 'show', :id => project, :review_id => review.id)

    body :review => review, :review_url => review_url

    return if (l(:this_is_checking_for_before_rails_2_2_2) == 'this_is_checking_for_before_rails_2_2_2')
    # 何故かrails 2.2 以後は以下の処理が必要

    content_type "multipart/alternative"

    part "text/plain" do |p|
      p.body = render_message("review_add.text.plain.erb", :body => body, :review => review, :review_url => review_url)
    end

    part "text/html" do |p|
      p.body = render_message("review_add.text.html.erb", :body => body, :review => review, :review_url => review_url)
    end
  end

  def review_reply(project, review)
    redmine_headers 'Project' => review.project.identifier,
      'Review-Id' => review.id,
      'Review-Author' => review.user.login

    recipients recipients get_mail_addresses(review)

    subject "[#{review.project.name} - Updated - #{l(:label_review)}##{review.root.id}] "
    review_url = url_for(:controller => 'code_review', :action => 'show', :id => project, :review_id => review.root.id)
    body :review => review, :review_url => review_url

    return if (l(:this_is_checking_for_before_rails_2_2_2) == 'this_is_checking_for_before_rails_2_2_2')
    # 何故かrails 2.2 以後は以下の処理が必要

    content_type "multipart/alternative"

    part "text/plain" do |p|
      p.body = render_message("review_reply.text.plain.erb", :body => body, :review => review, :review_url => review_url)
    end

    part "text/html" do |p|
      p.body = render_message("review_reply.text.html.erb", :body => body, :review => review, :review_url => review_url)
    end
  end

  def review_status_changed(project, review)
    redmine_headers 'Project' => review.project.identifier,
      'Review-Id' => review.id,
      'Review-Author' => review.user.login

    recipients recipients get_mail_addresses(review)

    new_status = l(:label_review_open) if review.status_changed_to == CodeReview::STATUS_OPEN
    new_status = l(:label_review_closed) if review.status_changed_to == CodeReview::STATUS_CLOSED

    subject "[#{review.project.name} - Updated - #{l(:label_review)}##{review.root.id}] Status changed to #{new_status}."
    review_url = url_for(:controller => 'code_review', :action => 'show', :id => project, :review_id => review.root.id)

    body :review => review, :review_url => review_url

    return if (l(:this_is_checking_for_before_rails_2_2_2) == 'this_is_checking_for_before_rails_2_2_2')
    # 何故かrails 2.2 以後は以下の処理が必要

    content_type "multipart/alternative"

    part "text/plain" do |p|
      p.body = render_message("review_status_changed.text.plain.erb", :body => body, :review => review, :review_url => review_url)
    end

    part "text/html" do |p|
      p.body = render_message("review_status_changed.text.html.erb", :body => body, :review => review, :review_url => review_url)
    end
  end

  def get_mail_addresses(review)
    mail_addresses = []
    review.root.users_for_notification.each { |u|
      mail_addresses << u.mail
    }
    committer = review.change.changeset.user
    if committer
      setting = CodeReviewUserSetting.find_or_create(committer.id)
      mail_addresses << committer.mail if setting and !setting.mail_notification_none?
    end

    review.project.members.each { |member|
      user = member.user
      setting = CodeReviewUserSetting.find_or_create(user.id)
      next unless setting
      mail_addresses << user.mail if setting.mail_notification_all?
    }
    mail_addresses.compact.uniq
  end
end
