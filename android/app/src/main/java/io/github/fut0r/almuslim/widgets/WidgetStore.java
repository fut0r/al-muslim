package io.github.fut0r.almuslim.widgets;

import android.content.Context;

/** Keeps the latest prayer schedule handed over by the app, for the widgets to read. */
final class WidgetStore {

    private static final String PREFERENCES = "prayer_widgets";
    private static final String KEY_DATA = "data";

    private WidgetStore() {}

    static void save(Context context, String json) {
        context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).edit().putString(KEY_DATA, json).apply();
    }

    static String load(Context context) {
        return context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).getString(KEY_DATA, null);
    }
}
