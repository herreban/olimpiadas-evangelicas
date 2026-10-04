/**
 * Cálculo de la categoría de un participante.
 *
 * Regla del proyecto: la categoría es un par de edades que empieza en número par
 * (4–5, 6–7, … 16–17) y se calcula con el **año natural**: la edad que el niño cumple en el
 * año de la edición. La categoría NUNCA se guarda: se calcula cuando hace falta, así no hay
 * datos que se queden viejos.
 */

export const EDAD_MINIMA = 4;
export const EDAD_MAXIMA = 17;

/** Pares de edades válidos, del menor al mayor. */
export const CATEGORIAS: ReadonlyArray<readonly [number, number]> = [
  [4, 5],
  [6, 7],
  [8, 9],
  [10, 11],
  [12, 13],
  [14, 15],
  [16, 17],
];

export type Categoria = readonly [number, number];

/** Error de fecha mal escrita: quien llama decide qué hacer (en la app, avisar al voluntario). */
export class FechaInvalida extends Error {
  constructor(fecha: string) {
    super(`La fecha de nacimiento "${fecha}" no es válida (se espera AAAA-MM-DD).`);
    this.name = 'FechaInvalida';
  }
}

const FORMATO_FECHA = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

/** Comprueba que la fecha existe de verdad (no vale 2021-02-30 ni 2019-13-01). */
export function fechaValida(fecha: string): boolean {
  const partes = FORMATO_FECHA.exec(fecha.trim());
  if (!partes) return false;

  const anio = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  if (mes < 1 || mes > 12 || dia < 1) return false;

  const bisiesto = (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
  const diasDelMes = [31, bisiesto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return dia <= diasDelMes[mes - 1]!;
}

/** Año de nacimiento, con la fecha ya comprobada. */
export function anioDeNacimiento(fechaNacimiento: string): number {
  if (!fechaValida(fechaNacimiento)) throw new FechaInvalida(fechaNacimiento);
  return Number(FORMATO_FECHA.exec(fechaNacimiento.trim())![1]);
}

/**
 * Edad del año natural: los años que cumple en el año de la edición.
 * Quien nace en 2019 compite en 2026 con 7 años, aunque cumpla los 7 en diciembre.
 */
export function edadEnAnio(fechaNacimiento: string, anioEdicion: number): number {
  return anioEdicion - anioDeNacimiento(fechaNacimiento);
}

/** El par de edades al que corresponde una edad, o null si se sale de 4–17. */
export function categoriaDe(edad: number): Categoria | null {
  if (!Number.isInteger(edad)) return null;
  return CATEGORIAS.find(([desde, hasta]) => edad >= desde && edad <= hasta) ?? null;
}

/** ¿Se sale de las edades de participación? */
export function fueraDeCategoria(edad: number): boolean {
  return categoriaDe(edad) === null;
}

/**
 * Texto para la pantalla: "8–9 años", o "fuera de categoría (3 años)".
 * Es lo que ve el voluntario al apuntar a un niño.
 */
export function textoCategoria(fechaNacimiento: string, anioEdicion: number): string {
  const edad = edadEnAnio(fechaNacimiento, anioEdicion);
  const categoria = categoriaDe(edad);
  if (!categoria) return `fuera de categoría (${edad} años)`;
  return `${categoria[0]}–${categoria[1]} años`;
}

/** ¿Llega a la edad mínima de una prueba? (por ejemplo, la altura desde los 8 años) */
export function llegaAEdadMinima(fechaNacimiento: string, anioEdicion: number, edadMinima: number | null | undefined): boolean {
  if (edadMinima === null || edadMinima === undefined) return true;
  return edadEnAnio(fechaNacimiento, anioEdicion) >= edadMinima;
}
