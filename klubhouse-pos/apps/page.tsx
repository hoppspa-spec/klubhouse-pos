"use client";

import React, { useEffect, useMemo, useState } from "react";

type TableStatus = "FREE" | "RUNNING" | "CHECKOUT";

type PaymentMethod = "CASH" | "DEBIT";

type Product = {
  id: string;
  name: string;
  category: "COMBINADOS" | "BEBIDAS" | "AGUA" | "ENERGETICAS" | "OTROS";
  price: number; // CLP
};

type Line = {
  product: Product;
  qty: number;
};

type TableState = {
  id: number; // 1..8
  label: string;
  status: TableStatus;
  startedAt?: number; // epoch ms
  endedAt?: number;   // epoch ms
  lines: Line[];
  paymentMethod?: PaymentMethod;
};

const PRODUCTS: Product[] = [
  { id: "c1", name: "Combinado (base)", category: "COMBINADOS", price: 3500 },
  { id: "b1", name: "Bebida lata", category: "BEBIDAS", price: 1500 },
  { id: "a1", name: "Agua mineral", category: "AGUA", price: 1200 },
  { id: "e1", name: "Energética", category: "ENERGETICAS", price: 2000 },
];

const RATE_PER_HOUR = 3800;
const MINIMUM_30 = 1900;

// ceil hacia arriba a múltiplos de 100
function roundUp100(value: number): number {
  return Math.ceil(value / 100) * 100;
}

function calcMinutes(startedAt: number, nowMs: number) {
  const diff = Math.max(0, nowMs - startedAt);
  return Math.floor(diff / 60000); // minutos enteros
}

// Regla: <=30 min => 1900; >=31 => proporcional por minuto
function calcRentalAmount(minutes: number): number {
  if (minutes <= 30) return roundUp100(MINIMUM_30);
  const raw = (minutes * RATE_PER_HOUR) / 60;
  return roundUp100(raw);
}

function money(n: number) {
  return n.toLocaleString("es-CL");
}

