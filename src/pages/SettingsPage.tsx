import AddOutlined from '@mui/icons-material/AddOutlined';
import RemoveOutlined from '@mui/icons-material/RemoveOutlined';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { useAdhanState } from '@/components/AdhanBanner';
import { AppHeader } from '@/components/AppHeader';
import { LocationDialog, locationLabel } from '@/components/LocationDialog';
import { PageContent } from '@/components/Page';
import { ChoiceDialog, SegmentedControl, SettingItem, SettingsSection, SwitchItem } from '@/components/settings';
import { getReciter, RECITERS } from '@/data/reciters';
import { CALCULATION_METHOD_IDS } from '@/domain/prayer/methods';
import { MADHABS, OBLIGATORY_PRAYER_IDS } from '@/domain/prayer/types';
import { usePageTitle } from '@/hooks/useDeviceFeatures';
import { saveDeviceLocation } from '@/hooks/useLocationActions';
import { useNotificationControls } from '@/hooks/useNotificationControls';
import { useI18n } from '@/i18n';
import { adhanPlayer } from '@/services/adhanPlayer';
import { countryName } from '@/services/cities';
import { locationPermission, type LocationPermission } from '@/services/geolocation';
import { hapticsSupported } from '@/services/haptics';
import { notifications } from '@/services/notifications';
import { wakeLockSupported } from '@/services/wakeLock';
import { pinWidget, widgetsSupported, type WidgetKind } from '@/services/widgets';
import { useSavedLocation } from '@/stores/location';
import {
  HIJRI_ADJUSTMENT_RANGE,
  LANGUAGES,
  NOTIFICATION_SOUNDS,
  THEME_PREFERENCES,
  updateNotificationSettings,
  updateSettings,
  useSettings,
} from '@/stores/settings';
import { LAYOUT, SAFE_AREA } from '@/theme/tokens';

const REPOSITORY_URL = 'https://github.com/fut0r/Al-Muslim';

const PERMISSION_LABELS = {
  granted: 'settings.permissionGranted',
  denied: 'settings.permissionDenied',
  prompt: 'settings.permissionPrompt',
  unknown: 'settings.permissionUnknown',
} as const;

