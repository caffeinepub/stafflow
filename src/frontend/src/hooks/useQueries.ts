import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AttendanceRecord, Company, Personnel } from "../backend.d";
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
