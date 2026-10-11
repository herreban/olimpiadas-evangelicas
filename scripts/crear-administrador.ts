/**
 * Crea la cuenta del administrador de la plataforma (la primera de todas).
 *
 *   npm run crear-administrador -- --nombre "Esteban" --usuario esteban
 *
 * La contraseña se pide por teclado, no se escribe en la orden (así no queda en el historial).
 */
import { parseArgs } from 'node:util';
import { createInterface } from 'node:readline/promises';
import { conectar } from '../src/db/conexion';
import { crearAdministradorPlataforma, ErrorDeCuentas } from '../src/servidor/cuentas';

const { values } = parseArgs({
  options: { nombre: { type: 'string' }, usuario: { type: 'string' } },
});

const url = process.env.DATABASE_URL;
if (!url || !values.nombre || !values.usuario) {
  console.error('Uso: DATABASE_URL=… npm run crear-administrador -- --nombre "Esteban" --usuario esteban');
  process.exit(1);
}

async function pedirContrasena(): Promise<string> {
  if (process.env.CONTRASENA_ADMINISTRADOR) return process.env.CONTRASENA_ADMINISTRADOR;
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const primera = await terminal.question('Contraseña: ');
    const segunda = await terminal.question('Repite la contraseña: ');
    if (primera !== segunda) throw new ErrorDeCuentas('datos_no_validos', 'Las dos contraseñas no coinciden.');
    return primera;
  } finally {
    terminal.close();
  }
}

const { bd, cerrar } = conectar(url);
try {
  await crearAdministradorPlataforma(bd, { nombre: values.nombre, usuario: values.usuario, contrasena: await pedirContrasena() });
  console.log(`Administrador de la plataforma creado: ${values.usuario.trim().toLowerCase()}`);
} catch (error) {
  console.error(error instanceof ErrorDeCuentas ? error.message : error);
  process.exitCode = 1;
} finally {
  await cerrar();
}
