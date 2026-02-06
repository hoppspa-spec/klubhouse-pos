"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type Role = "MASTER" | "SLAVE" | "SELLER";
type Range = "DAY" | "WEEK" | "MONTH";

type ReportsSummary = {
  range: Range;
  from: string;
  to: string;

  rentalsCount: number;
  rentalsMinutes: number;
  rentalsAmount: number;

  productsAmount: number;
  topProducts: { name: string; qty: number; amount: number }[];
};

export default function ReportsPage() {
  const r = useRouter();

  const [user, setUser] = useState<{ role: Role; name?: string; username?: string } | null>(null);
  const role = user?.role;

  const isManager = role === "MASTER" || role === "SLAVE";

  const [range, setRange] = useState<Range>("DAY");
  const [data, setData] = useState<ReportsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    try {
      const u = localStorage.getItem("user");
      setUser(u ? JSON.parse(u) : null);
    } catch {
      setUser(null);
    }
  }, []);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      // si no tienes este endpoint aún, igual compila y verás error bonito
      const out = await api<ReportsSummary>(`/reports/summary?range=${range}`);
      setData(out);
    } catch (e: any) {
      console.error(e);
      setData(null);
      setErr(e?.message || "No pude cargar reportes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    if (!isManager) return; // seller no entra
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, range]);

  if (!user) {
    return <div style={{ minHeight: "100vh", background: "#060606", color: "#fff", padding: 20 }}>Cargando…</div>;
  }

  if (!isManager) {
    return (
      <div style={{ minHeight: "100vh", background: "#060606", color: "#fff", padding: 20 }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>Control & Estadísticas</div>
        <div style={{ marginTop: 8, color: "#bdbdbd" }}>
          Este módulo es solo para <b>ADMIN/MANAGER</b>.
        </div>
        <button onClick={() => r.replace("/tables")} style={btnSecondary()}>
          ← Volver
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#060606", color: "#fff", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 22 }}>📊 Control & Estadísticas</div>
          <div style={{ color: "#bdbdbd", fontSize: 12, marginTop: 6 }}>
            {user?.name || user?.username || "Usuario"} · <b>{role}</b>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a href="/tables" style={linkPill()}>
            ← Mesas
          </a>
          <button onClick={load} disabled={loading} style={btnSecondary()}>
            Refrescar
          </button>
        </div>
      </div>

      {err && <div style={{ marginTop: 12, color: "#ff4d4d" }}>{err}</div>}

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={() => setRange("DAY")} disabled={loading} style={range === "DAY" ? btn() : btnSecondary()}>
          Diario
        </button>
        <button onClick={() => setRange("WEEK")} disabled={loading} style={range === "WEEK" ? btn() : btnSecondary()}>
          Semanal
        </button>
        <button onClick={() => setRange("MONTH")} disabled={loading} style={range === "MONTH" ? btn() : btnSecondary()}>
          Mensual
        </button>
      </div>

      {/* Cards */}
      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
        <div style={card()}>
          <div style={cardTitle()}>Arriendos</div>
          <div style={cardBig()}>{data?.rentalsCount ?? "—"}</div>
          <div style={cardMeta()}>Cantidad</div>
        </div>

        <div style={card()}>
          <div style={cardTitle()}>Minutos</div>
          <div style={cardBig()}>{data?.rentalsMinutes ?? "—"}</div>
          <div style={cardMeta()}>Tiempo total</div>
        </div>

        <div style={card()}>
          <div style={cardTitle()}>$ Arriendos</div>
          <div style={cardBig()}>${data?.rentalsAmount ?? "—"}</div>
          <div style={cardMeta()}>Total arriendo</div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
        <div style={card()}>
          <div style={cardTitle()}>$ Productos</div>
          <div style={cardBig()}>${data?.productsAmount ?? "—"}</div>
          <div style={cardMeta()}>Total ventas productos</div>
        </div>

        <div style={card()}>
          <div style={cardTitle()}>Top productos</div>
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {(data?.topProducts || []).slice(0, 8).map((p, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <b>{p.name}</b>
                </div>
                <div style={{ color: "#bdbdbd" }}>
                  {p.qty}u · <b>${p.amount}</b>
                </div>
              </div>
            ))}
            {(data?.topProducts || []).length === 0 && <div style={{ color: "#bdbdbd" }}>—</div>}
          </div>
        </div>
      </div>

      {data?.from && data?.to && (
        <div style={{ marginTop: 10, color: "#bdbdbd", fontSize: 12 }}>
          Rango: {new Date(data.from).toLocaleString()} → {new Date(data.to).toLocaleString()}
        </div>
      )}
    </div>
  );
}

function card(): React.CSSProperties {
  return {
    background: "#0d0d0d",
    border: "1px solid #222",
    borderRadius: 16,
    padding: 14,
  };
}
function cardTitle(): React.CSSProperties {
  return { fontWeight: 900, color: "#bdbdbd", fontSize: 12 };
}
function cardBig(): React.CSSProperties {
  return { fontWeight: 900, fontSize: 22, marginTop: 8 };
}
function cardMeta(): React.CSSProperties {
  return { color: "#bdbdbd", fontSize: 12, marginTop: 6 };
}
function linkPill(): React.CSSProperties {
  return {
    color: "#f5c400",
    fontWeight: 900,
    textDecoration: "none",
    border: "1px solid #f5c400",
    padding: "8px 12px",
    borderRadius: 12,
    background: "#0d0d0d",
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
