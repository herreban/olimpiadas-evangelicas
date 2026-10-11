/** Aplica las migraciones pendientes a la base de datos de `DATABASE_URL`. */
import { conectar } from '../src/db/conexion';
import { migrar } from '../src/db/migrar';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Falta DATABASE_URL.');
  process.exit(1);
}

const { bd, cerrar } = conectar(url);
try {
  await migrar(bd);
  console.log('Base de datos al día.');
} finally {
  await cerrar();
}
