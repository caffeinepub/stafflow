# StafFlow

## Current State
Sürüm 10 aktif. Vardiya tanımlama ve atama mevcut ama takvim bazlı program planlama yok. Fazla mesai otomatik hesaplanıyor ama onay akışı yok. İzin/düzeltme taleplerinde belge eki desteği yok.

Mevcut sekmeler: overview, live, invites, employees, attendance, summary, statistics, corrections, leaverequests, payroll, alerts, auditlog, announcements, settings.

Veriler localStorage'da, store.ts ile yönetiliyor.

## Requested Changes (Diff)

### Add
1. **Program Planlama (schedule) sekmesi** -- Şirket panelinde yeni sekme. Takvim görünümünde (haftalık/aylık) hangi personelin hangi günlerde çalışacağını yönetici planlayabilsin. Her hücreye vardiya atanabilsin. Personel panelinde de kendi programını görüntülesin.
2. **Fazla Mesai Onayı** -- Fazla mesai otomatik tespit edildiğinde 'overtimelog' listesinde 'pending' durumda kaydedilsin. Şirket panelinde yeni 'overtimeapprovals' sekmesinde yönetici onaylayabilsin/reddedebilsin. Onaylanmamış fazla mesai bordro raporunda farklı işaretlensin.
3. **Taleplere Belge Eki** -- İzin talebi ve devam düzeltme talebi formlarına dosya yükleme alanı eklensin. Dosya base64 olarak talep kaydına eklenmesi, yönetici onay ekranında görüntülenebilmesi.

### Modify
- store.ts: WorkSchedule tipi (companyId, week/month, employeeId -> shiftId/off), OvertimeLog tipi (recordId, employeeId, companyId, minutes, status: pending|approved|rejected, reviewedAt, reviewedBy), LeaveRequest ve CorrectionRequest tiplerine optional `documentBase64` ve `documentName` alanları eklenmesi.
- i18n.ts: Yeni özellikler için çeviriler (tr + en zorunlu, diğer 8 dil).
- CompanyDashboard: 2 yeni sekme (schedule, overtimeapprovals).
- EmployeeDashboard: Program sekmesi (readonly, kendi programını görmesi).

### Remove
- Hiçbir şey kaldırılmıyor.

## Implementation Plan
1. store.ts'e WorkSchedule, OvertimeLog tipleri ve ilgili CRUD fonksiyonları ekle. LeaveRequest/CorrectionRequest tiplerine documentBase64/documentName ekle.
2. i18n.ts'e yeni key'ler ekle (schedule, overtimeapprovals, document attachment vb.).
3. CompanyDashboard'a 'schedule' ve 'overtimeapprovals' sekmeleri ekle.
4. EmployeeDashboard'a 'schedule' sekmesi (read-only) ekle.
5. İzin talebi ve düzeltme talebi formlarına dosya yükleme input'u ekle (hem şirket hem personel paneli).
6. Bordro raporunda onaylanmamış fazla mesaiye farklı badge/renk ekle.
