package app.batmon.pil;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/** Uygulama içi güncelleme: APK'yı indirir ve sistem yükleyicisini açar. */
@CapacitorPlugin(name = "AppUpdate")
public class UpdatePlugin extends Plugin {

    private File apkFile() {
        File dir = new File(getContext().getCacheDir(), "update");
        dir.mkdirs();
        return new File(dir, "batmon.apk");
    }

    @PluginMethod
    public void canInstall(PluginCall call) {
        boolean ok = Build.VERSION.SDK_INT < 26 || getContext().getPackageManager().canRequestPackageInstalls();
        JSObject r = new JSObject();
        r.put("ok", ok);
        call.resolve(r);
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        try {
            Intent i = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("Ayar sayfası açılamadı: " + e.getMessage());
        }
    }

    @PluginMethod
    public void download(final PluginCall call) {
        final String url = call.getString("url");
        if (url == null || url.length() == 0) {
            call.reject("Adres yok");
            return;
        }
        new Thread(new Runnable() {
            @Override
            public void run() {
                HttpURLConnection con = null;
                try {
                    con = (HttpURLConnection) new URL(url).openConnection();
                    con.setInstanceFollowRedirects(true);
                    con.setConnectTimeout(20000);
                    con.setReadTimeout(30000);
                    con.setRequestProperty("User-Agent", "BATMON-Updater");
                    int code = con.getResponseCode();
                    if (code != 200) {
                        call.reject("İndirme hatası: HTTP " + code);
                        return;
                    }
                    long total = con.getContentLength();
                    File out = apkFile();
                    InputStream in = con.getInputStream();
                    FileOutputStream fo = new FileOutputStream(out);
                    byte[] buf = new byte[32768];
                    long got = 0;
                    int lastPct = -1;
                    int n;
                    while ((n = in.read(buf)) > 0) {
                        fo.write(buf, 0, n);
                        got += n;
                        if (total > 0) {
                            int pct = (int) (got * 100 / total);
                            if (pct != lastPct && pct % 2 == 0) {
                                lastPct = pct;
                                JSObject p = new JSObject();
                                p.put("pct", pct);
                                notifyListeners("progress", p);
                            }
                        }
                    }
                    fo.close();
                    in.close();
                    JSObject r = new JSObject();
                    r.put("bytes", (double) got);
                    call.resolve(r);
                } catch (Exception e) {
                    call.reject("İndirilemedi: " + e.getMessage());
                } finally {
                    if (con != null) con.disconnect();
                }
            }
        }).start();
    }

    @PluginMethod
    public void install(PluginCall call) {
        try {
            Context c = getContext();
            File f = apkFile();
            if (!f.exists()) {
                call.reject("Önce APK indirilmeli");
                return;
            }
            Uri uri = FileProvider.getUriForFile(c, c.getPackageName() + ".fileprovider", f);
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setDataAndType(uri, "application/vnd.android.package-archive");
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            c.startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("Yükleyici açılamadı: " + e.getMessage());
        }
    }
}
