import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Pencil, Trash2 } from "lucide-react";
import "./HistoryMenu.css";

interface HistoryMenuProps {
  position: { top: number; left: number };
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function HistoryMenu({
  position,
  onRename,
  onDelete,
  onClose,
}: HistoryMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return createPortal(
    <div
      className="history-menu"
      style={{ position: "fixed", top: position.top, left: position.left }}
      ref={menuRef}
    >
      <button className="history-menu__item" onClick={onRename}>
        <Pencil size={14} />
        <span>Rename</span>
      </button>
      <button
        className="history-menu__item history-menu__item--danger"
        onClick={onDelete}
      >
        <Trash2 size={14} />
        <span>Delete</span>
      </button>
    </div>,
    document.body
  );
}