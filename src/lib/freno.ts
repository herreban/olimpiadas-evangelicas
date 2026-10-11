/**
 * Freno a los intentos de login repetidos.
 *
 * Tras unos cuantos fallos seguidos con el mismo usuario (o desde la misma dirección), se
 * espera un rato antes de dejar probar otra vez. Vive en memoria: hay un solo servidor, y si se
 * reinicia no pasa nada por empezar la cuenta de cero.
 */

export interface OpcionesFreno {
  /** Fallos permitidos dentro de la ventana. */
  maximoFallos: number;
  /** Duración de la ventana y del bloqueo, en milisegundos. */
  ventanaMs: number;
}

export const FRENO_LOGIN: OpcionesFreno = { maximoFallos: 5, ventanaMs: 15 * 60 * 1000 };

interface Cuenta {
  fallos: number;
  desde: number;
}

export class Freno {
  private readonly cuentas = new Map<string, Cuenta>();

  constructor(
    private readonly opciones: OpcionesFreno = FRENO_LOGIN,
    private readonly ahora: () => number = Date.now,
  ) {}

  /** Milisegundos que quedan de espera para esta clave; 0 si puede intentarlo. */
  espera(clave: string): number {
    const cuenta = this.vigente(clave);
    if (!cuenta || cuenta.fallos < this.opciones.maximoFallos) return 0;
    return cuenta.desde + this.opciones.ventanaMs - this.ahora();
  }

  fallo(clave: string): void {
    const cuenta = this.vigente(clave);
    if (cuenta) cuenta.fallos += 1;
    else this.cuentas.set(clave, { fallos: 1, desde: this.ahora() });
    this.limpiar();
  }

  acierto(clave: string): void {
    this.cuentas.delete(clave);
  }

  private vigente(clave: string): Cuenta | undefined {
    const cuenta = this.cuentas.get(clave);
    if (cuenta && this.ahora() - cuenta.desde >= this.opciones.ventanaMs) {
      this.cuentas.delete(clave);
      return undefined;
    }
    return cuenta;
  }

  /** Para que la memoria no crezca sin fin si alguien prueba muchos usuarios. */
  private limpiar(): void {
    if (this.cuentas.size < 10_000) return;
    for (const clave of this.cuentas.keys()) this.vigente(clave);
  }
}

/** Texto para la pantalla: "espera 3 minutos". */
export function textoEspera(ms: number): string {
  const minutos = Math.max(1, Math.ceil(ms / 60_000));
  return minutos === 1 ? 'espera 1 minuto' : `espera ${minutos} minutos`;
}
