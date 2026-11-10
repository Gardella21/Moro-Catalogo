r"""
Extrae las imágenes embebidas de los PDF del catálogo viejo (los que el
dueño pasó en pdf-imagenes/) y arma un manifest.json con, por cada imagen,
los bloques de texto más cercanos en la página (para poder matchearla
después contra productos.nombre en scripts/cargar-fotos.mjs).

Geometría: cada bloque de texto de la página se asigna al bloque de imagen
más cercano (distancia borde-a-borde, tipo Voronoi) — así un mismo texto no
se cuenta para dos fotos distintas, y cada foto termina con su propia lista
de candidatos ordenada por distancia.

CÓMO CORRERLO
1. Necesita PyMuPDF. En esta máquina no hay pip global, así que se instaló
   en una carpeta local del repo (gitignoreada) con:
     "/c/Users/matia/AppData/Local/Python/bin/python.exe" -m pip install --target ".pytools" pymupdf
   (si ya está instalado, no hace falta repetirlo).
2. Desde la raíz del repo:
     PYTHONPATH=".pytools" "/c/Users/matia/AppData/Local/Python/bin/python.exe" scripts/extraer-fotos-pdf.py
   (en PowerShell: $env:PYTHONPATH=".pytools"; & "C:\Users\matia\AppData\Local\Python\bin\python.exe" scripts\extraer-fotos-pdf.py)
3. Salida:
     scripts/fotos-extraidas/<slug-del-pdf>/pXXX-imgYY.<ext>
     scripts/fotos-manifest.json  (lo lee scripts/cargar-fotos.mjs)

Filtra:
  - imágenes muy chicas en pixeles (probable logo/viñeta, no foto de
    producto) -> MIN_LADO_PX / MIN_BYTES
  - imágenes que ocupan casi toda la página (fondo/decoración del diseño,
    no una foto de producto puntual) -> MAX_AREA_RATIO
Si el dueño ve que faltó algo real, ajustar esos umbrales acá.
"""

import json
import math
import os
import re
import sys

import fitz  # pymupdf

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR_PDFS = os.path.join(RAIZ, "pdf-imagenes")
DIR_SALIDA = os.path.join(RAIZ, "scripts", "fotos-extraidas")
MANIFEST = os.path.join(RAIZ, "scripts", "fotos-manifest.json")

MAX_LADO_MIN_PX = 100    # el lado más largo tiene que ser al menos esto...
MIN_LADO_MIN_PX = 30     # ...y el lado más corto al menos esto (botellas son angostas)
MIN_BYTES = 3000         # descarta imágenes triviales (1 color, etc)
MAX_AREA_RATIO = 0.5     # descarta fondos/decoración de página completa
MAX_TEXTOS_POR_IMAGEN = 6
RADIO_MAX_PT = 260        # no asignar texto a una imagen si está más lejos que esto


def slug(nombre):
    s = nombre.rsplit(".", 1)[0]
    s = re.sub(r"[^\w\-]+", "-", s, flags=re.UNICODE).strip("-")
    return s.lower()


def texto_de_bloque(b):
    partes = []
    for linea in b.get("lines", []):
        t = "".join(s.get("text", "") for s in linea.get("spans", []))
        if t.strip():
            partes.append(t.strip())
    return " ".join(partes)


def distancia_bboxes(a, b):
    ax0, ay0, ax1, ay1 = a
    bx0, by0, bx1, by1 = b
    dx = max(0.0, max(ax0 - bx1, bx0 - ax1))
    dy = max(0.0, max(ay0 - by1, by0 - ay1))
    return math.hypot(dx, dy)


def main():
    if not os.path.isdir(DIR_PDFS):
        print(f"No existe {DIR_PDFS}")
        sys.exit(1)

    os.makedirs(DIR_SALIDA, exist_ok=True)
    manifest = {}
    total_imagenes = 0

    for archivo in sorted(os.listdir(DIR_PDFS)):
        if not archivo.lower().endswith(".pdf"):
            continue
        ruta = os.path.join(DIR_PDFS, archivo)
        slug_pdf = slug(archivo)
        dir_pdf = os.path.join(DIR_SALIDA, slug_pdf)
        os.makedirs(dir_pdf, exist_ok=True)

        doc = fitz.open(ruta)
        items = []
        print(f"{archivo}: {doc.page_count} paginas")

        for pindex in range(doc.page_count):
            page = doc[pindex]
            area_pagina = page.rect.width * page.rect.height
            data = page.get_text("dict")
            blocks = data["blocks"]
            texto_blocks = [b for b in blocks if b.get("type") == 0]
            imagen_blocks_todas = [b for b in blocks if b.get("type") == 1]

            textos = []
            for tb in texto_blocks:
                t = texto_de_bloque(tb)
                if t:
                    textos.append({"bbox": tb["bbox"], "texto": t})

            # imágenes reales de producto: no-fondo, no-viñeta
            imagenes = []
            for iidx, ib in enumerate(imagen_blocks_todas):
                bbox = ib["bbox"]
                w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
                img_bytes = ib.get("image")
                if not img_bytes:
                    continue
                area = w * h
                lado_mayor, lado_menor = max(w, h), min(w, h)
                if lado_mayor < MAX_LADO_MIN_PX or lado_menor < MIN_LADO_MIN_PX or len(img_bytes) < MIN_BYTES:
                    continue
                if area_pagina > 0 and area / area_pagina > MAX_AREA_RATIO:
                    continue
                imagenes.append({
                    "idx_en_pagina": iidx,
                    "bbox": bbox,
                    "ancho": round(w),
                    "alto": round(h),
                    "bytes": len(img_bytes),
                    "ext": ib.get("ext", "png"),
                    "img_bytes": img_bytes,
                    "candidatos": [],
                })

            if not imagenes:
                continue

            # Voronoi simple: cada texto va al bloque de imagen más cercano
            for t in textos:
                mejor = None
                mejor_d = None
                for img in imagenes:
                    d = distancia_bboxes(t["bbox"], img["bbox"])
                    if mejor_d is None or d < mejor_d:
                        mejor_d = d
                        mejor = img
                if mejor is not None and mejor_d <= RADIO_MAX_PT:
                    mejor["candidatos"].append({"texto": t["texto"], "distancia": round(mejor_d, 1)})

            for img in imagenes:
                img["candidatos"].sort(key=lambda c: c["distancia"])
                img["candidatos"] = img["candidatos"][:MAX_TEXTOS_POR_IMAGEN]

            # guardar archivos + armar item del manifest
            for iidx, img in enumerate(imagenes):
                ext = img["ext"]
                nombre_archivo = f"p{pindex+1:03d}-img{img['idx_en_pagina']+1:02d}.{ext}"
                ruta_out = os.path.join(dir_pdf, nombre_archivo)
                with open(ruta_out, "wb") as f:
                    f.write(img["img_bytes"])

                items.append({
                    "archivo": os.path.relpath(ruta_out, RAIZ).replace("\\", "/"),
                    "pagina": pindex + 1,
                    "ancho": img["ancho"],
                    "alto": img["alto"],
                    "bytes": img["bytes"],
                    "candidatos": img["candidatos"],
                })
                total_imagenes += 1

        doc.close()
        manifest[archivo] = items
        print(f"  -> {len(items)} imagenes relevantes extraidas")

    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"\nTotal: {total_imagenes} imagenes -> {MANIFEST}")


if __name__ == "__main__":
    main()
