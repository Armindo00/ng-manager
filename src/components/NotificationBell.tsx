import { useState } from "react";

type Notification = {
  id: string;
  text: string;
};

type Props = {
  notifications: Notification[];
};

function NotificationBell({ notifications }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="notification-wrapper">
      <button
        className="notification-bell"
        onClick={() => setOpen(!open)}
      >
        <span className="bell-icon">🔔</span>

        {notifications.length > 0 && (
          <span className="notification-count">
            {notifications.length}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-panel">
          <h3>Notificações</h3>

          {notifications.length === 0 && (
            <p className="muted">Sem notificações.</p>
          )}

          {notifications.map((notification) => (
            <div className="notification-item" key={notification.id}>
              {notification.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
