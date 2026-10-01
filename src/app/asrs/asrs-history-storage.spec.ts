import { ASRS_HISTORY_STORAGE_KEY, AsrsHistoryV1, isAsrsHistoryV1 } from './asrs-history';
import { loadAsrsHistory, saveCompletedAsrsAssessment } from './asrs-history-storage';

describe('ASRS browser history storage', () => {
  beforeEach(() => localStorage.removeItem(ASRS_HISTORY_STORAGE_KEY));
  afterEach(() => localStorage.removeItem(ASRS_HISTORY_STORAGE_KEY));

  it('does not create storage on a fresh read and preserves stored snapshots on later reads', () => {
    expect(loadAsrsHistory()).toEqual({ version: 1, records: [] });
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBeNull();

    const first = saveCompletedAsrsAssessment(Array(18).fill(0));
    const stored = JSON.parse(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)!) as AsrsHistoryV1;
    stored.records[0].result.severityText = 'Historical wording';
    localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, JSON.stringify(stored));
    const beforeRead = localStorage.getItem(ASRS_HISTORY_STORAGE_KEY);

    expect(loadAsrsHistory().records[0].result.severityText).toBe('Historical wording');
    expect(loadAsrsHistory().records[0].id).toBe(first.id);
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
    expect(loadAsrsHistory().records).toEqual([first, second]);
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
    expect(() => loadAsrsHistory()).toThrowError('read failed');
    expect(() => saveCompletedAsrsAssessment(Array(18).fill(0))).toThrowError('read failed');
  });

  it('surfaces write failures and does not replace existing stored history', () => {
    const first = saveCompletedAsrsAssessment(Array(18).fill(0));
    const before = localStorage.getItem(ASRS_HISTORY_STORAGE_KEY);
    spyOn(localStorage, 'setItem').and.throwError('write failed');

    expect(() => saveCompletedAsrsAssessment(Array(18).fill(4))).toThrowError('write failed');
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBe(before);
    expect(loadAsrsHistory().records).toEqual([first]);
  });
});
