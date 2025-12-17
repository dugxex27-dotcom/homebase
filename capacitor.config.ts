import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gotohomebase.app',
  appName: 'HomeBase',
  webDir: 'dist/public',
  server: {
    url: 'https://gotohomebase.com',
    cleartext: false
  },
  ios: {
    contentInset: 'automatic',
    scheme: 'HomeBase'
  },
  android: {
    allowMixedContent: false
  }
};

export default config;
