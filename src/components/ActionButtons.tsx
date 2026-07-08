import { Eye, Pencil, Trash2 } from "lucide-react";

type Props = {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};

function ActionButtons({ onView, onEdit, onDelete }: Props) {
  return (
    <div className="action-buttons">
      {onView && (
        <button
          className="icon-btn"
          onClick={onView}
          title="Ver ficha"
        >
          <Eye size={18} />
        </button>
      )}

      {onEdit && (
        <button
          className="icon-btn"
          onClick={onEdit}
          title="Editar"
        >
          <Pencil size={18} />
        </button>
      )}

      {onDelete && (
        <button
          className="icon-btn danger"
          onClick={onDelete}
          title="Eliminar"
        >
          <Trash2 size={18} />
        </button>
      )}
    </div>
  );
}

export default ActionButtons;
