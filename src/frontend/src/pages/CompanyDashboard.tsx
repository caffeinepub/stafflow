import {
  AlertTriangle,
  BarChart3,
  Building2,
  Calendar,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Clock,
  Copy,
  Database,
  Download,
  EyeOff,
  FileText,
  LogOut,
  Megaphone,
  Moon,
  Paperclip,
  Pencil,
  Pin,
  Plus,
  QrCode,
  ScrollText,
  Settings,
  Sun,
  Trash2,
  TrendingUp,
  Upload,
  UserCheck,
  UserX,
  Users,
  X,
  Zap,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import type { Page, Session } from "../App";
import AlertsPanel from "../components/AlertsPanel";
import PayrollReport from "../components/PayrollReport";
import { LANGUAGES, type Lang } from "../i18n";
import {
  type Announcement,
  type AttendanceRecord,
  type AttendanceScore,
  type AuditEntry,
  type CorrectionRequest,
  type Employee,
  type InviteCode,
  type LeaveBalance,
  type LeaveRecord,
  type LeaveRequest,
  type LeaveType,
  type MissingCheckout,
  type MonthlySummaryRow,
  type OvertimeLog,
  type PublicHoliday,
  type Shift,
  type ShiftSwap,
  type WorkSchedule,
  addAnnouncement,
  addAuditEntry,
  addAutoCheckoutRecord,
  addLeaveRecord,
  addLeaveType,
  addMissingCheckoutFlag,
  addPublicHoliday,
  addShiftSwap,
  approveCorrectionRequest,
  approveLeaveRequest,
  approveShiftSwap,
  assignEmployeeShift,
  cancelInviteCode,
  clearEmployeePersonalWorkHours,
  createInviteCode,
  deleteAnnouncement,
  deleteLeaveRecord,
  deleteLeaveType,
  deletePublicHoliday,
  ensureOvertimeLogsForCompany,
  exportAllData,
  formatDuration,
  getAllCompanyAttendance,
  getAttendanceScore,
  getCheckedInEmployees,
  getCompany,
  getCompanyAnnouncements,
  getCompanyAttendance,
  getCompanyAuditLog,
  getCompanyCorrectionRequests,
  getCompanyDepartments,
  getCompanyEmployees,
  getCompanyHolidays,
  getCompanyInviteCodes,
  getCompanyLeaveBalances,
  getCompanyLeaveRecords,
  getCompanyLeaveRequests,
  getCompanyLeaveTypes,
  getCompanyOvertimeLogs,
  getCompanyShiftSwaps,
  getDailyCheckinCount,
  getInviteCodeStatus,
  getLeaveBalance,
  getMissingCheckouts,
  getMonthlyAttendanceSummary,
  getOvertimeMinutes,
  getRecordDuration,
  getRecordDurationMinutes,
  getSchedule,
  importAllData,
  isEarlyCheckout,
  isLateCheckin,
  rejectCorrectionRequest,
  rejectLeaveRequest,
  rejectShiftSwap,
  setLeaveBalance,
  setScheduleEntry,
  toggleEmployeeActive,
  updateCompanyAutoCheckout,
  updateCompanyMinHours,
  updateCompanyShifts,
  updateCompanyWorkDays,
  updateCompanyWorkHours,
  updateEmployeeDepartment,
  updateEmployeePersonalMinHours,
  updateEmployeePersonalWorkHours,
  updateOvertimeLogStatus,
} from "../store";

import KioskMode from "../components/KioskMode";
import OvertimeApprovalsTab from "../components/OvertimeApprovalsTab";
import ScheduleTab from "../components/ScheduleTab";

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
  | "overview"
  | "live"
  | "invites"
  | "employees"
  | "attendance"
  | "summary"
  | "statistics"
  | "corrections"
  | "leaverequests"
  | "payroll"
  | "alerts"
  | "auditlog"
  | "announcements"
  | "schedule"
  | "overtimeapprovals"
  | "shiftswap"
  | "settings";

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
  const [tab, setTabRaw] = useState<Tab>("overview");
  function setTab(t: Tab) {
    setTabRaw(t);
    if (t === "schedule") {
      setScheduleData(getSchedule(session.id, scheduleYear, scheduleMonth));
    }
    if (t === "overtimeapprovals") {
      ensureOvertimeLogsForCompany(session.id);
      setOvertimeLogs(getCompanyOvertimeLogs(session.id));
    }
  }
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

  // Settings state
  const [workStart, setWorkStart] = useState("");
  const [workEnd, setWorkEnd] = useState("");
  const [savingWorkHours, setSavingWorkHours] = useState(false);

  // Leave records state
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([]);
  const [showAddLeave, setShowAddLeave] = useState(false);
  const [leaveEmpId, setLeaveEmpId] = useState("");
  const [leaveDate, setLeaveDate] = useState("");
  const [leaveType, setLeaveType] = useState<LeaveRecord["type"]>("leave");
  const [leaveNote, setLeaveNote] = useState("");
  const [savingLeave, setSavingLeave] = useState(false);

  // Summary state
  const [summaryYear, setSummaryYear] = useState(new Date().getFullYear());
  const [summaryMonth, setSummaryMonth] = useState(new Date().getMonth());
  const [summaryData, setSummaryData] = useState<MonthlySummaryRow[]>([]);

  const company = getCompany(session.id);

  const DEFAULT_WORK_DAYS = [1, 2, 3, 4, 5];
  const [workDays, setWorkDays] = useState<number[]>(
    company?.workDays ?? DEFAULT_WORK_DAYS,
  );
  const [savingWorkDays, setSavingWorkDays] = useState(false);

  // Department filter
  const [filterDepartment, setFilterDepartment] = useState("");

  // Department edit state
  const [editDeptEmpId, setEditDeptEmpId] = useState("");
  const [editDeptValue, setEditDeptValue] = useState("");

  // Active/inactive filter
  const [showInactive, setShowInactive] = useState(false);

  // Shift management state
  const [newShiftName, setNewShiftName] = useState("");
  const [newShiftStart, setNewShiftStart] = useState("08:00");
  const [newShiftEnd, setNewShiftEnd] = useState("17:00");

  // Min daily hours state
  const [minDailyHoursValue, setMinDailyHoursValue] = useState(() =>
    String(getCompany(session.id)?.minDailyHours || 0),
  );
  const [savingMinHours, setSavingMinHours] = useState(false);

  // Backup/restore state
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);

  // Holidays state
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayName, setNewHolidayName] = useState("");

  // Correction requests state
  const [correctionRequests, setCorrectionRequests] = useState<
    CorrectionRequest[]
  >([]);
  const [correctionFilter, setCorrectionFilter] = useState<"pending" | "all">(
    "pending",
  );
  const [rejectingId, setRejectingId] = useState("");
  const [rejectionNote, setRejectionNote] = useState("");

  // Leave requests state
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveReqFilter, setLeaveReqFilter] = useState<"pending" | "all">(
    "pending",
  );
  const [rejectingLeaveId, setRejectingLeaveId] = useState("");
  const [leaveRejectionNote, setLeaveRejectionNote] = useState("");

  // Bulk operations state
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(
    new Set(),
  );
  const [bulkDept, setBulkDept] = useState("");
  const [bulkShiftId, setBulkShiftId] = useState("");
  const [bulkLeaveDate, setBulkLeaveDate] = useState("");
  const [bulkLeaveType, setBulkLeaveType] =
    useState<LeaveRecord["type"]>("leave");

  // Audit log state
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [auditFilterFrom, setAuditFilterFrom] = useState("");
  const [auditFilterTo, setAuditFilterTo] = useState("");
  const [auditFilterAction, setAuditFilterAction] = useState("");

  // Auto checkout state
  const [autoCheckoutEnabled, setAutoCheckoutEnabled] = useState(
    () => getCompany(session.id)?.autoCheckout?.enabled ?? false,
  );
  const [autoCheckoutMode, setAutoCheckoutMode] = useState<"auto" | "flag">(
    () => getCompany(session.id)?.autoCheckout?.mode ?? "flag",
  );
  const [savingAutoCheckout, setSavingAutoCheckout] = useState(false);

  // Kiosk mode state
  const [kioskMode, setKioskMode] = useState(false);

  // Missing checkouts
  const [missingCheckouts, setMissingCheckouts] = useState<MissingCheckout[]>(
    [],
  );

  // Personal rules state (per employee expand)
  const [expandedPersonalEmpId, setExpandedPersonalEmpId] = useState("");
  const [personalStart, setPersonalStart] = useState("");
  const [personalEnd, setPersonalEnd] = useState("");
  const [personalMinH, setPersonalMinH] = useState("");
  const [savingPersonal, setSavingPersonal] = useState(false);

  // Announcements state
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newAnnTitle, setNewAnnTitle] = useState("");
  const [newAnnContent, setNewAnnContent] = useState("");
  const [newAnnPinned, setNewAnnPinned] = useState(false);
  const [savingAnn, setSavingAnn] = useState(false);

  // Leave balance state
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [editBalanceEmpId, setEditBalanceEmpId] = useState("");
  const [editBalanceValue, setEditBalanceValue] = useState("");

  // Work schedule state
  const [scheduleYear, setScheduleYear] = React.useState(
    new Date().getFullYear(),
  );
  const [scheduleMonth, setScheduleMonth] = React.useState(
    new Date().getMonth(),
  );
  const [scheduleData, setScheduleData] = React.useState<WorkSchedule[]>([]);
  const [scheduleAssignEmpId, setScheduleAssignEmpId] = React.useState("");
  const [scheduleAssignShiftId, setScheduleAssignShiftId] = React.useState("");
  const [scheduleAssignDay, setScheduleAssignDay] = React.useState(0);
  const [showScheduleModal, setShowScheduleModal] = React.useState(false);

  // Overtime approvals state
  const [overtimeLogs, setOvertimeLogs] = React.useState<OvertimeLog[]>([]);
  const [overtimeFilter, setOvertimeFilter] = React.useState<"pending" | "all">(
    "pending",
  );

  // Leave types state
  const [leaveTypes, setLeaveTypes] = React.useState<LeaveType[]>([]);
  const [newLeaveTypeName, setNewLeaveTypeName] = React.useState("");
  const [newLeaveTypeDays, setNewLeaveTypeDays] = React.useState("14");
  const [newLeaveTypeColor, setNewLeaveTypeColor] = React.useState("#22c55e");

  // Shift swaps state
  const [shiftSwaps, setShiftSwaps] = React.useState<ShiftSwap[]>([]);
  const [swapFilter, setSwapFilter] = React.useState<"pending" | "all">(
    "pending",
  );

  // Employee filter for risk
  const [empFilter, setEmpFilter] = React.useState<"all" | "risk">("all");

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
    setHolidays(getCompanyHolidays(session.id));
    setCorrectionRequests(getCompanyCorrectionRequests(session.id));
    setLeaveRequests(getCompanyLeaveRequests(session.id));
    setAuditEntries(getCompanyAuditLog(session.id));
    setMissingCheckouts(getMissingCheckouts(session.id));
    setAnnouncements(getCompanyAnnouncements(session.id));
    setLeaveBalances(getCompanyLeaveBalances(session.id));
    setOvertimeLogs(getCompanyOvertimeLogs(session.id));
    setLeaveTypes(getCompanyLeaveTypes(session.id));
    setShiftSwaps(getCompanyShiftSwaps(session.id));
  }, [session.id]);

  const loadAttendance = useCallback(() => {
    const from = filterFrom ? new Date(filterFrom).getTime() : undefined;
    const to = filterTo
      ? new Date(`${filterTo}T23:59:59`).getTime()
      : undefined;
    const empIdForFilter = filterEmpId || undefined;
    setAttendance(getCompanyAttendance(session.id, from, to, empIdForFilter));
    setLeaveRecords(
      getCompanyLeaveRecords(
        session.id,
        filterFrom || undefined,
        filterTo || undefined,
        filterEmpId || undefined,
      ),
    );
  }, [session.id, filterFrom, filterTo, filterEmpId]);

  const loadSummary = useCallback(() => {
    setSummaryData(
      getMonthlyAttendanceSummary(session.id, summaryYear, summaryMonth),
    );
  }, [session.id, summaryYear, summaryMonth]);

  useEffect(() => {
    loadData();
    const comp = getCompany(session.id);
    if (comp?.workHours) {
      setWorkStart(comp.workHours.start);
      setWorkEnd(comp.workHours.end);
    }
    if (comp?.workDays) {
      setWorkDays(comp.workDays);
    }
  }, [loadData, session.id]);

  // Auto-checkout interval
  useEffect(() => {
    const interval = setInterval(() => {
      const comp = getCompany(session.id);
      if (!comp?.autoCheckout?.enabled) return;
      const now = new Date();
      const checkedIn = getCheckedInEmployees(session.id);
      for (const { employee, checkinTimestamp } of checkedIn) {
        const assignedShiftId = employee.assignedShifts?.[session.id];
        const assignedShift = assignedShiftId
          ? (comp.shifts || []).find((s) => s.id === assignedShiftId)
          : undefined;
        const endTimeStr =
          employee.personalWorkHours?.[session.id]?.end ||
          assignedShift?.endTime ||
          comp.workHours?.end;
        if (!endTimeStr) continue;
        const [endH, endM] = endTimeStr.split(":").map(Number);
        const shiftEndToday = new Date(now);
        shiftEndToday.setHours(endH, endM, 0, 0);
        if (now > shiftEndToday) {
          const dateStr = now.toISOString().split("T")[0];
          if (comp.autoCheckout?.mode === "auto") {
            addAutoCheckoutRecord(
              employee.id,
              employee.fullName,
              session.id,
              shiftEndToday.getTime(),
            );
            addAuditEntry({
              timestamp: Date.now(),
              actorType: "company",
              actorId: session.id,
              actorName: session.name,
              companyId: session.id,
              action: "auto_checkout",
              details: `Auto check-out: ${employee.fullName} at ${endTimeStr}`,
            });
          } else {
            addMissingCheckoutFlag({
              employeeId: employee.id,
              employeeName: employee.fullName,
              companyId: session.id,
              date: dateStr,
              checkinTimestamp,
            });
          }
          loadData();
        }
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [session.id, session.name, loadData]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

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

  function handleSaveWorkHours() {
    if (!workStart || !workEnd) {
      toast.error(t("error"));
      return;
    }
    setSavingWorkHours(true);
    const res = updateCompanyWorkHours(session.id, workStart, workEnd);
    setSavingWorkHours(false);
    if (res.ok) toast.success(t("workHoursSaved") || t("success"));
    else toast.error(res.message);
  }

  function handleSaveWorkDays() {
    if (workDays.length === 0) {
      toast.error(t("error"));
      return;
    }
    setSavingWorkDays(true);
    const res = updateCompanyWorkDays(session.id, workDays);
    setSavingWorkDays(false);
    if (res.ok) toast.success(t("workDaysSaved"));
    else toast.error(res.message);
  }

  function handleSaveDepartment(empId: string) {
    const res = updateEmployeeDepartment(empId, session.id, editDeptValue);
    if (res.ok) {
      toast.success(t("departmentSaved"));
      setEditDeptEmpId("");
      setEditDeptValue("");
      loadData();
    } else toast.error(res.message);
  }

  function handleExportPDF() {
    const compName = company?.name || "StafFlow";
    const headers = [t("employee"), t("type"), t("date"), t("duration")];
    const rows = attendance.map((rec) => [
      rec.employeeName,
      rec.recordType === "checkin" ? t("checkinType") : t("checkoutType"),
      formatDate(rec.timestamp),
      getRecordDuration(rec, allAttendance),
    ]);
    const tableRows = rows
      .map(
        (r) =>
          `<tr>${r.map((cell) => `<td style="border:1px solid #ddd;padding:6px 10px;font-size:12px">${cell}</td>`).join("")}</tr>`,
      )
      .join("");
    const html = `<!DOCTYPE html><html><head><title>${compName} - ${t("attendance")}</title><style>body{font-family:sans-serif;padding:20px}h1{font-size:18px}table{border-collapse:collapse;width:100%}th{background:#2563eb;color:#fff;padding:8px 10px;text-align:left;font-size:12px}@media print{button{display:none}}</style></head><body><h1>${compName} - ${t("attendance")}</h1><p style="font-size:12px;color:#888">${new Date().toLocaleDateString()}</p><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${tableRows}</tbody></table><br/><button onclick="window.print()">Print / Save as PDF</button></body></html>`;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }

  function handleAddLeave() {
    if (!leaveEmpId || !leaveDate) {
      toast.error(t("error"));
      return;
    }
    setSavingLeave(true);
    const res = addLeaveRecord(
      session.id,
      leaveEmpId,
      leaveDate,
      leaveType,
      leaveNote,
    );
    setSavingLeave(false);
    if (res.ok) {
      toast.success(t("success"));
      setShowAddLeave(false);
      setLeaveEmpId("");
      setLeaveDate("");
      setLeaveType("leave");
      setLeaveNote("");
      loadAttendance();
    } else {
      toast.error(res.message);
    }
  }

  function handleDeleteLeave(id: string) {
    const res = deleteLeaveRecord(id, session.id);
    if (res.ok) {
      toast.success(t("success"));
      loadAttendance();
    } else toast.error(res.message);
  }

  function handleExportBackup() {
    const json = exportAllData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const d = new Date().toISOString().split("T")[0];
    a.download = `stafflow-backup-${d}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("backupSuccess"));
  }

  function handleRestoreBackup() {
    if (!restoreFile) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const res = importAllData(text);
      if (res.ok) {
        toast.success(t("restoreSuccess"));
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error(t("restoreError"));
      }
    };
    reader.readAsText(restoreFile);
    setShowRestoreConfirm(false);
    setRestoreFile(null);
  }

  function handleToggleActive(empId: string) {
    const emp = employees.find((e) => e.id === empId);
    const res = toggleEmployeeActive(empId, session.id);
    if (res.ok) {
      toast.success(res.active ? t("activate") : t("deactivate"));
      if (emp) {
        addAuditEntry({
          timestamp: Date.now(),
          actorType: "company",
          actorId: session.id,
          actorName: session.name,
          companyId: session.id,
          action: res.active ? "employee_activated" : "employee_deactivated",
          details: `${emp.fullName} ${res.active ? "activated" : "deactivated"}`,
        });
      }
      loadData();
    } else toast.error(res.message);
  }

  function handleAddShift() {
    if (!newShiftName.trim() || !newShiftStart || !newShiftEnd) {
      toast.error(t("error"));
      return;
    }
    const comp = getCompany(session.id);
    const existing = comp?.shifts || [];
    const newShift: Shift = {
      id: String(Date.now()),
      name: newShiftName.trim(),
      startTime: newShiftStart,
      endTime: newShiftEnd,
    };
    const res = updateCompanyShifts(session.id, [...existing, newShift]);
    if (res.ok) {
      toast.success(t("shiftSaved"));
      setNewShiftName("");
      setNewShiftStart("08:00");
      setNewShiftEnd("17:00");
      loadData();
    } else toast.error(res.message);
  }

  function handleDeleteShift(shiftId: string) {
    const comp = getCompany(session.id);
    const updated = (comp?.shifts || []).filter((s) => s.id !== shiftId);
    const res = updateCompanyShifts(session.id, updated);
    if (res.ok) {
      toast.success(t("success"));
      loadData();
    } else toast.error(res.message);
  }

  function handleAssignShift(empId: string, shiftId: string) {
    const emp = employees.find((e) => e.id === empId);
    assignEmployeeShift(empId, session.id, shiftId);
    if (emp) {
      const shift = (company?.shifts || []).find((s) => s.id === shiftId);
      addAuditEntry({
        timestamp: Date.now(),
        actorType: "company",
        actorId: session.id,
        actorName: session.name,
        companyId: session.id,
        action: "shift_changed",
        details: `Shift changed for ${emp.fullName}: ${shift ? shift.name : "none"}`,
      });
    }
    loadData();
  }

  function handleSaveMinHours() {
    const val = Number.parseFloat(minDailyHoursValue);
    if (Number.isNaN(val) || val < 0) {
      toast.error(t("error"));
      return;
    }
    setSavingMinHours(true);
    const res = updateCompanyMinHours(session.id, val);
    setSavingMinHours(false);
    if (res.ok) toast.success(t("minHoursSaved"));
    else toast.error(res.message);
  }

  function handleAddHoliday() {
    if (!newHolidayDate || !newHolidayName.trim()) {
      toast.error(t("error"));
      return;
    }
    const res = addPublicHoliday(session.id, newHolidayDate, newHolidayName);
    if (res.ok) {
      toast.success(t("holidaySaved"));
      setNewHolidayDate("");
      setNewHolidayName("");
      loadData();
      // refresh summary too
      loadSummary();
    } else toast.error(res.message);
  }

  function handleDeleteHoliday(id: string) {
    const res = deletePublicHoliday(id, session.id);
    if (res.ok) {
      toast.success(t("holidayDeleted"));
      loadData();
      loadSummary();
    } else toast.error(res.message);
  }

  function handleApproveCorrection(id: string) {
    const req = correctionRequests.find((r) => r.id === id);
    const res = approveCorrectionRequest(id, session.id);
    if (res.ok) {
      toast.success(t("correctionApproved"));
      if (req) {
        addAuditEntry({
          timestamp: Date.now(),
          actorType: "company",
          actorId: session.id,
          actorName: session.name,
          companyId: session.id,
          action: "correction_approved",
          details: `Correction approved for ${req.employeeName}: ${req.requestType} on ${req.requestedDate} ${req.requestedTime}`,
        });
      }
      loadData();
      loadAttendance();
    } else toast.error(res.message);
  }

  function handleRejectCorrection(id: string) {
    const req = correctionRequests.find((r) => r.id === id);
    const res = rejectCorrectionRequest(id, session.id, rejectionNote);
    if (res.ok) {
      toast.success(t("correctionRejected"));
      if (req) {
        addAuditEntry({
          timestamp: Date.now(),
          actorType: "company",
          actorId: session.id,
          actorName: session.name,
          companyId: session.id,
          action: "correction_rejected",
          details: `Correction rejected for ${req.employeeName}: ${req.requestType} on ${req.requestedDate} ${req.requestedTime}`,
        });
      }
      setRejectingId("");
      setRejectionNote("");
      loadData();
    } else toast.error(res.message);
  }

  function openPersonalRules(emp: Employee) {
    if (expandedPersonalEmpId === emp.id) {
      setExpandedPersonalEmpId("");
      return;
    }
    setExpandedPersonalEmpId(emp.id);
    const ph = emp.personalWorkHours?.[session.id];
    setPersonalStart(ph?.start || "");
    setPersonalEnd(ph?.end || "");
    setPersonalMinH(String(emp.personalMinHours?.[session.id] ?? ""));
  }

  function handleSavePersonalRules(empId: string) {
    setSavingPersonal(true);
    let ok = true;
    if (personalStart && personalEnd) {
      const res = updateEmployeePersonalWorkHours(
        empId,
        session.id,
        personalStart,
        personalEnd,
      );
      if (!res.ok) ok = false;
    } else {
      // clear if both are empty
      if (!personalStart && !personalEnd) {
        clearEmployeePersonalWorkHours(empId, session.id);
      }
    }
    if (personalMinH !== "") {
      const val = Number.parseFloat(personalMinH);
      if (!Number.isNaN(val) && val >= 0) {
        updateEmployeePersonalMinHours(empId, session.id, val);
      }
    }
    setSavingPersonal(false);
    if (ok) {
      toast.success(t("personalRulesSaved"));
      const emp = employees.find((e) => e.id === empId);
      if (emp) {
        addAuditEntry({
          timestamp: Date.now(),
          actorType: "company",
          actorId: session.id,
          actorName: session.name,
          companyId: session.id,
          action: "personal_rules_changed",
          details: `Personal rules updated for ${emp.fullName}`,
        });
      }
      setExpandedPersonalEmpId("");
      loadData();
    } else {
      toast.error(t("error"));
    }
  }

  function handleSaveAutoCheckout() {
    setSavingAutoCheckout(true);
    const res = updateCompanyAutoCheckout(
      session.id,
      autoCheckoutEnabled,
      autoCheckoutMode,
    );
    setSavingAutoCheckout(false);
    if (res.ok) {
      toast.success(t("autoCheckoutSaved"));
      addAuditEntry({
        timestamp: Date.now(),
        actorType: "company",
        actorId: session.id,
        actorName: session.name,
        companyId: session.id,
        action: "auto_checkout_settings_changed",
        details: `Auto checkout: ${autoCheckoutEnabled ? "enabled" : "disabled"}, mode: ${autoCheckoutMode}`,
      });
      loadData();
    } else toast.error(res.message);
  }

  // Statistics computations
  function getWeeklyTrendData() {
    const data: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);
      const count = allAttendance.filter(
        (r) =>
          r.recordType === "checkin" &&
          r.timestamp >= d.getTime() &&
          r.timestamp < nextD.getTime(),
      ).length;
      data.push({
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        count,
      });
    }
    return data;
  }

  function getDepartmentAttendanceData() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const summary = getMonthlyAttendanceSummary(session.id, year, month);
    const deptMap: Record<string, { attended: number; total: number }> = {};
    for (const row of summary) {
      const dept = row.employee.departments?.[session.id] || "Genel";
      if (!deptMap[dept]) deptMap[dept] = { attended: 0, total: 0 };
      deptMap[dept].total += 1;
      if (row.daysAttended > 0) deptMap[dept].attended += 1;
    }
    return Object.entries(deptMap).map(([dept, { attended, total }]) => ({
      dept,
      rate: total > 0 ? Math.round((attended / total) * 100) : 0,
    }));
  }

  function getTopEmployeesData() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const summary = getMonthlyAttendanceSummary(session.id, year, month);
    return summary
      .sort((a, b) => b.totalWorkMinutes - a.totalWorkMinutes)
      .slice(0, 5)
      .map((row) => ({
        name: row.employee.fullName.split(" ")[0],
        hours: Math.round((row.totalWorkMinutes / 60) * 10) / 10,
      }));
  }

  const activeInvites = inviteCodes.filter(
    (c) => getInviteCodeStatus(c) === "active",
  ).length;

  const lateEmployees = checkedInList.filter(
    ({ checkinTimestamp }) =>
      Date.now() - checkinTimestamp > LATE_THRESHOLD_HOURS * 60 * 60 * 1000,
  );

  const currentWorkHours = company?.workHours;

  const pendingCorrections = correctionRequests.filter(
    (r) => r.status === "pending",
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
    { key: "summary", label: t("summary"), icon: <Pencil size={16} /> },
    {
      key: "statistics",
      label: t("statistics"),
      icon: <TrendingUp size={16} />,
    },
    {
      key: "corrections",
      label: t("correctionRequests"),
      icon: <ClipboardList size={16} />,
    },
    {
      key: "leaverequests",
      label: t("leaveRequests"),
      icon: <Calendar size={16} />,
    },
    { key: "payroll", label: t("payroll"), icon: <Database size={16} /> },
    { key: "alerts", label: t("alerts"), icon: <AlertTriangle size={16} /> },
    {
      key: "auditlog",
      label: t("auditLogTab"),
      icon: <ScrollText size={16} />,
    },
    {
      key: "announcements",
      label: t("announcements"),
      icon: <Megaphone size={16} />,
    },
    {
      key: "schedule",
      label: t("scheduleTab"),
      icon: <CalendarDays size={16} />,
    },
    {
      key: "overtimeapprovals",
      label: t("overtimeApprovals"),
      icon: <Clock size={16} />,
    },
    { key: "settings", label: t("settings"), icon: <Settings size={16} /> },
    { key: "shiftswap", label: t("shiftSwap"), icon: <Users size={16} /> },
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
            data-ocid={`${tb.key}.tab`}
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
            {tb.key === "corrections" && pendingCorrections.length > 0 && (
              <span className="ml-1 bg-orange-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {pendingCorrections.length}
              </span>
            )}
            {tb.key === "leaverequests" &&
              leaveRequests.filter((r) => r.status === "pending").length >
                0 && (
                <span className="ml-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {leaveRequests.filter((r) => r.status === "pending").length}
                </span>
              )}
            {tb.key === "overtimeapprovals" &&
              overtimeLogs.filter((l) => l.status === "pending").length > 0 && (
                <span className="ml-1 bg-orange-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {overtimeLogs.filter((l) => l.status === "pending").length}
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
            <div className="mt-4">
              <button
                type="button"
                data-ocid="overview.primary_button"
                onClick={() => setKioskMode(true)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
              >
                <Building2 size={16} />
                {t("startKioskMode")}
              </button>
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
            {currentWorkHours && (
              <div className="mt-4 bg-card border border-border rounded-xl p-4 flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  {t("workHours")}:
                </div>
                <div className="font-mono font-semibold text-blue-400">
                  {currentWorkHours.start} – {currentWorkHours.end}
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
                data-ocid="invites.open_modal_button"
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
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{t("employees")}</h2>
              <button
                type="button"
                onClick={() => setShowInactive(!showInactive)}
                className="flex items-center gap-2 text-sm border border-border px-3 py-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground"
              >
                {showInactive ? <EyeOff size={14} /> : <Users size={14} />}
                {showInactive ? t("hideInactive") : t("showInactive")}
              </button>
              <button
                type="button"
                onClick={() => setEmpFilter("all")}
                className={`flex items-center gap-2 text-sm border px-3 py-2 rounded-xl hover:bg-muted transition-colors ${empFilter === "all" ? "border-blue-500 text-blue-400 bg-blue-500/10" : "border-border text-muted-foreground"}`}
              >
                {t("allEmployees")}
              </button>
              <button
                type="button"
                onClick={() => setEmpFilter("risk")}
                className={`flex items-center gap-2 text-sm border px-3 py-2 rounded-xl hover:bg-muted transition-colors ${empFilter === "risk" ? "border-red-500 text-red-400 bg-red-500/10" : "border-border text-muted-foreground"}`}
              >
                {t("riskPersonnel")}
              </button>
            </div>
            {selectedEmployees.size > 0 && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 mb-4 flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-blue-400">
                  {selectedEmployees.size} {t("selected")}
                </span>
                <div className="flex flex-wrap gap-2 flex-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={bulkDept}
                      onChange={(e) => setBulkDept(e.target.value)}
                      placeholder={t("bulkSetDepartment")}
                      data-ocid="employees.input"
                      className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs w-36 focus:outline-none"
                    />
                    <button
                      type="button"
                      data-ocid="employees.primary_button"
                      onClick={() => {
                        if (!bulkDept.trim()) return;
                        for (const id of selectedEmployees)
                          updateEmployeeDepartment(id, session.id, bulkDept);
                        toast.success(t("success"));
                        setBulkDept("");
                        setSelectedEmployees(new Set());
                        loadData();
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg"
                    >
                      {t("applyBulkAction")}
                    </button>
                  </div>
                  {(company?.shifts?.length ?? 0) > 0 && (
                    <div className="flex items-center gap-2">
                      <select
                        value={bulkShiftId}
                        onChange={(e) => setBulkShiftId(e.target.value)}
                        className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                      >
                        <option value="">{t("bulkAssignShift")}</option>
                        {(company?.shifts ?? []).map((sh) => (
                          <option key={sh.id} value={sh.id}>
                            {sh.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          if (!bulkShiftId) return;
                          for (const id of selectedEmployees)
                            assignEmployeeShift(id, session.id, bulkShiftId);
                          toast.success(t("success"));
                          setBulkShiftId("");
                          setSelectedEmployees(new Set());
                          loadData();
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg"
                      >
                        {t("applyBulkAction")}
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={bulkLeaveDate}
                      onChange={(e) => setBulkLeaveDate(e.target.value)}
                      className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                    />
                    <select
                      value={bulkLeaveType}
                      onChange={(e) =>
                        setBulkLeaveType(e.target.value as LeaveRecord["type"])
                      }
                      className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                    >
                      <option value="leave">{t("leaveTypeLeave")}</option>
                      <option value="sick">{t("leaveTypeSick")}</option>
                      <option value="excuse">{t("leaveTypeExcuse")}</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (!bulkLeaveDate) return;
                        for (const id of selectedEmployees)
                          addLeaveRecord(
                            session.id,
                            id,
                            bulkLeaveDate,
                            bulkLeaveType,
                          );
                        toast.success(t("success"));
                        setBulkLeaveDate("");
                        setSelectedEmployees(new Set());
                        loadData();
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded-lg"
                    >
                      {t("bulkAddLeave")}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      for (const id of selectedEmployees)
                        toggleEmployeeActive(id, session.id);
                      toast.success(t("success"));
                      setSelectedEmployees(new Set());
                      loadData();
                    }}
                    className="border border-orange-500/40 text-orange-400 hover:bg-orange-500/10 text-xs px-3 py-1.5 rounded-lg"
                  >
                    {t("bulkToggleActive")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedEmployees(new Set())}
                    className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5"
                  >
                    {t("cancel")}
                  </button>
                </div>
              </div>
            )}
            {employees.length === 0 ? (
              <EmptyState text={t("noEmployees")} />
            ) : (
              <div className="space-y-2">
                {employees
                  .filter((emp) => {
                    const activeOk = showInactive
                      ? true
                      : emp.activeInCompanies?.[session.id] !== false;
                    if (!activeOk) return false;
                    if (empFilter === "risk")
                      return getAttendanceScore(emp.id, session.id).score < 60;
                    return true;
                  })
                  .map((emp, idx) => {
                    const isActive =
                      emp.activeInCompanies?.[session.id] !== false;
                    const isIn = checkedInList.some(
                      ({ employee }) => employee.id === emp.id,
                    );
                    const isExpanded = expandedPersonalEmpId === emp.id;
                    return (
                      <div
                        key={emp.id}
                        data-ocid={`employees.item.${idx + 1}`}
                        className={`bg-card border border-border rounded-xl overflow-hidden transition-all ${
                          isActive ? "" : "opacity-50"
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedEmployees.has(emp.id)}
                            onChange={(e) => {
                              const next = new Set(selectedEmployees);
                              if (e.target.checked) next.add(emp.id);
                              else next.delete(emp.id);
                              setSelectedEmployees(next);
                            }}
                            className="rounded flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-sm">
                              {emp.fullName}
                            </span>
                            {emp.phone && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                {emp.phone}
                              </span>
                            )}
                          </div>
                          {/* Department */}
                          <div className="hidden md:block">
                            {editDeptEmpId === emp.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editDeptValue}
                                  onChange={(e) =>
                                    setEditDeptValue(e.target.value)
                                  }
                                  placeholder={t("departmentPlaceholder")}
                                  className="bg-background border border-border rounded-lg px-2 py-1 text-xs w-32 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter")
                                      handleSaveDepartment(emp.id);
                                    if (e.key === "Escape") {
                                      setEditDeptEmpId("");
                                      setEditDeptValue("");
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveDepartment(emp.id)}
                                  className="p-1 hover:bg-green-500/10 text-green-400 rounded"
                                >
                                  <Check size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditDeptEmpId("");
                                    setEditDeptValue("");
                                  }}
                                  className="p-1 hover:bg-muted rounded"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditDeptEmpId(emp.id);
                                  setEditDeptValue(
                                    emp.departments?.[session.id] || "",
                                  );
                                }}
                                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground group"
                              >
                                <span>
                                  {emp.departments?.[session.id] || "-"}
                                </span>
                                <Pencil
                                  size={10}
                                  className="opacity-0 group-hover:opacity-60"
                                />
                              </button>
                            )}
                          </div>
                          {/* Shift */}
                          <div className="hidden lg:block">
                            <select
                              value={emp.assignedShifts?.[session.id] || ""}
                              onChange={(e) =>
                                handleAssignShift(emp.id, e.target.value)
                              }
                              className="bg-background border border-border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">{t("noShift")}</option>
                              {(company?.shifts || []).map((sh) => (
                                <option key={sh.id} value={sh.id}>
                                  {sh.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          {/* Status badge */}
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                              isIn
                                ? "bg-green-500/20 text-green-400"
                                : "bg-gray-500/20 text-gray-400"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${isIn ? "bg-green-400 animate-pulse" : "bg-gray-400"}`}
                            />
                            {isIn ? t("checkedIn") : t("checkedOut")}
                          </span>
                          {/* Active toggle */}
                          <button
                            type="button"
                            data-ocid={`employees.toggle.${idx + 1}`}
                            onClick={() => handleToggleActive(emp.id)}
                            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors ${
                              isActive
                                ? "border-red-500/40 text-red-400 hover:bg-red-500/10"
                                : "border-green-500/40 text-green-400 hover:bg-green-500/10"
                            }`}
                          >
                            {isActive ? (
                              <UserX size={12} />
                            ) : (
                              <UserCheck size={12} />
                            )}
                            {isActive ? t("deactivate") : t("activate")}
                          </button>
                          {/* Leave balance */}
                          <div className="hidden lg:flex items-center gap-1">
                            {editBalanceEmpId === emp.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="365"
                                  value={editBalanceValue}
                                  onChange={(e) =>
                                    setEditBalanceValue(e.target.value)
                                  }
                                  placeholder="0"
                                  className="bg-background border border-border rounded px-2 py-1 text-xs w-16 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const days = Number.parseInt(
                                      editBalanceValue,
                                      10,
                                    );
                                    if (!Number.isNaN(days)) {
                                      setLeaveBalance(session.id, emp.id, days);
                                      toast.success(t("leaveBalanceSaved"));
                                      loadData();
                                    }
                                    setEditBalanceEmpId("");
                                    setEditBalanceValue("");
                                  }}
                                  className="p-1 hover:bg-green-500/10 text-green-400 rounded text-xs"
                                >
                                  <Check size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditBalanceEmpId("");
                                    setEditBalanceValue("");
                                  }}
                                  className="p-1 hover:bg-muted rounded text-xs"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  const bal = leaveBalances.find(
                                    (b) => b.employeeId === emp.id,
                                  );
                                  setEditBalanceEmpId(emp.id);
                                  setEditBalanceValue(
                                    bal ? String(bal.annualDays) : "",
                                  );
                                }}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground group"
                                title={t("leaveBalance")}
                              >
                                {(() => {
                                  const bal = leaveBalances.find(
                                    (b) => b.employeeId === emp.id,
                                  );
                                  return bal ? (
                                    <span className="text-xs">
                                      {bal.usedDays}/{bal.annualDays} gün
                                    </span>
                                  ) : (
                                    <span className="text-xs opacity-50">
                                      {t("setBalance")}
                                    </span>
                                  );
                                })()}
                                <Pencil
                                  size={10}
                                  className="opacity-0 group-hover:opacity-60"
                                />
                              </button>
                            )}
                          </div>
                          {/* Personal rules toggle */}
                          <button
                            type="button"
                            data-ocid={`employees.edit_button.${idx + 1}`}
                            onClick={() => openPersonalRules(emp)}
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground"
                            title={t("personalRules")}
                          >
                            <Settings size={12} />
                            {isExpanded ? (
                              <ChevronUp size={12} />
                            ) : (
                              <ChevronDown size={12} />
                            )}
                          </button>
                        </div>
                        {/* Personal rules expanded section */}
                        {isExpanded && (
                          <div className="border-t border-border bg-muted/20 px-4 py-4">
                            <div className="text-xs font-semibold text-muted-foreground mb-3">
                              {t("personalRules")}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">
                                  {t("personalWorkHours")} ({t("workStart")})
                                </div>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="time"
                                    value={personalStart}
                                    onChange={(e) =>
                                      setPersonalStart(e.target.value)
                                    }
                                    placeholder={
                                      currentWorkHours?.start || "--:--"
                                    }
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                                {!personalStart && (
                                  <div className="text-xs text-muted-foreground/60 mt-1">
                                    ({t("companyDefault")}:{" "}
                                    {currentWorkHours?.start || "—"})
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">
                                  {t("personalWorkHours")} ({t("workEnd")})
                                </div>
                                <input
                                  type="time"
                                  value={personalEnd}
                                  onChange={(e) =>
                                    setPersonalEnd(e.target.value)
                                  }
                                  placeholder={currentWorkHours?.end || "--:--"}
                                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                {!personalEnd && (
                                  <div className="text-xs text-muted-foreground/60 mt-1">
                                    ({t("companyDefault")}:{" "}
                                    {currentWorkHours?.end || "—"})
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">
                                  {t("personalMinHours")}
                                </div>
                                <input
                                  type="number"
                                  min="0"
                                  max="24"
                                  step="0.5"
                                  value={personalMinH}
                                  onChange={(e) =>
                                    setPersonalMinH(e.target.value)
                                  }
                                  placeholder={String(
                                    company?.minDailyHours || 0,
                                  )}
                                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                {!personalMinH && (
                                  <div className="text-xs text-muted-foreground/60 mt-1">
                                    ({t("companyDefault")}:{" "}
                                    {company?.minDailyHours || 0}h)
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 mt-3">
                              <button
                                type="button"
                                data-ocid={`employees.save_button.${idx + 1}`}
                                onClick={() => handleSavePersonalRules(emp.id)}
                                disabled={savingPersonal}
                                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs px-4 py-2 rounded-lg transition-colors"
                              >
                                {savingPersonal ? t("loading") : t("save")}
                              </button>
                              <button
                                type="button"
                                onClick={() => setExpandedPersonalEmpId("")}
                                className="border border-border text-muted-foreground text-xs px-4 py-2 rounded-lg hover:bg-muted transition-colors"
                              >
                                {t("cancel")}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {tab === "attendance" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{t("attendance")}</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddLeave(true)}
                  className="flex items-center gap-2 border border-blue-500/40 text-blue-400 hover:bg-blue-500/10 text-sm font-medium px-3 py-2 rounded-xl transition-colors"
                >
                  <Plus size={14} />
                  {t("addLeave")}
                </button>
                {attendance.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handleExportPDF}
                      className="flex items-center gap-2 border border-border hover:bg-muted text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                    >
                      <Download size={16} />
                      {t("exportPDF")}
                    </button>
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      className="flex items-center gap-2 border border-border hover:bg-muted text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                    >
                      <Download size={16} />
                      {t("exportCSV")}
                    </button>
                  </>
                )}
              </div>
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
              <div>
                <div className="text-xs text-muted-foreground mb-1">
                  {t("filterDepartment")}
                </div>
                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t("allDepartments")}</option>
                  {getCompanyDepartments(session.id).map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {leaveRecords.length > 0 && (
              <div className="mb-4">
                <div className="text-sm font-semibold text-muted-foreground mb-2 px-1">
                  {t("leaveType")}
                </div>
                <div className="space-y-2">
                  {leaveRecords.map((lr) => (
                    <div
                      key={lr.id}
                      className="bg-card border border-purple-500/30 rounded-xl p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            lr.type === "leave"
                              ? "bg-purple-500/20 text-purple-400"
                              : lr.type === "sick"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-yellow-500/20 text-yellow-400"
                          }`}
                        >
                          {lr.type === "leave"
                            ? t("leaveTypeLeave")
                            : lr.type === "sick"
                              ? t("leaveTypeSick")
                              : t("leaveTypeExcuse")}
                        </span>
                        <span className="font-medium text-sm">
                          {lr.employeeName}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {lr.date}
                        </span>
                        {lr.note && (
                          <span className="text-muted-foreground text-xs italic">
                            {lr.note}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteLeave(lr.id)}
                        className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {attendance.length === 0 && leaveRecords.length === 0 ? (
              <EmptyState text={t("noRecords")} />
            ) : attendance.length > 0 ? (
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
                    {attendance
                      .filter((rec) => {
                        if (!filterDepartment) return true;
                        const recEmp = employees.find(
                          (e) => e.id === rec.employeeId,
                        );
                        return (
                          recEmp?.departments?.[session.id] === filterDepartment
                        );
                      })
                      .map((rec) => {
                        const dur = getRecordDuration(rec, allAttendance);
                        const recEmp = employees.find(
                          (e) => e.id === rec.employeeId,
                        );
                        const assignedShiftId =
                          recEmp?.assignedShifts?.[session.id];
                        const assignedShift = assignedShiftId
                          ? (company?.shifts || []).find(
                              (s) => s.id === assignedShiftId,
                            )
                          : undefined;
                        // Personal work hours override > shift > company default
                        const personalHours =
                          recEmp?.personalWorkHours?.[session.id];
                        const effectiveWorkHours = personalHours
                          ? {
                              start: personalHours.start,
                              end: personalHours.end,
                            }
                          : assignedShift
                            ? {
                                start: assignedShift.startTime,
                                end: assignedShift.endTime,
                              }
                            : currentWorkHours;
                        const late =
                          effectiveWorkHours && rec.recordType === "checkin"
                            ? isLateCheckin(
                                rec.timestamp,
                                effectiveWorkHours.start,
                              )
                            : false;
                        const early =
                          effectiveWorkHours && rec.recordType === "checkout"
                            ? isEarlyCheckout(
                                rec.timestamp,
                                effectiveWorkHours.end,
                              )
                            : false;
                        const durMinutes = getRecordDurationMinutes(
                          rec,
                          allAttendance,
                        );
                        const empMinHours =
                          recEmp?.personalMinHours?.[session.id] ??
                          company?.minDailyHours ??
                          0;
                        const insufficientHours =
                          rec.recordType === "checkout" &&
                          empMinHours > 0 &&
                          durMinutes > 0 &&
                          durMinutes < empMinHours * 60;
                        const overtime =
                          effectiveWorkHours && rec.recordType === "checkout"
                            ? getOvertimeMinutes(
                                0,
                                rec.timestamp,
                                effectiveWorkHours.end,
                              )
                            : 0;
                        return (
                          <tr
                            key={rec.id}
                            className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                          >
                            <td className="px-4 py-3 font-medium">
                              {rec.employeeName}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2 flex-wrap">
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
                                {late && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-medium">
                                    {t("lateCheckin")}
                                  </span>
                                )}
                                {early && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-medium">
                                    {t("earlyCheckout")}
                                  </span>
                                )}
                                {insufficientHours && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">
                                    {t("insufficientHours")}
                                  </span>
                                )}
                                {overtime > 0 && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-medium">
                                    {t("overtime")}: {overtime}dk
                                  </span>
                                )}
                                {rec.recordType === "checkin" &&
                                  missingCheckouts.some(
                                    (mc) =>
                                      mc.employeeId === rec.employeeId &&
                                      mc.date ===
                                        new Date(rec.timestamp)
                                          .toISOString()
                                          .split("T")[0],
                                  ) && (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">
                                      {t("missingCheckout")}
                                    </span>
                                  )}
                              </div>
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
            ) : null}
          </div>
        )}

        {tab === "summary" && (
          <div>
            <h2 className="text-xl font-bold mb-6">{t("summary")}</h2>
            <div className="flex items-center gap-4 mb-6">
              <div>
                <div className="text-xs text-muted-foreground mb-1">
                  {t("selectMonth")}
                </div>
                <select
                  value={summaryMonth}
                  onChange={(e) => setSummaryMonth(Number(e.target.value))}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  {([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const).map(
                    (m) => (
                      <option key={m} value={m}>
                        {new Date(2000, m, 1).toLocaleString(lang, {
                          month: "long",
                        })}
                      </option>
                    ),
                  )}
                </select>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">
                  {t("selectYear")}
                </div>
                <select
                  value={summaryYear}
                  onChange={(e) => setSummaryYear(Number(e.target.value))}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  {[
                    new Date().getFullYear() - 1,
                    new Date().getFullYear(),
                    new Date().getFullYear() + 1,
                  ].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {summaryData.length === 0 ? (
              <EmptyState text={t("noEmployees")} />
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                        {t("employee")}
                      </th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                        {t("daysAttended")}
                      </th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                        {t("daysAbsent")}
                      </th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                        {t("leaveDays")}
                      </th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                        {t("totalWorkHours")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryData.map((row) => (
                      <tr
                        key={row.employee.id}
                        className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium">
                          {row.employee.fullName}
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-green-500/10 text-green-400 px-2 py-0.5 rounded text-xs font-mono">
                            {row.daysAttended}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-mono ${row.daysAbsent > 0 ? "bg-red-500/10 text-red-400" : "bg-muted text-muted-foreground"}`}
                          >
                            {row.daysAbsent}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded text-xs font-mono">
                            {row.leaveDays}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {Math.floor(row.totalWorkMinutes / 60)}s{" "}
                          {row.totalWorkMinutes % 60}d
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "statistics" && (
          <div>
            <h2 className="text-xl font-bold mb-6">{t("statistics")}</h2>
            <div className="space-y-8">
              {/* Weekly Trend */}
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="font-semibold mb-4">{t("weeklyTrend")}</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={getWeeklyTrendData()}
                    margin={{ top: 0, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.05)"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "#888" }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#888" }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#1a1a2e",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        fontSize: 12,
                      }}
                      labelStyle={{ color: "#aaa" }}
                    />
                    <Bar
                      dataKey="count"
                      name={t("checkinsCount")}
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Department Attendance Rate */}
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="font-semibold mb-4">
                  {t("departmentAttendance")}
                </div>
                {getDepartmentAttendanceData().length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    {t("noEmployees")}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={getDepartmentAttendanceData()}
                      margin={{ top: 0, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.05)"
                      />
                      <XAxis
                        dataKey="dept"
                        tick={{ fontSize: 11, fill: "#888" }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#888" }}
                        domain={[0, 100]}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#1a1a2e",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                          fontSize: 12,
                        }}
                        labelStyle={{ color: "#aaa" }}
                      />
                      <Bar
                        dataKey="rate"
                        name={t("attendanceRate")}
                        fill="#22c55e"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Top 5 Employees by Work Hours */}
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="font-semibold mb-4">{t("topEmployees")}</div>
                {getTopEmployeesData().length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    {t("noRecords")}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={getTopEmployeesData()}
                      layout="vertical"
                      margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.05)"
                      />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: "#888" }}
                      />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tick={{ fontSize: 11, fill: "#888" }}
                        width={60}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#1a1a2e",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                          fontSize: 12,
                        }}
                        labelStyle={{ color: "#aaa" }}
                      />
                      <Bar
                        dataKey="hours"
                        name={t("workHoursLabel")}
                        fill="#f97316"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "corrections" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{t("correctionRequests")}</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCorrectionFilter("pending")}
                  className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                    correctionFilter === "pending"
                      ? "bg-orange-500/20 border-orange-500/40 text-orange-400"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {t("pending")} ({pendingCorrections.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCorrectionFilter("all")}
                  className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                    correctionFilter === "all"
                      ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {t("attendance")} ({correctionRequests.length})
                </button>
              </div>
            </div>
            {(() => {
              const filtered =
                correctionFilter === "pending"
                  ? correctionRequests.filter((r) => r.status === "pending")
                  : correctionRequests;
              if (filtered.length === 0)
                return <EmptyState text={t("noCorrectionRequests")} />;
              return (
                <div className="space-y-3">
                  {filtered.map((req) => (
                    <div
                      key={req.id}
                      className="bg-card border border-border rounded-xl p-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">
                              {req.employeeName}
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
                            <span
                              className={
                                "text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground"
                              }
                            >
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
                          <div className="text-xs text-muted-foreground/60 mt-1">
                            {formatDate(req.createdAt)}
                          </div>
                          {req.documentBase64 && (
                            <div className="mt-1">
                              <a
                                href={req.documentBase64}
                                download={req.documentName || "document"}
                                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                              >
                                <Paperclip size={12} />
                                {req.documentName || t("viewDocument")}
                              </a>
                            </div>
                          )}
                          {req.rejectionNote && (
                            <div className="text-xs text-red-400 mt-1">
                              {t("rejectionNote")}: {req.rejectionNote}
                            </div>
                          )}
                        </div>
                        {req.status === "pending" && (
                          <div className="flex items-center gap-2">
                            {rejectingId === req.id ? (
                              <div className="flex flex-col gap-2">
                                <input
                                  type="text"
                                  value={rejectionNote}
                                  onChange={(e) =>
                                    setRejectionNote(e.target.value)
                                  }
                                  placeholder={t("rejectionNote")}
                                  className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-red-500 w-48"
                                />
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRejectCorrection(req.id)
                                    }
                                    className="text-xs px-3 py-1.5 bg-red-500/20 border border-red-500/40 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                                  >
                                    {t("reject")}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRejectingId("");
                                      setRejectionNote("");
                                    }}
                                    className="text-xs px-3 py-1.5 border border-border text-muted-foreground rounded-lg hover:bg-muted transition-colors"
                                  >
                                    {t("cancel")}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  data-ocid="corrections.confirm_button"
                                  onClick={() =>
                                    handleApproveCorrection(req.id)
                                  }
                                  className="text-xs px-3 py-1.5 bg-green-500/20 border border-green-500/40 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                                >
                                  {t("approve")}
                                </button>
                                <button
                                  type="button"
                                  data-ocid="corrections.delete_button"
                                  onClick={() => {
                                    setRejectingId(req.id);
                                    setRejectionNote("");
                                  }}
                                  className="text-xs px-3 py-1.5 bg-red-500/20 border border-red-500/40 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                                >
                                  {t("reject")}
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {tab === "leaverequests" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{t("leaveRequests")}</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLeaveReqFilter("pending")}
                  className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${leaveReqFilter === "pending" ? "bg-blue-500/20 border-blue-500/40 text-blue-400" : "border-border text-muted-foreground hover:bg-muted"}`}
                >
                  {t("pending")} (
                  {leaveRequests.filter((r) => r.status === "pending").length})
                </button>
                <button
                  type="button"
                  onClick={() => setLeaveReqFilter("all")}
                  className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${leaveReqFilter === "all" ? "bg-blue-500/20 border-blue-500/40 text-blue-400" : "border-border text-muted-foreground hover:bg-muted"}`}
                >
                  {t("allEmployees")}
                </button>
              </div>
            </div>
            {(() => {
              const filtered =
                leaveReqFilter === "pending"
                  ? leaveRequests.filter((r) => r.status === "pending")
                  : leaveRequests;
              if (filtered.length === 0)
                return (
                  <div
                    data-ocid="leaverequests.empty_state"
                    className="text-center py-16 text-muted-foreground"
                  >
                    <div className="text-4xl mb-3">📋</div>
                    <div>{t("noRecords")}</div>
                  </div>
                );
              return (
                <div className="space-y-3">
                  {filtered.map((req) => (
                    <div
                      key={req.id}
                      data-ocid="leaverequests.row"
                      className="bg-card border border-border rounded-xl p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {req.employeeName}
                            </span>
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
                          {req.documentBase64 && (
                            <div className="mt-1">
                              <a
                                href={req.documentBase64}
                                download={req.documentName || "document"}
                                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                              >
                                <Paperclip size={12} />
                                {req.documentName || t("viewDocument")}
                              </a>
                            </div>
                          )}
                          {req.rejectionNote && (
                            <div className="text-xs text-red-400 mt-1">
                              {t("rejectionNote")}: {req.rejectionNote}
                            </div>
                          )}
                        </div>
                        {req.status === "pending" && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              data-ocid="leaverequests.confirm_button"
                              onClick={() => {
                                const res = approveLeaveRequest(
                                  req.id,
                                  session.id,
                                );
                                if (res.ok) {
                                  toast.success(t("correctionApproved"));
                                  loadData();
                                }
                              }}
                              className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
                            >
                              <Check size={12} /> {t("approveRequest")}
                            </button>
                            {rejectingLeaveId === req.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={leaveRejectionNote}
                                  onChange={(e) =>
                                    setLeaveRejectionNote(e.target.value)
                                  }
                                  placeholder={t("rejectionNote")}
                                  className="bg-background border border-border rounded-lg px-2 py-1 text-xs w-32 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  data-ocid="leaverequests.delete_button"
                                  onClick={() => {
                                    const res = rejectLeaveRequest(
                                      req.id,
                                      session.id,
                                      leaveRejectionNote,
                                    );
                                    if (res.ok) {
                                      toast.success(t("correctionRejected"));
                                      setRejectingLeaveId("");
                                      setLeaveRejectionNote("");
                                      loadData();
                                    }
                                  }}
                                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
                                >
                                  {t("rejectRequest")}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRejectingLeaveId("");
                                    setLeaveRejectionNote("");
                                  }}
                                  className="text-xs text-muted-foreground hover:text-foreground px-2 py-2 rounded-lg"
                                >
                                  {t("cancel")}
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setRejectingLeaveId(req.id)}
                                className="flex items-center gap-1 border border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs font-medium px-3 py-2 rounded-lg transition-colors"
                              >
                                <X size={12} /> {t("rejectRequest")}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {tab === "payroll" && company && (
          <PayrollReport companyId={session.id} company={company} t={t} />
        )}

        {tab === "auditlog" && (
          <div>
            <h2 className="text-xl font-bold mb-6">{t("auditLog")}</h2>
            <div className="bg-card border border-border rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">
                  {t("from")}
                </div>
                <input
                  type="date"
                  value={auditFilterFrom}
                  onChange={(e) => setAuditFilterFrom(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">
                  {t("to")}
                </div>
                <input
                  type="date"
                  value={auditFilterTo}
                  onChange={(e) => setAuditFilterTo(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">
                  {t("filterAction")}
                </div>
                <input
                  type="text"
                  value={auditFilterAction}
                  onChange={(e) => setAuditFilterAction(e.target.value)}
                  placeholder={t("allActions")}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            {(() => {
              const filtered = auditEntries.filter((e) => {
                if (
                  auditFilterFrom &&
                  new Date(e.timestamp).toISOString().split("T")[0] <
                    auditFilterFrom
                )
                  return false;
                if (
                  auditFilterTo &&
                  new Date(e.timestamp).toISOString().split("T")[0] >
                    auditFilterTo
                )
                  return false;
                if (
                  auditFilterAction &&
                  !e.action
                    .toLowerCase()
                    .includes(auditFilterAction.toLowerCase()) &&
                  !e.details
                    .toLowerCase()
                    .includes(auditFilterAction.toLowerCase())
                )
                  return false;
                return true;
              });
              if (filtered.length === 0)
                return <EmptyState text={t("noAuditLogs")} />;
              return (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                          {t("date")}
                        </th>
                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                          {t("auditActor")}
                        </th>
                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                          {t("auditAction")}
                        </th>
                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                          {t("auditDetails")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((entry, idx) => (
                        <tr
                          key={entry.id}
                          data-ocid={`auditlog.item.${idx + 1}`}
                          className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                        >
                          <td className="px-4 py-3 text-muted-foreground text-xs font-mono whitespace-nowrap">
                            {formatDate(entry.timestamp)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-sm">
                              {entry.actorName}
                            </span>
                            <span
                              className={`ml-2 text-xs px-1.5 py-0.5 rounded ${entry.actorType === "company" ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400"}`}
                            >
                              {entry.actorType}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                              {entry.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {entry.details}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}

        {tab === "alerts" && company && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{t("alertsPanel")}</h2>
            </div>
            <AlertsPanel companyId={session.id} company={company} t={t} />
          </div>
        )}

        {tab === "announcements" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{t("announcements")}</h2>
            </div>

            {/* Add announcement form */}
            <div className="bg-card border border-border rounded-xl p-4 mb-6 max-w-lg">
              <h3 className="font-semibold text-sm mb-3">
                {t("addAnnouncement")}
              </h3>
              <input
                type="text"
                value={newAnnTitle}
                onChange={(e) => setNewAnnTitle(e.target.value)}
                placeholder={t("announcementTitle")}
                data-ocid="announcements.input"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                value={newAnnContent}
                onChange={(e) => setNewAnnContent(e.target.value)}
                placeholder={t("announcementContent")}
                rows={3}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newAnnPinned}
                    onChange={(e) => setNewAnnPinned(e.target.checked)}
                    data-ocid="announcements.checkbox"
                    className="rounded"
                  />
                  <Pin size={12} />
                  {t("pinnedAnnouncement")}
                </label>
                <button
                  type="button"
                  data-ocid="announcements.submit_button"
                  disabled={savingAnn || !newAnnTitle.trim()}
                  onClick={() => {
                    if (!newAnnTitle.trim()) return;
                    setSavingAnn(true);
                    const res = addAnnouncement(
                      session.id,
                      newAnnTitle,
                      newAnnContent,
                      newAnnPinned,
                    );
                    if (res.ok) {
                      toast.success(t("announcementAdded"));
                      setNewAnnTitle("");
                      setNewAnnContent("");
                      setNewAnnPinned(false);
                      loadData();
                    } else {
                      toast.error(res.message);
                    }
                    setSavingAnn(false);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                >
                  {t("addAnnouncement")}
                </button>
              </div>
            </div>

            {/* Announcement list */}
            {announcements.length === 0 ? (
              <div
                data-ocid="announcements.empty_state"
                className="text-center py-10 text-muted-foreground"
              >
                <div className="text-3xl mb-2">📢</div>
                <div>{t("noAnnouncements")}</div>
              </div>
            ) : (
              <div className="space-y-3 max-w-lg">
                {announcements.map((ann, idx) => (
                  <div
                    key={ann.id}
                    data-ocid={`announcements.item.${idx + 1}`}
                    className={`bg-card border rounded-xl p-4 ${ann.pinned ? "border-blue-500/40" : "border-border"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {ann.pinned && (
                            <Pin
                              size={12}
                              className="text-blue-400 flex-shrink-0"
                            />
                          )}
                          <span className="font-semibold text-sm">
                            {ann.title}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {ann.content}
                        </p>
                        <div className="text-xs text-muted-foreground/60 mt-1">
                          {new Date(ann.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        type="button"
                        data-ocid={`announcements.delete_button.${idx + 1}`}
                        onClick={() => {
                          deleteAnnouncement(ann.id, session.id);
                          loadData();
                        }}
                        className="p-1.5 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors flex-shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "schedule" && (
          <ScheduleTab
            company={company}
            employees={employees.filter(
              (e) => e.activeInCompanies?.[session.id] !== false,
            )}
            year={scheduleYear}
            month={scheduleMonth}
            scheduleData={scheduleData}
            onYearChange={(y) => {
              setScheduleYear(y);
              setScheduleData(getSchedule(session.id, y, scheduleMonth));
            }}
            onMonthChange={(m) => {
              setScheduleMonth(m);
              setScheduleData(getSchedule(session.id, scheduleYear, m));
            }}
            showModal={showScheduleModal}
            assignEmpId={scheduleAssignEmpId}
            assignShiftId={scheduleAssignShiftId}
            assignDay={scheduleAssignDay}
            onOpenModal={(day: number, empId: string) => {
              setScheduleAssignDay(day);
              setScheduleAssignEmpId(empId);
              setScheduleAssignShiftId("");
              setShowScheduleModal(true);
            }}
            onCloseModal={() => setShowScheduleModal(false)}
            onAssignEmpChange={setScheduleAssignEmpId}
            onAssignShiftChange={setScheduleAssignShiftId}
            onSaveEntry={() => {
              setScheduleEntry(
                session.id,
                scheduleYear,
                scheduleMonth,
                scheduleAssignDay,
                scheduleAssignEmpId,
                scheduleAssignShiftId || "unassigned",
              );
              setScheduleData(
                getSchedule(session.id, scheduleYear, scheduleMonth),
              );
              setShowScheduleModal(false);
            }}
            t={t}
          />
        )}

        {tab === "overtimeapprovals" && (
          <OvertimeApprovalsTab
            overtimeLogs={overtimeLogs}
            filter={overtimeFilter}
            onFilterChange={setOvertimeFilter}
            onApprove={(id) => {
              updateOvertimeLogStatus(id, session.id, "approved", session.name);
              setOvertimeLogs(getCompanyOvertimeLogs(session.id));
            }}
            onReject={(id) => {
              updateOvertimeLogStatus(id, session.id, "rejected", session.name);
              setOvertimeLogs(getCompanyOvertimeLogs(session.id));
            }}
            t={t}
          />
        )}

        {tab === "shiftswap" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{t("shiftSwap")}</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSwapFilter("pending")}
                  className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${swapFilter === "pending" ? "bg-blue-500/20 border-blue-500/40 text-blue-400" : "border-border text-muted-foreground hover:bg-muted"}`}
                >
                  {t("pending")} (
                  {shiftSwaps.filter((s) => s.status === "pending").length})
                </button>
                <button
                  type="button"
                  onClick={() => setSwapFilter("all")}
                  className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${swapFilter === "all" ? "bg-blue-500/20 border-blue-500/40 text-blue-400" : "border-border text-muted-foreground hover:bg-muted"}`}
                >
                  {t("allEmployees")}
                </button>
              </div>
            </div>
            {(() => {
              const filtered =
                swapFilter === "pending"
                  ? shiftSwaps.filter((s) => s.status === "pending")
                  : shiftSwaps;
              if (filtered.length === 0)
                return (
                  <div
                    data-ocid="shiftswap.empty_state"
                    className="text-center py-16 text-muted-foreground"
                  >
                    <div className="text-4xl mb-3">🔄</div>
                    <div>{t("noRecords")}</div>
                  </div>
                );
              return (
                <div className="space-y-3">
                  {filtered.map((swap) => {
                    const requesterShift = (company?.shifts || []).find(
                      (s) => s.id === swap.requesterShiftId,
                    );
                    const targetShift = (company?.shifts || []).find(
                      (s) => s.id === swap.targetShiftId,
                    );
                    return (
                      <div
                        key={swap.id}
                        data-ocid="shiftswap.row"
                        className="bg-card border border-border rounded-xl p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-medium text-sm">
                                {swap.requesterName}
                              </span>
                              <span className="text-xs text-muted-foreground mx-1">
                                ↔
                              </span>
                              <span className="font-medium text-sm">
                                {swap.targetName}
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
                            <div className="text-xs text-muted-foreground mt-1">
                              {swap.requesterName}:{" "}
                              <span className="text-foreground">
                                {requesterShift?.name ||
                                  swap.requesterShiftId ||
                                  "—"}
                              </span>
                              {" ↔ "}
                              {swap.targetName}:{" "}
                              <span className="text-foreground">
                                {targetShift?.name || swap.targetShiftId || "—"}
                              </span>
                            </div>
                            {swap.note && (
                              <div className="text-xs text-muted-foreground mt-1 italic">
                                {swap.note}
                              </div>
                            )}
                          </div>
                          {swap.status === "pending" && (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                data-ocid="shiftswap.confirm_button"
                                onClick={() => {
                                  const res = approveShiftSwap(
                                    swap.id,
                                    session.id,
                                  );
                                  if (res.ok) {
                                    addAuditEntry({
                                      companyId: session.id,
                                      action: "shift_swap_approved",
                                      details: `Shift swap approved: ${swap.requesterName} ↔ ${swap.targetName} on ${swap.date}`,
                                      timestamp: Date.now(),
                                      actorType: "company",
                                      actorId: session.id,
                                      actorName: "admin",
                                    });
                                    toast.success(t("swapApproveOk"));
                                    loadData();
                                  }
                                }}
                                className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
                              >
                                <Check size={12} /> {t("approve")}
                              </button>
                              <button
                                type="button"
                                data-ocid="shiftswap.delete_button"
                                onClick={() => {
                                  const res = rejectShiftSwap(swap.id);
                                  if (res.ok) {
                                    addAuditEntry({
                                      companyId: session.id,
                                      action: "shift_swap_rejected",
                                      details: `Shift swap rejected: ${swap.requesterName} ↔ ${swap.targetName} on ${swap.date}`,
                                      timestamp: Date.now(),
                                      actorType: "company",
                                      actorId: session.id,
                                      actorName: "admin",
                                    });
                                    toast.success(t("swapRejectOk"));
                                    loadData();
                                  }
                                }}
                                className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
                              >
                                <X size={12} /> {t("reject")}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {tab === "settings" && (
          <div>
            <h2 className="text-xl font-bold mb-6">{t("settings")}</h2>
            <div className="bg-card border border-border rounded-xl p-6 max-w-md">
              {/* Work Hours */}
              <div className="text-base font-semibold mb-4">
                {t("workHours")}
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="text-sm font-medium mb-2 text-muted-foreground">
                    {t("workStart")}
                  </div>
                  <input
                    type="time"
                    value={workStart}
                    onChange={(e) => setWorkStart(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <div className="text-sm font-medium mb-2 text-muted-foreground">
                    {t("workEnd")}
                  </div>
                  <input
                    type="time"
                    value={workEnd}
                    onChange={(e) => setWorkEnd(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleSaveWorkHours}
                disabled={savingWorkHours}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {savingWorkHours ? t("loading") : t("save")}
              </button>
              {currentWorkHours && (
                <div className="mt-4 text-sm text-muted-foreground text-center">
                  {t("workHours")}:{" "}
                  <span className="font-mono text-blue-400">
                    {currentWorkHours.start} – {currentWorkHours.end}
                  </span>
                </div>
              )}

              {/* Work Days */}
              <div className="text-base font-semibold mb-4 mt-8">
                {t("workDays")}
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  { day: 1, key: "workDayMon" },
                  { day: 2, key: "workDayTue" },
                  { day: 3, key: "workDayWed" },
                  { day: 4, key: "workDayThu" },
                  { day: 5, key: "workDayFri" },
                  { day: 6, key: "workDaySat" },
                  { day: 0, key: "workDaySun" },
                ].map(({ day, key }) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() =>
                      setWorkDays((prev) =>
                        prev.includes(day)
                          ? prev.filter((d) => d !== day)
                          : [...prev, day],
                      )
                    }
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      workDays.includes(day)
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {t(key)}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleSaveWorkDays}
                disabled={savingWorkDays}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors mb-6"
              >
                {savingWorkDays ? t("loading") : t("save")}
              </button>

              {/* Min Daily Hours */}
              <div className="text-base font-semibold mb-4 mt-2">
                {t("minDailyHours")}
              </div>
              <div className="flex gap-3 items-end mb-6">
                <div className="flex-1">
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={minDailyHoursValue}
                    onChange={(e) => setMinDailyHoursValue(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSaveMinHours}
                  disabled={savingMinHours}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-5 py-3 rounded-xl transition-colors whitespace-nowrap"
                >
                  {savingMinHours ? t("loading") : t("save")}
                </button>
              </div>

              {/* Shifts */}
              <div className="text-base font-semibold mb-4 mt-2">
                {t("shifts")}
              </div>
              {(company?.shifts || []).length > 0 && (
                <div className="space-y-2 mb-4">
                  {(company?.shifts || []).map((sh) => (
                    <div
                      key={sh.id}
                      className="flex items-center justify-between bg-muted/40 border border-border rounded-xl px-4 py-3"
                    >
                      <div>
                        <span className="font-medium text-sm">{sh.name}</span>
                        <span className="ml-3 text-xs text-muted-foreground font-mono">
                          {sh.startTime} – {sh.endTime}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteShift(sh.id)}
                        className="p-1.5 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 gap-3 mb-3">
                <input
                  type="text"
                  value={newShiftName}
                  onChange={(e) => setNewShiftName(e.target.value)}
                  placeholder={t("shiftName")}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="time"
                    value={newShiftStart}
                    onChange={(e) => setNewShiftStart(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="time"
                    value={newShiftEnd}
                    onChange={(e) => setNewShiftEnd(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddShift}
                className="flex items-center gap-2 w-full justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors mb-8"
              >
                <Plus size={16} />
                {t("addShift")}
              </button>

              {/* Public Holidays */}
              <div className="text-base font-semibold mb-4 mt-2 flex items-center gap-2">
                <Calendar size={16} />
                {t("holidays")}
              </div>
              {holidays.length > 0 && (
                <div className="space-y-2 mb-4">
                  {holidays.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center justify-between bg-muted/40 border border-border rounded-xl px-4 py-3"
                    >
                      <div>
                        <span className="font-medium text-sm">{h.name}</span>
                        <span className="ml-3 text-xs text-muted-foreground font-mono">
                          {h.date}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteHoliday(h.id)}
                        className="p-1.5 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {holidays.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-3 mb-3">
                  {t("noHolidays")}
                </div>
              )}
              <div className="grid grid-cols-1 gap-3 mb-3">
                <input
                  type="date"
                  value={newHolidayDate}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t("holidayDate")}
                />
                <input
                  type="text"
                  value={newHolidayName}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                  placeholder={t("holidayName")}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === "Enter" && handleAddHoliday()}
                />
              </div>
              <button
                type="button"
                data-ocid="holidays.primary_button"
                onClick={handleAddHoliday}
                className="flex items-center gap-2 w-full justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors mb-8"
              >
                <Plus size={16} />
                {t("addHoliday")}
              </button>

              {/* Leave Type Management */}
              <div className="text-base font-semibold mb-4 mt-8 flex items-center gap-2">
                <CalendarDays size={16} />
                {t("leaveTypeSettings")}
              </div>
              {leaveTypes.length > 0 && (
                <div className="space-y-2 mb-4">
                  {leaveTypes.map((lt) => (
                    <div
                      key={lt.id}
                      className="flex items-center justify-between bg-muted/40 border border-border rounded-xl px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: lt.color }}
                        />
                        <span className="font-medium text-sm">{lt.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {lt.annualDays > 0
                            ? `${lt.annualDays} gün`
                            : "Sınırsız"}
                        </span>
                      </div>
                      {!lt.isDefault && (
                        <button
                          type="button"
                          onClick={() => {
                            deleteLeaveType(lt.id);
                            loadData();
                            toast.success(t("leaveTypeDeleted"));
                          }}
                          className="p-1.5 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 gap-3 mb-3">
                <input
                  type="text"
                  value={newLeaveTypeName}
                  onChange={(e) => setNewLeaveTypeName(e.target.value)}
                  placeholder={t("leaveTypeName")}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={newLeaveTypeDays}
                    onChange={(e) => setNewLeaveTypeDays(e.target.value)}
                    placeholder={t("annualDays")}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="color"
                    value={newLeaveTypeColor}
                    onChange={(e) => setNewLeaveTypeColor(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 h-12 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <button
                type="button"
                data-ocid="settings.primary_button"
                onClick={() => {
                  if (!newLeaveTypeName.trim()) return;
                  addLeaveType(
                    session.id,
                    newLeaveTypeName.trim(),
                    Number.parseInt(newLeaveTypeDays) || 0,
                    newLeaveTypeColor,
                  );
                  setNewLeaveTypeName("");
                  setNewLeaveTypeDays("14");
                  setNewLeaveTypeColor("#22c55e");
                  loadData();
                  toast.success(t("leaveTypeAdded"));
                }}
                className="flex items-center gap-2 w-full justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors mb-8"
              >
                <Plus size={16} />
                {t("addLeaveType")}
              </button>

              {/* Auto Checkout */}
              <div className="text-base font-semibold mb-4 mt-2 flex items-center gap-2">
                <ScrollText size={16} />
                {t("autoCheckout")}
              </div>
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    data-ocid="settings.toggle"
                    onClick={() => setAutoCheckoutEnabled(!autoCheckoutEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoCheckoutEnabled ? "bg-blue-600" : "bg-gray-600"}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoCheckoutEnabled ? "translate-x-6" : "translate-x-1"}`}
                    />
                  </button>
                  <span className="text-sm">{t("autoCheckoutEnabled")}</span>
                </div>
                {autoCheckoutEnabled && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">
                      {t("autoCheckoutMode")}
                    </div>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name="autoCheckoutMode"
                          value="flag"
                          checked={autoCheckoutMode === "flag"}
                          onChange={() => setAutoCheckoutMode("flag")}
                          className="accent-blue-500"
                        />
                        {t("autoCheckoutFlag")}
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name="autoCheckoutMode"
                          value="auto"
                          checked={autoCheckoutMode === "auto"}
                          onChange={() => setAutoCheckoutMode("auto")}
                          className="accent-blue-500"
                        />
                        {t("autoCheckoutAuto")}
                      </label>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  data-ocid="settings.save_button"
                  onClick={handleSaveAutoCheckout}
                  disabled={savingAutoCheckout}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
                >
                  {savingAutoCheckout ? t("loading") : t("save")}
                </button>
              </div>

              {/* Data Backup & Restore */}
              <div className="text-base font-semibold mb-4 mt-2">
                {t("dataBackup")}
              </div>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="flex items-center gap-2 w-full justify-center border border-border hover:bg-muted text-sm font-medium py-3 rounded-xl transition-colors"
                >
                  <Database size={16} />
                  {t("backupData")}
                </button>
                <label className="flex items-center gap-2 w-full justify-center border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 text-sm font-medium py-3 rounded-xl transition-colors cursor-pointer">
                  <Upload size={16} />
                  {t("restoreData")}
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setRestoreFile(file);
                        setShowRestoreConfirm(true);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        )}
      </main>

      {kioskMode && company && (
        <KioskMode
          company={company}
          t={t}
          onExit={() => {
            setKioskMode(false);
            loadData();
          }}
        />
      )}

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

      {showRestoreConfirm && (
        <dialog
          open
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50 m-0 max-w-none w-full h-full bg-transparent border-0"
        >
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: modal backdrop */}
          <div
            className="fixed inset-0"
            onClick={() => {
              setShowRestoreConfirm(false);
              setRestoreFile(null);
            }}
          />
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={20} className="text-amber-400" />
              <h3 className="text-lg font-bold">{t("restoreData")}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              {t("restoreConfirm")}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowRestoreConfirm(false);
                  setRestoreFile(null);
                }}
                className="flex-1 border border-border py-3 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleRestoreBackup}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl text-sm font-semibold transition-colors"
              >
                {t("restoreData")}
              </button>
            </div>
          </div>
        </dialog>
      )}

      {showAddLeave && (
        <dialog
          open
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50 m-0 max-w-none w-full h-full bg-transparent border-0"
        >
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: modal backdrop */}
          <div
            className="fixed inset-0"
            onClick={() => setShowAddLeave(false)}
          />
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">{t("addLeave")}</h3>
              <button
                type="button"
                onClick={() => setShowAddLeave(false)}
                className="p-1 hover:bg-muted rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-2">{t("employee")}</div>
                <select
                  value={leaveEmpId}
                  onChange={(e) => setLeaveEmpId(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t("allEmployees")}</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-sm font-medium mb-2">{t("date")}</div>
                <input
                  type="date"
                  value={leaveDate}
                  onChange={(e) => setLeaveDate(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <div className="text-sm font-medium mb-2">{t("leaveType")}</div>
                <select
                  value={leaveType}
                  onChange={(e) =>
                    setLeaveType(e.target.value as LeaveRecord["type"])
                  }
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="leave">{t("leaveTypeLeave")}</option>
                  <option value="sick">{t("leaveTypeSick")}</option>
                  <option value="excuse">{t("leaveTypeExcuse")}</option>
                </select>
              </div>
              <div>
                <div className="text-sm font-medium mb-2">{t("leaveNote")}</div>
                <input
                  type="text"
                  value={leaveNote}
                  onChange={(e) => setLeaveNote(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddLeave(false)}
                  className="flex-1 border border-border py-3 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleAddLeave}
                  disabled={savingLeave}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-semibold transition-colors"
                >
                  {savingLeave ? t("loading") : t("create")}
                </button>
              </div>
            </div>
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
