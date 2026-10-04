"""
Scrapea posiciones, goleadores y fixture de soloascenso.com.ar y guarda
los datos en archivos JSON dentro de la carpeta de trabajo (trabajo/data/).
`ejecutar.py` los sube después a Supabase.

Se corre solo (GitHub Actions) con:  python scraper/ejecutar.py liga
"""

import json
import os
import time
import urllib.request
from bs4 import BeautifulSoup

URL_POSICIONES = "https://www.soloascenso.com.ar/posiciones/promocional-amateur/4"
URL_GOLEADORES = "https://www.soloascenso.com.ar/goleadores/promocional-amateur/4"
URL_FIXTURE = "https://www.soloascenso.com.ar/fixture/promocional-amateur/4"

# Mismo criterio que scraper.py: la carpeta de trabajo (variable TRABAJO), que no se versiona.
DATA_DIR = os.path.join(os.environ.get("TRABAJO", "trabajo"), "data")


def fetch(url, retries=3):
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            resp = urllib.request.urlopen(req, timeout=20)
            return resp.read().decode("utf-8")
        except Exception as e:
            print(f"  fetch error ({attempt}/{retries}): {e}")
            if attempt < retries:
                time.sleep(5)
            else:
                raise


# -- Posiciones ---------------------------------------------------------------

def scrape_posiciones():
    html = fetch(URL_POSICIONES)
    soup = BeautifulSoup(html, "html.parser")
    tablagen = soup.find("div", class_="tablagen")
    if not tablagen:
        return []

    rows = tablagen.find_all("div", class_=lambda c: c and c.startswith("fila"))
    equipos = []
    zona = "A"
    header_count = 0

    for row in rows:
        cls_str = " ".join(row.get("class", []))
        if "filac" in cls_str:
            header_count += 1
            if header_count == 2:
                zona = "B"
            continue

        divs = row.find_all("div")
        if len(divs) < 11:
            continue

        equipos.append({
            "Zona": zona,
            "Pos": divs[0].get_text(strip=True),
            "Equipo": divs[2].get_text(strip=True),
            "Pts": divs[3].get_text(strip=True),
            "J": divs[4].get_text(strip=True),
            "G": divs[5].get_text(strip=True),
            "E": divs[6].get_text(strip=True),
            "P": divs[7].get_text(strip=True),
            "GF": divs[8].get_text(strip=True),
            "GC": divs[9].get_text(strip=True),
            "Dif": divs[10].get_text(strip=True),
        })

    return equipos


# -- Goleadores ---------------------------------------------------------------

def scrape_goleadores():
    html = fetch(URL_GOLEADORES)
    soup = BeautifulSoup(html, "html.parser")
    tablagen = soup.find("div", class_="tablagen")
    if not tablagen:
        return []

    rows = tablagen.find_all("div", class_="fila")
    goleadores = []
    for row in rows:
        divs = row.find_all("div")
        if len(divs) < 4:
            continue
        goleadores.append({
            "Pos": divs[0].get_text(strip=True),
            "Jugador": divs[1].get_text(strip=True),
            "Equipo": divs[2].get_text(strip=True),
            "Goles": divs[3].get_text(strip=True),
        })
    return goleadores


# -- Fixture ------------------------------------------------------------------

def _get_total_fechas():
    """Lee la primera pagina del fixture para saber cuantas fechas hay."""
    html = fetch(f"{URL_FIXTURE}/1")
    soup = BeautifulSoup(html, "html.parser")
    fechas_section = soup.find("section", id="fechas")
    if not fechas_section:
        return 0
    return len(fechas_section.find_all("a"))


