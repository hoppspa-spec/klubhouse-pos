"use client";

import { useEffect, useMemo, useState } from "react";
import { createUser, listUsers, setUserActive, setUserPassword } from "@/lib/users";

type Role = "MASTER" | "SLAVE" | "SELLER";

type UserRow = {
  id: string;
  username: string;
  name: string;
  role: Role;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // create form
  const [username, setU] = useState("");
  const [name, setN] = useState("");
  const [password, setP] = useState("");

  // password reset
  const [pwUserId, setPwUserId] = useState<string>("");
  const [pwNew, setPwNew] = useState("");

  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const data = await listUsers();
      setUsers(data);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Error cargando usuarios");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreateSeller() {
    setErr(null);
    setLoading(true);
    try {
      if (!username || !name || !password) {
        setErr("Completa usuario, nombre y clave.");
        return;
      }
      await createUser({ username, name, password, role: "SELLER" });
      setU("");
      setN("");
      setP("");
      await load();
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Error creando vendedor");
    } finally {
      setLoading(false);
    }
  }

  async function onToggle(u: UserRow) {
    setErr(null);
    setLoading(true);
    try {
      await setUserActive(u.id, !u.isActive);
      await load();
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Error actualizando usuario");
    } finally {
      setLoading(false);
    }
  }

  async function onResetPassword() {
    setErr(null);
    setLoading(true);
    try {
      if (!pwUserId || !pwNew) {
        setErr("Selecciona usuario y escribe nueva clave.");
        return;
      }
      await setUserPassword(pwUserId, pwNew);
      setPwUserId("");
      setPwNew("");
      await load();
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Error cambiando clave");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#060606", color: "#fff", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 20 }}>Usuarios</div>
          <div style={{ color: "#bdbdbd", fontSize: 12 }}>
            {currentUser?.role ? `Rol actual: ${currentUser.role}` : "Admin"}
          </div>
        </div>
        <a href="/tables" style={{ color: "#f5c400", fontWeight: 800, textDecoration: "none" }}>
          ← Volver a mesas
        </a>
      </div>

      {err && (
        <div style={{ marginTop: 12, color: "#ff4d4d", fontSize: 13, whiteSpace: "pre-wrap" }}>
          {err}
        </div>
      )}

      {/* Create seller */}
      <div style={{ marginTop: 18, background: "#0d0d0d", border: "1px solid #222", borderRadius: 14, padding: 14 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Crear vendedor (SELLER)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10 }}>
          <input placeholder="username" value={username} onChange={(e) => setU(e.target.value)} style={inp()} />
          <input placeholder="nombre" value={name} onChange={(e) => setN(e.target.value)} style={inp()} />
          <input placeholder="clave" type="password" value={password} onChange={(e) => setP(e.target.value)} style={inp()} />
          <button onClick={onCreateSeller} style={btn()} disabled={loading}>
            Crear
          </button>
        </div>
        <div style={{ marginTop: 8, color: "#bdbdbd", fontSize: 12 }}>
          Nota: MANAGER (SLAVE) solo puede crear SELLER. MASTER puede todo.
        </div>
      </div>

      {/* Reset password */}
      <div style={{ marginTop: 14, background: "#0d0d0d", border: "1px solid #222", borderRadius: 14, padding: 14 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Reset clave</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10 }}>
          <select value={pwUserId} onChange={(e) => setPwUserId(e.target.value)} style={inp()}>
            <option value="">Selecciona usuario</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username} ({u.role}) {u.isActive ? "" : "— BLOQ"}
              </option>
            ))}
          </select>
          <input placeholder="nueva clave" type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} style={inp()} />
          <button onClick={onResetPassword} style={btn()} disabled={loading}>
            Guardar
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ marginTop: 14, background: "#0d0d0d", border: "1px solid #222", borderRadius: 14, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ fontWeight: 900 }}>Lista</div>
          <button onClick={load} style={btnSecondary()} disabled={loading}>
            {loading ? "Cargando..." : "Refrescar"}
          </button>
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {users.map((u) => (
            <div
              key={u.id}
              style={{
                border: "1px solid #222",
                borderRadius: 12,
                padding: 12,
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 900 }}>
                  {u.username}{" "}
                  <span style={{ color: "#bdbdbd", fontWeight: 600 }}>
                    ({u.role})
                  </span>
                </div>
                <div style={{ color: "#bdbdbd", fontSize: 12 }}>{u.name}</div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ fontSize: 12, color: u.isActive ? "#7CFC98" : "#ff4d4d" }}>
                  {u.isActive ? "Activo" : "Bloqueado"}
                </div>
                <button onClick={() => onToggle(u)} style={u.isActive ? btnDanger() : btn()} disabled={loading}>
                  {u.isActive ? "Bloquear" : "Activar"}
                </button>
              </div>
            </div>
          ))}
          {users.length === 0 && <div style={{ color: "#bdbdbd" }}>No hay usuarios.</div>}
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

