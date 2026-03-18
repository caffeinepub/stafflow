import { CheckCircle, XCircle } from "lucide-react";
import type { OvertimeLog } from "../store";

interface OvertimeApprovalsTabProps {
  overtimeLogs: OvertimeLog[];
  filter: "pending" | "all";
  onFilterChange: (f: "pending" | "all") => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  t: (k: string) => string;
}

export default function OvertimeApprovalsTab({
  overtimeLogs,
  filter,
  onFilterChange,
  onApprove,
  onReject,
  t,
}: OvertimeApprovalsTabProps) {
  const filtered =
    filter === "pending"
      ? overtimeLogs.filter((l) => l.status === "pending")
      : overtimeLogs;

  const pendingCount = overtimeLogs.filter(
    (l) => l.status === "pending",
  ).length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold">{t("overtimeApprovals")}</h2>
        <div className="flex gap-2">
          <button
            type="button"
            data-ocid="overtimeapprovals.tab"
            onClick={() => onFilterChange("pending")}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              filter === "pending"
                ? "bg-orange-500/20 border-orange-500/40 text-orange-400"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {t("overtimePending")} ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => onFilterChange("all")}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              filter === "all"
                ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {t("allEmployees")} ({overtimeLogs.length})
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div
          data-ocid="overtimeapprovals.empty_state"
          className="text-center py-16 text-muted-foreground"
        >
          <div className="text-4xl mb-3">⏰</div>
          <div>{t("noRecords")}</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((log, idx) => (
            <div
              key={log.id}
              data-ocid={`overtimeapprovals.item.${idx + 1}`}
              className="bg-card border border-border rounded-xl p-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">
                      {log.employeeName}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        log.status === "pending"
                          ? "bg-orange-500/20 text-orange-400"
                          : log.status === "approved"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {log.status === "pending"
                        ? t("overtimePending")
                        : log.status === "approved"
                          ? t("overtimeApproved")
                          : t("overtimeRejected")}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground font-mono">
                    {log.date}
                  </div>
                  <div className="text-sm text-foreground mt-1">
                    {t("overtimeMinutes")}:{" "}
                    <span className="font-semibold text-orange-400">
                      {log.overtimeMinutes}
                    </span>{" "}
                    dk
                  </div>
                  {log.reviewedBy && (
                    <div className="text-xs text-muted-foreground/60 mt-1">
                      {log.reviewedBy} —{" "}
                      {log.reviewedAt
                        ? new Date(log.reviewedAt).toLocaleString()
                        : ""}
                    </div>
                  )}
                </div>
                {log.status === "pending" && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-ocid="overtimeapprovals.confirm_button"
                      onClick={() => onApprove(log.id)}
                      className="flex items-center gap-1.5 text-xs px-3 py-2 bg-green-500/20 border border-green-500/40 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                    >
                      <CheckCircle size={14} />
                      {t("approveOvertime")}
                    </button>
                    <button
                      type="button"
                      data-ocid="overtimeapprovals.delete_button"
                      onClick={() => onReject(log.id)}
                      className="flex items-center gap-1.5 text-xs px-3 py-2 bg-red-500/20 border border-red-500/40 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                    >
                      <XCircle size={14} />
                      {t("rejectOvertime")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
