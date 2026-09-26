import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

interface AsrsGaugeMarker {
  color: string;
  type: string;
  size: number;
  label: string;
}

interface PositionedMarker {
  points: string;
  color: string;
  label: string;
}

@Component({
  selector: 'ngx-gauge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg [attr.width]="size" [attr.height]="svgHeight" [attr.viewBox]="viewBox" role="img"
      [attr.aria-label]="marker?.label || ''">
      <path class="asrs-gauge-track" [attr.d]="archPath" fill="none" stroke="#e0e0e0"
        [attr.stroke-width]="thick" [attr.stroke-linecap]="cap" />
      <path class="asrs-gauge-foreground" [attr.d]="archPath" fill="none"
        [attr.stroke]="foregroundColor" [attr.stroke-width]="thick"
        [attr.stroke-linecap]="cap" pathLength="100"
        [attr.stroke-dasharray]="progressPercent + ' 100'" />
      <ng-container *ngIf="marker as currentMarker">
        <polygon class="asrs-gauge-marker" [attr.points]="currentMarker.points"
          [attr.fill]="currentMarker.color" [attr.aria-label]="currentMarker.label">
          <title>{{ currentMarker.label }}</title>
        </polygon>
      </ng-container>
    </svg>
  `,
  styles: [':host { display: block; width: fit-content; margin: 0 auto; } svg { display: block; }'],
})
export class AsrsGaugeComponent {
  @Input() value = 0;
  @Input() min = 0;
  @Input() max = 72;
  @Input() size = 220;
  @Input() thick = 15;
  @Input() margin = 20;
  @Input() foregroundColor = '#43a047';
  @Input() cap = 'round';
  @Input() markers: Record<number, AsrsGaugeMarker> = {};

  // Retain the copied template's inputs. This local arch has no animation or center label.
  @Input() type = 'arch';
  @Input() duration = 2500;
  @Input() label = '';
  @Input() append = '';

  get center(): number {
    return this.size / 2;
  }

  get radius(): number {
    return Math.max(0, this.center - this.margin);
  }

  get svgHeight(): number {
    return this.center + this.margin;
  }

  get viewBox(): string {
    return `0 0 ${this.size} ${this.svgHeight}`;
  }

  get archPath(): string {
    return `M ${this.center - this.radius} ${this.center} A ${this.radius} ${this.radius} 0 0 1 ${this.center + this.radius} ${this.center}`;
  }

  get progressPercent(): number {
    return this.percentFor(this.value);
  }

  get marker(): PositionedMarker | null {
    const entry = Object.entries(this.markers)[0];
    if (!entry) {
      return null;
    }

    const [score, marker] = entry;
    const angle = Math.PI * this.percentFor(Number(score)) / 100;
    const outwardX = -Math.cos(angle);
    const outwardY = -Math.sin(angle);
    const x = this.center + this.radius * outwardX;
    const y = this.center + this.radius * outwardY;
    const tipX = x + marker.size * outwardX;
    const tipY = y + marker.size * outwardY;
    const halfBase = marker.size * 0.6;
    const baseA = `${x - halfBase * outwardY},${y + halfBase * outwardX}`;
    const baseB = `${x + halfBase * outwardY},${y - halfBase * outwardX}`;

    return {
      points: `${tipX},${tipY} ${baseA} ${baseB}`,
      color: marker.color,
      label: marker.label,
    };
  }

  private percentFor(score: number): number {
    const range = this.max - this.min;
    if (range <= 0) {
      return 0;
    }
    return Math.min(100, Math.max(0, (score - this.min) / range * 100));
  }
}
