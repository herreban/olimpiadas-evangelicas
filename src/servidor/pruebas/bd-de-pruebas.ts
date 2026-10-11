/**
 * Base de datos para las pruebas automáticas.
 *
 * Se usa la de `DATABASE_URL_PRUEBAS` y **se vacía entera** antes de cada fichero de pruebas.
 * Nunca la apuntes a una base de datos con datos de verdad.
 *
 * Sin esa variable, las pruebas con base de datos se saltan en local (avisando). En las
 * comprobaciones automáticas (`CI`) es obligatoria: allí no se salta nada.
 */
import { sql } from 'drizzle-orm';
import { conectar, type BD } from '../../db/conexion';
import { migrar } from '../../db/migrar';
import { crearAuth } from '../auth';
import { crearAdministradorPlataforma, actorDeUsuario, type Actor } from '../cuentas';

export const URL_PRUEBAS = process.env.DATABASE_URL_PRUEBAS;

if (!URL_PRUEBAS) {
  if (process.env.CI) throw new Error('En las comprobaciones automáticas hace falta DATABASE_URL_PRUEBAS.');
  console.warn('⚠ Sin DATABASE_URL_PRUEBAS: se saltan las pruebas con base de datos.');
}

export const hayBD = Boolean(URL_PRUEBAS);

/** Conecta, vacía la base de datos y la deja con todas las migraciones aplicadas. */
export async function prepararBD(): Promise<{ bd: BD; cerrar: () => Promise<void> }> {
  const conexion = conectar(URL_PRUEBAS!);
  await conexion.bd.execute(sql`drop schema if exists public cascade`);
  await conexion.bd.execute(sql`drop schema if exists drizzle cascade`);
  await conexion.bd.execute(sql`create schema public`);
  await migrar(conexion.bd);
  return conexion;
}

export function authDePruebas(bd: BD) {
  return crearAuth(bd, { secreto: 'secreto-de-pruebas-que-no-vale-para-nada-0123456789', urlBase: 'http://localhost:4321' });
}

export async function actor(bd: BD, usuarioId: string): Promise<Actor> {
  const encontrado = await actorDeUsuario(bd, usuarioId);
  if (!encontrado) throw new Error(`No hay actor para ${usuarioId}`);
  return encontrado;
}

export async function crearPlataforma(bd: BD): Promise<Actor> {
  const id = await crearAdministradorPlataforma(bd, { nombre: 'Esteban', usuario: 'esteban', contrasena: 'contrasena-larga' });
  return actor(bd, id);
}
