import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gotohomebase.app',
  appName: 'HomeBase',
  webDir: 'dist/public',
  server: {
    url: 'https://gotohomebase.com',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
    scheme: 'HomeBase',
    // Note: Do NOT set limitsNavigationsToAppBoundDomains: true without also adding
    // WKAppBoundDomains = ["gotohomebase.com"] to ios/App/App/Info.plist
    // Omitting here to avoid white-screen navigation blocks in the WebView
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#8B70D4',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
