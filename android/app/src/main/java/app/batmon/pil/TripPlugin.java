package app.batmon.pil;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.location.LocationManager;
import androidx.core.content.ContextCompat;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** GPS yolculuğu: Google Play Hizmetleri gerektirmez (Huawei dahil). */
@CapacitorPlugin(name = "Trip")
public class TripPlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
        Context c = getContext();
        if (ContextCompat.checkSelfPermission(c, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            call.reject("Konum izni verilmemiş");
            return;
        }
        LocationManager lm = (LocationManager) c.getSystemService(Context.LOCATION_SERVICE);
        if (lm == null || !lm.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
            call.reject("GPS kapalı — konumu aç");
            return;
        }
        Intent i = new Intent(c, TripService.class);
        i.setAction(TripService.ACTION_START);
        i.putExtra("car", call.getString("car", ""));
        i.putExtra("name", call.getString("name", "BATMON"));
        i.putExtra("remainKm", call.getDouble("remainKm", 0.0).doubleValue());
        i.putExtra("maxKm", call.getDouble("maxKm", 1.0).doubleValue());
        i.putExtra("color", call.getInt("color", 0xFFFF3B3B).intValue());
        i.putExtra("levels", call.getString("levels", ""));
        i.putExtra("alerts", call.getBoolean("alerts", true).booleanValue());
        try {
            ContextCompat.startForegroundService(c, i);
            call.resolve();
        } catch (Exception e) {
            call.reject("Servis başlatılamadı: " + e.getMessage());
        }
    }

    /** Yolculuğu bitirir (ya da bildirimden bitmişse sonucu teslim alır) ve km'yi döndürür. */
    @PluginMethod
    public void stop(PluginCall call) {
        Context c = getContext();
        SharedPreferences sp = c.getSharedPreferences(TripService.PREFS, Context.MODE_PRIVATE);
        double km = sp.getFloat("meters", 0f) / 1000.0;
        String car = sp.getString("car", "");
        long startMs = sp.getLong("startMs", 0L);
        long endMs = sp.getLong("endMs", 0L);
        if (endMs <= 0L) endMs = System.currentTimeMillis();
        double seconds = startMs > 0 ? Math.max(0L, (endMs - startMs) / 1000L) : 0;
        c.stopService(new Intent(c, TripService.class));
        JSArray track = readTrack(c);
        sp.edit().putBoolean("active", false).putBoolean("pending", false).putFloat("meters", 0f).apply();
        JSObject r = new JSObject();
        r.put("km", km);
        r.put("car", car);
        r.put("seconds", seconds);
        r.put("startMs", (double) startMs);
        r.put("track", track);
        call.resolve(r);
    }

    /** İz dosyasını okur, en fazla ~250 noktaya seyreltir ve siler. */
    private JSArray readTrack(Context c) {
        JSArray out = new JSArray();
        File f = TripService.trackFile(c);
        if (!f.exists()) return out;
        java.util.ArrayList<double[]> pts = new java.util.ArrayList<double[]>();
        try {
            BufferedReader br = new BufferedReader(new FileReader(f));
            String line;
            while ((line = br.readLine()) != null) {
                String[] p = line.split(",");
                if (p.length == 2) {
                    try {
                        pts.add(new double[] {Double.parseDouble(p[0]), Double.parseDouble(p[1])});
                    } catch (Exception ignored) {
                    }
                }
            }
            br.close();
        } catch (Exception ignored) {
        }
        f.delete();
        int n = pts.size();
        int step = Math.max(1, (int) Math.ceil(n / 250.0));
        for (int i = 0; i < n; i += step) {
            JSArray pt = new JSArray();
            pt.put((Object) Double.valueOf(pts.get(i)[0]));
            pt.put((Object) Double.valueOf(pts.get(i)[1]));
            out.put(pt);
        }
        if (n > 0 && (n - 1) % step != 0) {
            JSArray pt = new JSArray();
            pt.put((Object) Double.valueOf(pts.get(n - 1)[0]));
            pt.put((Object) Double.valueOf(pts.get(n - 1)[1]));
            out.put(pt);
        }
        return out;
    }

    @PluginMethod
    public void state(PluginCall call) {
        SharedPreferences sp = getContext().getSharedPreferences(TripService.PREFS, Context.MODE_PRIVATE);
        JSObject r = new JSObject();
        r.put("active", sp.getBoolean("active", false));
        r.put("pending", sp.getBoolean("pending", false));
        r.put("km", sp.getFloat("meters", 0f) / 1000.0);
        r.put("car", sp.getString("car", ""));
        r.put("startMs", (double) sp.getLong("startMs", 0L));
        call.resolve(r);
    }
}
