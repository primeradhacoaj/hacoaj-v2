@AGENTS.md

# CLAUDE.md — Hacoaj v2

## Qué es este proyecto

Reescritura de la aplicación web del plantel de Primera D de Hacoaj. La versión actual (v1) funciona en producción con Flask + Google Sheets + PythonAnywhere y vive en `C:\Users\Saroka\Downloads\Primera D` (repo `primeradhacoaj/hacoaj`). Ese proyecto **no se toca** desde acá: es la referencia funcional y sigue en producción hasta decidir cuál versión se usa.

Esta v2 (`primeradhacoaj/hacoaj-v2`) migra y mejora la app con tecnologías modernas.

## Objetivos (doble)

1. Que el proyecto cumpla lo que pide la materia de programación web (React/Next.js, Supabase con SQL y RLS, autenticación, API interna, despliegue con CI/CD en Vercel, etc.).
2. Mejorar de verdad la aplicación de Hacoaj.

### Criterio de decisión

- Si algo sirve a **ambos** objetivos → aplicarlo sin preguntar.
- Si algo **no lo pide la materia pero mejora MUCHO** la app → preguntar y analizar.
- Si algo **lo exige la materia pero empeora** la app → preguntar y analizar.

No mencionar la materia en nombres, README ni commits del repo (debe verse profesional).

## Stack

- Next.js (App Router, carpeta `src/`) + React
- **JavaScript** (no TypeScript, decidido)
- **CSS común** (no Tailwind). Reutilizar el estilo de la v1: cards, bordes redondeados, sombras suaves, mobile-first, fondo `#f8f9fa`, azul institucional.
- Supabase: base de datos (SQL directo, migraciones y seed), autenticación y RLS
- Vercel para el despliegue, conectado a GitHub (deploy automático y preview por rama/PR)
- Node.js instalado en `C:\Program Files\nodejs`

**Importante:** esta versión de Next.js tiene cambios respecto de lo que conoce el modelo. Antes de escribir código, leer la guía relevante en `node_modules/next/dist/docs/` (ver `AGENTS.md`).

## Diseño (decidido)

