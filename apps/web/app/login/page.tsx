"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, API_URL } from "@/lib/api";

type Role = "MASTER" | "SLAVE" | "SELLER";

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  isActive: boolean;
};

type TicketItem = {
  id: string;
  productId: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  product: Product;
};

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

function formatMinutes(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
}

export default function TicketPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [totals, setTotals] = useState<{ consumos: number; rental: number; total: number } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [liveMinutes, setLiveMinutes] = useState<number | null>(null);

  // 👇 USER REAL (FIX)
  const [user, setUser] = useState<{ role: Role; name?: string; username?: string } | null>(null);

  // mover mesa (V1 visible solo manager)
  const [moveOpen, setMoveOpen] = useState(false);
  const [tables, setTables] = useState<TableState[]>([]);

  // ✅ CARGAR USER DESDE LOCALSTORAGE (CORRECTO)
  useEffect(() => {
    try {
      const u = localStorage.getItem("user");
      if (u) setUser(JSON.parse(u));
    } catch {}
  }, []);

  const role = user?.role;
  const isManager = role === "MASTER" || role === "SLAVE";
  const isSeller = role === "SELLER";

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    if (!s) return products;
    return products.filter((p) =>
      `${p.name} ${p.category}`.toLowerCase().includes(s)
    );
  }, [products, q]);

  async function load() {
    try {
      const [t, ps] = await Promise.all([
        api<{ ticket: Ticket; totals: any }>(`/tickets/${id}`),
        api<Product[]>("/products"),
      ]);

      setTicket(t.ticket);
      setTotals(t.totals);
      setProducts(ps.filter((p) => p.isActive));
    } catch {
      setErr("No pude cargar ticket");
    }
  }

  useEffect(() => {
    load();
    const i = setInterval(load, 2000);
    return () => clearInterval(i);
  }, [id]);

  // ⏱️ tiempo vivo
  useEffect(() => {
    if (!ticket) return;

    if (ticket.kind === "RENTAL" && ticket.status === "OPEN" && ticket.startedAt) {
      const tick = () => setLiveMinutes(diffMinutes(ticket.startedAt!, new Date()));
      tick();
      const i = setInterval(tick, 1000);
      return () => clearInterval(i);
    }

    if (ticket.minutesPlayed != null) {
      setLiveMinutes(ticket.minutesPlayed);
    }
  }, [ticket]);

  async function add(productId: string, qtyDelta: number) {
    if (!ticket) return;
    setLoading(true);
    await api(`/tickets/${ticket.id}/items`, {
      method: "POST",
      body: JSON.stringify({ productId, qtyDelta }),
    });
    await load();
    setLoading(false);
  }

  async function checkout(method: "CASH" | "DEBIT") {
    if (!ticket) return;
    setLoading(true);

    const res = await api<any>(`/tickets/${ticket.id}/checkout`, {
      method: "POST",
      body: JSON.stringify({ method }),
    });

    const url = `${API_URL}/tickets/${ticket.id}/receipt?token=${encodeURIComponent(res.receiptToken)}`;

    // 🧾 voucher en nueva ventana
    window.open(url, "_blank", "noopener,noreferrer");

    // 🏠 volver a mesas
    setTimeout(() => router.replace("/tables"), 300);
  }

  if (!ticket || !user) {
    return <div style={{ color: "#fff", padding: 20 }}>Cargando…</div>;
  }

  // ✅ GATES CORRECTOS
  const canCheckout =
    ticket.status !== "PAID" &&
    (
      (ticket.kind === "BAR" && (ticket.status === "OPEN" || ticket.status === "CHECKOUT")) ||
      (ticket.kind === "RENTAL" &&
        (ticket.status === "CHECKOUT" || isSeller))
    );

  return (
    <div style={{ background: "#060606", color: "#fff", minHeight: "100vh", padding: 20 }}>
      <h2>{ticket.table.name} · {ticket.kind} · {ticket.status}</h2>

      {liveMinutes != null && ticket.kind === "RENTAL" && (
        <div style={{ color: "#f5c400" }}>
          ⏱ {formatMinutes(liveMinutes)}
        </div>
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
          <div key={it.id}>
            {it.product.name} · {it.qty}
            <button onClick={() => add(it.productId, +1)}>+</button>
            <button onClick={() => add(it.productId, -1)}>-</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function btn(): React.CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: 12,
    background: "#f5c400",
    color: "#000",
    fontWeight: 900,
    border: "none",
    cursor: "pointer",
  };
}

