import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import MyLocationOutlined from '@mui/icons-material/MyLocationOutlined';
import NotificationsNoneOutlined from '@mui/icons-material/NotificationsNoneOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useCalculationSettings } from '@/components/CalculationSettings';
import { Directional, LogoMark } from '@/components/icons';
import { LocationDialog, locationLabel } from '@/components/LocationDialog';
import { RowGroup, SegmentedControl } from '@/components/settings';
import { usePageTitle } from '@/hooks/useDeviceFeatures';
import { useDeviceLocation } from '@/hooks/useLocationActions';
import { useNotificationControls } from '@/hooks/useNotificationControls';
import { useI18n } from '@/i18n';
import { notifications } from '@/services/notifications';
import { useSavedLocation } from '@/stores/location';
import { LANGUAGES, updateSettings, useSettings } from '@/stores/settings';
import { SAFE_AREA, gutter } from '@/theme/tokens';

const STEPS = ['welcome', 'location', 'method', 'notifications'] as const;

function StepIntro({ icon, title, body }: { icon?: ReactNode; title: string; body: string }) {
  return (
    <Stack spacing={1.5}>
      {icon && (
        <Box aria-hidden sx={{ color: 'primary.main', display: 'flex', '& svg': { fontSize: 40 } }}>
          {icon}
        </Box>
      )}
      <Typography variant="h1" component="h1" tabIndex={-1} sx={{ outline: 'none' }}>
        {title}
      </Typography>
      <Typography variant="body1" color="textSecondary">
        {body}
      </Typography>
    </Stack>
  );
}

/** A short first-run setup. Every step after the welcome can be skipped. */
export default function OnboardingPage() {
  const i18n = useI18n();
  const { t } = i18n;
  const navigate = useNavigate();
  const settings = useSettings();
  const location = useSavedLocation();
  const device = useDeviceLocation();
  const notification = useNotificationControls();
  const calculation = useCalculationSettings();
  const [step, setStep] = useState(0);
  const [locationOpen, setLocationOpen] = useState(false);
  const content = useRef<HTMLDivElement>(null);
  usePageTitle(t('app.name'), t('app.name'));

  const current = STEPS[step]!;
  const last = step === STEPS.length - 1;

  // Move focus to the new step's heading so keyboard and screen reader users follow along.
  useEffect(() => {
    if (step > 0) content.current?.querySelector<HTMLElement>('h1')?.focus();
    window.scrollTo(0, 0);
  }, [step]);

  const finish = () => {
    updateSettings({ onboarded: true });
    void navigate('/', { replace: true });
  };
  const advance = () => (last ? finish() : setStep((value) => value + 1));
  const notificationsOn = settings.notifications.enabled && notification.permission === 'granted';

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        mx: 'auto',
        maxWidth: 520,
        px: gutter(20),
        pt: `calc(${SAFE_AREA.top} + 8px)`,
        pb: `calc(${SAFE_AREA.bottom} + 20px)`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 48, mx: -1.25 }}>
        {step > 0 && (
          <IconButton onClick={() => setStep((value) => value - 1)} aria-label={t('common.back')} color="inherit">
            <Directional>
              <ArrowBackOutlined />
            </Directional>
          </IconButton>
        )}
        <Box
          role="img"
          aria-label={t('onboarding.stepOf', { step: step + 1, total: STEPS.length })}
          sx={{ display: 'flex', gap: 0.75, mx: 'auto' }}
        >
          {STEPS.map((id, index) => (
            <Box
              key={id}
              sx={{
                width: index === step ? 20 : 6,
                height: 6,
                borderRadius: 3,
                bgcolor: index <= step ? 'primary.main' : 'divider',
                transition: 'width 200ms',
              }}
            />
          ))}
        </Box>
        {step > 0 ? (
          <Button onClick={advance} color="inherit" sx={{ color: 'text.secondary' }}>
            {t('common.skip')}
          </Button>
        ) : null}
      </Box>

      <Box ref={content} sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3, py: 3 }}>
        {current === 'welcome' && (
          <>
            <Box sx={{ color: 'primary.main' }}>
              <LogoMark size={84} />
            </Box>
            <StepIntro title={t('onboarding.welcomeTitle')} body={t('onboarding.welcomeBody')} />
            <SegmentedControl
              label={t('settings.language')}
              value={settings.language}
              onChange={(language) => updateSettings({ language })}
              options={LANGUAGES.map((value) => ({ value, label: t(`settings.languages.${value}`) }))}
            />
          </>
        )}

        {current === 'location' && (
          <>
            <StepIntro icon={<MyLocationOutlined />} title={t('onboarding.locationTitle')} body={t('onboarding.locationBody')} />
            {location && (
              <Alert severity="success" variant="outlined" icon={<CheckCircleOutlined />}>
                {t('onboarding.locationSet', { name: locationLabel(i18n, location) })}
              </Alert>
            )}
            {device.failure && (
              <Alert severity="warning" variant="outlined" role="alert">
                {t(`location.${device.failure}`)}
              </Alert>
            )}
            <Stack spacing={1.5}>
              <Button
                variant={location ? 'outlined' : 'contained'}
                size="large"
                startIcon={<MyLocationOutlined />}
                loading={device.busy}
                loadingPosition="start"
                onClick={() => void device.locate()}
              >
                {device.busy ? t('location.locating') : t('location.useDevice')}
              </Button>
              <Button variant="outlined" size="large" onClick={() => setLocationOpen(true)}>
                {t('location.chooseCity')}
              </Button>
            </Stack>
          </>
        )}

        {current === 'method' && (
          <>
            <StepIntro title={t('onboarding.methodTitle')} body={t('onboarding.methodBody')} />
            <RowGroup>{calculation.rows}</RowGroup>
          </>
        )}

        {current === 'notifications' && (
          <>
            <StepIntro
              icon={<NotificationsNoneOutlined />}
              title={t('onboarding.notificationsTitle')}
              body={t('onboarding.notificationsBody')}
            />
            {notificationsOn ? (
              <Alert severity="success" variant="outlined" icon={<CheckCircleOutlined />}>
                {t('onboarding.notificationsOn')}
              </Alert>
            ) : notification.permission === 'denied' ? (
              <Alert severity="warning" variant="outlined" role="alert">
                {t('settings.notificationsDenied')}
              </Alert>
            ) : notification.permission === 'unsupported' ? (
              <Alert severity="info" variant="outlined">
                {t('settings.notificationsUnsupported')}
              </Alert>
            ) : (
              <Button variant="outlined" size="large" startIcon={<NotificationsNoneOutlined />} onClick={() => void notification.enable()}>
                {t('onboarding.enableNotifications')}
              </Button>
            )}
            {!notifications.deliversWhenClosed && notification.permission !== 'unsupported' && (
              <Typography variant="body2" color="textSecondary">
                {t('settings.notificationsWebHint')}
              </Typography>
            )}
          </>
        )}
      </Box>

      <Button variant="contained" size="large" onClick={advance}>
        {current === 'welcome' ? t('onboarding.getStarted') : last ? t('onboarding.finish') : t('common.continue')}
      </Button>

      <LocationDialog open={locationOpen} onClose={() => setLocationOpen(false)} />
      {calculation.dialogs}
    </Box>
  );
}
