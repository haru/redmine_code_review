RedmineApp::Application.routes.draw do
  #map.connect 'projects/:id/code_review/:action', :controller => 'code_review'
  match 'projects/:id/code_review/:action', :controller => 'code_review', :via => [:get, :post]
  match 'projects/:id/code_review_settings/:action', :controller => 'code_review_settings', :via => [:get, :post, :put, :patch]

  get 'projects/:id/repository/revisions/:rev/:action(/*path)',
     :controller => 'repositories',
     :format => false,
     :constraints => {
           :action => /(browse|show|entry|raw|annotate|diff)/,
           :rev    => /[a-z0-9\.\-_]+/
         }
end
