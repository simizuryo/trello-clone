export default function ConfirmDialog({ open, title, body, confirmLabel, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="confirmTitle">
        <h2 id="confirmTitle">{title}</h2>
        <p>{body}</p>
        <div className="modal-actions">
          <button type="button" className="btn-text" onClick={onCancel}>
            キャンセル
          </button>
          <button type="button" className="btn-danger" autoFocus onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
