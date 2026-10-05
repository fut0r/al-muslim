import { Capacitor, registerPlugin } from '@capacitor/core';
import { toHijri } from '@/domain/hijri';
import { calculateDayTimes } from '@/domain/prayer/calculate';
import type { CalculationMethodId } from '@/domain/prayer/methods';
import { PRAYER_IDS, type Coordinates, type Madhab, type PrayerId } from '@/domain/prayer/types';
import { addDays, civilDateInZone, civilDateKey } from '@/domain/time';
import type { I18n } from '@/i18n';
import { formatHijri, formatTime } from '@/i18n/format';

export type WidgetKind = 'next' | 'times';

export interface WidgetPrayer {
  id: PrayerId;
  name: string;
  /** Epoch milliseconds, for ordering and the live countdown. */
  at: number;
  /** Clock time, already formatted for display. */
  time: string;
}

export interface WidgetDay {
  /** Civil date at the user's location, YYYY-MM-DD. */
  date: string;
  hijri: string;
  prayers: WidgetPrayer[];
}

/**
 * Everything the Android home screen widgets show. The widgets calculate and
 * translate nothing themselves: the schedule is worked out here, with the same
 * code as the rest of the app, and handed over ready to display.
 */
export interface WidgetPayload {
  version: 1;
  rtl: boolean;
  /** IANA zone of the location, or null to use the device zone. */
  timeZone: string | null;
  location: string;
  labels: { nextPrayer: string; today: string; open: string };
  /** Shown instead of prayer times when there is nothing to show (no location yet). */
  message: string | null;
  days: WidgetDay[];
}

export interface WidgetPayloadInput {
  i18n: I18n;
  now: Date;
  location: (Coordinates & { timeZone?: string }) | null;
  locationLabel: string;
  method: CalculationMethodId;
  madhab: Madhab;
  hour12: boolean;
  hijriAdjustment: number;
}

/** How far ahead the widgets can run without the app being opened. */
export const WIDGET_HORIZON_DAYS = 30;

export function buildWidgetPayload(input: WidgetPayloadInput): WidgetPayload {
  const { i18n, now, location, method, madhab, hour12, hijriAdjustment } = input;
  const payload: WidgetPayload = {
    version: 1,
    rtl: i18n.direction === 'rtl',
    timeZone: location?.timeZone ?? null,
    location: input.locationLabel,
    labels: {
      nextPrayer: i18n.t('home.nextPrayer'),
      today: i18n.t('home.todaysTimes'),
      open: i18n.t('widgets.openApp'),
    },
    message: location ? null : i18n.t('widgets.setLocation'),
    days: [],
  };
  if (!location) return payload;

  const start = civilDateInZone(now, location.timeZone);
  for (let offset = 0; offset < WIDGET_HORIZON_DAYS; offset += 1) {
    const date = addDays(start, offset);
    const times = calculateDayTimes({ date, coordinates: location, method, madhab });
    if (!times) continue;
    payload.days.push({
      date: civilDateKey(date),
      hijri: formatHijri(i18n, toHijri(date, hijriAdjustment)),
      prayers: PRAYER_IDS.map((id) => ({
        id,
        name: i18n.t(`prayers.${id}`),
        at: times[id].getTime(),
        time: formatTime(i18n, times[id], { hour12, timeZone: location.timeZone }),
      })),
    });
  }
  if (payload.days.length === 0) payload.message = i18n.t('home.timesUnavailableTitle');
  return payload;
}

interface PrayerWidgetsPlugin {
  update(options: { data: string }): Promise<void>;
  pin(options: { widget: WidgetKind }): Promise<{ supported: boolean }>;
}

const PrayerWidgets = registerPlugin<PrayerWidgetsPlugin>('PrayerWidgets');

/** Home screen widgets exist in the Android app only. */
export const widgetsSupported = Capacitor.getPlatform() === 'android';

export async function updateWidgets(payload: WidgetPayload): Promise<void> {
  if (!widgetsSupported) return;
  try {
    await PrayerWidgets.update({ data: JSON.stringify(payload) });
  } catch {
    // Widgets are an extra; a failed update must never disturb the app.
  }
}

/** Asks the launcher to place a widget. Resolves to false when the launcher cannot do that. */
export async function pinWidget(widget: WidgetKind): Promise<boolean> {
  if (!widgetsSupported) return false;
  try {
    return (await PrayerWidgets.pin({ widget })).supported;
  } catch {
    return false;
  }
}
