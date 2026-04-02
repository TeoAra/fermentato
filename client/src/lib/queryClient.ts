import { QueryClient, QueryFunction } from "@tanstack/react-query";

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

  const res = await fetch(path, {
    ...options,
    method,
    headers,
    body: fetchBody,
    credentials: 'include',
  });

  await throwIfResNotOk(res);

  // Dopo ogni mutazione, svuota le voci corrispondenti nella cache del Service Worker.
  // Il SW intercetta /api/pubs, /api/beers, /api/breweries con stale-while-revalidate:
  // senza questa pulizia il refetch di React Query otterrebbe dati vecchi dal SW.
  if (method !== 'GET' && navigator.serviceWorker?.controller) {
    const sw = navigator.serviceWorker.controller;
    // Estrai la radice del path (es. /api/beers/123/image → /api/beers/123)
    const parts = path.split('/').filter(Boolean); // ['api','beers','123','image']
    // Invalida fino al terzo segmento per coprire sia la lista che il dettaglio
    const prefixes = new Set<string>();
    if (parts.length >= 2) prefixes.add('/' + parts.slice(0, 2).join('/')); // /api/beers
    if (parts.length >= 3) prefixes.add('/' + parts.slice(0, 3).join('/')); // /api/beers/123
    prefixes.forEach(prefix => sw.postMessage({ type: 'INVALIDATE_CACHE', prefix }));
  }

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
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
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
