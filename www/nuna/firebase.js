// ════════════════════════════════════════
//  BATMON — firebase.js
//  Tüm sayfalar bu dosyayı kullanır.
//  Config'i buraya gir, başka yerde dokunma.
// ════════════════════════════════════════

const FB_CONFIG = {
  apiKey:      "BURAYA_API_KEY",
  databaseURL: "BURAYA_DATABASE_URL",
};

// ————————————————————————————————————————
//  Dahili durum
// ————————————————————————————————————————
const _apps = {};   // appId → FirebaseApp
const _dbs  = {};   // appId → Database

/**
 * Belirtilen appId için Firebase Database örneği döner.
 * Aynı appId ile tekrar çağrılırsa önbellekten döner.
 */
function fbDb(appId) {
  if (_dbs[appId]) return _dbs[appId];
  if (!_apps[appId]) {
    _apps[appId] = firebase.initializeApp(FB_CONFIG, appId);
  }
  _dbs[appId] = firebase.database(_apps[appId]);
  return _dbs[appId];
}

// ————————————————————————————————————————
//  Yardımcı fonksiyonlar — tüm sayfalar kullanır
// ————————————————————————————————————————

/**
 * Bir path'e veri yazar. Promise döner.
 * fbSet('bakim', 'bakim/nuna', data)
 */
async function fbSet(appId, path, data) {
  return fbDb(appId).ref(path).set(data);
}

/**
 * Bir path'ten veri okur. DataSnapshot döner.
 */
async function fbGet(appId, path) {
  return fbDb(appId).ref(path).get();
}

/**
 * Bir path'i gerçek zamanlı dinler. Callback: fn(data|null)
 * Dönen fonksiyonu çağırarak dinlemeyi durdurabilirsin.
 */
function fbListen(appId, path, fn) {
  const ref = fbDb(appId).ref(path);
  const handler = snap => fn(snap.exists() ? snap.val() : null);
  ref.on('value', handler);
  return () => ref.off('value', handler);
}
