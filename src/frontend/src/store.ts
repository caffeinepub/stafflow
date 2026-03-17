// localStorage-based data store for StafFlow
// All data is stored in localStorage since backend IDL is unavailable

export interface Company {
  id: string;
  name: string;
  authorizedPerson?: string;
  loginCode: string;
  createdAt: number;
}

export interface Employee {
  id: string;
  fullName: string;
  phone?: string;
  loginCode: string;
  companyIds: string[];
  createdAt: number;
}

export interface InviteCode {
  id: string;
  companyId: string;
  code: string;
  maxUses?: number;
  usedCount: number;
  expiresAt?: number;
  cancelled: boolean;
  createdAt: number;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  companyId: string;
  recordType: "checkin" | "checkout";
  timestamp: number;
}

const KEYS = {
  companies: "sf_companies",
  employees: "sf_employees",
  inviteCodes: "sf_invite_codes",
  attendance: "sf_attendance",
  idCounter: "sf_id_counter",
};

function load<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function save<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function nextId(): string {
  const n = Number.parseInt(localStorage.getItem(KEYS.idCounter) || "0") + 1;
  localStorage.setItem(KEYS.idCounter, String(n));
  return String(n);
}

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function generateCode(length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return result;
}

function uniqueCode(length: number, existing: string[]): string {
  let code = generateCode(length);
  while (existing.includes(code)) {
    code = generateCode(length);
  }
  return code;
}

// ===== DURATION HELPERS =====

