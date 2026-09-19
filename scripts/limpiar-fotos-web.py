r"""
Saca de scripts/fotos-web/ las imagenes que no son una foto de producto.

POR QUE: cuando la tienda no tiene foto cargada, su CDN igual devuelve un
JPEG 800x800 que dice "Imagen no disponible". Pasa el filtro de tamano del
script que las baja, asi que hay que descartarlas mirando el contenido.

COMO LAS DETECTA: contando colores distintos (sobre una version de 200x200).
Los placeholders son un icono gris plano sobre blanco y dan ~85 colores; una
foto de producto real, con sus sombras y degradados, no baja de ~3.400. El
corte en MIN_COLORES deja un margen enorme entre las dos poblaciones.

POR QUE NO SE USA "LA MISMA IMAGEN APARECE N VECES": porque hay repeticiones
legitimas. Tres tamanos de Coca Cola Sin Azucar comparten codigo de barras en
la tienda y por lo tanto la misma foto, y esa foto es buena. La repeticion se
muestra como aviso en la vista previa, pero no descarta nada.

Las movidas quedan en scripts/fotos-web/descartadas/ (no se borran, por si
alguna es un falso positivo) y se anotan en el reporte.

COMO CORRERLO (desde la raiz del repo, PowerShell)
  $env:PYTHONPATH=".pytools"; & "C:\Users\matia\AppData\Local\Python\bin\python.exe" scripts\limpiar-fotos-web.py
"""
import json
import os
import shutil

import numpy as np
from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(RAIZ, "scripts", "fotos-web")
DESCARTES = os.path.join(DIR, "descartadas")

MIN_COLORES = 1500      # placeholders ~85, fotos reales 3.400+


def colores_distintos(img):
    a = np.asarray(img.convert("RGB").resize((200, 200), Image.LANCZOS))
    return len(np.unique(a.reshape(-1, 3), axis=0))


def main():
    # vuelve a considerar lo que una corrida anterior haya apartado
    if os.path.isdir(DESCARTES):
        for f in os.listdir(DESCARTES):
            destino = os.path.join(DIR, f)
            if not os.path.exists(destino):
                shutil.move(os.path.join(DESCARTES, f), destino)

    archivos = sorted(f for f in os.listdir(DIR) if f.lower().endswith(".jpg"))
    if not archivos:
        print("no hay fotos en", DIR)
        return

    descartar = []
    for f in archivos:
        try:
            im = Image.open(os.path.join(DIR, f))
            im.load()
        except Exception as e:
            print("no se pudo abrir", f, e)
            continue
        n = colores_distintos(im)
        if n < MIN_COLORES:
            descartar.append((f, f"solo {n} colores distintos: no es una foto, es un placeholder"))

    if not descartar:
        print(f"{len(archivos)} fotos, ninguna parece placeholder")
        return

    os.makedirs(DESCARTES, exist_ok=True)
    for f, motivo in descartar:
        shutil.move(os.path.join(DIR, f), os.path.join(DESCARTES, f))
        print(f"  descartada {f}: {motivo}")

    ruta = os.path.join(DIR, "reporte.json")
    if os.path.exists(ruta):
        with open(ruta, encoding="utf-8") as fh:
            reporte = json.load(fh)
        por_motivo = dict(descartar)
        for r in reporte:
            clave = f"{r.get('id')}.jpg"
            if clave in por_motivo:
                r["estado"] = "descartada: " + por_motivo[clave]
                r.pop("archivo", None)
        with open(ruta, "w", encoding="utf-8") as fh:
            json.dump(reporte, fh, ensure_ascii=False, indent=1)

    print("")
    print(f"{len(archivos)} fotos revisadas, {len(descartar)} descartadas")
    print(f"quedan {len(archivos) - len(descartar)} utiles; las descartadas estan en {DESCARTES}")


main()
