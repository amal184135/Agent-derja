import React, { useState } from "react";
import { MessageCircle, History, User, LogOut, ChevronLeft, Bot } from "lucide-react";
import "./Sidebar.css";
import { useAuth } from "../hooks/useAuth";

type NavKey = "chat" | "history" | "profile";

interface NavItem {
  key: NavKey;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { key: "chat", label: "Chat", icon: <MessageCircle size={20} strokeWidth={2} /> },
  { key: "history", label: "History", icon: <History size={20} strokeWidth={2} /> },
  { key: "profile", label: "Profile", icon: <User size={20} strokeWidth={2} /> },
];

interface SidebarProps {
  /** Called when a nav item is clicked. Wiring to actual routing comes later. */
  onNavigate?: (key: NavKey) => void;
  /** Called when the logout link is clicked. */
  onLogout?: () => void;
}

export default function Sidebar({ onNavigate, onLogout }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [active, setActive] = useState<NavKey>("chat");
  const { logoutUser } = useAuth();

  const handleNavClick = (key: NavKey) => {
    setActive(key);
    onNavigate?.(key);
  };

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
          <Bot size={22} color="#fff" strokeWidth={2} />
        </div>
        <div className="sidebar__brand-text">
          <p className="sidebar__brand-title">Agent Derja</p>
          <p className="sidebar__brand-subtitle">Smart assistant</p>
        </div>
      </div>

      {/* Nav links */}
      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => handleNavClick(item.key)}
              className={`sidebar__nav-item ${isActive ? "sidebar__nav-item--active" : ""}`}
            >
              <span className="sidebar__nav-icon">{item.icon}</span>
              <span className="sidebar__nav-label">{item.label}</span>
              {isActive && collapsed && <span className="sidebar__nav-indicator" />}
            </button>
          );
        })}
      </nav>

      {/* Logout link, separated at the bottom */}
      <div className="sidebar__footer">
        <button className="sidebar__logout" onClick={logoutUser} >
          <span className="sidebar__nav-icon">
            <LogOut size={20} strokeWidth={2} />
          </span>
          <span className="sidebar__nav-label" >Logout</span>
        </button>
      </div>
    </aside>
  );
}