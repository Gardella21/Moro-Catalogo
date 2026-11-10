# Contexto para Claude Code

Catálogo mayorista de Valfer Bebidas Chivilcoy SA (antes "Moro Distribuidora",
renombrado por pedido del dueño). Ver [README.md](./README.md) (cómo
arrancar, conectar Supabase, publicar) y [DECISIONES.md](./DECISIONES.md)
(por qué Supabase, problemas del Excel, estructura de datos) antes de tocar nada:
ahí está el razonamiento completo, esto es solo el resumen de la sesión anterior.

## Stack y deploy

- React + Vite + Tailwind (front), Supabase (Postgres + Auth + Storage).
- Hosting: **Vercel** (no Netlify — se sacó toda referencia y el
  `public/_redirects` de Netlify; el rewrite del SPA vive en `vercel.json`).
- Repo: https://github.com/Gardella21/Moro-Catalogo (público — nunca commitear
  `.env`, ya está en `.gitignore`).

## Qué se hizo en la sesión anterior (la de esta entrada)

1. Cambio de datos en Supabase (sin tocar código): en "Champagne y sidras" la
   subsección "Botella" (18 productos, todo sidras: Rama Caída, 1888, 1930,
   Real, Farruca, Quintana) pasó a llamarse **"Sidras"**; en "Vinos" la
   subsección "Bodega Esmeralda" (5 productos) pasó a llamarse **"F. de
   Alvear"**. Se corrió directo contra Supabase con el service role key del
   `.env` (mismo patrón que `scripts/dump-categorias.mjs`), sin pasar por el
   SQL Editor.
2. Panel (`src/pages/Admin.jsx`), pedido del dueño: dividir el modal de
   "Agregar" en dos flujos separados.
   - "+ Producto": el formulario de siempre, sin cambios.
   - "+ Sección": modal nuevo (`FormularioSeccion` + `guardarSeccion`) que
     solo pide el nombre e inserta una fila en `categorias` (slug
     auto-generado sin acentos y en minúsculas, `orden` = último + 1,
     `visible = true`). Antes no existía ninguna forma de crear una sección
     nueva (categoría de nivel superior) desde el panel, solo subsecciones.
3. Se sumó "Eliminar sección": con una sección elegida en los chips de arriba
   aparece un link para borrarla. Si todavía tiene productos cargados no deja
   borrar y avisa cuántos tiene (la FK `productos.categoria_id` es `on delete
   restrict`); si está vacía, pide confirmación y borra.
4. El dueño probó todo logueado en el panel real (crear/borrar sección,
   agregar producto) y confirmó que anda bien. Commit `d52c44a`, pusheado a
   `main`.

## Sesión 2026-11-10

1. Panel (`src/pages/Admin.jsx`): botones "▲ Subir / ▼ Bajar" en el encabezado
   de cada subsección para mover la subsección entera dentro de su sección
   (`moverSubseccion`). No hay tabla de subsecciones: su orden sale del
   `orden` de sus productos, así que se mueve el bloque completo y se
   renumera con `guardarOrden` (compartida con el reordenamiento de
   productos; solo guarda los que cambiaron). **No se probó en la app real.**
2. Catálogo (`src/pages/Catalogo.jsx`): los chips de subsección ya no van en
   orden alfabético, siguen el orden armado a mano en el panel.
3. Scripts de fotos sumados al repo:
   - `faltan-fotos.mjs` → genera `faltan-fotos.csv/.html` con los productos
     sin foto y links de búsqueda.
   - `fotos-urls.json` (id → URL, armado a mano desde la planilla del dueño)
     → `fotos-desde-urls.mjs` las baja a `scripts/fotos-web/` →
     `cuadrar-fotos-web.py --cuadrar` las lleva a 800x800 → se suben con el
     mismo script (ver su cabecera).
   - `extraer-fotos-pdf.py` + `cargar-fotos.mjs`: flujo viejo de matchear
     imágenes embebidas de los PDF contra `productos.nombre`.
4. `.gitignore`: se sumaron `LISTA DE PRECIOS*.csv` (precios mayoristas, el
   repo es público), `scripts/fotos-web-originales/` (12 MB de originales) y
   `Logo-Nuevo.jpeg` (todavía no se usa en ningún lado). Siguen en disco.
5. Commits `8677ed5` y `cc05d04`, pusheados a `main`.

## Pendiente

- Cargar `VITE_WHATSAPP` (número real) y `VITE_NEGOCIO` en Vercel (tipo
  Config, no Secret) + redeploy.
- Probar en el panel real el "Subir / Bajar" de subsecciones.
- Decidir si `Logo-Nuevo.jpeg` reemplaza al logo actual del sitio.
- Fotos: 364 productos tienen foto (recortadas de los PDF de `pdf-imagenes/`,
  ver `scripts/recortar-fotos-pdf.py`). Las categorías Gaseosas, Mercadería,
  Saborizadas, Limpieza y Jugos siguen sin foto porque esos productos no
  están fotografiados en ningún PDF: hace falta otra fuente.
  - Para regenerar: `recortar-fotos-pdf.py` → mirar con `preview-fotos.mjs`
    → subir con `subir-fotos-recortadas.mjs --subir` (pisa producción).
  - **Sacarle el fondo a las fotos no es viable** y ya se descartó: funciona
    en la mitad y falla en la otra mitad, porque muchas traen fondo
    fotográfico propio (uvas, degradés) y no un color plano. Por eso los
    recortes se cuadran rellenando con sus propios píxeles de borde.

## Notas de entorno (Windows)

- `npm run dev` desde el tool de Bash (Git Bash) falla con
  `""node"" no se reconoce como un comando interno o externo` por un problema
  de quoting del shim de npm en Git Bash. Usar PowerShell para correr scripts
  de npm en esta máquina.
