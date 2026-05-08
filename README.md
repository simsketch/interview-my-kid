# Interview My Kid

> Better questions for your kid.

A private iOS app for recording short video interviews with your child using AI-generated cue cards. Pick a topic (pre-game, post-game, a specific moment, or season-level reflection), let on-device Apple Intelligence (or OpenRouter, or a curated bank) generate the questions, edit them, then record. The cue cards live on YOUR screen as a teleprompter — read each one aloud while the camera captures the kid's answer.

100% local: videos and prompts never leave your device unless you explicitly export to Photos.

![Interview My Kid icon](./assets/icon.png)

## Features

- AI-generated cue cards: **on-device** (Apple Intelligence, iOS 26+), **cloud** (OpenRouter), or **built-in** question bank.
- Teleprompter overlay with configurable position (top / middle / bottom).
- Optional **burn-in**: bake the questions into the exported video for sharing.
- 6 color themes including 2 light modes.
- SQLite-backed session library with replay + Photos export.
- All native: Expo Dev Client, no Expo Go.

## Stack

- Expo SDK 54, expo-router, TypeScript, React 19, RN 0.81 (new architecture)
- expo-camera, expo-sqlite, expo-secure-store, expo-video, expo-media-library
- Local Expo native modules:
  - `modules/foundation-models/` — wraps Apple's `FoundationModels` framework
  - `modules/video-overlay/` — AVFoundation Core Animation video text burn-in
- OpenRouter (cloud) for question generation when on-device is unavailable

## Local development

```bash
npm install
npx expo run:ios --device   # build, install, launch on a connected iPhone
```

Once installed, open Settings → Theme to pick a palette, then add your OpenRouter API key (or leave blank to use on-device + built-in).

## Project layout

```
app/                       expo-router routes
  _layout.tsx              root layout (ThemeProvider + SQLiteProvider)
  (tabs)/
    _layout.tsx            bottom tab bar
    index.tsx              sessions list (home)
    help.tsx               how-to + provider explanation
    settings.tsx           AI provider, theme, overlay, key, kid's name
  new/setup.tsx            category + context + Generate
  new/edit.tsx             cue-card editor
  new/record.tsx           camera + teleprompter
  session/[id].tsx         playback + re-burn + export + delete

src/
  ai/                      orchestrator + provider modules + prompt builder + fallback bank
  categories.ts            4 baseball-aware category definitions
  components/              Button, Screen
  db/                      SQLite schema + sessions CRUD
  state/draft.ts           in-memory draft for the new-interview flow
  storage/                 file paths + Keychain
  theme.tsx                ThemeProvider + 6 palettes + useColors / useThemedStyles

modules/
  foundation-models/       Swift wrapper around Apple Foundation Models (iOS 26+)
  video-overlay/           Swift AVFoundation video text burn-in module

fastlane/                  TestFlight + App Store ship lanes
docs/                      Privacy, Support, and submission guide
```

## Shipping to the App Store

See [`docs/SUBMITTING.md`](docs/SUBMITTING.md) for the full guide.

Quick version once everything is set up:

```bash
bundle exec fastlane beta      # ship to TestFlight
bundle exec fastlane release   # build, upload, submit for review
bundle exec fastlane metadata  # push metadata + screenshots only (no rebuild)
```

## Privacy

[`docs/PRIVACY.md`](docs/PRIVACY.md) — short version: nothing leaves the device except OpenRouter calls (which only happen if you set a key and choose Cloud).

## License

Personal project. No license granted for redistribution.
