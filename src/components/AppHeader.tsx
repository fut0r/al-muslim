import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useI18n } from '@/i18n';
import { LAYOUT, SAFE_AREA, gutter } from '@/theme/tokens';
import { Directional } from './icons';

interface AppHeaderProps {
  title: string;
  /** Small line under the title. */
  subtitle?: string;
  /** Path of the parent screen. Shows a back button when set. */
  backTo?: string;
  /** Icon buttons shown at the end of the bar. */
  actions?: ReactNode;
  /** Content pinned under the bar (search field, tabs, progress). */
  children?: ReactNode;
}

/**
 * The top bar of every screen. It stays visible while scrolling and keeps
 * clear of the status bar, notch and rounded corners.
 */
export function AppHeader({ title, subtitle, backTo, actions, children }: AppHeaderProps) {
  const { t } = useI18n();
  const compact = Boolean(backTo);

  return (
    <Box
      component="header"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 'appBar',
        bgcolor: 'background.default',
        pt: SAFE_AREA.top,
      }}
    >
      <Box
        sx={{
          mx: 'auto',
          maxWidth: LAYOUT.contentMaxWidth,
          minHeight: LAYOUT.headerHeight,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          pl: gutter(compact ? 4 : 16),
          pr: gutter(actions ? 4 : 16),
        }}
      >
        {backTo && (
          <IconButton component={Link} to={backTo} aria-label={t('common.back')} color="inherit">
            <Directional>
              <ArrowBackOutlined />
            </Directional>
          </IconButton>
        )}
        <Box sx={{ flex: 1, minWidth: 0, py: 1 }}>
          <Typography
            component="h1"
            variant={compact ? 'h2' : 'h1'}
            noWrap={compact}
            sx={{ overflowWrap: 'normal' }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="textSecondary" component="p" noWrap>
              {subtitle}
            </Typography>
          )}
        </Box>
        {actions && <Box sx={{ display: 'flex', flexShrink: 0 }}>{actions}</Box>}
      </Box>
      {children && (
        <Box
          sx={{
            mx: 'auto',
            maxWidth: LAYOUT.contentMaxWidth,
            px: gutter(),
          }}
        >
          {children}
        </Box>
      )}
    </Box>
  );
}
