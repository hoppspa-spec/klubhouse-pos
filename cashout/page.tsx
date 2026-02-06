"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type Role = "MASTER" | "SLAVE" | "SELLER";

type CashoutResult = {
  ok: boolean;
  from: string;
  to: string;
  total: number;
  cashTotal: number;
  debitTotal: number;
  count: number;
};

export default function CashoutPage() {
  const r = useRouter();

  const [user, setUser] = useState<{ role: Role; name?: string; username?: string } | null>(null);
  const role = user?.role;

  const canCashout = role === "MASTER" || role === "SLAVE" || role === "SELLER";

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<CashoutResult | null>(null);

  useEffect(() => {
    try {
      const u = localStorage.getItem("user");
      setUser(u ? JSON.parse(u) : null);
    } catch {
      setUser(null);
    }
  }, []);

  async function closeCashout() {
    setErr(null);
    setDone(null);
    setLoading(true);
    try {
      const out = await api<CashoutResult>("/cashouts/close", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setDone(out);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "No pude cerrar caja.");
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return <div style={{ minHeight: "100vh", background: "#060606", color: "#fff", padding: 20 }}>Cargando…</div>;
  }

  if (!canCashout) {
    return (
      <div style={{ minHeight: "100vh", background: "#060606", color: "#fff", padding: 20 }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>💰 Cerrar caja</div>
        <div style={{ marginTop: 8, color: "#bdbdbd" }}>No tienes permisos para cerrar caja.</div>
        <button onClick={() => r.replace("/tables")} style={btnSecondary()}>
          ← Volver
        </button>
      </div>
    );
  }

  const who = user.name || user.username || "Usuario";

  return (
    <div style={{ minHeight: "100vh", background: "#060606", color: "#fff", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 22 }}>💰 Cerrar caja</div>
          <div style={{ color: "#bdbdbd", fontSize: 12, marginTop: 6 }}>
            {who} · <b>{role}</b>
          </div>
        </div>

        <a href="/tables" style={linkPill()}>
          ← Mesas
        </a>
      </div>

      {err && <div style={{ marginTop: 12, color: "#ff4d4d" }}>{err}</div>}

      <div style={{ marginTop: 16, background: "#0d0d0d", border: "1px solid #222", borderRadius: 16, padding: 14 }}>
        <div style={{ fontWeight: 900 }}>Acción</div>
        <div style={{ color: "#bdbdbd", fontSize: 12, marginTop: 6 }}>
          Genera un resumen del turno (CASH/DEBIT) para el usuario logueado.
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={closeCashout} disabled={loading} style={btn()}>
            {loading ? "Cerrando..." : "Cerrar caja ahora"}
          </button>
          <button onClick={() => r.replace("/tables")} disabled={loading} style={btnSecondary()}>
            Cancelar
          </button>
        </div>
      </div>

      {done && (
        <div style={{ marginTop: 16, background: "#0d0d0d", border: "1px solid #222", borderRadius: 16, padding: 14 }}>
          <div style={{ fontWeight: 900 }}>Resultado</div>
          <div style={{ color: "#bdbdbd", fontSize: 12, marginTop: 6 }}>
            {new Date(done.from).toLocaleString()} → {new Date(done.to).toLocaleString()}
          </div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
            <div style={statBox()}>
              <div style={statLabel()}>Ventas</div>
              <div style={statBig()}>{done.count}</div>
            </div>
            <div style={statBox()}>
              <div style={statLabel()}>CASH</div>
              <div style={statBig()}>${done.cashTotal}</div>
            </div>
            <div style={statBox()}>
              <div style={statLabel()}>DEBIT</div>
              <div style={statBig()}>${done.debitTotal}</div>
            </div>
            <div style={statBox()}>
              <div style={statLabel()}>TOTAL</div>
              <div style={statBig()}>${done.total}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function statBox(): React.CSSProperties {
  return { border: "1px solid #222", borderRadius: 14, padding: 12, background: "#111" };
}
function statLabel(): React.CSSProperties {
  return { color: "#bdbdbd", fontSize: 12, fontWeight: 900 };
}
function statBig(): React.CSSProperties {
  return { marginTop: 8, fontWeight: 900, fontSize: 18 };
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
