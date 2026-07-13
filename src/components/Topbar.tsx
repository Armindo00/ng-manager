import { useEffect, useState } from "react";
import type { User } from "../types";
import NotificationBell from "./NotificationBell";
import {
  getNotifications,
  type Notification,
} from "../services/notificationsService";

type Props = {
  user: User;
};

function roleLabel(role: User["role"]) {
  if (role === "admin") return "Administrador";
  if (role === "coach") return "Treinador";
  return "Aluno";
}

function Topbar({ user }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const today = new Date().toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  useEffect(() => {
    loadNotifications();
  }, [user.id, user.role, user.studentId]);

  async function loadNotifications() {
    try {
      setNotifications(await getNotifications(user));
    } catch (error) {
      console.error(error);
      setNotifications([]);
    }
  }

  return (
    <header className="topbar">
      <div className="topbar-copy">
        <p className="topbar-date">{today}</p>
        <h2>Olá, {user.name}</h2>
        <span className="topbar-role-chip">{roleLabel(user.role)}</span>
      </div>

      <div className="topbar-actions">
        <NotificationBell notifications={notifications} />

        <span className="topbar-avatar" title={user.name}>
          {user.name.charAt(0).toUpperCase()}
        </span>
      </div>
    </header>
  );
}

export default Topbar;
