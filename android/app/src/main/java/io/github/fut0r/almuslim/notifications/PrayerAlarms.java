package io.github.fut0r.almuslim.notifications;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import io.github.fut0r.almuslim.MainActivity;
import io.github.fut0r.almuslim.R;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Prayer notifications: set as alarms with the system and shown by the app
 * itself, so they arrive with the app closed and without any server.
 *
 * The web app works out the prayer times and hands over a ready list of
 * notifications (see src/services/notifications/native.ts). The list is kept
 * on the device so the alarms can be set again after the phone restarts.
 */
final class PrayerAlarms {

    static final String ACTION_FIRE = "io.github.fut0r.almuslim.action.PRAYER_ALARM";
    static final String EXTRA_ID = "id";

    /** Outside the ids of prayer times, which are built from the date. */
    static final int TEST_ID = 1;

    /** Bundled in res/raw by scripts/sync-android-assets.mjs. */
    private static final String ADHAN_SOUND = "adhan";

    private static final String PREFERENCES = "prayer_notifications";
    private static final String KEY_SCHEDULE = "schedule";
    private static final String KEY_TEST = "test";
    private static final String KEY_LAST_SHOWN = "last_shown";
    private static final String KEY_LAST_ERROR = "last_error";

    /** A notification this late is no longer the start of a prayer time. */
    private static final long TOO_LATE_MS = 30 * 60 * 1000L;

    private PrayerAlarms() {}

