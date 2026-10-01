import { ASRS_HISTORY_STORAGE_KEY, AsrsHistoryV1, isAsrsHistoryV1 } from './asrs-history';
import { clearAsrsHistory, deleteAsrsHistoryRecord, loadAsrsHistory, saveCompletedAsrsAssessment } from './asrs-history-storage';

describe('ASRS browser history storage', () => {
  beforeEach(() => localStorage.removeItem(ASRS_HISTORY_STORAGE_KEY));
  afterEach(() => localStorage.removeItem(ASRS_HISTORY_STORAGE_KEY));

  it('does not create storage on a fresh read and preserves stored snapshots on later reads', () => {
    expect(loadAsrsHistory()).toEqual({ status: 'available', history: { version: 1, records: [] } });
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBeNull();

    const first = saveCompletedAsrsAssessment(Array(18).fill(0));
    const stored = JSON.parse(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)!) as AsrsHistoryV1;
    stored.records[0].result.severityText = 'Historical wording';
    localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, JSON.stringify(stored));
    const beforeRead = localStorage.getItem(ASRS_HISTORY_STORAGE_KEY);

    expect(loadAsrsHistory()).toEqual({ status: 'available', history: stored });
    expect(stored.records[0].result.severityText).toBe('Historical wording');
    expect(stored.records[0].id).toBe(first.id);
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBe(beforeRead);
  });

  it('appends distinct complete assessments under the v1 key and retains the first record', () => {
    const answers = [0, 1, 2, 3, 4, 3, 2, 1, 0, 4, 1, 3, 2, 4, 0, 1, 2, 3];
    const firstScore = answers.reduce((sum, answer) => sum + answer, 0);
    const first = saveCompletedAsrsAssessment(answers);
    answers[0] = 4;
    const second = saveCompletedAsrsAssessment(Array(18).fill(4));
    const raw = localStorage.getItem(ASRS_HISTORY_STORAGE_KEY);
    const parsed: unknown = JSON.parse(raw!);

    expect(isAsrsHistoryV1(parsed)).toBeTrue();
    expect(loadAsrsHistory()).toEqual({ status: 'available', history: { version: 1, records: [first, second] } });
    expect(first.answers[0]).toBe(0);
    expect(first.id).not.toBe(second.id);
    expect(first.submittedAt).toMatch(/Z$/);
    expect(second.submittedAt).toMatch(/Z$/);
    expect(first.totalScore).toBe(firstScore);
    expect(second.totalScore).toBe(72);
  });

  it('accesses only its own history key and leaves an old session key unchanged', () => {
    localStorage.setItem('asrs_session_id', 'unrelated-session');
    const getItem = spyOn(localStorage, 'getItem').and.callThrough();
    const setItem = spyOn(localStorage, 'setItem').and.callThrough();
    const removeItem = spyOn(localStorage, 'removeItem').and.callThrough();

    saveCompletedAsrsAssessment(Array(18).fill(0));
    loadAsrsHistory();

    expect(getItem).toHaveBeenCalledWith(ASRS_HISTORY_STORAGE_KEY);
    expect(getItem).not.toHaveBeenCalledWith('asrs_session_id');
    expect(setItem).toHaveBeenCalledOnceWith(ASRS_HISTORY_STORAGE_KEY, jasmine.any(String));
    expect(removeItem).not.toHaveBeenCalled();
    expect(localStorage.getItem('asrs_session_id')).toBe('unrelated-session');
    localStorage.removeItem('asrs_session_id');
  });

  it('surfaces read and write failures without claiming a saved record', () => {
    spyOn(localStorage, 'getItem').and.throwError('read failed');
    expect(loadAsrsHistory()).toEqual({ status: 'unavailable' });
    expect(() => saveCompletedAsrsAssessment(Array(18).fill(0))).toThrowError('ASRS history unavailable');
  });

  it('surfaces write failures and does not replace existing stored history', () => {
    const first = saveCompletedAsrsAssessment(Array(18).fill(0));
    const before = localStorage.getItem(ASRS_HISTORY_STORAGE_KEY);
    spyOn(localStorage, 'setItem').and.throwError('write failed');

    expect(() => saveCompletedAsrsAssessment(Array(18).fill(4))).toThrowError('write failed');
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBe(before);
    expect(loadAsrsHistory()).toEqual({ status: 'available', history: { version: 1, records: [first] } });
  });

  it('rejects every malformed or incompatible envelope without changing the raw value', () => {
    for (const raw of ['{', 'null', '[]', '{}', '{"records":[]}',
      '{"version":2,"records":[]}', '{"version":1,"records":{}}']) {
      localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, raw);
      expect(loadAsrsHistory()).withContext(raw).toEqual({ status: 'unavailable' });
      expect(() => saveCompletedAsrsAssessment(Array(18).fill(0))).withContext(raw)
        .toThrowError('ASRS history unavailable');
      expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).withContext(raw).toBe(raw);
    }
  });

  it('rejects a whole envelope if even its last record is invalid, then recovers after a valid restore', () => {
    const first = saveCompletedAsrsAssessment(Array(18).fill(0));
    const validRaw = localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)!;
    const invalid = JSON.parse(validRaw) as AsrsHistoryV1;
    invalid.records.push({ ...first, id: 'second', result: { ...first.result, warningText: 'invalid' as never } });
    const raw = JSON.stringify(invalid);
    localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, raw);
    expect(loadAsrsHistory()).toEqual({ status: 'unavailable' });
    expect(() => saveCompletedAsrsAssessment(Array(18).fill(4))).toThrowError('ASRS history unavailable');
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBe(raw);

    localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, validRaw);
    const second = saveCompletedAsrsAssessment(Array(18).fill(4));
    expect(loadAsrsHistory()).toEqual({ status: 'available', history: { version: 1, records: [first, second] } });
  });

  it('never exposes a valid-looking subset when a later record violates the v1 contract', () => {
    const first = saveCompletedAsrsAssessment(Array(18).fill(0));
    const invalidRecords = [
      { ...first },
      { ...first, id: 'later', submittedAt: '2026-02-30T12:34:56.789Z' },
      { ...first, id: 'later', answers: Array(17).fill(0) },
      { ...first, id: 'later', answers: Array(18).fill(5) },
      { ...first, id: 'later', totalScore: 1 },
      { ...first, id: 'later', severityCategory: 'severe' },
      { ...first, id: 'later', result: { ...first.result, emoji: undefined } },
      { ...first, id: 'later', result: { ...first.result, gaugeColor: 'blue' } },
      { ...first, id: 'later', result: { ...first.result, warningText: 'warning' } },
    ];

    for (const [index, invalidRecord] of invalidRecords.entries()) {
      const raw = JSON.stringify({ version: 1, records: [first, invalidRecord] });
      localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, raw);
      expect(loadAsrsHistory()).withContext(`invalid case ${index}`).toEqual({ status: 'unavailable' });
      expect(() => saveCompletedAsrsAssessment(Array(18).fill(4))).withContext(`invalid case ${index}`)
        .toThrowError('ASRS history unavailable');
      expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).withContext(`invalid case ${index}`).toBe(raw);
    }
  });

  it('deletes only the matching ID while preserving duplicate-looking records and stored order', () => {
    const first = saveCompletedAsrsAssessment(Array(18).fill(1));
    const second = saveCompletedAsrsAssessment(Array(18).fill(1));
    const third = saveCompletedAsrsAssessment(Array(18).fill(1));
    const before = loadAsrsHistory();
    expect(before.status).toBe('available');

    expect(deleteAsrsHistoryRecord(second.id)).toBe('deleted');
    expect(loadAsrsHistory()).toEqual({ status: 'available', history: {
      version: 1, records: [first, third],
    } });
  });

  it('does not write when the selected ID disappeared before confirmation', () => {
    const record = saveCompletedAsrsAssessment(Array(18).fill(2));
    const raw = '{"version":1,"records":[]}';
    localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, raw);
    const setItem = spyOn(localStorage, 'setItem').and.callThrough();
    expect(deleteAsrsHistoryRecord(record.id)).toBe('not-found');
    expect(setItem).not.toHaveBeenCalled();
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBe(raw);
  });

  it('refuses invalid history without changing its raw value', () => {
    const record = saveCompletedAsrsAssessment(Array(18).fill(2));
    const setItem = spyOn(localStorage, 'setItem').and.callThrough();
    for (const raw of ['{bad', '{"version":2,"records":[]}', '{"version":1,"records":[{}]}']) {
      localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, raw);
      setItem.calls.reset();
      expect(deleteAsrsHistoryRecord(record.id)).toBe('unavailable');
      expect(setItem).not.toHaveBeenCalled();
      expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBe(raw);
    }
  });

  it('surfaces a write failure while retaining the old records', () => {
    const record = saveCompletedAsrsAssessment(Array(18).fill(2));
    const raw = localStorage.getItem(ASRS_HISTORY_STORAGE_KEY);
    spyOn(localStorage, 'setItem').and.throwError('write failed');
    expect(() => deleteAsrsHistoryRecord(record.id)).toThrowError('write failed');
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBe(raw);
  });

  it('does not write when storage cannot be read', () => {
    const setItem = spyOn(localStorage, 'setItem').and.callThrough();
    spyOn(localStorage, 'getItem').and.throwError('read failed');
    expect(deleteAsrsHistoryRecord('saved')).toBe('unavailable');
    expect(setItem).not.toHaveBeenCalled();
  });

  it('clears only the confirmed v1 records in one write and permits a later save', () => {
    const first = saveCompletedAsrsAssessment(Array(18).fill(1));
    saveCompletedAsrsAssessment(Array(18).fill(2));
    localStorage.setItem('other:assessment', 'keep');
    const snapshot = loadAsrsHistory();
    expect(snapshot.status).toBe('available');
    if (snapshot.status !== 'available') return;
    const setItem = spyOn(localStorage, 'setItem').and.callThrough();
    const removeItem = spyOn(localStorage, 'removeItem').and.callThrough();
    expect(clearAsrsHistory(snapshot.history)).toBe('cleared');
    expect(setItem).toHaveBeenCalledOnceWith(ASRS_HISTORY_STORAGE_KEY, '{"version":1,"records":[]}');
    expect(removeItem).not.toHaveBeenCalled();
    expect(localStorage.getItem('other:assessment')).toBe('keep');
    expect(loadAsrsHistory()).toEqual({ status: 'available', history: { version: 1, records: [] } });
    setItem.and.callThrough();
    expect(saveCompletedAsrsAssessment(Array(18).fill(4)).id).not.toBe(first.id);
    localStorage.removeItem('other:assessment');
  });

  it('stops without writing if the stored records change after confirmation opens', () => {
    saveCompletedAsrsAssessment(Array(18).fill(1));
    const snapshot = loadAsrsHistory();
    if (snapshot.status !== 'available') return;
    const added = saveCompletedAsrsAssessment(Array(18).fill(2));
    const raw = localStorage.getItem(ASRS_HISTORY_STORAGE_KEY);
    const setItem = spyOn(localStorage, 'setItem').and.callThrough();
    expect(clearAsrsHistory(snapshot.history)).toBe('changed');
    expect(setItem).not.toHaveBeenCalled();
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBe(raw);
    expect(loadAsrsHistory().status).toBe('available');
    expect(added.id).toBeTruthy();
  });

  it('does not write for missing, empty, invalid, unreadable, or unsupported history', () => {
    const empty: AsrsHistoryV1 = { version: 1, records: [] };
    const setItem = spyOn(localStorage, 'setItem').and.callThrough();
    expect(clearAsrsHistory(empty)).toBe('empty');
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBeNull();
    for (const raw of ['{"version":1,"records":[]}', '{bad', '{"version":2,"records":[]}',
      '{"version":1,"records":[{}]}']) {
      localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, raw);
      setItem.calls.reset();
      expect(clearAsrsHistory(empty)).toBe(raw === '{"version":1,"records":[]}' ? 'empty' : 'unavailable');
      expect(setItem).not.toHaveBeenCalled();
      expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBe(raw);
    }
    spyOn(localStorage, 'getItem').and.throwError('read failed');
    expect(clearAsrsHistory(empty)).toBe('unavailable');
    expect(setItem).not.toHaveBeenCalled();
  });

  it('surfaces a failed final write and leaves all stored records', () => {
    saveCompletedAsrsAssessment(Array(18).fill(1));
    const snapshot = loadAsrsHistory();
    if (snapshot.status !== 'available') return;
    const raw = localStorage.getItem(ASRS_HISTORY_STORAGE_KEY);
    spyOn(localStorage, 'setItem').and.throwError('write failed');
    expect(() => clearAsrsHistory(snapshot.history)).toThrowError('write failed');
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBe(raw);
  });
});
