r"""
Recorta las fotos de producto de los PDF del catálogo viejo (pdf-imagenes/)
RENDERIZANDO cada página a alta resolución y recortando la región de cada
foto, en vez de extraer los objetos de imagen embebidos.

POR QUÉ: el intento anterior (scripts/extraer-fotos-pdf.py) sacaba los
objetos embebidos, pero estos PDF guardan cada foto partida en tiras/tiles
(ej. un objeto de 80x316 px que es solo el cuello de la botella). Renderizando
la página se obtiene la foto compuesta y completa.

CÓMO ENCUENTRA LA REGIÓN DE CADA FOTO
1. Toma los bboxes de todos los bloques de imagen de la página (que son los
   tiles), descarta los que ocupan casi toda la página (fondo del diseño).
2. Los agrupa: dos bboxes que se tocan o se superponen (gap <= GAP_PT) son
   pedazos de la misma foto. La unión del grupo es la región de la foto.
3. AGRANDA esa región (ver "MARGEN" abajo) y la renderiza a DPI.
4. Cuadra el recorte estirando sus píxeles de borde (ver "CUADRADO").
5. Guarda además, por cada recorte, los bloques de texto más cercanos
   (tipo Voronoi, igual que el script viejo) como PISTA para el matcheo —
   pero el matcheo final se hace MIRANDO las imágenes, no solo con esto.

MARGEN (por qué existe)
La primera versión recortaba exactamente el bbox útil (el rectángulo con
alfa > 0 de la imagen embebida) y las botellas salían cortadas al ras: se
perdían el corcho arriba y la base abajo. La foto completa SÍ está en la
página, solo hay que pedir un rectángulo más grande. Se agranda por
MARGEN_X / MARGEN_Y, pero cada lado frena antes de comerse un bloque de
texto o la foto del producto de al lado.

CUADRADO (por qué existe)
Las tarjetas del catálogo muestran la foto en un cuadrado. Una foto alta y
angosta dejaba dos franjas blancas a los costados y se veía el rectángulo
del fondo del PDF pegado contra el blanco de la tarjeta. Acá se cuadra
rellenando con los propios píxeles del borde de la foto (estirados y
difuminados hacia el color de fondo), así la tarjeta queda a todo ancho y
sin costura. Se guarda JPEG porque el resultado es una foto sin
transparencia y el PNG cuadrado pesaba ~1 MB por producto.

CÓMO CORRERLO (desde la raíz del repo, PowerShell):
  $env:PYTHONPATH=".pytools"; & "C:\Users\matia\AppData\Local\Python\bin\python.exe" scripts\recortar-fotos-pdf.py <dir-salida> [dpi]

Salida:
  <dir-salida>/<slug-pdf>/pXXX-cYY.jpg
  <dir-salida>/recortes-manifest.json
"""
import json
import math
import os
import re
import sys

import numpy as np
import pymupdf
from PIL import Image, ImageFilter

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR_PDFS = os.path.join(RAIZ, "pdf-imagenes")

MARGEN_X = 0.18         # cuánto se agranda el bbox a los costados
MARGEN_Y = 0.10         # y arriba/abajo (la botella se corta sobre todo acá)
SEP_TEXTO_PT = 2.0      # aire que se deja contra un texto o una foto vecina
LADO_SALIDA = 800       # px del cuadrado final
DPI_MAX = 700           # techo del dpi por foto (más no agrega detalle real)
OCUPA = 0.90            # qué fracción del cuadrado ocupa la foto real
CALIDAD_JPEG = 86

GAP_PT = 2.0            # tiles de la misma foto se tocan; 2pt de tolerancia
MAX_AREA_RATIO = 0.45   # más que esto = fondo decorativo de la página
MIN_LADO_PT = 24        # grupos más chicos que esto no son foto de producto
MIN_AREA_PT = 2000      # ni muy poca superficie total
MAX_TEXTOS = 6
RADIO_MAX_PT = 260


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
    dx = max(0.0, max(a[0] - b[2], b[0] - a[2]))
    dy = max(0.0, max(a[1] - b[3], b[1] - a[3]))
    return math.hypot(dx, dy)


