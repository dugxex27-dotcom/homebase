## Mobile Setup

This project already uses Capacitor for the native mobile shell.

### What this setup does

- Loads the live production site, `https://gotohomebase.com`, in both the Android and iOS WebViews.
- Uses `gotohomebase.com` for both the UI and API at runtime.
- Rebuilds the web bundle before each native sync so Capacitor assets and splash/icon resources stay current.
- Gives you one-command Android and iOS sync/open workflows from the repo root.

### Commands

```bash
npm run mobile:doctor
npm run mobile:sync
npm run mobile:sync:android
npm run mobile:sync:ios
npm run mobile:open:android
npm run mobile:open:ios
```

### Requirements

- Node.js 24+
- Java 21 for Android CLI builds
- Android Studio for Android builds
- Xcode 16+ for iOS builds

On macOS, if `./gradlew` says Java is missing, point `JAVA_HOME` at Android Studio's bundled JDK:

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export PATH="$JAVA_HOME/bin:$PATH"
```

### Recommended flow

1. Run `npm install` or `npx pnpm install` after pulling changes.
2. Run `npm run mobile:sync`.
3. Open the platform project with `npm run mobile:open:android` or `npm run mobile:open:ios`.
4. Build/sign from Android Studio or Xcode.

For the repository's direct pnpm Android build and sync command, run:

```bash
pnpm run build:mobile:android
```

### Store release required for this configuration change

One new Android and iOS store release is required to ship the native `server.url` configuration to devices that already have the app installed. After users install that release, normal Replit publishes update the UI shown inside the app without requiring another store binary.

Future native releases are still required for changes to Capacitor plugins, native permissions, icons, splash resources, or other Android/iOS code and configuration.

### Notes

- `BASE_PATH=/` is used for mobile builds so Capacitor assets resolve correctly.
- `VITE_API_BASE_URL=https://gotohomebase.com` is set for the mobile web build.
- `webDir` remains configured because Capacitor sync and native splash/asset workflows still require a web output directory.
- Offline or bundled UI is no longer the Android or iOS runtime mode. The app requires network access to load the production UI.
- Because the WebView origin is `https://gotohomebase.com`, direct relative `fetch('/api/...')` calls use the same production origin.
- The iOS project uses Swift Package Manager for Capacitor dependencies, so CocoaPods is not required for the current plugin set.
