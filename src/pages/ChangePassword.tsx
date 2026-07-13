import { useState } from "react";
import toast from "react-hot-toast";
import type { User } from "../types";
import { supabase } from "../services/supabase";
import { completePasswordChange } from "../services/authService";
import { getUserByEmail } from "../services/usersService";
import AppVersion from "../components/AppVersion";
import logo from "../assets/logo next.jpeg";

type Props = {
  user: User;
  onComplete: (user: User) => void;
  onLogout: () => void;
};

const MIN_PASSWORD_LENGTH = 8;

function ChangePassword({ user, onComplete, onLogout }: Props) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`A nova password deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As passwords não coincidem.");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw updateError;
      }

      await completePasswordChange();

      const refreshedUser = await getUserByEmail(user.email);
      onComplete(refreshedUser);
      toast.success("Password atualizada com sucesso.");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao alterar a password."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-brand-panel">
        <div className="login-brand-content">
          <div className="login-brand-logo">
            <img src={logo} alt="NextGeneration" />
          </div>

          <p className="login-kicker">NextGeneration Surf School</p>
          <h1>NG Manager</h1>
          <p className="login-brand-text">
            Por segurança, define uma password pessoal antes de continuar.
          </p>
        </div>
      </div>

      <div className="login-form-panel">
        <div className="login-card">
          <h2>Alterar password</h2>
          <p className="login-subtitle">
            Olá {user.name}. A password que recebeste é temporária — escolhe uma
            nova para entrar na app.
          </p>

          <div className="login-actions">
            <label className="field-label">
              Nova password
              <input
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <label className="field-label">
              Confirmar nova password
              <input
                type="password"
                placeholder="Repete a nova password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </label>

            <button
              className="primary-btn login-submit-btn"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "A guardar..." : "Guardar e continuar"}
            </button>

            <button type="button" onClick={onLogout} disabled={loading}>
              Sair
            </button>
          </div>

          <AppVersion className="app-version login-version" />
        </div>
      </div>
    </div>
  );
}

export default ChangePassword;
