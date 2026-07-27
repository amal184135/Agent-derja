import React from 'react'
import { createPortal } from 'react-dom' // AJOUT: pour sortir le modal du flux de la Sidebar (transform)
import './ConfirmModal.css'

interface ConfirmModalProps {
  show: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  message: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ show, onConfirm, onCancel, message }) => {

  if (!show) return null;

  // AJOUT: createPortal rend le modal directement dans document.body.
  // Nécessaire car la Sidebar a un `transform` (pour l'animation du drawer mobile),
  // ce qui casse le `position: fixed` du modal s'il reste à l'intérieur.
  return createPortal(
    <div className="modal-overlay">
      <div className="modal-box">
        <p>{message}</p>
        <div className="modal-buttons">
          <button className="confirm-btn" onClick={onConfirm}>Confirm</button>
          <button className="cancel-btn" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>,
    document.body // AJOUT: cible du portail
  );
}

export default ConfirmModal