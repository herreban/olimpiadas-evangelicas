/**
 * Utilidades pequeñas para las páginas del servidor.
 */
import { ErrorDeCuentas } from './cuentas';

/** Dirección pública de un enlace (la que se copia y se manda por WhatsApp). */
export function enlacePublico(ruta: string, urlPeticion: URL): string {
  const base = process.env.BETTER_AUTH_URL || urlPeticion.origin;
  return new URL(ruta, base).toString();
}

/** Un campo de texto de un formulario (vacío si no viene). */
export function campo(formulario: FormData, nombre: string): string {
  const valor = formulario.get(nombre);
  return typeof valor === 'string' ? valor : '';
}

/** Mensaje para la pantalla: los errores conocidos se enseñan; los demás, no (pueden tener detalles internos). */
export function mensajeDeError(error: unknown): string {
  if (error instanceof ErrorDeCuentas) return error.message;
  console.error(error);
  return 'Algo ha fallado. Prueba otra vez dentro de un momento.';
}

/** La dirección de quien hace la petición (detrás de Caddy, la que él nos pasa). */
export function ipDe(peticion: Request, direccionCliente: string): string {
  return peticion.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || direccionCliente;
}

export function fechaHora(fecha: Date): string {
  return fecha.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Madrid' });
}

export const NOMBRE_ROL = {
  plataforma: 'Administrador de la plataforma',
  admin_iglesia: 'Administrador de iglesia',
  voluntario: 'Voluntario',
} as const;
