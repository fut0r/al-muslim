import AddOutlined from '@mui/icons-material/AddOutlined';
import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import ArrowForwardOutlined from '@mui/icons-material/ArrowForwardOutlined';
import Bookmark from '@mui/icons-material/Bookmark';
import BookmarkBorderOutlined from '@mui/icons-material/BookmarkBorderOutlined';
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined';
import FormatSizeOutlined from '@mui/icons-material/FormatSizeOutlined';
import HeadphonesOutlined from '@mui/icons-material/HeadphonesOutlined';
import PinOutlined from '@mui/icons-material/PinOutlined';
import PlayArrowOutlined from '@mui/icons-material/PlayArrowOutlined';
import RemoveOutlined from '@mui/icons-material/RemoveOutlined';
import Box from '@mui/material/Box';
import { keyframes } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Popover from '@mui/material/Popover';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { memo, useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { AppHeader } from '@/components/AppHeader';
import { Directional } from '@/components/icons';
import { PageContent } from '@/components/Page';
import { ArabicText, ayahMarker, surahDisplayName, surahMeta, useSurahText } from '@/components/quran';
import { RECITATION_BAR_SPACE, RecitationBar } from '@/components/RecitationBar';
import { ChoiceDialog } from '@/components/settings';
import { ErrorState, LoadingState } from '@/components/states';
import { getReciter, RECITERS } from '@/data/reciters';
import { minimumReadingTime } from '@/domain/quran/progress';
import { showsBasmalah } from '@/domain/quran/types';
import { useKeepAwake, usePageTitle } from '@/hooks/useDeviceFeatures';
import { useMediaControls } from '@/hooks/useMediaControls';
import { useRecitation } from '@/hooks/useRecitation';
import { useI18n } from '@/i18n';
import { getSurah } from '@/services/quranRepository';
import { isBookmarked, markRead, setLastRead, toggleBookmark, useQuranState } from '@/stores/quran';
import { QURAN_FONT_SCALE, updateSettings, useSettings } from '@/stores/settings';
import { LAYOUT, SAFE_AREA } from '@/theme/tokens';
import NotFoundPage from './NotFoundPage';

const fadeHighlight = keyframes({
  '0%, 60%': { backgroundColor: 'var(--ayah-highlight)' },
  '100%': { backgroundColor: 'transparent' },
});

/** Space kept above an ayah when jumping to it, so the sticky header never covers it. */
const SCROLL_MARGIN = `calc(${LAYOUT.headerHeight}px + ${SAFE_AREA.top} + 24px)`;

interface AyahProps {
  number: number;
  text: string;
  bookmarked: boolean;
  highlighted: boolean;
  /** True while this ayah is being recited. */
  playing: boolean;
  bookmarkedLabel: string;
  onSelect(number: number, element: HTMLElement): void;
}

/** One ayah inside the flowing text. Tapping it opens the ayah actions. */
const Ayah = memo(function Ayah({ number, text, bookmarked, highlighted, playing, bookmarkedLabel, onSelect }: AyahProps) {
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(number, event.currentTarget);
    }
  };
  return (
    <Box
      component="span"
      id={`ayah-${number}`}
      data-ayah={number}
      role="button"
      tabIndex={0}
      aria-haspopup="menu"
      aria-current={playing ? 'true' : undefined}
      onClick={(event) => onSelect(number, event.currentTarget)}
      onKeyDown={onKeyDown}
      sx={{
        cursor: 'pointer',
        scrollMarginTop: SCROLL_MARGIN,
        borderRadius: '6px',
        boxDecorationBreak: 'clone',
        WebkitBoxDecorationBreak: 'clone',
        // The ayah that was jumped to is tinted briefly so the eye can find it.
        animation: highlighted && !playing ? `${fadeHighlight} 2600ms ease-out 1` : 'none',
        bgcolor: playing ? 'action.selected' : 'transparent',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      {text}{' '}
      <Box component="span" sx={{ color: 'primary.main', whiteSpace: 'nowrap' }}>
        {ayahMarker(number)}
        {bookmarked && (
          <Bookmark
            titleAccess={bookmarkedLabel}
            sx={{ fontSize: '0.5em', verticalAlign: 'middle', marginInlineStart: '0.15em' }}
          />
        )}
      </Box>{' '}
    </Box>
  );
});

function GoToAyahDialog({ open, max, onClose, onGo }: { open: boolean; max: number; onClose(): void; onGo(ayah: number): void }) {
  const { t } = useI18n();
  const titleId = useId();
  const [value, setValue] = useState('');
  const parsed = /^\d{1,3}$/.test(value.trim()) ? Number(value.trim()) : NaN;
  const valid = parsed >= 1 && parsed <= max;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby={titleId}>
      <Stack
        component="form"
        spacing={2}
        sx={{ p: 3 }}
        onSubmit={(event) => {
          event.preventDefault();
          if (!valid) return;
          onGo(parsed);
          setValue('');
        }}
      >
        <Typography id={titleId} variant="h2" component="h2">
          {t('quran.goToAyah')}
        </Typography>
        <TextField
          autoFocus
          value={value}
          onChange={(event) => setValue(event.target.value)}
          label={t('quran.goToAyahRange', { max })}
          error={value !== '' && !valid}
          fullWidth
          slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*', dir: 'ltr', enterKeyHint: 'go' } }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button onClick={onClose} color="inherit">
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="contained" disabled={!valid}>
            {t('quran.go')}
          </Button>
        </Box>
      </Stack>
    </Dialog>
  );
}

