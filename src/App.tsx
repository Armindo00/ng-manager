import { useEffect, useRef, useState } from "react";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import type { User } from "./types";

import Login from "./pages/Login";
import CoachArea from "./pages/CoachArea";
import CoachDashboard from "./pages/CoachDashboard";
import AdminArea from "./pages/AdminArea";
import AdminDashboard from "./pages/AdminDashboard";
import AdminPayments from "./pages/AdminPayments";
import AdminTrainingQuota from "./pages/AdminTrainingQuota";
import Coaches from "./pages/Coaches";
import AdminLessons from "./pages/AdminLessons";
import AdminInventory from "./pages/AdminInventory";
import AdminVans from "./pages/AdminVans";
import AdminCompensations from "./pages/AdminCompensations";
import AdminEvaluations from "./pages/AdminEvaluations";
import AdminCoachActivity from "./pages/AdminCoachActivity";
import AdminFixedTrainings from "./pages/AdminFixedTrainings";
import CoachActivity from "./pages/CoachActivity";
import PublicEvaluation from "./pages/PublicEvaluation";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import { supabase } from "./services/supabase";
import { resolveAppUserFromEmail } from "./services/sessionService";
import { requiresPasswordChange } from "./services/usersService";
import ChangePassword from "./pages/ChangePassword";

const TOAST_OPTIONS = {
  className: "ng-toast",
  duration: 3200,
  style: {
    background: "#0b1f2a",
    color: "#f3f7fa",
    borderRadius: "12px",
    border: "1px solid rgba(158, 176, 191, 0.25)",
    fontFamily: "Manrope, system-ui, sans-serif",
    fontWeight: 600,
  },
  success: {
    iconTheme: { primary: "#0f766e", secondary: "#f3f7fa" },
  },
  error: {
    iconTheme: { primary: "#c2410c", secondary: "#f3f7fa" },
  },
} as const;

function AppToaster() {
  return <Toaster position="top-right" toastOptions={TOAST_OPTIONS} />;
}

