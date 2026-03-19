import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface DepartmentSummary {
    personnel: Array<Personnel>;
    department: string;
}
export interface Company {
    id: string;
    entryCode: string;
    name: string;
    createdAt: bigint;
}
export interface AttendanceRecord {
    id: string;
    hasCheckedOut: boolean;
    checkIn: bigint;
    personnelId: string;
    checkOut: bigint;
    companyId: string;
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
    checkIn(personnelId: string, companyId: string): Promise<AttendanceRecord | null>;
    checkOut(personnelId: string): Promise<AttendanceRecord | null>;
    getActiveCheckIn(personnelId: string): Promise<AttendanceRecord | null>;
    getAttendanceByCompany(companyId: string): Promise<Array<AttendanceRecord>>;
    getAttendanceByPersonnel(personnelId: string): Promise<Array<AttendanceRecord>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCompanyById(companyId: string): Promise<Company>;
    getDepartmentSummaries(companyId: string): Promise<Array<DepartmentSummary>>;
    getPersonAttendanceByDate(personId: string, dateStart: bigint, dateEnd: bigint): Promise<Array<AttendanceRecord>>;
    getPersonById(personId: string): Promise<Personnel>;
    getPersonnelList(companyId: string): Promise<Array<Personnel>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    linkPersonnelToPrincipal(entryCode: string): Promise<Personnel | null>;
    loginCompany(entryCode: string): Promise<Company | null>;
    loginPersonnel(entryCode: string): Promise<Personnel | null>;
    registerCompany(name: string): Promise<Company>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updatePersonnel(id: string, name: string, department: string, isActive: boolean): Promise<Personnel | null>;
}
