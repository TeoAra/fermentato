import { useEffect, useRef, useState } from "react";

export const BOTTOM_BAR_IDLE_DELAY = 3000;

/** Keep navigation accessible while hiding only its visual shell during inactivity. */
export function useIdleBottomBar(disabled = false, activityKey?: string) {
  const barRef = useRef<HTMLElement>(null);
  const [idleHidden, setIdleHidden] = useState(false);

  useEffect(() => {
    setIdleHidden(false);
    if (disabled) return;

    let timer = 0;
    let idle = false;
    let hovered = false;
    let disposed = false;
    const bar = barRef.current;
    const pinned = () => hovered || Boolean(bar?.querySelector(":focus-visible"));
    const clearTimer = () => window.clearTimeout(timer);
    const activity = () => {
      if (disposed) return;
      if (idle) {
        idle = false;
        setIdleHidden(false);
      }
      clearTimer();
      if (document.hidden || pinned()) return;
      timer = window.setTimeout(() => {
        if (disposed || pinned()) return;
        idle = true;
        setIdleHidden(true);
      }, BOTTOM_BAR_IDLE_DELAY);
    };
    const enter = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      hovered = true;
      activity();
    };
    const leave = () => {
      hovered = false;
      activity();
    };
    // Check after focus has actually moved, not during the old element's blur.
    const focusChanged = () => queueMicrotask(activity);
    const visibilityChanged = () => {
      if (document.hidden) clearTimer();
      else activity();
    };
    // Capture catches scrolling inside panels, not just document scrolling.
    // Passive handlers never block touch gestures or pull-to-refresh.
    const events = ["scroll", "wheel", "pointerdown", "pointermove", "touchstart", "touchmove", "keydown"] as const;
    const options = { capture: true, passive: true };
    for (const event of events) document.addEventListener(event, activity, options);
    document.addEventListener("focusin", focusChanged);
    document.addEventListener("focusout", focusChanged);
    document.addEventListener("visibilitychange", visibilityChanged);
    window.addEventListener("pageshow", activity);
    window.addEventListener("popstate", activity);
    window.addEventListener("resize", activity);
    bar?.addEventListener("pointerenter", enter);
    bar?.addEventListener("pointerleave", leave);
    activity();

    return () => {
      disposed = true;
      clearTimer();
      for (const event of events) document.removeEventListener(event, activity, options);
      document.removeEventListener("focusin", focusChanged);
      document.removeEventListener("focusout", focusChanged);
      document.removeEventListener("visibilitychange", visibilityChanged);
      window.removeEventListener("pageshow", activity);
      window.removeEventListener("popstate", activity);
      window.removeEventListener("resize", activity);
      bar?.removeEventListener("pointerenter", enter);
      bar?.removeEventListener("pointerleave", leave);
    };
  }, [disabled, activityKey]);

  return { barRef, idleHidden };
}
