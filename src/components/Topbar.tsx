import type { User } from "../types";
import NotificationBell from "./NotificationBell";

type Props = {
  user: User;
};

function Topbar({ user }: Props) {
  const today = new Date().toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // Mais tarde estas notificações virão do Supabase
  const notifications = [
    {
      id: "1",
      text: "Existem treinos por publicar",
    },
    {
      id: "2",
      text: "Existem pagamentos pendentes",
    },
  ];

  return (
    <div className="topbar">
      <div>
        <p className="topbar-date">{today}</p>
        <h2>Bem-vindo, {user.name}</h2>
      </div>

      <div className="topbar-actions">
        <span className="topbar-badge">
          🌊 NextGeneration Surf School
        </span>

        <NotificationBell notifications={notifications} />

        <span className="topbar-avatar">
          {user.name.charAt(0).toUpperCase()}
        </span>
      </div>
    </div>
  );
}

export default Topbar;