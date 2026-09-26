import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatStepperModule } from '@angular/material/stepper';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NbCardModule, NbLayoutModule } from '@nebular/theme';
import { NgxGaugeModule } from 'ngx-gauge';
import { MatListModule } from '@angular/material/list'
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { BaseChartDirective } from 'ng2-charts';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {MatChipsModule} from '@angular/material/chips';
import { MatPaginatorModule } from '@angular/material/paginator';
import { LoadingOverlayComponent } from './loading-overlay/loading-overlay.component';
import { EmotionBadgeComponent } from './emotion/emotion-badge.component';


@NgModule({
  declarations: [
    LoadingOverlayComponent,
    EmotionBadgeComponent,
  ],
  imports: [
    CommonModule,
    MatCardModule,
    MatDividerModule,
    MatButtonModule,
    MatRadioModule,
    MatFormFieldModule,
    MatStepperModule,
    MatInputModule,
    MatSnackBarModule,
    MatDialogModule,
    MatProgressBarModule,
    MatIconModule,
    NbCardModule,
    NbLayoutModule,
    NgxGaugeModule,
    MatListModule,
    MatSidenavModule,
    MatToolbarModule,
    MatExpansionModule,
    BaseChartDirective,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatPaginatorModule,
  ],
  exports: [
    MatCardModule,
    MatDividerModule,
    MatButtonModule,
    MatRadioModule,
    MatFormFieldModule,
    MatStepperModule,
    MatInputModule,
    MatSnackBarModule,
    MatDialogModule,
    MatProgressBarModule,
    MatIconModule,
    NbCardModule,
    NbLayoutModule,
    NgxGaugeModule,
    MatListModule,
    MatSidenavModule,
    MatToolbarModule,
    MatExpansionModule,
    BaseChartDirective,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatPaginatorModule,
    LoadingOverlayComponent,
    EmotionBadgeComponent
  ]
})
export class UiShareModule { }
