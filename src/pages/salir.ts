import type { APIRoute } from 'astro';
import { auth } from '../servidor/auth';
import { salir } from '../servidor/sesion';

/** Cerrar sesión (siempre por POST, desde el botón "Salir"). */
export const POST: APIRoute = async ({ request }) => {
  const cabeceras = await salir(auth(), request.headers);
  const respuesta = new Headers({ location: '/entrar' });
  for (const cookie of cabeceras.getSetCookie()) respuesta.append('set-cookie', cookie);
  return new Response(null, { status: 303, headers: respuesta });
};
