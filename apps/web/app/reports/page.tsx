"use client";

import { useEffect, useMemo, useState } from "react";
import { api, API_URL } from "@/lib/api";

type Role = "MASTER" | "SLAVE" | "SELLER";

type Summary = {
  range: { from: string; to: string };
  countPayments: number;
  totalSales: number;
  rentalAmountTotal: number;
  barAmountTotal: number;
  byMethod: Record<string, number>;
};

type TopProduct = {
  productId: string;
  name: string;
  category: string;
  qty: number;
  amount: number;
};

type RentalsResp = {
  range: { from: string; to: string };
  count: number;
  byTable: Record<string, number>;
  rows: Array<{
    paidAt: string;
    method: string;
    receiptNumber: number;
    ticketId: string;
    table: string;
    minutesPlayed: number | null;
    rentalAmount: number;
    totalAmount: number;
    openedBy: string | null;
  }>;
};

function isoDate(d: Date) {
  // yyyy-mm-dd
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ReportsPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [from, setFrom] = useState(() => isoDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)));
  const [to, setTo] = useState(() => isoDate(new Date()));

  const [summary, setSummary] = useState<Summary | null>(null);
  const [top, setTop] = useState<TopProduct[]>([]);
  const [rentals, setRentals] = useState<RentalsResp | null>(null);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      setRole(u?.role ?? null);
    } catch {
      setRole(null);
    }
  }, []);

  const canView = role === "MASTER" || role === "SLAVE";

  const qs = useMemo(() => {
    // mandamos rango como ISO “seguro”
    const fromIso = `${from}T00:00:00.000Z`;
    const toIso = `${to}T23:59:59.999Z`;
    return `from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`;
  }, [from, to]);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const [s, tp, r] = await Promise.all([
        api<Summary>(`/reports/summary?${qs}`),
        api<TopProduct[]>(`/reports/top-products?${qs}`),
        api<RentalsResp>(`/reports/rentals?${qs}`),
      ]);
      setSummary(s);
      setTop(tp);
      setRentals(r);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "No pude cargar reportes");
    } finally {
      setLoading(false);
    }
  }

  async function downloadCSV() {
    setErr(null);
    try {
      // api() te devuelve text si no es JSON, así que sirve perfecto
      const csv = await api<string>(`/reports/csv?${qs}`);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `report_${from}_a_${to}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "No pude descargar CSV");
    }
  }

  useEffect(() => {
    if (canView) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  if (role == null) {
    return <div style={wrap()}>Cargando…</div>;
  }

  if (!canView) {
    return (
      <div style={wrap()}>
        <h2 style={{ marginTop: 0 }}>Reportes</h2>
        <div style={{ color: "#ff4d4d" }}>No autorizado. (Solo MASTER/SLAVE)</div>
        <a href="/tables" style={link()}>← Mesas</a>
      </div>
    );
  }

  return (
    <div style={wrap()}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>Reportes</h2>
          <div style={{ color: "#bdbdbd", fontSize: 12, marginTop: 6 }}>
            Rango: <b>{from}</b> a <b>{to}</b>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <a href="/tables" style={link()}>← Mesas</a>
        </div>
      </div>

      {err && <div style={{ marginTop: 12, color: "#ff4d4d" }}>{err}</div>}

      <div style={card()}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <div>
            <div style={lbl()}>Desde</div>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={inp()} />
          </div>
          <div>
            <div style={lbl()}>Hasta</div>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={inp()} />
          </div>
          <button disabled={loading} onClick={load} style={btn()}>
            {loading ? "Cargando..." : "Refrescar"}
          </button>
          <button disabled={loading} onClick={downloadCSV} style={btnSecondary()}>
            Descargar CSV
          </button>
        </div>
      </div>

      {/* Summary */}
      <div style={card()}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Resumen</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
          <div style={mini()}>
            <div style={miniLbl()}>Pagos</div>
            <div style={miniVal()}>{summary?.countPayments ?? 0}</div>
          </div>
          <div style={mini()}>
            <div style={miniLbl()}>Total ventas</div>
            <div style={miniVal()}>${summary?.totalSales ?? 0}</div>
          </div>
          <div style={mini()}>
            <div style={miniLbl()}>Total arriendos</div>
            <div style={miniVal()}>${summary?.rentalAmountTotal ?? 0}</div>
          </div>
          <div style={mini()}>
            <div style={miniLbl()}>Por método</div>
            <div style={{ color: "#bdbdbd", fontSize: 12, marginTop: 6 }}>
              {summary?.byMethod
                ? Object.entries(summary.byMethod)
                    .map(([k, v]) => `${k}: $${v}`)
                    .join(" · ")
                : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Rentals by table */}
      <div style={card()}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Arriendos por mesa</div>
        {rentals?.byTable ? (
          <div style={{ display: "grid", gap: 8 }}>
            {Object.entries(rentals.byTable)
              .sort((a, b) => (b[1] as number) - (a[1] as number))
              .map(([table, amt]) => (
                <div key={table} style={{ display: "flex", justifyContent: "space-between", border: "1px solid #222", borderRadius: 12, padding: 10 }}>
                  <div style={{ fontWeight: 900 }}>{table}</div>
                  <div style={{ fontWeight: 900 }}>${amt}</div>
                </div>
              ))}
          </div>
        ) : (
          <div style={{ color: "#bdbdbd" }}>—</div>
        )}
      </div>

      {/* Top products */}
      <div style={card()}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Top productos</div>
        {top.length === 0 ? (
          <div style={{ color: "#bdbdbd" }}>Sin datos en este rango.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {top.slice(0, 30).map((p) => (
              <div key={p.productId} style={{ display: "flex", justifyContent: "space-between", gap: 10, border: "1px solid #222", borderRadius: 12, padding: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900 }}>{p.name}</div>
                  <div style={{ color: "#bdbdbd", fontSize: 12 }}>{p.category}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 900 }}>Qty: {p.qty}</div>
                  <div style={{ color: "#bdbdbd", fontSize: 12 }}>${p.amount}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* styles */
function wrap(): React.CSSProperties {
  return { minHeight: "100vh", background: "#060606", color: "#fff", padding: 20 };
}
function card(): React.CSSProperties {
  return { marginTop: 14, background: "#0d0d0d", border: "1px solid #222", borderRadius: 16, padding: 14 };
}
function inp(): React.CSSProperties {
  return { padding: "10px 12px", borderRadius: 12, border: "1px solid #333", background: "#111", color: "#fff", outline: "none" };
}
function lbl(): React.CSSProperties {
  return { color: "#bdbdbd", fontSize: 12, marginBottom: 6 };
}
function btn(): React.CSSProperties {
  return { padding: "10px 14px", borderRadius: 12, border: "none", background: "#f5c400", color: "#000", fontWeight: 900, cursor: "pointer" };
}
function btnSecondary(): React.CSSProperties {
  return { padding: "10px 14px", borderRadius: 12, border: "1px solid #444", background: "#111", color: "#fff", fontWeight: 900, cursor: "pointer" };
}
function link(): React.CSSProperties {
  return { color: "#f5c400", fontWeight: 900, textDecoration: "none" };
}
function mini(): React.CSSProperties {
  return { border: "1px solid #222", borderRadius: 12, padding: 10, background: "#111" };
}
function miniLbl(): React.CSSProperties {
  return { color: "#bdbdbd", fontSize: 12 };
}
function miniVal(): React.CSSProperties {
  return { fontWeight: 900, fontSize: 18, marginTop: 6 };
}
