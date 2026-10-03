import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import ExploreOutlined from '@mui/icons-material/ExploreOutlined';
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import MoreHorizOutlined from '@mui/icons-material/MoreHorizOutlined';
import MosqueOutlined from '@mui/icons-material/MosqueOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { useI18n, type TranslationKey } from '@/i18n';
import { LAYOUT, SAFE_AREA, gutter } from '@/theme/tokens';
import { LogoMark, TasbihIcon } from './icons';

interface Destination {
  path: string;
  label: TranslationKey;
  icon: ReactNode;
  /** Extra path prefixes that belong to this destination. */
  owns?: string[];
}

const HOME: Destination = { path: '/', label: 'nav.home', icon: <HomeOutlined /> };
const PRAYERS: Destination = { path: '/prayers', label: 'nav.prayers', icon: <MosqueOutlined /> };
const QURAN: Destination = { path: '/quran', label: 'nav.quran', icon: <MenuBookOutlined /> };
const ADHKAR: Destination = { path: '/adhkar', label: 'nav.adhkar', icon: <TasbihIcon /> };
const QIBLAH: Destination = { path: '/qiblah', label: 'nav.qiblah', icon: <ExploreOutlined /> };
const CALENDAR: Destination = { path: '/calendar', label: 'nav.calendar', icon: <CalendarMonthOutlined /> };
const SETTINGS: Destination = { path: '/settings', label: 'nav.settings', icon: <SettingsOutlined /> };
const MORE: Destination = {
  path: '/more',
  label: 'nav.more',
  icon: <MoreHorizOutlined />,
  owns: ['/qiblah', '/calendar', '/settings'],
};

/** Phones: five destinations at most, so every target stays large. */
const BOTTOM_DESTINATIONS = [HOME, PRAYERS, QURAN, ADHKAR, MORE];
/** Wide screens have room for every screen. */
const RAIL_DESTINATIONS = [HOME, PRAYERS, QURAN, ADHKAR, QIBLAH, CALENDAR, SETTINGS];
export const MORE_DESTINATIONS = [QIBLAH, CALENDAR, SETTINGS];

function isActive(destination: Destination, pathname: string): boolean {
  if (destination.path === '/') return pathname === '/';
  return [destination.path, ...(destination.owns ?? [])].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function useActivePath(destinations: Destination[]): string | false {
  const { pathname } = useLocation();
  return destinations.find((destination) => isActive(destination, pathname))?.path ?? false;
}

export function BottomNav() {
  const { t } = useI18n();
  const active = useActivePath(BOTTOM_DESTINATIONS);

  return (
    <Box
      component="nav"
      aria-label={t('nav.label')}
      sx={{
        position: 'fixed',
        insetInline: 0,
        bottom: 0,
        zIndex: 'appBar',
        bgcolor: 'background.default',
        borderTop: 1,
        borderColor: 'divider',
        // Sit above the system gesture bar, never under it.
        pb: SAFE_AREA.bottom,
        px: gutter(0),
      }}
    >
      <BottomNavigation showLabels value={active} sx={{ mx: 'auto', maxWidth: 560 }}>
        {BOTTOM_DESTINATIONS.map((destination) => (
          <BottomNavigationAction
            key={destination.path}
            value={destination.path}
            label={t(destination.label)}
            icon={destination.icon}
            component={Link}
            to={destination.path}
            aria-current={active === destination.path ? 'page' : undefined}
          />
        ))}
      </BottomNavigation>
    </Box>
  );
}

export function NavRail() {
  const { t } = useI18n();
  const active = useActivePath(RAIL_DESTINATIONS);

  return (
    <Box
      component="nav"
      aria-label={t('nav.label')}
      sx={{
        position: 'fixed',
        insetBlock: 0,
        insetInlineStart: 0,
        width: LAYOUT.railWidth,
        zIndex: 'appBar',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
        py: 2,
        borderInlineEnd: 1,
        borderColor: 'divider',
        bgcolor: 'background.default',
        overflowY: 'auto',
      }}
    >
      <Box sx={{ color: 'primary.main', mb: 1.5 }}>
        <LogoMark size={36} title={t('app.name')} />
      </Box>
      {RAIL_DESTINATIONS.map((destination) => {
        const selected = active === destination.path;
        return (
          <ButtonBase
            key={destination.path}
            component={Link}
            to={destination.path}
            aria-current={selected ? 'page' : undefined}
            sx={{
              width: 72,
              minHeight: 60,
              flexDirection: 'column',
              gap: 0.25,
              borderRadius: 1,
              color: selected ? 'primary.main' : 'text.secondary',
              bgcolor: selected ? 'action.selected' : 'transparent',
              '&:hover': { bgcolor: selected ? 'action.selected' : 'action.hover' },
            }}
          >
            {destination.icon}
            <Typography variant="caption" sx={{ fontFamily: (theme) => theme.app.fonts.heading, fontWeight: selected ? 600 : 500, fontSize: '0.6875rem' }}>
              {t(destination.label)}
            </Typography>
          </ButtonBase>
        );
      })}
    </Box>
  );
}
