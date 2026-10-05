package io.github.fut0r.almuslim.widgets;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Typeface;
import android.os.Build;
import android.os.SystemClock;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.StyleSpan;
import android.view.View;
import android.widget.RemoteViews;
import io.github.fut0r.almuslim.MainActivity;
import io.github.fut0r.almuslim.R;
import java.util.Calendar;

/**
 * Draws both home screen widgets from the stored schedule and arranges for
 * them to be redrawn when the next prayer begins or the day changes.
 */
final class WidgetRenderer {

    static final String ACTION_REFRESH = "io.github.fut0r.almuslim.widgets.REFRESH";

    private static final int[] ROW_IDS = {
        R.id.widget_row_0, R.id.widget_row_1, R.id.widget_row_2, R.id.widget_row_3, R.id.widget_row_4, R.id.widget_row_5
    };
    private static final int[] NAME_IDS = {
        R.id.widget_name_0, R.id.widget_name_1, R.id.widget_name_2, R.id.widget_name_3, R.id.widget_name_4, R.id.widget_name_5
    };
    private static final int[] TIME_IDS = {
        R.id.widget_time_0, R.id.widget_time_1, R.id.widget_time_2, R.id.widget_time_3, R.id.widget_time_4, R.id.widget_time_5
    };

    private WidgetRenderer() {}

    static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        if (manager == null) return;

        long now = System.currentTimeMillis();
        String json = WidgetStore.load(context);
        WidgetData data = json == null ? null : WidgetData.parse(json);

        int[] nextIds = manager.getAppWidgetIds(new ComponentName(context, NextPrayerWidget.class));
        if (nextIds.length > 0) manager.updateAppWidget(nextIds, nextPrayerViews(context, data, now));

        int[] timesIds = manager.getAppWidgetIds(new ComponentName(context, PrayerTimesWidget.class));
        if (timesIds.length > 0) manager.updateAppWidget(timesIds, prayerTimesViews(context, data, now));

