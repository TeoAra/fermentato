/**
 * Helper centralizzato per rilevare la piattaforma runtime.
 *
 * Su iOS nativo (App Store) NON possiamo mostrare prezzi, listini, pulsanti
 * "Acquista" o link a checkout esterni per contenuti/servizi digitali
 * (App Store Review Guideline 3.1.1 / 3.1.3(e) — Enterprise Services).
 *
 * I titolari pub/festival che vogliono abbonarsi devono farlo dal browser
 * su fermenta.to. L'app iOS è solo per consultazione/gestione di contenuti
 * acquistati altrove.
 */
import { Capacitor } from "@capacitor/core";

export const isIosNative =
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";

export const isAndroidNative =
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

export const isNativeApp = Capacitor.isNativePlatform();
