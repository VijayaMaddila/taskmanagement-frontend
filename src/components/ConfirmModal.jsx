import "./ConfirmModal.css";

export default function ConfirmModal({ title, message, confirmLabel = "Delete", onConfirm, onCancel }) {
  return (
    <div className="cm-overlay" onClick={onCancel}>
      <div className="cm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cm-icon">
          <svg width="28" height="28" viewBox="0 0 16 16" fill="none">
            <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9"
              stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="cm-title">{title}</h2>
        <p className="cm-message">{message}</p>
        <div className="cm-actions">
          <button className="cm-btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="cm-btn-confirm" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
