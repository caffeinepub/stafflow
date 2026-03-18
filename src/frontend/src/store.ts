// localStorage-based data store for StafFlow
// All data is stored in localStorage since backend IDL is unavailable

export interface Shift {
  id: string;
  name: string;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
}

export interface Company {
  id: string;
  name: string;
  authorizedPerson?: string;
  loginCode: string;
  createdAt: number;
  workHours?: { start: string; end: string };
  workDays?: number[]; // 0=Sun,1=Mon...6=Sat, default [1,2,3,4,5]
  shifts?: Shift[]; // named shifts
  minDailyHours?: number; // minimum required daily work hours (0 = disabled)
  autoCheckout?: { enabled: boolean; mode: "auto" | "flag" };
}

export interface Employee {
  id: string;
  fullName: string;
  phone?: string;
  loginCode: string;
  companyIds: string[];
  createdAt: number;
  departments?: Record<string, string>; // companyId -> department name
  activeInCompanies?: Record<string, boolean>; // companyId -> active status (undefined/true = active)
  assignedShifts?: Record<string, string>; // companyId -> shiftId
  personalWorkHours?: Record<string, { start: string; end: string }>; // companyId -> hours
  personalMinHours?: Record<string, number>; // companyId -> min hours
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

export interface LeaveRecord {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  type: "leave" | "sick" | "excuse";
  note?: string;
  createdAt: number;
}

export interface PublicHoliday {
  id: string;
  companyId: string;
  date: string; // YYYY-MM-DD
  name: string;
}

export interface CorrectionRequest {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  requestType: "checkin" | "checkout";
  requestedDate: string; // YYYY-MM-DD
  requestedTime: string; // HH:MM
  reason: string;
  status: "pending" | "approved" | "rejected";
  rejectionNote?: string;
  createdAt: number;
  documentBase64?: string;
  documentName?: string;
}

const KEYS = {
  companies: "sf_companies",
  employees: "sf_employees",
  inviteCodes: "sf_invite_codes",
  attendance: "sf_attendance",
  leaveRecords: "sf_leave_records",
  idCounter: "sf_id_counter",
  holidays: "sf_holidays",
  correctionRequests: "sf_correction_requests",
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

export function getRecordDurationMinutes(
  record: AttendanceRecord,
  allRecords: AttendanceRecord[],
): number {
  if (record.recordType !== "checkout") return 0;
  const paired = allRecords
    .filter(
      (r) =>
        r.employeeId === record.employeeId &&
        r.companyId === record.companyId &&
        r.recordType === "checkin" &&
        r.timestamp < record.timestamp,
    )
    .sort((a, b) => b.timestamp - a.timestamp)[0];
  if (!paired) return 0;
  return Math.max(0, Math.floor((record.timestamp - paired.timestamp) / 60000));
}

// ===== WORK HOURS HELPERS =====

export function isLateCheckin(timestamp: number, workStart: string): boolean {
  const date = new Date(timestamp);
  const [startHour, startMinute] = workStart.split(":").map(Number);
  const recordMinutes = date.getHours() * 60 + date.getMinutes();
  const startMinutes = startHour * 60 + startMinute;
  return recordMinutes > startMinutes;
}

export function isEarlyCheckout(timestamp: number, workEnd: string): boolean {
  const date = new Date(timestamp);
  const [endHour, endMinute] = workEnd.split(":").map(Number);
  const recordMinutes = date.getHours() * 60 + date.getMinutes();
  const endMinutes = endHour * 60 + endMinute;
  return recordMinutes < endMinutes;
}

// ===== MONTHLY SUMMARY =====

export interface MonthlySummaryRow {
  employee: Employee;
  daysAttended: number;
  daysAbsent: number;
  totalWorkMinutes: number;
  leaveDays: number;
}

export function getMonthlyAttendanceSummary(
  companyId: string,
  year: number,
  month: number, // 0-based
): MonthlySummaryRow[] {
  const employees = load<Employee>(KEYS.employees).filter((e) =>
    e.companyIds.includes(companyId),
  );
  const allRecords = load<AttendanceRecord>(KEYS.attendance).filter(
    (r) => r.companyId === companyId,
  );
  const leaveRecords = load<LeaveRecord>(KEYS.leaveRecords).filter(
    (l) => l.companyId === companyId,
  );
  const holidays = load<PublicHoliday>(KEYS.holidays).filter(
    (h) => h.companyId === companyId,
  );

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const company = load<Company>(KEYS.companies).find((c) => c.id === companyId);
  const workDays = company?.workDays ?? [1, 2, 3, 4, 5];

  // Build set of holiday date strings in this month
  const holidayDates = new Set<string>();
  for (const h of holidays) {
    const d = new Date(h.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      holidayDates.add(h.date);
    }
  }

  let workingDays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    const day = dateObj.getDay();
    // Pad month/day to YYYY-MM-DD
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    const dateStr = `${year}-${mm}-${dd}`;
    if (workDays.includes(day) && !holidayDates.has(dateStr)) workingDays++;
  }

  return employees.map((emp) => {
    const empRecords = allRecords.filter((r) => r.employeeId === emp.id);

    const attendedDates = new Set<string>();
    let totalWorkMinutes = 0;

    const checkins = empRecords
      .filter((r) => r.recordType === "checkin")
      .filter((r) => {
        const d = new Date(r.timestamp);
        return d.getFullYear() === year && d.getMonth() === month;
      });

    for (const checkin of checkins) {
      const dateStr = new Date(checkin.timestamp).toDateString();
      attendedDates.add(dateStr);

      const checkout = empRecords
        .filter(
          (r) => r.recordType === "checkout" && r.timestamp > checkin.timestamp,
        )
        .sort((a, b) => a.timestamp - b.timestamp)[0];

      if (checkout) {
        totalWorkMinutes += Math.floor(
          (checkout.timestamp - checkin.timestamp) / 60000,
        );
      }
    }

    const empLeaves = leaveRecords.filter((l) => {
      if (l.employeeId !== emp.id) return false;
      const d = new Date(l.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    const daysAttended = attendedDates.size;
    const leaveDays = empLeaves.length;
    const daysAbsent = Math.max(0, workingDays - daysAttended - leaveDays);

    return {
      employee: emp,
      daysAttended,
      daysAbsent,
      totalWorkMinutes,
      leaveDays,
    };
  });
}

// ===== LIVE STATUS =====

export function getCheckedInEmployees(
  companyId: string,
): { employee: Employee; checkinTimestamp: number }[] {
  const employees = load<Employee>(KEYS.employees).filter(
    (e) =>
      e.companyIds.includes(companyId) &&
      e.activeInCompanies?.[companyId] !== false,
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
  const employees = load<Employee>(KEYS.employees).filter(
    (e) =>
      e.companyIds.includes(companyId) &&
      e.activeInCompanies?.[companyId] !== false,
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

export function updateCompanyWorkHours(
  companyId: string,
  start: string,
  end: string,
): { ok: boolean; message: string } {
  const companies = load<Company>(KEYS.companies);
  const idx = companies.findIndex((c) => c.id === companyId);
  if (idx === -1) return { ok: false, message: "Company not found" };
  companies[idx].workHours = { start, end };
  save(KEYS.companies, companies);
  return { ok: true, message: "Work hours updated" };
}

export function updateCompanyWorkDays(
  companyId: string,
  workDays: number[],
): { ok: boolean; message: string } {
  const companies = load<Company>(KEYS.companies);
  const idx = companies.findIndex((c) => c.id === companyId);
  if (idx === -1) return { ok: false, message: "Company not found" };
  companies[idx].workDays = workDays;
  save(KEYS.companies, companies);
  return { ok: true, message: "Work days updated" };
}

export function updateCompanyShifts(
  companyId: string,
  shifts: Shift[],
): { ok: boolean; message: string } {
  const companies = load<Company>(KEYS.companies);
  const idx = companies.findIndex((c) => c.id === companyId);
  if (idx === -1) return { ok: false, message: "Company not found" };
  companies[idx].shifts = shifts;
  save(KEYS.companies, companies);
  return { ok: true, message: "Shifts updated" };
}

export function updateCompanyMinHours(
  companyId: string,
  minDailyHours: number,
): { ok: boolean; message: string } {
  const companies = load<Company>(KEYS.companies);
  const idx = companies.findIndex((c) => c.id === companyId);
  if (idx === -1) return { ok: false, message: "Company not found" };
  companies[idx].minDailyHours = minDailyHours;
  save(KEYS.companies, companies);
  return { ok: true, message: "Min daily hours updated" };
}

export function getOvertimeMinutes(
  _checkinTs: number,
  checkoutTs: number,
  workEnd: string,
): number {
  const checkout = new Date(checkoutTs);
  const [endHour, endMinute] = workEnd.split(":").map(Number);
  const workEndTs = new Date(checkout);
  workEndTs.setHours(endHour, endMinute, 0, 0);
  if (checkoutTs > workEndTs.getTime()) {
    return Math.floor((checkoutTs - workEndTs.getTime()) / 60000);
  }
  return 0;
}

export function updateEmployeeDepartment(
  employeeId: string,
  companyId: string,
  department: string,
): { ok: boolean; message: string } {
  const employees = load<Employee>(KEYS.employees);
  const idx = employees.findIndex((e) => e.id === employeeId);
  if (idx === -1) return { ok: false, message: "Employee not found" };
  if (!employees[idx].departments) employees[idx].departments = {};
  (employees[idx].departments as Record<string, string>)[companyId] =
    department.trim();
  save(KEYS.employees, employees);
  return { ok: true, message: "Department updated" };
}

export function toggleEmployeeActive(
  employeeId: string,
  companyId: string,
): { ok: boolean; active: boolean; message: string } {
  const employees = load<Employee>(KEYS.employees);
  const idx = employees.findIndex((e) => e.id === employeeId);
  if (idx === -1)
    return { ok: false, active: true, message: "Employee not found" };
  if (!employees[idx].activeInCompanies) employees[idx].activeInCompanies = {};
  const current = (employees[idx].activeInCompanies as Record<string, boolean>)[
    companyId
  ];
  const newActive = current === false;
  (employees[idx].activeInCompanies as Record<string, boolean>)[companyId] =
    newActive;
  save(KEYS.employees, employees);
  return {
    ok: true,
    active: newActive,
    message: newActive ? "Activated" : "Deactivated",
  };
}

export function assignEmployeeShift(
  employeeId: string,
  companyId: string,
  shiftId: string,
): { ok: boolean; message: string } {
  const employees = load<Employee>(KEYS.employees);
  const idx = employees.findIndex((e) => e.id === employeeId);
  if (idx === -1) return { ok: false, message: "Employee not found" };
  if (!employees[idx].assignedShifts) employees[idx].assignedShifts = {};
  if (shiftId) {
    (employees[idx].assignedShifts as Record<string, string>)[companyId] =
      shiftId;
  } else {
    delete (employees[idx].assignedShifts as Record<string, string>)[companyId];
  }
  save(KEYS.employees, employees);
  return { ok: true, message: "Shift assigned" };
}

export function getCompanyDepartments(companyId: string): string[] {
  const employees = load<Employee>(KEYS.employees).filter((e) =>
    e.companyIds.includes(companyId),
  );
  const depts = new Set<string>();
  for (const emp of employees) {
    const dept = emp.departments?.[companyId];
    if (dept) depts.add(dept);
  }
  return Array.from(depts).sort();
}

export function updateEmployeePersonalWorkHours(
  employeeId: string,
  companyId: string,
  start: string,
  end: string,
): { ok: boolean; message: string } {
  const employees = load<Employee>(KEYS.employees);
  const idx = employees.findIndex((e) => e.id === employeeId);
  if (idx === -1) return { ok: false, message: "Employee not found" };
  if (!employees[idx].personalWorkHours) employees[idx].personalWorkHours = {};
  (
    employees[idx].personalWorkHours as Record<
      string,
      { start: string; end: string }
    >
  )[companyId] = { start, end };
  save(KEYS.employees, employees);
  return { ok: true, message: "Personal work hours updated" };
}

export function clearEmployeePersonalWorkHours(
  employeeId: string,
  companyId: string,
): { ok: boolean; message: string } {
  const employees = load<Employee>(KEYS.employees);
  const idx = employees.findIndex((e) => e.id === employeeId);
  if (idx === -1) return { ok: false, message: "Employee not found" };
  if (employees[idx].personalWorkHours) {
    delete (employees[idx].personalWorkHours as Record<string, unknown>)[
      companyId
    ];
  }
  save(KEYS.employees, employees);
  return { ok: true, message: "Personal work hours cleared" };
}

export function updateEmployeePersonalMinHours(
  employeeId: string,
  companyId: string,
  hours: number,
): { ok: boolean; message: string } {
  const employees = load<Employee>(KEYS.employees);
  const idx = employees.findIndex((e) => e.id === employeeId);
  if (idx === -1) return { ok: false, message: "Employee not found" };
  if (!employees[idx].personalMinHours) employees[idx].personalMinHours = {};
  (employees[idx].personalMinHours as Record<string, number>)[companyId] =
    hours;
  save(KEYS.employees, employees);
  return { ok: true, message: "Personal min hours updated" };
}

// ===== PUBLIC HOLIDAYS =====

export function addPublicHoliday(
  companyId: string,
  date: string,
  name: string,
): { ok: boolean; message: string } {
  if (!date || !name.trim())
    return { ok: false, message: "Date and name required" };
  const holidays = load<PublicHoliday>(KEYS.holidays);
  const id = nextId();
  holidays.push({ id, companyId, date, name: name.trim() });
  save(KEYS.holidays, holidays);
  return { ok: true, message: "Holiday added" };
}

export function deletePublicHoliday(
  id: string,
  companyId: string,
): { ok: boolean; message: string } {
  const holidays = load<PublicHoliday>(KEYS.holidays);
  const idx = holidays.findIndex(
    (h) => h.id === id && h.companyId === companyId,
  );
  if (idx === -1) return { ok: false, message: "Not found" };
  holidays.splice(idx, 1);
  save(KEYS.holidays, holidays);
  return { ok: true, message: "Deleted" };
}

export function getCompanyHolidays(companyId: string): PublicHoliday[] {
  return load<PublicHoliday>(KEYS.holidays)
    .filter((h) => h.companyId === companyId)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ===== CORRECTION REQUESTS =====

export function addCorrectionRequest(
  companyId: string,
  employeeId: string,
  requestType: "checkin" | "checkout",
  requestedDate: string,
  requestedTime: string,
  reason: string,
  documentBase64?: string,
  documentName?: string,
): { ok: boolean; message: string } {
  const employee = getEmployee(employeeId);
  if (!employee) return { ok: false, message: "Employee not found" };
  const id = nextId();
  const req: CorrectionRequest = {
    id,
    companyId,
    employeeId,
    employeeName: employee.fullName,
    requestType,
    requestedDate,
    requestedTime,
    reason: reason.trim(),
    status: "pending",
    createdAt: Date.now(),
    documentBase64: documentBase64 || undefined,
    documentName: documentName || undefined,
  };
  const requests = load<CorrectionRequest>(KEYS.correctionRequests);
  requests.push(req);
  save(KEYS.correctionRequests, requests);
  return { ok: true, message: "Correction request submitted" };
}

export function getCompanyCorrectionRequests(
  companyId: string,
): CorrectionRequest[] {
  return load<CorrectionRequest>(KEYS.correctionRequests)
    .filter((r) => r.companyId === companyId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function getEmployeeCorrectionRequests(
  employeeId: string,
  companyId: string,
): CorrectionRequest[] {
  return load<CorrectionRequest>(KEYS.correctionRequests)
    .filter((r) => r.employeeId === employeeId && r.companyId === companyId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function approveCorrectionRequest(
  id: string,
  companyId: string,
): { ok: boolean; message: string } {
  const requests = load<CorrectionRequest>(KEYS.correctionRequests);
  const idx = requests.findIndex(
    (r) => r.id === id && r.companyId === companyId,
  );
  if (idx === -1) return { ok: false, message: "Not found" };
  const req = requests[idx];

  // Create an attendance record
  const recordDate = new Date(`${req.requestedDate}T${req.requestedTime}:00`);
  const timestamp = recordDate.getTime();
  const recId = nextId();
  const record: AttendanceRecord = {
    id: recId,
    employeeId: req.employeeId,
    employeeName: req.employeeName,
    companyId: req.companyId,
    recordType: req.requestType,
    timestamp,
  };
  const all = load<AttendanceRecord>(KEYS.attendance);
  all.push(record);
  save(KEYS.attendance, all);

  requests[idx].status = "approved";
  save(KEYS.correctionRequests, requests);
  return { ok: true, message: "Approved" };
}

export function rejectCorrectionRequest(
  id: string,
  companyId: string,
  rejectionNote?: string,
): { ok: boolean; message: string } {
  const requests = load<CorrectionRequest>(KEYS.correctionRequests);
  const idx = requests.findIndex(
    (r) => r.id === id && r.companyId === companyId,
  );
  if (idx === -1) return { ok: false, message: "Not found" };
  requests[idx].status = "rejected";
  requests[idx].rejectionNote = rejectionNote?.trim() || undefined;
  save(KEYS.correctionRequests, requests);
  return { ok: true, message: "Rejected" };
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

// ===== LEAVE RECORDS =====

export function addLeaveRecord(
  companyId: string,
  employeeId: string,
  date: string,
  type: LeaveRecord["type"],
  note?: string,
): { ok: boolean; message: string } {
  const employee = getEmployee(employeeId);
  if (!employee) return { ok: false, message: "Employee not found" };
  const id = nextId();
  const record: LeaveRecord = {
    id,
    companyId,
    employeeId,
    employeeName: employee.fullName,
    date,
    type,
    note: note?.trim() || undefined,
    createdAt: Date.now(),
  };
  const records = load<LeaveRecord>(KEYS.leaveRecords);
  records.push(record);
  save(KEYS.leaveRecords, records);
  incrementLeaveUsed(companyId, employeeId);
  return { ok: true, message: "Leave record added" };
}

export function getCompanyLeaveRecords(
  companyId: string,
  fromDate?: string,
  toDate?: string,
  employeeId?: string,
): LeaveRecord[] {
  return load<LeaveRecord>(KEYS.leaveRecords)
    .filter((l) => {
      if (l.companyId !== companyId) return false;
      if (fromDate && l.date < fromDate) return false;
      if (toDate && l.date > toDate) return false;
      if (employeeId && l.employeeId !== employeeId) return false;
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function deleteLeaveRecord(
  id: string,
  companyId: string,
): { ok: boolean; message: string } {
  const records = load<LeaveRecord>(KEYS.leaveRecords);
  const idx = records.findIndex(
    (l) => l.id === id && l.companyId === companyId,
  );
  if (idx === -1) return { ok: false, message: "Not found" };
  records.splice(idx, 1);
  save(KEYS.leaveRecords, records);
  return { ok: true, message: "Deleted" };
}

// ===== BACKUP / RESTORE =====

export function exportAllData(): string {
  const data: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("sf_")) {
      data[key] = localStorage.getItem(key);
    }
  }
  return JSON.stringify(data, null, 2);
}

export function importAllData(jsonStr: string): {
  ok: boolean;
  message: string;
} {
  try {
    const data = JSON.parse(jsonStr) as Record<string, string>;
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("sf_")) toRemove.push(key);
    }
    for (const key of toRemove) localStorage.removeItem(key);
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith("sf_") && typeof value === "string") {
        localStorage.setItem(key, value);
      }
    }
    return { ok: true, message: "Data imported successfully" };
  } catch {
    return { ok: false, message: "Invalid backup file" };
  }
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

export function updateEmployee(
  id: string,
  fullName: string,
  phone?: string,
): { ok: boolean; employee?: Employee; message: string } {
  if (!fullName.trim()) return { ok: false, message: "Full name required" };
  const employees = load<Employee>(KEYS.employees);
  const idx = employees.findIndex((e) => e.id === id);
  if (idx === -1) return { ok: false, message: "Employee not found" };
  employees[idx].fullName = fullName.trim();
  employees[idx].phone = phone?.trim() || undefined;
  save(KEYS.employees, employees);
  return { ok: true, employee: employees[idx], message: "Employee updated" };
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

  if (employee.activeInCompanies?.[companyId] === false) {
    return {
      ok: false,
      recordType: "",
      timestamp: 0,
      message: "Employee is inactive",
    };
  }

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

// ===== BREAK RECORDS =====

export interface BreakRecord {
  id: string;
  employeeId: string;
  companyId: string;
  attendanceRecordId: string;
  startTime: number;
  endTime?: number;
}

const BREAK_KEY = "sf_breaks";
const LEAVE_REQ_KEY = "sf_leave_requests";

export function startBreak(
  employeeId: string,
  companyId: string,
): { ok: boolean; breakId: string; message: string } {
  const status = getLastAttendanceStatus(employeeId, companyId);
  if (!status.isCheckedIn)
    return { ok: false, breakId: "", message: "Not checked in" };

  const breaks = load<BreakRecord>(BREAK_KEY);
  const activeBreak = breaks.find(
    (b) =>
      b.employeeId === employeeId && b.companyId === companyId && !b.endTime,
  );
  if (activeBreak)
    return { ok: false, breakId: "", message: "Already on break" };

  const id = nextId();
  const record: BreakRecord = {
    id,
    employeeId,
    companyId,
    attendanceRecordId: "",
    startTime: Date.now(),
  };
  breaks.push(record);
  save(BREAK_KEY, breaks);
  return { ok: true, breakId: id, message: "Break started" };
}

export function endBreak(
  employeeId: string,
  companyId: string,
): { ok: boolean; message: string } {
  const breaks = load<BreakRecord>(BREAK_KEY);
  const idx = breaks.findIndex(
    (b) =>
      b.employeeId === employeeId && b.companyId === companyId && !b.endTime,
  );
  if (idx === -1) return { ok: false, message: "No active break" };
  breaks[idx].endTime = Date.now();
  save(BREAK_KEY, breaks);
  return { ok: true, message: "Break ended" };
}

export function getActiveBreak(
  employeeId: string,
  companyId: string,
): BreakRecord | undefined {
  return load<BreakRecord>(BREAK_KEY).find(
    (b) =>
      b.employeeId === employeeId && b.companyId === companyId && !b.endTime,
  );
}

export function getTotalBreakMinutes(
  employeeId: string,
  companyId: string,
  checkinTimestamp: number,
  checkoutTimestamp: number,
): number {
  const breaks = load<BreakRecord>(BREAK_KEY).filter(
    (b) =>
      b.employeeId === employeeId &&
      b.companyId === companyId &&
      b.startTime >= checkinTimestamp &&
      b.startTime <= checkoutTimestamp &&
      b.endTime !== undefined,
  );
  return breaks.reduce((sum, b) => {
    return sum + Math.floor(((b.endTime ?? 0) - b.startTime) / 60000);
  }, 0);
}

// ===== LEAVE REQUESTS =====

export interface LeaveRequest {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  date: string;
  leaveType: "leave" | "sick" | "excuse";
  reason: string;
  status: "pending" | "approved" | "rejected";
  rejectionNote?: string;
  createdAt: number;
  documentBase64?: string;
  documentName?: string;
}

export function addLeaveRequest(
  companyId: string,
  employeeId: string,
  date: string,
  leaveType: LeaveRequest["leaveType"],
  reason: string,
  documentBase64?: string,
  documentName?: string,
): { ok: boolean; message: string } {
  if (!date || !reason.trim())
    return { ok: false, message: "Date and reason required" };
  const employee = getEmployee(employeeId);
  if (!employee) return { ok: false, message: "Employee not found" };
  const id = nextId();
  const req: LeaveRequest = {
    id,
    companyId,
    employeeId,
    employeeName: employee.fullName,
    date,
    leaveType,
    reason: reason.trim(),
    status: "pending",
    createdAt: Date.now(),
    documentBase64: documentBase64 || undefined,
    documentName: documentName || undefined,
  };
  const requests = load<LeaveRequest>(LEAVE_REQ_KEY);
  requests.push(req);
  save(LEAVE_REQ_KEY, requests);
  return { ok: true, message: "Leave request submitted" };
}

export function getCompanyLeaveRequests(companyId: string): LeaveRequest[] {
  return load<LeaveRequest>(LEAVE_REQ_KEY)
    .filter((r) => r.companyId === companyId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function getEmployeeLeaveRequests(
  employeeId: string,
  companyId: string,
): LeaveRequest[] {
  return load<LeaveRequest>(LEAVE_REQ_KEY)
    .filter((r) => r.employeeId === employeeId && r.companyId === companyId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function approveLeaveRequest(
  id: string,
  companyId: string,
): { ok: boolean; message: string } {
  const requests = load<LeaveRequest>(LEAVE_REQ_KEY);
  const idx = requests.findIndex(
    (r) => r.id === id && r.companyId === companyId,
  );
  if (idx === -1) return { ok: false, message: "Not found" };
  const req = requests[idx];
  // Create a leave record
  addLeaveRecord(
    companyId,
    req.employeeId,
    req.date,
    req.leaveType,
    req.reason,
  );
  requests[idx].status = "approved";
  save(LEAVE_REQ_KEY, requests);
  return { ok: true, message: "Approved" };
}

export function rejectLeaveRequest(
  id: string,
  companyId: string,
  rejectionNote?: string,
): { ok: boolean; message: string } {
  const requests = load<LeaveRequest>(LEAVE_REQ_KEY);
  const idx = requests.findIndex(
    (r) => r.id === id && r.companyId === companyId,
  );
  if (idx === -1) return { ok: false, message: "Not found" };
  requests[idx].status = "rejected";
  requests[idx].rejectionNote = rejectionNote?.trim() || undefined;
  save(LEAVE_REQ_KEY, requests);
  return { ok: true, message: "Rejected" };
}

// ===== AUDIT LOG =====

export interface AuditEntry {
  id: string;
  timestamp: number;
  actorType: "company" | "employee";
  actorId: string;
  actorName: string;
  companyId: string;
  action: string;
  details: string;
}

const AUDIT_KEY = "sf_audit_log";

export function addAuditEntry(entry: Omit<AuditEntry, "id">): void {
  const entries = load<AuditEntry>(AUDIT_KEY);
  entries.push({ ...entry, id: nextId() });
  // Keep last 1000 entries
  if (entries.length > 1000) entries.splice(0, entries.length - 1000);
  save(AUDIT_KEY, entries);
}

export function getCompanyAuditLog(companyId: string): AuditEntry[] {
  return load<AuditEntry>(AUDIT_KEY)
    .filter((e) => e.companyId === companyId)
    .sort((a, b) => b.timestamp - a.timestamp);
}

// ===== AUTO CHECKOUT =====

export function updateCompanyAutoCheckout(
  companyId: string,
  enabled: boolean,
  mode: "auto" | "flag",
): { ok: boolean; message: string } {
  const companies = load<Company>(KEYS.companies);
  const idx = companies.findIndex((c) => c.id === companyId);
  if (idx === -1) return { ok: false, message: "Company not found" };
  companies[idx].autoCheckout = { enabled, mode };
  save(KEYS.companies, companies);
  return { ok: true, message: "Auto checkout updated" };
}

const MISSING_CHECKOUT_KEY = "sf_missing_checkouts";

export interface MissingCheckout {
  employeeId: string;
  employeeName: string;
  companyId: string;
  date: string;
  checkinTimestamp: number;
}

export function addMissingCheckoutFlag(entry: MissingCheckout): void {
  const records = load<MissingCheckout>(MISSING_CHECKOUT_KEY);
  const exists = records.some(
    (r) =>
      r.employeeId === entry.employeeId &&
      r.companyId === entry.companyId &&
      r.date === entry.date,
  );
  if (!exists) {
    records.push(entry);
    save(MISSING_CHECKOUT_KEY, records);
  }
}

export function getMissingCheckouts(companyId: string): MissingCheckout[] {
  return load<MissingCheckout>(MISSING_CHECKOUT_KEY).filter(
    (r) => r.companyId === companyId,
  );
}

export function clearMissingCheckout(
  employeeId: string,
  companyId: string,
  date: string,
): void {
  const records = load<MissingCheckout>(MISSING_CHECKOUT_KEY).filter(
    (r) =>
      !(
        r.employeeId === employeeId &&
        r.companyId === companyId &&
        r.date === date
      ),
  );
  save(MISSING_CHECKOUT_KEY, records);
}

export function addAutoCheckoutRecord(
  employeeId: string,
  employeeName: string,
  companyId: string,
  checkoutTimestamp: number,
): void {
  const records = load<AttendanceRecord>(KEYS.attendance);
  const id = nextId();
  records.push({
    id,
    employeeId,
    employeeName,
    companyId,
    recordType: "checkout",
    timestamp: checkoutTimestamp,
  });
  save(KEYS.attendance, records);
}

// ===== LEAVE BALANCE =====

export interface LeaveBalance {
  id: string;
  companyId: string;
  employeeId: string;
  annualDays: number;
  usedDays: number;
}

const LEAVE_BALANCE_KEY = "sf_leave_balances";

export function setLeaveBalance(
  companyId: string,
  employeeId: string,
  annualDays: number,
): { ok: boolean; message: string } {
  const balances = load<LeaveBalance>(LEAVE_BALANCE_KEY);
  const idx = balances.findIndex(
    (b) => b.companyId === companyId && b.employeeId === employeeId,
  );
  if (idx !== -1) {
    balances[idx].annualDays = annualDays;
    save(LEAVE_BALANCE_KEY, balances);
  } else {
    balances.push({
      id: nextId(),
      companyId,
      employeeId,
      annualDays,
      usedDays: 0,
    });
    save(LEAVE_BALANCE_KEY, balances);
  }
  return { ok: true, message: "Leave balance saved" };
}

export function getLeaveBalance(
  companyId: string,
  employeeId: string,
): LeaveBalance | undefined {
  return load<LeaveBalance>(LEAVE_BALANCE_KEY).find(
    (b) => b.companyId === companyId && b.employeeId === employeeId,
  );
}

export function getCompanyLeaveBalances(companyId: string): LeaveBalance[] {
  return load<LeaveBalance>(LEAVE_BALANCE_KEY).filter(
    (b) => b.companyId === companyId,
  );
}

export function incrementLeaveUsed(
  companyId: string,
  employeeId: string,
): void {
  const balances = load<LeaveBalance>(LEAVE_BALANCE_KEY);
  const idx = balances.findIndex(
    (b) => b.companyId === companyId && b.employeeId === employeeId,
  );
  if (idx !== -1) {
    balances[idx].usedDays += 1;
    save(LEAVE_BALANCE_KEY, balances);
  }
}

// ===== ANNOUNCEMENTS =====

export interface Announcement {
  id: string;
  companyId: string;
  title: string;
  content: string;
  createdAt: number;
  pinned?: boolean;
}

const ANNOUNCEMENT_KEY = "sf_announcements";

export function addAnnouncement(
  companyId: string,
  title: string,
  content: string,
  pinned?: boolean,
): { ok: boolean; message: string } {
  const announcements = load<Announcement>(ANNOUNCEMENT_KEY);
  announcements.push({
    id: nextId(),
    companyId,
    title: title.trim(),
    content: content.trim(),
    createdAt: Date.now(),
    pinned: pinned ?? false,
  });
  save(ANNOUNCEMENT_KEY, announcements);
  return { ok: true, message: "Announcement added" };
}

export function deleteAnnouncement(
  id: string,
  companyId: string,
): { ok: boolean; message: string } {
  const announcements = load<Announcement>(ANNOUNCEMENT_KEY).filter(
    (a) => !(a.id === id && a.companyId === companyId),
  );
  save(ANNOUNCEMENT_KEY, announcements);
  return { ok: true, message: "Announcement deleted" };
}

export function getCompanyAnnouncements(companyId: string): Announcement[] {
  return load<Announcement>(ANNOUNCEMENT_KEY)
    .filter((a) => a.companyId === companyId)
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.createdAt - a.createdAt;
    });
}

// ===== WORK SCHEDULE =====

export interface WorkSchedule {
  id: string;
  companyId: string;
  year: number;
  month: number;
  day: number;
  employeeId: string;
  shiftId: string; // shiftId or 'off' or 'unassigned'
}

export function setScheduleEntry(
  companyId: string,
  year: number,
  month: number,
  day: number,
  employeeId: string,
  shiftId: string,
): void {
  const key = `sf_schedule_${companyId}`;
  const schedules = load<WorkSchedule>(key);
  const idx = schedules.findIndex(
    (s) =>
      s.year === year &&
      s.month === month &&
      s.day === day &&
      s.employeeId === employeeId,
  );
  if (idx !== -1) {
    schedules[idx].shiftId = shiftId;
  } else {
    schedules.push({
      id: nextId(),
      companyId,
      year,
      month,
      day,
      employeeId,
      shiftId,
    });
  }
  save(key, schedules);
}

export function getSchedule(
  companyId: string,
  year: number,
  month: number,
): WorkSchedule[] {
  const key = `sf_schedule_${companyId}`;
  return load<WorkSchedule>(key).filter(
    (s) => s.year === year && s.month === month,
  );
}

// ===== OVERTIME LOG =====

export interface OvertimeLog {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  recordId: string;
  date: string;
  overtimeMinutes: number;
  status: "pending" | "approved" | "rejected";
  reviewedAt?: number;
  reviewedBy?: string;
}

export function addOvertimeLog(entry: Omit<OvertimeLog, "id">): void {
  const key = `sf_overtimelog_${entry.companyId}`;
  const logs = load<OvertimeLog>(key);
  const exists = logs.find((l) => l.recordId === entry.recordId);
  if (exists) return;
  logs.push({ ...entry, id: nextId() });
  save(key, logs);
}

export function getCompanyOvertimeLogs(companyId: string): OvertimeLog[] {
  const key = `sf_overtimelog_${companyId}`;
  return load<OvertimeLog>(key).sort((a, b) => b.date.localeCompare(a.date));
}

export function updateOvertimeLogStatus(
  id: string,
  companyId: string,
  status: "approved" | "rejected",
  reviewedBy: string,
): { ok: boolean; message: string } {
  const key = `sf_overtimelog_${companyId}`;
  const logs = load<OvertimeLog>(key);
  const idx = logs.findIndex((l) => l.id === id);
  if (idx === -1) return { ok: false, message: "Not found" };
  logs[idx].status = status;
  logs[idx].reviewedAt = Date.now();
  logs[idx].reviewedBy = reviewedBy;
  save(key, logs);
  return { ok: true, message: status === "approved" ? "Approved" : "Rejected" };
}

export function ensureOvertimeLogsForCompany(companyId: string): void {
  const company = load<Company>(KEYS.companies).find((c) => c.id === companyId);
  if (!company?.workHours) return;
  const allRecords = load<AttendanceRecord>(KEYS.attendance).filter(
    (r) => r.companyId === companyId && r.recordType === "checkout",
  );
  for (const rec of allRecords) {
    const ot = getOvertimeMinutes(0, rec.timestamp, company.workHours.end);
    if (ot > 0) {
      const dateStr = new Date(rec.timestamp).toISOString().split("T")[0];
      addOvertimeLog({
        companyId,
        employeeId: rec.employeeId,
        employeeName: rec.employeeName,
        recordId: rec.id,
        date: dateStr,
        overtimeMinutes: ot,
        status: "pending",
      });
    }
  }
}
