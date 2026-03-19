import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock,
  Coffee,
  Loader2,
  LogOut,
  Megaphone,
  Moon,
  Plus,
  Star,
  Sun,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Page, Session } from "../App";
import LeaveBalanceCard from "../components/LeaveBalanceCard";
import NotificationBell from "../components/NotificationBell";
import {
  useActiveBreak,
  useActiveCheckIn,
  useAnnouncementsByCompany,
  useAttendanceByPersonnel,
  useAttendanceScore,
  useCheckIn,
  useCheckOut,
  useCorrectionsByPersonnel,
  useEndBreak,
  useLeaveRequestsByPersonnel,
  useLeaveTypes,
  useStartBreak,
  useSubmitCorrection,
  useSubmitLeaveRequest,
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

type Tab = "checkin" | "history" | "leaves" | "corrections";

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
  return `${h}s ${m}d`;
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
  const [activeTab, setActiveTab] = useState<Tab>("checkin");

  // Leave request form
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("");

  // Correction form
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [corrDate, setCorrDate] = useState("");
  const [corrCheckIn, setCorrCheckIn] = useState("09:00");
  const [corrCheckOut, setCorrCheckOut] = useState("18:00");

  const { data: activeCheckIn, isLoading: checkInLoading } = useActiveCheckIn(
    session.id,
  );
  const { data: history = [], isLoading: historyLoading } =
    useAttendanceByPersonnel(session.id);
  const { data: leaveTypes = [] } = useLeaveTypes(companyId);
  const { data: leaveRequests = [] } = useLeaveRequestsByPersonnel(session.id);
  const { data: corrections = [] } = useCorrectionsByPersonnel(session.id);

  const checkInMutation = useCheckIn(companyId);
  const checkOutMutation = useCheckOut();
  const submitLeaveMutation = useSubmitLeaveRequest();
  const submitCorrectionMutation = useSubmitCorrection();

  // Break, announcements, score
  const { data: activeBreak } = useActiveBreak(session.id);
  const { data: announcements = [] } = useAnnouncementsByCompany(companyId);
  const { data: scoreBig = 0n } = useAttendanceScore(session.id, companyId);
  const startBreakMutation = useStartBreak(companyId);
  const endBreakMutation = useEndBreak();

  const [breakElapsed, setBreakElapsed] = useState("");
  useEffect(() => {
    if (!activeBreak?.isActive) {
      setBreakElapsed("");
      return;
    }
    function updateElapsed() {
      const startMs = Number(activeBreak!.startTime) / 1_000_000;
      const diffMs = Date.now() - startMs;
      const m = Math.floor(diffMs / 60_000);
      const s = Math.floor((diffMs % 60_000) / 1000);
      setBreakElapsed(`${m}d ${s}s`);
    }
    updateElapsed();
    const id = setInterval(updateElapsed, 1000);
    return () => clearInterval(id);
  }, [activeBreak]);

  const score = Number(scoreBig);
  const scoreCls =
    score >= 80
      ? "text-green-600 dark:text-green-400"
      : score >= 60
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";
  const scoreLabel = score >= 80 ? "Mükemmel" : score >= 60 ? "Orta" : "Düşük";

  const isCheckedIn = !!activeCheckIn;
  const isMutating = checkInMutation.isPending || checkOutMutation.isPending;

  async function handleCheckIn() {
    if (!companyId) {
      toast.error("Şirket bilgisi eksik");
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

  function calcLeaveDays(start: string, end: string): number {
    if (!start || !end) return 0;
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if (e < s) return 0;
    return Math.round((e - s) / 86_400_000) + 1;
  }

  async function handleStartBreak() {
    try {
      await startBreakMutation.mutateAsync(session.id);
      toast.success("Mola başlatıldı");
    } catch {
      toast.error(t("error"));
    }
  }

  async function handleEndBreak() {
    try {
      await endBreakMutation.mutateAsync(session.id);
      toast.success("Mola bitirildi");
    } catch {
      toast.error(t("error"));
    }
  }

  async function handleSubmitLeave() {
    if (!leaveTypeId || !leaveStart || !leaveEnd) {
      toast.error("İzin türü, başlangıç ve bitiş tarihi gerekli");
      return;
    }
    const days = calcLeaveDays(leaveStart, leaveEnd);
    if (days <= 0) {
      toast.error("Geçerli tarih aralığı seçin");
      return;
    }
    try {
      await submitLeaveMutation.mutateAsync({
        personnelId: session.id,
        leaveTypeId,
        startDate: leaveStart,
        endDate: leaveEnd,
        days,
        reason: leaveReason,
      });
      toast.success("İzin talebi gönderildi");
      setShowLeaveModal(false);
      setLeaveTypeId("");
      setLeaveStart("");
      setLeaveEnd("");
      setLeaveReason("");
    } catch {
      toast.error(t("error"));
    }
  }

  async function handleSubmitCorrection() {
    if (!corrDate || !corrCheckIn || !corrCheckOut) {
      toast.error("Tarih ve saatler gerekli");
      return;
    }
    try {
      await submitCorrectionMutation.mutateAsync({
        personnelId: session.id,
        companyId,
        date: corrDate,
        checkInTime: corrCheckIn,
        checkOutTime: corrCheckOut,
      });
      toast.success("Düzeltme talebi gönderildi");
      setShowCorrectionModal(false);
      setCorrDate("");
      setCorrCheckIn("09:00");
      setCorrCheckOut("18:00");
    } catch {
      toast.error(t("error"));
    }
  }

  const tabLabels: Record<Tab, string> = {
    checkin: "Giriş/Çıkış",
    history: "Geçmiş",
    leaves: "İzin Talebi",
    corrections: "Düzeltme Talebi",
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
          <NotificationBell personnelId={session.id} />
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

      <main className="flex-1 p-4 md:p-6 max-w-2xl mx-auto w-full space-y-6">
        {/* ===== CHECK-IN TAB ===== */}
        {activeTab === "checkin" && (
          <div className="space-y-4">
            <div
              className={`rounded-2xl p-6 border-2 transition-colors ${
                isCheckedIn
                  ? "bg-green-500/5 border-green-500/30"
                  : "bg-card border-border"
              }`}
            >
              <div className="flex items-center gap-4 mb-6">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${isCheckedIn ? "bg-green-500/10" : "bg-muted"}`}
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
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 size={14} className="animate-spin" />
                      <span className="text-sm">{t("loading")}</span>
                    </div>
                  ) : (
                    <>
                      <div
                        className={`font-bold text-lg ${isCheckedIn ? "text-green-600 dark:text-green-400" : "text-foreground"}`}
                      >
                        {isCheckedIn ? "İçeridesiniz" : "Dışarıdasınız"}
                      </div>
                      {isCheckedIn && activeCheckIn && (
                        <div className="text-sm text-muted-foreground">
                          Giriş: {formatTime(activeCheckIn.checkIn)}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {!checkInLoading && (
                <button
                  type="button"
                  data-ocid="checkin.primary_button"
                  onClick={isCheckedIn ? handleCheckOut : handleCheckIn}
                  disabled={isMutating}
                  className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                    isCheckedIn
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : "bg-primary hover:bg-primary/90 text-primary-foreground"
                  } disabled:opacity-50`}
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

              {/* Break button - only when checked in */}
              {isCheckedIn && !checkInLoading && (
                <div className="mt-3">
                  {activeBreak?.isActive ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 text-sm font-medium">
                        <Coffee size={16} className="animate-pulse" />
                        <span>Mola sürüyor: {breakElapsed}</span>
                      </div>
                      <button
                        type="button"
                        data-ocid="checkin.secondary_button"
                        onClick={handleEndBreak}
                        disabled={endBreakMutation.isPending}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold border-2 border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                      >
                        {endBreakMutation.isPending ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Coffee size={14} />
                        )}
                        Molayı Bitir
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      data-ocid="checkin.secondary_button"
                      onClick={handleStartBreak}
                      disabled={startBreakMutation.isPending}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold border border-border text-muted-foreground hover:bg-muted flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                    >
                      {startBreakMutation.isPending ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Coffee size={14} />
                      )}
                      Mola Başlat
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Attendance Score Card */}
            <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold border-2 ${
                  score >= 80
                    ? "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400"
                    : score >= 60
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                      : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                }`}
              >
                {score}
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-sm font-semibold">
                  <Star size={14} className={scoreCls} />
                  Devam Puanı
                </div>
                <div className={`text-xs mt-0.5 font-medium ${scoreCls}`}>
                  {scoreLabel}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Düzenli devam ve zamanında giriş/çıkışa göre hesaplanır
                </div>
              </div>
            </div>

            {/* Company Announcements */}
            {announcements.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Megaphone size={14} /> Duyurular
                </h3>
                {announcements.slice(0, 3).map((ann, idx) => (
                  <div
                    key={ann.id}
                    data-ocid={`announcement.item.${idx + 1}`}
                    className="bg-card border border-border rounded-xl p-4"
                  >
                    <div className="font-medium text-sm">{ann.title}</div>
                    <div className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      {ann.content}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1.5">
                      {new Date(
                        Number(ann.createdAt) / 1_000_000,
                      ).toLocaleDateString("tr-TR")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== HISTORY TAB ===== */}
        {activeTab === "history" && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="font-semibold">{t("attendanceHistory")}</h3>
            </div>
            {historyLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground justify-center py-8">
                <Loader2 size={20} className="animate-spin" /> {t("loading")}
              </div>
            ) : history.length === 0 ? (
              <div className="text-muted-foreground text-sm text-center py-8">
                {t("noRecords")}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
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
                        Süre
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {history
                      .sort((a, b) => Number(b.checkIn - a.checkIn))
                      .slice(0, 100)
                      .map((record) => (
                        <tr
                          key={record.id}
                          className="border-b border-border last:border-0 hover:bg-muted/20"
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
                                İçeride
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
        )}

        {/* ===== LEAVES TAB ===== */}
        {activeTab === "leaves" && (
          <div className="space-y-6">
            {/* Leave balance cards */}
            {leaveTypes.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">İzin Bakiyem</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {leaveTypes.map((lt) => (
                    <LeaveBalanceCard
                      key={lt.id}
                      personnelId={session.id}
                      leaveType={lt}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <h3 className="font-semibold">İzin Taleplerim</h3>
              <button
                type="button"
                onClick={() => setShowLeaveModal(true)}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium"
              >
                <Plus size={16} /> İzin Talebi Oluştur
              </button>
            </div>

            {leaveRequests.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-6 text-center text-muted-foreground text-sm">
                Henüz izin talebi yok.
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
                        Tarih Aralığı
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">
                        Gün
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                        Durum
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveRequests.map((req) => {
                      const lt = leaveTypes.find(
                        (x) => x.id === req.leaveTypeId,
                      );
                      return (
                        <tr
                          key={req.id}
                          className="border-b border-border last:border-0"
                        >
                          <td className="px-4 py-3">{lt?.name ?? "-"}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {req.startDate} - {req.endDate}
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            {req.days.toString()}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={req.status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Leave Modal */}
            {showLeaveModal && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">İzin Talebi</h3>
                    <button
                      type="button"
                      onClick={() => setShowLeaveModal(false)}
                      className="p-1 hover:bg-muted rounded-lg"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="block text-sm font-medium mb-1.5">
                        İzin Türü *
                      </div>
                      <select
                        value={leaveTypeId}
                        onChange={(e) => setLeaveTypeId(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Seçin...</option>
                        {leaveTypes.map((lt) => (
                          <option key={lt.id} value={lt.id}>
                            {lt.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="block text-sm font-medium mb-1.5">
                          Başlangıç *
                        </div>
                        <input
                          type="date"
                          value={leaveStart}
                          onChange={(e) => setLeaveStart(e.target.value)}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <div className="block text-sm font-medium mb-1.5">
                          Bitiş *
                        </div>
                        <input
                          type="date"
                          value={leaveEnd}
                          onChange={(e) => setLeaveEnd(e.target.value)}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                    {leaveStart && leaveEnd && (
                      <div className="text-sm text-muted-foreground">
                        Toplam:{" "}
                        <strong>
                          {calcLeaveDays(leaveStart, leaveEnd)} gün
                        </strong>
                      </div>
                    )}
                    <div>
                      <div className="block text-sm font-medium mb-1.5">
                        Açıklama
                      </div>
                      <textarea
                        value={leaveReason}
                        onChange={(e) => setLeaveReason(e.target.value)}
                        rows={3}
                        placeholder="Neden izin istiyorsunuz?"
                        className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowLeaveModal(false)}
                        className="flex-1 border border-border py-2.5 rounded-xl text-sm font-medium hover:bg-muted"
                      >
                        İptal
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmitLeave}
                        disabled={submitLeaveMutation.isPending}
                        className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                      >
                        {submitLeaveMutation.isPending && (
                          <Loader2 size={14} className="animate-spin" />
                        )}
                        Gönder
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== CORRECTIONS TAB ===== */}
        {activeTab === "corrections" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Devam Düzeltme Taleplerim</h3>
              <button
                type="button"
                onClick={() => setShowCorrectionModal(true)}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium"
              >
                <Plus size={16} /> Düzeltme Talebi
              </button>
            </div>

            {corrections.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-6 text-center text-muted-foreground text-sm">
                Henüz düzeltme talebi yok.
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                        Tarih
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                        Giriş
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                        Çıkış
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                        Durum
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {corrections.map((req) => (
                      <tr
                        key={req.id}
                        className="border-b border-border last:border-0"
                      >
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Correction Modal */}
            {showCorrectionModal && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">
                      Devam Düzeltme Talebi
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowCorrectionModal(false)}
                      className="p-1 hover:bg-muted rounded-lg"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="block text-sm font-medium mb-1.5">
                        Tarih *
                      </div>
                      <input
                        type="date"
                        value={corrDate}
                        onChange={(e) => setCorrDate(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="block text-sm font-medium mb-1.5">
                          Giriş Saati *
                        </div>
                        <input
                          type="time"
                          value={corrCheckIn}
                          onChange={(e) => setCorrCheckIn(e.target.value)}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <div className="block text-sm font-medium mb-1.5">
                          Çıkış Saati *
                        </div>
                        <input
                          type="time"
                          value={corrCheckOut}
                          onChange={(e) => setCorrCheckOut(e.target.value)}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowCorrectionModal(false)}
                        className="flex-1 border border-border py-2.5 rounded-xl text-sm font-medium hover:bg-muted"
                      >
                        İptal
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmitCorrection}
                        disabled={submitCorrectionMutation.isPending}
                        className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                      >
                        {submitCorrectionMutation.isPending && (
                          <Loader2 size={14} className="animate-spin" />
                        )}
                        Gönder
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

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
