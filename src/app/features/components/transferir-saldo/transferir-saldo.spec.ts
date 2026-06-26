import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransferirSaldo } from './transferir-saldo';

describe('TransferirSaldo', () => {
  let component: TransferirSaldo;
  let fixture: ComponentFixture<TransferirSaldo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransferirSaldo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransferirSaldo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
