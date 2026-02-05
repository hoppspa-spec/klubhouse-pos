"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type Role = "MASTER" | "SLAVE" | "SELLER";

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  stockCritical: number; // ✅ FIX: coincide con Prisma (stockCritical)
  isActive: boolean;
};

type EditDraft = {
  id: string;
  name: string;
  category: string;
  price: string;
  stock: string;
  stockCritical: string;
  isActive: boolean;
};

function clampIntString(v: string) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  return String(Math.max(0, Math.trunc(n)));
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // create form
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Bebidas");
  const [price, setPrice] = useState<string>("1200");
  const [stock, setStock] = useState<string>("10");
  const [stockCritical, setStockCritical] = useState<string>("3");

  // role
  const [role, setRole] = useState<Role | null>(null);

  // edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState<EditDraft | null>(null);

  useEffect(() => {
    try {
      const u = localStorage.getItem("user");
      if (u) setRole(JSON.parse(u)?.role ?? null);
    } catch {}
  }, []);

  const isManager = role === "MASTER" || role === "SLAVE";

  async function load() {
    setErr(null);
    try {
      const ps = await api<Product[]>("/products");
      setProducts(ps || []);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "No pude cargar productos");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = !s
      ? products
      : products.filter((p) => `${p.name} ${p.category}`.toLowerCase().includes(s));

    return [...base].sort((a, b) => {
      const c = a.category.localeCompare(b.category);
      if (c !== 0) return c;
      return a.name.localeCompare(b.name);
    });
  }, [products, q]);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

  function openEdit(p: Product) {
    if (!isManager) return;
    setErr(null);
    setDraft({
      id: p.id,
      name: p.name,
      category: p.category,
      price: String(p.price),
      stock: String(p.stock),
      stockCritical: String(p.stockCritical),
      isActive: p.isActive,
    });
    setEditOpen(true);
  }

  function closeEdit() {
    setEditOpen(false);
    setDraft(null);
  }

  function parseNonNegInt(s: string, field: string) {
    const n = Number(s);
    if (!Number.isFinite(n)) throw new Error(`${field}: inválido`);
    if (n < 0) throw new Error(`${field}: no puede ser negativo`);
    return Math.trunc(n);
  }

  async function create() {
    if (!isManager) return;

    const nm = name.trim();
    const cat = category.trim();
    if (!nm) return setErr("Nombre requerido");
    if (!cat) return setErr("Categoría requerida");

    let p = 0,
      st = 0,
      crit = 0;
    try {
      p = parseNonNegInt(price, "Precio");
      st = parseNonNegInt(stock, "Stock");
      crit = parseNonNegInt(stockCritical, "Crítico");
    } catch (e: any) {
      return setErr(e?.message || "Valores inválidos");
    }

    setLoading(true);
    setErr(null);
    try {
      await api("/products", {
        method: "POST",
        body: JSON.stringify({
          name: nm,
          category: cat,
          price: p,
          stock: st,
          stockCritical: crit, // ✅ FIX
        }),
      });

      setName("");
      // mantenemos categoría
      await load();
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "No pude crear producto");
    } finally {
      setLoading(false);
    }
  }

  async function patch(id: string, data: Partial<Product>) {
    if (!isManager) return;

    setLoading(true);
    setErr(null);
    try {
      await api(`/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      await load();
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "No pude actualizar producto");
    } finally {
      setLoading(false);
    }
  }

  async function saveEdit() {
    if (!isManager || !draft) return;

    const nm = draft.name.trim();
    const cat = draft.category.trim();
    if (!nm) return setErr("Nombre requerido");
    if (!cat) return setErr("Categoría requerida");

    let p = 0,
      st = 0,
      crit = 0;
    try {
      p = parseNonNegInt(draft.price, "Precio");
      st = parseNonNegInt(draft.stock, "Stock");
      crit = parseNonNegInt(draft.stockCritical, "Crítico");
    } catch (e: any) {
      return setErr(e?.message || "Valores inválidos");
    }

    await patch(draft.id, {
      name: nm,
      category: cat,
      price: p,
      stock: st,
      stockCritical: crit, // ✅ FIX
    });

    closeEdit();
  }

  async function toggleActive(p: Product) {
    if (!isManager) return;

    // confirm suave solo al desactivar
    if (p.isActive) {
      const ok = window.confirm(`¿Desactivar "${p.name}"? (no aparecerá para vender)`);
      if (!ok) return;
    }

    await patch(p.id, { isActive: !p.isActive });
  }

  const canCreate =
    isManager &&
    !loading &&
    name.trim().length > 0 &&
    category.trim().length > 0 &&
    price.trim().length > 0 &&
    stock.trim().length > 0 &&
    stockCritical.trim().length > 0;

  return (
    <div style={{ minHeight: "100vh", background: "#060606", color: "#fff", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 22 }}>Productos</div>
          <div style={{ color: "#bdbdbd", marginTop: 6, fontSize: 12 }}>Rol actual: {role ?? "NO_ROLE"}</div>
        </div>
        <a href="/tables" style={{ color: "#f5c400", fontWeight: 900, textDecoration: "none" }}>
          ← Mesas
        </a>
      </div>

      {err && <div style={{ marginTop: 12, color: "#ff4d4d" }}>{err}</div>}

      {/* Crear producto */}
      <div style={{ marginTop: 16, background: "#0d0d0d", border: "1px solid #222", borderRadius: 16, padding: 14 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Crear producto</div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto", gap: 10, alignItems: "center" }}>
          <input
            disabled={!isManager || loading}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre (ej: Heineken)"
            style={inp()}
          />

          {/* categoría con datalist pro */}
          <div style={{ position: "relative" }}>
            <input
              disabled={!isManager || loading}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Categoría"
              list="categories"
              style={inp()}
            />
            <datalist id="categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <input
            disabled={!isManager || loading}
            type="number"
            value={price}
            onChange={(e) => setPrice(clampIntString(e.target.value))}
            style={inp()}
            placeholder="Precio"
          />
          <input
            disabled={!isManager || loading}
            type="number"
            value={stock}
            onChange={(e) => setStock(clampIntString(e.target.value))}
            style={inp()}
            placeholder="Stock"
          />
          <input
            disabled={!isManager || loading}
            type="number"
            value={stockCritical}
            onChange={(e) => setStockCritical(clampIntString(e.target.value))}
            style={inp()}
            placeholder="Crítico"
          />

          <button disabled={!canCreate} onClick={create} style={btn()}>
            {loading ? "..." : "Crear"}
          </button>
        </div>

        {!isManager && (
          <div style={{ marginTop: 10, color: "#bdbdbd", fontSize: 12 }}>
            * En V1, solo MASTER/SLAVE pueden administrar productos.
          </div>
        )}
      </div>

      {/* Lista */}
      <div style={{ marginTop: 16, background: "#0d0d0d", border: "1px solid #222", borderRadius: 16, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontWeight: 900 }}>Lista</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar..." style={inpWide()} />
            <button disabled={loading} onClick={load} style={btnSecondary()}>
              Refrescar
            </button>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {filtered.map((p) => {
            const low = p.stock <= p.stockCritical && p.isActive;
            return (
              <div
                key={p.id}
                style={{
                  border: "1px solid #222",
                  borderRadius: 14,
                  padding: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>
                    {p.name}{" "}
                    <span style={{ color: "#bdbdbd", fontWeight: 700 }}>({p.category.toUpperCase()})</span>{" "}
                    {!p.isActive && <span style={{ color: "#ff4d4d", marginLeft: 8 }}>INACTIVO</span>}
                    {low && <span style={{ color: "#f5c400", marginLeft: 8 }}>BAJO STOCK</span>}
                  </div>
                  <div style={{ color: "#bdbdbd", fontSize: 12, marginTop: 4 }}>
                    Precio: <b>${p.price}</b> · Stock: <b>{p.stock}</b> · Crítico: <b>{p.stockCritical}</b>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button disabled={!isManager || loading} onClick={() => openEdit(p)} style={btnSecondary()}>
                    Editar
                  </button>

                  <button
                    disabled={!isManager || loading}
                    onClick={() => toggleActive(p)}
                    style={p.isActive ? btnDanger() : btn()}
                  >
                    {p.isActive ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && <div style={{ marginTop: 10, color: "#bdbdbd" }}>No hay productos.</div>}
        </div>
      </div>

      {/* Modal edición pro */}
      {editOpen && draft && (
        <div
          onClick={closeEdit}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(760px, 100%)",
              background: "#0d0d0d",
              border: "1px solid #222",
              borderRadius: 16,
              padding: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 16 }}>Editar producto</div>
                <div style={{ color: "#bdbdbd", fontSize: 12, marginTop: 4 }}>
                  Cambia nombre/categoría/precio/stock/crítico. (ID: {draft.id})
                </div>
              </div>
              <button onClick={closeEdit} disabled={loading} style={btnSecondary()}>
                Cerrar
              </button>
            </div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 10 }}>
              <div>
                <label style={lbl()}>Nombre</label>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  style={inp()}
                  disabled={!isManager || loading}
                />
              </div>

              <div>
                <label style={lbl()}>Categoría</label>
                <input
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                  style={inp()}
                  list="categories"
                  disabled={!isManager || loading}
                />
              </div>

              <div>
                <label style={lbl()}>Precio</label>
                <input
                  type="number"
                  value={draft.price}
                  onChange={(e) => setDraft({ ...draft, price: clampIntString(e.target.value) })}
                  style={inp()}
                  disabled={!isManager || loading}
                />
              </div>

              <div>
                <label style={lbl()}>Stock</label>
                <input
                  type="number"
                  value={draft.stock}
                  onChange={(e) => setDraft({ ...draft, stock: clampIntString(e.target.value) })}
                  style={inp()}
                  disabled={!isManager || loading}
                />
              </div>

              <div>
                <label style={lbl()}>Crítico</label>
                <input
                  type="number"
                  value={draft.stockCritical}
                  onChange={(e) => setDraft({ ...draft, stockCritical: clampIntString(e.target.value) })}
                  style={inp()}
                  disabled={!isManager || loading}
                />
              </div>
            </div>

            <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
              <button disabled={!isManager || loading} onClick={saveEdit} style={btn()}>
                {loading ? "..." : "Guardar cambios"}
              </button>
            </div>

            {!isManager && (
              <div style={{ marginTop: 10, color: "#bdbdbd", fontSize: 12 }}>
                * En V1, solo MASTER/SLAVE pueden editar.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function lbl(): React.CSSProperties {
  return { display: "block", fontSize: 12, color: "#bdbdbd", marginBottom: 6 };
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

function inpWide(): React.CSSProperties {
  return { ...inp(), width: "min(360px, 100%)" };
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
