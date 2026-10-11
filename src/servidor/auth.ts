/**
 * Login con Better Auth.
 *
 * - Se entra con **nombre de usuario y contraseña**. No hay correo en ninguna parte.
 * - El registro abierto está **cerrado**: las cuentas solo se crean al usar una invitación
 *   (ver `cuentas.ts`), nunca desde Better Auth.
 * - Las contraseñas las cifra Better Auth; aquí no se programa nada de eso a mano.
 * - Nada de Better Auth se publica como ruta: la aplicación lo llama desde el servidor.
 */
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { username } from 'better-auth/plugins';
import { bd as bdCompartida, type BD } from '../db/conexion';
import * as esquema from '../db/esquema';

export const LONGITUD_MINIMA_CONTRASENA = 8;

export interface OpcionesAuth {
  secreto: string;
  /** Dirección pública de la web (con https en producción: así la cookie va marcada como segura). */
  urlBase: string;
}

export function crearAuth(bd: BD, { secreto, urlBase }: OpcionesAuth) {
  return betterAuth({
    appName: 'Olimpiadas Evangélicas',
    secret: secreto,
    baseURL: urlBase,
    database: drizzleAdapter(bd, {
      provider: 'pg',
      schema: {
        user: esquema.user,
        session: esquema.session,
        account: esquema.account,
        verification: esquema.verification,
      },
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: LONGITUD_MINIMA_CONTRASENA,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // un mes: en el móvil no se quiere estar entrando cada día
      updateAge: 60 * 60 * 24,
    },
    plugins: [username()],
    telemetry: { enabled: false },
  });
}

export type Auth = ReturnType<typeof crearAuth>;

let compartida: Auth | undefined;

/** El login de la aplicación, configurado desde el entorno. */
export function auth(): Auth {
  if (!compartida) {
    const secreto = process.env.BETTER_AUTH_SECRET;
    const urlBase = process.env.BETTER_AUTH_URL;
    if (!secreto || secreto.length < 32) {
      throw new Error('Falta BETTER_AUTH_SECRET (al menos 32 caracteres aleatorios) en el entorno.');
    }
    if (!urlBase) throw new Error('Falta BETTER_AUTH_URL (la dirección pública de la web) en el entorno.');
    compartida = crearAuth(bdCompartida(), { secreto, urlBase });
  }
  return compartida;
}
