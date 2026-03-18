import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Employee, Shift, WorkSchedule } from "../store";

interface ScheduleTabProps {
  company: { shifts?: Shift[]; workDays?: number[] } | undefined;
  employees: Employee[];
  year: number;
  month: number;
  scheduleData: WorkSchedule[];
  onYearChange: (y: number) => void;
  onMonthChange: (m: number) => void;
  showModal: boolean;
  assignEmpId: string;
  assignShiftId: string;
  assignDay: number;
  onOpenModal: (day: number, empId: string) => void;
  onCloseModal: () => void;
  onAssignEmpChange: (id: string) => void;
  onAssignShiftChange: (id: string) => void;
  onSaveEntry: () => void;
  t: (k: string) => string;
}

export default function ScheduleTab({
  company,
  employees,
  year,
  month,
  scheduleData,
  onYearChange,
  onMonthChange,
  showModal,
  assignEmpId,
  assignShiftId,
  assignDay,
  onOpenModal,
  onCloseModal,
  onAssignEmpChange,
  onAssignShiftChange,
  onSaveEntry,
  t,
}: ScheduleTabProps) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = new Date(year, month, 1).toLocaleString("default", {
    month: "long",
  });

  const shifts = company?.shifts ?? [];

  const getEntry = (day: number, empId: string) =>
    scheduleData.find((s) => s.day === day && s.employeeId === empId);

  const getShiftLabel = (shiftId: string) => {
    if (shiftId === "off")
      return { label: t("dayOff"), color: "text-orange-400 bg-orange-500/10" };
    if (shiftId === "unassigned")
      return { label: "-", color: "text-muted-foreground" };
    const shift = shifts.find((s) => s.id === shiftId);
    if (!shift) return { label: shiftId, color: "text-muted-foreground" };
    return {
      label: `${shift.name}`,
      color: "text-blue-400 bg-blue-500/10",
    };
  };

  function prevMonth() {
    const d = new Date(year, month - 1);
    onYearChange(d.getFullYear());
    onMonthChange(d.getMonth());
  }

  function nextMonth() {
    const d = new Date(year, month + 1);
    onYearChange(d.getFullYear());
    onMonthChange(d.getMonth());
  }

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold">{t("workSchedule")}</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium w-36 text-center">
            {monthName} {year}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {employees.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-4xl mb-3">📅</div>
          <div>{t("noEmployees")}</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-3 py-2 text-muted-foreground font-medium whitespace-nowrap sticky left-0 bg-background z-10 min-w-[120px]">
                  {t("employees")}
                </th>
                {days.map((d) => {
                  const dateObj = new Date(year, month, d);
                  const isToday =
                    new Date().getDate() === d &&
                    new Date().getMonth() === month &&
                    new Date().getFullYear() === year;
                  const isWeekend =
                    dateObj.getDay() === 0 || dateObj.getDay() === 6;
                  return (
                    <th
                      key={d}
                      className={`px-2 py-2 text-center font-medium min-w-[44px] ${
                        isToday
                          ? "text-blue-400"
                          : isWeekend
                            ? "text-muted-foreground/60"
                            : "text-muted-foreground"
                      }`}
                    >
                      <div>{d}</div>
                      <div className="text-[10px] font-normal">
                        {
                          ["Pz", "Pt", "Sa", "Ça", "Pe", "Cu", "Ct"][
                            dateObj.getDay()
                          ]
                        }
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr
                  key={emp.id}
                  className="border-b border-border hover:bg-muted/20 transition-colors"
                >
                  <td className="px-3 py-2 font-medium text-sm whitespace-nowrap sticky left-0 bg-background z-10">
                    {emp.fullName}
                  </td>
                  {days.map((d) => {
                    const entry = getEntry(d, emp.id);
                    const info = entry ? getShiftLabel(entry.shiftId) : null;
                    const isWeekend =
                      new Date(year, month, d).getDay() === 0 ||
                      new Date(year, month, d).getDay() === 6;
                    return (
                      <td
                        key={d}
                        className={`px-1 py-1 text-center cursor-pointer hover:bg-blue-500/10 transition-colors ${
                          isWeekend ? "bg-muted/20" : ""
                        }`}
                        onClick={() => onOpenModal(d, emp.id)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && onOpenModal(d, emp.id)
                        }
                        title={`${emp.fullName} - ${d} ${monthName}`}
                      >
                        {info ? (
                          <span
                            className={`inline-block px-1 py-0.5 rounded text-[10px] font-medium ${info.color}`}
                          >
                            {info.label}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/30 text-[10px]">
                            +
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <dialog
          open
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50 m-0 max-w-none w-full h-full border-0"
        >
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: modal backdrop */}
          <div className="fixed inset-0" onClick={onCloseModal} />
          <div
            data-ocid="schedule.dialog"
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl relative z-10"
          >
            <h3 className="font-bold text-base mb-4">
              {t("assignShift")} — {assignDay} {monthName}
            </h3>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-2">{t("employees")}</div>
                <select
                  value={assignEmpId}
                  onChange={(e) => onAssignEmpChange(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-sm font-medium mb-2">{t("shifts")}</div>
                <select
                  value={assignShiftId}
                  onChange={(e) => onAssignShiftChange(e.target.value)}
                  data-ocid="schedule.select"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="unassigned">{t("noShift")}</option>
                  <option value="off">{t("dayOff")}</option>
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.startTime}-{s.endTime})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onCloseModal}
                  data-ocid="schedule.cancel_button"
                  className="flex-1 border border-border py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  onClick={onSaveEntry}
                  data-ocid="schedule.save_button"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  {t("save")}
                </button>
              </div>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
