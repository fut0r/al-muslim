import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useId, useState } from 'react';
import { ErrorState, LoadingState } from '@/components/states';
import { TAFSIR, TAFSIR_LANGUAGES, type TafsirLanguage } from '@/data/tafsir';
import { useAsync } from '@/hooks/useAsync';
import { useI18n } from '@/i18n';
import { loadTafsir } from '@/services/tafsirRepository';

/**
 * Al-Mukhtasar for one ayah, in Arabic or English. The text is the published
 * wording; an ayah the edition leaves blank is said to be blank.
 */
export function TafsirDialog({
  surahId,
  ayah,
  onClose,
}: {
  surahId: number;
  ayah: number | null;
  onClose(): void;
}) {
  const { language } = useI18n();
  const titleId = useId();

  return (
    <Dialog open={ayah !== null} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby={titleId}>
      {ayah !== null && (
        <TafsirPanel
          key={`${surahId}:${ayah}:${language}`}
          surahId={surahId}
          ayah={ayah}
          titleId={titleId}
          onClose={onClose}
        />
      )}
    </Dialog>
  );
}

function TafsirPanel({
  surahId,
  ayah,
  titleId,
  onClose,
}: {
  surahId: number;
  ayah: number;
  titleId: string;
  onClose(): void;
}) {
  const i18n = useI18n();
  const { t } = i18n;
  const [edition, setEdition] = useState<TafsirLanguage>(i18n.language);
  const [attempt, setAttempt] = useState(0);
  const loaded = useAsync(`${edition}:${surahId}:${attempt}`, () => loadTafsir(edition, surahId));
  const text = loaded.status === 'ready' ? loaded.value[ayah - 1] : undefined;
  const arabic = i18n.language === 'ar';

  return (
    <Stack spacing={2} sx={{ p: 3 }}>
      <Stack spacing={0.5}>
        <Typography id={titleId} variant="h2" component="h2">
          {t('quran.tafsirOf', { ayah })}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {t('quran.tafsirSource', {
            name: arabic ? TAFSIR.name.ar : TAFSIR.name.en,
            source: arabic ? TAFSIR.publisher.ar : TAFSIR.publisher.en,
          })}
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1} role="group" aria-label={t('quran.tafsir')}>
        {TAFSIR_LANGUAGES.map((language) => (
          <Button
            key={language}
            size="small"
            variant={edition === language ? 'contained' : 'outlined'}
            aria-pressed={edition === language}
            onClick={() => setEdition(language)}
          >
            {t(language === 'ar' ? 'settings.languages.ar' : 'settings.languages.en')}
          </Button>
        ))}
      </Stack>

      {loaded.status === 'loading' || loaded.status === 'idle' ? (
        <LoadingState compact />
      ) : loaded.status === 'error' ? (
        <ErrorState
          compact
          title={t('quran.tafsirErrorTitle')}
          body={t('quran.tafsirErrorBody')}
          onRetry={() => setAttempt((value) => value + 1)}
        />
      ) : text ? (
        <Typography
          dir={edition === 'ar' ? 'rtl' : 'ltr'}
          lang={edition}
          sx={{
            maxHeight: '50vh',
            overflow: 'auto',
            fontSize: edition === 'ar' ? '1.125rem' : '1rem',
            lineHeight: edition === 'ar' ? 2 : 1.7,
            whiteSpace: 'pre-wrap',
          }}
        >
          {text}
        </Typography>
      ) : (
        <Typography role="status" color="textSecondary">
          {t('quran.tafsirEmpty')}
        </Typography>
      )}

      <Typography variant="caption" color="textSecondary">
        {t('quran.tafsirNote')}{' '}
        <Link href={TAFSIR.url} target="_blank" rel="noopener noreferrer">
          {t('quran.tafsirLink')}
        </Link>
      </Typography>

      <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
        <Button onClick={onClose} color="inherit">
          {t('common.close')}
        </Button>
      </Stack>
    </Stack>
  );
}