**REGLA PRINCIPAL (del usuario): el diseño de cada pantalla debe ser IGUAL o MUY MUY parecido al de la v1.** Antes de armar cualquier pantalla, leer su template original en `C:\Users\Saroka\Downloads\Primera D\templates\` y portarlo fielmente (medidas, colores, tipografías, textos, estados). Solo se corrigen inconsistencias entre pantallas de la v1 (ver abajo), manteniendo lo que se ve en la v1. No reinterpretar ni "mejorar" el diseño sin preguntar. Las pantallas de jugador se evalúan en tamaño celular; las de técnico/admin, en escritorio (pero también usables en celular).

Único desvío aceptado por el usuario: **íconos SVG** en lugar de los emojis del menú del jugador (los pone dentro del mismo recuadro dorado de la v1).

Cómo se resuelven las opciones que todavía no tienen pantalla en v2: se ven igual que en la v1 (activas), y al tocarlas muestran un aviso emergente ("Esta sección se está migrando a la nueva versión"). Las que la v1 ya marcaba como "Pronto" conservan su etiqueta y su aviso original.

La v1 tenía 3 generaciones de diseño mezcladas (44 templates HTML sin herencia, cada uno con su CSS). En v2 hay UN solo sistema:

- **Base: el diseño "A" de la v1** (jugador moderno): encabezado azul con degradé y esquinas redondeadas, cards blancas de radio 18px, sombras suaves.
- **Tomado del diseño "C"** (fuerza/pliegues): semáforo verde/amarillo/rojo para estados, tarjetas de métricas y barras de progreso.
- **Tomado del diseño "B"** (técnico): barra superior fija y layout ancho para escritorio.
- **Tipografía general: Plus Jakarta Sans** (`next/font`, variable `--font-sans`).
- **Dorado solo como acento puntual** (un punto, una letra, un subrayado). No usarlo en fondos grandes ni botones: no representa nada importante. El color principal es el azul navy.
- **EXCEPCIONES decididas por el usuario tras verlas en pantalla (copiar la v1 tal cual):**
  - **Login (`/login`)** = el login original de la v1: panel de marca (escudo, logo del Torneo Promocional Amateur `public/torneo_amateur.png`, "Primera D", píldora dorada) + panel de formulario, dos columnas en escritorio. Ahí el dorado sí se usa como en la v1.
  - **Panel técnico/admin (`/panel`)** = el `tecnico/menu_principal.html` original: barra superior oscura con logo blanco, título en Playfair Display con acento **rosa**, accesos rápidos, tarjetas con íconos de colores. Usa **DM Sans + Playfair Display**, cargadas y con sus variables de color SOLO dentro de `src/app/(tecnico)/` (ver `layout.js` y `layout.module.css`); no se filtran al resto de la app. Sus íconos están en `IconoPanel`.
  - Si se pide algo nuevo para el panel técnico, seguir ese estilo.
  - **Menú del jugador (`/menu`)** = el `usuario/menu.html` original (encabezado con escudo en recuadro, tarjeta del jugador, secciones Evaluaciones físicas / Torneo / Ajustes / Próximamente, cerrar sesión en píldora). Componentes: `Hero`, `PerfilChip`, `SectionLabel`, `MenuItem`, `Aviso` (+ hook `useAviso`).
- Los detalles del panel de la v1 que NO se portaron todavía: estadísticas del encabezado (venían vacías) y la configuración de accesos rápidos por usuario (se guardaba en localStorage).
- Los colores, radios, sombras y anchos están como variables CSS en `src/app/globals.css`. Usar siempre `var(--...)`, nunca colores sueltos.
- Jugador = mobile-first (ancho `--width-jugador`, 480px). Técnico = pensado para escritorio (`--width-tecnico`, 1200px) pero usable en celular.
- Estilos de cada pieza con CSS Modules (`*.module.css`).

## Usuarios y roles (igual que en v1)

- `jugador`: ve sus datos personales, mediciones de fuerza, pliegues, peso, rutinas y comentarios del entrenador.
- `tecnico`: accede a paneles, dashboards, carga de datos y gestión del plantel.
- `administrador`: lo mismo que técnico, más editar/eliminar jugadores, cargar partidos y acceder a Analytics.

Los roles se resolverán con Supabase Auth + políticas RLS y protección de rutas del lado servidor.

## Cómo se mapea v1 → v2

| v1 | v2 |
|---|---|
| Flask (rutas y APIs) | Next.js: páginas y Route Handlers |
| Flask-Login | Supabase Auth |
| Google Sheets como base | Tablas de Supabase (Postgres) |
| SQLite `analytics.db` (visitas) | Tabla en Supabase |
| SQLite `primera_d.db` (scraper) | Tablas en Supabase |
| PythonAnywhere (`git pull` manual) | Vercel (deploy automático) |
| Templates HTML + JS vanilla | Componentes React |
| Service worker / PWA / push | Se evalúa más adelante |

### Sheets de v1 que pasan a tablas (a modelar en Supabase)

Usuarios, Fuerza Sentadilla, Fuerza Pecho, Pliegues, Pesos, Accesos, Partidos, Partidos-jugador, Posiciones, Goleadores, Fixture, más las tablas del scraper (equipos, jugadores, partidos, goles, cambios, tarjetas, apariciones). El detalle de columnas está en el `CLAUDE.md` de v1. Antes de modelar, revisar allá los nombres exactos y decidir mejoras (por ejemplo, claves foráneas reales en vez de cruzar por nombre).

## Reglas de dominio a conservar (vienen de v1)

- Comentario del entrenador: título `Comentario del Chano`. Si está vacío: `No se agregó ningún comentario`. Nunca mostrar errores técnicos por eso.
- Fuerza: press de pecho y sentadilla. Métricas: VMP (velocidad media propulsiva), carga, RM estimado, fuerza relativa (= RM estimado / peso corporal). Objetivos: pecho 1.3, sentadilla 1.8 a 2.0. Si hay barra de progreso, el texto y la lógica deben coincidir con estos objetivos. Mostrar delta contra el test anterior.
- Pliegues: peso, peso ideal, sumatoria de 6 pliegues, talla, IMC. Referencia de la sumatoria: menos de 50 mm bueno, 50 a 60 regular, más de 60 alto. No duplicar métricas en la UI.
- Rutinas: acceso directo debajo de `Comentario del Chano`, con los PDFs PLAN POTENCIA TREN INFERIOR, PLAN HIPERTROFIA y PLAN AEROBICO (ver o descargar).
- Datos vacíos: mostrar mensajes claros; no romper la pantalla ni convertir valores vacíos directo a número.
- Formaciones de partido: definirlas en **un solo lugar** compartido (en v1 estaba duplicado en 3 archivos y era una fuente de errores).
- Analytics de visitas: solo para `administrador`.

## Capa de datos y backend

- Las pantallas NO leen datos directo: llaman a funciones de `src/lib/data/` (ej. `iniciarSesion`). Hoy devuelven datos de prueba; con Supabase se cambia solo el interior de cada función.
- El backend de la v2 vive en el mismo proyecto Next.js: Route Handlers (`src/app/api/**/route.js`) y código de servidor. Todavía no hay ninguno (no existe un `app.py`).
- **Contraseñas:** en la v1 están en texto plano en la hoja Usuarios y el panel admin las muestra. En v2 se usa Supabase Auth (contraseñas cifradas); el admin pasa a tener "restablecer contraseña" en vez de verlas. Pendiente de hablar con el usuario al llegar a Auth.

## Reglas de trabajo

- Trabajar de a un paso por vez. La app actual funciona perfecto; esta migración es aparte y no debe romper nada de v1.
- Migrar pantallas una por una, de la más simple a la más compleja.
- Antes de crear una ruta o componente nuevo, verificar si ya existe uno similar.
- CSS y JS reutilizable en componentes o módulos compartidos, no copiado en cada página.
- Cuando se agregue una funcionalidad o se tome una decisión relevante, actualizar este archivo.
- **No hacer commit ni push sin que el usuario lo confirme**, salvo que diga explícitamente algo como "guardá los cambios en GitHub".

## Seguridad

- **El repo `hacoaj-v2` es PRIVADO** (confirmado por el usuario). Por eso los PDF del club (`public/rutinas/`: pautas nutricionales, suplementación y, más adelante, los planes de rutinas) se guardan en el repo. **Si el repo pasa a público, el usuario avisa** y hay que decidir cómo servir esos documentos (por ejemplo, Supabase Storage con acceso restringido) y sacarlos del repo.

Nunca subir al repo (ver `README.md` y `.gitignore`):

- Cualquier `.env*`, claves privadas `*.pem`, `service_account.json`.
- La `service_role key` de Supabase (solo en variables de entorno de servidor; jamás con prefijo `NEXT_PUBLIC_`).
- Tokens de terceros, contraseñas y datos personales reales de jugadores. Usar datos ficticios en ejemplos y seeds.

Pendiente aparte, en el repo viejo: `vapid_private.pem` está versionado en su historial (clave push expuesta). No copiarlo a este repo; considerar regenerar las claves.

## Forma de responder

- Explicar simple y directo, como si el usuario estuviera aprendiendo. Sin jerga innecesaria.
- Cuando haya varias opciones, recomendar una.
- Si hay riesgo de romper algo, avisar antes.
- Al pedir cambios de código: indicar qué archivos se tocan y dónde va cada bloque.
- Español rioplatense.

## Estado actual

- [x] Repo creado y proyecto Next.js base (App Router, JS, CSS común)
- [x] Cuenta de Vercel creada y vinculada a GitHub
- [x] Primer commit/push y primer deploy en Vercel (producción: `hacoaj-v2.vercel.app`, rama `main`, deploy automático en cada push)
- [x] Paso 1 de React: tokens de diseño en `globals.css`, tipografía única, layout raíz y pantalla de inicio propia
- [x] Paso 2: componentes reutilizables en `src/components/` (Card, Badge, Button, PageHeader, EmptyState, CommentBox) + helper `src/lib/cx.js`. Página temporal `/componentes` para revisarlos (borrar cuando ya no haga falta).
- [x] Paso 3: login (`/login`), solo pantalla con estado y validación; usuarios de PRUEBA en `src/lib/data/usuarios.js` (jugador/tecnico/admin, contraseña `demo`). Componentes nuevos: `Hero`, `TextField`. Al iniciar sesión hoy solo muestra un aviso: falta el menú (paso 4).
- [x] Paso 4: menú principal por rol. Sesión SIMULADA (`SesionProvider`/`useSesion`, guardada en localStorage, provisoria hasta Supabase Auth). `Guardia` protege los grupos de rutas `(jugador)` → `/menu` y `(tecnico)` → `/panel` (técnico y admin; "Cargar partido" y "Analytics" solo admin). Menús definidos como datos en `src/lib/menus.js`. Íconos SVG propios en `Icono`. Todas las opciones figuran "Próximamente" hasta construir cada pantalla ("Lesiones" no existe todavía en la v1 tampoco).
- [x] Fuerza (jugador): submenú `/fuerza` (`menu_fuerza.html`) y última medición `/fuerza/ultimo` (`fuerza.html`), con datos de prueba en `src/lib/data/fuerza.js` (misma forma que el viejo `/api/mi-fuerza`) y la lógica de la v1 en `src/lib/fuerza.js` (VMP, RM, porcentajes 60/75/80, fuerza relativa vs objetivo 1.3 pecho / 1.8 sentadilla, variación contra el test anterior, "Nuevas métricas" con las claves de localStorage `fuerza_seen_pecho` / `fuerza_seen_sent`).
  - **Historial** `/fuerza/historial` (`historial_fuerza.html`): alternador Tabla/Gráficos, tablas de pecho y sentadilla, 3 gráficos en SVG hechos a mano (fuerza relativa con bandas de color, carga + VMP en doble eje, RM estimado) con globito de detalle al tocar un punto, y exportación a Excel (3 hojas) con `xlsx` (SheetJS 0.20.3 desde `cdn.sheetjs.com`, cargada solo al exportar). Datos de prueba en `obtenerMiHistorialFuerza`.
  - Unificado entre pantallas "C": la barra superior (`TopNav`: "← Volver" + "Salir") y los colores de los puntos (pecho azul `--blue-600`, sentadilla dorado `#c9a83e`). `TarjetaJugador` es compartida por las pantallas de datos.
  - Componentes compartidos nuevos para las pantallas de datos (diseño "C" de la v1): `PantallaDatos` (barra `TopNav` + columna + colores `--blue-*`/`--gray-*`), `HeroSeccion` (encabezado compacto de submenús), `CommentBox` (comentario del Chano con el diseño de la v1). Reutilizarlos en Pliegues, Rutinas, Wellness, etc.
  - Inconsistencia de la v1 corregida: `--gray-400` se usaba sin estar definido; ahora vale `#94a3b8` (el gris que se buscaba).
