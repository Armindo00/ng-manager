import { useEffect, useState } from "react";
import type { User } from "../types";
import logo from "../assets/logo next.jpeg";

type Props = {
  user: User;
  activeSection: string;
  onChangeSection: (section: string) => void;
  onLogout: () => void;
};

function Sidebar({ user, activeSection, onChangeSection, onLogout }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const scrollY = window.scrollY;

    if (open) {
      document.body.style.position = "fixed";
      document.body.style.top = "-" + scrollY + "px";
      document.body.style.width = "100%";
    }

    return () => {
      const top = document.body.style.top;

      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";

      if (top) {
        window.scrollTo(0, parseInt(top || "0", 10) * -1);
      }
    };
  }, [open]);

  function changeSection(section: string) {
    onChangeSection(section);
    setOpen(false);
  }

  function item(icon: string, label: string, section: string) {
    return (
      <button
        className={activeSection === section ? "nav-item active" : "nav-item"}
        onClick={() => changeSection(section)}
      >
        <span className="nav-icon">{icon}</span>
        <span>{label}</span>
      </button>
    );
  }

  return (
    <>
      <button className="mobile-menu-btn" onClick={() => setOpen(true)}>
        ☰
      </button>

      {open && (
        <div
          className="mobile-menu-backdrop"
          onClick={() => setOpen(false)}
          onTouchMove={(event) => event.preventDefault()}
        />
      )}

      <aside className={open ? "sidebar mobile-open" : "sidebar"}>
        <button className="close-menu-btn" onClick={() => setOpen(false)}>
          ✕
        </button>

        <div>
          <div className="sidebar-header">
            <div className="logo-circle">
              <img
                src={logo}
                alt="NextGeneration Surf School"
                className="logo-image"
              />
            </div>

            <div>
              <h2 className="brand">NG Manager</h2>
              <p className="role-label">{user.name}</p>
              <small className="user-role">{user.role.toUpperCase()}</small>
            </div>
          </div>

          {user.role === "admin" && (
            <nav className="sidebar-nav">
              {item("📊", "Dashboard", "dashboard")}
              {item("👥", "Alunos", "students")}
              {item("🏄", "Treinadores", "coaches")}
              {item("👨‍👩‍👧", "Grupos", "groups")}
              {item("🔁", "Treinos Semanais", "recurring")}
              {item("📅", "Treinos", "lessons")}
              {item("💳", "Pagamentos", "payments")}
            </nav>
          )}

          {user.role === "coach" && (
            <nav className="sidebar-nav">
              {item("📊", "Dashboard", "dashboard")}
              {item("📅", "Os meus treinos", "lessons")}
              {item("⭐", "Avaliar alunos", "evaluations")}
            </nav>
          )}

          {user.role === "student" && (
            <nav className="sidebar-nav">
              {item("📊", "Dashboard", "dashboard")}
              {item("📅", "Os meus treinos", "lessons")}
              {item("📝", "As minhas avaliações", "evaluations")}
              {item("🏅", "Skill Card", "skillcard")}
              {item("📆", "Calendário", "calendar")}
            </nav>
          )}
        </div>

        <div className="sidebar-footer">
          <button
            className="logout-btn"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            🚪 Terminar sessão
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
