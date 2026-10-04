# Especificación — Olimpiadas Evangélicas

**Estado:** borrador para revisión (fase 0). Nada de código hasta que Esteban apruebe este documento.
**Fecha:** 4 de octubre de 2026

---

## 1. Qué es

Una aplicación web para que **varias iglesias** gestionen por su cuenta las olimpiadas de sus
niños y niñas y el **seguimiento de los entrenamientos** durante el año.

Cada iglesia entra con su propia cuenta, ve **solo sus datos** y no puede ver ni tocar los de
ninguna otra.

El uso principal, durante todo el año, son los **entrenamientos**: ir anotando las marcas que
alcanzan los niños y ver cómo progresan. El día del evento, la aplicación sirve para apuntar a
los que participan y para ir marcando las pruebas que se celebran, desde el móvil y con varias
personas a la vez.

## 2. Palabras del proyecto

| Palabra | Qué significa |
|---|---|
| **Iglesia** | Cada entidad que usa la aplicación. Agrupa participantes y usuarios. |
| **Usuario** | Persona con cuenta. Pertenece a **una sola** iglesia. |
| **Invitación** | Enlace de un solo uso para crear una iglesia o dar de alta a un usuario. |
| **Participante** | Niño o niña que compite y entrena. Guardamos su fecha de nacimiento, no su edad. |
| **Edición** | Las olimpiadas de un año concreto dentro de una iglesia (2026, 2027…). |
| **Categoría** | Par de edades (4–5, 6–7 … 16–17). **Se calcula**, no se guarda. |
| **Prueba** | Cada deporte: maratón, relevos, peso, altura, longitud, carreras lisas. |
| **Prueba común** | Maratón y relevos: las hacen todos los participantes. |
| **Prueba específica** | Peso, altura, longitud y carreras lisas: cada participante elige una. |
| **Inscripción** | Un participante, en una edición, apuntado a una prueba. |
| **Celebración** | Una prueba que ya se ha disputado, en una categoría y sexo concretos. |
| **Hecho** | Una prueba concreta de un participante concreto que ya está hecha. |
| **Equipo** | Grupo de 4 participantes del mismo sexo que corren juntos el relevo. |
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
| Formar los equipos de relevos | — | ✅ | ✅ |
| Marcar pruebas celebradas y hechas | — | ✅ | ✅ |
| Anotar marcas de entrenamiento | — | ✅ | ✅ |
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
4. **Datos de menores.** Acceso solo con login, nada en abierto y HTTPS obligatorio.
5. **No se borra nada.** Un participante que deja de venir se da de baja: sale de los listados
   de trabajo, pero conserva su historial y sus marcas. Las ediciones no se borran, se cierran.
   Si alguna vez hubiera que eliminar los datos de un niño a petición de su familia, se haría
   a mano.
6. **Un usuario, una iglesia.** Si alguien ayuda en dos iglesias, tiene dos cuentas.

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
- Editar datos y corregir el sexo de un toque desde el listado.
- **Baja, nunca borrado**: el participante deja de aparecer en los listados de trabajo, pero su
  historial de años anteriores y sus marcas de entrenamiento se conservan. Se puede reactivar.

### 6.3 Ediciones
- Crear la edición de un año (fecha del evento, nombre). Una por iglesia y año.
- Estados: borrador (se prepara), abierta (día del evento), cerrada (solo consulta).
- Cambiar de edición para consultar años anteriores.
- Una edición **no se borra**; se cierra.

### 6.4 Pruebas e inscripciones
- Catálogo general: **maratón** (mixta) y **relevos** son las pruebas comunes; **peso**,
  **altura**, **longitud** y **carreras lisas** son las específicas, de las que cada
  participante elige una.
- Cada prueba declara si va **mixta o desdoblada por sexo**, y si tiene medida (tiempo,
  distancia, altura) o no. La medida se usa para las **marcas de entrenamiento**.
- Todo participante inscrito hace **tres pruebas**: maratón, relevos y **una** de las cuatro
  específicas. Se puede cambiar la elegida sin perder lo ya marcado de las otras dos.
- **Una plaza por categoría y prueba específica** *(pendiente de confirmar, ver §11)*: en cada
  categoría, sexo y prueba específica solo habría un participante por iglesia.
- Inscribir se puede hacer de uno en uno o por tandas (para meter la lista de una iglesia de
  golpe).

