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

function diffMinutes(from: string, to: Date) {
  return Math.max(0, Math.floor((to.getTime() - new Date(from).getTime()) / 60000));
}

function formatMinutes(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
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

  useEffect(() => {
    try {
      const u = localStorage.getItem("user");
      if (u) setUser(JSON.parse(u));
    } catch {}
  }, []);

  const role = user?.role;
  const isSeller = role === "SELLER";

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

  if (!id) return <div style={{ color: "#fff", padding: 20 }}>Ticket inválido (sin id).</div>;
  if (!ticket || !user) return <div style={{ color: "#fff", padding: 20 }}>Cargando…</div>;

  // ✅ Gate CORRECTO
  const canCheckout =
    ticket.status !== "PAID" &&
    ticket.status !== "CANCELED" &&
    (
      (ticket.kind === "BAR" && (ticket.status === "OPEN" || ticket.status === "CHECKOUT")) ||
      (ticket.kind === "RENTAL" && (ticket.status === "CHECKOUT" || (isSeller && ticket.status === "OPEN")))
    );

  return (
    <div style={{ background: "#060606", color: "#fff", minHeight: "100vh", padding: 20 }}>
      <h2>
        {ticket.table.name} · {ticket.kind} · {ticket.status}
      </h2>

      {err && <div style={{ marginTop: 10, color: "#ff4d4d" }}>{err}</div>}

      {liveMinutes != null && ticket.kind === "RENTAL" && (
        <div style={{ color: "#f5c400" }}>⏱ {formatMinutes(liveMinutes)}</div>
      )}

      <div style={{ marginTop: 12 }}>
        TOTAL: <b>${totals?.total ?? 0}</b>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
        <button disabled={!canCheckout || loading} onClick={() => checkout("CASH")} style={btn()}>
          Cobrar CASH
        </button>
        <button disabled={!canCheckout || loading} onClick={() => checkout("DEBIT")} style={btn()}>
          Cobrar DEBIT
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
                {p.category} · ${p.price} · stock {p.stock}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function btn(): React.CSSProperties {
  return { padding: "10px 14px", borderRadius: 12, background: "#f5c400", color: "#000", fontWeight: 900, border: "none", cursor: "pointer" };
}
function btnSmall(): React.CSSProperties {
  return { padding: "6px 10px", borderRadius: 10, background: "#111", color: "#fff", fontWeight: 900, border: "1px solid #333", cursor: "pointer" };
}
function inp(): React.CSSProperties {
  return { width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #333", background: "#111", color: "#fff", outline: "none" };
}
function card(): React.CSSProperties {
  return { textAlign: "left", border: "1px solid #222", background: "#0d0d0d", color: "#fff", borderRadius: 12, padding: 12, cursor: "pointer" };
}

