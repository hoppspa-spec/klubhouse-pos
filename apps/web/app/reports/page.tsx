"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type Role = "MASTER" | "SLAVE" | "SELLER";

export default function ReportsPage() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<Role | null>(null);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const canWatch = role === "MASTER" || role === "SLAVE";

  async function load() {
    if (!canWatch) return;
    setLoading(true);
    setErr(null);
    try {
      const qs = new URLSearchParams();
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);

      const out = await api<any>(`/cashouts/list${qs.toString() ? `?${qs.toString()}` : ""}`);
      setData(out);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "No pude cargar reportes.");
    } finally {
      setLoading(false);
    }
  }

  async function downloadCsv() {
    if (!canWatch) return;
    setLoading(true);
    setErr(null);
    try {
      const qs = new URLSearchParams();
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);

      const csv = await api<string>(`/cashouts/csv${qs.toString() ? `?${qs.toString()}` : ""}`);

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `cashouts_${from || "all"}_${to || "all"}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "No pude descargar CSV.");
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return <div style={wrap()}><div style={{ fontWeight: 900 }}>Cargando usuario...</div></div>;
  }

  if (!canWatch) {
    return (
      <div style={wrap()}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>Reportes</div>
        <div style={{ marginTop: 10, color: "#bdbdbd" }}>
          Solo <b>MASTER/SLAVE</b> pueden ver reportes.
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
          <div style={{ fontWeight: 900, fontSize: 22 }}>Reportes</div>
          <div style={{ color: "#bdbdbd", marginTop: 6, fontSize: 12 }}>
            Rol: <b style={{ color: "#fff" }}>{role}</b>
          </div>
        </div>
        <a href="/tables" style={link()}>← Mesas</a>
      </div>

      {err && <div style={{ marginTop: 12, color: "#ff4d4d" }}>{err}</div>}

      <div style={card()}>
        <div style={{ fontWeight: 900 }}>Caja / cierres (rango)</div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="from (YYYY-MM-DD)" style={inp()} />
          <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="to (YYYY-MM-DD)" style={inp()} />

          <button disabled={loading} onClick={load} style={btnSecondary()}>
            Consultar
          </button>
          <button disabled={loading} onClick={downloadCsv} style={btn()}>
            Descargar CSV
          </button>
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
          {JSON.stringify(data, null, 2)}
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
function inp(): React.CSSProperties {
  return {
    width: "min(220px, 100%)",
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
    padding: "10px 14px",
    borderRadius: 12,
    border: "none",
    background: "#f5c400",
    color: "#000",
    fontWeight: 900,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
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
