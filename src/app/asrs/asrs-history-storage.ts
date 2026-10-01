import {
  ASRS_HISTORY_STORAGE_KEY,
  AsrsHistoryRecordV1,
  AsrsHistoryV1,
  createAsrsHistoryRecord,
  isAsrsHistoryV1,
} from './asrs-history';

/** Read completed assessments in stored order without changing their snapshots. */
export function loadAsrsHistory(): AsrsHistoryV1 {
  const raw = localStorage.getItem(ASRS_HISTORY_STORAGE_KEY);
  if (raw === null) return { version: 1, records: [] };

  const parsed: unknown = JSON.parse(raw);
  if (!isAsrsHistoryV1(parsed)) throw new Error('Invalid ASRS history');
  return parsed;
}

/** Save one complete submission; storage failures propagate to the caller. */
export function saveCompletedAsrsAssessment(answers: readonly number[]): AsrsHistoryRecordV1 {
  const history = loadAsrsHistory();
  const existingIds = new Set(history.records.map(record => record.id));
  const record = createAsrsHistoryRecord(answers, existingIds);
  localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, JSON.stringify({
    version: 1,
    records: [...history.records, record],
  } satisfies AsrsHistoryV1));
  return record;
}
