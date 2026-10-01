import { SEVERITY_LEVELS } from './asrs.constants';
import {
  ASRS_HISTORY_STORAGE_KEY,
  AsrsHistoryRecordV1,
  AsrsHistoryV1,
  createAsrsHistoryRecord,
  isAsrsHistoryV1,
} from './asrs-history';

describe('ASRS history v1 contract', () => {
  const answers = Array(18).fill(2);
  const record = (): AsrsHistoryRecordV1 => ({
    id: 'local-1',
    submittedAt: '2026-10-01T12:34:56.789Z',
    answers: [...answers],
    totalScore: 36,
    severityCategory: 'moderate',
    result: {
      severityText: SEVERITY_LEVELS.moderate.severity,
      emoji: SEVERITY_LEVELS.moderate.emoji,
      recommendationText: SEVERITY_LEVELS.moderate.recommendation,
      gaugeColor: SEVERITY_LEVELS.moderate.gaugeColor,
      warningText: null,
    },
  });

  it('uses one ASRS key and round-trips an empty or multiple-record envelope', () => {
    expect(ASRS_HISTORY_STORAGE_KEY).toBe('asrs:history');
    expect(isAsrsHistoryV1({ version: 1, records: [] })).toBeTrue();
    const history: AsrsHistoryV1 = {
      version: 1,
      records: [record(), { ...record(), id: 'local-2', submittedAt: '2026-10-02T12:34:56.789Z' }],
    };
    expect(isAsrsHistoryV1(JSON.parse(JSON.stringify(history)))).toBeTrue();
    expect(JSON.parse(JSON.stringify(history))).toEqual(history);
    expect(Object.keys(history.records[0])).toEqual([
      'id', 'submittedAt', 'answers', 'totalScore', 'severityCategory', 'result',
    ]);
  });

  it('builds a submission from copied result values and preserves independent answer snapshots', () => {
    const submittedAnswers = [...answers];
    const first = createAsrsHistoryRecord(submittedAnswers, new Set(), new Date('2026-10-01T12:34:56.789Z'), () => 'local-1');
    const second = createAsrsHistoryRecord(Array(18).fill(4), new Set(['local-1']), new Date('2026-10-02T12:34:56.789Z'), () => 'local-2');
    submittedAnswers[0] = 0;
    expect(first).toEqual(record());
    expect(second.totalScore).toBe(72);
    expect(second.severityCategory).toBe('severe');
    expect(second.result.severityText).toBe(SEVERITY_LEVELS.severe.severity);
    expect(isAsrsHistoryV1({ version: 1, records: [first, second] })).toBeTrue();
  });

  it('generates distinct local IDs by default and accepts stored display snapshots without regenerating them', () => {
    const first = createAsrsHistoryRecord(Array(18).fill(0));
    const second = createAsrsHistoryRecord(Array(18).fill(0), new Set([first.id]));
    expect(first.id.length).toBeGreaterThan(0);
    expect(second.id).not.toBe(first.id);
    expect(first.submittedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    first.result.severityText = 'Earlier wording';
    expect(isAsrsHistoryV1({ version: 1, records: [first] })).toBeTrue();
  });

  it('rejects invalid envelope versions, records, IDs, and timestamps', () => {
    for (const value of [null, {}, { records: [] }, { version: 2, records: [] },
      { version: 1, records: {} }, { version: 1, records: [record(), record()] },
      { version: 1, records: [{ ...record(), id: '' }] },
      { version: 1, records: [{ ...record(), submittedAt: '2026-10-01' }] },
      { version: 1, records: [{ ...record(), submittedAt: '2026-02-30T12:34:56.789Z' }] },
      { version: 1, records: [{ ...record(), submittedAt: '2026-10-01T12:34:56+00:00' }] },
    ]) {
      expect(isAsrsHistoryV1(value)).withContext(JSON.stringify(value)).toBeFalse();
    }
  });

  it('rejects invalid answers, totals, categories, and result snapshots', () => {
    const invalidRecords = [
      { ...record(), answers: Array(17).fill(2) },
      { ...record(), answers: Array(18).fill(2.5) },
      { ...record(), answers: Array(18).fill(5) },
      { ...record(), totalScore: 35 },
      { ...record(), totalScore: 36.5 },
      { ...record(), severityCategory: 'mild' },
      { ...record(), result: { ...record().result, severityText: null } },
      { ...record(), result: { ...record().result, emoji: undefined } },
      { ...record(), result: { ...record().result, recommendationText: 1 } },
      { ...record(), result: { ...record().result, gaugeColor: 'red' } },
      { ...record(), result: { ...record().result, warningText: '' } },
      { ...record(), name: 'unexpected personal data' },
    ];
    for (const invalid of invalidRecords) {
      expect(isAsrsHistoryV1({ version: 1, records: [invalid] }))
        .withContext(JSON.stringify(invalid)).toBeFalse();
    }
  });

  it('refuses an invalid new submission', () => {
    expect(() => createAsrsHistoryRecord(Array(17).fill(1), new Set(), new Date(), () => 'local-1')).toThrow();
    expect(() => createAsrsHistoryRecord(Array(18).fill(1), new Set(), new Date(), () => '')).toThrow();
    expect(() => createAsrsHistoryRecord(Array(18).fill(1), new Set(), new Date(NaN), () => 'local-1')).toThrow();
    expect(() => createAsrsHistoryRecord(Array(18).fill(1), new Set(['local-1']), new Date(), () => 'local-1')).toThrow();
  });
});
