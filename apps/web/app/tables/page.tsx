"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type Role = "MASTER" | "SLAVE" | "SELLER";

type TableState = {
  id: number;
  name: string;
  type: "POOL" | "BAR";
  ticket: any | null;
};

export default function TablesPage() {
  const r = useRouter();
  const [tables, setTables] = useState<TableState[]>([]);
  const [err, setErr] = useState<string | null>(null);

  // ✅ leer user/role sin romper SSR
  const user = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  const role: Role | undefined = user?.role;

  // ✅ permisos por rol (tu lógica PRO)
  const canUsers = role === "MASTER" || role === "SLAVE";
  const canProducts = role === "MASTER" || role === "SLAVE";

  async function refresh() {
    try {
      setErr(null);
      const data = await api<TableState[]>("/tables");
      setTables(data);
    } catch (e) {
      console.error(e);
      setErr("No pude cargar mesas. Revisa login/API.");
    }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, []);

  async function goTable(t: TableState) {
    try {
      setErr(null);

      // si ya hay ticket, ir directo
      if (t.ticket?.id) {
        r.push(`/tickets/${t.ticket.id}`);
        return;
      }

      // abrir ticket
      await api("/tickets/open", {
        method: "POST",
        body: JSON.stringify({ tableId: t.id }),
      });

      // recargar mesas y obtener ticket recién creado
      const data = await api<TableState[]>("/tables");
      setTables(data);

      const opened = data.find((x) => x.id === t.id)?.ticket;
      if (opened?.id) r.push(`/tickets/${opened.id}`);
      else setErr("No pude abrir el ticket.");
    } catch (e) {
      console.error(e);
      setErr("No pude abrir/entrar a la mesa.");
    }
  }

  function logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    r.replace("/login");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#060606", color: "#fff", padding: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0 }}>Mesas & Barra</h1>
          <div style={{ color: "#bdbdbd", fontSize: 12, marginTop: 4 }}>Producción · anti-magia</div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {canUsers && (
            <a
              href="/users"
              style={{
                color: "#f5c400",
                fontWeight: 900,
                textDecoration: "none",
                border: "1px solid #f5c400",
                padding: "8px 12px",
                borderRadius: 12,
              }}
            >
              Usuarios
            </a>
          )}

          {canProducts && (
            <a
              href="/products"
              style={{
                color: "#f5c400",
                fontWeight: 900,
                textDecoration: "none",
                border: "1px solid #f5c400",
                padding: "8px 12px",
                borderRadius: 12,
              }}
            >
              Productos
            </a>
          )}

          <button
            onClick={logout}
            style={{
              padding: "8px 12px",
              borderRadius: 12,
              border: "1px solid #444",
              background: "#111",
              color: "#fff",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Salir
          </button>
        </div>
      </div>

      {err && <div style={{ marginTop: 10, color: "#ff4d4d" }}>{err}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14, marginTop: 16 }}>
        {tables.map((t) => {
          const busy = !!t.ticket;
          const border = busy ? "#d6aa00" : "#f5c400";
          const bg = busy ? "#1a1400" : "#0f0f0f";

          return (
            <div
              key={t.id}
              style={{
                background: bg,
                border: `2px solid ${border}`,
                borderRadius: 18,
                padding: 14,
                minHeight: 110,
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 16 }}>{t.name}</div>
              <div style={{ color: "#bdbdbd", fontSize: 12, marginTop: 6 }}>
                {busy ? `Activo: ${t.ticket.kind} · ${t.ticket.status}` : "Libre"}
              </div>

              <button
                onClick={() => goTable(t)}
                style={{
                  marginTop: 12,
                  width: "100%",
                  borderRadius: 14,
                  border: "none",
                  background: "#f5c400",
                  color: "#000",
                  fontWeight: 900,
                  padding: "10px 12px",
                  cursor: "pointer",
                }}
              >
                {busy ? "Entrar" : t.type === "BAR" ? "Abrir ticket barra" : "Iniciar arriendo"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