export default function Page() {
  const [now, setNow] = useState(Date.now());
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [tables, setTables] = useState<TableState[]>(
    Array.from({ length: 8 }).map((_, idx) => {
      const id = idx + 1;
      return {
        id,
        label: id === 8 ? "BARRA" : `MESA ${id}`,
        status: "FREE",
        lines: [],
      };
    })
  );

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const selected = useMemo(
    () => tables.find((t) => t.id === selectedId) ?? null,
    [tables, selectedId]
  );

  function updateTable(id: number, patch: Partial<TableState>) {
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function startTable(id: number) {
    updateTable(id, { status: "RUNNING", startedAt: Date.now(), endedAt: undefined, paymentMethod: undefined });
  }

  function closeTable(id: number) {
    const t = tables.find((x) => x.id === id);
    if (!t?.startedAt) return;
    updateTable(id, { status: "CHECKOUT", endedAt: Date.now() });
  }

  function resetTable(id: number) {
    updateTable(id, { status: "FREE", startedAt: undefined, endedAt: undefined, lines: [], paymentMethod: undefined });
  }

  function addItem(id: number, product: Product) {
    setTables((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const existing = t.lines.find((l) => l.product.id === product.id);
        if (existing) {
          return {
            ...t,
            lines: t.lines.map((l) => (l.product.id === product.id ? { ...l, qty: l.qty + 1 } : l)),
          };
        }
        return { ...t, lines: [...t.lines, { product, qty: 1 }] };
      })
    );
  }

  function changeQty(id: number, productId: string, delta: number) {
    setTables((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const next = t.lines
          .map((l) => (l.product.id === productId ? { ...l, qty: l.qty + delta } : l))
          .filter((l) => l.qty > 0);
        return { ...t, lines: next };
      })
    );
  }

  const ui = {
    bg: "#060606",
    card: "#111111",
    card2: "#0c0c0c",
    yellow: "#f5c400",
    yellow2: "#d6aa00",
    text: "#f3f3f3",
    muted: "#bdbdbd",
    danger: "#ff4d4d",
  };

  function tableTimeLabel(t: TableState) {
    if (t.status === "FREE" || !t.startedAt) return "—";
    const end = t.status === "CHECKOUT" && t.endedAt ? t.endedAt : now;
    const seconds = Math.max(0, Math.floor((end - t.startedAt) / 1000));
    const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
    const ss = String(seconds % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  function totals(t: TableState) {
    const end = t.status === "CHECKOUT" && t.endedAt ? t.endedAt : now;
    const minutes = t.startedAt ? calcMinutes(t.startedAt, end) : 0;
    const rental = t.startedAt ? calcRentalAmount(minutes) : 0;
    const cons = t.lines.reduce((acc, l) => acc + l.qty * l.product.price, 0);
    const total = roundUp100(rental + cons);
    return { minutes, rental, cons, total };
  }

  return (
    <div style={{ minHeight: "100vh", background: ui.bg, color: ui.text, padding: 20, fontFamily: "system-ui, -apple-system" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 10, height: 10, borderRadius: 999, background: ui.yellow }} />
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 1 }}>KLUB HOUSE</div>
            <div style={{ fontSize: 12, color: ui.muted }}>POS Mesas & Barra · MVP</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: ui.muted }}>
          Tarifa: <b style={{ color: ui.text }}>${money(RATE_PER_HOUR)}/hr</b> · Mínimo: <b style={{ color: ui.text }}>${money(MINIMUM_30)}</b>
        </div>
      </header>

      <main style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14 }}>
        {tables.map((t) => {
          const statusColor =
            t.status === "FREE" ? ui.yellow :
            t.status === "RUNNING" ? ui.yellow2 :
            ui.danger;

          const border = `2px solid ${statusColor}`;
          const bg = t.status === "RUNNING" ? "#1a1400" : ui.card;

          return (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              style={{
                background: bg,
                border,
                borderRadius: 18,
                padding: 16,
                textAlign: "left",
                cursor: "pointer",
                minHeight: 120,
                boxShadow: "0 10px 30px rgba(0,0,0,.35)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 0.5 }}>{t.label}</div>
                <div style={{ fontSize: 12, color: ui.muted }}>{tableTimeLabel(t)}</div>
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 999, background: "#000", border: `1px solid ${statusColor}` }}>
                  {t.status === "FREE" ? "LIBRE" : t.status === "RUNNING" ? "EN JUEGO" : "EN COBRO"}
                </span>
                {t.lines.length > 0 && (
                  <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 999, background: "#000", border: `1px solid ${ui.muted}` }}>
                    Consumos: {t.lines.reduce((a, l) => a + l.qty, 0)}
                  </span>
                )}
              </div>

              <div style={{ marginTop: 12, fontSize: 12, color: ui.muted }}>
                Toca para {t.status === "FREE" ? "iniciar" : t.status === "RUNNING" ? "abrir" : "cobrar"}
              </div>
            </button>
          );
        })}
      </main>

      {/* MODAL */}
      {selected && (
        <div
          onClick={() => setSelectedId(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(880px, 100%)",
              background: ui.card2,
              border: `2px solid ${ui.yellow}`,
              borderRadius: 22,
              padding: 18,
              boxShadow: "0 18px 60px rgba(0,0,0,.55)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900 }}>{selected.label}</div>
                <div style={{ fontSize: 12, color: ui.muted }}>
                  Estado:{" "}
                  <b style={{ color: ui.text }}>
                    {selected.status === "FREE" ? "LIBRE" : selected.status === "RUNNING" ? "EN JUEGO" : "EN COBRO"}
                  </b>{" "}
                  · Tiempo: <b style={{ color: ui.text }}>{tableTimeLabel(selected)}</b>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {selected.status === "FREE" && (
                  <button
                    onClick={() => startTable(selected.id)}
                    style={{
                      background: ui.yellow,
                      color: "#000",
                      border: "none",
                      borderRadius: 14,
                      padding: "10px 14px",
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    Iniciar arriendo
                  </button>
                )}

                {selected.status === "RUNNING" && (
                  <button
                    onClick={() => closeTable(selected.id)}
                    style={{
                      background: "#ffcc00",
                      color: "#000",
                      border: "none",
                      borderRadius: 14,
                      padding: "10px 14px",
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    Cerrar y cobrar
                  </button>
                )}

                {(selected.status === "RUNNING" || selected.status === "CHECKOUT") && (
                  <button
                    onClick={() => resetTable(selected.id)}
                    style={{
                      background: "transparent",
                      color: ui.text,
                      border: `1px solid ${ui.muted}`,
                      borderRadius: 14,
                      padding: "10px 14px",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Liberar / Reset (MVP)
                  </button>
                )}

                <button
                  onClick={() => setSelectedId(null)}
                  style={{
                    background: "transparent",
                    color: ui.text,
                    border: `1px solid ${ui.muted}`,
                    borderRadius: 14,
                    padding: "10px 14px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 14, marginTop: 14 }}>
              {/* Productos */}
              <div style={{ padding: 14, borderRadius: 18, background: "#0a0a0a", border: "1px solid #1b1b1b" }}>
                <div style={{ fontWeight: 900, marginBottom: 10 }}>Agregar consumo</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                  {PRODUCTS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addItem(selected.id, p)}
                      style={{
                        background: "#111",
                        border: `1px solid ${ui.yellow2}`,
                        borderRadius: 14,
                        padding: 12,
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontWeight: 900 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: ui.muted }}>
                        {p.category} · ${money(p.price)}
                      </div>
                    </button>
                  ))}
                </div>

                <div style={{ marginTop: 14, fontSize: 12, color: ui.muted }}>
                  * En producción esto vendrá de Inventario con stock + alertas.
                </div>
              </div>

              {/* Resumen / Cobro */}
              <div style={{ padding: 14, borderRadius: 18, background: "#0a0a0a", border: "1px solid #1b1b1b" }}>
                <div style={{ fontWeight: 900, marginBottom: 10 }}>Resumen</div>
                {(() => {
                  const t = totals(selected);
                  return (
                    <>
                      <Row label="Minutos jugados" value={`${t.minutes} min`} />
                      <Row label="Arriendo (redondeado)" value={`$${money(t.rental)}`} />
                      <Row label="Consumos" value={`$${money(t.cons)}`} />
                      <div style={{ height: 1, background: "#1b1b1b", margin: "10px 0" }} />
                      <Row label="TOTAL (a $100)" value={`$${money(t.total)}`} strong />

                      {selected.status === "CHECKOUT" && (
                        <>
                          <div style={{ marginTop: 12, fontWeight: 900 }}>Medio de pago</div>
                          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                            <PayBtn
                              active={selected.paymentMethod === "CASH"}
                              label="Efectivo"
                              onClick={() => updateTable(selected.id, { paymentMethod: "CASH" })}
                              ui={ui}
                            />
                            <PayBtn
                              active={selected.paymentMethod === "DEBIT"}
                              label="Débito"
                              onClick={() => updateTable(selected.id, { paymentMethod: "DEBIT" })}
                              ui={ui}
                            />
                          </div>

                          <button
                            onClick={() => {
                              if (!selected.paymentMethod) return alert("Selecciona medio de pago.");
                              alert("MVP: Pago registrado. En producción: crea Payment + folio + descuenta stock + voucher.");
                              resetTable(selected.id);
                              setSelectedId(null);
                            }}
                            style={{
                              marginTop: 12,
                              width: "100%",
                              background: ui.yellow,
                              color: "#000",
                              border: "none",
                              borderRadius: 14,
                              padding: "12px 14px",
                              fontWeight: 900,
                              cursor: "pointer",
                            }}
                          >
                            Pagar y finalizar
                          </button>

                          <button
                            onClick={() => window.print()}
                            style={{
                              marginTop: 10,
                              width: "100%",
                              background: "transparent",
                              color: ui.text,
                              border: `1px solid ${ui.muted}`,
                              borderRadius: 14,
                              padding: "12px 14px",
                              fontWeight: 900,
                              cursor: "pointer",
                            }}
                          >
                            Imprimir voucher (MVP)
                          </button>
                        </>
                      )}
                    </>
                  );
                })()}

                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>Detalle consumos</div>
                  {selected.lines.length === 0 ? (
                    <div style={{ fontSize: 12, color: ui.muted }}>Sin consumos.</div>
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      {selected.lines.map((l) => (
                        <div key={l.product.id} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                          <div>
                            <div style={{ fontWeight: 800 }}>{l.product.name}</div>
                            <div style={{ fontSize: 12, color: ui.muted }}>
                              ${money(l.product.price)} · x{l.qty}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <button onClick={() => changeQty(selected.id, l.product.id, -1)} style={qtyBtn(ui)}>
                              -
                            </button>
                            <button onClick={() => changeQty(selected.id, l.product.id, +1)} style={qtyBtn(ui)}>
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 6 }}>
      <div style={{ fontSize: 12, color: "#bdbdbd" }}>{label}</div>
      <div style={{ fontSize: strong ? 16 : 13, fontWeight: strong ? 900 : 800 }}>{value}</div>
    </div>
  );
}

function PayBtn({ active, label, onClick, ui }: { active: boolean; label: string; onClick: () => void; ui: any }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        background: active ? ui.yellow : "transparent",
        color: active ? "#000" : ui.text,
        border: `1px solid ${active ? ui.yellow : ui.muted}`,
        borderRadius: 14,
        padding: "10px 12px",
        fontWeight: 900,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function qtyBtn(ui: any): React.CSSProperties {
  return {
    width: 36,
    height: 32,
    borderRadius: 10,
    border: `1px solid ${ui.yellow2}`,
    background: "#111",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  };
}
