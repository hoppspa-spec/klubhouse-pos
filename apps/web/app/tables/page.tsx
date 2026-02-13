"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type Role = "MASTER" | "SLAVE" | "SELLER";
type TicketKind = "RENTAL" | "BAR";
type TicketStatus = "OPEN" | "CHECKOUT" | "PAID" | "CANCELED";

type TableState = {
  id: number;
  name: string;
  type: "POOL" | "BAR";
  ticket: {
    id: string;
    kind: TicketKind;
    status: TicketStatus;
  } | null;
};

function useIsNarrow(breakpoint = 820) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < breakpoint);
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, [breakpoint]);
  return narrow;
}

function pill(status: TicketStatus) {
  if (status === "OPEN") return { bg: "rgba(245,196,0,0.14)", bd: "rgba(245,196,0,0.35)", fg: "#f5c400", label: "OPEN" };
  if (status === "CHECKOUT") return { bg: "rgba(255,255,255,0.08)", bd: "rgba(255,255,255,0.18)", fg: "#fff", label: "CHECKOUT" };
  if (status === "PAID") return { bg: "rgba(0,255,128,0.10)", bd: "rgba(0,255,128,0.22)", fg: "#8cffc0", label: "PAID" };
  return { bg: "rgba(255,77,77,0.10)", bd: "rgba(255,77,77,0.22)", fg: "#ff4d4d", label: "CANCELED" };
}

function kindLabel(k: TicketKind) {
  return k === "RENTAL" ? "RENTAL" : "BAR";
}

