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
import { LatinToPersianNumbersPipe } from './latin-to-persian-numbers.pipe';

describe('local ASRS presentation assets', () => {
  it('uses the local Vazir face in active Material text and serves its font file', async () => {
    expect(getComputedStyle(document.body).fontFamily).toContain('Vazir');

    await TestBed.configureTestingModule({
      declarations: [AsrsComponent],
      imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatCardModule,
        MatDividerModule, MatProgressBarModule, MatRadioModule, NoopAnimationsModule,
        AsrsGaugeComponent, LatinToPersianNumbersPipe],
    }).compileComponents();
    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    document.body.append(fixture.nativeElement);
    for (const selector of ['.main-title', '.question', 'mat-radio-button .mdc-label', '.open-history-button']) {
      expect(getComputedStyle(fixture.nativeElement.querySelector(selector)).fontFamily)
        .withContext(selector).toContain('Vazir');
    }
    fixture.destroy();

    const response = await fetch('/assets/fonts/Vazir.ttf', { cache: 'no-store' });
    expect(response.ok).toBeTrue();
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(80_000);
  });
});
