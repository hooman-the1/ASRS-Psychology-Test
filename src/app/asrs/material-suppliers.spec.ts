import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TestBed } from '@angular/core/testing';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatDividerModule,
    MatButtonModule,
    MatRadioModule,
    MatProgressBarModule,
  ],
  template: `
    <mat-card>
      <mat-card-title>Supplier check</mat-card-title>
      <mat-divider></mat-divider>
      <mat-card-content>
        <form [formGroup]="form">
          <mat-radio-group formControlName="answer">
            <mat-radio-button [value]="2">Sometimes</mat-radio-button>
          </mat-radio-group>
        </form>
      </mat-card-content>
      <mat-card-actions><button mat-raised-button>Continue</button></mat-card-actions>
      <mat-progress-bar mode="determinate" [value]="50"></mat-progress-bar>
    </mat-card>
  `,
})
class MaterialSuppliersFixture {
  readonly form = new FormGroup({ answer: new FormControl<number | null>(null) });
}

describe('ASRS direct Material suppliers', () => {
  it('renders its Material controls and updates a reactive form answer', async () => {
    await TestBed.configureTestingModule({
      imports: [MaterialSuppliersFixture],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    const fixture = TestBed.createComponent(MaterialSuppliersFixture);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('mat-card-title')?.textContent).toContain('Supplier check');
    expect(host.querySelector('mat-divider')).not.toBeNull();
    expect(host.querySelector('button[mat-raised-button]')).not.toBeNull();
    expect(host.querySelector('mat-progress-bar')?.getAttribute('aria-valuenow')).toBe('50');

    const radio = host.querySelector('mat-radio-button input') as HTMLInputElement;
    expect(radio).not.toBeNull();
    radio.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.answer.value).toBe(2);
  });
});
