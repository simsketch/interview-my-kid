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

### ios add_tester

```sh
[bundle exec] fastlane ios add_tester
```

Add an external tester to a TestFlight group (creates group if missing)

### ios beta

```sh
[bundle exec] fastlane ios beta
```

Build and upload a build to TestFlight (no App Store review submission)

### ios screenshots

```sh
[bundle exec] fastlane ios screenshots
```

Push only screenshots to ASC (skips metadata, avoids review-info fetch bug for new apps)

### ios metadata

```sh
[bundle exec] fastlane ios metadata
```

Push App Store metadata text + screenshots to ASC (requires existing review submission)

### ios release

```sh
[bundle exec] fastlane ios release
```

Build and upload the IPA to TestFlight, then push metadata + screenshots, then submit

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
