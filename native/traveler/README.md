# Ouiboo — Native traveller shell (Capacitor)

Issue #782. A lean [Capacitor](https://capacitorjs.com) wrapper around the
already-deployed traveller web app. The shell ships **no web code of its
own**: at runtime it loads the traveller origin below, and `www/` is only a
small offline fallback page.

| Setting | Value |
| --- | --- |
| App name | Ouiboo |
| App ID / bundle ID | `ma.ouiboo.traveler` |
| Loads (this build) | `https://ouiboo-traveler-staging.vercel.app` — **staging only** |
| Capacitor | 7.x (Node ≥ 20, matching the repo CI) |
| Platforms in repo | `android/` and `ios/` project scaffolding, generated with `npx cap add` |

This folder is deliberately **outside** the root npm workspaces
(`apps/*`, `packages/*`), so it never enters the web apps' build, lint or
test graph, and Vercel never deploys it. It has its own `package.json` and
lockfile.

## What is proven, and what is not

Proven on Linux (this repo's CI, `.github/workflows/native-traveler.yml`):

- `npm ci`, then `npx cap sync android` completes.
- `npm test` / `node scripts/validate-shell.mjs` — config is valid, the
  appId agrees across the Capacitor config, the Gradle project, the
  Android manifest package and the iOS bundle identifier, the Gradle
  files are structurally sane, and the brand icons are real PNGs at the
  sizes the projects claim.

**Not** proven here, and never claimed:

- No Gradle build was run — that needs the Android SDK (not installed in
  CI). The Android project is *generated + config-verified*, not
  build-verified.
- The iOS project was *generated* on Linux. It cannot be built, signed
  or run without a Mac with Xcode and CocoaPods.
- No device/emulator run, no store submission.

## Icons and splash

`resources/icon-512.png` and `resources/icon-192.png` are the final logo
package's app icons (V1 symbol + destination tittle family, founder
decision 2026-11-04). They were resized into the Android launcher
mipmaps and the iOS AppIcon set, and the splash screens are the brand
navy `#0A192F` with the symbol centred.

One honest gap: the iOS 1024×1024 AppIcon was upscaled from the 512
master. Before a store submission, regenerate it from the logo SVG
master so the store icon is not an upscale.

## Build, sign and submit — founder, on your own machine

Everything below is founder-hands: it needs your paid developer
accounts, your signing keys and your store listings.

### One-time setup

1. Install [Node 20+](https://nodejs.org). For Android: install
   [Android Studio](https://developer.android.com/studio) (it brings the
   Android SDK). For iOS: use a Mac with Xcode and CocoaPods
   (`sudo gem install cocoapods`).
2. In this folder: `npm ci`
3. `npx cap sync` — copies the fallback page and regenerates the
   platform config inside `android/` and `ios/`.

### Android (Google Play)

1. `npx cap open android` — opens the project in Android Studio.
2. In Android Studio: **Build → Generate Signed App Bundle / APK**.
   Create your upload keystore when prompted and keep it somewhere
   private and backed up — **never commit a keystore, password or
   `key.properties` to this repo.** Losing the upload key makes store
   updates painful.
3. Build an **Android App Bundle (.aab)** for release.
4. In your Google Play Console account: create the app
   (`ma.ouiboo.traveler`), complete the listing (text, screenshots,
   privacy policy URL, data-safety form), upload the .aab to a test
   track first, then promote to production when you are ready.

### iOS (App Store)

1. On the Mac: `npx cap open ios` — opens the workspace in Xcode
   (run `pod install` inside `ios/App` first if Xcode asks).
2. In Xcode, select the **App** target → Signing & Capabilities, sign in
   with your Apple Developer account and let Xcode manage signing, or
   select your own team/certificate and provisioning profile. Signing
   material lives in your Apple account and keychain — never in this
   repo.
3. **Product → Archive**, then in the Organizer window **Distribute
   App → App Store Connect → Upload**.
4. In App Store Connect: complete the listing (text, screenshots,
   privacy details), attach the uploaded build, and submit for review.

### Before any production store build

- Change `server.url` in `capacitor.config.ts` from the staging origin
  to the production traveller origin, then `npx cap sync`. A store
  build must never point at staging.
- Regenerate the iOS 1024 AppIcon from the SVG master (see above).
- Bump `version` in `package.json`, `versionName`/`versionCode` in
  `android/app/build.gradle`, and the marketing version/build in Xcode.

## Checks

```sh
npm test                          # node --test shell.test.mjs
node scripts/validate-shell.mjs   # the same validation, standalone
```
