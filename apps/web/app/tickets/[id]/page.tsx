"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, API_URL } from "@/lib/api";

type Role = "MASTER" | "SLAVE" | "SELLER";

type Product = { id: string; name: string; category: string; price: number; stock: number; isActive: boolean };
type TicketItem = { id: string; productId: string; qty: number; unitPrice: number; lineTotal: number; product: Product };
type Ticket = {
  id: string;
  kind: "RENTAL" | "BAR";
  status: "OPEN" | "CHECKOUT" | "PAID" | "CANCELED";
  table: { id: number; name: string; type: "POOL" | "BAR" };
  items: TicketItem[];
  startedAt?: string | null;
  minutesPlayed?: number | null;
  rentalAmount?: number | null;
};

type TableState = {
  id: number;
  name: string;
  type: "POOL" | "BAR";
  ticket: any | null;
};

function diffMinutes(from: string, to: Date) {
  return Math.max(0, Math.floor((to.getTime() - new Date(from).getTime()) / 60000));
}
function formatDuration(minutes: number) {
  const mm = Math.max(0, Math.floor(minutes || 0));
  const h = Math.floor(mm / 60);
  const m = mm % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}
const formatCLP = (n: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n || 0);

function labelKind(k: Ticket["kind"]) {
  return k === "RENTAL" ? "Arriendo" : "Bar";
}
function pillColor(status: Ticket["status"]) {
  if (status === "OPEN") return { bg: "rgba(245,196,0,0.14)", bd: "rgba(245,196,0,0.35)", fg: "#f5c400" };
  if (status === "CHECKOUT") return { bg: "rgba(255,255,255,0.08)", bd: "rgba(255,255,255,0.18)", fg: "#fff" };
  if (status === "PAID") return { bg: "rgba(0,255,128,0.10)", bd: "rgba(0,255,128,0.22)", fg: "#8cffc0" };
  return { bg: "rgba(255,77,77,0.10)", bd: "rgba(255,77,77,0.22)", fg: "#ff4d4d" };
}

