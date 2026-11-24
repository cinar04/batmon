// BATMON — Android (Capacitor) katmanı: arka plan servisi, bildirimler, geri tuşu,
// güncelleme kontrolü ve GPS ile otomatik km. Tarayıcıda hiçbir şey yapmaz.
(function () {
  if (!window.Capacitor || !Capacitor.isNativePlatform || !Capacitor.isNativePlatform()) return;
  if (window.__batmonNative) return; window.__batmonNative = true;

  const FB = { apiKey:"AIzaSyAWN3NBqrq721ryFZpd1FkNeC4XKfEtdOI", authDomain:"firebaxex.firebaseapp.com",
    projectId:"firebaxex", storageBucket:"firebaxex.firebasestorage.app",
    messagingSenderId:"670679472993", appId:"1:670679472993:web:8d9c89411d85d6ede00320" };
  const CARS = { nuna:'Opel Nuna', joie:'Joie Litetrax 4' };
  const WARN = 30, DANGER = 15, EVERY_MS = 15 * 60 * 1000;
  const UPDATE_URL = 'https://batmon.web.app/version.json';
  const DATA_SYNC = 1;
  const P = n => Capacitor.registerPlugin(n);
  const FGS = P('ForegroundService'), LN = P('LocalNotifications'), App = P('App'),
        SB = P('StatusBar'), Geo = P('Geolocation');  // Geo yalnızca izin için
  const ls = { get:k => { try { return localStorage.getItem(k); } catch(e){ return null; } },
               set:(k,v) => { try { localStorage.setItem(k,v); } catch(e){} } };
  const toast = (m, err) => (typeof showToast === 'function') ? showToast(m, err) : console.log(m);

  // ───────── Durum çubuğu + geri tuşu ─────────
  SB.setStyle({ style: 'DARK' }).catch(()=>{});
  SB.setBackgroundColor({ color: '#0a0c0f' }).catch(()=>{});
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) history.back(); else App.minimizeApp();   // kapatma, arka planda çalışsın
  });

  // ───────── Firebase ─────────
  const load = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  async function db() {
    if (!window.firebase) {
      await load('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
      await load('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js');
    }
    const app = firebase.apps.length ? firebase.apps[0] : firebase.initializeApp(FB);
    return firebase.firestore(app);
  }

  // ───────── Bakım uyarısı kontrolü ─────────
  async function check() {
    try {
      const d = await db(), out = [];
      for (const car of Object.keys(CARS)) {
        const [m, s] = await Promise.all([
          d.collection('batmon').doc(car + '_bakim').get(),
          d.collection('batmon').doc(car + '_state').get() ]);
        const b = m.exists ? m.data() : {}, st = s.exists ? s.data() : {};
        const km = st.totalKm || 0, ch = st.totalCharges || 0;
        const parts = [
          ['Motor',   100 - Math.max(0, km - ((b.motor||{}).resetKm||0)) * 0.5],
          ['Lastik',  100 - Math.max(0, km - ((b.lastik||{}).resetKm||0)) * 0.5],
          ['Batarya', 100 - Math.max(0, ch - ((b.batarya||{}).resetCharges||0)) * 2] ];
        for (const [n, v] of parts) {
          const dur = Math.max(0, v);
          if (dur <= DANGER) out.push(`${CARS[car]}: ${n} KRİTİK (${dur.toFixed(1)})`);
          else if (dur <= WARN) out.push(`${CARS[car]}: ${n} düşük (${dur.toFixed(1)})`);
        }
        const last = (b.fren || {}).lastChange;
        if (!last) out.push(`${CARS[car]}: Fren tarihi girilmemiş`);
        else { const l = new Date(last); if (new Date() >= new Date(l.getFullYear(), l.getMonth() + 1, 1)) out.push(`${CARS[car]}: Fren değişimi GECİKTİ`); }
      }
      const key = new Date().toDateString() + '|' + out.join(';');
      if (out.length && ls.get('batmon_last_notif') !== key) {
        ls.set('batmon_last_notif', key);
        await LN.schedule({ notifications: [{ id: 2001, title: 'BATMON uyarı', body: out.join('\n'),
          smallIcon: 'ic_stat_batmon', actionTypeId: 'BAKIM_UYARI', extra: { type: 'warn' } }] });
      }
    } catch (e) { console.warn('BATMON arka plan kontrolü:', e); }
  }

  // ───────── Bildirim aksiyonları ─────────
  LN.registerActionTypes({ types: [{ id: 'BAKIM_UYARI', actions: [
    { id: 'snooze', title: '1 saat sonra hatırlat' },
    { id: 'open',   title: 'Aç', foreground: true } ] }] }).catch(()=>{});

  LN.addListener('localNotificationActionPerformed', ev => {
    const n = ev.notification || {}, ex = n.extra || {};
    if (ex.type === 'update' && ex.url) { window.open(ex.url, '_system'); return; }
    if (ev.actionId === 'snooze') {
      LN.schedule({ notifications: [{ id: 2002, title: 'BATMON hatırlatma', body: n.body || 'Bakım uyarılarına bak',
        smallIcon: 'ic_stat_batmon', schedule: { at: new Date(Date.now() + 3600e3), allowWhileIdle: true } }] }).catch(()=>{});
    }
  });

  // ───────── Güncelleme kontrolü ─────────
  async function checkUpdate() {
    try {
      const info = await App.getInfo();
      const r = await fetch(UPDATE_URL + '?t=' + Date.now(), { cache: 'no-store' });
      const v = await r.json();
      const cur = parseInt(info.build, 10) || 0;
      if (v.versionCode > cur && v.url && ls.get('batmon_update_seen') !== String(v.versionCode)) {
        ls.set('batmon_update_seen', String(v.versionCode));
        await LN.schedule({ notifications: [{ id: 2003, title: 'BATMON yeni sürüm: ' + (v.versionName || v.versionCode),
          body: (v.notes || 'Güncellemek için dokun.'), smallIcon: 'ic_stat_batmon', extra: { type: 'update', url: v.url } }] });
      }
    } catch (e) { /* çevrimdışı olabilir */ }
  }

  // ───────── Servis ─────────
  function baseService() {
    return FGS.startForegroundService({ id: 1001, title: 'BATMON çalışıyor',
      body: 'Araç bakım uyarıları arka planda izleniyor', smallIcon: 'ic_stat_batmon', serviceType: DATA_SYNC });
  }

  // ───────── GPS ile otomatik km (yerel servis · Google/HMS gerekmez) ─────────
  const Trip = P('Trip');
  const carKey = Object.keys(CARS).find(c => location.pathname.indexOf('/' + c + '/') >= 0);
  const CAR_COLOR = { nuna: 0xFFFF3B3B, joie: 0xFFD8C3A0 };
  const hasUsage = () => typeof addUsage === 'function' && document.getElementById('useInput');
  let poll = null, tripOn = false;

  const paint = (active, km) =>
    window.dispatchEvent(new CustomEvent('batmon-trip', { detail: { active: !!active, km: km || 0 } }));

  async function finishTrip() {              // sonucu teslim al ve sayfanın kullanım kaydına ekle
    stopPoll(); tripOn = false;
    let r = { km: 0 };
    try { r = await Trip.stop(); } catch (e) {}
    paint(false, 0);
    baseService().catch(() => {});
    const km = Math.round((r.km || 0) * 100) / 100;
    if (r.car && r.car !== carKey) return;
    if (km < 0.05) { toast('Mesafe çok kısa, kaydedilmedi', true); return; }
    document.getElementById('useInput').value = km;
    document.getElementById('descInput').value = 'GPS yolculuk';
    document.getElementById('useInput').dispatchEvent(new Event('input', { bubbles: true }));
    addUsage();                              // sayfanın kendi kullanım kaydı
  }
  function stopPoll() { if (poll) { clearInterval(poll); poll = null; } }
  function startPoll() {
    stopPoll();
    poll = setInterval(async () => {
      try {
        const s = await Trip.state();
        if (s.active) paint(true, s.km);
        else { if (s.pending) await finishTrip(); else { stopPoll(); tripOn = false; paint(false, 0); } }
      } catch (e) {}
    }, 1500);
  }
  async function startTrip() {
    const perm = await Geo.requestPermissions({ permissions: ['location'] }).catch(() => null);
    if (!perm || perm.location === 'denied') { toast('Konum izni gerekli', true); return; }
    try {
      await Trip.start({ car: carKey, name: CARS[carKey], remainKm: Math.max(0, state.remainS) / 1000,
        maxKm: MAX_S / 1000, color: CAR_COLOR[carKey] | 0 });
    } catch (e) { toast(String((e && e.message) || e), true); return; }
    tripOn = true; paint(true, 0); startPoll(); toast('📍 Yolculuk başladı · kilit ekranında canlı');
  }
  async function initGps() {
    if (!carKey || !hasUsage()) return;
    window.batmonTripToggle = () => tripOn ? finishTrip() : startTrip();
    try {
      const s = await Trip.state();
      if (s.active && s.car === carKey) { tripOn = true; paint(true, s.km); startPoll(); }
      else if (s.pending && s.car === carKey) await finishTrip();   // bildirimden durdurulmuş yolculuk
    } catch (e) {}
  }

  // ───────── Başlat ─────────
  async function start() {
    try {
      await LN.requestPermissions();
      await FGS.requestPermissions();
      await baseService();
    } catch (e) { console.warn('Servis başlatılamadı:', e); }
    check(); checkUpdate();
    setInterval(check, EVERY_MS); setInterval(checkUpdate, 6 * 3600e3);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initGps); else initGps();
  start();
})();
