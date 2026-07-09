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

  const notifications = [
    { id: "1", text: "Existem treinos por publicar" },
    { id: "2", text: "Existem pagamentos pendentes" },
  ];

  return (
    <header className="topbar">
      <div className="topbar-copy">
        <p className="topbar-date">{today}</p>
        <h2>
          Bem-vindo,
          <br />
          {user.name}
        </h2>
      </div>

      <div className="topbar-actions">
        <NotificationBell notifications={notifications} />

        <span className="topbar-avatar">
          {user.name.charAt(0).toUpperCase()}
        </span>
      </div>
    </header>
  );
}

export default Topbar;