    private static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
    }

    private static JSONObject read(Context context, String key) {
        String stored = preferences(context).getString(key, null);
        if (stored == null) return null;
        try {
            return new JSONObject(stored);
        } catch (JSONException error) {
            return null;
        }
    }

    // --- Scheduling -------------------------------------------------------

    /**
     * Replaces everything scheduled with `schedule`:
     * {"channel": {"id", "name", "description", "adhan"}, "items": [{"id", "at", "title", "body"}]}.
     * Returns how many notifications are now waiting.
     */
    static int replace(Context context, JSONObject schedule) {
        cancelAlarms(context, read(context, KEY_SCHEDULE));
        preferences(context).edit().putString(KEY_SCHEDULE, schedule.toString()).remove(KEY_LAST_ERROR).apply();
        return arm(context);
    }

    static void clear(Context context) {
        cancelAlarms(context, read(context, KEY_SCHEDULE));
        preferences(context).edit().remove(KEY_SCHEDULE).apply();
    }

    /** Sets an alarm for every notification that is still to come. Safe to repeat. */
    static int arm(Context context) {
        JSONObject schedule = read(context, KEY_SCHEDULE);
        if (schedule == null) return 0;
        ensureChannel(context, schedule.optJSONObject("channel"));

        JSONArray items = schedule.optJSONArray("items");
        if (items == null) return 0;
        long now = System.currentTimeMillis();
        int armed = 0;
        for (int index = 0; index < items.length(); index += 1) {
            JSONObject item = items.optJSONObject(index);
            if (item == null) continue;
            long at = item.optLong("at", 0);
            if (at <= now) continue;
            if (setAlarm(context, item.optInt("id", 0), at)) armed += 1;
        }
        return armed;
    }

    /** Shows one notification a few seconds from now, through the same path as a prayer time. */
    static boolean test(Context context, JSONObject channel, String title, String body, long delayMs) {
        long at = System.currentTimeMillis() + delayMs;
        try {
            JSONObject test = new JSONObject();
            test.put("channel", channel);
            test.put("id", TEST_ID);
            test.put("at", at);
            test.put("title", title);
            test.put("body", body);
            preferences(context).edit().putString(KEY_TEST, test.toString()).apply();
        } catch (JSONException error) {
            return false;
        }
        ensureChannel(context, channel);
        return setAlarm(context, TEST_ID, at);
    }

    private static PendingIntent alarmIntent(Context context, int id) {
        Intent intent = new Intent(context, PrayerAlarmReceiver.class).setAction(ACTION_FIRE).putExtra(EXTRA_ID, id);
        // The request code tells the alarms apart; extras alone do not.
        return PendingIntent.getBroadcast(context, id, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static boolean setAlarm(Context context, int id, long at) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) {
            rememberError(context, "No alarm service");
            return false;
        }
        PendingIntent intent = alarmIntent(context, id);
        try {
            if (exactAllowed(context)) {
                // Fires at the minute even while the phone is idle.
                alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, intent);
                return true;
            }
        } catch (SecurityException error) {
            // Exact alarms were switched off in between; fall through to an inexact one.
        }
        try {
            alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, intent);
            return true;
        } catch (RuntimeException error) {
            rememberError(context, "Alarm not set: " + error.getMessage());
            return false;
        }
    }

    private static void cancelAlarms(Context context, JSONObject schedule) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        JSONArray items = schedule == null ? null : schedule.optJSONArray("items");
        if (alarms == null || items == null) return;
        for (int index = 0; index < items.length(); index += 1) {
            JSONObject item = items.optJSONObject(index);
            if (item != null) alarms.cancel(alarmIntent(context, item.optInt("id", 0)));
        }
    }

    static boolean exactAllowed(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true;
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        return alarms != null && alarms.canScheduleExactAlarms();
    }

    // --- Showing ----------------------------------------------------------

    /** Called when an alarm goes off. */
    static void show(Context context, int id) {
        JSONObject item = null;
        JSONObject channel = null;
        if (id == TEST_ID) {
            item = read(context, KEY_TEST);
            channel = item == null ? null : item.optJSONObject("channel");
        } else {
            JSONObject schedule = read(context, KEY_SCHEDULE);
            JSONArray items = schedule == null ? null : schedule.optJSONArray("items");
            channel = schedule == null ? null : schedule.optJSONObject("channel");
            for (int index = 0; items != null && index < items.length(); index += 1) {
                JSONObject candidate = items.optJSONObject(index);
                if (candidate != null && candidate.optInt("id", 0) == id) item = candidate;
            }
        }
        if (item == null || channel == null) return;

        long at = item.optLong("at", 0);
        long now = System.currentTimeMillis();
        if (now - at > TOO_LATE_MS) return;
        if (!notificationsAllowed(context)) {
            rememberError(context, "Notifications are switched off for the app");
            return;
        }

        String channelId = ensureChannel(context, channel);
        boolean adhan = channel.optBoolean("adhan", false);
        String body = item.optString("body", "");

        Intent open = new Intent(context, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openApp = PendingIntent.getActivity(
            context,
            0,
            open,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.drawable.ic_stat_prayer)
            .setColor(ContextCompat.getColor(context, R.color.brand))
            .setContentTitle(item.optString("title", ""))
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setWhen(at)
            .setShowWhen(true)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(true)
            .setContentIntent(openApp);

        // Before Android 8 there are no channels and the sound belongs to the notification.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            if (adhan) builder.setSound(adhanUri(context)).setDefaults(NotificationCompat.DEFAULT_VIBRATE);
            else builder.setDefaults(NotificationCompat.DEFAULT_ALL);
        }

        try {
            NotificationManagerCompat.from(context).notify(id, builder.build());
            preferences(context).edit().putLong(KEY_LAST_SHOWN, now).apply();
        } catch (RuntimeException error) {
            rememberError(context, "Notification not shown: " + error.getMessage());
        }
    }

    static boolean notificationsAllowed(Context context) {
        if (
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            return false;
        }
        return NotificationManagerCompat.from(context).areNotificationsEnabled();
    }

    private static Uri adhanUri(Context context) {
        return Uri.parse(ContentResolver.SCHEME_ANDROID_RESOURCE + "://" + context.getPackageName() + "/raw/" + ADHAN_SOUND);
    }

    /**
     * Makes sure the channel exists and returns its id. Android fixes a
     * channel's sound when it is created, which is why the adhan has a channel
     * of its own; its name and description follow the app's language.
     */
    static String ensureChannel(Context context, JSONObject channel) {
        String id = channel == null ? "prayer-times" : channel.optString("id", "prayer-times");
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || channel == null) return id;

        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) return id;
        NotificationChannel created = new NotificationChannel(id, channel.optString("name", id), NotificationManager.IMPORTANCE_HIGH);
        created.setDescription(channel.optString("description", ""));
        created.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
        created.enableVibration(true);
        if (channel.optBoolean("adhan", false)) {
            AudioAttributes attributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .build();
            created.setSound(adhanUri(context), attributes);
        }
        // For an existing channel this only refreshes the name and description.
        manager.createNotificationChannel(created);
        return id;
    }

    // --- State, for the app's "notification status" screen ------------------

    static void rememberError(Context context, String message) {
        preferences(context).edit().putString(KEY_LAST_ERROR, message).apply();
    }

    static JSONObject status(Context context) throws JSONException {
        JSONObject status = new JSONObject();
        status.put("enabled", notificationsAllowed(context));
        status.put("exact", exactAllowed(context));
        status.put("sdk", Build.VERSION.SDK_INT);
        status.put("release", Build.VERSION.RELEASE);
        status.put("device", Build.MANUFACTURER + " " + Build.MODEL);

        JSONObject schedule = read(context, KEY_SCHEDULE);
        JSONArray items = schedule == null ? null : schedule.optJSONArray("items");
        long now = System.currentTimeMillis();
        int pending = 0;
        long next = 0;
        for (int index = 0; items != null && index < items.length(); index += 1) {
            JSONObject item = items.optJSONObject(index);
            long at = item == null ? 0 : item.optLong("at", 0);
            if (at <= now) continue;
            pending += 1;
            if (next == 0 || at < next) next = at;
        }
        status.put("pending", pending);
        if (next > 0) status.put("next", next);

        long lastShown = preferences(context).getLong(KEY_LAST_SHOWN, 0);
        if (lastShown > 0) status.put("lastShown", lastShown);
        String lastError = preferences(context).getString(KEY_LAST_ERROR, null);
        if (lastError != null) status.put("error", lastError);

        // The user can silence a single channel in the system settings.
        JSONObject channel = schedule == null ? null : schedule.optJSONObject("channel");
        boolean blocked = false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && channel != null) {
            NotificationManager manager = context.getSystemService(NotificationManager.class);
            NotificationChannel existing = manager == null ? null : manager.getNotificationChannel(channel.optString("id", ""));
            blocked = existing != null && existing.getImportance() == NotificationManager.IMPORTANCE_NONE;
        }
        status.put("channelBlocked", blocked);

        PowerManager power = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        status.put("batteryRestricted", power != null && !power.isIgnoringBatteryOptimizations(context.getPackageName()));
        return status;
    }
}
