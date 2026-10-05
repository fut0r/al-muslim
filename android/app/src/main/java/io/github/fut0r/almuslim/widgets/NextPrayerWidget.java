package io.github.fut0r.almuslim.widgets;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;

/** Small widget: the next prayer, its time and a live countdown. */
public class NextPrayerWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        WidgetRenderer.updateAll(context);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        // Our own alarm, set by WidgetRenderer for the next prayer time or midnight.
        if (WidgetRenderer.ACTION_REFRESH.equals(intent.getAction())) {
            WidgetRenderer.updateAll(context);
        }
    }

    @Override
    public void onDisabled(Context context) {
        WidgetRenderer.updateAll(context);
    }
}
