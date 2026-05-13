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
    // Allineato al colore esatto dell'header in light mode così la WebView
    // non flasha un colore diverso prima del primo paint di React.
    backgroundColor: '#FFFFFF',
    webContentsDebuggingEnabled: false,
    allowBackup: false,
  },
  ios: {
    backgroundColor: '#FFFFFF',
    allowsLinkPreview: false,
    scrollEnabled: true,
    // 'never' + StatusBar overlaysWebView=true → la WebView va edge-to-edge
    // sotto la status bar e l'home indicator. La safe-area è gestita in CSS,
    // così l'header/bottom-nav estendono il loro background sotto i system UI
    // e nulla "stacca" più.
    contentInset: 'never',
  },
  plugins: {
    SplashScreen: {
      // Non auto-nascondere lo splash: lo facciamo da main.tsx con timeout sicurezza
      launchAutoHide: false,
      launchShowDuration: 3000,
      launchFadeOutDuration: 300,
      // Stesso bianco dell'header → niente flash di colore tra splash e app.
      backgroundColor: '#FFFFFF',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      // overlaysWebView=true → la WebView passa sotto la status bar; il
      // background dell'header (white o #0F0F10) estende i suoi pixel fin
      // dentro la safe area, eliminando qualunque "stacco" visivo.
      // Lo style viene poi aggiornato a runtime in base al tema (vedi theme.tsx).
      style: 'DARK',
      backgroundColor: '#FFFFFF',
      overlaysWebView: true,
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
