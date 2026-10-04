"""
Pasa lo que scrapeó `scraper.py` / `actualizar_soloascenso.py` a Supabase.

En la v1 el scraper dejaba una base SQLite y tres JSON que se commiteaban al repo y la app leía de ahí.
Ahora la app lee de las tablas `torneo_*` de Supabase y este módulo las actualiza. Las transformaciones son
las mismas que usó el importador la primera vez (`scripts/importar/importar.py`), así lo que escribe el scraper
y lo que se importó son idénticos.

Reglas para no romper nada si una corrida sale mal (soloascenso caído, scraping incompleto…):
  · Todo se escribe en UNA transacción: o entra completo o no entra nada.
  · Antes de escribir se comprueba que lo scrapeado no sea sensiblemente menos que lo que ya hay.
  · Equipos, jugadores y partidos solo se agregan o se actualizan, nunca se borran.
  · Nunca se toca `torneo_jugadores.perfil_id` (el vínculo con las personas de la app): la base ni siquiera
    le da permiso al usuario `scraper`.
"""

import json
import re
import sqlite3
from datetime import date
from pathlib import Path

from psycopg2.extras import Json, execute_values

# Si lo scrapeado trae menos de esta fracción de los partidos que ya hay en la base, algo anduvo mal.
MINIMO_PARTIDOS = 0.9
# Una tabla de posiciones de verdad tiene al menos este número de equipos.
MINIMO_EQUIPOS_POSICIONES = 6

# Estado del scraper (lo ya scrapeado): nombre en la tabla `scraper_estado` → archivo dentro de la carpeta de trabajo.
ARCHIVOS_ESTADO = {
    "teams": "checkpoints/teams.json",
    "players": "checkpoints/players.json",
    "profiles": "checkpoints/profiles.json",
    "syntheses": "checkpoints/syntheses.json",
    "fixture": "data/fixture.json",
}


def avisar(mensaje):
    print(mensaje, flush=True)


# ── Estado ──────────────────────────────────────────────────────────────────
def bajar_estado(con, trabajo, nombres=None):
    """Baja de Supabase el estado guardado a la carpeta de trabajo. Devuelve cuáles había."""
    trabajo = Path(trabajo)
    bajados = []
    with con.cursor() as cur:
        for nombre, ruta in ARCHIVOS_ESTADO.items():
            if nombres and nombre not in nombres:
                continue
            cur.execute("select datos from public.scraper_estado where nombre = %s", (nombre,))
            fila = cur.fetchone()
            if fila is None:
                continue
            destino = trabajo / ruta
            destino.parent.mkdir(parents=True, exist_ok=True)
            destino.write_text(json.dumps(fila[0], ensure_ascii=False), encoding="utf-8")
            bajados.append(nombre)
    con.commit()
    return bajados


def subir_estado(con, trabajo, nombres=None):
    """Sube a Supabase el estado que haya en la carpeta de trabajo. Devuelve cuáles subió."""
    trabajo = Path(trabajo)
    subidos = []
    with con.cursor() as cur:
        for nombre, ruta in ARCHIVOS_ESTADO.items():
            if nombres and nombre not in nombres:
                continue
            origen = trabajo / ruta
            if not origen.exists():
                continue
            datos = json.loads(origen.read_text(encoding="utf-8"))
            cur.execute(
                """insert into public.scraper_estado (nombre, datos, actualizado_en) values (%s, %s, now())
                   on conflict (nombre) do update set datos = excluded.datos, actualizado_en = now()""",
                (nombre, Json(datos)),
            )
            subidos.append(nombre)
    con.commit()
    return subidos


# ── Conversiones (las mismas del importador) ────────────────────────────────
def texto(valor):
    valor = str(valor or "").strip()
    return valor or None


def entero(valor):
    """Número entero o None ('', '-', texto…)."""
    if valor in (None, ""):
        return None
    return int(valor) if str(valor).lstrip("-").isdigit() else None