- [x] Pliegues (jugador): submenú `/pliegues` y última medición `/pliegues/ultimo` (`menu_pliegues.html` y `pliegues.html`), con datos de prueba en `src/lib/data/pliegues.js` (misma forma que el viejo `/api/mi-pliegue`) y la lógica de la v1 en `src/lib/pliegues.js` (estado según la sumatoria de 6 pliegues: <50 bueno, 50-60 regular, >60 alto; frase de cuánto falta para el peso ideal). Incluye las tarjetas de PDFs de pautas nutricionales y suplementación (`public/rutinas/`).
  - **Historial** `/pliegues/historial` (`historial_pliegues.html`): alternador Tabla/Gráficos, tabla de registros con estado (Bueno/Regular/Alto), gráficos de barras horizontales (evolución del peso y de la sumatoria de 6 pliegues, con leyenda) y exportación a Excel (2 hojas). Datos de prueba en `obtenerMisPliegues`.
  - El botón de exportar de Pliegues (blanco con borde, dentro de la tarjeta) es distinto al de Fuerza (azul, centrado): así están en la v1. No se unificaron; preguntar antes de cambiarlos.
  - Piezas compartidas creadas para las pantallas de mediciones (en la v1 estaban copiadas en cada archivo): `Alternador` (Tabla/Gráficos), `TituloBloque` (título con puntito de color), `SubmenuMedicion` (los submenús de fuerza y pliegues son el mismo componente), `Baldosa`/`RejillaBaldosas`, `InsigniaEstado`, `FechaTest`, `SinDatos`, `Glosario`, `TarjetaRecurso` (PDFs; se reutiliza en Rutinas), `TarjetaJugador`, `CommentBox`. Al portar una pantalla nueva de mediciones, usar estas piezas y no copiar CSS.
  - El punto de color de "Composición corporal" usa el mismo azul que el de pecho (`--blue-600`), para unificar la v1.
