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
      // Non auto-nascondere lo splash: lo facciamo da main.tsx con un
      // timeout di sicurezza, così su retina/network lento non resta bloccato.
      launchAutoHide: false,
      launchShowDuration: 3000,
      launchFadeOutDuration: 300,
      backgroundColor: '#FFF7ED',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      // 'DARK' = icone scure su sfondo chiaro (warm cream)
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
