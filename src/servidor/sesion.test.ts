import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { BD } from '../db/conexion';
import { iglesias, perfiles, session } from '../db/esquema';
import type { Auth } from './auth';
import {
  crearInvitacionIglesia, crearInvitacionUsuario, crearRecuperacion, usarInvitacionIglesia, usarInvitacionUsuario,
  usarRecuperacion, type Actor,
} from './cuentas';
import { actor, authDePruebas, crearPlataforma, hayBD, prepararBD } from './pruebas/bd-de-pruebas';
import { entrar, quienEs, salir } from './sesion';

/** Lo que el navegador mandaría de vuelta: las cookies que le pusimos. */
function cookiesDe(cabeceras: Headers): Headers {
  const cookies = cabeceras.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  return new Headers({ cookie: cookies });
}

describe.skipIf(!hayBD)('entrar y salir', () => {
  let bd: BD;
  let cerrar: () => Promise<void>;
  let auth: Auth;
  let plataforma: Actor;
  let admin: Actor;
  let ip = 0;

  // Cada prueba "viene" de una dirección distinta, para que el freno de una no afecte a otra.
  const intento = (usuario: string, contrasena: string) =>
    entrar(auth, bd, { usuario, contrasena, ip: `10.0.0.${++ip}`, cabeceras: new Headers() });

  beforeAll(async () => {
    ({ bd, cerrar } = await prepararBD());
    auth = authDePruebas(bd);
    plataforma = await crearPlataforma(bd);
    const { testigo } = await crearInvitacionIglesia(bd, plataforma);
    const { usuarioId } = await usarInvitacionIglesia(bd, testigo, {
      nombreIglesia: 'Emaús', ciudad: 'Toledo', nombre: 'Marta', usuario: 'marta', contrasena: 'contrasena-larga',
    });
    admin = await actor(bd, usuarioId);
  });
  afterAll(async () => cerrar?.());

  it('con usuario y contraseña buenos se entra, y la cookie dice quién es', async () => {
    const resultado = await intento('marta', 'contrasena-larga');
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    const { actor: quien } = await quienEs(auth, bd, cookiesDe(resultado.cabeceras));
    expect(quien).toEqual(admin);
  });

  it('el usuario se puede escribir con mayúsculas', async () => {
    expect((await intento('  MARTA ', 'contrasena-larga')).ok).toBe(true);
  });

  it('con la contraseña mala no se entra', async () => {
    expect(await intento('marta', 'otra-cosa-cualquiera')).toEqual({ ok: false, mensaje: 'Usuario o contraseña incorrectos.' });
    expect(await intento('nadie', 'contrasena-larga')).toEqual({ ok: false, mensaje: 'Usuario o contraseña incorrectos.' });
  });

  it('sin cookie no hay nadie', async () => {
    expect((await quienEs(auth, bd, new Headers())).actor).toBeNull();
    expect((await quienEs(auth, bd, new Headers({ cookie: 'better-auth.session_token=inventada' }))).actor).toBeNull();
  });

  it('tras varios fallos seguidos con el mismo usuario hay que esperar, aunque luego acierte', async () => {
    for (let i = 0; i < 5; i++) await intento('marta', 'mal-mal-mal');
    const bloqueado = await intento('marta', 'contrasena-larga');
    expect(bloqueado.ok).toBe(false);
    if (!bloqueado.ok) expect(bloqueado.mensaje).toMatch(/Demasiados intentos/);
  });

  it('al salir, la cookie deja de valer', async () => {
    const { testigo } = await crearInvitacionUsuario(bd, admin, { rol: 'voluntario' });
    await usarInvitacionUsuario(bd, testigo, { nombre: 'Saúl', usuario: 'saul', contrasena: 'contrasena-larga' });
    const dentro = await intento('saul', 'contrasena-larga');
    if (!dentro.ok) throw new Error(dentro.mensaje);
    const cookies = cookiesDe(dentro.cabeceras);

    expect((await quienEs(auth, bd, cookies)).actor).not.toBeNull();
    await salir(auth, cookies);
    expect((await quienEs(auth, bd, cookies)).actor).toBeNull();
  });

  it('tras recuperar la contraseña: vale la nueva, no la vieja, y se cierran las sesiones abiertas', async () => {
    const { testigo: inv } = await crearInvitacionUsuario(bd, admin, { rol: 'voluntario' });
    const { usuarioId } = await usarInvitacionUsuario(bd, inv, { nombre: 'Rut', usuario: 'rut', contrasena: 'contrasena-vieja' });
    const dentro = await intento('rut', 'contrasena-vieja');
    if (!dentro.ok) throw new Error(dentro.mensaje);

    const { testigo } = await crearRecuperacion(bd, admin, usuarioId);
    await usarRecuperacion(bd, testigo, { contrasena: 'contrasena-nueva' });

    expect((await quienEs(auth, bd, cookiesDe(dentro.cabeceras))).actor).toBeNull();
    expect(await bd.select().from(session).where(eq(session.userId, usuarioId))).toHaveLength(0);
    expect((await intento('rut', 'contrasena-vieja')).ok).toBe(false);
    expect((await intento('rut', 'contrasena-nueva')).ok).toBe(true);
  });

  it('una persona dada de baja no entra, aunque sepa su contraseña', async () => {
    const { testigo } = await crearInvitacionUsuario(bd, admin, { rol: 'voluntario' });
    const { usuarioId } = await usarInvitacionUsuario(bd, testigo, { nombre: 'Baja', usuario: 'baja', contrasena: 'contrasena-larga' });
    const dentro = await intento('baja', 'contrasena-larga');
    if (!dentro.ok) throw new Error(dentro.mensaje);

    await bd.update(perfiles).set({ activo: false }).where(eq(perfiles.usuarioId, usuarioId));
    expect((await quienEs(auth, bd, cookiesDe(dentro.cabeceras))).actor).toBeNull();
    expect((await intento('baja', 'contrasena-larga')).ok).toBe(false);
  });

  it('si una iglesia se desactiva, su gente no entra (la plataforma sí)', async () => {
    const { testigo } = await crearInvitacionIglesia(bd, plataforma);
    const { iglesiaId } = await usarInvitacionIglesia(bd, testigo, {
      nombreIglesia: 'Cerrada', ciudad: 'Soria', nombre: 'Cierre', usuario: 'cierre', contrasena: 'contrasena-larga',
    });
    await bd.update(iglesias).set({ activa: false }).where(eq(iglesias.id, iglesiaId));
    expect((await intento('cierre', 'contrasena-larga')).ok).toBe(false);
    expect((await intento('esteban', 'contrasena-larga')).ok).toBe(true);
  });

  it('no se pueden crear cuentas desde Better Auth (registro abierto cerrado)', async () => {
    await expect(auth.api.signUpEmail({
      body: { email: 'colado@ejemplo.com', password: 'contrasena-larga', name: 'Colado' },
    })).rejects.toThrow();
  });
});
