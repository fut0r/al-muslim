import { CalculationMethod, type CalculationParameters } from 'adhan';
import { toHijri } from '../hijri';
import type { CivilDate } from '../time';
import type { Madhab } from './types';

/**
 * A method defined by its twilight angles, for authorities the adhan library
 * does not include. Isha is either an angle or minutes after Maghrib.
 */
function fromAngles(
  fajrAngle: number,
  isha: { angle: number } | { minutesAfterMaghrib: number },
  maghribMinutes = 0,
): CalculationParameters {
  const parameters = CalculationMethod.Other();
  parameters.fajrAngle = fajrAngle;
  if ('angle' in isha) parameters.ishaAngle = isha.angle;
  else parameters.ishaInterval = isha.minutesAfterMaghrib;
  // The same one-minute margin after the zenith that the library's own methods use.
  parameters.methodAdjustments.dhuhr = 1;
  parameters.methodAdjustments.maghrib = maghribMinutes;
  return parameters;
}

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
  Gulf: () => fromAngles(19.5, { minutesAfterMaghrib: 90 }),
  Dubai: () => CalculationMethod.Dubai(),
  Kuwait: () => CalculationMethod.Kuwait(),
  Qatar: () => CalculationMethod.Qatar(),
  Jordan: () => fromAngles(18, { angle: 18 }, 5),
  Morocco: () => fromAngles(19, { angle: 17 }),
  Algeria: () => fromAngles(18, { angle: 17 }),
  Tunisia: () => fromAngles(18, { angle: 18 }),
  Turkey: () => CalculationMethod.Turkey(),
  Karachi: () => CalculationMethod.Karachi(),
  Singapore: () => CalculationMethod.Singapore(),
  Tehran: () => CalculationMethod.Tehran(),
  NorthAmerica: () => CalculationMethod.NorthAmerica(),
  MoonsightingCommittee: () => CalculationMethod.MoonsightingCommittee(),
} satisfies Record<string, () => CalculationParameters>;

export type CalculationMethodId = keyof typeof METHOD_FACTORIES;

export const CALCULATION_METHOD_IDS = Object.keys(METHOD_FACTORIES) as CalculationMethodId[];
export const DEFAULT_CALCULATION_METHOD: CalculationMethodId = 'MuslimWorldLeague';

export function isCalculationMethodId(value: unknown): value is CalculationMethodId {
  return typeof value === 'string' && Object.hasOwn(METHOD_FACTORIES, value);
}

const RAMADAN = 9;
/** Minutes between Maghrib and Isha in the Umm al-Qura calendar during Ramadan (90 otherwise). */
const UMM_AL_QURA_RAMADAN_ISHA = 120;

/** The parameters of a method on a given day; a few methods change with the season. */
export function methodParameters(id: CalculationMethodId, date?: CivilDate): CalculationParameters {
  const parameters = METHOD_FACTORIES[id]();
  if (id === 'UmmAlQura' && date && toHijri(date).month === RAMADAN) {
    parameters.ishaInterval = UMM_AL_QURA_RAMADAN_ISHA;
  }
  return parameters;
}

/**
 * The method each country's own religious authority uses, or the one
 * conventionally used there (ISO 3166-1 alpha-2). Countries that are not
 * listed use the Muslim World League method.
 */
const METHOD_BY_COUNTRY: Record<string, CalculationMethodId> = {
  EG: 'Egyptian',
  SD: 'Egyptian',
  LY: 'Egyptian',
  SY: 'Egyptian',
  LB: 'Egyptian',
  PS: 'Egyptian',
  JO: 'Jordan',
  SA: 'UmmAlQura',
  YE: 'UmmAlQura',
  AE: 'Dubai',
  BH: 'Gulf',
  OM: 'Gulf',
  KW: 'Kuwait',
  QA: 'Qatar',
  MA: 'Morocco',
  DZ: 'Algeria',
  TN: 'Tunisia',
  TR: 'Turkey',
  IR: 'Tehran',
  PK: 'Karachi',
  IN: 'Karachi',
  BD: 'Karachi',
  AF: 'Karachi',
  SG: 'Singapore',
  MY: 'Singapore',
  ID: 'Singapore',
  BN: 'Singapore',
  US: 'NorthAmerica',
  CA: 'NorthAmerica',
  GB: 'MoonsightingCommittee',
};

/** Countries whose timetables give the later, Hanafi time for Asr. */
const HANAFI_COUNTRIES = new Set(['PK', 'IN', 'BD', 'AF']);

export interface Calculation {
  method: CalculationMethodId;
  madhab: Madhab;
}

/** Whether a country has an entry of its own, rather than falling back to the default method. */
export function hasCountryConvention(countryCode: string | undefined): boolean {
  return countryCode !== undefined && Object.hasOwn(METHOD_BY_COUNTRY, countryCode.toUpperCase());
}

/** How prayer times are conventionally calculated in a country. */
export function conventionForCountry(countryCode: string | undefined): Calculation {
  const code = countryCode?.toUpperCase() ?? '';
  return {
    method: METHOD_BY_COUNTRY[code] ?? DEFAULT_CALCULATION_METHOD,
    madhab: HANAFI_COUNTRIES.has(code) ? 'hanafi' : 'shafi',
  };
}

export interface CalculationPreference extends Calculation {
  /** Follow the convention of the country the location is in, instead of the choices above. */
  autoCalculation: boolean;
}

/** The method and madhab actually used: the country's convention, or the user's own choice. */
export function resolveCalculation(preference: CalculationPreference, countryCode: string | undefined): Calculation {
  return preference.autoCalculation
    ? conventionForCountry(countryCode)
    : { method: preference.method, madhab: preference.madhab };
}
