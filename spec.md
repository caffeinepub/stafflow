# StafFlow

## Current State
Fully functional localStorage-based attendance tracking app with: passwordless code auth, multi-language (10 languages), QR check-in/out, work duration, live status, CSV/PDF export, work hours/days/shifts, late/early badges, overtime, monthly summary, leave records, department management, data backup/restore, personnel deactivation, multiple shifts, daily minimum hours.

## Requested Changes (Diff)

### Add
1. **Public Holiday Calendar** -- Company can define official holidays (date + name) in Settings tab. Monthly attendance summary excludes holidays from working day count and marks those days distinctly.
2. **Attendance Correction Requests** -- Employees can submit correction requests (missed check-in or check-out with date/time/reason) from their dashboard. Company admin sees pending requests in a new tab, can approve (creates the attendance record) or reject with a note.
3. **Visual Statistics / Charts Panel** -- Company dashboard gets a new "İstatistikler" tab with: weekly check-in trend (bar chart), department attendance comparison (bar chart), monthly attendance rate per employee (line or bar).
4. **Individual Attendance Rules** -- Company can override work hours and minimum daily hours per employee (in Personeller tab). Per-employee rules take priority over company-wide rules in reports and badges.

### Modify
- `store.ts`: Add `PublicHoliday` interface, `CorrectionRequest` interface, per-employee rule override fields. Add CRUD functions for holidays and correction requests. Update `getMonthlyAttendanceSummary` to exclude holidays. Update `isLateCheckin`/`isEarlyCheckout` to check per-employee overrides.
- `CompanyDashboard.tsx`: Add Tatiller section in Settings, add Düzeltme Talepleri tab, add İstatistikler tab with recharts charts.
- `EmployeeDashboard.tsx`: Add correction request submission form.
- i18n translations for new UI strings in all 10 languages.

### Remove
- Nothing removed.

## Implementation Plan
1. Update `store.ts` with new types and functions (holidays, correction requests, per-employee rules)
2. Update `CompanyDashboard.tsx` to handle all new company-side features
3. Update `EmployeeDashboard.tsx` with correction request UI
4. Ensure recharts is used for charts (already in shadcn chart component)
