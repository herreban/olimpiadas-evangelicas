# Especificación — Olimpiadas Evangélicas

**Estado:** borrador para revisión (fase 0). Nada de código hasta que Esteban apruebe este documento.
**Fecha:** 4 de octubre de 2026

---

## 1. Qué es

Una aplicación web para que **varias iglesias** gestionen por su cuenta las olimpiadas de sus
niños y niñas, y los entrenamientos previos.

Cada iglesia entra con su propia cuenta, ve **solo sus datos** y no puede ver ni tocar los de
ninguna otra. El uso principal es desde el móvil, el mismo día del evento, con varias personas
apuntando y marcando pruebas a la vez.

## 2. Palabras del proyecto

| Palabra | Qué significa |
|---|---|
| **Iglesia** | Cada entidad que usa la aplicación. Agrupa participantes y usuarios. |
| **Usuario** | Persona con cuenta. Pertenece a **una sola** iglesia. |
| **Invitación** | Enlace de un solo uso para crear una iglesia o dar de alta a un usuario. |
| **Participante** | Niño o niña que compite. Guardamos su fecha de nacimiento, no su edad. |
| **Edición** | Las olimpiadas de un año concreto dentro de una iglesia (2026, 2027…). |
| **Categoría** | Par de edades (4–5, 6–7 … 16–17). **Se calcula**, no se guarda. |
| **Prueba** | Cada deporte: maratón, relevos, peso, altura, longitud, carreras lisas. |
| **Inscripción** | Un participante, en una edición, apuntado a una prueba. |
| **Celebración** | Una prueba que ya se ha disputado, en una categoría y sexo concretos. |
| **Hecho** | Una prueba concreta de un participante concreto que ya está hecha. |
| **Medición** | Marca de entrenamiento: participante, prueba, fecha y valor. |

## 3. Quién puede hacer qué

Tres papeles, y nada más:

| Acción | Administrador de la plataforma | Administrador de iglesia | Voluntario |
|---|:--:|:--:|:--:|
| Crear iglesias (con invitación) | ✅ | — | — |
| Administrar cualquier iglesia | ✅ | — | — |
| Invitar usuarios a su iglesia | — | ✅ | — |
| Generar enlaces de recuperación de contraseña | ✅ | ✅ (solo de su iglesia) | — |
| Crear ediciones | — | ✅ | — |
| Apuntar, editar y dar de baja participantes | — | ✅ | ✅ |
| Inscribir participantes en las pruebas | — | ✅ | ✅ |
| Marcar pruebas celebradas y hechas | — | ✅ | ✅ |
| Anotar mediciones de entrenamiento | — | ✅ | ✅ |
| Borrar una edición entera | — | ✅ | — |
| Ver datos de otra iglesia | ❌ (nadie) | ❌ | ❌ |

## 4. Reglas de oro

1. **Aislamiento entre iglesias.** Cada fila de datos pertenece a una iglesia. Toda consulta
   va filtrada por la iglesia del usuario que ha entrado. Se controla en la capa de datos del
   servidor, **nunca** en la pantalla, y cada apartado lleva una prueba automática que
   demuestra que la iglesia A no puede ver ni modificar lo de la iglesia B.
2. **Nada de registro abierto.** Una iglesia solo existe si el administrador de la plataforma
   ha creado antes una invitación de un solo uso. Los usuarios los invita el administrador de
   su iglesia.
3. **Sin correo electrónico.** No hay envío de correos: ni verificación, ni avisos, ni
   recuperación por correo. Las invitaciones y las recuperaciones de contraseña son enlaces de
   un solo uso que se copian y se pasan a mano (WhatsApp, en persona…).
4. **Datos de menores.** Acceso solo con login, nada en abierto, HTTPS obligatorio, y
   posibilidad de borrar los datos de un participante o de una edición cuando haga falta.
5. **Un usuario, una iglesia.** Si alguien ayuda en dos iglesias, tiene dos cuentas.

## 5. Cómo se calcula la categoría

Categoría = **año de la edición − año de nacimiento** (la edad que cumple ese año). Quien nace
en 2020 y compite en 2026 tiene 6 años y va a la categoría **6–7**. Así no hay líos con quien
cumple años en noviembre.

