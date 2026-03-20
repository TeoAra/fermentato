import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

export function NavigationProgress() {
  const [location] = useLocation();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const prevLocation = useRef(location);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (location === prevLocation.current) return;
    prevLocation.current = location;

    if (timerRef.current) clearTimeout(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    setWidth(0);
    setVisible(true);

    let start: number | null = null;
    const duration = 300;

    const animate = (ts: number) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(elapsed / duration, 1);
      setWidth(progress * 85);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setWidth(100);
        timerRef.current = setTimeout(() => setVisible(false), 200);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [location]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 z-[9999] h-[2.5px] bg-[hsl(35,90%,45%)] dark:bg-[hsl(38,92%,52%)] shadow-[0_0_6px_hsl(35,90%,55%)] pointer-events-none"
      style={{
        width: `${width}%`,
        transition: width === 100 ? "width 0.1s ease-out, opacity 0.2s ease" : "width 0.05s linear",
        opacity: visible ? 1 : 0,
      }}
    />
  );
}
