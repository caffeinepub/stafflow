# StafFlow

## Current State
StafFlow is a localStorage-based personnel tracking app (v9) with: authentication (company/employee codes), attendance check-in/out, break tracking, leave records, leave requests, correction requests, monthly summaries, overtime, departments, shifts, public holidays, backup/restore, audit log, auto-checkout, kiosk mode, visual statistics, payroll reports, threshold alerts, and bulk operations. 10-language support.

## Requested Changes (Diff)

### Add
1. **İzin bakiyesi takibi (Leave Balance Tracking)**
   - New `LeaveBalance` interface: `{ id, companyId, employeeId, annualDays, usedDays }`
   - Storage key: `sf_leave_balances`
   - Store functions: `setLeaveBalance(companyId, employeeId, annualDays)`, `getLeaveBalance(companyId, employeeId): LeaveBalance | undefined`, `getCompanyLeaveBalances(companyId): LeaveBalance[]`
   - When a leave record is added (addLeaveRecord), auto-increment usedDays if balance exists
   - Company dashboard > Employees tab: inline leave balance display (X/Y gün) with edit button to set annual entitlement per employee
   - Employee dashboard > Leave Requests tab: show remaining balance per company

2. **Çoklu şirket konsolide görünümü (Multi-Company Consolidated View)**
   - New tab in EmployeeDashboard: "Özet" (overview)
   - Shows one summary card per company the employee belongs to
   - Each card shows: company name, this month attendance days, leave days, check-in status today, remaining leave balance (if set)
   - No new store functions needed; uses existing getMonthlyAttendanceSummary, getLeaveBalance, getLastAttendanceStatus

3. **Duyuru sistemi (Announcement System)**
   - New `Announcement` interface: `{ id, companyId, title, content, createdAt, pinned?: boolean }`
   - Storage key: `sf_announcements`
   - Store functions: `addAnnouncement(companyId, title, content, pinned?)`, `deleteAnnouncement(id, companyId)`, `getCompanyAnnouncements(companyId): Announcement[]`
   - Company dashboard: new "Duyurular" tab to create/delete announcements
   - Employee dashboard: show active announcements per company in the companies tab (small banner below company name)
   - KioskMode component: show pinned announcements at top

### Modify
- `store.ts`: Add LeaveBalance and Announcement interfaces + CRUD functions; modify `addLeaveRecord` to auto-increment usedDays
- `CompanyDashboard.tsx`: Add leave balance editing in employees tab + new announcements tab
- `EmployeeDashboard.tsx`: Add consolidated overview tab + show announcements per company + show leave balance in leave requests tab
- `KioskMode.tsx`: Show pinned announcements
- `i18n.ts`: Add translation keys for all 3 features in all 10 languages

### Remove
- Nothing

## Implementation Plan
1. Update store.ts with LeaveBalance and Announcement interfaces + functions, modify addLeaveRecord
2. Update i18n.ts with new translation keys
3. Update CompanyDashboard.tsx with leave balance in employees tab and new announcements tab
4. Update EmployeeDashboard.tsx with consolidated overview tab, announcement display, leave balance
5. Update KioskMode.tsx to show pinned announcements
