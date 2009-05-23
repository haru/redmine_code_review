class CodeReviewUserSetting < ActiveRecord::Base
  belongs_to :user

  validates_presence_of :user_id
  validates_presence_of :mail_notification
  validates_uniqueness_of :user_id

  NOTIFCIATION_NONE = 0
  NOTIFICATION_INVOLVED_IN = 1
  NOTIFICATION_ALL = 2
end
