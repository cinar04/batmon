# BATMON Android
1. Bu klasörü GitHub'a yeni repo olarak yükle.
2. Actions → "APK derle" → bitince "batmon-apk" artifact'ini indir (app-debug.apk), telefona kur.
3. Telefonda: bildirim + konum iznini ver, pil optimizasyonunu "Kısıtlama yok" yap.

## Yeni sürüm yayınlama (uygulama içi güncelleme bildirimi)
1. android/app/build.gradle içinde versionCode'u artır (örn. 2) ve versionName'i güncelle.
2. APK'yı derleyip bir yere yükle (GitHub Release vb.).
3. www/version.json'u düzenle: {"versionCode":2,"versionName":"1.1","url":"<APK indirme linki>","notes":"Ne değişti"}
4. `firebase deploy` ile siteyi yayınla (batmon.web.app/version.json). Telefonlar 6 saatte bir kontrol eder.

## Web dosyası değişince
`npx cap sync android` (GitHub Actions bunu zaten yapıyor).

## .github klasörü yüklenmediyse
Actions sekmesi boşsa: repoda Add file → Create new file → dosya adı `.github/workflows/apk.yml` → `apk-workflow-yedek.yml` dosyasının içeriğini yapıştır → Commit.

## Huawei P40 Lite (EMUI) için ayarlar
Google servisleri olmayan Huawei'lerde konum ve bildirim çalışması için:
1. Ayarlar → Uygulamalar → BATMON → İzinler → Konum: **"Uygulama kullanılırken izin ver"** (ya da "her zaman").
2. Ayarlar → Bildirimler → BATMON → **Kilit ekranı bildirimleri: Açık**, "Canlı yolculuk" kanalı açık.
3. Ayarlar → Pil → Uygulama başlatma → BATMON → **Manuel yönet** → üç seçeneği de aç (otomatik başlat, ikincil başlat, arka planda çalıştır).
4. Telefonun Konum (GPS) anahtarı açık olmalı.
Yolculuk bildirimi: mesafe, süre (canlı sayaç), pil çubuğu ve DURDUR düğmesi kilit ekranında görünür.

## v1.3 yenilikleri
- ⚙ AYAR sekmesi: kapasite, bakım ömürleri, eşikler, kritik pil uyarısı, güncelleme
- 🗺 Yolculuk izleri (GPS çizgisi, harita üzerinde), 🔋 pil sağlığı tahmini/ölçümü
- 🔔 Kritik pilde sesli + titreşimli uyarı
- ⬇ Uygulama içi güncelleme (GitHub Release; repo public olmalı, yoksa version.json yedeği)
- Sabit imza anahtarı eklendi: **mevcut BATMON'u bir kez silip** yeni APK'yı kur (veriler Firestore'da güvende).
- Yükleme: `.github` klasörü ve `android/app/batmon.keystore` dahil tüm dosyaları kopyala → `git add .` → `git commit -m v1.3` → `git push`
