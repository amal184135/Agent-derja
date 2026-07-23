import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { deleteConversation, getConversations } from "../services/api";
import type { ConversationSummary } from "../services/api";

export function useConversations() {
  const { token } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await getConversations(token);
      setConversations(data);
    } catch (err) {
      console.error("Erreur chargement historique:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const remove = useCallback(
    async (sessionId: string) => {
      if (!token) return;
      await deleteConversation(token, sessionId);
      setConversations((prev) => prev.filter((c) => c.session_id !== sessionId));
    },
    [token]
  );

  return { conversations, loading, refresh, remove };
}