- [x] Rutinas (jugador): `/rutinas` (`rutinas.html`), se llega desde "Rutinas disponibles" en la última medición de fuerza. Una tarjeta por plan (elegir = tocar la tarjeta), "Abrir"/"Descargar" y un visor `<iframe>` del PDF elegido. Lista de planes en `src/lib/rutinas.js`, PDFs en `public/rutinas/`. Usa `PantallaDatos ancho="ancho"` (720 px, 3 columnas desde 640 px).
  - Falla de la v1 corregida: la 4ª tarjeta ("RUTINA FMAX TI") apuntaba a `rutina Fmax TI.pdf`, que no existe; ahora usa `PLAN FUERZA MAXIMA TREN INFERIOR.pdf` (título alineado con el archivo). Preguntar al usuario si prefiere otro título.
  - Unificado: la barra superior de esta pantalla decía "← Fuerza"; ahora es "← Volver" como en las demás.
- [x] Encuestas (jugador): submenú `/encuestas` (`menu_encuestas.html`), formulario `/encuestas/wellness` (`wellness.html`: 4 escalas 1-10 + comentario) y `/encuestas/post-partido` (`post_partido.html`: fecha, llegada, carga emocional/física, categoría con "Otro", minutos, y VARIOS golpes/molestias con tipo, buscador de zona, lado y comentario). Reglas de validación y listas (zonas con/sin lado, categorías, tipos) en `src/lib/encuestas.js`; guardado en `src/lib/data/encuestas.js` (**hoy NO persiste: valida y responde ok**; con Supabase inserta una fila por golpe, o una sola con "No" si no hubo).
  - Primeras pantallas que ESCRIBEN datos. Kit de formulario compartido en `src/app/(jugador)/encuestas/_componentes/Formulario.js` (carpeta con `_` = no es ruta): `Pregunta`, `OpcionesRadio`, `EscalaDiez`, `Campo`, `BotonEnviar`, `TarjetaFormulario`, `TarjetaExito`.
  - `SubmenuSeccion` es el submenú genérico (Encuestas lo usa); `SubmenuMedicion` (fuerza/pliegues) es un caso particular. `Aviso` ahora tiene tipos `info` / `exito` (verde) / `error` (rojo) vía `useAviso().mostrar(texto, tipo)`. `PantallaDatos` acepta `ancho="angosto"` (480 px, formularios).
  - Mejoras sobre la v1 (mismo aspecto): las opciones se pueden elegir con el teclado (en la v1 los radios estaban con `display:none`); en el buscador de zona, reescribir el texto descarta la zona elegida antes (antes quedaba guardada sin verse).
  - Unificado: la barra superior de ambos formularios ("← Menú" / "← Encuestas" en la v1) es "← Volver" → `/encuestas`.
  - **Falta:** las pantallas del técnico que leen estas respuestas (`menu_encuestas_tecnico`, `wellness_tecnico`, `post_partido_tecnico`).
