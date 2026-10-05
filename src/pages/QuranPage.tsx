import BookmarkBorderOutlined from '@mui/icons-material/BookmarkBorderOutlined';
import BookmarkRemoveOutlined from '@mui/icons-material/BookmarkRemoveOutlined';
import ClearOutlined from '@mui/icons-material/ClearOutlined';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useDeferredValue, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { AppHeader } from '@/components/AppHeader';
import { PageContent, Section } from '@/components/Page';
import { AyahPreview, QuranSurahCard, surahDisplayName } from '@/components/quran';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { MIN_QUERY_LENGTH, normalizeArabic, searchAyahs, type SearchResult } from '@/domain/quran/search';
import { TOTAL_AYAHS, type SurahInfo } from '@/domain/quran/types';
import { useAsync } from '@/hooks/useAsync';
import { usePageTitle } from '@/hooks/useDeviceFeatures';
import { useI18n } from '@/i18n';
import { loadSearchIndex, SURAHS, getSurah } from '@/services/quranRepository';
import { ayahsRead, toggleBookmark, totalAyahsRead, useQuranState } from '@/stores/quran';

const foldLatin = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

function matchSurahs(query: string): readonly SurahInfo[] {
  const trimmed = query.trim();
  if (trimmed === '') return SURAHS;
  if (/^\d{1,3}$/.test(trimmed)) return SURAHS.filter((surah) => surah.id === Number(trimmed));
  const latin = foldLatin(trimmed);
  const arabic = normalizeArabic(trimmed).replace(/^سوره /, '');
  return SURAHS.filter(
    (surah) =>
      (latin !== '' && (foldLatin(surah.englishName).includes(latin) || foldLatin(surah.meaning).includes(latin))) ||
      (arabic !== '' && normalizeArabic(surah.name).includes(arabic)),
  );
}

/** Full-text search results. The index is built the first time it is needed. */
function AyahResults({ query }: { query: string }) {
  const i18n = useI18n();
  const { t } = i18n;
  const [attempt, setAttempt] = useState(0);
  const state = useAsync(`search:${attempt}`, loadSearchIndex);

  const result = useMemo<SearchResult | null>(
    () => (state.status === 'ready' ? searchAyahs(state.value.index, query, 50) : null),
    [state, query],
  );

  return (
    <Section title={t('quran.ayahResults')}>
      {state.status === 'error' ? (
        <ErrorState compact body={t('quran.searchError')} onRetry={() => setAttempt((value) => value + 1)} />
      ) : !result || state.status !== 'ready' ? (
        <LoadingState compact label={t('quran.searching')} />
      ) : result.total === 0 ? (
        <Typography variant="body2" color="textSecondary" role="status">
          {t('quran.noAyahResults')}
        </Typography>
      ) : (
        <>
          <Typography variant="body2" color="textSecondary" role="status" sx={{ mb: 1 }}>
            {t('quran.ayahResultsCount', { shown: result.matches.length, total: result.total })}
          </Typography>
          <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
            {result.matches.map(({ surah, ayah }, index) => {
              const info = getSurah(surah);
              if (!info) return null;
              return (
                <Box component="li" key={`${surah}:${ayah}`}>
                  {index > 0 && <Divider />}
                  <ButtonBase
                    component={Link}
                    to={`/quran/${surah}?ayah=${ayah}`}
                    sx={{ display: 'block', width: '100%', textAlign: 'start', py: 1.5, px: 1, borderRadius: 1 }}
                  >
                    <AyahPreview surah={surah} ayah={ayah} text={state.value.text[surah - 1]?.[ayah - 1]} />
                    <Typography variant="body2" color="textSecondary" component="span" sx={{ display: 'block', mt: 0.5 }}>
                      {t('quran.ayahRef', { surah: surahDisplayName(i18n, info), ayah })}
                    </Typography>
                  </ButtonBase>
                </Box>
              );
            })}
          </Box>
        </>
      )}
    </Section>
  );
}

