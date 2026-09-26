import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AsrsComponent } from './asrs.component';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AsrsRoutingModule } from './asrs-routing.module';
import { LatinToPersianNumbersPipe } from './latin-to-persian-numbers.pipe';
import { AsrsGaugeComponent } from './asrs-gauge.component';

@NgModule({
    declarations: [AsrsComponent],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatDividerModule,
        MatButtonModule,
        MatRadioModule,
        MatProgressBarModule,
        AsrsRoutingModule,
        LatinToPersianNumbersPipe,
        AsrsGaugeComponent
    ]
})
export class AsrsModule { }
