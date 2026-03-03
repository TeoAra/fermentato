import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Bell, Share2, Smartphone, ArrowUp, Plus, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as any).standalone === true;
}

function getDeviceType(): 'ios' | 'android' | 'desktop' {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

function isInSafari(): boolean {
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua);
}

export async function subscribeToPush(): Promise<{ success: boolean; error?: string }> {
  try {
    if (!('serviceWorker' in navigator)) {
      return { success: false, error: 'Il tuo browser non supporta i Service Worker. Prova ad installare l\'app dalla schermata home.' };
    }
    if (!('PushManager' in window)) {
      return { success: false, error: 'Il tuo browser non supporta le notifiche push. Prova con Chrome o Firefox.' };
    }
    if (!('Notification' in window)) {
      return { success: false, error: 'Le notifiche non sono supportate su questo dispositivo.' };
    }

    const permission = await Notification.requestPermission();
    if (permission === 'denied') {
      return { success: false, error: 'Le notifiche sono state bloccate. Vai nelle impostazioni del browser per abilitarle.' };
    }
    if (permission !== 'granted') {
      return { success: false, error: 'Permesso per le notifiche non concesso.' };
    }

    let reg: ServiceWorkerRegistration;
    try {
      reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
      ]);
    } catch {
      return { success: false, error: 'Service Worker non pronto. Prova a ricaricare la pagina.' };
    }

    const vapidRes = await fetch('/api/push/vapid-key');
    if (!vapidRes.ok) {
      return { success: false, error: `Errore nel recupero della chiave VAPID (${vapidRes.status}).` };
    }
    const { publicKey } = await vapidRes.json();
    if (!publicKey) {
      return { success: false, error: 'Chiave VAPID non configurata sul server.' };
    }

    let subscription = await reg.pushManager.getSubscription();

    if (subscription) {
      try {
        await subscription.unsubscribe();
      } catch {}
      subscription = null;
    }

    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    const subJson = subscription.toJSON();
    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
      return { success: false, error: 'Dati di sottoscrizione push non validi.' };
    }

    await apiRequest('/api/push/subscribe', { method: 'POST' }, {
      endpoint: subJson.endpoint,
      p256dh: subJson.keys.p256dh,
      auth: subJson.keys.auth,
    });

    console.log('Push subscription saved successfully');
    return { success: true };
  } catch (e: any) {
    console.error('Push subscription failed:', e);
    return { success: false, error: e?.message || 'Errore sconosciuto durante la registrazione push.' };
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator)) return false;
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await apiRequest('/api/push/unsubscribe', { method: 'POST' }, { endpoint });
    }
    return true;
  } catch (e) {
    console.error('Push unsubscribe failed:', e);
    return false;
  }
}

export function getPushPermissionStatus(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export function AutoPushSubscriber() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (Notification.permission !== 'granted') return;

    // On iOS, push only works in standalone PWA mode
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIos && !isStandalone()) return;

    const alreadySynced = sessionStorage.getItem('push-synced');
    if (alreadySynced) return;

    sessionStorage.setItem('push-synced', '1');

    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          const subJson = existing.toJSON();
          if (subJson.endpoint && subJson.keys?.p256dh && subJson.keys?.auth) {
            await apiRequest('/api/push/subscribe', { method: 'POST' }, {
              endpoint: subJson.endpoint,
              p256dh: subJson.keys.p256dh,
              auth: subJson.keys.auth,
            });
            console.log('Push subscription auto-synced to server');
          }
        } else {
          await subscribeToPush();
        }
      } catch (e) {
        console.error('Auto push sync failed:', e);
      }
    })();
  }, [isAuthenticated]);

  return null;
}

