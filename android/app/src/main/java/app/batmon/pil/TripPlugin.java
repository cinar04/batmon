package app.batmon.pil;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.location.LocationManager;
import androidx.core.content.ContextCompat;
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
        c.stopService(new Intent(c, TripService.class));
        sp.edit().putBoolean("active", false).putBoolean("pending", false).putFloat("meters", 0f).apply();
        JSObject r = new JSObject();
        r.put("km", km);
        r.put("car", car);
        call.resolve(r);
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
