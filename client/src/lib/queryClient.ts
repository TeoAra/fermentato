import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  path: string,
  options?: RequestInit,
  jsonBody?: unknown,
): Promise<any> {
  // Runtime validation for robust error handling
  if (options?.method && typeof options.method !== 'string') {
    console.warn('apiRequest: method should be string, got:', typeof options.method, options.method);
    // Prevent fetch error by removing invalid method
    const { method, ...cleanOptions } = options;
    options = { ...cleanOptions, method: 'GET' };
  }

  // Validate method is uppercase if provided
  const method = options?.method ? options.method.toUpperCase() : 'GET';
  
  // Handle different body types
  let body: BodyInit | undefined;
  let headers: HeadersInit = { ...options?.headers };
  
  if (jsonBody !== undefined) {
    // JSON body provided as separate parameter
    if (jsonBody instanceof FormData) {
      body = jsonBody;
      // Don't set Content-Type for FormData (browser sets it with boundary)
    } else {
      body = JSON.stringify(jsonBody);
      headers = { ...headers, 'Content-Type': 'application/json' };
    }
  } else if (options?.body) {
    // Body provided in options
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
  
  // Parse JSON if response has content
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
      staleTime: 0, // No caching for auth data
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
