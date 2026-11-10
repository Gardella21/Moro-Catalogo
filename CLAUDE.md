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

## Pendiente

- Cargar `VITE_WHATSAPP` (número real) y `VITE_NEGOCIO` en Vercel (tipo
  Config, no Secret) + redeploy.
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
