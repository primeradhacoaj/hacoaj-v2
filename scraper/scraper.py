"""
Scraper de Solo Ascenso - Promocional Amateur (Primera D)
Extrae: equipos, jugadores, partidos, goles, cambios, tarjetas, apariciones.
Solo carga data de jugadores activos (en planteles actuales).
"""

import requests
from bs4 import BeautifulSoup
import sqlite3
import csv
import os
import re
import time
import json

BASE = "https://www.soloascenso.com.ar"
# Carpeta de trabajo: acá van la base SQLite que arma el scraper, los CSV, el log y los checkpoints (el
# estado de lo ya scrapeado). No se versionan: `ejecutar.py` los baja de Supabase antes de correr y los
# sube después. Se puede cambiar con la variable de entorno TRABAJO.
TRABAJO = os.environ.get("TRABAJO", "trabajo")
DB_PATH = os.path.join(TRABAJO, "primera_d.db")
CSV_DIR = os.path.join(TRABAJO, "csvs")
LOG_FILE = os.path.join(TRABAJO, "scraper_log.txt")
CHECKPOINT_DIR = os.path.join(TRABAJO, "checkpoints")
DELAY = 1.0

os.makedirs(TRABAJO, exist_ok=True)
os.makedirs(CSV_DIR, exist_ok=True)
os.makedirs(CHECKPOINT_DIR, exist_ok=True)


def save_checkpoint(name, data):
    path = os.path.join(CHECKPOINT_DIR, f"{name}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)


def load_checkpoint(name):
    path = os.path.join(CHECKPOINT_DIR, f"{name}.json")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None

session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
})


def log(msg):
    print(msg)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(msg + "\n")


fetch_stats = {"ok": 0, "timeout": 0, "error": 0}
_consecutive_timeouts = 0

def fetch(url):
    """Fetch URL with retry and delay."""
    global _consecutive_timeouts
    max_retries = 1 if _consecutive_timeouts >= 3 else 2
    for attempt in range(max_retries):
        try:
            time.sleep(DELAY)
            r = session.get(url, timeout=10)
            r.raise_for_status()
            fetch_stats["ok"] += 1
            _consecutive_timeouts = 0
            return BeautifulSoup(r.text, "html.parser")
        except requests.exceptions.Timeout:
            fetch_stats["timeout"] += 1
            _consecutive_timeouts += 1
            log(f"  TIMEOUT {url} (attempt {attempt+1}){' [servidor lento]' if _consecutive_timeouts >= 3 else ''}")
            time.sleep(1)
        except Exception as e:
            fetch_stats["error"] += 1
            _consecutive_timeouts = 0
            log(f"  ERROR fetch {url}: {e} (attempt {attempt+1})")
            time.sleep(1)
    return None


def extract_id_from_href(href):
    """Extract numeric ID from href like /../perfil/eitan-ryba/29334"""
    parts = href.rstrip("/").split("/")
    for p in reversed(parts):
        if p.isdigit():
            return int(p)
    return None


def extract_slug_from_href(href):
    """Extract slug from href like /../perfil/eitan-ryba/29334"""
    parts = href.rstrip("/").split("/")
    for i, p in enumerate(parts):
        if p == "perfil" and i + 1 < len(parts):
            return parts[i + 1]
        if p == "club" and i + 1 < len(parts):
            return parts[i + 1]
    return None


# ================================================================
# PASO 1: Obtener equipos del Promocional Amateur
# ================================================================
def get_teams():
    log("=== PASO 1: Obteniendo equipos ===")
    soup = fetch(f"{BASE}/categoria/promocional-amateur/4")
    if not soup:
        return []

    teams = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if "/club/" in href:
            equipo_id = extract_id_from_href(href)
            slug = extract_slug_from_href(href)
            # Name is in the img title attribute, not in the <a> text
            img = a.find("img")
            nombre = img.get("title", "").strip() if img else a.get_text(strip=True)
            if equipo_id and nombre:
                teams.append((equipo_id, nombre, "Promocional Amateur", slug))

    # Dedup by ID
    seen = set()
    unique = []
    for t in teams:
        if t[0] not in seen:
            seen.add(t[0])
            unique.append(t)
            log(f"  Equipo: {t[1]} (ID: {t[0]})")

    return unique


# ================================================================
# PASO 2: Obtener planteles (jugadores de cada equipo)
# ================================================================
def get_roster(equipo_id, equipo_slug, equipo_nombre):
    log(f"  Plantel de {equipo_nombre}...")
    soup = fetch(f"{BASE}/club/{equipo_slug}/{equipo_id}")
    if not soup:
        return []

    players = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if "/perfil/" in href:
            jid = extract_id_from_href(href)
            slug = extract_slug_from_href(href)
            if jid and slug:
                # Player name is in the parent article text, not in the <a> tag
                parent_article = a.parent
                parent_text = parent_article.get_text(strip=True) if parent_article else ""
                players.append((jid, slug, equipo_id, parent_text))

    # Dedup
    seen = set()
    unique = []
    for p in players:
        if p[0] not in seen:
            seen.add(p[0])
            unique.append((p[0], p[1], p[2]))  # (jid, slug, equipo_id)

    log(f"    -> {len(unique)} jugadores encontrados")
    return unique


# ================================================================
# PASO 3: Obtener perfil de cada jugador + sus match URLs
# ================================================================
def get_player_profile(jugador_id, slug):
    soup = fetch(f"{BASE}/perfil/{slug}/{jugador_id}")
    if not soup:
        return None, []

    # Extract profile data
    profile = {"jugador_id": jugador_id, "url_slug": slug}
    labels_map = {
        "Nombre Completo:": "nombre_completo",
        "Club:": "club",
        "Edad:": "edad",
        "Fecha de Nacimiento:": "fecha_nacimiento",
        "Puesto:": "puesto",
        "Temporada:": "temporada",
    }

    for p_tag in soup.find_all("p", class_="encabezado"):
        label = p_tag.get_text(strip=True)
        if label in labels_map:
            nxt = p_tag.find_next_sibling("p", class_="item")
            if nxt:
                profile[labels_map[label]] = nxt.get_text(strip=True)

    # Extract match URLs
    match_urls = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if "/sintesis/" in href:
            match_id = extract_id_from_href(href)
            if match_id:
                # Normalize URL
                if href.startswith("/.."):
                    href = href[3:]
                elif href.startswith(".."):
                    href = href[2:]
                if not href.startswith("/"):
                    href = "/" + href
                match_urls.append((match_id, href))

    # Dedup match URLs
    seen = set()
    unique_matches = []
    for mid, href in match_urls:
        if mid not in seen:
            seen.add(mid)
            unique_matches.append((mid, href))

    return profile, unique_matches


