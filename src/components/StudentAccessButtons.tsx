import { KeyRound, Lock, Unlock } from "lucide-react";

type Props = {
  hasAccess: boolean;
  blocked: boolean;
  onResetPassword?: () => void;
  onToggleBlock?: () => void;
};

function StudentAccessButtons({
  hasAccess,
  blocked,
  onResetPassword,
  onToggleBlock,
}: Props) {
  if (!hasAccess) return null;

  return (
    <div className="student-access-buttons">
      {onResetPassword && (
        <button
          className="icon-btn"
          onClick={onResetPassword}
          title="Reset password"
        >
          <KeyRound size={18} />
        </button>
      )}

      {onToggleBlock && (
        <button
          type="button"
          className={`compact-btn ${blocked ? "" : "danger-btn"}`}
          onClick={onToggleBlock}
          title={blocked ? "Desbloquear acesso" : "Bloquear acesso"}
        >
          {blocked ? (
            <>
              <Unlock size={16} /> Desbloquear
            </>
          ) : (
            <>
              <Lock size={16} /> Bloquear
            </>
          )}
        </button>
      )}
    </div>
  );
}

export default StudentAccessButtons;
