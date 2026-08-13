import { QueryClient, QueryFunction } from "@tanstack/react-query";

// In Capacitor il frontend gira come asset bundlati (non dal server Express),
// quindi le chiamate relative /api/... vanno prefissate con l'URL del server.
// VITE_API_BASE_URL viene impostato a https://fermenta.to nel build Capacitor.
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || '';

function resolveUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE}${path}`;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const contentType = res.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      const json = await res.json().catch(() => null);
      if (json) {
        const error = new Error(json.message || res.statusText) as any;
        Object.assign(error, json);
        error.status = res.status;
        throw error;
      }
    }
    const text = (await res.text()) || res.statusText;
    const error = new Error(`${res.status}: ${text}`) as any;
    error.status = res.status;
    throw error;
  }
}

/**
 * Supports two calling conventions:
 *   apiRequest("POST", "/api/foo", body)          — legacy (method-first)
 *   apiRequest("/api/foo", { method: "POST" }, body) — new (path-first)
 */
export async function apiRequest(
  pathOrMethod: string,
  pathOrOptions?: string | RequestInit,
  jsonBodyOrOptions?: unknown,
): Promise<any> {
  let path: string;
  let options: RequestInit | undefined;
  let jsonBody: unknown;

  if (
    typeof pathOrMethod === 'string' &&
    (pathOrMethod === 'GET' || pathOrMethod === 'POST' || pathOrMethod === 'PUT' ||
     pathOrMethod === 'PATCH' || pathOrMethod === 'DELETE') &&
    typeof pathOrOptions === 'string'
  ) {
    // Legacy: apiRequest("POST", "/api/foo", bodyObj)
    path = pathOrOptions;
    options = { method: pathOrMethod };
    jsonBody = jsonBodyOrOptions;
  } else {
    // New: apiRequest("/api/foo", { method: "POST" }, bodyObj)
    path = pathOrMethod;
    options = pathOrOptions as RequestInit | undefined;
    jsonBody = jsonBodyOrOptions;
  }

  const method = options?.method ? (options.method as string).toUpperCase() : 'GET';

  let fetchBody: BodyInit | undefined;
  let headers: Record<string, string> = { ...(options?.headers as Record<string, string>) };

  if (jsonBody !== undefined) {
    if (jsonBody instanceof FormData) {
      fetchBody = jsonBody;
    } else {
      fetchBody = JSON.stringify(jsonBody);
      headers = { ...headers, 'Content-Type': 'application/json' };
    }
  } else if (options?.body) {
    if (options.body instanceof FormData) {
      fetchBody = options.body;
    } else if (typeof options.body === 'string') {
      fetchBody = options.body;
      if (!headers['Content-Type'] && !headers['content-type']) {
        headers = { ...headers, 'Content-Type': 'application/json' };
      }
    } else {
      fetchBody = JSON.stringify(options.body);
      headers = { ...headers, 'Content-Type': 'application/json' };
    }
  }

  const res = await fetch(resolveUrl(path), {
    ...options,
    method,
    headers,
    body: fetchBody,
    credentials: 'include',
  });

  await throwIfResNotOk(res);

  if (res.status !== 204 && res.headers.get('content-type')?.includes('application/json')) {
    return await res.json();
  }

  return null;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey, signal }) => {
    // Timeout: se il server non risponde entro 12s, tratta come non autenticato
    // (evita skeleton infinito quando il VPS è lento o la sessione è stale).
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort('timeout'), 12000);

    // Usa il signal di React Query (cancellazione query) OPPURE il nostro timeout
    const combinedSignal = signal ?? controller.signal;
    // Se arriva signal esterno, propagalo al nostro controller
    if (signal) {
      signal.addEventListener('abort', () => controller.abort(signal.reason));
    }

    let res: Response;
    try {
      res = await fetch(resolveUrl(queryKey.join("/")), {
        credentials: "include",
        signal: combinedSignal,
      });
    } catch (err: any) {
      clearTimeout(timeoutId);
      // Timeout o cancellazione: non crashare, ritorna null silenziosamente
      if (err?.name === 'AbortError' || String(err).includes('timeout')) {
        return null as any;
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      // If any authenticated API call returns 401, the session may have expired.
      // Invalidate the auth query so the app re-checks and, if unauthenticated,
      // clears cached user state and shows the login page immediately.
      const key = queryKey.join("/");
      if (!key.includes("/api/auth/user")) {
        // Use setTimeout to avoid invalidating during an active query cycle
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        }, 0);
      }
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Pause all queries when tab hidden — saves CPU/battery on mobile
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      queryClient.cancelQueries();
    }
  });
}