El par de edades empieza siempre en número par: 4–5, 6–7, 8–9, 10–11, 12–13, 14–15, 16–17.

Si el resultado queda fuera de 4–17, el participante sale marcado como **fuera de categoría**
para que se vea claro y no entre en los listados de competición sin querer.

## 6. Requisitos funcionales

### 6.1 Acceso y altas
- Entrar con usuario y contraseña. Cerrar sesión.
- **Crear iglesia**: solo con una invitación de un solo uso generada por el administrador de la
  plataforma. Al usarla se crea la iglesia y la cuenta de su administrador (nombre de la
  iglesia, ciudad, nombre y contraseña de la persona). La invitación queda gastada.
- **Invitar usuario**: el administrador de una iglesia genera un enlace de un solo uso con un
  papel ya asignado (administrador de iglesia o voluntario). Quien lo abre crea su contraseña.
- **Recuperar contraseña** sin correo: el administrador genera un enlace de un solo uso y se lo
  pasa a la persona. Caduca en 24 horas.
- Las invitaciones caducan (7 días por defecto) y se pueden anular antes de usarse.
- Las contraseñas se guardan cifradas, nunca en texto. **No se programa a mano**: se usa una
  biblioteca probada (Better Auth).

### 6.2 Participantes
- Alta con nombre, fecha de nacimiento y sexo (♂/♀).
- La categoría se muestra calculada, según la edición en la que se esté trabajando.
- **Aviso de posible duplicado**: al escribir un nombre que ya existe en la misma iglesia y
  categoría, se avisa antes de guardar (los voluntarios escriben con prisa).
- Editar datos, y dar de baja sin borrar el histórico de años anteriores.
- El símbolo ♂/♀ se puede corregir de un toque desde el listado.

### 6.3 Ediciones
- Crear la edición de un año (fecha del evento, nombre). Una por iglesia y año.
- Estados: borrador (se prepara), abierta (día del evento), cerrada (solo consulta).
- Cambiar de edición para consultar años anteriores.

### 6.4 Pruebas e inscripciones
- Catálogo general: maratón (mixta), relevos, lanzamiento de peso, salto de altura, salto de
  longitud y carreras lisas.
- Cada prueba declara si va **mixta o desdoblada por sexo**, y si tiene medida (tiempo,
  distancia, altura) o es solo "hecha/no hecha". Añadir una prueba nueva no debe tocar código.
- Todo participante inscrito hace **tres pruebas**: maratón, relevos y **una** de las cuatro
  electivas. Se puede cambiar la electiva sin perder lo ya marcado de las otras dos.
- Inscribir se puede hacer de uno en uno o por tandas (para meter la lista de una iglesia de
  golpe).

### 6.5 El día del evento: marcar pruebas
- Dos niveles, como ya funcionaba:
  - **Celebración**: "esta prueba (categoría, sexo) ya se ha disputado".
  - **Hecho**: "este participante ya ha hecho esta prueba".
- **Regla de la cascada**: al marcar una celebración, se dan por hechos todos los participantes
  que hacen esa prueba en esa categoría y sexo. La maratón es mixta: marca a los dos sexos.
- **Desmarcar una celebración NO desmarca a los participantes**: así no se borra trabajo hecho
  a mano.
- Queda registrado **quién** marca y desmarca, y **a qué hora**.
- Listado con filtros: por prueba (se pueden marcar varias), por categoría (una) y por sexo
  (♂, ♀, las dos o ninguna = todos), más orden (nombre, edad, pendientes).
- Contador visible de cuántas pruebas se llevan celebradas del total.
- Las pantallas de varias personas se ven iguales solas, sin recargar (sondeo cada pocos
  segundos), y el marcado se pinta al instante aunque la cobertura vaya mal, reintentando si
  falla.

### 6.6 Competición: resultados *(pendiente de confirmar, ver §11)*
- Además de marcar "hecho", poder anotar la **marca** de cada participante (tiempo, distancia,
  altura) cuando la prueba la tenga.
- Con esas marcas, clasificación por prueba, categoría y sexo, y mejores marcas históricas.

### 6.7 Entrenamientos
- Anotar mediciones: participante, prueba, **fecha** y **valor**, con una nota opcional.
- Pantalla de evolución por participante: sus marcas en el tiempo, y su mejor marca por prueba.
- La mejor marca se calcula según la prueba: en tiempo gana el menor; en distancia y altura, el
  mayor.
