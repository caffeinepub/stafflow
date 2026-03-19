import { ArrowLeft, Check, Copy, Loader2, Moon, Sun } from "lucide-react";
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

export default function CompanyAuth({
  lang,
  setLang,
  dark,
  setDark,
  t,
  setPage,
  onLogin,
}: Props) {
  const { actor, isFetching } = useActor();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [loginCode, setLoginCode] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [newCompany, setNewCompany] = useState<{
    code: string;
    name: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

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
      const company = await actor.loginCompany(loginCode.trim().toUpperCase());
      if (!company) {
        toast.error(t("invalidCode"));
        return;
      }
      toast.success(t("success"));
      onLogin({ type: "company", id: company.id, name: company.name });
    } catch (err) {
      console.error(err);
      toast.error(t("error"));
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    if (!companyName.trim()) {
      toast.error(t("companyRequired"));
      return;
    }
    if (!actor) {
      toast.error(t("loading"));
      return;
    }
    setLoading(true);
    try {
      const company = await actor.registerCompany(companyName.trim());
      setNewCompany({ code: company.entryCode, name: company.name });
      toast.success(t("success"));
    } catch (err) {
      console.error(err);
      toast.error(t("error"));
    } finally {
      setLoading(false);
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(newCompany?.code || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function proceedToDashboard() {
    if (!actor || !newCompany) return;
    try {
      const company = await actor.loginCompany(newCompany.code);
      if (company) {
        onLogin({ type: "company", id: company.id, name: company.name });
      }
    } catch (err) {
      console.error(err);
      toast.error(t("error"));
    }
  }

  if (newCompany) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-2xl p-8 shadow-card">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-primary" />
              </div>
              <h2 className="text-xl font-bold">{newCompany.name}</h2>
              <p className="text-muted-foreground text-sm mt-1">
                {t("success")}
              </p>
            </div>
            <div className="bg-muted rounded-xl p-4 mb-4">
              <div className="text-xs text-muted-foreground mb-2">
                {t("yourLoginCode")}
              </div>
              <div className="flex items-center gap-3">
                <code className="text-lg font-mono font-bold tracking-widest flex-1 text-primary">
                  {newCompany.code}
                </code>
                <button
                  type="button"
                  onClick={copyCode}
                  className="p-2 hover:bg-background rounded-lg transition-colors"
                  data-ocid="company_auth.copy_button"
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
              <p className="text-amber-600 dark:text-amber-400 text-sm text-center">
                ⚠️ {t("saveCodeWarning")}
              </p>
            </div>
            <button
              type="button"
              onClick={proceedToDashboard}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-xl transition-colors"
              data-ocid="company_auth.primary_button"
            >
              {t("dashboard")} →
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
          data-ocid="company_auth.link"
        >
          <ArrowLeft size={18} />
          <span className="text-sm">{t("back")}</span>
        </button>
        <div className="flex items-center gap-3">
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            className="text-sm bg-card border border-border rounded-md px-2 py-1 focus:outline-none"
            data-ocid="company_auth.select"
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
            data-ocid="company_auth.toggle"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold">{t("companyLogin")}</h1>
          </div>
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
            <div className="flex border-b border-border">
              <button
                type="button"
                onClick={() => setTab("login")}
                className={`flex-1 py-4 text-sm font-medium transition-colors ${
                  tab === "login"
                    ? "bg-primary/10 text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-ocid="company_auth.tab"
              >
                {t("login")}
              </button>
              <button
                type="button"
                onClick={() => setTab("register")}
                className={`flex-1 py-4 text-sm font-medium transition-colors ${
                  tab === "register"
                    ? "bg-primary/10 text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-ocid="company_auth.tab"
              >
                {t("register")}
              </button>
            </div>
            <div className="p-6">
              {tab === "login" ? (
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="company-login-code"
                      className="block text-sm font-medium mb-2"
                    >
                      {t("loginCode")}
                    </label>
                    <input
                      id="company-login-code"
                      type="text"
                      value={loginCode}
                      onChange={(e) => setLoginCode(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                      placeholder={t("enterLoginCode")}
                      autoComplete="off"
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      data-ocid="company_auth.input"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleLogin}
                    disabled={loading || isFetching}
                    className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                    data-ocid="company_auth.submit_button"
                  >
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    {loading ? t("loading") : t("login")}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="company-name"
                      className="block text-sm font-medium mb-2"
                    >
                      {t("companyName")}
                    </label>
                    <input
                      id="company-name"
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      data-ocid="company_auth.input"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleRegister}
                    disabled={loading || isFetching}
                    className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                    data-ocid="company_auth.submit_button"
                  >
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    {loading ? t("loading") : t("createCompany")}
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
