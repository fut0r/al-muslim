import { useState, type ReactElement } from 'react';
import { CALCULATION_METHOD_IDS, hasCountryConvention } from '@/domain/prayer/methods';
import { MADHABS } from '@/domain/prayer/types';
import { useCalculation } from '@/hooks/usePrayerTimes';
import { useI18n } from '@/i18n';
import { countryName } from '@/services/cities';
import { useSavedLocation } from '@/stores/location';
import { updateSettings } from '@/stores/settings';
import { ChoiceDialog, SettingItem, SwitchItem } from './settings';

/**
 * How prayer times are calculated: the convention of the user's country, or
 * their own choice of method and madhab. Returns the rows to place in a group
 * of settings, and the dialogs those rows open.
 */
export function useCalculationSettings(): { rows: ReactElement[]; dialogs: ReactElement } {
  const i18n = useI18n();
  const { t } = i18n;
  const { method, madhab, automatic } = useCalculation();
  const countryCode = useSavedLocation()?.countryCode;
  const [dialog, setDialog] = useState<'method' | 'madhab' | null>(null);

  const country = countryCode ? countryName(countryCode, i18n.language) : undefined;
  const hint = !country
    ? t('settings.autoCalculationNoCountry')
    : hasCountryConvention(countryCode)
      ? t('settings.autoCalculationHint', { country })
      : t('settings.autoCalculationDefault', { country });

  const rows = [
    <SwitchItem
      key="auto"
      label={t('settings.autoCalculation')}
      description={hint}
      checked={automatic}
      // Switching it off keeps the current values as the starting point for the user's own choice.
      onChange={(autoCalculation) => updateSettings(autoCalculation ? { autoCalculation } : { autoCalculation, method, madhab })}
    />,
    <SettingItem
      key="method"
      label={t('settings.method')}
      description={t(`methods.${method}`)}
      onClick={automatic ? undefined : () => setDialog('method')}
    />,
    <SettingItem
      key="madhab"
      label={t('settings.madhab')}
      description={t(`madhab.${madhab}`)}
      onClick={automatic ? undefined : () => setDialog('madhab')}
    />,
  ];

  const dialogs = (
    <>
      <ChoiceDialog
        open={dialog === 'method'}
        title={t('settings.method')}
        value={method}
        onChange={(value) => updateSettings({ method: value })}
        onClose={() => setDialog(null)}
        options={CALCULATION_METHOD_IDS.map((value) => ({ value, label: t(`methods.${value}`) }))}
      />
      <ChoiceDialog
        open={dialog === 'madhab'}
        title={t('settings.madhab')}
        value={madhab}
        onChange={(value) => updateSettings({ madhab: value })}
        onClose={() => setDialog(null)}
        options={MADHABS.map((value) => ({ value, label: t(`madhab.${value}`), description: t(`madhab.${value}Hint`) }))}
      />
    </>
  );

  return { rows, dialogs };
}
