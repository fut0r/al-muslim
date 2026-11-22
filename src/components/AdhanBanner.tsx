import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import { useEffect, useSyncExternalStore } from 'react';
import { PlaybackVolume } from '@/components/PlaybackVolume';
import { useI18n } from '@/i18n';
import { adhanPlayer } from '@/services/adhanPlayer';
import { updateSettings, useSettings } from '@/stores/settings';
import { LAYOUT, SAFE_AREA } from '@/theme/tokens';

/** Whether the adhan is playing right now, and what for. */
export function useAdhanState() {
  return useSyncExternalStore(adhanPlayer.subscribe, adhanPlayer.getState, adhanPlayer.getState);
}

/**
 * Shown on every screen while the adhan plays, so it can always be stopped
 * with one tap.
 */
export function AdhanBanner() {
  const { t } = useI18n();
  const { playing, label } = useAdhanState();
  const { playbackVolume } = useSettings();

  useEffect(() => {
    adhanPlayer.setVolume(playbackVolume);
  }, [playbackVolume]);

  return (
    <Snackbar
      open={playing}
      message={label ? t('adhan.playingFor', { prayer: label }) : t('adhan.playing')}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      action={
        <Stack direction="row" sx={{ alignItems: 'center' }}>
          <PlaybackVolume volume={playbackVolume} onChange={(playbackVolume) => updateSettings({ playbackVolume })} />
          <Button color="inherit" size="small" onClick={() => adhanPlayer.stop()}>
            {t('adhan.stop')}
          </Button>
        </Stack>
      }
      sx={{ bottom: `calc(${LAYOUT.bottomNavHeight}px + ${SAFE_AREA.bottom} + 12px) !important` }}
    />
  );
}
