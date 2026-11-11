import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";

type Notification = {
  id: string;
  text: string;
};

type Props = {
  notifications: Notification[];
};

function NotificationBell({ notifications }: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnOutside(event: MouseEvent | TouchEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", closeOnOutside);
      document.addEventListener("touchstart", closeOnOutside);
    }

    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("touchstart", closeOnOutside);
    };
  }, [open]);

  return (
    <div className="notification-wrapper" ref={wrapperRef}>
      <button
        type="button"
        className="notification-bell"
        aria-label="Notificações"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Bell size={18} strokeWidth={2.2} />

        {notifications.length > 0 && (
          <span className="notification-count">{notifications.length}</span>
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
