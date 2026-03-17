import {
  AlertTriangle,
  BarChart3,
  Building2,
  Check,
  Copy,
  Download,
  LogOut,
  Moon,
  Plus,
  QrCode,
  Sun,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Page, Session } from "../App";
import { LANGUAGES, type Lang } from "../i18n";
import {
  type AttendanceRecord,
  type Employee,
  type InviteCode,
  cancelInviteCode,
  createInviteCode,
  formatDuration,
  getAllCompanyAttendance,
  getCheckedInEmployees,
  getCompany,
  getCompanyAttendance,
  getCompanyEmployees,
  getCompanyInviteCodes,
  getDailyCheckinCount,
  getInviteCodeStatus,
  getRecordDuration,
} from "../store";

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

type Tab = "overview" | "live" | "invites" | "employees" | "attendance";

function formatDate(ts: number) {
  return new Date(ts).toLocaleString();
}
function formatDateOnly(ts: number) {
  return new Date(ts).toLocaleDateString();
}

const LATE_THRESHOLD_HOURS = 10;

export default function CompanyDashboard({
  lang,
  setLang,
  dark,
  setDark,
  t,
  session,
  onLogout,
}: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [checkedInList, setCheckedInList] = useState<
    { employee: Employee; checkinTimestamp: number }[]
  >([]);
  const [showCreateInvite, setShowCreateInvite] = useState(false);
  const [maxUses, setMaxUses] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [newInviteCode, setNewInviteCode] = useState("");
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [filterEmpId, setFilterEmpId] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const company = getCompany(session.id);

  const loadData = useCallback(() => {
    setInviteCodes(getCompanyInviteCodes(session.id));
    setEmployees(getCompanyEmployees(session.id));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    setTodayCount(
      getDailyCheckinCount(session.id, today.getTime(), tomorrow.getTime()),
    );
    setCheckedInList(getCheckedInEmployees(session.id));
    setAllAttendance(getAllCompanyAttendance(session.id));
  }, [session.id]);

  const loadAttendance = useCallback(() => {
    const from = filterFrom ? new Date(filterFrom).getTime() : undefined;
    const to = filterTo
      ? new Date(`${filterTo}T23:59:59`).getTime()
      : undefined;
    setAttendance(
      getCompanyAttendance(session.id, from, to, filterEmpId || undefined),
    );
  }, [session.id, filterFrom, filterTo, filterEmpId]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  function handleCreateInvite() {
    setCreatingInvite(true);
    const mu = maxUses ? Number.parseInt(maxUses) : undefined;
    const exp = expiryDate
      ? new Date(`${expiryDate}T23:59:59`).getTime()
      : undefined;
    const res = createInviteCode(session.id, mu, exp);
    setCreatingInvite(false);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    setNewInviteCode(res.code);
    loadData();
  }

  function handleCancelInvite(id: string) {
    const res = cancelInviteCode(id, session.id);
    if (res.ok) {
      toast.success(t("success"));
      loadData();
    } else toast.error(res.message);
  }

  function copyInvite() {
    navigator.clipboard.writeText(newInviteCode);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  }

  function closeInviteModal() {
    setShowCreateInvite(false);
    setNewInviteCode("");
    setMaxUses("");
    setExpiryDate("");
  }

  function handleExportCSV() {
    const headers = [t("employee"), t("type"), t("date"), t("duration")];
    const rows = attendance.map((rec) => [
      `"${rec.employeeName}"`,
      rec.recordType === "checkin" ? t("checkinType") : t("checkoutType"),
      `"${formatDate(rec.timestamp)}"`,
      `"${getRecordDuration(rec, allAttendance)}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stafflow-attendance.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const activeInvites = inviteCodes.filter(
    (c) => getInviteCodeStatus(c) === "active",
  ).length;

  const lateEmployees = checkedInList.filter(
    ({ checkinTimestamp }) =>
      Date.now() - checkinTimestamp > LATE_THRESHOLD_HOURS * 60 * 60 * 1000,
  );

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: t("overview"), icon: <BarChart3 size={16} /> },
    { key: "live", label: t("liveStatus"), icon: <Zap size={16} /> },
    { key: "invites", label: t("inviteCodes"), icon: <QrCode size={16} /> },
    { key: "employees", label: t("employees"), icon: <Users size={16} /> },
    {
      key: "attendance",
      label: t("attendance"),
      icon: <BarChart3 size={16} />,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Building2 size={16} className="text-white" />
          </div>
          <div>
            <div className="font-semibold text-sm">{session.name}</div>
            <div className="text-xs text-muted-foreground">
              {t("companyLogin")}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            className="text-xs bg-background border border-border rounded-md px-1 py-1 focus:outline-none hidden md:block"
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
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-muted transition-colors"
          >
            <LogOut size={16} />
            <span className="hidden md:inline">{t("logout")}</span>
          </button>
        </div>
      </header>

      <nav className="flex border-b border-border bg-card overflow-x-auto">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            type="button"
            onClick={() => setTab(tb.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              tab === tb.key
                ? "text-blue-400 border-b-2 border-blue-500 bg-blue-600/5"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tb.icon}
            {tb.label}
            {tb.key === "live" && checkedInList.length > 0 && (
              <span className="ml-1 bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {checkedInList.length}
              </span>
            )}
          </button>
        ))}
      </nav>

      <main className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full">
        {tab === "overview" && (
          <div>
            <h2 className="text-xl font-bold mb-6">{t("overview")}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                label={t("todayCheckins")}
                value={todayCount}
                color="blue"
              />
              <StatCard
                label={t("totalEmployees")}
                value={employees.length}
                color="green"
              />
              <StatCard
                label={t("activeInvites")}
                value={activeInvites}
                color="purple"
              />
              <StatCard
                label={t("currentlyIn")}
                value={checkedInList.length}
                color="orange"
              />
            </div>
            {company?.authorizedPerson && (
              <div className="mt-6 bg-card border border-border rounded-xl p-4">
                <div className="text-sm text-muted-foreground">
                  {t("authorizedPerson")}
                </div>
                <div className="font-medium mt-1">
                  {company.authorizedPerson}
                </div>
              </div>
            )}
            {lateEmployees.length > 0 && (
              <div className="mt-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={16} className="text-red-400" />
                  <div className="text-sm font-semibold text-red-400">
                    {t("lateWarning")}
                  </div>
                </div>
                <div className="space-y-2">
                  {lateEmployees.map(({ employee, checkinTimestamp }) => (
                    <div
                      key={employee.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-medium">{employee.fullName}</span>
                      <span className="text-red-400 text-xs">
                        {formatDuration(checkinTimestamp, Date.now())}{" "}
                        {t("hoursAgo")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "live" && (
          <div>
            <h2 className="text-xl font-bold mb-6">{t("liveStatus")}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                  <h3 className="font-semibold text-green-400">
                    {t("currentlyIn")} ({checkedInList.length})
                  </h3>
                </div>
                {checkedInList.length === 0 ? (
                  <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
                    {t("noOneSite")}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {checkedInList.map(({ employee, checkinTimestamp }) => {
                      const isLate =
                        Date.now() - checkinTimestamp >
                        LATE_THRESHOLD_HOURS * 60 * 60 * 1000;
                      return (
                        <div
                          key={employee.id}
                          className={`bg-card border rounded-xl p-4 flex items-center justify-between ${
                            isLate
                              ? "border-red-500/40 bg-red-500/5"
                              : "border-border"
                          }`}
                        >
                          <div>
                            <div className="font-medium text-sm">
                              {employee.fullName}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {formatDate(checkinTimestamp)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-mono px-2 py-1 rounded-lg ${
                                isLate
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-green-500/20 text-green-400"
                              }`}
                            >
                              {formatDuration(checkinTimestamp, Date.now())}
                            </span>
                            {isLate && (
                              <AlertTriangle
                                size={14}
                                className="text-red-400"
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                  <h3 className="font-semibold text-muted-foreground">
                    {t("currentlyOut")} (
                    {employees.length - checkedInList.length})
                  </h3>
                </div>
                {employees.length === 0 ? (
                  <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
                    {t("noEmployees")}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {employees
                      .filter(
                        (emp) =>
                          !checkedInList.some(
                            ({ employee }) => employee.id === emp.id,
                          ),
                      )
                      .map((emp) => (
                        <div
                          key={emp.id}
                          className="bg-card border border-border rounded-xl p-4 flex items-center justify-between"
                        >
                          <div className="font-medium text-sm">
                            {emp.fullName}
                          </div>
                          <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-1 rounded-lg">
                            {t("checkedOut")}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "invites" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{t("inviteCodes")}</h2>
              <button
                type="button"
                onClick={() => setShowCreateInvite(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
              >
                <Plus size={16} />
                {t("createInviteCode")}
              </button>
            </div>
            {inviteCodes.length === 0 ? (
              <EmptyState text={t("noInviteCodes")} />
            ) : (
              <div className="space-y-3">
                {inviteCodes.map((inv) => {
                  const status = getInviteCodeStatus(inv);
                  return (
                    <div
                      key={inv.id}
                      className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                    >
                      <code className="font-mono font-bold text-blue-400 tracking-widest">
                        {inv.code}
                      </code>
                      <div className="flex-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <StatusBadge status={status} t={t} />
                        <span>
                          {t("uses")}: {inv.usedCount}/
                          {inv.maxUses ?? t("unlimited")}
                        </span>
                        {inv.expiresAt && (
                          <span>
                            {t("expiryDate")}: {formatDateOnly(inv.expiresAt)}
                          </span>
                        )}
                        <span>{formatDate(inv.createdAt)}</span>
                      </div>
                      {status === "active" && (
                        <button
                          type="button"
                          onClick={() => handleCancelInvite(inv.id)}
                          className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg border border-red-500/30 hover:bg-red-500/10 transition-colors"
                        >
                          {t("cancelCode")}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "employees" && (
          <div>
            <h2 className="text-xl font-bold mb-6">{t("employees")}</h2>
            {employees.length === 0 ? (
              <EmptyState text={t("noEmployees")} />
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                        {t("fullName")}
                      </th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                        {t("phone")}
                      </th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                        {t("status")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => {
                      const isIn = checkedInList.some(
                        ({ employee }) => employee.id === emp.id,
                      );
                      return (
                        <tr
                          key={emp.id}
                          className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium">
                            {emp.fullName}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {emp.phone || "-"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                                isIn
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-gray-500/20 text-gray-400"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isIn
                                    ? "bg-green-400 animate-pulse"
                                    : "bg-gray-400"
                                }`}
                              />
                              {isIn ? t("checkedIn") : t("checkedOut")}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "attendance" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{t("attendance")}</h2>
              {attendance.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 border border-border hover:bg-muted text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                >
                  <Download size={16} />
                  {t("exportCSV")}
                </button>
              )}
            </div>
            <div className="bg-card border border-border rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">
                  {t("from")}
                </div>
                <input
                  type="date"
                  value={filterFrom}
                  onChange={(e) => setFilterFrom(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">
                  {t("to")}
                </div>
                <input
                  type="date"
                  value={filterTo}
                  onChange={(e) => setFilterTo(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">
                  {t("employee")}
                </div>
                <select
                  value={filterEmpId}
                  onChange={(e) => setFilterEmpId(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t("allEmployees")}</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.fullName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {attendance.length === 0 ? (
              <EmptyState text={t("noRecords")} />
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                        {t("employee")}
                      </th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                        {t("type")}
                      </th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                        {t("date")}
                      </th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                        {t("duration")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((rec) => {
                      const dur = getRecordDuration(rec, allAttendance);
                      return (
                        <tr
                          key={rec.id}
                          className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium">
                            {rec.employeeName}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                                rec.recordType === "checkin"
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-gray-500/20 text-gray-400"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${rec.recordType === "checkin" ? "bg-green-400" : "bg-gray-400"}`}
                              />
                              {rec.recordType === "checkin"
                                ? t("checkinType")
                                : t("checkoutType")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatDate(rec.timestamp)}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                            {dur !== "-" ? (
                              <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded">
                                {dur}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {showCreateInvite && (
        <dialog
          open
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50 m-0 max-w-none w-full h-full bg-transparent border-0"
        >
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: modal backdrop */}
          <div className="fixed inset-0" onClick={closeInviteModal} />
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">{t("createInviteCode")}</h3>
              <button
                type="button"
                onClick={closeInviteModal}
                className="p-1 hover:bg-muted rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            {newInviteCode ? (
              <div>
                <div className="bg-muted rounded-xl p-4 mb-4">
                  <div className="text-xs text-muted-foreground mb-2">
                    {t("inviteCode")}
                  </div>
                  <div className="flex items-center gap-3">
                    <code className="text-xl font-mono font-bold tracking-widest flex-1 text-blue-400">
                      {newInviteCode}
                    </code>
                    <button
                      type="button"
                      onClick={copyInvite}
                      className="p-2 hover:bg-background rounded-lg transition-colors"
                    >
                      {copiedInvite ? (
                        <Check size={16} className="text-green-500" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeInviteModal}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  {t("close")}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium mb-2">{t("maxUses")}</div>
                  <input
                    type="number"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    min="1"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">
                    {t("expiryDate")}
                  </div>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeInviteModal}
                    className="flex-1 border border-border py-3 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateInvite}
                    disabled={creatingInvite}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-semibold transition-colors"
                  >
                    {creatingInvite ? t("loading") : t("create")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </dialog>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: "from-blue-600/20 to-blue-600/5 border-blue-500/30 text-blue-400",
    green:
      "from-green-600/20 to-green-600/5 border-green-500/30 text-green-400",
    purple:
      "from-purple-600/20 to-purple-600/5 border-purple-500/30 text-purple-400",
    orange:
      "from-orange-600/20 to-orange-600/5 border-orange-500/30 text-orange-400",
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-5`}>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function StatusBadge({
  status,
  t,
}: { status: string; t: (k: string) => string }) {
  const map: Record<string, string> = {
    active: "bg-green-500/20 text-green-400",
    cancelled: "bg-red-500/20 text-red-400",
    expired: "bg-yellow-500/20 text-yellow-400",
    limit: "bg-gray-500/20 text-gray-400",
  };
  const labels: Record<string, string> = {
    active: "active",
    cancelled: "cancelled",
    expired: "expired",
    limit: "limitReached",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status]}`}
    >
      {t(labels[status])}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-16 text-muted-foreground">
      <div className="text-4xl mb-3">📭</div>
      <div>{text}</div>
    </div>
  );
}