def cerca(a, b, gap=GAP_PT):
    """¿Son dos pedazos de la MISMA foto?

    Dos tiras de una misma foto o se superponen, o comparten un borde
    completo (misma anchura si están una arriba de la otra, misma altura si
    están una al lado de la otra). Se exige esa alineación para no pegar,
    por ejemplo, el título de la página (una imagen ancha y baja) con la
    foto del producto que tiene justo abajo.
    """
    if distancia_bboxes(a, b) > gap:
        return False
    solape_x = min(a[2], b[2]) - max(a[0], b[0])
    solape_y = min(a[3], b[3]) - max(a[1], b[1])
    ancho_min = min(a[2] - a[0], b[2] - b[0])
    alto_min = min(a[3] - a[1], b[3] - b[1])
    if solape_x > 0.5 * ancho_min and solape_y > 0.5 * alto_min:
        return True  # se superponen de verdad
    if solape_x >= 0.8 * ancho_min and abs(solape_y) <= gap:
        return True  # una arriba de la otra, mismo ancho
    if solape_y >= 0.8 * alto_min and abs(solape_x) <= gap:
        return True  # una al lado de la otra, misma altura
    return False


def unir(a, b):
    return (min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3]))


def agrupar(bboxes):
    """Une bboxes que se tocan, de a uno, hasta que no haya más fusiones."""
    grupos = [[bb] for bb in bboxes]
    cambio = True
    while cambio:
        cambio = False
        for i in range(len(grupos)):
            if grupos[i] is None:
                continue
            ui = grupos[i][0]
            for k in range(1, len(grupos[i])):
                ui = unir(ui, grupos[i][k])
            for j in range(i + 1, len(grupos)):
                if grupos[j] is None:
                    continue
                uj = grupos[j][0]
                for k in range(1, len(grupos[j])):
                    uj = unir(uj, grupos[j][k])
                if cerca(ui, uj):
                    grupos[i] = grupos[i] + grupos[j]
                    grupos[j] = None
                    cambio = True
                    ui = unir(ui, uj)
        grupos = [g for g in grupos if g is not None]
    salida = []
    for g in grupos:
        u = g[0]
        for bb in g[1:]:
            u = unir(u, bb)
        salida.append({"bbox": u, "piezas": len(g)})
    return salida


_cache_smask = {}


def rect_util_de_imagen(doc, info):
    """Rect (en puntos de página) que ocupa realmente el contenido de la imagen.

    Las fotos de estos PDF son PNG con máscara de transparencia (smask) y
    suelen tener mucho margen transparente alrededor de la botella; el bbox
    de colocación incluye ese margen, y ahí abajo asoma el diseño de la
    página (las cajas bordó con los sabores). Se calcula el recuadro de
    píxeles con alfa > UMBRAL y se mapea al rect de colocación.
    """
    xref = info["xref"]
    if xref not in _cache_smask:
        frac = None
        try:
            datos = doc.extract_image(xref)
            smask = datos.get("smask")
            if smask:
                pm = pymupdf.Pixmap(doc, smask)
                if pm.n == 1:
                    s = pm.samples
                    w, h, stride = pm.width, pm.height, pm.stride
                    # <=16 -> 0, >16 -> 255, para poder usar find/rfind (C)
                    tabla = bytes(0 if i <= 16 else 255 for i in range(256))
                    s = s.translate(tabla)
                    x0, y0, x1, y1 = w, h, -1, -1
                    for y in range(h):
                        fila = s[y * stride:y * stride + w]
                        i = fila.find(b"\xff")
                        if i == -1:
                            continue
                        j = fila.rfind(b"\xff")
                        y0 = min(y0, y)
                        y1 = max(y1, y)
                        x0 = min(x0, i)
                        x1 = max(x1, j)
                    if x1 >= 0 and y1 >= 0 and x1 > x0 and y1 > y0:
                        frac = (x0 / w, y0 / h, (x1 + 1) / w, (y1 + 1) / h)
        except Exception:
            frac = None
        _cache_smask[xref] = frac
    frac = _cache_smask[xref]
    bb = info["bbox"]
    if not frac:
        return tuple(bb)
    w, h = bb[2] - bb[0], bb[3] - bb[1]
    return (bb[0] + frac[0] * w, bb[1] + frac[1] * h,
            bb[0] + frac[2] * w, bb[1] + frac[3] * h)


