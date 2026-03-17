# StafFlow

## Current State
Fully working localStorage-based personnel tracking app with:
- Company and employee authentication via unique codes
- Check-in/check-out toggle per company
- Attendance records listing with date/employee filters
- QR code scanning and static QR card display
- Multi-language support (10 languages)
- Dark mode

## Requested Changes (Diff)

### Add
1. **Working hours calculation** -- For each pair of checkin+checkout records, calculate duration in hours/minutes. Show in attendance tables for both company dashboard and employee history.
2. **Live status screen (company)** -- New tab or section in CompanyDashboard showing who is currently checked in vs checked out, with real-time list.
3. **Duplicate check-in prevention** -- In `toggleAttendance`, if employee is already checked in and tries to check in again (shouldn't happen given toggle logic, but add explicit guard), return an error. More importantly: block a checkin if the last record is already a checkin without a checkout.
4. **CSV export** -- Button in CompanyDashboard attendance tab to download current filtered records as CSV. Include: employee name, type, date, duration (if paired).
5. **Forgot-to-checkout warning** -- In CompanyDashboard overview/live status: highlight employees who checked in more than X hours ago (configurable, default 10h) without checking out.

### Modify
- `store.ts`: Add helper `getCheckedInEmployees(companyId)` returning employees currently checked in with their checkin timestamp.
- `store.ts`: Add helper `calculateWorkDuration(checkinTs, checkoutTs)` returning formatted string.
- `store.ts`: Update `toggleAttendance` to return error if trying to checkin when already checked in (double-checkin guard).
- `CompanyDashboard.tsx`: Add "Anlık Durum" (Live Status) tab, CSV export button, late checkout warnings in overview.
- `EmployeeDashboard.tsx`: Show calculated duration in history table when checkout paired with checkin.
- `i18n.ts`: Add translation keys for new features in all 10 languages.

### Remove
- Nothing removed.

## Implementation Plan
1. Update `store.ts`:
   - Add `getCheckedInEmployees` function
   - Add `formatDuration` helper
   - Update attendance records and queries to support duration pairing
   - Add double-checkin guard to `toggleAttendance`
2. Update `i18n.ts` with new keys: `liveStatus`, `currentlyIn`, `currentlyOut`, `workedHours`, `duration`, `exportCSV`, `lateWarning`, `checkinDuration`, `noOneSite`, `hoursAgo`
3. Update `CompanyDashboard.tsx`:
   - Add "liveStatus" tab with list of checked-in/out employees
   - Add CSV download button in attendance tab
   - Add late checkout warning indicators (red badge for 10h+)
   - Show duration column in attendance table (computed by pairing records)
4. Update `EmployeeDashboard.tsx`:
   - Add duration column in history table
5. Validate and build
