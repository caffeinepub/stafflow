import {
  Bell,
  Check,
  ChevronDown,
  ClipboardList,
  Copy,
  Edit2,
  FileText,
  Loader2,
  LogOut,
  Megaphone,
  Monitor,
  Moon,
  Plus,
  Sun,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Page, Session } from "../App";
import type { Personnel } from "../backend.d";
import { useActor } from "../hooks/useActor";
import {
  useAddPersonnel,
  useAnnouncementsByCompany,
  useAssignShift,
  useAttendanceByCompany,
  useAttendanceScore,
  useAuditLog,
  useCompanyById,
  useCorrectionsByCompany,
  useCreateAnnouncement,
  useCreateDefaultLeaveTypes,
  useCreateLeaveType,
  useCreateShift,
  useDeleteAnnouncement,
  useLeaveRequestsByCompany,
  useLeaveTypes,
  usePayrollSummary,
  usePersonnelList,
  useReviewCorrection,
  useReviewLeaveRequest,
  useShiftsByCompany,
  useUpdatePersonnel,
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

type Tab =
  | "dashboard"
  | "personnel"
  | "attendance"
  | "shifts"
  | "leaves"
  | "corrections"
  | "rapor"
  | "duyurular"
  | "denetim"
  | "kiosk"
  | "settings";

function formatDuration(checkIn: bigint, checkOut: bigint): string {
  const ms = Number(checkOut - checkIn) / 1_000_000;
  if (ms <= 0) return "-";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}s ${m}d`;
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: {
      label: "Bekliyor",
      cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    approved: {
      label: "Onaylandı",
      cls: "bg-green-500/10 text-green-600 dark:text-green-400",
    },
    rejected: {
      label: "Reddedildi",
      cls: "bg-red-500/10 text-red-600 dark:text-red-400",
    },
  };
  const info = map[status] ?? {
    label: status,
    cls: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${info.cls}`}
    >
      {info.label}
    </span>
  );
}

