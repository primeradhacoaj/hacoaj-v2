"""
Importa los datos REALES de la v1 (Google Sheets "Primera D", SQLite del scraper
y JSON de posiciones/goleadores) a Supabase.

Es una herramienta que corre por afuera de la app (la app desplegada nunca habla
con Google Sheets). Genera UN archivo SQL y lo ejecuta con el CLI de Supabase en
una sola transacción:

  --modo simulacro   (por defecto) corre todo y hace ROLLBACK: valida cada
                     restricción de la base (FK, check, unique) sin guardar nada.
  --modo real        hace COMMIT. Exige --confirmo porque BORRA y vuelve a cargar
                     los datos importados (sirve solo ANTES de que la v2 tenga
                     datos propios: después de usar la v2 en serio, NO se repite).

Las contraseñas se migran tal cual las tiene cada usuario, pero nunca viajan en
texto plano: se calcula el hash bcrypt acá y el SQL solo lleva el hash.

Uso (desde la raíz del repo):
  python scripts/importar/importar.py                       # simulacro
  python scripts/importar/importar.py --modo real --confirmo

Requisitos: pip install -r scripts/importar/requirements.txt
"""

import argparse
import datetime as dt
import json
import os
import re
import shutil
import sqlite3
import subprocess
import sys
import unicodedata
import uuid
from collections import Counter, defaultdict
from pathlib import Path

import bcrypt
import gspread
from google.oauth2.service_account import Credentials

sys.stdout.reconfigure(encoding="utf-8")

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
V1 = Path(os.environ.get("HACOAJ_V1_DIR", r"C:\Users\Saroka\Downloads\Primera D"))
DOMINIO = "hacoaj.test"
TEMPORADA = 2026
HACOAJ_EQUIPO_ID = 501  # "Náutico Hacoaj" en el SQLite del scraper
NS = uuid.UUID("6f1d7c3e-5a40-4f8e-9d42-0f6b1c2a7e11")  # fijo: ids repetibles entre corridas
CUENTAS_DE_PRUEBA = ("jugador", "tecnico", "admin")  # usuarios de prueba del desarrollo: se eliminan
LIMITE_SQL = 3_300_000  # el CLI rechaza ~4 MB

ADVERTENCIAS = []
ERRORES = []


def archivo_de_entrada(nombre):
    """Archivos que viven solo en el servidor de la v1: se buscan en scripts/importar/entradas/ y en la carpeta data/ de la v1."""
    for carpeta in (AQUI / "entradas", V1 / "data"):
        if (carpeta / nombre).exists():
            return carpeta / nombre
    return None


def uid(*partes):
    return str(uuid.uuid5(NS, "|".join(partes)))


def norm(t):
    t = unicodedata.normalize("NFD", str(t or "")).lower().strip()
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", t)


def avisar(msg):
    ADVERTENCIAS.append(msg)


def fallar(msg):
    ERRORES.append(msg)


# ───────────────────────── Parseo de valores ─────────────────────────
def texto(s):
    s = str(s or "").strip()
    return s or None


def numero(s):
    s = str(s or "").strip()
    if s in ("", "-"):
        return None
    try:
        return float(s.replace(",", "."))
    except ValueError:
        fallar(f"número inválido: {s!r}")
        return None


def entero(s):
    n = numero(s)
    return None if n is None else int(round(n))


def fecha(s):
    """'dd/mm/aaaa', 'd/m/aaaa' o 'aaaa-mm-dd' (con o sin hora) -> 'aaaa-mm-dd'."""
    s = str(s or "").strip()
    if not s:
        return None
    s = s.split(" ")[0]
    m = re.fullmatch(r"(\d{1,2})/(\d{1,2})/(\d{4})", s)
    if m:
        d, mo, a = map(int, m.groups())
    else:
        m = re.fullmatch(r"(\d{4})-(\d{2})-(\d{2})", s)
        if not m:
            fallar(f"fecha inválida: {s!r}")
            return None
        a, mo, d = map(int, m.groups())
    try:
        return dt.date(a, mo, d).isoformat()
    except ValueError:
        fallar(f"fecha imposible: {s!r}")
        return None


def fecha_hora(s):
    """'dd/mm/aaaa HH:MM:SS' (o solo la fecha) -> timestamp con hora de Argentina (-03)."""
    s = str(s or "").strip()
    f = fecha(s)
    if f is None:
        return None
    m = re.search(r"(\d{1,2}):(\d{2})(?::(\d{2}))?", s)
    hh, mm, ss = (int(m.group(1)), int(m.group(2)), int(m.group(3) or 0)) if m else (0, 0, 0)
    return f"{f}T{hh:02d}:{mm:02d}:{ss:02d}-03:00"


# ───────────────────────── Lectura de las fuentes ─────────────────────────
def abrir_libro():
    ruta = V1 / "service_account.json"
    cred = Credentials.from_service_account_file(
        str(ruta),
        scopes=[
            "https://www.googleapis.com/auth/spreadsheets.readonly",
            "https://www.googleapis.com/auth/drive.readonly",
        ],
    )
    return gspread.authorize(cred).open("Primera D")


def hoja(libro, nombre):
    """Filas como dict con los encabezados normalizados (sin tildes, en minúscula)."""
    valores = libro.worksheet(nombre).get_all_values()
    cab = [norm(c) for c in valores[0]]
    return [dict(zip(cab, fila)) for fila in valores[1:] if any(c.strip() for c in fila)]


