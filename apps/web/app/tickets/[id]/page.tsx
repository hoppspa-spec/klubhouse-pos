"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { api, API_URL } from "@/lib/api";

type Product = { id: string; name: string; category: string; price: number; stock: number; isActive: boolean };
type TicketItem = { id: string; productId: string; qty: number; unitPrice: number; lineTotal: number; product: Product };
type Ticket = {
  id: string;
  kind: "RENTAL" | "BAR";
  status: "OPEN" | "CHECKOUT" | "PAID" | "CANCELED";
  table: { id: number; name: string; type: "POOL" | "BAR" };
  items: TicketItem[];
  startedAt?: string | null;
  endedAt?: string | null;
  minutesPlayed?: number | null;
  rentalAmount?: number | null;
};

type TableState = { id: number; name: string; type: "POOL" | "BAR"; ticket: any | null };

function diffMinutes(from: string, to: Date) {
  const start = new Date(from).getTime();
  const end = to.getTime();
  return Math.max(0, Math.floor((end - start) / 60000));
}

function formatMinutes(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

export default function TicketPage() {
  const { id } = useParams<{ id: string }>();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [totals, setTotals] = useState<{ consumos: number; rental: number; total: number } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // tiempo en vivo
  const [liveMinutes, setLiveMinutes] = useState<number | null>(null);

  // mover mesa UI
  const [moveOpen, setMoveOpen] = useState(false);
  const [tables, setTables] = useState<TableState[]>([]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products;
    return products.filter((p) => (p.name + " " + p.category).toLowerCase().includes(s));
  }, [products, q]);

  const freeTablesSameType = useMemo(() => {
    if (!ticket) return [];
    return (tables || [])
      .filter((t) => t.type === ticket.table.type)
      .filter((t) => !t.ticket)
      .filter((t) => t.id !== ticket.table.id);
  }, [tables, ticket]);

  async function load() {
    setErr(null);
    try {
      const [t, ps] = await Promise.all([
        api<{ ticket: Ticket; totals: { consumos: number; rental: number; total: number } }>(`/tickets/${id}`),
        api<Product[]>(`/products`),
      ]);

      setTicket(t.ticket);
      setTotals(t.totals);

      const cleaned = (ps || [])
        .filter((p) => p.isActive)
        .sort((a, b) => {
          const c = a.category.localeCompare(b.category);
          if (c !== 0) return c;
          return a.name.localeCompare(b.name);
        });

      setProducts(cleaned);
    } catch (e) {
      console.error(e);
      setErr("No pude cargar ticket / productos.");
    }
  }

  async function loadTables() {
    try {
      const data = await api<TableState[]>("/tables");
      setTables(data);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ✅ TIEMPO JUGADO EN VIVO (SIN JSX)
  useEffect(() => {
    if (!ticket) return;

    // si está abierto, el tiempo corre en vivo
    if (ticket.kind === "RENTAL" && ticket.status === "OPEN" && ticket.startedAt) {
      const tick = () => {
        setLiveMinutes(diffMinutes(ticket.startedAt!, new Date()));
      };

      tick(); // inmediato
      const i = setInterval(tick, 1000);
      return () => clearInterval(i);
    }

    // si ya está cerrado, usar tiempo final
    if (ticket.kind === "RENTAL" && ticket.minutesPlayed != null) {
      setLiveMinutes(ticket.minutesPlayed);
    }
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
      setErr(e?.message || "No pude actualizar consumos.");
    } finally {
      setLoading(false);
    }
  }

  async function closeRental() {
    if (!ticket) return;
    setLoading(true);
    setErr(null);
    try {
      await api(`/tickets/${ticket.id}/close`, { method: "POST" });
      await load();
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "No pude cerrar arriendo.");
    } finally {
      setLoading(false);
    }
  }

  async function checkout(method: "CASH" | "DEBIT") {
    if (!ticket) return;
    setLoading(true);
    setErr(null);

    try {
      const res = await api<{
        ok: boolean;
        receiptNumber: number;
        total: number;
        receiptToken: string;
      }>(`/tickets/${ticket.id}/checkout`, {
        method: "POST",
        body: JSON.stringify({ method }),
      });

      const url = `${API_URL}/tickets/${ticket.id}/receipt?token=${encodeURIComponent(res.receiptToken)}`;
      window.location.assign(url);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "No pude cobrar.");
    } finally {
      setLoading(false);
    }
  }

  async function openMove() {
    setErr(null);
    await loadTables();
    setMoveOpen(true);
  }

  async function doMove(toTableId: number) {
    if (!ticket) return;
    setLoading(true);
    setErr(null);
    try {
      await api(`/tickets/${ticket.id}/move`, {
        method: "POST",
        body: JSON.stringify({ toTableId }),
      });
      setMoveOpen(false);
      await load();
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "No pude mover la mesa.");
    } finally {
      setLoading(false);
    }
  }

  if (!ticket) {
    return (
      <div style={{ minHeight: "100vh", background: "#060606", color: "#fff", padding: 20 }}>
        <div style={{ fontWeight: 900 }}>Cargando ticket...</div>
        {err && <div style={{ marginTop: 10, color: "#ff4d4d" }}>{err}</div>}
      </div>
    );
  }

  const canCloseRental = ticket.kind === "RENTAL" && ticket.status === "OPEN";
  const canCheckout =
    (ticket.kind === "BAR" && (ticket.status === "OPEN" || ticket.status === "CHECKOUT")) ||
    (ticket.kind === "RENTAL" && ticket.status === "CHECKOUT");

  const canMove = ticket.status === "OPEN" || ticket.status === "CHECKOUT";

  return (
    <div style={{ minHeight: "100vh", background: "#060606", color: "#fff", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 20 }}>
            {ticket.table.name} · {ticket.kind} · {ticket.status}
          </div>
          <div style={{ color: "#bdbdbd", fontSize: 12, marginTop: 4 }}>Ticket: {ticket.id}</div>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <a href="/tables" style={{ color: "#f5c400", fontWeight: 900, textDecoration: "none" }}>
            ← Mesas
          </a>
        </div>
      </div>

      {err && <div style={{ marginTop: 12, color: "#ff4d4d" }}>{err}</div>}

      {/* Totals */}
      <div style={{ marginTop: 14, background: "#0d0d0d", border: "1px solid #222", borderRadius: 14, padding: 14 }}>
        {/* ✅ Tiempo jugado visible */}
        {ticket.kind === "RENTAL" && liveMinutes != null && (
          <div
            style={{
              marginBottom: 10,
              padding: "6px 10px",
              borderRadius: 10,
              background: "#1a1400",
              color: "#f5c400",
              fontWeight: 900,
              fontSize: 14,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            ⏱ Tiempo jugado: {formatMinutes(liveMinutes)}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            Consumos: <b>${totals?.consumos ?? 0}</b>
          </div>
          <div>
            Arriendo: <b>${totals?.rental ?? 0}</b>
          </div>
          <div style={{ fontSize: 16 }}>
            TOTAL: <b>${totals?.total ?? 0}</b>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {canMove && (
            <button onClick={openMove} disabled={loading} style={btnSecondary()}>
              Cambiar mesa
            </button>
          )}

          {canCloseRental && (
            <button onClick={closeRental} disabled={loading} style={btnSecondary()}>
              Cerrar arriendo (calcular tiempo)
            </button>
          )}

          <button onClick={() => checkout("CASH")} disabled={loading || !canCheckout} style={btn()}>
            Cobrar CASH
          </button>
          <button onClick={() => checkout("DEBIT")} disabled={loading || !canCheckout} style={btn()}>
            Cobrar DEBIT
          </button>
        </div>

        {!canCheckout && (
          <div style={{ marginTop: 8, color: "#bdbdbd", fontSize: 12 }}>
            * Para RENTAL debes cerrar arriendo antes de cobrar. BAR puede cobrar directo.
          </div>
        )}
      </div>

      {/* Items */}
      <div style={{ marginTop: 14, background: "#0d0d0d", border: "1px solid #222", borderRadius: 14, padding: 14 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Consumos</div>
        {ticket.items.length === 0 ? (
          <div style={{ color: "#bdbdbd" }}>Sin consumos aún.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {ticket.items.map((it) => (
              <div
                key={it.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  alignItems: "center",
                  border: "1px solid #222",
                  borderRadius: 12,
                  padding: 10,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900 }}>{it.product.name}</div>
                  <div style={{ color: "#bdbdbd", fontSize: 12 }}>
                    {it.qty} × ${it.unitPrice} = <b>${it.lineTotal}</b>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => add(it.productId, -1)} disabled={loading} style={btnSecondary()}>
                    -1
                  </button>
                  <button onClick={() => add(it.productId, +1)} disabled={loading} style={btn()}>
                    +1
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Products */}
      <div style={{ marginTop: 14, background: "#0d0d0d", border: "1px solid #222", borderRadius: 14, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontWeight: 900 }}>Agregar productos</div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar..." style={inp()} />
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => add(p.id, +1)}
              disabled={loading}
              style={{
                textAlign: "left",
                border: "1px solid #222",
                background: "#111",
                color: "#fff",
                borderRadius: 12,
                padding: 12,
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: 900 }}>{p.name}</div>
              <div style={{ color: "#bdbdbd", fontSize: 12 }}>
                {p.category} · ${p.price} · stock {p.stock}
              </div>
            </button>
          ))}
        </div>

        {filtered.length === 0 && <div style={{ marginTop: 10, color: "#bdbdbd" }}>No hay productos que coincidan.</div>}
      </div>

      {/* Modal mover mesa */}
      {moveOpen && (
        <div
          onClick={() => setMoveOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(520px, 100%)",
              background: "#0d0d0d",
              border: "1px solid #222",
              borderRadius: 14,
              padding: 14,
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 16 }}>Cambiar mesa</div>
            <div style={{ color: "#bdbdbd", fontSize: 12, marginTop: 6 }}>
              Moverá consumos y tiempo tal cual. Solo muestra mesas libres del mismo tipo.
            </div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
              {freeTablesSameType.map((t) => (
                <button key={t.id} disabled={loading} onClick={() => doMove(t.id)} style={btn()}>
                  {t.name}
                </button>
              ))}
            </div>

            {freeTablesSameType.length === 0 && (
              <div style={{ marginTop: 12, color: "#bdbdbd" }}>No hay mesas libres para mover.</div>
            )}

            <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setMoveOpen(false)} disabled={loading} style={btnSecondary()}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function inp(): React.CSSProperties {
  return {
    width: "min(360px, 100%)",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #333",
    background: "#111",
    color: "#fff",
    outline: "none",
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