def visibles_de_pagina(doc, page, data, area_pagina):
    """bboxes de las fotos visibles: bbox recortado del render (que ya viene
    clipeado) intersectado con el contenido no-transparente de la imagen."""
    infos = page.get_image_info(xrefs=True)
    bboxes = []
    for b in data["blocks"]:
        if b.get("type") != 1:
            continue
        bb = tuple(b["bbox"])
        w, h = bb[2] - bb[0], bb[3] - bb[1]
        if area_pagina > 0 and (w * h) / area_pagina > MAX_AREA_RATIO:
            continue
        # placement que corresponde a este bloque (el que mejor lo contiene)
        mejor, mejor_area = None, None
        for info in infos:
            ib = info["bbox"]
            ix0, iy0 = max(bb[0], ib[0]), max(bb[1], ib[1])
            ix1, iy1 = min(bb[2], ib[2]), min(bb[3], ib[3])
            if ix1 <= ix0 or iy1 <= iy0:
                continue
            inter = (ix1 - ix0) * (iy1 - iy0)
            if inter < 0.5 * w * h:
                continue
            area_info = (ib[2] - ib[0]) * (ib[3] - ib[1])
            if mejor_area is None or area_info < mejor_area:
                mejor, mejor_area = info, area_info
        if mejor is not None:
            u = rect_util_de_imagen(doc, mejor)
            nx0, ny0 = max(bb[0], u[0]), max(bb[1], u[1])
            nx1, ny1 = min(bb[2], u[2]), min(bb[3], u[3])
            if nx1 - nx0 > 5 and ny1 - ny0 > 5:
                bb = (nx0, ny0, nx1, ny1)
        bboxes.append(bb)
    return bboxes


def expandir(bb, page_rect, obstaculos):
    """Agranda bb por MARGEN_*, frenando cada lado antes de un obstáculo.

    Un obstáculo es un bloque de texto de la página o el bbox de otra foto:
    sin esto, al pedir más margen el recorte se come el nombre del producto
    impreso abajo o un pedazo de la botella de al lado.
    """
    x0, y0, x1, y1 = bb
    w, h = x1 - x0, y1 - y0
    nx0, ny0 = x0 - w * MARGEN_X, y0 - h * MARGEN_Y
    nx1, ny1 = x1 + w * MARGEN_X, y1 + h * MARGEN_Y
    for ox0, oy0, ox1, oy1 in obstaculos:
        # solo frena el lado por el que el obstáculo está realmente enfrentado
        if ox1 > x0 and ox0 < x1:
            if oy1 <= y0 + 1:
                ny0 = max(ny0, oy1 + SEP_TEXTO_PT)
            elif oy0 >= y1 - 1:
                ny1 = min(ny1, oy0 - SEP_TEXTO_PT)
        if oy1 > y0 and oy0 < y1:
            if ox1 <= x0 + 1:
                nx0 = max(nx0, ox1 + SEP_TEXTO_PT)
            elif ox0 >= x1 - 1:
                nx1 = min(nx1, ox0 - SEP_TEXTO_PT)
    # nunca más chico que el bbox original
    rect = pymupdf.Rect(min(nx0, x0), min(ny0, y0), max(nx1, x1), max(ny1, y1))
    return rect & page_rect


def cuadrar(img):
    """Mete la foto en un cuadrado rellenando con sus propios píxeles de borde.

    Los costados se rellenan estirando la columna del borde (el fondo de
    estas fotos es plano en horizontal, así que no se nota el estirado).
    Arriba y abajo se hace un degradé desde la fila del borde hacia el color
    medio del fondo, porque ahí sí suele haber una franja más clara (la
    sombra bajo la botella) que estirada quedaría como una banda dura.
    """
    lado = LADO_SALIDA
    util = int(lado * OCUPA)
    # escala SIEMPRE (thumbnail() solo achica, y así los recortes chicos
    # quedaban minúsculos en el medio del cuadrado, cada tarjeta con la
    # botella de un tamaño distinto)
    esc = util / max(img.width, img.height)
    im = img.convert("RGB").resize(
        (max(1, round(img.width * esc)), max(1, round(img.height * esc))), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32)
    ah, aw, _ = a.shape
    ox, oy = (lado - aw) // 2, (lado - ah) // 2

    ring = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    fondo = np.median(ring, axis=0)

    out = np.zeros((lado, lado, 3), np.float32)
    out[oy:oy + ah, ox:ox + aw] = a

    # arriba / abajo: degradé fila-de-borde -> color de fondo
    if oy > 0:
        t = (np.arange(oy, 0, -1, dtype=np.float32) / oy)[:, None, None]
        out[:oy, ox:ox + aw] = a[0] * (1 - t) + fondo * t
    resto = lado - (oy + ah)
    if resto > 0:
        t = (np.arange(1, resto + 1, dtype=np.float32) / resto)[:, None, None]
        out[oy + ah:, ox:ox + aw] = a[-1] * (1 - t) + fondo * t

    # costados: estirar la columna de borde (ya completa en todo el alto)
    if ox > 0:
        out[:, :ox] = out[:, ox:ox + 1]
    resto_x = lado - (ox + aw)
    if resto_x > 0:
        out[:, ox + aw:] = out[:, ox + aw - 1:ox + aw]

    cuadro = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
    # suaviza el relleno sin tocar la foto: se difumina todo y se repega la foto
    suave = cuadro.filter(ImageFilter.GaussianBlur(6))
    suave.paste(im, (ox, oy))
    return suave


