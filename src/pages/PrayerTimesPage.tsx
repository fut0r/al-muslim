import ChevronLeftOutlined from '@mui/icons-material/ChevronLeftOutlined';
import ChevronRightOutlined from '@mui/icons-material/ChevronRightOutlined';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { AppHeader } from '@/components/AppHeader';
import { Directional } from '@/components/icons';
import { LocationDialog, locationLabel } from '@/components/LocationDialog';
import { PageContent, Surface } from '@/components/Page';
import { PrayerTimesList } from '@/components/prayer';
import { SettingItem, SettingsSection } from '@/components/settings';
import { EmptyState, ErrorState } from '@/components/states';
import { toHijri } from '@/domain/hijri';
import { addDays, deviceTimeZone } from '@/domain/time';
import { usePageTitle } from '@/hooks/useDeviceFeatures';
import { useDayTimes, useLivePrayerState, useToday } from '@/hooks/usePrayerTimes';
import { useI18n } from '@/i18n';
import { formatGregorian, formatHijri } from '@/i18n/format';
import { useSavedLocation } from '@/stores/location';
import { useSettings } from '@/stores/settings';

export default function PrayerTimesPage() {
  const i18n = useI18n();
  const { t } = i18n;
  const { method, madhab, hijriAdjustment } = useSettings();
  const location = useSavedLocation();
  const { now, state } = useLivePrayerState();
  const today = useToday(now);
  const [offset, setOffset] = useState(0);
  const [locationOpen, setLocationOpen] = useState(false);
  usePageTitle(t('prayerTimes.title'), t('app.name'));

  const date = useMemo(() => addDays(today, offset), [today, offset]);
  const times = useDayTimes(date);
  const isToday = offset === 0;

  return (
    <>
      <AppHeader title={t('prayerTimes.title')} />
      <PageContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mx: -1 }}>
          <IconButton onClick={() => setOffset((value) => value - 1)} aria-label={t('prayerTimes.previousDay')}>
            <Directional>
              <ChevronLeftOutlined />
            </Directional>
          </IconButton>
          <Box sx={{ flex: 1, textAlign: 'center', minWidth: 0 }} aria-live="polite">
            <Typography variant="subtitle1" component="p">
              {isToday ? `${t('common.today')} · ` : ''}
              {formatGregorian(i18n, date, 'full')}
            </Typography>
            <Typography variant="body2" color="textSecondary" component="p">
              {formatHijri(i18n, toHijri(date, hijriAdjustment))}
            </Typography>
          </Box>
          <IconButton onClick={() => setOffset((value) => value + 1)} aria-label={t('prayerTimes.nextDay')}>
            <Directional>
              <ChevronRightOutlined />
            </Directional>
          </IconButton>
        </Box>

        {!isToday && (
          <Button variant="outlined" onClick={() => setOffset(0)} sx={{ alignSelf: 'center', mt: -1.5 }}>
            {t('prayerTimes.backToToday')}
          </Button>
        )}

        {!location ? (
          <Surface>
            <EmptyState
              compact
              icon={<PlaceOutlined />}
              title={t('home.locationNeededTitle')}
              body={t('home.locationNeededBody')}
              actions={
                <Button variant="contained" onClick={() => setLocationOpen(true)}>
                  {t('home.locationNeededTitle')}
                </Button>
              }
            />
          </Surface>
        ) : !times ? (
          <Surface>
            <ErrorState
              compact
              title={t('home.timesUnavailableTitle')}
              body={t('home.timesUnavailableBody')}
              actions={
                <Button variant="outlined" onClick={() => setLocationOpen(true)}>
                  {t('location.chooseCity')}
                </Button>
              }
            />
          </Surface>
        ) : (
          <PrayerTimesList
            times={times}
            timeZone={location.timeZone}
            status={isToday && state.kind === 'ready' ? state.status : undefined}
            now={isToday ? now : undefined}
          />
        )}

        {location && (
          <SettingsSection
            title={t('prayerTimes.details')}
            action={
              <Button component={Link} to="/settings" size="small" sx={{ mx: -1 }}>
                {t('prayerTimes.changeInSettings')}
              </Button>
            }
          >
            <SettingItem label={t('prayerTimes.method')} description={t(`methods.${method}`)} />
              <SettingItem label={t('prayerTimes.madhab')} description={t(`madhab.${madhab}`)} />
              <SettingItem
                label={t('prayerTimes.location')}
                description={locationLabel(i18n, location)}
                onClick={() => setLocationOpen(true)}
              />
              <SettingItem
                label={t('prayerTimes.timeZone')}
                description={location.timeZone ?? deviceTimeZone() ?? t('prayerTimes.deviceTimeZone')}
              />
          </SettingsSection>
        )}
      </PageContent>
      <LocationDialog open={locationOpen} onClose={() => setLocationOpen(false)} />
    </>
  );
}
