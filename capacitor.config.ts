import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'to.fermenta.app',
  appName: 'Fermenta.to',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    hostname: 'app.fermenta.to',
    allowNavigation: ['fermenta.to', '*.fermenta.to'],
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#FFF7ED',
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      backgroundColor: '#FFF7ED',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#FFF7ED',
      overlaysWebView: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
