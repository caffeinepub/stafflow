import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Announcement,
  AttendanceCorrectionRequest,
  AttendanceRecord,
  AuditLog,
  BreakRecord,
  Company,
  LeaveBalance,
  LeaveRequest,
  LeaveType,
  Notification,
  PayrollEntry,
  Personnel,
  Shift,
} from "../backend.d";
import { useActor } from "./useActor";

export function usePersonnelList(companyId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Personnel[]>({
    queryKey: ["personnel", companyId],
    queryFn: async () => {
      if (!actor || !companyId) return [];
      return actor.getPersonnelList(companyId);
    },
    enabled: !!actor && !isFetching && !!companyId,
  });
}

export function useAttendanceByCompany(companyId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<AttendanceRecord[]>({
    queryKey: ["attendance-company", companyId],
    queryFn: async () => {
      if (!actor || !companyId) return [];
      return actor.getAttendanceByCompany(companyId);
    },
    enabled: !!actor && !isFetching && !!companyId,
  });
}

export function useAttendanceByPersonnel(personnelId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<AttendanceRecord[]>({
    queryKey: ["attendance-personnel", personnelId],
    queryFn: async () => {
      if (!actor || !personnelId) return [];
      return actor.getAttendanceByPersonnel(personnelId);
    },
    enabled: !!actor && !isFetching && !!personnelId,
  });
}

export function useActiveCheckIn(personnelId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<AttendanceRecord | null>({
    queryKey: ["active-checkin", personnelId],
    queryFn: async () => {
      if (!actor || !personnelId) return null;
      return actor.getActiveCheckIn(personnelId);
    },
    enabled: !!actor && !isFetching && !!personnelId,
    refetchInterval: 30000,
  });
}

export function useCompanyById(companyId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Company | null>({
    queryKey: ["company", companyId],
    queryFn: async () => {
      if (!actor || !companyId) return null;
      return actor.getCompanyById(companyId);
    },
    enabled: !!actor && !isFetching && !!companyId,
  });
}

export function useAddPersonnel(companyId: string) {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      department: string;
      isAdmin: boolean;
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.addPersonnel(
        companyId,
        data.name,
        data.department,
        data.isAdmin,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personnel", companyId] });
    },
  });
}

export function useUpdatePersonnel(companyId: string) {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: string;
      name: string;
      department: string;
      isActive: boolean;
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.updatePersonnel(
        data.id,
        data.name,
        data.department,
        data.isActive,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personnel", companyId] });
    },
  });
}

export function useCheckIn(companyId: string) {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (personnelId: string) => {
      if (!actor) throw new Error("No actor");
      return actor.checkIn(personnelId, companyId);
    },
    onSuccess: (_, personnelId) => {
      queryClient.invalidateQueries({
        queryKey: ["active-checkin", personnelId],
      });
      queryClient.invalidateQueries({
        queryKey: ["attendance-personnel", personnelId],
      });
      queryClient.invalidateQueries({
        queryKey: ["attendance-company", companyId],
      });
    },
  });
}

export function useCheckOut() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (personnelId: string) => {
      if (!actor) throw new Error("No actor");
      return actor.checkOut(personnelId);
    },
    onSuccess: (_, personnelId) => {
      queryClient.invalidateQueries({
        queryKey: ["active-checkin", personnelId],
      });
      queryClient.invalidateQueries({
        queryKey: ["attendance-personnel", personnelId],
      });
      queryClient.invalidateQueries({ queryKey: ["attendance-company"] });
    },
  });
}

// ---- Shifts ----

export function useShiftsByCompany(companyId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Shift[]>({
    queryKey: ["shifts", companyId],
    queryFn: async () => {
      if (!actor || !companyId) return [];
      return actor.getShiftsByCompany(companyId);
    },
    enabled: !!actor && !isFetching && !!companyId,
  });
}

export function useCreateShift(companyId: string) {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      startTime: string;
      endTime: string;
      workDays: string;
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.createShift(
        companyId,
        data.name,
        data.startTime,
        data.endTime,
        data.workDays,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts", companyId] });
    },
  });
}

export function useAssignShift(companyId: string) {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { personnelId: string; shiftId: string }) => {
      if (!actor) throw new Error("No actor");
      return actor.assignShift(data.personnelId, data.shiftId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personnel", companyId] });
    },
  });
}

// ---- Leave Types ----

