import { useState, useEffect, useRef, useCallback } from "react";
import { Capacitor } from "@capacitor/core";

const THRESHOLD = 72;
const HORIZONTAL_LOCK_PX = 8;

export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  const isNative = Capacitor.isNativePlatform();

  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);

  const startY = useRef(0);
  const startX = useRef(0);
  const pulling = useRef(false);
  const horizontalLock = useRef(false);
  const pullProgressRef = useRef(0);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);

  // True se il punto toccato è dentro un elemento con scroll orizzontale
  // (carousel, mappe, tabs scorrevoli) o esplicitamente opt-out via data-no-pull.
  // Evita che il pull-to-refresh si attivi mentre l'utente scorre lateralmente.
  const isInHorizontalScroller = (target: EventTarget | null): boolean => {
    let el = target as HTMLElement | null;
    let depth = 0;
    while (el && el !== document.body && depth < 12) {
      if (el.dataset && el.dataset.noPull === "true") return true;
      try {
        const style = window.getComputedStyle(el);
        const overflowX = style.overflowX;
        if ((overflowX === "auto" || overflowX === "scroll") && el.scrollWidth > el.clientWidth + 1) {
          return true;
        }
      } catch {}
      el = el.parentElement;
      depth++;
    }
    return false;
  };

  // ── WEB / PWA ─────────────────────────────────────────────────────────────
  const handleWebTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY !== 0) return;
    if (isInHorizontalScroller(e.target)) return;
    startY.current = e.touches[0].clientY;
    startX.current = e.touches[0].clientX;
    pulling.current = true;
    horizontalLock.current = false;
  }, []);

  const handleWebTouchMove = useCallback((e: TouchEvent) => {
    if (!pulling.current || startY.current === 0) return;
    if (horizontalLock.current) return;
    const y = e.touches[0].clientY;
    const x = e.touches[0].clientX;
    const dy = y - startY.current;
    const dx = Math.abs(x - startX.current);
    // Se l'utente sta scorrendo prevalentemente in orizzontale, abortisci.
    if (dx > HORIZONTAL_LOCK_PX && dx > Math.abs(dy)) {
      horizontalLock.current = true;
      pulling.current = false;
      pullProgressRef.current = 0;
      setPullProgress(0);
      setIsPulling(false);
      return;
    }
    const distance = Math.max(0, dy);
    if (distance > 0 && window.scrollY === 0) {
      const progress = Math.min(distance / THRESHOLD, 1.5);
      pullProgressRef.current = progress;
      setPullProgress(progress);
      setIsPulling(progress > 0.1);
    }
  }, []);

  const handleWebTouchEnd = useCallback(async () => {
    if (!pulling.current) {
      horizontalLock.current = false;
      startY.current = 0;
      startX.current = 0;
      return;
    }
    pulling.current = false;
    const progress = pullProgressRef.current;
    pullProgressRef.current = 0;
    setPullProgress(0);
    setIsPulling(false);
    startY.current = 0;
    startX.current = 0;
    if (progress >= 1) {
      setIsRefreshing(true);
      try { await onRefreshRef.current(); }
      finally { setIsRefreshing(false); }
    }
  }, []);

  // ── NATIVE (Android/iOS Capacitor) ────────────────────────────────────────
  // No touchmove listener — su Android WebView corrompe lo stato del touch.
  // Solo touchstart (record Y/X + check horizontal scroller) e touchend (diff Y).
  const handleNativeTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY !== 0) return;
    if (isInHorizontalScroller(e.target)) {
      startY.current = 0;
      return;
    }
    startY.current = e.touches[0].clientY;
    startX.current = e.touches[0].clientX;
  }, []);

  const handleNativeTouchEnd = useCallback(async (e: TouchEvent) => {
    if (startY.current === 0) return;
    const endY = e.changedTouches[0]?.clientY ?? startY.current;
    const endX = e.changedTouches[0]?.clientX ?? startX.current;
    const deltaY = endY - startY.current;
    const deltaX = Math.abs(endX - startX.current);
    startY.current = 0;
    startX.current = 0;
    // Se prevalentemente orizzontale → ignora (carousel/mappa)
    if (deltaX > Math.abs(deltaY)) return;
    if (deltaY >= THRESHOLD) {
      setIsRefreshing(true);
      try { await onRefreshRef.current(); }
      finally { setIsRefreshing(false); }
    }
  }, []);

  useEffect(() => {
    if (isNative) {
      document.addEventListener("touchstart", handleNativeTouchStart, { passive: true });
      document.addEventListener("touchend",   handleNativeTouchEnd,   { passive: true });
      return () => {
        document.removeEventListener("touchstart", handleNativeTouchStart);
        document.removeEventListener("touchend",   handleNativeTouchEnd);
      };
    } else {
      document.addEventListener("touchstart", handleWebTouchStart, { passive: true });
      document.addEventListener("touchmove",  handleWebTouchMove,  { passive: true });
      document.addEventListener("touchend",   handleWebTouchEnd,   { passive: true });
      return () => {
        document.removeEventListener("touchstart", handleWebTouchStart);
        document.removeEventListener("touchmove",  handleWebTouchMove);
        document.removeEventListener("touchend",   handleWebTouchEnd);
      };
    }
  }, [isNative, handleNativeTouchStart, handleNativeTouchEnd,
      handleWebTouchStart, handleWebTouchMove, handleWebTouchEnd]);

  return { isPulling, isRefreshing, pullProgress };
}
