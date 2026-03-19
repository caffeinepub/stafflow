import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock,
  Loader2,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Page, Session } from "../App";
import {
  useActiveCheckIn,
  useAttendanceByPersonnel,
  useCheckIn,
  useCheckOut,
} from "../hooks/useQueries";
import { LANGUAGES, type Lang } from "../i18n";

interface Props {
  lang: Lang;
  setLang: (l: Lang) => void;
  dark: boolean;
  setDark: (d: boolean) => void;
  t: (k: string) => string;
  session: Session;
  setPage: (p: Page) => void;
  onLogout: () => void;
}

function formatTime(ts: bigint): string {
  if (!ts) return "-";
  const d = new Date(Number(ts) / 1_000_000);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts: bigint): string {
  if (!ts) return "-";
  const d = new Date(Number(ts) / 1_000_000);
  return d.toLocaleDateString();
}

function formatDuration(checkIn: bigint, checkOut: bigint): string {
  const ms = Number(checkOut - checkIn) / 1_000_000;
  if (ms <= 0) return "-";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

export default function EmployeeDashboard({
  lang,
  setLang,
  dark,
  setDark,
  t,
  session,
  onLogout,
}: Props) {
  const companyId = session.companyId || "";

  const { data: activeCheckIn, isLoading: checkInLoading } = useActiveCheckIn(
    session.id,
  );
  const { data: history = [], isLoading: historyLoading } =
    useAttendanceByPersonnel(session.id);
  const checkInMutation = useCheckIn(companyId);
  const checkOutMutation = useCheckOut();

  const isCheckedIn = !!activeCheckIn;

  async function handleCheckIn() {
    if (!companyId) {
      toast.error(
        lang === "tr" ? "Şirket bilgisi eksik" : "Company info missing",
      );
      return;
    }
    try {
      await checkInMutation.mutateAsync(session.id);
      toast.success(`${t("checkIn")} ✓`);
    } catch {
      toast.error(t("error"));
    }
  }

  async function handleCheckOut() {
    try {
      await checkOutMutation.mutateAsync(session.id);
      toast.success(`${t("checkOut")} ✓`);
    } catch {
      toast.error(t("error"));
    }
  }

  const isMutating = checkInMutation.isPending || checkOutMutation.isPending;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">
              SF
            </span>
          </div>
          <div>
            <div className="font-semibold text-sm leading-tight">
              {session.name}
            </div>
            <div className="text-xs text-muted-foreground">StafFlow</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            className="text-xs bg-background border border-border rounded-md px-2 py-1 focus:outline-none"
            data-ocid="employee_dashboard.select"
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
            data-ocid="employee_dashboard.toggle"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
            data-ocid="employee_dashboard.button"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">{t("logout")}</span>
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 max-w-2xl mx-auto w-full space-y-6">
        {/* Status Card */}
        <div
          className={`rounded-2xl p-6 border-2 transition-colors ${
            isCheckedIn
              ? "bg-green-500/5 border-green-500/30"
              : "bg-card border-border"
          }`}
          data-ocid="employee_dashboard.card"
        >
          <div className="flex items-center gap-4 mb-6">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isCheckedIn ? "bg-green-500/10" : "bg-muted"
              }`}
            >
              <Clock
                size={24}
                className={
                  isCheckedIn ? "text-green-500" : "text-muted-foreground"
                }
              />
            </div>
            <div>
              {checkInLoading ? (
                <div
                  className="flex items-center gap-2 text-muted-foreground"
                  data-ocid="employee_dashboard.loading_state"
                >
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-sm">{t("loading")}</span>
                </div>
              ) : (
                <>
                  <div
                    className={`font-bold text-lg ${
                      isCheckedIn
                        ? "text-green-600 dark:text-green-400"
                        : "text-foreground"
                    }`}
                  >
                    {isCheckedIn
                      ? lang === "tr"
                        ? "İçeridesiniz"
                        : "You're Checked In"
                      : lang === "tr"
                        ? "Dışarıdasınız"
                        : "You're Checked Out"}
                  </div>
                  {isCheckedIn && activeCheckIn && (
                    <div className="text-sm text-muted-foreground">
                      {lang === "tr" ? "Giriş:" : "Since:"}{" "}
                      {formatTime(activeCheckIn.checkIn)}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Check In/Out Button */}
          {!checkInLoading && (
            <button
              type="button"
              onClick={isCheckedIn ? handleCheckOut : handleCheckIn}
              disabled={isMutating}
              className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                isCheckedIn
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              } disabled:opacity-50`}
              data-ocid="employee_dashboard.primary_button"
            >
              {isMutating ? (
                <Loader2 size={20} className="animate-spin" />
              ) : isCheckedIn ? (
                <ArrowUpFromLine size={20} />
              ) : (
                <ArrowDownToLine size={20} />
              )}
              {isMutating
                ? t("loading")
                : isCheckedIn
                  ? t("checkOut")
                  : t("checkIn")}
            </button>
          )}
        </div>

        {/* Attendance History */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-semibold">{t("attendanceHistory")}</h3>
          </div>
          {historyLoading ? (
            <div
              className="flex items-center gap-2 text-muted-foreground justify-center py-8"
              data-ocid="employee_dashboard.loading_state"
            >
              <Loader2 size={20} className="animate-spin" /> {t("loading")}
            </div>
          ) : history.length === 0 ? (
            <div
              className="text-muted-foreground text-sm text-center py-8"
              data-ocid="employee_dashboard.empty_state"
            >
              {t("noRecords")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table
                className="w-full text-sm"
                data-ocid="employee_dashboard.table"
              >
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      {t("date")}
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      {t("checkIn")}
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      {t("checkOut")}
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">
                      {lang === "tr" ? "Süre" : "Duration"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {history
                    .sort((a, b) => Number(b.checkIn - a.checkIn))
                    .slice(0, 100)
                    .map((record, i) => (
                      <tr
                        key={record.id}
                        className="border-b border-border last:border-0 hover:bg-muted/20"
                        data-ocid={`employee_dashboard.row.${i + 1}`}
                      >
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(record.checkIn)}
                        </td>
                        <td className="px-4 py-3">
                          {formatTime(record.checkIn)}
                        </td>
                        <td className="px-4 py-3">
                          {record.hasCheckedOut ? (
                            formatTime(record.checkOut)
                          ) : (
                            <span className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">
                              {lang === "tr" ? "İçeride" : "In"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                          {record.hasCheckedOut
                            ? formatDuration(record.checkIn, record.checkOut)
                            : "-"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-muted-foreground text-xs border-t border-border">
        © {new Date().getFullYear()}. Built with love using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
