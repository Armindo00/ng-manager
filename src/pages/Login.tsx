import { useState } from "react";
import toast from "react-hot-toast";
import type { User } from "../types";
import { supabase } from "../services/supabase";
import { getUserByEmail } from "../services/usersService";
import AppVersion from "../components/AppVersion";
import logo from "../assets/logo next.jpeg";

type Props = {
  onLogin: (user: User) => void;
};

function Login({ onLogin }: Props) {
  const [email, setEmail] = useState(import.meta.env.DEV ? "admin@test.com" : "");
  const [password, setPassword] = useState(import.meta.env.DEV ? "12345678" : "");
  const [loading, setLoading] = useState(false);

  async function login() {
    if (!email || !password) return;

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error("Email ou password inválidos.");
        return;
      }

      if (!data.user?.email) {
        toast.error("Utilizador sem email.");
        return;
      }

      try {
        const appUser = await getUserByEmail(data.user.email);
        onLogin(appUser);
      } catch (loginError) {
        console.error(loginError);
        await supabase.auth.signOut();
        toast.error("Este utilizador ainda não tem permissões na aplicação.");
      }
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
            <img src={logo} alt="NextGeneration" />
          </div>

          <p className="login-kicker">NextGeneration Surf School</p>
          <h1>NG Manager</h1>
          <p className="login-brand-text">
            Plataforma de gestão para alunos, treinadores e administração da
            escola de surf.
          </p>
        </div>
      </div>

      <div className="login-form-panel">
        <div className="login-card">
          <h2>Entrar na conta</h2>
          <p className="login-subtitle">
            Usa o email e password que te foram atribuídos.
          </p>

          <div className="login-actions">
            <label className="field-label">
              Email
              <input
                placeholder="nome@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label className="field-label">
              Password
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <button
              className="primary-btn login-submit-btn"
              onClick={login}
              disabled={loading}
            >
              {loading ? "A entrar..." : "Entrar"}
            </button>
          </div>

          <AppVersion className="app-version login-version" />
        </div>
      </div>
    </div>
  );
}

export default Login;
