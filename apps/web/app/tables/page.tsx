"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

  const [tables, setTables] = useState<TableState[] | null>(null); // null = cargando
  const [err, setErr] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const isMounted = useRef(true);

  // ✅ cargar user una sola vez
  useEffect(() => {
    try {
      setUser(JSON.parse(localStorage.getItem("user") || "null"));
    } catch {
      setUser(null);
    }
  }, []);

  const role: Role | undefined = user?.role;

  // ✅ permisos por rol
  const canUsers = role === "MASTER" || role === "SLAVE";
  const canProducts = role === "MASTER" || role === "SLAVE";
  const canReports = role === "MASTER" || role === "SLAVE"; // watch
  const canCashout = role === "SELLER"; // cerrar diario

  // ✅ normaliza cualquier forma de respuesta: [] o {tables:[]}
  function normalizeTables(data: any): TableState[] {
    if (Array.isArray(data)) return data as TableState[];
    if (Array.isArray(data?.tables)) return data.tables as TableState[];
    return [];
  }

  async function refresh() {
    try {
      setErr(null);
      setLoading(true);

      const raw = await api<any>("/tables");
      const arr = normalizeTables(raw);

      if (isMounted.current) setTables(arr);
    } catch (e: any) {
      console.error(e);
      if (isMounted.current) {
        setErr(e?.message || "No pude cargar mesas. Revisa login/API.");
        setTables([]); // para que al menos muestre estado
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }

  useEffect(() => {
    isMounted.current = true;
    refresh();

    const t = setInterval(refresh, 2000);
    return () => {
      isMounted.current = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      // recargar y obtener ticket recién creado
      const raw = await api<any>("/tables");
      const data = normalizeTables(raw);
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

  const hasTables = useMemo(() => Array.isArray(tables) && tables.length > 0, [tables]);

  return (
    <div style={{ minHeight: "100vh", background: "#060606", color: "#fff", padding: 20 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Mesas & Barra</h1>
          <div style={{ color: "#bdbdbd", fontSize: 12, marginTop: 4 }}>Producción · anti-magia</div>
          {role && (
            <div style={{ color: "#bdbdbd", fontSize: 12, marginTop: 4 }}>
              Rol: <b style={{ color: "#fff" }}>{role}</b>
              {loading && <span style={{ marginLeft: 10, color: "#f5c400" }}>⏳ refrescando…</span>}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {canReports && (
            <a href="/reports" style={linkBtn()}>
              Reportes
            </a>
          )}

          {canCashout && (
            <a href="/cashout" style={linkBtn()}>
              Caja (mi turno)
            </a>
          )}

          {canUsers && (
            <a href="/users" style={linkBtn()}>
              Usuarios
            </a>
          )}

          {canProducts && (
            <a href="/products" style={linkBtn()}>
              Productos
            </a>
          )}

          <button onClick={logout} style={btnSecondary()}>
            Salir
          </button>
        </div>
      </div>

      {err && <div style={{ marginTop: 10, color: "#ff4d4d" }}>{err}</div>}

      {/* Estado loading / vacío */}
      {tables === null ? (
        <div style={{ marginTop: 16, color: "#bdbdbd" }}>Cargando mesas…</div>
      ) : !hasTables ? (
        <div style={{ marginTop: 16, color: "#bdbdbd" }}>
          No hay mesas para mostrar (o la API devolvió vacío). Si en Network ves 200 con data, revisa formato:
          <div style={{ marginTop: 6, fontSize: 12, color: "#777" }}>
            * Este page acepta <code>[]</code> o <code>{"{ tables: [] }"}</code>.
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 14,
            marginTop: 16,
          }}
        >
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

                <button onClick={() => goTable(t)} style={btnPrimaryWide()}>
                  {busy ? "Entrar" : t.type === "BAR" ? "Abrir ticket barra" : "Iniciar arriendo"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function linkBtn(): React.CSSProperties {
  return {
    color: "#f5c400",
    fontWeight: 900,
    textDecoration: "none",
    border: "1px solid #f5c400",
    padding: "8px 12px",
    borderRadius: 12,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    whiteSpace: "nowrap",
  };
}

function btnSecondary(): React.CSSProperties {
  return {
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid #444",
    background: "#111",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

function btnPrimaryWide(): React.CSSProperties {
  return {
    marginTop: 12,
    width: "100%",
    borderRadius: 14,
    border: "none",
    background: "#f5c400",
    color: "#000",
    fontWeight: 900,
    padding: "10px 12px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}
