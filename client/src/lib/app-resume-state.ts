const STORAGE_KEY = "fermenta:app-resume:v1";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type AppResumeState = {
  url: string;
  scrollY: number;
  updatedAt: number;
};

const EXCLUDED_PATHS = [
  "/login",
  "/auth",
  "/onboarding",
  "/admin",
  "/dashboard",
  "/brewery-dashboard",
  "/festival-dashboard",
  "/festival",
  "/registra-pub",
  "/pub-registration",
  "/become-publican",
  "/attiva-pub",
  "/registra-festival",
  "/reset-password",
  "/account/delete",
  "/microblog/nuovo",
  "/scan",
  "/tv",
  "/festival-tv",
];

function parseLocalUrl(url: string): URL | null {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin ? parsed : null;
  } catch {
    return null;
  }
}

export function isSafeResumeUrl(url: string): boolean {
  const parsed = parseLocalUrl(url);
  if (!parsed || !parsed.pathname.startsWith("/")) return false;

  return !EXCLUDED_PATHS.some(
    (path) => parsed.pathname === path || parsed.pathname.startsWith(`${path}/`),
  );
}

export function currentResumeUrl(): string {
  return `${window.location.pathname}${window.location.search}`;
}

export function readAppResumeState(now = Date.now()): AppResumeState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const value = JSON.parse(raw) as Partial<AppResumeState>;
    if (
      typeof value.url !== "string" ||
      typeof value.scrollY !== "number" ||
      !Number.isFinite(value.scrollY) ||
      typeof value.updatedAt !== "number" ||
      !Number.isFinite(value.updatedAt) ||
      value.updatedAt > now + 60_000 ||
      now - value.updatedAt > MAX_AGE_MS ||
      !isSafeResumeUrl(value.url)
    ) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return {
      url: value.url,
      scrollY: Math.max(0, Math.round(value.scrollY)),
      updatedAt: value.updatedAt,
    };
  } catch {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    return null;
  }
}

export function saveAppResumeState(url: string, scrollY: number): void {
  if (!isSafeResumeUrl(url)) return;

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        url,
        scrollY: Math.max(0, Math.round(scrollY)),
        updatedAt: Date.now(),
      } satisfies AppResumeState),
    );
  } catch {}
}