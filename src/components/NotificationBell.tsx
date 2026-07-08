import { useEffect, useRef, useState } from "react";

type Notification = {
  id: string;
  text: string;
};

type Props = {
  notifications: Notification[];
};

function NotificationBell({ notifications }: Props) {
  const [open, setOpen] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open]);

  return (
    <div className="notification-wrapper" ref={panelRef}>
      <button
        className="notification-bell"
        onClick={() => setOpen((prev) => !prev)}
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

          {notifications.length === 0 ? (
            <p className="muted">Sem notificações.</p>
          ) : (
            notifications.map((notification) => (
              <div className="notification-item" key={notification.id}>
                {notification.text}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;