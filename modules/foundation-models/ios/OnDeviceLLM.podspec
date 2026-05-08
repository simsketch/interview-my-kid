Pod::Spec.new do |s|
  s.name           = 'OnDeviceLLM'
  s.version        = '1.0.0'
  s.summary        = 'Apple FoundationModels bridge for Expo'
  s.description    = 'Wraps the iOS 26 FoundationModels framework as a local Expo module.'
  s.author         = ''
  s.homepage       = 'https://example.com'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.weak_frameworks = ['FoundationModels']
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
  s.source_files = '**/*.{h,m,swift}'
end
