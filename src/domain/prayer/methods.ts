import { CalculationMethod, type CalculationParameters } from 'adhan';

/**
 * Registry of supported calculation methods.
 *
 * To add a method, add one entry here and one label per language under
 * `methods` in src/i18n. No component needs to change.
 */
const METHOD_FACTORIES = {
  MuslimWorldLeague: () => CalculationMethod.MuslimWorldLeague(),
  Egyptian: () => CalculationMethod.Egyptian(),
  UmmAlQura: () => CalculationMethod.UmmAlQura(),
  Karachi: () => CalculationMethod.Karachi(),
  NorthAmerica: () => CalculationMethod.NorthAmerica(),
  MoonsightingCommittee: () => CalculationMethod.MoonsightingCommittee(),
  Dubai: () => CalculationMethod.Dubai(),
  Kuwait: () => CalculationMethod.Kuwait(),
  Qatar: () => CalculationMethod.Qatar(),
  Singapore: () => CalculationMethod.Singapore(),
  Turkey: () => CalculationMethod.Turkey(),
  Tehran: () => CalculationMethod.Tehran(),
} satisfies Record<string, () => CalculationParameters>;

export type CalculationMethodId = keyof typeof METHOD_FACTORIES;

export const CALCULATION_METHOD_IDS = Object.keys(METHOD_FACTORIES) as CalculationMethodId[];
export const DEFAULT_CALCULATION_METHOD: CalculationMethodId = 'MuslimWorldLeague';

export function isCalculationMethodId(value: unknown): value is CalculationMethodId {
  return typeof value === 'string' && Object.hasOwn(METHOD_FACTORIES, value);
}

export function methodParameters(id: CalculationMethodId): CalculationParameters {
  return METHOD_FACTORIES[id]();
}

const METHOD_BY_COUNTRY: Record<string, CalculationMethodId> = {
  EG: 'Egyptian',
  SD: 'Egyptian',
  LY: 'Egyptian',
  SY: 'Egyptian',
  LB: 'Egyptian',
  IQ: 'Egyptian',
  PS: 'Egyptian',
  JO: 'Egyptian',
  SA: 'UmmAlQura',
  YE: 'UmmAlQura',
  AE: 'Dubai',
  OM: 'Dubai',
  BH: 'Dubai',
  KW: 'Kuwait',
  QA: 'Qatar',
  PK: 'Karachi',
  IN: 'Karachi',
  BD: 'Karachi',
  AF: 'Karachi',
  US: 'NorthAmerica',
  CA: 'NorthAmerica',
  SG: 'Singapore',
  MY: 'Singapore',
  ID: 'Singapore',
  BN: 'Singapore',
  TR: 'Turkey',
  IR: 'Tehran',
};

/** The method conventionally used in a country (ISO 3166-1 alpha-2). */
export function suggestMethodForCountry(countryCode: string | undefined): CalculationMethodId {
  return (countryCode && METHOD_BY_COUNTRY[countryCode.toUpperCase()]) || DEFAULT_CALCULATION_METHOD;
}
