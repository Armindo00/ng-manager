import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import type { User } from "./types";

import Login from "./pages/Login";
import CoachArea from "./pages/CoachArea";
import CoachDashboard from "./pages/CoachDashboard";
import AdminArea from "./pages/AdminArea";
import AdminDashboard from "./pages/AdminDashboard";
import AdminPayments from "./pages/AdminPayments";
import Coaches from "./pages/Coaches";
import AdminLessons from "./pages/AdminLessons";
import AdminInventory from "./pages/AdminInventory";
import AdminVans from "./pages/AdminVans";
import AdminCompensations from "./pages/AdminCompensations";
import AdminEvaluations from "./pages/AdminEvaluations";
import AdminSchoolSetup from "./pages/AdminSchoolSetup";
import AdminCoachActivity from "./pages/AdminCoachActivity";
import AdminFixedTrainings from "./pages/AdminFixedTrainings";
import CoachActivity from "./pages/CoachActivity";
import Sidebar from "./components/Sidebar";
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
  | "my-dashboard"
  | "my-lessons"
  | "my-activity"
  | "setup"
  | "students"
  | "coaches"
  | "fixed-trainings"
  | "lessons"
  | "inventory"
  | "vans"
  | "compensations"
  | "evaluations"
  | "payments"
  | "coach-activity";

type CoachSection = "dashboard" | "lessons" | "activity";

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [coachSection, setCoachSection] = useState<CoachSection>("dashboard");
  const [activeSection, setActiveSection] =
    useState<AdminSection>("my-dashboard");

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

          if (appUser.role === "student") {
            await supabase.auth.signOut();
            setCurrentUser(null);
            toast.error(
              "O acesso de alunos está desativado. Contacta a escola."
            );
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

      if (appUser.role === "student") {
        await supabase.auth.signOut();
        setCurrentUser(null);
        toast.error("O acesso de alunos está desativado. Contacta a escola.");
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
    }
  }

  function getActiveSection() {
    if (!currentUser) return "dashboard";

    if (currentUser.role === "admin") return activeSection;
    return coachSection;
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

          {currentUser.role === "coach" && (
            <>
              {coachSection === "dashboard" && (
                <CoachDashboard user={currentUser} />
              )}

              {coachSection === "lessons" && (
                <CoachArea user={currentUser} />
              )}

              {coachSection === "activity" && (
                <CoachActivity user={currentUser} />
              )}
            </>
          )}

          {currentUser.role === "admin" && activeSection === "my-dashboard" && (
            <CoachDashboard user={currentUser} />
          )}

          {currentUser.role === "admin" && activeSection === "my-lessons" && (
            <CoachArea user={currentUser} />
          )}

          {currentUser.role === "admin" && activeSection === "my-activity" && (
            <CoachActivity user={currentUser} />
          )}

          {currentUser.role === "admin" && activeSection === "dashboard" && (
            <AdminDashboard onChangeSection={setActiveSection} />
          )}

          {currentUser.role === "admin" && activeSection === "setup" && (
            <AdminSchoolSetup />
          )}

          {currentUser.role === "admin" &&
            activeSection === "students" && <AdminArea />}

          {currentUser.role === "admin" &&
            activeSection === "coaches" && <Coaches />}

          {currentUser.role === "admin" &&
            activeSection === "fixed-trainings" && <AdminFixedTrainings />}

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

          {currentUser.role === "admin" &&
            activeSection === "coach-activity" && <AdminCoachActivity />}
        </main>
      </div>
    </>
  );
}

export default App;
