import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    const stored = localStorage.getItem("fermenta-theme") as Theme | null;
    if (stored === "dark" || stored === "light") return stored;
    return "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("fermenta-theme", theme);

    // Sync browser/PWA chrome (status bar color in Chrome Android, iOS Safari
    // address bar tint, Android task switcher header).
    const headerBg = theme === "dark" ? "#0F0F10" : "#FFFFFF";
    const meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (meta) meta.setAttribute("content", headerBg);

    // iOS PWA: in dark mode usiamo 'black-translucent' (icone bianche su
    // header scuro #0F0F10 esteso via env(safe-area-inset-top) → no stacco).
    // In light mode usiamo 'default' (barra opaca bianca con icone scure):
    // iOS la disegna del proprio bianco di sistema che combacia col bianco
    // dell'header, quindi visivamente non c'è gap. 'black-translucent' in
    // light mode renderebbe le icone bianche su sfondo bianco = invisibili.
    const iosMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]') as HTMLMetaElement | null;
    if (iosMeta) iosMeta.setAttribute("content", theme === "dark" ? "black-translucent" : "default");

    // Sync Capacitor native status bar (iOS + Android) when running in app
    if ((window as any).Capacitor?.isNativePlatform?.()) {
      import("@capacitor/status-bar").then(({ StatusBar, Style }) => {
        StatusBar.setStyle({ style: theme === "dark" ? Style.Light : Style.Dark }).catch(() => {});
        StatusBar.setBackgroundColor({ color: headerBg }).catch(() => {});
      }).catch(() => {});
    }
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);
  const toggleTheme = () => setThemeState(prev => (prev === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
