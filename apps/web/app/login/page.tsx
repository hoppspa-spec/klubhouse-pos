"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "../../lib/auth";

export default function LoginPage() {
  const r = useRouter();
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const out = await login(username, password);
      console.log("LOGIN OUT =>", out);

      // el backend devuelve access_token
      localStorage.setItem("accessToken", out.access_token);

      // opcional: si no estás devolviendo user, no lo guardes
      // localStorage.setItem("user", JSON.stringify(out.user));

      r.replace("/tables");
    } catch {
      setErr("Usuario o clave incorrecta.");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#060606", color: "#fff", display: "grid", placeItems: "center", padding: 20 }}>
      <form onSubmit={onSubmit} style={{ width: "min(420px, 100%)", background: "#0d0d0d", border: "2px solid #f5c400", borderRadius: 18, padding: 18 }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>KLUB HOUSE · POS</div>
        <div style={{ color: "#bdbdbd", fontSize: 12, marginTop: 6 }}>Ingreso de usuario</div>

        <div style={{ marginTop: 14 }}>
          <label style={{ fontSize: 12, color: "#bdbdbd" }}>Usuario</label>
          <input value={username} onChange={(e) => setU(e.target.value)} style={inp()} />
        </div>

        <div style={{ marginTop: 10 }}>
          <label style={{ fontSize: 12, color: "#bdbdbd" }}>Clave</label>
          <input type="password" value={password} onChange={(e) => setP(e.target.value)} style={inp()} />
        </div>

        {err && <div style={{ marginTop: 10, color: "#ff4d4d", fontSize: 13 }}>{err}</div>}

        <button type="submit" style={btn()}>Entrar</button>
      </form>
    </div>
  );
}

function inp(): React.CSSProperties {
  return {
    width: "100%",
    marginTop: 6,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #333",
    background: "#111",
    color: "#fff",
    outline: "none",
  };
}
function btn(): React.CSSProperties {
  return {
    width: "100%",
    marginTop: 14,
    padding: "12px 14px",
    borderRadius: 14,
    border: "none",
    background: "#f5c400",
    color: "#000",
    fontWeight: 900,
    cursor: "pointer",
  };
}
