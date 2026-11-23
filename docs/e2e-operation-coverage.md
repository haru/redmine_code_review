# E2E operation coverage

Which user-facing operations of the plugin the Playwright suite (`test/e2e`) exercises.
The 39 rows are fixed: 17 `server` rows map one-to-one to the actions registered in
`init.rb` (`project_module :code_review`), 22 `ui` rows are operations that are completed
on the screen or that are linked displays without a server action of their own.

Baseline (before the coverage expansion): 6 / 38 (16%)
Current: 39 / 39 (100%) (known failures: 0)

Status: `verified` (a passing scenario), `known failure` (a `test.fail` scenario that
references a GitHub Issue), `not verified`. Coverage = (verified + known failure) / 39.

| # | Kind | Operation | Permission | Status | Scenarios | Issue / Note |
|---|------|-----------|------------|--------|-----------|--------------|
| 1 | server | `code_review#update_diff_view` | view_code_review | verified | review.spec.js › shows a created review again after reloading the diff | |
| 2 | server | `code_review#update_attachment_view` | view_code_review | verified | attachment.spec.js › offers the add-review control on the lines of an attached patch<br>attachment.spec.js › reviews a line of an attached patch and shows the review after reloading and on the index |  |
| 3 | server | `code_review#update_revisions_view` | view_code_review | verified | assignment.spec.js › marks the revision as assigned on the revision page and the revisions list |  |
| 4 | server | `code_review#index` | view_code_review | verified | index.spec.js › lists a registered review on the review index<br>permission.spec.js › an anonymous visitor is sent to the login page for a private project<br>permission.spec.js › a signed-in non-member is forbidden from a private project | Also fixed: jstoolbar.js was loaded twice on pages with a wiki toolbar (app/views/code_review/_html_header.html.erb) |
| 5 | server | `code_review#show` | view_code_review | verified | review.spec.js › opens an existing review from its icon<br>lifecycle.spec.js › answers 404 for the show action of a deleted review<br>navigation.spec.js › links the issue page of a review to its diff, where the review popup opens |  |
| 6 | server | `code_review#new` | add_code_review | verified | review.spec.js › keeps the dialog open with an error when the subject is empty | |
| 7 | server | `code_review#reply` | add_code_review | verified | lifecycle.spec.js › replies to a review and shows the reply after reloading<br>lifecycle.spec.js › does not add a history entry for an empty reply |  |
| 8 | server | `code_review#forward_to_revision` | add_code_review | verified | navigation.spec.js › moves from a file view without a revision to the revision that last changed it |  |
| 9 | server | `code_review#preview` | add_code_review | verified | lifecycle.spec.js › renders formatted text for a direct preview request |  |
| 10 | server | `code_review#update` | edit_code_review | verified | lifecycle.spec.js › edits the subject and comment of a review and keeps them after reloading<br>lifecycle.spec.js › shows a locking conflict to the second of two concurrent editors |  |
| 11 | server | `code_review#destroy` | delete_code_review | verified | lifecycle.spec.js › deletes a review after confirming and no longer shows it after reloading |  |
| 12 | server | `code_review#assign` | assign_code_review | verified | assignment.spec.js › opens a new issue form pre-filled with the revision from the revision page<br>assignment.spec.js › shows the reviewed revision on the issue page after saving an assignment |  |
| 13 | server | `code_review_settings#show` (settings tab visibility) | code_review_setting | verified | permission.spec.js › a view-only member cannot open the project settings that hold the code review tab<br>settings.spec.js › saves tracker settings and keeps them after reloading |  |
| 14 | server | `code_review_settings#update` | code_review_setting | verified | settings.spec.js › saves tracker settings and keeps them after reloading | Fixed: the hidden required author select blocked the form submit (_show.html.erb) |
| 15 | server | `code_review_settings#add_filter` | code_review_setting | verified | settings.spec.js › adds, edits and deletes filters and keeps the saved list after reloading |  |
| 16 | server | `code_review_settings#edit_filter` | code_review_setting | verified | settings.spec.js › adds, edits and deletes filters and keeps the saved list after reloading | Fixed: edit_filter and sort dropped filter_enabled (code_review_settings_controller.rb) |
| 17 | server | `code_review_settings#sort` | code_review_setting | verified | settings.spec.js › reorders filters and keeps the order after saving | Fixed: sort arrows always acted on the last row (_filters.html.erb) |
| 18 | ui | Open / close the add-review dialog | - | verified | review.spec.js › keeps the dialog open with an error when the subject is empty<br>dialog.spec.js › moves the add-review dialog by its title bar<br>dialog.spec.js › resizes the dialog from the southeast and northwest handles<br>dialog.spec.js › closes the dialog with Esc and with the close button, and opens it again<br>dialog.spec.js › shows several review popups and brings the clicked one to the front | The dialog is the plugin's own (no jQuery UI) |
| 19 | ui | Pop up an existing review from its icon | - | verified | review.spec.js › opens an existing review from its icon | |
| 20 | ui | Show / cancel the review edit form | - | verified | lifecycle.spec.js › edits the subject and comment of a review and keeps them after reloading | Cancel bug fixed in app/views/code_review/_show.html.erb (the Cancel button hid `#review_form_<id>` instead of `#update-form-<id>`) |
| 21 | ui | Show the reply form | - | verified | lifecycle.spec.js › replies to a review and shows the reply after reloading |  |
| 22 | ui | Cancel the delete confirmation | - | verified | lifecycle.spec.js › keeps the review when the delete confirmation is cancelled |  |
| 23 | ui | Preview formatted text (wiki toolbar) | - | verified | lifecycle.spec.js › previews formatted text from the wiki toolbar of the reply form |  |
| 24 | ui | Toggle "show closed reviews" on the index | - | verified | lifecycle.spec.js › closes a review and shows it on the index only when closed reviews are included |  |
| 25 | ui | Sort the index by a column | - | verified | navigation.spec.js › sorts the review index by subject and by id<br>navigation.spec.js › sorts the review index by path and by reviewer without a server error |  |
| 26 | ui | Switch tracker in the review dialog | - | verified | settings.spec.js › lets the reviewer pick the tracker in the review dialog when enabled |  |
| 27 | ui | Accept the parent-issue suggestion | - | verified | review.spec.js › fills in the suggested parent issue when the suggestion is accepted |  |
| 28 | ui | Toggle the auto-assign settings block | - | verified | settings.spec.js › shows the auto-assign settings and filter blocks only when activated |  |
| 29 | ui | Toggle the auto-assign filter block | - | verified | settings.spec.js › shows the auto-assign settings and filter blocks only when activated |  |
| 30 | ui | Delete a filter row (client side) | - | verified | settings.spec.js › adds, edits and deletes filters and keeps the saved list after reloading |  |
| 31 | ui | Show / cancel the filter edit row | - | verified | settings.spec.js › adds, edits and deletes filters and keeps the saved list after reloading |  |
| 32 | ui | Reject an invalid filter regex | - | verified | settings.spec.js › rejects an invalid filter regular expression with an alert |  |
| 33 | ui | Review-assignment block on the revision page | - | verified | assignment.spec.js › opens a new issue form pre-filled with the revision from the revision page<br>assignment.spec.js › marks the revision as assigned on the revision page and the revisions list |  |
| 34 | ui | Review status on the revisions list | - | verified | assignment.spec.js › marks the revision as assigned on the revision page and the revisions list |  |
| 35 | ui | Review / assignment rows on the issue page | - | verified | assignment.spec.js › shows the reviewed revision on the issue page after saving an assignment<br>navigation.spec.js › links the issue page of a review to its diff, where the review popup opens | Redmine 7 renders the hook output outside a table, so the plugin's tr markup is dropped (text and link still shown) |
| 36 | ui | `{{review(id)}}` macro | - | verified | navigation.spec.js › expands the review macro in an issue description into a link to the review |  |
| 37 | ui | Create an assignment when the pre-filled issue is saved (issue hook) | - | verified | assignment.spec.js › shows the reviewed revision on the issue page after saving an assignment |  |
| 38 | ui | Auto-assign a review on changeset import | - | verified | settings.spec.js › creates a review assignment when a matching commit is imported<br>settings.spec.js › creates no assignment when the commit is dropped by the filter<br>settings.spec.js › follows the default action (assign) when there are no filters<br>settings.spec.js › follows the default action (drop) when there are no filters |  |
| 39 | ui | Arrow keys in the review dialog fields (no previous/next file navigation) | - | verified | arrow-keys.spec.js › keeps the arrow keys in the review subject field on a repository file with siblings<br>arrow-keys.spec.js › keeps the arrow keys in the comment textarea of the add dialog on an attachment with siblings<br>arrow-keys.spec.js › keeps the arrow keys in the reply field of an existing review<br>arrow-keys.spec.js › keeps the arrow keys in the subject and comment fields of the edit form<br>arrow-keys.spec.js › still moves to the next attachment with the arrow key when no dialog is open<br>arrow-keys.spec.js › moves to the previous attachment again after the review dialog was closed |  |
