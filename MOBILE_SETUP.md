## Mobile Setup

This project already uses Capacitor for the native mobile shell.

### What this setup does

- Keeps the current low-risk runtime strategy: the native app loads `https://gotohomebase.com` in the WebView.
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

### Notes

- `BASE_PATH=/` is used for mobile builds so Capacitor assets resolve correctly.
- `VITE_API_BASE_URL=https://gotohomebase.com` is set for the mobile web build.
- Because much of the app still uses direct `fetch('/api/...')` calls, the native shell intentionally stays pointed at the live website instead of switching fully to offline-bundled local API mode.
- The iOS project uses Swift Package Manager for Capacitor dependencies, so CocoaPods is not required for the current plugin set.