# ================================================================
# PASO 4: Parsear síntesis de partido
# ================================================================
def parse_synthesis(partido_id, url_path):
    full_url = BASE + url_path
    soup = fetch(full_url)
    if not soup:
        return None

    match_data = {"partido_id": partido_id}

    # Match info div (date, time, matchday, tournament, stadium, referee)
    for div in soup.find_all("div"):
        text = div.get_text(strip=True)
        if "Fecha" in text and "Estadio:" in text and len(text) < 500:
            match_data["info_raw"] = text
            # Parse: "13.06.26 | 15:33 | Fecha 3 | Promocional Amateur | Estadio: ... | Árbitro: ..."
            parts = [p.strip() for p in text.split("|")]
            for part in parts:
                date_m = re.search(r"\d{2}\.\d{2}\.\d{2}", part)
                time_m = re.search(r"\d{2}:\d{2}", part)
                if date_m and "fecha_raw" not in match_data:
                    match_data["fecha_raw"] = date_m.group()
                elif time_m and "hora" not in match_data:
                    match_data["hora"] = part
                elif part.startswith("Fecha"):
                    try:
                        match_data["jornada"] = int(re.search(r"\d+", part).group())
                    except:
                        pass
                elif "Estadio:" in part:
                    match_data["estadio"] = part.replace("Estadio:", "").strip()
                elif "rbitro:" in part:  # Á or A
                    match_data["arbitro"] = part.split(":")[-1].strip()
                elif "Promocional" in part or "Amateur" in part or "Primera" in part:
                    match_data["torneo"] = part.strip()
            break

    # Convert date
    if "fecha_raw" in match_data:
        raw = match_data["fecha_raw"]
        m = re.match(r"(\d{2})\.(\d{2})\.(\d{2})", raw)
        if m:
            d, mo, y = m.groups()
            year = int(y)
            if year < 50:
                year += 2000
            else:
                year += 1900
            match_data["fecha"] = f"{year}-{mo}-{d}"

    # Team names from <p> tags before formations
    team_ps = []
    for p in soup.find_all("p"):
        text = p.get_text(strip=True)
        # Team name paragraphs are usually short and before h3
        if text and 3 < len(text) < 60 and not any(c in text for c in [":", "|", "Gol", "Camb", "Amon"]):
            cls = " ".join(p.get("class", []))
            if not cls or "equipo" in cls.lower() or "nombre" in cls.lower():
                team_ps.append(text)

    # Score - look for score pattern
    score_div = soup.find("div", class_=re.compile("resultado|score|marcador", re.I))

    # Teams and formations from h3 headers
    h3s = soup.find_all("h3")
    teams_formations = []

    for h3 in h3s:
        team_name = h3.get_text(strip=True)
        parent = h3.parent
        if not parent:
            continue

        titulares = []
        suplentes = []
        dt = None

        for article in parent.find_all("article"):
            cls = " ".join(article.get("class", []))
            text = article.get_text(strip=True)

            # Extract player name: format is "1Eitan Ryba (22)" or "DTMatías Conti (36)"
            if text.startswith("DT"):
                dt_match = re.match(r"DT(.+?)(?:\((\d+)\))?$", text)
                if dt_match:
                    dt = dt_match.group(1).strip()
            else:
                player_match = re.match(r"(\d+)(.+?)(?:\((\d+)\))?$", text)
                if player_match:
                    number = int(player_match.group(1))
                    name = player_match.group(2).strip()
                    age = int(player_match.group(3)) if player_match.group(3) else None
                    position_cls = cls  # arquero, defensor, mediocampista, delantero, suplente

                    player_info = {
                        "number": number,
                        "name": name,
                        "age": age,
                        "position": position_cls,
                    }

                    if "suplente" in cls:
                        suplentes.append(player_info)
                    else:
                        titulares.append(player_info)

        teams_formations.append({
            "name": team_name,
            "titulares": titulares,
            "suplentes": suplentes,
            "dt": dt,
        })

    if len(teams_formations) >= 2:
        match_data["equipo_local"] = teams_formations[0]["name"]
        match_data["equipo_visitante"] = teams_formations[1]["name"]
        match_data["formacion_local"] = teams_formations[0]
        match_data["formacion_visitante"] = teams_formations[1]

    # Goals, substitutions, cards from p.estadis
    for p in soup.find_all("p", class_="estadis"):
        text = p.get_text(strip=True)

        if text.startswith("Goles:"):
            match_data["goles_raw"] = text[6:].strip()
        elif text.startswith("Cambios:"):
            match_data["cambios_raw"] = text[8:].strip()
        elif text.startswith("Amonestados:"):
            match_data["amonestados_raw"] = text[12:].strip()
        elif text.startswith("Expulsados:"):
            match_data["expulsados_raw"] = text[11:].strip()

    # Parse score from goal count or from page
    # Try to find score display
    for elem in soup.find_all(["span", "div", "p"]):
        text = elem.get_text(strip=True)
        score_match = re.match(r"^(\d+)\s*[-–]\s*(\d+)$", text)
        if score_match:
            match_data["goles_local"] = int(score_match.group(1))
            match_data["goles_visitante"] = int(score_match.group(2))
            break

    # Fallback: extract score from info_raw (e.g. "TeamA2TeamB107.06.26 | ...")
    if "goles_local" not in match_data and "info_raw" in match_data:
        raw = match_data["info_raw"]
        local = match_data.get("equipo_local", "")
        visit = match_data.get("equipo_visitante", "")
        if local and visit:
            idx_l = raw.find(local)
            idx_v = raw.find(visit)
            if idx_l >= 0 and idx_v > idx_l:
                between = raw[idx_l + len(local):idx_v]
                after = raw[idx_v + len(visit):]
                gl_m = re.match(r"^(\d+)$", between.strip())
                gv_m = re.match(r"^(\d+)(\d{2}\.\d{2}\.\d{2})", after)
                if gl_m and gv_m:
                    match_data["goles_local"] = int(gl_m.group(1))
                    match_data["goles_visitante"] = int(gv_m.group(1))

    # If no score found, count goals by team
    if "goles_local" not in match_data and "goles_raw" in match_data:
        local_name = match_data.get("equipo_local", "")
        visit_name = match_data.get("equipo_visitante", "")
        local_abrev = get_abrev(local_name)
        visit_abrev = get_abrev(visit_name)

        goles_local = 0
        goles_visit = 0
        for gol_text in match_data["goles_raw"].split(","):
            gol_text = gol_text.strip()
            if local_abrev and f"({local_abrev})" in gol_text:
                goles_local += 1
            elif visit_abrev and f"({visit_abrev})" in gol_text:
                goles_visit += 1
            # Handle autogol - counts for the other team
            if "autogol" in gol_text.lower():
                if local_abrev and f"({local_abrev})" in gol_text:
                    goles_local -= 1
                    goles_visit += 1
                elif visit_abrev and f"({visit_abrev})" in gol_text:
                    goles_visit -= 1
                    goles_local += 1

        match_data["goles_local"] = goles_local
        match_data["goles_visitante"] = goles_visit
    elif "goles_local" not in match_data:
        match_data["goles_local"] = 0
        match_data["goles_visitante"] = 0

    match_data["url_path"] = url_path

    # Detect "Formaciones Probables" vs "Formaciones Confirmadas"
    if "Probables" in match_data.get("info_raw", ""):
        match_data["formaciones_probables"] = True

    return match_data


def get_abrev(team_name):
    """Generate abbreviation from team name."""
    abrevs = {
        "Náutico Hacoaj": "NÁU",
        "Nautico Hacoaj": "NÁU",
        "Social Atlético Televisión": "SOC",
        "Social Atletico Television": "SOC",
        "Juventud de Bernal": "JUV",
        "Atlético Pilar": "ATL",
        "Atletico Pilar": "ATL",
        "Provincial (Lobos)": "PRO",
        "Barrancas FC": "BAR",
        "Everton (La Plata)": "EVE",
        "Deportivo Metalúrgico": "DEP",
        "Deportivo Metalurgico": "DEP",
        "AFA": "AFA",
        "Alumni De Los Hornos": "ALU",
        "Belgrano (Zárate)": "BEL",
        "Belgrano (Zarate)": "BEL",
        "Buenos Aires City FC": "BAC",
        "Control Orientado": "CON",
        "Defensores de Glew": "DGL",
        "Estrella de Berisso": "EST",
        "FC Ezeiza": "FCE",
        "Las Mandarinas (Brandsen)": "LMA",
        "Uribelarrea FC": "URI",
    }
    for key, val in abrevs.items():
        if key.lower() in team_name.lower() or team_name.lower() in key.lower():
            return val
    # Fallback: first 3 chars uppercase
    return team_name[:3].upper()


