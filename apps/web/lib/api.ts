export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

function safeSnippet(s: string, max = 800) {
  if (!s) return "";
  return s.length > max ? s.slice(0, max) + "…(truncated)" : s;
}

export async function api<T>(path: string, opts: RequestInit = {}) {
  if (!API_URL) {
    // Esto te avisa altiro si Render no tiene NEXT_PUBLIC_API_URL
    throw new Error("NEXT_PUBLIC_API_URL no está configurado (API_URL vacío). Revisa variables en Render.");
  }

  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  const p = path.startsWith("/") ? path : `/${path}`;

  const headers = new Headers(opts.headers || {});

  // ✅ Solo setear JSON si realmente enviamos body (POST/PUT/PATCH)
  const method = (opts.method || "GET").toUpperCase();
  const hasBody = opts.body != null && method !== "GET" && method !== "HEAD";

  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${p}`, {
    ...opts,
    headers,
    cache: "no-store", // ✅ evita caché rara en Render/Edge
  });

  // ✅ Auto logout si token malo
  if (res.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const ct = res.headers.get("content-type") || "";
    let detail = "";

    // ✅ intenta leer json de error si existe
    if (ct.includes("application/json")) {
      try {
        const j = await res.json();
        detail = typeof j === "string" ? j : JSON.stringify(j);
      } catch {
        detail = "";
      }
    } else {
      detail = await res.text().catch(() => "");
    }

    throw new Error(`HTTP ${res.status} ${res.statusText} - ${safeSnippet(detail)}`);
  }

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return (await res.text()) as any;

  return (await res.json()) as T;
}

