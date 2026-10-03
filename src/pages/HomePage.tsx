import ChevronRightOutlined from '@mui/icons-material/ChevronRightOutlined';
import ExploreOutlined from '@mui/icons-material/ExploreOutlined';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Directional, LogoMark, TasbihIcon } from '@/components/icons';
import { LocationDialog, locationLabel } from '@/components/LocationDialog';
import { PageContent, Section, Surface } from '@/components/Page';
import { PrayerCard, PrayerTimesList } from '@/components/prayer';
import { EmptyState, ErrorState } from '@/components/states';
import type { AdhkarCategoryId } from '@/data/adhkar';
import { toHijri } from '@/domain/hijri';
import type { PrayerStatus } from '@/domain/prayer/schedule';
import { compassPoint, qiblaBearing } from '@/domain/qibla';
import { usePageTitle } from '@/hooks/useDeviceFeatures';
import { useLivePrayerState, useToday } from '@/hooks/usePrayerTimes';
import { useI18n } from '@/i18n';
import { formatGregorian, formatHijri } from '@/i18n/format';
import { getSurah } from '@/services/quranRepository';
import { useSavedLocation } from '@/stores/location';
import { useQuranState } from '@/stores/quran';
import { useSettings } from '@/stores/settings';
import { LAYOUT, SAFE_AREA, gutter } from '@/theme/tokens';

/** Which adhkar fit the current part of the day. */
function suggestedAdhkar(status: PrayerStatus | null, now: Date): AdhkarCategoryId {
  if (status) {
    if (status.current === 'isha') return 'sleep';
    if (status.current === 'asr' || status.current === 'maghrib') return 'evening';
    if (status.current === 'fajr' || status.current === null) return 'morning';
    return 'general';
  }
  const hour = now.getHours();
  if (hour >= 4 && hour < 12) return 'morning';
  if (hour >= 15 && hour < 20) return 'evening';
  if (hour >= 20 || hour < 4) return 'sleep';
  return 'general';
}

function Shortcut({ to, icon, title, detail }: { to: string; icon: ReactNode; title: string; detail: string }) {
  return (
    <ButtonBase
      component={Link}
      to={to}
      sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', minHeight: 68, px: 2, py: 1.25, textAlign: 'start' }}
    >
      <Box aria-hidden sx={{ display: 'flex', color: 'primary.main' }}>
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle1" component="span" sx={{ display: 'block' }}>
          {title}
        </Typography>
        <Typography variant="body2" color="textSecondary" component="span" noWrap sx={{ display: 'block' }}>
          {detail}
        </Typography>
      </Box>
      <Box aria-hidden sx={{ display: 'flex', color: 'text.disabled' }}>
        <Directional>
          <ChevronRightOutlined />
        </Directional>
      </Box>
    </ButtonBase>
  );
}

export default function HomePage() {
  const i18n = useI18n();
  const { t } = i18n;
  const { hijriAdjustment } = useSettings();
  const location = useSavedLocation();
  const { lastRead } = useQuranState();
  const { now, state } = useLivePrayerState();
  const today = useToday(now);
  const [locationOpen, setLocationOpen] = useState(false);
  usePageTitle(t('nav.home'), t('app.name'));

  const status = state.kind === 'ready' ? state.status : null;
  const lastSurah = lastRead ? getSurah(lastRead.surah) : undefined;
  const surahName = lastSurah ? (i18n.language === 'ar' ? lastSurah.name : lastSurah.englishName) : '';
  const bearing = location ? qiblaBearing(location) : null;
  const adhkarCategory = suggestedAdhkar(status, now);

  return (
    <>
      <Box
        component="header"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 'appBar',
          bgcolor: 'background.default',
          pt: SAFE_AREA.top,
        }}
      >
        <Box
          sx={{
            mx: 'auto',
            maxWidth: LAYOUT.contentMaxWidth,
            minHeight: LAYOUT.headerHeight,
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            pl: gutter(16),
            pr: gutter(4),
          }}
        >
          <Box sx={{ color: 'primary.main', display: { xs: 'flex', md: 'none' } }}>
            <LogoMark size={28} />
          </Box>
          <Typography variant="h2" component="h1" sx={{ flex: 1 }}>
            {t('app.name')}
          </Typography>
          <IconButton component={Link} to="/settings" aria-label={t('nav.settings')} color="inherit">
            <SettingsOutlined />
          </IconButton>
        </Box>
      </Box>

      <PageContent gap={3.5}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
          <ButtonBase
            component={Link}
            to="/calendar"
            aria-label={`${formatGregorian(i18n, today, 'full')}. ${formatHijri(i18n, toHijri(today, hijriAdjustment))}. ${t('home.openCalendar')}`}
            sx={{ display: 'block', textAlign: 'start', borderRadius: 1, py: 0.5, mx: -0.5, px: 0.5 }}
          >
            <Typography variant="subtitle1" component="span" sx={{ display: 'block' }}>
              {formatHijri(i18n, toHijri(today, hijriAdjustment))}
            </Typography>
            <Typography variant="body2" color="textSecondary" component="span" sx={{ display: 'block' }}>
              {formatGregorian(i18n, today, 'full')}
            </Typography>
          </ButtonBase>
          <Button
            size="small"
            color="inherit"
            startIcon={<PlaceOutlined />}
            onClick={() => setLocationOpen(true)}
            sx={{ color: 'text.secondary', mx: -1, maxWidth: '100%' }}
          >
            <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {locationLabel(i18n, location)}
            </Box>
          </Button>
        </Box>

        {state.kind === 'ready' ? (
          <>
            <PrayerCard status={state.status} timeZone={state.timeZone} />
            <Section
              title={t('home.todaysTimes')}
              action={
                <Button component={Link} to="/prayers" size="small" sx={{ mx: -1 }}>
                  {t('home.allTimes')}
                </Button>
              }
            >
              <PrayerTimesList times={state.times} timeZone={state.timeZone} status={state.status} now={now} />
            </Section>
          </>
        ) : state.kind === 'no-location' ? (
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
        ) : (
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
        )}

        <Section title={t('home.shortcuts')}>
          <Surface>
            <Shortcut
              to={lastRead ? `/quran/${lastRead.surah}?ayah=${lastRead.ayah}` : '/quran'}
              icon={<MenuBookOutlined />}
              title={t('nav.quran')}
              detail={
                lastRead && lastSurah
                  ? `${t('home.continueReading')}: ${t('quran.ayahRef', { surah: surahName, ayah: lastRead.ayah })}`
                  : t('home.startReading')
              }
            />
            <Divider />
            <Shortcut
              to={`/adhkar/${adhkarCategory}`}
              icon={<TasbihIcon />}
              title={t('nav.adhkar')}
              detail={`${t('adhkar.suggested')}: ${t(`adhkar.categories.${adhkarCategory}`)}`}
            />
            <Divider />
            <Shortcut
              to="/qiblah"
              icon={<ExploreOutlined />}
              title={t('nav.qiblah')}
              detail={
                bearing === null
                  ? t('home.qiblahUnset')
                  : t('home.qiblahDirection', {
                      degrees: Math.round(bearing),
                      direction: t(`qiblah.directions.${compassPoint(bearing)}`),
                    })
              }
            />
          </Surface>
        </Section>
      </PageContent>

      <LocationDialog open={locationOpen} onClose={() => setLocationOpen(false)} />
    </>
  );
}
