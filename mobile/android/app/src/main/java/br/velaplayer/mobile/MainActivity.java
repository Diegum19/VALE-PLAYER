package br.velaplayer.mobile;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
 private WebView webView;
 private final ExecutorService network = Executors.newFixedThreadPool(3);
 private SharedPreferences prefs;

 @Override public void onCreate(Bundle state) {
  super.onCreate(state);
  getWindow().setStatusBarColor(Color.rgb(8,9,13));
  getWindow().setNavigationBarColor(Color.rgb(8,9,13));
  prefs = getSharedPreferences("vela_mobile", MODE_PRIVATE);
  webView = new WebView(this);
  webView.setBackgroundColor(Color.rgb(8,9,13));
  webView.setVerticalScrollBarEnabled(false);
  webView.setHorizontalScrollBarEnabled(false);
  webView.getSettings().setJavaScriptEnabled(true);
  webView.getSettings().setDomStorageEnabled(true);
  webView.getSettings().setMediaPlaybackRequiresUserGesture(true);
  webView.getSettings().setAllowFileAccess(true);
  webView.getSettings().setAllowContentAccess(false);
  webView.getSettings().setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  webView.addJavascriptInterface(new NativeBridge(), "NativeBridge");
  webView.setWebChromeClient(new WebChromeClient());
  webView.setWebViewClient(new WebViewClient() {
   @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
    Uri uri = request.getUrl();
    return !"file".equalsIgnoreCase(uri.getScheme()) || !"/android_asset/web/index.html".equals(uri.getPath());
   }
   @Override public void onReceivedError(WebView view, WebResourceRequest request, android.webkit.WebResourceError error) {
    if (request.isForMainFrame()) view.evaluateJavascript("window.showFatalError && window.showFatalError('Não foi possível abrir a interface. Feche e abra o aplicativo novamente.');", null);
   }
  });
  setContentView(webView);
  webView.loadUrl("file:///android_asset/web/index.html");
 }

 @Override public void onBackPressed() {
  if (webView != null) webView.evaluateJavascript("window.handleAndroidBack && window.handleAndroidBack()", null);
  else super.onBackPressed();
 }
 @Override protected void onDestroy() {
  if (webView != null) { webView.removeJavascriptInterface("NativeBridge"); webView.destroy(); webView = null; }
  network.shutdownNow(); super.onDestroy();
 }
 private void deliver(String callbackId, String json) {
  if (webView == null) return;
  String id = JSONObject.quote(callbackId == null ? "" : callbackId);
  String payload = JSONObject.quote(json == null ? "{}" : json);
  runOnUiThread(() -> { if (webView != null) webView.evaluateJavascript("window.__velaNativeResolve && window.__velaNativeResolve(" + id + ", JSON.parse(" + payload + "));", null); });
 }
 private static boolean isHttpUrl(String value) {
  try { String scheme = new URL(value).getProtocol(); return "http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme); }
  catch (Exception ex) { return false; }
 }
 private static String readFully(InputStream stream) throws Exception {
  StringBuilder out = new StringBuilder();
  try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) { String line; while ((line = reader.readLine()) != null) out.append(line); }
  return out.toString();
 }
 public class NativeBridge {
  @JavascriptInterface public void api(String callbackId, String urlValue) {
   network.execute(() -> {
    HttpURLConnection connection = null; JSONObject response = new JSONObject();
    try {
     if (!isHttpUrl(urlValue)) response.put("ok", false).put("error", "bad_url");
     else {
      connection = (HttpURLConnection) new URL(urlValue).openConnection();
      connection.setRequestMethod("GET"); connection.setConnectTimeout(15000); connection.setReadTimeout(30000);
      connection.setInstanceFollowRedirects(true); connection.setRequestProperty("User-Agent", "VelaPlayer-Android/1.0.0");
      int status = connection.getResponseCode();
      if (status < 200 || status >= 300) response.put("ok", false).put("error", "http").put("status", status);
      else {
       String body = readFully(connection.getInputStream());
       try { response.put("ok", true).put("json", new JSONObject(body)); }
       catch (Exception notObject) {
        try { response.put("ok", true).put("json", new org.json.JSONArray(body)); }
        catch (Exception notJson) { response.put("ok", false).put("error", "not_json"); }
       }
      }
     }
    } catch (javax.net.ssl.SSLException ssl) { try { response.put("ok", false).put("error", "ssl"); } catch (Exception ignored) {} }
      catch (java.net.SocketTimeoutException timeout) { try { response.put("ok", false).put("error", "timeout"); } catch (Exception ignored) {} }
      catch (Exception ex) { try { response.put("ok", false).put("error", "network"); } catch (Exception ignored) {} }
    finally { if (connection != null) connection.disconnect(); }
    deliver(callbackId, response.toString());
   });
  }
  @JavascriptInterface public void playUrl(String mediaUrl, String title, String resumeKey, boolean startOver) {
   if (!isHttpUrl(mediaUrl)) return;
   runOnUiThread(() -> {
    Intent intent = new Intent(MainActivity.this, PlayerActivity.class);
    intent.putExtra("media_url", mediaUrl); intent.putExtra("media_title", title == null ? "Vela Player" : title);
    intent.putExtra("resume_key", resumeKey == null ? "" : resumeKey); intent.putExtra("start_over", startOver);
    startActivity(intent);
   });
  }
  @JavascriptInterface public long getResume(String key) { return key == null || key.isEmpty() ? 0L : prefs.getLong("resume:" + key, 0L); }
  @JavascriptInterface public void clearResume(String key) { if (key != null && !key.isEmpty()) prefs.edit().remove("resume:" + key).apply(); }
  @JavascriptInterface public String appVersion() { return "1.0.0"; }
 }
}
