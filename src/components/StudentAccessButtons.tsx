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
          className={`icon-btn ${blocked ? "" : "danger"}`}
          onClick={onToggleBlock}
          title={blocked ? "Desbloquear acesso" : "Bloquear acesso"}
        >
          {blocked ? <Unlock size={18} /> : <Lock size={18} />}
        </button>
      )}
    </div>
  );
}

export default StudentAccessButtons;
