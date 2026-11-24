package app.batmon.pil;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.os.Looper;
import androidx.core.app.NotificationCompat;
import java.util.Locale;

/**
 * Konum takibi + kilit ekranında canlı yolculuk kartı.
 * Android'in kendi LocationManager'ını kullanır (Google/HMS gerekmez).
 */
public class TripService extends Service implements LocationListener {
    static final String PREFS = "batmon_trip";
    static final String ACTION_START = "app.batmon.pil.TRIP_START";
    static final String ACTION_STOP = "app.batmon.pil.TRIP_STOP";
    private static final String CHANNEL = "batmon_trip";
    private static final int NID = 3001;

    private SharedPreferences sp;
    private LocationManager lm;
    private Location last;
    private double meters;
    private long startMs;
    private long lastNotifyMs;
    private String car = "";
    private String name = "BATMON";
    private double remainKm;
    private double maxKm = 1;
    private int color = 0xFFFF3B3B;
    private boolean listening;

    @Override
    public void onCreate() {
        super.onCreate();
        sp = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        lm = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            // Bildirimdeki DURDUR: sonucu uygulama açılınca kaydetmek için beklemeye al
            sp.edit().putBoolean("active", false).putBoolean("pending", sp.getFloat("meters", 0f) > 0f).apply();
            shutdown();
            return START_NOT_STICKY;
        }
        if (intent != null && ACTION_START.equals(intent.getAction())) {
            car = nz(intent.getStringExtra("car"));
            name = nz(intent.getStringExtra("name"));
            remainKm = intent.getDoubleExtra("remainKm", 0.0);
            maxKm = Math.max(0.001, intent.getDoubleExtra("maxKm", 1.0));
            color = intent.getIntExtra("color", 0xFFFF3B3B);
            meters = 0;
            last = null;
            startMs = System.currentTimeMillis();
            sp.edit().putBoolean("active", true).putBoolean("pending", false).putString("car", car)
                .putString("name", name).putFloat("remainKm", (float) remainKm).putFloat("maxKm", (float) maxKm)
                .putInt("color", color).putFloat("meters", 0f).putLong("startMs", startMs).apply();
        } else {
            // Sistem servisi yeniden başlattı: kaldığı yerden devam et
            if (!sp.getBoolean("active", false)) {
                stopSelf();
                return START_NOT_STICKY;
            }
            car = nz(sp.getString("car", ""));
            name = nz(sp.getString("name", "BATMON"));
            remainKm = sp.getFloat("remainKm", 0f);
            maxKm = Math.max(0.001, sp.getFloat("maxKm", 1f));
            color = sp.getInt("color", 0xFFFF3B3B);
            meters = sp.getFloat("meters", 0f);
            startMs = sp.getLong("startMs", System.currentTimeMillis());
        }
        createChannel();
        Notification n = buildNotification();
        if (Build.VERSION.SDK_INT >= 29) {
            startForeground(NID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } else {
            startForeground(NID, n);
        }
        startUpdates();
        return START_STICKY;
    }

    private static String nz(String s) {
        return s == null ? "" : s;
    }

    private void startUpdates() {
        if (listening || lm == null) return;
        try {
            lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, 2000L, 0f, this, Looper.getMainLooper());
            listening = true;
        } catch (SecurityException e) {
            shutdown();
        } catch (Exception e) {
            // GPS sağlayıcı yok
        }
    }

    @Override
    public void onLocationChanged(Location l) {
        if (l == null) return;
        if (l.hasAccuracy() && l.getAccuracy() > 25f) return; // zayıf sinyal
        if (last != null) {
            double d = last.distanceTo(l);
            double dt = Math.max(1.0, (l.getTime() - last.getTime()) / 1000.0);
            double acc = l.hasAccuracy() ? l.getAccuracy() : 10.0;
            if (d < Math.max(4.0, acc * 0.4)) return; // titreme
            if (d / dt > 15.0) { // GPS sıçraması (>54 km/s)
                last = l;
                return;
            }
            meters += d;
        }
        last = l;
        sp.edit().putFloat("meters", (float) meters).apply();
        long now = System.currentTimeMillis();
        if (now - lastNotifyMs >= 1500) {
            lastNotifyMs = now;
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.notify(NID, buildNotification());
        }
    }

    private Notification buildNotification() {
        double km = meters / 1000.0;
        double remain = Math.max(0.0, remainKm - km);
        int pct = (int) Math.round(Math.min(100.0, remain / maxKm * 100.0));
        String title = name + " · " + String.format(Locale.US, "%.2f km", km);
        String text = "Pil %" + pct + " · " + String.format(Locale.US, "%.1f", remain) + " km kaldı";

        Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent contentPi = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Intent stop = new Intent(this, TripService.class);
        stop.setAction(ACTION_STOP);
        PendingIntent stopPi = PendingIntent.getService(this, 1, stop, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        return new NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_batmon)
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(text + "\nYolculuk sürüyor — süre solda"))
            .setProgress(100, pct, false)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setWhen(startMs)
            .setShowWhen(true)
            .setUsesChronometer(true)
            .setColor(color)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(contentPi)
            .addAction(0, "DURDUR", stopPi)
            .build();
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null || nm.getNotificationChannel(CHANNEL) != null) return;
            NotificationChannel ch = new NotificationChannel(CHANNEL, "Canlı yolculuk", NotificationManager.IMPORTANCE_DEFAULT);
            ch.setDescription("Yolculuk sırasında mesafe, süre ve pil durumu");
            ch.setSound(null, null);
            ch.enableVibration(false);
            ch.setShowBadge(false);
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(ch);
        }
    }

    private void shutdown() {
        if (lm != null && listening) {
            try {
                lm.removeUpdates(this);
            } catch (Exception ignored) {
            }
            listening = false;
        }
        stopForeground(true);
        stopSelf();
    }

    @Override
    public void onDestroy() {
        if (lm != null && listening) {
            try {
                lm.removeUpdates(this);
            } catch (Exception ignored) {
            }
            listening = false;
        }
        super.onDestroy();
    }

    // Eski Android sürümleri (ör. Android 10) bu üç metodun varlığını ister
    @Override
    public void onStatusChanged(String provider, int status, Bundle extras) {}

    @Override
    public void onProviderEnabled(String provider) {}

    @Override
    public void onProviderDisabled(String provider) {}

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
