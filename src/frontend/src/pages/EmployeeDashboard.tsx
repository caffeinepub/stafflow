import {
  BarChart3,
  CalendarDays,
  Camera,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  LogOut,
  Moon,
  Paperclip,
  Pencil,
  Pin,
  Plus,
  QrCode,
  Sun,
  User,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Page, Session } from "../App";
import { LANGUAGES, type Lang } from "../i18n";
import { useQRScanner } from "../qr-code/useQRScanner";
import {
  type Announcement,
  type AttendanceRecord,
  type AttendanceScore,
  type Company,
  type CorrectionRequest,
  type Employee,
  type LeaveRequest,
  type ShiftSwap,
  type WorkSchedule,
  addCorrectionRequest,
  addLeaveRequest,
  addShiftSwap,
  endBreak,
  getActiveBreak,
  getAttendanceScore,
  getCompany,
  getCompanyAnnouncements,
  getEmployee,
  getEmployeeAttendance,
  getEmployeeCorrectionRequests,
  getEmployeeLeaveRequests,
  getEmployeeShiftSwaps,
  getLastAttendanceStatus,
  getLeaveBalance,
  getMonthlyAttendanceSummary,
  getRecordDuration,
  getSchedule,
  joinCompany,
  startBreak,
  toggleAttendance,
  updateEmployee,
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

type Tab =
  | "summary"
  | "companies"
  | "history"
  | "qr"
  | "corrections"
  | "leaverequests"
  | "schedule"
  | "shiftswap";

function formatDate(ts: number) {
  return new Date(ts).toLocaleString();
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
  const [tab, setTab] = useState<Tab>("companies");
  const [myShiftSwaps, setMyShiftSwaps] = useState<ShiftSwap[]>([]);
  const [swapDate, setSwapDate] = useState("");
  const [swapTargetCode, setSwapTargetCode] = useState("");
  const [swapNote, setSwapNote] = useState("");
  const [submittingSwap, setSubmittingSwap] = useState(false);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [checkinStatus, setCheckinStatus] = useState<
    Record<string, { isCheckedIn: boolean; lastTimestamp?: number }>
  >({});
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [allEmpAttendance, setAllEmpAttendance] = useState<AttendanceRecord[]>(
    [],
  );
  const [toggling, setToggling] = useState<string>("");

  const [showJoin, setShowJoin] = useState(false);
  const [inviteInput, setInviteInput] = useState("");
  const [joining, setJoining] = useState(false);

  const [showScanner, setShowScanner] = useState(false);
  const [scanForCompany, setScanForCompany] = useState("");
  const scanner = useQRScanner({ facingMode: "environment" });

  const [filterCompanyId, setFilterCompanyId] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  // Profile edit state
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Correction requests
  const [correctionRequests, setCorrectionRequests] = useState<
    CorrectionRequest[]
  >([]);
  const [showAddCorrection, setShowAddCorrection] = useState(false);
  const [corrCompanyId, setCorrCompanyId] = useState("");
  const [corrRequestType, setCorrRequestType] = useState<
    "checkin" | "checkout"
  >("checkin");
  const [corrDate, setCorrDate] = useState("");
  const [corrTime, setCorrTime] = useState("");
  const [corrReason, setCorrReason] = useState("");
  const [submittingCorr, setSubmittingCorr] = useState(false);

  // Break tracking state
  const [activeBreaks, setActiveBreaks] = useState<Record<string, boolean>>({});

  // Advance leave requests state
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [showAddLeaveReq, setShowAddLeaveReq] = useState(false);
  const [leaveReqCompanyId, setLeaveReqCompanyId] = useState("");
  const [leaveReqDate, setLeaveReqDate] = useState("");
  const [leaveReqType, setLeaveReqType] = useState<"leave" | "sick" | "excuse">(
    "leave",
  );
  const [leaveReqReason, setLeaveReqReason] = useState("");
  const [submittingLeaveReq, setSubmittingLeaveReq] = useState(false);

  // Document attachment state
  const [leaveDocBase64, setLeaveDocBase64] = useState("");
  const [leaveDocName, setLeaveDocName] = useState("");
  const [corrDocBase64, setCorrDocBase64] = useState("");
  const [corrDocName, setCorrDocName] = useState("");

  // Schedule view state
  const [scheduleYear, setScheduleYear] = useState(new Date().getFullYear());
  const [scheduleMonth, setScheduleMonth] = useState(new Date().getMonth());
  const [scheduleData, setScheduleData] = useState<WorkSchedule[]>([]);

  const loadEmployee = useCallback(() => {
    const emp = getEmployee(session.id);
    if (!emp) return;
    setEmployee(emp);
    const comps = emp.companyIds
      .map((id) => getCompany(id))
      .filter(Boolean) as Company[];
    setCompanies(comps);
    const statuses: Record<
      string,
      { isCheckedIn: boolean; lastTimestamp?: number }
    > = {};
    for (const cid of emp.companyIds) {
      statuses[cid] = getLastAttendanceStatus(session.id, cid);
    }
    setCheckinStatus(statuses);
    setAllEmpAttendance(getEmployeeAttendance(session.id));
    // Load correction requests for all companies
    // Load break status
    const breaks: Record<string, boolean> = {};
    for (const cid of emp.companyIds) {
      const ab = getActiveBreak(emp.id, cid);
      breaks[cid] = !!ab;
    }
    setActiveBreaks(breaks);

    // Load leave requests
    const allLeaveReqs: LeaveRequest[] = [];
    for (const cid of emp.companyIds) {
      const reqs = getEmployeeLeaveRequests(emp.id, cid);
      allLeaveReqs.push(...reqs);
    }
    setLeaveRequests(allLeaveReqs);

    const allCorr: CorrectionRequest[] = [];
    for (const cid of emp.companyIds) {
      allCorr.push(...getEmployeeCorrectionRequests(session.id, cid));
    }
    allCorr.sort((a, b) => b.createdAt - a.createdAt);
    setCorrectionRequests(allCorr);
  }, [session.id]);

  const loadAttendance = useCallback(() => {
    const from = filterFrom ? new Date(filterFrom).getTime() : undefined;
    const to = filterTo
      ? new Date(`${filterTo}T23:59:59`).getTime()
      : undefined;
    setAttendance(
      getEmployeeAttendance(session.id, filterCompanyId || undefined, from, to),
    );
  }, [session.id, filterCompanyId, filterFrom, filterTo]);

  useEffect(() => {
    loadEmployee();
  }, [loadEmployee]);

  useEffect(() => {
    if (tab === "schedule") {
      const newData: WorkSchedule[] = [];
      for (const c of companies) {
        newData.push(
          ...getSchedule(c.id, scheduleYear, scheduleMonth).filter(
            (s) => s.employeeId === session.id,
          ),
        );
      }
      setScheduleData(newData);
    }
  }, [tab, companies, scheduleYear, scheduleMonth, session.id]);
  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const scannedRef = useRef(false);
  useEffect(() => {
    if (scanner.qrResults.length > 0 && scanForCompany && !scannedRef.current) {
      scannedRef.current = true;
      scanner.stopScanning();
      setShowScanner(false);
      handleToggle(scanForCompany);
      setScanForCompany("");
    }
  });

  function handleToggle(companyId: string) {
    setToggling(companyId);
    const res = toggleAttendance(session.id, companyId);
    setToggling("");
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success(res.recordType === "checkin" ? t("checkIn") : t("checkOut"));
    loadEmployee();
    if (tab === "history") loadAttendance();
  }

  function handleJoinCompany() {
    if (!inviteInput.trim()) {
      toast.error(t("codeRequired"));
      return;
    }
    setJoining(true);
    const res = joinCompany(session.id, inviteInput);
    setJoining(false);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success(`${t("joinedCompany")}: ${res.companyName}`);
    setShowJoin(false);
    setInviteInput("");
    loadEmployee();
  }

  function openScanner(companyId: string) {
    scannedRef.current = false;
    setScanForCompany(companyId);
    setShowScanner(true);
    scanner.startScanning();
  }

  function closeScanner() {
    scanner.stopScanning();
    setShowScanner(false);
    setScanForCompany("");
  }

  function openEditProfile() {
    if (employee) {
      setEditName(employee.fullName);
      setEditPhone(employee.phone || "");
    }
    setShowEditProfile(true);
  }

  function handleSaveProfile() {
    if (!editName.trim()) {
      toast.error(t("nameRequired"));
      return;
    }
    setSavingProfile(true);
    const res = updateEmployee(session.id, editName, editPhone || undefined);
    setSavingProfile(false);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success(t("profileUpdated") || t("success"));
    setShowEditProfile(false);
    loadEmployee();
  }

  function handleSubmitCorrection() {
    if (!corrCompanyId || !corrDate || !corrTime || !corrReason.trim()) {
      toast.error(t("error"));
      return;
    }
    setSubmittingCorr(true);
    const res = addCorrectionRequest(
      corrCompanyId,
      session.id,
      corrRequestType,
      corrDate,
      corrTime,
      corrReason,
      corrDocBase64 || undefined,
      corrDocName || undefined,
    );
    setSubmittingCorr(false);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success(t("correctionSubmitted"));
    setShowAddCorrection(false);
    setCorrCompanyId("");
    setCorrRequestType("checkin");
    setCorrDate("");
    setCorrTime("");
    setCorrReason("");
    setCorrDocBase64("");
    setCorrDocName("");
    loadEmployee();
  }

  const pendingCount = correctionRequests.filter(
    (r) => r.status === "pending",
  ).length;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    {
      key: "summary",
      label: t("consolidatedView"),
      icon: <BarChart3 size={16} />,
    },
    { key: "companies", label: t("myCompanies"), icon: <User size={16} /> },
    {
      key: "history",
      label: t("attendanceHistory"),
      icon: <Clock size={16} />,
    },
    { key: "qr", label: t("myQRCode"), icon: <QrCode size={16} /> },
    {
      key: "corrections",
      label: t("correctionRequests"),
      icon: <ClipboardList size={16} />,
    },
    {
      key: "leaverequests",
      label: t("leaveRequests"),
      icon: <ClipboardList size={16} />,
    },
    {
      key: "schedule",
      label: t("scheduleTab"),
      icon: <CalendarDays size={16} />,
    },
    {
      key: "shiftswap",
      label: t("shiftSwap"),
      icon: <ClipboardList size={16} />,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center">
            <User size={16} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <div className="font-semibold text-sm">{session.name}</div>
              <button
                type="button"
                onClick={openEditProfile}
                className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
                title={t("editProfile")}
              >
                <Pencil size={12} />
              </button>
            </div>
            <div className="text-xs text-muted-foreground">
              {t("employeeLogin")}
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
            data-ocid={`${tb.key}.tab`}
            onClick={() => setTab(tb.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              tab === tb.key
                ? "text-green-400 border-b-2 border-green-500 bg-green-600/5"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tb.icon}
            {tb.label}
            {tb.key === "corrections" && pendingCount > 0 && (
              <span className="ml-1 bg-orange-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      <main className="flex-1 p-4 md:p-6 max-w-3xl mx-auto w-full">
        {tab === "summary" && (
          <div>
            <h2 className="text-xl font-bold mb-6">{t("consolidatedView")}</h2>
            {companies.length > 0 &&
              employee &&
              (() => {
                const sc: AttendanceScore = getAttendanceScore(
                  session.id,
                  companies[0].id,
                );
                const bgColor =
                  sc.score >= 80
                    ? "bg-green-500/10 border-green-500/30"
                    : sc.score >= 60
                      ? "bg-yellow-500/10 border-yellow-500/30"
                      : "bg-red-500/10 border-red-500/30";
                const barColor =
                  sc.score >= 80
                    ? "bg-green-500"
                    : sc.score >= 60
                      ? "bg-yellow-500"
                      : "bg-red-500";
                const textColor =
                  sc.score >= 80
                    ? "text-green-400"
                    : sc.score >= 60
                      ? "text-yellow-400"
                      : "text-red-400";
                return (
                  <div className={`border rounded-2xl p-5 mb-6 ${bgColor}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-semibold">
                        {t("performanceSummary")}
                      </div>
                      <div className={`text-3xl font-bold ${textColor}`}>
                        {sc.score}
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 mb-3">
                      <div
                        className={`h-2 rounded-full ${barColor}`}
                        style={{ width: `${sc.score}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
                      {t("scoreLast30")}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="bg-background/60 rounded-lg p-2 text-center">
                        <div className={`font-bold ${textColor}`}>
                          {sc.absences}
                        </div>
                        <div className="text-muted-foreground">
                          {t("scoreAbsences")}
                        </div>
                      </div>
                      <div className="bg-background/60 rounded-lg p-2 text-center">
                        <div className="font-bold text-orange-400">
                          {sc.lateCheckins}
                        </div>
                        <div className="text-muted-foreground">
                          {t("scoreLate")}
                        </div>
                      </div>
                      <div className="bg-background/60 rounded-lg p-2 text-center">
                        <div className="font-bold text-orange-400">
                          {sc.earlyCheckouts}
                        </div>
                        <div className="text-muted-foreground">
                          {t("scoreEarly")}
                        </div>
                      </div>
                      <div className="bg-background/60 rounded-lg p-2 text-center">
                        <div className="font-bold text-green-400">
                          {sc.fullDays}
                        </div>
                        <div className="text-muted-foreground">
                          {t("scoreFullDays")}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            {companies.length === 0 ? (
              <div
                data-ocid="summary.empty_state"
                className="text-center py-16 text-muted-foreground"
              >
                <div className="text-4xl mb-3">🏢</div>
                <div>{t("noCompanies")}</div>
              </div>
            ) : (
              <div className="space-y-4">
                {companies.map((company) => {
                  const status = checkinStatus[company.id];
                  const isCheckedIn = status?.isCheckedIn ?? false;
                  const now = new Date();
                  const summary = employee
                    ? getMonthlyAttendanceSummary(
                        company.id,
                        now.getFullYear(),
                        now.getMonth(),
                      )
                    : [];
                  const myRow = summary.find(
                    (r) => r.employee.id === session.id,
                  );
                  const balance = employee
                    ? getLeaveBalance(company.id, session.id)
                    : undefined;
                  return (
                    <div
                      key={company.id}
                      data-ocid="summary.card"
                      className="bg-card border border-border rounded-2xl p-5"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-semibold text-lg">
                          {company.name}
                        </div>
                        <div
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${isCheckedIn ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${isCheckedIn ? "bg-green-400 animate-pulse" : "bg-gray-400"}`}
                          />
                          {isCheckedIn ? t("checkedIn") : t("checkedOut")}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div className="bg-muted/40 rounded-xl p-3 text-center">
                          <div className="text-lg font-bold">
                            {myRow?.daysAttended ?? 0}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t("attendanceDays")}
                          </div>
                        </div>
                        <div className="bg-muted/40 rounded-xl p-3 text-center">
                          <div className="text-lg font-bold">
                            {myRow?.leaveDays ?? 0}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t("leaveTypeLeave")}
                          </div>
                        </div>
                        <div className="bg-muted/40 rounded-xl p-3 text-center">
                          <div className="text-lg font-bold">
                            {myRow
                              ? Math.round(myRow.totalWorkMinutes / 60)
                              : 0}
                            h
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t("thisMonth")}
                          </div>
                        </div>
                      </div>
                      {balance && (
                        <div className="text-sm text-muted-foreground">
                          {t("remainingDays")}:{" "}
                          <span className="font-semibold text-foreground">
                            {balance.annualDays - balance.usedDays}
                          </span>{" "}
                          {t("remainingDays").toLowerCase()} ({balance.usedDays}
                          /{balance.annualDays} {t("usedDays").toLowerCase()})
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "companies" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{t("myCompanies")}</h2>
              <button
                type="button"
                data-ocid="companies.open_modal_button"
                onClick={() => setShowJoin(true)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
              >
                <Plus size={16} />
                {t("joinCompany")}
              </button>
            </div>

            {companies.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-4">🏢</div>
                <p className="text-muted-foreground mb-4">{t("noCompanies")}</p>
                <button
                  type="button"
                  onClick={() => setShowJoin(true)}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
                >
                  {t("joinCompany")}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {companies.map((company) => {
                  const status = checkinStatus[company.id];
                  const isCheckedIn = status?.isCheckedIn ?? false;
                  return (
                    <div
                      key={company.id}
                      className="bg-card border border-border rounded-2xl p-6"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="font-semibold text-lg">
                            {company.name}
                          </div>
                          {status?.lastTimestamp && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {isCheckedIn ? t("checkedIn") : t("checkedOut")}:{" "}
                              {formatDate(status.lastTimestamp)}
                            </div>
                          )}
                        </div>
                        <div
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                            isCheckedIn
                              ? "bg-green-500/20 text-green-400"
                              : "bg-gray-500/20 text-gray-400"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isCheckedIn
                                ? "bg-green-400 animate-pulse"
                                : "bg-gray-400"
                            }`}
                          />
                          {isCheckedIn ? t("checkedIn") : t("checkedOut")}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          type="button"
                          data-ocid={"companies.primary_button"}
                          onClick={() => handleToggle(company.id)}
                          disabled={toggling === company.id}
                          className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${
                            isCheckedIn
                              ? "bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
                              : "bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30"
                          } disabled:opacity-50`}
                        >
                          {toggling === company.id
                            ? t("loading")
                            : isCheckedIn
                              ? t("checkOut")
                              : t("checkIn")}
                        </button>
                        <button
                          type="button"
                          onClick={() => openScanner(company.id)}
                          className="px-4 py-4 rounded-xl border border-border hover:bg-muted transition-colors"
                          title={t("scanQR")}
                        >
                          <Camera size={20} />
                        </button>
                      </div>
                      {isCheckedIn && (
                        <div className="mt-3 flex gap-3">
                          {activeBreaks[company.id] ? (
                            <button
                              type="button"
                              data-ocid="companies.secondary_button"
                              onClick={() => {
                                const res = endBreak(session.id, company.id);
                                if (res.ok) {
                                  toast.success(t("breakEnd"));
                                  loadEmployee();
                                } else toast.error(res.message);
                              }}
                              className="flex-1 py-2 rounded-xl text-sm font-medium bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 transition-all"
                            >
                              ☕ {t("breakEnd")} ({t("onBreak")})
                            </button>
                          ) : (
                            <button
                              type="button"
                              data-ocid="companies.secondary_button"
                              onClick={() => {
                                const res = startBreak(session.id, company.id);
                                if (res.ok) {
                                  toast.success(t("breakStart"));
                                  loadEmployee();
                                } else toast.error(res.message);
                              }}
                              className="flex-1 py-2 rounded-xl text-sm font-medium bg-muted hover:bg-muted/80 text-muted-foreground border border-border transition-all"
                            >
                              ☕ {t("breakStart")}
                            </button>
                          )}
                        </div>
                      )}
                      {/* Announcements */}
                      {(() => {
                        const anns = getCompanyAnnouncements(company.id).slice(
                          0,
                          3,
                        );
                        if (anns.length === 0) return null;
                        return (
                          <div className="mt-3 pt-3 border-t border-border space-y-2">
                            {anns.map((ann) => (
                              <div
                                key={ann.id}
                                className="flex items-start gap-2"
                              >
                                {ann.pinned && (
                                  <Pin
                                    size={12}
                                    className="text-blue-400 mt-0.5 flex-shrink-0"
                                  />
                                )}
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold truncate">
                                    {ann.title}
                                  </div>
                                  <div className="text-xs text-muted-foreground line-clamp-2">
                                    {ann.content}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "history" && (
          <div>
            <h2 className="text-xl font-bold mb-6">{t("attendanceHistory")}</h2>

            <div className="bg-card border border-border rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="block text-xs text-muted-foreground mb-1">
                  {t("from")}
                </div>
                <input
                  type="date"
                  value={filterFrom}
                  onChange={(e) => setFilterFrom(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <div className="block text-xs text-muted-foreground mb-1">
                  {t("to")}
                </div>
                <input
                  type="date"
                  value={filterTo}
                  onChange={(e) => setFilterTo(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <div className="block text-xs text-muted-foreground mb-1">
                  {t("selectCompany")}
                </div>
                <select
                  value={filterCompanyId}
                  onChange={(e) => setFilterCompanyId(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">{t("allEmployees")}</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {attendance.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="text-4xl mb-3">📋</div>
                <div>{t("noRecords")}</div>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                        {t("type")}
                      </th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                        {t("selectCompany")}
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
                      const dur = getRecordDuration(rec, allEmpAttendance);
                      return (
                        <tr
                          key={rec.id}
                          className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                        >
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
                            {getCompany(rec.companyId)?.name || "-"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatDate(rec.timestamp)}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                            {dur !== "-" ? (
                              <span className="bg-green-500/10 text-green-400 px-2 py-0.5 rounded">
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

        {tab === "qr" && employee && (
          <div>
            <h2 className="text-xl font-bold mb-6">{t("myQRCode")}</h2>
            <div className="bg-card border border-border rounded-2xl p-6 text-center">
              <QRCodeDisplay value={employee.loginCode} />
              <div className="mt-4">
                <code className="font-mono text-lg font-bold tracking-widest text-green-400">
                  {employee.loginCode}
                </code>
                <p className="text-muted-foreground text-sm mt-2">
                  {t("qrDesc")}
                </p>
              </div>
            </div>
          </div>
        )}

        {tab === "corrections" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{t("correctionRequests")}</h2>
              {companies.length > 0 && (
                <button
                  type="button"
                  data-ocid="corrections.open_modal_button"
                  onClick={() => setShowAddCorrection(true)}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                >
                  <Plus size={16} />
                  {t("addCorrectionRequest")}
                </button>
              )}
            </div>
            {correctionRequests.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="text-4xl mb-3">📋</div>
                <div>{t("noCorrectionRequests")}</div>
                {companies.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAddCorrection(true)}
                    className="mt-4 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
                  >
                    {t("addCorrectionRequest")}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {correctionRequests.map((req) => {
                  const comp = getCompany(req.companyId);
                  return (
                    <div
                      key={req.id}
                      className="bg-card border border-border rounded-xl p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {comp?.name || req.companyId}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                req.status === "pending"
                                  ? "bg-orange-500/20 text-orange-400"
                                  : req.status === "approved"
                                    ? "bg-green-500/20 text-green-400"
                                    : "bg-red-500/20 text-red-400"
                              }`}
                            >
                              {t(req.status)}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                              {req.requestType === "checkin"
                                ? t("checkinType")
                                : t("checkoutType")}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <span className="font-mono">
                              {req.requestedDate} {req.requestedTime}
                            </span>
                            {req.reason && (
                              <span className="ml-3 italic">{req.reason}</span>
                            )}
                          </div>
                          {req.rejectionNote && (
                            <div className="text-xs text-red-400 mt-1">
                              {t("rejectionNote")}: {req.rejectionNote}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground/60 mt-1">
                            {formatDate(req.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {tab === "leaverequests" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{t("leaveRequests")}</h2>
              <button
                type="button"
                data-ocid="leaverequests.open_modal_button"
                onClick={() => setShowAddLeaveReq(true)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
              >
                <Plus size={16} />
                {t("requestLeave")}
              </button>
            </div>
            {leaveRequests.length === 0 ? (
              <div
                data-ocid="leaverequests.empty_state"
                className="text-center py-16 text-muted-foreground"
              >
                <div className="text-4xl mb-3">📋</div>
                <div>{t("noRecords")}</div>
              </div>
            ) : (
              <div className="space-y-3">
                {leaveRequests.map((req, idx) => {
                  const comp = companies.find((c) => c.id === req.companyId);
                  return (
                    <div
                      key={req.id}
                      data-ocid={`leaverequests.item.${idx + 1}`}
                      className="bg-card border border-border rounded-xl p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {comp?.name || req.companyId}
                            </span>
                            {(() => {
                              const bal = getLeaveBalance(
                                req.companyId,
                                session.id,
                              );
                              if (!bal) return null;
                              const remaining = bal.annualDays - bal.usedDays;
                              return (
                                <span className="text-xs text-muted-foreground">
                                  ({remaining}{" "}
                                  {t("remainingDays").toLowerCase()})
                                </span>
                              );
                            })()}
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${req.status === "pending" ? "bg-orange-500/20 text-orange-400" : req.status === "approved" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
                            >
                              {t(req.status)}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                              {req.leaveType === "leave"
                                ? t("leaveTypeLeave")
                                : req.leaveType === "sick"
                                  ? t("leaveTypeSick")
                                  : t("leaveTypeExcuse")}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground font-mono">
                            {req.date}
                          </div>
                          {req.reason && (
                            <div className="text-xs text-muted-foreground mt-1 italic">
                              {req.reason}
                            </div>
                          )}
                          {req.rejectionNote && (
                            <div className="text-xs text-red-400 mt-1">
                              {t("rejectionNote")}: {req.rejectionNote}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {tab === "schedule" && (
        <EmployeeScheduleTab
          employeeId={session.id}
          companies={companies.map((c) => ({
            id: c.id,
            name: c.name,
            shifts: c.shifts,
          }))}
          year={scheduleYear}
          month={scheduleMonth}
          scheduleData={scheduleData}
          onYearChange={(y) => {
            setScheduleYear(y);
            const newData: WorkSchedule[] = [];
            for (const c of companies) {
              newData.push(
                ...getSchedule(c.id, y, scheduleMonth).filter(
                  (s) => s.employeeId === session.id,
                ),
              );
            }
            setScheduleData(newData);
          }}
          onMonthChange={(m) => {
            setScheduleMonth(m);
            const newData: WorkSchedule[] = [];
            for (const c of companies) {
              newData.push(
                ...getSchedule(c.id, scheduleYear, m).filter(
                  (s) => s.employeeId === session.id,
                ),
              );
            }
            setScheduleData(newData);
          }}
          t={t}
        />
      )}

      {tab === "shiftswap" && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">{t("shiftSwap")}</h2>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 mb-6">
            <div className="font-semibold mb-4">{t("shiftSwapRequest")}</div>
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium mb-1">
                  {t("selectCompany")}
                </div>
                <select
                  id="swap-company-select"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-ocid="shiftswap.select"
                >
                  <option value="">{t("selectCompany")}</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">{t("swapDate")}</div>
                <input
                  type="date"
                  data-ocid="shiftswap.input"
                  value={swapDate}
                  onChange={(e) => setSwapDate(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <div className="text-sm font-medium mb-1">
                  {t("targetPersonnelCode")}
                </div>
                <input
                  type="text"
                  value={swapTargetCode}
                  onChange={(e) => setSwapTargetCode(e.target.value)}
                  placeholder="Personel kodu..."
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-ocid="shiftswap.search_input"
                />
              </div>
              <div>
                <div className="text-sm font-medium mb-1">{t("swapNote")}</div>
                <input
                  type="text"
                  value={swapNote}
                  onChange={(e) => setSwapNote(e.target.value)}
                  placeholder={t("swapNote")}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-ocid="shiftswap.textarea"
                />
              </div>
              <button
                type="button"
                data-ocid="shiftswap.primary_button"
                disabled={submittingSwap}
                onClick={async () => {
                  const companyEl = document.getElementById(
                    "swap-company-select",
                  ) as HTMLSelectElement;
                  const companyId = companyEl?.value;
                  if (!companyId || !swapDate || !swapTargetCode.trim()) {
                    toast.error(t("required"));
                    return;
                  }
                  const { loginEmployee: loginEmp } = await import("../store");
                  const targetResult = loginEmp(swapTargetCode.trim());
                  if (!targetResult.employee) {
                    toast.error(t("invalidCode"));
                    return;
                  }
                  const targetEmp = targetResult.employee;
                  setSubmittingSwap(true);
                  const myShift = employee?.assignedShifts?.[companyId] || "";
                  const targetShift =
                    targetEmp.assignedShifts?.[companyId] || "";
                  const res = addShiftSwap({
                    companyId,
                    requesterId: session.id,
                    requesterName: employee?.fullName || "",
                    requesterShiftId: myShift,
                    targetId: targetEmp.id,
                    targetName: targetEmp.fullName,
                    targetShiftId: targetShift,
                    date: swapDate,
                    note: swapNote,
                  });
                  if (res.ok) {
                    toast.success(t("swapCreated"));
                    setSwapDate("");
                    setSwapTargetCode("");
                    setSwapNote("");
                    setMyShiftSwaps(getEmployeeShiftSwaps(session.id));
                  }
                  setSubmittingSwap(false);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {submittingSwap ? t("loading") : t("requestSwap")}
              </button>
            </div>
          </div>
          <div className="font-semibold mb-3">{t("swapRequests")}</div>
          {myShiftSwaps.length === 0 ? (
            <div
              data-ocid="shiftswap.empty_state"
              className="text-center py-12 text-muted-foreground"
            >
              <div className="text-3xl mb-2">🔄</div>
              <div>{t("noRecords")}</div>
            </div>
          ) : (
            <div className="space-y-3">
              {myShiftSwaps.map((swap, idx) => (
                <div
                  key={swap.id}
                  data-ocid={`shiftswap.item.${idx + 1}`}
                  className="bg-card border border-border rounded-xl p-4"
                >
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-medium text-sm">
                      {swap.requesterId === session.id
                        ? `${t("swapWith")}: ${swap.targetName}`
                        : swap.requesterName}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${swap.status === "pending" ? "bg-orange-500/20 text-orange-400" : swap.status === "approved" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
                    >
                      {t(
                        swap.status === "pending"
                          ? "swapPending"
                          : swap.status === "approved"
                            ? "swapApproved"
                            : "swapRejected",
                      )}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground font-mono">
                    {swap.date}
                  </div>
                  {swap.note && (
                    <div className="text-xs text-muted-foreground mt-1 italic">
                      {swap.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showAddLeaveReq && (
        <dialog
          open
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50 m-0 max-w-none w-full h-full border-0"
        >
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: modal backdrop */}
          <div
            className="fixed inset-0"
            onClick={() => setShowAddLeaveReq(false)}
          />
          <div
            data-ocid="leaverequests.dialog"
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl relative z-10"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">{t("requestLeave")}</h3>
              <button
                type="button"
                onClick={() => setShowAddLeaveReq(false)}
                className="p-1 hover:bg-muted rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-2">
                  {t("selectCompany")}
                </div>
                <select
                  value={leaveReqCompanyId}
                  onChange={(e) => setLeaveReqCompanyId(e.target.value)}
                  data-ocid="leaverequests.select"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">{t("selectCompany")}</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-sm font-medium mb-2">
                  {t("leaveRequestDate")}
                </div>
                <input
                  type="date"
                  value={leaveReqDate}
                  onChange={(e) => setLeaveReqDate(e.target.value)}
                  data-ocid="leaverequests.input"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <div className="text-sm font-medium mb-2">{t("leaveType")}</div>
                <select
                  value={leaveReqType}
                  onChange={(e) =>
                    setLeaveReqType(
                      e.target.value as "leave" | "sick" | "excuse",
                    )
                  }
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="leave">{t("leaveTypeLeave")}</option>
                  <option value="sick">{t("leaveTypeSick")}</option>
                  <option value="excuse">{t("leaveTypeExcuse")}</option>
                </select>
              </div>
              <div>
                <div className="text-sm font-medium mb-2">
                  {t("leaveReason")}
                </div>
                <textarea
                  value={leaveReqReason}
                  onChange={(e) => setLeaveReqReason(e.target.value)}
                  data-ocid="leaverequests.textarea"
                  rows={3}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
              </div>
              <div>
                <div className="text-sm font-medium mb-2">
                  {t("attachDocument")}
                </div>
                <label className="flex items-center gap-2 cursor-pointer bg-background border border-border rounded-xl px-4 py-2 text-sm hover:bg-muted transition-colors">
                  <Paperclip size={16} className="text-muted-foreground" />
                  {leaveDocName ? (
                    <span className="text-green-400 text-xs truncate max-w-[200px]">
                      {leaveDocName}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      {t("attachDocument")}
                    </span>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        setLeaveDocBase64(ev.target?.result as string);
                        setLeaveDocName(file.name);
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
                {leaveDocName && (
                  <button
                    type="button"
                    onClick={() => {
                      setLeaveDocBase64("");
                      setLeaveDocName("");
                    }}
                    className="text-xs text-red-400 mt-1"
                  >
                    {t("clear")}
                  </button>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddLeaveReq(false)}
                  data-ocid="leaverequests.cancel_button"
                  className="flex-1 border border-border py-3 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  data-ocid="leaverequests.submit_button"
                  disabled={submittingLeaveReq}
                  onClick={() => {
                    if (
                      !leaveReqCompanyId ||
                      !leaveReqDate ||
                      !leaveReqReason.trim()
                    ) {
                      toast.error(t("error"));
                      return;
                    }
                    setSubmittingLeaveReq(true);
                    const res = addLeaveRequest(
                      leaveReqCompanyId,
                      session.id,
                      leaveReqDate,
                      leaveReqType,
                      leaveReqReason,
                      leaveDocBase64 || undefined,
                      leaveDocName || undefined,
                    );
                    setSubmittingLeaveReq(false);
                    if (!res.ok) {
                      toast.error(res.message);
                      return;
                    }
                    toast.success(t("correctionSubmitted"));
                    setShowAddLeaveReq(false);
                    setLeaveReqCompanyId("");
                    setLeaveReqDate("");
                    setLeaveReqReason("");
                    setLeaveDocBase64("");
                    setLeaveDocName("");
                    loadEmployee();
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-semibold transition-colors"
                >
                  {submittingLeaveReq ? t("loading") : t("requestLeave")}
                </button>
              </div>
            </div>
          </div>
        </dialog>
      )}

      {showJoin && (
        <dialog
          open
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50 m-0 max-w-none w-full h-full border-0"
        >
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">{t("joinCompany")}</h3>
              <button
                type="button"
                onClick={() => setShowJoin(false)}
                className="p-1 hover:bg-muted rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <div className="block text-sm font-medium mb-2">
                  {t("inviteCode")}
                </div>
                <input
                  type="text"
                  value={inviteInput}
                  onChange={(e) => setInviteInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleJoinCompany()}
                  placeholder={t("enterInviteCode")}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowJoin(false)}
                  className="flex-1 border border-border py-3 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleJoinCompany}
                  disabled={joining}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-semibold transition-colors"
                >
                  {joining ? t("loading") : t("join")}
                </button>
              </div>
            </div>
          </div>
        </dialog>
      )}

      {showEditProfile && (
        <dialog
          open
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50 m-0 max-w-none w-full h-full border-0"
        >
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: modal backdrop */}
          <div
            className="fixed inset-0"
            onClick={() => setShowEditProfile(false)}
          />
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">{t("editProfile")}</h3>
              <button
                type="button"
                onClick={() => setShowEditProfile(false)}
                className="p-1 hover:bg-muted rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-2">{t("fullName")}</div>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <div className="text-sm font-medium mb-2">{t("phone")}</div>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditProfile(false)}
                  className="flex-1 border border-border py-3 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-semibold transition-colors"
                >
                  {savingProfile ? t("loading") : t("save")}
                </button>
              </div>
            </div>
          </div>
        </dialog>
      )}

      {showAddCorrection && (
        <dialog
          open
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50 m-0 max-w-none w-full h-full border-0"
        >
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: modal backdrop */}
          <div
            className="fixed inset-0"
            onClick={() => setShowAddCorrection(false)}
          />
          <div
            data-ocid="corrections.dialog"
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl relative z-10"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">{t("addCorrectionRequest")}</h3>
              <button
                type="button"
                onClick={() => setShowAddCorrection(false)}
                className="p-1 hover:bg-muted rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-2">
                  {t("selectCompany")}
                </div>
                <select
                  value={corrCompanyId}
                  onChange={(e) => setCorrCompanyId(e.target.value)}
                  data-ocid="corrections.select"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">{t("selectCompany")}</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-sm font-medium mb-2">
                  {t("requestType")}
                </div>
                <select
                  value={corrRequestType}
                  onChange={(e) =>
                    setCorrRequestType(e.target.value as "checkin" | "checkout")
                  }
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="checkin">{t("checkinType")}</option>
                  <option value="checkout">{t("checkoutType")}</option>
                </select>
              </div>
              <div>
                <div className="text-sm font-medium mb-2">
                  {t("requestedDate")}
                </div>
                <input
                  type="date"
                  value={corrDate}
                  onChange={(e) => setCorrDate(e.target.value)}
                  data-ocid="corrections.input"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <div className="text-sm font-medium mb-2">
                  {t("requestedTime")}
                </div>
                <input
                  type="time"
                  value={corrTime}
                  onChange={(e) => setCorrTime(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <div className="text-sm font-medium mb-2">{t("reason")}</div>
                <textarea
                  value={corrReason}
                  onChange={(e) => setCorrReason(e.target.value)}
                  data-ocid="corrections.textarea"
                  rows={3}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  placeholder={t("reason")}
                />
              </div>
              <div>
                <div className="text-sm font-medium mb-2">
                  {t("attachDocument")}
                </div>
                <label className="flex items-center gap-2 cursor-pointer bg-background border border-border rounded-xl px-4 py-2 text-sm hover:bg-muted transition-colors">
                  <Paperclip size={16} className="text-muted-foreground" />
                  {corrDocName ? (
                    <span className="text-green-400 text-xs truncate max-w-[200px]">
                      {corrDocName}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      {t("attachDocument")}
                    </span>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        setCorrDocBase64(ev.target?.result as string);
                        setCorrDocName(file.name);
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
                {corrDocName && (
                  <button
                    type="button"
                    onClick={() => {
                      setCorrDocBase64("");
                      setCorrDocName("");
                    }}
                    className="text-xs text-red-400 mt-1"
                  >
                    {t("clear")}
                  </button>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCorrection(false)}
                  className="flex-1 border border-border py-3 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  data-ocid="corrections.submit_button"
                  onClick={handleSubmitCorrection}
                  disabled={submittingCorr}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-semibold transition-colors"
                >
                  {submittingCorr ? t("loading") : t("create")}
                </button>
              </div>
            </div>
          </div>
        </dialog>
      )}

      {showScanner && (
        <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-50">
          <div className="text-white text-center mb-4">
            <h3 className="text-lg font-bold">{t("scanQR")}</h3>
          </div>
          <div className="relative w-full max-w-sm">
            {/* biome-ignore lint/a11y/useMediaCaption: QR scanner preview */}
            <video
              ref={scanner.videoRef}
              autoPlay
              playsInline
              className="w-full rounded-xl"
            />
            <canvas ref={scanner.canvasRef} className="hidden" />
            <div className="absolute inset-0 border-2 border-green-400 rounded-xl pointer-events-none" />
          </div>
          <button
            type="button"
            onClick={closeScanner}
            className="mt-6 bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl transition-colors"
          >
            {t("close")}
          </button>
        </div>
      )}
    </div>
  );
}

function EmployeeScheduleTab({
  employeeId,
  companies,
  year,
  month,
  scheduleData,
  onYearChange,
  onMonthChange,
  t,
}: {
  employeeId: string;
  companies: {
    id: string;
    name: string;
    shifts?: import("../store").Shift[];
  }[];
  year: number;
  month: number;
  scheduleData: WorkSchedule[];
  onYearChange: (y: number) => void;
  onMonthChange: (m: number) => void;
  t: (k: string) => string;
}) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const monthName = new Date(year, month, 1).toLocaleString("default", {
    month: "long",
  });

  const getEntry = (day: number) =>
    scheduleData.find((s) => s.day === day && s.employeeId === employeeId);

  const getShiftName = (shiftId: string, companyId: string) => {
    if (shiftId === "off") return t("dayOff");
    if (shiftId === "unassigned") return "-";
    const comp = companies.find((c) => c.id === companyId);
    const shift = comp?.shifts?.find((s) => s.id === shiftId);
    return shift
      ? `${shift.name} (${shift.startTime}-${shift.endTime})`
      : shiftId;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">{t("workSchedule")}</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const d = new Date(year, month - 1);
              onYearChange(d.getFullYear());
              onMonthChange(d.getMonth());
            }}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium w-32 text-center">
            {monthName} {year}
          </span>
          <button
            type="button"
            onClick={() => {
              const d = new Date(year, month + 1);
              onYearChange(d.getFullYear());
              onMonthChange(d.getMonth());
            }}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {["Pz", "Pt", "Sa", "Ça", "Pe", "Cu", "Ct"].map((d) => (
          <div
            key={d}
            className="text-center text-xs text-muted-foreground py-1 font-medium"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayOfWeek }, (_, i) => (
          <div key={`empty-start-${i + 1}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const entry = getEntry(day);
          const isToday =
            new Date().getDate() === day &&
            new Date().getMonth() === month &&
            new Date().getFullYear() === year;
          return (
            <div
              key={day}
              className={`rounded-lg p-2 min-h-[60px] border text-xs ${
                isToday
                  ? "border-blue-500 bg-blue-500/10"
                  : entry
                    ? "border-green-500/30 bg-green-500/5"
                    : "border-border bg-card"
              }`}
            >
              <div
                className={`font-semibold mb-1 ${isToday ? "text-blue-400" : "text-foreground"}`}
              >
                {day}
              </div>
              {entry && (
                <div className="text-muted-foreground text-[10px] leading-tight">
                  {getShiftName(entry.shiftId, entry.companyId)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QRCodeDisplay({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js";
    const renderQR = () => {
      if (
        (window as { QRCode?: { toCanvas: (...a: unknown[]) => void } }).QRCode
      ) {
        (
          window as { QRCode?: { toCanvas: (...a: unknown[]) => void } }
        ).QRCode!.toCanvas(canvas, value, {
          width: 200,
          margin: 2,
          color: { dark: "#000000", light: "#ffffff" },
        });
      }
    };
    if (!(window as { QRCode?: unknown }).QRCode) {
      script.onload = renderQR;
      document.head.appendChild(script);
    } else {
      renderQR();
    }
  }, [value]);

  return (
    <div className="flex items-center justify-center">
      <div className="bg-white p-3 rounded-xl inline-block shadow-lg">
        <canvas ref={canvasRef} style={{ display: "block" }} />
      </div>
    </div>
  );
}
