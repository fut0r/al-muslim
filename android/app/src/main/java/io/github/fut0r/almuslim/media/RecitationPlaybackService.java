package io.github.fut0r.almuslim.media;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;
import androidx.core.content.ContextCompat;
import androidx.media.app.NotificationCompat.MediaStyle;
import io.github.fut0r.almuslim.MainActivity;
import io.github.fut0r.almuslim.R;

/**
 * Keeps a recitation playing when the app is left, and shows it the way a
 * music player would: a media notification with the surah, the ayah and the
 * reciter, and controls on the lock screen and on headsets.
 *
 * The audio itself is played by the web app. This service keeps the app alive
 * while it plays, mirrors what is playing, and passes the controls back.
 */
public class RecitationPlaybackService extends Service {

    static final String ACTION_UPDATE = "io.github.fut0r.almuslim.action.RECITATION_UPDATE";
    static final String ACTION_CONTROL = "io.github.fut0r.almuslim.action.RECITATION_CONTROL";
    static final String ACTION_STOP = "io.github.fut0r.almuslim.action.RECITATION_STOP";

    static final String EXTRA_TITLE = "title";
    static final String EXTRA_ARTIST = "artist";
    static final String EXTRA_ALBUM = "album";
    static final String EXTRA_PLAYING = "playing";
    static final String EXTRA_LOADING = "loading";
    static final String EXTRA_POSITION = "position";
    static final String EXTRA_DURATION = "duration";
    static final String EXTRA_HAS_NEXT = "hasNext";
    static final String EXTRA_CHANNEL_NAME = "channelName";
    static final String EXTRA_LABEL_PLAY = "labelPlay";
    static final String EXTRA_LABEL_PAUSE = "labelPause";
    static final String EXTRA_LABEL_NEXT = "labelNext";
    static final String EXTRA_LABEL_PREVIOUS = "labelPrevious";
    static final String EXTRA_LABEL_STOP = "labelStop";
    static final String EXTRA_CONTROL = "control";

    static final String CONTROL_PLAY = "play";
    static final String CONTROL_PAUSE = "pause";
    static final String CONTROL_NEXT = "next";
    static final String CONTROL_PREVIOUS = "previous";
    static final String CONTROL_STOP = "stop";
    static final String CONTROL_SEEK = "seek";

    private static final String CHANNEL_ID = "recitation";
    private static final int NOTIFICATION_ID = 7001;

    /** Receives the controls pressed outside the app. */
    interface Listener {
        void onControl(String control, long positionMs);
    }

    private static Listener listener;
    private static boolean running;

    static void setListener(Listener next) {
        listener = next;
    }

    static boolean isRunning() {
        return running;
    }

    private MediaSessionCompat session;
    private PowerManager.WakeLock wakeLock;
    private WifiManager.WifiLock wifiLock;
    private boolean foreground;

    private String title = "";
    private String artist = "";
    private String album = "";
    private boolean playing;
    private boolean loading;
    private long position;
    private long duration;
    private boolean hasNext = true;
    private String labelPlay = "Play";
    private String labelPause = "Pause";
    private String labelNext = "Next";
    private String labelPrevious = "Previous";
    private String labelStop = "Stop";

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        running = true;

        session = new MediaSessionCompat(this, "AlMuslimRecitation");
        session.setCallback(
            new MediaSessionCompat.Callback() {
                @Override
                public void onPlay() {
                    control(CONTROL_PLAY, 0);
                }

                @Override
                public void onPause() {
                    control(CONTROL_PAUSE, 0);
                }

                @Override
                public void onSkipToNext() {
                    control(CONTROL_NEXT, 0);
                }

                @Override
                public void onSkipToPrevious() {
                    control(CONTROL_PREVIOUS, 0);
                }

                @Override
                public void onStop() {
                    control(CONTROL_STOP, 0);
                }

                @Override
                public void onSeekTo(long positionMs) {
                    control(CONTROL_SEEK, positionMs);
                }
            }
        );

