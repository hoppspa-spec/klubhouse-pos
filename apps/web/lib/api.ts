export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

function getAuthToken() {
  if (typeof window === "undefined") return null;

  // ✅ Canon: "token"
  const t = localStorage.getItem("token");
  if (t) return t;

  // ✅ Back-compat: si venías usando accessToken, lo seguimos aceptando
  return localStorage.getItem("accessToken");
}

export async function api<T>(path: string, opts: RequestInit = {}) {
  const token = getAuthToken();
  const p = path.startsWith("/") ? path : `/${path}`;

  const headers = new Headers(opts.headers || {});
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${p}`, { ...opts, headers });

  // ✅ anti-loop: si ya estás en /login, NO redirijas de nuevo
  if (res.status === 401 && typeof window !== "undefined") {
    // limpia ambas keys para evitar sesión pegada
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");

    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }

    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} - ${text}`);
  }

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return (await res.text()) as any;

  return (await res.json()) as T;
}
