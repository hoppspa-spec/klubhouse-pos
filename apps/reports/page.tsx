"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

type Role = "MASTER" | "SLAVE" | "SELLER";

type ReportRow = {
  paidAt: string;
  receiptNumber?: number;
  method: "CASH" | "DEBIT";
  totalAmount: number;
  ticketId: string;
  kind?: "RENTAL" | "BAR";
  tableName?: string;
  sellerName?: string;
};

export default function ReportsPage() {
  const [role, setRole] = useState<Role | null>(null);

  const [from, setFrom] = useState(() => isoDayStart(new Date()));
  const [to, setTo] = useState(() => isoNowPlus1min());

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      setRole(u?.role ?? null);
    } catch {
      setRole(null);
    }
  }, []);

  const isManager = role === "MASTER" || role === "SLAVE";

  const totals = useMemo(() => {
    const total = rows.reduce((a, r) => a + Number(r.totalAmount || 0), 0);
    const cash = rows.filter(r => r.method === "CASH").reduce((a, r) => a + Number(r.totalAmount || 0), 0);
    const debit = rows.filter(r => r.method === "DEBIT").reduce((a, r) => a + Number(r.totalAmount || 0), 0);
    return { total, cash, debit, count: rows.length };
  }, [rows]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const out = await api<{ rows: ReportRow[] }>(`/cashouts/list?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      setRows(out?.rows ?? []);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "No pude cargar reporte");
    } finally {
      setLoading(false);
    }
  }

  async function downloadCsv() {
    setErr(null);
    try {
      const csv = await api<string>(`/cashouts/csv?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `movimiento_${from.slice(0, 10)}_a_${to.slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "No pude descargar CSV");
    }
  }

  function quickRange(kind: "DAY" | "WEEK" | "MONTH") {
    const now = new Date();
    if (kind === "DAY") {
      setFrom(isoDayStart(now));
      setTo(isoNowPlus1min());
      return;
    }
    if (kind === "WEEK") {
      const d = new Date(now);
      const day = (d.getDay() + 6) % 7; // lunes=0
      d.setDate(d.getDate() - day);
      d.setHours(0, 0, 0, 0);
      setFrom(d.toISOString());
      setTo(isoNowPlus1min());
      return;
    }
    // MONTH
    const m = new Date(now);
    m.setDate(1);
    m.setHours(0, 0, 0, 0);
    setFrom(m.toISOString());
    setTo(isoNowPlus1min());
  }

  return (
    <div style={{ minHeight: "100vh", background: "#060606", color: "#fff", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 22 }}>Reportes</div>
          <div style={{ color: "#bdbdbd", fontSize: 12, marginTop: 4 }}>Rol: {role ?? "NO_ROLE"}</div>
        </div>
        <a href="/tables" style={{ color: "#f5c400", fontWeight: 900, textDecoration: "none" }}>
          ← Mesas
        </a>
      </div>

      {!isManager && (
        <div style={{ marginTop: 12, color: "#bdbdbd", fontSize: 12 }}>
          * Solo MASTER/SLAVE pueden ver reportes globales (V1).
        </div>
      )}

      {err && <div style={{ marginTop: 12, color: "#ff4d4d" }}>{err}</div>}

      <div style={{ marginTop: 14, background: "#0d0d0d", border: "1px solid #222", borderRadius: 16, padding: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button disabled={!isManager || loading} onClick={() => quickRange("DAY")} style={btnSecondary()}>Hoy</button>
          <button disabled={!isManager || loading} onClick={() => quickRange("WEEK")} style={btnSecondary()}>Semana</button>
          <button disabled={!isManager || loading} onClick={() => quickRange("MONTH")} style={btnSecondary()}>Mes</button>

          <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input disabled={!isManager || loading} value={from} onChange={(e) => setFrom(e.target.value)} style={inpWide()} />
            <input disabled={!isManager || loading} value={to} onChange={(e) => setTo(e.target.value)} style={inpWide()} />
            <button disabled={!isManager || loading} onClick={load} style={btn()}>Consultar</button>
            <button disabled={!isManager || loading || rows.length === 0} onClick={downloadCsv} style={btnSecondary()}>
              Descargar CSV
            </button>
          </div>
        </div>

        <div style={{ marginTop: 12, color: "#bdbdbd", fontSize: 12 }}>
          Movimientos: <b style={{ color: "#fff" }}>{totals.count}</b> · CASH: <b style={{ color: "#fff" }}>${totals.cash}</b> · DEBIT:{" "}
          <b style={{ color: "#fff" }}>${totals.debit}</b> · TOTAL: <b style={{ color: "#f5c400" }}>${totals.total}</b>
        </div>
      </div>

      <div style={{ marginTop: 14, background: "#0d0d0d", border: "1px solid #222", borderRadius: 16, padding: 14 }}>
        <div style={{ fontWeight: 900 }}>Detalle</div>

        {rows.length === 0 ? (
          <div style={{ marginTop: 10, color: "#bdbdbd" }}>Sin movimientos en el rango.</div>
        ) : (
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {rows.map((r, idx) => (
              <div key={idx} style={{ border: "1px solid #222", borderRadius: 14, padding: 12, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900 }}>
                    ${r.totalAmount} · {r.method}{" "}
                    <span style={{ color: "#bdbdbd", fontWeight: 700 }}>
                      · {new Date(r.paidAt).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ color: "#bdbdbd", fontSize: 12, marginTop: 4 }}>
                    Ticket: {r.ticketId}
                    {r.tableName ? ` · ${r.tableName}` : ""}
                    {r.kind ? ` · ${r.kind}` : ""}
                    {r.sellerName ? ` · ${r.sellerName}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function isoDayStart(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}
function isoNowPlus1min() {
  const x = new Date(Date.now() + 60_000);
  return x.toISOString();
}

function inpWide(): React.CSSProperties {
  return {
    width: "min(260px, 100%)",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #333",
    background: "#111",
    color: "#fff",
    outline: "none",
    fontFamily: "monospace",
    fontSize: 12,
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
