#!/usr/bin/env python
"""Cuadra a 800x800 las fotos bajadas de la web (scripts/fotos-web/<id>.jpg).

POR QUE
Las tarjetas del catálogo muestran la foto en un cuadrado con `object-cover`
(ver src/components/Catalogo.parts.jsx). Una foto alta y finita entra
recortada por los costados (se come la etiqueta) y una apaisada queda cortada
arriba y abajo. Las fotos que cada tienda publica vienen en cualquier
proporción, así que hay que cuadrarlas antes de subirlas.

COMO
El mismo criterio que scripts/recortar-fotos-pdf.py usó para los recortes de
los PDF: la foto se escala para ocupar el 90% del cuadrado y el resto se
rellena con sus propios píxeles de borde (costados estirados, arriba/abajo un
degradé hacia el color de fondo), en vez de barras blancas duras.

USO (desde la raíz del repo)
  $env:PYTHONPATH=".pytools"; & "C:\\Users\\matia\\AppData\\Local\\Python\\bin\\python.exe" scripts\\cuadrar-fotos-web.py
      -> solo analiza y lista qué fotos quedan mal en la tarjeta

  ... scripts\\cuadrar-fotos-web.py --cuadrar
      -> guarda los originales en scripts/fotos-web-originales/ y deja los
         cuadrados en scripts/fotos-web/, listos para preview-fotos.mjs --web
         y para fotos-desde-urls.mjs --subir
"""

import os
import shutil
import sys

import numpy as np
from PIL import Image, ImageFilter

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR_WEB = os.path.join(RAIZ, "scripts", "fotos-web")
DIR_ORIG = os.path.join(RAIZ, "scripts", "fotos-web-originales")

LADO_SALIDA = 800
OCUPA = 0.90
# fuera de esta banda la foto se ve recortada en la tarjeta cuadrada
RATIO_OK = (0.95, 1.05)
# menos que esto y la foto se ve borrosa al estirarla a 800
LADO_MINIMO = 300
# cuánto puede variar el borde de la foto para que el relleno pase desapercibido
BORDE_RUIDO_MAX = 18.0


def cuadrar(img):
    """Mete la foto en un cuadrado rellenando con sus propios píxeles de borde.

    Los costados se rellenan estirando la columna del borde. Arriba y abajo se
    hace un degradé desde la fila del borde hacia el color medio del fondo,
    porque ahí suele haber una franja distinta (la sombra bajo la botella) que
    estirada quedaría como una banda dura.

    Excepción: si el borde de la foto no es parejo (fondo fotográfico, o una
    franja de diseño promocional pegada a un lado), estirarlo deja una banda de
    color cruzando la tarjeta. En ese caso se rellena con blanco, que es el
    fondo de la tarjeta.
    """
    lado = LADO_SALIDA
    util = int(lado * OCUPA)
    esc = util / max(img.width, img.height)
    im = sobre_blanco(img).resize(
        (max(1, round(img.width * esc)), max(1, round(img.height * esc))), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32)
    ah, aw, _ = a.shape
    ox, oy = (lado - aw) // 2, (lado - ah) // 2

    ring = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    fondo = np.median(ring, axis=0)

    if float(ring.std(axis=0).mean()) > BORDE_RUIDO_MAX:
        out = np.full((lado, lado, 3), 255.0, np.float32)
        out[oy:oy + ah, ox:ox + aw] = a
        return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))

    out = np.zeros((lado, lado, 3), np.float32)
    out[oy:oy + ah, ox:ox + aw] = a

    if oy > 0:
        t = (np.arange(oy, 0, -1, dtype=np.float32) / oy)[:, None, None]
        out[:oy, ox:ox + aw] = a[0] * (1 - t) + fondo * t
    resto = lado - (oy + ah)
    if resto > 0:
        t = (np.arange(1, resto + 1, dtype=np.float32) / resto)[:, None, None]
        out[oy + ah:, ox:ox + aw] = a[-1] * (1 - t) + fondo * t

    if ox > 0:
        out[:, :ox] = out[:, ox:ox + 1]
    resto_x = lado - (ox + aw)
    if resto_x > 0:
        out[:, ox + aw:] = out[:, ox + aw - 1:ox + aw]

    cuadro = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
    suave = cuadro.filter(ImageFilter.GaussianBlur(6))
    suave.paste(im, (ox, oy))
    return suave


