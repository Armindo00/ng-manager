import Modal from "./Modal";

type Props = {
  studentName: string;
  email: string;
  password?: string;
  title?: string;
  onClose: () => void;
};

function StudentAccessModal({
  studentName,
  email,
  password,
  title = "Credenciais de acesso",
  onClose,
}: Props) {
  async function copyCredentials() {
    const text = password
      ? `Aluno: ${studentName}\nEmail: ${email}\nPassword: ${password}`
      : `Aluno: ${studentName}\nEmail: ${email}`;

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard may be unavailable in some browsers.
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <div className="student-access-modal">
        <p>
          O aluno <strong>{studentName}</strong> já pode entrar na aplicação.
        </p>

        <div className="student-access-credentials">
          <div>
            <span className="muted">Email</span>
            <strong>{email}</strong>
          </div>

          {password && (
            <div>
              <span className="muted">Password</span>
              <strong>{password}</strong>
            </div>
          )}
        </div>

        {password ? (
          <p className="muted">
            Guarda esta password agora. Por segurança, não será mostrada outra
            vez.
          </p>
        ) : (
          <p className="muted">
            A conta já existia em Authentication. Usa Reset password para gerar
            uma nova password.
          </p>
        )}

        <div className="student-access-actions">
          <button className="primary-btn" onClick={copyCredentials}>
            Copiar credenciais
          </button>

          <button onClick={onClose}>Fechar</button>
        </div>
      </div>
    </Modal>
  );
}

export default StudentAccessModal;
