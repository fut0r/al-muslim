import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import { notableDay, type HijriDate } from '@/domain/hijri';
import { sameCivilDate, type CivilDate } from '@/domain/time';
import { useI18n } from '@/i18n';
import { formatGregorian, formatHijri, formatWeekday } from '@/i18n/format';

export interface CalendarDay {
  civil: CivilDate;
  hijri: HijriDate;
  /** 0 = Sunday … 6 = Saturday. */
  weekday: number;
}

export type CalendarKind = 'hijri' | 'gregorian';

// 1 January 2023 was a Sunday; used only to generate weekday names.
const A_SUNDAY: CivilDate = { year: 2023, month: 1, day: 1 };

interface CalendarProps {
  days: CalendarDay[];
  /** Which calendar the month belongs to; its day numbers are shown larger. */
  kind: CalendarKind;
  today: CivilDate;
  selected: CivilDate;
  onSelect(date: CivilDate): void;
}

/** A month grid showing every day in both calendars. */
export function Calendar({ days, kind, today, selected, onSelect }: CalendarProps) {
  const i18n = useI18n();
  const leading = days[0]?.weekday ?? 0;
  // Arabic weekday names are long, so the narrow form is used there.
  const width = i18n.language === 'ar' ? 'narrow' : 'short';

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', rowGap: 0.5 }}>
      {Array.from({ length: 7 }, (_, index) => {
        const date = { ...A_SUNDAY, day: A_SUNDAY.day + index };
        return (
          <Typography
            key={index}
            variant="caption"
            component="div"
            color="textSecondary"
            sx={{ textAlign: 'center', py: 0.75, fontFamily: (theme) => theme.app.fonts.heading, fontWeight: 500 }}
          >
            <Box component="abbr" title={formatWeekday(i18n, date, 'long')} sx={{ textDecoration: 'none' }}>
              {formatWeekday(i18n, date, width)}
            </Box>
          </Typography>
        );
      })}

      {Array.from({ length: leading }, (_, index) => (
        <span key={`blank-${index}`} />
      ))}

      {days.map((day) => {
        const isToday = sameCivilDate(day.civil, today);
        const isSelected = sameCivilDate(day.civil, selected);
        const notable = notableDay(day.hijri.month, day.hijri.day);
        const primary = kind === 'hijri' ? day.hijri.day : day.civil.day;
        const secondary = kind === 'hijri' ? day.civil.day : day.hijri.day;
        const label = [
          formatGregorian(i18n, day.civil, 'full'),
          formatHijri(i18n, day.hijri),
          notable ? i18n.t(`calendar.events.${notable}`) : '',
          isToday ? i18n.t('common.today') : '',
        ]
          .filter(Boolean)
          .join('. ');

        return (
          <ButtonBase
            key={`${day.civil.month}-${day.civil.day}`}
            onClick={() => onSelect(day.civil)}
            aria-label={label}
            aria-pressed={isSelected}
            aria-current={isToday ? 'date' : undefined}
            sx={{
              flexDirection: 'column',
              gap: 0.25,
              minHeight: 56,
              py: 0.5,
              borderRadius: 1,
              border: 1,
              borderColor: isSelected ? 'primary.main' : 'transparent',
            }}
          >
            <Box
              component="span"
              sx={{
                display: 'grid',
                placeItems: 'center',
                width: 32,
                height: 32,
                borderRadius: '50%',
                fontFamily: (theme) => theme.app.fonts.heading,
                fontSize: '0.9375rem',
                fontWeight: isToday ? 700 : 500,
                bgcolor: isToday ? 'primary.main' : 'transparent',
                color: isToday ? 'primary.contrastText' : 'text.primary',
              }}
            >
              {primary}
            </Box>
            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.6875rem', color: 'text.secondary', lineHeight: 1 }}>
              {secondary}
              {/* A dot marks notable days in addition to the list below the grid. */}
              {notable && <Box component="span" aria-hidden sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: 'primary.main' }} />}
            </Box>
          </ButtonBase>
        );
      })}
    </Box>
  );
}
