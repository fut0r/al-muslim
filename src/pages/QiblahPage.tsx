import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useEffect, useRef, useState } from 'react';
import { visuallyHidden } from '@/components/a11y';
import { AppHeader } from '@/components/AppHeader';
import { LocationDialog } from '@/components/LocationDialog';
import { PageContent, Surface } from '@/components/Page';
import { QiblahCompass } from '@/components/QiblahCompass';
import { EmptyState } from '@/components/states';
import { angleDelta, compassPoint, distanceToKaabaKm, qiblaBearing } from '@/domain/qibla';
import { useCompass } from '@/hooks/useCompass';
import { useKeepAwake, usePageTitle } from '@/hooks/useDeviceFeatures';
import { useI18n } from '@/i18n';
import { formatNumber } from '@/i18n/format';
import { haptic } from '@/services/haptics';
import { useSavedLocation, type SavedLocation } from '@/stores/location';
import { settingsStore } from '@/stores/settings';

/** How close (in degrees) counts as facing the qiblah. */
const ALIGNMENT_TOLERANCE = 3;
/** Within this distance of the Kaaba no bearing is shown. */
const AT_KAABA_KM = 0.3;

export default function QiblahPage() {
  const { t } = useI18n();
  const location = useSavedLocation();
  const [locationOpen, setLocationOpen] = useState(false);
  usePageTitle(t('qiblah.title'), t('app.name'));

  return (
    <>
      <AppHeader title={t('qiblah.title')} />
      <PageContent>
        {location ? (
          <Qiblah location={location} />
        ) : (
          <Surface>
            <EmptyState
              compact
              icon={<PlaceOutlined />}
              title={t('home.locationNeededTitle')}
              body={t('qiblah.locationNeededBody')}
              actions={
                <Button variant="contained" onClick={() => setLocationOpen(true)}>
                  {t('home.locationNeededTitle')}
                </Button>
              }
            />
          </Surface>
        )}
      </PageContent>
      <LocationDialog open={locationOpen} onClose={() => setLocationOpen(false)} />
    </>
  );
}

function Qiblah({ location }: { location: SavedLocation }) {
  const i18n = useI18n();
  const { t } = i18n;
  const compass = useCompass(location);
  useKeepAwake();

  const bearing = qiblaBearing(location);
  const distanceKm = distanceToKaabaKm(location);
  const live = compass.status === 'active' && compass.heading !== null;
  const offset = live ? angleDelta(compass.heading!, bearing) : null;
  const aligned = offset !== null && Math.abs(offset) <= ALIGNMENT_TOLERANCE;

  // A single pulse when the phone swings onto the qiblah.
  const wasAligned = useRef(false);
  useEffect(() => {
    if (aligned && !wasAligned.current && settingsStore.get().haptics) haptic('complete');
    wasAligned.current = aligned;
  }, [aligned]);

  // Next to the Kaaba a bearing is meaningless: a few steps change it completely.
  if (distanceKm < AT_KAABA_KM) {
    return <Alert severity="info" variant="outlined">{t('qiblah.atKaaba')}</Alert>;
  }

  return (
    <>
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="overline" component="h2" color="textSecondary">
          {t('qiblah.bearing')}
        </Typography>
        <Typography
          component="p"
          dir="ltr"
          sx={{ fontFamily: (theme) => theme.app.fonts.display, fontSize: 'clamp(3rem, 15vw, 4.5rem)', lineHeight: 1.1 }}
        >
          {Math.round(bearing)}°
        </Typography>
        <Typography variant="body1" component="p">
          {t('qiblah.bearingValue', {
            degrees: Math.round(bearing),
            direction: t(`qiblah.directions.${compassPoint(bearing)}`),
          })}
        </Typography>
        <Typography variant="body2" color="textSecondary" component="p">
          {t('qiblah.distance', { km: formatNumber(i18n, distanceKm) })}
        </Typography>
      </Box>

      {compass.status === 'needs-permission' || compass.status === 'denied' ? (
        <Surface>
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, alignItems: 'center', textAlign: 'center' }}>
            <Typography variant="body2" color="textSecondary">
              {compass.status === 'denied' ? t('qiblah.permissionDenied') : t('qiblah.permissionBody')}
            </Typography>
            <Button variant="contained" onClick={compass.enable}>
              {t('qiblah.enableCompass')}
            </Button>
          </Box>
        </Surface>
      ) : (
        <>
          <QiblahCompass
            bearing={bearing}
            rotation={live ? compass.rotation : null}
            aligned={aligned}
            cardinal={i18n.dictionary.qiblah.cardinal}
            label={t('qiblah.compassLabel', { degrees: Math.round(bearing) })}
          />

          {compass.status === 'unavailable' ? (
            <>
              <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', mt: -1 }}>
                {t('qiblah.staticCaption')}
              </Typography>
              <Alert severity="info" variant="outlined">
                <Typography variant="subtitle2" component="p">
                  {t('qiblah.unavailableTitle')}
                </Typography>
                {t('qiblah.unavailableBody')}
              </Alert>
            </>
          ) : (
            <>
              <Box
                sx={{
                  minHeight: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  color: aligned ? 'primary.main' : 'text.primary',
                }}
              >
                {aligned && <CheckCircleOutlined aria-hidden />}
                <Typography variant="subtitle1" component="p">
                  {offset === null
                    ? t('qiblah.starting')
                    : aligned
                      ? t('qiblah.facing')
                      : t(offset > 0 ? 'qiblah.turnRight' : 'qiblah.turnLeft', { degrees: Math.round(Math.abs(offset)) })}
                </Typography>
              </Box>
              {/* Screen readers hear only the moment of alignment, not every degree. */}
              <Box role="status" sx={visuallyHidden}>
                {aligned ? t('qiblah.facing') : ''}
              </Box>
              <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center' }}>
                {t('qiblah.calibrate')}{' '}
                {compass.declination === null
                  ? t('qiblah.magneticOnly')
                  : t('qiblah.trueNorth', { degrees: formatNumber(i18n, compass.declination, 1) })}
              </Typography>
            </>
          )}
        </>
      )}
    </>
  );
}
