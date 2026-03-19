import { ArrowLeft, Loader2, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Page, Session } from "../App";
import { useActor } from "../hooks/useActor";
import { LANGUAGES, type Lang } from "../i18n";

interface Props {
  lang: Lang;
  setLang: (l: Lang) => void;
  dark: boolean;
  setDark: (d: boolean) => void;
  t: (k: string) => string;
  setPage: (p: Page) => void;
  onLogin: (s: Session) => void;
}

export default function EmployeeAuth({
  lang,
  setLang,
  dark,
  setDark,
  t,
  setPage,
  onLogin,
}: Props) {
  const { actor, isFetching } = useActor();
  const [loginCode, setLoginCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!loginCode.trim()) {
      toast.error(t("codeRequired"));
      return;
    }
    if (!actor) {
      toast.error(t("loading"));
      return;
    }
    setLoading(true);
    try {
      const personnel = await actor.loginPersonnel(
        loginCode.trim().toUpperCase(),
      );
      if (!personnel) {
        toast.error(t("invalidCode"));
        return;
      }
      toast.success(t("success"));
      onLogin({
        type: "employee",
        id: personnel.id,
        name: personnel.name,
        companyId: personnel.companyId,
      });
    } catch (err) {
      console.error(err);
      toast.error(t("error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <button
          type="button"
          onClick={() => setPage("landing")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          data-ocid="employee_auth.link"
        >
          <ArrowLeft size={18} />
          <span className="text-sm">{t("back")}</span>
        </button>
        <div className="flex items-center gap-3">
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            className="text-sm bg-card border border-border rounded-md px-2 py-1 focus:outline-none"
            data-ocid="employee_auth.select"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setDark(!dark)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            data-ocid="employee_auth.toggle"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">👤</span>
            </div>
            <h1 className="text-2xl font-bold">{t("employeeLogin")}</h1>
            <p className="text-muted-foreground text-sm mt-2">
              {lang === "tr"
                ? "12 haneli personel kodunuzla giriş yapın"
                : "Login with your 12-character personnel code"}
            </p>
          </div>
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
            <div className="p-6 space-y-4">
              <div>
                <label
                  htmlFor="emp-login-code"
                  className="block text-sm font-medium mb-2"
                >
                  {t("loginCode")}
                </label>
                <input
                  id="emp-login-code"
                  type="text"
                  value={loginCode}
                  onChange={(e) => setLoginCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder={t("enterLoginCode")}
                  autoComplete="off"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent tracking-widest"
                  data-ocid="employee_auth.input"
                />
              </div>
              <button
                type="button"
                onClick={handleLogin}
                disabled={loading || isFetching}
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                data-ocid="employee_auth.submit_button"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? t("loading") : t("login")}
              </button>
            </div>
          </div>
          <p className="text-center text-muted-foreground text-xs mt-6">
            {lang === "tr"
              ? "Kodunuz şirket yöneticiniz tarafından sağlanır"
              : "Your code is provided by your company administrator"}
          </p>
        </div>
      </main>
    </div>
  );
}