export default function TicketPage() {
  const params = useParams();
  const id = (params as any)?.id as string | undefined;
  const router = useRouter();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [totals, setTotals] = useState<{ consumos: number; rental: number; total: number } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [liveMinutes, setLiveMinutes] = useState<number | null>(null);

  const [user, setUser] = useState<{ role: Role; name?: string; username?: string } | null>(null);

  // ====== MOVE TABLE UI STATE ======
  const [moveOpen, setMoveOpen] = useState(false);
  const [tables, setTables] = useState<TableState[]>([]);
  const [toTableId, setToTableId] = useState<number | null>(null);
  const [moveErr, setMoveErr] = useState<string | null>(null);
  const [moveLoading, setMoveLoading] = useState(false);

  useEffect(() => {
    try {
      const u = localStorage.getItem("user");
      if (u) setUser(JSON.parse(u));
    } catch {}
  }, []);

  const role = user?.role;
  const isSeller = role === "SELLER";
  const canMoveTable = role === "MASTER" || role === "SLAVE" || role === "SELLER";

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    if (!s) return products;
    return products.filter((p) => `${p.name} ${p.category}`.toLowerCase().includes(s));
  }, [products, q]);

  async function load() {
    if (!id) return;
    setErr(null);

    try {
      const [t, ps] = await Promise.all([
        api<{ ticket: Ticket; totals: { consumos: number; rental: number; total: number } }>(`/tickets/${id}`),
        api<Product[]>("/products"),
      ]);

      setTicket(t.ticket);
      setTotals(t.totals);
      setProducts((ps || []).filter((p) => p.isActive));
    } catch (e) {
      console.error(e);
      setErr("No pude cargar ticket");
    }
  }

  useEffect(() => {
    if (!id) return;
    load();
    const i = setInterval(load, 2000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!ticket) return;

    // el “tiempo” siempre live en RENTAL OPEN
    if (ticket.kind === "RENTAL" && ticket.status === "OPEN" && ticket.startedAt) {
      const tick = () => setLiveMinutes(diffMinutes(ticket.startedAt!, new Date()));
      tick();
      const i = setInterval(tick, 1000);
      return () => clearInterval(i);
    }

    if (ticket.minutesPlayed != null) setLiveMinutes(ticket.minutesPlayed);
  }, [ticket]);

  async function add(productId: string, qtyDelta: number) {
    if (!ticket) return;
    setLoading(true);
    setErr(null);

    try {
      await api(`/tickets/${ticket.id}/items`, {
        method: "POST",
        body: JSON.stringify({ productId, qtyDelta }),
      });
      await load();
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "No pude actualizar consumos");
    } finally {
      setLoading(false);
    }
  }

  async function checkout(method: "CASH" | "DEBIT") {
    if (!ticket) return;
    if (loading) return;

    setLoading(true);
    setErr(null);

    try {
      const res = await api<{ receiptToken: string }>(`/tickets/${ticket.id}/checkout`, {
        method: "POST",
        body: JSON.stringify({ method }),
      });

      const url = `${API_URL}/tickets/${ticket.id}/receipt?token=${encodeURIComponent(res.receiptToken)}`;
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => router.replace("/tables"), 250);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "No pude cobrar");
    } finally {
      setLoading(false);
    }
  }

  async function openMoveModal() {
    if (!ticket) return;

    try {
      setMoveErr(null);
      setToTableId(null);
      setMoveOpen(true);

      const res = await api<TableState[]>("/tables");
      setTables(res || []);
    } catch (e: any) {
      console.error(e);
      setMoveErr(e?.message || "No pude cargar mesas");
    }
  }

  async function confirmMoveTable() {
    if (!ticket?.id || !toTableId) return;

    try {
      setMoveLoading(true);
      setMoveErr(null);

      // ✅ ruta correcta backend
      await api(`/tickets/${ticket.id}/move`, {
        method: "POST",
        body: JSON.stringify({ toTableId }),
      });

      // ✅ directo a mesas
      setMoveOpen(false);
      router.replace("/tables");
    } catch (e: any) {
      console.error(e);
      setMoveErr(e?.message || "No se pudo cambiar la mesa");
    } finally {
      setMoveLoading(false);
    }
  }

  const freeTargets = useMemo(() => {
    if (!ticket) return [];
    return (tables || [])
      .filter((t) => !t?.ticket) // libres
      .filter((t) => t?.type === ticket.table.type) // mismo tipo
      .filter((t) => t?.id !== ticket.table.id); // no la misma
  }, [tables, ticket]);

  if (!id) return <div style={styles.page}>Ticket inválido (sin id).</div>;
  if (!ticket || !user) return <div style={styles.page}>Cargando…</div>;

  const canCheckout =
    ticket.status !== "PAID" &&
    ticket.status !== "CANCELED" &&
    ((ticket.kind === "BAR" && (ticket.status === "OPEN" || ticket.status === "CHECKOUT")) ||
      (ticket.kind === "RENTAL" && (ticket.status === "CHECKOUT" || (isSeller && ticket.status === "OPEN"))));

  const pill = pillColor(ticket.status);

  return (
    <div style={styles.page}>
      {/* HEADER */}
      <div style={styles.header}>
        <div style={styles.brand}>
          <img src="/logo-klub.png" alt="Klub House" style={styles.logo} />
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={styles.brandTitle}>KLUB HOUSE POS</div>
            <div style={styles.brandSub}>
              {user?.name || user?.username || "Usuario"} · <span style={{ opacity: 0.85 }}>{role}</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button onClick={() => router.replace("/tables")} style={btnGhost()} disabled={loading || moveLoading}>
            ← Mesas
          </button>

          <div style={{ ...styles.pill, background: pill.bg, borderColor: pill.bd, color: pill.fg }}>
            {ticket.status}
          </div>
        </div>
      </div>

      {/* TITLE */}
      <div style={styles.topRow}>
        <div>
          <div style={styles.h1}>{ticket.table.name}</div>
          <div style={styles.subline}>
            {labelKind(ticket.kind)} · Tipo {ticket.table.type}
            {ticket.kind === "RENTAL" && liveMinutes != null ? (
              <>
                {" "}
                · <span style={styles.clock}>⏱ {formatDuration(liveMinutes)}</span>
              </>
            ) : null}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button
            disabled={!canMoveTable || loading || moveLoading || ticket.status === "PAID" || ticket.status === "CANCELED"}
            onClick={openMoveModal}
            style={btnSecondary()}
          >
            Cambiar mesa
          </button>

          <button disabled={!canCheckout || loading} onClick={() => checkout("CASH")} style={btnPrimary()}>
            Cobrar CASH
          </button>
          <button disabled={!canCheckout || loading} onClick={() => checkout("DEBIT")} style={btnPrimary()}>
            Cobrar DEBIT
          </button>
        </div>
      </div>

      {err && <div style={styles.alert}>{err}</div>}

      {/* SUMMARY */}
      <div style={styles.grid3}>
        <div style={styles.card}>
          <div style={styles.cardLabel}>Consumos</div>
          <div style={styles.cardValue}>{formatCLP(totals?.consumos ?? 0)}</div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardLabel}>Arriendo</div>
          <div style={styles.cardValue}>{formatCLP(totals?.rental ?? 0)}</div>
          <div style={styles.cardHint}>
            {ticket.kind === "RENTAL" && ticket.status === "OPEN"
              ? "Estimado en vivo (se actualiza solo)"
              : ticket.kind === "RENTAL"
              ? "Calculado"
              : "—"}
          </div>
        </div>

        <div style={{ ...styles.card, borderColor: "rgba(245,196,0,0.25)" }}>
          <div style={styles.cardLabel}>Total</div>
          <div style={{ ...styles.cardValue, color: "#f5c400" }}>{formatCLP(totals?.total ?? 0)}</div>
          <div style={styles.cardHint}>Redondeo aplicado</div>
        </div>
      </div>

      {/* ITEMS */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Detalle</div>

        <div style={styles.panel}>
          {ticket.items.length === 0 ? (
            <div style={styles.empty}>Sin consumos aún.</div>
          ) : (
            ticket.items.map((it) => (
              <div key={it.id} style={styles.row}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.rowTitle}>{it.product.name}</div>
                  <div style={styles.rowSub}>
                    {it.product.category} · {formatCLP(it.unitPrice)} · x{it.qty}
                  </div>
                </div>

                <div style={styles.rowRight}>{formatCLP(it.lineTotal)}</div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button disabled={loading} onClick={() => add(it.productId, +1)} style={btnMini()}>
                    +
                  </button>
                  <button disabled={loading} onClick={() => add(it.productId, -1)} style={btnMini()}>
                    -
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ADD PRODUCTS */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Agregar productos</div>

        <div style={styles.panel}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o categoría..." style={styles.input} />

          <div style={styles.productsGrid}>
            {filtered.map((p) => (
              <button key={p.id} disabled={loading} onClick={() => add(p.id, +1)} style={styles.productCard}>
                <div style={styles.productName}>{p.name}</div>
                <div style={styles.productMeta}>
                  {p.category} · {formatCLP(p.price)} · stock {p.stock}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL CAMBIAR MESA */}
      {moveOpen && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div>
                <div style={styles.modalTitle}>Cambiar mesa</div>
                <div style={styles.modalSub}>
                  Actual: <b style={{ color: "#fff" }}>{ticket.table.name}</b> · {ticket.table.type}
                </div>
              </div>

              <img src="/logo-club.png" alt="Billiard Club" style={{ height: 36, opacity: 0.95 }} />
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={styles.label}>Nueva mesa (libre)</label>
              <select value={toTableId ?? ""} onChange={(e) => setToTableId(Number(e.target.value))} style={styles.select} disabled={moveLoading}>
                <option value="" disabled>
                  Selecciona una mesa…
                </option>
                {freeTargets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              {moveErr && <div style={styles.modalErr}>{moveErr}</div>}
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button disabled={moveLoading} onClick={() => setMoveOpen(false)} style={btnGhost()}>
                Cancelar
              </button>
              <button disabled={!toTableId || moveLoading} onClick={confirmMoveTable} style={btnPrimary()}>
                Confirmar y volver a mesas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== styles ===== */
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(1200px 500px at 20% 0%, rgba(245,196,0,0.10), transparent 55%), #050505",
    color: "#fff",
    padding: 18,
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
  },
  brand: { display: "flex", alignItems: "center", gap: 12 },
  logo: { height: 34, width: "auto", opacity: 0.95 },
  brandTitle: { fontSize: 13, letterSpacing: 1.4, opacity: 0.95 },
  brandSub: { fontSize: 12, color: "rgba(255,255,255,0.70)" },

  pill: {
    padding: "8px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.18)",
    fontSize: 12,
    letterSpacing: 0.6,
  },

  topRow: {
    marginTop: 14,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 14,
    flexWrap: "wrap",
  },
  h1: { fontSize: 28, fontWeight: 750, letterSpacing: 0.2 },
  subline: { marginTop: 4, fontSize: 13, color: "rgba(255,255,255,0.70)" },
  clock: { color: "#f5c400" },

  alert: {
    marginTop: 12,
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,77,77,0.25)",
    background: "rgba(255,77,77,0.08)",
    color: "#ff9a9a",
    fontSize: 13,
  },

  grid3: {
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
  },
  card: {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(12,12,12,0.72)",
    padding: 14,
  },
  cardLabel: { fontSize: 12, color: "rgba(255,255,255,0.65)", letterSpacing: 0.6 },
  cardValue: { marginTop: 6, fontSize: 22, fontWeight: 720 },
  cardHint: { marginTop: 6, fontSize: 12, color: "rgba(255,255,255,0.55)" },

  section: { marginTop: 14 },
  sectionTitle: { fontSize: 14, letterSpacing: 0.8, opacity: 0.9, marginBottom: 10 },
  panel: {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(10,10,10,0.72)",
    padding: 12,
  },
  empty: { padding: 10, color: "rgba(255,255,255,0.55)", fontSize: 13 },

  row: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    padding: "10px 8px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  rowTitle: { fontSize: 14, fontWeight: 650, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  rowSub: { marginTop: 2, fontSize: 12, color: "rgba(255,255,255,0.60)" },
  rowRight: { minWidth: 110, textAlign: "right", fontSize: 13, color: "rgba(255,255,255,0.85)" },

  input: {
    width: "100%",
    padding: "11px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.25)",
    color: "#fff",
    outline: "none",
    fontSize: 13,
  },
  productsGrid: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
  },
  productCard: {
    textAlign: "left",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(14,14,14,0.85)",
    padding: 12,
    cursor: "pointer",
  },
  productName: { fontSize: 14, fontWeight: 700 },
  productMeta: { marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.62)" },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.70)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 50,
  },
  modal: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(10,10,10,0.92)",
    padding: 14,
    boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
  },
  modalTitle: { fontSize: 18, fontWeight: 760 },
  modalSub: { marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.60)" },
  label: { display: "block", fontSize: 12, color: "rgba(255,255,255,0.65)", marginBottom: 6 },
  select: {
    width: "100%",
    padding: "11px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.25)",
    color: "#fff",
    outline: "none",
    fontSize: 13,
  },
  modalErr: {
    marginTop: 10,
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,77,77,0.25)",
    background: "rgba(255,77,77,0.08)",
    color: "#ff9a9a",
    fontSize: 13,
  },
};

function btnPrimary(): React.CSSProperties {
  return {
    padding: "11px 14px",
    borderRadius: 14,
    background: "#f5c400",
    color: "#000",
    fontWeight: 800,
    border: "1px solid rgba(0,0,0,0.25)",
    cursor: "pointer",
  };
}
function btnSecondary(): React.CSSProperties {
  return {
    padding: "11px 14px",
    borderRadius: 14,
    background: "rgba(255,255,255,0.05)",
    color: "#fff",
    fontWeight: 650,
    border: "1px solid rgba(255,255,255,0.12)",
    cursor: "pointer",
  };
}
function btnGhost(): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 14,
    background: "transparent",
    color: "rgba(255,255,255,0.85)",
    fontWeight: 650,
    border: "1px solid rgba(255,255,255,0.10)",
    cursor: "pointer",
  };
}
function btnMini(): React.CSSProperties {
  return {
    padding: "8px 10px",
    borderRadius: 12,
    background: "rgba(255,255,255,0.05)",
    color: "#fff",
    fontWeight: 800,
    border: "1px solid rgba(255,255,255,0.10)",
    cursor: "pointer",
  };
}
