import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface LeaveType {
    id: string;
    annualQuota: bigint;
    name: string;
    companyId: string;
}
export interface AuditLog {
    id: string;
    actionType: string;
    actorId: string;
    timestamp: bigint;
    details: string;
    targetId: string;
    companyId: string;
}
export interface AttendanceCorrectionRequest {
    id: string;
    status: string;
    date: string;
    reviewerNote?: string;
    personnelId: string;
    requestedCheckIn: bigint;
    requestedCheckOut: bigint;
    companyId: string;
}
export interface Shift {
    id: string;
    startTime: string;
    endTime: string;
    name: string;
    workDays: string;
    companyId: string;
}
export interface Company {
    id: string;
    entryCode: string;
    name: string;
    createdAt: bigint;
}
export interface LeaveRequest {
    id: string;
    status: string;
    endDate: string;
    days: bigint;
    reviewerNote?: string;
    leaveTypeId: string;
    personnelId: string;
    startDate: string;
    reason: string;
    companyId: string;
}
export interface PayrollEntry {
    month: bigint;
    name: string;
    year: bigint;
    totalWorkMinutes: bigint;
    personnelId: string;
    absenceDays: bigint;
    lateCount: bigint;
    department: string;
    leaveDays: bigint;
}
export interface Notification {
    id: string;
    notifType: string;
    createdAt: bigint;
    isRead: boolean;
    personnelId: string;
    message: string;
    companyId: string;
}
export interface DepartmentSummary {
    personnel: Array<Personnel>;
    department: string;
}
export interface Announcement {
    id: string;
    title: string;
    content: string;
    authorId: string;
    createdAt: bigint;
    isActive: boolean;
    companyId: string;
}
export interface BreakRecord {
    id: string;
    startTime: bigint;
    endTime?: bigint;
    isActive: boolean;
    personnelId: string;
    attendanceId: string;
}
export interface AttendanceRecord {
    id: string;
    hasCheckedOut: boolean;
    checkIn: bigint;
    personnelId: string;
    checkOut: bigint;
    companyId: string;
}
export interface LeaveBalance {
    leaveTypeId: string;
    personnelId: string;
    usedDays: bigint;
}
export interface UserProfile {
    name: string;
    personnelId?: string;
    companyId?: string;
}
export interface Personnel {
    id: string;
    entryCode: string;
    name: string;
    isActive: boolean;
    isAdmin: boolean;
    department: string;
    shiftId?: string;
    companyId: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addPersonnel(companyId: string, name: string, department: string, isAdmin: boolean): Promise<Personnel>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    assignShift(personnelId: string, shiftId: string): Promise<Personnel>;
    checkIn(personnelId: string, companyId: string): Promise<AttendanceRecord | null>;
    checkOut(personnelId: string): Promise<AttendanceRecord | null>;
    createAnnouncement(companyId: string, title: string, content: string): Promise<Announcement>;
    createDefaultLeaveTypes(companyId: string): Promise<void>;
    createLeaveType(companyId: string, name: string, annualQuota: bigint): Promise<LeaveType>;
    createShift(companyId: string, name: string, startTime: string, endTime: string, workDays: string): Promise<Shift>;
    deleteAnnouncement(companyId: string, announcementId: string): Promise<boolean>;
    endBreak(personnelId: string): Promise<BreakRecord | null>;
    getActiveBreak(personnelId: string): Promise<BreakRecord | null>;
    getActiveCheckIn(personnelId: string): Promise<AttendanceRecord | null>;
    getAnnouncementsByCompany(companyId: string): Promise<Array<Announcement>>;
    getAttendanceByCompany(companyId: string): Promise<Array<AttendanceRecord>>;
    getAttendanceByPersonnel(personnelId: string): Promise<Array<AttendanceRecord>>;
    getAttendanceCorrectionsByCompany(companyId: string): Promise<Array<AttendanceCorrectionRequest>>;
    getAttendanceCorrectionsByPersonnel(personnelId: string): Promise<Array<AttendanceCorrectionRequest>>;
    getAttendanceScore(personnelId: string, companyId: string): Promise<bigint>;
    getAuditLogByCompany(companyId: string): Promise<Array<AuditLog>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCompanyById(companyId: string): Promise<Company>;
    getDepartmentSummaries(companyId: string): Promise<Array<DepartmentSummary>>;
    getLeaveBalance(personnelId: string, leaveTypeId: string): Promise<LeaveBalance | null>;
    getLeaveRequestsByCompany(companyId: string): Promise<Array<LeaveRequest>>;
    getLeaveRequestsByPersonnel(personnelId: string): Promise<Array<LeaveRequest>>;
    getLeaveTypesByCompany(companyId: string): Promise<Array<LeaveType>>;
    getNotificationsByPersonnel(personnelId: string): Promise<Array<Notification>>;
    getPayrollSummary(companyId: string, month: bigint, year: bigint): Promise<Array<PayrollEntry>>;
    getPersonAttendanceByDate(personId: string, dateStart: bigint, dateEnd: bigint): Promise<Array<AttendanceRecord>>;
    getPersonById(personId: string): Promise<Personnel>;
    getPersonnelList(companyId: string): Promise<Array<Personnel>>;
    getShiftsByCompany(companyId: string): Promise<Array<Shift>>;
    getUnreadCount(personnelId: string): Promise<bigint>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    kioskCheckIn(companyId: string, personnelCode: string): Promise<AttendanceRecord | null>;
    kioskCheckOut(personnelCode: string): Promise<AttendanceRecord | null>;
    linkPersonnelToPrincipal(entryCode: string): Promise<Personnel | null>;
    loginCompany(entryCode: string): Promise<Company | null>;
    loginPersonnel(entryCode: string): Promise<Personnel | null>;
    markNotificationRead(notificationId: string): Promise<boolean>;
    registerCompany(name: string): Promise<Company>;
    reviewAttendanceCorrection(companyId: string, requestId: string, status: string, reviewerNote: string | null): Promise<AttendanceCorrectionRequest>;
    reviewLeaveRequest(companyId: string, requestId: string, status: string, reviewerNote: string | null): Promise<LeaveRequest>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    startBreak(personnelId: string, companyId: string): Promise<BreakRecord>;
    submitAttendanceCorrection(personnelId: string, companyId: string, date: string, requestedCheckIn: bigint, requestedCheckOut: bigint): Promise<AttendanceCorrectionRequest>;
    submitLeaveRequest(personnelId: string, leaveTypeId: string, startDate: string, endDate: string, days: bigint, reason: string): Promise<LeaveRequest>;
    updatePersonnel(id: string, name: string, department: string, isActive: boolean): Promise<Personnel | null>;
}
