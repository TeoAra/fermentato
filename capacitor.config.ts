import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'to.fermentato.app',
  appName: 'Fermenta.to',
  webDir: 'dist/public',
  server: {
    url: 'https://fermenta.to',
    cleartext: false,
    androidScheme: 'https',
    iosScheme: 'https',
    hostname: 'fermenta.to',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#FFFFFF',
    webContentsDebuggingEnabled: false,
    allowBackup: false,
  },
  ios: {
    backgroundColor: '#FFFFFF',
    allowsLinkPreview: false,
    scrollEnabled: true,
    contentInset: 'never',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      launchShowDuration: 3000,
      launchFadeOutDuration: 300,
      backgroundColor: '#FFFFFF',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#FFFFFF',
      overlaysWebView: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Camera: {
      // @capacitor/camera — permessi già in Info.plist (iOS) e AndroidManifest (Android)
    },
    Geolocation: {
      // @capacitor/geolocation — permessi già in Info.plist (iOS) e AndroidManifest (Android)
    },
    App: {
      // Deep link: fermenta.to://path → apre la route interna
    },
  },
};

export default config;