        scheduleRefresh(context, nextIds.length + timesIds.length > 0 ? data : null, now);
    }

    private static RemoteViews nextPrayerViews(Context context, WidgetData data, long now) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_next_prayer);
        views.setOnClickPendingIntent(android.R.id.background, launchApp(context));

        WidgetData.Prayer next = data == null ? null : data.nextPrayer(now);
        if (data == null || data.message != null || next == null) {
            showMessage(context, views, data);
            return views;
        }

        applyDirection(views, data);
        views.setViewVisibility(R.id.widget_content, View.VISIBLE);
        views.setViewVisibility(R.id.widget_message, View.GONE);
        if (data.labelNextPrayer != null) views.setTextViewText(R.id.widget_label, data.labelNextPrayer);
        views.setTextViewText(R.id.widget_prayer_name, next.name);
        views.setTextViewText(R.id.widget_prayer_time, next.time);
        views.setTextViewText(R.id.widget_location, data.location == null ? "" : data.location);

        // The system keeps this countdown ticking; the widget itself is not redrawn every second.
        long base = SystemClock.elapsedRealtime() + (next.at - now);
        views.setChronometerCountDown(R.id.widget_countdown, true);
        views.setChronometer(R.id.widget_countdown, base, null, true);
        return views;
    }

    private static RemoteViews prayerTimesViews(Context context, WidgetData data, long now) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_prayer_times);
        views.setOnClickPendingIntent(android.R.id.background, launchApp(context));

        WidgetData.Day today = data == null ? null : data.today(now);
        if (data == null || data.message != null || today == null) {
            showMessage(context, views, data);
            return views;
        }

        applyDirection(views, data);
        views.setViewVisibility(R.id.widget_content, View.VISIBLE);
        views.setViewVisibility(R.id.widget_message, View.GONE);
        if (data.labelToday != null) views.setTextViewText(R.id.widget_label, data.labelToday);
        views.setTextViewText(R.id.widget_date, today.hijri == null ? "" : today.hijri);

        WidgetData.Prayer next = data.nextPrayer(now);
        int primary = context.getColor(R.color.widget_text);
        int secondary = context.getColor(R.color.widget_text_secondary);
        int brand = context.getColor(R.color.brand);

        for (int i = 0; i < ROW_IDS.length; i++) {
            if (i >= today.prayers.size()) {
                views.setViewVisibility(ROW_IDS[i], View.GONE);
                continue;
            }
            WidgetData.Prayer prayer = today.prayers.get(i);
            boolean isNext = next != null && next.at == prayer.at;
            boolean muted = "sunrise".equals(prayer.id) || prayer.at <= now;
            int color = isNext ? brand : muted ? secondary : primary;

            views.setViewVisibility(ROW_IDS[i], View.VISIBLE);
            // The next prayer is set apart by weight and a tinted row, not by colour alone.
            views.setInt(ROW_IDS[i], "setBackgroundResource", isNext ? R.drawable.widget_row_highlight : 0);
            views.setTextViewText(NAME_IDS[i], isNext ? bold(prayer.name) : prayer.name);
            views.setTextViewText(TIME_IDS[i], isNext ? bold(prayer.time) : prayer.time);
            views.setTextColor(NAME_IDS[i], color);
            views.setTextColor(TIME_IDS[i], color);
        }
        return views;
    }

    private static void showMessage(Context context, RemoteViews views, WidgetData data) {
        String message = context.getString(R.string.widget_open_app);
        if (data != null) {
            applyDirection(views, data);
            if (data.message != null) message = data.message;
            else if (data.labelOpen != null) message = data.labelOpen;
        }
        views.setViewVisibility(R.id.widget_content, View.GONE);
        views.setViewVisibility(R.id.widget_message, View.VISIBLE);
        views.setTextViewText(R.id.widget_message, message);
    }

    /** The app's language can differ from the system's, so the direction comes from the app. */
    private static void applyDirection(RemoteViews views, WidgetData data) {
        views.setInt(
            android.R.id.background,
            "setLayoutDirection",
            data.rtl ? View.LAYOUT_DIRECTION_RTL : View.LAYOUT_DIRECTION_LTR
        );
    }

    private static CharSequence bold(String text) {
        SpannableString styled = new SpannableString(text == null ? "" : text);
        styled.setSpan(new StyleSpan(Typeface.BOLD), 0, styled.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        return styled;
    }

    private static PendingIntent launchApp(Context context) {
        Intent intent = new Intent(context, MainActivity.class)
            .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private static PendingIntent refreshBroadcast(Context context) {
        Intent intent = new Intent(context, NextPrayerWidget.class).setAction(ACTION_REFRESH);
        return PendingIntent.getBroadcast(
            context,
            1,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    /**
     * Wakes the widgets at the next moment their content changes: when the next
     * prayer begins, or at midnight. Passing null data cancels the alarm.
     */
    private static void scheduleRefresh(Context context, WidgetData data, long now) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return;

        PendingIntent refresh = refreshBroadcast(context);
        alarms.cancel(refresh);
        if (data == null) return;

        Calendar midnight = Calendar.getInstance(data.zone());
        midnight.setTimeInMillis(now);
        midnight.add(Calendar.DAY_OF_YEAR, 1);
        midnight.set(Calendar.HOUR_OF_DAY, 0);
        midnight.set(Calendar.MINUTE, 0);
        midnight.set(Calendar.SECOND, 0);
        midnight.set(Calendar.MILLISECOND, 0);

        long trigger = midnight.getTimeInMillis();
        WidgetData.Prayer next = data.nextPrayer(now);
        if (next != null && next.at < trigger) trigger = next.at;
        trigger += 1000;

        try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarms.canScheduleExactAlarms()) {
                alarms.setExactAndAllowWhileIdle(AlarmManager.RTC, trigger, refresh);
            } else {
                // Exact alarms are not allowed: a short delay is acceptable, and the
                // periodic system update is a second safety net.
                alarms.setAndAllowWhileIdle(AlarmManager.RTC, trigger, refresh);
            }
        } catch (SecurityException error) {
            alarms.set(AlarmManager.RTC, trigger, refresh);
        }
    }
}
