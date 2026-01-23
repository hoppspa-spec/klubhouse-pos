const API = process.env.NEXT_PUBLIC_API_URL;

function authHeader() {
  const token = localStorage.getItem("accessToken");
  return { Authorization: `Bearer ${token}` };
}

export async function listUsers() {
  const r = await fetch(`${API}/users`, { headers: authHeader() });
  if (!r.ok) throw new Error("Error listando usuarios");
  return r.json();
}

export async function createUser(data: {
  username: string;
  name: string;
  password: string;
  role: "SELLER" | "SLAVE" | "MASTER";
}) {
  const r = await fetch(`${API}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error("Error creando usuario");
  return r.json();
}

export async function toggleUser(id: string, isActive: boolean) {
  const r = await fetch(`${API}/users/${id}/active`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ isActive }),
  });
  if (!r.ok) throw new Error("Error actualizando usuario");
  return r.json();
}