_GOAL_ANNOTATION_RE = re.compile(r"\s*(?:-p-|\(e/c\))\s*$", re.IGNORECASE)
_EN_CONTRA_RE = re.compile(r"\(e/c\)\s*$", re.IGNORECASE)


def strip_goal_annotation(name):
    """Remove trailing penal (-p-) / en contra ((e/c)) markers from a player
    name, so it matches cleanly against the active players roster."""
    return _GOAL_ANNOTATION_RE.sub("", name).strip()


def parse_goals(raw, partido_id):
    """Parse goals from raw string like: 40' Joaquín Melian (SOC), ...
    Also handles stoppage time as 90'+4 or 90'(+4), and strips penal/en
    contra markers (-p-, (e/c)) from the player name.
    Returns (partido_id, jugador, equipo, minuto, en_contra) tuples.
    Penal goals (-p-) still count as a normal goal for that player. Own
    goals ((e/c)) are flagged via en_contra=True so callers can show the
    event without attributing it to the player's personal goal tally."""
    if not raw:
        return []
    goals = []
    for part in raw.split(","):
        part = part.strip()
        m = re.match(r"(\d+)'?(?:\(?\+\d+\)?)?\s+(.+?)\s*\((\w+)\)", part)
        if m:
            minuto = int(m.group(1))
            raw_jugador = m.group(2).strip()
            en_contra = bool(_EN_CONTRA_RE.search(raw_jugador))
            jugador = strip_goal_annotation(raw_jugador)
            equipo = m.group(3)
            goals.append((partido_id, jugador, equipo, minuto, en_contra))
    return goals


def parse_substitutions(raw, partido_id):
    """Parse subs from raw string like: 55' Federico Leibovich x Hernán Schvarzman (NÁU), ...
    Also handles stoppage time as 90'+4 or 90'(+4)."""
    if not raw:
        return []
    subs = []
    for part in raw.split(","):
        part = part.strip()
        m = re.match(r"(\d+)'?(?:\(?\+\d+\)?)?\s+(.+?)\s+x\s+(.+?)\s*\((\w+)\)", part)
        if m:
            minuto = int(m.group(1))
            entra = m.group(2).strip()
            sale = m.group(3).strip()
            equipo = m.group(4)
            subs.append((partido_id, equipo, entra, sale, minuto))
    return subs


def parse_yellows(raw, partido_id):
    """Parse yellow cards: Manuel Zalcman (NÁU), Federico Goldstein (NÁU)"""
    if not raw:
        return []
    cards = []
    for part in raw.split(","):
        part = part.strip()
        m = re.match(r"(.+?)\s*\((\w+)\)", part)
        if m:
            jugador = m.group(1).strip()
            equipo = m.group(2)
            cards.append((partido_id, jugador, equipo, "amarilla", None))
    return cards


def parse_reds(raw, partido_id):
    """Parse red cards: 85' Matías Castillo (SOC) 85' Valentino Suaya (NÁU)
    Also handles stoppage time as 90'+4 or 90'(+4)."""
    if not raw:
        return []
    cards = []
    # Reds can be space-separated or comma-separated
    # Split by pattern: number' Name (TEAM)
    for m in re.finditer(r"(\d+)'?(?:\(?\+\d+\)?)?\s+(.+?)\s*\((\w+)\)", raw):
        minuto = int(m.group(1))
        jugador = strip_goal_annotation(m.group(2).strip())
        equipo = m.group(3)
        cards.append((partido_id, jugador, equipo, "roja", minuto))
    return cards


# ================================================================
# PASO 5: Resolver equipo_id desde nombre
# ================================================================
def resolve_team_id(name, teams_dict):
    """Try to match team name to ID. teams_dict = {name: id}"""
    if not name:
        return None
    # Direct match
    if name in teams_dict:
        return teams_dict[name]
    # Normalize and try
    name_lower = name.lower().strip()
    for tname, tid in teams_dict.items():
        if tname.lower() == name_lower:
            return tid
        # Partial match
        if name_lower in tname.lower() or tname.lower() in name_lower:
            return tid
    return None


# ================================================================
# PASO 6: Calcular apariciones de un jugador en un partido
# ================================================================
def calc_appearance(jugador_nombre, match_data, jugador_id):
    """
    Check if player appeared in match and calculate stats.
    Returns appearance dict or None if player didn't play.
    """
    partido_id = match_data["partido_id"]

    # Use name_keys for robust matching (handles compound apellidos and second names)
    jkeys = name_keys(jugador_nombre)
    jname_norm = normalize_name(jugador_nombre)

    def names_match(formation_name):
        """Check if formation_name matches jugador_nombre (handles compound apellidos and second-name mismatch)."""
        if normalize_name(formation_name) == jname_norm:
            return True
        if not jkeys:
            return False
        fkeys = name_keys(formation_name)
        return bool(jkeys & fkeys)

    # Keep normalize for sub/goal/card matching (those use first-name + apellido format)
    def normalize(n):
        return strip_accents(n.lower().strip())

    # Check both teams' formations
    for side in ["formacion_local", "formacion_visitante"]:
        formation = match_data.get(side)
        if not formation:
            continue
        equipo_nombre = match_data.get("equipo_local" if side == "formacion_local" else "equipo_visitante", "")

        # Check titulares
        for player in formation.get("titulares", []):
            if names_match(player["name"]):
                numero_camiseta = player.get("number")
                posicion_partido = player.get("position", "")
                minuto_salida = 90
                # Check if subbed out
                subs = parse_substitutions(match_data.get("cambios_raw", ""), partido_id)
                for _, equipo, entra, sale, minuto in subs:
                    if names_match(sale):
                        minuto_salida = minuto
                        break

                # Check cards
                amarilla = 0
                roja = 0
                yellows = parse_yellows(match_data.get("amonestados_raw", ""), partido_id)
                for _, jug, _, _, _ in yellows:
                    if names_match(jug):
                        amarilla = 1
                reds = parse_reds(match_data.get("expulsados_raw", ""), partido_id)
                for _, jug, _, _, min_r in reds:
                    if names_match(jug):
                        roja = 1
                        if minuto_salida == 90:
                            minuto_salida = min_r

                # Check goals
                goles = 0
                goals = parse_goals(match_data.get("goles_raw", ""), partido_id)
                for _, jug, _, _, en_contra in goals:
                    if names_match(jug) and not en_contra:
                        goles += 1

                return {
                    "jugador_id": jugador_id,
                    "partido_id": partido_id,
                    "titular": 1,
                    "minuto_ingreso": 0,
                    "minuto_salida": minuto_salida,
                    "minutos_jugados": minuto_salida,
                    "goles": goles,
                    "amarilla": amarilla,
                    "roja": roja,
                    "equipo_en_partido": equipo_nombre,
                    "numero_camiseta": numero_camiseta,
                    "posicion_partido": posicion_partido,
                }

        # Check suplentes that entered (only if player is in this team's suplentes)
        suplente_info = None
        for p in formation.get("suplentes", []):
            if names_match(p["name"]):
                suplente_info = p
                break
        if not suplente_info:
            continue
        subs = parse_substitutions(match_data.get("cambios_raw", ""), partido_id)
        for _, equipo, entra, sale, minuto_in in subs:
            if names_match(entra):
                minuto_salida = 90
                # Check if subbed out later
                for _, eq2, en2, sa2, min2 in subs:
                    if names_match(sa2) and min2 > minuto_in:
                        minuto_salida = min2
                        break

                amarilla = 0
                roja = 0
                yellows = parse_yellows(match_data.get("amonestados_raw", ""), partido_id)
                for _, jug, _, _, _ in yellows:
                    if names_match(jug):
                        amarilla = 1
                reds = parse_reds(match_data.get("expulsados_raw", ""), partido_id)
                for _, jug, _, _, min_r in reds:
                    if names_match(jug):
                        roja = 1
                        if minuto_salida == 90:
                            minuto_salida = min_r

                goles = 0
                goals = parse_goals(match_data.get("goles_raw", ""), partido_id)
                for _, jug, _, _, en_contra in goals:
                    if names_match(jug) and not en_contra:
                        goles += 1

                return {
                    "jugador_id": jugador_id,
                    "partido_id": partido_id,
                    "titular": 0,
                    "minuto_ingreso": minuto_in,
                    "minuto_salida": minuto_salida,
                    "minutos_jugados": minuto_salida - minuto_in,
                    "goles": goles,
                    "amarilla": amarilla,
                    "roja": roja,
                    "equipo_en_partido": equipo_nombre,
                    "numero_camiseta": suplente_info.get("number"),
                    "posicion_partido": suplente_info.get("position", ""),
                }

        # Suplente listed but didn't enter — record with 0 minutes
        return {
            "jugador_id": jugador_id,
            "partido_id": partido_id,
            "titular": 0,
            "minuto_ingreso": None,
            "minuto_salida": None,
            "minutos_jugados": 0,
            "goles": 0,
            "amarilla": 0,
            "roja": 0,
            "equipo_en_partido": equipo_nombre,
            "numero_camiseta": suplente_info.get("number"),
            "posicion_partido": suplente_info.get("position", ""),
        }

    return None