export function useLeaveTypes(companyId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<LeaveType[]>({
    queryKey: ["leave-types", companyId],
    queryFn: async () => {
      if (!actor || !companyId) return [];
      return actor.getLeaveTypesByCompany(companyId);
    },
    enabled: !!actor && !isFetching && !!companyId,
  });
}

export function useCreateLeaveType(companyId: string) {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; annualQuota: number }) => {
      if (!actor) throw new Error("No actor");
      return actor.createLeaveType(
        companyId,
        data.name,
        BigInt(data.annualQuota),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-types", companyId] });
    },
  });
}

export function useCreateDefaultLeaveTypes(companyId: string) {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.createDefaultLeaveTypes(companyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-types", companyId] });
    },
  });
}

// ---- Leave Requests ----

export function useLeaveRequestsByCompany(companyId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<LeaveRequest[]>({
    queryKey: ["leave-requests-company", companyId],
    queryFn: async () => {
      if (!actor || !companyId) return [];
      return actor.getLeaveRequestsByCompany(companyId);
    },
    enabled: !!actor && !isFetching && !!companyId,
  });
}

export function useLeaveRequestsByPersonnel(personnelId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<LeaveRequest[]>({
    queryKey: ["leave-requests-personnel", personnelId],
    queryFn: async () => {
      if (!actor || !personnelId) return [];
      return actor.getLeaveRequestsByPersonnel(personnelId);
    },
    enabled: !!actor && !isFetching && !!personnelId,
  });
}

export function useSubmitLeaveRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      personnelId: string;
      leaveTypeId: string;
      startDate: string;
      endDate: string;
      days: number;
      reason: string;
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.submitLeaveRequest(
        data.personnelId,
        data.leaveTypeId,
        data.startDate,
        data.endDate,
        BigInt(data.days),
        data.reason,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["leave-requests-personnel", variables.personnelId],
      });
      queryClient.invalidateQueries({ queryKey: ["leave-requests-company"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balance"] });
    },
  });
}

export function useReviewLeaveRequest(companyId: string) {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      requestId: string;
      status: string;
      reviewerNote: string | null;
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.reviewLeaveRequest(
        companyId,
        data.requestId,
        data.status,
        data.reviewerNote,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["leave-requests-company", companyId],
      });
      queryClient.invalidateQueries({ queryKey: ["leave-balance"] });
    },
  });
}

// ---- Leave Balance ----

export function useLeaveBalance(
  personnelId: string | null,
  leaveTypeId: string | null,
) {
  const { actor, isFetching } = useActor();
  return useQuery<LeaveBalance | null>({
    queryKey: ["leave-balance", personnelId, leaveTypeId],
    queryFn: async () => {
      if (!actor || !personnelId || !leaveTypeId) return null;
      return actor.getLeaveBalance(personnelId, leaveTypeId);
    },
    enabled: !!actor && !isFetching && !!personnelId && !!leaveTypeId,
  });
}

// ---- Corrections ----

export function useCorrectionsByCompany(companyId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<AttendanceCorrectionRequest[]>({
    queryKey: ["corrections-company", companyId],
    queryFn: async () => {
      if (!actor || !companyId) return [];
      return actor.getAttendanceCorrectionsByCompany(companyId);
    },
    enabled: !!actor && !isFetching && !!companyId,
  });
}

export function useCorrectionsByPersonnel(personnelId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<AttendanceCorrectionRequest[]>({
    queryKey: ["corrections-personnel", personnelId],
    queryFn: async () => {
      if (!actor || !personnelId) return [];
      return actor.getAttendanceCorrectionsByPersonnel(personnelId);
    },
    enabled: !!actor && !isFetching && !!personnelId,
  });
}

export function useSubmitCorrection() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      personnelId: string;
      companyId: string;
      date: string;
      checkInTime: string;
      checkOutTime: string;
    }) => {
      if (!actor) throw new Error("No actor");
      const checkInNs =
        BigInt(new Date(`${data.date}T${data.checkInTime}:00`).getTime()) *
        1_000_000n;
      const checkOutNs =
        BigInt(new Date(`${data.date}T${data.checkOutTime}:00`).getTime()) *
        1_000_000n;
      return actor.submitAttendanceCorrection(
        data.personnelId,
        data.companyId,
        data.date,
        checkInNs,
        checkOutNs,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["corrections-personnel", variables.personnelId],
      });
      queryClient.invalidateQueries({ queryKey: ["corrections-company"] });
    },
  });
}

