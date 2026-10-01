import { TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';

import { AsrsComponent } from './asrs.component';
import { AsrsGaugeComponent } from './asrs-gauge.component';
import { getGaugeMarkers, getSeverityCategory, getGaugeColor } from './asrs.helpers';
import { LatinToPersianNumbersPipe } from './latin-to-persian-numbers.pipe';

describe('ASRS rendered gauge mapping', () => {
  it('paints the track, progress, and endpoint markers at 0, 36, and 72', async () => {
    await TestBed.configureTestingModule({ imports: [AsrsGaugeComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AsrsGaugeComponent);
    const gauge = fixture.componentInstance;

    const pixel = async (svg: SVGSVGElement, x: number, y: number): Promise<number[]> => {
      const data = new XMLSerializer().serializeToString(svg);
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('SVG image could not be rendered'));
        image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(data)}`;
      });
      const canvas = document.createElement('canvas');
      canvas.width = 220;
      canvas.height = 130;
      const context = canvas.getContext('2d')!;
      context.drawImage(image, 0, 0);
      return Array.from(context.getImageData(x, y, 1, 1).data);
    };

    for (const [score, color, coloredArc, markerX, markerY] of [
      [0, '#43a047', [false, false, false], 5, 110],
      [36, '#fb8c00', [true, true, false], 110, 5],
      [72, '#e53935', [true, true, true], 215, 110],
    ] as const) {
      gauge.value = score;
      gauge.foregroundColor = color;
      gauge.markers = getGaugeMarkers(score, color);
      fixture.detectChanges();
      const svg = fixture.nativeElement.querySelector('svg') as SVGSVGElement;
      const colorRgb = [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16));
      for (const [index, x, y] of [[0, 20, 110], [1, 110, 20], [2, 200, 110]]) {
        const expected = coloredArc[index] ? colorRgb : [224, 224, 224];
        expect((await pixel(svg, x, y)).slice(0, 3))
          .withContext(`painted arc at score ${score}, point ${index}`).toEqual(expected);
      }
      const markerPixel = await pixel(svg, markerX, markerY);
      expect(markerPixel[3]).withContext(`visible triangle at score ${score}`).toBeGreaterThan(200);
      expect(Math.max(...markerPixel.slice(0, 3).map((channel, index) =>
        Math.abs(channel - colorRgb[index]))))
        .withContext(`painted triangle at score ${score}`).toBeLessThan(5);
    }
  });

  it('keeps the marker and filled arc proportional over the complete 0-72 range', async () => {
    await TestBed.configureTestingModule({ imports: [AsrsGaugeComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AsrsGaugeComponent);
    const gauge = fixture.componentInstance;
    let lastX = -Infinity;

    for (let score = 0; score <= 72; score++) {
      const color = getGaugeColor(getSeverityCategory(score));
      gauge.value = score;
      gauge.foregroundColor = color;
      gauge.markers = getGaugeMarkers(score, color);
      fixture.detectChanges();

      const svg = fixture.nativeElement.querySelector('svg') as SVGSVGElement;
      const track = svg.querySelector('.asrs-gauge-track') as SVGPathElement;
      const progress = svg.querySelector('.asrs-gauge-foreground') as SVGPathElement | null;
      const marker = svg.querySelector('.asrs-gauge-marker') as SVGPolygonElement;
      const points = marker.getAttribute('points')!.split(' ').map(point => point.split(',').map(Number));
      const markerBaseX = (points[1][0] + points[2][0]) / 2;
      const markerBaseY = (points[1][1] + points[2][1]) / 2;
      const radius = 90;
      const angle = Math.PI * score / 72;
      const expectedX = 110 - (radius + 7.5) * Math.cos(angle);
      const expectedY = 110 - (radius + 7.5) * Math.sin(angle);

      expect(track.getAttribute('stroke')).withContext(`track at ${score}`).toBe('#e0e0e0');
      expect(track.getAttribute('stroke-linecap')).toBe('round');
      expect(track.getAttribute('d')).toBe('M 20 110 A 90 90 0 0 1 200 110');
      expect(svg.getAttribute('width')).toBe('220');
      expect(svg.getAttribute('viewBox')).toBe('0 0 220 130');
      expect(svg.querySelectorAll('.asrs-gauge-marker').length).toBe(1);
      expect(marker.getAttribute('fill')).withContext(`marker at ${score}`).toBe(color);
      expect(marker.getAttribute('aria-label')).toBe('\u0646\u0645\u0631\u0647 \u0634\u0645\u0627');
      expect(marker.querySelector('title')?.textContent).toBe('\u0646\u0645\u0631\u0647 \u0634\u0645\u0627');
      expect(svg.getAttribute('aria-label')).toBe('\u0646\u0645\u0631\u0647 \u0634\u0645\u0627');
      expect(markerBaseX).withContext(`marker x at ${score}`).toBeCloseTo(expectedX, 5);
      expect(markerBaseY).withContext(`marker y at ${score}`).toBeCloseTo(expectedY, 5);
      expect(markerBaseX).toBeGreaterThanOrEqual(lastX);
      lastX = markerBaseX;

      if (score === 0) {
        expect(progress).toBeNull();
      } else {
        expect(progress?.getAttribute('stroke')).withContext(`arc at ${score}`).toBe(color);
        expect(progress?.getAttribute('pathLength')).toBe('100');
        expect(progress?.getAttribute('stroke-dasharray'))
          .withContext(`arc length at ${score}`).toBe(`${score / 72 * 100} 100`);
      }
    }
  });
});

describe('ASRS submitted result gauge', () => {
  it('binds each threshold total and category color to the same result', async () => {
    await TestBed.configureTestingModule({
      declarations: [AsrsComponent],
      imports: [
        CommonModule, ReactiveFormsModule, MatButtonModule, MatCardModule,
        MatDividerModule, MatProgressBarModule, MatRadioModule,
        NoopAnimationsModule, AsrsGaugeComponent, LatinToPersianNumbersPipe,
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AsrsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const persianNumbers = new LatinToPersianNumbersPipe();

    for (const score of [0, 17, 18, 27, 28, 36, 37, 72, 0]) {
      const answers = Array(18).fill(0);
      let remaining = score;
      for (let index = 0; index < answers.length; index++) {
        answers[index] = Math.min(4, remaining);
        remaining -= answers[index];
      }
      component.answers.controls.forEach((control, index) => control.setValue(answers[index]));
      component.submit();
      fixture.detectChanges();

      const color = getGaugeColor(getSeverityCategory(score));
      const result = fixture.nativeElement.querySelector('.result-card') as HTMLElement;
      const svg = result.querySelector('ngx-gauge svg') as SVGSVGElement;
      const progress = svg.querySelector('.asrs-gauge-foreground') as SVGPathElement | null;
      const marker = svg.querySelector('.asrs-gauge-marker') as SVGPolygonElement;
      const severity = result.querySelector('mat-card-content p span') as HTMLElement;
      const text = persianNumbers.transform(score);

      expect(component.totalScore).toBe(score);
      expect(component.gaugeValue).toBe(score);
      expect(result.querySelectorAll('ngx-gauge').length).toBe(1);
      expect(result.querySelectorAll('mat-card-content p')[0].textContent).toContain(text);
      expect(result.querySelectorAll('mat-card-content p')[3].textContent).toContain(text);
      expect(severity.style.color).toBe(color === '#43a047' ? 'rgb(67, 160, 71)'
        : color === '#fdd835' ? 'rgb(253, 216, 53)'
        : color === '#fb8c00' ? 'rgb(251, 140, 0)' : 'rgb(229, 57, 53)');
      expect(marker.getAttribute('fill')).toBe(color);
      expect(progress?.getAttribute('stroke') ?? null).toBe(score === 0 ? null : color);

      component.restart();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.result-card')).toBeNull();
    }
  });
});
