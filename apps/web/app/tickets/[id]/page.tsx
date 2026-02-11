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
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n || 0);

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

  if (!id) return <div style={{ color: "#fff", padding: 20 }}>Ticket inválido (sin id).</div>;
  if (!ticket || !user) return <div style={{ color: "#fff", padding: 20 }}>Cargando…</div>;

  // ✅ Gate CORRECTO
  const canCheckout =
    ticket.status !== "PAID" &&
    ticket.status !== "CANCELED" &&
    ((ticket.kind === "BAR" && (ticket.status === "OPEN" || ticket.status === "CHECKOUT")) ||
      (ticket.kind === "RENTAL" && (ticket.status === "CHECKOUT" || (isSeller && ticket.status === "OPEN"))));

  return (
    <div style={{ background: "#060606", color: "#fff", minHeight: "100vh", padding: 20 }}>
      <h2>
        {ticket.table.name} · {ticket.kind} · {ticket.status}
      </h2>

      {err && <div style={{ marginTop: 10, color: "#ff4d4d" }}>{err}</div>}

      {/* ✅ horas/min + CLP */}
      {liveMinutes != null && ticket.kind === "RENTAL" && (
        <div style={{ color: "#f5c400", marginTop: 8 }}>
          ⏱ <b>{formatDuration(liveMinutes)}</b>
          {"  ·  "}
          Total: <b>{formatCLP(totals?.total ?? 0)}</b>
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        TOTAL: <b>{formatCLP(totals?.total ?? 0)}</b>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button disabled={!canCheckout || loading} onClick={() => checkout("CASH")} style={btn()}>
          Cobrar CASH
        </button>
        <button disabled={!canCheckout || loading} onClick={() => checkout("DEBIT")} style={btn()}>
          Cobrar DEBIT
        </button>

        {/* ✅ Botón cambiar mesa */}
        <button
          disabled={!canMoveTable || loading || moveLoading || ticket.status === "PAID" || ticket.status === "CANCELED"}
          onClick={openMoveModal}
          style={btnDark()}
        >
          Cambiar mesa
        </button>
      </div>

      <div style={{ marginTop: 18 }}>
        {ticket.items.map((it) => (
          <div key={it.id} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              {it.product.name} · {it.qty}
            </div>
            <button disabled={loading} onClick={() => add(it.productId, +1)} style={btnSmall()}>
              +
            </button>
            <button disabled={loading} onClick={() => add(it.productId, -1)} style={btnSmall()}>
              -
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Agregar productos</div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar..." style={inp()} />
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
          {filtered.map((p) => (
            <button key={p.id} disabled={loading} onClick={() => add(p.id, +1)} style={card()}>
              <div style={{ fontWeight: 900 }}>{p.name}</div>
              <div style={{ color: "#bdbdbd", fontSize: 12 }}>
                {p.category} · {formatCLP(p.price)} · stock {p.stock}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ===== MODAL CAMBIAR MESA ===== */}
      {moveOpen && (
        <div style={overlay()}>
          <div style={modal()}>
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 10 }}>Cambiar mesa</div>

            <div style={{ fontSize: 12, color: "#bdbdbd", marginBottom: 10 }}>
              Mesa actual: <b style={{ color: "#fff" }}>{ticket.table.name}</b> · tipo{" "}
              <b style={{ color: "#fff" }}>{ticket.table.type}</b>
            </div>

            <label style={{ display: "block", fontSize: 12, color: "#bdbdbd", marginBottom: 6 }}>Nueva mesa (libre)</label>
            <select
              value={toTableId ?? ""}
              onChange={(e) => setToTableId(Number(e.target.value))}
              style={sel()}
              disabled={moveLoading}
            >
              <option value="" disabled>
                Selecciona una mesa libre…
              </option>
              {freeTargets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            {moveErr && <div style={{ marginTop: 10, color: "#ff4d4d" }}>{moveErr}</div>}

            <div style={{ marginTop: 14, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button disabled={moveLoading} onClick={() => setMoveOpen(false)} style={btnSmall()}>
                Cancelar
              </button>
              <button disabled={!toTableId || moveLoading} onClick={confirmMoveTable} style={btn()}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function btn(): React.CSSProperties {
  return { padding: "10px 14px", borderRadius: 12, background: "#f5c400", color: "#000", fontWeight: 900, border: "none", cursor: "pointer" };
}
function btnDark(): React.CSSProperties {
  return { padding: "10px 14px", borderRadius: 12, background: "#111", color: "#fff", fontWeight: 900, border: "1px solid #333", cursor: "pointer" };
}
function btnSmall(): React.CSSProperties {
  return { padding: "6px 10px", borderRadius: 10, background: "#111", color: "#fff", fontWeight: 900, border: "1px solid #333", cursor: "pointer" };
}
function inp(): React.CSSProperties {
  return { width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #333", background: "#111", color: "#fff", outline: "none" };
}
function sel(): React.CSSProperties {
  return { width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #333", background: "#111", color: "#fff", outline: "none" };
}
function card(): React.CSSProperties {
  return { textAlign: "left", border: "1px solid #222", background: "#0d0d0d", color: "#fff", borderRadius: 12, padding: 12, cursor: "pointer" };
}
function overlay(): React.CSSProperties {
  return { position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 };
}
function modal(): React.CSSProperties {
  return { width: "100%", maxWidth: 420, borderRadius: 14, border: "1px solid #222", background: "#0b0b0b", color: "#fff", padding: 14 };
}
