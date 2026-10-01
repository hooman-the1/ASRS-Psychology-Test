import { CommonModule } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';

import { AsrsComponent } from './asrs.component';
import { AsrsGaugeComponent } from './asrs-gauge.component';
import { ASRS_HISTORY_STORAGE_KEY, AsrsHistoryRecordV1 } from './asrs-history';
import { createAsrsHistoryRecord } from './asrs-history';
import { LatinToPersianNumbersPipe } from './latin-to-persian-numbers.pipe';

describe('ASRS saved history view', () => {
  beforeEach(async () => {
    localStorage.removeItem(ASRS_HISTORY_STORAGE_KEY);
    await TestBed.configureTestingModule({
      declarations: [AsrsComponent],
      imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatDividerModule,
        MatButtonModule, MatRadioModule, MatProgressBarModule, AsrsGaugeComponent,
        LatinToPersianNumbersPipe, NoopAnimationsModule],
    }).compileComponents();
  });

  afterEach(() => localStorage.removeItem(ASRS_HISTORY_STORAGE_KEY));

  function record(id: string, time: string, answer: number, label: string): AsrsHistoryRecordV1 {
    const saved = createAsrsHistoryRecord(Array(18).fill(answer), new Set(), new Date(time), () => id);
    saved.result.severityText = label;
    return saved;
  }

  it('opens from a partial questionnaire and returns without changing answers or storage', () => {
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.answers.at(0).setValue(4);
    component.next();
    component.answers.at(1).setValue(2);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.open-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.history-empty')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.history-empty').textContent).toContain('تاریخچه');
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBeNull();
    (fixture.nativeElement.querySelector('.back-from-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(component.currentStep).toBe(1);
    expect(component.answers.at(0).value).toBe(4);
    expect(component.answers.at(1).value).toBe(2);
    expect(fixture.nativeElement.querySelector('.result-card')).toBeNull();
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBeNull();
  });

  it('sorts stored snapshots newest first with stable ties and never writes while viewing', () => {
    const older = record('older', '2026-01-01T10:00:00.000Z', 0, 'برچسب قدیمی');
    const tieFirst = record('tie-first', '2026-09-02T10:00:00.000Z', 1, 'برچسب ذخیره‌شده الف');
    const tieSecond = record('tie-second', '2026-09-02T10:00:00.000Z', 4, 'برچسب ذخیره‌شده ب');
    const raw = JSON.stringify({ version: 1, records: [older, tieFirst, tieSecond] });
    localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, raw);
    const setItem = spyOn(localStorage, 'setItem').and.callThrough();
    const removeItem = spyOn(localStorage, 'removeItem').and.callThrough();
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    const open = () => {
      (fixture.nativeElement.querySelector('.open-history-button') as HTMLButtonElement).click();
      fixture.detectChanges();
      return [...fixture.nativeElement.querySelectorAll('.history-item')] as HTMLElement[];
    };
    const items = open();
    expect(items.map(item => item.dataset['recordId'])).toEqual(['tie-first', 'tie-second', 'older']);
    expect(items.map(item => item.textContent)).toEqual([
      jasmine.stringMatching(/۱۸.*برچسب ذخیره‌شده الف/),
      jasmine.stringMatching(/۷۲.*برچسب ذخیره‌شده ب/),
      jasmine.stringMatching(/۰.*برچسب قدیمی/),
    ]);
    expect(items[0].textContent).not.toContain('2026-09-02T');
    expect(items[0].textContent).not.toContain('tie-first');
    expect(items[0].textContent).toMatch(/[۰-۹]{1,2}:[۰-۹]{2}/);
    expect(items[0].querySelector('button')?.textContent).toContain('مشاهده');
    (fixture.nativeElement.querySelector('.back-from-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(open().map(item => item.dataset['recordId'])).toEqual(['tie-first', 'tie-second', 'older']);
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBe(raw);
    expect(setItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
  });

  it('opens the selected ID with its saved result and all submitted answers, then returns without writing', () => {
    const first = record('first', '2026-01-01T10:00:00.000Z', 4, 'برچسب اول');
    const second = record('second', '2026-09-02T10:00:00.000Z', 1, 'برچسب دوم');
    first.answers[0] = 0;
    first.answers[1] = 1;
    first.totalScore = 65;
    first.severityCategory = 'severe';
    first.result.emoji = '🙂';
    first.result.recommendationText = 'توصیه ذخیره‌شده اول';
    first.result.gaugeColor = '#123abc';
    second.result.recommendationText = 'توصیه ذخیره‌شده دوم';
    const raw = JSON.stringify({ version: 1, records: [first, second] });
    localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, raw);
    const setItem = spyOn(localStorage, 'setItem').and.callThrough();
    const removeItem = spyOn(localStorage, 'removeItem').and.callThrough();
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    (root.querySelector('.open-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    (root.querySelector('[data-record-id="first"] button') as HTMLButtonElement).click();
    fixture.detectChanges();

    const detail = root.querySelector('.history-detail') as HTMLElement;
    expect(detail).not.toBeNull();
    expect(detail.textContent).toContain('برچسب اول');
    expect(detail.textContent).toContain('توصیه ذخیره‌شده اول');
    expect(detail.textContent).toContain('🙂');
    expect(detail.textContent).toContain('۶۵');
    expect(detail.textContent).not.toContain('برچسب دوم');
    expect(detail.textContent).not.toContain('توصیه ذخیره‌شده دوم');
    expect(detail.textContent).not.toContain('first');
    expect(detail.textContent).not.toContain('2026-01-01T');
    expect(detail.querySelector('time')?.getAttribute('datetime')).toBe(first.submittedAt);
    expect(detail.querySelectorAll('.history-answer-item').length).toBe(18);
    expect(detail.querySelector('.history-answer-item')?.textContent).toContain('هرگز');
    expect(detail.querySelectorAll('mat-radio-button, input, select, textarea').length).toBe(0);
    expect(detail.textContent).not.toContain('هشدار');
    const gauge = detail.querySelector('ngx-gauge') as HTMLElement;
    expect(gauge.getAttribute('ng-reflect-value')).toBe('65');
    expect(gauge.querySelector('.asrs-gauge-foreground')?.getAttribute('stroke')).toBe('#123abc');
    (detail.querySelector('.back-from-detail-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root.querySelectorAll('.history-item').length).toBe(2);
    (root.querySelector('[data-record-id="second"] button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root.querySelector('.history-detail')?.textContent).toContain('برچسب دوم');
    expect(root.querySelector('.history-detail')?.textContent).toContain('توصیه ذخیره‌شده دوم');
    expect(root.querySelector('.history-detail')?.textContent).not.toContain('برچسب اول');
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBe(raw);
    expect(setItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
  });

  it('reports a stale selected ID and unavailable history without substituting a record', () => {
    const first = record('first', '2026-01-01T10:00:00.000Z', 1, 'اول');
    const second = record('second', '2026-02-01T10:00:00.000Z', 2, 'دوم');
    localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, JSON.stringify({ version: 1, records: [first, second] }));
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    (root.querySelector('.open-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, JSON.stringify({ version: 1, records: [second] }));
    (root.querySelector('[data-record-id="first"] button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root.querySelector('.history-detail-not-found')).not.toBeNull();
    expect(root.querySelector('.history-detail')?.textContent).not.toContain('دوم');
    (root.querySelector('.back-from-detail-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, '{bad');
    (root.querySelector('[data-record-id="second"] button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root.querySelector('.history-detail-unavailable')).not.toBeNull();
    expect(root.querySelector('.history-detail')?.textContent).not.toContain('دوم');
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBe('{bad');
  });

  it('renders each numeric answer using the existing labels and keeps an in-progress form intact', () => {
    const saved = record('saved', '2026-04-03T09:00:00.000Z', 0, 'ذخیره‌شده');
    saved.answers = Array.from({ length: 18 }, (_, index) => index % 5);
    saved.totalScore = saved.answers.reduce((total, answer) => total + answer, 0);
    saved.severityCategory = 'moderate';
    localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, JSON.stringify({ version: 1, records: [saved] }));
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.answers.at(0).setValue(4);
    component.next();
    component.answers.at(1).setValue(3);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    (root.querySelector('.open-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    (root.querySelector('.history-item button') as HTMLButtonElement).click();
    fixture.detectChanges();
    const items = Array.from(root.querySelectorAll('.history-answer-item')) as HTMLElement[];
    expect(items.length).toBe(18);
    const labels = ['هرگز', 'به ندرت', 'گاهی اوقات', 'اغلب', 'تقریباً همیشه'];
    items.forEach((item, index) => {
      expect(item.textContent).toContain(component.questions[index]);
      expect(item.textContent).toContain(labels[index % 5]);
    });
    (root.querySelector('.back-from-detail-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    (root.querySelector('.back-from-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(component.currentStep).toBe(1);
    expect(component.answers.at(0).value).toBe(4);
    expect(component.answers.at(1).value).toBe(3);
    expect(component.showResult).toBeFalse();
  });

  it('reopens the same saved snapshot after a fresh component instance', () => {
    const saved = record('saved', '2026-04-03T09:00:00.000Z', 2, 'نتیجه ذخیره‌شده');
    saved.result.recommendationText = 'توصیه ثبت‌شده';
    const raw = JSON.stringify({ version: 1, records: [saved] });
    localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, raw);
    const first = TestBed.createComponent(AsrsComponent);
    first.detectChanges();
    first.destroy();
    const refreshed = TestBed.createComponent(AsrsComponent);
    refreshed.detectChanges();
    const root = refreshed.nativeElement as HTMLElement;
    (root.querySelector('.open-history-button') as HTMLButtonElement).click();
    refreshed.detectChanges();
    (root.querySelector('[data-record-id="saved"] button') as HTMLButtonElement).click();
    refreshed.detectChanges();
    const detail = root.querySelector('.history-detail') as HTMLElement;
    expect(detail.querySelector('time')?.getAttribute('datetime')).toBe(saved.submittedAt);
    expect(detail.textContent).toContain('۳۶');
    expect(detail.textContent).toContain('نتیجه ذخیره‌شده');
    expect(detail.textContent).toContain('توصیه ثبت‌شده');
    expect(detail.querySelectorAll('.history-answer-item').length).toBe(18);
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBe(raw);
  });

  it('rechecks an open detail when storage changes and shows no cached snapshot', () => {
    const saved = record('saved', '2026-04-03T09:00:00.000Z', 1, 'نتیجه ذخیره‌شده');
    localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, JSON.stringify({ version: 1, records: [saved] }));
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    (root.querySelector('.open-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    (root.querySelector('.history-item button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root.querySelector('.history-detail')?.textContent).toContain('نتیجه ذخیره‌شده');
    localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, '{bad');
    window.dispatchEvent(new StorageEvent('storage', { key: ASRS_HISTORY_STORAGE_KEY }));
    fixture.detectChanges();
    expect(root.querySelector('.history-detail-unavailable')).not.toBeNull();
    expect(root.querySelector('.history-detail')?.textContent).not.toContain('نتیجه ذخیره‌شده');
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBe('{bad');
  });

  it('shows not found for an absent ID and preserves the current unsaved result on return', () => {
    const raw = '{"version":2,"records":[]}';
    localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, raw);
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.answers.controls.forEach(control => control.setValue(4));
    component.submit();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.history-unsaved-notice')).not.toBeNull();
    localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, '{"version":1,"records":[]}');
    const root = fixture.nativeElement as HTMLElement;
    (root.querySelector('.open-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    component.openHistoryRecord('absent');
    fixture.detectChanges();
    expect(root.querySelector('.history-detail-not-found')).not.toBeNull();
    expect(root.querySelectorAll('.history-answer-item').length).toBe(0);
    (root.querySelector('.back-from-detail-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    (root.querySelector('.back-from-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(component.showResult).toBeTrue();
    expect(component.totalScore).toBe(72);
    expect(root.querySelector('.history-unsaved-notice')).not.toBeNull();
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBe('{"version":1,"records":[]}');
  });

  it('shows unavailable history without a partial list or changing the raw value', () => {
    const raw = '{"version":2,"records":[]}';
    localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, raw);
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.open-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.history-unavailable')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.history-empty')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.history-item').length).toBe(0);
    (fixture.nativeElement.querySelector('.back-from-history-button') as HTMLButtonElement).click();
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBe(raw);
  });

  it('shows a valid empty envelope and keeps its raw value unchanged', () => {
    const raw = '{"version":1,"records":[]}';
    localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, raw);
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.open-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.history-empty')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.history-unavailable')).toBeNull();
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBe(raw);
  });

  it('loads each saved submission again after a new component instance', () => {
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    const first = fixture.componentInstance;
    first.answers.controls.forEach(control => control.setValue(1));
    first.submit();
    first.restart();
    first.answers.controls.forEach(control => control.setValue(4));
    first.submit();
    fixture.destroy();

    const refreshed = TestBed.createComponent(AsrsComponent);
    refreshed.detectChanges();
    (refreshed.nativeElement.querySelector('.open-history-button') as HTMLButtonElement).click();
    refreshed.detectChanges();
    const items = [...refreshed.nativeElement.querySelectorAll('.history-item')] as HTMLElement[];
    expect(items.length).toBe(2);
    const saved = JSON.parse(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)!) as { records: AsrsHistoryRecordV1[] };
    for (const record of saved.records) {
      const item = items.find(candidate => candidate.dataset['recordId'] === record.id);
      expect(item).toBeDefined();
      expect(item!.querySelector('time')?.getAttribute('datetime')).toBe(record.submittedAt);
      expect(item!.textContent).toContain(record.result.severityText);
      expect(item!.textContent).toContain(record.totalScore === 72 ? '۷۲' : '۱۸');
    }
    expect(items.every(item => item.querySelector('time')?.textContent?.match(/[۰-۹]{1,2}:[۰-۹]{2}/))).toBeTrue();
  });

  it('opens history from a result without replacing the current result, including an unsaved result', () => {
    const raw = '{"version":2,"records":[]}';
    localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, raw);
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.answers.controls.forEach(control => control.setValue(4));
    component.submit();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.history-unsaved-notice')).not.toBeNull();
    (fixture.nativeElement.querySelector('.open-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.history-unavailable')).not.toBeNull();
    (fixture.nativeElement.querySelector('.back-from-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(component.showResult).toBeTrue();
    expect(component.totalScore).toBe(72);
    expect(fixture.nativeElement.querySelector('.history-unsaved-notice')).not.toBeNull();
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBe(raw);
  });

  it('does not list a result when its storage write failed', () => {
    const setItem = spyOn(localStorage, 'setItem').and.throwError('write failed');
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    fixture.componentInstance.answers.controls.forEach(control => control.setValue(2));
    fixture.componentInstance.submit();
    fixture.detectChanges();
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('.history-unsaved-notice')).not.toBeNull();
    (fixture.nativeElement.querySelector('.open-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.history-empty')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.history-item').length).toBe(0);
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBeNull();
  });

  it('confirms the chosen duplicate-looking row by displayed details and deletes only its ID', () => {
    const first = record('first', '2026-04-03T09:00:00.000Z', 2, 'نتیجه یکسان');
    const second = record('second', '2026-04-03T09:00:00.000Z', 2, 'نتیجه یکسان');
    const third = record('third', '2026-01-01T09:00:00.000Z', 1, 'نتیجه دیگر');
    const raw = JSON.stringify({ version: 1, records: [third, first, second] });
    localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, raw);
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.answers.at(0).setValue(4);
    component.next();
    component.answers.at(1).setValue(3);
    const root = fixture.nativeElement as HTMLElement;
    (root.querySelector('.open-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    (root.querySelector('[data-record-id="second"] .delete-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    const confirmation = root.querySelector('.history-delete-confirmation') as HTMLElement;
    expect(confirmation.textContent).toContain('نتیجه یکسان');
    expect(confirmation.textContent).toContain('۳۶');
    expect(confirmation.querySelector('time')?.getAttribute('datetime')).toBe(second.submittedAt);
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBe(raw);
    (root.querySelector('.cancel-history-delete-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root.querySelector('.history-delete-confirmation')).toBeNull();
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBe(raw);
    (root.querySelector('[data-record-id="second"] .delete-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    (root.querySelector('.confirm-history-delete-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(Array.from(root.querySelectorAll('.history-item')).map(item => (item as HTMLElement).dataset['recordId']))
      .toEqual(['first', 'third']);
    expect(JSON.parse(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)!).records).toEqual([third, first]);
    expect(component.currentStep).toBe(1);
    expect(component.answers.at(0).value).toBe(4);
    expect(component.answers.at(1).value).toBe(3);
    fixture.destroy();
    const refreshed = TestBed.createComponent(AsrsComponent);
    refreshed.detectChanges();
    (refreshed.nativeElement.querySelector('.open-history-button') as HTMLButtonElement).click();
    refreshed.detectChanges();
    expect(Array.from(refreshed.nativeElement.querySelectorAll('.history-item'))
      .map(item => (item as HTMLElement).dataset['recordId'])).toEqual(['first', 'third']);
  });

  it('reports a disappeared record and refreshes the list without overwriting storage', () => {
    const saved = record('saved', '2026-04-03T09:00:00.000Z', 1, 'نتیجه');
    localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, JSON.stringify({ version: 1, records: [saved] }));
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    (root.querySelector('.open-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    (root.querySelector('.delete-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    const raw = '{"version":1,"records":[]}';
    localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, raw);
    (root.querySelector('.confirm-history-delete-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root.querySelector('.history-delete-not-found')).not.toBeNull();
    expect(root.querySelector('.history-empty')).not.toBeNull();
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBe(raw);
  });

  it('disables deletion on malformed history and reports a write failure on valid history', () => {
    const saved = record('saved', '2026-04-03T09:00:00.000Z', 1, 'نتیجه');
    localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, JSON.stringify({ version: 1, records: [saved] }));
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    (root.querySelector('.open-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    (root.querySelector('.delete-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    const raw = '{"version":2,"records":[]}';
    localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, raw);
    (root.querySelector('.confirm-history-delete-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root.querySelector('.history-unavailable')).not.toBeNull();
    expect(root.querySelector('.delete-history-button')).toBeNull();
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBe(raw);
    localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, JSON.stringify({ version: 1, records: [saved] }));
    fixture.componentInstance.openHistory();
    fixture.detectChanges();
    const validRaw = localStorage.getItem(ASRS_HISTORY_STORAGE_KEY);
    (root.querySelector('.delete-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    spyOn(localStorage, 'setItem').and.throwError('write failed');
    (root.querySelector('.confirm-history-delete-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root.querySelector('.history-delete-failed')).not.toBeNull();
    expect(root.querySelectorAll('.history-item').length).toBe(1);
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBe(validRaw);

  });

  it('shows empty history after deleting its only record and permits a later save', () => {
    const saved = record('saved', '2026-04-03T09:00:00.000Z', 1, 'نتیجه');
    localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, JSON.stringify({ version: 1, records: [saved] }));
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    (root.querySelector('.open-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    (root.querySelector('.delete-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    (root.querySelector('.confirm-history-delete-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root.querySelector('.history-empty')).not.toBeNull();
    (root.querySelector('.back-from-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    fixture.componentInstance.answers.controls.forEach(control => control.setValue(4));
    fixture.componentInstance.submit();
    fixture.componentInstance.openHistory();
    fixture.detectChanges();
    expect(root.querySelectorAll('.history-item').length).toBe(1);
  });

  it('preserves an unsaved current result through confirmation, cancel, and deletion', () => {
    const saved = record('saved', '2026-04-03T09:00:00.000Z', 1, 'نتیجه');
    localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, JSON.stringify({ version: 1, records: [saved] }));
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.answers.controls.forEach(control => control.setValue(4));
    spyOn(localStorage, 'setItem').and.throwError('write failed');
    component.submit();
    fixture.detectChanges();
    expect(component.savedRecord).toBeNull();
    const root = fixture.nativeElement as HTMLElement;
    (root.querySelector('.open-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    (root.querySelector('.delete-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    (root.querySelector('.cancel-history-delete-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    (root.querySelector('.delete-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    // A later write can succeed after the failed submission.
    (localStorage.setItem as jasmine.Spy).and.callThrough();
    (root.querySelector('.confirm-history-delete-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    (root.querySelector('.back-from-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(component.showResult).toBeTrue();
    expect(component.totalScore).toBe(72);
    expect(component.savedRecord).toBeNull();
    expect(root.querySelector('.history-unsaved-notice')).not.toBeNull();
  });

  it('confirms all records separately, cancels without writes, then clears and keeps the current questionnaire', () => {
    const records = [record('one', '2026-04-03T09:00:00.000Z', 1, 'یک'),
      record('two', '2026-04-04T09:00:00.000Z', 2, 'دو')];
    const raw = JSON.stringify({ version: 1, records });
    localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, raw);
    localStorage.setItem('other:assessment', 'untouched');
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.answers.at(0).setValue(4);
    component.next();
    const root = fixture.nativeElement as HTMLElement;
    (root.querySelector('.open-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    const clearButton = root.querySelector('.clear-history-button') as HTMLButtonElement;
    expect(clearButton.textContent).toContain('همه');
    expect(clearButton.closest('.history-item')).toBeNull();
    clearButton.click();
    fixture.detectChanges();
    expect(root.querySelector('.history-clear-confirmation')?.textContent).toContain('۲');
    expect(root.querySelector('.history-clear-confirmation')?.textContent).toContain('همه');
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBe(raw);
    (root.querySelector('.cancel-history-clear-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root.querySelectorAll('.history-item').length).toBe(2);
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBe(raw);
    (root.querySelector('.clear-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    (root.querySelector('.confirm-history-clear-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root.querySelector('.history-clear-success')).not.toBeNull();
    expect(root.querySelector('.history-empty')).not.toBeNull();
    expect(root.querySelector('.clear-history-button')).toBeNull();
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBe('{"version":1,"records":[]}');
    expect(localStorage.getItem('other:assessment')).toBe('untouched');
    component.openHistoryRecord('one');
    fixture.detectChanges();
    expect(root.querySelector('.history-detail-not-found')).not.toBeNull();
    component.closeHistoryRecord();
    fixture.detectChanges();
    (root.querySelector('.back-from-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(component.currentStep).toBe(1);
    expect(component.answers.at(0).value).toBe(4);
    fixture.destroy();
    const refreshed = TestBed.createComponent(AsrsComponent);
    refreshed.detectChanges();
    (refreshed.nativeElement.querySelector('.open-history-button') as HTMLButtonElement).click();
    refreshed.detectChanges();
    expect(refreshed.nativeElement.querySelector('.history-empty')).not.toBeNull();
    localStorage.removeItem('other:assessment');
  });

  it('refreshes changed records without clearing, and reports write failure without hiding records', () => {
    const first = record('one', '2026-04-03T09:00:00.000Z', 1, 'یک');
    localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, JSON.stringify({ version: 1, records: [first] }));
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    (root.querySelector('.open-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    (root.querySelector('.clear-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    const second = record('two', '2026-04-04T09:00:00.000Z', 2, 'دو');
    const changed = JSON.stringify({ version: 1, records: [first, second] });
    localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, changed);
    (root.querySelector('.confirm-history-clear-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root.querySelector('.history-clear-changed')).not.toBeNull();
    expect(root.querySelector('.history-clear-confirmation')).toBeNull();
    expect(root.querySelectorAll('.history-item').length).toBe(2);
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBe(changed);
    (root.querySelector('.clear-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root.querySelector('.history-clear-confirmation')?.textContent).toContain('۲');
    spyOn(localStorage, 'setItem').and.throwError('write failed');
    (root.querySelector('.confirm-history-clear-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root.querySelector('.history-clear-failed')).not.toBeNull();
    expect(root.querySelector('.history-empty')).toBeNull();
    expect(root.querySelectorAll('.history-item').length).toBe(2);
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBe(changed);
  });

  it('does not offer clear-all for empty or unavailable history', () => {
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    (root.querySelector('.open-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root.querySelector('.clear-history-button')).toBeNull();
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBeNull();
    for (const raw of ['{"version":1,"records":[]}', '{bad', '{"version":2,"records":[]}',
      '{"version":1,"records":[{}]}']) {
      localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, raw);
      fixture.componentInstance.openHistory();
      fixture.detectChanges();
      expect(root.querySelector('.clear-history-button')).toBeNull();
      expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toBe(raw);
    }
  });

  it('keeps an unsaved current result and its notice through clear confirmation and success', () => {
    const saved = record('saved', '2026-04-03T09:00:00.000Z', 1, 'پیشین');
    localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, JSON.stringify({ version: 1, records: [saved] }));
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.answers.controls.forEach(control => control.setValue(4));
    spyOn(localStorage, 'setItem').and.throwError('write failed');
    component.submit();
    (localStorage.setItem as jasmine.Spy).and.callThrough();
    const root = fixture.nativeElement as HTMLElement;
    (root.querySelector('.open-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    (root.querySelector('.clear-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    (root.querySelector('.cancel-history-clear-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    (root.querySelector('.clear-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    (root.querySelector('.confirm-history-clear-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    (root.querySelector('.back-from-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(component.showResult).toBeTrue();
    expect(component.totalScore).toBe(72);
    expect(component.savedRecord).toBeNull();
    expect(root.querySelector('.history-unsaved-notice')).not.toBeNull();
  });
});
