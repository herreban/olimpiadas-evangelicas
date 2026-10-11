import { defineConfig } from 'drizzle-kit';

// Las migraciones se generan a partir de `src/db/esquema.ts` con `npm run bd:generar`
// y se aplican con `npm run bd:migrar`.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/esquema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
