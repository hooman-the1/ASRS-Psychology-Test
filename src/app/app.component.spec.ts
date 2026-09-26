import { TestBed } from '@angular/core/testing';

import { AppComponent } from './app.component';

describe('AppComponent', () => {
  it('renders an empty application shell at the root', async () => {
    await TestBed.configureTestingModule({ imports: [AppComponent] }).compileComponents();

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('main')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('main')?.textContent?.trim()).toBe('');
  });
});
