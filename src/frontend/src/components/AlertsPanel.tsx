import { useMemo } from "react";
import {
  type Company,
  getAllCompanyAttendance,
  getCompanyEmployees,
  getCompanyHolidays,
  getCompanyLeaveRecords,
} from "../store";

interface Alert {
  employeeName: string;
  type: "consecutiveAbsences" | "lowAttendanceRate";
  detail: string;
}

interface Props {
  companyId: string;
  company: Company;
  t: (key: string) => string;
}

export default function AlertsPanel({ companyId, company, t }: Props) {
  const alerts = useMemo(() => {
    const employees = getCompanyEmployees(companyId).filter(
      (e) => e.activeInCompanies?.[companyId] !== false,
    );
    const allRecords = getAllCompanyAttendance(companyId);
    const leaveRecords = getCompanyLeaveRecords(companyId);
    const holidays = getCompanyHolidays(companyId);
    const workDays = company.workDays ?? [1, 2, 3, 4, 5];

    const holidaySet = new Set(holidays.map((h) => h.date));

    const result: Alert[] = [];
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    for (const emp of employees) {
      const empRecords = allRecords.filter((r) => r.employeeId === emp.id);
      const empLeaves = leaveRecords.filter((l) => l.employeeId === emp.id);

      // Dates employee attended (ISO date strings)
      const attendedDates = new Set<string>();
      for (const r of empRecords) {
        if (r.recordType === "checkin") {
          attendedDates.add(new Date(r.timestamp).toISOString().slice(0, 10));
        }
      }
      const leaveDates = new Set(empLeaves.map((l) => l.date));

      // Check consecutive absences (last 14 days)
      const checkDate = new Date();
      let consecutiveCount = 0;
      let maxConsecutive = 0;
      for (let i = 0; i < 14; i++) {
        checkDate.setDate(checkDate.getDate() - (i === 0 ? 0 : 1));
        const dayOfWeek = checkDate.getDay();
        const dateStr = checkDate.toISOString().slice(0, 10);
        // Skip weekends and holidays
        if (!workDays.includes(dayOfWeek) || holidaySet.has(dateStr)) {
          consecutiveCount = 0;
          continue;
        }
        // Skip today (may not be over yet)
        if (i === 0) continue;

        if (!attendedDates.has(dateStr) && !leaveDates.has(dateStr)) {
          consecutiveCount++;
          maxConsecutive = Math.max(maxConsecutive, consecutiveCount);
        } else {
          consecutiveCount = 0;
        }
      }

      if (maxConsecutive >= 3) {
        result.push({
          employeeName: emp.fullName,
          type: "consecutiveAbsences",
          detail: `${maxConsecutive} gün`,
        });
      }

      // Check weekly attendance rate (last 7 days)
      let workingDaysLast7 = 0;
      let attendedLast7 = 0;
      const checkDate2 = new Date();
      for (let i = 1; i <= 7; i++) {
        checkDate2.setDate(checkDate2.getDate() - (i === 1 ? 1 : 1));
        const dayOfWeek = checkDate2.getDay();
        const dateStr = checkDate2.toISOString().slice(0, 10);
        if (!workDays.includes(dayOfWeek) || holidaySet.has(dateStr)) continue;
        workingDaysLast7++;
        if (attendedDates.has(dateStr) || leaveDates.has(dateStr)) {
          attendedLast7++;
        }
      }

      if (workingDaysLast7 >= 3) {
        const rate = attendedLast7 / workingDaysLast7;
        if (rate < 0.6) {
          result.push({
            employeeName: emp.fullName,
            type: "lowAttendanceRate",
            detail: `%${Math.round(rate * 100)}`,
          });
        }
      }
    }

    // suppress unused variable warning
    void sevenDaysAgo;

    return result;
  }, [companyId, company]);

  if (alerts.length === 0) {
    return (
      <div
        data-ocid="alerts.empty_state"
        className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3"
      >
        <span className="text-green-400 text-xl">✓</span>
        <span className="text-green-400 text-sm font-medium">
          {t("noAlerts")}
        </span>
      </div>
    );
  }

  return (
    <div data-ocid="alerts.panel" className="space-y-2">
      {alerts.map((alert, i) => (
        <div
          key={`${alert.employeeName}-${alert.type}`}
          data-ocid={`alerts.item.${i + 1}`}
          className={`flex items-center justify-between rounded-xl p-4 border ${
            alert.type === "consecutiveAbsences"
              ? "bg-red-500/10 border-red-500/30"
              : "bg-orange-500/10 border-orange-500/30"
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={
                alert.type === "consecutiveAbsences"
                  ? "text-red-400"
                  : "text-orange-400"
              }
            >
              {alert.type === "consecutiveAbsences" ? "⚠" : "📉"}
            </span>
            <div>
              <div className="font-medium text-sm">{alert.employeeName}</div>
              <div className="text-xs text-muted-foreground">
                {t(alert.type)} — {alert.detail}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function useAlertCount(companyId: string, company: Company): number {
  const employees = getCompanyEmployees(companyId).filter(
    (e) => e.activeInCompanies?.[companyId] !== false,
  );
  const allRecords = getAllCompanyAttendance(companyId);
  const leaveRecords = getCompanyLeaveRecords(companyId);
  const holidays = getCompanyHolidays(companyId);
  const workDays = company.workDays ?? [1, 2, 3, 4, 5];
  const holidaySet = new Set(holidays.map((h) => h.date));

  let count = 0;
  for (const emp of employees) {
    const empRecords = allRecords.filter((r) => r.employeeId === emp.id);
    const empLeaves = leaveRecords.filter((l) => l.employeeId === emp.id);
    const attendedDates = new Set<string>();
    for (const r of empRecords) {
      if (r.recordType === "checkin") {
        attendedDates.add(new Date(r.timestamp).toISOString().slice(0, 10));
      }
    }
    const leaveDates = new Set(empLeaves.map((l) => l.date));

    const checkDate = new Date();
    let consecutiveCount = 0;
    for (let i = 1; i <= 14; i++) {
      checkDate.setDate(checkDate.getDate() - 1);
      const dayOfWeek = checkDate.getDay();
      const dateStr = checkDate.toISOString().slice(0, 10);
      if (!workDays.includes(dayOfWeek) || holidaySet.has(dateStr)) {
        consecutiveCount = 0;
        continue;
      }
      if (!attendedDates.has(dateStr) && !leaveDates.has(dateStr)) {
        consecutiveCount++;
      } else {
        consecutiveCount = 0;
      }
    }
    if (consecutiveCount >= 3) count++;
  }
  return count;
}
