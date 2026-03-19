import type { LeaveType } from "../backend.d";
import { useLeaveBalance } from "../hooks/useQueries";

interface Props {
  personnelId: string;
  leaveType: LeaveType;
}

export default function LeaveBalanceCard({ personnelId, leaveType }: Props) {
  const { data: balance } = useLeaveBalance(personnelId, leaveType.id);
  const used = balance ? Number(balance.usedDays) : 0;
  const total = Number(leaveType.annualQuota);
  const remaining = Math.max(0, total - used);
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="font-medium text-sm mb-2">{leaveType.name}</div>
      <div className="flex items-end justify-between mb-2">
        <div>
          <span className="text-2xl font-bold text-primary">{remaining}</span>
          <span className="text-sm text-muted-foreground ml-1">
            / {total} gün
          </span>
        </div>
        <span className="text-xs text-muted-foreground">{used} kullanıldı</span>
      </div>
      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-primary h-1.5 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
