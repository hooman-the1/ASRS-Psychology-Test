import { CommonModule } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { AsrsComponent } from './asrs.component';
import { AsrsGaugeComponent } from './asrs-gauge.component';
import { ASRS_HISTORY_STORAGE_KEY, createAsrsHistoryRecord } from './asrs-history';
import { LatinToPersianNumbersPipe } from './latin-to-persian-numbers.pipe';

describe('ASRS Persian number presentation', () => {
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

  it('preserves punctuation and existing Persian digits while converting only ASCII digits', () => {
    const pipe = new LatinToPersianNumbersPipe();
    expect(pipe.transform('A0-9، ۴.')).toBe('A۰-۹، ۴.');
    expect(pipe.transform(72)).toBe('۷۲');
    expect(pipe.transform(null)).toBeNull();
    expect(pipe.transform(undefined)).toBeUndefined();
  });

  it('shows Persian intro and question numbers while keeping navigation and progress numeric', () => {
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const component = fixture.componentInstance;
    const question = () => (root.querySelector('.question') as HTMLElement).textContent!.trim();
    const progress = () => Number(root.querySelector('mat-progress-bar')!.getAttribute('aria-valuenow'));

    expect(root.querySelector('.intro-text')?.textContent).toContain('۶ ماه');
    expect(question()).toMatch(/^۱\./);
    expect(progress()).toBeCloseTo(100 / 18, 4);
    component.answers.controls.forEach(control => control.setValue(3));
    for (let step = 0; step < 9; step++) component.next();
    fixture.detectChanges();
    expect(question()).toMatch(/^۱۰\./);
    expect(progress()).toBeCloseTo(1000 / 18, 4);
    component.prev();
    fixture.detectChanges();
    expect(question()).toMatch(/^۹\./);
    expect(component.getCurrentControl().value).toBe(3);
    for (let step = 8; step < 17; step++) component.next();
    fixture.detectChanges();
    expect(question()).toMatch(/^۱۸\./);
    expect(progress()).toBe(100);
    expect(component.getCurrentControl().value).toBe(3);
  });

  it('shows matching Persian result scores without changing numeric gauge or saved values', () => {
    for (const answer of [0, 4]) {
      const fixture = TestBed.createComponent(AsrsComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;
      component.answers.controls.forEach(control => control.setValue(answer));
      component.submit();
      fixture.detectChanges();
      const result = fixture.nativeElement.querySelector('.result-card') as HTMLElement;
      const score = answer === 0 ? '۰' : '۷۲';
      expect(result.querySelector('mat-card-content p')?.textContent).toContain(score);
      expect(result.querySelector('ngx-gauge + p')?.textContent).toContain(`${score} امتیاز`);
      expect(component.totalScore).toBe(answer * 18);
      expect(component.gaugeValue).toBe(answer * 18);
      expect(component.savedRecord?.answers).toEqual(Array(18).fill(answer));
      expect(component.savedRecord?.totalScore).toBe(answer * 18);
      fixture.destroy();
      localStorage.removeItem(ASRS_HISTORY_STORAGE_KEY);
    }
  });

  it('keeps list, detail, delete date and score aligned, without duplicate Latin list markers', () => {
    const timestamp = '2026-11-23T14:45:00.000Z';
    const record = createAsrsHistoryRecord(Array(18).fill(4), new Set(), new Date(timestamp), () => 'saved');
    localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, JSON.stringify({ version: 1, records: [record] }));
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    (root.querySelector('.open-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    const row = root.querySelector('.history-item') as HTMLElement;
    const rowDate = row.querySelector('time')!.textContent!;
    expect(row.textContent).toContain('۷۲');
    expect(rowDate).toMatch(/[۰-۹]{2}:[۰-۹]{2}/);
    expect(rowDate).not.toMatch(/[0-9]/);
    expect(row.querySelector('time')!.getAttribute('datetime')).toBe(timestamp);
    (row.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    const detail = root.querySelector('.history-detail') as HTMLElement;
    expect(detail.querySelector('time')?.textContent).toBe(rowDate);
    expect(detail.querySelector('time')?.getAttribute('datetime')).toBe(timestamp);
    expect(detail.textContent).toContain('۷۲ امتیاز');
    const answers = Array.from(detail.querySelectorAll('.history-answer-item')) as HTMLElement[];
    expect(answers.length).toBe(18);
    expect(answers[0].textContent).toContain('۱.');
    expect(answers[17].textContent).toContain('۱۸.');
    expect(getComputedStyle(answers[0]).listStyleType).toBe('none');
    (root.querySelector('.back-from-detail-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    (root.querySelector('.delete-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    const confirmation = root.querySelector('.history-delete-confirmation') as HTMLElement;
    expect(confirmation.textContent).toContain('۷۲');
    expect(confirmation.querySelector('time')?.textContent).toBe(rowDate);
    expect(confirmation.querySelector('time')?.getAttribute('datetime')).toBe(timestamp);
    expect(localStorage.getItem(ASRS_HISTORY_STORAGE_KEY)).toContain('"totalScore":72');
  });

  it('shows one- and two-digit counts only for validated history', () => {
    const records = Array.from({ length: 10 }, (_, index) =>
      createAsrsHistoryRecord(Array(18).fill(0), new Set(), new Date(2026, 0, index + 1), () => `id-${index}`));
    localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, JSON.stringify({ version: 1, records: records.slice(0, 1) }));
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    (root.querySelector('.open-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    (root.querySelector('.clear-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root.querySelector('.history-clear-confirmation')?.textContent).toContain('۱ ارزیابی');
    (root.querySelector('.cancel-history-clear-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    localStorage.setItem(ASRS_HISTORY_STORAGE_KEY, JSON.stringify({ version: 1, records }));
    fixture.componentInstance.openHistory();
    fixture.detectChanges();
    (root.querySelector('.clear-history-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root.querySelector('.history-clear-confirmation')?.textContent).toContain('۱۰ ارزیابی');
    expect(root.querySelector('.history-clear-confirmation')?.textContent).not.toMatch(/[0-9]/);
    (root.querySelector('.confirm-history-clear-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root.querySelector('.history-empty')).not.toBeNull();
    expect(root.querySelector('.history-clear-confirmation')).toBeNull();
  });
});
