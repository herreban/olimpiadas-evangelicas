import { describe, expect, it } from 'vitest';
import { Freno, textoEspera } from './freno';

function relojDePrueba(inicio = 0) {
  let t = inicio;
  return { ahora: () => t, avanzar: (ms: number) => { t += ms; } };
}

describe('Freno', () => {
  const opciones = { maximoFallos: 3, ventanaMs: 1000 };

  it('deja intentar hasta llegar al máximo de fallos', () => {
    const reloj = relojDePrueba();
    const freno = new Freno(opciones, reloj.ahora);
    freno.fallo('ana');
    freno.fallo('ana');
    expect(freno.espera('ana')).toBe(0);
    freno.fallo('ana');
    expect(freno.espera('ana')).toBe(1000);
  });

  it('pasada la ventana, se puede volver a probar', () => {
    const reloj = relojDePrueba();
    const freno = new Freno(opciones, reloj.ahora);
    for (let i = 0; i < 3; i++) freno.fallo('ana');
    reloj.avanzar(400);
    expect(freno.espera('ana')).toBe(600);
    reloj.avanzar(600);
    expect(freno.espera('ana')).toBe(0);
  });

  it('acertar borra la cuenta de fallos', () => {
    const freno = new Freno(opciones, relojDePrueba().ahora);
    freno.fallo('ana');
    freno.fallo('ana');
    freno.acierto('ana');
    freno.fallo('ana');
    freno.fallo('ana');
    expect(freno.espera('ana')).toBe(0);
  });

  it('cada clave lleva su cuenta', () => {
    const freno = new Freno(opciones, relojDePrueba().ahora);
    for (let i = 0; i < 3; i++) freno.fallo('ana');
    expect(freno.espera('ana')).toBeGreaterThan(0);
    expect(freno.espera('luis')).toBe(0);
  });
});

describe('textoEspera', () => {
  it('redondea hacia arriba a minutos', () => {
    expect(textoEspera(1)).toBe('espera 1 minuto');
    expect(textoEspera(60_001)).toBe('espera 2 minutos');
    expect(textoEspera(15 * 60_000)).toBe('espera 15 minutos');
  });
});
