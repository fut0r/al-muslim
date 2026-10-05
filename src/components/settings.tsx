import ChevronRightOutlined from '@mui/icons-material/ChevronRightOutlined';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Switch from '@mui/material/Switch';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { Children, useId, type ReactNode } from 'react';
import { Directional } from './icons';
import { Section, Surface } from './Page';

/** Rows on one surface, separated by hairlines. */
export function RowGroup({ children }: { children: ReactNode }) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <Surface>
      {rows.map((row, index) => (
        <Box key={index}>
          {index > 0 && <Divider />}
          {row}
        </Box>
      ))}
    </Surface>
  );
}

/** A titled group of settings. */
export function SettingsSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Section title={title} action={action}>
      <RowGroup>{children}</RowGroup>
    </Section>
  );
}

interface SettingItemProps {
  icon?: ReactNode;
  label: string;
  /** Explanation or current state, shown under the label. */
  description?: string;
  /** Current value shown at the end of the row. */
  value?: string;
  /** Makes the whole row a button (or a link when `href` is set). */
  onClick?(): void;
  href?: string;
  /** A control laid out under the label, for wide controls. */
  children?: ReactNode;
  /** A compact control at the end of the row. */
  control?: ReactNode;
  labelId?: string;
}

function ItemText({ label, description, labelId }: Pick<SettingItemProps, 'label' | 'description' | 'labelId'>) {
  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography id={labelId} variant="subtitle1" component="span" sx={{ display: 'block' }}>
        {label}
      </Typography>
      {description && (
        <Typography variant="body2" color="textSecondary" component="span" sx={{ display: 'block' }}>
          {description}
        </Typography>
      )}
    </Box>
  );
}

/** One row in a settings list. */
export function SettingItem({ icon, label, description, value, onClick, href, children, control, labelId }: SettingItemProps) {
  const content = (
    <>
      {icon && (
        <Box aria-hidden sx={{ display: 'flex', color: 'text.secondary' }}>
          {icon}
        </Box>
      )}
      <ItemText label={label} description={description} labelId={labelId} />
      {value && (
        <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'end', maxWidth: '50%' }}>
          {value}
        </Typography>
      )}
      {control}
      {(onClick || href) && (
        <Box aria-hidden sx={{ display: 'flex', color: 'text.disabled' }}>
          <Directional>
            <ChevronRightOutlined />
          </Directional>
        </Box>
      )}
    </>
  );
  const rowStyles = { display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 60, px: 2, py: 1.25, width: '100%', textAlign: 'start' } as const;

  return (
    <Box>
      {href ? (
        <ButtonBase component="a" href={href} target="_blank" rel="noopener noreferrer" sx={rowStyles}>
          {content}
        </ButtonBase>
      ) : onClick ? (
        <ButtonBase onClick={onClick} sx={rowStyles}>
          {content}
        </ButtonBase>
      ) : (
        <Box sx={rowStyles}>{content}</Box>
      )}
      {children && <Box sx={{ px: 2, pb: 2 }}>{children}</Box>}
    </Box>
  );
}

/** A row with an on/off switch. The whole row toggles it. */
export function SwitchItem({
  label,
  description,
  checked,
  onChange,
  disabled,
  icon,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange(checked: boolean): void;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  const labelId = useId();
  return (
    <Box
      component="label"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        minHeight: 60,
        px: 2,
        py: 1.25,
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {icon && (
        <Box aria-hidden sx={{ display: 'flex', color: 'text.secondary' }}>
          {icon}
        </Box>
      )}
      <ItemText label={label} description={description} labelId={labelId} />
      <Switch
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        slotProps={{ input: { 'aria-labelledby': labelId, role: 'switch' } }}
      />
    </Box>
  );
}

export interface Choice<T extends string> {
  value: T;
  label: string;
  description?: string;
}

/** A small set of mutually exclusive options shown side by side. */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Choice<T>[];
  onChange(value: T): void;
  label: string;
}) {
  return (
    <ToggleButtonGroup
      exclusive
      fullWidth
      value={value}
      aria-label={label}
      onChange={(_, next: T | null) => {
        if (next !== null) onChange(next);
      }}
    >
      {options.map((option) => (
        <ToggleButton
          key={option.value}
          value={option.value}
          sx={{
            px: 0.5,
            whiteSpace: 'nowrap',
            // Four options must still fit side by side on the narrowest phones.
            fontSize: options.length > 3 ? 'clamp(0.6875rem, 3.5vw, 0.875rem)' : undefined,
          }}
        >
          {option.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

/** A dialog for choosing one option from a longer list. */
export function ChoiceDialog<T extends string>({
  open,
  title,
  value,
  options,
  onChange,
  onClose,
  note,
}: {
  open: boolean;
  title: string;
  value: T;
  options: Choice<T>[];
  onChange(value: T): void;
  onClose(): void;
  /** Small print shown under the options. */
  note?: string;
}) {
  const titleId = useId();
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby={titleId}>
      <Typography id={titleId} variant="h2" component="h2" sx={{ px: 3, pt: 2.5, pb: 1 }}>
        {title}
      </Typography>
      <RadioGroup
        aria-labelledby={titleId}
        value={value}
        onChange={(event) => {
          onChange(event.target.value as T);
          onClose();
        }}
        sx={{ px: 1.5, pb: 2, overflowY: 'auto', flexWrap: 'nowrap' }}
      >
        {options.map((option) => (
          <FormControlLabel
            key={option.value}
            value={option.value}
            control={<Radio />}
            sx={{ mx: 0, py: 0.5, alignItems: 'flex-start', '& .MuiRadio-root': { mt: -0.25 } }}
            label={
              <Box sx={{ py: 0.75 }}>
                <Typography variant="subtitle1" component="span" sx={{ display: 'block' }}>
                  {option.label}
                </Typography>
                {option.description && (
                  <Typography variant="body2" color="textSecondary" component="span" sx={{ display: 'block' }}>
                    {option.description}
                  </Typography>
                )}
              </Box>
            }
          />
        ))}
      </RadioGroup>
      {note && (
        <Typography variant="caption" color="textSecondary" component="p" sx={{ px: 3, pb: 2.5 }}>
          {note}
        </Typography>
      )}
    </Dialog>
  );
}
