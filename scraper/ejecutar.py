"""
Punto de entrada del scraper (lo usa GitHub Actions; también se puede correr a mano).

    python scraper/ejecutar.py liga                 posiciones, goleadores y próximos partidos
    python scraper/ejecutar.py sintesis             partidos nuevos con todo su detalle (el trabajo pesado)
    python scraper/ejecutar.py sintesis --max-minutos 10

Cada modo hace lo mismo que hacían los workflows de la v1, pero en vez de commitear archivos al repo:
  1. baja de Supabase lo que ya se scrapeó (tabla `scraper_estado`, lo que antes era la carpeta `checkpoints/`);
  2. corre el scraper, que solo trae lo nuevo;
  3. sube el resultado a las tablas `torneo_*`;
  4. guarda el nuevo estado para la próxima corrida.

Se conecta con el usuario `scraper` de la base (permisos mínimos: solo el torneo). La cadena de conexión viene
de la variable de entorno SCRAPER_DB_URL (en GitHub es un secreto; localmente, el archivo scraper/.env.scraper).
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path

import psycopg2

AQUI = Path(__file__).resolve().parent
TRABAJO = Path(os.environ.get("TRABAJO", AQUI / "trabajo")).resolve()
os.environ["TRABAJO"] = str(TRABAJO)  # lo leen scraper.py y actualizar_soloascenso.py

sys.path.insert(0, str(AQUI))
import sincronizar  # noqa: E402


def cargar_env_local():
    """Si no hay SCRAPER_DB_URL, la busca en scraper/.env.scraper (solo para correr a mano)."""
    archivo = AQUI / ".env.scraper"
    if "SCRAPER_DB_URL" not in os.environ and archivo.exists():
        for linea in archivo.read_text(encoding="utf-8").splitlines():
            if linea.startswith("SCRAPER_DB_URL="):
                os.environ["SCRAPER_DB_URL"] = linea.split("=", 1)[1].strip()


def conectar():
    url = os.environ.get("SCRAPER_DB_URL")
    if not url:
        sys.exit("Falta la variable SCRAPER_DB_URL (la conexión a Supabase del usuario `scraper`).")
    return psycopg2.connect(url, connect_timeout=30)


def correr(*argumentos):
    """Corre uno de los scripts de scraping y devuelve su código de salida."""
    print(f"\n$ python {' '.join(argumentos)}", flush=True)
    # Los scripts imprimen emojis y tildes: en una consola de Windows (cp1252) se caerían, así que se fuerza UTF-8.
    entorno = {**os.environ, "PYTHONIOENCODING": "utf-8", "PYTHONUTF8": "1"}
    return subprocess.run([sys.executable, *argumentos], cwd=AQUI, env=entorno).returncode


def modo_liga():
    con = conectar()
    print("Bajando el fixture guardado…", flush=True)
    sincronizar.bajar_estado(con, TRABAJO, ["fixture"])
    con.close()

    codigo = correr("actualizar_soloascenso.py")

    con = conectar()
    try:
        print("\nSubiendo posiciones, goleadores y próximos partidos…", flush=True)
        print("  ", sincronizar.sincronizar_liga(con, TRABAJO / "data"))
        con.commit()
        sincronizar.subir_estado(con, TRABAJO, ["fixture"])
    except Exception:
        con.rollback()
        raise
    finally:
        con.close()
    return codigo


def modo_sintesis(max_minutos):
    con = conectar()
    print("Bajando el estado guardado (lo ya scrapeado)…", flush=True)
    bajados = sincronizar.bajar_estado(con, TRABAJO, ["teams", "players", "profiles", "syntheses"])
    print(f"  estado recuperado: {', '.join(bajados) or 'ninguno (primera corrida)'}", flush=True)
    con.close()

    codigo = correr("scraper.py", "--update", f"--max-minutes={max_minutos}")

    con = conectar()
    try:
        if codigo == 0 and (TRABAJO / "primera_d.db").exists():
            print("\nSubiendo el torneo a Supabase…", flush=True)
            print("  ", sincronizar.sincronizar_torneo(con, TRABAJO / "primera_d.db"))
            con.commit()
        else:
            print(f"\nEl scraper terminó con código {codigo}: no se sube el torneo.", flush=True)
        # Aunque la corrida se haya cortado, el progreso (perfiles y síntesis ya bajados) se guarda.
        subidos = sincronizar.subir_estado(con, TRABAJO, ["teams", "players", "profiles", "syntheses"])
        print(f"  estado guardado: {', '.join(subidos)}", flush=True)
    except Exception:
        con.rollback()
        # Si falló la subida del torneo, igual se guarda el estado para no perder lo scrapeado.
        try:
            sincronizar.subir_estado(con, TRABAJO, ["teams", "players", "profiles", "syntheses"])
        finally:
            raise
    finally:
        con.close()
    return codigo


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("modo", choices=["liga", "sintesis"])
    parser.add_argument("--max-minutos", type=int, default=40, help="tiempo máximo del scraper de síntesis (por defecto 40)")
    args = parser.parse_args()

    cargar_env_local()
    TRABAJO.mkdir(parents=True, exist_ok=True)
    codigo = modo_liga() if args.modo == "liga" else modo_sintesis(args.max_minutos)
    sys.exit(codigo)


if __name__ == "__main__":
    main()
