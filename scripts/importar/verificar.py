"""
Verifica el resultado de la importación REAL contra las fuentes originales.

  python scripts/importar/verificar.py

No muestra contraseñas: solo cuántas coinciden. Comprueba:
  1. que el hash guardado de cada cuenta corresponda a la contraseña de la hoja,
  2. que no queden cuentas de prueba,
  3. que las cantidades coincidan con las hojas,
  4. que los goles de cada partido sumen el resultado.
"""

import json
import os
import re
import subprocess
import sys

import bcrypt

from importar import CUENTAS_DE_PRUEBA, DOMINIO, RAIZ, abrir_libro, hoja, norm, uid

import shutil


def consulta(sql):
    npx = shutil.which("npx.cmd") or shutil.which("npx") or r"C:\Program Files\nodejs\npx.cmd"
    env = dict(os.environ)
    env["PATH"] = r"C:\Program Files\nodejs;" + env.get("PATH", "")
    r = subprocess.run([npx, "--yes", "supabase@latest", "db", "query", "--linked", sql],
                       cwd=RAIZ, capture_output=True, text=True, encoding="utf-8", env=env)
    m = re.search(r'\{\s*"boundary".*\}', (r.stdout or "") + (r.stderr or ""), re.S)
    if r.returncode != 0 or not m:
        sys.exit("falló la consulta:\n" + ((r.stdout or "") + (r.stderr or ""))[-1500:])
    return json.loads(m.group(0))["rows"]


def main():
    libro = abrir_libro()
    problemas = []

    # 1. Contraseñas
    usuarios = [u for u in hoja(libro, "Usuarios") if u["usuario"].strip() and u["rol"].strip().lower() != "staff"]
    hashes = {r["id"]: r["encrypted_password"] for r in consulta("select id::text, encrypted_password from auth.users")}
    bien = mal = faltan = 0
    for u in usuarios:
        h = hashes.get(uid("auth", u["usuario"].strip().lower()))
        if h is None:
            faltan += 1
        elif bcrypt.checkpw(u["contrasena"].strip().encode(), h.encode()):
            bien += 1
        else:
            mal += 1
    print(f"Contraseñas: {bien} coinciden, {mal} NO coinciden, {faltan} sin cuenta (de {len(usuarios)} usuarios con login)")
    if mal or faltan:
        problemas.append("contraseñas")

    # 2. Cuentas de prueba
    ids_reales = {uid("auth", u["usuario"].strip().lower()) for u in usuarios}
    extra = [r["email"] for r in consulta("select id::text, email from auth.users") if r["id"] not in ids_reales]
    print(f"Cuentas que no vienen de la hoja: {len(extra)} {extra if extra else ''}")
    if extra:
        problemas.append("cuentas de más")
    print("Cuentas de prueba esperadas en cero:", [n for n in CUENTAS_DE_PRUEBA if f"{n}@{DOMINIO}" in extra] or "ninguna")

    # 3. Cantidades
    esperado = {
        "wellness": len(hoja(libro, "Wellness")),
        "pesos": len(hoja(libro, "Peso")),
        "pliegues": len(hoja(libro, "Pliegues")),
        "partidos_hacoaj": len(hoja(libro, "Partidos")),
        "partidos_hacoaj_jugadores": len(hoja(libro, "Partidos-jugador")),
        "fuerza_tests": len(hoja(libro, "Fuerza Pecho")) + len(hoja(libro, "Fuerza Sentadilla")),
    }
    fila = consulta("select " + ", ".join(f"(select count(*) from public.{t}) as {t}" for t in esperado))[0]
    for t, n in esperado.items():
        marca = "OK " if fila[t] == n else "ERR"
        print(f"  [{marca}] {t:28} base={fila[t]:5}  hoja={n}")
        if fila[t] != n:
            problemas.append(t)

    # 4. Goles por partido
    malos = consulta(
        "select p.fecha::text, p.goles_hacoaj, count(g.id) as goles_cargados from public.partidos_hacoaj p "
        "left join public.partidos_hacoaj_goles g on g.partido_id = p.id and not g.en_contra "
        "group by p.id having p.goles_hacoaj <> count(g.id)")
    print(f"Partidos donde el resultado no coincide con la suma de goles cargados: {len(malos)} {malos if malos else ''}")
    if malos:
        problemas.append("goles por partido")

    print("\n" + ("✓ Todo coincide." if not problemas else f"✗ Revisar: {problemas}"))
    sys.exit(1 if problemas else 0)


if __name__ == "__main__":
    main()
