"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type GroupBy = "day" | "week" | "month";

type SalesReport = {
  range: { from: string; to: string; groupBy: GroupBy };
  totals: { orders: number; gross: number };
  timeline: Array<{ bucket: string; orders: number; gross: number; cash: number; debit: number }>;
  topProducts: Array<{ productId: string; name: string; category: string; qty: number; gross: number }>;
};

function isoDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function fmtCLP(n: number) {
  try {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
  } catch {
    return `$${n}`;
  }
}

function fmtDate(s: string) {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString("es-CL");
}

export default function ReportsPage() {
  const [groupBy, setGroupBy] = useState<GroupBy>("day");
  const [days, setDays] = useState<number>(30);

  const [data, setData] = useState<SalesReport | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = useMemo(() => isoDaysAgo(days), [days]);
  const to = useMemo(() => new Date().toISOString(), []);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const q = new URLSearchParams({
        from,
        to,
        groupBy,
      }).toString();

      const out = await api<SalesReport>(`/reports/sales?${q}`);
      setData(out);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "No pude cargar reporte");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupBy, days]);

  return (
    <div style={{ minHeight: "100vh", background: "#060606", color: "#fff", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 22 }}>Control de ventas</div>
          <div style={{ color: "#bdbdbd", fontSize: 12, marginTop: 6 }}>
            Rango: últimos {days} días · Agrupación: {groupBy}
          </div>
        </div>

        <a href="/tables" style={{ color: "#f5c400", fontWeight: 900, textDecoration: "none" }}>
          ← Mesas
        </a>
      </div>

      {err && <div style={{ marginTop: 12, color: "#ff4d4d" }}>{err}</div>}

      {/* Controls */}
      <div style={{ marginTop: 16, background: "#0d0d0d", border: "1px solid #222", borderRadius: 16, padding: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontWeight: 900 }}>Agrupar</div>
          <button onClick={() => setGroupBy("day")} disabled={loading} style={groupBy === "day" ? btn() : btnSecondary()}>
            Diario
          </button>
          <button onClick={() => setGroupBy("week")} disabled={loading} style={groupBy === "week" ? btn() : btnSecondary()}>
            Semanal
          </button>
          <button onClick={() => setGroupBy("month")} disabled={loading} style={groupBy === "month" ? btn() : btnSecondary()}>
            Mensual
          </button>

          <div style={{ width: 12 }} />

          <div style={{ fontWeight: 900 }}>Rango</div>
          <button onClick={() => setDays(7)} disabled={loading} style={days === 7 ? btn() : btnSecondary()}>
            7 días
          </button>
          <button onClick={() => setDays(30)} disabled={loading} style={days === 30 ? btn() : btnSecondary()}>
            30 días
          </button>
          <button onClick={() => setDays(90)} disabled={loading} style={days === 90 ? btn() : btnSecondary()}>
            90 días
          </button>

          <button onClick={load} disabled={loading} style={{ ...btnSecondary(), marginLeft: "auto" }}>
            Refrescar
          </button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
        <Card title="Ventas (tickets pagados)" value={data ? String(data.totals.orders) : "—"} />
        <Card title="Total bruto" value={data ? fmtCLP(data.totals.gross) : "—"} />
        <Card
          title="Promedio por venta"
          value={data && data.totals.orders > 0 ? fmtCLP(Math.round(data.totals.gross / data.totals.orders)) : "—"}
        />
      </div>

      {/* Timeline */}
      <div style={{ marginTop: 16, background: "#0d0d0d", border: "1px solid #222", borderRadius: 16, padding: 14 }}>
        <div style={{ fontWeight: 900 }}>Timeline</div>
        <div style={{ color: "#bdbdbd", fontSize: 12, marginTop: 6 }}>
          {data ? `${fmtDate(data.range.from)} → ${fmtDate(data.range.to)}` : "—"}
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          {(data?.timeline ?? []).map((r) => (
            <div
              key={r.bucket}
              style={{
                border: "1px solid #222",
                borderRadius: 12,
                padding: 12,
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 900 }}>{fmtDate(r.bucket)}</div>
                <div style={{ color: "#bdbdbd", fontSize: 12, marginTop: 4 }}>
                  Ventas: <b>{r.orders}</b> · CASH: <b>{fmtCLP(r.cash)}</b> · DEBIT: <b>{fmtCLP(r.debit)}</b>
                </div>
              </div>
              <div style={{ fontWeight: 900, fontSize: 16 }}>{fmtCLP(r.gross)}</div>
            </div>
          ))}

          {(data?.timeline?.length ?? 0) === 0 && <div style={{ color: "#bdbdbd" }}>Sin ventas en el rango.</div>}
        </div>
      </div>

      {/* Top products */}
      <div style={{ marginTop: 16, background: "#0d0d0d", border: "1px solid #222", borderRadius: 16, padding: 14 }}>
        <div style={{ fontWeight: 900 }}>Top productos</div>
        <div style={{ color: "#bdbdbd", fontSize: 12, marginTop: 6 }}>Top 15 por monto vendido</div>

        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          {(data?.topProducts ?? []).map((p) => (
            <div
              key={p.productId}
              style={{
                border: "1px solid #222",
                borderRadius: 12,
                padding: 12,
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 900 }}>
                  {p.name} <span style={{ color: "#bdbdbd" }}>({p.category})</span>
                </div>
                <div style={{ color: "#bdbdbd", fontSize: 12, marginTop: 4 }}>
                  Cantidad: <b>{p.qty}</b>
                </div>
              </div>
              <div style={{ fontWeight: 900 }}>{fmtCLP(p.gross)}</div>
            </div>
          ))}

          {(data?.topProducts?.length ?? 0) === 0 && <div style={{ color: "#bdbdbd" }}>Sin datos.</div>}
        </div>
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div style={{ background: "#0d0d0d", border: "1px solid #222", borderRadius: 16, padding: 14 }}>
      <div style={{ color: "#bdbdbd", fontSize: 12 }}>{title}</div>
      <div style={{ fontWeight: 900, fontSize: 20, marginTop: 6 }}>{value}</div>
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