# ───────────────────────── Salida SQL compacta ─────────────────────────
def insertar(tabla, columnas, filas, conflicto=None):
    """
    INSERT con las filas como arreglo JSON (sin repetir nombres de columna), para
    que el archivo entre en el límite de tamaño del CLI.
    columnas: [(nombre, tipo_sql)] ; filas: listas de valores en el mismo orden.
    """
    if not filas:
        return f"-- {tabla}: sin filas\n"
    cuerpo = json.dumps(filas, ensure_ascii=False, separators=(",", ":"))
    assert "$j$" not in cuerpo
    cols = ", ".join(c for c, _ in columnas)
    exprs = ", ".join(
        f"(v->>{i})" + ("" if t == "text" else f"::{t}") for i, (_, t) in enumerate(columnas)
    )
    return (
        f"insert into {tabla} ({cols})\nselect {exprs}\n"
        f"from jsonb_array_elements($j$"
        f"{cuerpo}$j$::jsonb) as v{(' ' + conflicto) if conflicto else ''};\n"
    )


# ───────────────────────── Personas ─────────────────────────
class Personas:
    def __init__(self, usuarios, equiv):
        self.por_norm = {}      # nombre normalizado -> perfil
        self.perfiles = []      # filas listas para insertar
        self.cuentas = []       # (usuario, perfil_id, hash)
        self.equiv = equiv
        self.pendientes = Counter()
        self.alias_norm = {norm(k): norm(v) for k, v in equiv.get("alias", {}).items()}
        self.externos_norm = {norm(n): n for n in equiv.get("externos", [])}

        usados = set()
        for u in usuarios:
            nombre = u["nombre"].strip()
            n = norm(nombre)
            if n in self.por_norm:
                fallar(f"nombre repetido en Usuarios: {nombre}")
            rol = u["rol"].strip().lower()
            login = u["usuario"].strip().lower()
            pid = uid("perfil", n)
            tiene_login = bool(login) and rol != "staff"
            if tiene_login:
                if login in usados:
                    fallar(f"usuario de login repetido: {login}")
                usados.add(login)
            pierna = norm(u["pierna habil"])
            pierna = {"d": "Derecha", "i": "Izquierda"}.get(pierna, pierna.capitalize() or None)
            estado = norm(u["estado"]) or "activo"
            if estado not in ("activo", "inactivo"):
                fallar(f"estado inválido para {nombre}: {estado!r}")
            perfil = {
                "id": pid,
                "auth_user_id": uid("auth", login) if tiene_login else None,
                "usuario": login if tiene_login else None,
                "nombre": nombre,
                "rol": rol,
                "posicion": (norm(u["posicion"]).capitalize() or None),
                "pierna_habil": pierna,
                "fecha_nacimiento": fecha(u["fecha de nacimiento"]),
                "altura": numero(u["altura"]),
                "estado": estado,
            }
            self.perfiles.append(perfil)
            self.por_norm[n] = perfil
            if tiene_login:
                clave = u["contrasena"].strip()
                if not clave:
                    fallar(f"{nombre}: contraseña vacía")
                else:
                    h = bcrypt.hashpw(clave.encode(), bcrypt.gensalt(10)).decode()
                    self.cuentas.append((login, perfil["auth_user_id"], h))
        # Personas que jugaron pero no son del plantel: perfil inactivo y sin login.
        for n, nombre in self.externos_norm.items():
            if n in self.por_norm:
                avisar(f"'{nombre}' figura como externo pero ya está en Usuarios; se usa el de Usuarios")
                continue
            perfil = {
                "id": uid("perfil", n), "auth_user_id": None, "usuario": None, "nombre": nombre, "rol": "jugador",
                "posicion": None, "pierna_habil": None, "fecha_nacimiento": None, "altura": None,
                "estado": "inactivo",
            }
            self.perfiles.append(perfil)
            self.por_norm[n] = perfil

    def resolver(self, nombre, donde=""):
        n = norm(nombre)
        if not n:
            return None
        n = self.alias_norm.get(n, n)
        perfil = self.por_norm.get(n)
        if perfil is None:
            self.pendientes[(nombre.strip(), donde)] += 1
            return None
        return perfil["id"]


