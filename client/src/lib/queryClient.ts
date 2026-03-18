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

export async function apiRequest(
  path: string,
  options?: RequestInit,
  jsonBody?: unknown,
): Promise<any> {
  if (options?.method && typeof options.method !== 'string') {
    console.warn('apiRequest: method should be string, got:', typeof options.method, options.method);
    const { method, ...cleanOptions } = options;
    options = { ...cleanOptions, method: 'GET' };
  }

  const method = options?.method ? options.method.toUpperCase() : 'GET';
  
  let body: BodyInit | undefined;
  let headers: Record<string, string> = { ...(options?.headers as Record<string, string>) };
  
  if (jsonBody !== undefined) {
    if (jsonBody instanceof FormData) {
      body = jsonBody;
    } else {
      body = JSON.stringify(jsonBody);
      headers = { ...headers, 'Content-Type': 'application/json' };
    }
  } else if (options?.body) {
    if (options.body instanceof FormData) {
      body = options.body;
    } else if (typeof options.body === 'string') {
      body = options.body;
      if (!headers['Content-Type'] && !headers['content-type']) {
        headers = { ...headers, 'Content-Type': 'application/json' };
      }
    } else {
      body = JSON.stringify(options.body);
      headers = { ...headers, 'Content-Type': 'application/json' };
    }
  }

  const res = await fetch(path, {
    ...options,
    method,
    headers,
    body,
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
