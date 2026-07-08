import { useState } from "react";
import type { User } from "../types";
import { supabase } from "../services/supabase";
import { getUserByEmail } from "../services/usersService";

type Props = {
  onLogin: (user: User) => void;
};

function Login({ onLogin }: Props) {
  const [email, setEmail] = useState("admin@test.com");
  const [password, setPassword] = useState("12345678");
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
        alert("Email ou password inválidos.");
        return;
      }

      if (!data.user?.email) {
        alert("Utilizador sem email.");
        return;
      }

      try {
        const appUser = await getUserByEmail(data.user.email);
        onLogin(appUser);
      } catch (error) {
        console.error(error);
        await supabase.auth.signOut();
        alert("Este utilizador ainda não tem permissões na aplicação.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao iniciar sessão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <p className="login-kicker">NEXTGENERATION</p>

        <h1>NG Manager</h1>

        <p className="login-subtitle">
          Entrar com email e password.
        </p>

        <div className="login-actions">
          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            className="primary-btn"
            onClick={login}
            disabled={loading}
          >
            {loading ? "A entrar..." : "Entrar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
