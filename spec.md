# StafFlow — Backend-First Rebuild

## Current State
The application is a fully-featured localStorage-based prototype (v14) with 10+ languages, attendance tracking, leave management, shift management, and more. All data is stored locally in each browser — there is no shared backend. This makes multi-device, multi-user access impossible.

## Requested Changes (Diff)

### Add
- Motoko backend with persistent, shared data storage
- Company registration: generates unique 16-char entry code, stores company data centrally
- Personnel registration: generates unique 12-char code, links to a company
- Check-in / check-out: records stored centrally, visible to all authorized users of that company
- Role-based access: company admin, personnel (same code-based, passwordless auth)
- Attendance records: viewable by admin (all personnel) and personnel (own records)
- Basic dashboard for admin: today's check-ins, personnel list, attendance log
- Basic dashboard for personnel: own check-in/out, own attendance history
- Multi-language UI support (TR/EN at minimum for initial version)
- Dark mode
- Mobile-responsive layout

### Modify
- Replace localStorage with backend canister calls for all data operations

### Remove
- localStorage as primary data store

## Implementation Plan
1. Generate Motoko backend: Company, Personnel, AttendanceRecord types with CRUD operations
2. Backend exposes: registerCompany, loginCompany, addPersonnel, loginPersonnel, checkIn, checkOut, getAttendanceRecords, getPersonnelList
3. Frontend: code-based login flow, company admin panel (personnel mgmt + attendance log), personnel panel (check-in/out + own history)
4. Keep UI clean and mobile-friendly, support TR/EN language toggle
5. Deploy and verify shared data works across devices
