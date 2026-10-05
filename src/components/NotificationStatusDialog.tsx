import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { useId } from 'react';
import { useI18n, type I18n, type TranslationKey } from '@/i18n';
import type { NotificationStatus } from '@/services/notifications';

const PERMISSION_LABELS: Record<NotificationStatus['permission'], TranslationKey> = {
  granted: 'settings.permissionGranted',
  denied: 'settings.permissionDenied',
  prompt: 'settings.permissionPrompt',
  unsupported: 'settings.statusUnavailable',
};

/** A date and time such as "Tue 6 Oct, 4:31 AM", in the app's language. */
export function formatMoment(i18n: I18n, date: Date, hour12: boolean): string {
  try {
    return new Intl.DateTimeFormat(i18n.locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12,
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

/**
 * The same facts in plain English, for pasting into a bug report. It holds
 * nothing personal: no location, no prayer times beyond the next one.
 */
export function describeStatus(status: NotificationStatus, enabledInApp: boolean): string {
  const moment = (date: Date | null) => (date ? date.toISOString() : '-');
  const flag = (value: boolean | undefined) => (value === undefined ? '-' : String(value));
  return [
    `Al-Muslim ${__APP_VERSION__}`,
    `platform: ${status.platform}`,
    `permission: ${status.permission}`,
    `enabled in app: ${enabledInApp}`,
    `pending: ${status.pending}`,
    `next: ${moment(status.next)}`,
    `last shown: ${moment(status.lastShown)}`,
    `exact timing: ${flag(status.exactTiming)}`,
    `battery restricted: ${flag(status.batteryRestricted)}`,
    `category blocked: ${flag(status.channelBlocked)}`,
    `device: ${status.device ?? '-'}`,
    `error: ${status.error ?? '-'}`,
  ].join('\n');
}

interface NotificationStatusDialogProps {
  open: boolean;
  status: NotificationStatus | null;
  /** Whether prayer notifications are switched on in the app. */
  enabledInApp: boolean;
  hour12: boolean;
  onRefresh(): void;
  onCopied(): void;
  onClose(): void;
}

/**
 * What the system really has for prayer notifications: the permission, how
 * many are waiting and when the next is due, and anything standing in the way.
 */
export function NotificationStatusDialog({
  open,
  status,
  enabledInApp,
  hour12,
  onRefresh,
  onCopied,
  onClose,
}: NotificationStatusDialogProps) {
  const i18n = useI18n();
  const { t } = i18n;
  const titleId = useId();
  const none = t('settings.statusNone');
  const moment = (date: Date | null) => (date ? formatMoment(i18n, date, hour12) : none);

  const rows: { label: string; value: string; problem?: boolean; technical?: boolean }[] = status
    ? [
        { label: t('settings.statusPermission'), value: t(PERMISSION_LABELS[status.permission]), problem: status.permission !== 'granted' },
        { label: t('settings.statusPending'), value: t('settings.statusPendingValue', { count: status.pending }) },
        { label: t('settings.statusNext'), value: moment(status.next) },
        { label: t('settings.statusLastShown'), value: moment(status.lastShown) },
      ]
    : [];
  if (status?.exactTiming !== undefined) {
    rows.push({
      label: t('settings.statusExact'),
      value: t(status.exactTiming ? 'settings.statusAllowed' : 'settings.statusNotAllowed'),
      problem: !status.exactTiming,
    });
  }
  if (status?.batteryRestricted !== undefined) {
    rows.push({
      label: t('settings.statusBackground'),
      value: t(status.batteryRestricted ? 'settings.statusRestricted' : 'settings.statusUnrestricted'),
      problem: status.batteryRestricted,
    });
  }
  if (status?.channelBlocked !== undefined) {
    rows.push({
      label: t('settings.statusCategory'),
      value: t(status.channelBlocked ? 'settings.statusMuted' : 'settings.statusActive'),
      problem: status.channelBlocked,
    });
  }
  if (status?.device) rows.push({ label: t('settings.statusDevice'), value: status.device, technical: true });
  if (status?.error) rows.push({ label: t('settings.statusError'), value: status.error, problem: true, technical: true });

  const copy = async () => {
    if (!status) return;
    try {
      await navigator.clipboard.writeText(describeStatus(status, enabledInApp));
      onCopied();
    } catch {
      // Clipboard access can be refused; the details stay on screen.
    }
  };
  const canCopy = typeof navigator !== 'undefined' && Boolean(navigator.clipboard);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby={titleId}>
      <Box sx={{ p: 3 }}>
        <Typography id={titleId} variant="h2" component="h2">
          {t('settings.notificationStatus')}
        </Typography>
        <Box component="dl" sx={{ m: 0, mt: 2 }}>
          {rows.map((row, index) => (
            <Box key={row.label}>
              {index > 0 && <Divider />}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2, py: 1 }}>
                <Typography variant="body2" color="textSecondary" component="dt" sx={{ flexShrink: 0 }}>
                  {row.label}
                </Typography>
                <Typography
                  variant="body2"
                  component="dd"
                  color={row.problem ? 'error' : 'textPrimary'}
                  dir={row.technical ? 'ltr' : undefined}
                  sx={{ m: 0, textAlign: 'end', overflowWrap: 'anywhere' }}
                >
                  {row.value}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 1, mt: 2 }}>
          {canCopy && (
            <Button color="inherit" onClick={() => void copy()} disabled={!status}>
              {t('settings.statusCopy')}
            </Button>
          )}
          <Button color="inherit" onClick={onRefresh}>
            {t('settings.statusRefresh')}
          </Button>
          <Button variant="contained" onClick={onClose}>
            {t('common.close')}
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}
