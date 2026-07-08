type Props = {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

function ConfirmDialog({
  title,
  message,
  confirmText = "Eliminar",
  cancelText = "Cancelar",
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="modal-backdrop">
      <div className="confirm-dialog">
        <h2>{title}</h2>
        <p>{message}</p>

        <div className="confirm-actions">
          <button onClick={onCancel}>
            {cancelText}
          </button>

          <button className="danger-btn" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