def fecha_iso(valor):
    return texto(valor)


def temporada_de(fixture):
    """Año de la temporada en curso: el más reciente que figura en el fixture ('DD.MM.YY')."""
    anios = [2000 + int(m.group(1)) for f in fixture if (m := re.search(r"\.(\d{2})$", f.get("Dia", "") or ""))]
    return max(anios) if anios else date.today().year


# ── Torneo (base SQLite que arma scraper.py) ────────────────────────────────
def sincronizar_torneo(con, ruta_sqlite):
    """Actualiza equipos, jugadores, partidos y sus eventos. Devuelve un resumen."""
    lite = sqlite3.connect(f"file:{Path(ruta_sqlite).as_posix()}?mode=ro", uri=True)
    lite.row_factory = sqlite3.Row
    q = lambda sql: [dict(f) for f in lite.execute(sql)]

    equipos = q("select * from equipos")
    jugadores = q("select * from jugadores")
    jugador_equipo = q("select * from jugador_equipo")
    partidos = q("select * from partidos")
    apariciones = q("select * from apariciones")
    goles = q("select * from goles")
    cambios = q("select * from cambios")
    tarjetas = q("select * from tarjetas")
    lite.close()

    ids_equipos = {e["equipo_id"] for e in equipos}
    ids_partidos = [p["partido_id"] for p in partidos]
    resumen = {}

    with con.cursor() as cur:
        # Salvaguarda: no escribir si lo scrapeado es mucho menos que lo que ya hay.
        cur.execute("select count(*) from public.torneo_partidos")
        hay = cur.fetchone()[0]
        if hay and len(partidos) < hay * MINIMO_PARTIDOS:
            raise RuntimeError(
                f"El scraper trajo {len(partidos)} partidos y la base ya tiene {hay} "
                f"(menos del {int(MINIMO_PARTIDOS * 100)}%): no se escribe nada."
            )

        execute_values(
            cur,
            """insert into public.torneo_equipos (id, nombre, categoria, url_slug) values %s
               on conflict (id) do update set nombre = excluded.nombre, categoria = excluded.categoria, url_slug = excluded.url_slug""",
            [(e["equipo_id"], e["nombre"], e["categoria"], e["url_slug"]) for e in equipos],
        )
        # perfil_id NO se toca (ni se menciona): lo manejan la app y el importador.
        execute_values(
            cur,
            """insert into public.torneo_jugadores (id, nombre_completo, fecha_nacimiento, puesto, url_slug) values %s
               on conflict (id) do update set nombre_completo = excluded.nombre_completo,
                 fecha_nacimiento = excluded.fecha_nacimiento, puesto = excluded.puesto, url_slug = excluded.url_slug""",
            [(j["jugador_id"], j["nombre_completo"], fecha_iso(j["fecha_nacimiento"]), j["puesto"], j["url_slug"]) for j in jugadores],
        )
        # Una fila por jugador con su equipo actual (como en el SQLite): se reemplaza completa.
        cur.execute("delete from public.torneo_jugador_equipo")
        execute_values(
            cur,
            """insert into public.torneo_jugador_equipo (jugador_id, equipo_id, temporada, club_nombre) values %s
               on conflict (jugador_id, equipo_id, temporada) do update set club_nombre = excluded.club_nombre""",
            [(x["jugador_id"], x["equipo_id"], entero(x["temporada"]), x["club_nombre"]) for x in jugador_equipo],
        )
        execute_values(
            cur,
            """insert into public.torneo_partidos (id, fecha, hora, torneo, jornada, estadio, arbitro, equipo_local, equipo_visitante,
                 equipo_local_id, equipo_visitante_id, goles_local, goles_visitante, url) values %s
               on conflict (id) do update set fecha = excluded.fecha, hora = excluded.hora, torneo = excluded.torneo,
                 jornada = excluded.jornada, estadio = excluded.estadio, arbitro = excluded.arbitro,
                 equipo_local = excluded.equipo_local, equipo_visitante = excluded.equipo_visitante,
                 equipo_local_id = excluded.equipo_local_id, equipo_visitante_id = excluded.equipo_visitante_id,
                 goles_local = excluded.goles_local, goles_visitante = excluded.goles_visitante, url = excluded.url""",
            [
                (
                    p["partido_id"], p["fecha"], p["hora"], p["torneo"], p["jornada"], p["estadio"], texto(p["arbitro"]),
                    p["equipo_local"], p["equipo_visitante"],
                    p["equipo_local_id"] if p["equipo_local_id"] in ids_equipos else None,
                    p["equipo_visitante_id"] if p["equipo_visitante_id"] in ids_equipos else None,
                    p["goles_local"], p["goles_visitante"], p["url"],
                )
                for p in partidos
            ],
        )

        # Lo que pasó en cada partido se reemplaza por completo, partido por partido.
        for tabla in ("torneo_apariciones", "torneo_goles", "torneo_cambios", "torneo_tarjetas"):
            cur.execute(f"delete from public.{tabla} where partido_id = any(%s)", (ids_partidos,))
        execute_values(
            cur,
            """insert into public.torneo_apariciones (jugador_id, partido_id, titular, minuto_ingreso, minuto_salida, minutos_jugados,
                 goles, amarilla, roja, es_ambiguo, equipo_en_partido, numero_camiseta, posicion_partido) values %s
               on conflict (jugador_id, partido_id) do update set titular = excluded.titular, minuto_ingreso = excluded.minuto_ingreso,
                 minuto_salida = excluded.minuto_salida, minutos_jugados = excluded.minutos_jugados, goles = excluded.goles,
                 amarilla = excluded.amarilla, roja = excluded.roja, es_ambiguo = excluded.es_ambiguo,
                 equipo_en_partido = excluded.equipo_en_partido, numero_camiseta = excluded.numero_camiseta,
                 posicion_partido = excluded.posicion_partido""",
            [
                (
                    a["jugador_id"], a["partido_id"], bool(a["titular"]), entero(a["minuto_ingreso"]), entero(a["minuto_salida"]),
                    entero(a["minutos_jugados"]), entero(a["goles"]) or 0, entero(a["amarilla"]) or 0, entero(a["roja"]) or 0,
                    bool(a["es_ambiguo"]), a["equipo_en_partido"], entero(a["numero_camiseta"]), a["posicion_partido"],
                )
                for a in apariciones
            ],
            page_size=1000,
        )
        execute_values(
            cur,
            "insert into public.torneo_goles (partido_id, jugador_nombre, equipo_abrev, minuto, en_contra) values %s",
            [(g["partido_id"], g["jugador_nombre"], g["equipo_abrev"], entero(g["minuto"]), bool(g["en_contra"])) for g in goles],
        )
        execute_values(
            cur,
            "insert into public.torneo_cambios (partido_id, equipo_abrev, jugador_entra, jugador_sale, minuto) values %s",
            [(c["partido_id"], c["equipo_abrev"], c["jugador_entra"], c["jugador_sale"], entero(c["minuto"])) for c in cambios],
        )
        execute_values(
            cur,
            "insert into public.torneo_tarjetas (partido_id, jugador_nombre, equipo_abrev, tipo, minuto) values %s",
            [(t["partido_id"], t["jugador_nombre"], t["equipo_abrev"], t["tipo"].lower(), entero(t["minuto"])) for t in tarjetas],
        )

        # Los partidos de Hacoaj cargados a mano que todavía no estaban vinculados con su par del scraper.
        cur.execute(
            """update public.partidos_hacoaj h set partido_torneo_id = t.id
               from public.torneo_partidos t
               where h.partido_torneo_id is null and t.fecha = h.fecha
                 and (t.equipo_local ilike '%%hacoaj%%' or t.equipo_visitante ilike '%%hacoaj%%')"""
        )
        resumen["partidos_vinculados"] = cur.rowcount

    resumen.update(
        equipos=len(equipos), jugadores=len(jugadores), partidos=len(partidos), apariciones=len(apariciones),
        goles=len(goles), cambios=len(cambios), tarjetas=len(tarjetas),
    )
    return resumen


