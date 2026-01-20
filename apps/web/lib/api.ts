export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

export async function api<T>(path: string, opts: RequestInit = {}) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  // asegura "/ruta"
  const p = path.startsWith("/") ? path : `/${path}`;

  const headers = new Headers(opts.headers || {});
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${p}`, { ...opts, headers });

  // Si falla, muestra el body para ver el error real del backend
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} - ${text}`);
  }

  // Por si alguna ruta devuelve 204 o vacío
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return (await res.text()) as any;

  return (await res.json()) as Promise<T>;
}