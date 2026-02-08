export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

export function isLoggedIn() {
  return !!getAccessToken();
}

export function logout() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("user");
}