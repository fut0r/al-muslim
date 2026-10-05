import CloseOutlined from '@mui/icons-material/CloseOutlined';
import PauseOutlined from '@mui/icons-material/PauseOutlined';
import PlayArrowOutlined from '@mui/icons-material/PlayArrowOutlined';
import SkipNextOutlined from '@mui/icons-material/SkipNextOutlined';
import SkipPreviousOutlined from '@mui/icons-material/SkipPreviousOutlined';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { Recitation } from '@/hooks/useRecitation';
import { useI18n } from '@/i18n';
import { LAYOUT, SAFE_AREA, gutter } from '@/theme/tokens';

/** Height the bar occupies, so the page can leave room for it. */
export const RECITATION_BAR_SPACE = 76;

interface RecitationBarProps {
  recitation: Recitation;
  reciterName: string;
  onChooseReciter(): void;
}

/**
 * Playback controls for listening to the surah. It sits above the bottom
 * navigation while something is playing and disappears when playback stops.
 */
export function RecitationBar({ recitation, reciterName, onChooseReciter }: RecitationBarProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true });
  const { state } = recitation;
  if (state.status === 'idle' || !state.item) return null;

  const failed = state.status === 'error';
  const playing = state.status === 'playing' || state.status === 'loading';
  const detail = failed
    ? t(state.error === 'offline' ? 'quran.audioOffline' : 'quran.audioFailed')
    : state.status === 'loading'
      ? t('quran.audioLoading')
      : state.item.basmalah
        ? t('quran.basmalah')
        : t('quran.playingAyah', { ayah: state.item.ayah });

  return (
    <Box
      role="region"
      aria-label={t('quran.listen')}
      sx={{
        position: 'fixed',
        insetInline: 0,
        bottom: wide ? `calc(${SAFE_AREA.bottom} + 12px)` : `calc(${LAYOUT.bottomNavHeight}px + ${SAFE_AREA.bottom} + 8px)`,
        zIndex: 'appBar',
        px: gutter(8),
        paddingInlineStart: wide ? `${LAYOUT.railWidth + 8}px` : undefined,
        pointerEvents: 'none',
      }}
    >
      <Box
        sx={{
          pointerEvents: 'auto',
          mx: 'auto',
          maxWidth: LAYOUT.contentMaxWidth,
          minHeight: 60,
          display: 'flex',
          alignItems: 'center',
          gap: 0.25,
          pl: 0.5,
          pr: 0.5,
          bgcolor: 'background.paper',
          border: 1,
          borderColor: failed ? 'error.main' : 'divider',
          borderRadius: 1,
        }}
      >
        <ButtonBase
          onClick={onChooseReciter}
          aria-label={t('quran.changeReciter', { name: reciterName })}
          sx={{ flex: 1, minWidth: 0, display: 'block', textAlign: 'start', px: 1.25, py: 0.75, borderRadius: 1 }}
        >
          <Typography variant="subtitle2" component="span" noWrap sx={{ display: 'block' }}>
            {reciterName}
          </Typography>
          <Typography
            variant="caption"
            component="span"
            color={failed ? 'error' : 'textSecondary'}
            role={failed ? 'alert' : 'status'}
            noWrap={!failed}
            sx={{ display: 'block' }}
          >
            {detail}
          </Typography>
        </ButtonBase>

        {/* Transport controls keep their usual left-to-right order in every language. */}
        <Box dir="ltr" sx={{ display: 'flex', flexShrink: 0 }}>
          <IconButton onClick={recitation.previous} aria-label={t('quran.previousAyah')} color="inherit">
            <SkipPreviousOutlined />
          </IconButton>
          <IconButton
            onClick={playing ? recitation.pause : recitation.resume}
            aria-label={playing ? t('quran.pause') : t('quran.play')}
            color="primary"
            sx={{ position: 'relative' }}
          >
            {playing ? <PauseOutlined /> : <PlayArrowOutlined />}
            {state.status === 'loading' && (
              <CircularProgress size={40} thickness={2} aria-hidden sx={{ position: 'absolute', inset: 2 }} />
            )}
          </IconButton>
          <IconButton onClick={recitation.next} aria-label={t('quran.nextAyah')} color="inherit">
            <SkipNextOutlined />
          </IconButton>
        </Box>
        <IconButton onClick={recitation.stop} aria-label={t('quran.stopListening')} color="inherit">
          <CloseOutlined />
        </IconButton>
      </Box>
    </Box>
  );
}