### 6.5 Relevos por equipos
- Los relevos se corren en **equipos de 4** participantes.
- Un equipo es **de un solo sexo**, pero **puede mezclar edades**: se admiten miembros de
  categorías distintas.
- El equipo **compite en la categoría del miembro de más edad**. Esa categoría **se calcula**
  desde los miembros: no se guarda, y si cambia la composición cambia sola.
- Un equipo pertenece a una edición y lleva un nombre corto para reconocerlo ("Los Tigres").
- Un participante puede estar en **un solo equipo** por edición.
- La pantalla de equipos permite crear un equipo, añadir y quitar miembros, y ver de un vistazo
  **quién está inscrito en relevos y todavía no tiene equipo**, que es la lista que interesa
  tener a mano el día del evento.
- El hecho de haber corrido los relevos se sigue marcando **por participante**, como el resto de
  pruebas: el equipo es la organización (quién corre con quién), no otra casilla que marcar.

### 6.6 El día del evento: marcar pruebas
- Dos niveles, como ya funcionaba:
  - **Celebración**: "esta prueba (categoría, sexo) ya se ha disputado".
  - **Hecho**: "este participante ya ha hecho esta prueba".
- **Regla de la cascada**: al marcar una celebración, se dan por hechos todos los participantes
  que hacen esa prueba en esa categoría y sexo. La maratón es mixta: marca a los dos sexos.
- **Desmarcar una celebración NO desmarca a los participantes**: así no se borra trabajo hecho
  a mano.
- Queda registrado **quién** marca y desmarca, y **a qué hora**.
- **En el día de la competición no se anotan marcas**: solo si está hecho o no. Los tiempos y
  las distancias se anotan en los entrenamientos.
- Listado con filtros: por prueba (se pueden marcar varias), por categoría (una) y por sexo
  (♂, ♀, las dos o ninguna = todos), más orden (nombre, edad, pendientes).
- Contador visible de cuántas pruebas se llevan celebradas del total.
- Las pantallas de varias personas se ven iguales solas, sin recargar (sondeo cada pocos
  segundos), y el marcado se pinta al instante aunque la cobertura vaya mal, reintentando si
  falla.

### 6.7 Entrenamientos y marcas
Esta es la parte que se usa durante todo el año y la que guarda el valor de verdad del proyecto.
- Anotar mediciones: participante, prueba, **fecha** y **valor**, con una nota opcional.
- Se puede apuntar una sesión completa del tirón: varios niños y varias pruebas del mismo día.
- Pantalla de evolución por participante: su historial de marcas y su **mejor marca** por prueba.
- La mejor marca se calcula según la prueba: en tiempo gana el menor; en distancia y altura, el
  mayor.
- Comparación entre participantes dentro de una categoría y prueba (por ejemplo, el progreso de
  la categoría 8–9 en longitud), y aviso de **marca personal superada** cuando alguien mejora
  una marca suya anterior.

### 6.8 Histórico
- Consultar ediciones anteriores: participantes y pruebas celebradas y hechas de cada año.
- Las marcas de entrenamiento acompañan a cada participante a lo largo de los años, aunque suba
  de categoría: se sigue por su ficha, no por la categoría del año.

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
nombre, icono, clase (`comun` | `especifica`), va_por_sexo (sí/no), medida (`ninguna` | `tiempo`
| `distancia` | `altura`), unidad (`s`, `m`), sentido (`menor_mejor` | `mayor_mejor`), orden.
**Catálogo global**, no por iglesia.

**`inscripciones`** — id, edicion_id, participante_id, prueba_id, creada_en, creada_por.
Único: (edicion_id, participante_id, prueba_id).

**`equipos`** — id, edicion_id, sexo, nombre, creado_en, creado_por. **Sin categoría**: se
calcula como la del miembro de más edad.

**`equipo_miembros`** — id, equipo_id, participante_id, edicion_id. Único: (equipo_id,
participante_id) y además (edicion_id, participante_id), para que nadie esté en dos equipos de
la misma edición.

**`celebraciones`** — id, edicion_id, prueba_id, categoria, sexo (`''` si la prueba es mixta),
hecha, marcada_en, marcada_por. Único: (edicion_id, prueba_id, categoria, sexo).

**`hechos`** — id, inscripcion_id, hecha, marcada_en, marcada_por. Único: (inscripcion_id).

