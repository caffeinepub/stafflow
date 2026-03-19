import { useEffect, useRef, useState } from "react";
import { Toaster } from "sonner";
import { type Lang, useTranslations } from "./i18n";
import CompanyAuth from "./pages/CompanyAuth";
import CompanyDashboard from "./pages/CompanyDashboard";
import EmployeeAuth from "./pages/EmployeeAuth";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import LandingPage from "./pages/LandingPage";

export type Page =
  | "landing"
  | "company-auth"
  | "company-dashboard"
  | "employee-auth"
  | "employee-dashboard";

export interface Session {
  type: "company" | "employee";
  id: string;
  name: string;
  companyId?: string;
  role?: "admin" | "dept_manager";
  departments?: string[];
}

export default function App() {
  const [page, setPage] = useState<Page>("landing");
  const [lang, setLang] = useState<Lang>(
    () => (localStorage.getItem("sf_lang") as Lang) || "tr",
  );
  const [dark, setDark] = useState<boolean>(
    () => localStorage.getItem("sf_dark") !== "false",
  );
  const [session, setSession] = useState<Session | null>(() => {
    try {
      return JSON.parse(localStorage.getItem("sf_session") || "null");
    } catch {
      return null;
    }
  });

  const t = useTranslations(lang);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (dark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [dark]);

  useEffect(() => {
    localStorage.setItem("sf_lang", lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem("sf_dark", String(dark));
  }, [dark]);

  useEffect(() => {
    if (session) localStorage.setItem("sf_session", JSON.stringify(session));
    else localStorage.removeItem("sf_session");
  }, [session]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally runs once on mount
  useEffect(() => {
    if (!initializedRef.current && session) {
      initializedRef.current = true;
      setPage(
        session.type === "company" ? "company-dashboard" : "employee-dashboard",
      );
    }
  }, []);

  function handleLogin(sess: Session) {
    setSession(sess);
    setPage(
      sess.type === "company" ? "company-dashboard" : "employee-dashboard",
    );
  }

  function handleLogout() {
    setSession(null);
    setPage("landing");
  }

  const commonProps = { lang, setLang, dark, setDark, t };

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-screen bg-background text-foreground">
        <Toaster position="top-right" richColors />
        {page === "landing" && (
          <LandingPage {...commonProps} setPage={setPage} />
        )}
        {page === "company-auth" && (
          <CompanyAuth
            {...commonProps}
            setPage={setPage}
            onLogin={handleLogin}
          />
        )}
        {page === "company-dashboard" && session && (
          <CompanyDashboard
            {...commonProps}
            session={session}
            setPage={setPage}
            onLogout={handleLogout}
          />
        )}
        {page === "employee-auth" && (
          <EmployeeAuth
            {...commonProps}
            setPage={setPage}
            onLogin={handleLogin}
          />
        )}
        {page === "employee-dashboard" && session && (
          <EmployeeDashboard
            {...commonProps}
            session={session}
            setPage={setPage}
            onLogout={handleLogout}
          />
        )}
      </div>
    </div>
  );
}
