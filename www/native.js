// BATMON — Android (Capacitor) katmanı: arka plan servisi, bildirimler, geri tuşu,
// güncelleme kontrolü ve GPS ile otomatik km. Tarayıcıda hiçbir şey yapmaz.
(function () {
  if (!window.Capacitor || !Capacitor.isNativePlatform || !Capacitor.isNativePlatform()) return;
  if (window.__batmonNative) return; window.__batmonNative = true;

  const FB = { apiKey:"AIzaSyAWN3NBqrq721ryFZpd1FkNeC4XKfEtdOI", authDomain:"firebaxex.firebaseapp.com",
    projectId:"firebaxex", storageBucket:"firebaxex.firebasestorage.app",
    messagingSenderId:"670679472993", appId:"1:670679472993:web:8d9c89411d85d6ede00320" };
  const CARS = { nuna:'Opel Nuna', joie:'Joie Litetrax 4', mgs:'Migas Mirage Pro Z90' };
  const WARN = 30, DANGER = 15, EVERY_MS = 15 * 60 * 1000;
  const UPDATE_URL = 'https://batmon.web.app/version.json';
  const DATA_SYNC = 1, LOCATION = 8;
  const P = n => Capacitor.registerPlugin(n);
  const FGS = P('ForegroundService'), LN = P('LocalNotifications'), App = P('App'),
        SB = P('StatusBar'), Geo = P('Geolocation');
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

  // ───────── GPS ile otomatik km ─────────
  const carKey = Object.keys(CARS).find(c => location.pathname.indexOf('/' + c + '/') >= 0);
  const hasUsage = () => typeof addUsage === 'function' && document.getElementById('useInput');
  let watchId = null, trip = null, btn = null;

  const rad = x => x * Math.PI / 180;
  function dist(a, b) { // metre (haversine)
    const R = 6371000, dLa = rad(b.lat - a.lat), dLo = rad(b.lon - a.lon);
    const h = Math.sin(dLa/2)**2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLo/2)**2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function saveTrip() { ls.set('batmon_trip', JSON.stringify(trip)); }
  function paint() {
    if (!btn) return;
    btn.textContent = trip ? `● ${(trip.m / 1000).toFixed(2)} km — DURDUR` : '📍 GPS KM';
    btn.style.borderColor = trip ? '#ff3355' : 'var(--accent,#00e5ff)';
    btn.style.color = trip ? '#ff3355' : 'var(--accent,#00e5ff)';
  }
  function onPos(pos) {
    if (!pos || !trip) return;
    const c = pos.coords;
    if (c.accuracy > 25) return;                        // zayıf sinyal
    const p = { lat: c.latitude, lon: c.longitude, t: pos.timestamp };
    if (trip.last) {
      const d = dist(trip.last, p), dt = Math.max(1, (p.t - trip.last.t) / 1000);
      if (d < Math.max(4, c.accuracy * 0.4)) return;    // titreme
      if (d / dt > 15) { trip.last = p; return; }       // GPS sıçraması (>54 km/s)
      trip.m += d;
    }
    trip.last = p; saveTrip(); paint();
  }
  async function startTrip(resume) {
    if (!resume) {
      const perm = await Geo.requestPermissions({ permissions: ['location'] }).catch(() => null);
      if (!perm || perm.location === 'denied') { toast('Konum izni gerekli', true); return; }
      trip = { car: carKey, m: 0, last: null }; saveTrip();
    }
    try {
      await FGS.startForegroundService({ id: 1001, title: 'BATMON · GPS yolculuk',
        body: CARS[carKey] + ' — mesafe ölçülüyor', smallIcon: 'ic_stat_batmon', serviceType: LOCATION });
    } catch (e) { console.warn(e); }
    watchId = await Geo.watchPosition({ enableHighAccuracy: true, timeout: 20000 }, (pos, err) => { if (!err) onPos(pos); });
    paint(); if (!resume) toast('📍 Yolculuk başladı');
  }
  async function stopTrip() {
    if (watchId) { await Geo.clearWatch({ id: watchId }).catch(()=>{}); watchId = null; }
    const km = Math.round(trip.m / 10) / 100;
    trip = null; ls.set('batmon_trip', ''); paint();
    baseService().catch(()=>{});
    if (km < 0.05) { toast('Mesafe çok kısa, kaydedilmedi', true); return; }
    document.getElementById('useInput').value = km;
    document.getElementById('descInput').value = 'GPS yolculuk';
    document.getElementById('useInput').dispatchEvent(new Event('input', { bubbles: true }));
    addUsage();                                         // sayfanın kendi kullanım kaydı
  }
  function initGps() {
    if (!carKey || !hasUsage()) return;
    btn = document.createElement('button');
    btn.style.cssText = 'position:fixed;right:14px;bottom:18px;z-index:9999;background:#0a0c0f;border:2px solid;padding:12px 16px;font:700 14px "Barlow Condensed",sans-serif;letter-spacing:2px;box-shadow:0 0 16px rgba(0,229,255,.25);';
    btn.onclick = () => trip ? stopTrip() : startTrip(false);
    document.body.appendChild(btn);
    try { const t = JSON.parse(ls.get('batmon_trip') || 'null'); if (t && t.car === carKey) { trip = t; startTrip(true); } } catch (e) {}
    paint();
  }

  // ───────── Başlat ─────────
  async function start() {
    try {
      await LN.requestPermissions();
      await FGS.requestPermissions();
      if (!trip) await baseService();
    } catch (e) { console.warn('Servis başlatılamadı:', e); }
    check(); checkUpdate();
    setInterval(check, EVERY_MS); setInterval(checkUpdate, 6 * 3600e3);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initGps); else initGps();
  start();
})();
