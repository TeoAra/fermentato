import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'to.fermenta.app',
  appName: 'Fermenta.to',
  webDir: 'dist/public',
  server: {
    // Carica sempre dalla produzione — nessun bundle da redistribuire per aggiornare la UI
    url: 'https://fermenta.to',
    cleartext: false,
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
      style: 'LIGHT',
      backgroundColor: '#FFF7ED',
      overlaysWebView: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
