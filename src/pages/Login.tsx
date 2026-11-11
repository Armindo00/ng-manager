import { useState } from "react";
import toast from "react-hot-toast";
import type { User } from "../types";
import { supabase } from "../services/supabase";
import { resolveAppUserFromEmail } from "../services/sessionService";
import { resolveLoginEmail } from "../utils/usernameAuth";
import AppVersion from "../components/AppVersion";
import logo from "../assets/logo next.jpeg";

type Props = {
  onLogin: (user: User) => void;
};

function Login({ onLogin }: Props) {
  const [loginName, setLoginName] = useState(
    import.meta.env.DEV ? "admin@test.com" : ""
  );
  const [password, setPassword] = useState(
    import.meta.env.DEV ? "12345678" : ""
  );
  const [loading, setLoading] = useState(false);

  async function login() {
    if (!loginName || !password || loading) return;

    setLoading(true);

    try {
      const email = resolveLoginEmail(loginName);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error("Nome ou password inválidos.");
        return;
      }

      const authEmail = data.user?.email || data.session?.user?.email;
      if (!authEmail) {
        toast.error("Utilizador sem conta válida.");
        return;
      }

      // Let the JWT settle before reading app_users (avoids first-login races).
      await new Promise((resolve) => setTimeout(resolve, 0));

      const result = await resolveAppUserFromEmail(authEmail, { retries: 3 });

      if (!result.ok) {
        await supabase.auth.signOut();
        toast.error(result.message);
        return;
      }

      onLogin(result.user);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao iniciar sessão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-brand-panel">
        <div className="login-brand-content">
          <div className="login-brand-logo">
            <img src={logo} alt="NextGeneration Surf School" />
          </div>

          <p className="login-kicker">NextGeneration Surf School</p>
          <h1>NG Manager</h1>
          <p className="login-brand-text">
            Gestão de treinos, presenças e operação da escola — feita para o
            dia a dia na praia.
          </p>
        </div>
      </div>

      <div className="login-form-panel">
        <div className="login-card">
          <h2>Entrar</h2>
          <p className="login-subtitle">
            Usa o teu nome de treinador e a password da escola.
          </p>

          <div className="login-actions">
            <label className="field-label">
              Nome
              <input
                type="text"
                placeholder="Ex: Mindo"
                autoComplete="username"
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") login();
                }}
              />
            </label>

            <label className="field-label">
              Password
              <input
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") login();
                }}
              />
            </label>

            <button
              className="primary-btn login-submit-btn"
              onClick={login}
              disabled={loading}
            >
              {loading ? "A entrar..." : "Entrar na conta"}
            </button>
          </div>

          <AppVersion className="app-version login-version" />
        </div>
      </div>
    </div>
  );
}

export default Login;
