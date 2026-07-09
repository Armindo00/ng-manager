import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import type { User } from "./types";

import Login from "./pages/Login";
import StudentArea from "./pages/StudentArea";
import StudentDashboard from "./pages/StudentDashboard";
import StudentEvaluations from "./pages/StudentEvaluations";
import StudentCalendar from "./pages/StudentCalendar";
import SkillCard from "./pages/SkillCard";
import CoachArea from "./pages/CoachArea";
import CoachDashboard from "./pages/CoachDashboard";
import AdminArea from "./pages/AdminArea";
import AdminDashboard from "./pages/AdminDashboard";
import AdminPayments from "./pages/AdminPayments";
import Coaches from "./pages/Coaches";
import Groups from "./pages/Groups";
import AdminLessons from "./pages/AdminLessons";
import RecurringTrainings from "./pages/RecurringTrainings";
import Sidebar from "./components/Sidebar";
import Evaluations from "./pages/Evaluations";
import Topbar from "./components/Topbar";

import { generateLessonsFromRecurring } from "./pages/services/lessonGenerator";
import { supabase } from "./services/supabase";
import { getUserByEmail } from "./services/usersService";

type AdminSection =
  | "dashboard"
  | "students"
  | "coaches"
  | "groups"
  | "recurring"
  | "lessons"
  | "payments";

type CoachSection = "dashboard" | "lessons" | "evaluations";

type StudentSection =
  | "dashboard"
  | "lessons"
  | "evaluations"
  | "skillcard"
  | "calendar";

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [coachSection, setCoachSection] = useState<CoachSection>("dashboard");
  const [studentSection, setStudentSection] =
    useState<StudentSection>("dashboard");
  const [activeSection, setActiveSection] =
    useState<AdminSection>("dashboard");

  useEffect(() => {
    generateLessonsFromRecurring();
    restoreSession();
  }, []);

  async function restoreSession() {
    const { data } = await supabase.auth.getUser();

    if (!data.user?.email) return;

    const appUser = await getUserByEmail(data.user.email);
    setCurrentUser(appUser);
  }

  async function logout() {
    await supabase.auth.signOut();
    setCurrentUser(null);
  }

  if (!currentUser) {
    return (
      <>
        <Toaster position="top-right" />
        <Login onLogin={setCurrentUser} />
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" />

      <div className="app-layout">
        <Sidebar
          user={currentUser}
          activeSection={activeSection}
          onChangeSection={setActiveSection}
          onLogout={logout}
        />

        <main className="main-content">
          <Topbar user={currentUser} />

          {currentUser.role === "student" && (
            <>
              <div className="card section-card">
                <button
                  className="primary-btn"
                  onClick={() => setStudentSection("dashboard")}
                >
                  Dashboard
                </button>

                <button
                  className="primary-btn"
                  style={{ marginLeft: 10 }}
                  onClick={() => setStudentSection("lessons")}
                >
                  Os meus treinos
                </button>

                <button
                  className="primary-btn"
                  style={{ marginLeft: 10 }}
                  onClick={() => setStudentSection("evaluations")}
                >
                  As minhas avaliações
                </button>

                <button
                  className="primary-btn"
                  style={{ marginLeft: 10 }}
                  onClick={() => setStudentSection("skillcard")}
                >
                  Skill Card
                </button>

                <button
                  className="primary-btn"
                  style={{ marginLeft: 10 }}
                  onClick={() => setStudentSection("calendar")}
                >
                  Calendário
                </button>
              </div>

              {studentSection === "dashboard" && (
                <StudentDashboard user={currentUser} />
              )}

              {studentSection === "lessons" && (
                <StudentArea user={currentUser} />
              )}

              {studentSection === "evaluations" && (
                <StudentEvaluations user={currentUser} />
              )}

              {studentSection === "skillcard" && (
                <SkillCard user={currentUser} />
              )}

              {studentSection === "calendar" && (
                <StudentCalendar user={currentUser} />
              )}
            </>
          )}

          {currentUser.role === "coach" && (
            <>
              <div className="card section-card">
                <button
                  className="primary-btn"
                  onClick={() => setCoachSection("dashboard")}
                >
                  Dashboard
                </button>

                <button
                  className="primary-btn"
                  style={{ marginLeft: 10 }}
                  onClick={() => setCoachSection("lessons")}
                >
                  Os meus treinos
                </button>

                <button
                  className="primary-btn"
                  style={{ marginLeft: 10 }}
                  onClick={() => setCoachSection("evaluations")}
                >
                  Avaliar alunos
                </button>
              </div>

              {coachSection === "dashboard" && (
                <CoachDashboard user={currentUser} />
              )}

              {coachSection === "lessons" && (
                <CoachArea user={currentUser} />
              )}

              {coachSection === "evaluations" && (
                <Evaluations user={currentUser} />
              )}
            </>
          )}

          {currentUser.role === "admin" &&
  activeSection === "dashboard" && (
    <AdminDashboard onChangeSection={setActiveSection} />
  )}
          {currentUser.role === "admin" &&
            activeSection === "students" && <AdminArea />}

          {currentUser.role === "admin" &&
            activeSection === "coaches" && <Coaches />}

          {currentUser.role === "admin" &&
            activeSection === "groups" && <Groups />}

          {currentUser.role === "admin" &&
            activeSection === "recurring" && <RecurringTrainings />}

          {currentUser.role === "admin" &&
            activeSection === "lessons" && <AdminLessons />}

          {currentUser.role === "admin" &&
            activeSection === "payments" && <AdminPayments />}
        </main>
      </div>
    </>
  );
}

export default App;
