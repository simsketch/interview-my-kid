fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## iOS

### ios bootstrap

```sh
[bundle exec] fastlane ios bootstrap
```

Create the App Store Connect app via API (bundle ID must already exist in dev portal)

### ios beta

```sh
[bundle exec] fastlane ios beta
```

Build and upload a build to TestFlight (no App Store review submission)

### ios metadata

```sh
[bundle exec] fastlane ios metadata
```

Push App Store metadata + screenshots to ASC without building (precheck)

### ios release

```sh
[bundle exec] fastlane ios release
```

Build, upload, and submit a build for App Store review

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
