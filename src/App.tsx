import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
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
import AdminInventory from "./pages/AdminInventory";
import AdminVans from "./pages/AdminVans";
import AdminCompensations from "./pages/AdminCompensations";
import AdminEvaluations from "./pages/AdminEvaluations";
import Sidebar from "./components/Sidebar";
import Evaluations from "./pages/Evaluations";
import Topbar from "./components/Topbar";

import { supabase } from "./services/supabase";
import {
  getUserByEmail,
  isUserBlocked,
  requiresPasswordChange,
} from "./services/usersService";
import ChangePassword from "./pages/ChangePassword";

type AdminSection =
  | "dashboard"
  | "students"
  | "coaches"
  | "groups"
  | "recurring"
  | "lessons"
  | "inventory"
  | "vans"
  | "compensations"
  | "evaluations"
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
    if (!currentUser) return;

    window.scrollTo(0, 0);
  }, [currentUser]);

  useEffect(() => {
    restoreSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session?.user?.email) {
        setCurrentUser(null);
        return;
      }

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        try {
          const appUser = await getUserByEmail(session.user.email);

          if (isUserBlocked(appUser)) {
            await supabase.auth.signOut();
            setCurrentUser(null);
            toast.error("Conta bloqueada. Contacta a escola.");
            return;
          }

          setCurrentUser(appUser);
        } catch (error) {
          console.error(error);
          await supabase.auth.signOut();
          setCurrentUser(null);
          toast.error("Sessão inválida. Volta a iniciar sessão.");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function restoreSession() {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user?.email) {
      if (error) {
        await supabase.auth.signOut();
      }
      return;
    }

    try {
      const appUser = await getUserByEmail(data.user.email);

      if (isUserBlocked(appUser)) {
        await supabase.auth.signOut();
        setCurrentUser(null);
        toast.error("Conta bloqueada. Contacta a escola.");
        return;
      }

      setCurrentUser(appUser);
    } catch (sessionError) {
      console.error(sessionError);
      await supabase.auth.signOut();
      setCurrentUser(null);
    }
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

  if (requiresPasswordChange(currentUser)) {
    return (
      <>
        <Toaster position="top-right" />
        <ChangePassword
          user={currentUser}
          onComplete={setCurrentUser}
          onLogout={logout}
        />
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
            activeSection === "inventory" && <AdminInventory />}

          {currentUser.role === "admin" &&
            activeSection === "vans" && <AdminVans />}

          {currentUser.role === "admin" &&
            activeSection === "compensations" && <AdminCompensations />}

          {currentUser.role === "admin" &&
            activeSection === "evaluations" && <AdminEvaluations />}

          {currentUser.role === "admin" &&
            activeSection === "payments" && <AdminPayments />}
        </main>
      </div>
    </>
  );
}

export default App;
