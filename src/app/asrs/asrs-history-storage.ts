import {
  ASRS_HISTORY_STORAGE_KEY,
  AsrsHistoryRecordV1,
  AsrsHistoryV1,
  createAsrsHistoryRecord,
  isAsrsHistoryV1,
} from './asrs-history';

export type AsrsHistoryLoadResult =
  | { status: 'available'; history: AsrsHistoryV1 }
  | { status: 'unavailable' };

/** Validate all stored records before exposing any of them to a history view or a new save. */
export function loadAsrsHistory(): AsrsHistoryLoadResult {
  try {
    const raw = localStorage.getItem(ASRS_HISTORY_STORAGE_KEY);
    if (raw === null) return { status: 'available', history: { version: 1, records: [] } };

    const parsed: unknown = JSON.parse(raw);
    if (!isAsrsHistoryV1(parsed)) return { status: 'unavailable' };
    return { status: 'available', history: parsed };
  } catch {
    return { status: 'unavailable' };
  }
}

/** Save one complete submission; storage failures propagate to the caller. */
export function saveCompletedAsrsAssessment(answers: readonly number[]): AsrsHistoryRecordV1 {
  const loaded = loadAsrsHistory();
  if (loaded.status === 'unavailable') throw new Error('ASRS history unavailable');
  const existingIds = new Set(loaded.history.records.map(record => record.id));
  const record = createAsrsHistoryRecord(answers, existingIds);
  localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, JSON.stringify({
    version: 1,
    records: [...loaded.history.records, record],
  } satisfies AsrsHistoryV1));
  return record;
}

/** Re-read and validate immediately before removing exactly one stored ID. */
export function deleteAsrsHistoryRecord(id: string): 'deleted' | 'not-found' | 'unavailable' {
  const loaded = loadAsrsHistory();
  if (loaded.status === 'unavailable') return 'unavailable';
  if (!loaded.history.records.some(record => record.id === id)) return 'not-found';

  localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, JSON.stringify({
    version: 1,
    records: loaded.history.records.filter(record => record.id !== id),
  } satisfies AsrsHistoryV1));
  return 'deleted';
}

/** Re-read the complete v1 history and clear only the set the user confirmed. */
export function clearAsrsHistory(expected: AsrsHistoryV1): 'cleared' | 'changed' | 'empty' | 'unavailable' {
  const loaded = loadAsrsHistory();
  if (loaded.status === 'unavailable') return 'unavailable';
  if (loaded.history.records.length === 0) return 'empty';
  if (JSON.stringify(loaded.history) !== JSON.stringify(expected)) return 'changed';

  localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, JSON.stringify({
    version: 1,
    records: [],
  } satisfies AsrsHistoryV1));
  return 'cleared';
}
