import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { useI18n } from '@/i18n';

interface StateProps {
  icon?: ReactNode;
  title: string;
  body?: string;
  /** Buttons or links offered as the way forward. */
  actions?: ReactNode;
  compact?: boolean;
}

function StateLayout({ icon, title, body, actions, compact, role }: StateProps & { role?: 'alert' | 'status' }) {
  return (
    <Stack
      role={role}
      spacing={1.5}
      sx={{ alignItems: 'center', textAlign: 'center', py: compact ? 3 : 6, px: 2, mx: 'auto', maxWidth: 420 }}
    >
      {icon && (
        <Box aria-hidden sx={{ color: 'text.secondary', display: 'flex', '& svg': { fontSize: 40 } }}>
          {icon}
        </Box>
      )}
      <Typography variant="h2" component="p">
        {title}
      </Typography>
      {body && (
        <Typography variant="body2" color="textSecondary">
          {body}
        </Typography>
      )}
      {actions && (
        <Stack spacing={1} sx={{ pt: 1, width: '100%', maxWidth: 320 }}>
          {actions}
        </Stack>
      )}
    </Stack>
  );
}

/** Nothing to show yet, with a hint about what to do next. */
export function EmptyState(props: StateProps) {
  return <StateLayout {...props} />;
}

/** Something failed. Explains it in plain language and never shows technical detail. */
export function ErrorState({
  title,
  body,
  onRetry,
  actions,
  compact,
}: Omit<StateProps, 'icon' | 'title'> & { title?: string; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <StateLayout
      role="alert"
      compact={compact}
      icon={<ErrorOutlineOutlined />}
      title={title ?? t('errors.title')}
      body={body ?? t('errors.body')}
      actions={
        actions ??
        (onRetry && (
          <Button variant="outlined" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        ))
      }
    />
  );
}

export function LoadingState({ label, compact }: { label?: string; compact?: boolean }) {
  const { t } = useI18n();
  const text = label ?? t('common.loading');
  return (
    <Stack role="status" aria-live="polite" spacing={1.5} sx={{ alignItems: 'center', py: compact ? 3 : 8 }}>
      <CircularProgress size={28} thickness={4} aria-hidden />
      <Typography variant="body2" color="textSecondary">
        {text}
      </Typography>
    </Stack>
  );
}
