import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import BedtimeOutlined from '@mui/icons-material/BedtimeOutlined';
import ChevronRightOutlined from '@mui/icons-material/ChevronRightOutlined';
import MosqueOutlined from '@mui/icons-material/MosqueOutlined';
import WbSunnyOutlined from '@mui/icons-material/WbSunnyOutlined';
import WbTwilightOutlined from '@mui/icons-material/WbTwilightOutlined';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router';
import { AppHeader } from '@/components/AppHeader';
import { Directional } from '@/components/icons';
import { PageContent, Surface } from '@/components/Page';
import { ADHKAR, ADHKAR_CATEGORY_IDS, type AdhkarCategoryId } from '@/data/adhkar';
import { useAdhkarDay } from '@/hooks/useAdhkarDay';
import { usePageTitle } from '@/hooks/useDeviceFeatures';
import { useI18n } from '@/i18n';
import { useAdhkarProgress } from '@/stores/adhkar';

const ADHKAR_ICONS: Record<AdhkarCategoryId, ReactNode> = {
  morning: <WbSunnyOutlined />,
  evening: <WbTwilightOutlined />,
  sleep: <BedtimeOutlined />,
  afterPrayer: <MosqueOutlined />,
  general: <AutoAwesomeOutlined />,
};

export default function AdhkarPage() {
  const { t } = useI18n();
  const progress = useAdhkarProgress(useAdhkarDay());
  usePageTitle(t('adhkar.title'), t('app.name'));

  return (
    <>
      <AppHeader title={t('adhkar.title')} />
      <PageContent>
        <Surface>
          {ADHKAR_CATEGORY_IDS.map((id, index) => {
            const items = ADHKAR[id].items;
            const done = items.filter((item) => (progress.counts[item.id] ?? 0) >= item.count).length;
            const complete = done === items.length;
            return (
              <Fragment key={id}>
                {index > 0 && <Divider />}
                <ButtonBase
                  component={Link}
                  to={`/adhkar/${id}`}
                  sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', px: 2, py: 1.75, textAlign: 'start' }}
                >
                  <Box aria-hidden sx={{ display: 'flex', color: 'primary.main' }}>
                    {ADHKAR_ICONS[id]}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" component="span" sx={{ display: 'block' }}>
                      {t(`adhkar.categories.${id}`)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" component="span" sx={{ display: 'block' }}>
                      {t(`adhkar.categoryHints.${id}`)}
                    </Typography>
                    <LinearProgress variant="determinate" value={(done / items.length) * 100} aria-hidden sx={{ mt: 1.25, mb: 0.75 }} />
                    <Typography variant="caption" color="textSecondary" component="span" sx={{ display: 'block' }}>
                      {complete ? t('adhkar.allDone') : t('adhkar.completedOf', { done, total: items.length })}
                    </Typography>
                  </Box>
                  <Box aria-hidden sx={{ display: 'flex', color: 'text.disabled' }}>
                    <Directional>
                      <ChevronRightOutlined />
                    </Directional>
                  </Box>
                </ButtonBase>
              </Fragment>
            );
          })}
        </Surface>
        <Typography variant="body2" color="textSecondary">
          {t('adhkar.dailyReset')}
        </Typography>
      </PageContent>
    </>
  );
}
