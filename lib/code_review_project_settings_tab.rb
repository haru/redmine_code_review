# frozen_string_literal: true

module CodeReviewProjectSettingsTab

  def project_settings_tabs
    super.tap do |tabs|
      if User.current.allowed_to?(
           {controller: 'code_review_settings', action: :show},
           @project
         )

        tabs << {
          name: 'code_review',
          controller: 'code_review_settings',
          action: :show,
          partial: 'code_review_settings/show',
          label: :code_review
        }
      end
    end
  end

end
