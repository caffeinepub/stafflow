# StafFlow v17 - Tur A Feature Expansion

## Current State
v16 contains: company/personnel management, check-in/out, shifts, leave types + requests, attendance corrections, dashboard with department chart. Backend uses Motoko on Internet Computer with centralized storage.

## Requested Changes (Diff)

### Add
- **Break tracking**: Personnel can start/end breaks; net work time calculated by subtracting break durations
- **Audit log**: All admin actions (leave approval, correction approval, personnel changes) recorded with timestamp, actor, action type
- **Announcement system**: Admin posts company-wide announcements; visible in employee dashboard and kiosk
- **Notification center**: In-app notifications for leave approved/rejected, correction approved/rejected, announcements
- **Overtime approval workflow**: Overtime auto-calculated; admin can approve/reject; payroll shows approved vs unapproved separately
- **Monthly payroll/summary report**: Per-person total work hours, overtime, absences, leave days exportable as table
- **Kiosk mode**: Simplified check-in/out screen for shared tablet -- only personnel code needed (company pre-selected)
- **Attendance score**: Score per employee based on late arrivals, early departures, absences (0-100 scale with color badges)

### Modify
- AttendanceRecord: add break tracking fields (breakStart, totalBreakMinutes)
- Personnel: add attendanceScore field
- CompanyDashboard: add Rapor, Duyurular, Denetim, Kiosk tabs
- EmployeeDashboard: add Bildirimler, Duyurular sections

### Remove
- Nothing removed

## Implementation Plan
1. Backend: Add Break, AuditLog, Announcement, Notification, OvertimeApproval data types and CRUD functions
2. Backend: Add payroll calculation query, attendance score calculation
3. Backend: Add kiosk check-in function (no principal auth, just personnel code)
4. Frontend CompanyDashboard: Add Rapor tab (payroll), Duyurular tab, Denetim tab (audit log), Kiosk mode button/view
5. Frontend CompanyDashboard: Add overtime approvals section in attendance tab
6. Frontend EmployeeDashboard: Add notifications bell, announcements section, break start/end button, attendance score display
