import { QueryClient, QueryFunction } from "@tanstack/react-query";

/** セッション切れ（401）: ローカルのログイン情報を捨ててログイン画面へ */
export function handleUnauthorized() {
  const wasCoach = !!localStorage.getItem("coachData");
  const wasAdmin = !!localStorage.getItem("adminData");
  localStorage.removeItem("coachData");
  localStorage.removeItem("playerData");
  localStorage.removeItem("adminData");
  const target = wasAdmin ? "/admins/login" : wasCoach ? "/login" : "/";
  if (window.location.pathname !== target) window.location.href = target;
}

/** サーバー側セッションを破棄する（ログアウト時に呼ぶ） */
export async function serverLogout() {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  } catch {
    /* ignore */
  }
}

async function throwIfResNotOk(res: Response) {
  if (res.status === 401 && !isAuthEndpoint(res.url)) {
    handleUnauthorized();
  }
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

function isAuthEndpoint(url: string) {
  return /\/api\/(coach|student|admin)\/(login|register)|\/api\/teams\/register|\/api\/auth\//.test(url);
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
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

    if (res.status === 401) {
      handleUnauthorized();
      if (unauthorizedBehavior === "returnNull") return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
