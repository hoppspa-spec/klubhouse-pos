"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

type TableState = { id: number; name: string; type: "POOL" | "BAR"; ticket: any | null };

export default function TablesPage() {
  const [tables, setTables] = useState<TableState[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    try {
      setErr(null);
      const data = await api<TableState[]>("/tables");
      setTables(data);
    } catch (e: any) {
      setErr("No pude cargar mesas. Revisa login/API.");
    }
  }

  useEffect(() => { refresh(); const t = setInterval(refresh, 2000); return () => clearInterval(t); }, []);

  async function open(tableId: number) {
    await api("/tickets/open", { method: "POST", body: JSON.stringify({ tableId }) });
    refresh();
  }

  return (
    <div style={{ minHeight: "100vh", background: "#060606", color: "#fff", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Mesas & Barra</div>
          <div style={{ color: "#bdbdbd", fontSize: 12 }}>Producción · anti-magia</div>
        </div>
        <button
          onClick={() => { localStorage.removeItem("accessToken"); location.href = "/login"; }}
          style={{ background: "transparent", border: "1px solid #444", color: "#fff", borderRadius: 12, padding: "8px 10px", cursor: "pointer" }}
        >
          Salir
        </button>
      </div>

      {err && <div style={{ marginTop: 10, color: "#ff4d4d" }}>{err}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14, marginTop: 16 }}>
        {tables.map((t) => {
          const busy = !!t.ticket;
          const border = busy ? "#d6aa00" : "#f5c400";
          const bg = busy ? "#1a1400" : "#0f0f0f";
          return (
            <div key={t.id} style={{ background: bg, border: `2px solid ${border}`, borderRadius: 18, padding: 14, minHeight: 110 }}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>{t.name}</div>
              <div style={{ color: "#bdbdbd", fontSize: 12, marginTop: 6 }}>
                {busy ? `Activo: ${t.ticket.kind} · ${t.ticket.status}` : "Libre"}
              </div>

              {!busy ? (
                <button onClick={() => open(t.id)} style={{ marginTop: 12, width: "100%", borderRadius: 14, border: "none", background: "#f5c400", color: "#000", fontWeight: 900, padding: "10px 12px", cursor: "pointer" }}>
                  {t.type === "BAR" ? "Abrir ticket barra" : "Iniciar arriendo"}
                </button>
              ) : (
                <div style={{ marginTop: 12, color: "#bdbdbd", fontSize: 12 }}>
                  (Siguiente: vista detalle ticket + consumos + cobro)
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
