import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Bell, Share, MoreVertical, Smartphone } from "lucide-react";
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

export async function subscribeToPush(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported');
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied');
      return false;
    }

    const reg = await navigator.serviceWorker.ready;

    const vapidRes = await fetch('/api/push/vapid-key');
    const { publicKey } = await vapidRes.json();
    if (!publicKey) {
      console.error('No VAPID public key from server');
      return false;
    }

    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    const subJson = subscription.toJSON();
    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
      console.error('Invalid push subscription data');
      return false;
    }

    await apiRequest('/api/push/subscribe', { method: 'POST' }, {
      endpoint: subJson.endpoint,
      p256dh: subJson.keys.p256dh,
      auth: subJson.keys.auth,
    });

    console.log('Push subscription saved successfully');
    return true;
  } catch (e) {
    console.error('Push subscription failed:', e);
    return false;
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

export function PwaInstallPrompt() {
  const { isAuthenticated } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);
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
                  ? "Tocca l'icona Condividi e poi \"Aggiungi a Home\" per installare l'app."
                  : device === 'android'
                    ? "Tocca il menu del browser (⋮) e poi \"Aggiungi a schermata Home\"."
                    : "Usa il menu del browser per installare l'app come applicazione."}
            </p>
          </div>
          <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
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
          ) : (
            <Button
              onClick={handleDismiss}
              size="sm"
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
            >
              {device === 'ios' ? <Share className="w-4 h-4 mr-1" /> : <MoreVertical className="w-4 h-4 mr-1" />}
              Ho capito
            </Button>
          )}
          <Button onClick={handleDismiss} size="sm" variant="ghost" className="text-gray-500">
            Non ora
          </Button>
        </div>
      </div>
    </div>
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
