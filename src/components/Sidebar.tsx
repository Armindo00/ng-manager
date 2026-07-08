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

function Sidebar({
  user,
  activeSection,
  onChangeSection,
  onLogout,
}: Props) {
  function item(
    icon: string,
    label: string,
    section: AppSection
  ) {
    return (
      <button
        className={`nav-item ${
          activeSection === section ? "active" : ""
        }`}
        onClick={() => onChangeSection(section)}
      >
        <span className="nav-icon">{icon}</span>
        <span>{label}</span>
      </button>
    );
  }

  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-header">
          <div className="logo-circle">
  <img src={logo} alt="NextGeneration Surf School" className="logo-image" />
</div>
          <div>
            <h2 className="brand">NG Manager</h2>
            <p className="role-label">
              {user.name}
            </p>
            <small className="user-role">
              {user.role.toUpperCase()}
            </small>
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
        <button className="logout-btn" onClick={onLogout}>
          🚪 Terminar sessão
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
