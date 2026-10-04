"""
Sube las fotos de perfil de la v1 (static/fotos/{usuario}.png) al bucket
`avatares` de Supabase Storage y guarda la ruta en `perfiles.foto_path`.

  python scripts/importar/subir_fotos.py --solo-listar   # muestra qué haría, sin subir
  python scripts/importar/subir_fotos.py                 # sube las que faltan
  python scripts/importar/subir_fotos.py --reemplazar    # vuelve a subir también las que ya tienen foto

Cada archivo se guarda con un nombre aleatorio (no con el usuario) para que la URL
no se pueda adivinar. Es seguro repetirlo: por defecto no toca a quien ya tiene foto.
"""

import argparse
import os
import shutil
import subprocess
import sys
import uuid

from importar import RAIZ, V1, abrir_libro, hoja, norm, uid
from verificar import consulta

CARPETA = V1 / "static" / "fotos"
BUCKET = "avatares"


def subir(archivo, destino):
    npx = shutil.which("npx.cmd") or shutil.which("npx") or r"C:\Program Files\nodejs\npx.cmd"
    env = dict(os.environ)
    env["PATH"] = r"C:\Program Files\nodejs;" + env.get("PATH", "")
    # Se ejecuta DESDE la carpeta de las fotos y con la ruta relativa: el CLI confunde la letra
    # de unidad de Windows ("C:") con un prefijo de URL.
    r = subprocess.run(
        [npx, "--yes", "supabase@latest", "--experimental", "--workdir", str(RAIZ), "storage", "cp",
         archivo.name, f"ss:///{BUCKET}/{destino}", "--linked", "--content-type", "image/png"],
        cwd=archivo.parent, capture_output=True, text=True, encoding="utf-8", env=env)
    if r.returncode != 0:
        raise RuntimeError(((r.stdout or "") + (r.stderr or ""))[-600:])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--solo-listar", action="store_true")
    ap.add_argument("--reemplazar", action="store_true")
    args = ap.parse_args()

    usuarios = hoja(abrir_libro(), "Usuarios")
    perfil_de = {u["usuario"].strip().lower(): (uid("perfil", norm(u["nombre"])), u["nombre"].strip())
                 for u in usuarios if u["usuario"].strip()}
    ya = {r["id"]: r["foto_path"] for r in consulta("select id::text, foto_path from public.perfiles")}

    pendientes, sin_usuario, omitidas = [], [], 0
    for f in sorted(CARPETA.glob("*.png")):
        login = f.stem.strip().lower()
        if login not in perfil_de:
            sin_usuario.append(f.name)
            continue
        pid, nombre = perfil_de[login]
        if pid not in ya:
            sin_usuario.append(f"{f.name} (el perfil no existe en la base)")
        elif ya[pid] and not args.reemplazar:
            omitidas += 1
        else:
            pendientes.append((f, pid, nombre))

    sin_foto = [n for l, (p, n) in perfil_de.items() if not (CARPETA / f"{l}.png").exists() and not ya.get(p)]
    print(f"Fotos para subir: {len(pendientes)} | ya tenían: {omitidas} | sin usuario en la hoja: {len(sin_usuario)}")
    for n in sin_usuario:
        print("   ⚠ archivo sin usuario:", n)
    print(f"Personas con login SIN foto en la v1 ({len(sin_foto)}):", sin_foto)
    if args.solo_listar:
        for f, _, nombre in pendientes:
            print("   →", f.name, "→", nombre)
        return

    cambios = []
    for f, pid, nombre in pendientes:
        ruta = f"{uuid.uuid4()}.png"
        subir(f, ruta)
        cambios.append((pid, ruta))
        print("   ✓", nombre)
    if cambios:
        valores = ", ".join(f"('{p}'::uuid, '{r}')" for p, r in cambios)
        consulta(f"update public.perfiles set foto_path = v.ruta from (values {valores}) as v(id, ruta) "
                 "where public.perfiles.id = v.id returning 1")
    print(f"\n✓ {len(cambios)} foto(s) subida(s) y vinculada(s).")


if __name__ == "__main__":
    main()
