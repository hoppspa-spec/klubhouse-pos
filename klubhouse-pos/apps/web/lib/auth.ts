import { API_URL } from "./api";

export async function login(username: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error("Login inválido");
  return res.json() as Promise<{ accessToken: string; user: any }>;
}
