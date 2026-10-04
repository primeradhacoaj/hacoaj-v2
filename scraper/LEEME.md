# Scraper de soloascenso.com.ar

Mantiene al día las tablas del torneo (`torneo_*`) de Supabase: posiciones, goleadores, próximos partidos, y todos los partidos jugados con sus formaciones, goles, cambios y tarjetas.

Corre solo en GitHub Actions, una vez por día:

| Workflow | Hora (Argentina) | Qué hace |
|---|---|---|
| `scraper-liga.yml` | ~05:07 | Posiciones, goleadores y fixture (próximos partidos) |
| `scraper-sintesis.yml` | ~06:13 | Partidos nuevos con todo su detalle (el trabajo pesado) |

Los horarios son aproximados: GitHub atrasa los cron programados.

## Cómo funciona

1. Baja de Supabase lo que ya scrapeó (tabla `scraper_estado`; en la v1 era la carpeta `checkpoints/`).
2. Corre `scraper.py` / `actualizar_soloascenso.py`, que solo traen lo nuevo.
3. Sube el resultado a las tablas del torneo con `sincronizar.py`, en **una sola transacción**.
4. Guarda el nuevo estado para la próxima corrida.

Si una corrida sale mal (soloascenso caído, scraping incompleto), no se pisa nada: el scraper tiene que terminar bien, y además se comprueba que no traiga sensiblemente menos partidos de los que ya hay.

## Credencial

El scraper entra a la base con un usuario propio (`scraper`) que **solo** puede tocar el torneo: no ve perfiles, datos físicos ni cuentas, y ni siquiera puede modificar el vínculo entre un jugador del torneo y una persona de la app (`perfil_id`). No usa la clave de administrador de Supabase.

- En GitHub es el secreto `SCRAPER_DB_URL` (Settings → Secrets and variables → Actions). Sin ese secreto los workflows terminan con un aviso y no hacen nada.
- Para correrlo a mano, la misma cadena va en `scraper/.env.scraper` (ignorado por git).
- La contraseña se cambia con `alter role scraper with password '…'` y se actualiza en los dos lugares.

## Correrlo a mano

```bash
pip install -r scraper/requirements.txt
python scraper/ejecutar.py liga
python scraper/ejecutar.py sintesis --max-minutos 10
```

La carpeta `scraper/trabajo/` (base SQLite, checkpoints y logs de la corrida) no se versiona.

## Correcciones manuales

`scraper.py` tiene al final del paso 6 una lista de correcciones para errores conocidos de soloascenso (un jugador mal asignado y una aparición faltante). Si aparece otro caso, se agrega ahí.
