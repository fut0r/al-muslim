import Button from '@mui/material/Button';
import { Component, type ReactNode } from 'react';
import { useI18n } from '@/i18n';
import { ErrorState } from './states';

function Fallback() {
  const { t } = useI18n();
  return (
    <ErrorState
      actions={
        <Button variant="contained" onClick={() => window.location.reload()}>
          {t('errors.reload')}
        </Button>
      }
    />
  );
}

/**
 * Catches rendering errors so the user sees a calm message and a way out
 * instead of a blank screen or a stack trace.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    // Kept in the console for developers; never shown to the user or sent anywhere.
    console.error(error);
  }

  render() {
    return this.state.failed ? <Fallback /> : this.props.children;
  }
}
