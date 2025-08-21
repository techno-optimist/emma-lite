import { CapacitorConfig } from '@capacitor/cli';

// NOTE: This config is staged for the Emma mobile shell.
// Web assets are served from the copied mobile pages.
// When building, bundle mobile/pages, mobile/css, mobile/js into a www/ directory as needed.

const config: CapacitorConfig = {
  appId: 'com.emma.mobile',
  appName: 'Emma Mobile',
  webDir: '../../mobile/pages',
  server: {
    androidScheme: 'https'
  }
};

export default config;

