r"""
Renderiza a PNG las páginas de los PDF del catálogo viejo (pdf-imagenes/).
Sirve para poder MIRAR cada página antes de recortar (el intento anterior
falló por matchear a ciegas por proximidad de texto).

CÓMO CORRERLO (desde la raíz del repo, PowerShell):
  $env:PYTHONPATH=".pytools"; & "C:\Users\matia\AppData\Local\Python\bin\python.exe" scripts\render-paginas-pdf.py <dir-salida> [dpi] [pdf-substring]

Salida: <dir-salida>/<slug-pdf>/pXXX.png
"""
import os
import re
import sys

import pymupdf

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR_PDFS = os.path.join(RAIZ, "pdf-imagenes")


def slug(nombre):
    s = nombre.rsplit(".", 1)[0]
    s = re.sub(r"[^\w\-]+", "-", s, flags=re.UNICODE).strip("-")
    return s.lower()


def main():
    salida = sys.argv[1]
    dpi = int(sys.argv[2]) if len(sys.argv) > 2 else 110
    filtro = sys.argv[3].lower() if len(sys.argv) > 3 else None

    os.makedirs(salida, exist_ok=True)
    for archivo in sorted(os.listdir(DIR_PDFS)):
        if not archivo.lower().endswith(".pdf"):
            continue
        if filtro and filtro not in archivo.lower():
            continue
        doc = pymupdf.open(os.path.join(DIR_PDFS, archivo))
        d = os.path.join(salida, slug(archivo))
        os.makedirs(d, exist_ok=True)
        for i in range(doc.page_count):
            pix = doc[i].get_pixmap(dpi=dpi)
            pix.save(os.path.join(d, f"p{i+1:03d}.png"))
        print(f"{archivo}: {doc.page_count} paginas -> {d}")
        doc.close()


if __name__ == "__main__":
    main()
