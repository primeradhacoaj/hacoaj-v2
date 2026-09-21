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

La v1 tenía 3 generaciones de diseño mezcladas (44 templates HTML sin herencia, cada uno con su CSS). En v2 hay UN solo sistema:

- **Base: el diseño "A" de la v1** (jugador moderno): encabezado azul con degradé y esquinas redondeadas, cards blancas de radio 18px, sombras suaves.
- **Tomado del diseño "C"** (fuerza/pliegues): semáforo verde/amarillo/rojo para estados, tarjetas de métricas y barras de progreso.
- **Tomado del diseño "B"** (técnico): barra superior fija y layout ancho para escritorio.
- **Una sola tipografía: Plus Jakarta Sans** (`next/font`, variable `--font-sans`). Sin Playfair, DM Sans ni Inter.
- **Dorado solo como acento puntual** (un punto, una letra, un subrayado). No usarlo en fondos grandes ni botones: no representa nada importante. El color principal es el azul navy. El rosa del panel técnico de la v1 se descarta.
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

## Reglas de trabajo

- Trabajar de a un paso por vez. La app actual funciona perfecto; esta migración es aparte y no debe romper nada de v1.
- Migrar pantallas una por una, de la más simple a la más compleja.
- Antes de crear una ruta o componente nuevo, verificar si ya existe uno similar.
- CSS y JS reutilizable en componentes o módulos compartidos, no copiado en cada página.
- Cuando se agregue una funcionalidad o se tome una decisión relevante, actualizar este archivo.
- **No hacer commit ni push sin que el usuario lo confirme**, salvo que diga explícitamente algo como "guardá los cambios en GitHub".

## Seguridad

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
- [ ] Pasos 3 a 8: login, menú por rol, Pesos, Fuerza y Pliegues, Torneo, paneles técnico/admin (con datos falsos)
- [ ] Proyecto de Supabase y modelado de tablas (después de tener las pantallas)
- [ ] Login y roles
- [ ] Migración de pantallas