- [x] Torneo (jugador), primera parte: menú `/torneo` (`menu_torneo.html`; se habilitó "Promocional 2026" en el menú) y tabla de posiciones `/torneo/posiciones` (`tabla_posiciones.html`, componente de servidor). Datos de prueba ficticios en `src/lib/data/torneo.js` (`obtenerPosiciones`, misma forma que el `_leer_posiciones` de la v1). Las demás opciones del menú (Mis estadísticas, Partidos, Fixture, Goleadores, Planteles, Jugadores, Equipos) figuran `disponible: false` hasta portarlas.
  - Piezas compartidas nuevas: `PieVolver` (pie "Volver" + "Primera D · Hacoaj", extraído de `SubmenuSeccion`), `PantallaTorneo` (encabezado bajo `HeroSeccion sinPerfil` + contenido de 520 px + pie; usar en fixture, goleadores, etc.). `SubmenuSeccion` ahora acepta varias listas (`secciones`) y `SectionLabel` `separada` acepta píxeles.
  - Inconsistencia de la v1 corregida: la tabla de posiciones volvía a "Equipo" (`/estadisticas-equipo`); ahora vuelve a "Torneo".
- [x] Torneo (jugador), segunda parte: goleadores `/torneo/goleadores` (`goleadores.html`, componente de servidor) y fixture `/torneo/fixture` (`fixture.html`: filtros por zona y equipo, fechas plegables, y al tocar un partido jugado se despliega la síntesis con formaciones 4-4-2 y eventos por minuto). Datos de prueba en `src/lib/data/torneo.js` (`obtenerGoleadores`, `obtenerFixture` y `obtenerSintesis`, misma forma que las respuestas de la v1; el fixture es todos contra todos entre los mismos 16 equipos, con resultados de semilla fija).
  - Piezas compartidas nuevas para las pantallas del torneo: `TablaTorneo` (tabla con columnas por tipo: pos/texto/nombre/secundario/dato/puntos/goles; ya la usan Posiciones y Goleadores, y la usarán equipos/jugadores), `PanelVacio` ("Sin datos"), `FuenteDatos` ("Fuente: soloascenso.com.ar"). Posiciones se pasó a `TablaTorneo` y usa `SectionLabel` (la v1 repetía ese rótulo con 2 px menos de margen). Íconos nuevos: `flechaAbajo`, `tabla`.
  - Mejoras sobre la v1 (mismo aspecto): en el fixture la tarjeta se puede abrir con teclado (botón real estirado sobre la tarjeta) y la cabecera de cada fecha es un botón; el esquema "4-4-2" de la síntesis se calcula de la formación (en la v1 estaba escrito fijo); la síntesis se pide directo por partido (la v1 primero buscaba el `partido_id` por nombres de equipo y fecha, algo frágil).
  - Se conserva de la v1 la rayita que queda bajo los partidos jugados (borde superior del panel de síntesis cerrado).
