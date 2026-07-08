import { useState } from "react";
import type { User } from "../types";
import logo from "../assets/logo next.jpeg";

type AppSection =
  | "dashboard"
  | "students"
  | "coaches"
  | "groups"
  | "recurring"
  | "lessons"
  | "payments";

type Props = {
  user: User;
  activeSection: AppSection;
  onChangeSection: (section: AppSection) => void;
  onLogout: () => void;
};

function Sidebar({ user, activeSection, onChangeSection, onLogout }: Props) {
  const [open, setOpen] = useState(false);

  function changeSection(section: AppSection) {
    onChangeSection(section);
    setOpen(false);
  }

  function item(icon: string, label: string, section: AppSection) {
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
     {!open && (
  <button className="mobile-menu-btn" onClick={() => setOpen(true)}>
    ☰
  </button>
)}

      {open && (
        <div
          className="mobile-menu-backdrop"
          onClick={() => setOpen(false)}
        />
      )}

      <aside className={open ? "sidebar mobile-open" : "sidebar"}>
        <button
  className="close-menu-btn"
  onClick={() => setOpen(false)}
>
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
            </nav>
          )}

          {user.role === "student" && (
            <nav className="sidebar-nav">
              {item("📊", "Dashboard", "dashboard")}
              {item("📅", "Os meus treinos", "lessons")}
              {item("💳", "Pagamentos", "payments")}
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