export default function QuranReaderPage() {
  const params = useParams();
  const surahId = Number(params.surahId);
  const surah = /^\d{1,3}$/.test(params.surahId ?? '') ? getSurah(surahId) : undefined;
  return surah ? <Reader key={surah.id} surahId={surah.id} /> : <NotFoundPage />;
}

function Reader({ surahId }: { surahId: number }) {
  const i18n = useI18n();
  const { t } = i18n;
  const surah = getSurah(surahId)!;
  const { quranFontScale, reciter: reciterId } = useSettings();
  const recitation = useRecitation(surahId, reciterId);
  const reciter = getReciter(reciterId);
  const reciterName = i18n.language === 'ar' ? reciter.name.ar : reciter.name.en;
  const quran = useQuranState();
  const [searchParams, setSearchParams] = useSearchParams();
  const [attempt, setAttempt] = useState(0);
  const text = useSurahText(surahId, attempt);
  const basmalah = useSurahText(1);
  useKeepAwake();
  usePageTitle(surahDisplayName(i18n, surah), t('app.name'));

  const requested = Number(searchParams.get('ayah'));
  const targetAyah = Number.isInteger(requested) && requested >= 1 && requested <= surah.ayahs ? requested : null;

  const [currentAyah, setCurrentAyah] = useState(targetAyah ?? 1);
  // True once the end of the surah is on screen, so its last ayahs can be read without scrolling further.
  const [endVisible, setEndVisible] = useState(false);
  const [menu, setMenu] = useState<{ ayah: number; anchor: HTMLElement } | null>(null);
  const [goToOpen, setGoToOpen] = useState(false);
  const [sizeAnchor, setSizeAnchor] = useState<HTMLElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [reciterOpen, setReciterOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const ready = text.status === 'ready';

  // Jump to the requested ayah once the text is on screen (and again when the
  // Quran font finishes loading, since that changes line heights).
  useEffect(() => {
    if (!ready || targetAyah === null) return;
    const jump = () => document.getElementById(`ayah-${targetAyah}`)?.scrollIntoView({ block: 'start' });
    jump();
    let cancelled = false;
    void document.fonts?.ready.then(() => {
      if (!cancelled) jump();
    });
    return () => {
      cancelled = true;
    };
  }, [ready, targetAyah]);

  // Track the ayah at the top of the screen as the reading position.
  const lastOnScreen = useRef(targetAyah ?? 1);
  useEffect(() => {
    if (!ready) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const nodes = container.current?.querySelectorAll<HTMLElement>('[data-ayah]');
      if (!nodes || nodes.length === 0) return;
      // The last ayah that begins at or above a line. Ayahs are in document
      // order, so a binary search works.
      const lastAbove = (line: number) => {
        let low = 0;
        let high = nodes.length - 1;
        while (low < high) {
          const middle = (low + high + 1) >> 1;
          if (nodes[middle]!.getBoundingClientRect().top <= line) low = middle;
          else high = middle - 1;
        }
        return Number(nodes[low]!.dataset.ayah);
      };
      // The reading position is the ayah at the line just under the header.
      setCurrentAyah(lastAbove(LAYOUT.headerHeight + 64));
      const bottom = window.innerHeight - LAYOUT.bottomNavHeight;
      lastOnScreen.current = lastAbove(bottom);
      setEndVisible(nodes[nodes.length - 1]!.getBoundingClientRect().bottom <= bottom);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    // Measure once without waiting for a scroll: a short surah may never need one.
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [ready]);

  // Save the position shortly after the reader settles on an ayah.
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => setLastRead({ surah: surahId, ayah: currentAyah }), 700);
    return () => window.clearTimeout(timer);
  }, [ready, surahId, currentAyah]);

  // Reading progress counts the ayahs that were actually read, never the
  // position alone. Each time the reader comes to rest, the ayahs that have
  // gone above the reading line are counted if they were on screen at the
  // previous rest and there was time to read them. Jumping or flinging ahead
  // therefore counts nothing for the ayahs that were skipped.
  const ayahs = text.status === 'ready' ? text.ayahs : null;
  const rest = useRef({ ayah: targetAyah ?? 1, at: 0, lastOnScreen: targetAyah ?? 1 });
  useEffect(() => {
    if (!ayahs) return;
    const timer = window.setTimeout(() => {
      const previous = rest.current;
      const now = performance.now();
      const until = Math.min(currentAyah - 1, previous.lastOnScreen);
      if (previous.at > 0 && until >= previous.ayah) {
        let characters = 0;
        for (let ayah = previous.ayah; ayah <= until; ayah += 1) characters += ayahs[ayah - 1]!.length;
        if (now - previous.at >= minimumReadingTime(characters)) markRead(surahId, previous.ayah, until);
      }
      rest.current = { ayah: currentAyah, at: now, lastOnScreen: lastOnScreen.current };
    }, 700);
    return () => window.clearTimeout(timer);
  }, [ayahs, currentAyah, surahId]);

  // The last ayahs of a surah never rise to the reading line. Once the end is
  // on screen they are counted after the time it takes to read them.
  useEffect(() => {
    if (!ayahs || !endVisible) return;
    let characters = 0;
    for (let ayah = currentAyah; ayah <= ayahs.length; ayah += 1) characters += ayahs[ayah - 1]!.length;
    const timer = window.setTimeout(
      () => markRead(surahId, currentAyah, ayahs.length),
      Math.max(1500, minimumReadingTime(characters)),
    );
    return () => window.clearTimeout(timer);
  }, [ayahs, endVisible, currentAyah, surahId]);

  // Keep the ayah being recited in view.
  const playingAyah = recitation.ayah;
  useEffect(() => {
    if (playingAyah === null) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    document
      .getElementById(`ayah-${playingAyah}`)
      ?.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [playingAyah]);
  const listening = recitation.state.status !== 'idle';

  // What the system's media controls show while listening, in and out of the app.
  const surahTitle = surahDisplayName(i18n, surah);
  useMediaControls(recitation, {
    title:
      playingAyah === null
        ? surahTitle
        : recitation.state.leadIn && showsBasmalah(surahId)
          ? `${surahTitle} · ${t('quran.basmalah')}`
          : t('quran.ayahRef', { surah: surahTitle, ayah: playingAyah }),
    artist: reciterName,
    album: t('quran.title'),
    hasNext: playingAyah !== null && playingAyah < surah.ayahs,
    labels: {
      channel: t('quran.playerChannel'),
      play: t('quran.play'),
      pause: t('quran.pause'),
      next: t('quran.nextAyah'),
      previous: t('quran.previousAyah'),
      stop: t('quran.stopListening'),
    },
  });

  const onSelect = useCallback((ayah: number, anchor: HTMLElement) => setMenu({ ayah, anchor }), [setMenu]);
  const bookmarkedAyahs = useMemo(
    () => new Set(quran.bookmarks.filter((b) => b.surah === surahId).map((b) => b.ayah)),
    [quran.bookmarks, surahId],
  );

  const setScale = (delta: number) => {
    const next = Math.round((quranFontScale + delta) * 10) / 10;
    updateSettings({ quranFontScale: Math.min(QURAN_FONT_SCALE.max, Math.max(QURAN_FONT_SCALE.min, next)) });
  };

  const copyAyah = async (ayah: number) => {
    if (text.status !== 'ready') return;
    try {
      await navigator.clipboard.writeText(`${text.ayahs[ayah - 1]} ﴿${surah.name}: ${ayah}﴾`);
      setCopied(true);
    } catch {
      // Clipboard access can be refused; there is nothing useful to report.
    }
  };

  const previous = getSurah(surahId - 1);
  const next = getSurah(surahId + 1);
  const canCopy = typeof navigator !== 'undefined' && Boolean(navigator.clipboard);
  const menuBookmarked = menu ? isBookmarked(quran, { surah: surahId, ayah: menu.ayah }) : false;

  return (
    <>
      <AppHeader
        title={surahDisplayName(i18n, surah)}
        subtitle={surahMeta(i18n, surah)}
        backTo="/quran"
        actions={
          <>
            <IconButton
              onClick={() => (listening ? recitation.stop() : recitation.playFrom(currentAyah))}
              aria-label={listening ? t('quran.stopListening') : t('quran.listen')}
              aria-pressed={listening}
              color={listening ? 'primary' : 'inherit'}
              disabled={!ready}
            >
              <HeadphonesOutlined />
            </IconButton>
            <IconButton onClick={() => setGoToOpen(true)} aria-label={t('quran.goToAyah')} color="inherit">
              <PinOutlined />
            </IconButton>
            <IconButton
              onClick={(event) => setSizeAnchor(event.currentTarget)}
              aria-label={t('quran.textSize')}
              aria-haspopup="dialog"
              color="inherit"
            >
              <FormatSizeOutlined />
            </IconButton>
          </>
        }
      >
        <LinearProgress
          variant="determinate"
          value={(currentAyah / surah.ayahs) * 100}
          aria-label={t('quran.readingPosition', { ayah: currentAyah, total: surah.ayahs })}
          sx={{ height: 2, borderRadius: 0 }}
        />
      </AppHeader>

      <PageContent>
        {text.status === 'loading' ? (
          <LoadingState />
        ) : text.status === 'error' ? (
          <ErrorState
            title={t('quran.loadErrorTitle')}
            body={t('quran.loadErrorBody')}
            onRetry={() => setAttempt((value) => value + 1)}
          />
        ) : (
          <Box ref={container} sx={{ pt: 1 }}>
            <Box component="header" sx={{ textAlign: 'center', mb: 2 }}>
              <ArabicText size={1.75} scale={quranFontScale} sx={{ textAlign: 'center', lineHeight: 1.9 }}>
                سورة {surah.name}
              </ArabicText>
              {showsBasmalah(surahId) && basmalah.status === 'ready' && (
                <ArabicText size={1.375} scale={quranFontScale} sx={{ textAlign: 'center', color: 'text.secondary', mt: 1 }}>
                  {basmalah.ayahs[0]}
                </ArabicText>
              )}
            </Box>
            <ArabicText
              scale={quranFontScale}
              sx={{ textAlign: 'justify', '--ayah-highlight': (theme) => theme.palette.action.selected }}
            >
              {text.ayahs.map((ayah, index) => (
                <Ayah
                  key={index}
                  number={index + 1}
                  text={ayah}
                  bookmarked={bookmarkedAyahs.has(index + 1)}
                  highlighted={targetAyah === index + 1}
                  playing={playingAyah === index + 1}
                  bookmarkedLabel={t('quran.bookmarked')}
                  onSelect={onSelect}
                />
              ))}
            </ArabicText>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, mt: 5, flexWrap: 'wrap' }}>
              {previous ? (
                <Button
                  component={Link}
                  to={`/quran/${previous.id}`}
                  variant="outlined"
                  color="inherit"
                  aria-label={`${t('quran.previousSurah')}: ${surahDisplayName(i18n, previous)}`}
                  startIcon={
                    <Directional>
                      <ArrowBackOutlined />
                    </Directional>
                  }
                >
                  {surahDisplayName(i18n, previous)}
                </Button>
              ) : (
                <span />
              )}
              {next && (
                <Button
                  component={Link}
                  to={`/quran/${next.id}`}
                  variant="outlined"
                  color="inherit"
                  aria-label={`${t('quran.nextSurah')}: ${surahDisplayName(i18n, next)}`}
                  endIcon={
                    <Directional>
                      <ArrowForwardOutlined />
                    </Directional>
                  }
                >
                  {surahDisplayName(i18n, next)}
                </Button>
              )}
            </Box>
            {listening && <Box aria-hidden sx={{ height: RECITATION_BAR_SPACE }} />}
          </Box>
        )}
      </PageContent>

      <RecitationBar
        recitation={recitation}
        reciterName={reciterName}
        basmalah={showsBasmalah(surahId)}
        onChooseReciter={() => setReciterOpen(true)}
      />

      <Menu open={menu !== null} anchorEl={menu?.anchor} onClose={() => setMenu(null)}>
        <Typography variant="caption" color="textSecondary" component="p" sx={{ px: 2, pb: 0.5 }}>
          {menu ? t('quran.ayahNumber', { number: menu.ayah }) : ''}
        </Typography>
        <MenuItem
          onClick={() => {
            if (menu) toggleBookmark({ surah: surahId, ayah: menu.ayah });
            setMenu(null);
          }}
        >
          <ListItemIcon>{menuBookmarked ? <Bookmark /> : <BookmarkBorderOutlined />}</ListItemIcon>
          <ListItemText>{menuBookmarked ? t('quran.removeBookmark') : t('quran.bookmark')}</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menu) recitation.playFrom(menu.ayah);
            setMenu(null);
          }}
        >
          <ListItemIcon>
            <PlayArrowOutlined />
          </ListItemIcon>
          <ListItemText>{t('quran.playFromHere')}</ListItemText>
        </MenuItem>
        {canCopy && (
          <MenuItem
            onClick={() => {
              if (menu) void copyAyah(menu.ayah);
              setMenu(null);
            }}
          >
            <ListItemIcon>
              <ContentCopyOutlined />
            </ListItemIcon>
            <ListItemText>{t('quran.copy')}</ListItemText>
          </MenuItem>
        )}
      </Menu>

      <Popover
        open={sizeAnchor !== null}
        anchorEl={sizeAnchor}
        onClose={() => setSizeAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box role="group" aria-label={t('quran.textSize')} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1 }}>
          <IconButton
            onClick={() => setScale(-QURAN_FONT_SCALE.step)}
            disabled={quranFontScale <= QURAN_FONT_SCALE.min}
            aria-label={t('quran.smaller')}
          >
            <RemoveOutlined />
          </IconButton>
          <Typography variant="subtitle2" component="output" aria-live="polite" sx={{ minWidth: 52, textAlign: 'center' }}>
            {Math.round(quranFontScale * 100)}%
          </Typography>
          <IconButton
            onClick={() => setScale(QURAN_FONT_SCALE.step)}
            disabled={quranFontScale >= QURAN_FONT_SCALE.max}
            aria-label={t('quran.larger')}
          >
            <AddOutlined />
          </IconButton>
        </Box>
      </Popover>

      <ChoiceDialog
        open={reciterOpen}
        title={t('quran.reciter')}
        value={reciterId}
        onChange={(value) => updateSettings({ reciter: value })}
        onClose={() => setReciterOpen(false)}
        note={t('quran.audioNote')}
        options={RECITERS.map((item) => ({
          value: item.id,
          label: i18n.language === 'ar' ? item.name.ar : item.name.en,
          description: i18n.language === 'ar' ? item.detail.ar : item.detail.en,
        }))}
      />

      <GoToAyahDialog
        open={goToOpen}
        max={surah.ayahs}
        onClose={() => setGoToOpen(false)}
        onGo={(ayah) => {
          setGoToOpen(false);
          setSearchParams({ ayah: String(ayah) }, { replace: true });
          // Also covers asking for the ayah that is already in the address.
          document.getElementById(`ayah-${ayah}`)?.scrollIntoView({ block: 'start' });
        }}
      />

      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        message={t('common.copied')}
        sx={{ bottom: `calc(${LAYOUT.bottomNavHeight}px + ${SAFE_AREA.bottom} + 12px) !important` }}
      />
    </>
  );
}
