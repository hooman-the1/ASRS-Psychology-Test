import { Component } from '@angular/core';
import { AsrsModule } from './asrs/asrs.module';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AsrsModule],
  template: '<main dir="rtl"><app-asrs></app-asrs></main>',
})
export class AppComponent {}
