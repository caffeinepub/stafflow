import {
  Check,
  ChevronDown,
  Copy,
  Edit2,
  Loader2,
  LogOut,
  Moon,
  Plus,
  Sun,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Page, Session } from "../App";
import type { Personnel } from "../backend.d";
import {
  useAddPersonnel,
  useAttendanceByCompany,
  useCompanyById,
  usePersonnelList,
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

type Tab = "dashboard" | "personnel" | "attendance" | "settings";

function formatDuration(checkIn: bigint, checkOut: bigint): string {
  const ms = Number(checkOut - checkIn) / 1_000_000;
  if (ms <= 0) return "-";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
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

  const { data: company, isLoading: companyLoading } = useCompanyById(
    session.id,
  );
  const { data: personnel = [], isLoading: personnelLoading } =
    usePersonnelList(session.id);
  const { data: attendance = [], isLoading: attendanceLoading } =
    useAttendanceByCompany(session.id);

  const addMutation = useAddPersonnel(session.id);
  const updateMutation = useUpdatePersonnel(session.id);

  // Dashboard stats
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
      toast.success(`${p.name} - ${t("success")}`);
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

  function copyCompanyCode() {
    if (company?.entryCode) {
      navigator.clipboard.writeText(company.entryCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  }

  const tabLabels: Record<Tab, string> = {
    dashboard: t("overview"),
    personnel: t("employees"),
    attendance: t("attendance"),
    settings: t("settings"),
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
            data-ocid="company_dashboard.select"
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
            data-ocid="company_dashboard.toggle"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
            data-ocid="company_dashboard.button"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">{t("logout")}</span>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-card border-b border-border">
        <div className="flex overflow-x-auto">
          {(["dashboard", "personnel", "attendance", "settings"] as Tab[]).map(
            (tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-ocid="company_dashboard.tab"
              >
                {tabLabels[tab]}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full">
        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div
                className="bg-card border border-border rounded-xl p-4"
                data-ocid="company_dashboard.card"
              >
                <div className="text-2xl font-bold text-primary">
                  {attendanceLoading ? "..." : todayCheckins.length}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {t("todayCheckins")}
                </div>
              </div>
              <div
                className="bg-card border border-border rounded-xl p-4"
                data-ocid="company_dashboard.card"
              >
                <div className="text-2xl font-bold text-primary">
                  {personnelLoading
                    ? "..."
                    : personnel.filter((p) => p.isActive).length}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {t("totalEmployees")}
                </div>
              </div>
              <div
                className="bg-card border border-border rounded-xl p-4 col-span-2 md:col-span-1"
                data-ocid="company_dashboard.card"
              >
                <div className="text-2xl font-bold text-primary">
                  {attendanceLoading ? "..." : currentlyIn.length}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {t("checkedIn")}
                </div>
              </div>
            </div>

            {/* Currently Checked In */}
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Users size={16} className="text-primary" />
                {lang === "tr" ? "Şu An İçeride" : "Currently Checked In"}
              </h3>
              {attendanceLoading ? (
                <div
                  className="flex items-center gap-2 text-muted-foreground text-sm py-4 justify-center"
                  data-ocid="company_dashboard.loading_state"
                >
                  <Loader2 size={16} className="animate-spin" /> {t("loading")}
                </div>
              ) : currentlyIn.length === 0 ? (
                <div
                  className="text-muted-foreground text-sm text-center py-4"
                  data-ocid="company_dashboard.empty_state"
                >
                  {lang === "tr"
                    ? "Şu an içeride kimse yok"
                    : "Nobody is currently checked in"}
                </div>
              ) : (
                <div className="space-y-2">
                  {currentlyIn.map((record, i) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                      data-ocid={`company_dashboard.item.${i + 1}`}
                    >
                      <span className="font-medium text-sm">
                        {personnelMap[record.personnelId] || record.personnelId}
                      </span>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        {lang === "tr" ? "Giriş:" : "In:"}{" "}
                        {formatTime(record.checkIn)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Personnel Tab */}
        {activeTab === "personnel" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t("employees")}</h2>
              <button
                type="button"
                onClick={() => setShowAddPersonnel(true)}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                data-ocid="company_dashboard.primary_button"
              >
                <Plus size={16} />
                {lang === "tr" ? "Personel Ekle" : "Add Personnel"}
              </button>
            </div>

            {personnelLoading ? (
              <div
                className="flex items-center gap-2 text-muted-foreground justify-center py-8"
                data-ocid="company_dashboard.loading_state"
              >
                <Loader2 size={20} className="animate-spin" /> {t("loading")}
              </div>
            ) : personnel.length === 0 ? (
              <div
                className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground"
                data-ocid="company_dashboard.empty_state"
              >
                {lang === "tr"
                  ? "Henüz personel yok. Personel ekleyerek başlayın."
                  : "No personnel yet. Add your first employee."}
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table
                    className="w-full text-sm"
                    data-ocid="company_dashboard.table"
                  >
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          {lang === "tr" ? "Ad Soyad" : "Name"}
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">
                          {t("department")}
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                          {lang === "tr" ? "Rol" : "Role"}
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          {lang === "tr" ? "Kod" : "Code"}
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          {lang === "tr" ? "Durum" : "Status"}
                        </th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {personnel.map((p, i) => (
                        <tr
                          key={p.id}
                          className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                          data-ocid={`company_dashboard.row.${i + 1}`}
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
                              {p.isAdmin
                                ? "Admin"
                                : lang === "tr"
                                  ? "Personel"
                                  : "Staff"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                              {p.entryCode}
                            </code>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                p.isActive
                                  ? "bg-green-500/10 text-green-600 dark:text-green-400"
                                  : "bg-red-500/10 text-red-600 dark:text-red-400"
                              }`}
                            >
                              {p.isActive
                                ? lang === "tr"
                                  ? "Aktif"
                                  : "Active"
                                : lang === "tr"
                                  ? "Pasif"
                                  : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => openEdit(p)}
                              className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                              data-ocid={`company_dashboard.edit_button.${i + 1}`}
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
              <div
                className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                data-ocid="company_dashboard.modal"
              >
                <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">
                      {lang === "tr" ? "Personel Ekle" : "Add Personnel"}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowAddPersonnel(false)}
                      className="p-1 hover:bg-muted rounded-lg"
                      data-ocid="company_dashboard.close_button"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="new-name"
                        className="block text-sm font-medium mb-1.5"
                      >
                        {lang === "tr" ? "Ad Soyad" : "Full Name"} *
                      </label>
                      <input
                        id="new-name"
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        data-ocid="company_dashboard.input"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="new-dept"
                        className="block text-sm font-medium mb-1.5"
                      >
                        {t("department")}
                      </label>
                      <input
                        id="new-dept"
                        type="text"
                        value={newDept}
                        onChange={(e) => setNewDept(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        data-ocid="company_dashboard.input"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="new-is-admin"
                        checked={newIsAdmin}
                        onChange={(e) => setNewIsAdmin(e.target.checked)}
                        className="w-4 h-4 accent-primary"
                        data-ocid="company_dashboard.checkbox"
                      />
                      <label
                        htmlFor="new-is-admin"
                        className="text-sm font-medium"
                      >
                        {lang === "tr"
                          ? "Yönetici yetkisi ver"
                          : "Grant admin access"}
                      </label>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddPersonnel(false)}
                        className="flex-1 border border-border py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                        data-ocid="company_dashboard.cancel_button"
                      >
                        {t("cancel")}
                      </button>
                      <button
                        type="button"
                        onClick={handleAddPersonnel}
                        disabled={addMutation.isPending}
                        className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        data-ocid="company_dashboard.confirm_button"
                      >
                        {addMutation.isPending && (
                          <Loader2 size={14} className="animate-spin" />
                        )}
                        {addMutation.isPending
                          ? t("loading")
                          : lang === "tr"
                            ? "Ekle"
                            : "Add"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Personnel Modal */}
            {editPersonnel && (
              <div
                className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                data-ocid="company_dashboard.modal"
              >
                <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">
                      {lang === "tr" ? "Personeli Düzenle" : "Edit Personnel"}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditPersonnel(null)}
                      className="p-1 hover:bg-muted rounded-lg"
                      data-ocid="company_dashboard.close_button"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="edit-name"
                        className="block text-sm font-medium mb-1.5"
                      >
                        {lang === "tr" ? "Ad Soyad" : "Full Name"}
                      </label>
                      <input
                        id="edit-name"
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        data-ocid="company_dashboard.input"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="edit-dept"
                        className="block text-sm font-medium mb-1.5"
                      >
                        {t("department")}
                      </label>
                      <input
                        id="edit-dept"
                        type="text"
                        value={editDept}
                        onChange={(e) => setEditDept(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        data-ocid="company_dashboard.input"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="edit-is-active"
                        checked={editActive}
                        onChange={(e) => setEditActive(e.target.checked)}
                        className="w-4 h-4 accent-primary"
                        data-ocid="company_dashboard.checkbox"
                      />
                      <label
                        htmlFor="edit-is-active"
                        className="text-sm font-medium"
                      >
                        {lang === "tr" ? "Aktif" : "Active"}
                      </label>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditPersonnel(null)}
                        className="flex-1 border border-border py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                        data-ocid="company_dashboard.cancel_button"
                      >
                        {t("cancel")}
                      </button>
                      <button
                        type="button"
                        onClick={handleUpdatePersonnel}
                        disabled={updateMutation.isPending}
                        className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        data-ocid="company_dashboard.save_button"
                      >
                        {updateMutation.isPending && (
                          <Loader2 size={14} className="animate-spin" />
                        )}
                        {updateMutation.isPending ? t("loading") : t("save")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Attendance Tab */}
        {activeTab === "attendance" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold">{t("attendance")}</h2>
              <div className="flex flex-wrap gap-2 ml-auto">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  data-ocid="company_dashboard.input"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  data-ocid="company_dashboard.input"
                />
                <select
                  value={filterPersonnel}
                  onChange={(e) => setFilterPersonnel(e.target.value)}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  data-ocid="company_dashboard.select"
                >
                  <option value="">{t("allEmployees")}</option>
                  {personnel.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {attendanceLoading ? (
              <div
                className="flex items-center gap-2 text-muted-foreground justify-center py-8"
                data-ocid="company_dashboard.loading_state"
              >
                <Loader2 size={20} className="animate-spin" /> {t("loading")}
              </div>
            ) : filteredAttendance.length === 0 ? (
              <div
                className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground"
                data-ocid="company_dashboard.empty_state"
              >
                {t("noRecords")}
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table
                    className="w-full text-sm"
                    data-ocid="company_dashboard.table"
                  >
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          {lang === "tr" ? "Personel" : "Personnel"}
                        </th>
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
                      {filteredAttendance
                        .sort((a, b) => Number(b.checkIn - a.checkIn))
                        .slice(0, 200)
                        .map((record, i) => (
                          <tr
                            key={record.id}
                            className="border-b border-border last:border-0 hover:bg-muted/20"
                            data-ocid={`company_dashboard.row.${i + 1}`}
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
                                  {lang === "tr" ? "İçeride" : "In"}
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

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="space-y-6 max-w-lg">
            <h2 className="text-lg font-semibold">{t("settings")}</h2>
            {companyLoading ? (
              <div
                className="flex items-center gap-2 text-muted-foreground"
                data-ocid="company_dashboard.loading_state"
              >
                <Loader2 size={16} className="animate-spin" /> {t("loading")}
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    {lang === "tr" ? "Şirket Adı" : "Company Name"}
                  </div>
                  <div className="font-semibold text-lg">
                    {company?.name || session.name}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    {lang === "tr" ? "Şirket Giriş Kodu" : "Company Entry Code"}
                  </div>
                  <div className="bg-muted rounded-xl p-4">
                    <div className="text-xs text-muted-foreground mb-2">
                      {lang === "tr"
                        ? "Bu kodu çalışanlarınızla paylaşın. Onlar bu kodla şirketinize giriş yapabilir."
                        : "Share this code with your employees. They can use it to access your company."}
                    </div>
                    <div className="flex items-center gap-3">
                      <code className="text-xl font-mono font-bold tracking-widest flex-1 text-primary">
                        {company?.entryCode || "..."}
                      </code>
                      <button
                        type="button"
                        onClick={copyCompanyCode}
                        className="flex items-center gap-1.5 px-3 py-2 bg-background hover:bg-accent border border-border rounded-lg text-sm transition-colors"
                        data-ocid="company_dashboard.copy_button"
                      >
                        {codeCopied ? (
                          <>
                            <Check size={14} className="text-green-500" />{" "}
                            {t("copied")}
                          </>
                        ) : (
                          <>
                            <Copy size={14} /> {t("copyCode")}
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