export function useReviewCorrection(companyId: string) {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      requestId: string;
      status: string;
      reviewerNote: string | null;
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.reviewAttendanceCorrection(
        companyId,
        data.requestId,
        data.status,
        data.reviewerNote,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["corrections-company", companyId],
      });
      queryClient.invalidateQueries({
        queryKey: ["attendance-company", companyId],
      });
    },
  });
}

// ---- Break Tracking ----

export function useActiveBreak(personnelId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<BreakRecord | null>({
    queryKey: ["active-break", personnelId],
    queryFn: async () => {
      if (!actor || !personnelId) return null;
      return actor.getActiveBreak(personnelId);
    },
    enabled: !!actor && !isFetching && !!personnelId,
    refetchInterval: 30000,
  });
}

export function useStartBreak(companyId: string) {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (personnelId: string) => {
      if (!actor) throw new Error("No actor");
      return actor.startBreak(personnelId, companyId);
    },
    onSuccess: (_, personnelId) => {
      queryClient.invalidateQueries({
        queryKey: ["active-break", personnelId],
      });
    },
  });
}

export function useEndBreak() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (personnelId: string) => {
      if (!actor) throw new Error("No actor");
      return actor.endBreak(personnelId);
    },
    onSuccess: (_, personnelId) => {
      queryClient.invalidateQueries({
        queryKey: ["active-break", personnelId],
      });
    },
  });
}

// ---- Announcements ----

export function useAnnouncementsByCompany(companyId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Announcement[]>({
    queryKey: ["announcements", companyId],
    queryFn: async () => {
      if (!actor || !companyId) return [];
      return actor.getAnnouncementsByCompany(companyId);
    },
    enabled: !!actor && !isFetching && !!companyId,
  });
}

export function useCreateAnnouncement(companyId: string) {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      if (!actor) throw new Error("No actor");
      return actor.createAnnouncement(companyId, data.title, data.content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements", companyId] });
    },
  });
}

export function useDeleteAnnouncement(companyId: string) {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (announcementId: string) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteAnnouncement(companyId, announcementId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements", companyId] });
    },
  });
}

// ---- Notifications ----

export function useNotificationsByPersonnel(personnelId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Notification[]>({
    queryKey: ["notifications", personnelId],
    queryFn: async () => {
      if (!actor || !personnelId) return [];
      return actor.getNotificationsByPersonnel(personnelId);
    },
    enabled: !!actor && !isFetching && !!personnelId,
    refetchInterval: 30000,
  });
}

export function useUnreadCount(personnelId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<bigint>({
    queryKey: ["unread-count", personnelId],
    queryFn: async () => {
      if (!actor || !personnelId) return 0n;
      return actor.getUnreadCount(personnelId);
    },
    enabled: !!actor && !isFetching && !!personnelId,
    refetchInterval: 30000,
  });
}

export function useMarkNotificationRead(personnelId: string) {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      if (!actor) throw new Error("No actor");
      return actor.markNotificationRead(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notifications", personnelId],
      });
      queryClient.invalidateQueries({
        queryKey: ["unread-count", personnelId],
      });
    },
  });
}

// ---- Audit Log ----

export function useAuditLog(companyId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<AuditLog[]>({
    queryKey: ["audit-log", companyId],
    queryFn: async () => {
      if (!actor || !companyId) return [];
      return actor.getAuditLogByCompany(companyId);
    },
    enabled: !!actor && !isFetching && !!companyId,
  });
}

// ---- Payroll ----

export function usePayrollSummary(
  companyId: string | null,
  month: number,
  year: number,
) {
  const { actor, isFetching } = useActor();
  return useQuery<PayrollEntry[]>({
    queryKey: ["payroll", companyId, month, year],
    queryFn: async () => {
      if (!actor || !companyId) return [];
      return actor.getPayrollSummary(companyId, BigInt(month), BigInt(year));
    },
    enabled: !!actor && !isFetching && !!companyId,
  });
}

// ---- Attendance Score ----

export function useAttendanceScore(
  personnelId: string | null,
  companyId: string | null,
) {
  const { actor, isFetching } = useActor();
  return useQuery<bigint>({
    queryKey: ["attendance-score", personnelId, companyId],
    queryFn: async () => {
      if (!actor || !personnelId || !companyId) return 0n;
      return actor.getAttendanceScore(personnelId, companyId);
    },
    enabled: !!actor && !isFetching && !!personnelId && !!companyId,
  });
}