export default function SettingsPage() {
  const i18n = useI18n();
  const { t } = i18n;
  const settings = useSettings();
  const location = useSavedLocation();
  const notification = useNotificationControls();
  const adhan = useAdhanState();
  const [dialog, setDialog] = useState<'method' | 'madhab' | 'location' | 'reciter' | null>(null);
  const [permission, setPermission] = useState<LocationPermission>('unknown');
  const [exactAlarms, setExactAlarms] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  usePageTitle(t('settings.title'), t('app.name'));

  useEffect(() => {
    let cancelled = false;
    void locationPermission().then((state) => {
      if (!cancelled) setPermission(state);
    });
    return () => {
      cancelled = true;
    };
  }, [location]);

  const notificationsOn = settings.notifications.enabled && notification.permission === 'granted';
  useEffect(() => {
    if (!notificationsOn || !notifications.exactAlarmsAllowed) return;
    let cancelled = false;
    void notifications.exactAlarmsAllowed().then((allowed) => {
      if (!cancelled) setExactAlarms(allowed);
    });
    return () => {
      cancelled = true;
    };
  }, [notificationsOn]);

  const notificationHint =
    notification.permission === 'unsupported'
      ? t('settings.notificationsUnsupported')
      : notification.permission === 'denied'
        ? t('settings.notificationsDenied')
        : !location
          ? t('settings.notificationsNeedLocation')
          : notifications.deliversWhenClosed
            ? t('settings.notificationsNativeHint')
            : t('settings.notificationsWebHint');

  const refreshLocation = async () => {
    setRefreshing(true);
    const failure = await saveDeviceLocation();
    setRefreshing(false);
    setMessage(failure ? t(`location.${failure}`) : t('location.updated'));
  };

  const toggleAdhanPreview = async () => {
    if (adhan.playing) {
      adhanPlayer.stop();
    } else if (!(await adhanPlayer.play())) {
      setMessage(t('adhan.failed'));
    }
  };

  const addWidget = async (widget: WidgetKind) => {
    if (!(await pinWidget(widget))) setMessage(t('widgets.pinUnsupported'));
  };

  const reciter = getReciter(settings.reciter);
  const adjustment = settings.hijriAdjustment;
  const locationDetail = location
    ? [
        countryName(location.countryCode, i18n.language),
        t(location.source === 'gps' ? 'location.sourceGps' : location.source === 'city' ? 'location.sourceCity' : 'location.sourceManual'),
      ]
        .filter(Boolean)
        .join(' · ')
    : t('location.why');

  return (
    <>
      <AppHeader title={t('settings.title')} />
      <PageContent>
        <SettingsSection title={t('settings.appearance')}>
          <SettingItem label={t('settings.theme')} description={settings.theme === 'amoled' ? t('settings.themeAmoledHint') : undefined}>
            <SegmentedControl
              label={t('settings.theme')}
              value={settings.theme}
              onChange={(theme) => updateSettings({ theme })}
              options={THEME_PREFERENCES.map((value) => ({ value, label: t(`settings.themes.${value}`) }))}
            />
          </SettingItem>
          <SettingItem label={t('settings.language')}>
            <SegmentedControl
              label={t('settings.language')}
              value={settings.language}
              onChange={(language) => updateSettings({ language })}
              options={LANGUAGES.map((value) => ({ value, label: t(`settings.languages.${value}`) }))}
            />
          </SettingItem>
        </SettingsSection>

        <SettingsSection title={t('settings.prayer')}>
          <SettingItem
            label={t('settings.method')}
            description={t(`methods.${settings.method}`)}
            onClick={() => setDialog('method')}
          />
          <SettingItem
            label={t('settings.madhab')}
            description={t(`madhab.${settings.madhab}`)}
            onClick={() => setDialog('madhab')}
          />
          <SettingItem label={t('settings.timeFormat')}>
            <SegmentedControl
              label={t('settings.timeFormat')}
              value={settings.hour12 ? '12' : '24'}
              onChange={(value) => updateSettings({ hour12: value === '12' })}
              options={[
                { value: '12', label: t('settings.hour12') },
                { value: '24', label: t('settings.hour24') },
              ]}
            />
          </SettingItem>
          <SettingItem
            label={t('settings.hijriAdjustment')}
            description={t('settings.hijriAdjustmentHint')}
            control={
              <Box role="group" aria-label={t('settings.hijriAdjustment')} sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <IconButton
                  size="small"
                  aria-label="−1"
                  disabled={adjustment <= HIJRI_ADJUSTMENT_RANGE.min}
                  onClick={() => updateSettings({ hijriAdjustment: adjustment - 1 })}
                >
                  <RemoveOutlined fontSize="small" />
                </IconButton>
                <Typography
                  variant="subtitle2"
                  component="output"
                  aria-live="polite"
                  aria-label={
                    adjustment === 0
                      ? t('settings.hijriAdjustmentNone')
                      : t('settings.hijriAdjustmentValue', { days: adjustment > 0 ? `+${adjustment}` : adjustment })
                  }
                  dir="ltr"
                  sx={{ minWidth: 28, textAlign: 'center' }}
                >
                  {adjustment > 0 ? `+${adjustment}` : adjustment}
                </Typography>
                <IconButton
                  size="small"
                  aria-label="+1"
                  disabled={adjustment >= HIJRI_ADJUSTMENT_RANGE.max}
                  onClick={() => updateSettings({ hijriAdjustment: adjustment + 1 })}
                >
                  <AddOutlined fontSize="small" />
                </IconButton>
              </Box>
            }
          />
        </SettingsSection>

        <SettingsSection title={t('settings.notifications')}>
          <SwitchItem
            label={t('settings.prayerNotifications')}
            description={notificationHint}
            checked={notificationsOn}
            disabled={notification.permission === 'unsupported' || notification.permission === null}
            onChange={(checked) => (checked ? void notification.enable() : notification.disable())}
          />
          {notificationsOn &&
            OBLIGATORY_PRAYER_IDS.map((id) => (
              <SwitchItem
                key={id}
                label={t('settings.notifyFor', { prayer: t(`prayers.${id}`) })}
                checked={settings.notifications.prayers[id]}
                onChange={(checked) =>
                  updateNotificationSettings({ prayers: { ...settings.notifications.prayers, [id]: checked } })
                }
              />
            ))}
          {notificationsOn && (
            <SettingItem
              label={t('settings.notificationSound')}
              description={
                settings.notifications.sound === 'adhan'
                  ? notifications.deliversWhenClosed
                    ? t('settings.adhanBy')
                    : `${t('settings.adhanBy')} ${t('settings.adhanWebHint')}`
                  : undefined
              }
            >
              <SegmentedControl
                label={t('settings.notificationSound')}
                value={settings.notifications.sound}
                onChange={(sound) => updateNotificationSettings({ sound })}
                options={NOTIFICATION_SOUNDS.map((value) => ({
                  value,
                  label: t(value === 'adhan' ? 'settings.soundAdhan' : 'settings.soundDefault'),
                }))}
              />
            </SettingItem>
          )}
          {notificationsOn && settings.notifications.sound === 'adhan' && (
            <SettingItem
              label={adhan.playing ? t('adhan.stop') : t('settings.previewAdhan')}
              onClick={() => void toggleAdhanPreview()}
            />
          )}
          {notificationsOn && !exactAlarms && notifications.openExactAlarmSettings && (
            <SettingItem
              label={t('settings.exactAlarms')}
              description={t('settings.exactAlarmsHint')}
              onClick={() => void notifications.openExactAlarmSettings?.().then(setExactAlarms)}
            />
          )}
        </SettingsSection>

        <SettingsSection title={t('settings.quran')}>
          <SettingItem
            label={t('quran.reciter')}
            description={i18n.language === 'ar' ? reciter.name.ar : reciter.name.en}
            onClick={() => setDialog('reciter')}
          />
        </SettingsSection>

        {widgetsSupported && (
          <SettingsSection title={t('widgets.title')}>
            <SettingItem
              label={t('widgets.addNext')}
              description={t('widgets.addNextHint')}
              onClick={() => void addWidget('next')}
            />
            <SettingItem
              label={t('widgets.addTimes')}
              description={t('widgets.addTimesHint')}
              onClick={() => void addWidget('times')}
            />
          </SettingsSection>
        )}

        <SettingsSection title={t('settings.haptics')}>
          <SwitchItem
            label={t('settings.hapticFeedback')}
            description={hapticsSupported ? undefined : t('settings.hapticsUnsupported')}
            checked={settings.haptics && hapticsSupported}
            disabled={!hapticsSupported}
            onChange={(haptics) => updateSettings({ haptics })}
          />
        </SettingsSection>

        <SettingsSection title={t('settings.display')}>
          <SwitchItem
            label={t('settings.keepAwake')}
            description={wakeLockSupported() ? t('settings.keepAwakeHint') : t('settings.keepAwakeUnsupported')}
            checked={settings.keepAwake && wakeLockSupported()}
            disabled={!wakeLockSupported()}
            onChange={(keepAwake) => updateSettings({ keepAwake })}
          />
        </SettingsSection>

        <SettingsSection title={t('settings.location')}>
          <SettingItem label={locationLabel(i18n, location)} description={locationDetail} onClick={() => setDialog('location')} />
          <SettingItem label={t('settings.locationPermission')} value={t(PERMISSION_LABELS[permission])} />
          {location?.source === 'gps' && (
            <SettingItem
              label={refreshing ? t('location.locating') : t('location.refresh')}
              onClick={() => {
                if (!refreshing) void refreshLocation();
              }}
            />
          )}
        </SettingsSection>

        <SettingsSection title={t('settings.about')}>
          <SettingItem label={t('settings.version')} value={__APP_VERSION__} />
          <SettingItem label={t('settings.developer')} value={t('settings.developerName')} />
          <SettingItem label={t('settings.openSource')} description={t('settings.openSourceValue')} />
          <SettingItem label={t('settings.license')} description={t('settings.licenseValue')} />
          <SettingItem label={t('settings.repository')} description={t('settings.repositoryValue')} href={REPOSITORY_URL} />
          <SettingItem label={t('settings.privacy')} description={t('settings.privacyValue')} />
          <SettingItem label={t('settings.credits')} description={t('settings.creditsValue')} />
        </SettingsSection>
      </PageContent>

      <ChoiceDialog
        open={dialog === 'method'}
        title={t('settings.method')}
        value={settings.method}
        onChange={(method) => updateSettings({ method })}
        onClose={() => setDialog(null)}
        options={CALCULATION_METHOD_IDS.map((value) => ({ value, label: t(`methods.${value}`) }))}
      />
      <ChoiceDialog
        open={dialog === 'madhab'}
        title={t('settings.madhab')}
        value={settings.madhab}
        onChange={(madhab) => updateSettings({ madhab })}
        onClose={() => setDialog(null)}
        options={MADHABS.map((value) => ({
          value,
          label: t(`madhab.${value}`),
          description: t(`madhab.${value}Hint`),
        }))}
      />
      <ChoiceDialog
        open={dialog === 'reciter'}
        title={t('quran.reciter')}
        value={settings.reciter}
        onChange={(value) => updateSettings({ reciter: value })}
        onClose={() => setDialog(null)}
        note={t('quran.audioNote')}
        options={RECITERS.map((item) => ({
          value: item.id,
          label: i18n.language === 'ar' ? item.name.ar : item.name.en,
          description: i18n.language === 'ar' ? item.detail.ar : item.detail.en,
        }))}
      />
      <LocationDialog open={dialog === 'location'} onClose={() => setDialog(null)} />
      <Snackbar
        open={message !== null}
        autoHideDuration={4000}
        onClose={() => setMessage(null)}
        message={message}
        sx={{ bottom: `calc(${LAYOUT.bottomNavHeight}px + ${SAFE_AREA.bottom} + 12px) !important` }}
      />
    </>
  );
}
