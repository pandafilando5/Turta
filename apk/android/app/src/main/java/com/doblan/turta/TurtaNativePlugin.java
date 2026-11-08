package com.doblan.turta;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.UriPermission;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.ParcelFileDescriptor;
import android.os.PowerManager;
import android.provider.DocumentsContract;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.provider.Settings;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Turta'nın küçük yerel köprüsü.
 *
 * 1) Senkron dosyası: kullanıcı sistem dosya seçicisiyle Google Drive'da (veya
 *    başka bir bulut/yerel klasörde) bir JSON dosyası seçer ya da oluşturur.
 *    Uygulama o dosyaya kalıcı okuma/yazma izni alır; sonra her değişiklikte
 *    dosyayı yeniden yazar, açılışta okur. Drive uygulaması dosyayı kendisi
 *    buluta yükler. Google hesabı / OAuth / sunucu gerekmez.
 * 2) İndirilenler'e kaydetme (Android 10+; izin gerektirmez).
 * 3) Pil optimizasyonu ve bildirim ayarları kısayolları.
 */
@CapacitorPlugin(name = "TurtaNative")
public class TurtaNativePlugin extends Plugin {

    private static final int RW = Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION;

    // ───────────── Senkron dosyası seçimi ─────────────

    /** Yeni senkron dosyası oluştur (Drive'da konum seçilir). */
    @PluginMethod
    public void syncPickCreate(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/json");
        intent.putExtra(Intent.EXTRA_TITLE, call.getString("name", "turta_senkron.json"));
        intent.addFlags(RW | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(call, intent, "onPicked");
    }

    /** Var olan bir dosyayı (ör. Drive'daki yedek) senkron dosyası olarak seç. */
    @PluginMethod
    public void syncPickOpen(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        // Tür süzgeci yok: Drive bazı .json dosyalarını farklı MIME türüyle bildiriyor,
        // süzgeç dosyayı gizleyebiliyordu. İçerik JS tarafında doğrulanır.
        intent.setType("*/*");
        intent.addFlags(RW | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(call, intent, "onPicked");
    }

    @ActivityCallback
    private void onPicked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        try {
            if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
                call.reject("Seçim iptal edildi", "CANCELLED");
                return;
            }
            Uri uri = result.getData().getData();
            boolean persisted = true;
            try {
                getContext().getContentResolver().takePersistableUriPermission(uri, RW);
            } catch (SecurityException e) {
                // Bazı sağlayıcılar yalnızca okuma izni verir ya da kalıcı izin vermez.
                persisted = false;
                try {
                    getContext().getContentResolver()
                        .takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                } catch (SecurityException ignored) { }
            }
            JSObject ret = describe(uri);
            ret.put("persisted", persisted);
            call.resolve(ret);
        } finally {
            getBridge().releaseCall(call);
        }
    }

    // ───────────── Okuma / yazma ─────────────

    @PluginMethod
    public void syncRead(PluginCall call) {
        Uri uri = uriOf(call);
        if (uri == null) return;
        try (InputStream in = getContext().getContentResolver().openInputStream(uri)) {
            if (in == null) throw new IllegalStateException("Dosya açılamadı");
            ByteArrayOutputStream buf = new ByteArrayOutputStream();
            byte[] chunk = new byte[16384];
            int n;
            while ((n = in.read(chunk)) > 0) buf.write(chunk, 0, n);
            JSObject ret = describe(uri);
            ret.put("data", new String(buf.toByteArray(), StandardCharsets.UTF_8));
            call.resolve(ret);
        } catch (SecurityException e) {
            call.reject("Dosyaya erişim izni yok — yeniden seçin", "NO_PERMISSION", e);
        } catch (Exception e) {
            call.reject("Okunamadı: " + e.getMessage(), "READ_FAILED", e);
        }
    }

