"use client";
import { useEffect, useState } from "react";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [username, setU] = useState("");
  const [name, setN] = useState("");
  const [password, setP] = useState("");

  async function load() {
    setUsers(await listUsers());
  }

  useEffect(() => { load(); }, []);

  async function onCreate() {
    await createUser({ username, name, password, role: "SELLER" });
    setU(""); setN(""); setP("");
    load();
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Usuarios</h2>

      <div style={{ marginBottom: 20 }}>
        <input placeholder="Usuario" value={username} onChange={e => setU(e.target.value)} />
        <input placeholder="Nombre" value={name} onChange={e => setN(e.target.value)} />
        <input placeholder="Clave" type="password" value={password} onChange={e => setP(e.target.value)} />
        <button onClick={onCreate}>Crear vendedor</button>
      </div>

      {users.map(u => (
        <div key={u.id}>
          {u.username} ({u.role}) — {u.isActive ? "Activo" : "Bloqueado"}
          <button onClick={() => toggleUser(u.id, !u.isActive)}>
            {u.isActive ? "Bloquear" : "Activar"}
          </button>
        </div>
      ))}
    </div>
  );
}


