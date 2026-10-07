import { useState, useEffect, useRef, useCallback } from "react";

const THRESHOLD = 72;
const HORIZONTAL_LOCK_PX = 10;

export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const startY = useRef<number | null>(null);
  const startX = useRef<number | null>(null);
  const pulling = useRef(false);
  const horizontalLock = useRef(false);
  const progressRef = useRef(0);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);

  const reset = useCallback(() => {
    startY.current = null;
    startX.current = null;
    pulling.current = false;
    horizontalLock.current = false;
    progressRef.current = 0;
    setPullProgress(0);
    setIsPulling(false);
  }, []);

  const isExcluded = (target: EventTarget | null): boolean => {
    let node = target instanceof Element ? target : null;
    while (node && node !== document.body) {
      if (node.matches("[data-no-pull='true'], [role='dialog'], dialog, input, textarea, select, button, [contenteditable='true']")) return true;
      const style = window.getComputedStyle(node);
      const overflowY = style.overflowY;
      if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight + 2) return true;
      if ((style.overflowX === "auto" || style.overflowX === "scroll") && node.scrollWidth > node.clientWidth + 2) return true;
      node = node.parentElement;
    }
    return false;
  };

  const onStart = useCallback((event: TouchEvent) => {
    reset();
    if (refreshingRef.current || event.touches.length !== 1 || isExcluded(event.target) ||
        document.querySelector("[role='dialog'][data-state='open'], dialog[open]")) return;
    const scrollRoot = document.scrollingElement;
    if ((scrollRoot?.scrollTop ?? window.scrollY) > 0) return;
    startY.current = event.touches[0].clientY;
    startX.current = event.touches[0].clientX;
    pulling.current = true;
    setRefreshError(null);
  }, [reset]);

  const onMove = useCallback((event: TouchEvent) => {
    if (!pulling.current || startY.current === null || startX.current === null || event.touches.length !== 1) return;
    const dy = event.touches[0].clientY - startY.current;
    const dx = Math.abs(event.touches[0].clientX - startX.current);
    if (dx > HORIZONTAL_LOCK_PX && dx > Math.abs(dy)) {
      horizontalLock.current = true;
      reset();
      return;
    }
    if (dy < 0) {
      reset();
      return;
    }
    if (dy > 0 && (document.scrollingElement?.scrollTop ?? window.scrollY) <= 0) {
      if (dy > 8 && event.cancelable) event.preventDefault();
      const nextProgress = Math.min(dy / THRESHOLD, 1.45);
      progressRef.current = nextProgress;
      setPullProgress(nextProgress);
      setIsPulling(nextProgress > 0.08);
    }
  }, [reset]);

  const onEnd = useCallback(async () => {
    if (!pulling.current) {
      reset();
      return;
    }
    const shouldRefresh = !horizontalLock.current && progressRef.current >= 1 && !refreshingRef.current;
    reset();
    if (!shouldRefresh) return;
    refreshingRef.current = true;
    setIsRefreshing(true);
    setRefreshError(null);
    try {
      await onRefreshRef.current();
    } catch (error) {
      setRefreshError(error instanceof Error && error.message ? error.message : "Riprova tra poco");
    } finally {
      refreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, [reset]);

  const onCancel = useCallback(() => reset(), [reset]);

  useEffect(() => {
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onCancel, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onCancel);
      reset();
    };
  }, [onStart, onMove, onEnd, onCancel, reset]);

  return { isPulling, isRefreshing, pullProgress, refreshError };
}
