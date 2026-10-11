/**
 * Entrar, salir y saber quién ha entrado, a partir de la cookie de sesión.
 */
import { APIError } from 'better-auth/api';
import { eq } from 'drizzle-orm';
import type { BD } from '../db/conexion';
import { session } from '../db/esquema';
import { Freno, FRENO_LOGIN, textoEspera } from '../lib/freno';
import type { Auth } from './auth';
import { actorDeUsuario, type Actor } from './cuentas';

const freno = new Freno(FRENO_LOGIN);

export type ResultadoEntrar =
  | { ok: true; cabeceras: Headers }
  | { ok: false; mensaje: string };

/**
 * Comprueba usuario y contraseña. Si valen, devuelve las cabeceras con la cookie de sesión.
 * Los fallos repetidos (por usuario y por dirección) hacen esperar un rato.
 */
export async function entrar(
  auth: Auth,
  bd: BD,
  datos: { usuario: string; contrasena: string; ip: string; cabeceras: Headers },
): Promise<ResultadoEntrar> {
  const usuario = datos.usuario.trim().toLowerCase();
  const claves = [`u:${usuario}`, `ip:${datos.ip}`];
  const espera = Math.max(...claves.map((c) => freno.espera(c)));
  if (espera > 0) {
    return { ok: false, mensaje: `Demasiados intentos fallidos: ${textoEspera(espera)} y vuelve a probar.` };
  }

  const fallo = (): ResultadoEntrar => {
    claves.forEach((c) => freno.fallo(c));
    return { ok: false, mensaje: 'Usuario o contraseña incorrectos.' };
  };

  if (!usuario || !datos.contrasena) return fallo();

  try {
    const { headers, response } = await auth.api.signInUsername({
      body: { username: usuario, password: datos.contrasena },
      headers: datos.cabeceras,
      returnHeaders: true,
    });
    // Una cuenta dada de baja (o de una iglesia desactivada) no entra, aunque la contraseña valga.
    const actor = response?.user ? await actorDeUsuario(bd, response.user.id) : null;
    if (!actor) {
      if (response?.token) await bd.delete(session).where(eq(session.token, response.token));
      return fallo();
    }
    freno.acierto(`u:${usuario}`);
    return { ok: true, cabeceras: headers };
  } catch (error) {
    if (error instanceof APIError) return fallo();
    throw error;
  }
}

/** Cierra la sesión. Devuelve las cabeceras que borran la cookie. */
export async function salir(auth: Auth, cabeceras: Headers): Promise<Headers> {
  try {
    const { headers } = await auth.api.signOut({ headers: cabeceras, returnHeaders: true });
    return headers;
  } catch {
    return new Headers();
  }
}

/**
 * Quién ha entrado, según la cookie. `cabeceras` trae lo que haya que devolver al navegador
 * (por ejemplo, la cookie renovada).
 */
export async function quienEs(
  auth: Auth,
  bd: BD,
  cabeceras: Headers,
): Promise<{ actor: Actor | null; cabeceras: Headers }> {
  const { headers, response } = await auth.api.getSession({ headers: cabeceras, returnHeaders: true });
  if (!response?.user) return { actor: null, cabeceras: headers };
  return { actor: await actorDeUsuario(bd, response.user.id), cabeceras: headers };
}
