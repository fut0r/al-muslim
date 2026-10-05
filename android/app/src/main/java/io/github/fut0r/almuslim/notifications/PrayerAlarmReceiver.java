package io.github.fut0r.almuslim.notifications;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Receives the alarm of each prayer time and shows its notification. It also
 * sets the alarms again after the phone restarts or the app is updated, both
 * of which make the system forget them.
 */
public class PrayerAlarmReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent == null ? null : intent.getAction();
        if (action == null) return;
        try {
            if (PrayerAlarms.ACTION_FIRE.equals(action)) {
                PrayerAlarms.show(context, intent.getIntExtra(PrayerAlarms.EXTRA_ID, 0));
            } else {
                // Restart, app update, or the exact alarm setting changed.
                PrayerAlarms.arm(context);
            }
        } catch (RuntimeException error) {
            PrayerAlarms.rememberError(context, action + ": " + error.getMessage());
        }
    }
}
