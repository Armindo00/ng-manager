import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  UserCircle,
  UsersRound,
  Repeat,
  Calendar,
  CreditCard,
  Package,
  CalendarDays,
  Star,
  Award,
  CalendarRange,
  LogOut,
  Menu,
  X,
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

function roleLabel(role: User["role"]) {
  if (role === "admin") return "Administrador";
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

          {user.role === "admin" && (
            <nav className="sidebar-nav">
              {item(LayoutDashboard, "Dashboard", "dashboard")}
              {item(Users, "Alunos", "students")}
              {item(UserCircle, "Treinadores", "coaches")}
              {item(UsersRound, "Grupos", "groups")}
              {item(Repeat, "Horários", "recurring")}
              {item(Calendar, "Calendário", "lessons")}
              {item(Package, "Inventário", "inventory")}
              {item(CreditCard, "Pagamentos", "payments")}
            </nav>
          )}

          {user.role === "coach" && (
            <nav className="sidebar-nav">
              {item(LayoutDashboard, "Dashboard", "dashboard")}
              {item(CalendarDays, "Os meus treinos", "lessons")}
              {item(Star, "Avaliar alunos", "evaluations")}
            </nav>
          )}

          {user.role === "student" && (
            <nav className="sidebar-nav">
              {item(LayoutDashboard, "Dashboard", "dashboard")}
              {item(CalendarDays, "Os meus treinos", "lessons")}
              {item(Star, "As minhas avaliações", "evaluations")}
              {item(Award, "Skill Card", "skillcard")}
              {item(CalendarRange, "Calendário", "calendar")}
              {item(CreditCard, "Pagamentos", "payments")}
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
