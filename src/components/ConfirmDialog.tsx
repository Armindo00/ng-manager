type Props = {
  title: string;
  message: string;
  consequences?: string[];
  recommendation?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

function ConfirmDialog({
  title,
  message,
  consequences = [],
  recommendation,
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

        {consequences.length > 0 && (
          <div className="confirm-consequences">
            <strong>Consequências:</strong>
            <ul>
              {consequences.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {recommendation && (
          <p className="confirm-recommendation">{recommendation}</p>
        )}

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
