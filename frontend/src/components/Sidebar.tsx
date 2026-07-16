import React, { useState } from "react";
import { Plus, History, LogOut, ChevronLeft, Bot } from "lucide-react";
import "./Sidebar.css";
import { useAuth } from "../hooks/useAuth";

interface SidebarProps {
  /** Called when "New chat" is clicked. Wiring to actual chat reset comes later. */
  onNewChat?: () => void;
  /** Called when the History link is clicked. Wiring to actual routing comes later. */
  onHistoryClick?: () => void;
  /** Called when the profile avatar/name is clicked. */
  onProfileClick?: () => void;
}

export default function Sidebar({ onNewChat, onHistoryClick, onProfileClick }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { username, logoutUser } = useAuth();

  return (
    <aside className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}>
      {/* Toggle button */}
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

      {/* Brand */}
      <div className="sidebar__brand">
        <div className="sidebar__brand-logo">
          <Bot size={20} color="#fff" strokeWidth={2} />
        </div>
        <div className="sidebar__brand-text">
          <p className="sidebar__brand-title">Agent Derja</p>
          <p className="sidebar__brand-subtitle">Smart assistant</p>
        </div>
      </div>

      {/* New chat button */}
      <button className="sidebar__new-chat" onClick={() => onNewChat?.()}>
        <Plus size={18} strokeWidth={2.5} />
        <span className="sidebar__new-chat-label">New chat</span>
      </button>

      {/* History link */}
      <nav className="sidebar__nav">
        <button className="sidebar__nav-item" onClick={() => onHistoryClick?.()}>
          <span className="sidebar__nav-icon">
            <History size={20} strokeWidth={2} />
          </span>
          <span className="sidebar__nav-label">History</span>
        </button>
      </nav>

      {/* Empty space (future: chat history list) */}
      <div className="sidebar__spacer" />

      {/* User footer - clickable, navigates to profile */}
      <div className="sidebar__footer">
        <button className="sidebar__user" onClick={() => onProfileClick?.()}>
          <div className="sidebar__user-avatar">
            {username?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <span className="sidebar__user-name">{username ?? "Utilisateur"}</span>
        </button>
        <button
          className="sidebar__logout-icon"
          onClick={logoutUser}
          aria-label="Se déconnecter"
        >
          <LogOut size={18} strokeWidth={2} />
        </button>
      </div>
    </aside>
  );
}