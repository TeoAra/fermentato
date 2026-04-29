import { useState, useEffect, useRef, useCallback } from "react";
import { Capacitor } from "@capacitor/core";

const THRESHOLD = 64;

export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  // In Capacitor native, pull-to-refresh is disabled entirely.
  // Attaching document-level touch listeners in Android WebViews causes
  // a well-known freeze bug: each touchmove state update recreates the
  // touchend listener mid-gesture, corrupting the WebView touch state.
  const isNative = Capacitor.isNativePlatform();

  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);

  // All gesture tracking uses refs so handlers never need to be recreated.
  // This ensures touch listeners are added once and never swapped mid-gesture.
  const startY = useRef(0);
  const pulling = useRef(false);
  const pullProgressRef = useRef(0);
  const onRefreshRef = useRef(onRefresh);

  // Keep the onRefresh callback in sync without causing effect re-runs.
  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
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

  // Empty dep array: reads from refs only, never recreated.
  // Also passive: true — no preventDefault, won't block touch events.
  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    const progress = pullProgressRef.current;
    pullProgressRef.current = 0;
    setPullProgress(0);
    setIsPulling(false);
    startY.current = 0;
    if (progress >= 1) {
      setIsRefreshing(true);
      try {
        await onRefreshRef.current();
      } finally {
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isNative) return;
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isNative, handleTouchStart, handleTouchMove, handleTouchEnd]);

  if (isNative) return { isPulling: false, isRefreshing: false, pullProgress: 0 };
  return { isPulling, isRefreshing, pullProgress };
}
