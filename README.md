# Olimpiadas Evangélicas

Aplicación web para que varias iglesias gestionen las olimpiadas de sus niños y niñas
(participantes, pruebas del día, entrenamientos y resultados), cada iglesia con sus datos
separados del resto.

- **Estado:** fase 1 en revisión — cuentas, iglesias, papeles y aislamiento.
- **Especificación:** [`docs/especificacion.md`](docs/especificacion.md)
- **Stack:** Astro (modo servidor) + shadcn/ui, PostgreSQL, Drizzle, Better Auth.

## Cómo trabajamos

Cada fase del proyecto entra como una *pull request* pequeña, con la especificación aprobada
de antemano. Nada llega a `main` sin pasar por una PR revisada, y cada PR tiene que pasar las
comprobaciones automáticas (tipos, pruebas y construcción).

## Cómo se trabaja en el código

Hace falta **Node 22** y **PostgreSQL** (16 o posterior).

```bash
npm install                  # instalar las dependencias
cp .env.ejemplo .env         # y rellenarlo (base de datos y secreto)
npm run bd:migrar            # crear o poner al día las tablas
npm run crear-administrador -- --nombre "Esteban" --usuario esteban   # primera cuenta (pide la contraseña)
npm run dev                  # servidor de desarrollo en http://localhost:4321
```

Otras órdenes:

```bash
npm run check        # revisar los tipos
npm run test         # ejecutar las pruebas
npm run bd:generar   # generar la migración tras cambiar src/db/esquema.ts
npm run build        # construir para producción
npm start            # arrancar lo construido
```

La configuración (dirección de la base de datos y secretos) se lee del entorno; nunca se
escribe en el repositorio. Ver [`.env.ejemplo`](.env.ejemplo).

### Las pruebas con base de datos

Las pruebas del login y del **aislamiento entre iglesias** necesitan una PostgreSQL de usar y
tirar en `DATABASE_URL_PRUEBAS`: **se vacía entera** en cada pasada, así que nunca la apuntes a
una base de datos con datos de verdad.

```bash
DATABASE_URL_PRUEBAS=postgres://postgres@localhost:5432/olimpiadas_pruebas npm run test
```

Sin esa variable, en local se saltan avisando. En las comprobaciones automáticas de cada pull
request son obligatorias.

### Cómo está ordenado

```
src/lib/           lógica pura del proyecto (categorías, freno al login…), sin base de datos ni Astro
src/db/            esquema de la base de datos y conexión
src/servidor/      reglas que tocan la base de datos: cuentas, invitaciones, permisos y aislamiento
src/middleware.ts  quién ha entrado y a qué páginas puede pasar
src/pages/         páginas servidas desde el servidor
src/components/    piezas de las páginas e islas de React (lo poco que necesita interactuar)
drizzle/           migraciones generadas (no se tocan a mano)
scripts/           órdenes para el servidor: migrar y crear el administrador
docs/              especificación y documentación
```
