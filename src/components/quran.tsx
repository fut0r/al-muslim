import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { SurahInfo } from '@/domain/quran/types';
import { useAsync } from '@/hooks/useAsync';
import { useI18n, type I18n } from '@/i18n';
import { toArabicIndic } from '@/i18n/format';
import { loadSurah } from '@/services/quranRepository';
import { visuallyHidden } from './a11y';

/** End-of-ayah sign (U+06DD) enclosing the ayah number, as printed in the mushaf. */
export function ayahMarker(ayah: number): string {
  return `\u06DD${toArabicIndic(ayah)}`;
}

/**
 * Typography for Quranic and other classical Arabic text. Always
 * right-to-left and in the Quran typeface, whatever the app language is.
 * The generous line height leaves room for stacked marks above and below.
 */
export function arabicTextStyles(scale = 1, size = 1.5): SxProps<Theme> {
  return {
    fontFamily: (theme) => theme.app.fonts.quran,
    fontSize: `${(size * scale).toFixed(3)}rem`,
    lineHeight: 2.3,
    fontWeight: 400,
    letterSpacing: 0,
    wordSpacing: '0.06em',
    textAlign: 'start',
    overflowWrap: 'normal',
    wordBreak: 'normal',
    fontFeatureSettings: '"liga", "calt", "kern"',
  };
}

/** A block of Arabic scripture or supplication. */
export function ArabicText({
  children,
  scale,
  size,
  sx,
}: {
  children: ReactNode;
  scale?: number;
  size?: number;
  sx?: SxProps<Theme>;
}) {
  return (
    <Box component="p" dir="rtl" lang="ar" sx={[{ m: 0 }, arabicTextStyles(scale, size), ...(Array.isArray(sx) ? sx : [sx])]}>
      {children}
    </Box>
  );
}

export function surahDisplayName(i18n: I18n, surah: SurahInfo): string {
  return i18n.language === 'ar' ? `سورة ${surah.name}` : surah.englishName;
}

export function surahMeta(i18n: I18n, surah: SurahInfo): string {
  return `${i18n.t(`quran.${surah.revelation}`)} · ${i18n.t('quran.ayahCount', { count: surah.ayahs })}`;
}

/** A row in the surah list. `read` is how many of its ayahs have been read. */
export function QuranSurahCard({ surah, read = 0 }: { surah: SurahInfo; read?: number }) {
  const i18n = useI18n();
  const arabic = i18n.language === 'ar';
  const complete = read >= surah.ayahs;

  return (
    <ButtonBase
      component={Link}
      to={`/quran/${surah.id}`}
      sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', minHeight: 64, px: 1, py: 1, borderRadius: 1, textAlign: 'start' }}
    >
      <Box
        aria-hidden
        sx={{
          width: 40,
          height: 40,
          flexShrink: 0,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 1,
          border: 1,
          borderColor: 'divider',
          color: 'text.secondary',
          fontFamily: (theme) => theme.app.fonts.heading,
          fontWeight: 500,
          fontSize: '0.875rem',
        }}
      >
        {surah.id}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle1" component="span" sx={{ display: 'block' }}>
          <Box component="span" sx={visuallyHidden}>
            {i18n.t('quran.surahNumber', { number: surah.id })}:{' '}
          </Box>
          {arabic ? surah.name : surah.englishName}
        </Typography>
        <Typography variant="body2" color="textSecondary" component="span" sx={{ display: 'block' }}>
          {arabic ? surahMeta(i18n, surah) : `${surah.meaning} · ${surahMeta(i18n, surah)}`}
        </Typography>
        {read > 0 && (
          <Typography
            variant="caption"
            color="primary"
            component="span"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}
          >
            {complete && <CheckCircleOutlined aria-hidden sx={{ fontSize: '1rem' }} />}
            {complete
              ? i18n.t('quran.surahComplete')
              : i18n.t('quran.surahRead', { percent: Math.max(1, Math.floor((read / surah.ayahs) * 100)) })}
          </Typography>
        )}
      </Box>
      {!arabic && (
        <Box
          component="span"
          lang="ar"
          dir="rtl"
          sx={{ fontFamily: (theme) => theme.app.fonts.quran, fontSize: '1.375rem', lineHeight: 1.6, color: 'text.primary', flexShrink: 0 }}
        >
          {surah.name}
        </Box>
      )}
    </ButtonBase>
  );
}

type SurahTextState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; ayahs: readonly string[] };

/** The ayahs of one surah. Pass a new `attempt` number to retry after a failure. */
export function useSurahText(surahId: number, attempt = 0): SurahTextState {
  const state = useAsync(`${surahId}:${attempt}`, () => loadSurah(surahId));
  if (state.status === 'ready') return { status: 'ready', ayahs: state.value };
  return state.status === 'error' ? { status: 'error' } : { status: 'loading' };
}

/** A short excerpt of one ayah, for search results and bookmarks. */
export function AyahPreview({ surah, ayah, text }: { surah: number; ayah: number; text?: string }) {
  const loaded = useSurahText(surah);
  const value = text ?? (loaded.status === 'ready' ? loaded.ayahs[ayah - 1] : undefined);
  if (!value) return null;
  return (
    <ArabicText
      size={1.25}
      sx={{
        lineHeight: 2.1,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}
    >
      {value} {ayahMarker(ayah)}
    </ArabicText>
  );
}