def sobre_blanco(img):
    """Pasa la foto a RGB apoyándola sobre blanco si tiene transparencia.

    Varias tiendas publican PNG/WEBP con el fondo transparente. Convertir eso
    a RGB derecho viejo descarta el canal alfa y deja a la vista lo que haya
    debajo, que suele ser negro: la botella terminaba recortada sobre un
    cuadrado negro en la tarjeta.
    """
    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
        rgba = img.convert("RGBA")
        fondo = Image.new("RGB", rgba.size, (255, 255, 255))
        fondo.paste(rgba, mask=rgba.split()[-1])
        return fondo
    return img.convert("RGB")


def ruido_del_borde(img):
    """Cuánto varía el marco exterior de la foto.

    Cerca de 0 es un fondo plano (blanco de tienda): el relleno se funde y no
    se nota. Valores altos son fotos con fondo fotográfico o con una franja de
    diseño promocional pegada a un lado — ahí el relleno estira esa franja y
    queda una banda de color a la vista.
    """
    a = np.asarray(sobre_blanco(img)).astype(np.float32)
    ring = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    return float(ring.std(axis=0).mean())


def main():
    hacer = "--cuadrar" in sys.argv
    archivos = sorted(f for f in os.listdir(DIR_WEB) if f.endswith(".jpg"))
    # después de cuadrar, el análisis tiene que mirar los originales
    dir_analisis = DIR_ORIG if os.path.isdir(DIR_ORIG) else DIR_WEB

    validas, invalidas = [], []
    for f in archivos:
        ruta = os.path.join(dir_analisis, f)
        if not os.path.exists(ruta):
            ruta = os.path.join(DIR_WEB, f)
        try:
            with Image.open(ruta) as im:
                validas.append((f, im.width, im.height, ruido_del_borde(im)))
        except Exception as e:
            invalidas.append((f, str(e).split("\n")[0][:60]))

    recortadas = [v for v in validas if not (RATIO_OK[0] <= v[1] / v[2] <= RATIO_OK[1])]
    chicas = [v for v in validas if max(v[1], v[2]) < LADO_MINIMO]
    # el relleno solo se nota cuando además hay que rellenar (foto no cuadrada)
    sucias = [v for v in recortadas if v[3] > BORDE_RUIDO_MAX]

    print(f"Fotos en {DIR_WEB}: {len(archivos)}")
    print(f"  válidas: {len(validas)} · no son imágenes: {len(invalidas)}")
    print(f"  se recortan en la tarjeta (no son cuadradas): {len(recortadas)}")
    print(f"  baja resolución (lado < {LADO_MINIMO}px, se van a ver borrosas): {len(chicas)}")
    print(f"  fondo no plano (al cuadrarlas queda una banda de color): {len(sucias)}")

    if invalidas:
        print("\nNo son imágenes (la descarga trajo otra cosa):")
        for f, err in invalidas:
            print(f"  {f}: {err}")

    if recortadas:
        print("\nNo cuadradas (las peores primero):")
        peores = sorted(recortadas, key=lambda v: abs(1 - v[1] / v[2]), reverse=True)
        for f, w, h, _ in peores[:20]:
            forma = "apaisada" if w > h else "alta"
            print(f"  {f}: {w}x{h} ({forma}, ratio {w / h:.2f})")
        if len(peores) > 20:
            print(f"  ... y {len(peores) - 20} más")

    if chicas:
        print("\nBaja resolución:")
        for f, w, h, _ in sorted(chicas, key=lambda v: max(v[1], v[2])):
            print(f"  {f}: {w}x{h}")

    if sucias:
        print("\nFondo no plano (conviene reemplazar la foto por una sobre blanco):")
        for f, w, h, ruido in sorted(sucias, key=lambda v: v[3], reverse=True):
            print(f"  {f}: {w}x{h} (ruido de borde {ruido:.0f})")

    if not hacer:
        print("\nModo análisis (no se tocó ningún archivo).")
        print("Para cuadrarlas: agregá --cuadrar")
        return

    os.makedirs(DIR_ORIG, exist_ok=True)
    print(f"\nCuadrando {len(validas)} fotos a {LADO_SALIDA}x{LADO_SALIDA}...")
    ok = 0
    for f, _, _, _ in validas:
        ruta = os.path.join(DIR_WEB, f)
        guardado = os.path.join(DIR_ORIG, f)
        if not os.path.exists(guardado):
            shutil.copy2(ruta, guardado)
        with Image.open(guardado) as im:
            cuadro = cuadrar(im)
        cuadro.save(ruta, "JPEG", quality=82, optimize=True, progressive=True)
        ok += 1

    print(f"Cuadradas: {ok}")
    print(f"Los originales quedaron en {DIR_ORIG}")
    print("\nPara verlas en la grilla real: node scripts/preview-fotos.mjs --web")


main()
