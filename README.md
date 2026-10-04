# Olimpiadas Evangélicas

Aplicación web para que varias iglesias gestionen las olimpiadas de sus niños y niñas
(participantes, pruebas del día, entrenamientos y resultados), cada iglesia con sus datos
separados del resto.

- **Estado:** fase 1 en marcha — cimientos de la aplicación.
- **Especificación:** [`docs/especificacion.md`](docs/especificacion.md)
- **Stack:** Astro (modo servidor) + shadcn/ui, PostgreSQL, Drizzle, Better Auth.

## Cómo trabajamos

Cada fase del proyecto entra como una *pull request* pequeña, con la especificación aprobada
de antemano. Nada llega a `main` sin pasar por una PR revisada, y cada PR tiene que pasar las
comprobaciones automáticas (tipos, pruebas y construcción).

## Cómo se trabaja en el código

Hace falta **Node 22** y una base de datos PostgreSQL (para la fase 2 en adelante).

```bash
npm install      # instalar las dependencias
npm run dev      # servidor de desarrollo en http://localhost:4321
npm run check    # revisar los tipos
npm run test     # ejecutar las pruebas
npm run build    # construir para producción
npm start        # arrancar lo construido
```

La configuración (dirección de la base de datos y secretos) se lee del entorno; nunca se
escribe en el repositorio.

### Cómo está ordenado

```
src/lib/           lógica del proyecto (categorías, plazas, equipos…), sin depender de Astro
src/components/    islas de React (lo poco que necesita interactuar en el móvil)
src/pages/         páginas servidas desde el servidor
docs/              especificación y documentación
```
