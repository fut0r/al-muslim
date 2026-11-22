import VolumeDownOutlined from '@mui/icons-material/VolumeDownOutlined';
import VolumeUpOutlined from '@mui/icons-material/VolumeUpOutlined';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { changeVolume, PLAYBACK_VOLUME } from '@/domain/playback';
import { useI18n } from '@/i18n';

/**
 * Louder and quieter, for whatever is playing. The level is the app's own,
 * kept with the other settings, and the same one is used for recitation and
 * the adhan.
 */
export function PlaybackVolume({ volume, onChange }: { volume: number; onChange(next: number): void }) {
  const { t } = useI18n();
  const percent = Math.round(volume * 100);

  return (
    <Box role="group" aria-label={t('quran.volume')} dir="ltr" sx={{ display: 'flex', alignItems: 'center' }}>
      <IconButton
        onClick={() => onChange(changeVolume(volume, -1))}
        disabled={volume <= PLAYBACK_VOLUME.min}
        aria-label={t('quran.volumeDown')}
        color="inherit"
      >
        <VolumeDownOutlined />
      </IconButton>
      <Typography
        variant="caption"
        component="output"
        aria-live="polite"
        aria-label={t('quran.volumeLevel', { percent })}
        sx={{ minWidth: 36, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}
      >
        {percent}%
      </Typography>
      <IconButton
        onClick={() => onChange(changeVolume(volume, 1))}
        disabled={volume >= PLAYBACK_VOLUME.max}
        aria-label={t('quran.volumeUp')}
        color="inherit"
      >
        <VolumeUpOutlined />
      </IconButton>
    </Box>
  );
}
