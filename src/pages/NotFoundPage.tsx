import Button from '@mui/material/Button';
import { Link } from 'react-router';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/states';
import { usePageTitle } from '@/hooks/useDeviceFeatures';
import { useI18n } from '@/i18n';

export default function NotFoundPage() {
  const { t } = useI18n();
  usePageTitle(t('errors.notFoundTitle'), t('app.name'));

  return (
    <>
      <AppHeader title={t('errors.notFoundTitle')} />
      <EmptyState
        title={t('errors.notFoundTitle')}
        body={t('errors.notFoundBody')}
        actions={
          <Button component={Link} to="/" variant="contained">
            {t('errors.goHome')}
          </Button>
        }
      />
    </>
  );
}