- [x] Torneo (jugador), tercera parte: planteles `/torneo/planteles` (`torneo/planteles.html`: buscador, equipo desplegable con jugadores por puesto), equipos `/torneo/equipos` (`torneo/equipos.html`: selector con Hacoaj de entrada, temporadas 2024/2025/2026/Todos, KPIs, barra V/E/D, partidos con síntesis) y jugadores `/torneo/jugadores` (`torneo/jugadores.html`: rankings Goleadores/Minutos/Tarjetas/General, filtro por equipo, temporadas múltiples). Los tres leen lo que en la v1 salía del **SQLite del scraper** (`primera_d.db`), que se va a migrar a Supabase junto con las Sheets (decidido con el usuario).
  - **`src/lib/data/torneoDb.js`** = SQLite de PRUEBA (ficticio, determinístico, en memoria): 16 equipos, 288 jugadores, partidos 2024/2025/2026 con apariciones, goles, tarjetas y cambios. Sus funciones devuelven lo mismo que las `/api/torneo/...` de la v1 (`obtenerEquipos`, `obtenerPlantel`, `obtenerStatsEquipo`, `obtenerPartidosEquipo`, `obtenerSintesisPartido`, `obtenerSintesis` (por equipos y día, para el fixture), `obtenerJugador`, `obtenerRankings`). Los datos de `torneo.js` (posiciones, goleadores) son independientes y NO coinciden con estos totales; al pasar a Supabase todo sale de las mismas tablas.
  - Piezas nuevas en `src/app/(jugador)/torneo/_componentes/`: `HojaJugador` (hoja con la ficha del jugador; con teclado: Escape cierra, foco a la X), `Pildoras` (temporadas), `InsigniaResultado` (V/E/D). Helpers en `src/lib/torneo.js` y `src/lib/azar.js` (generador con semilla).
  - Estas 3 pantallas eran de una generación de diseño anterior en la v1 (encabezado sin escudo ni etiqueta, sin pie "Volver"): ahora usan el mismo encabezado y pie que fixture/posiciones/goleadores (`PantallaTorneo`). Fechas de las fichas unificadas ("23-05-26"; la v1 mostraba dos formatos distintos entre planteles y jugadores). En la síntesis de equipos, la tarjeta roja se detecta sin importar mayúsculas (la v1 la comparaba en minúscula y nunca la mostraba roja).
