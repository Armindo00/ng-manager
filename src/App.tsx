import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import type { User } from "./types";

import Login from "./pages/Login";
import StudentArea from "./pages/StudentArea";
import StudentDashboard from "./pages/StudentDashboard";
import StudentEvaluations from "./pages/StudentEvaluations";
import StudentCalendar from "./pages/StudentCalendar";
import SkillCard from "./pages/SkillCard";
import Payments from "./pages/Payments";
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
  | "calendar"
  | "payments";

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [coachSection, setCoachSection] = useState<CoachSection>("dashboard");
  const [studentSection, setStudentSection] =
    useState<StudentSection>("dashboard");
  const [activeSection, setActiveSection] =
    useState<AdminSection>("dashboard");

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    if (currentUser?.role !== "admin") return;

    generateLessonsFromRecurring();
  }, [currentUser]);

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

  function handleChangeSection(section: string) {
    if (!currentUser) return;

    if (currentUser.role === "admin") {
      setActiveSection(section as AdminSection);
    } else if (currentUser.role === "coach") {
      setCoachSection(section as CoachSection);
    } else if (currentUser.role === "student") {
      setStudentSection(section as StudentSection);
    }
  }

  function getActiveSection() {
    if (!currentUser) return "dashboard";

    if (currentUser.role === "admin") return activeSection;
    if (currentUser.role === "coach") return coachSection;
    return studentSection;
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
          activeSection={getActiveSection()}
          onChangeSection={handleChangeSection}
          onLogout={logout}
        />

        <main className="main-content">
          <Topbar user={currentUser} />

          {currentUser.role === "student" && (
            <>
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

              {studentSection === "payments" && (
                <Payments user={currentUser} />
              )}
            </>
          )}

          {currentUser.role === "coach" && (
            <>
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

          {currentUser.role === "admin" && activeSection === "dashboard" && (
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
