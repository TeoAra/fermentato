import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'to.fermentato.app',
  appName: 'Fermenta.to',
  webDir: 'dist/public',
  server: {
    // Live URL mode: l'app nativa carica sempre da produzione.
    // Gli aggiornamenti JS/CSS non richiedono redistribuzione su store.
    url: 'https://fermenta.to',
    cleartext: false,
    // Permette le richieste API allo stesso hostname
    androidScheme: 'https',
    iosScheme: 'https',
    hostname: 'fermenta.to',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#FFF7ED',
    webContentsDebuggingEnabled: false,
    // Permette l'installazione da APK diretto (sideload)
    allowBackup: false,
  },
  ios: {
    backgroundColor: '#FFF7ED',
    // Permette WKWebView di fare richieste alle API
    allowsLinkPreview: false,
    scrollEnabled: true,
    // Content mode: mobile ottimizzato
    contentInset: 'always',
  },
  plugins: {
    SplashScreen: {
      // Non auto-nascondere lo splash: lo facciamo da main.tsx con timeout sicurezza
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
      // Mostra badge, suono e banner anche quando l'app è in foreground
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Geolocation: {
      // iOS: richiede NSLocationWhenInUseUsageDescription in Info.plist
    },
    App: {
      // Deep link scheme: fermenta.to://path → apre la route interna
      // Configurare anche in AndroidManifest.xml e Info.plist
    },
  },
};

export default config;