function ContinueReading() {
  const i18n = useI18n();
  const { t } = i18n;
  const quran = useQuranState();
  const { lastRead } = quran;
  const surah = lastRead ? getSurah(lastRead.surah) : undefined;
  if (!lastRead || !surah) return null;
  // Progress is what has been read, not where the reader happens to be.
  const read = ayahsRead(quran, surah.id);
  const total = totalAyahsRead(quran);
  const percent = Math.floor((total / TOTAL_AYAHS) * 100);

  return (
    <ButtonBase
      component={Link}
      to={`/quran/${lastRead.surah}?ayah=${lastRead.ayah}`}
      sx={{
        display: 'block',
        width: '100%',
        textAlign: 'start',
        p: 2,
        borderRadius: 1,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant="overline" component="span" color="textSecondary" sx={{ display: 'block' }}>
        {t('home.continueReading')}
      </Typography>
      <Typography variant="subtitle1" component="span" sx={{ display: 'block' }}>
        {t('quran.ayahRef', { surah: surahDisplayName(i18n, surah), ayah: lastRead.ayah })}
      </Typography>
      <LinearProgress variant="determinate" value={(read / surah.ayahs) * 100} aria-hidden sx={{ my: 1.25 }} />
      <Typography variant="body2" color="textSecondary" component="span" sx={{ display: 'block' }}>
        {t('quran.readInSurah', { read, total: surah.ayahs })}
      </Typography>
      {total > 0 && (
        <Typography variant="body2" color="textSecondary" component="span" sx={{ display: 'block' }}>
          {percent < 1 ? t('quran.readOverallLow') : t('quran.readOverall', { percent })}
        </Typography>
      )}
    </ButtonBase>
  );
}

function Bookmarks() {
  const i18n = useI18n();
  const { t } = i18n;
  const { bookmarks } = useQuranState();

  if (bookmarks.length === 0) {
    return (
      <EmptyState
        icon={<BookmarkBorderOutlined />}
        title={t('quran.noBookmarksTitle')}
        body={t('quran.noBookmarksBody')}
      />
    );
  }

  return (
    <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
      {bookmarks.map((bookmark, index) => {
        const surah = getSurah(bookmark.surah);
        if (!surah) return null;
        const ref = t('quran.ayahRef', { surah: surahDisplayName(i18n, surah), ayah: bookmark.ayah });
        return (
          <Box component="li" key={`${bookmark.surah}:${bookmark.ayah}`}>
            {index > 0 && <Divider />}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ButtonBase
                component={Link}
                to={`/quran/${bookmark.surah}?ayah=${bookmark.ayah}`}
                sx={{ display: 'block', flex: 1, minWidth: 0, textAlign: 'start', py: 1.5, px: 1, borderRadius: 1 }}
              >
                <AyahPreview surah={bookmark.surah} ayah={bookmark.ayah} />
                <Typography variant="body2" color="textSecondary" component="span" sx={{ display: 'block', mt: 0.5 }}>
                  {ref}
                </Typography>
              </ButtonBase>
              <IconButton onClick={() => toggleBookmark(bookmark)} aria-label={t('quran.removeBookmarkFor', { ref })}>
                <BookmarkRemoveOutlined />
              </IconButton>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

export default function QuranPage() {
  const { t } = useI18n();
  const quran = useQuranState();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'surahs' | 'bookmarks'>('surahs');
  const deferredQuery = useDeferredValue(query);
  usePageTitle(t('quran.title'), t('app.name'));

  const searching = query.trim() !== '';
  const surahs = useMemo(() => matchSurahs(deferredQuery), [deferredQuery]);
  // Ayah text is Arabic, so only Arabic queries are worth a full-text search.
  const arabicQuery = /[\u0621-\u064A]/.test(deferredQuery) ? normalizeArabic(deferredQuery) : '';
  const searchAyahText = arabicQuery.length >= MIN_QUERY_LENGTH;

  return (
    <>
      <AppHeader title={t('quran.title')}>
        <TextField
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('quran.searchPlaceholder')}
          type="search"
          size="small"
          fullWidth
          autoComplete="off"
          slotProps={{
            htmlInput: { 'aria-label': t('common.search'), enterKeyHint: 'search' },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlined fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: searching ? (
                <InputAdornment position="end">
                  <IconButton size="small" edge="end" onClick={() => setQuery('')} aria-label={t('common.clear')}>
                    <ClearOutlined fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            },
          }}
        />
        {!searching && (
          <Tabs
            value={tab}
            onChange={(_, value: 'surahs' | 'bookmarks') => setTab(value)}
            variant="fullWidth"
            sx={{ mt: 0.5, borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab value="surahs" label={t('quran.surahs')} />
            <Tab value="bookmarks" label={t('quran.bookmarks')} />
          </Tabs>
        )}
      </AppHeader>

      <PageContent gap={2}>
        {searching ? (
          <>
            <Section title={t('quran.surahs')}>
              {surahs.length === 0 ? (
                <Typography variant="body2" color="textSecondary" role="status">
                  {t('quran.noSurahResults')}
                </Typography>
              ) : (
                <Box>
                  {surahs.map((surah) => (
                    <QuranSurahCard key={surah.id} surah={surah} read={ayahsRead(quran, surah.id)} />
                  ))}
                </Box>
              )}
            </Section>
            {searchAyahText ? (
              <AyahResults query={arabicQuery} />
            ) : (
              <Typography variant="body2" color="textSecondary">
                {t('quran.searchArabicHint')}
              </Typography>
            )}
          </>
        ) : tab === 'bookmarks' ? (
          <Bookmarks />
        ) : (
          <>
            <ContinueReading />
            <Box>
              {surahs.map((surah) => (
                <QuranSurahCard key={surah.id} surah={surah} read={ayahsRead(quran, surah.id)} />
              ))}
            </Box>
          </>
        )}
      </PageContent>
    </>
  );
}
