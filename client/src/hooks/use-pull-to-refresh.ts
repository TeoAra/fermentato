import { useState, useEffect, useRef, useCallback } from "react";
import { Capacitor } from "@capacitor/core";

const THRESHOLD = 72;

export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  const isNative = Capacitor.isNativePlatform();

  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);

  const startY = useRef(0);
  const pulling = useRef(false);
  const pullProgressRef = useRef(0);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);

  // ── WEB / PWA ─────────────────────────────────────────────────────────────
  // Full gesture tracking: touchmove updates progress bar in real time.
  // Handlers are stable (useCallback + empty deps) — added once, never swapped.
  const handleWebTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, []);

  const handleWebTouchMove = useCallback((e: TouchEvent) => {
    if (!pulling.current || startY.current === 0) return;
    const y = e.touches[0].clientY;
    const distance = Math.max(0, y - startY.current);
    if (distance > 0 && window.scrollY === 0) {
      const progress = Math.min(distance / THRESHOLD, 1.5);
      pullProgressRef.current = progress;
      setPullProgress(progress);
      setIsPulling(progress > 0.1);
    }
  }, []);

  const handleWebTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    const progress = pullProgressRef.current;
    pullProgressRef.current = 0;
    setPullProgress(0);
    setIsPulling(false);
    startY.current = 0;
    if (progress >= 1) {
      setIsRefreshing(true);
      try { await onRefreshRef.current(); }
      finally { setIsRefreshing(false); }
    }
  }, []);

  // ── NATIVE (Android/iOS Capacitor) ────────────────────────────────────────
  // NO touchmove listener — attaching touchmove handlers that call setState
  // during a gesture on Android WebViews corrupts touch state and causes freeze.
  // Instead we only track touchstart (record Y) and touchend (diff Y → refresh).
  // No progress bar shown during pull, only a spinner after release.
  const handleNativeTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleNativeTouchEnd = useCallback(async (e: TouchEvent) => {
    if (startY.current === 0) return;
    const endY = e.changedTouches[0]?.clientY ?? startY.current;
    const delta = endY - startY.current;
    startY.current = 0;
    if (delta >= THRESHOLD) {
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
