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

## Qué se hizo en la sesión anterior

1. El proyecto tenía un `.git` vacío inicializado por error en la carpeta home
   del usuario (`C:\Users\...`), mezclando todo el disco. Se ignoró y se inicializó
   un repo nuevo *dentro* de esta carpeta del proyecto. Se borró además una
   carpeta basura `{src\{...}}` que había quedado de un `mkdir` con llaves mal
   interpretado en una shell de Windows.
2. Se agregó `vercel.json` con rewrite a `/index.html` (Vercel no lee
   `public/_redirects`, eso es solo de Netlify) y se limpiaron las menciones a
   Netlify en README/DECISIONES.
3. Se hizo push del commit inicial a GitHub (rama `main`).
4. `supabase/schema.sql` tiraba `ERROR: 42P17: functions in index expression
   must be marked IMMUTABLE` al correrlo, por un índice GIN con `unaccent()`
   (función `STABLE`, no permitida en índices). Se sacó ese índice: la búsqueda
   del catálogo es 100% client-side (`src/lib/formato.js` → `normalizar()`,
   sobre el catálogo completo que trae `useCatalogo.js`), así que el índice no
   se usaba para nada. Fix commiteado y pusheado.
5. Se creó el proyecto de Supabase, se corrió el schema ya arreglado, se creó
   el bucket `productos` y el usuario del dueño en Authentication → Users.
6. Se armó un `.env` local (gitignorado, nunca pusheado) con la URL y la
   *publishable key* (formato nuevo de Supabase, reemplaza al anon key JWT
   viejo; `@supabase/supabase-js@2.116.0` ya lo soporta) del proyecto real.
   `VITE_WHATSAPP` y `VITE_NEGOCIO` quedaron con valores placeholder —
   falta poner el teléfono real de la distribuidora.
7. Login verificado end-to-end en `npm run dev`: entra bien y redirige a
   `/panel`.

## Pendiente

- Conectar el repo de GitHub en Vercel y cargar ahí las mismas 4 variables de
  entorno (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_WHATSAPP` con
  el número real, `VITE_NEGOCIO`).
- Cargar los ~1.500 productos reales (ver sección "Cargar los 1.500 productos"
  en el README y los 3 problemas del Excel en DECISIONES.md punto 3 — precios
  en `$0.00`, dos precios por producto, typos en nombres).
- Fotos: por ahora ningún producto tiene imagen (ver DECISIONES.md punto 3d).

## Notas de entorno (Windows)

- `npm run dev` desde el tool de Bash (Git Bash) falla con
  `""node"" no se reconoce como un comando interno o externo` por un problema
  de quoting del shim de npm en Git Bash. Usar PowerShell para correr scripts
  de npm en esta máquina.
