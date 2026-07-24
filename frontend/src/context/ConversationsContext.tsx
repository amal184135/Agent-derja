import React, { createContext, useContext } from "react";
import { useConversations } from "../hooks/useConversations";

const ConversationsContext = createContext<ReturnType<typeof useConversations> | null>(null);

export function ConversationsProvider({ children }: { children: React.ReactNode }) {
  const value = useConversations();
  return (
    <ConversationsContext.Provider value={value}>
      {children}
    </ConversationsContext.Provider>
  );
}

export function useConversationsContext() {
  const context = useContext(ConversationsContext);
  if (!context) {
    throw new Error("useConversationsContext doit être utilisé dans un ConversationsProvider");
  }
  return context;
}