**`mediciones`** — id, iglesia_id, participante_id, prueba_id, fecha, valor, unidad, nota,
registrado_en, registrado_por. Índice por (participante_id, prueba_id, fecha).

**`registro`** — id, iglesia_id, usuario_id, accion, entidad, entidad_id, datos, momento.
Quién hizo qué y cuándo: marcar, desmarcar, altas, bajas, cambios de equipo.

### Decisiones de modelado y por qué

- **Fecha de nacimiento, no edad**: los niños repiten año tras año y algunos cambian; guardar la
  edad dejaría los datos viejos mal para siempre.
- **La categoría no se guarda**: se calcula desde la fecha de nacimiento y el año de la edición.
  Una sola fuente de verdad.
- **La categoría de un equipo tampoco se guarda**: como los equipos pueden mezclar edades, la
  categoría es la del miembro de más edad y se calcula. Si se guardara, habría que acordarse de
  actualizarla cada vez que cambia un miembro.
- **Las pruebas son datos, no código**: el catálogo dice cuáles son comunes y cuáles específicas,
  cuáles son mixtas y cuáles se desdoblan, y cuáles tienen medida. Añadir una prueba es añadir
  una fila.
- **No hay tabla de resultados de competición**: el día del evento solo se marca hecho/no hecho.
  Todas las marcas viven en `mediciones`, que es donde de verdad se usan, durante todo el año.
- **Una medición de entrenamiento es una fila** (participante, prueba, fecha, valor). No hay
  tabla de "sesión": la pantalla agrupa por fecha. Menos tablas, misma utilidad.
- **Los equipos son organización, no marcado**: el hecho de relevos sigue siendo una casilla por
  participante (y así la regla de la cascada sigue funcionando); el equipo dice quién corre con
  quién.
- **Cambios de estado con registro aparte**: las tablas guardan el último estado y `registro`
  guarda la historia. Así las consultas del día son rápidas y sigue habiendo rastro.
- **Sin borrados**: la baja es un campo (`activo`), no una eliminación. Evita perder historial
  por un clic de más.

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
| 3 | Inscripciones, equipos de relevos, pruebas del día, filtros y regla de la cascada | pendiente |
| 4 | Entrenamientos: anotar marcas, evolución y mejores marcas | pendiente |
| 5 | Histórico por años y consultas | pendiente |

Cada fase entra como una o varias **PR** pequeñas, con su spec ya aprobada, y no se empieza una
fase sin cerrar la anterior.

## 10. Lo que NO se hace

- Registro abierto de iglesias o de usuarios.
- Envío de correos de cualquier tipo.
- Anotar tiempos o distancias el día de la competición (las marcas se anotan en los
  entrenamientos).
- Borrar participantes o ediciones (solo bajas y cierres).
- Aplicación móvil nativa.
- Cronometraje electrónico, dorsales, pagos ni inscripciones de pago.
- Varias iglesias compartiendo una misma competición (cada iglesia va por su cuenta).
- Cuentas de usuario en varias iglesias.

## 11. Detalles pendientes de confirmar

1. **"Un participante por edad y prueba específica"**: si significa que en cada categoría, sexo y
   prueba específica solo hay **una plaza** por iglesia (y, en relevos, un solo equipo por
   categoría), o si se refiere a que cada niño va a **una sola** prueba específica y a un solo
   equipo, que es como ya está definido.
2. **Equipos por categoría y sexo**: ¿puede haber varios equipos que compitan en la misma
   categoría y sexo, o solo uno?
3. ¿El nombre del equipo es obligatorio u opcional?

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
| 2026-10-04 | Se conserva el **histórico de cada año** (participantes, pruebas y entrenamientos) |
| 2026-10-04 | La web vive en este servidor; los usuarios entran desde el móvil |
| 2026-10-04 | **Las marcas se anotan en los entrenamientos**, que es el uso principal; el día de la competición solo se marca hecho/no hecho |
| 2026-10-04 | **Relevos por equipos de 4** |
| 2026-10-04 | **Un participante, un solo equipo** por edición |
| 2026-10-04 | Los equipos son **de un solo sexo pero pueden mezclar edades**, y compiten en la **categoría del miembro de más edad** (calculada) |
| 2026-10-04 | **No se borra nada**: bajas con historial y ediciones que se cierran |
