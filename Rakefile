#プラグイン名は適宜変えてください。
@plugin_name = 'code_review'

begin
  require 'jeweler'
  description = 'TODO'
  author = 'TODO'
  url = 'TODO'

  redmine_init_content = File.read('init.rb')
  if redmine_init_content.match(/description (.*$)/)
    description = $1.gsub("'",'').gsub('"','')
  end

  if redmine_init_content.match(/author (.*$)/)
    author = $1.gsub("'",'').gsub('"','')
  end

  if redmine_init_content.match(/[^ \t]*url ['"](.*)['"]/)
    url = $1
  end

  if redmine_init_content.match(/[^ \t]*url ['"](.*)['"]/)
    url = $1
  end

  Jeweler::Tasks.new do |s|
    s.name = "#{@plugin_name}"
    s.summary = "#{description}"
    s.homepage = "#{url}"
    s.description = "#{description}"
    s.authors = ["#{author}"]
    s.rubyforge_project = "#{@plugin_name}" # TODO
    s.files =  FileList[
      "[A-Z]*",
      "init.rb",
      "rails/init.rb",
      "{bin,generators,lib,test,app,assets,config,lang}/**/*",
      'lib/jeweler/templates/.gitignore'
    ]
  end
  Jeweler::GemcutterTasks.new
  Jeweler::RubyforgeTasks.new do |rubyforge|
    rubyforge.doc_task = "rdoc"
  end

rescue LoadError
  puts "Jeweler, or one of its dependencies, is not available. Install it with: sudo gem install technicalpickles-jeweler -s http://gems.github.com"
end

task "create-version" do
  # VERSION
  File.open('VERSION','w') do |version_file|
    redmine_init_content = File.read('init.rb')
    if redmine_init_content.match(/^[ \t]*version (.*$)/)
      version = $1.gsub("'",'').gsub('"','')
      version_file.puts version
    end
  end
end

task "create_init_rb_for_gem" do
  Dir.mkdir("rails") unless File.exist?("rails")
  FileUtils.cp "init.rb", "rails/init.rb"
end

task "build-gem" => ["create-version", "create_init_rb_for_gem", "gemspec:generate", "gemspec:validate", "build"] do

end

task "rcov" do
  here = File.dirname(__FILE__)
  railshome = File.join(here, '../../..')
  system("rcov", "-I", File.join(railshome, 'lib'), 'test/*/*test.rb', '-x', 'redmine')
  $?
end