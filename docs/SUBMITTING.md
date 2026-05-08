# Submitting Interview My Kid to the App Store

End-to-end guide. Most steps are one-time; once set up, future releases are `bundle exec fastlane release` from the project root.

## 0. Prerequisites

- Active Apple Developer Program membership (`developer.apple.com`).
- Xcode installed with your Apple ID signed in (Xcode → Settings → Accounts → "Download Manual Profiles" once).
- Ruby + Bundler available (`brew install ruby` if missing). The project pins to Ruby 3.2 in `Gemfile`.

## 1. Register the Bundle ID

One-time step in the developer portal.

1. Go to https://developer.apple.com/account/resources/identifiers/list
2. Tap the **+** button → **App IDs** → **App**.
3. Bundle ID: `com.simsketch.interviewmykid` (must match `app.json`).
4. Capabilities: leave defaults. We don't need Push, iCloud, or anything else.
5. Save.

## 2. Create the app in App Store Connect

1. Go to https://appstoreconnect.apple.com/apps
2. **My Apps** → **+** → **New App**.
3. Platform: iOS. Name: **Interview My Kid**. Primary language: English (U.S.). Bundle ID: select `com.simsketch.interviewmykid`. SKU: `interview-my-kid` (any unique string).
4. Save. The app is now created in "Prepare for Submission" state.

## 3. Generate an App Store Connect API key

This lets fastlane log in without 2FA prompts.

1. Go to https://appstoreconnect.apple.com/access/integrations/api
2. Click **Generate API Key** (or **+** in the Team Keys tab).
3. Name: `Fastlane`. Access: **App Manager** (sufficient for build upload + metadata; use Admin if you also want to manage users).
4. **Download the .p8 file immediately**. You only get one chance — Apple won't let you re-download.
5. Note the **Key ID** (10 chars, like `ABCDE12345`) and **Issuer ID** (UUID).
6. Move the `.p8` file somewhere safe, e.g. `~/.appstoreconnect/keys/AuthKey_ABCDE12345.p8`.

## 4. Configure local env

```bash
cd /Users/simsketch/repos/interview-my-kid
cp fastlane/.env.template fastlane/.env
# Edit fastlane/.env with:
#   FASTLANE_APPLE_ID=your-apple-id@example.com
#   FASTLANE_TEAM_ID=your-10-char-team-id   (developer.apple.com → Membership)
#   ASC_API_KEY_FILEPATH=~/.appstoreconnect/keys/AuthKey_<KEY_ID>.p8
#   ASC_API_KEY_ID=<10-char Key ID>
#   ASC_ISSUER_ID=<UUID Issuer ID>
```

`fastlane/.env` is gitignored.

## 5. Install Ruby gems

```bash
cd /Users/simsketch/repos/interview-my-kid
bundle install     # installs fastlane (pinned in Gemfile)
```

## 6. Provisioning profiles

For first release, the easiest path is **automatic signing** in Xcode:

```bash
npx expo prebuild --platform ios   # regenerates ios/ from app.json
open ios/InterviewMyKid.xcworkspace
```

In Xcode: select the `InterviewMyKid` target → **Signing & Capabilities** → check "Automatically manage signing" → pick your team. Xcode will create the App Store distribution cert + profile on first archive.

> If you'd rather use **fastlane match** for shared cert/profile management, that's a more advanced setup; ping me to wire it up.

## 7. Take screenshots

Apple requires screenshots for at least one device size:

- 6.7" iPhone (iPhone 14 Pro Max / 15 Pro Max / 16 Pro Max): **1290 × 2796**
- 6.5" iPhone (iPhone 11 Pro Max / XS Max): **1242 × 2688**

You need 2–10 screenshots per size. Easiest path:

1. Run `npx expo run:ios --device` to install a build.
2. On your iPhone, capture screenshots of each main screen (Sessions, How to, Settings, New Interview Setup, Edit Cards, Recording, Session Detail).
3. AirDrop them to your Mac.
4. Drop them into `fastlane/screenshots/en-US/`. Fastlane will pick the right one based on dimensions.

Filename ordering controls App Store ordering — prefix with `01_`, `02_`, etc.

## 8. Privacy nutrition label (one-time, in ASC web UI)

Apple requires you fill this out manually in App Store Connect:

App Privacy → Get Started:

- **Data collected:** No — Interview My Kid does not collect any data.
- For each "Did you collect data?" question, answer **No**.

If you ever change this, App Store Connect prompts you to update.

## 9. Age rating (one-time, in ASC web UI)

App Information → Age Rating → Edit. Select all "None" — the app contains no ads, no objectionable content, and the camera/microphone are user-driven.

The app uses the camera and microphone for user-initiated recording; that's not "user-generated content" in App Review terms (no shared platform). Result: 4+.

## 10. Test the lanes

```bash
# First, ship a TestFlight build (no review submission)
bundle exec fastlane beta
```

Watch:

- `expo prebuild` runs
- `pod install` runs
- Build number bumps to (latest TestFlight + 1)
- Xcode archive runs
- IPA uploads to TestFlight
- Wait for "build processing complete" (~5–10 min)

You'll see the build appear in App Store Connect → TestFlight. Install the TestFlight version on your phone first to verify everything works in the production-signed build (different from the dev build you've been using).

## 11. Push metadata + screenshots without rebuilding

```bash
bundle exec fastlane metadata
```

This uploads everything in `fastlane/metadata/en-US/` and the screenshots — fast, no recompile.

## 12. Submit for App Store review

```bash
bundle exec fastlane release
```

This:

- Runs prebuild + pod install
- Bumps build number
- Builds the IPA
- Uploads to App Store Connect
- Pushes metadata + screenshots
- Submits the build for review

Apple typically responds within 24–48h. Watch your email and ASC.

### App Review notes

In App Store Connect → App Information → App Review Information, add a note:

> Interview My Kid uses on-device storage exclusively. The "Cloud" AI generation option requires the user to provide their own OpenRouter API key (Settings → AI Provider → OpenRouter). To test, leave the AI Provider as "Auto" — it will fall back to the built-in question bank if no key is provided. To test the on-device path, ensure the test device runs iOS 26 with Apple Intelligence enabled.

That heads off the most likely reviewer questions.

## After review approval

- The build state changes to **Pending Developer Release** (because `automatic_release: false` in the Fastfile).
- Open ASC and click **Release this Version** to ship publicly.
- Or rerun the release lane with `automatic_release: true` for next time.

## Future releases

Once everything is set up, releasing a new version is:

```bash
# 1. Bump the version in app.json (e.g. "1.0.0" → "1.1.0")
# 2. Update fastlane/metadata/en-US/release_notes.txt
# 3. Run:
bundle exec fastlane release
```

That's it.

## Common issues

**"No team selected" during build** — make sure `FASTLANE_TEAM_ID` is set in `fastlane/.env` and Xcode is signed in to your Apple ID.

**"App Store Connect API key not authorized"** — the key role might be too low. Regenerate with **App Manager** or higher.

**"This bundle is invalid. The Info.plist must contain..."** — usually a permission usage description is missing. Re-run `npx expo prebuild` to regenerate from `app.json`.

**Build processing stuck on TestFlight** — sometimes takes 30+ min. If still stuck, check the email Apple sent — they may have flagged something (e.g., missing privacy manifest entries).
