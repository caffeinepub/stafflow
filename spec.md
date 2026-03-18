# StafFlow

## Current State

Sürüm 11 aktif. Mevcut özellikler: devam takibi, mola, vardiya, program planlama, izin yönetimi (tek havuz), izin bakiyesi, fazla mesai onayı, denetim kaydı, otomatik çıkış, kiosk modu, çoklu şirket görünümü, duyuru sistemi, eşik uyarıları, bordro özet raporu, toplu işlemler, istatistik sekmesi, belge ekleri.

## Requested Changes (Diff)

### Add

1. **İzin türleri yönetimi**
   - Şirket, Ayarlar sekmesinde izin türleri tanımlayabilir (ad, yıllık gün kotası, renk)
   - Varsayılan türler: Yıllık İzin, Hastalık İzni, Ücretsiz İzin, Mazeret İzni
   - Her personelin her izin türü için ayrı bakiyesi tutulur (sf_leave_balances)
   - İzin talebi oluşturulurken izin türü seçilir
   - Onaylandığında ilgili türün bakiyesinden düşülür
   - Özet ve bordro raporlarında izin türüne göre ayrıştırılmış görünüm

2. **Vardiya değişim talebi**
   - Personel panelinde "Vardiya Değişim Talebi" bölümü
   - Personel: tarih, kendi vardiyası, karşı personel kodu ve vardiyası ile talep oluşturur
   - Şirket panelinde Vardiya Değişim Talepleri sekmesi (onay/red)
   - Onaylandığında program takviminde iki personelin vardiyası swap edilir
   - Audit log'a eklenir

3. **Devam puanı / performans özeti**
   - Her personel için otomatik hesaplanan skor (0-100)
   - Geç geliş, erken çıkış, devamsızlık sayısına göre puan düşülür; tam devam günleri puan ekler
   - Personeller sekmesinde her satırda renk kodlu skor rozeti (yeşil/sarı/kırmızı)
   - Yönetici filtresinde "Riskli personeller" seçeneği (skor < 60)
   - Personel kendi puanını kendi panelinde görebilir

### Modify

- İzin talebi formu: izin türü seçimi eklenir
- İzin bakiyesi gösterimi: türe göre ayrıştırılmış kart
- Personeller sekmesi: skor rozeti sütunu eklenir

### Remove

- Hiçbir mevcut özellik kaldırılmıyor

## Implementation Plan

1. localStorage veri yapılarına izin türleri (sf_leave_types), per-person per-type bakiye (sf_leave_balances), vardiya değişim talepleri (sf_shift_swaps) eklenir
2. İzin türleri için Ayarlar sekmesine CRUD UI eklenir
3. İzin talebi formu güncellenir (tür seçimi)
4. Onay akışında tür bakiyesi düşülür
5. Vardiya değişim talebi formu personel paneline eklenir
6. Şirket paneline vardiya değişim talepleri onay UI'ı eklenir
7. Devam puanı hesaplama fonksiyonu yazılır
8. Personeller tablosuna skor rozeti eklenir, "Riskli" filtresi eklenir
9. Personel panelinde kendi skoru gösterilir
