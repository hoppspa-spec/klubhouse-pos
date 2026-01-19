export async function login(username: string, password: string) {
  const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!r.ok) throw new Error("bad login");
  return r.json() as Promise<{ access_token: string }>;
}
