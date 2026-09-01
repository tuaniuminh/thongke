package vn.familife.thongke;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.StrictMode;
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

@CapacitorPlugin(name = "AppUpdatePlugin")
public class AppUpdatePlugin extends Plugin {

    @PluginMethod
    public void downloadAndInstallAPK(PluginCall call) {
        String urlString = call.getString("url");
        if (urlString == null || urlString.isEmpty()) {
            call.reject("URL không hợp lệ");
            return;
        }

        new Thread(() -> {
            try {
                Context context = getContext();
                URL url = new URL(urlString);
                HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod("GET");
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(30000);
                connection.connect();

                if (connection.getResponseCode() != HttpURLConnection.HTTP_OK) {
                    new Handler(Looper.getMainLooper()).post(() -> 
                        call.reject("Lỗi kết nối máy chủ: HTTP " + connection.getResponseCode())
                    );
                    return;
                }

                int fileLength = connection.getContentLength();
                File outputDir = context.getExternalCacheDir();
                if (outputDir == null) {
                    outputDir = context.getCacheDir();
                }
                File outputFile = new File(outputDir, "FamiLife_update.apk");
                if (outputFile.exists()) {
                    outputFile.delete();
                }

                InputStream input = connection.getInputStream();
                FileOutputStream output = new FileOutputStream(outputFile);

                byte[] data = new byte[8192];
                long total = 0;
                int count;
                long lastTime = System.currentTimeMillis();
                long lastBytes = 0;
                String speedStr = "0 KB/s";

                while ((count = input.read(data)) != -1) {
                    total += count;
                    output.write(data, 0, count);

                    long now = System.currentTimeMillis();
                    if (now - lastTime >= 400) {
                        long diffBytes = total - lastBytes;
                        double intervalSec = (now - lastTime) / 1000.0;
                        double bytesPerSec = intervalSec > 0 ? (diffBytes / intervalSec) : 0;
                        if (bytesPerSec >= 1024 * 1024) {
                            speedStr = String.format("%.1f MB/s", bytesPerSec / (1024.0 * 1024.0));
                        } else {
                            speedStr = String.format("%.0f KB/s", bytesPerSec / 1024.0);
                        }
                        lastTime = now;
                        lastBytes = total;

                        double progress = fileLength > 0 ? ((double) total / (double) fileLength) : 0.0;
                        JSObject progressData = new JSObject();
                        progressData.put("progress", progress);
                        progressData.put("downloadedBytes", total);
                        progressData.put("totalBytes", fileLength);
                        progressData.put("downloadedMB", String.format("%.1f", total / 1024.0 / 1024.0));
                        progressData.put("totalMB", String.format("%.1f", fileLength / 1024.0 / 1024.0));
                        progressData.put("speed", speedStr);
                        notifyListeners("apkDownloadProgress", progressData);
                    }
                }

                output.flush();
                output.close();
                input.close();

                // Kích hoạt trình cài đặt APK hệ thống
                new Handler(Looper.getMainLooper()).post(() -> {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW);
                        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                            try {
                                Uri apkUri = FileProvider.getUriForFile(
                                    context,
                                    context.getPackageName() + ".fileprovider",
                                    outputFile
                                );
                                intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                            } catch (Exception e) {
                                StrictMode.VmPolicy.Builder builder = new StrictMode.VmPolicy.Builder();
                                StrictMode.setVmPolicy(builder.build());
                                Uri apkUri = Uri.fromFile(outputFile);
                                intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                            }
                        } else {
                            Uri apkUri = Uri.fromFile(outputFile);
                            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                        }

                        context.startActivity(intent);

                        JSObject ret = new JSObject();
                        ret.put("success", true);
                        ret.put("path", outputFile.getAbsolutePath());
                        call.resolve(ret);
                    } catch (Exception ex) {
                        call.reject("Lỗi mở trình cài đặt APK: " + ex.getMessage());
                    }
                });

            } catch (Exception e) {
                new Handler(Looper.getMainLooper()).post(() -> 
                    call.reject("Lỗi trong quá trình tải APK: " + e.getMessage())
                );
            }
        }).start();
    }
}
