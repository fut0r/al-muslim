import RestartAltOutlined from '@mui/icons-material/RestartAltOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { useCallback, useId, useState } from 'react';
import { useParams } from 'react-router';
import { DhikrCard } from '@/components/adhkar';
import { AppHeader } from '@/components/AppHeader';
import { PageContent } from '@/components/Page';
import { ADHKAR, isAdhkarCategoryId, type AdhkarCategoryId, type Dhikr } from '@/data/adhkar';
import { useAdhkarDay } from '@/hooks/useAdhkarDay';
import { useKeepAwake, usePageTitle } from '@/hooks/useDeviceFeatures';
import { useI18n } from '@/i18n';
import { haptic } from '@/services/haptics';
import { adhkarStore, resetDhikrCounts, setDhikrCount, useAdhkarProgress } from '@/stores/adhkar';
import { settingsStore } from '@/stores/settings';
import NotFoundPage from './NotFoundPage';

export default function AdhkarCategoryPage() {
  const { categoryId } = useParams();
  return isAdhkarCategoryId(categoryId) ? <Category key={categoryId} id={categoryId} /> : <NotFoundPage />;
}

function Category({ id }: { id: AdhkarCategoryId }) {
  const { t } = useI18n();
  const today = useAdhkarDay();
  const progress = useAdhkarProgress(today);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const confirmTitleId = useId();
  const items = ADHKAR[id].items;
  const title = t(`adhkar.categories.${id}`);
  useKeepAwake();
  usePageTitle(title, t('app.name'));

  const done = items.filter((item) => (progress.counts[item.id] ?? 0) >= item.count).length;
  const anyProgress = items.some((item) => (progress.counts[item.id] ?? 0) > 0);

  // Stable callbacks that read the latest state, so cards do not all re-render on each tap.
  const onCount = useCallback(
    (dhikr: Dhikr) => {
      const state = adhkarStore.get();
      const current = state.day === today ? (state.counts[dhikr.id] ?? 0) : 0;
      if (current >= dhikr.count) return;
      const next = current + 1;
      setDhikrCount(today, dhikr.id, next);
      if (settingsStore.get().haptics) haptic(next >= dhikr.count ? 'complete' : 'tap');
    },
    [today],
  );
  const onReset = useCallback((dhikr: Dhikr) => setDhikrCount(today, dhikr.id, 0), [today]);

  return (
    <>
      <AppHeader
        title={title}
        subtitle={done === items.length ? t('adhkar.allDone') : t('adhkar.completedOf', { done, total: items.length })}
        backTo="/adhkar"
        actions={
          <IconButton
            onClick={() => setConfirmOpen(true)}
            disabled={!anyProgress}
            aria-label={t('adhkar.resetAll')}
            color="inherit"
          >
            <RestartAltOutlined />
          </IconButton>
        }
      >
        <LinearProgress variant="determinate" value={(done / items.length) * 100} aria-hidden sx={{ height: 2, borderRadius: 0 }} />
      </AppHeader>

      <PageContent gap={2}>
        {items.map((dhikr) => (
          <DhikrCard key={dhikr.id} dhikr={dhikr} count={progress.counts[dhikr.id] ?? 0} onCount={onCount} onReset={onReset} />
        ))}
        <Typography variant="body2" color="textSecondary">
          {t('adhkar.dailyReset')}
        </Typography>
      </PageContent>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} fullWidth maxWidth="xs" aria-labelledby={confirmTitleId}>
        <Box sx={{ p: 3 }}>
          <Typography id={confirmTitleId} variant="h2" component="h2">
            {t('adhkar.resetAllConfirm')}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
            <Button color="inherit" onClick={() => setConfirmOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                resetDhikrCounts(today, items.map((item) => item.id));
                setConfirmOpen(false);
              }}
            >
              {t('adhkar.resetAll')}
            </Button>
          </Box>
        </Box>
      </Dialog>
    </>
  );
}
