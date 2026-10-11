/**
 * Se ejecuta antes de cada página: averigua quién ha entrado y no deja pasar a quien no debe.
 *
 * El permiso de verdad está en la capa de datos (`src/servidor/cuentas.ts`); esto es la primera
 * puerta, para mandar a cada cual a donde le toca.
 */
import { defineMiddleware } from 'astro:middleware';
import { bd } from './db/conexion';
import { auth } from './servidor/auth';
import { quienEs } from './servidor/sesion';

/** Páginas que se ven sin haber entrado. */
const PUBLICAS = ['/entrar', '/invitacion/'];

export const onRequest = defineMiddleware(async (contexto, siguiente) => {
  const { pathname } = contexto.url;
  const { actor, cabeceras } = await quienEs(auth(), bd(), contexto.request.headers);
  contexto.locals.actor = actor;

  const publica = PUBLICAS.some((p) => pathname === p || pathname.startsWith(p));
  let respuesta: Response;

  if (!actor && !publica) {
    respuesta = contexto.redirect('/entrar');
  } else if (pathname.startsWith('/plataforma') && actor?.rol !== 'plataforma') {
    respuesta = contexto.redirect('/');
  } else if (pathname.startsWith('/iglesia') && actor?.rol !== 'admin_iglesia') {
    respuesta = contexto.redirect('/');
  } else {
    respuesta = await siguiente();
  }

  // La cookie renovada (si la hay) vuelve al navegador.
  for (const cookie of cabeceras.getSetCookie()) respuesta.headers.append('set-cookie', cookie);

  // Datos de menores: nada se guarda en cachés, nada se mete en marcos de otras webs, y los
  // enlaces de invitación no se filtran a otras webs por la cabecera Referer.
  respuesta.headers.set('cache-control', 'no-store');
  respuesta.headers.set('x-frame-options', 'DENY');
  respuesta.headers.set('x-content-type-options', 'nosniff');
  // (`same-origin` y no `no-referrer`: con este último el navegador manda `Origin: null` en los
  // formularios y la protección contra envíos desde otras webs los rechaza.)
  respuesta.headers.set('referrer-policy', 'same-origin');
  return respuesta;
});
