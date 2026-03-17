import { Building2, Moon, Sun, Users } from "lucide-react";
import type { Page } from "../App";
import { LANGUAGES, type Lang, useTranslations } from "../i18n";

interface Props {
  lang: Lang;
  setLang: (l: Lang) => void;
  dark: boolean;
  setDark: (d: boolean) => void;
  t: (k: string) => string;
  setPage: (p: Page) => void;
}

export default function LandingPage({
  lang,
  setLang,
  dark,
  setDark,
  t,
  setPage,
}: Props) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">SF</span>
          </div>
          <span className="font-bold text-lg tracking-tight">StafFlow</span>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            className="text-sm bg-card border border-border rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            title={dark ? t("lightMode") : t("darkMode")}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-8">
          <div className="w-20 h-20 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-600/30">
            <span className="text-white font-bold text-3xl">SF</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-blue-500 to-blue-300 bg-clip-text text-transparent">
            StafFlow
          </h1>
          <p className="text-muted-foreground text-lg">{t("appTagline")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-xl">
          <button
            type="button"
            onClick={() => setPage("company-auth")}
            className="group flex flex-col items-center gap-4 p-8 rounded-2xl border border-border bg-card hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-200 cursor-pointer"
          >
            <div className="w-16 h-16 rounded-xl bg-blue-600/10 flex items-center justify-center group-hover:bg-blue-600/20 transition-colors">
              <Building2 size={32} className="text-blue-500" />
            </div>
            <div>
              <div className="font-semibold text-lg">{t("companyLogin")}</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setPage("employee-auth")}
            className="group flex flex-col items-center gap-4 p-8 rounded-2xl border border-border bg-card hover:border-green-500 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-200 cursor-pointer"
          >
            <div className="w-16 h-16 rounded-xl bg-green-600/10 flex items-center justify-center group-hover:bg-green-600/20 transition-colors">
              <Users size={32} className="text-green-500" />
            </div>
            <div>
              <div className="font-semibold text-lg">{t("employeeLogin")}</div>
            </div>
          </button>
        </div>
      </main>

      <footer className="text-center py-4 text-muted-foreground text-sm">
        StafFlow &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
