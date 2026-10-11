/**
 * Esquema de la base de datos (fase 1): cuentas, iglesias, papeles, invitaciones y registro.
 *
 * Las cuatro primeras tablas (`user`, `session`, `account`, `verification`) son las que pide
 * Better Auth, con los nombres que espera. El resto son del proyecto, en castellano.
 *
 * Las tablas de participantes, ediciones, pruebas… llegan en la fase 2.
 */
import { sql } from 'drizzle-orm';
import {
  boolean, check, index, jsonb, pgEnum, pgTable, text, timestamp, uuid,
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------------------------
// Tablas de Better Auth
// ---------------------------------------------------------------------------------------------

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  /** Better Auth lo exige; como no usamos correo, se rellena con una dirección interna inservible. */
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  /** Nombre de usuario con el que se entra (en minúsculas). */
  username: text('username').unique(),
  displayUsername: text('display_username'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
}, (t) => [index('session_user_id_idx').on(t.userId)]);

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  /** Contraseña cifrada (nunca en texto). */
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('account_user_id_idx').on(t.userId)]);

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('verification_identifier_idx').on(t.identifier)]);

// ---------------------------------------------------------------------------------------------
// Tablas del proyecto
// ---------------------------------------------------------------------------------------------

export const rol = pgEnum('rol', ['plataforma', 'admin_iglesia', 'voluntario']);
export const tipoInvitacion = pgEnum('tipo_invitacion', ['iglesia', 'usuario', 'recuperacion']);

export type Rol = (typeof rol.enumValues)[number];
export type TipoInvitacion = (typeof tipoInvitacion.enumValues)[number];

export const iglesias = pgTable('iglesias', {
  id: uuid('id').primaryKey().defaultRandom(),
  nombre: text('nombre').notNull(),
  ciudad: text('ciudad').notNull(),
  activa: boolean('activa').notNull().default(true),
  creadaEn: timestamp('creada_en', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Lo que la aplicación sabe de cada usuario además de su login: a qué iglesia pertenece y con
 * qué papel. Solo el administrador de la plataforma va sin iglesia.
 */
export const perfiles = pgTable('perfiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  usuarioId: text('usuario_id').notNull().unique().references(() => user.id),
  iglesiaId: uuid('iglesia_id').references(() => iglesias.id),
  rol: rol('rol').notNull(),
  nombreMostrado: text('nombre_mostrado').notNull(),
  activo: boolean('activo').notNull().default(true),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('perfiles_iglesia_idx').on(t.iglesiaId),
  // La base de datos no deja que un usuario de iglesia se quede sin iglesia, ni al revés.
  check('perfiles_iglesia_segun_rol', sql`(${t.rol} = 'plataforma') = (${t.iglesiaId} is null)`),
]);

/**
 * Enlaces de un solo uso: crear una iglesia, dar de alta a un usuario o recuperar la contraseña.
 * Del testigo solo se guarda su huella (SHA-256): quien vea la base de datos no puede usar los
 * enlaces pendientes.
 */
export const invitaciones = pgTable('invitaciones', {
  id: uuid('id').primaryKey().defaultRandom(),
  testigo: text('testigo').notNull().unique(),
  tipo: tipoInvitacion('tipo').notNull(),
  /** Vacío en las de tipo iglesia (la iglesia todavía no existe). */
  iglesiaId: uuid('iglesia_id').references(() => iglesias.id),
  /** Papel que tendrá la cuenta nueva (en las de recuperación, vacío). */
  rol: rol('rol'),
  /** En las de recuperación, de quién es la contraseña que se cambia. */
  usuarioDestinoId: text('usuario_destino_id').references(() => user.id),
  /** Datos propuestos (por ejemplo, el nombre de la iglesia que se espera). */
  datos: jsonb('datos').$type<Record<string, unknown>>().notNull().default({}),
  creadaPor: text('creada_por').notNull().references(() => user.id),
  creadaEn: timestamp('creada_en', { withTimezone: true }).notNull().defaultNow(),
  caducaEn: timestamp('caduca_en', { withTimezone: true }).notNull(),
  anuladaEn: timestamp('anulada_en', { withTimezone: true }),
  usadaEn: timestamp('usada_en', { withTimezone: true }),
  usadaPor: text('usada_por').references(() => user.id),
}, (t) => [
  index('invitaciones_iglesia_idx').on(t.iglesiaId),
  check('invitaciones_iglesia_segun_tipo', sql`(${t.tipo} = 'iglesia') = (${t.iglesiaId} is null)`),
  check('invitaciones_destino_segun_tipo', sql`(${t.tipo} = 'recuperacion') = (${t.usuarioDestinoId} is not null)`),
]);

/** Quién hizo qué y cuándo. Solo se añaden filas. */
export const registro = pgTable('registro', {
  id: uuid('id').primaryKey().defaultRandom(),
  iglesiaId: uuid('iglesia_id').references(() => iglesias.id),
  usuarioId: text('usuario_id').references(() => user.id),
  accion: text('accion').notNull(),
  entidad: text('entidad').notNull(),
  entidadId: text('entidad_id'),
  datos: jsonb('datos').$type<Record<string, unknown>>().notNull().default({}),
  momento: timestamp('momento', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('registro_iglesia_momento_idx').on(t.iglesiaId, t.momento)]);
