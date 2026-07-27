import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Plus,
  LogOut,
  ChevronLeft,
  Bot,
  Check,
  X,
  MoreHorizontal,
} from "lucide-react";
import "./Sidebar.css";
import { useAuth } from "../hooks/useAuth";
import { useConversationsContext } from "../context/ConversationsContext";
import ConfirmModal from "./confirmModal/ConfirmModal";
import HistoryMenu from "./historyMenu/HistoryMenu";

interface SidebarProps {
  onNewChat?: () => void;
  onProfileClick?: () => void;
}

export default function Sidebar({ onNewChat, onProfileClick }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const { username, logoutUser } = useAuth();
  const { conversations, rename, remove } = useConversationsContext();
  const navigate = useNavigate();
  const { sessionId: activeSessionId } = useParams();

  const handleNewChat = () => {
    onNewChat?.();
    navigate("/chat");
  };

  const handleSelectConversation = (sessionId: string) => {
    navigate(`/chat/${sessionId}`);
  };

  const handleToggleMenu = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (openMenuId === sessionId) {
      setOpenMenuId(null);
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPosition({ top: rect.bottom + 4, left: rect.right - 150 }); // 150 = largeur min du popup
    setOpenMenuId(sessionId);
  };

  const startEditing = (
    e: React.MouseEvent,
    sessionId: string,
    currentTitle: string,
  ) => {
    e.stopPropagation();
    setEditingId(sessionId);
    setEditValue(currentTitle);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue("");
  };

  const commitEdit = async (sessionId: string, originalTitle: string) => {
    const trimmed = editValue.trim();
    setEditingId(null);
    if (!trimmed || trimmed === originalTitle) return;
    try {
      await rename(sessionId, trimmed);
    } catch (err) {
      console.error("Erreur renommage:", err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    const wasActive = pendingDelete === activeSessionId;
    await remove(pendingDelete);
    setPendingDelete(null);
    if (wasActive) navigate("/chat");
  };

  return (
    <aside className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}>
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

      <div className="sidebar__brand">
        <div className="sidebar__brand-logo">
          <Bot size={20} color="#fff" strokeWidth={2} />
        </div>
        <div className="sidebar__brand-text">
          <p className="sidebar__brand-title">Agent Derja</p>
          <p className="sidebar__brand-subtitle">Smart assistant</p>
        </div>
      </div>

      <button className="sidebar__new-chat" onClick={handleNewChat}>
        <Plus size={18} strokeWidth={2.5} />
        <span className="sidebar__new-chat-label">New chat</span>
      </button>

      {/* Liste des conversations */}
      <div className="sidebar__history-wrapper">
        <span className="sidebar__history-label">Recent</span>
        <div className="sidebar__history">
          {conversations.map((conv) => (
            <div
              key={conv.session_id}
              className={`sidebar__history-item ${conv.session_id === activeSessionId ? "sidebar__history-item--active" : ""}`}
              onClick={() =>
                editingId !== conv.session_id &&
                handleSelectConversation(conv.session_id)
              }
            >
              {editingId === conv.session_id ? (
                <input
                  className="sidebar__history-input"
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      commitEdit(conv.session_id, conv.title);
                    if (e.key === "Escape") cancelEditing();
                  }}
                />
              ) : (
                <span
                  className="sidebar__history-title"
                  onDoubleClick={(e) =>
                    startEditing(e, conv.session_id, conv.title)
                  }
                >
                  {conv.title}
                </span>
              )}

              {editingId === conv.session_id ? (
                <div className="sidebar__history-actions">
                  <button
                    className="sidebar__history-confirm"
                    aria-label="Confirmer"
                    onClick={(e) => {
                      e.stopPropagation();
                      commitEdit(conv.session_id, conv.title);
                    }}
                  >
                    <Check size={14} />
                  </button>
                  <button
                    className="sidebar__history-cancel"
                    aria-label="Annuler"
                    onClick={(e) => {
                      e.stopPropagation();
                      cancelEditing();
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="sidebar__history-menu-wrapper">
                  <button
                    className="sidebar__history-more"
                    aria-label="Plus d'options"
                    onClick={(e) => handleToggleMenu(e, conv.session_id)}
                  >
                    <MoreHorizontal size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {openMenuId && menuPosition && (
        <HistoryMenu
          position={menuPosition}
          onRename={() => {
            const conv = conversations.find((c) => c.session_id === openMenuId);
            if (conv) {
              setEditingId(conv.session_id);
              setEditValue(conv.title);
            }
            setOpenMenuId(null);
          }}
          onDelete={() => {
            setPendingDelete(openMenuId);
            setOpenMenuId(null);
          }}
          onClose={() => setOpenMenuId(null)}
        />
      )}
      <div className="sidebar__spacer" />

      <div className="sidebar__footer">
        <button className="sidebar__user" onClick={() => onProfileClick?.()}>
          <div className="sidebar__user-avatar">
            {username?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <span className="sidebar__user-name">
            {username ?? "Utilisateur"}
          </span>
        </button>
        <button
          className="sidebar__logout-icon"
          onClick={logoutUser}
          aria-label="Se déconnecter"
        >
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
  );
}
