import { useState } from "react";
import {
  type Company,
  getAllCompanyAttendance,
  getMonthlyAttendanceSummary,
  getOvertimeMinutes,
} from "../store";

interface Props {
  companyId: string;
  company: Company;
  t: (key: string) => string;
}

export default function PayrollReport({ companyId, company, t }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const summary = getMonthlyAttendanceSummary(companyId, year, month);
  const allRecords = getAllCompanyAttendance(companyId);

  const workEnd = company.workHours?.end;

  const rows = summary.map((row) => {
    const totalHours = Math.floor(row.totalWorkMinutes / 60);
    const totalMins = row.totalWorkMinutes % 60;

    // Calculate overtime for this employee this month
    let overtimeMinutes = 0;
    if (workEnd) {
      const empRecords = allRecords.filter(
        (r) => r.employeeId === row.employee.id && r.recordType === "checkout",
      );
      for (const rec of empRecords) {
        const d = new Date(rec.timestamp);
        if (d.getFullYear() === year && d.getMonth() === month) {
          overtimeMinutes += getOvertimeMinutes(0, rec.timestamp, workEnd);
        }
      }
    }
    const overtimeHours = Math.floor(overtimeMinutes / 60);
    const overtimeMins = overtimeMinutes % 60;

    return {
      name: row.employee.fullName,
      daysAttended: row.daysAttended,
      daysAbsent: row.daysAbsent,
      leaveDays: row.leaveDays,
      totalWork: `${totalHours}h ${totalMins}m`,
      totalWorkMinutes: row.totalWorkMinutes,
      overtime: `${overtimeHours}h ${overtimeMins}m`,
      overtimeMinutes,
    };
  });

  function downloadCSV() {
    const headers = [
      t("employee"),
      t("daysWorked") || "Days Worked",
      t("totalHours"),
      t("overtimeHours"),
      t("leaveDays") || "Leave Days",
      t("daysAbsent") || "Days Absent",
    ];
    const csvRows = [
      headers.join(","),
      ...rows.map((r) =>
        [
          `"${r.name}"`,
          r.daysAttended,
          r.totalWork,
          r.overtime,
          r.leaveDays,
          r.daysAbsent,
        ].join(","),
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-${year}-${String(month + 1).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const months = [
    "Ocak",
    "Şubat",
    "Mart",
    "Nisan",
    "Mayıs",
    "Haziran",
    "Temmuz",
    "Ağustos",
    "Eylül",
    "Ekim",
    "Kasım",
    "Aralık",
  ];

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold">{t("payrollReport")}</h2>
        <div className="flex items-center gap-3">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none"
          >
            {months.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            type="button"
            data-ocid="payroll.primary_button"
            onClick={downloadCSV}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            ⬇ {t("downloadPayroll")}
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div
          data-ocid="payroll.empty_state"
          className="text-center py-16 text-muted-foreground"
        >
          <div className="text-4xl mb-3">📊</div>
          <div>{t("noRecords")}</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-3 text-muted-foreground font-medium">
                  {t("employee")}
                </th>
                <th className="text-center py-3 px-3 text-muted-foreground font-medium">
                  Çalışma Günü
                </th>
                <th className="text-center py-3 px-3 text-muted-foreground font-medium">
                  {t("totalHours")}
                </th>
                <th className="text-center py-3 px-3 text-muted-foreground font-medium">
                  {t("overtimeHours")}
                </th>
                <th className="text-center py-3 px-3 text-muted-foreground font-medium">
                  İzin Günü
                </th>
                <th className="text-center py-3 px-3 text-muted-foreground font-medium">
                  Devamsızlık
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.name}
                  data-ocid={`payroll.item.${i + 1}`}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <td className="py-3 px-3 font-medium">{row.name}</td>
                  <td className="py-3 px-3 text-center">{row.daysAttended}</td>
                  <td className="py-3 px-3 text-center font-mono text-blue-400">
                    {row.totalWork}
                  </td>
                  <td className="py-3 px-3 text-center font-mono">
                    {row.overtimeMinutes > 0 ? (
                      <span className="text-orange-400">{row.overtime}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {row.leaveDays > 0 ? (
                      <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full text-xs">
                        {row.leaveDays}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {row.daysAbsent > 0 ? (
                      <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full text-xs">
                        {row.daysAbsent}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
