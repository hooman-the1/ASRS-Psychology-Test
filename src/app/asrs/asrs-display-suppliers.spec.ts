import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { getGaugeMarkers } from './asrs.helpers';
import { AsrsGaugeComponent } from './asrs-gauge.component';
import { LatinToPersianNumbersPipe } from './latin-to-persian-numbers.pipe';

@Component({
  standalone: true,
  imports: [CommonModule, AsrsGaugeComponent, LatinToPersianNumbersPipe],
  template: `
    <ngx-gauge
      [value]="score"
      [foregroundColor]="color"
      [markers]="markers"
      [min]="0"
      [max]="72"
      [size]="220"
      [thick]="15"
      [cap]="'round'"
      [type]="'arch'"
      [duration]="2500"
      [label]="'Score'"
      [append]="''"
      [margin]="20"
    ></ngx-gauge>
    <span class="visible-score">{{ score | latinToPersianNumbers }}</span>
  `,
})
class AsrsDisplayFixture {
  score = 0;
  color = '#43a047';
  markers = getGaugeMarkers(this.score, this.color);

  setResult(score: number, color: string): void {
    this.score = score;
    this.color = color;
    this.markers = getGaugeMarkers(score, color);
  }
}

describe('ASRS local display suppliers', () => {
  it('converts only ASCII digits and keeps nullish values', () => {
    const pipe = new LatinToPersianNumbersPipe();

    expect(pipe.transform('0123456789')).toBe('۰۱۲۳۴۵۶۷۸۹');
    expect(pipe.transform('A12/ب34')).toBe('A۱۲/ب۳۴');
    expect(pipe.transform('-12.50')).toBe('-۱۲.۵۰');
    expect(pipe.transform('۴۲')).toBe('۴۲');
    expect(pipe.transform(72)).toBe('۷۲');
    expect(pipe.transform(null)).toBeNull();
    expect(pipe.transform(undefined)).toBeUndefined();
  });

  it('places a colored Persian-labeled marker and foreground at 0, 36, and 72', async () => {
    await TestBed.configureTestingModule({ imports: [AsrsDisplayFixture] }).compileComponents();

    const fixture = TestBed.createComponent(AsrsDisplayFixture);
    for (const [score, color, expectedX, expectedY, expectedDash, expectedText] of [
      [0, '#43a047', 2.5, 110, null, '۰'],
      [36, '#fb8c00', 110, 2.5, '50 100', '۳۶'],
      [72, '#e53935', 217.5, 110, '100 100', '۷۲'],
    ] as const) {
      fixture.componentInstance.setResult(score, color);
      fixture.detectChanges();

      const host = fixture.nativeElement as HTMLElement;
      const svg = host.querySelector('ngx-gauge svg') as SVGElement;
      const track = svg.querySelector('.asrs-gauge-track') as SVGPathElement;
      const foreground = svg.querySelector('.asrs-gauge-foreground') as SVGPathElement | null;
      const marker = svg.querySelector('.asrs-gauge-marker') as SVGPolygonElement;
      const [tipX, tipY] = marker.getAttribute('points')!.split(' ')[0].split(',').map(Number);

      expect(svg.getAttribute('width')).toBe('220');
      expect(svg.getAttribute('viewBox')).toBe('0 0 220 130');
      expect(track.getAttribute('d')).toBe('M 20 110 A 90 90 0 0 1 200 110');
      if (score === 0) {
        expect(foreground).toBeNull();
      } else {
        expect(foreground?.getAttribute('stroke-width')).toBe('15');
        expect(foreground?.getAttribute('stroke-linecap')).toBe('round');
        expect(foreground?.getAttribute('stroke')).toBe(color);
        expect(foreground?.getAttribute('stroke-dasharray')).toBe(expectedDash);
      }
      expect(marker.getAttribute('fill')).toBe(color);
      expect(marker.getAttribute('aria-label')).toBe('نمره شما');
      expect(tipX).toBeCloseTo(expectedX, 5);
      expect(tipY).toBeCloseTo(expectedY, 5);
      expect(host.querySelector('.visible-score')?.textContent?.trim()).toBe(expectedText);
      expect(svg.textContent).not.toContain('Score');
    }
  });
});
