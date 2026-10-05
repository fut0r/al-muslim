package io.github.fut0r.almuslim.widgets;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Bridge between the web app and the home screen widgets. The app pushes its
 * prayer schedule here whenever it changes; the widgets only display it.
 */
@CapacitorPlugin(name = "PrayerWidgets")
public class PrayerWidgetsPlugin extends Plugin {

    @PluginMethod
    public void update(PluginCall call) {
        String data = call.getString("data");
        if (data == null) {
            call.reject("Missing widget data");
            return;
        }
        Context context = getContext();
        WidgetStore.save(context, data);
        WidgetRenderer.updateAll(context);
        call.resolve();
    }

    /** Asks the launcher to add a widget. Not every launcher supports this. */
    @PluginMethod
    public void pin(PluginCall call) {
        Context context = getContext();
        Class<?> provider = "times".equals(call.getString("widget"))
            ? PrayerTimesWidget.class
            : NextPrayerWidget.class;

        boolean requested = false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            if (manager != null && manager.isRequestPinAppWidgetSupported()) {
                requested = manager.requestPinAppWidget(new ComponentName(context, provider), null, null);
            }
        }

        JSObject result = new JSObject();
        result.put("supported", requested);
        call.resolve(result);
    }
}
