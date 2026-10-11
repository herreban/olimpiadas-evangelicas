/**
 * Conexión con PostgreSQL.
 *
 * La dirección se lee del entorno (`DATABASE_URL`), nunca del repositorio. La conexión se abre
 * la primera vez que hace falta, así construir el proyecto no necesita base de datos.
 */
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as esquema from './esquema';

export type BD = PostgresJsDatabase<typeof esquema>;

/** Abre una conexión nueva. La usan la aplicación, los guiones y las pruebas. */
export function conectar(url: string): { bd: BD; cerrar: () => Promise<void> } {
  const cliente = postgres(url, { max: 10, onnotice: () => {} });
  return { bd: drizzle(cliente, { schema: esquema }), cerrar: () => cliente.end() };
}

let compartida: BD | undefined;

/** La conexión de la aplicación, una sola para todo el servidor. */
export function bd(): BD {
  if (!compartida) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('Falta DATABASE_URL: la dirección de la base de datos se configura en el entorno.');
    compartida = conectar(url).bd;
  }
  return compartida;
}
