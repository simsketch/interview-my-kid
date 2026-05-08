# Privacy Policy

**Effective date:** 2026-05-08

Interview My Kid ("the app") is built to be private by default. This policy describes what the app does and does not collect.

## What we don't do

The app does not collect, store on a server, or share:

- Your videos or audio recordings
- The questions you generate or the prompts you use
- Your name, your child's name, your contact information, your location, or any analytics identifiers
- Crash reports or telemetry (the app sends no analytics events)

There is no account system. There is no server we control.

## What stays on your device

All app data is stored locally on your iPhone:

- Recorded videos are saved inside the app's private Documents directory.
- Sessions metadata (category, prompts used, timestamps, optional context note you typed, optional kid's name) is stored in a local SQLite database.
- Your OpenRouter API key (if you provide one) is stored in the iOS Keychain and never leaves your device except to be sent to OpenRouter.
- Your theme preference and settings are stored in the Keychain or SQLite.

When you delete a session in the app, both the video file and the metadata are permanently removed from your device. When you delete the app, iOS removes all of this data.

## Network traffic

The only outbound network traffic is to **OpenRouter** at `openrouter.ai`, and only when:

- You have explicitly added an OpenRouter API key in Settings, AND
- You have selected "Cloud" or "Auto" as the AI Provider, AND
- You tap **Generate Questions** or **Regenerate**

The request includes:

- Your API key (in the `Authorization` header)
- The category you selected
- The optional context blurb you typed
- Your child's first name if you set one in Settings (used only to make the questions feel personal)

OpenRouter's privacy policy applies to that request: https://openrouter.ai/docs/privacy

If you select "On-device" as the provider, generation runs entirely on your iPhone via Apple's Foundation Models framework — no network traffic. If you select "Built-in" or AI is unavailable, the app uses a curated question bank shipped with the app — no network traffic.

## Camera, microphone, and Photos

- The app requests **camera** and **microphone** access only when you tap Record.
- The app requests **Photo Library** add access only when you tap Export to Photos.

These are processed entirely on your device. The app cannot see your existing photos or videos — it only creates new ones.

## Children

This app is designed for parents to record interviews with their own children. The app collects no information about the child apart from the optional first name and the recordings themselves, which are stored locally and never transmitted.

## Changes to this policy

If this policy ever changes, the new version will appear at this URL.

## Contact

Questions: open an issue at https://github.com/simsketch/interview-my-kid/issues
