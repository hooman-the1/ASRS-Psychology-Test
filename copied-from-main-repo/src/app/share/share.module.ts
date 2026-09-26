import { NgModule } from "@angular/core";
import { LatinToPersianNumbersPipe } from './latin-to-persian-numbers.pipe';
import { NewReviewComponent } from "./new-review/new-review.component";
import { MatDividerModule } from "@angular/material/divider";
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { NgbRatingModule } from "@ng-bootstrap/ng-bootstrap";
import { PersianToEnglishNumbersPipe } from "./persian-to-latin-numbers.pipe";
import { SessionID } from "./sessionid.service";
import { FaPaginatorIntl } from "./fa-paginator-intl";
import { MatPaginatorIntl } from "@angular/material/paginator";
import { FaDigitsPaginatorDirective } from "./fa-digits-paginator.directive";
import { OverlayModule } from '@angular/cdk/overlay';
import { FaDateOnlyPipe } from "./fa-date-only.pipe";
import { FaDateYmdPipe } from "./fa-date-ymd.pipe";

@NgModule({
    declarations: [
        LatinToPersianNumbersPipe,
        PersianToEnglishNumbersPipe,
        NewReviewComponent,
        FaDigitsPaginatorDirective,
        FaDateOnlyPipe,
        FaDateYmdPipe,
    ],
    imports: [
        FormsModule,
        CommonModule,
        MatButtonModule,
        MatDividerModule,
        MatInputModule,
        MatFormFieldModule,
        NgbRatingModule,
        OverlayModule,
    ],
    providers: [
        SessionID,
        LatinToPersianNumbersPipe,
        { provide: MatPaginatorIntl, useClass: FaPaginatorIntl },
    ],
    exports: [
        LatinToPersianNumbersPipe,
        PersianToEnglishNumbersPipe,
        NewReviewComponent,
        FaDigitsPaginatorDirective,
        FaDateOnlyPipe,
        FaDateYmdPipe
    ]
})
export class ShareModule { }