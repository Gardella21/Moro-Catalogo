r"""
Render de una región puntual de una página de un PDF de pdf-imagenes/, a
alta resolución, para leer una etiqueta cuando el recorte normal no alcanza.

CÓMO CORRERLO (desde la raíz del repo, PowerShell):
  $env:PYTHONPATH=".pytools"; & "C:\Users\matia\AppData\Local\Python\bin\python.exe" scripts\zoom-pdf.py <substring-pdf> <pagina> <x0> <y0> <x1> <y1> <dpi> <salida.png>
"""
import os
import sys

import pymupdf

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR_PDFS = os.path.join(RAIZ, "pdf-imagenes")

sub, pag = sys.argv[1].lower(), int(sys.argv[2])
x0, y0, x1, y1 = map(float, sys.argv[3:7])
dpi = int(sys.argv[7])
out = sys.argv[8]

archivo = next(a for a in sorted(os.listdir(DIR_PDFS)) if a.lower().endswith(".pdf") and sub in a.lower())
doc = pymupdf.open(os.path.join(DIR_PDFS, archivo))
page = doc[pag - 1]
pix = page.get_pixmap(dpi=dpi, clip=pymupdf.Rect(x0, y0, x1, y1) & page.rect)
pix.save(out)
print(f"{archivo} p{pag} -> {out} ({pix.width}x{pix.height})")
