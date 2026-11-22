// ════════════════════════════════════════
//  BATMON — firebase.js  (Firestore)
//  Config'i buraya gir, başka yerde dokunma.
// ════════════════════════════════════════

const FB_CONFIG = {
  apiKey:            "AIzaSyAWN3NBqrq721ryFZpd1FkNeC4XKfEtdOI",
  authDomain:        "firebaxex.firebaseapp.com",
  projectId:         "firebaxex",
  storageBucket:     "firebaxex.firebasestorage.app",
  messagingSenderId: "670679472993",
  appId:             "1:670679472993:web:8d9c89411d85d6ede00320",
};

// ————————————————————————————————————————
//  Tek seferlik init
// ————————————————————————————————————————
let _db = null;

function getDb() {
  if (_db) return _db;
  try {
    const existing = firebase.apps && firebase.apps.length > 0 ? firebase.apps[0] : null;
    const app = existing || firebase.initializeApp(FB_CONFIG);
    _db = firebase.firestore(app);
    // Offline persistence aç — yazma kuyruğa alınır, bağlantı gelince gönderilir
    _db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
  } catch(e) {
    console.error('Firebase init hatası:', e);
  }
  return _db;
}

// ————————————————————————————————————————
//  API — tüm sayfalar bunları kullanır
// ————————————————————————————————————————

// path: 'batmon/nuna_state' → collection='batmon', doc='nuna'
function _ref(path) {
  const parts = path.split('/');
  return getDb().collection(parts[0]).doc(parts[1]);
}

// Veri yaz
async function fbSet(appId, path, data) {
  return _ref(path).set(data);
}

// Veri oku
async function fbGet(appId, path) {
  const snap = await _ref(path).get();
  return {
    exists: () => snap.exists,
    val:    () => snap.data() || null,
  };
}

// Gerçek zamanlı dinle (bakim.html kullanmıyor ama ileride lazım olabilir)
function fbListen(appId, path, fn) {
  const unsub = _ref(path).onSnapshot(snap => fn(snap.exists ? snap.data() : null));
  return unsub;
}

// fbDb() — eski ref tarzı çağrılar için uyumluluk katmanı (artık kullanılmıyor)
function fbDb(appId) {
  return { ref: (p) => ({ set: (d) => fbSet(appId,p,d), get: () => fbGet(appId,p) }) };
}
