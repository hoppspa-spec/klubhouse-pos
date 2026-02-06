"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";

type Role = "MASTER" | "SLAVE" | "SELLER";

export default function CashoutPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      setRole(u?.role ?? null);
    } catch {
      setRole(null);
    }
  }, []);

  const isSeller = role === "SELLER";
  const isManager = role === "MASTER" || role === "SLAVE";

  async function preview() {
    setLoading(true);
    setErr(null);
    try {
      const out = await api<any>(`/cashouts/preview`);
      setSummary(out);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "No pude previsualizar caja");
    } finally {
      setLoading(false);
    }
  }

  async function close() {
    setLoading(true);
    setErr(null);
    try {
      const out = await api<any>(`/cashouts/close`, { method: "POST" });
      setSummary(out);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "No pude cerrar caja");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#060606", color: "#fff", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 22 }}>Caja del turno</div>
          <div style={{ color: "#bdbdbd", marginTop: 6, fontSize: 12 }}>Rol: {role ?? "NO_ROLE"}</div>
        </div>
        <a href="/tables" style={{ color: "#f5c400", fontWeight: 900, textDecoration: "none" }}>
          ← Mesas
        </a>
      </div>

      {err && <div style={{ marginTop: 12, color: "#ff4d4d" }}>{err}</div>}

      <div style={{ marginTop: 16, background: "#0d0d0d", border: "1px solid #222", borderRadius: 16, padding: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button disabled={loading || !(isSeller || isManager)} onClick={preview} style={btnSecondary()}>
            Ver resumen de hoy
          </button>
          <button disabled={loading || !(isSeller || isManager)} onClick={close} style={btn()}>
            Cerrar caja (hoy)
          </button>
        </div>

        {summary && (
          <div style={{ marginTop: 14, color: "#bdbdbd", fontSize: 13 }}>
            <div>Rango: <b style={{ color: "#fff" }}>{summary.from}</b> → <b style={{ color: "#fff" }}>{summary.to}</b></div>
            <div style={{ marginTop: 6 }}>
              Movimientos: <b style={{ color: "#fff" }}>{summary.count}</b> · CASH: <b style={{ color: "#fff" }}>${summary.cash}</b> · DEBIT:{" "}
              <b style={{ color: "#fff" }}>${summary.debit}</b> · TOTAL: <b style={{ color: "#f5c400" }}>${summary.total}</b>
            </div>
          </div>
        )}

        {!isSeller && !isManager && (
          <div style={{ marginTop: 10, color: "#bdbdbd", fontSize: 12 }}>
            * Sin permisos para caja (V1).
          </div>
        )}
      </div>
    </div>
  );
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
