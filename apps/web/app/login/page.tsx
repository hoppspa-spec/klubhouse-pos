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
      {/* ambient accents (subtle, no neon) */}
      <div style={styles.glowTopLeft} />
      <div style={styles.glowBottom} />

      <form onSubmit={onSubmit} style={styles.card}>
        {/* top brand row */}
        <div style={styles.topRow}>
          <img src="/logo-klub.png" alt="Klub House" style={styles.logoLeft} />
          <div style={styles.brandCenter}>
            <div style={styles.title}>KLUB HOUSE · POS</div>
            <div style={styles.subtitle}>Ingreso de usuario</div>
          </div>
          <img src="/logo-club.png" alt="Billiard Club" style={styles.logoRight} />
        </div>

        {/* inputs */}
        <div style={{ marginTop: 14 }}>
          <label style={styles.label}>Usuario</label>
          <input
            value={username}
            onChange={(e) => setU(e.target.value)}
            style={inp()}
            autoComplete="username"
            placeholder="ej: seller1"
          />
        </div>

        <div style={{ marginTop: 10 }}>
          <label style={styles.label}>Clave</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setP(e.target.value)}
            style={inp()}
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </div>

        {err && <div style={styles.err}>{err}</div>}

        <button type="submit" disabled={loading} style={btn(loading)}>
          {loading ? "Entrando..." : "Entrar"}
        </button>

        {/* footer id */}
        <div style={styles.footer}>
          <span style={styles.footerLabel}>ID:</span> <span style={styles.footerValue}>klub_house_pool</span>
        </div>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0b0b0c", // anti-fatigue (not pure black)
    color: "#eaeaea",
    display: "grid",
    placeItems: "center",
    padding: 20,
    position: "relative",
    overflow: "hidden",
  },
  glowTopLeft: {
    position: "absolute",
    width: 520,
    height: 520,
    left: -180,
    top: -220,
    background: "radial-gradient(circle, rgba(245,196,0,0.14), rgba(245,196,0,0) 60%)",
    filter: "blur(2px)",
    pointerEvents: "none",
  },
  glowBottom: {
    position: "absolute",
    width: 820,
    height: 420,
    left: "50%",
    transform: "translateX(-50%)",
    bottom: -260,
    background: "radial-gradient(circle, rgba(245,196,0,0.10), rgba(245,196,0,0) 65%)",
    pointerEvents: "none",
  },
  card: {
    width: "min(460px, 100%)",
    background: "rgba(14,14,14,0.86)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 20,
    padding: 18,
    boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
    backdropFilter: "blur(10px)",
    position: "relative",
  },
  topRow: {
    display: "grid",
    gridTemplateColumns: "64px 1fr 64px",
    alignItems: "center",
    gap: 10,
  },
  logoLeft: { width: 58, height: "auto", opacity: 0.95, justifySelf: "start" },
  logoRight: { width: 58, height: "auto", opacity: 0.95, justifySelf: "end" },
  brandCenter: { textAlign: "center", display: "grid", gap: 3 },
  title: { fontWeight: 820, fontSize: 16, letterSpacing: 0.6, color: "#f3f3f3" },
  subtitle: { fontSize: 12, color: "rgba(234,234,234,0.75)" },
  label: { fontSize: 12, color: "rgba(234,234,234,0.72)" },
  err: {
    marginTop: 10,
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,77,77,0.22)",
    background: "rgba(255,77,77,0.08)",
    color: "#ff9a9a",
    fontSize: 13,
  },
  footer: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 12,
    color: "rgba(234,234,234,0.55)",
  },
  footerLabel: { opacity: 0.8 },
  footerValue: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", opacity: 0.95 },
};

function inp(): React.CSSProperties {
  return {
    width: "100%",
    marginTop: 6,
    padding: "11px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "#151515", // easier on eyes than #111
    color: "#eaeaea",
    outline: "none",
    fontSize: 14,
  };
}

function btn(disabled: boolean): React.CSSProperties {
  return {
    width: "100%",
    marginTop: 14,
    padding: "12px 14px",
    borderRadius: 16,
    border: "1px solid rgba(0,0,0,0.25)",
    background: "#f5c400",
    color: "#0b0b0c",
    fontWeight: 850,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.7 : 1,
    letterSpacing: 0.3,
  };
}