function IosInstallGuide({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const inSafari = isInSafari();

  const steps = inSafari ? [
    {
      icon: <Share2 className="w-8 h-8 text-blue-500" />,
      title: "Tocca Condividi",
      desc: "Premi l'icona di condivisione nella barra in basso di Safari",
      hint: "È il quadrato con la freccia verso l'alto ↑",
    },
    {
      icon: <Plus className="w-8 h-8 text-green-500" />,
      title: "\"Aggiungi a Home\"",
      desc: "Scorri verso il basso nel menu e tocca \"Aggiungi a schermata Home\"",
      hint: "Potresti dover scorrere nel menu di condivisione",
    },
    {
      icon: <CheckCircle className="w-8 h-8 text-amber-500" />,
      title: "Conferma",
      desc: "Tocca \"Aggiungi\" in alto a destra per installare Fermenta.to",
      hint: "L'app apparirà nella tua schermata home come un'app normale",
    },
  ] : [
    {
      icon: <Share2 className="w-8 h-8 text-blue-500" />,
      title: "Apri in Safari",
      desc: "Per installare l'app devi usare Safari come browser",
      hint: "Copia il link e incollalo in Safari",
    },
  ];

  const current = steps[step];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Installa Fermenta.to</h3>
              <p className="text-white/80 text-xs">Aggiungi alla schermata home</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-amber-500' : i < step ? 'w-4 bg-amber-300' : 'w-4 bg-gray-200 dark:bg-gray-700'}`}
              />
            ))}
          </div>

          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto">
              {current.icon}
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">
                Passo {step + 1} di {steps.length}
              </p>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white">{current.title}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{current.desc}</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
              <p className="text-xs text-amber-700 dark:text-amber-300">{current.hint}</p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setStep(s => s - 1)}>
                Indietro
              </Button>
            )}
            {step < steps.length - 1 ? (
              <Button
                size="sm"
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                onClick={() => setStep(s => s + 1)}
              >
                Avanti
              </Button>
            ) : (
              <Button
                size="sm"
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                onClick={onClose}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Fatto!
              </Button>
            )}
          </div>
        </div>

        {inSafari && (
          <div className="px-6 pb-6">
            <div className="flex items-center gap-2 text-xs text-gray-400 justify-center">
              <ArrowUp className="w-3 h-3" />
              <span>Cerca l'icona ↑ nella barra in basso</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function PwaInstallPrompt() {
  const { isAuthenticated } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (isStandalone()) return;

    const isDismissed = localStorage.getItem('pwa-install-dismissed');
    if (isDismissed) {
      const dismissedAt = parseInt(isDismissed, 10);
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
        return;
      }
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const timer = setTimeout(() => setShowInstall(true), 2000);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(timer);
    };
  }, [isAuthenticated]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setShowInstall(false);
    }
  };

  const handleDismiss = () => {
    setShowInstall(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (!showInstall || dismissed) return null;

  const device = getDeviceType();

  return (
    <>
      {showIosGuide && <IosInstallGuide onClose={() => { setShowIosGuide(false); handleDismiss(); }} />}

      <div className="fixed bottom-20 lg:bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:w-96 z-50 animate-in slide-in-from-bottom-5">
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-amber-200 dark:border-amber-800 rounded-2xl p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex-shrink-0">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                Installa Fermenta.to
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                {deferredPrompt
                  ? "Aggiungi alla schermata home per un accesso rapido e ricevere notifiche."
                  : device === 'ios'
                    ? "Installala sulla tua schermata home come un'app vera — in 3 semplici passi."
                    : device === 'android'
                      ? "Tocca il menu del browser (⋮) e poi \"Aggiungi a schermata Home\"."
                      : "Usa il menu del browser per installare l'app come applicazione."}
              </p>
            </div>
            <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            {deferredPrompt ? (
              <Button
                onClick={handleInstall}
                size="sm"
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
              >
                <Download className="w-4 h-4 mr-1" />
                Installa
              </Button>
            ) : device === 'ios' ? (
              <Button
                onClick={() => setShowIosGuide(true)}
                size="sm"
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
              >
                <Share2 className="w-4 h-4 mr-1" />
                Come installare
              </Button>
            ) : (
              <Button
                onClick={handleDismiss}
                size="sm"
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
              >
                Ho capito
              </Button>
            )}
            <Button onClick={handleDismiss} size="sm" variant="ghost" className="text-gray-500">
              Non ora
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export function PushNotificationPrompt() {
  const { isAuthenticated } = useAuth();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (Notification.permission !== 'default') return;

    // On iOS, push notifications only work when installed as PWA (standalone mode)
    // Don't show the prompt to iOS users in browser mode
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIos && !isStandalone()) return;

    const isDismissed = localStorage.getItem('push-prompt-dismissed');
    if (isDismissed) {
      const dismissedAt = parseInt(isDismissed, 10);
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;
    }

    const timer = setTimeout(() => setShow(true), 5000);
    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  const handleEnable = async () => {
    await subscribeToPush();
    setShow(false);
  };

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    localStorage.setItem('push-prompt-dismissed', Date.now().toString());
  };

  if (!show || dismissed) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:w-96 z-50 animate-in slide-in-from-bottom-5">
      <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-amber-200 dark:border-amber-800 rounded-2xl p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex-shrink-0">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
              Attiva le notifiche
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              Ricevi aggiornamenti sulle nuove birre alla spina nei tuoi pub preferiti.
            </p>
          </div>
          <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <Button
            onClick={handleEnable}
            size="sm"
            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
          >
            <Bell className="w-4 h-4 mr-1" />
            Attiva
          </Button>
          <Button onClick={handleDismiss} size="sm" variant="ghost" className="text-gray-500">
            Non ora
          </Button>
        </div>
      </div>
    </div>
  );
}
