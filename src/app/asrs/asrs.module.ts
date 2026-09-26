import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AsrsComponent } from './asrs.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ShareModule } from 'src/app/share/share.module';
import { UiShareModule } from 'src/app/ui-share/ui-share.module';
import { AsrsRoutingModule } from './asrs-routing.module';

@NgModule({
    declarations: [AsrsComponent],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        ShareModule,
        UiShareModule,
        AsrsRoutingModule
    ]
})
export class AsrsModule { }