- Se puede apuntar una sesión completa del tirón (varios niños y varias pruebas del mismo día).
- Comparación entre participantes (por ejemplo, el progreso de la categoría 8–9 en longitud).

### 6.8 Histórico
- Consultar ediciones anteriores: participantes, pruebas celebradas, resultados y clasificación.
- Los participantes que suben de categoría mantienen su historial: se les sigue por su ficha,
  no por la categoría del año.

## 7. Modelo de datos

Tablas y campos principales. Todas las tablas con `iglesia_id` lo llevan para el aislamiento.

**`iglesias`** — id, nombre, ciudad, activa, creada_en.

**`usuarios`** (tablas propias de Better Auth: `user`, `session`, `account`, `verification`)
**`perfiles`** — id, usuario_id (único, apunta a `user`), iglesia_id (vacío solo para el
administrador de la plataforma), rol (`plataforma` | `admin_iglesia` | `voluntario`), nombre
mostrado, activo, creado_en.

**`invitaciones`** — id, testigo (único), tipo (`iglesia` | `usuario` | `recuperacion`),
iglesia_id (vacío en las de tipo iglesia), rol, datos propuestos, creada_por, creada_en,
caduca_en, usada_en, usada_por.

**`ediciones`** — id, iglesia_id, año, fecha del evento, estado (`borrador` | `abierta` |
`cerrada`), creada_en. Único: (iglesia_id, año).

**`participantes`** — id, iglesia_id, nombre, fecha_nacimiento, sexo (`m` | `f`), activo,
creado_en, actualizado_en. Índice por (iglesia_id, nombre normalizado).

**`pruebas`** — id, clave (`maraton`, `relevos`, `peso`, `altura`, `longitud`, `carreras`),
nombre, icono, papel (`comun` = maratón y relevos | `electiva`), va_por_sexo (sí/no),
medida (`ninguna` | `tiempo` | `distancia` | `altura`), unidad (`s`, `m`), sentido
(`menor_mejor` | `mayor_mejor`), orden. **Catálogo global**, no por iglesia.

**`inscripciones`** — id, edicion_id, participante_id, prueba_id, creada_en, creada_por.
Único: (edicion_id, participante_id, prueba_id).

**`celebraciones`** — id, edicion_id, prueba_id, categoria, sexo (`''` si la prueba es mixta),
hecha, marcada_en, marcada_por. Único: (edicion_id, prueba_id, categoria, sexo).

**`hechos`** — id, inscripcion_id, hecha, marcada_en, marcada_por. Único: (inscripcion_id).

**`resultados`** — id, inscripcion_id, valor, unidad, registrado_en, registrado_por.
Único: (inscripcion_id). *(Depende de §11.)*

**`mediciones`** — id, iglesia_id, participante_id, prueba_id, fecha, valor, unidad, nota,
registrado_en, registrado_por. Índice por (participante_id, prueba_id, fecha).

**`registro`** — id, iglesia_id, usuario_id, accion, entidad, entidad_id, datos, momento.
Quién hizo qué y cuándo: marcar, desmarcar, altas, bajas, cambios de categoría.

### Decisiones de modelado y por qué

- **Fecha de nacimiento, no edad**: los niños repiten año tras año y algunos cambian; guardar la
  edad dejaría los datos viejos mal para siempre.
- **La categoría no se guarda**: se calcula desde la fecha de nacimiento y el año de la edición.
  Una sola fuente de verdad.
- **Las pruebas son datos, no código**: el catálogo dice cuáles son mixtas y cuáles se desdoblan,
  y si tienen medida. Añadir una prueba es añadir una fila.
- **Una medición de entrenamiento es una fila** (participante, prueba, fecha, valor). No hay
  tabla de "sesión": la pantalla agrupa por fecha. Menos tablas, misma utilidad.
- **Hecho y resultado son cosas distintas**: "hecho" es la palomita del día; el resultado es el
  tiempo o la distancia. Un participante puede estar hecho sin marca anotada.
- **Cambios de estado con registro aparte**: las tablas guardan el último estado y `registro`
  guarda la historia. Así las consultas del día son rápidas y sigue habiendo rastro.

