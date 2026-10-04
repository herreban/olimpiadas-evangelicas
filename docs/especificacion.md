# Especificación — Olimpiadas Evangélicas

**Estado:** fase 0 aprobada en lo esencial. Pendientes solo los valores de la ficha de las
pruebas y dos detalles de los equipos (§11). Nada de código de la fase 1 hasta el adelante.
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
| **Prueba común** | La **maratón**: la hacen todos los participantes. |
| **Prueba específica** | Peso, altura, longitud y carreras lisas: cada participante elige una. |
| **Plaza** | El hueco de una iglesia en una prueba específica, para una categoría y sexo. **Una por iglesia, categoría, sexo y prueba.** |
| **Relevos** | Prueba por equipos de 4. Solo participa quien está en un equipo. |
| **Ficha de la prueba** | Los datos de cada prueba por categoría: peso de la bola, distancia de la maratón, edad mínima… |
| **Inscripción** | Un participante, en una edición, apuntado a una prueba. |
| **Celebración** | Una prueba que ya se ha disputado, en una categoría y sexo concretos. |
| **Hecho** | Una prueba concreta de un participante concreto que ya está hecha. |
| **Equipo** | Grupo de 4 participantes del mismo sexo que corren juntos el relevo. **Uno por iglesia, categoría y sexo.** |
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
| Editar la ficha de las pruebas | ✅ | — | — |
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
7. **Una plaza por iglesia, categoría, sexo y prueba específica.** Cada iglesia lleva **un solo
   participante** a cada prueba específica en cada categoría y sexo.

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

### 6.4 Pruebas, plazas e inscripciones
- Catálogo general: **maratón** (mixta) la hacen **todos**; **peso**, **altura**, **longitud** y
  **carreras lisas** son las específicas, de las que cada participante hace **una**; **relevos**
  solo lo corre quien entra en un equipo.
- Cada prueba declara si va **mixta o desdoblada por sexo**, si tiene medida (tiempo, distancia,
  altura) o no, y su ficha (ver 6.5).
- **Una plaza por iglesia, categoría, sexo y prueba específica.** Ejemplo: si un niño de 4 años
  de la iglesia X se apunta a lanzamiento de peso, **ningún otro** niño de 4 o 5 años de esa
  iglesia puede apuntarse a peso. Al intentarlo, la aplicación avisa con claridad: "la plaza de
  peso en 4–5 ♂ la tiene Adrián" y ofrece cambiar la prueba o quitar la inscripción anterior.
- Es una **regla de la base de datos**, no solo de la pantalla: así no se puede colar por
  descuido ni desde dos móviles a la vez.
- Las inscripciones de **maratón** y de la **específica** se crean al apuntar al participante.
  La de **relevos** la gestiona la aplicación sola: aparece al entrar en un equipo y desaparece
  al salir (avisando de que se pierde la marca de relevos de ese niño).
- Inscribir se puede hacer de uno en uno o por tandas (para meter la lista de una iglesia de
  golpe).
- Un participante cuya categoría quede fuera de 4–17 no se puede inscribir.

### 6.5 La ficha de cada prueba
Cada prueba lleva sus datos, que **cambian según la categoría**:

- **Lanzamiento de peso**: el peso de la bola para cada categoría.
- **Maratón**: la distancia a recorrer en cada categoría.
- **Altura**: tiene **edad mínima** (desde 8 años): en las categorías 4–5 y 6–7 no se ofrece.
- En general, cada prueba puede declarar su **edad mínima** y sus datos por categoría
  (por ejemplo, en carreras lisas la distancia de cada categoría).

Para qué sirve:
- Al inscribir: si un niño no llega a la edad mínima, la prueba no se le ofrece.
- El día del evento: los voluntarios y los jueces ven de un vistazo "peso: 2 kg" o "maratón:
  800 m" en la categoría que están atendiendo.
- En los entrenamientos: las marcas se anotan sabiendo con qué peso o distancia se entrena.

Los valores los carga el administrador de la plataforma (Esteban) y los ven todas las iglesias.

