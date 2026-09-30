import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ToastService } from '../../core/services/toast.service';
import { MontoSinComas } from './monto-sin-comas';

@Component({
  imports: [MontoSinComas],
  template: '<input appMontoSinComas value="25.50" />',
})
class CampoMonto {}

describe('MontoSinComas', () => {
  const toast = { show: vi.fn() };
  let input: HTMLInputElement;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      imports: [CampoMonto],
      providers: [{ provide: ToastService, useValue: toast }],
    });
    const fixture = TestBed.createComponent(CampoMonto);
    fixture.detectChanges();
    input = fixture.nativeElement.querySelector('input');
  });

  function pegar(texto: string): Event {
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', {
      value: { getData: (tipo: string) => tipo === 'text/plain' ? texto : '' },
    });
    input.dispatchEvent(event);
    return event;
  }

  it.each(['12,50', '1,234.56'])('rechaza %s sin modificar el monto anterior y avisa', (texto) => {
    input.select();
    const event = pegar(texto);

    expect(event.defaultPrevented).toBe(true);
    expect(input.value).toBe('25.50');
    expect(toast.show).toHaveBeenCalledWith('Usa punto para los decimales', 'warning');
  });

  it.each(['0.01', '100.50', '1234.56'])('permite pegar %s sin advertencias', (texto) => {
    expect(pegar(texto).defaultPrevented).toBe(false);
    expect(toast.show).not.toHaveBeenCalled();
  });
});
