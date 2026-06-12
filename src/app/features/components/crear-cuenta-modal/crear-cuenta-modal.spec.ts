import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearCuentaModal } from './crear-cuenta-modal';

describe('CrearCuentaModal', () => {
  let component: CrearCuentaModal;
  let fixture: ComponentFixture<CrearCuentaModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrearCuentaModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrearCuentaModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