function getEvaluationShareToken() {
  const hash = window.location.hash.replace(/^#/, "");
  const match = hash.match(/^\/?avaliacao\/([A-Za-z0-9_-]+)/);
  return match?.[1] || null;
}

type AdminSection =
  | "dashboard"
  | "my-dashboard"
  | "my-lessons"
  | "my-activity"
  | "my-evaluations"
  | "students"
  | "coaches"
  | "fixed-trainings"
  | "lessons"
  | "inventory"
  | "vans"
  | "compensations"
  | "evaluations"
  | "payments"
  | "training-quota"
  | "coach-activity";

type CoachSection =
  | "dashboard"
  | "lessons"
  | "calendar"
  | "activity"
  | "inventory"
  | "evaluations"
  | "compensations";

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [coachSection, setCoachSection] = useState<CoachSection>("dashboard");
  const [activeSection, setActiveSection] =
    useState<AdminSection>("my-dashboard");
  const [evaluationShareToken, setEvaluationShareToken] = useState<string | null>(
    () => getEvaluationShareToken()
  );
  const resolveSeq = useRef(0);
  const currentUserRef = useRef<User | null>(null);

  useEffect(() => {
    function syncShareRoute() {
      setEvaluationShareToken(getEvaluationShareToken());
    }

    window.addEventListener("hashchange", syncShareRoute);
    return () => window.removeEventListener("hashchange", syncShareRoute);
  }, []);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    window.scrollTo(0, 0);
  }, [currentUser]);

  useEffect(() => {
    let mounted = true;

    async function applySession(
      email: string | undefined,
      source: "initial" | "signed_in" | "token_refreshed"
    ) {
      const seq = ++resolveSeq.current;

      if (!email) {
        if (mounted && seq === resolveSeq.current) {
          setCurrentUser(null);
          setAuthReady(true);
        }
        return;
      }

      // Login.tsx already resolved the user for this sign-in. Do not race it.
      if (source === "signed_in" && currentUserRef.current) {
        if (mounted && seq === resolveSeq.current) {
          setAuthReady(true);
        }
        return;
      }

      const result = await resolveAppUserFromEmail(email, {
        retries: source === "initial" ? 4 : 3,
      });

      if (!mounted || seq !== resolveSeq.current) return;

      if (result.ok) {
        setCurrentUser(result.user);
        setAuthReady(true);
        return;
      }

      if (result.reason === "blocked" || result.reason === "student") {
        toast.error(result.message);
        await supabase.auth.signOut();
        if (mounted && seq === resolveSeq.current) {
          setCurrentUser(null);
          setAuthReady(true);
        }
        return;
      }

      // Never kick out an already-authenticated app user on a transient miss.
      if (currentUserRef.current) {
        if (mounted && seq === resolveSeq.current) {
          setAuthReady(true);
        }
        return;
      }

      if (source === "token_refreshed" || source === "initial") {
        toast.error(result.message);
        await supabase.auth.signOut();
      }

      if (mounted && seq === resolveSeq.current) {
        setCurrentUser(null);
        setAuthReady(true);
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Defer Supabase queries out of the auth callback (avoids client deadlock).
      setTimeout(() => {
        if (!mounted) return;

        if (event === "INITIAL_SESSION") {
          void applySession(session?.user?.email, "initial");
          return;
        }

        if (event === "SIGNED_OUT") {
          resolveSeq.current += 1;
          setCurrentUser(null);
          setAuthReady(true);
          return;
        }

        if (event === "SIGNED_IN") {
          void applySession(session?.user?.email, "signed_in");
          return;
        }

        if (event === "TOKEN_REFRESHED") {
          void applySession(session?.user?.email, "token_refreshed");
        }
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  function handleLogin(user: User) {
    // Sync ref immediately so a racing SIGNED_IN handler does not clear the user.
    currentUserRef.current = user;
    setCurrentUser(user);
    setAuthReady(true);
  }

  async function logout() {
    resolveSeq.current += 1;
    currentUserRef.current = null;
    await supabase.auth.signOut();
    setCurrentUser(null);
    setAuthReady(true);
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

  if (evaluationShareToken) {
    return (
      <>
        <AppToaster />
        <PublicEvaluation token={evaluationShareToken} />
      </>
    );
  }

  if (!authReady) {
    return (
      <>
        <AppToaster />
        <div className="login-page">
          <div className="login-form-panel" style={{ gridColumn: "1 / -1" }}>
            <div className="login-card">
              <p className="muted">A preparar sessão...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!currentUser) {
    return (
      <>
        <AppToaster />
        <Login onLogin={handleLogin} />
      </>
    );
  }

  if (requiresPasswordChange(currentUser)) {
    return (
      <>
        <AppToaster />
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
      <AppToaster />

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

              {coachSection === "calendar" && (
                <AdminLessons user={currentUser} />
              )}

              {coachSection === "activity" && (
                <CoachActivity user={currentUser} />
              )}

              {coachSection === "inventory" && <AdminInventory />}

              {coachSection === "evaluations" && (
                <AdminEvaluations user={currentUser} scope="mine" />
              )}

              {coachSection === "compensations" && <AdminCompensations />}
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

          {currentUser.role === "admin" &&
            activeSection === "my-evaluations" && (
              <AdminEvaluations user={currentUser} scope="mine" />
            )}

          {currentUser.role === "admin" && activeSection === "dashboard" && (
            <AdminDashboard onNavigate={handleChangeSection} />
          )}

          {currentUser.role === "admin" &&
            activeSection === "students" && <AdminArea />}

          {currentUser.role === "admin" &&
            activeSection === "coaches" && <Coaches />}

          {currentUser.role === "admin" &&
            activeSection === "fixed-trainings" && <AdminFixedTrainings />}

          {currentUser.role === "admin" &&
            activeSection === "lessons" && (
              <AdminLessons user={currentUser} />
            )}

          {currentUser.role === "admin" &&
            activeSection === "inventory" && <AdminInventory />}

          {currentUser.role === "admin" &&
            activeSection === "vans" && <AdminVans />}

          {currentUser.role === "admin" &&
            activeSection === "compensations" && <AdminCompensations />}

          {currentUser.role === "admin" &&
            activeSection === "evaluations" && (
              <AdminEvaluations user={currentUser} scope="all" />
            )}

          {currentUser.role === "admin" &&
            activeSection === "payments" && <AdminPayments />}

          {currentUser.role === "admin" &&
            activeSection === "training-quota" && <AdminTrainingQuota />}

          {currentUser.role === "admin" &&
            activeSection === "coach-activity" && <AdminCoachActivity />}
        </main>
      </div>
    </>
  );
}

export default App;
