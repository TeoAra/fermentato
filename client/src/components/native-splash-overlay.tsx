import { useState, useEffect } from "react";

/**
 * NativeSplashOverlay — copre il flash bianco/nero tra l'hide dello splash
 * nativo di Capacitor e il primo render di React.
 *
 * Mostra il logo Fermenta.to su sfondo identico all'app, poi dissolvenza
 * in uscita dopo 700ms. Solo su piattaforma nativa (iOS/Android).
 */
export function NativeSplashOverlay() {
  const isNative =
    typeof window !== "undefined" &&
    (window as any).Capacitor?.isNativePlatform?.();

  const [visible, setVisible] = useState(isNative);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!isNative) return;
    const fadeTimer   = setTimeout(() => setFading(true),  650);
    const removeTimer = setTimeout(() => setVisible(false), 980);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [isNative]);

  if (!isNative || !visible) return null;

  const isDark = document.documentElement.classList.contains("dark");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: isDark ? "#0B0D10" : "#FFFFFF",
        transition: "opacity 0.32s cubic-bezier(0.4, 0, 0.2, 1)",
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? "none" : "auto",
      }}
    >
      <img
        src={isDark ? "/logo-dark-mode.png" : "/logo-full.png"}
        alt="Fermenta.to"
        style={{
          width: 160,
          height: "auto",
          animation: "splashLogoIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
        }}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    </div>
  );
}