- [x] Torneo (jugador), cuarta parte (cierra el Torneo del lado del jugador): "Mis estadísticas" `/torneo/estadisticas` (`estadisticas_individuales.html`: resumen de participación/minutos/producción según posición/disciplina, más cada partido de Hacoaj con lo que hizo el jugador) y "Partidos" `/torneo/partidos` + `/torneo/partidos/[fecha]` (`partidos_equipo.html` y `detalle_partido.html`: marcador grande, pestañas Resumen/Alineaciones/Multimedia/Estadísticas — línea de tiempo, cancha con los 11 titulares ubicados según la formación, cambios y banco, links/videos, comparación de estadísticas en barras).
  - **`src/lib/data/partidos.js`** = datos de prueba de "Partidos" y "Partidos-jugador" de la v1 (Sheets) + el resumen que salía del SQLite. Se arma a partir de los partidos de Hacoaj de `torneoDb.js`, así que "Partidos" coincide con "Equipos"/"Jugadores"; un delantero del plantel hace de "Jugador de Prueba" (el usuario de la sesión simulada). `obtenerPartidosHacoaj`, `obtenerDetallePartido`, `obtenerEstadisticasJugador`.
  - Piezas nuevas: `src/lib/formaciones.js` (posiciones en la cancha de 13 esquemas, copiadas de la v1), `PerfilSesion` (tarjeta del jugador logueado). `HeroSeccion` y `PantallaTorneo` ahora aceptan `children`/`encabezado` (contenido propio en vez de título, para el marcador del partido) y `angosto` (480px). `Alineaciones.js` ubica los titulares en la cancha por coincidencia de posición (o en líneas, si el esquema no se reconoce) — la v1 hacía esto con DOM manipulation del lado del cliente.
  - **Bug propio corregido antes de terminar:** el generador de fixture (`armarFixture` en `src/lib/data/torneo.js`) dejaba a Hacoaj siempre de visitante (el "método del círculo" no alternaba local/visitante para el equipo fijo en la posición 0). Ahora el local se sortea por partido.
