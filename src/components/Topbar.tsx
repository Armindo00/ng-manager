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

function Topbar({ user }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const today = new Date().toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
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
