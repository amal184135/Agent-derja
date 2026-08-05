import { API_URL } from "../config/config";

function authHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export interface ConversationSummary {
  session_id: string;
  title: string;
  updated_at: string;
}

export interface ConversationMessage {
  sender: "user" | "bot";
  text: string;
  timestamp: string;
}

export interface ConversationDetail {
  session_id: string;
  title: string;
  messages: ConversationMessage[];
  updated_at: string;
}

export interface UserProfile {
  id: string;
  username: string;
  phone_number?: string;
  date_naissance?: string;
  sexe?: string;
  statut_marital?: string;
}

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

export async function getConversations(token: string): Promise<ConversationSummary[]> {
  const res = await fetch(`${API_URL}/conversations`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Impossible de charger l'historique");
  return res.json();
}

export async function getConversation(
  token: string,
  sessionId: string
): Promise<ConversationDetail> {
  const res = await fetch(`${API_URL}/conversations/${sessionId}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Conversation introuvable");
  return res.json();
}

export async function renameConversation(
  token: string,
  sessionId: string,
  title: string
): Promise<void> {
  const res = await fetch(`${API_URL}/conversations/${sessionId}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(errData?.detail || "Impossible de renommer la conversation");
  }
}

export async function deleteConversation(token: string, sessionId: string): Promise<void> {
  const res = await fetch(`${API_URL}/conversations/${sessionId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Suppression impossible");
}

export async function sendChatMessage(
  token: string,
  message: string,
  sessionId: string | null
): Promise<{ reply: string; session_id: string }> {
  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ message, session_id: sessionId }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(errData?.detail || `Erreur ${res.status}`);
  }
  return res.json();
}

// AJOUT
export type ChatOutputMode = "text" | "audio";

export async function sendChatMessageWithMode(
  token: string,
  message: string,
  sessionId: string | null,
  outputMode: ChatOutputMode
): Promise<{ reply: string; session_id: string; audio_base64?: string | null }> {
  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ message, session_id: sessionId, output_mode: outputMode }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(errData?.detail || `Erreur ${res.status}`);
  }
  return res.json();
}

export async function getProfile(token: string): Promise<UserProfile> {
  const res = await fetch(`${API_URL}/me`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Impossible de charger le profil");
  return res.json();
}

export async function updateProfile(
  token: string,
  data: Partial<Omit<UserProfile, "id" | "username">>
): Promise<UserProfile> {
  const cleaned = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== "")
  );

  const res = await fetch(`${API_URL}/me`, {
    method: "PUT",
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cleaned),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to update profile");
  }
  return res.json();
}

export async function changePassword(
  token: string,
  currentPassword: string,
  newPassword: string
): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/me/change-password`, {
    method: "PUT",
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to update password");
  }
  return res.json();
}