- [x] Panel técnico/admin, primera parte (Torneo): `/panel/posiciones`, `/panel/goleadores`, `/panel/fixture` y `/panel/partidos` + `/panel/partidos/[fecha]` (`tecnico/tabla_posiciones.html`, `goleadores.html`, `fixture.html`, `partidos_equipo.html`, `detalle_partido.html`). Mismo contenido y datos que las pantallas del jugador, con el diseño de escritorio del panel (barra superior, columna de hasta 1200px, tabla `<table>` en vez de tarjetas).
  - Piezas nuevas en `src/components/`: `PantallaPanel` (título + volver + columna 1200px, o 900px con `angosto`) y `EtiquetaSeccion` (rótulo de sección). En `src/app/(tecnico)/_componentes/`: `TablaPanel` (tabla genérica), `VacioPanel` ("Sin datos", sin ícono, más simple que la del jugador) y `FuentePanel`. Colores propios del panel completados en `layout.module.css` (`--gold`, `--green`, `--red`, `--yellow`).
  - **Antes de duplicar la lógica de fixture/detalle de partido para el técnico, se extrajo a helpers compartidos**: `ubicarEnCancha`/`ubicarPorLineas`/`agruparFormacion`/`ETIQUETAS_POSICION` en `src/lib/formaciones.js`, e `inicialesDeNombre`/`apellidoDeNombre`/`minutoDeIngreso`/`eventosDeSintesis` en `src/lib/torneo.js`. Las pantallas del jugador (`torneo/fixture/SintesisPartido.js`, `torneo/partidos/[fecha]/Alineaciones.js`) se simplificaron para usarlos. Cada pantalla del panel técnico (`panel/fixture/SintesisPanel.js`, `panel/partidos/[fecha]/AlineacionesPanel.js`, etc.) solo tiene su propio JSX/CSS.
  - Diferencia con la v1: el detalle de partido técnico no incluye todavía el formulario de administrador para agregar videos/links (`/api/multimedia/add-video`, etc.) — es una pantalla de carga de datos, igual que "Cargar partido" y "Cargar datos"; se hace junto con esas.
- [x] Panel técnico/admin, segunda parte: **Jugadores** `/panel/jugadores` (`tecnico/jugadores.html`): buscador y filtros (posición, estado), una tarjeta por jugador del plantel de Hacoaj, y al tocarla la ficha completa (Información, Fuerza, Pliegues, Pesos y, para el administrador, Editar) con exportación a Excel.
  - **"Lesiones" queda pendiente a pedido del usuario**: está en el menú técnico de la v1 pero nunca se llegó a construir (no existe `lesiones.html` ni ruta `/lesiones` en la v1). Sigue con `disponible: false` hasta que el usuario decida el diseño (no hay referencia que portar).
  - **`src/lib/data/plantel.js`** = datos de prueba de la hoja "Usuarios" (ficha de cada jugador: usuario, posición, pierna hábil, altura, nacimiento, estado) y de las hojas de fuerza/pliegues/pesos de **todo el plantel** (antes solo existía un jugador de prueba). Se arma a partir del plantel de Hacoaj de `torneoDb.js` (mismos 18 jugadores de Equipos/Planteles/Jugadores), así que es consistente entre pantallas. `obtenerJugadoresPanel`, `obtenerHistorialFuerzaPlantel`, `obtenerHistorialPlieguesPlantel` — estas dos últimas ya están listas para las pantallas de historial del plantel que faltan.
  - `src/lib/exportarFichaJugador.js` (Excel de una ficha, 4 hojas). Íconos nuevos: `mas`, `buscar`, `cerrar`.
  - Diferencia con la v1: agregar, editar y dar de baja un jugador (solo administrador) todavía no están disponibles — son pantallas de carga de datos, se hacen junto con "Cargar partido" y "Cargar datos".
- [ ] Siguientes: resto del panel técnico/admin (encuestas, dashboard de análisis, historiales de fuerza/pliegues del plantel, cargar datos/fuerza/peso/partido, calendario, configuración, analytics, enviar notificación), Lesiones (a definir con el usuario), Pesos (jugador)
- [ ] Proyecto de Supabase y modelado de tablas (después de tener las pantallas)
- [ ] Login y roles
- [ ] Migración de pantallas
