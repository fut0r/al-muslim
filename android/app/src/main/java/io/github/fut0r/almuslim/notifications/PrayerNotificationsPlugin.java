package io.github.fut0r.almuslim.notifications;

import android.Manifest;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Bridge between the web app and the prayer notifications. The app asks for
 * the permission here, hands over the notifications to schedule, and reads
 * back what the system actually has, so it can tell the user plainly when
 * something stands in the way.
 */
@CapacitorPlugin(
    name = "PrayerNotifications",
    permissions = { @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = PrayerNotificationsPlugin.NOTIFICATIONS) }
)
public class PrayerNotificationsPlugin extends Plugin {

    static final String NOTIFICATIONS = "notifications";

    private static final long TEST_DELAY_MS = 5000;

    /**
     * "granted", "prompt" (the system will still ask) or "denied" (only the
     * system settings can allow them now), with the rest of the state.
     */
    private JSObject state() throws JSONException {
        Context context = getContext();
        JSObject state = JSObject.fromJSONObject(PrayerAlarms.status(context));
        String permission;
        if (PrayerAlarms.notificationsAllowed(context)) {
            permission = "granted";
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && getPermissionState(NOTIFICATIONS) != PermissionState.DENIED) {
            permission = "prompt";
        } else {
            permission = "denied";
        }
        state.put("permission", permission);
        return state;
    }

    private void resolveWithState(PluginCall call) {
        try {
            call.resolve(state());
        } catch (JSONException | RuntimeException error) {
            call.reject("Notification state unavailable: " + error.getMessage());
        }
    }

    @PluginMethod
    public void status(PluginCall call) {
        resolveWithState(call);
    }

    /** Shows the system's permission prompt when there is one to show (Android 13 and later). */
    @PluginMethod
    public void requestPermission(PluginCall call) {
        boolean canAsk =
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            !PrayerAlarms.notificationsAllowed(getContext()) &&
            getPermissionState(NOTIFICATIONS) != PermissionState.GRANTED;
        if (canAsk) {
            requestPermissionForAlias(NOTIFICATIONS, call, "permissionAnswered");
        } else {
            resolveWithState(call);
        }
    }

    @PermissionCallback
    private void permissionAnswered(PluginCall call) {
        resolveWithState(call);
    }

    @PluginMethod
    public void schedule(PluginCall call) {
        JSObject channel = call.getObject("channel");
        JSArray items = call.getArray("items");
        if (channel == null || items == null) {
            call.reject("Missing channel or items");
            return;
        }
        try {
            JSONObject schedule = new JSONObject();
            schedule.put("channel", channel);
            schedule.put("items", items);
            int scheduled = PrayerAlarms.replace(getContext(), schedule);
            JSObject result = new JSObject();
            result.put("scheduled", scheduled);
            result.put("exact", PrayerAlarms.exactAllowed(getContext()));
            call.resolve(result);
        } catch (JSONException | RuntimeException error) {
            PrayerAlarms.rememberError(getContext(), "Schedule failed: " + error.getMessage());
            call.reject("Schedule failed: " + error.getMessage());
        }
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        PrayerAlarms.clear(getContext());
        call.resolve();
    }

    /** One notification in a few seconds, through the very path a prayer time takes. */
    @PluginMethod
    public void test(PluginCall call) {
        JSObject channel = call.getObject("channel");
        if (channel == null) {
            call.reject("Missing channel");
            return;
        }
        boolean set = PrayerAlarms.test(getContext(), channel, call.getString("title", ""), call.getString("body", ""), TEST_DELAY_MS);
        if (set) call.resolve();
        else call.reject("The test alarm could not be set");
    }

    /** The system screen where notifications for this app are switched on. */
    @PluginMethod
    public void openSettings(PluginCall call) {
        Context context = getContext();
        Intent intent;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.getPackageName());
        } else {
            intent = appDetails(context);
        }
        open(call, intent, appDetails(context));
    }

    /** Android 12 only: the "Alarms & reminders" switch. Later versions grant it at install. */
    @PluginMethod
    public void openExactAlarmSettings(PluginCall call) {
        Context context = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + context.getPackageName()));
            open(call, intent, appDetails(context));
        } else {
            call.resolve();
        }
    }

    /**
     * Asks the system to let the app run in the background. Without it some
     * phones stop the app's alarms once it has been closed for a while.
     */
    @PluginMethod
    public void openBatterySettings(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + context.getPackageName()));
        open(call, intent, appDetails(context));
    }

    private static Intent appDetails(Context context) {
        return new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", context.getPackageName(), null));
    }

    private void open(PluginCall call, Intent intent, Intent fallback) {
        Context context = getContext();
        try {
            context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            call.resolve();
        } catch (ActivityNotFoundException | SecurityException first) {
            try {
                context.startActivity(fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                call.resolve();
            } catch (ActivityNotFoundException | SecurityException second) {
                call.reject("Settings are not available on this device");
            }
        }
    }
}
