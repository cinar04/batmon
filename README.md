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
