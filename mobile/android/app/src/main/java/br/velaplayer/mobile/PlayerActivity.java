package br.velaplayer.mobile;

import android.app.Activity;
import android.content.pm.ActivityInfo;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.widget.Toast;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.datasource.DefaultDataSource;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import androidx.media3.ui.PlayerView;

public class PlayerActivity extends Activity {
 private ExoPlayer player;
 private PlayerView playerView;
 private SharedPreferences prefs;
 private String resumeKey = "";
 private long originalResume = 0L;
 private final Handler handler = new Handler(Looper.getMainLooper());
 private final Runnable saveRunnable = new Runnable() { @Override public void run() { savePosition(); handler.postDelayed(this, 5000); } };

 @Override protected void onCreate(Bundle state) {
  super.onCreate(state);
  getWindow().setStatusBarColor(Color.BLACK); getWindow().setNavigationBarColor(Color.BLACK);
  getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN |
   View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
  setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
  prefs = getSharedPreferences("vela_mobile", MODE_PRIVATE);
  String url = getIntent().getStringExtra("media_url");
  if (url == null || url.isEmpty()) { finish(); return; }
  resumeKey = getIntent().getStringExtra("resume_key"); if (resumeKey == null) resumeKey = "";
  boolean startOver = getIntent().getBooleanExtra("start_over", false);
  if (startOver && !resumeKey.isEmpty()) prefs.edit().remove("resume:" + resumeKey).apply();
  originalResume = startOver || resumeKey.isEmpty() ? 0L : prefs.getLong("resume:" + resumeKey, 0L);
  playerView = new PlayerView(this); playerView.setUseController(true);
  playerView.setShowBuffering(PlayerView.SHOW_BUFFERING_WHEN_PLAYING); playerView.setKeepScreenOn(true); playerView.setBackgroundColor(Color.BLACK);
  setContentView(playerView);
  DefaultHttpDataSource.Factory httpFactory = new DefaultHttpDataSource.Factory().setUserAgent("VelaPlayer-Android/1.0.0")
   .setConnectTimeoutMs(15000).setReadTimeoutMs(30000).setAllowCrossProtocolRedirects(true);
  DefaultDataSource.Factory sourceFactory = new DefaultDataSource.Factory(this, httpFactory);
  DefaultMediaSourceFactory mediaSourceFactory = new DefaultMediaSourceFactory(sourceFactory);
  player = new ExoPlayer.Builder(this).setMediaSourceFactory(mediaSourceFactory).build(); playerView.setPlayer(player);
  String mime = null, lower = url.toLowerCase(java.util.Locale.ROOT);
  if (lower.contains(".m3u8")) mime = MimeTypes.APPLICATION_M3U8;
  else if (lower.contains(".mpd")) mime = MimeTypes.APPLICATION_MPD;
  MediaItem.Builder builder = new MediaItem.Builder().setUri(url); if (mime != null) builder.setMimeType(mime);
  player.setMediaItem(builder.build());
  player.addListener(new Player.Listener() {
   @Override public void onPlaybackStateChanged(int playbackState) { if (playbackState == Player.STATE_ENDED && !resumeKey.isEmpty()) prefs.edit().remove("resume:" + resumeKey).apply(); }
   @Override public void onPlayerError(PlaybackException error) { Toast.makeText(PlayerActivity.this, "Falha ao reproduzir. Confira a rede, o acesso e o codec.", Toast.LENGTH_LONG).show(); }
  });
  if (originalResume > 0L) player.seekTo(originalResume);
  player.prepare(); player.play(); handler.post(saveRunnable);
 }
 private void savePosition() {
  if (player == null || resumeKey.isEmpty()) return;
  long pos = player.getCurrentPosition(), duration = player.getDuration();
  if (pos < 10000L) return;
  if (duration > 0L && pos >= duration - 20000L) prefs.edit().remove("resume:" + resumeKey).apply();
  else prefs.edit().putLong("resume:" + resumeKey, pos).apply();
 }
 @Override protected void onStop() { handler.removeCallbacks(saveRunnable); savePosition(); super.onStop(); }
 @Override protected void onDestroy() { handler.removeCallbacks(saveRunnable); if (playerView != null) playerView.setPlayer(null); if (player != null) { savePosition(); player.release(); player = null; } super.onDestroy(); }
}
