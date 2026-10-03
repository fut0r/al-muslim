import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { toCountdown, type PrayerStatus } from '@/domain/prayer/schedule';
import { PRAYER_IDS, type DayTimes, type PrayerId } from '@/domain/prayer/types';
import { useNow } from '@/hooks/useNow';
import { useI18n } from '@/i18n';
import { formatTime } from '@/i18n/format';
import { useSettings } from '@/stores/settings';

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * Time left until `target`, ticking every second. Only this element
 * re-renders each second; the rest of the screen stays still.
 */
export function Countdown({ target, label }: { target: Date; label: string }) {
  const now = useNow(1000);
  const { hours, minutes, seconds } = toCountdown(target.getTime() - now.getTime());
  const text = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return (
    <Box
      role="timer"
      aria-label={`${label}: ${text}`}
      dir="ltr"
      sx={{
        display: 'inline-flex',
        fontFamily: (theme) => theme.app.fonts.display,
        fontSize: 'clamp(3.5rem, 19vw, 6rem)',
        lineHeight: 1,
        color: 'text.primary',
      }}
    >
      {/* Fixed-width cells keep the digits from shifting as they change. */}
      {Array.from(text, (character, index) => (
        <Box
          key={index}
          component="span"
          aria-hidden
          sx={{ display: 'inline-block', textAlign: 'center', width: character === ':' ? '0.3em' : '0.5em' }}
        >
          {character}
        </Box>
      ))}
    </Box>
  );
}

/** The next prayer, the time left until it, and what time it is now. */
export function PrayerCard({
  status,
  timeZone,
}: {
  status: PrayerStatus;
  timeZone: string | undefined;
}) {
  const i18n = useI18n();
  const { t } = i18n;
  const { hour12 } = useSettings();
  const nextName = t(`prayers.${status.next.id}`);

  return (
    <Box component="section" aria-label={t('home.nextPrayer')}>
      <Typography variant="overline" component="h2" color="textSecondary">
        {t('home.nextPrayer')}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 2, mt: 0.5 }}>
        <Typography variant="h1" component="p" color="primary">
          {nextName}
        </Typography>
        <Typography variant="subtitle1" component="p" color="textSecondary" sx={{ whiteSpace: 'nowrap' }}>
          {formatTime(i18n, status.next.time, { hour12, timeZone })}
        </Typography>
      </Box>
      <Box sx={{ mt: 1.5, mb: 2, display: 'flex', justifyContent: 'flex-start' }}>
        <Countdown target={status.next.time} label={t('home.remaining', { prayer: nextName })} />
      </Box>
      <LinearProgress variant="determinate" value={Math.round(status.progress * 100)} aria-hidden />
      <Typography variant="body2" color="textSecondary" sx={{ mt: 1.25 }}>
        {status.current
          ? t('home.currentPrayer', { prayer: t(`prayers.${status.current}`) })
          : t('home.noCurrentPrayer')}
      </Typography>
    </Box>
  );
}

export type PrayerRowState = 'past' | 'current' | 'next' | 'upcoming';

/** One line of the timetable. State is conveyed by a text tag, not colour alone. */
export function PrayerTimeRow({
  id,
  time,
  timeZone,
  state = 'upcoming',
}: {
  id: PrayerId;
  time: Date;
  timeZone: string | undefined;
  state?: PrayerRowState;
}) {
  const i18n = useI18n();
  const { hour12 } = useSettings();
  const highlighted = state === 'next';
  const tag = state === 'next' ? i18n.t('home.next') : state === 'current' ? i18n.t('home.now') : null;
  const muted = state === 'past' || id === 'sunrise';

  return (
    <Box
      component="li"
      aria-current={state === 'current' ? 'time' : undefined}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        minHeight: 52,
        px: 2,
        borderRadius: 1,
        bgcolor: highlighted ? 'action.selected' : 'transparent',
        color: muted ? 'text.secondary' : 'text.primary',
      }}
    >
      <Typography variant="subtitle1" component="span" sx={{ fontWeight: highlighted ? 600 : 500 }}>
        {i18n.t(`prayers.${id}`)}
      </Typography>
      {tag && (
        <Typography
          variant="caption"
          component="span"
          sx={{
            px: 1,
            border: 1,
            borderColor: 'primary.main',
            color: 'primary.main',
            borderRadius: 99,
            fontFamily: (theme) => theme.app.fonts.heading,
            fontWeight: 500,
            lineHeight: 1.7,
          }}
        >
          {tag}
        </Typography>
      )}
      <Typography
        variant="subtitle1"
        component="span"
        sx={{ marginInlineStart: 'auto', fontWeight: highlighted ? 600 : 500, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}
      >
        {formatTime(i18n, time, { hour12, timeZone })}
      </Typography>
    </Box>
  );
}

/** The six times of a day. Pass `status` only when the day shown is today. */
export function PrayerTimesList({
  times,
  timeZone,
  status,
  now,
}: {
  times: DayTimes;
  timeZone: string | undefined;
  status?: PrayerStatus;
  now?: Date;
}) {
  const rowState = (id: PrayerId): PrayerRowState => {
    if (!status || !now) return 'upcoming';
    // "Next" may be tomorrow's Fajr, in which case nothing in today's list is next.
    if (status.next.id === id && status.next.time.getTime() === times[id].getTime()) return 'next';
    if (status.current === id && times[id].getTime() <= now.getTime()) return 'current';
    return times[id].getTime() <= now.getTime() ? 'past' : 'upcoming';
  };

  return (
    <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
      {PRAYER_IDS.map((id) => (
        <PrayerTimeRow key={id} id={id} time={times[id]} timeZone={timeZone} state={rowState(id)} />
      ))}
    </Box>
  );
}