def _scrape_fecha(num_fecha):
    """Scrapea una fecha individual y devuelve lista de partidos."""
    html = fetch(f"{URL_FIXTURE}/{num_fecha}")
    soup = BeautifulSoup(html, "html.parser")
    tablagen = soup.find("div", class_="tablagen")
    if not tablagen:
        return []

    partidos = []
    rows = tablagen.find_all("div", class_="fila")

    for row in rows:
        cols = row.find_all("div", class_="col", recursive=False)
        if len(cols) < 4:
            continue

        h5s = cols[0].find_all("h5")
        fecha_hora = h5s[0].get_text(strip=True) if len(h5s) >= 1 else ""
        arbitro = h5s[1].get_text(strip=True) if len(h5s) >= 2 else ""

        dia, hora = "", ""
        if fecha_hora:
            partes = fecha_hora.split(" ", 1)
            dia = partes[0] if len(partes) >= 1 else ""
            hora = partes[1] if len(partes) >= 2 else ""

        local_h3 = cols[1].find("h3")
        local = local_h3.get_text(strip=True) if local_h3 else ""

        resultado_h4 = cols[2].find("h4")
        resultado = resultado_h4.get_text(strip=True) if resultado_h4 else "-"

        goles_local, goles_visit = "", ""
        if resultado and resultado != "-":
            partes_gol = resultado.split("-")
            if len(partes_gol) == 2:
                goles_local = partes_gol[0].strip()
                goles_visit = partes_gol[1].strip()

        visit_h3 = cols[3].find("h3")
        visitante = visit_h3.get_text(strip=True) if visit_h3 else ""

        partidos.append({
            "Fecha": str(num_fecha),
            "Dia": dia,
            "Hora": hora,
            "Local": local,
            "Goles Local": goles_local,
            "Goles Visitante": goles_visit,
            "Visitante": visitante,
            "Arbitro": arbitro,
        })

    return partidos


def scrape_fixture():
    """Scrapea todas las fechas del fixture, manteniendo datos previos si hay timeout."""
    total = _get_total_fechas()
    if total == 0:
        print("  No se pudo detectar la cantidad de fechas")
        return []

    # Load existing fixture to preserve data on timeout
    existing = {}
    fixture_path = os.path.join(DATA_DIR, "fixture.json")
    if os.path.exists(fixture_path):
        with open(fixture_path, "r", encoding="utf-8") as f:
            for row in json.load(f):
                num = str(row.get("Fecha", "")).strip()
                if num not in existing:
                    existing[num] = []
                existing[num].append(row)

    print(f"  {total} fechas detectadas")
    for i in range(1, total + 1):
        try:
            partidos = _scrape_fecha(i)
            if partidos:
                existing[str(i)] = partidos
                jugados = sum(1 for p in partidos if p["Goles Local"])
                print(f"    Fecha {i:2d}: {len(partidos)} partidos ({jugados} jugados)")
            else:
                print(f"    Fecha {i:2d}: 0 partidos (manteniendo datos previos)")
        except Exception as e:
            print(f"    Fecha {i:2d}: ERROR - {e} (manteniendo datos previos)")
        if i < total:
            time.sleep(0.3)

    todos = []
    for num in sorted(existing.keys(), key=lambda x: int(x) if x.isdigit() else 0):
        todos.extend(existing[num])
    return todos


# -- Escritura a JSON ---------------------------------------------------------

def save_json(filename, data):
    """Guarda datos en un archivo JSON dentro de data/."""
    os.makedirs(DATA_DIR, exist_ok=True)
    path = os.path.join(DATA_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  {path} guardado ({len(data)} registros)")


# -- Main ---------------------------------------------------------------------

if __name__ == "__main__":
    errores = []

    print("Scrapeando posiciones...")
    try:
        posiciones = scrape_posiciones()
        zona_a = [e for e in posiciones if e["Zona"] == "A"]
        zona_b = [e for e in posiciones if e["Zona"] == "B"]
        print(f"  Zona A: {len(zona_a)} equipos | Zona B: {len(zona_b)} equipos")
        save_json("posiciones.json", posiciones)
    except Exception as e:
        print(f"  ERROR posiciones: {e}")
        errores.append("posiciones")

    print("Scrapeando goleadores...")
    try:
        goleadores = scrape_goleadores()
        print(f"  {len(goleadores)} goleadores")
        save_json("goleadores.json", goleadores)
    except Exception as e:
        print(f"  ERROR goleadores: {e}")
        errores.append("goleadores")

    print("Scrapeando fixture...")
    try:
        fixture = scrape_fixture()
        print(f"  {len(fixture)} partidos totales")
        save_json("fixture.json", fixture)
    except Exception as e:
        print(f"  ERROR fixture: {e}")
        errores.append("fixture")

    if errores:
        print(f"\nAVISO: Falló {', '.join(errores)} (SoloAscenso no respondió)")
    print("Listo!")
