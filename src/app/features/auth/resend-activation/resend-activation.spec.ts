import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResendActivation } from './resend-activation';

describe('ResendActivation', () => {
  let component: ResendActivation;
  let fixture: ComponentFixture<ResendActivation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResendActivation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResendActivation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
