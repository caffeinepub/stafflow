import { ArrowLeft, Check, Copy, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Page, Session } from "../App";
import { LANGUAGES, type Lang } from "../i18n";
import { loginEmployee, registerEmployee } from "../store";

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
  const [tab, setTab] = useState<"login" | "register">("login");
  const [loginCode, setLoginCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [newCode, setNewCode] = useState<{
    code: string;
    empName: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  function handleLogin() {
    if (!loginCode.trim()) {
      toast.error(t("codeRequired"));
      return;
    }
    setLoading(true);
    const res = loginEmployee(loginCode);
    setLoading(false);
    if (!res.ok || !res.employee) {
      toast.error(t("invalidCode"));
      return;
    }
    toast.success(t("success"));
    onLogin({
      type: "employee",
      id: res.employee.id,
      name: res.employee.fullName,
    });
  }

  function handleRegister() {
    if (!fullName.trim()) {
      toast.error(t("nameRequired"));
      return;
    }
    setLoading(true);
    const res = registerEmployee(fullName, phone || undefined);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    setNewCode({ code: res.loginCode, empName: fullName });
  }

  function copyCode() {
    navigator.clipboard.writeText(newCode?.code || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function proceedToDashboard() {
    const res = loginEmployee(newCode!.code);
    if (res.ok && res.employee) {
      onLogin({
        type: "employee",
        id: res.employee.id,
        name: res.employee.fullName,
      });
    }
  }

  if (newCode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-green-500" />
              </div>
              <h2 className="text-xl font-bold">{newCode.empName}</h2>
              <p className="text-muted-foreground text-sm mt-1">
                {t("success")}
              </p>
            </div>
            <div className="bg-muted rounded-xl p-4 mb-4">
              <div className="text-xs text-muted-foreground mb-2">
                {t("yourLoginCode")}
              </div>
              <div className="flex items-center gap-3">
                <code className="text-lg font-mono font-bold tracking-widest flex-1 text-green-400">
                  {newCode.code}
                </code>
                <button
                  type="button"
                  onClick={copyCode}
                  className="p-2 hover:bg-background rounded-lg transition-colors"
                >
                  {copied ? (
                    <Check size={16} className="text-green-500" />
                  ) : (
                    <Copy size={16} />
                  )}
                </button>
              </div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-6">
              <p className="text-amber-400 text-sm text-center">
                ⚠️ {t("saveCodeWarning")}
              </p>
            </div>
            <button
              type="button"
              onClick={proceedToDashboard}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {t("dashboard")} &rarr;
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <button
          type="button"
          onClick={() => setPage("landing")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm">{t("back")}</span>
        </button>
        <div className="flex items-center gap-3">
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            className="text-sm bg-card border border-border rounded-md px-2 py-1 focus:outline-none"
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
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold">{t("employeeLogin")}</h1>
          </div>
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
            <div className="flex border-b border-border">
              <button
                type="button"
                onClick={() => setTab("login")}
                className={`flex-1 py-4 text-sm font-medium transition-colors ${
                  tab === "login"
                    ? "bg-green-600/10 text-green-400 border-b-2 border-green-500"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("login")}
              </button>
              <button
                type="button"
                onClick={() => setTab("register")}
                className={`flex-1 py-4 text-sm font-medium transition-colors ${
                  tab === "register"
                    ? "bg-green-600/10 text-green-400 border-b-2 border-green-500"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("register")}
              </button>
            </div>
            <div className="p-6">
              {tab === "login" ? (
                <div className="space-y-4">
                  <div>
                    <div className="block text-sm font-medium mb-2">
                      {t("loginCode")}
                    </div>
                    <input
                      id="emp-login-code"
                      type="text"
                      value={loginCode}
                      onChange={(e) => setLoginCode(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                      placeholder={t("enterLoginCode")}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleLogin}
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
                  >
                    {loading ? t("loading") : t("login")}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="block text-sm font-medium mb-2">
                      {t("fullName")}
                    </div>
                    <input
                      id="emp-fullname"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <div className="block text-sm font-medium mb-2">
                      {t("phone")}
                    </div>
                    <input
                      id="emp-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleRegister}
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
                  >
                    {loading ? t("loading") : t("createEmployee")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
