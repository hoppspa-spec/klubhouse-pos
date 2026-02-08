const API = process.env.NEXT_PUBLIC_API_URL;

function authHeaders() {
  const token = localStorage.getItem("accessToken");
  return { Authorization: `Bearer ${token}` };
}

async function safeJson(res: Response) {
  const txt = await res.text();
  try {
    return txt ? JSON.parse(txt) : null;
  } catch {
    return txt;
  }
}

export async function listUsers() {
  const res = await fetch(`${API}/users`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`listUsers failed: ${res.status}`);
  return res.json();
}

export async function createUser(data: {
  username: string;
  name: string;
  password: string;
  role: "SELLER" | "SLAVE" | "MASTER";
}) {
  const res = await fetch(`${API}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const detail = await safeJson(res);
    throw new Error(`createUser failed: ${res.status} ${JSON.stringify(detail)}`);
  }
  return res.json();
}

export async function setUserActive(id: string, isActive: boolean) {
  const res = await fetch(`${API}/users/${id}/active`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ isActive }),
  });

  if (!res.ok) {
    const detail = await safeJson(res);
    throw new Error(`setUserActive failed: ${res.status} ${JSON.stringify(detail)}`);
  }
  return res.json();
}

export async function setUserPassword(id: string, password: string) {
  const res = await fetch(`${API}/users/${id}/password`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ password }),
  });

  if (!res.ok) {
    const detail = await safeJson(res);
    throw new Error(`setUserPassword failed: ${res.status} ${JSON.stringify(detail)}`);
  }
  return res.json();
}
