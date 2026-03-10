import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NuevoMovimientoModal } from './nuevo-movimiento-modal';

describe('NuevoMovimientoModal', () => {
  let component: NuevoMovimientoModal;
  let fixture: ComponentFixture<NuevoMovimientoModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NuevoMovimientoModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NuevoMovimientoModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