    @PluginMethod
    public void syncWrite(PluginCall call) {
        Uri uri = uriOf(call);
        if (uri == null) return;
        String data = call.getString("data", "");
        byte[] bytes = data.getBytes(StandardCharsets.UTF_8);
        ContentResolver cr = getContext().getContentResolver();
        Exception last = null;

        // 1) "wt" — yaz ve kısalt. Çoğu sağlayıcı destekler.
        try (OutputStream out = cr.openOutputStream(uri, "wt")) {
            if (out == null) throw new IllegalStateException("Akış yok");
            out.write(bytes);
            out.flush();
            call.resolve(describe(uri));
            return;
        } catch (SecurityException e) {
            call.reject("Dosyaya yazma izni yok — yeniden seçin", "NO_PERMISSION", e);
            return;
        } catch (Exception e) {
            last = e;
        }

        // 2) "rwt" + elle kısaltma — "wt" desteklemeyen sağlayıcılar için.
        try {
            ParcelFileDescriptor pfd = cr.openFileDescriptor(uri, "rwt");
            if (pfd == null) throw new IllegalStateException("Tanımlayıcı yok");
            try (FileOutputStream fos = new ParcelFileDescriptor.AutoCloseOutputStream(pfd)) {
                fos.getChannel().truncate(0);
                fos.write(bytes);
                fos.flush();
            }
            call.resolve(describe(uri));
            return;
        } catch (Exception e) {
            last = e;
        }

        // 3) Son çare "w". Kısaltmayabilir — JS tarafı sonda kalan artığı tolere eder.
        try (OutputStream out = cr.openOutputStream(uri, "w")) {
            if (out == null) throw new IllegalStateException("Akış yok");
            out.write(bytes);
            out.flush();
            JSObject ret = describe(uri);
            ret.put("noTruncate", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Yazılamadı: " + (last != null ? last.getMessage() : e.getMessage()), "WRITE_FAILED", e);
        }
    }

    /** Dosya hâlâ erişilebilir mi, adı ve son değişikliği ne? */
    @PluginMethod
    public void syncInfo(PluginCall call) {
        Uri uri = uriOf(call);
        if (uri == null) return;
        JSObject ret = describe(uri);
        boolean canWrite = false, canRead = false;
        for (UriPermission p : getContext().getContentResolver().getPersistedUriPermissions()) {
            if (p.getUri().equals(uri)) {
                canRead = p.isReadPermission();
                canWrite = p.isWritePermission();
            }
        }
        ret.put("canRead", canRead);
        ret.put("canWrite", canWrite);
        call.resolve(ret);
    }

    @PluginMethod
    public void syncRelease(PluginCall call) {
        Uri uri = uriOf(call);
        if (uri == null) return;
        try {
            getContext().getContentResolver().releasePersistableUriPermission(uri, RW);
        } catch (Exception ignored) { }
        call.resolve();
    }

    // ───────────── İndirilenler klasörüne kaydet ─────────────

    /** Android 10+: Download/Turta/ altına izin istemeden kaydeder. Uygulama silinse de dosya kalır. */
    @PluginMethod
    public void saveToDownloads(PluginCall call) {
        String name = call.getString("name", "turta.json");
        String mime = call.getString("mime", "application/octet-stream");
        String data = call.getString("data", "");
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            call.reject("Android 10 öncesinde desteklenmiyor", "UNSUPPORTED");
            return;
        }
        try {
            ContentValues v = new ContentValues();
            v.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
            v.put(MediaStore.MediaColumns.MIME_TYPE, mime);
            v.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Turta");
            v.put(MediaStore.MediaColumns.IS_PENDING, 1);
            ContentResolver cr = getContext().getContentResolver();
            Uri uri = cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
            if (uri == null) throw new IllegalStateException("Kayıt oluşturulamadı");
            try (OutputStream out = cr.openOutputStream(uri, "w")) {
                if (out == null) throw new IllegalStateException("Akış yok");
                out.write(data.getBytes(StandardCharsets.UTF_8));
            }
            v.clear();
            v.put(MediaStore.MediaColumns.IS_PENDING, 0);
            cr.update(uri, v, null, null);
            JSObject ret = new JSObject();
            ret.put("uri", uri.toString());
            ret.put("path", Environment.DIRECTORY_DOWNLOADS + "/Turta/" + name);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Kaydedilemedi: " + e.getMessage(), "SAVE_FAILED", e);
        }
    }

    // ───────────── Harici bağlantı ─────────────

    /** Google Takvim, Drive klasörü, APK indirme vb. — sistemin uygun uygulamasıyla açar. */
    @PluginMethod
    public void openUrl(PluginCall call) {
        String url = call.getString("url");
        if (url == null || !(url.startsWith("https://") || url.startsWith("http://"))) {
            call.reject("Geçersiz adres", "BAD_URL");
            return;
        }
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("Açacak uygulama bulunamadı", "NO_APP", e);
        }
    }

    // ───────────── Ayarlar kısayolları ─────────────

    @PluginMethod
    public void batteryStatus(PluginCall call) {
        JSObject ret = new JSObject();
        PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        ret.put("ignoring", pm != null && pm.isIgnoringBatteryOptimizations(getContext().getPackageName()));
        ret.put("sdk", Build.VERSION.SDK_INT);
        ret.put("manufacturer", Build.MANUFACTURER);
        call.resolve(ret);
    }

    @PluginMethod
    public void openBatterySettings(PluginCall call) {
        Context ctx = getContext();
        try {
            Intent i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                Uri.parse("package:" + ctx.getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(i);
        } catch (Exception e) {
            try {
                Intent i = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(i);
            } catch (Exception ignored) { }
        }
        call.resolve();
    }

    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        Context ctx = getContext();
        try {
            Intent i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
            i.putExtra(Settings.EXTRA_APP_PACKAGE, ctx.getPackageName());
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(i);
        } catch (Exception e) {
            Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.parse("package:" + ctx.getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(i);
        }
        call.resolve();
    }

    // ───────────── Yardımcılar ─────────────

    private Uri uriOf(PluginCall call) {
        String s = call.getString("uri");
        if (s == null || s.isEmpty()) {
            call.reject("uri gerekli", "NO_URI");
            return null;
        }
        return Uri.parse(s);
    }

    private JSObject describe(Uri uri) {
        JSObject o = new JSObject();
        o.put("uri", uri.toString());
        String name = null;
        long modified = 0, size = -1;
        try (Cursor c = getContext().getContentResolver().query(uri, null, null, null, null)) {
            if (c != null && c.moveToFirst()) {
                int i = c.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (i >= 0 && !c.isNull(i)) name = c.getString(i);
                i = c.getColumnIndex(OpenableColumns.SIZE);
                if (i >= 0 && !c.isNull(i)) size = c.getLong(i);
                i = c.getColumnIndex(DocumentsContract.Document.COLUMN_LAST_MODIFIED);
                if (i >= 0 && !c.isNull(i)) modified = c.getLong(i);
            }
        } catch (Exception ignored) { }
        o.put("name", name != null ? name : uri.getLastPathSegment());
        o.put("size", size);
        o.put("modified", modified);
        o.put("provider", uri.getAuthority());
        return o;
    }
}
