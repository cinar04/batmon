// BATMON — Android (Capacitor) katmanı: arka plan servisi, bildirimler, geri tuşu,
// güncelleme kontrolü ve GPS ile otomatik km. Tarayıcıda hiçbir şey yapmaz.
(function () {
  if (!window.Capacitor || !Capacitor.isNativePlatform || !Capacitor.isNativePlatform()) return;
  if (window.__batmonNative) return; window.__batmonNative = true;
  window.__bmNativeLoaded = 1;
  let __inner = null;
  window.batmonTripToggle = () => __inner ? __inner() : (window.__bmDiag ? window.__bmDiag() : null);

  const FB = { apiKey:"AIzaSyAWN3NBqrq721ryFZpd1FkNeC4XKfEtdOI", authDomain:"firebaxex.firebaseapp.com",
    projectId:"firebaxex", storageBucket:"firebaxex.firebasestorage.app",
    messagingSenderId:"670679472993", appId:"1:670679472993:web:8d9c89411d85d6ede00320" };
  const CARS = { nuna:'Opel Nuna', joie:'Joie Litetrax 4' };
  const SET = window.BATMON_SETTINGS || { nuna:{km:30}, joie:{km:100}, rate:{motor:.5,lastik:.5,batarya:2}, thr:{warn:30,danger:15}, crit:{on:true,levels:[15,10,5]}, repo:'cinar04/batmon' };
  const WARN = SET.thr.warn, DANGER = SET.thr.danger, EVERY_MS = 15 * 60 * 1000;
  const VC_OFFSET = 100;   // GitHub Actions: versionCode = run_number + 100
  const UPDATE_URL = 'https://batmon.web.app/version.json';
  const DATA_SYNC = 1;
  const P = n => Capacitor.registerPlugin(n);
  const FGS = P('ForegroundService'), LN = P('LocalNotifications'), App = P('App'),
        SB = P('StatusBar'), Geo = P('Geolocation'), AU = P('AppUpdate');  // Geo yalnızca izin için
  const ls = { get:k => { try { return localStorage.getItem(k); } catch(e){ return null; } },
               set:(k,v) => { try { localStorage.setItem(k,v); } catch(e){} } };
  const say = (m, err) => {
    const el = document.getElementById('vhStatus');
    if (el) { el.textContent = m; el.style.color = err ? '#ff3355' : ''; }
    console.log('[BATMON]', m);
  };
  window.addEventListener('error', e => say('✕ Hata: ' + e.message, true));
  window.addEventListener('unhandledrejection', e => say('✕ Hata: ' + ((e.reason && e.reason.message) || e.reason), true));
  const toast = (m, err) => (typeof showToast === 'function') ? showToast(m, err) : console.log(m);

  // ───────── Durum çubuğu + geri tuşu ─────────
  SB.setStyle({ style: 'DARK' }).catch(()=>{});
  SB.setBackgroundColor({ color: '#0a0c0f' }).catch(()=>{});
  App.addListener('backButton', ({ canGoBack }) => {
    if (window.__bmOverlayClose && window.__bmOverlayClose()) return;   // açık harita varsa önce onu kapat
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
          ['Motor',   100 - Math.max(0, km - ((b.motor||{}).resetKm||0)) * SET.rate.motor],
          ['Lastik',  100 - Math.max(0, km - ((b.lastik||{}).resetKm||0)) * SET.rate.lastik],
          ['Batarya', 100 - Math.max(0, ch - ((b.batarya||{}).resetCharges||0)) * SET.rate.batarya] ];
        for (const [n, v] of parts) {
          const dur = Math.max(0, v);
          if (dur <= DANGER) out.push(`${CARS[car]}: ${n} KRİTİK (${dur.toFixed(1)})`);
          else if (dur <= WARN) out.push(`${CARS[car]}: ${n} düşük (${dur.toFixed(1)})`);
        }
        // Kritik pil: seviye geçildikçe bir kez sesli + titreşimli bildirim
        if (SET.crit.on && typeof st.remainS === 'number') {
          const max = SET[car].km * 1000, pct = Math.round(Math.max(0, Math.min(max, st.remainS)) / max * 100);
          const lv = SET.crit.levels.filter(L => pct <= L).sort((a, c) => a - c)[0], key = 'batmon_crit_' + car;
          if (pct > Math.max.apply(null, SET.crit.levels) + 5) ls.set(key, '');
          else if (lv && (ls.get(key) === '' || ls.get(key) === null || lv < +ls.get(key))) {
            ls.set(key, String(lv));
            await LN.schedule({ notifications: [{ id: 2100 + Object.keys(CARS).indexOf(car), title: '⚠ ' + CARS[car] + ' pil %' + pct,
              body: lv <= 5 ? 'Pil bitmek üzere — hemen şarja tak' : 'Pil kritik seviyede — şarja tak',
              smallIcon: 'ic_stat_batmon', channelId: 'kritik', extra: { type: 'crit' } }] });
          }
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
    if (ex.type === 'update') { location.href = '/ayarlar.html?update=1'; return; }
    if (ev.actionId === 'snooze') {
      LN.schedule({ notifications: [{ id: 2002, title: 'BATMON hatırlatma', body: n.body || 'Bakım uyarılarına bak',
        smallIcon: 'ic_stat_batmon', schedule: { at: new Date(Date.now() + 3600e3), allowWhileIdle: true } }] }).catch(()=>{});
    }
  });

  // ───────── Güncelleme (GitHub Release) ─────────
  async function latest(repo) {
    try {
      const r = await fetch('https://api.github.com/repos/' + repo + '/releases/latest', { headers: { Accept: 'application/vnd.github+json' } });
      if (r.ok) {
        const x = await r.json(), num = parseInt(String(x.tag_name || '').replace(/\D/g, ''), 10) || 0;
        const a = (x.assets || []).find(f => /\.apk$/i.test(f.name));
        if (a) return { code: num + VC_OFFSET, name: x.name || x.tag_name, url: a.browser_download_url, notes: '' };
      }
    } catch (e) {}
    try {                                   // yedek: web'deki version.json
      const r = await fetch(UPDATE_URL + '?t=' + Date.now(), { cache: 'no-store' }), v = await r.json();
      if (v.url) return { code: v.versionCode, name: v.versionName || String(v.versionCode), url: v.url, notes: v.notes || '' };
    } catch (e) {}
    return null;
  }
  window.BatmonUpdate = {
    async info() { const i = await App.getInfo(); return { version: i.version, build: parseInt(i.build, 10) || 0 }; },
    async check(repo) { const i = await this.info(), r = await latest(repo || SET.repo); if (r) r.newer = r.code > i.build; return r; },
    async canInstall() { return !!(await AU.canInstall()).ok; },
    openSettings() { return AU.openSettings(); },
    async download(url, cb) {
      const h = await AU.addListener('progress', e => cb && cb(e.pct));
      try { await AU.download({ url }); } finally { try { h.remove(); } catch (e) {} }
    },
    install() { return AU.install(); }
  };
  async function checkUpdate() {
    try {
      const r = await window.BatmonUpdate.check(SET.repo);
      if (r && r.newer && ls.get('batmon_update_seen') !== String(r.code)) {
        ls.set('batmon_update_seen', String(r.code));
        await LN.schedule({ notifications: [{ id: 2003, title: 'BATMON yeni sürüm: ' + r.name,
          body: 'Güncellemek için dokun.', smallIcon: 'ic_stat_batmon', extra: { type: 'update' } }] });
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
    if (r.track && r.track.length > 1 && typeof window.batmonAddTrack === 'function')
      window.batmonAddTrack({ t: r.startMs || Date.now(), km, sec: r.seconds || 0, pts: r.track });
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
    try {
      say('⏳ Konum izni isteniyor…');
      let perm = null;
      try { perm = await Geo.requestPermissions({ permissions: ['location'] }); }
      catch (e) { say('✕ İzin istenemedi: ' + ((e && e.message) || e) + ' — konum (GPS) açık mı?', true); return; }
      if (!perm || perm.location === 'denied') { say('✕ Konum izni reddedildi — uygulama ayarlarından izin ver', true); return; }
      say('⏳ İzin: ' + perm.location + ' · servis başlatılıyor…');
      await Trip.start({ car: carKey, name: CARS[carKey], remainKm: Math.max(0, state.remainS) / 1000,
        maxKm: MAX_S / 1000, color: CAR_COLOR[carKey] | 0,
        levels: SET.crit.levels.join(','), alerts: !!SET.crit.on });
      tripOn = true; paint(true, 0); startPoll();
      say('✓ Yolculuk başladı — bildirim çubuğunu ve kilit ekranını kontrol et');
      toast('📍 Yolculuk başladı');
    } catch (e) { say('✕ ' + String((e && e.message) || e), true); }
  }
  window.__bmDiag = () => say('✕ Yolculuk hazır değil: carKey=' + carKey + ' addUsage=' + (typeof addUsage) + ' useInput=' + !!document.getElementById('useInput'), true);
  async function initGps() {
    if (!carKey || !hasUsage()) return;
    __inner = () => tripOn ? finishTrip() : startTrip();
    try {
      const s = await Trip.state();
      if (s.active && s.car === carKey) { tripOn = true; paint(true, s.km); startPoll(); }
      else if (s.pending && s.car === carKey) await finishTrip();   // bildirimden durdurulmuş yolculuk
    } catch (e) {}
  }

  // ───────── Başlat ─────────
  async function start() {
    try {
      await LN.createChannel({ id: 'kritik', name: 'Kritik pil uyarısı', description: 'Pil kritik seviyeye düşünce sesli ve titreşimli uyarı', importance: 5, visibility: 1, vibration: true, lights: true }).catch(() => {});
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
