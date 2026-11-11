import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  UserCircle,
  Calendar,
  CreditCard,
  Package,
  Truck,
  CalendarClock,
  CalendarDays,
  Star,
  Shield,
  ArrowLeft,
  Wrench,
  LogOut,
  Menu,
  X,
  Clapperboard,
  BarChart3,
} from "lucide-react";
import type { User } from "../types";
import logo from "../assets/logo next.jpeg";
import AppVersion from "./AppVersion";

type Props = {
  user: User;
  activeSection: string;
  onChangeSection: (section: string) => void;
  onLogout: () => void;
};

const ADMIN_MANAGEMENT_SECTIONS = new Set([
  "dashboard",
  "setup",
  "students",
  "coaches",
  "fixed-trainings",
  "lessons",
  "inventory",
  "vans",
  "compensations",
  "evaluations",
  "payments",
  "coach-activity",
]);

function roleLabel(role: User["role"]) {
  if (role === "admin") return "Administração";
  if (role === "coach") return "Treinador";
  return "Aluno";
}

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

  function item(Icon: LucideIcon, label: string, section: string) {
    return (
      <button
        className={activeSection === section ? "nav-item active" : "nav-item"}
        onClick={() => changeSection(section)}
      >
        <span className="nav-icon">
          <Icon size={18} strokeWidth={2} />
        </span>
        <span>{label}</span>
      </button>
    );
  }

  const adminInManagement = ADMIN_MANAGEMENT_SECTIONS.has(activeSection);

  return (
    <>
      <button
        className="mobile-menu-btn"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu size={22} />
      </button>

      {open && (
        <div
          className="mobile-menu-backdrop"
          onClick={() => setOpen(false)}
          onTouchMove={(event) => event.preventDefault()}
        />
      )}

      <aside className={open ? "sidebar mobile-open" : "sidebar"}>
        <button
          className="close-menu-btn"
          onClick={() => setOpen(false)}
          aria-label="Fechar menu"
        >
          <X size={20} />
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
              <small className="user-role">{roleLabel(user.role)}</small>
            </div>
          </div>

          {user.role === "admin" && !adminInManagement && (
            <nav className="sidebar-nav">
              <div className="nav-section-label">Dia a dia</div>
              {item(LayoutDashboard, "Hoje", "my-dashboard")}
              {item(CalendarDays, "Grupos fixos", "my-lessons")}
              {item(Clapperboard, "Os meus treinos", "my-activity")}
              <div className="nav-section-label">Gestão</div>
              {item(Shield, "Painel admin", "dashboard")}
            </nav>
          )}

          {user.role === "admin" && adminInManagement && (
            <nav className="sidebar-nav">
              <button
                className="nav-item"
                onClick={() => changeSection("my-dashboard")}
              >
                <span className="nav-icon">
                  <ArrowLeft size={18} strokeWidth={2} />
                </span>
                <span>Voltar às presenças</span>
              </button>

              <div className="nav-section-label">Escola</div>
              {item(LayoutDashboard, "Painel", "dashboard")}
              {item(Wrench, "Setup", "setup")}
              {item(Users, "Alunos", "students")}
              {item(UserCircle, "Treinadores", "coaches")}

              <div className="nav-section-label">Operação</div>
              {item(CalendarDays, "Grupos fixos", "fixed-trainings")}
              {item(Calendar, "Calendário", "lessons")}
              {item(BarChart3, "Treinos / mês", "coach-activity")}
              {item(Package, "Inventário", "inventory")}

              <div className="nav-section-label">Financeiro & follow-up</div>
              {item(CreditCard, "Pagamentos", "payments")}
              {item(Star, "Avaliações", "evaluations")}
              {item(CalendarClock, "Compensações", "compensations")}
              {item(Truck, "Carrinhas", "vans")}
            </nav>
          )}

          {user.role === "coach" && (
            <nav className="sidebar-nav">
              <div className="nav-section-label">Dia a dia</div>
              {item(LayoutDashboard, "Hoje", "dashboard")}
              {item(CalendarDays, "Grupos fixos", "lessons")}
              {item(Clapperboard, "Os meus treinos", "activity")}
            </nav>
          )}
        </div>

        <div className="sidebar-footer">
          <AppVersion className="app-version sidebar-version" />

          <button
            className="logout-btn"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            <LogOut size={18} />
            Terminar sessão
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
