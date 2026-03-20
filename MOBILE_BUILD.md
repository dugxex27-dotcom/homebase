# HomeBase — Mobile App Build Guide

This guide covers everything needed to build and submit HomeBase to the **Apple App Store** and **Google Play Store**. The native apps are powered by [Capacitor](https://capacitorjs.com/), which wraps the existing web app in a native shell.

---

## How it Works

HomeBase uses the **live web server approach**: the native app loads `https://gotohomebase.com` inside a native WebView. This means:

- The app always has the latest features without requiring a store update
- Auth, sessions, and cookies work exactly as they do on the web
- Push notifications work via the existing service worker
- The `ios/` and `android/` native project directories handle native shell, icons, splash screens, and store metadata

**App ID:** `com.gotohomebase.app`  
**Production URL:** `https://gotohomebase.com`  

---

## Prerequisites

### Accounts

| Requirement | Details |
|-------------|---------|
| Apple Developer Account | $99/year — [developer.apple.com](https://developer.apple.com) |
| Google Play Developer Account | $25 one-time — [play.google.com/console](https://play.google.com/console) |

### Tools (local machine)

| Tool | Required For | Install |
|------|-------------|---------|
| **Xcode 15+** | iOS builds | Mac App Store (macOS only) |
| **CocoaPods** | iOS dependencies | `sudo gem install cocoapods` |
| **Android Studio** | Android builds | [developer.android.com/studio](https://developer.android.com/studio) |
| **Java 17+** | Android builds | Included with Android Studio |
| **Node.js 18+** | Build scripts | Already in this project |

---

## Update Workflow (After Code Changes)

Every time you push an update to production, the mobile app automatically picks it up (because it loads the live URL). No store update is needed for regular code changes.

If you change native configuration (icons, splash, permissions, `capacitor.config.ts`), you'll need to re-build and re-submit:

```bash
# 1. Build web assets
npm run build

# 2. Sync into native projects
npx cap sync

# 3. Re-build and submit (see platform-specific sections below)
```

---

## Icon & Splash Screen Update

Source images live in `resources/`:
- `resources/icon.png` — Source icon (512×512 minimum, **1024×1024 recommended** for App Store)
- `resources/splash.png` — Source splash screen (2732×2732 minimum)

To regenerate all native icon sizes and splash screens after updating source images:

```bash
npx @capacitor/assets generate
```

> **App Store Note:** Apple requires the App Store listing icon to be 1024×1024 PNG. For best quality, replace `resources/icon.png` with a 1024×1024 version before submitting.

---

## iOS — Apple App Store

### 1. Install CocoaPods (first time only)

```bash
sudo gem install cocoapods
```

### 2. Open in Xcode

```bash
npx cap open ios
```

This opens `ios/App/App.xcworkspace` in Xcode on your Mac.

### 3. Configure Signing in Xcode

1. Select the `App` target in Xcode
2. Go to **Signing & Capabilities** tab
3. Set **Team** to your Apple Developer account
4. Set **Bundle Identifier** to `com.gotohomebase.app`
5. Enable **Automatically manage signing**

### 4. Configure App Capabilities

In Xcode under **Signing & Capabilities**, add:
- **Push Notifications** (for existing push notification support)
- **Background Modes** → check **Remote notifications**

### 5. Set App Information

In `ios/App/App/Info.plist`, ensure these keys exist:
```xml
<key>NSCameraUsageDescription</key>
<string>HomeBase uses the camera to let you photograph home issues and service records.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>HomeBase accesses your photo library to let you upload images of your home.</string>
```

### 6. Build for Release

1. Set the scheme to **Any iOS Device (arm64)** (not a simulator)
2. Go to **Product → Archive**
3. Once archived, click **Distribute App** in Xcode Organizer
4. Choose **App Store Connect → Upload**
5. Follow the wizard to upload the build

### 7. Submit on App Store Connect

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Create a new app with Bundle ID `com.gotohomebase.app`
3. Fill in app metadata:
   - **Name:** HomeBase
   - **Category:** Productivity
   - **Privacy Policy URL:** `https://gotohomebase.com/privacy`
   - **Age Rating:** 4+ (no objectionable content)
4. Upload screenshots (required sizes: 6.5" iPhone, 5.5" iPhone, 12.9" iPad)
5. Select your uploaded build and submit for review

### Apple Review Timeline

- Initial review: 1–3 business days
- Typical response: 24–48 hours for subsequent updates

---

## Android — Google Play Store

### 1. Open in Android Studio

```bash
npx cap open android
```

This opens the `android/` project in Android Studio.

### 2. Create a Signing Keystore (first time only)

In Android Studio: **Build → Generate Signed Bundle/APK → Create new keystore**

Or via command line:
```bash
keytool -genkey -v -keystore homebase-release.keystore -alias homebase -keyalg RSA -keysize 2048 -validity 10000
```

**Store the keystore file and password securely — losing it means you cannot update your app.**

### 3. Configure Signing

In `android/app/build.gradle`, add your signing config:
```groovy
android {
    signingConfigs {
        release {
            storeFile file('/path/to/homebase-release.keystore')
            storePassword 'YOUR_STORE_PASSWORD'
            keyAlias 'homebase'
            keyPassword 'YOUR_KEY_PASSWORD'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
        }
    }
}
```

### 4. Build a Release AAB

```bash
# In Android Studio: Build → Generate Signed Bundle/APK → Android App Bundle → release
# Or via command line:
cd android && ./gradlew bundleRelease
```

The `.aab` file is created at:  
`android/app/build/outputs/bundle/release/app-release.aab`

### 5. Submit on Google Play Console

1. Go to [play.google.com/console](https://play.google.com/console)
2. Create a new app with package name `com.gotohomebase.app`
3. Fill in app details:
   - **Category:** Productivity
   - **Content Rating:** Complete the rating questionnaire
   - **Privacy Policy URL:** `https://gotohomebase.com/privacy`
4. Go to **Production → Create new release**
5. Upload the `.aab` file
6. Add release notes and submit for review

### Google Play Review Timeline

- Initial review: 1–7 business days (often 1–2 days)
- Updates: Usually reviewed in hours

---

## Store Listing Requirements

Prepare these assets before submitting to either store:

| Asset | iOS | Android |
|-------|-----|---------|
| App icon | 1024×1024 PNG | 512×512 PNG |
| Feature graphic | — | 1024×500 PNG |
| Screenshots (phone) | 6.5" + 5.5" | 1080×1920 minimum |
| Screenshots (tablet) | 12.9" iPad | 1200×1920 minimum |
| Short description | 170 chars | 80 chars |
| Full description | 4,000 chars | 4,000 chars |
| Privacy Policy URL | Required | Required |
| App category | Required | Required |

**Tip:** Use a tool like [Rottenwood](https://rottenwood.com/) or the [Apple Design Resources](https://developer.apple.com/design/resources/) to create professional-looking screenshots in device frames.

---

## Common Issues

### "App loads a website — will it be rejected?"

Apple allows web content apps that provide genuine utility. HomeBase qualifies as a legitimate utility app (home maintenance tracking, contractor management, property records). Include a clear privacy policy and ensure all functionality is accessible within the app (no links to browser-only features).

### Sessions / Login Not Persisting

Capacitor WebViews handle cookies like a browser. Sessions will persist between app launches because the WebView has its own persistent cookie store. No special configuration needed.

### Push Notifications

The existing push notification setup (via the service worker) will work on Android. For iOS, push notifications require APNs (Apple Push Notification Service) certificates, which are configured in your Apple Developer account and linked to Firebase or a backend service.

### HTTPS Required

The app is configured to load `https://gotohomebase.com`. Ensure the production domain always has a valid SSL certificate.

---

## File Reference

| File | Purpose |
|------|---------|
| `capacitor.config.ts` | Capacitor configuration (app ID, server URL, plugins) |
| `ios/` | Xcode project — open with `npx cap open ios` |
| `android/` | Android Studio project — open with `npx cap open android` |
| `resources/icon.png` | Source icon for generating native sizes |
| `resources/splash.png` | Source splash for generating native sizes |
| `MOBILE_BUILD.md` | This file |