export function formatDuration(fromTs: number, toTs: number): string {
  const diff = Math.max(0, toTs - fromTs);
  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}d`;
  return `${hours}s ${minutes}d`;
}

export function getRecordDuration(
  record: AttendanceRecord,
  allRecords: AttendanceRecord[],
): string {
  if (record.recordType !== "checkout") return "-";
  // Find the most recent checkin before this checkout for the same employee+company
  const paired = allRecords
    .filter(
      (r) =>
        r.employeeId === record.employeeId &&
        r.companyId === record.companyId &&
        r.recordType === "checkin" &&
        r.timestamp < record.timestamp,
    )
    .sort((a, b) => b.timestamp - a.timestamp)[0];
  if (!paired) return "-";
  return formatDuration(paired.timestamp, record.timestamp);
}

// ===== LIVE STATUS =====

export function getCheckedInEmployees(
  companyId: string,
): { employee: Employee; checkinTimestamp: number }[] {
  const employees = load<Employee>(KEYS.employees).filter((e) =>
    e.companyIds.includes(companyId),
  );
  const result: { employee: Employee; checkinTimestamp: number }[] = [];
  for (const emp of employees) {
    const status = getLastAttendanceStatus(emp.id, companyId);
    if (status.isCheckedIn && status.lastTimestamp) {
      result.push({ employee: emp, checkinTimestamp: status.lastTimestamp });
    }
  }
  return result;
}

export function getCheckedOutEmployees(companyId: string): Employee[] {
  const employees = load<Employee>(KEYS.employees).filter((e) =>
    e.companyIds.includes(companyId),
  );
  return employees.filter((emp) => {
    const status = getLastAttendanceStatus(emp.id, companyId);
    return !status.isCheckedIn;
  });
}

// ===== COMPANY =====

export function registerCompany(
  name: string,
  authorizedPerson?: string,
): { ok: boolean; companyId: string; loginCode: string; message: string } {
  if (!name.trim())
    return {
      ok: false,
      companyId: "",
      loginCode: "",
      message: "Company name required",
    };
  const companies = load<Company>(KEYS.companies);
  const existingCodes = companies.map((c) => c.loginCode);
  const loginCode = uniqueCode(16, existingCodes);
  const id = nextId();
  const company: Company = {
    id,
    name: name.trim(),
    authorizedPerson: authorizedPerson?.trim() || undefined,
    loginCode,
    createdAt: Date.now(),
  };
  companies.push(company);
  save(KEYS.companies, companies);
  return { ok: true, companyId: id, loginCode, message: "Company registered" };
}

export function loginCompany(loginCode: string): {
  ok: boolean;
  company?: Company;
  message: string;
} {
  const companies = load<Company>(KEYS.companies);
  const company = companies.find((c) => c.loginCode === loginCode.trim());
  if (!company) return { ok: false, message: "Invalid login code" };
  return { ok: true, company, message: "Login successful" };
}

export function createInviteCode(
  companyId: string,
  maxUses?: number,
  expiresAt?: number,
): { ok: boolean; code: string; inviteId: string; message: string } {
  const inviteCodes = load<InviteCode>(KEYS.inviteCodes);
  const existingCodes = inviteCodes.map((c) => c.code);
  const code = uniqueCode(11, existingCodes);
  const id = nextId();
  const invite: InviteCode = {
    id,
    companyId,
    code,
    maxUses,
    usedCount: 0,
    expiresAt,
    cancelled: false,
    createdAt: Date.now(),
  };
  inviteCodes.push(invite);
  save(KEYS.inviteCodes, inviteCodes);
  return { ok: true, code, inviteId: id, message: "Invite code created" };
}

export function cancelInviteCode(
  inviteId: string,
  companyId: string,
): { ok: boolean; message: string } {
  const inviteCodes = load<InviteCode>(KEYS.inviteCodes);
  const idx = inviteCodes.findIndex(
    (c) => c.id === inviteId && c.companyId === companyId,
  );
  if (idx === -1) return { ok: false, message: "Not found" };
  inviteCodes[idx].cancelled = true;
  save(KEYS.inviteCodes, inviteCodes);
  return { ok: true, message: "Cancelled" };
}

export function getCompanyInviteCodes(companyId: string): InviteCode[] {
  return load<InviteCode>(KEYS.inviteCodes).filter(
    (c) => c.companyId === companyId,
  );
}

export function getCompanyEmployees(companyId: string): Employee[] {
  return load<Employee>(KEYS.employees).filter((e) =>
    e.companyIds.includes(companyId),
  );
}

export function getCompanyAttendance(
  companyId: string,
  fromTime?: number,
  toTime?: number,
  employeeId?: string,
): AttendanceRecord[] {
  return load<AttendanceRecord>(KEYS.attendance)
    .filter((r) => {
      if (r.companyId !== companyId) return false;
      if (fromTime && r.timestamp < fromTime) return false;
      if (toTime && r.timestamp > toTime) return false;
      if (employeeId && r.employeeId !== employeeId) return false;
      return true;
    })
    .sort((a, b) => b.timestamp - a.timestamp);
}

export function getAllCompanyAttendance(companyId: string): AttendanceRecord[] {
  return load<AttendanceRecord>(KEYS.attendance)
    .filter((r) => r.companyId === companyId)
    .sort((a, b) => a.timestamp - b.timestamp);
}

export function getDailyCheckinCount(
  companyId: string,
  dayStart: number,
  dayEnd: number,
): number {
  return load<AttendanceRecord>(KEYS.attendance).filter(
    (r) =>
      r.companyId === companyId &&
      r.recordType === "checkin" &&
      r.timestamp >= dayStart &&
      r.timestamp <= dayEnd,
  ).length;
}

// ===== EMPLOYEE =====

export function registerEmployee(
  fullName: string,
  phone?: string,
): { ok: boolean; employeeId: string; loginCode: string; message: string } {
  if (!fullName.trim())
    return {
      ok: false,
      employeeId: "",
      loginCode: "",
      message: "Full name required",
    };
  const employees = load<Employee>(KEYS.employees);
  const existingCodes = employees.map((e) => e.loginCode);
  const loginCode = uniqueCode(12, existingCodes);
  const id = nextId();
  const employee: Employee = {
    id,
    fullName: fullName.trim(),
    phone: phone?.trim() || undefined,
    loginCode,
    companyIds: [],
    createdAt: Date.now(),
  };
  employees.push(employee);
  save(KEYS.employees, employees);
  return {
    ok: true,
    employeeId: id,
    loginCode,
    message: "Employee registered",
  };
}

export function loginEmployee(loginCode: string): {
  ok: boolean;
  employee?: Employee;
  message: string;
} {
  const employees = load<Employee>(KEYS.employees);
  const employee = employees.find((e) => e.loginCode === loginCode.trim());
  if (!employee) return { ok: false, message: "Invalid login code" };
  return { ok: true, employee, message: "Login successful" };
}

export function getEmployee(id: string): Employee | undefined {
  return load<Employee>(KEYS.employees).find((e) => e.id === id);
}

export function getCompany(id: string): Company | undefined {
  return load<Company>(KEYS.companies).find((c) => c.id === id);
}

export function joinCompany(
  employeeId: string,
  inviteCode: string,
): { ok: boolean; companyName: string; message: string } {
  const inviteCodes = load<InviteCode>(KEYS.inviteCodes);
  const invite = inviteCodes.find((c) => c.code === inviteCode.trim());
  if (!invite)
    return { ok: false, companyName: "", message: "Invalid invite code" };
  if (invite.cancelled)
    return {
      ok: false,
      companyName: "",
      message: "Invite code has been cancelled",
    };
  if (invite.expiresAt && Date.now() > invite.expiresAt)
    return { ok: false, companyName: "", message: "Invite code has expired" };
  if (invite.maxUses !== undefined && invite.usedCount >= invite.maxUses)
    return {
      ok: false,
      companyName: "",
      message: "Invite code usage limit reached",
    };

  const employees = load<Employee>(KEYS.employees);
  const empIdx = employees.findIndex((e) => e.id === employeeId);
  if (empIdx === -1)
    return { ok: false, companyName: "", message: "Employee not found" };
  if (employees[empIdx].companyIds.includes(invite.companyId))
    return {
      ok: false,
      companyName: "",
      message: "Already a member of this company",
    };

  employees[empIdx].companyIds.push(invite.companyId);
  save(KEYS.employees, employees);

  const invIdx = inviteCodes.findIndex((c) => c.id === invite.id);
  inviteCodes[invIdx].usedCount += 1;
  save(KEYS.inviteCodes, inviteCodes);

  const company = getCompany(invite.companyId);
  return {
    ok: true,
    companyName: company?.name || "",
    message: "Successfully joined company",
  };
}

export function toggleAttendance(
  employeeId: string,
  companyId: string,
): { ok: boolean; recordType: string; timestamp: number; message: string } {
  const employee = getEmployee(employeeId);
  if (!employee)
    return {
      ok: false,
      recordType: "",
      timestamp: 0,
      message: "Employee not found",
    };
  if (!employee.companyIds.includes(companyId))
    return { ok: false, recordType: "", timestamp: 0, message: "Not a member" };

  const records = load<AttendanceRecord>(KEYS.attendance)
    .filter((r) => r.employeeId === employeeId && r.companyId === companyId)
    .sort((a, b) => b.timestamp - a.timestamp);

  const lastRecord = records[0];
  const isCurrentlyIn = lastRecord && lastRecord.recordType === "checkin";
  const newType: "checkin" | "checkout" = isCurrentlyIn
    ? "checkout"
    : "checkin";

  const now = Date.now();
  const id = nextId();
  const record: AttendanceRecord = {
    id,
    employeeId,
    employeeName: employee.fullName,
    companyId,
    recordType: newType,
    timestamp: now,
  };

  const all = load<AttendanceRecord>(KEYS.attendance);
  all.push(record);
  save(KEYS.attendance, all);

  return {
    ok: true,
    recordType: newType,
    timestamp: now,
    message: newType === "checkin" ? "Checked in" : "Checked out",
  };
}

export function getLastAttendanceStatus(
  employeeId: string,
  companyId: string,
): { isCheckedIn: boolean; lastTimestamp?: number } {
  const records = load<AttendanceRecord>(KEYS.attendance)
    .filter((r) => r.employeeId === employeeId && r.companyId === companyId)
    .sort((a, b) => b.timestamp - a.timestamp);
  const last = records[0];
  if (!last) return { isCheckedIn: false };
  return {
    isCheckedIn: last.recordType === "checkin",
    lastTimestamp: last.timestamp,
  };
}

export function getEmployeeAttendance(
  employeeId: string,
  companyId?: string,
  fromTime?: number,
  toTime?: number,
): AttendanceRecord[] {
  return load<AttendanceRecord>(KEYS.attendance)
    .filter((r) => {
      if (r.employeeId !== employeeId) return false;
      if (companyId && r.companyId !== companyId) return false;
      if (fromTime && r.timestamp < fromTime) return false;
      if (toTime && r.timestamp > toTime) return false;
      return true;
    })
    .sort((a, b) => b.timestamp - a.timestamp);
}

export function getInviteCodeStatus(
  invite: InviteCode,
): "active" | "cancelled" | "expired" | "limit" {
  if (invite.cancelled) return "cancelled";
  if (invite.expiresAt && Date.now() > invite.expiresAt) return "expired";
  if (invite.maxUses !== undefined && invite.usedCount >= invite.maxUses)
    return "limit";
  return "active";
}