export default function TablesPage() {
  const router = useRouter();
  const isNarrow = useIsNarrow(820);

  const [tables, setTables] = useState<TableState[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [user, setUser] = useState<{ role: Role; name?: string; username?: string } | null>(null);
  useEffect(() => {
    try {
      const u = localStorage.getItem("user");
      if (u) setUser(JSON.parse(u));
    } catch {}
  }, []);

  const role = user?.role;
  const isAdmin = role === "MASTER" || role === "SLAVE";

  async function load() {
    setErr(null);
    try {
      const data = await api<TableState[]>("/tables");
      setTables(data || []);
    } catch (e) {
      console.error(e);
      setErr("No pude cargar mesas");
    }
  }

  useEffect(() => {
    load();
    const i = setInterval(load, 2500);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openTicket(tableId: number) {
    if (loading) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await api<{ id: string }>("/tickets/open", {
        method: "POST",
        body: JSON.stringify({ tableId }),
      });
      router.push(`/tickets/${res.id}`);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "No pude abrir ticket");
    } finally {
      setLoading(false);
    }
  }

  const gridCols = useMemo(() => {
    return isNarrow ? "repeat(1, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))";
  }, [isNarrow]);

  return (
    <div style={S.page}>
      {/* Header pro */}
      <div style={S.header}>
        <div style={S.brand}>
          <img
            src="/logo-klub.png"
            alt="Klub House"
            style={{ height: isNarrow ? 26 : 32, width: "auto", opacity: 0.95 }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={S.brandTitle}>Mesas & Barra</div>
            <div style={S.brandSub}>
              Producción · anti-magia <span style={{ opacity: 0.35 }}>—</span> Rol:{" "}
              <b style={{ color: "#fff" }}>{role || "—"}</b>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div style={S.actions}>
          {/* ✅ menú admin (solo MASTER/SLAVE) */}
          {isAdmin && (
            <>
              <button style={btnGhost()} onClick={() => router.push("/products")}>Productos</button>
              <button style={btnGhost()} onClick={() => router.push("/users")}>Usuarios</button>
              <button style={btnGhost()} onClick={() => router.push("/reports")}>Reportes</button>
            </>
          )}

          <button style={btnPrimary()} disabled={loading} onClick={() => router.push("/cash")}>
            Caja (mi turno)
          </button>

          <button
            style={btnSecondary()}
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("accessToken");
              localStorage.removeItem("user");
              router.replace("/login");
            }}
          >
            Salir
          </button>
        </div>
      </div>

      {err && <div style={S.alert}>{err}</div>}

      {/* Grid responsive */}
      <div style={{ ...S.grid, gridTemplateColumns: gridCols }}>
        {tables.map((t) => {
          const occupied = !!t.ticket;
          const p = t.ticket ? pill(t.ticket.status) : null;

          return (
            <div key={t.id} style={S.card}>
              <div style={S.cardTop}>
                <div style={S.tableName}>{t.name}</div>
                <div style={S.typeTag}>{t.type}</div>
              </div>

              <div style={S.body}>
                {occupied ? (
                  <>
                    <div style={S.statusRow}>
                      <span style={S.dim}>Activo</span>
                      <span style={S.kind}>{kindLabel(t.ticket!.kind)}</span>
                    </div>

                    <div style={{ ...S.pill, background: p!.bg, borderColor: p!.bd, color: p!.fg }}>
                      {p!.label}
                    </div>

                    <button
                      style={{ ...btnPrimary(), width: "100%", marginTop: 10 }}
                      onClick={() => router.push(`/tickets/${t.ticket!.id}`)}
                      disabled={loading}
                    >
                      Entrar
                    </button>
                  </>
                ) : (
                  <>
                    <div style={S.free}>Libre</div>
                    <button
                      style={{ ...btnPrimary(), width: "100%", marginTop: 10 }}
                      onClick={() => openTicket(t.id)}
                      disabled={loading}
                    >
                      Iniciar
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(1200px 500px at 20% 0%, rgba(245,196,0,0.10), transparent 55%), #050505",
    color: "#fff",
    padding: 16,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    padding: "12px 14px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(10,10,10,0.72)",
    backdropFilter: "blur(10px)",
    flexWrap: "wrap",
  },
  brand: { display: "flex", alignItems: "center", gap: 12 },
  brandTitle: { fontSize: 30, fontWeight: 820, letterSpacing: 0.2 },
  brandSub: { fontSize: 13, color: "rgba(255,255,255,0.70)" },

  actions: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },

  alert: {
    marginTop: 12,
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,77,77,0.25)",
    background: "rgba(255,77,77,0.08)",
    color: "#ff9a9a",
    fontSize: 13,
  },

  grid: { marginTop: 14, display: "grid", gap: 12 },

  card: {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(10,10,10,0.78)",
    padding: 12,
    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
    minHeight: 150,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  cardTop: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" },
  tableName: { fontSize: 20, fontWeight: 900, letterSpacing: 0.4 },
  typeTag: {
    fontSize: 12,
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    color: "rgba(255,255,255,0.85)",
  },

  body: { marginTop: 10, display: "flex", flexDirection: "column", gap: 8 },
  statusRow: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" },
  dim: { color: "rgba(255,255,255,0.60)", fontSize: 13 },
  kind: { color: "rgba(255,255,255,0.90)", fontSize: 13, fontWeight: 800, letterSpacing: 0.4 },
  free: { fontSize: 16, color: "rgba(255,255,255,0.70)" },

  pill: {
    padding: "8px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.18)",
    fontSize: 12,
    letterSpacing: 0.6,
    width: "fit-content",
  },
};

function btnPrimary(): React.CSSProperties {
  return {
    padding: "12px 14px",
    borderRadius: 16,
    background: "#f5c400",
    color: "#000",
    fontWeight: 900,
    border: "1px solid rgba(0,0,0,0.25)",
    cursor: "pointer",
  };
}
function btnSecondary(): React.CSSProperties {
  return {
    padding: "12px 14px",
    borderRadius: 16,
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    fontWeight: 750,
    border: "1px solid rgba(255,255,255,0.14)",
    cursor: "pointer",
  };
}
function btnGhost(): React.CSSProperties {
  return {
    padding: "12px 14px",
    borderRadius: 16,
    background: "rgba(255,255,255,0.03)",
    color: "rgba(255,255,255,0.92)",
    fontWeight: 750,
    border: "1px solid rgba(255,255,255,0.10)",
    cursor: "pointer",
  };
}
