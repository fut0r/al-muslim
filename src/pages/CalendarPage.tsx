import ChevronLeftOutlined from '@mui/icons-material/ChevronLeftOutlined';
import ChevronRightOutlined from '@mui/icons-material/ChevronRightOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { Calendar, type CalendarDay, type CalendarKind } from '@/components/Calendar';
import { Directional } from '@/components/icons';
import { PageContent, Section } from '@/components/Page';
import { SegmentedControl } from '@/components/settings';
import { hijriMonthView, hijriToCivil, notableDay, shiftHijriMonth, toHijri, usesUmmAlQura } from '@/domain/hijri';
import { addDays, civilToJdn, sameCivilDate, weekdayOf, type CivilDate } from '@/domain/time';
import { usePageTitle } from '@/hooks/useDeviceFeatures';
import { useNow } from '@/hooks/useNow';
import { useToday } from '@/hooks/usePrayerTimes';
import { useI18n } from '@/i18n';
import { formatGregorian, formatHijri, hijriMonthName } from '@/i18n/format';
import { useSettings } from '@/stores/settings';

function gregorianMonthDays(year: number, month: number, adjustment: number): CalendarDay[] {
  const first: CivilDate = { year, month, day: 1 };
  const next: CivilDate = month === 12 ? { year: year + 1, month: 1, day: 1 } : { year, month: month + 1, day: 1 };
  const length = civilToJdn(next) - civilToJdn(first);
  return Array.from({ length }, (_, index) => {
    const civil = addDays(first, index);
    return { civil, hijri: toHijri(civil, adjustment), weekday: weekdayOf(civil) };
  });
}

export default function CalendarPage() {
  const i18n = useI18n();
  const { t } = i18n;
  const { hijriAdjustment } = useSettings();
  const today = useToday(useNow(60_000));
  const [kind, setKind] = useState<CalendarKind>('hijri');
  // Any date inside the month on screen. Switching calendars keeps this date in view.
  const [anchor, setAnchor] = useState<CivilDate>(today);
  const [selected, setSelected] = useState<CivilDate>(today);
  usePageTitle(t('calendar.title'), t('app.name'));

  const days = useMemo<CalendarDay[]>(() => {
    if (kind === 'gregorian') return gregorianMonthDays(anchor.year, anchor.month, hijriAdjustment);
    const { year, month } = toHijri(anchor, hijriAdjustment);
    return hijriMonthView(year, month, hijriAdjustment).days.map((day) => ({
      civil: day.civil,
      hijri: { year, month, day: day.hijriDay },
      weekday: day.weekday,
    }));
  }, [kind, anchor, hijriAdjustment]);

  const first = days[0]!;
  const last = days[days.length - 1]!;
  const showsToday = days.some((day) => sameCivilDate(day.civil, today));

  const title =
    kind === 'hijri'
      ? `${hijriMonthName(i18n, first.hijri.month)} ${first.hijri.year} ${t('common.hijriEra')}`
      : formatGregorian(i18n, first.civil, 'monthYear');
  const span =
    kind === 'hijri'
      ? `${formatGregorian(i18n, first.civil, 'short')} – ${formatGregorian(i18n, last.civil, 'long')}`
      : `${formatHijri(i18n, first.hijri, first.hijri.year !== last.hijri.year)} – ${formatHijri(i18n, last.hijri)}`;

  const move = (delta: number) => {
    if (kind === 'hijri') {
      const next = shiftHijriMonth(first.hijri.year, first.hijri.month, delta);
      setAnchor(hijriToCivil({ ...next, day: 1 }, hijriAdjustment));
    } else {
      const index = anchor.year * 12 + (anchor.month - 1) + delta;
      setAnchor({ year: Math.floor(index / 12), month: (index % 12) + 1, day: 1 });
    }
  };

  const notable = days.flatMap((day) => {
    const id = notableDay(day.hijri.month, day.hijri.day);
    return id ? [{ id, day }] : [];
  });
  const selectedHijri = toHijri(selected, hijriAdjustment);

  return (
    <>
      <AppHeader title={t('calendar.title')} />
      <PageContent>
        <SegmentedControl<CalendarKind>
          label={t('calendar.view')}
          value={kind}
          onChange={setKind}
          options={[
            { value: 'hijri', label: t('calendar.hijri') },
            { value: 'gregorian', label: t('calendar.gregorian') },
          ]}
        />

        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mx: -1, mb: 1 }}>
            <IconButton onClick={() => move(-1)} aria-label={t('calendar.previousMonth')}>
              <Directional>
                <ChevronLeftOutlined />
              </Directional>
            </IconButton>
            <Box sx={{ flex: 1, minWidth: 0, textAlign: 'center' }} aria-live="polite">
              <Typography variant="h2" component="h2">
                {title}
              </Typography>
              <Typography variant="body2" color="textSecondary" component="p">
                {span}
              </Typography>
            </Box>
            <IconButton onClick={() => move(1)} aria-label={t('calendar.nextMonth')}>
              <Directional>
                <ChevronRightOutlined />
              </Directional>
            </IconButton>
          </Box>

          <Calendar days={days} kind={kind} today={today} selected={selected} onSelect={setSelected} />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box aria-live="polite" sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" component="p">
              {formatHijri(i18n, selectedHijri)}
            </Typography>
            <Typography variant="body2" color="textSecondary" component="p">
              {formatGregorian(i18n, selected, 'full')}
            </Typography>
          </Box>
          {(!showsToday || !sameCivilDate(selected, today)) && (
            <Button
              variant="outlined"
              onClick={() => {
                setAnchor(today);
                setSelected(today);
              }}
            >
              {t('calendar.backToToday')}
            </Button>
          )}
        </Box>

        {notable.length > 0 && (
          <Section title={t('calendar.notable')}>
            <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {notable.map(({ id, day }) => (
                <Box component="li" key={id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                  <Typography variant="subtitle1" component="span">
                    {t(`calendar.events.${id}`)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" component="span">
                    {formatHijri(i18n, day.hijri, false)} · {formatGregorian(i18n, day.civil, 'long')}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Section>
        )}

        <Typography variant="body2" color="textSecondary">
          {usesUmmAlQura ? t('calendar.estimateNote') : t('calendar.estimateNoteTabular')}
        </Typography>
      </PageContent>
    </>
  );
}
