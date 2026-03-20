import { useState, useEffect, useRef, useCallback } from "react";

const THRESHOLD = 64;

export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const startY = useRef(0);
  const pulling = useRef(false);

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
      setPullProgress(progress);
      setIsPulling(progress > 0.1);
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    const progress = pullProgress;
    setPullProgress(0);
    setIsPulling(false);
    if (progress >= 1) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    startY.current = 0;
  }, [pullProgress, onRefresh]);

  useEffect(() => {
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd);
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { isPulling, isRefreshing, pullProgress };
}
