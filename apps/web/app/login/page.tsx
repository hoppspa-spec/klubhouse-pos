"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const r = useRouter();
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setErr(null);
    setLoading(true);

    // ✅ limpia sesión anterior SIEMPRE
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
    } catch {}

    try {
      const out = await login(username.trim(), password);

      const token = out?.accessToken ?? out?.access_token;
      if (!token) throw new Error("Token inválido (no viene accessToken)");

      const user = out?.user ?? null;
      if (!user) throw new Error("Respuesta sin user");
      if (!user?.role) throw new Error("Usuario sin role (no puedo asignar permisos)");

      // ✅ compat: algunas partes leen token, otras accessToken
      localStorage.setItem("token", token);
      localStorage.setItem("accessToken", token);
      localStorage.setItem("user", JSON.stringify(user));

      r.replace("/tables");
    } catch (e) {
      console.error(e);
      try {
        localStorage.removeItem("token");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
      } catch {}
      setErr("Usuario o clave incorrecta (o sesión inválida).");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <form onSubmit={onSubmit} style={styles.card}>
        {/* LOGOS */}
        <div style={styles.logosRow}>
          <img src="/Logo-Klub.png" alt="Klub House" style={styles.logo} />
          <img src="/Logo-Club.png" alt="Billiard Club" style={styles.logo} />
        </div>

        {/* TITLE */}
        <div style={styles.titleWrap}>
          <div style={styles.title}>KLUB HOUSE · POS</div>
          <div style={styles.subtitle}>Ingreso de usuario</div>
        </div>

        {/* USER */}
        <div style={{ marginTop: 10 }}>
          <label style={styles.label}>Usuario</label>
          <input
            value={username}
            onChange={(e) => setU(e.target.value)}
            style={inp()}
            autoComplete="username"
          />
        </div>

        {/* PASS */}
        <div style={{ marginTop: 14 }}>
          <label style={styles.label}>Clave</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setP(e.target.value)}
            style={inp()}
            autoComplete="current-password"
          />
        </div>

        {err && <div style={styles.err}>{err}</div>}

        <button type="submit" disabled={loading} style={btn(loading)}>
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <div style={styles.footerId}>ID: klub_house_pool</div>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(800px 400px at 50% 0%, rgba(245,196,0,0.08), transparent 60%), #060606",
    color: "#fff",
    display: "grid",
    placeItems: "center",
    padding: 20,
  },
  card: {
    width: "min(420px, 100%)",
    background: "#0d0d0d",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: 26,
    boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
  },
  logosRow: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    marginBottom: 18,
  },
  logo: {
    height: "clamp(70px, 8vw, 90px)",
    width: "auto",
    objectFit: "contain",
  },
  titleWrap: { textAlign: "center", marginBottom: 18 },
  title: { fontWeight: 800, fontSize: 18 },
  subtitle: { color: "#9a9a9a", fontSize: 13, marginTop: 4 },
  label: { fontSize: 12, color: "#9a9a9a" },
  err: { marginTop: 12, color: "#ff4d4d", fontSize: 13 },
  footerId: { textAlign: "center", marginTop: 16, fontSize: 12, color: "#6f6f6f" },
};

function inp(): React.CSSProperties {
  return {
    width: "100%",
    marginTop: 6,
    padding: "11px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.25)",
    color: "#fff",
    outline: "none",
  };
}

function btn(disabled: boolean): React.CSSProperties {
  return {
    width: "100%",
    marginTop: 16,
    padding: "12px 14px",
    borderRadius: 16,
    border: "1px solid rgba(0,0,0,0.25)",
    background: "#f5c400",
    color: "#000",
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.7 : 1,
  };
}
