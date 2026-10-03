import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { LAYOUT, gutter } from '@/theme/tokens';

/** Centres page content and keeps it clear of notches and rounded corners. */
export function PageContent({ children, gap = 3 }: { children: ReactNode; gap?: number }) {
  return (
    <Box
      sx={{
        mx: 'auto',
        width: '100%',
        maxWidth: LAYOUT.contentMaxWidth,
        display: 'flex',
        flexDirection: 'column',
        gap,
        pt: 1,
        pb: 3,
        px: gutter(),
      }}
    >
      {children}
    </Box>
  );
}

/** A labelled group of content. The label is a real heading for screen readers. */
export function Section({
  title,
  action,
  children,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Box component="section">
      {(title || action) && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 36, mb: 0.5 }}>
          {title && (
            <Typography variant="overline" component="h2" color="textSecondary">
              {title}
            </Typography>
          )}
          {action}
        </Box>
      )}
      {children}
    </Box>
  );
}

/** A quiet bordered surface for grouped rows. Not every block needs one. */
export function Surface({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
      }}
    >
      {children}
    </Box>
  );
}
