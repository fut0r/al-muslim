import { civilDateInZone, civilDateKey } from '@/domain/time';
import { useNow } from './useNow';

/** The day adhkar progress belongs to: the device's own calendar day. */
export function useAdhkarDay(): string {
  return civilDateKey(civilDateInZone(useNow(60_000)));
}
