# Hacoaj v2

Aplicación web del plantel de Primera D de Hacoaj. Permite a jugadores y cuerpo técnico consultar y cargar información físico-deportiva: mediciones de fuerza, pliegues, peso, rutinas, estadísticas y datos del torneo.

Esta es la segunda versión de la aplicación, reconstruida con tecnologías modernas.

## Stack

- [Next.js](https://nextjs.org) (App Router) y React
- JavaScript
- Supabase (base de datos y autenticación) — próximamente
- Vercel (despliegue)

## Cómo correrlo en local

Requisitos: [Node.js](https://nodejs.org) LTS.

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

Otros comandos: `npm run build` (compilar) y `npm run lint` (revisar el código).

## Variables de entorno

Las credenciales se guardan en un archivo `.env.local` (no versionado) y, en producción, en las variables de entorno de Vercel. Nunca van en el código.

## Seguridad: qué NO debe subirse al repositorio

Nunca hacer commit de:

- Archivos `.env` y `.env.local` (cualquier `.env*`).
- Claves privadas (`*.pem`), como la clave privada VAPID de las notificaciones push.
- Credenciales de Google (`service_account.json`).
- La `service_role key` de Supabase, que da acceso total a la base de datos.
- Tokens o claves de APIs de terceros (por ejemplo, pagos).
- Contraseñas y datos personales reales de jugadores.

Notas:

- Las variables que empiezan con `NEXT_PUBLIC_` se envían al navegador y son visibles para cualquiera. Solo usar ese prefijo para valores públicos (por ejemplo, la URL y la `anon key` de Supabase, protegidas por políticas RLS).
- Si una clave se sube por error, considerarla comprometida: revocarla y generar una nueva. Borrar el archivo en un commit posterior no alcanza, porque queda en el historial.

Estas reglas están reflejadas en el `.gitignore`.
