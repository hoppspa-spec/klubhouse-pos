"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type Role = "MASTER" | "SLAVE" | "SELLER";

export default function CashoutPage() {
  const r = useRouter();

  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<Role | null>(null);

  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      setUser(u);
      setRole(u?.role ?? null);
    } catch {
      setUser(null);
      setRole(null);
    }
  }, []);

  const canClose = role === "SELLER";

  async function loadPreview() {
    setErr(null);
    setOkMsg(null);
    try {
      const data = await api<any>("/cashouts/preview");
      setPreview(data);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "No pude cargar preview de caja.");
    }
  }

  useEffect(() => {
    if (!role) return;
    if (!canClose) return; // master/slave no entran acá
    loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  async function closeNow() {
    if (!canClose) return;
    setLoading(true);
    setErr(null);
    setOkMsg(null);
    try {
      await api("/cashouts/close", { method: "POST" });
      setOkMsg("✅ Caja cerrada. (guardado OK)");
      await loadPreview();
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "No pude cerrar caja.");
    } finally {
      setLoading(false);
    }
  }

  // Guard simple (UI)
  if (!user) {
    return (
      <div style={wrap()}>
        <div style={{ fontWeight: 900 }}>Cargando usuario...</div>
      </div>
    );
  }

  if (!canClose) {
    return (
      <div style={wrap()}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>Caja (mi turno)</div>
        <div style={{ marginTop: 10, color: "#bdbdbd" }}>
          Solo <b>SELLER</b> puede cerrar caja diaria.
        </div>
        <div style={{ marginTop: 14 }}>
          <a href="/tables" style={link()}>← Volver a mesas</a>
        </div>
      </div>
    );
  }

  return (
    <div style={wrap()}>
      <div style={topBar()}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 22 }}>Caja (mi turno)</div>
          <div style={{ color: "#bdbdbd", marginTop: 6, fontSize: 12 }}>
            Usuario: <b style={{ color: "#fff" }}>{user?.username ?? "?"}</b> · Rol: <b style={{ color: "#fff" }}>{role}</b>
          </div>
        </div>
        <a href="/tables" style={link()}>← Mesas</a>
      </div>

      {err && <div style={{ marginTop: 12, color: "#ff4d4d" }}>{err}</div>}
      {okMsg && <div style={{ marginTop: 12, color: "#7CFC00" }}>{okMsg}</div>}

      <div style={card()}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontWeight: 900 }}>Preview (hoy)</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button disabled={loading} onClick={loadPreview} style={btnSecondary()}>Refrescar</button>
            <button disabled={loading} onClick={closeNow} style={btnDanger()}>
              Cerrar caja ahora
            </button>
          </div>
        </div>

        <div style={{ marginTop: 12, color: "#bdbdbd", fontSize: 12 }}>
          * Este preview depende de lo que el backend calcule (ventas + arriendos del usuario / rango del día).
        </div>

        <pre
          style={{
            marginTop: 12,
            background: "#0b0b0b",
            border: "1px solid #222",
            borderRadius: 12,
            padding: 12,
            overflow: "auto",
            color: "#fff",
            fontSize: 12,
          }}
        >
          {JSON.stringify(preview, null, 2)}
        </pre>
      </div>
    </div>
  );
}

function wrap(): React.CSSProperties {
  return { minHeight: "100vh", background: "#060606", color: "#fff", padding: 20 };
}
function topBar(): React.CSSProperties {
  return { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" };
}
function card(): React.CSSProperties {
  return { marginTop: 16, background: "#0d0d0d", border: "1px solid #222", borderRadius: 16, padding: 14 };
}
function link(): React.CSSProperties {
  return { color: "#f5c400", fontWeight: 900, textDecoration: "none" };
}
function btnSecondary(): React.CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #444",
    background: "#111",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}
function btnDanger(): React.CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: 12,
    border: "none",
    background: "#ff4d4d",
    color: "#000",
    fontWeight: 900,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}
