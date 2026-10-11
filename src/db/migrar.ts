import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import type { BD } from './conexion';

/** Carpeta con las migraciones generadas por drizzle-kit. */
export const CARPETA_MIGRACIONES = fileURLToPath(new URL('../../drizzle', import.meta.url));

/** Deja la base de datos al día. Aplicar dos veces no hace nada la segunda. */
export async function migrar(bd: BD, carpeta = CARPETA_MIGRACIONES): Promise<void> {
  await migrate(bd, { migrationsFolder: carpeta });
}
