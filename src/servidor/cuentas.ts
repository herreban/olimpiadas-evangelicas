/**
 * Cuentas, iglesias e invitaciones.
 *
 * Aquí viven las reglas de oro 1, 2 y 3 de la especificación:
 * - **Aislamiento**: cada función recibe quién la pide (`Actor`) y filtra por SU iglesia. La
 *   iglesia nunca llega desde la pantalla: se saca del actor.
 * - **Nada de registro abierto**: las cuentas solo se crean gastando una invitación.
 * - **Sin correo**: invitaciones y recuperaciones son enlaces de un solo uso que se pasan a mano.
 */
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import { and, asc, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import type { BD } from '../db/conexion';
import {
  account, iglesias, invitaciones, perfiles, registro, session, user,
  type Rol, type TipoInvitacion,
} from '../db/esquema';
import { LONGITUD_MINIMA_CONTRASENA } from './auth';

// ---------------------------------------------------------------------------------------------
// Tipos y errores
// ---------------------------------------------------------------------------------------------

/** Quién está haciendo la petición, tal como lo dice la base de datos (nunca la pantalla). */
export interface Actor {
  usuarioId: string;
  iglesiaId: string | null;
  rol: Rol;
  nombre: string;
}

export type CodigoError =
  | 'sin_permiso'
  | 'no_encontrado'
  | 'invitacion_no_valida'
  | 'usuario_repetido'
  | 'datos_no_validos';

/** Error que se puede enseñar tal cual a quien usa la aplicación. */
export class ErrorDeCuentas extends Error {
  constructor(readonly codigo: CodigoError, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorDeCuentas';
  }
}

const sinPermiso = () => new ErrorDeCuentas('sin_permiso', 'No tienes permiso para hacer esto.');
const noEncontrado = (que: string) => new ErrorDeCuentas('no_encontrado', `No se ha encontrado ${que}.`);
const datosNoValidos = (mensaje: string) => new ErrorDeCuentas('datos_no_validos', mensaje);

// ---------------------------------------------------------------------------------------------
// Caducidades
// ---------------------------------------------------------------------------------------------

export const DIAS_INVITACION = 7;
export const HORAS_RECUPERACION = 24;

const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;

// ---------------------------------------------------------------------------------------------
// Testigos de los enlaces
// ---------------------------------------------------------------------------------------------

/** Huella del testigo: es lo único que se guarda, así un vistazo a la base de datos no da enlaces. */
export function huella(testigo: string): string {
  return createHash('sha256').update(testigo).digest('base64url');
}

function nuevoTestigo(): { testigo: string; huella: string } {
  const testigo = randomBytes(32).toString('base64url');
  return { testigo, huella: huella(testigo) };
}

// ---------------------------------------------------------------------------------------------
// Comprobación de datos
// ---------------------------------------------------------------------------------------------

const FORMATO_USUARIO = /^[a-z0-9_.]{3,30}$/;

/** Nombre de usuario en minúsculas y sin espacios alrededor, o error si no vale. */
export function normalizarUsuario(usuario: string): string {
  const limpio = usuario.trim().toLowerCase();
  if (!FORMATO_USUARIO.test(limpio)) {
    throw datosNoValidos(
      'El nombre de usuario tiene que tener entre 3 y 30 caracteres: letras sin tilde, números, puntos o guiones bajos.',
    );
  }
  return limpio;
}

function comprobarContrasena(contrasena: string): void {
  if (contrasena.length < LONGITUD_MINIMA_CONTRASENA) {
    throw datosNoValidos(`La contraseña tiene que tener al menos ${LONGITUD_MINIMA_CONTRASENA} caracteres.`);
  }
  if (contrasena.length > 128) throw datosNoValidos('La contraseña es demasiado larga.');
}

function texto(valor: string, que: string, maximo = 100): string {
  const limpio = valor.trim().replace(/\s+/g, ' ');
  if (!limpio) throw datosNoValidos(`Falta ${que}.`);
  if (limpio.length > maximo) throw datosNoValidos(`${que[0]!.toUpperCase()}${que.slice(1)} es demasiado largo.`);
  return limpio;
}

/** ¿Es un error de "ya existe" de PostgreSQL? (por ejemplo, un nombre de usuario repetido) */
function esRepetido(error: unknown): boolean {
  let actual: unknown = error;
  while (actual && typeof actual === 'object') {
    if ('code' in actual && (actual as { code: unknown }).code === '23505') return true;
    actual = (actual as { cause?: unknown }).cause;
  }
  return false;
}

// ---------------------------------------------------------------------------------------------
// Quién es quién
// ---------------------------------------------------------------------------------------------

/**
 * El actor de un usuario que ha entrado: su papel y su iglesia. Si el perfil está de baja o su
 * iglesia desactivada, no hay actor (y la aplicación lo trata como si no hubiera entrado).
 */
export async function actorDeUsuario(bd: BD, usuarioId: string): Promise<Actor | null> {
  const [fila] = await bd
    .select({
      usuarioId: perfiles.usuarioId,
      iglesiaId: perfiles.iglesiaId,
      rol: perfiles.rol,
      nombre: perfiles.nombreMostrado,
      iglesiaActiva: iglesias.activa,
    })
    .from(perfiles)
    .leftJoin(iglesias, eq(iglesias.id, perfiles.iglesiaId))
    .where(and(eq(perfiles.usuarioId, usuarioId), eq(perfiles.activo, true)))
    .limit(1);

  if (!fila) return null;
  if (fila.rol !== 'plataforma' && !fila.iglesiaActiva) return null;
  return { usuarioId: fila.usuarioId, iglesiaId: fila.iglesiaId, rol: fila.rol, nombre: fila.nombre };
}

/** La iglesia del actor, o error si no tiene (el administrador de la plataforma no tiene). */
function iglesiaDe(actor: Actor): string {
  if (!actor.iglesiaId) throw sinPermiso();
  return actor.iglesiaId;
}

// ---------------------------------------------------------------------------------------------
// Creación de cuentas (solo por dentro: siempre detrás de una invitación o del guion de arranque)
// ---------------------------------------------------------------------------------------------

type Transaccion = Parameters<Parameters<BD['transaction']>[0]>[0];

interface DatosCuenta {
  nombre: string;
  usuario: string;
  contrasena: string;
}

async function crearCuenta(
  tx: Transaccion,
  datos: DatosCuenta,
  perfil: { rol: Rol; iglesiaId: string | null },
): Promise<string> {
  const nombre = texto(datos.nombre, 'tu nombre');
  const usuario = normalizarUsuario(datos.usuario);
  comprobarContrasena(datos.contrasena);

  const usuarioId = randomUUID();
  try {
    await tx.insert(user).values({
      id: usuarioId,
      name: nombre,
      // Better Auth necesita un correo único; ponemos uno interno que no lleva a ninguna parte.
      email: `${usuarioId}@sin-correo.invalid`,
      username: usuario,
      displayUsername: datos.usuario.trim(),
    });
  } catch (error) {
    if (esRepetido(error)) {
      throw new ErrorDeCuentas('usuario_repetido', `El nombre de usuario "${usuario}" ya está cogido. Elige otro.`);
    }
    throw error;
  }

  await tx.insert(account).values({
    id: randomUUID(),
    accountId: usuarioId,
    providerId: 'credential',
    userId: usuarioId,
    password: await hashPassword(datos.contrasena),
  });

  await tx.insert(perfiles).values({
    usuarioId,
    iglesiaId: perfil.iglesiaId,
    rol: perfil.rol,
    nombreMostrado: nombre,
  });

  return usuarioId;
}

/**
 * Primera cuenta de todas: el administrador de la plataforma. Solo se usa desde el guion
 * `npm run crear-administrador`, en el servidor.
 */
export async function crearAdministradorPlataforma(bd: BD, datos: DatosCuenta): Promise<string> {
  return bd.transaction(async (tx) => {
    const usuarioId = await crearCuenta(tx, datos, { rol: 'plataforma', iglesiaId: null });
    await tx.insert(registro).values({
      usuarioId, accion: 'alta', entidad: 'usuario', entidadId: usuarioId, datos: { rol: 'plataforma' },
    });
    return usuarioId;
  });
}

// ---------------------------------------------------------------------------------------------
// Invitaciones
// ---------------------------------------------------------------------------------------------

export interface EnlaceCreado {
  invitacionId: string;
  /** El testigo en claro: solo se ve ahora; después no se puede recuperar (solo anular). */
  testigo: string;
  caducaEn: Date;
}

/** El administrador de la plataforma prepara el alta de una iglesia nueva. */
export async function crearInvitacionIglesia(
  bd: BD,
  actor: Actor,
  datos: { nombreIglesia?: string } = {},
): Promise<EnlaceCreado> {
  if (actor.rol !== 'plataforma') throw sinPermiso();

  const nombreIglesia = datos.nombreIglesia?.trim() ? texto(datos.nombreIglesia, 'el nombre de la iglesia') : undefined;
  const { testigo, huella: h } = nuevoTestigo();
  const caducaEn = new Date(Date.now() + DIAS_INVITACION * DIA);

  return bd.transaction(async (tx) => {
    const [invitacion] = await tx.insert(invitaciones).values({
      testigo: h,
      tipo: 'iglesia',
      rol: 'admin_iglesia',
      datos: nombreIglesia ? { nombreIglesia } : {},
      creadaPor: actor.usuarioId,
      caducaEn,
    }).returning({ id: invitaciones.id });

    await tx.insert(registro).values({
      usuarioId: actor.usuarioId, accion: 'invitar', entidad: 'invitacion', entidadId: invitacion!.id,
      datos: { tipo: 'iglesia', ...(nombreIglesia ? { nombreIglesia } : {}) },
    });
    return { invitacionId: invitacion!.id, testigo, caducaEn };
  });
}

/** El administrador de una iglesia invita a alguien a SU iglesia, con el papel ya puesto. */
export async function crearInvitacionUsuario(
  bd: BD,
  actor: Actor,
  datos: { rol: Rol; nombre?: string },
): Promise<EnlaceCreado> {
  if (actor.rol !== 'admin_iglesia') throw sinPermiso();
  const iglesiaId = iglesiaDe(actor);
  if (datos.rol !== 'admin_iglesia' && datos.rol !== 'voluntario') throw sinPermiso();

  const nombre = datos.nombre?.trim() ? texto(datos.nombre, 'el nombre') : undefined;
  const { testigo, huella: h } = nuevoTestigo();
  const caducaEn = new Date(Date.now() + DIAS_INVITACION * DIA);

  return bd.transaction(async (tx) => {
    const [invitacion] = await tx.insert(invitaciones).values({
      testigo: h,
      tipo: 'usuario',
      iglesiaId,
      rol: datos.rol,
      datos: nombre ? { nombre } : {},
      creadaPor: actor.usuarioId,
      caducaEn,
    }).returning({ id: invitaciones.id });

    await tx.insert(registro).values({
      iglesiaId, usuarioId: actor.usuarioId, accion: 'invitar', entidad: 'invitacion', entidadId: invitacion!.id,
      datos: { tipo: 'usuario', rol: datos.rol, ...(nombre ? { nombre } : {}) },
    });
    return { invitacionId: invitacion!.id, testigo, caducaEn };
  });
}

/**
 * Enlace para poner una contraseña nueva. La plataforma puede hacerlo para cualquiera; el
 * administrador de una iglesia, solo para la gente de su iglesia.
 */
export async function crearRecuperacion(bd: BD, actor: Actor, usuarioId: string): Promise<EnlaceCreado> {
  if (actor.rol !== 'plataforma' && actor.rol !== 'admin_iglesia') throw sinPermiso();

  const [destino] = await bd
    .select({ usuarioId: perfiles.usuarioId, iglesiaId: perfiles.iglesiaId })
    .from(perfiles)
    .where(
      actor.rol === 'plataforma'
        ? eq(perfiles.usuarioId, usuarioId)
        : and(eq(perfiles.usuarioId, usuarioId), eq(perfiles.iglesiaId, iglesiaDe(actor))),
    )
    .limit(1);
  // Si es de otra iglesia, se contesta igual que si no existiera: no se da ni esa pista.
  if (!destino) throw noEncontrado('a esa persona');

  const { testigo, huella: h } = nuevoTestigo();
  const caducaEn = new Date(Date.now() + HORAS_RECUPERACION * HORA);

  return bd.transaction(async (tx) => {
    const [invitacion] = await tx.insert(invitaciones).values({
      testigo: h,
      tipo: 'recuperacion',
      iglesiaId: destino.iglesiaId,
      usuarioDestinoId: destino.usuarioId,
      creadaPor: actor.usuarioId,
      caducaEn,
    }).returning({ id: invitaciones.id });

    await tx.insert(registro).values({
      iglesiaId: destino.iglesiaId, usuarioId: actor.usuarioId, accion: 'recuperacion',
      entidad: 'usuario', entidadId: destino.usuarioId,
    });
    return { invitacionId: invitacion!.id, testigo, caducaEn };
  });
}

/** Anular un enlace antes de que se use. Cada cual solo los de su ámbito. */
export async function anularInvitacion(bd: BD, actor: Actor, invitacionId: string): Promise<void> {
  if (actor.rol !== 'plataforma' && actor.rol !== 'admin_iglesia') throw sinPermiso();
  if (!esUuid(invitacionId)) throw noEncontrado('ese enlace');

  const ambito = actor.rol === 'plataforma'
    ? eq(invitaciones.id, invitacionId)
    : and(eq(invitaciones.id, invitacionId), eq(invitaciones.iglesiaId, iglesiaDe(actor)));

  await bd.transaction(async (tx) => {
    const [anulada] = await tx
      .update(invitaciones)
      .set({ anuladaEn: sql`now()` })
      .where(and(ambito, isNull(invitaciones.usadaEn), isNull(invitaciones.anuladaEn)))
      .returning({ id: invitaciones.id, iglesiaId: invitaciones.iglesiaId });
    if (!anulada) throw noEncontrado('ese enlace pendiente');

    await tx.insert(registro).values({
      iglesiaId: anulada.iglesiaId, usuarioId: actor.usuarioId, accion: 'anular',
      entidad: 'invitacion', entidadId: anulada.id,
    });
  });
}

export interface InvitacionPendiente {
  id: string;
  tipo: TipoInvitacion;
  rol: Rol | null;
  datos: Record<string, unknown>;
  creadaEn: Date;
  caducaEn: Date;
  /** En las de recuperación: el nombre de la persona. */
  paraQuien: string | null;
}

/** Enlaces todavía sin usar, sin anular y sin caducar, del ámbito del actor. */
export async function listarInvitacionesPendientes(bd: BD, actor: Actor): Promise<InvitacionPendiente[]> {
  if (actor.rol !== 'plataforma' && actor.rol !== 'admin_iglesia') throw sinPermiso();

  const vigente = and(isNull(invitaciones.usadaEn), isNull(invitaciones.anuladaEn), gt(invitaciones.caducaEn, sql`now()`));
  const ambito = actor.rol === 'plataforma'
    ? vigente
    : and(vigente, eq(invitaciones.iglesiaId, iglesiaDe(actor)));

  return bd
    .select({
      id: invitaciones.id,
      tipo: invitaciones.tipo,
      rol: invitaciones.rol,
      datos: invitaciones.datos,
      creadaEn: invitaciones.creadaEn,
      caducaEn: invitaciones.caducaEn,
      paraQuien: perfiles.nombreMostrado,
    })
    .from(invitaciones)
    .leftJoin(perfiles, eq(perfiles.usuarioId, invitaciones.usuarioDestinoId))
    .where(ambito)
    .orderBy(desc(invitaciones.creadaEn));
}

// ---------------------------------------------------------------------------------------------
// Abrir un enlace
// ---------------------------------------------------------------------------------------------

export type EstadoEnlace =
  | {
    valido: true;
    tipo: TipoInvitacion;
    rol: Rol | null;
    iglesia: string | null;
    datos: Record<string, unknown>;
    paraUsuario: string | null;
  }
  | { valido: false; motivo: 'no_existe' | 'usada' | 'anulada' | 'caducada' };

/** Lo que se enseña al abrir un enlace, sin gastarlo todavía. */
export async function consultarEnlace(bd: BD, testigo: string): Promise<EstadoEnlace> {
  const [fila] = await bd
    .select({
      tipo: invitaciones.tipo,
      rol: invitaciones.rol,
      datos: invitaciones.datos,
      caducaEn: invitaciones.caducaEn,
      usadaEn: invitaciones.usadaEn,
      anuladaEn: invitaciones.anuladaEn,
      iglesia: iglesias.nombre,
      paraUsuario: user.username,
    })
    .from(invitaciones)
    .leftJoin(iglesias, eq(iglesias.id, invitaciones.iglesiaId))
    .leftJoin(user, eq(user.id, invitaciones.usuarioDestinoId))
    .where(eq(invitaciones.testigo, huella(testigo)))
    .limit(1);

  if (!fila) return { valido: false, motivo: 'no_existe' };
  if (fila.usadaEn) return { valido: false, motivo: 'usada' };
  if (fila.anuladaEn) return { valido: false, motivo: 'anulada' };
  if (fila.caducaEn.getTime() <= Date.now()) return { valido: false, motivo: 'caducada' };
  return {
    valido: true, tipo: fila.tipo, rol: fila.rol, iglesia: fila.iglesia, datos: fila.datos, paraUsuario: fila.paraUsuario,
  };
}

/**
 * Gasta el enlace dentro de la transacción. Es UNA sola orden a la base de datos, así que si dos
 * personas lo usan a la vez solo una lo consigue. Si después algo falla, la transacción entera
 * se deshace y el enlace sigue sin gastar.
 */
async function gastarEnlace(tx: Transaccion, testigo: string, tipo: TipoInvitacion) {
  const [invitacion] = await tx
    .update(invitaciones)
    .set({ usadaEn: sql`now()` })
    .where(and(
      eq(invitaciones.testigo, huella(testigo)),
      eq(invitaciones.tipo, tipo),
      isNull(invitaciones.usadaEn),
      isNull(invitaciones.anuladaEn),
      gt(invitaciones.caducaEn, sql`now()`),
    ))
    .returning();
  if (!invitacion) {
    throw new ErrorDeCuentas('invitacion_no_valida', 'Este enlace ya no vale: se ha usado, se ha anulado o ha caducado.');
  }
  return invitacion;
}

/** Usar una invitación de iglesia: nace la iglesia y la cuenta de su administrador. */
export async function usarInvitacionIglesia(
  bd: BD,
  testigo: string,
  datos: DatosCuenta & { nombreIglesia: string; ciudad: string },
): Promise<{ iglesiaId: string; usuarioId: string }> {
  const nombreIglesia = texto(datos.nombreIglesia, 'el nombre de la iglesia');
  const ciudad = texto(datos.ciudad, 'la ciudad');

  return bd.transaction(async (tx) => {
    const invitacion = await gastarEnlace(tx, testigo, 'iglesia');
    const [iglesia] = await tx.insert(iglesias).values({ nombre: nombreIglesia, ciudad }).returning({ id: iglesias.id });
    const iglesiaId = iglesia!.id;
    const usuarioId = await crearCuenta(tx, datos, { rol: 'admin_iglesia', iglesiaId });

    await tx.update(invitaciones).set({ usadaPor: usuarioId }).where(eq(invitaciones.id, invitacion.id));
    await tx.insert(registro).values([
      { iglesiaId, usuarioId, accion: 'alta', entidad: 'iglesia', entidadId: iglesiaId, datos: { nombre: nombreIglesia, ciudad } },
      { iglesiaId, usuarioId, accion: 'alta', entidad: 'usuario', entidadId: usuarioId, datos: { rol: 'admin_iglesia' } },
    ]);
    return { iglesiaId, usuarioId };
  });
}

/** Usar una invitación de usuario: nace la cuenta, en la iglesia y con el papel del enlace. */
export async function usarInvitacionUsuario(
  bd: BD,
  testigo: string,
  datos: DatosCuenta,
): Promise<{ usuarioId: string }> {
  return bd.transaction(async (tx) => {
    const invitacion = await gastarEnlace(tx, testigo, 'usuario');
    const usuarioId = await crearCuenta(tx, datos, { rol: invitacion.rol!, iglesiaId: invitacion.iglesiaId });

    await tx.update(invitaciones).set({ usadaPor: usuarioId }).where(eq(invitaciones.id, invitacion.id));
    await tx.insert(registro).values({
      iglesiaId: invitacion.iglesiaId, usuarioId, accion: 'alta', entidad: 'usuario', entidadId: usuarioId,
      datos: { rol: invitacion.rol },
    });
    return { usuarioId };
  });
}

/** Usar un enlace de recuperación: contraseña nueva y se cierran todas las sesiones abiertas. */
export async function usarRecuperacion(bd: BD, testigo: string, datos: { contrasena: string }): Promise<{ usuario: string }> {
  comprobarContrasena(datos.contrasena);

  return bd.transaction(async (tx) => {
    const invitacion = await gastarEnlace(tx, testigo, 'recuperacion');
    const usuarioId = invitacion.usuarioDestinoId!;

    const cambiadas = await tx
      .update(account)
      .set({ password: await hashPassword(datos.contrasena), updatedAt: sql`now()` })
      .where(and(eq(account.userId, usuarioId), eq(account.providerId, 'credential')))
      .returning({ id: account.id });
    if (cambiadas.length === 0) throw noEncontrado('la cuenta');

    await tx.delete(session).where(eq(session.userId, usuarioId));
    await tx.update(invitaciones).set({ usadaPor: usuarioId }).where(eq(invitaciones.id, invitacion.id));
    await tx.insert(registro).values({
      iglesiaId: invitacion.iglesiaId, usuarioId, accion: 'cambiar_contrasena', entidad: 'usuario', entidadId: usuarioId,
    });

    const [cuenta] = await tx.select({ usuario: user.username }).from(user).where(eq(user.id, usuarioId));
    return { usuario: cuenta!.usuario ?? '' };
  });
}

// ---------------------------------------------------------------------------------------------
// Listados
// ---------------------------------------------------------------------------------------------

export interface UsuarioListado {
  usuarioId: string;
  nombre: string;
  usuario: string | null;
  rol: Rol;
  activo: boolean;
  iglesiaId: string | null;
  iglesia: string | null;
}

/** La gente de la iglesia del actor. La plataforma ve a todos (para poder ayudar con contraseñas). */
export async function listarUsuarios(bd: BD, actor: Actor): Promise<UsuarioListado[]> {
  if (actor.rol !== 'plataforma' && actor.rol !== 'admin_iglesia') throw sinPermiso();

  return bd
    .select({
      usuarioId: perfiles.usuarioId,
      nombre: perfiles.nombreMostrado,
      usuario: user.username,
      rol: perfiles.rol,
      activo: perfiles.activo,
      iglesiaId: perfiles.iglesiaId,
      iglesia: iglesias.nombre,
    })
    .from(perfiles)
    .innerJoin(user, eq(user.id, perfiles.usuarioId))
    .leftJoin(iglesias, eq(iglesias.id, perfiles.iglesiaId))
    .where(actor.rol === 'plataforma' ? undefined : eq(perfiles.iglesiaId, iglesiaDe(actor)))
    .orderBy(asc(iglesias.nombre), asc(perfiles.nombreMostrado));
}

export interface IglesiaListada {
  id: string;
  nombre: string;
  ciudad: string;
  activa: boolean;
  creadaEn: Date;
}

/** Todas las iglesias. Solo para el administrador de la plataforma. */
export async function listarIglesias(bd: BD, actor: Actor): Promise<IglesiaListada[]> {
  if (actor.rol !== 'plataforma') throw sinPermiso();
  return bd.select().from(iglesias).orderBy(asc(iglesias.nombre));
}

/** La iglesia del propio actor (para la cabecera). */
export async function miIglesia(bd: BD, actor: Actor): Promise<IglesiaListada | null> {
  if (!actor.iglesiaId) return null;
  const [fila] = await bd.select().from(iglesias).where(eq(iglesias.id, actor.iglesiaId)).limit(1);
  return fila ?? null;
}

const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function esUuid(valor: string): boolean {
  return FORMATO_UUID.test(valor);
}