function AttendanceScoreBadge({
  personnelId,
  companyId,
}: {
  personnelId: string;
  companyId: string;
}) {
  const { data: scoreBig } = useAttendanceScore(personnelId, companyId);
  const score = Number(scoreBig ?? 0n);
  const cls =
    score >= 80
      ? "bg-green-500/10 text-green-600 dark:text-green-400"
      : score >= 60
        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        : "bg-red-500/10 text-red-600 dark:text-red-400";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cls}`}>
      {score}
    </span>
  );
}

export default function CompanyDashboard({
  lang,
  setLang,
  dark,
  setDark,
  t,
  session,
  onLogout,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [showAddPersonnel, setShowAddPersonnel] = useState(false);
  const [editPersonnel, setEditPersonnel] = useState<Personnel | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterPersonnel, setFilterPersonnel] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);

  // New personnel form
  const [newName, setNewName] = useState("");
  const [newDept, setNewDept] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);

  // Edit personnel form
  const [editName, setEditName] = useState("");
  const [editDept, setEditDept] = useState("");
  const [editActive, setEditActive] = useState(true);

  // Shift assign
  const [assignShiftPersonnelId, setAssignShiftPersonnelId] = useState<
    string | null
  >(null);
  const [assignShiftId, setAssignShiftId] = useState("");

  // Add shift modal
  const [showAddShift, setShowAddShift] = useState(false);
  const [shiftName, setShiftName] = useState("");
  const [shiftStart, setShiftStart] = useState("09:00");
  const [shiftEnd, setShiftEnd] = useState("18:00");
  const [shiftDays, setShiftDays] = useState<string[]>([
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
  ]);

  // Add leave type modal
  const [showAddLeaveType, setShowAddLeaveType] = useState(false);
  const [ltName, setLtName] = useState("");
  const [ltQuota, setLtQuota] = useState("15");

  // Leave filter
  const [leaveFilter, setLeaveFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");

  // Review modal state
  const [reviewModal, setReviewModal] = useState<{
    type: "leave" | "correction";
    id: string;
    action: "approved" | "rejected";
  } | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const companyId = session.id;
  const { actor } = useActor();

  // Payroll state
  const now = new Date();
  const [payrollMonth, setPayrollMonth] = useState(now.getMonth() + 1);
  const [payrollYear, setPayrollYear] = useState(now.getFullYear());

  // Announcement form
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");

  // Kiosk state
  const [kioskCode, setKioskCode] = useState("");
  const [kioskMsg, setKioskMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [kioskLoading, setKioskLoading] = useState(false);

  const { data: company, isLoading: companyLoading } =
    useCompanyById(companyId);
  const { data: personnel = [], isLoading: personnelLoading } =
    usePersonnelList(companyId);
  const { data: attendance = [], isLoading: attendanceLoading } =
    useAttendanceByCompany(companyId);
  const { data: shifts = [] } = useShiftsByCompany(companyId);
  const { data: leaveTypes = [] } = useLeaveTypes(companyId);
  const { data: leaveRequests = [] } = useLeaveRequestsByCompany(companyId);
  const { data: corrections = [] } = useCorrectionsByCompany(companyId);

  const addMutation = useAddPersonnel(companyId);
  const updateMutation = useUpdatePersonnel(companyId);
  const createShiftMutation = useCreateShift(companyId);
  const assignShiftMutation = useAssignShift(companyId);
  const createLeavTypeMutation = useCreateLeaveType(companyId);
  const createDefaultLeaveTypesMutation = useCreateDefaultLeaveTypes(companyId);
  const reviewLeaveMutation = useReviewLeaveRequest(companyId);
  const reviewCorrectionMutation = useReviewCorrection(companyId);

  // New feature queries
  const { data: announcements = [], isLoading: announcementsLoading } =
    useAnnouncementsByCompany(companyId);
  const { data: auditLogs = [], isLoading: auditLoading } =
    useAuditLog(companyId);
  const { data: payrollData = [], isLoading: payrollLoading } =
    usePayrollSummary(companyId, payrollMonth, payrollYear);
  const createAnnouncementMutation = useCreateAnnouncement(companyId);
  const deleteAnnouncementMutation = useDeleteAnnouncement(companyId);

  // Stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  const todayCheckins = useMemo(() => {
    return attendance.filter((a) => {
      const d = new Date(Number(a.checkIn) / 1_000_000);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === todayMs;
    });
  }, [attendance, todayMs]);

  const currentlyIn = useMemo(() => {
    return todayCheckins.filter((a) => !a.hasCheckedOut);
  }, [todayCheckins]);

  const personnelMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of personnel) m[p.id] = p.name;
    return m;
  }, [personnel]);

  const leaveTypeMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const lt of leaveTypes) m[lt.id] = lt.name;
    return m;
  }, [leaveTypes]);

  const shiftMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of shifts) m[s.id] = s.name;
    return m;
  }, [shifts]);

  // Department breakdown
  const deptBreakdown = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of personnel) {
      if (!p.isActive) continue;
      const dept = p.department || "Departmansız";
      m[dept] = (m[dept] ?? 0) + 1;
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [personnel]);

  // This month work hours
  const thisMonthHours = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    let totalMs = 0;
    for (const a of attendance) {
      if (!a.hasCheckedOut) continue;
      const d = Number(a.checkIn) / 1_000_000;
      if (d >= monthStart) {
        totalMs += (Number(a.checkOut) - Number(a.checkIn)) / 1_000_000;
      }
    }
    const h = Math.floor(totalMs / 3_600_000);
    return h;
  }, [attendance]);

  // Filtered attendance
  const filteredAttendance = useMemo(() => {
    return attendance.filter((a) => {
      const d = new Date(Number(a.checkIn) / 1_000_000);
      if (dateFrom && d < new Date(dateFrom)) return false;
      if (dateTo && d > new Date(`${dateTo}T23:59:59`)) return false;
      if (filterPersonnel && a.personnelId !== filterPersonnel) return false;
      return true;
    });
  }, [attendance, dateFrom, dateTo, filterPersonnel]);

  const filteredLeaveRequests = useMemo(() => {
    if (leaveFilter === "all") return leaveRequests;
    return leaveRequests.filter((r) => r.status === leaveFilter);
  }, [leaveRequests, leaveFilter]);

  const pendingLeavesCount = leaveRequests.filter(
    (r) => r.status === "pending",
  ).length;
  const pendingCorrectionsCount = corrections.filter(
    (r) => r.status === "pending",
  ).length;

  async function handleAddPersonnel() {
    if (!newName.trim()) {
      toast.error(t("nameRequired"));
      return;
    }
    try {
      const p = await addMutation.mutateAsync({
        name: newName.trim(),
        department: newDept.trim(),
        isAdmin: newIsAdmin,
      });
      toast.success(`${p.name} eklendi`);
      setShowAddPersonnel(false);
      setNewName("");
      setNewDept("");
      setNewIsAdmin(false);
    } catch {
      toast.error(t("error"));
    }
  }

  function openEdit(p: Personnel) {
    setEditPersonnel(p);
    setEditName(p.name);
    setEditDept(p.department);
    setEditActive(p.isActive);
  }

  async function handleUpdatePersonnel() {
    if (!editPersonnel) return;
    if (!editName.trim()) {
      toast.error(t("nameRequired"));
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id: editPersonnel.id,
        name: editName.trim(),
        department: editDept.trim(),
        isActive: editActive,
      });
      toast.success(t("success"));
      setEditPersonnel(null);
    } catch {
      toast.error(t("error"));
    }
  }

  async function handleCreateShift() {
    if (!shiftName.trim()) {
      toast.error("Vardiya adı gerekli");
      return;
    }
    try {
      await createShiftMutation.mutateAsync({
        name: shiftName.trim(),
        startTime: shiftStart,
        endTime: shiftEnd,
        workDays: shiftDays.join(","),
      });
      toast.success("Vardiya oluşturuldu");
      setShowAddShift(false);
      setShiftName("");
      setShiftStart("09:00");
      setShiftEnd("18:00");
      setShiftDays(["Mon", "Tue", "Wed", "Thu", "Fri"]);
    } catch {
      toast.error(t("error"));
    }
  }

  async function handleAssignShift() {
    if (!assignShiftPersonnelId || !assignShiftId) return;
    try {
      await assignShiftMutation.mutateAsync({
        personnelId: assignShiftPersonnelId,
        shiftId: assignShiftId,
      });
      toast.success("Vardiya atandı");
      setAssignShiftPersonnelId(null);
      setAssignShiftId("");
    } catch {
      toast.error(t("error"));
    }
  }

  async function handleCreateLeaveType() {
    if (!ltName.trim()) {
      toast.error("İzin türü adı gerekli");
      return;
    }
    try {
      await createLeavTypeMutation.mutateAsync({
        name: ltName.trim(),
        annualQuota: Number(ltQuota),
      });
      toast.success("İzin türü oluşturuldu");
      setShowAddLeaveType(false);
      setLtName("");
      setLtQuota("15");
    } catch {
      toast.error(t("error"));
    }
  }

  async function handleReview() {
    if (!reviewModal) return;
    try {
      if (reviewModal.type === "leave") {
        await reviewLeaveMutation.mutateAsync({
          requestId: reviewModal.id,
          status: reviewModal.action,
          reviewerNote: reviewNote.trim() || null,
        });
        toast.success(
          reviewModal.action === "approved"
            ? "İzin onaylandı"
            : "İzin reddedildi",
        );
      } else {
        await reviewCorrectionMutation.mutateAsync({
          requestId: reviewModal.id,
          status: reviewModal.action,
          reviewerNote: reviewNote.trim() || null,
        });
        toast.success(
          reviewModal.action === "approved"
            ? "Düzeltme onaylandı"
            : "Düzeltme reddedildi",
        );
      }
      setReviewModal(null);
      setReviewNote("");
    } catch {
      toast.error(t("error"));
    }
  }

  function copyCompanyCode() {
    if (company?.entryCode) {
      navigator.clipboard.writeText(company.entryCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  }

  const dayLabels: Record<string, string> = {
    Mon: "Pzt",
    Tue: "Sal",
    Wed: "Çar",
    Thu: "Per",
    Fri: "Cum",
    Sat: "Cmt",
    Sun: "Paz",
  };
  const allDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const tabLabels: Record<Tab, string> = {
    dashboard: "Genel Bakış",
    personnel: "Personeller",
    attendance: "Devam",
    shifts: "Vardiyalar",
    leaves: `İzinler${pendingLeavesCount > 0 ? ` (${pendingLeavesCount})` : ""}`,
    corrections: `Düzeltmeler${pendingCorrectionsCount > 0 ? ` (${pendingCorrectionsCount})` : ""}`,
    rapor: "Bordro Raporu",
    duyurular: "Duyurular",
    denetim: "Denetim Kaydı",
    kiosk: "Kiosk",
    settings: "Ayarlar",
  };

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
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">{t("logout")}</span>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-card border-b border-border">
        <div className="flex overflow-x-auto">
          {(Object.keys(tabLabels) as Tab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full">
        {/* ===== DASHBOARD TAB ===== */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="text-2xl font-bold text-primary">
                  {attendanceLoading ? "..." : todayCheckins.length}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Bugün Giriş
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="text-2xl font-bold text-primary">
                  {personnelLoading
                    ? "..."
                    : personnel.filter((p) => p.isActive).length}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Aktif Personel
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="text-2xl font-bold text-primary">
                  {attendanceLoading ? "..." : currentlyIn.length}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Şu An İçeride
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="text-2xl font-bold text-primary">
                  {thisMonthHours}s
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Bu Ay Toplam
                </div>
              </div>
            </div>

            {/* Currently Checked In */}
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Users size={16} className="text-primary" />
                Şu An İçeride
              </h3>
              {attendanceLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm py-4 justify-center">
                  <Loader2 size={16} className="animate-spin" /> Yükleniyor
                </div>
              ) : currentlyIn.length === 0 ? (
                <div className="text-muted-foreground text-sm text-center py-4">
                  Şu an içeride kimse yok
                </div>
              ) : (
                <div className="space-y-2">
                  {currentlyIn.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    >
                      <span className="font-medium text-sm">
                        {personnelMap[record.personnelId] || record.personnelId}
                      </span>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        Giriş: {formatTime(record.checkIn)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Department breakdown */}
            {deptBreakdown.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="font-semibold mb-3">Departman Dağılımı</h3>
                <div className="space-y-2">
                  {deptBreakdown.map(([dept, count]) => (
                    <div key={dept} className="flex items-center gap-3">
                      <span className="text-sm flex-1">{dept}</span>
                      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{
                            width: `${
                              (count /
                                Math.max(
                                  1,
                                  personnel.filter((p) => p.isActive).length,
                                )) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-muted-foreground w-6 text-right">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== PERSONNEL TAB ===== */}
        {activeTab === "personnel" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Personeller</h2>
              <button
                type="button"
                onClick={() => setShowAddPersonnel(true)}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                <Plus size={16} />
                Personel Ekle
              </button>
            </div>

            {personnelLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground justify-center py-8">
                <Loader2 size={20} className="animate-spin" /> {t("loading")}
              </div>
            ) : personnel.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
                Henüz personel yok.
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          Ad Soyad
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">
                          Departman
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                          Rol
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          Kod
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">
                          Vardiya
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          Durum
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                          Puan
                        </th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {personnel.map((p) => (
                        <tr
                          key={p.id}
                          className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium">{p.name}</td>
                          <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                            {p.department || "-"}
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                p.isAdmin
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {p.isAdmin ? "Admin" : "Personel"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                              {p.entryCode}
                            </code>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            {assignShiftPersonnelId === p.id ? (
                              <div className="flex items-center gap-2">
                                <select
                                  value={assignShiftId}
                                  onChange={(e) =>
                                    setAssignShiftId(e.target.value)
                                  }
                                  className="bg-background border border-border rounded px-2 py-1 text-xs focus:outline-none"
                                >
                                  <option value="">Seç...</option>
                                  {shifts.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.name}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={handleAssignShift}
                                  disabled={!assignShiftId}
                                  className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded disabled:opacity-50"
                                >
                                  Ata
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAssignShiftPersonnelId(null);
                                    setAssignShiftId("");
                                  }}
                                  className="text-xs text-muted-foreground"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setAssignShiftPersonnelId(p.id);
                                  setAssignShiftId(p.shiftId ?? "");
                                }}
                                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                              >
                                {p.shiftId ? (shiftMap[p.shiftId] ?? "-") : "-"}
                                <ChevronDown size={10} />
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                p.isActive
                                  ? "bg-green-500/10 text-green-600 dark:text-green-400"
                                  : "bg-red-500/10 text-red-600 dark:text-red-400"
                              }`}
                            >
                              {p.isActive ? "Aktif" : "Pasif"}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <AttendanceScoreBadge
                              personnelId={p.id}
                              companyId={companyId}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => openEdit(p)}
                              className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Add Personnel Modal */}
            {showAddPersonnel && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">Personel Ekle</h3>
                    <button
                      type="button"
                      onClick={() => setShowAddPersonnel(false)}
                      className="p-1 hover:bg-muted rounded-lg"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="block text-sm font-medium mb-1.5">
                        Ad Soyad *
                      </div>
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <div className="block text-sm font-medium mb-1.5">
                        Departman
                      </div>
                      <input
                        type="text"
                        value={newDept}
                        onChange={(e) => setNewDept(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="new-is-admin"
                        checked={newIsAdmin}
                        onChange={(e) => setNewIsAdmin(e.target.checked)}
                        className="w-4 h-4 accent-primary"
                      />
                      <label
                        htmlFor="new-is-admin"
                        className="text-sm font-medium"
                      >
                        Yönetici yetkisi ver
                      </label>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddPersonnel(false)}
                        className="flex-1 border border-border py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                      >
                        {t("cancel")}
                      </button>
                      <button
                        type="button"
                        onClick={handleAddPersonnel}
                        disabled={addMutation.isPending}
                        className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        {addMutation.isPending && (
                          <Loader2 size={14} className="animate-spin" />
                        )}
                        {addMutation.isPending ? "Ekleniyor..." : "Ekle"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Personnel Modal */}
            {editPersonnel && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">Personeli Düzenle</h3>
                    <button
                      type="button"
                      onClick={() => setEditPersonnel(null)}
                      className="p-1 hover:bg-muted rounded-lg"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="block text-sm font-medium mb-1.5">
                        Ad Soyad
                      </div>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <div className="block text-sm font-medium mb-1.5">
                        Departman
                      </div>
                      <input
                        type="text"
                        value={editDept}
                        onChange={(e) => setEditDept(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="edit-is-active"
                        checked={editActive}
                        onChange={(e) => setEditActive(e.target.checked)}
                        className="w-4 h-4 accent-primary"
                      />
                      <label
                        htmlFor="edit-is-active"
                        className="text-sm font-medium"
                      >
                        Aktif
                      </label>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditPersonnel(null)}
                        className="flex-1 border border-border py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                      >
                        {t("cancel")}
                      </button>
                      <button
                        type="button"
                        onClick={handleUpdatePersonnel}
                        disabled={updateMutation.isPending}
                        className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        {updateMutation.isPending && (
                          <Loader2 size={14} className="animate-spin" />
                        )}
                        {updateMutation.isPending
                          ? "Kaydediliyor..."
                          : "Kaydet"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== ATTENDANCE TAB ===== */}
        {activeTab === "attendance" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold">Devam Kayıtları</h2>
              <div className="flex flex-wrap gap-2 ml-auto">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <select
                  value={filterPersonnel}
                  onChange={(e) => setFilterPersonnel(e.target.value)}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Tüm Personel</option>
                  {personnel.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {attendanceLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground justify-center py-8">
                <Loader2 size={20} className="animate-spin" /> {t("loading")}
              </div>
            ) : filteredAttendance.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
                Kayıt yok
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          Personel
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          Tarih
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          Giriş
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          Çıkış
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">
                          Süre
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAttendance
                        .sort((a, b) => Number(b.checkIn - a.checkIn))
                        .slice(0, 200)
                        .map((record) => (
                          <tr
                            key={record.id}
                            className="border-b border-border last:border-0 hover:bg-muted/20"
                          >
                            <td className="px-4 py-3 font-medium">
                              {personnelMap[record.personnelId] ||
                                record.personnelId}
                            </td>
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
                                  İçeride
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                              {record.hasCheckedOut
                                ? formatDuration(
                                    record.checkIn,
                                    record.checkOut,
                                  )
                                : "-"}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== SHIFTS TAB ===== */}
        {activeTab === "shifts" && (
          <div className="space-y-6">
            {/* Shifts section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Vardiyalar</h2>
                <button
                  type="button"
                  onClick={() => setShowAddShift(true)}
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                >
                  <Plus size={16} /> Vardiya Ekle
                </button>
              </div>
              {shifts.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
                  Henüz vardiya tanımlanmamış.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {shifts.map((s) => (
                    <div
                      key={s.id}
                      className="bg-card border border-border rounded-xl p-4"
                    >
                      <div className="font-semibold mb-1">{s.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {s.startTime} - {s.endTime}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {s.workDays.split(",").map((d) => (
                          <span
                            key={d}
                            className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                          >
                            {dayLabels[d] ?? d}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Leave Types section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold">İzin Türleri</h3>
                <div className="flex gap-2">
                  {leaveTypes.length === 0 && (
                    <button
                      type="button"
                      onClick={() => createDefaultLeaveTypesMutation.mutate()}
                      disabled={createDefaultLeaveTypesMutation.isPending}
                      className="text-sm text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 rounded-lg"
                    >
                      {createDefaultLeaveTypesMutation.isPending
                        ? "Oluşturuluyor..."
                        : "Varsayılanları Oluştur"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowAddLeaveType(true)}
                    className="flex items-center gap-1 text-sm bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-lg"
                  >
                    <Plus size={14} /> Yeni
                  </button>
                </div>
              </div>
              {leaveTypes.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-6 text-center text-muted-foreground text-sm">
                  İzin türü yok. "Varsayılanları Oluştur" butonuna tıklayın.
                </div>
              ) : (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          İzin Türü
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          Yıllık Kota (Gün)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaveTypes.map((lt) => (
                        <tr
                          key={lt.id}
                          className="border-b border-border last:border-0"
                        >
                          <td className="px-4 py-3 font-medium">{lt.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {lt.annualQuota.toString()} gün
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Add Shift Modal */}
            {showAddShift && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">Vardiya Ekle</h3>
                    <button
                      type="button"
                      onClick={() => setShowAddShift(false)}
                      className="p-1 hover:bg-muted rounded-lg"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="block text-sm font-medium mb-1.5">
                        Vardiya Adı *
                      </div>
                      <input
                        type="text"
                        value={shiftName}
                        onChange={(e) => setShiftName(e.target.value)}
                        placeholder="Örn: Sabah Vardiyası"
                        className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="block text-sm font-medium mb-1.5">
                          Başlangıç
                        </div>
                        <input
                          type="time"
                          value={shiftStart}
                          onChange={(e) => setShiftStart(e.target.value)}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <div className="block text-sm font-medium mb-1.5">
                          Bitiş
                        </div>
                        <input
                          type="time"
                          value={shiftEnd}
                          onChange={(e) => setShiftEnd(e.target.value)}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="block text-sm font-medium mb-2">
                        Çalışma Günleri
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {allDays.map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() =>
                              setShiftDays((prev) =>
                                prev.includes(d)
                                  ? prev.filter((x) => x !== d)
                                  : [...prev, d],
                              )
                            }
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              shiftDays.includes(d)
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            {dayLabels[d]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddShift(false)}
                        className="flex-1 border border-border py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                      >
                        İptal
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateShift}
                        disabled={createShiftMutation.isPending}
                        className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        {createShiftMutation.isPending && (
                          <Loader2 size={14} className="animate-spin" />
                        )}
                        {createShiftMutation.isPending
                          ? "Oluşturuluyor..."
                          : "Oluştur"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Add Leave Type Modal */}
            {showAddLeaveType && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">İzin Türü Ekle</h3>
                    <button
                      type="button"
                      onClick={() => setShowAddLeaveType(false)}
                      className="p-1 hover:bg-muted rounded-lg"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="block text-sm font-medium mb-1.5">
                        İzin Türü Adı *
                      </div>
                      <input
                        type="text"
                        value={ltName}
                        onChange={(e) => setLtName(e.target.value)}
                        placeholder="Örn: Yıllık İzin"
                        className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <div className="block text-sm font-medium mb-1.5">
                        Yıllık Kota (Gün)
                      </div>
                      <input
                        type="number"
                        value={ltQuota}
                        onChange={(e) => setLtQuota(e.target.value)}
                        min="0"
                        className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddLeaveType(false)}
                        className="flex-1 border border-border py-2.5 rounded-xl text-sm font-medium hover:bg-muted"
                      >
                        İptal
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateLeaveType}
                        disabled={createLeavTypeMutation.isPending}
                        className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        {createLeavTypeMutation.isPending && (
                          <Loader2 size={14} className="animate-spin" />
                        )}
                        Ekle
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== LEAVES TAB ===== */}
        {activeTab === "leaves" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-lg font-semibold">İzin Talepleri</h2>
              <div className="flex gap-1">
                {(["all", "pending", "approved", "rejected"] as const).map(
                  (f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setLeaveFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        leaveFilter === f
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {f === "all"
                        ? "Tümü"
                        : f === "pending"
                          ? "Bekleyen"
                          : f === "approved"
                            ? "Onaylanan"
                            : "Reddedilen"}
                    </button>
                  ),
                )}
              </div>
            </div>

            {filteredLeaveRequests.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
                Kayıt yok
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          Personel
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          İzin Türü
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          Tarih Aralığı
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">
                          Gün
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                          Açıklama
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          Durum
                        </th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeaveRequests.map((req) => (
                        <tr
                          key={req.id}
                          className="border-b border-border last:border-0 hover:bg-muted/20"
                        >
                          <td className="px-4 py-3 font-medium">
                            {personnelMap[req.personnelId] ?? req.personnelId}
                          </td>
                          <td className="px-4 py-3">
                            {leaveTypeMap[req.leaveTypeId] ?? "-"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {req.startDate} - {req.endDate}
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            {req.days.toString()}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden md:table-cell max-w-xs truncate">
                            {req.reason}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={req.status} />
                          </td>
                          <td className="px-4 py-3">
                            {req.status === "pending" && (
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReviewModal({
                                      type: "leave",
                                      id: req.id,
                                      action: "approved",
                                    });
                                    setReviewNote("");
                                  }}
                                  className="text-xs bg-green-500/10 text-green-600 hover:bg-green-500/20 px-2 py-1 rounded"
                                >
                                  Onayla
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReviewModal({
                                      type: "leave",
                                      id: req.id,
                                      action: "rejected",
                                    });
                                    setReviewNote("");
                                  }}
                                  className="text-xs bg-red-500/10 text-red-600 hover:bg-red-500/20 px-2 py-1 rounded"
                                >
                                  Reddet
                                </button>
                              </div>
                            )}
                            {req.reviewerNote && (
                              <div className="text-xs text-muted-foreground mt-1 max-w-xs">
                                {req.reviewerNote}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== CORRECTIONS TAB ===== */}
        {activeTab === "corrections" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Devam Düzeltme Talepleri</h2>
            {corrections.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
                Kayıt yok
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          Personel
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          Tarih
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          İst. Giriş
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          İst. Çıkış
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          Durum
                        </th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {corrections.map((req) => (
                        <tr
                          key={req.id}
                          className="border-b border-border last:border-0 hover:bg-muted/20"
                        >
                          <td className="px-4 py-3 font-medium">
                            {personnelMap[req.personnelId] ?? req.personnelId}
                          </td>
                          <td className="px-4 py-3">{req.date}</td>
                          <td className="px-4 py-3">
                            {formatTime(req.requestedCheckIn)}
                          </td>
                          <td className="px-4 py-3">
                            {formatTime(req.requestedCheckOut)}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={req.status} />
                          </td>
                          <td className="px-4 py-3">
                            {req.status === "pending" && (
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReviewModal({
                                      type: "correction",
                                      id: req.id,
                                      action: "approved",
                                    });
                                    setReviewNote("");
                                  }}
                                  className="text-xs bg-green-500/10 text-green-600 hover:bg-green-500/20 px-2 py-1 rounded"
                                >
                                  Onayla
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReviewModal({
                                      type: "correction",
                                      id: req.id,
                                      action: "rejected",
                                    });
                                    setReviewNote("");
                                  }}
                                  className="text-xs bg-red-500/10 text-red-600 hover:bg-red-500/20 px-2 py-1 rounded"
                                >
                                  Reddet
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== PAYROLL TAB ===== */}
        {activeTab === "rapor" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText size={18} /> Bordro Raporu
              </h2>
              <div className="flex gap-2 ml-auto">
                <select
                  value={payrollMonth}
                  onChange={(e) => setPayrollMonth(Number(e.target.value))}
                  data-ocid="payroll.select"
                  className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <option key={m} value={m}>
                      {new Date(2000, m - 1).toLocaleString("tr-TR", {
                        month: "long",
                      })}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={payrollYear}
                  onChange={(e) => setPayrollYear(Number(e.target.value))}
                  data-ocid="payroll.input"
                  min={2020}
                  max={2100}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            {payrollLoading ? (
              <div
                data-ocid="payroll.loading_state"
                className="flex items-center gap-2 text-muted-foreground justify-center py-8"
              >
                <Loader2 size={20} className="animate-spin" /> Yükleniyor...
              </div>
            ) : payrollData.length === 0 ? (
              <div
                data-ocid="payroll.empty_state"
                className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground"
              >
                Bu dönem için bordro verisi yok.
              </div>
            ) : (
              <div
                data-ocid="payroll.table"
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          Ad Soyad
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">
                          Departman
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          Çalışma Saati
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                          Devamsızlık
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                          İzin
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">
                          Geç Geliş
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {payrollData.map((entry, idx) => (
                        <tr
                          key={entry.personnelId}
                          data-ocid={`payroll.item.${idx + 1}`}
                          className="border-b border-border last:border-0 hover:bg-muted/30"
                        >
                          <td className="px-4 py-3 font-medium">
                            {entry.name}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                            {entry.department || "-"}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-primary">
                              {Math.floor(Number(entry.totalWorkMinutes) / 60)}s{" "}
                              {Number(entry.totalWorkMinutes) % 60}d
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span
                              className={
                                Number(entry.absenceDays) > 0
                                  ? "text-red-500 font-medium"
                                  : "text-muted-foreground"
                              }
                            >
                              {entry.absenceDays.toString()} gün
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                            {entry.leaveDays.toString()} gün
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <span
                              className={
                                Number(entry.lateCount) > 0
                                  ? "text-amber-500 font-medium"
                                  : "text-muted-foreground"
                              }
                            >
                              {entry.lateCount.toString()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== ANNOUNCEMENTS TAB ===== */}
        {activeTab === "duyurular" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Megaphone size={18} /> Duyurular
            </h2>
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h3 className="font-medium text-sm">Yeni Duyuru Oluştur</h3>
              <input
                type="text"
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                data-ocid="announcement.input"
                placeholder="Başlık *"
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <textarea
                value={annContent}
                onChange={(e) => setAnnContent(e.target.value)}
                data-ocid="announcement.textarea"
                placeholder="İçerik *"
                rows={3}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
              <button
                type="button"
                data-ocid="announcement.submit_button"
                disabled={
                  createAnnouncementMutation.isPending ||
                  !annTitle.trim() ||
                  !annContent.trim()
                }
                onClick={async () => {
                  if (!annTitle.trim() || !annContent.trim()) return;
                  try {
                    await createAnnouncementMutation.mutateAsync({
                      title: annTitle.trim(),
                      content: annContent.trim(),
                    });
                    toast.success("Duyuru oluşturuldu");
                    setAnnTitle("");
                    setAnnContent("");
                  } catch {
                    toast.error("Hata oluştu");
                  }
                }}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {createAnnouncementMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Plus size={14} />
                )}
                Yayınla
              </button>
            </div>

            {announcementsLoading ? (
              <div
                data-ocid="announcement.loading_state"
                className="flex items-center gap-2 text-muted-foreground justify-center py-8"
              >
                <Loader2 size={20} className="animate-spin" /> Yükleniyor...
              </div>
            ) : announcements.length === 0 ? (
              <div
                data-ocid="announcement.empty_state"
                className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground"
              >
                Henüz duyuru yok.
              </div>
            ) : (
              <div className="space-y-2">
                {announcements.map((ann, idx) => (
                  <div
                    key={ann.id}
                    data-ocid={`announcement.item.${idx + 1}`}
                    className="bg-card border border-border rounded-xl p-4 flex gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{ann.title}</div>
                      <div className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        {ann.content}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {new Date(
                          Number(ann.createdAt) / 1_000_000,
                        ).toLocaleString("tr-TR")}
                      </div>
                    </div>
                    <button
                      type="button"
                      data-ocid={`announcement.delete_button.${idx + 1}`}
                      onClick={async () => {
                        try {
                          await deleteAnnouncementMutation.mutateAsync(ann.id);
                          toast.success("Duyuru silindi");
                        } catch {
                          toast.error("Hata oluştu");
                        }
                      }}
                      className="flex-shrink-0 p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors text-muted-foreground"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== AUDIT LOG TAB ===== */}
        {activeTab === "denetim" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ClipboardList size={18} /> Denetim Kaydı
            </h2>
            {auditLoading ? (
              <div
                data-ocid="audit.loading_state"
                className="flex items-center gap-2 text-muted-foreground justify-center py-8"
              >
                <Loader2 size={20} className="animate-spin" /> Yükleniyor...
              </div>
            ) : auditLogs.length === 0 ? (
              <div
                data-ocid="audit.empty_state"
                className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground"
              >
                Henüz denetim kaydı yok.
              </div>
            ) : (
              <div
                data-ocid="audit.table"
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          Tarih/Saat
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          İşlem
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">
                          Detaylar
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...auditLogs]
                        .sort(
                          (a, b) => Number(b.timestamp) - Number(a.timestamp),
                        )
                        .map((log, idx) => (
                          <tr
                            key={log.id}
                            data-ocid={`audit.item.${idx + 1}`}
                            className="border-b border-border last:border-0 hover:bg-muted/30"
                          >
                            <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                              {new Date(
                                Number(log.timestamp) / 1_000_000,
                              ).toLocaleString("tr-TR")}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                {log.actionType}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">
                              {log.details}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== KIOSK TAB ===== */}
        {activeTab === "kiosk" && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Monitor size={18} /> Kiosk Modu
            </h2>
            <div className="bg-card border border-border rounded-2xl p-8 text-center max-w-md mx-auto space-y-6">
              <div>
                <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-3">
                  <span className="text-primary-foreground font-bold text-2xl">
                    SF
                  </span>
                </div>
                <h3 className="font-bold text-xl">{session.name}</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Personel kodunuzu girin
                </p>
              </div>
              <input
                type="text"
                value={kioskCode}
                onChange={(e) => setKioskCode(e.target.value.toUpperCase())}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  !kioskLoading &&
                  kioskCode.length >= 8 &&
                  (async () => {
                    setKioskLoading(true);
                    setKioskMsg(null);
                    // Try check-in first
                  })()
                }
                data-ocid="kiosk.input"
                placeholder="Personel Kodu"
                className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-center text-lg font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-primary uppercase"
                maxLength={12}
              />
              {kioskMsg && (
                <div
                  data-ocid={
                    kioskMsg.type === "success"
                      ? "kiosk.success_state"
                      : "kiosk.error_state"
                  }
                  className={`px-4 py-3 rounded-xl text-sm font-medium ${
                    kioskMsg.type === "success"
                      ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
                      : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                  }`}
                >
                  {kioskMsg.text}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  data-ocid="kiosk.primary_button"
                  disabled={kioskLoading || kioskCode.length < 4}
                  onClick={async () => {
                    setKioskLoading(true);
                    setKioskMsg(null);
                    try {
                      const result =
                        (await actor?.kioskCheckIn(companyId, kioskCode)) ??
                        null;
                      if (result) {
                        setKioskMsg({
                          type: "success",
                          text: "✅ Giriş kaydedildi!",
                        });
                        setKioskCode("");
                      } else {
                        setKioskMsg({
                          type: "error",
                          text: "Personel bulunamadı veya zaten içeride.",
                        });
                      }
                    } catch {
                      setKioskMsg({ type: "error", text: "Hata oluştu." });
                    }
                    setKioskLoading(false);
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                >
                  {kioskLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : null}
                  Giriş Yap
                </button>
                <button
                  type="button"
                  data-ocid="kiosk.secondary_button"
                  disabled={kioskLoading || kioskCode.length < 4}
                  onClick={async () => {
                    setKioskLoading(true);
                    setKioskMsg(null);
                    try {
                      const result =
                        (await actor?.kioskCheckOut(kioskCode)) ?? null;
                      if (result) {
                        setKioskMsg({
                          type: "success",
                          text: "✅ Çıkış kaydedildi!",
                        });
                        setKioskCode("");
                      } else {
                        setKioskMsg({
                          type: "error",
                          text: "Personel bulunamadı veya içeride değil.",
                        });
                      }
                    } catch {
                      setKioskMsg({ type: "error", text: "Hata oluştu." });
                    }
                    setKioskLoading(false);
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                >
                  {kioskLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : null}
                  Çıkış Yap
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== SETTINGS TAB ===== */}
        {activeTab === "settings" && (
          <div className="space-y-6 max-w-lg">
            <h2 className="text-lg font-semibold">Ayarlar</h2>
            {companyLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 size={16} className="animate-spin" /> {t("loading")}
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Şirket Adı
                  </div>
                  <div className="font-semibold text-lg">
                    {company?.name || session.name}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    Şirket Giriş Kodu
                  </div>
                  <div className="bg-muted rounded-xl p-4">
                    <div className="text-xs text-muted-foreground mb-2">
                      Bu kodu çalışanlarınızla paylaşın. Onlar bu kodla
                      şirketinize giriş yapabilir.
                    </div>
                    <div className="flex items-center gap-3">
                      <code className="text-xl font-mono font-bold tracking-widest flex-1 text-primary">
                        {company?.entryCode || "..."}
                      </code>
                      <button
                        type="button"
                        onClick={copyCompanyCode}
                        className="flex items-center gap-1.5 px-3 py-2 bg-background hover:bg-accent border border-border rounded-lg text-sm transition-colors"
                      >
                        {codeCopied ? (
                          <>
                            <Check size={14} className="text-green-500" />{" "}
                            Kopyalandı
                          </>
                        ) : (
                          <>
                            <Copy size={14} /> Kopyala
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-semibold text-lg mb-3">
              {reviewModal.action === "approved"
                ? "Talebi Onayla"
                : "Talebi Reddet"}
            </h3>
            <div className="mb-4">
              <div className="block text-sm font-medium mb-1.5">
                Not (isteğe bağlı)
              </div>
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows={3}
                placeholder="Açıklama ekleyin..."
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setReviewModal(null)}
                className="flex-1 border border-border py-2.5 rounded-xl text-sm font-medium hover:bg-muted"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleReview}
                disabled={
                  reviewLeaveMutation.isPending ||
                  reviewCorrectionMutation.isPending
                }
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 ${
                  reviewModal.action === "approved"
                    ? "bg-green-500 hover:bg-green-600 text-white"
                    : "bg-red-500 hover:bg-red-600 text-white"
                } disabled:opacity-50`}
              >
                {(reviewLeaveMutation.isPending ||
                  reviewCorrectionMutation.isPending) && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                {reviewModal.action === "approved" ? "Onayla" : "Reddet"}
              </button>
            </div>
          </div>
        </div>
      )}

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
