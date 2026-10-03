import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import RestartAltOutlined from '@mui/icons-material/RestartAltOutlined';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { memo } from 'react';
import type { Dhikr, QuranPassage } from '@/data/adhkar';
import { showsBasmalah } from '@/domain/quran/types';
import { useI18n } from '@/i18n';
import { getSurah } from '@/services/quranRepository';
import { visuallyHidden } from './a11y';
import { ArabicText, ayahMarker, useSurahText } from './quran';
import { ErrorState, LoadingState } from './states';

/** A passage read straight from the bundled Quran text. */
function QuranPassageText({ passage }: { passage: QuranPassage }) {
  const { t } = useI18n();
  const surah = useSurahText(passage.surah);
  const opening = useSurahText(1);
  const wholeSurah = passage.from === 1 && passage.to === getSurah(passage.surah)?.ayahs;

  if (surah.status === 'loading') return <LoadingState compact />;
  if (surah.status === 'error') return <ErrorState compact title={t('quran.loadErrorTitle')} body={t('quran.loadErrorBody')} />;

  const ayahs = surah.ayahs.slice(passage.from - 1, passage.to);
  return (
    <>
      {wholeSurah && showsBasmalah(passage.surah) && opening.status === 'ready' && (
        <ArabicText size={1.25} sx={{ color: 'text.secondary' }}>
          {opening.ayahs[0]}
        </ArabicText>
      )}
      <ArabicText size={1.375}>
        {ayahs.map((ayah, index) => `${ayah} ${ayahMarker(passage.from + index)}`).join(' ')}
      </ArabicText>
    </>
  );
}

interface CounterProps {
  count: number;
  total: number;
  onCount(): void;
}

/**
 * The tap target for counting a dhikr. It fills as the count rises and
 * announces its progress to screen readers.
 */
export function Counter({ count, total, onCount }: CounterProps) {
  const { t } = useI18n();
  const done = count >= total;
  const progress = Math.min(1, count / total);

  return (
    <ButtonBase
      onClick={onCount}
      disabled={done}
      aria-label={done ? t('adhkar.done') : t('adhkar.countLabel', { count, total })}
      sx={{
        position: 'relative',
        flex: 1,
        minHeight: 56,
        borderRadius: 1,
        overflow: 'hidden',
        border: 1,
        borderColor: done ? 'primary.main' : 'divider',
        color: done ? 'primary.main' : 'text.primary',
        justifyContent: 'space-between',
        px: 2,
        gap: 1,
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          insetBlock: 0,
          insetInlineStart: 0,
          width: `${progress * 100}%`,
          bgcolor: 'action.selected',
          transition: 'width 160ms ease-out',
        }}
      />
      <Typography variant="button" component="span" sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 1 }}>
        {done && <CheckCircleOutlined fontSize="small" />}
        {done ? t('adhkar.done') : t('adhkar.count')}
      </Typography>
      <Typography
        component="span"
        dir="ltr"
        sx={{
          position: 'relative',
          fontFamily: (theme) => theme.app.fonts.display,
          fontSize: '1.5rem',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {count}
        <Box component="span" sx={{ color: 'text.secondary', fontSize: '1rem' }}>
          {' '}
          / {total}
        </Box>
      </Typography>
    </ButtonBase>
  );
}

interface DhikrCardProps {
  dhikr: Dhikr;
  count: number;
  onCount(dhikr: Dhikr): void;
  onReset(dhikr: Dhikr): void;
}

/** One dhikr: its text, source, how many times to say it, and a counter. */
export const DhikrCard = memo(function DhikrCard({ dhikr, count, onCount, onReset }: DhikrCardProps) {
  const i18n = useI18n();
  const { t } = i18n;
  const arabic = i18n.language === 'ar';
  const done = count >= dhikr.count;

  return (
    <Box
      component="article"
      sx={{
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      {dhikr.quran && (
        <Typography variant="subtitle2" component="h3" color="textSecondary">
          {arabic ? dhikr.quran.title.ar : dhikr.quran.title.en}
        </Typography>
      )}
      {dhikr.quran ? <QuranPassageText passage={dhikr.quran} /> : <ArabicText size={1.375}>{dhikr.text}</ArabicText>}
      {!arabic && dhikr.translation && (
        <Typography variant="body2" color="textSecondary">
          {dhikr.translation}
        </Typography>
      )}
      <Typography variant="caption" color="textSecondary">
        {arabic ? dhikr.source.ar : dhikr.source.en} ·{' '}
        {dhikr.count === 1 ? t('adhkar.once') : t('adhkar.repeat', { count: dhikr.count })}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Counter count={Math.min(count, dhikr.count)} total={dhikr.count} onCount={() => onCount(dhikr)} />
        <IconButton onClick={() => onReset(dhikr)} disabled={count === 0} aria-label={t('adhkar.resetOne')}>
          <RestartAltOutlined />
        </IconButton>
      </Box>
      {/* Completion is also announced, since the counter itself becomes inert. */}
      <Box aria-live="polite" sx={visuallyHidden}>
        {done ? t('adhkar.done') : ''}
      </Box>
    </Box>
  );
});