def main():
    salida = sys.argv[1]
    dpi = int(sys.argv[2]) if len(sys.argv) > 2 else 200
    filtro = sys.argv[3].lower() if len(sys.argv) > 3 else None
    os.makedirs(salida, exist_ok=True)
    manifest = {}
    total = 0

    for archivo in sorted(os.listdir(DIR_PDFS)):
        if not archivo.lower().endswith(".pdf"):
            continue
        if filtro and filtro not in archivo.lower():
            continue
        doc = pymupdf.open(os.path.join(DIR_PDFS, archivo))
        sp = slug(archivo)
        dpdf = os.path.join(salida, sp)
        os.makedirs(dpdf, exist_ok=True)
        items = []

        for pindex in range(doc.page_count):
            page = doc[pindex]
            area_pagina = page.rect.width * page.rect.height
            data = page.get_text("dict")
            textos = []
            for b in data["blocks"]:
                if b.get("type") == 0:
                    t = texto_de_bloque(b)
                    if t:
                        textos.append({"bbox": b["bbox"], "texto": t})

            bboxes = visibles_de_pagina(doc, page, data, area_pagina)

            grupos = [g for g in agrupar(bboxes)
                      if (g["bbox"][2] - g["bbox"][0]) >= MIN_LADO_PT
                      and (g["bbox"][3] - g["bbox"][1]) >= MIN_LADO_PT
                      and (g["bbox"][2] - g["bbox"][0]) * (g["bbox"][3] - g["bbox"][1]) >= MIN_AREA_PT
                      and (g["bbox"][2] - g["bbox"][0]) * (g["bbox"][3] - g["bbox"][1]) / area_pagina <= MAX_AREA_RATIO]
            if not grupos:
                continue
            grupos.sort(key=lambda g: (round(g["bbox"][1] / 40), g["bbox"][0]))

            # texto más cercano -> pista de qué producto es cada recorte
            for g in grupos:
                g["candidatos"] = []
            for t in textos:
                mejor, mejor_d = None, None
                for g in grupos:
                    d = distancia_bboxes(t["bbox"], g["bbox"])
                    if mejor_d is None or d < mejor_d:
                        mejor, mejor_d = g, d
                if mejor is not None and mejor_d <= RADIO_MAX_PT:
                    mejor["candidatos"].append({"texto": t["texto"], "distancia": round(mejor_d, 1)})

            for gi, g in enumerate(grupos):
                bb = g["bbox"]
                obstaculos = [tuple(t["bbox"]) for t in textos]
                obstaculos += [tuple(o["bbox"]) for o in grupos if o is not g]
                clip = expandir(bb, page.rect, obstaculos)
                if clip.width < 5 or clip.height < 5:
                    continue
                # DPI a medida: se renderiza con la resolución justa para que
                # el lado largo caiga en el cuadrado final sin tener que
                # agrandar píxeles después (las fotos chicas de la página
                # salían borrosas si se renderizaban todas al mismo dpi)
                lado_pt = max(clip.width, clip.height)
                dpi_foto = min(DPI_MAX, max(dpi, int(LADO_SALIDA * OCUPA / lado_pt * 72) + 1))
                recorte = page.get_pixmap(dpi=dpi_foto, clip=clip)
                foto = Image.frombytes("RGB", (recorte.width, recorte.height), recorte.samples)
                cuadro = cuadrar(foto)
                nombre = f"p{pindex+1:03d}-c{gi+1:02d}.jpg"
                cuadro.save(os.path.join(dpdf, nombre), "JPEG",
                            quality=CALIDAD_JPEG, optimize=True, progressive=True)
                g["candidatos"].sort(key=lambda c: c["distancia"])
                items.append({
                    "archivo": os.path.join(sp, nombre).replace("\\", "/"),
                    "pagina": pindex + 1,
                    "bbox_pt": [round(v, 1) for v in bb],
                    "bbox_con_margen_pt": [round(v, 1) for v in clip],
                    "px": [cuadro.width, cuadro.height],
                    "piezas": g["piezas"],
                    "candidatos": g["candidatos"][:MAX_TEXTOS],
                })
                total += 1

        manifest[archivo] = items
        print(f"{archivo}: {len(items)} recortes")
        doc.close()

    with open(os.path.join(salida, "recortes-manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
    print(f"\nTotal: {total} recortes -> {salida}")


if __name__ == "__main__":
    main()