        PowerManager power = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (power != null) {
            wakeLock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "AlMuslim:recitation");
            wakeLock.setReferenceCounted(false);
        }
        WifiManager wifi = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
        if (wifi != null) {
            wifiLock = wifi.createWifiLock(WifiManager.WIFI_MODE_FULL_HIGH_PERF, "AlMuslim:recitation");
            wifiLock.setReferenceCounted(false);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? null : intent.getAction();

        if (ACTION_CONTROL.equals(action)) {
            control(intent.getStringExtra(EXTRA_CONTROL), 0);
            // A control can arrive before the first update; never leave the service without its notification.
            if (!foreground) show();
            return START_NOT_STICKY;
        }

        if (ACTION_UPDATE.equals(action)) {
            title = text(intent, EXTRA_TITLE, title);
            artist = text(intent, EXTRA_ARTIST, artist);
            album = text(intent, EXTRA_ALBUM, album);
            playing = intent.getBooleanExtra(EXTRA_PLAYING, false);
            loading = intent.getBooleanExtra(EXTRA_LOADING, false);
            position = intent.getLongExtra(EXTRA_POSITION, 0);
            duration = intent.getLongExtra(EXTRA_DURATION, 0);
            hasNext = intent.getBooleanExtra(EXTRA_HAS_NEXT, true);
            labelPlay = text(intent, EXTRA_LABEL_PLAY, labelPlay);
            labelPause = text(intent, EXTRA_LABEL_PAUSE, labelPause);
            labelNext = text(intent, EXTRA_LABEL_NEXT, labelNext);
            labelPrevious = text(intent, EXTRA_LABEL_PREVIOUS, labelPrevious);
            labelStop = text(intent, EXTRA_LABEL_STOP, labelStop);
            createChannel(text(intent, EXTRA_CHANNEL_NAME, "Recitation"));
            show();
            return START_NOT_STICKY;
        }

        // Asked to stop, or restarted by the system with nothing to play.
        if (!foreground) show();
        shutDown();
        return START_NOT_STICKY;
    }

    /** The app was swiped away: the audio is gone with it. */
    @Override
    public void onTaskRemoved(Intent rootIntent) {
        shutDown();
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        running = false;
        releaseLocks();
        if (session != null) {
            session.setActive(false);
            session.release();
        }
        super.onDestroy();
    }

    private static String text(Intent intent, String key, String fallback) {
        String value = intent.getStringExtra(key);
        return value == null ? fallback : value;
    }

    private static void control(String control, long positionMs) {
        Listener current = listener;
        if (current != null && control != null) current.onControl(control, positionMs);
    }

    private void shutDown() {
        releaseLocks();
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
        foreground = false;
        stopSelf();
    }

    private void createChannel(String name) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) return;
        // Low importance: it is a player, it must never make a sound of its own.
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, name, NotificationManager.IMPORTANCE_LOW);
        channel.setShowBadge(false);
        manager.createNotificationChannel(channel);
    }

    /** Publishes the current state to the system and keeps the service in the foreground. */
    private void show() {
        long actions =
            PlaybackStateCompat.ACTION_PLAY |
            PlaybackStateCompat.ACTION_PAUSE |
            PlaybackStateCompat.ACTION_PLAY_PAUSE |
            PlaybackStateCompat.ACTION_STOP |
            PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS |
            PlaybackStateCompat.ACTION_SEEK_TO;
        if (hasNext) actions |= PlaybackStateCompat.ACTION_SKIP_TO_NEXT;

        int state = loading
            ? PlaybackStateCompat.STATE_BUFFERING
            : playing ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED;
        session.setPlaybackState(
            new PlaybackStateCompat.Builder().setActions(actions).setState(state, position, playing && !loading ? 1f : 0f).build()
        );

        MediaMetadataCompat.Builder metadata = new MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, title)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, artist)
            .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, album);
        if (duration > 0) metadata.putLong(MediaMetadataCompat.METADATA_KEY_DURATION, duration);
        session.setMetadata(metadata.build());
        session.setActive(true);

        Intent open = new Intent(this, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent openApp = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_prayer)
            .setColor(ContextCompat.getColor(this, R.color.brand))
            .setContentTitle(title)
            .setContentText(artist)
            .setSubText(album)
            .setContentIntent(openApp)
            .setDeleteIntent(controlIntent(CONTROL_STOP, 4))
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
            .setOnlyAlertOnce(true)
            .setShowWhen(false)
            .setOngoing(playing || loading)
            .addAction(R.drawable.ic_media_previous, labelPrevious, controlIntent(CONTROL_PREVIOUS, 1));
        if (playing || loading) builder.addAction(R.drawable.ic_media_pause, labelPause, controlIntent(CONTROL_PAUSE, 2));
        else builder.addAction(R.drawable.ic_media_play, labelPlay, controlIntent(CONTROL_PLAY, 2));
        builder
            .addAction(R.drawable.ic_media_next, labelNext, controlIntent(CONTROL_NEXT, 3))
            .addAction(R.drawable.ic_media_stop, labelStop, controlIntent(CONTROL_STOP, 4))
            .setStyle(new MediaStyle().setMediaSession(session.getSessionToken()).setShowActionsInCompactView(0, 1, 2));

        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q ? ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK : 0;
        try {
            ServiceCompat.startForeground(this, NOTIFICATION_ID, builder.build(), type);
            foreground = true;
        } catch (RuntimeException error) {
            // The system refused (for instance a start from the background): playback simply stays in the app.
            foreground = false;
        }

        // Streaming needs the processor and the network to stay awake with the screen off.
        if (playing || loading) acquireLocks();
        else releaseLocks();
    }

    private PendingIntent controlIntent(String control, int requestCode) {
        Intent intent = new Intent(this, RecitationPlaybackService.class).setAction(ACTION_CONTROL).putExtra(EXTRA_CONTROL, control);
        return PendingIntent.getService(this, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private void acquireLocks() {
        try {
            if (wakeLock != null && !wakeLock.isHeld()) wakeLock.acquire(6 * 60 * 60 * 1000L);
            if (wifiLock != null && !wifiLock.isHeld()) wifiLock.acquire();
        } catch (RuntimeException error) {
            // Locks are a help, not a requirement.
        }
    }

    private void releaseLocks() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
            if (wifiLock != null && wifiLock.isHeld()) wifiLock.release();
        } catch (RuntimeException error) {
            // Already released.
        }
    }
}