### 6.6 Relevos por equipos
- Los relevos se corren en **equipos de 4** participantes, y **no son obligatorios**: muchas
  veces no se pueden juntar cuatro, así que solo participa quien está en un equipo.
- Un equipo es **de un solo sexo**, pero **puede mezclar edades**: se admiten miembros de
  categorías distintas.
- El equipo **compite en la categoría del miembro de más edad**. Esa categoría **se calcula**
  desde los miembros: no se guarda, y si cambia la composición cambia sola.
- **Un solo equipo por iglesia, categoría y sexo.** Como el equipo compite en la categoría del
  miembro de más edad, no puede haber dos equipos de la misma iglesia compitiendo en la misma
  categoría y sexo. Si al cambiar los miembros se chocara con otro equipo, la aplicación avisa.
- Un equipo pertenece a una edición y puede llevar un nombre corto para reconocerlo ("Los
  Tigres"); el nombre es **opcional**: si no se pone, se muestra por su categoría y sexo
  ("Equipo de 10–11 ♂").
- Un participante puede estar en **un solo equipo** por edición. Como solo hay un equipo por
  categoría y sexo, esto también significa que **en relevos compite un solo equipo por edad y
  sexo**.
- La pantalla de equipos permite crear un equipo, añadir y quitar miembros, y ver de un vistazo
  **qué participantes no están todavía en ningún equipo**, que es la lista que hace falta para
  formar los equipos el día del evento.
- **A los participantes que no están en un equipo no les aparece la prueba de relevos** en su
  ficha ni en el listado del día: ni para marcar ni para nada.
- El hecho de haber corrido los relevos se marca **por participante**, como el resto de pruebas.

### 6.7 El día del evento: marcar pruebas
- Dos niveles, como ya funcionaba:
  - **Celebración**: "esta prueba (categoría, sexo) ya se ha disputado".
  - **Hecho**: "este participante ya ha hecho esta prueba".
- **Regla de la cascada**: al marcar una celebración, se dan por hechos todos los participantes
  que hacen esa prueba en esa categoría y sexo. La maratón es mixta: marca a los dos sexos. En
  relevos, solo a los que están en equipos de esa categoría y sexo.
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

### 6.8 Entrenamientos y marcas
Esta es la parte que se usa durante todo el año y la que guarda el valor de verdad del proyecto.
- Anotar mediciones: participante, prueba, **fecha** y **valor**, con una nota opcional.
- Se puede apuntar una sesión completa del tirón: varios niños y varias pruebas del mismo día.
- Al anotar se tiene a mano la ficha de la prueba (peso de la bola, distancia) de la categoría.
- Pantalla de evolución por participante: su historial de marcas y su **mejor marca** por prueba.
- La mejor marca se calcula según la prueba: en tiempo gana el menor; en distancia y altura, el
  mayor.
- Comparación entre participantes dentro de una categoría y prueba (por ejemplo, el progreso de
  la categoría 8–9 en longitud), y aviso de **marca personal superada** cuando alguien mejora
  una marca suya anterior.

### 6.9 Histórico
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
nombre, icono, clase (`comun` = maratón | `especifica` | `equipos` = relevos), va_por_sexo
(sí/no), medida (`ninguna` | `tiempo` | `distancia` | `altura`), unidad (`s`, `m`), sentido
(`menor_mejor` | `mayor_mejor`), **edad_minima** (vacío si no tiene), orden.
**Catálogo global**, no por iglesia.

**`prueba_parametros`** — id, prueba_id, categoria, parametro (`peso_bola`, `distancia`,
`edad_minima`…), valor, unidad, nota. Único: (prueba_id, categoria, parametro). Es la **ficha de
la prueba**: el peso de la bola en 8–9, la distancia de la maratón en 10–11, etc.

**`inscripciones`** — id, edicion_id, participante_id, prueba_id, **categoria** y **sexo** de la
plaza (rellenos solo en las específicas, para poder exigir la plaza única), plaza (marca de
ocupación), creada_en, creada_por. Único: (edicion_id, participante_id, prueba_id) y, en las
específicas, único (edicion_id, prueba_id, categoria, sexo).

**`equipos`** — id, edicion_id, sexo, nombre (opcional), **categoria** (la del miembro de más
edad, que la aplicación mantiene al día al cambiar los miembros), creado_en, creado_por.
Único: (edicion_id, sexo, categoria), porque solo hay un equipo por categoría y sexo.

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
- **La categoría de un equipo se calcula y se guarda copiada**: como los equipos pueden mezclar
  edades, la categoría es la del miembro de más edad. La guarda la aplicación (nunca el usuario)
  porque hace falta para exigir en la base de datos que no haya dos equipos de la misma iglesia
  en la misma categoría y sexo; se recalcula sola cada vez que cambia un miembro.
- **La plaza única se protege en la base de datos**: para poder exigirla, la inscripción guarda
  la categoría y el sexo de la plaza (son datos calculados que se copian al crearla, y solo en
  las pruebas específicas). Es la excepción razonable a "no guardar lo que se calcula": sin eso,
  la regla no se puede garantizar y se colaría desde dos móviles a la vez.
- **Las pruebas son datos, no código**, y su ficha también (`prueba_parametros`): el peso de la
  bola, la distancia de la maratón y las edades mínimas se cambian editando datos, no programa.
- **Los relevos dependen del equipo**: la inscripción de relevos la crea y la quita la
  aplicación al entrar y salir de un equipo. Así a nadie le aparece una prueba que no va a
  correr, y la regla de la cascada solo afecta a quien corre.
- **No hay tabla de resultados de competición**: el día del evento solo se marca hecho/no hecho.
  Todas las marcas viven en `mediciones`, que es donde de verdad se usan, durante todo el año.
- **Una medición de entrenamiento es una fila** (participante, prueba, fecha, valor). No hay
  tabla de "sesión": la pantalla agrupa por fecha. Menos tablas, misma utilidad.
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
| 0 | Esta especificación y el modelo de datos | **cerrada en lo esencial** |
| 1 | Cimientos: proyecto, base de datos y migraciones, login, iglesias, papeles, aislamiento, pruebas automáticas y verificación en cada PR | pendiente |
| 2 | Participantes (fecha de nacimiento, categorías), ediciones y catálogo de pruebas con su ficha | pendiente |
| 3 | Plazas e inscripciones, equipos de relevos, pruebas del día, filtros y regla de la cascada | pendiente |
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
- Segunda plaza por iglesia en una misma prueba, categoría y sexo.
- Más de un equipo por iglesia, categoría y sexo.
- Relevos para quien no esté en un equipo de cuatro.
- Aplicación móvil nativa.
- Cronometraje electrónico, dorsales, pagos ni inscripciones de pago.
- Varias iglesias compartiendo una misma competición (cada iglesia va por su cuenta).
- Cuentas de usuario en varias iglesias.

## 11. Detalles pendientes de confirmar

1. **Los valores de la ficha de las pruebas**: el peso de la bola por categoría, la distancia de
   la maratón por categoría y las edades mínimas de cada prueba (por ahora, la altura desde 8
   años). Se cargan desde la pantalla de administración de la plataforma, sin tocar programa.

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
| 2026-10-04 | **Una plaza por iglesia, categoría, sexo y prueba específica** (la maratón la hacen todos) |
| 2026-10-04 | **Los relevos no son obligatorios**: solo participa quien entra en un equipo, y la inscripción la gestiona la aplicación según el equipo |
| 2026-10-04 | Cada prueba lleva una **ficha con datos por categoría** (peso de la bola, distancia de la maratón) y su **edad mínima**; la altura empieza en 8 años |
| 2026-10-04 | Confirmado: **la plaza es por sexo**, una por categoría y sexo |
| 2026-10-04 | **Un solo equipo por iglesia, categoría y sexo**, y un participante en un solo equipo: en relevos compite un equipo por edad y sexo |
| 2026-10-04 | El **nombre del equipo es opcional**: si no se pone, se muestra por su categoría y sexo |
