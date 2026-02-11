"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type Role = "MASTER" | "SLAVE" | "SELLER";

type Preview = {
  from: string;
  to: string;
  orders: number;
  totalCash: number;
  totalDebit: number;
  total: number;
};

export default function CashoutPage() {
  const r = useRouter();

  const [role, setRole] = useState<Role | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      setRole(u?.role ?? null);
    } catch {
      setRole(null);
    }
  }, []);

  async function loadPreview() {
    setErr(null);
    try {
      const p = await api<Preview>("/cashouts/me/preview");
      setPreview(p);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "No pude cargar preview");
    }
  }

  useEffect(() => {
    if (role === "SELLER") loadPreview();
  }, [role]);

  async function closeTurn() {
    if (loading) return;
    setLoading(true);
    setErr(null);
    try {
      await api("/cashouts/me/close", { method: "POST" });
      await loadPreview();
      // vuelve a mesas
      setTimeout(() => r.replace("/tables"), 250);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "No pude cerrar caja");
    } finally {
      setLoading(false);
    }
  }

  if (!role) {
    return <div style={{ minHeight: "100vh", background: "#060606", color: "#fff", padding: 20 }}>Cargando…</div>;
  }

  if (role !== "SELLER") {
    return (
      <div style={{ minHeight: "100vh", background: "#060606", color: "#fff", padding: 20 }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>Caja (mi turno)</div>
        <div style={{ marginTop: 10, color: "#bdbdbd" }}>
          Esta pantalla es solo para <b>SELLER</b>.
        </div>
        <a href="/tables" style={{ color: "#f5c400", fontWeight: 900, textDecoration: "none", display: "inline-block", marginTop: 14 }}>
          ← Volver a mesas
        </a>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#060606", color: "#fff", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 22 }}>Caja (mi turno)</div>
          <div style={{ color: "#bdbdbd", fontSize: 12, marginTop: 6 }}>Cierre rápido para vendedor</div>
        </div>

        <a href="/tables" style={{ color: "#f5c400", fontWeight: 900, textDecoration: "none" }}>
          ← Mesas
        </a>
      </div>

      {err && <div style={{ marginTop: 12, color: "#ff4d4d" }}>{err}</div>}

      <div style={{ marginTop: 16, background: "#0d0d0d", border: "1px solid #222", borderRadius: 16, padding: 14 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Resumen del turno</div>

        {!preview ? (
          <div style={{ color: "#bdbdbd" }}>Cargando resumen…</div>
        ) : (
          <>
            <div style={{ color: "#bdbdbd", fontSize: 12 }}>
              Desde: <b style={{ color: "#fff" }}>{new Date(preview.from).toLocaleString()}</b>
              {" · "}
              Hasta: <b style={{ color: "#fff" }}>{new Date(preview.to).toLocaleString()}</b>
            </div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
              <Kpi label="Boletas" value={preview.orders} />
              <Kpi label="Cash" value={`$${preview.totalCash}`} />
              <Kpi label="Débito" value={`$${preview.totalDebit}`} />
              <Kpi label="Total" value={`$${preview.total}`} highlight />
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button disabled={loading} onClick={loadPreview} style={btnSecondary()}>
                Refrescar
              </button>
              <button disabled={loading} onClick={closeTurn} style={btnPrimary()}>
                {loading ? "Cerrando…" : "Cerrar caja (mi turno)"}
              </button>
            </div>

            <div style={{ marginTop: 10, color: "#777", fontSize: 12 }}>
              * Esto cierra desde tu último cierre hasta ahora (o desde hoy 00:00 si es tu primer cierre).
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, highlight }: { label: string; value: any; highlight?: boolean }) {
  return (
    <div style={{ border: "1px solid #222", borderRadius: 14, padding: 12, background: "#111" }}>
      <div style={{ color: "#bdbdbd", fontSize: 12 }}>{label}</div>
      <div style={{ fontWeight: 900, fontSize: 18, color: highlight ? "#f5c400" : "#fff", marginTop: 6 }}>{value}</div>
    </div>
  );
}

function btnPrimary(): React.CSSProperties {
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
