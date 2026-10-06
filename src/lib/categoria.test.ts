import { describe, expect, it } from 'vitest';
import {
  CATEGORIAS, FechaInvalida, anioDeNacimiento, categoriaDe, edadEnAnio, fechaValida,
  fueraDeCategoria, llegaAEdadMinima, textoCategoria,
} from './categoria';

describe('fechaValida', () => {
  it('acepta fechas correctas', () => {
    expect(fechaValida('2018-04-12')).toBe(true);
    expect(fechaValida('2021-2-3')).toBe(true);
    expect(fechaValida('2020-02-29')).toBe(true); // 2020 fue bisiesto
  });

  it('rechaza fechas que no existen', () => {
    expect(fechaValida('2021-02-29')).toBe(false); // 2021 no fue bisiesto
    expect(fechaValida('2019-13-01')).toBe(false);
    expect(fechaValida('2019-00-10')).toBe(false);
    expect(fechaValida('2019-04-31')).toBe(false);
    expect(fechaValida('2019-04-00')).toBe(false);
  });

  it('rechaza lo que no tiene forma de fecha', () => {
    expect(fechaValida('12/04/2018')).toBe(false);
    expect(fechaValida('')).toBe(false);
    expect(fechaValida('2018')).toBe(false);
    expect(fechaValida('ayer')).toBe(false);
  });
});

describe('anioDeNacimiento', () => {
  it('saca el año', () => {
    expect(anioDeNacimiento('2018-04-12')).toBe(2018);
  });

  it('avisa si la fecha está mal', () => {
    expect(() => anioDeNacimiento('2018-13-01')).toThrow(FechaInvalida);
  });
});

describe('edadEnAnio (año natural)', () => {
  it('cuenta los años que cumple ese año, cumpla cuando cumpla', () => {
    expect(edadEnAnio('2018-04-12', 2026)).toBe(8);
    expect(edadEnAnio('2018-12-31', 2026)).toBe(8); // cumple en diciembre: sigue siendo 8
    expect(edadEnAnio('2019-01-01', 2026)).toBe(7); // cumple en enero: 7
  });

  it('con la fecha del día 29 de febrero no se atasca', () => {
    expect(edadEnAnio('2020-02-29', 2026)).toBe(6);
  });
});

describe('categoriaDe', () => {
  it('coloca cada edad en su par', () => {
    expect(categoriaDe(4)).toEqual([4, 5]);
    expect(categoriaDe(5)).toEqual([4, 5]);
    expect(categoriaDe(6)).toEqual([6, 7]);
    expect(categoriaDe(17)).toEqual([16, 17]);
  });

  it('deja fuera a quien no llega o se pasa', () => {
    expect(categoriaDe(3)).toBeNull();
    expect(categoriaDe(18)).toBeNull();
    expect(fueraDeCategoria(3)).toBe(true);
    expect(fueraDeCategoria(18)).toBe(true);
    expect(fueraDeCategoria(10)).toBe(false);
  });

  it('los pares son los siete del reglamento, sin huecos', () => {
    expect(CATEGORIAS).toHaveLength(7);
    for (const [desde, hasta] of CATEGORIAS) {
      expect(desde % 2).toBe(0); // empiezan en número par
      expect(hasta).toBe(desde + 1);
    }
  });
});

describe('textoCategoria', () => {
  it('escribe el par de años', () => {
    expect(textoCategoria('2018-04-12', 2026)).toBe('8–9 años');
    expect(textoCategoria('2022-06-01', 2026)).toBe('4–5 años');
  });

  it('avisa de quien se sale', () => {
    expect(textoCategoria('2023-01-01', 2026)).toBe('fuera de categoría (3 años)');
    expect(textoCategoria('2008-01-01', 2026)).toBe('fuera de categoría (18 años)');
  });
});

describe('llegaAEdadMinima', () => {
  it('la altura empieza a los 8 años', () => {
    expect(llegaAEdadMinima('2022-06-01', 2026, 8)).toBe(false); // 4 años
    expect(llegaAEdadMinima('2018-06-01', 2026, 8)).toBe(true); // 8 años
    expect(llegaAEdadMinima('2022-06-01', 2026, null)).toBe(true); // sin mínimo, todos
    expect(llegaAEdadMinima('2022-06-01', 2026, undefined)).toBe(true);
  });
});
