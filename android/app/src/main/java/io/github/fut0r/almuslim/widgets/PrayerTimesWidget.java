package io.github.fut0r.almuslim.widgets;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;

/** Larger widget: today's six times with the next prayer set apart. */
public class PrayerTimesWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        WidgetRenderer.updateAll(context);
    }

    @Override
    public void onDisabled(Context context) {
        WidgetRenderer.updateAll(context);
    }
}
