import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BalanceGeneral } from './balance-general';

describe('BalanceGeneral', () => {
  let component: BalanceGeneral;
  let fixture: ComponentFixture<BalanceGeneral>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BalanceGeneral]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BalanceGeneral);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
