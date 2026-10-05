package io.github.fut0r.almuslim.media;

import android.content.Context;
import android.content.Intent;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Bridge between the web app's recitation player and the system's media
 * controls. The app reports what is playing; the buttons pressed on the
 * notification, the lock screen or a headset come back as "control" events.
 */
@CapacitorPlugin(name = "RecitationSession")
public class RecitationSessionPlugin extends Plugin implements RecitationPlaybackService.Listener {

    @Override
    public void load() {
        RecitationPlaybackService.setListener(this);
    }

    @Override
    protected void handleOnDestroy() {
        RecitationPlaybackService.setListener(null);
        stopService();
    }

    @Override
    public void onControl(String control, long positionMs) {
        JSObject data = new JSObject();
        data.put("control", control);
        data.put("position", positionMs / 1000.0);
        notifyListeners("control", data);
    }

    /** Shows or refreshes the media notification for what is playing now. */
    @PluginMethod
    public void update(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(context, RecitationPlaybackService.class)
            .setAction(RecitationPlaybackService.ACTION_UPDATE)
            .putExtra(RecitationPlaybackService.EXTRA_TITLE, call.getString("title", ""))
            .putExtra(RecitationPlaybackService.EXTRA_ARTIST, call.getString("artist", ""))
            .putExtra(RecitationPlaybackService.EXTRA_ALBUM, call.getString("album", ""))
            .putExtra(RecitationPlaybackService.EXTRA_PLAYING, Boolean.TRUE.equals(call.getBoolean("playing", false)))
            .putExtra(RecitationPlaybackService.EXTRA_LOADING, Boolean.TRUE.equals(call.getBoolean("loading", false)))
            .putExtra(RecitationPlaybackService.EXTRA_POSITION, seconds(call, "position"))
            .putExtra(RecitationPlaybackService.EXTRA_DURATION, seconds(call, "duration"))
            .putExtra(RecitationPlaybackService.EXTRA_HAS_NEXT, !Boolean.FALSE.equals(call.getBoolean("hasNext", true)))
            .putExtra(RecitationPlaybackService.EXTRA_CHANNEL_NAME, call.getString("channelName", "Recitation"))
            .putExtra(RecitationPlaybackService.EXTRA_LABEL_PLAY, call.getString("labelPlay", "Play"))
            .putExtra(RecitationPlaybackService.EXTRA_LABEL_PAUSE, call.getString("labelPause", "Pause"))
            .putExtra(RecitationPlaybackService.EXTRA_LABEL_NEXT, call.getString("labelNext", "Next"))
            .putExtra(RecitationPlaybackService.EXTRA_LABEL_PREVIOUS, call.getString("labelPrevious", "Previous"))
            .putExtra(RecitationPlaybackService.EXTRA_LABEL_STOP, call.getString("labelStop", "Stop"));
        try {
            // Once it is running the service only needs to be told; starting it
            // is only allowed while the app is in front, which is when play is pressed.
            if (RecitationPlaybackService.isRunning()) context.startService(intent);
            else ContextCompat.startForegroundService(context, intent);
            call.resolve();
        } catch (RuntimeException error) {
            call.reject("The media controls could not be shown: " + error.getMessage());
        }
    }

    /** Removes the media notification: nothing is playing any more. */
    @PluginMethod
    public void stop(PluginCall call) {
        stopService();
        call.resolve();
    }

    private void stopService() {
        if (!RecitationPlaybackService.isRunning()) return;
        Context context = getContext();
        try {
            context.startService(new Intent(context, RecitationPlaybackService.class).setAction(RecitationPlaybackService.ACTION_STOP));
        } catch (RuntimeException error) {
            context.stopService(new Intent(context, RecitationPlaybackService.class));
        }
    }

    /** A time the app gives in seconds, as the milliseconds the system wants. */
    private static long seconds(PluginCall call, String key) {
        Double value = call.getDouble(key, 0.0);
        return value == null || value.isNaN() || value < 0 ? 0 : Math.round(value * 1000);
    }
}
