/**
 * Regla de oro nº 1: la iglesia A no puede ver ni tocar nada de la iglesia B.
 *
 * Cada apartado nuevo de la aplicación añade aquí (o en su propio fichero) las pruebas que lo
 * demuestran.
 */
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { BD } from '../db/conexion';
import { invitaciones } from '../db/esquema';
import {
  anularInvitacion, consultarEnlace, crearInvitacionIglesia, crearInvitacionUsuario, crearRecuperacion,
  listarIglesias, listarInvitacionesPendientes, listarUsuarios, miIglesia, usarInvitacionIglesia,
  usarInvitacionUsuario, type Actor,
} from './cuentas';
import { actor, crearPlataforma, hayBD, prepararBD } from './pruebas/bd-de-pruebas';

describe.skipIf(!hayBD)('aislamiento entre iglesias: cuentas e invitaciones', () => {
  let bd: BD;
  let cerrar: () => Promise<void>;
  let plataforma: Actor;
  let adminA: Actor;
  let adminB: Actor;
  let voluntarioB: Actor;

  beforeAll(async () => {
    ({ bd, cerrar } = await prepararBD());
    plataforma = await crearPlataforma(bd);

    const crear = async (nombre: string, usuario: string) => {
      const { testigo } = await crearInvitacionIglesia(bd, plataforma);
      const { usuarioId } = await usarInvitacionIglesia(bd, testigo, {
        nombreIglesia: nombre, ciudad: 'Madrid', nombre: `Admin ${nombre}`, usuario, contrasena: 'contrasena-larga',
      });
      return actor(bd, usuarioId);
    };
    adminA = await crear('Iglesia A', 'admin.a');
    adminB = await crear('Iglesia B', 'admin.b');

    const { testigo } = await crearInvitacionUsuario(bd, adminB, { rol: 'voluntario' });
    const { usuarioId } = await usarInvitacionUsuario(bd, testigo, { nombre: 'Vol B', usuario: 'vol.b', contrasena: 'contrasena-larga' });
    voluntarioB = await actor(bd, usuarioId);
  });
  afterAll(async () => cerrar?.());

  it('A solo ve a la gente de A', async () => {
    const deA = await listarUsuarios(bd, adminA);
    expect(deA.map((u) => u.usuario)).toEqual(['admin.a']);
    expect(deA.every((u) => u.iglesiaId === adminA.iglesiaId)).toBe(true);

    const deB = await listarUsuarios(bd, adminB);
    expect(deB.map((u) => u.usuario).sort()).toEqual(['admin.b', 'vol.b']);
  });

  it('A no ve los enlaces pendientes de B', async () => {
    const { invitacionId } = await crearInvitacionUsuario(bd, adminB, { rol: 'voluntario', nombre: 'Para B' });
    const deA = await listarInvitacionesPendientes(bd, adminA);
    expect(deA.map((i) => i.id)).not.toContain(invitacionId);
    expect((await listarInvitacionesPendientes(bd, adminB)).map((i) => i.id)).toContain(invitacionId);
  });

  it('A no puede anular un enlace de B, aunque sepa su número', async () => {
    const { invitacionId, testigo } = await crearInvitacionUsuario(bd, adminB, { rol: 'voluntario' });
    await expect(anularInvitacion(bd, adminA, invitacionId)).rejects.toMatchObject({ codigo: 'no_encontrado' });
    expect(await consultarEnlace(bd, testigo)).toMatchObject({ valido: true });
  });

  it('A no puede generar una recuperación de contraseña para alguien de B', async () => {
    await expect(crearRecuperacion(bd, adminA, voluntarioB.usuarioId)).rejects.toMatchObject({ codigo: 'no_encontrado' });
    await expect(crearRecuperacion(bd, adminA, adminB.usuarioId)).rejects.toMatchObject({ codigo: 'no_encontrado' });
    const deB = await bd.select().from(invitaciones).where(eq(invitaciones.usuarioDestinoId, voluntarioB.usuarioId));
    expect(deB).toHaveLength(0);
  });

  it('A no puede generar una recuperación para el administrador de la plataforma', async () => {
    await expect(crearRecuperacion(bd, adminA, plataforma.usuarioId)).rejects.toMatchObject({ codigo: 'no_encontrado' });
  });

  it('las invitaciones de A siempre van a la iglesia de A', async () => {
    const { invitacionId, testigo } = await crearInvitacionUsuario(bd, adminA, { rol: 'admin_iglesia' });
    const [inv] = await bd.select().from(invitaciones).where(eq(invitaciones.id, invitacionId));
    expect(inv!.iglesiaId).toBe(adminA.iglesiaId);

    const { usuarioId } = await usarInvitacionUsuario(bd, testigo, { nombre: 'Nuevo A', usuario: 'nuevo.a', contrasena: 'contrasena-larga' });
    expect(await actor(bd, usuarioId)).toMatchObject({ iglesiaId: adminA.iglesiaId, rol: 'admin_iglesia' });
  });

  it('cada administrador ve solo su iglesia, y no la lista de iglesias', async () => {
    expect((await miIglesia(bd, adminA))!.nombre).toBe('Iglesia A');
    expect((await miIglesia(bd, adminB))!.nombre).toBe('Iglesia B');
    await expect(listarIglesias(bd, adminA)).rejects.toMatchObject({ codigo: 'sin_permiso' });
    await expect(listarIglesias(bd, voluntarioB)).rejects.toMatchObject({ codigo: 'sin_permiso' });
  });

  it('la plataforma sí ve todas las iglesias (pero no es de ninguna)', async () => {
    const nombres = (await listarIglesias(bd, plataforma)).map((i) => i.nombre);
    expect(nombres).toEqual(['Iglesia A', 'Iglesia B']);
    expect(await miIglesia(bd, plataforma)).toBeNull();
  });
});
