import { TestBed } from '@angular/core/testing';

import { App } from './app';

describe('App', () => {
  it('renders the Incident API frontend heading', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const heading = fixture.nativeElement.querySelector('h1') as HTMLHeadingElement | null;
    expect(heading?.textContent?.trim()).toBe('Incident API frontend');
  });
});
