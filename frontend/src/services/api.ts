import { API_URL } from "../config/config";

export async function login(username: string, password: string) {
  const form = new FormData();
  form.append("username", username);
  form.append("password", password);
  const res = await fetch(`${API_URL}/token`, {
    method: "POST",
    body: form
  });
  if (!res.ok) {
    throw new Error("Invalid username or password");
  }
  return res.json();
}

export async function register(username: string, password: string) {
  const res = await fetch(`${API_URL}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.detail);
  }
  return res.json();
}

export async function verifyToken(token: string) {
  const res = await fetch(`${API_URL}/verify-token`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return res.ok;
}