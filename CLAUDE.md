# Contexto para Claude Code

Catálogo mayorista de Moro Distribuidora. Ver [README.md](./README.md) (cómo
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

1. Se conectó el repo de GitHub a Vercel (import del proyecto) y se instalaron
   ahí las integraciones de GitHub y Supabase.
2. La integración de Supabase en Vercel creó sus propias env vars
   (`SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_*`, `POSTGRES_*`, pensadas para
   Next.js) — el código de esta app no las lee, así que quedan sin uso, no
   pasa nada con dejarlas. Las que hacen falta (`VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`) hubo que cargarlas a mano, y de tipo **Config**
   (no "Secret": Secret es write-only y Vite necesita poder inyectar el valor
   en build time para exponerlo al bundle del cliente).
3. `VITE_WHATSAPP` y `VITE_NEGOCIO` quedaron pendientes de cargar en Vercel
   (el dueño las va a completar él; el código tiene fallback así que el sitio
   no se rompe sin ellas, solo muestra el placeholder).
4. Redeploy hecho, sitio funcionando en producción con los ~841 productos
   reales cargados en Supabase.
5. Se implementaron los 7 cambios que el dueño dejó anotados en `Cambios.md`
   tras probar la app (commit `098b358`, pusheado a `main`):
   - Botón "Cerrar sesión" en el header del catálogo (antes solo estaba en `/panel`).
   - Productos como tarjetas en grilla (`TarjetaProducto` en
     `src/components/Catalogo.parts.jsx`, antes `FilaProducto`), con
     estructura fija para que no se desalineen si falta algún dato.
   - Sección "Ajustar precios por lote" en `/panel` (`src/pages/Admin.jsx`):
     sube/baja precio unitario y de pack por porcentaje, eligiendo por
     sección o por texto en el nombre.
   - Chips de sub-línea (`subcategoria`) al elegir una sección, para filtrar
     dentro de ella.
   - `<BotonWhatsApp />` comentado (no borrado) en `src/pages/Catalogo.jsx`.
   - Scroll horizontal de los chips de categoría: se agregó arrastre con
     mouse/dedo (`useArrastreHorizontal` en Catalogo.parts.jsx) porque el
     scroll táctil nativo solo no respondía bien en un simulador de celular.

## Pendiente

- **Nuevo pedido del dueño en `Cambios.md`** (sin implementar todavía): en el
  panel, dentro de "Ajustar precios por lote" → modo "Por nombre", poder
  buscar y **elegir puntualmente** cuáles de los resultados ajustar (hoy el
  ajuste aplica a *todas* las coincidencias del texto — ej. buscar "coca cola"
  trae 21 productos y el dueño quiere tocar el precio de uno solo). Implica
  agregar selección con checkboxes sobre la lista de coincidencias en
  `Admin.jsx` antes de aplicar el ajuste.
- Cargar `VITE_WHATSAPP` (número real) y `VITE_NEGOCIO` en Vercel (tipo
  Config, no Secret) + redeploy.
- Fotos: por ahora ningún producto tiene imagen (ver DECISIONES.md punto 3d).
- Revisar en vivo (con la sesión real del dueño) que el panel de ajuste de
  precios por lote funcione como se espera — no se probó logueado, solo se
  verificó que compila y que la lógica de sesión es la misma ya probada antes.

## Notas de entorno (Windows)

- `npm run dev` desde el tool de Bash (Git Bash) falla con
  `""node"" no se reconoce como un comando interno o externo` por un problema
  de quoting del shim de npm en Git Bash. Usar PowerShell para correr scripts
  de npm en esta máquina.
