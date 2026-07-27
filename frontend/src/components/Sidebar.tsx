import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, History, LogOut, ChevronLeft, Bot, Trash2, Menu, X } from "lucide-react"; // AJOUT: Menu, X
import "./Sidebar.css";
import { useAuth } from "../hooks/useAuth";
import { useConversationsContext } from "../context/ConversationsContext";
import ConfirmModal from "./confirmModal/ConfirmModal";

interface SidebarProps {
  onNewChat?: () => void;
  onProfileClick?: () => void;
}

export default function Sidebar({ onNewChat, onProfileClick }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false); // AJOUT: état d'ouverture du drawer mobile
  const { username, logoutUser } = useAuth();
  const { conversations, remove } = useConversationsContext();
  const navigate = useNavigate();
  const { sessionId: activeSessionId } = useParams();

  const handleNewChat = () => {
    onNewChat?.();
    navigate("/chat");
    setMobileOpen(false); // AJOUT: ferme le drawer après action
  };

  const handleSelectConversation = (sessionId: string) => {
    navigate(`/chat/${sessionId}`);
    setMobileOpen(false); // AJOUT: ferme le drawer après sélection
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    const wasActive = pendingDelete === activeSessionId;
    await remove(pendingDelete);
    setPendingDelete(null);
    if (wasActive) navigate("/chat");
  };

  return (
    <> {/* AJOUT: fragment pour englober le hamburger + overlay + aside */}
      {/* AJOUT: bouton hamburger flottant, visible uniquement sur mobile (voir CSS) */}
      <button
        className={`sidebar__mobile-toggle ${mobileOpen ? "sidebar__mobile-toggle--hidden" : ""}`}
        onClick={() => setMobileOpen(true)}
        aria-label="Ouvrir le menu"
      >
        <Menu size={20} />
      </button>

      {/* AJOUT: overlay sombre derrière le drawer ouvert */}
      <div
        className={`sidebar__overlay ${mobileOpen ? "sidebar__overlay--visible" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        className={`sidebar ${collapsed ? "sidebar--collapsed" : ""} ${
          mobileOpen ? "sidebar--mobile-open" : "" // AJOUT: classe pour afficher le drawer sur mobile
        }`}
      >
        <button
          className="sidebar__toggle"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft
            size={14}
            className={`sidebar__toggle-icon ${collapsed ? "sidebar__toggle-icon--flipped" : ""}`}
          />
        </button>

        {/* AJOUT: rangée regroupant le brand + le bouton X, alignés comme dans Gemini */}
        <div className="sidebar__mobile-header">
          <div className="sidebar__brand">
            <div className="sidebar__brand-logo">
              <Bot size={20} color="#fff" strokeWidth={2} />
            </div>
            <div className="sidebar__brand-text">
              <p className="sidebar__brand-title">Agent Derja</p>
              <p className="sidebar__brand-subtitle">Smart assistant</p>
            </div>
          </div>

          {/* AJOUT: bouton close (X), visible uniquement sur mobile, dans la même rangée que le titre */}
          <button
            className="sidebar__mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Fermer le menu"
          >
            <X size={18} />
          </button>
        </div>

        <button className="sidebar__new-chat" onClick={handleNewChat}>
          <Plus size={18} strokeWidth={2.5} />
          <span className="sidebar__new-chat-label">New chat</span>
        </button>

        <nav className="sidebar__nav">
          <div className="sidebar__nav-item sidebar__nav-item--static">
            <span className="sidebar__nav-icon">
              <History size={20} strokeWidth={2} />
            </span>
            <span className="sidebar__nav-label">Historique</span>
          </div>
        </nav>

        {/* Liste des conversations */}
        <div className="sidebar__history">
          {conversations.map((conv) => (
            <div
              key={conv.session_id}
              className={`sidebar__history-item ${conv.session_id === activeSessionId ? "sidebar__history-item--active" : ""
                }`}
              onClick={() => handleSelectConversation(conv.session_id)}
            >
              <span className="sidebar__history-title">{conv.title}</span>
              <button
                className="sidebar__history-delete"
                aria-label="Supprimer la conversation"
                onClick={(e) => {
                  e.stopPropagation();
                  setPendingDelete(conv.session_id);
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="sidebar__spacer" />

        <div className="sidebar__footer">
          <button className="sidebar__user" onClick={() => onProfileClick?.()}>
            <div className="sidebar__user-avatar">
              {username?.charAt(0).toUpperCase() ?? "U"}
            </div>
            <span className="sidebar__user-name">{username ?? "Utilisateur"}</span>
          </button>
          <button className="sidebar__logout-icon" onClick={logoutUser} aria-label="Se déconnecter">
            <LogOut size={18} strokeWidth={2} />
          </button>
        </div>

        <ConfirmModal
          show={pendingDelete !== null}
          message="Delete this conversation? This action cannot be undone."
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      </aside>
    </>
  );
}