# ── Liga (posiciones, goleadores y próximos partidos: JSON de actualizar_soloascenso.py) ──
def _leer(carpeta, nombre):
    ruta = Path(carpeta) / nombre
    if not ruta.exists():
        return None
    return json.loads(ruta.read_text(encoding="utf-8"))


def sincronizar_liga(con, carpeta_datos):
    """Actualiza la tabla de posiciones, los goleadores y los próximos partidos. Lo que no se pudo
    scrapear (vacío o con pocos datos) se deja como estaba."""
    posiciones = _leer(carpeta_datos, "posiciones.json") or []
    goleadores = _leer(carpeta_datos, "goleadores.json") or []
    fixture = _leer(carpeta_datos, "fixture.json") or []
    temporada = temporada_de(fixture)
    resumen = {"temporada": temporada}

    with con.cursor() as cur:
        if len(posiciones) >= MINIMO_EQUIPOS_POSICIONES:
            cur.execute("delete from public.torneo_posiciones where temporada = %s", (temporada,))
            execute_values(
                cur,
                """insert into public.torneo_posiciones (temporada, zona, posicion, equipo, pts, j, g, e, p, gf, gc, dif) values %s
                   on conflict (temporada, zona, equipo) do nothing""",
                [
                    (temporada, x["Zona"], entero(x["Pos"]), x["Equipo"], entero(x["Pts"]), entero(x["J"]), entero(x["G"]),
                     entero(x["E"]), entero(x["P"]), entero(x["GF"]), entero(x["GC"]), entero(x["Dif"]))
                    for x in posiciones
                ],
            )
            resumen["posiciones"] = len(posiciones)
        else:
            avisar(f"  Posiciones: se scrapearon {len(posiciones)} equipos (muy pocos): se deja la tabla como estaba.")

        if goleadores:
            cur.execute("delete from public.torneo_goleadores where temporada = %s", (temporada,))
            execute_values(
                cur,
                """insert into public.torneo_goleadores (temporada, posicion, jugador, equipo, goles) values %s
                   on conflict (temporada, jugador, equipo) do nothing""",
                [(temporada, entero(x["Pos"]), x["Jugador"], x["Equipo"], entero(x["Goles"])) for x in goleadores],
            )
            resumen["goleadores"] = len(goleadores)
        else:
            avisar("  Goleadores: no se scrapeó ninguno: se deja la tabla como estaba.")

        # Los partidos sin resultado son los que faltan jugar.
        proximos = []
        for f in fixture:
            if f.get("Goles Local", "") != "":
                continue
            m = re.fullmatch(r"(\d{2})\.(\d{2})\.(\d{2})", f.get("Dia", "") or "")
            if not m or not entero(f.get("Fecha")):
                continue
            proximos.append(
                (temporada, entero(f["Fecha"]), f"20{m.group(3)}-{m.group(2)}-{m.group(1)}", texto(f.get("Hora")),
                 f["Local"], f["Visitante"], texto(f.get("Arbitro")))
            )
        if fixture:
            cur.execute("delete from public.torneo_proximos where temporada = %s", (temporada,))
            execute_values(
                cur,
                """insert into public.torneo_proximos (temporada, jornada, fecha, hora, equipo_local, equipo_visitante, arbitro)
                   values %s""",
                proximos,
            )
            resumen["proximos"] = len(proximos)
        else:
            avisar("  Fixture: no se scrapeó: se dejan los próximos partidos como estaban.")
    return resumen