## 8. Requisitos no funcionales

- **Móvil primero**: páginas servidas ya montadas desde el servidor, poco JavaScript, botones
  grandes, buen contraste, sin depender de conexión rápida.
- **Muchas manos a la vez**: pensado para decenas de usuarios simultáneos el día del evento, con
  escrituras concurrentes sin bloqueos.
- **Actualización**: las pantallas se refrescan solas cada 3–5 segundos; el marcado es optimista
  y se reintenta si falla.
- **Seguridad**: HTTPS obligatorio, sesiones en cookie segura, freno a intentos de login
  repetidos, y la base de datos cerrada al exterior (solo se habla con ella desde el servidor).
- **Copias de seguridad**: copia diaria de la base de datos y copia extra antes de cada evento.
- **Aislamiento**: probado automáticamente en cada apartado (ver regla de oro nº 1).
- **Despliegue**: servidor Node escuchando solo en local, publicado con HTTPS por Caddy en este
  servidor. Arranque automático y sin depender de que nadie se acuerde.
- **Idioma**: castellano en toda la interfaz.

## 9. Cómo se construye (fases)

| Fase | Contenido | Estado |
|---|---|---|
| 0 | Esta especificación y el modelo de datos | **en revisión** |
| 1 | Cimientos: proyecto, base de datos y migraciones, login, iglesias, papeles, aislamiento, pruebas automáticas y verificación en cada PR | pendiente |
| 2 | Participantes (fecha de nacimiento, categorías), ediciones | pendiente |
| 3 | Inscripciones, pruebas del día, marcas, filtros, regla de la cascada | pendiente |
| 4 | Entrenamientos y evolución de marcas | pendiente |
| 5 | Histórico, resultados y clasificaciones por año | pendiente |

Cada fase entra como una o varias **PR** pequeñas, con su spec ya aprobada, y no se empieza una
fase sin cerrar la anterior.

## 10. Lo que NO se hace

- Registro abierto de iglesias o de usuarios.
- Envío de correos de cualquier tipo.
- Aplicación móvil nativa.
- Registro de tiempos por vuelta, dorsales, cronometraje electrónico o gestión de pagos.
- Varias iglesias compartiendo una misma competición (cada iglesia va por su cuenta).
- Cuentas de usuario en varias iglesias.

## 11. Pendiente de decidir

1. **Resultados en competición**: ¿anotamos tiempo/distancia además de la palomita de "hecho",
   para poder hacer clasificaciones y mejores marcas? (Sección 6.6.)
2. **Relevos**: los relevos son por equipos. ¿Hay que guardar **quién va con quién** y el
   resultado del equipo, o basta con que cada niño tenga los relevos como hechos? Si hay que
   guardar equipos, hace falta una tabla más (`equipos` y sus miembros).
3. **Borrado de datos**: cuando un participante deja de ir, ¿se da de baja (conservando el
   histórico) o se borra del todo, con sus mediciones? ¿Y una edición entera, se puede borrar?

## 12. Registro de decisiones

| Fecha | Decisión |
|---|---|
| 2026-10-04 | Stack: **Astro** (modo servidor) + **shadcn/ui** + Tailwind para la interfaz |
| 2026-10-04 | Base de datos: **PostgreSQL** en este servidor (soporta varias iglesias, años de datos y escrituras simultáneas) |
| 2026-10-04 | Capa de datos: **Drizzle** (esquema, migraciones y consultas con tipos) |
| 2026-10-04 | Login: **Better Auth**, sin correo; invitaciones y recuperación por enlace de un solo uso |
| 2026-10-04 | Cada iglesia se crea **solo por invitación** del administrador de la plataforma |
| 2026-10-04 | **Un usuario pertenece a una sola iglesia** |
| 2026-10-04 | Categoría por **año natural**: año de la edición − año de nacimiento |
| 2026-10-04 | **Sin correo electrónico** en ninguna parte del sistema |
| 2026-10-04 | Tres papeles: plataforma, administrador de iglesia y voluntario |
| 2026-10-04 | Guardar **fecha de nacimiento** (no edad); los niños repiten y cambian entre años |
| 2026-10-04 | Se guardan los resultados de cada año para poder consultarlos después |
| 2026-10-04 | La web vive en este servidor; los usuarios entran desde el móvil |