# ================================================================
# Descubrir partidos nuevos desde fixture (sin re-descargar perfiles)
# ================================================================
def discover_matches_from_fixture():
    """Scan fixture pages. Returns (new_matches, all_fixture_urls)."""
    cached_synth = load_checkpoint("syntheses")
    existing_ids = set(int(k) for k in cached_synth.keys()) if cached_synth else set()
    log(f"  Sintesis existentes: {len(existing_ids)}")

    new_matches = {}
    all_fixture_urls = {}
    for page in range(0, 40):
        url = f"{BASE}/fixture/promocional-amateur/4/{page}"
        soup = fetch(url)
        if not soup:
            break
        links = []
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if "/sintesis/" in href:
                mid = extract_id_from_href(href)
                if mid:
                    if href.startswith("/.."):
                        href = href[3:]
                    elif href.startswith(".."):
                        href = href[2:]
                    if not href.startswith("/"):
                        href = "/" + href
                    links.append((mid, href))
                    all_fixture_urls[mid] = href
                    if mid not in existing_ids:
                        new_matches[mid] = href
        if not links:
            break
        time.sleep(DELAY)

    log(f"  Partidos nuevos encontrados en fixture: {len(new_matches)}")
    return new_matches, all_fixture_urls


# ================================================================
# MAIN
# ================================================================
def main():
    import sys
    update_mode = "--update" in sys.argv
    max_minutes = 40
    for arg in sys.argv:
        if arg.startswith("--max-minutes="):
            max_minutes = int(arg.split("=")[1])
    start_time = time.time()

    open(LOG_FILE, "w").close()
    step_times = {}

    # --- PASO 1: Equipos ---
    t_step = time.time()
    cached_teams = load_checkpoint("teams")
    if cached_teams:
        teams = [tuple(t) for t in cached_teams]
        log(f"=== PASO 1: Equipos cargados desde checkpoint ({len(teams)}) ===")
    else:
        teams = get_teams()
        save_checkpoint("teams", teams)

    teams_dict = {}
    teams_id_dict = {}
    for tid, name, cat, slug in teams:
        teams_dict[name] = tid
        teams_id_dict[tid] = name

    step_times["PASO 1"] = time.time() - t_step

    # --- PASO 2: Planteles ---
    t_step = time.time()
    cached_players = load_checkpoint("players")
    if cached_players and not update_mode:
        unique_players = [tuple(p) for p in cached_players]
        log(f"\n=== PASO 2: Planteles cargados desde checkpoint ({len(unique_players)} jugadores) ===")
    else:
        old_count = len(cached_players) if cached_players else 0
        log(f"\n=== PASO 2: {'Actualizando' if update_mode else 'Obteniendo'} planteles ===")
        # Start with existing players to never lose data
        seen = set()
        unique_players = []
        if cached_players:
            for p in cached_players:
                pt = tuple(p)
                if pt[0] not in seen:
                    seen.add(pt[0])
                    unique_players.append(pt)

        # Add new players from current rosters
        new_count = 0
        for tid, name, cat, slug in teams:
            roster = get_roster(tid, slug, name)
            for p in roster:
                if p[0] not in seen:
                    seen.add(p[0])
                    unique_players.append(p)
                    new_count += 1
        if new_count > 0:
            log(f"\n  Jugadores nuevos detectados: {new_count}")
        log(f"  Total jugadores únicos: {len(unique_players)}")
        save_checkpoint("players", unique_players)

    step_times["PASO 2"] = time.time() - t_step

    # --- PASO 3: Perfiles + match URLs (con checkpoint incremental) ---
    t_step = time.time()
    cached_profiles = load_checkpoint("profiles")
    if cached_profiles:
        player_profiles = {int(k): v for k, v in cached_profiles["profiles"].items()}
        player_equipo_actual = {int(k): v for k, v in cached_profiles["equipo_actual"].items()}
        all_match_urls = {int(k): v for k, v in cached_profiles["match_urls"].items()}
        player_match_ids = {int(k): set(v) for k, v in cached_profiles["player_matches"].items()}
        done_ids = set(int(x) for x in cached_profiles["profiles"].keys())
        remaining = [(jid, slug, eid) for jid, slug, eid in unique_players if jid not in done_ids]
        log(f"\n=== PASO 3: Checkpoint cargado ({len(done_ids)} perfiles). Faltan {len(remaining)} ===")
    else:
        player_profiles = {}
        player_equipo_actual = {}
        all_match_urls = {}
        player_match_ids = {}
        remaining = list(unique_players)
        log("\n=== PASO 3: Obteniendo perfiles de jugadores ===")

    total = len(unique_players)
    done_count = total - len(remaining)
    time_limit_hit = False

    for i, (jid, slug, equipo_id) in enumerate(remaining):
        elapsed = (time.time() - start_time) / 60
        if elapsed >= max_minutes:
            log(f"\n  ⏱ Límite de tiempo ({max_minutes} min) alcanzado en perfiles. Guardando progreso.")
            time_limit_hit = True
            break
        log(f"  [{done_count + i + 1}/{total}] Perfil: {slug} (ID: {jid})")
        profile, matches = get_player_profile(jid, slug)
        if profile:
            player_profiles[jid] = profile
            player_equipo_actual[jid] = equipo_id
            player_match_ids[jid] = set()
            for mid, href in matches:
                all_match_urls[mid] = href
                player_match_ids[jid].add(mid)

        if (done_count + i + 1) % 10 == 0 or i == len(remaining) - 1:
            save_checkpoint("profiles", {
                "profiles": {str(k): v for k, v in player_profiles.items()},
                "equipo_actual": {str(k): v for k, v in player_equipo_actual.items()},
                "match_urls": {str(k): v for k, v in all_match_urls.items()},
                "player_matches": {str(k): list(v) for k, v in player_match_ids.items()},
            })

    step_times["PASO 3"] = time.time() - t_step

    # In update mode, discover new matches from fixture instead of profiles
    t_step = time.time()
    if update_mode and not time_limit_hit:
        log("\n=== PASO 3b: Buscando partidos nuevos desde fixture ===")
        new_from_fixture, all_fixture_urls = discover_matches_from_fixture()
        for mid, href in all_fixture_urls.items():
            all_match_urls[mid] = href

    step_times["PASO 3b"] = time.time() - t_step

    log(f"\nTotal partidos únicos encontrados: {len(all_match_urls)}")

    # --- PASO 4: Fetchear síntesis únicas ---
    t_step = time.time()
    def has_confirmed_formations(mdata):
        fl = mdata.get("formacion_local", {})
        if len(fl.get("titulares", [])) == 0:
            return False
        if mdata.get("formaciones_probables") or "Probables" in mdata.get("info_raw", ""):
            if mdata.get("fecha", "") >= "2026":
                return False
        return True

    cached_synth = load_checkpoint("syntheses")
    if cached_synth:
        match_data_cache = {int(k): v for k, v in cached_synth.items()}
        done_mids = set(match_data_cache.keys())
        remaining_matches = {mid: url for mid, url in all_match_urls.items() if mid not in done_mids}
        # In update mode, also re-check cached matches without formations (not yet played)
        if update_mode:
            from datetime import date as _date, timedelta as _timedelta
            today_str = _date.today().strftime("%Y-%m-%d")
            known_team_names = {name for _, name, _, _ in teams}
            RECHECK_DAYS = 7
            recheck_cutoff = (_date.today() - _timedelta(days=RECHECK_DAYS)).strftime("%Y-%m-%d")
            def is_primera_d_recheck(mdata):
                if not ("Promocional" in mdata.get("torneo", "") or "Amateur" in mdata.get("info_raw", "")):
                    return False
                return mdata.get("equipo_local", "") in known_team_names or mdata.get("equipo_visitante", "") in known_team_names
            stale = set()
            recent = set()
            for mid, mdata in match_data_cache.items():
                if not (mid in all_match_urls or "url_path" in mdata):
                    continue
                if not is_primera_d_recheck(mdata):
                    continue
                if not has_confirmed_formations(mdata):
                    # Siempre re-chequear partidos sin formaciones confirmadas,
                    # sin importar la fecha cacheada: un partido puede haberse
                    # reprogramado a una fecha ANTERIOR a la cacheada, en cuyo
                    # caso "fecha_cacheada <= hoy" nunca se cumple y el partido
                    # queda atascado sin revisar para siempre.
                    stale.add(mid)
                elif has_confirmed_formations(mdata):
                    fa = mdata.get("fetched_at", "")
                    match_date = mdata.get("fecha", "")
                    check_date = fa if fa else match_date
                    if check_date >= recheck_cutoff:
                        recent.add(mid)
            for mid in stale | recent:
                url = all_match_urls.get(mid) or match_data_cache[mid].get("url_path", "")
                if url:
                    remaining_matches[mid] = url
            if stale or recent:
                log(f"\n=== PASO 4: Checkpoint cargado ({len(done_mids)} síntesis). Re-chequeando {len(stale)} sin formaciones + {len(recent)} recientes (<{RECHECK_DAYS}d). Faltan {len(remaining_matches)} ===")
            else:
                log(f"\n=== PASO 4: Checkpoint cargado ({len(done_mids)} síntesis). Faltan {len(remaining_matches)} ===")
        else:
            log(f"\n=== PASO 4: Checkpoint cargado ({len(done_mids)} síntesis). Faltan {len(remaining_matches)} ===")
    else:
        match_data_cache = {}
        remaining_matches = dict(all_match_urls)
        log("\n=== PASO 4: Obteniendo síntesis de partidos ===")

    total_matches = len(all_match_urls)
    done_matches = total_matches - len(remaining_matches)

    time_limit_hit = False
    for i, (mid, url_path) in enumerate(remaining_matches.items()):
        elapsed = (time.time() - start_time) / 60
        if elapsed >= max_minutes:
            log(f"\n  ⏱ Límite de tiempo ({max_minutes} min) alcanzado. Guardando progreso con {i} síntesis nuevas.")
            time_limit_hit = True
            break
        log(f"  [{done_matches + i + 1}/{total_matches}] Síntesis: {mid}")
        data = parse_synthesis(mid, url_path)
        if data:
            from datetime import date as _dt
            data["fetched_at"] = _dt.today().strftime("%Y-%m-%d")
            match_data_cache[mid] = data

        if (done_matches + i + 1) % 10 == 0 or i == len(remaining_matches) - 1:
            save_checkpoint("syntheses", {str(k): v for k, v in match_data_cache.items()})

    step_times["PASO 4"] = time.time() - t_step

    log(f"\nSíntesis parseadas exitosamente: {len(match_data_cache)}")

    # --- PASO 4b: Detectar jugadores en formaciones que no están en planteles ---
    t_step = time.time()
    if update_mode and not time_limit_hit:
        known_keys = set()
        for jid, profile in player_profiles.items():
            nombre = profile.get("nombre_completo", "")
            if nombre:
                known_keys.update(name_keys(nombre))

        teams_to_rescrape = set()
        for mid, mdata in match_data_cache.items():
            if mdata.get("fecha", "") < "2026":
                continue
            for side, team_key in [("formacion_local", "equipo_local"), ("formacion_visitante", "equipo_visitante")]:
                formation = mdata.get(side, {})
                team_name = mdata.get(team_key, "")
                for player in formation.get("titulares", []) + formation.get("suplentes", []):
                    pname = player.get("name", "")
                    if not pname:
                        continue
                    pkeys = name_keys(pname)
                    if pkeys and not (pkeys & known_keys):
                        team_id = teams_dict.get(team_name)
                        if team_id:
                            teams_to_rescrape.add((team_id, team_name))

        if teams_to_rescrape:
            log(f"\n=== PASO 4b: {len(teams_to_rescrape)} equipos con jugadores no reconocidos ===")
            existing_ids = {p[0] for p in unique_players}
            for tid, tname in teams_to_rescrape:
                slug = None
                for t_id, t_name, t_cat, t_slug in teams:
                    if t_id == tid:
                        slug = t_slug
                        break
                if not slug:
                    continue
                log(f"  Re-scrapeando plantel: {tname}")
                roster = get_roster(tid, slug, tname)
                new_players = [p for p in roster if p[0] not in existing_ids]
                if new_players:
                    log(f"    Nuevos jugadores: {len(new_players)}")
                    unique_players.extend(new_players)
                    for jid_new, pslug, eid in new_players:
                        existing_ids.add(jid_new)
                        log(f"    Perfil: {pslug} (ID: {jid_new})")
                        profile, matches = get_player_profile(jid_new, pslug)
                        if profile:
                            player_profiles[jid_new] = profile
                            player_equipo_actual[jid_new] = eid
                            player_match_ids[jid_new] = set()
                            known_keys.update(name_keys(profile.get("nombre_completo", "")))
                            for m_id, href in matches:
                                all_match_urls[m_id] = href
                                player_match_ids[jid_new].add(m_id)
                    save_checkpoint("players", unique_players)
                    save_checkpoint("profiles", {
                        "profiles": {str(k): v for k, v in player_profiles.items()},
                        "equipo_actual": {str(k): v for k, v in player_equipo_actual.items()},
                        "match_urls": {str(k): v for k, v in all_match_urls.items()},
                        "player_matches": {str(k): list(v) for k, v in player_match_ids.items()},
                    })

    step_times["PASO 4b"] = time.time() - t_step

    # --- PASO 5: Crear DB y cargar todo ---
    t_step = time.time()
    log("\n=== PASO 5: Creando base de datos ===")

    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.executescript("""
    CREATE TABLE equipos (
        equipo_id INTEGER PRIMARY KEY,
        nombre TEXT NOT NULL,
        categoria TEXT,
        url_slug TEXT
    );
    CREATE TABLE jugadores (
        jugador_id INTEGER PRIMARY KEY,
        nombre_completo TEXT NOT NULL,
        fecha_nacimiento TEXT,
        puesto TEXT,
        url_slug TEXT
    );
    CREATE TABLE jugador_equipo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jugador_id INTEGER REFERENCES jugadores(jugador_id),
        equipo_id INTEGER REFERENCES equipos(equipo_id),
        temporada TEXT,
        club_nombre TEXT
    );
    CREATE TABLE partidos (
        partido_id INTEGER PRIMARY KEY,
        fecha TEXT,
        hora TEXT,
        torneo TEXT,
        jornada INTEGER,
        estadio TEXT,
        arbitro TEXT,
        equipo_local TEXT,
        equipo_visitante TEXT,
        equipo_local_id INTEGER,
        equipo_visitante_id INTEGER,
        goles_local INTEGER,
        goles_visitante INTEGER,
        url TEXT
    );
    CREATE TABLE goles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        partido_id INTEGER REFERENCES partidos(partido_id),
        jugador_nombre TEXT,
        equipo_abrev TEXT,
        minuto INTEGER,
        en_contra INTEGER DEFAULT 0
    );
    CREATE TABLE cambios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        partido_id INTEGER REFERENCES partidos(partido_id),
        equipo_abrev TEXT,
        jugador_entra TEXT,
        jugador_sale TEXT,
        minuto INTEGER
    );
    CREATE TABLE tarjetas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        partido_id INTEGER REFERENCES partidos(partido_id),
        jugador_nombre TEXT,
        equipo_abrev TEXT,
        tipo TEXT,
        minuto INTEGER
    );
    CREATE TABLE apariciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jugador_id INTEGER REFERENCES jugadores(jugador_id),
        partido_id INTEGER REFERENCES partidos(partido_id),
        titular INTEGER,
        minuto_ingreso INTEGER,
        minuto_salida INTEGER,
        minutos_jugados INTEGER,
        goles INTEGER DEFAULT 0,
        amarilla INTEGER DEFAULT 0,
        roja INTEGER DEFAULT 0,
        es_ambiguo INTEGER DEFAULT 0,
        equipo_en_partido TEXT,
        numero_camiseta INTEGER,
        posicion_partido TEXT
    );
    """)

    # Insert equipos
    for tid, name, cat, slug in teams:
        c.execute("INSERT INTO equipos VALUES (?,?,?,?)", (tid, name, cat, slug))

    # Insert jugadores
    active_player_ids = set()
    player_name_by_id = {}

    for jid, profile in player_profiles.items():
        nombre = profile.get("nombre_completo", "")
        fecha_nac_raw = profile.get("fecha_nacimiento", "")
        puesto = profile.get("puesto", "")
        slug = profile.get("url_slug", "")

        # Convert fecha_nac from DD.MM.YYYY to YYYY-MM-DD
        fecha_nac = ""
        m = re.match(r"(\d{2})\.(\d{2})\.(\d{4})", fecha_nac_raw)
        if m:
            fecha_nac = f"{m.group(3)}-{m.group(2)}-{m.group(1)}"

        c.execute("INSERT OR IGNORE INTO jugadores VALUES (?,?,?,?,?)",
                  (jid, nombre, fecha_nac, puesto, slug))

        if puesto == "Entrenador":
            continue

        active_player_ids.add(jid)
        player_name_by_id[jid] = nombre

    # Insert jugador_equipo
    for jid, equipo_id in player_equipo_actual.items():
        profile = player_profiles.get(jid, {})
        temporada = profile.get("temporada", "2026")
        club = profile.get("club", teams_id_dict.get(equipo_id, ""))
        c.execute("INSERT INTO jugador_equipo (jugador_id, equipo_id, temporada, club_nombre) VALUES (?,?,?,?)",
                  (jid, equipo_id, temporada, club))

    # Pre-build normalized name set for O(1) lookups (both full and key-based)
    active_normalized_names = set()
    active_all_keys = set()  # union of all name_keys for all active players
    active_keys_by_player = {}  # pid -> set of keys
    for pid in active_player_ids:
        name = player_name_by_id.get(pid, "")
        if name:
            active_normalized_names.add(normalize_name(name))
            keys = name_keys(name)
            if keys:
                active_all_keys.update(keys)
                active_keys_by_player[pid] = keys

    def is_active_player(player_name):
        """Check if a player name matches an active player (handles compound apellidos and second-name mismatches)."""
        if normalize_name(player_name) in active_normalized_names:
            return True
        pkeys = name_keys(player_name)
        return bool(pkeys & active_all_keys)

    log(f"  Active normalized names: {len(active_normalized_names)}")

    # Filter: only Promocional Amateur matches with at least one known team
    team_names = set(teams_id_dict.values())
    before = len(match_data_cache)
    def is_primera_d(mdata):
        if not ("Promocional" in mdata.get("torneo", "") or "Amateur" in mdata.get("info_raw", "")):
            return False
        local = mdata.get("equipo_local", "")
        visitante = mdata.get("equipo_visitante", "")
        return local in team_names or visitante in team_names
    match_data_cache = {mid: mdata for mid, mdata in match_data_cache.items()
                        if is_primera_d(mdata)}
    other_cat = before - len(match_data_cache)
    if other_cat:
        log(f"  Partidos de otras categorías excluidos: {other_cat}")

    # Filter out unplayed matches (no formations AND no score data)
    before = len(match_data_cache)
    def match_has_data(mdata):
        has_formations = len(mdata.get("formacion_local", {}).get("titulares", [])) > 0
        has_score = mdata.get("goles_local", 0) > 0 or mdata.get("goles_visitante", 0) > 0
        has_events = any(mdata.get(k) for k in ("goles_raw", "cambios_raw", "amonestados_raw"))
        return has_formations or has_score or has_events
    match_data_cache = {mid: mdata for mid, mdata in match_data_cache.items()
                        if match_has_data(mdata)}
    skipped = before - len(match_data_cache)
    if skipped:
        log(f"  Partidos futuros excluidos: {skipped}")

    # Separate "Formaciones Probables" — only for current year (2026+)
    # Older matches with "Probables" will never be updated, process them fully
    probables_ids = set()
    for mid, mdata in match_data_cache.items():
        if mdata.get("formaciones_probables") or "Probables" in mdata.get("info_raw", ""):
            fecha = mdata.get("fecha", "")
            if fecha >= "2026":
                probables_ids.add(mid)
    if probables_ids:
        log(f"  Partidos con formaciones probables (solo score): {len(probables_ids)}")

    # Fix scores from info_raw for cached data that may have wrong scores
    score_fixes = 0
    for mid, mdata in match_data_cache.items():
        raw = mdata.get("info_raw", "")
        local = mdata.get("equipo_local", "")
        visit = mdata.get("equipo_visitante", "")
        if not (raw and local and visit):
            continue
        idx_l = raw.find(local)
        idx_v = raw.find(visit)
        if idx_l < 0 or idx_v <= idx_l:
            continue
        between = raw[idx_l + len(local):idx_v].strip()
        after = raw[idx_v + len(visit):]
        gl_m = re.match(r"^(\d+)$", between)
        gv_m = re.match(r"^(\d+)(\d{2}\.\d{2}\.\d{2})", after)
        if gl_m and gv_m:
            real_gl = int(gl_m.group(1))
            real_gv = int(gv_m.group(1))
            if real_gl != mdata.get("goles_local", 0) or real_gv != mdata.get("goles_visitante", 0):
                score_fixes += 1
                mdata["goles_local"] = real_gl
                mdata["goles_visitante"] = real_gv
    if score_fixes:
        log(f"  Scores corregidos desde info_raw: {score_fixes}")

    # Insert partidos and match details (only for active players)
    for mid, mdata in match_data_cache.items():
        local_name = mdata.get("equipo_local", "")
        visit_name = mdata.get("equipo_visitante", "")
        local_id = resolve_team_id(local_name, teams_dict)
        visit_id = resolve_team_id(visit_name, teams_dict)

        match_url = all_match_urls.get(mid, "")
        if match_url:
            match_url = BASE + match_url

        c.execute("""INSERT OR IGNORE INTO partidos VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""", (
            mid,
            mdata.get("fecha", ""),
            mdata.get("hora", ""),
            mdata.get("torneo", "Promocional Amateur"),
            mdata.get("jornada"),
            mdata.get("estadio", ""),
            mdata.get("arbitro", ""),
            local_name,
            visit_name,
            local_id,
            visit_id,
            mdata.get("goles_local", 0),
            mdata.get("goles_visitante", 0),
            match_url,
        ))

        # Skip synthesis details for matches with "Formaciones Probables"
        if mid in probables_ids:
            continue

        # Goles - only for active players
        goals = parse_goals(mdata.get("goles_raw", ""), mid)
        for _, jugador, equipo, minuto, en_contra in goals:
            if is_active_player(jugador):
                c.execute("INSERT INTO goles (partido_id, jugador_nombre, equipo_abrev, minuto, en_contra) VALUES (?,?,?,?,?)",
                          (mid, jugador, equipo, minuto, int(en_contra)))

        # Cambios - only for active players
        subs = parse_substitutions(mdata.get("cambios_raw", ""), mid)
        for _, equipo, entra, sale, minuto in subs:
            entra_active = is_active_player(entra)
            sale_active = is_active_player(sale)
            if entra_active or sale_active:
                c.execute("INSERT INTO cambios (partido_id, equipo_abrev, jugador_entra, jugador_sale, minuto) VALUES (?,?,?,?,?)",
                          (mid, equipo, entra, sale, minuto))

        # Tarjetas - only for active players
        yellows = parse_yellows(mdata.get("amonestados_raw", ""), mid)
        for _, jugador, equipo, tipo, minuto in yellows:
            if is_active_player(jugador):
                c.execute("INSERT INTO tarjetas (partido_id, jugador_nombre, equipo_abrev, tipo, minuto) VALUES (?,?,?,?,?)",
                          (mid, jugador, equipo, tipo, minuto))

        reds = parse_reds(mdata.get("expulsados_raw", ""), mid)
        for _, jugador, equipo, tipo, minuto in reds:
            if is_active_player(jugador):
                c.execute("INSERT INTO tarjetas (partido_id, jugador_nombre, equipo_abrev, tipo, minuto) VALUES (?,?,?,?,?)",
                          (mid, jugador, equipo, tipo, minuto))

    # --- PASO 5b: Asignar partidos a jugadores por formaciones ---
    # player_match_ids comes from profiles (PASO 3) but fixture-discovered matches
    # (PASO 3b) are NOT linked to any player. Scan formations and assign match IDs
    # ONLY when the player's current team matches the formation's team.
    key_to_pids = {}
    for pid, keys in active_keys_by_player.items():
        for k in keys:
            key_to_pids.setdefault(k, set()).add(pid)

    pid_team_id = {pid: player_equipo_actual.get(pid) for pid in active_player_ids}

    assigned = 0
    for mid, mdata in match_data_cache.items():
        if mid in probables_ids:
            continue
        for side in ["formacion_local", "formacion_visitante"]:
            formation = mdata.get(side, {})
            team_name = mdata.get("equipo_local" if side == "formacion_local" else "equipo_visitante", "")
            team_id = teams_dict.get(team_name)
            for player in formation.get("titulares", []) + formation.get("suplentes", []):
                pname = player.get("name", "")
                if not pname:
                    continue
                for pk in name_keys(pname):
                    for pid in key_to_pids.get(pk, set()):
                        if pid_team_id.get(pid) != team_id:
                            continue
                        if mid not in player_match_ids.get(pid, set()):
                            player_match_ids.setdefault(pid, set()).add(mid)
                            assigned += 1
    if assigned:
        log(f"  Partidos asignados por formaciones: {assigned}")

    step_times["PASO 5"] = time.time() - t_step

    # --- PASO 6: Calcular apariciones ---
    t_step = time.time()
    log("\n=== PASO 6: Calculando apariciones ===")
    total_apariciones = 0
    total_ambiguos = 0

    # Pre-build ambiguity map: for each individual key, which player IDs share it?
    # Grouped by equipo_id — only same-team collisions are truly ambiguous
    key_to_pids_by_team = {}  # key -> {equipo_id -> set of pids}
    for pid, keys in active_keys_by_player.items():
        equipo_id = player_equipo_actual.get(pid)
        for k in keys:
            key_to_pids_by_team.setdefault(k, {}).setdefault(equipo_id, set()).add(pid)

    def is_ambiguous_same_team(jid, formation_name):
        """Check if another active player ON THE SAME TEAM also matches this formation_name.
        Only marks ambiguous when it's impossible to distinguish (same team, same match)."""
        my_team = player_equipo_actual.get(jid)
        fkeys = name_keys(formation_name)
        teammates_matching = set()
        for fk in fkeys:
            team_dict = key_to_pids_by_team.get(fk, {})
            teammates_matching.update(team_dict.get(my_team, set()))
        # Ambiguous only if >1 player from the SAME team matches
        return len(teammates_matching) > 1

    for jid in active_player_ids:
        jname = player_name_by_id.get(jid, "")
        match_ids = player_match_ids.get(jid, set())

        for mid in match_ids:
            if mid in probables_ids:
                continue
            mdata = match_data_cache.get(mid)
            if not mdata:
                continue

            appearance = calc_appearance(jname, mdata, jid)
            if appearance:
                # Check ambiguity: find the formation name that matched
                es_ambiguo = 0
                jkeys = name_keys(jname)
                for side in ["formacion_local", "formacion_visitante"]:
                    formation = mdata.get(side)
                    if not formation:
                        continue
                    for player in formation.get("titulares", []) + formation.get("suplentes", []):
                        pname = player.get("name", "")
                        pnorm = normalize_name(pname)
                        jnorm = normalize_name(jname)
                        if pnorm == jnorm or (jkeys and bool(jkeys & name_keys(pname))):
                            if is_ambiguous_same_team(jid, pname):
                                es_ambiguo = 1
                            break
                    if es_ambiguo:
                        break

                c.execute("""INSERT INTO apariciones
                    (jugador_id, partido_id, titular, minuto_ingreso, minuto_salida, minutos_jugados, goles, amarilla, roja, es_ambiguo, equipo_en_partido, numero_camiseta, posicion_partido)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""", (
                    appearance["jugador_id"],
                    appearance["partido_id"],
                    appearance["titular"],
                    appearance["minuto_ingreso"],
                    appearance["minuto_salida"],
                    appearance["minutos_jugados"],
                    appearance["goles"],
                    appearance["amarilla"],
                    appearance["roja"],
                    es_ambiguo,
                    appearance.get("equipo_en_partido", ""),
                    appearance.get("numero_camiseta"),
                    appearance.get("posicion_partido", ""),
                ))
                total_apariciones += 1
                if es_ambiguo:
                    total_ambiguos += 1

    log(f"  Total apariciones calculadas: {total_apariciones}")
    if total_ambiguos:
        log(f"  AVISO: Apariciones ambiguas (mismo equipo, mismo nombre): {total_ambiguos}")

    # --- Correcciones manuales de apariciones ---
    log("\n=== Correcciones manuales ===")
    total_overrides = 0

    # 1) Soloascenso lista a "Facundo Saroka" en 2024-2025 pero jugó Federico Saroka.
    REASIGNAR = [
        {"from_jugador_id": 29350, "to_jugador_id": 29348, "before_date": "2026-01-01"},
    ]
    for ov in REASIGNAR:
        c.execute("""UPDATE apariciones SET jugador_id = ?
                     WHERE jugador_id = ? AND partido_id IN (
                         SELECT partido_id FROM partidos WHERE fecha < ?
                     )""", (ov["to_jugador_id"], ov["from_jugador_id"], ov["before_date"]))
        cnt = c.rowcount
        if cnt:
            total_overrides += cnt
            log(f"  Reasignadas: {cnt} apariciones de jugador {ov['from_jugador_id']} a {ov['to_jugador_id']} (antes de {ov['before_date']})")

    # 2) Apariciones faltantes (errores en soloascenso: jugador duplicado o ausente en formación)
    INSERTAR = [
        # Hacoaj vs Glew 10/07/2026: soloascenso duplica a Gutman, falta Federico Saroka (titular, 90', #6, defensor)
        {"jugador_id": 29348, "partido_id": 45822, "titular": 1, "minuto_ingreso": 0, "minuto_salida": 90,
         "minutos_jugados": 90, "goles": 0, "amarilla": 0, "roja": 0, "equipo_en_partido": "Náutico Hacoaj",
         "numero_camiseta": 6, "posicion_partido": "defensor"},
    ]
    for ins in INSERTAR:
        c.execute("SELECT 1 FROM apariciones WHERE jugador_id=? AND partido_id=?", (ins["jugador_id"], ins["partido_id"]))
        if not c.fetchone():
            c.execute("""INSERT INTO apariciones
                (jugador_id, partido_id, titular, minuto_ingreso, minuto_salida, minutos_jugados, goles, amarilla, roja, es_ambiguo, equipo_en_partido, numero_camiseta, posicion_partido)
                VALUES (?,?,?,?,?,?,?,?,?,0,?,?,?)""", (
                ins["jugador_id"], ins["partido_id"], ins["titular"], ins["minuto_ingreso"], ins["minuto_salida"],
                ins["minutos_jugados"], ins["goles"], ins["amarilla"], ins["roja"], ins["equipo_en_partido"],
                ins.get("numero_camiseta"), ins.get("posicion_partido", "")))
            total_overrides += 1
            log(f"  Insertada: aparición de jugador {ins['jugador_id']} en partido {ins['partido_id']}")

    if total_overrides:
        log(f"  Total correcciones aplicadas: {total_overrides}")

    conn.commit()

    # --- Export CSVs ---
    log("\n=== Exportando CSVs ===")
    tables = ["equipos", "jugadores", "jugador_equipo", "partidos", "goles", "cambios", "tarjetas", "apariciones"]
    for table in tables:
        c.execute(f"SELECT * FROM {table}")
        rows = c.fetchall()
        cols = [desc[0] for desc in c.description]
        with open(os.path.join(CSV_DIR, f"{table}.csv"), "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(cols)
            w.writerows(rows)
        log(f"  {table}.csv: {len(rows)} registros")

    # --- Summary ---
    log("\n" + "=" * 60)
    log("RESUMEN FINAL")
    log("=" * 60)
    for table in tables:
        c.execute(f"SELECT COUNT(*) FROM {table}")
        count = c.fetchone()[0]
        log(f"  {table}: {count} registros")

    conn.close()
    step_times["PASO 6"] = time.time() - t_step

    total_elapsed = time.time() - start_time
    log(f"\nBase de datos: {os.path.abspath(DB_PATH)}")
    log(f"CSVs en: {os.path.abspath(CSV_DIR)}/")

    log("\n" + "=" * 60)
    log("⏱ TIEMPOS POR PASO")
    log("=" * 60)
    for step, secs in step_times.items():
        log(f"  {step}: {secs:.0f}s ({secs/60:.1f} min)")
    log(f"  TOTAL: {total_elapsed:.0f}s ({total_elapsed/60:.1f} min)")
    log(f"\n  Requests OK: {fetch_stats['ok']}, Timeouts: {fetch_stats['timeout']}, Errores: {fetch_stats['error']}")
    timeout_cost = fetch_stats['timeout'] * 11
    log(f"  Tiempo perdido en timeouts: ~{timeout_cost}s (~{timeout_cost/60:.1f} min)")
    log("DONE!")


def strip_accents(s):
    """Remove accents from a string."""
    replacements = {
        "á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u",
        "Á": "A", "É": "E", "Í": "I", "Ó": "O", "Ú": "U",
        "ñ": "n", "Ñ": "N", "ü": "u", "Ü": "U",
    }
    for k, v in replacements.items():
        s = s.replace(k, v)
    return s


def normalize_name(name):
    """Normalize a name for comparison (full string)."""
    if not name:
        return ""
    return strip_accents(name.lower().strip())


def name_keys(name):
    """
    Generate ALL (apellido_word, nombre) pairs for fuzzy matching.
    Handles compound last names and second-name usage:
      - "COHEN TERDJMAN, ENRIQUE NICOLAS" -> {("cohen","enrique"), ("cohen","nicolas"), ("terdjman","enrique"), ("terdjman","nicolas")}
      - "Enrique Cohen"                   -> {("cohen","enrique")}
      - "Gastón Cohen"                    -> {("cohen","gaston")}
    Returns a set of (apellido_word, nombre) tuples, accents removed and lowercased.
    """
    if not name:
        return set()
    clean = strip_accents(name.lower().strip())

    if "," in clean:
        # Format: "apellido1 apellido2, nombre1 nombre2 ..."
        parts = clean.split(",", 1)
        apellido_words = parts[0].strip().split()
        nombres = parts[1].strip().split()
    else:
        # Format: "nombre1 apellido" (most synthesis names are 2 tokens)
        tokens = clean.split()
        if len(tokens) >= 2:
            apellido_words = [tokens[-1]]
            nombres = tokens[:-1]  # all tokens except last are potential nombres
        elif len(tokens) == 1:
            return {(tokens[0], "")}
        else:
            return set()

    keys = set()
    for ap in apellido_words:
        for nom in nombres:
            keys.add((ap, nom))
        if not nombres:
            keys.add((ap, ""))
    return keys


def name_key(name):
    """Legacy wrapper - returns first key or empty tuple."""
    keys = name_keys(name)
    return next(iter(keys)) if keys else ("", "")


if __name__ == "__main__":
    main()
