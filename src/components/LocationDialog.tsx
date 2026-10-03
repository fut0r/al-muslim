import CloseOutlined from '@mui/icons-material/CloseOutlined';
import MyLocationOutlined from '@mui/icons-material/MyLocationOutlined';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useId, useMemo, useState } from 'react';
import { useAsync } from '@/hooks/useAsync';
import { saveCity, saveCoordinates, useDeviceLocation } from '@/hooks/useLocationActions';
import { useI18n, type I18n } from '@/i18n';
import { countryName, loadCities, searchCities, type City } from '@/services/cities';
import type { SavedLocation } from '@/stores/location';
import { SAFE_AREA } from '@/theme/tokens';
import { LoadingState } from './states';

/** Human-readable name of a saved location in the current language. */
export function locationLabel(i18n: I18n, location: SavedLocation | null): string {
  if (!location) return i18n.t('location.notSet');
  const name = (i18n.language === 'ar' && location.nameAr) || location.name;
  if (!name) return i18n.t('location.custom');
  return location.source === 'city' ? name : i18n.t('location.near', { city: name });
}

function cityName(i18n: I18n, city: City): string {
  return (i18n.language === 'ar' && city.nameAr) || city.name;
}

function parseCoordinate(value: string, limit: number): number | null {
  const trimmed = value.trim().replace(',', '.');
  if (trimmed === '' || !/^-?\d+(\.\d+)?$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Math.abs(parsed) <= limit ? parsed : null;
}

interface LocationDialogProps {
  open: boolean;
  onClose(): void;
}

/**
 * Lets the user set their location: from the device, by picking a city from
 * the bundled list, or by typing coordinates. Works fully offline, and the
 * device position is never required.
 */
export function LocationDialog({ open, onClose }: LocationDialogProps) {
  const i18n = useI18n();
  const { t } = i18n;
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true });
  const titleId = useId();
  const device = useDeviceLocation();

  const [query, setQuery] = useState('');
  const [showCoordinates, setShowCoordinates] = useState(false);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // The city list is only fetched once the dialog is actually opened.
  const cityList = useAsync(open ? 'cities' : null, loadCities);
  const cities = cityList.status === 'ready' ? cityList.value : null;
  const citiesFailed = cityList.status === 'error';

  const results = useMemo(() => (cities ? searchCities(cities, query) : []), [cities, query]);
  const searching = query.trim().length >= 2;
  const parsedLatitude = parseCoordinate(latitude, 90);
  const parsedLongitude = parseCoordinate(longitude, 180);

  const close = () => {
    device.clearFailure();
    setQuery('');
    setSubmitted(false);
    onClose();
  };

  const useDevice = async () => {
    if (await device.locate()) close();
  };

  const submitCoordinates = async () => {
    setSubmitted(true);
    if (parsedLatitude === null || parsedLongitude === null) return;
    await saveCoordinates({ latitude: parsedLatitude, longitude: parsedLongitude });
    close();
  };

  return (
    <Dialog open={open} onClose={close} fullScreen={fullScreen} fullWidth maxWidth="xs" aria-labelledby={titleId}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          pl: 2.5,
          pr: 1,
          pt: fullScreen ? `calc(${SAFE_AREA.top} + 8px)` : 1.5,
          pb: 0.5,
        }}
      >
        <Typography id={titleId} variant="h2" component="h2" sx={{ flex: 1 }}>
          {t('location.title')}
        </Typography>
        <IconButton onClick={close} aria-label={t('common.close')}>
          <CloseOutlined />
        </IconButton>
      </Box>

      <Box sx={{ px: 2.5, pb: `calc(${fullScreen ? SAFE_AREA.bottom : '0px'} + 20px)`, overflowY: 'auto' }}>
        <Stack spacing={2}>
          <Typography variant="body2" color="textSecondary">
            {t('location.why')}
          </Typography>

          <Button
            variant="contained"
            size="large"
            startIcon={<MyLocationOutlined />}
            onClick={useDevice}
            loading={device.busy}
            loadingPosition="start"
          >
            {device.busy ? t('location.locating') : t('location.useDevice')}
          </Button>
          {device.failure && (
            <Alert severity="warning" variant="outlined" role="alert">
              {t(`location.${device.failure}`)}
            </Alert>
          )}

          <TextField
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            label={t('location.chooseCity')}
            placeholder={t('location.searchPlaceholder')}
            type="search"
            autoComplete="off"
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlined fontSize="small" />
                  </InputAdornment>
                ),
              },
              htmlInput: { enterKeyHint: 'search' },
            }}
          />

          {citiesFailed ? (
            <Alert severity="warning" variant="outlined" role="alert">
              {t('location.citiesError')}
            </Alert>
          ) : !searching ? (
            <Typography variant="body2" color="textSecondary">
              {t('location.searchHint')}
            </Typography>
          ) : !cities ? (
            <LoadingState compact />
          ) : results.length === 0 ? (
            <Typography variant="body2" color="textSecondary" role="status">
              {t('location.noResults')}
            </Typography>
          ) : (
            <List disablePadding sx={{ mx: -1 }}>
              {results.map((city) => (
                <ListItemButton
                  key={`${city.name}-${city.countryCode}-${city.latitude}`}
                  onClick={() => {
                    saveCity(city);
                    close();
                  }}
                  sx={{ px: 1.5 }}
                >
                  <ListItemText
                    primary={cityName(i18n, city)}
                    secondary={countryName(city.countryCode, i18n.language)}
                    slotProps={{ primary: { variant: 'subtitle1' }, secondary: { variant: 'body2' } }}
                  />
                </ListItemButton>
              ))}
            </List>
          )}

          <Button
            variant="text"
            onClick={() => setShowCoordinates((value) => !value)}
            aria-expanded={showCoordinates}
            sx={{ alignSelf: 'flex-start', mx: -1 }}
          >
            {t('location.enterCoordinates')}
          </Button>
          <Collapse in={showCoordinates} unmountOnExit>
            <Stack spacing={2} component="form" noValidate onSubmit={(event) => { event.preventDefault(); void submitCoordinates(); }}>
              <TextField
                label={t('location.latitude')}
                value={latitude}
                onChange={(event) => setLatitude(event.target.value)}
                error={submitted && parsedLatitude === null}
                helperText={submitted && parsedLatitude === null ? t('location.latitudeError') : ' '}
                placeholder="30.0444"
                fullWidth
                slotProps={{ htmlInput: { inputMode: 'text', dir: 'ltr', autoComplete: 'off' } }}
              />
              <TextField
                label={t('location.longitude')}
                value={longitude}
                onChange={(event) => setLongitude(event.target.value)}
                error={submitted && parsedLongitude === null}
                helperText={submitted && parsedLongitude === null ? t('location.longitudeError') : ' '}
                placeholder="31.2357"
                fullWidth
                slotProps={{ htmlInput: { inputMode: 'text', dir: 'ltr', autoComplete: 'off' } }}
              />
              <Button type="submit" variant="outlined">
                {t('location.useCoordinates')}
              </Button>
            </Stack>
          </Collapse>
        </Stack>
      </Box>
    </Dialog>
  );
}
