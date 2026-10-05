package io.github.fut0r.almuslim.widgets;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * The schedule the widgets display. It is produced by the web app (see
 * src/services/widgets.ts), which calculates the prayer times and formats every
 * label in the user's language, so nothing is calculated or translated here.
 */
final class WidgetData {

    static final class Prayer {
        String id;
        String name;
        String time;
        long at;
    }

    static final class Day {
        String date;
        String hijri;
        final List<Prayer> prayers = new ArrayList<>();
    }

    boolean rtl;
    String timeZone;
    String location;
    String message;
    String labelNextPrayer;
    String labelToday;
    String labelOpen;
    final List<Day> days = new ArrayList<>();

    private WidgetData() {}

    /** Returns null when the stored data cannot be read. */
    static WidgetData parse(String json) {
        try {
            JSONObject root = new JSONObject(json);
            WidgetData data = new WidgetData();
            data.rtl = root.optBoolean("rtl", false);
            data.timeZone = text(root, "timeZone");
            data.location = text(root, "location");
            data.message = text(root, "message");

            JSONObject labels = root.optJSONObject("labels");
            if (labels != null) {
                data.labelNextPrayer = text(labels, "nextPrayer");
                data.labelToday = text(labels, "today");
                data.labelOpen = text(labels, "open");
            }

            JSONArray days = root.optJSONArray("days");
            for (int i = 0; days != null && i < days.length(); i++) {
                JSONObject source = days.getJSONObject(i);
                Day day = new Day();
                day.date = text(source, "date");
                day.hijri = text(source, "hijri");
                JSONArray prayers = source.optJSONArray("prayers");
                for (int j = 0; prayers != null && j < prayers.length(); j++) {
                    JSONObject item = prayers.getJSONObject(j);
                    Prayer prayer = new Prayer();
                    prayer.id = text(item, "id");
                    prayer.name = text(item, "name");
                    prayer.time = text(item, "time");
                    prayer.at = item.getLong("at");
                    day.prayers.add(prayer);
                }
                data.days.add(day);
            }
            return data;
        } catch (JSONException error) {
            return null;
        }
    }

    private static String text(JSONObject object, String key) {
        return object.isNull(key) ? null : object.optString(key, null);
    }

    TimeZone zone() {
        return timeZone == null ? TimeZone.getDefault() : TimeZone.getTimeZone(timeZone);
    }

    /** The entry for the current civil day at the user's location, or null if the data is out of date. */
    Day today(long now) {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        format.setTimeZone(zone());
        String key = format.format(new Date(now));
        for (Day day : days) {
            if (key.equals(day.date)) return day;
        }
        return null;
    }

    /** The next obligatory prayer after `now` (sunrise is only a time marker), or null. */
    Prayer nextPrayer(long now) {
        for (Day day : days) {
            for (Prayer prayer : day.prayers) {
                if (prayer.at > now && !"sunrise".equals(prayer.id)) return prayer;
            }
        }
        return null;
    }
}