# ───────────────────────── Armado de cada dominio ─────────────────────────
def armar(libro, equiv, personas, sql, informe):
    hoy = TEMPORADA

    # ── Partidos de Hacoaj ──
    con = sqlite3.connect(f"file:{(V1 / 'primera_d.db').as_posix()}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    q = lambda s, *a: [dict(r) for r in con.execute(s, a).fetchall()]
    torneo_por_fecha = {}
    for p in q("select partido_id, fecha, equipo_local_id, equipo_visitante_id from partidos"):
        if HACOAJ_EQUIPO_ID in (p["equipo_local_id"], p["equipo_visitante_id"]):
            torneo_por_fecha[p["fecha"]] = p["partido_id"]

    partidos = hoja(libro, "Partidos")
    pid_de = {}
    filas = []
    sin_vinculo = []
    for p in partidos:
        f = fecha(p["fecha partido"])
        pid_de[f] = uid("partido", f)
        condicion = equiv.get("condicion_partido", {}).get(f) or p["condicion"].strip().capitalize()
        if condicion not in ("Local", "Visitante"):
            fallar(f"condición inválida el {f}: {condicion!r}")
        vinculo = torneo_por_fecha.get(f)
        if vinculo is None:
            sin_vinculo.append(f)
        capitan = personas.resolver(p["capitan"], "capitán")
        n = lambda c: entero(p[c])
        filas.append([
            pid_de[f], f, p["rival"].strip(), condicion, entero(p["goles hacoaj"]), entero(p["goles rival"]),
            texto(p["formacion"]).lstrip("'") if texto(p["formacion"]) else None, capitan,
            n("remates arco af"), n("remates af"), n("remates arco ec"), n("remates ec"),
            n("situaciones af"), n("situaciones ec"), n("corners af"), n("corners con af"),
            n("corners ec"), n("corners con ec"), n("tl af"), n("tl ec"), vinculo,
        ])
    sql["partidos"] = insertar(
        "public.partidos_hacoaj",
        [("id", "uuid"), ("fecha", "date"), ("rival", "text"), ("condicion", "text"), ("goles_hacoaj", "smallint"),
         ("goles_rival", "smallint"), ("formacion", "text"), ("capitan_id", "uuid"), ("remates_arco_af", "smallint"),
         ("remates_af", "smallint"), ("remates_arco_ec", "smallint"), ("remates_ec", "smallint"),
         ("situaciones_af", "smallint"), ("situaciones_ec", "smallint"), ("corners_af", "smallint"),
         ("corners_con_af", "smallint"), ("corners_ec", "smallint"), ("corners_con_ec", "smallint"),
         ("tl_af", "smallint"), ("tl_ec", "smallint"), ("partido_torneo_id", "integer")],
        filas,
    )
    informe["partidos_hacoaj"] = len(filas)
    if sin_vinculo:
        avisar(f"partidos de Hacoaj sin partido equivalente en el scraper: {sin_vinculo}")

    # ── Partidos-jugador: jugadores, goles, cambios, tarjetas ──
    pj = hoja(libro, "Partidos-jugador")
    por_partido = defaultdict(list)
    for r in pj:
        por_partido[fecha(r["fecha partido"])].append(r)

    f_jug, f_gol, f_cam, f_tar = [], [], [], []
    asistencias_contadas = Counter()
    asistencias_hoja = Counter()
    minutos_desconocidos = 0
    cambios_sin_minuto = 0
    cambios_huerfanos = 0
    for f, rows in por_partido.items():
        if f not in pid_de:
            fallar(f"Partidos-jugador tiene la fecha {f}, que no está en Partidos")
            continue
        partido = pid_de[f]
        vistos = {}
        for r in rows:
            perfil = personas.resolver(r["jugador"], "jugador del partido")
            if perfil is None:
                continue
            if perfil in vistos:
                fallar(f"{f}: el jugador {r['jugador']} aparece dos veces (¿dos nombres de la misma persona?)")
                continue
            vistos[perfil] = r
            titular = norm(r["titular"]) in ("si", "1", "true")
            f_jug.append([uid("pj", f, perfil), partido, perfil, texto(r["posicion partido"]), titular,
                          entero(r["minutos jugados"]) or 0])

            goles = entero(r["goles"]) or 0
            minutos = [x.strip() for x in r["minuto gol"].split(",") if x.strip()]
            asist = [x.strip() for x in r["asistencia de"].split(",") if x.strip()]
            if goles != len(minutos):
                fallar(f"{f} {r['jugador']}: Goles={goles} pero hay {len(minutos)} minutos de gol")
            if asist and len(asist) != goles:
                avisar(f"{f} {r['jugador']}: {goles} goles y {len(asist)} asistente(s); se asignan en orden")
            asistencias_hoja[perfil] += entero(r["asistencias"]) or 0
            for i in range(goles):
                m = entero(minutos[i]) if i < len(minutos) else None
                if m is not None and m < 0:  # el orden del gol cargado como número negativo
                    m = None
                    minutos_desconocidos += 1
                a = personas.resolver(asist[i], "asistencia de") if i < len(asist) else None
                if a:
                    asistencias_contadas[a] += 1
                f_gol.append([uid("gol", f, perfil, str(i)), partido, perfil, a, m, False])

            for tipo, col in (("amarilla", "t.amarillas"), ("roja", "t.rojas")):
                for i in range(entero(r[col]) or 0):
                    f_tar.append([uid("tar", f, perfil, tipo, str(i)), partido, perfil, tipo, None])

        # Cambios: cada cambio figura en la fila de quien entró ("Ingreso por") y/o de quien salió ("Salio por").
        pares = {}
        for perfil, r in vistos.items():
            if texto(r["ingreso por"]):
                otro = personas.resolver(r["ingreso por"], "ingreso por")
                if otro:
                    pares.setdefault((perfil, otro), set()).add("entra")
            if texto(r["salio por"]):
                otro = personas.resolver(r["salio por"], "salio por")
                if otro:
                    pares.setdefault((otro, perfil), set()).add("sale")
        for (entra, sale), lados in pares.items():
            if len(lados) == 1:
                cambios_huerfanos += 1  # lo declara una sola de las dos filas
            re_, rs_ = vistos.get(entra), vistos.get(sale)
            minuto = None
            if rs_ is not None and norm(rs_["titular"]) in ("si", "1", "true") and entero(rs_["minutos jugados"]):
                minuto = entero(rs_["minutos jugados"])           # el titular que sale: jugó hasta ese minuto
            elif re_ is not None and not texto(re_["salio por"]) and entero(re_["minutos jugados"]) is not None:
                minuto = 90 - entero(re_["minutos jugados"])      # el suplente que entra y sigue hasta el final
            if minuto is None:
                cambios_sin_minuto += 1
            f_cam.append([uid("cam", f, entra, sale), partido, entra, sale, minuto])

    # Control cruzado: las asistencias de la hoja vs. las que salen de "Asistencia de".
    desparejas = sum(1 for p in set(asistencias_hoja) | set(asistencias_contadas) if asistencias_hoja[p] != asistencias_contadas[p])
    if desparejas:
        avisar(f"{desparejas} jugador(es) cuyo total de 'Asistencias' no coincide con lo que dice 'Asistencia de'")

    sql["pj"] = insertar(
        "public.partidos_hacoaj_jugadores",
        [("id", "uuid"), ("partido_id", "uuid"), ("perfil_id", "uuid"), ("posicion_partido", "text"),
         ("titular", "boolean"), ("minutos_jugados", "smallint")], f_jug)
    sql["goles"] = insertar(
        "public.partidos_hacoaj_goles",
        [("id", "uuid"), ("partido_id", "uuid"), ("perfil_id", "uuid"), ("asistencia_de_id", "uuid"),
         ("minuto", "smallint"), ("en_contra", "boolean")], f_gol)
    sql["cambios"] = insertar(
        "public.partidos_hacoaj_cambios",
        [("id", "uuid"), ("partido_id", "uuid"), ("jugador_entra_id", "uuid"), ("jugador_sale_id", "uuid"),
         ("minuto", "smallint")], f_cam)
    sql["tarjetas"] = insertar(
        "public.partidos_hacoaj_tarjetas",
        [("id", "uuid"), ("partido_id", "uuid"), ("perfil_id", "uuid"), ("tipo", "text"), ("minuto", "smallint")], f_tar)
    informe.update({"partidos_hacoaj_jugadores": len(f_jug), "partidos_hacoaj_goles": len(f_gol),
                    "partidos_hacoaj_cambios": len(f_cam), "partidos_hacoaj_tarjetas": len(f_tar)})
    informe["_notas"] = [
        f"goles con minuto desconocido (era el número de orden): {minutos_desconocidos}",
        f"cambios sin minuto calculable: {cambios_sin_minuto}",
        f"cambios que solo declara una de las dos filas: {cambios_huerfanos}",
    ]

    # ── Multimedia y eventos (archivos del servidor de la v1, si se descargaron) ──
    multimedia = archivo_de_entrada("multimedia_meta.json")
    if multimedia:
        meta = json.loads(multimedia.read_text(encoding="utf-8"))
        filas_m = []
        for f, bloque in meta.items():
            if f not in pid_de:
                avisar(f"multimedia de una fecha sin partido: {f}")
                continue
            for v in bloque.get("videos", []):
                filas_m.append([uid("mm", f, str(v.get("id"))), pid_de[f], "video", v.get("titulo") or "Video", v.get("drive_id"), None])
            for l in bloque.get("links", []):
                filas_m.append([uid("mm", f, str(l.get("id") or l.get("url"))), pid_de[f], "link", l.get("titulo") or "Link", None, l.get("url")])
        sql["multimedia"] = insertar(
            "public.partidos_hacoaj_multimedia",
            [("id", "uuid"), ("partido_id", "uuid"), ("tipo", "text"), ("titulo", "text"), ("drive_id", "text"), ("url", "text")], filas_m)
        informe["partidos_hacoaj_multimedia"] = len(filas_m)
    else:
        avisar("NO se importa multimedia (videos/links de partidos): `multimedia_meta.json` vive en el servidor de la v1 "
               "(PythonAnywhere); dejarlo en scripts/importar/entradas/ y volver a correr.")
    eventos = archivo_de_entrada("eventos_calendario.json")
    if eventos:
        lista = json.loads(eventos.read_text(encoding="utf-8"))
        filas_e = [[uid("ev", str(e.get("id"))), e["fecha"], e["titulo"], e.get("icono") or "evento"] for e in lista]
        sql["eventos"] = insertar("public.eventos_calendario", [("id", "uuid"), ("fecha", "date"), ("titulo", "text"), ("icono", "text")], filas_e)
        informe["eventos_calendario"] = len(filas_e)
    else:
        avisar("NO se importan eventos propios del calendario: `eventos_calendario.json` no se encontró (si nunca se usó esa función en la v1, no pasa nada).")

    # ── Métricas físicas ──
    def del_jugador(r, donde):
        return personas.resolver(r["jugador"], donde)

    filas = []
    for tipo, nombre, f_test, vmp, carga, rm, frel in (
        ("pecho", "Fuerza Pecho", "fecha pecho", "vmp pecho", "c externa pecho", "rm estimado pecho", "f relativa (1,3) pecho"),
        ("sentadilla", "Fuerza Sentadilla", "fecha sent", "vmp sentadilla", "c externa sent", "rm estimado sent", "f relativa (1,8/2) sent"),
    ):
        for r in hoja(libro, nombre):
            p = del_jugador(r, nombre)
            if p is None:
                continue
            f = fecha(r[f_test])
            rm_ = numero(r[rm])
            fr = numero(r[frel])
            if fr == 0 and rm_ is None:   # un 0 sin RM es "sin dato"
                fr = None
            filas.append([uid("fz", tipo, p, f), p, tipo, f, numero(r["peso"]), numero(r[carga]), numero(r[vmp]), rm_, fr,
                          fecha(r["fecha peso"]), texto(r["comentario"])])
    sql["fuerza"] = insertar(
        "public.fuerza_tests",
        [("id", "uuid"), ("perfil_id", "uuid"), ("tipo", "public.tipo_fuerza"), ("fecha_test", "date"), ("peso", "numeric"),
         ("carga_externa", "numeric"), ("vmp", "numeric"), ("rm_estimado", "numeric"), ("f_relativa", "numeric"),
         ("fecha_peso", "date"), ("comentario", "text")], filas)
    informe["fuerza_tests"] = len(filas)

    filas = []
    ultima_talla = {}
    for r in hoja(libro, "Pliegues"):
        p = del_jugador(r, "Pliegues")
        if p is None:
            continue
        f = fecha(r["fecha pliegue"])
        talla = numero(r["talla"])
        if talla is not None and (p not in ultima_talla or f > ultima_talla[p][0]):
            ultima_talla[p] = (f, talla)
        filas.append([uid("pl", p, f), p, f, numero(r["peso"]), talla, numero(r["pl tricipital"]), numero(r["pl subescapular"]),
                      numero(r["pl supraespinal"]), numero(r["pl abdominal"]), numero(r["pl muslo"]), numero(r["pl pantorrilla"]),
                      numero(r["sumatoria 6 pl"]), numero(r["peso ideal"]), texto(r["comentario"])])
    sql["pliegues"] = insertar(
        "public.pliegues",
        [("id", "uuid"), ("perfil_id", "uuid"), ("fecha", "date"), ("peso", "numeric"), ("talla", "numeric"),
         ("pl_tricipital", "numeric"), ("pl_subescapular", "numeric"), ("pl_supraespinal", "numeric"),
         ("pl_abdominal", "numeric"), ("pl_muslo", "numeric"), ("pl_pantorrilla", "numeric"),
         ("sumatoria_6", "numeric"), ("peso_ideal", "numeric"), ("comentario", "text")], filas)
    informe["pliegues"] = len(filas)
    difieren = 0
    for p, (_, talla) in ultima_talla.items():
        perfil = next(x for x in personas.perfiles if x["id"] == p)
        if perfil["altura"] is not None and abs(perfil["altura"] - talla) > 0.5:
            difieren += 1
    if difieren:
        avisar(f"{difieren} jugador(es) con altura distinta entre 'Usuarios' y su último pliegue; el trigger deja la del pliegue")

    filas = []
    for r in hoja(libro, "Peso"):
        p = del_jugador(r, "Peso")
        if p is None:
            continue
        f = fecha(r["fecha peso"])
        filas.append([uid("pe", p, f), p, f, numero(r["peso"])])
    sql["pesos"] = insertar("public.pesos", [("id", "uuid"), ("perfil_id", "uuid"), ("fecha", "date"), ("peso", "numeric")], filas)
    informe["pesos"] = len(filas)

    # ── Encuestas ──
    filas = []
    for i, r in enumerate(hoja(libro, "Wellness")):
        p = del_jugador(r, "Wellness")
        if p is None:
            continue
        momento = fecha_hora(r["fecha wellness"])
        filas.append([uid("we", p, momento, str(i)), p, momento, entero(r["sueno"]), entero(r["estres"]), entero(r["fatiga"]),
                      entero(r["dolor"]), texto(r["comentario wellness"])])
    sql["wellness"] = insertar(
        "public.wellness",
        [("id", "uuid"), ("perfil_id", "uuid"), ("fecha", "timestamptz"), ("sueno", "smallint"), ("estres", "smallint"),
         ("fatiga", "smallint"), ("dolor", "smallint"), ("comentario", "text")], filas)
    informe["wellness"] = len(filas)

    grupos = defaultdict(list)
    for r in hoja(libro, "Post partido"):
        p = del_jugador(r, "Post partido")
        if p is None:
            continue
        grupos[(p, fecha(r["fecha partido"]), fecha(r["fecha encuesta"]))].append(r)
    f_pp, f_golpes = [], []
    for (p, fp, fe), rows in grupos.items():
        base = rows[0]
        pp_id = uid("pp", p, fp, fe)
        f_pp.append([pp_id, p, fp, fe, base["como llegaste al partido"].strip(), base["carga emocional"].strip(),
                     base["carga fisica"].strip(), texto(base["categoria"]), entero(base["minutos"]),
                     texto(base["comentarios del jugador"])])
        for j, r in enumerate(rows):
            if texto(r["tipo golpe"]):
                f_golpes.append([uid("gp", pp_id, str(j)), pp_id, r["tipo golpe"].strip(), texto(r["ubicacion golpe"]),
                                 texto(r["lado golpe"]), texto(r["comentario lesion"])])
    sql["post_partido"] = insertar(
        "public.post_partido",
        [("id", "uuid"), ("perfil_id", "uuid"), ("fecha_partido", "date"), ("fecha_encuesta", "date"), ("llegada", "text"),
         ("carga_emocional", "text"), ("carga_fisica", "text"), ("categoria", "text"), ("minutos", "smallint"),
         ("comentario", "text")], f_pp)
    sql["golpes"] = insertar(
        "public.post_partido_golpes",
        [("id", "uuid"), ("post_partido_id", "uuid"), ("tipo_golpe", "text"), ("ubicacion_golpe", "text"),
         ("lado_golpe", "text"), ("comentario_lesion", "text")], f_golpes)
    informe["post_partido"] = len(f_pp)
    informe["post_partido_golpes"] = len(f_golpes)

    # ── Torneo (SQLite + JSON del scraper) ──
    cnt = lambda s: entero(s)
    sql["t_equipos"] = insertar("public.torneo_equipos", [("id", "integer"), ("nombre", "text"), ("categoria", "text"), ("url_slug", "text")],
                                [[e["equipo_id"], e["nombre"], e["categoria"], e["url_slug"]] for e in q("select * from equipos")])
    jugadores = q("select * from jugadores")
    vinculos = vincular_torneo(q, jugadores, personas, equiv, informe)
    sql["t_jugadores"] = insertar(
        "public.torneo_jugadores",
        [("id", "integer"), ("nombre_completo", "text"), ("fecha_nacimiento", "date"), ("puesto", "text"), ("url_slug", "text"),
         ("perfil_id", "uuid")],
        [[j["jugador_id"], j["nombre_completo"], j["fecha_nacimiento"], j["puesto"], j["url_slug"], vinculos.get(j["jugador_id"])] for j in jugadores])
    sql["t_je"] = insertar(
        "public.torneo_jugador_equipo",
        [("jugador_id", "integer"), ("equipo_id", "integer"), ("temporada", "smallint"), ("club_nombre", "text")],
        [[x["jugador_id"], x["equipo_id"], cnt(x["temporada"]), x["club_nombre"]] for x in q("select * from jugador_equipo")])
    equipos_ids = {e["equipo_id"] for e in q("select equipo_id from equipos")}
    ppartidos = q("select * from partidos")
    sql["t_partidos"] = insertar(
        "public.torneo_partidos",
        [("id", "integer"), ("fecha", "date"), ("hora", "text"), ("torneo", "text"), ("jornada", "smallint"), ("estadio", "text"),
         ("arbitro", "text"), ("equipo_local", "text"), ("equipo_visitante", "text"), ("equipo_local_id", "integer"),
         ("equipo_visitante_id", "integer"), ("goles_local", "smallint"), ("goles_visitante", "smallint"), ("url", "text")],
        [[p["partido_id"], p["fecha"], p["hora"], p["torneo"], p["jornada"], p["estadio"], texto(p["arbitro"]), p["equipo_local"],
          p["equipo_visitante"], p["equipo_local_id"] if p["equipo_local_id"] in equipos_ids else None,
          p["equipo_visitante_id"] if p["equipo_visitante_id"] in equipos_ids else None, p["goles_local"], p["goles_visitante"], p["url"]]
         for p in ppartidos])
    ent = lambda v: None if v in (None, "") else (int(v) if str(v).lstrip("-").isdigit() else None)
    sql["t_apariciones"] = insertar(
        "public.torneo_apariciones",
        [("jugador_id", "integer"), ("partido_id", "integer"), ("titular", "boolean"), ("minuto_ingreso", "smallint"),
         ("minuto_salida", "smallint"), ("minutos_jugados", "smallint"), ("goles", "smallint"), ("amarilla", "smallint"),
         ("roja", "smallint"), ("es_ambiguo", "boolean"), ("equipo_en_partido", "text"), ("numero_camiseta", "smallint"),
         ("posicion_partido", "text")],
        [[a["jugador_id"], a["partido_id"], bool(a["titular"]), ent(a["minuto_ingreso"]), ent(a["minuto_salida"]),
          ent(a["minutos_jugados"]), ent(a["goles"]) or 0, ent(a["amarilla"]) or 0, ent(a["roja"]) or 0, bool(a["es_ambiguo"]),
          a["equipo_en_partido"], ent(a["numero_camiseta"]), a["posicion_partido"]] for a in q("select * from apariciones")])
    sql["t_goles"] = insertar(
        "public.torneo_goles",
        [("partido_id", "integer"), ("jugador_nombre", "text"), ("equipo_abrev", "text"), ("minuto", "smallint"), ("en_contra", "boolean")],
        [[g["partido_id"], g["jugador_nombre"], g["equipo_abrev"], ent(g["minuto"]), bool(g["en_contra"])] for g in q("select * from goles")])
    sql["t_cambios"] = insertar(
        "public.torneo_cambios",
        [("partido_id", "integer"), ("equipo_abrev", "text"), ("jugador_entra", "text"), ("jugador_sale", "text"), ("minuto", "smallint")],
        [[c["partido_id"], c["equipo_abrev"], c["jugador_entra"], c["jugador_sale"], ent(c["minuto"])] for c in q("select * from cambios")])
    sql["t_tarjetas"] = insertar(
        "public.torneo_tarjetas",
        [("partido_id", "integer"), ("jugador_nombre", "text"), ("equipo_abrev", "text"), ("tipo", "text"), ("minuto", "smallint")],
        [[t["partido_id"], t["jugador_nombre"], t["equipo_abrev"], t["tipo"].lower(), ent(t["minuto"])] for t in q("select * from tarjetas")])

    pos = json.loads((V1 / "data" / "posiciones.json").read_text(encoding="utf-8"))
    sql["t_posiciones"] = insertar(
        "public.torneo_posiciones",
        [("temporada", "smallint"), ("zona", "text"), ("posicion", "smallint"), ("equipo", "text"), ("pts", "smallint"), ("j", "smallint"),
         ("g", "smallint"), ("e", "smallint"), ("p", "smallint"), ("gf", "smallint"), ("gc", "smallint"), ("dif", "smallint")],
        [[hoy, x["Zona"], entero(x["Pos"]), x["Equipo"], entero(x["Pts"]), entero(x["J"]), entero(x["G"]), entero(x["E"]),
          entero(x["P"]), entero(x["GF"]), entero(x["GC"]), entero(x["Dif"])] for x in pos])
    gol = json.loads((V1 / "data" / "goleadores.json").read_text(encoding="utf-8"))
    sql["t_goleadores"] = insertar(
        "public.torneo_goleadores",
        [("temporada", "smallint"), ("posicion", "smallint"), ("jugador", "text"), ("equipo", "text"), ("goles", "smallint")],
        [[hoy, entero(x["Pos"]), x["Jugador"], x["Equipo"], entero(x["Goles"])] for x in gol],
        "on conflict (temporada, jugador, equipo) do nothing")
    for k, v in (("torneo_equipos", len(equipos_ids)), ("torneo_jugadores", len(jugadores)), ("torneo_partidos", len(ppartidos)),
                 ("torneo_posiciones", len(pos)), ("torneo_goleadores", len(gol))):
        informe[k] = v
    for k, tabla in (("torneo_apariciones", "apariciones"), ("torneo_goles", "goles"), ("torneo_cambios", "cambios"),
                     ("torneo_tarjetas", "tarjetas"), ("torneo_jugador_equipo", "jugador_equipo")):
        informe[k] = q(f"select count(*) as n from {tabla}")[0]["n"]


def vincular_torneo(q, jugadores, personas, equiv, informe):
    """torneo_jugadores.perfil_id para los del plantel de Hacoaj (solo ellos, para no confundir homónimos)."""
    plantel = {x["jugador_id"] for x in q("select jugador_id from jugador_equipo where equipo_id = ?", HACOAJ_EQUIPO_ID)}
    perfiles = [(p["id"], norm(p["nombre"]).split()) for p in personas.perfiles if p["rol"] == "jugador"]
    manual = {k: norm(v) for k, v in equiv.get("torneo", {}).items()}
    vinculos, sin, ambiguos = {}, [], []
    for j in jugadores:
        if j["jugador_id"] not in plantel:
            continue
        nombre = j["nombre_completo"]
        if nombre in manual:
            perfil = personas.por_norm.get(manual[nombre])
            if perfil is None:
                fallar(f"equivalencia de torneo inválida: {nombre}")
            else:
                vinculos[j["jugador_id"]] = perfil["id"]
            continue
        ap, _, no = nombre.partition(",")
        toks = set(norm(f"{no} {ap}").split())
        cand = [pid for pid, t in perfiles if t and t[0] in toks and t[-1] in toks]
        if len(cand) == 1:
            vinculos[j["jugador_id"]] = cand[0]
        elif len(cand) > 1:
            ambiguos.append(nombre)
        else:
            sin.append(nombre)
    usados = Counter(vinculos.values())
    for pid, c in usados.items():
        if c > 1:
            fallar(f"un perfil quedó vinculado a {c} jugadores del torneo ({pid})")
    informe["torneo_jugadores_vinculados_a_perfil"] = len(vinculos)
    informe["_torneo_plantel_sin_perfil"] = sin
    if ambiguos:
        avisar(f"jugadores del torneo con más de un perfil posible (sin vincular): {ambiguos}")
    return vinculos


# ───────────────────────── Armado del archivo SQL ─────────────────────────
def construir_sql(personas, sql, informe, modo):
    ids_perfiles = [p["id"] for p in personas.perfiles]
    perfiles_filas = [[p["id"], p["auth_user_id"], p["usuario"], p["nombre"], p["rol"], p["posicion"], p["pierna_habil"],
                       p["fecha_nacimiento"], p["altura"], p["estado"]] for p in personas.perfiles]
    cuentas = [[uid_, login, h] for login, uid_, h in personas.cuentas]
    cuentas_reales = personas.cuentas and [(l, u) for l, u, _ in personas.cuentas] or []

    partes = ["begin;\n"]
    partes.append("-- Limpieza: se vuelve a cargar todo lo importado (los datos y cuentas de prueba incluidos)\n")
    for t in ("post_partido", "wellness", "fuerza_tests", "pliegues", "pesos", "partidos_hacoaj", "torneo_partidos",
              "torneo_jugadores", "torneo_equipos", "torneo_posiciones", "torneo_goleadores"):
        partes.append(f"delete from public.{t};\n")
    if "eventos" in sql:
        partes.append("delete from public.eventos_calendario;\n")
    # Todo perfil que no viene de la importación se elimina (los de prueba, por ejemplo).
    partes.append(
        "delete from public.perfiles where id <> all(array[" + ",".join(f"'{i}'::uuid" for i in ids_perfiles) + "]);\n"
    )
    # Cuentas de login de prueba (jugador@, tecnico@ y admin@): se eliminan. Si un usuario real se llama igual
    # (por ejemplo 'admin'), su cuenta tiene otro id y se crea después, así que no se confunden.
    ids_cuentas = ",".join(f"'{u}'::uuid" for _, u in cuentas_reales) or "null"
    emails_prueba = ", ".join(f"'{n}@{DOMINIO}'" for n in CUENTAS_DE_PRUEBA)
    partes.append(f"delete from auth.users where email in ({emails_prueba}) and id <> all(array[{ids_cuentas}]);\n")
    # Cuentas de login (hash bcrypt: nunca texto plano). Mismo formato que crea el panel de Supabase.
    cuerpo = json.dumps(cuentas, ensure_ascii=False, separators=(",", ":"))
    partes.append(
        "insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data,\n"
        "  raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change,\n"
        "  email_change_token_current, phone_change, phone_change_token, reauthentication_token, is_sso_user, is_anonymous)\n"
        f"select '00000000-0000-0000-0000-000000000000', (v->>0)::uuid, 'authenticated', 'authenticated', (v->>1) || '@{DOMINIO}', v->>2,\n"
        "  now(), '{\"provider\":\"email\",\"providers\":[\"email\"]}'::jsonb, '{\"email_verified\":true}'::jsonb, now(), now(),\n"
        "  '', '', '', '', '', '', '', '', false, false\n"
        f"from jsonb_array_elements($j${cuerpo}$j$::jsonb) as v\n"
        "on conflict (id) do update set email = excluded.email, encrypted_password = excluded.encrypted_password, updated_at = now();\n"
    )
    partes.append(
        "insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)\n"
        "select (v->>0)::uuid, (v->>0)::uuid, v->>0, 'email',\n"
        f"  jsonb_build_object('sub', v->>0, 'email', (v->>1) || '@{DOMINIO}', 'email_verified', false, 'phone_verified', false),\n"
        "  now(), now(), now()\n"
        f"from jsonb_array_elements($j${json.dumps([[c[0], c[1]] for c in cuentas], ensure_ascii=False, separators=(',', ':'))}$j$::jsonb) as v\n"
        "on conflict (provider_id, provider) do nothing;\n"
    )
    partes.append(insertar(
        "public.perfiles",
        [("id", "uuid"), ("auth_user_id", "uuid"), ("usuario", "text"), ("nombre", "text"), ("rol", "public.rol_usuario"), ("posicion", "text"),
         ("pierna_habil", "text"), ("fecha_nacimiento", "date"), ("altura", "numeric"), ("estado", "public.estado_perfil")],
        perfiles_filas,
        "on conflict (id) do update set auth_user_id = excluded.auth_user_id, usuario = excluded.usuario, nombre = excluded.nombre, rol = excluded.rol, "
        "posicion = excluded.posicion, pierna_habil = excluded.pierna_habil, fecha_nacimiento = excluded.fecha_nacimiento, "
        "altura = excluded.altura, estado = excluded.estado"))
    # Orden que respeta las claves foráneas
    for clave in ("t_equipos", "t_jugadores", "t_je", "t_partidos", "t_apariciones", "t_goles", "t_cambios", "t_tarjetas",
                  "t_posiciones", "t_goleadores", "partidos", "pj", "goles", "cambios", "tarjetas", "multimedia", "eventos",
                  "fuerza", "pliegues", "pesos", "wellness", "post_partido", "golpes"):
        if clave in sql:
            partes.append(sql[clave])
    tablas = ["perfiles", "partidos_hacoaj", "partidos_hacoaj_jugadores", "partidos_hacoaj_goles", "partidos_hacoaj_cambios",
              "partidos_hacoaj_tarjetas", "fuerza_tests", "pliegues", "pesos", "wellness", "post_partido", "post_partido_golpes",
              "torneo_equipos", "torneo_jugadores", "torneo_jugador_equipo", "torneo_partidos", "torneo_apariciones", "torneo_goles",
              "torneo_cambios", "torneo_tarjetas", "torneo_posiciones", "torneo_goleadores"]
    cuenta = ", ".join(f"'{t}', (select count(*) from public.{t})" for t in tablas)
    partes.append(f"select jsonb_build_object({cuenta}, 'auth_users', (select count(*) from auth.users)) as conteos;\n")
    partes.append("commit;\n" if modo == "real" else "rollback;\n")
    return "".join(partes)


def ejecutar(archivo):
    npx = shutil.which("npx.cmd") or shutil.which("npx") or r"C:\Program Files\nodejs\npx.cmd"
    env = dict(os.environ)
    env["PATH"] = r"C:\Program Files\nodejs;" + env.get("PATH", "")
    r = subprocess.run([npx, "--yes", "supabase@latest", "db", "query", "--linked", "-f", str(archivo)],
                       cwd=RAIZ, capture_output=True, text=True, encoding="utf-8", env=env)
    salida = (r.stdout or "") + (r.stderr or "")
    m = re.search(r'\{\s*"boundary".*\}', salida, re.S)
    if r.returncode != 0 or m is None:
        return False, salida
    return True, json.loads(m.group(0))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--modo", choices=["simulacro", "real"], default="simulacro")
    ap.add_argument("--confirmo", action="store_true", help="necesario con --modo real")
    ap.add_argument("--solo-generar", action="store_true", help="arma el SQL pero no lo ejecuta")
    args = ap.parse_args()
    if args.modo == "real" and not args.confirmo:
        sys.exit("--modo real BORRA y vuelve a cargar los datos importados: agregá --confirmo si es lo que querés.")

    equiv_path = AQUI / "equivalencias.json"
    if not equiv_path.exists():
        sys.exit(f"Falta {equiv_path} (equivalencias de nombres; no se sube a git).")
    equiv = json.loads(equiv_path.read_text(encoding="utf-8"))

    print("Leyendo la hoja de cálculo y el SQLite…")
    libro = abrir_libro()
    personas = Personas(hoja(libro, "Usuarios"), equiv)
    sql, informe = {}, {}
    armar(libro, equiv, personas, sql, informe)

    for (nombre, donde), n in sorted(personas.pendientes.items()):
        fallar(f"nombre sin resolver ({donde}): {nombre!r} ×{n}")
    informe["perfiles"] = len(personas.perfiles)
    informe["cuentas_de_login"] = len(personas.cuentas)

    texto_sql = construir_sql(personas, sql, informe, args.modo)
    salida = AQUI / "salida"
    salida.mkdir(exist_ok=True)
    archivo = salida / "importacion.sql"
    archivo.write_text(texto_sql, encoding="utf-8")
    print(f"SQL generado: {len(texto_sql) / 1e6:.2f} MB (límite del CLI ≈ {LIMITE_SQL / 1e6:.1f} MB) -> {archivo}")
    if len(texto_sql.encode('utf-8')) > LIMITE_SQL:
        fallar("el SQL supera el límite de tamaño del CLI")

    print("\n== Filas a cargar ==")
    for k in sorted(k for k in informe if not k.startswith("_")):
        print(f"  {k:42} {informe[k]}")
    for n in informe.get("_notas", []):
        print("  ·", n)
    sin = informe.get("_torneo_plantel_sin_perfil", [])
    print(f"\nJugadores del plantel de Hacoaj en el scraper SIN perfil ({len(sin)}): {sin}")

    if ADVERTENCIAS:
        print("\n== Advertencias ==")
        for a in ADVERTENCIAS:
            print("  ⚠", a)
    if ERRORES:
        print("\n== ERRORES (no se ejecuta nada) ==")
        for e in sorted(set(ERRORES)):
            print("  ✗", e)
        sys.exit(1)
    if args.solo_generar:
        return

    print(f"\nEjecutando en modo {args.modo.upper()} contra Supabase…")
    ok, resultado = ejecutar(archivo)
    if not ok:
        print("✗ LA BASE RECHAZÓ LA CARGA (no se guardó nada):\n", resultado[-2500:])
        sys.exit(1)
    filas = resultado["rows"][0]["conteos"] if isinstance(resultado, dict) and resultado.get("rows") else resultado
    print("\n== Lo que quedó DENTRO de la transacción ==")
    for k, v in filas.items():
        print(f"  {k:30} {v}")
    print("\n" + ("✓ Importación REAL guardada." if args.modo == "real" else "✓ Simulacro OK: la base aceptó todo y se revirtió (no se guardó nada)."))


if __name__ == "__main__":
    main()
