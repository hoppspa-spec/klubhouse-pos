"use client";

import { useEffect, useMemo, useState } from "react";
import { adjustProductStock, createProduct, listProducts, setProductActive, updateProduct, type Product } from "@/lib/products";

type Role = "MASTER" | "SLAVE" | "SELLER";

export default function ProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? (JSON.parse(raw) as { role?: Role }) : null;
    } catch {
      return null;
    }
  }, []);

  const canManage = currentUser?.role === "MASTER" || currentUser?.role === "SLAVE";

  // create form
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Bebidas");
  const [price, setPrice] = useState<number>(1200);
  const [stock, setStock] = useState<number>(10);
  const [stockCritical, setStockCritical] = useState<number>(3);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const data = await listProducts();
      setItems(data);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "No pude cargar productos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter(p => (p.name + " " + p.category).toLowerCase().includes(s));
  }, [items, q]);

  async function onCreate() {
    if (!canManage) return;
    setErr(null);
    setLoading(true);
    try {
      await createProduct({ name, category, price, stock, stockCritical });
      setName("");
      setPrice(1200);
      setStock(10);
      await load();
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "No pude crear producto");
    } finally {
      setLoading(false);
    }
  }

  async function onToggleActive(p: Product) {
    if (!canManage) return;
    setErr(null);
    setLoading(true);
    try {
      await setProductActive(p.id, !p.isActive);
      await load();
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "No pude activar/desactivar");
    } finally {
      setLoading(false);
    }
  }

  async function onPrice(p: Product) {
    if (!canManage) return;
    const raw = prompt(`Nuevo precio para ${p.name}`, String(p.price));
    if (raw == null) return;
    const v = Number(raw);
    if (!Number.isFinite(v) || v < 0) return alert("Precio inválido");

    setErr(null);
    setLoading(true);
    try {
      await updateProduct(p.id, { price: v });
      await load();
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "No pude cambiar precio");
    } finally {
      setLoading(false);
    }
  }

  async function onStock(p: Product) {
    if (!canManage) return;
    const raw = prompt(`Ajuste stock (ej: +10 o -3) para ${p.name}`, "+1");
    if (raw == null) return;
    const v = Number(raw);
    if (!Number.isFinite(v) || v === 0) return alert("Delta inválido");

    setErr(null);
    setLoading(true);
    try {
      await adjustProductStock(p.id, v, "Ajuste manual");
      await load();
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "No pude ajustar stock");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#060606", color: "#fff", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 20 }}>Productos</div>
          <div style={{ color: "#bdbdbd", fontSize: 12 }}>
            {currentUser?.role ? `Rol actual: ${currentUser.role}` : ""}
            {!canManage && " · (Solo lectura)"}
          </div>
        </div>
        <a href="/tables" style={{ color: "#f5c400", fontWeight: 900, textDecoration: "none" }}>
          ← Mesas
        </a>
      </div>

      {err && <div style={{ marginTop: 12, color: "#ff4d4d", fontSize: 13, whiteSpace: "pre-wrap" }}>{err}</div>}

      {/* Create */}
      <div style={{ marginTop: 16, background: "#0d0d0d", border: "1px solid #222", borderRadius: 14, padding: 14, opacity: canManage ? 1 : 0.6 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Crear producto</div>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 0.6fr 0.6fr 0.6fr auto", gap: 10 }}>
          <input disabled={!canManage || loading} placeholder="Nombre (ej: Heineken)" value={name} onChange={(e) => setName(e.target.value)} style={inp()} />
          <input disabled={!canManage || loading} placeholder="Categoría (ej: Cervezas)" value={category} onChange={(e) => setCategory(e.target.value)} style={inp()} />
          <input disabled={!canManage || loading} placeholder="Precio" type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} style={inp()} />
          <input disabled={!canManage || loading} placeholder="Stock" type="number" value={stock} onChange={(e) => setStock(Number(e.target.value))} style={inp()} />
          <input disabled={!canManage || loading} placeholder="Crítico" type="number" value={stockCritical} onChange={(e) => setStockCritical(Number(e.target.value))} style={inp()} />
          <button disabled={!canManage || loading || !name.trim()} onClick={onCreate} style={btn()}>
            Crear
          </button>
        </div>
        {!canManage && <div style={{ marginTop: 8, color: "#bdbdbd", fontSize: 12 }}>Solo MASTER/SLAVE pueden crear/editar productos.</div>}
      </div>

      {/* Search + list */}
      <div style={{ marginTop: 14, background: "#0d0d0d", border: "1px solid #222", borderRadius: 14, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 900 }}>Lista</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar..." style={{ ...inp(), width: 260 }} />
            <button onClick={load} disabled={loading} style={btnSecondary()}>{loading ? "Cargando..." : "Refrescar"}</button>
          </div>
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {filtered.map((p) => {
            const warn = p.stockCritical > 0 && p.stock <= p.stockCritical;
            return (
              <div key={p.id} style={{ border: "1px solid #222", borderRadius: 12, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900 }}>
                    {p.name}{" "}
                    <span style={{ color: "#bdbdbd", fontWeight: 600 }}>({p.category})</span>
                    {!p.isActive && <span style={{ marginLeft: 8, color: "#ff4d4d", fontWeight: 900 }}>INACTIVO</span>}
                  </div>
                  <div style={{ color: "#bdbdbd", fontSize: 12 }}>
                    Precio: <b>${p.price}</b> · Stock:{" "}
                    <b style={{ color: warn ? "#ff4d4d" : "#7CFC98" }}>{p.stock}</b>
                    {p.stockCritical ? <span> · Crítico: {p.stockCritical}</span> : null}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button onClick={() => onPrice(p)} disabled={!canManage || loading} style={btnSecondary()}>
                    Cambiar precio
                  </button>
                  <button onClick={() => onStock(p)} disabled={!canManage || loading} style={btnSecondary()}>
                    Ajustar stock
                  </button>
                  <button onClick={() => onToggleActive(p)} disabled={!canManage || loading} style={p.isActive ? btnDanger() : btn()}>
                    {p.isActive ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <div style={{ color: "#bdbdbd" }}>No hay productos.</div>}
        </div>
      </div>
    </div>
  );
}

function inp(): React.CSSProperties {
  return {
    width: "100%",
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

function btnDanger(): React.CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: 12,
    border: "none",
    background: "#ff4d4d",
    color: "#000",
    fontWeight: 900,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}
