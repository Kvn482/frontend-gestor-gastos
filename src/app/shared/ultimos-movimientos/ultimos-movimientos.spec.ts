import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UltimosMovimientos } from './ultimos-movimientos';

describe('UltimosMovimientos', () => {
  let component: UltimosMovimientos;
  let fixture: ComponentFixture<UltimosMovimientos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UltimosMovimientos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UltimosMovimientos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
