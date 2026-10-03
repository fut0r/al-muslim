import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router';
import { AppHeader } from '@/components/AppHeader';
import { MORE_DESTINATIONS } from '@/components/navigation';
import { PageContent } from '@/components/Page';
import { RowGroup, SettingItem } from '@/components/settings';
import { usePageTitle } from '@/hooks/useDeviceFeatures';
import { useI18n } from '@/i18n';

/** The screens that do not fit in the bottom navigation on a phone. */
export default function MorePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  usePageTitle(t('nav.more'), t('app.name'));

  return (
    <>
      <AppHeader title={t('nav.more')} />
      <PageContent>
        <RowGroup>
          {MORE_DESTINATIONS.map((destination) => (
            <SettingItem
              key={destination.path}
              icon={destination.icon}
              label={t(destination.label)}
              onClick={() => navigate(destination.path)}
            />
          ))}
        </RowGroup>
        <Typography variant="caption" color="textSecondary" sx={{ textAlign: 'center' }}>
          {t('app.name')} {__APP_VERSION__} · {t('settings.licenseValue')}
        </Typography>
      </PageContent>
    </>
  );
}
