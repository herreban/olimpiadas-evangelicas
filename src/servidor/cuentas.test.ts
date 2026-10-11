import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { BD } from '../db/conexion';
import { account, invitaciones, perfiles, registro, user } from '../db/esquema';
import {
  anularInvitacion, consultarEnlace, crearInvitacionIglesia, crearInvitacionUsuario, crearRecuperacion,
  huella, listarInvitacionesPendientes, normalizarUsuario, usarInvitacionIglesia, usarInvitacionUsuario,
  usarRecuperacion, type Actor,
} from './cuentas';
import { actor, crearPlataforma, hayBD, prepararBD } from './pruebas/bd-de-pruebas';

describe('normalizarUsuario', () => {
  it('pasa a minúsculas y quita espacios', () => {
    expect(normalizarUsuario('  Maria.Lopez ')).toBe('maria.lopez');
  });

  it('rechaza lo que no vale como usuario', () => {
    expect(() => normalizarUsuario('ab')).toThrow(/entre 3 y 30/);
    expect(() => normalizarUsuario('maría')).toThrow(/entre 3 y 30/);
    expect(() => normalizarUsuario('con espacio')).toThrow(/entre 3 y 30/);
  });
});

describe.skipIf(!hayBD)('invitaciones y cuentas', () => {
  let bd: BD;
  let cerrar: () => Promise<void>;
  let plataforma: Actor;

  beforeAll(async () => {
    ({ bd, cerrar } = await prepararBD());
    plataforma = await crearPlataforma(bd);
  });
  afterAll(async () => cerrar?.());

  async function nuevaIglesia(nombre: string, usuario: string): Promise<Actor> {
    const { testigo } = await crearInvitacionIglesia(bd, plataforma, { nombreIglesia: nombre });
    const { usuarioId } = await usarInvitacionIglesia(bd, testigo, {
      nombreIglesia: nombre, ciudad: 'Madrid', nombre: `Admin de ${nombre}`, usuario, contrasena: 'contrasena-larga',
    });
    return actor(bd, usuarioId);
  }

  it('crear iglesia: nace la iglesia con su administrador y el enlace queda gastado', async () => {
    const { testigo, invitacionId } = await crearInvitacionIglesia(bd, plataforma, { nombreIglesia: 'Betel' });

    const antes = await consultarEnlace(bd, testigo);
    expect(antes).toMatchObject({ valido: true, tipo: 'iglesia', datos: { nombreIglesia: 'Betel' } });

    const { iglesiaId, usuarioId } = await usarInvitacionIglesia(bd, testigo, {
      nombreIglesia: 'Betel', ciudad: 'Sevilla', nombre: 'Ana', usuario: 'ana.betel', contrasena: 'contrasena-larga',
    });

    const admin = await actor(bd, usuarioId);
    expect(admin).toMatchObject({ rol: 'admin_iglesia', iglesiaId, nombre: 'Ana' });
    expect(await consultarEnlace(bd, testigo)).toEqual({ valido: false, motivo: 'usada' });

    const [inv] = await bd.select().from(invitaciones).where(eq(invitaciones.id, invitacionId));
    expect(inv!.usadaPor).toBe(usuarioId);
  });

  it('del testigo solo se guarda la huella, nunca el enlace en claro', async () => {
    const { testigo, invitacionId } = await crearInvitacionIglesia(bd, plataforma);
    const [inv] = await bd.select().from(invitaciones).where(eq(invitaciones.id, invitacionId));
    expect(inv!.testigo).toBe(huella(testigo));
    expect(inv!.testigo).not.toBe(testigo);
  });

  it('la contraseña se guarda cifrada', async () => {
    await nuevaIglesia('Cifrado', 'cifrado');
    const [fila] = await bd
      .select({ password: account.password })
      .from(account)
      .innerJoin(user, eq(user.id, account.userId))
      .where(eq(user.username, 'cifrado'));
    expect(fila!.password).toBeTruthy();
    expect(fila!.password).not.toContain('contrasena-larga');
  });

  it('un enlace no se puede usar dos veces', async () => {
    const { testigo } = await crearInvitacionIglesia(bd, plataforma);
    const datos = { nombreIglesia: 'Dos veces', ciudad: 'Bilbao', nombre: 'Luis', usuario: 'luis1', contrasena: 'contrasena-larga' };
    await usarInvitacionIglesia(bd, testigo, datos);
    await expect(usarInvitacionIglesia(bd, testigo, { ...datos, usuario: 'luis2' }))
      .rejects.toMatchObject({ codigo: 'invitacion_no_valida' });
  });

  it('si dos personas usan el mismo enlace a la vez, solo entra una', async () => {
    const { testigo } = await crearInvitacionIglesia(bd, plataforma);
    const base = { nombreIglesia: 'A la vez', ciudad: 'Vigo', nombre: 'X', contrasena: 'contrasena-larga' };
    const resultados = await Promise.allSettled([
      usarInvitacionIglesia(bd, testigo, { ...base, usuario: 'alavez1' }),
      usarInvitacionIglesia(bd, testigo, { ...base, usuario: 'alavez2' }),
      usarInvitacionIglesia(bd, testigo, { ...base, usuario: 'alavez3' }),
    ]);
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });

  it('un enlace caducado no vale', async () => {
    const { testigo, invitacionId } = await crearInvitacionIglesia(bd, plataforma);
    await bd.update(invitaciones).set({ caducaEn: sql`now() - interval '1 minute'` }).where(eq(invitaciones.id, invitacionId));
    expect(await consultarEnlace(bd, testigo)).toEqual({ valido: false, motivo: 'caducada' });
    await expect(usarInvitacionIglesia(bd, testigo, {
      nombreIglesia: 'Tarde', ciudad: 'León', nombre: 'Eva', usuario: 'eva.tarde', contrasena: 'contrasena-larga',
    })).rejects.toMatchObject({ codigo: 'invitacion_no_valida' });
  });

  it('un enlace anulado no vale', async () => {
    const { testigo, invitacionId } = await crearInvitacionIglesia(bd, plataforma);
    await anularInvitacion(bd, plataforma, invitacionId);
    expect(await consultarEnlace(bd, testigo)).toEqual({ valido: false, motivo: 'anulada' });
    expect((await listarInvitacionesPendientes(bd, plataforma)).map((i) => i.id)).not.toContain(invitacionId);
  });

  it('un enlace inventado no existe', async () => {
    expect(await consultarEnlace(bd, 'no-existe')).toEqual({ valido: false, motivo: 'no_existe' });
  });

  it('las invitaciones caducan a los 7 días y las recuperaciones a las 24 horas', async () => {
    const admin = await nuevaIglesia('Plazos', 'plazos');
    const ahora = Date.now();
    const inv = await crearInvitacionUsuario(bd, admin, { rol: 'voluntario' });
    const rec = await crearRecuperacion(bd, admin, admin.usuarioId);
    expect(inv.caducaEn.getTime() - ahora).toBeGreaterThan(7 * 24 * 3600_000 - 60_000);
    expect(inv.caducaEn.getTime() - ahora).toBeLessThanOrEqual(7 * 24 * 3600_000 + 60_000);
    expect(rec.caducaEn.getTime() - ahora).toBeGreaterThan(24 * 3600_000 - 60_000);
    expect(rec.caducaEn.getTime() - ahora).toBeLessThanOrEqual(24 * 3600_000 + 60_000);
  });

  it('invitar usuario: entra en la iglesia y con el papel que dice el enlace', async () => {
    const admin = await nuevaIglesia('Siloé', 'admin.siloe');
    const { testigo } = await crearInvitacionUsuario(bd, admin, { rol: 'voluntario', nombre: 'Pedro' });

    expect(await consultarEnlace(bd, testigo)).toMatchObject({ valido: true, tipo: 'usuario', rol: 'voluntario', iglesia: 'Siloé' });

    const { usuarioId } = await usarInvitacionUsuario(bd, testigo, { nombre: 'Pedro', usuario: 'pedro', contrasena: 'contrasena-larga' });
    expect(await actor(bd, usuarioId)).toMatchObject({ rol: 'voluntario', iglesiaId: admin.iglesiaId });
  });

  it('un nombre de usuario repetido se avisa y el enlace sigue valiendo', async () => {
    const admin = await nuevaIglesia('Repetidos', 'repe.admin');
    const { testigo } = await crearInvitacionUsuario(bd, admin, { rol: 'voluntario' });
    await expect(usarInvitacionUsuario(bd, testigo, { nombre: 'Otro', usuario: 'REPE.ADMIN', contrasena: 'contrasena-larga' }))
      .rejects.toMatchObject({ codigo: 'usuario_repetido' });
    expect(await consultarEnlace(bd, testigo)).toMatchObject({ valido: true });
  });

  it('una contraseña corta no se acepta y el enlace sigue valiendo', async () => {
    const { testigo } = await crearInvitacionIglesia(bd, plataforma);
    await expect(usarInvitacionIglesia(bd, testigo, {
      nombreIglesia: 'Corta', ciudad: 'Cádiz', nombre: 'Rosa', usuario: 'rosa', contrasena: '1234',
    })).rejects.toMatchObject({ codigo: 'datos_no_validos' });
    expect(await consultarEnlace(bd, testigo)).toMatchObject({ valido: true });
  });

  it('recuperar contraseña cambia la contraseña y gasta el enlace', async () => {
    const admin = await nuevaIglesia('Recuperar', 'recupera');
    const [antes] = await bd.select({ p: account.password }).from(account).where(eq(account.userId, admin.usuarioId));

    const { testigo } = await crearRecuperacion(bd, admin, admin.usuarioId);
    expect(await consultarEnlace(bd, testigo)).toMatchObject({ valido: true, tipo: 'recuperacion', paraUsuario: 'recupera' });
    expect(await usarRecuperacion(bd, testigo, { contrasena: 'otra-contrasena' })).toEqual({ usuario: 'recupera' });

    const [despues] = await bd.select({ p: account.password }).from(account).where(eq(account.userId, admin.usuarioId));
    expect(despues!.p).not.toBe(antes!.p);
    await expect(usarRecuperacion(bd, testigo, { contrasena: 'otra-mas-aun' })).rejects.toMatchObject({ codigo: 'invitacion_no_valida' });
  });

  it('un enlace de un tipo no sirve para otro', async () => {
    const admin = await nuevaIglesia('Tipos', 'tipos');
    const { testigo } = await crearRecuperacion(bd, admin, admin.usuarioId);
    await expect(usarInvitacionUsuario(bd, testigo, { nombre: 'Intruso', usuario: 'intruso', contrasena: 'contrasena-larga' }))
      .rejects.toMatchObject({ codigo: 'invitacion_no_valida' });
  });

  describe('papeles', () => {
    it('solo la plataforma crea invitaciones de iglesia', async () => {
      const admin = await nuevaIglesia('Papeles', 'papeles');
      await expect(crearInvitacionIglesia(bd, admin)).rejects.toMatchObject({ codigo: 'sin_permiso' });
    });

    it('la plataforma no invita usuarios a una iglesia (eso es cosa de cada iglesia)', async () => {
      await expect(crearInvitacionUsuario(bd, plataforma, { rol: 'voluntario' })).rejects.toMatchObject({ codigo: 'sin_permiso' });
    });

    it('un administrador de iglesia no puede dar el papel de plataforma', async () => {
      const admin = await nuevaIglesia('Escalada', 'escalada');
      await expect(crearInvitacionUsuario(bd, admin, { rol: 'plataforma' })).rejects.toMatchObject({ codigo: 'sin_permiso' });
    });

    it('un voluntario no invita, no genera recuperaciones ni ve los enlaces', async () => {
      const admin = await nuevaIglesia('Voluntarios', 'vol.admin');
      const { testigo } = await crearInvitacionUsuario(bd, admin, { rol: 'voluntario' });
      const { usuarioId } = await usarInvitacionUsuario(bd, testigo, { nombre: 'Vol', usuario: 'vol', contrasena: 'contrasena-larga' });
      const voluntario = await actor(bd, usuarioId);

      await expect(crearInvitacionUsuario(bd, voluntario, { rol: 'voluntario' })).rejects.toMatchObject({ codigo: 'sin_permiso' });
      await expect(crearRecuperacion(bd, voluntario, admin.usuarioId)).rejects.toMatchObject({ codigo: 'sin_permiso' });
      await expect(listarInvitacionesPendientes(bd, voluntario)).rejects.toMatchObject({ codigo: 'sin_permiso' });
    });

    it('la base de datos no deja un usuario de iglesia sin iglesia', async () => {
      const [cualquiera] = await bd.select({ id: user.id }).from(user).limit(1);
      await expect(bd.insert(perfiles).values({ usuarioId: cualquiera!.id, rol: 'voluntario', nombreMostrado: 'X' }))
        .rejects.toThrow();
    });
  });

  it('un perfil de baja ya no cuenta como usuario', async () => {
    const admin = await nuevaIglesia('Bajas', 'bajas');
    await bd.update(perfiles).set({ activo: false }).where(eq(perfiles.usuarioId, admin.usuarioId));
    await expect(actor(bd, admin.usuarioId)).rejects.toThrow();
  });

  it('queda registrado quién hizo qué', async () => {
    const admin = await nuevaIglesia('Registro', 'registro');
    const filas = await bd.select().from(registro).where(eq(registro.iglesiaId, admin.iglesiaId!));
    expect(filas.map((f) => `${f.accion}:${f.entidad}`).sort()).toEqual(['alta:iglesia', 'alta:usuario']);
  });
});
