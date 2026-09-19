#!/usr/bin/env node
/**
 * Arma una vista previa LOCAL de la grilla del catálogo con los recortes de
 * scripts/fotos-recortadas, sin tocar Supabase Storage ni imagen_url.
 *
 * Sirve para mirar cómo quedan las fotos nuevas en la tarjeta real antes de
 * decidir subirlas (subir-fotos-recortadas.mjs --subir pisa las de producción).
 *
 * Usa el CSS ya compilado en dist/ (correr `npm run build` antes) y el mismo
 * marcado que src/components/Catalogo.parts.jsx -> TarjetaProducto.
 *
 * CÓMO USARLO (desde la raíz del repo)
 *   npm run build
 *   node scripts/preview-fotos.mjs            # todas las secciones
 *   node scripts/preview-fotos.mjs champagne  # filtra por sección
 * Deja la vista en scripts/preview-fotos/index.html (carpeta ignorada por git).
 */

import { createClient } from '@supabase/supabase-js'
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

process.loadEnvFile(path.join(process.cwd(), '.env'))

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY
if (!SUPABASE_URL || !KEY) {
  console.error('Faltan VITE_SUPABASE_URL y una key (anon o service role) en .env')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, KEY)

const RAIZ = process.cwd()
const DIR_RECORTES = path.join(RAIZ, 'scripts', 'fotos-recortadas')
const MAPEO = path.join(RAIZ, 'scripts', 'fotos-mapeo.json')
const SALIDA = path.join(RAIZ, 'scripts', 'preview-fotos')
const filtro = (process.argv[2] ?? '').toLowerCase()

const esc = (s) => (s ?? '').toString()
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const pesos = (n) => (n == null || n === 0
  ? 'Sin Stock'
  : '$ ' + Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 }))

async function cssCompilado() {
  const assets = path.join(RAIZ, 'dist', 'assets')
  let archivos
  try {
    archivos = await readdir(assets)
  } catch {
    console.error('No hay dist/. Corré `npm run build` primero.')
    process.exit(1)
  }
  const css = archivos.find((f) => f.endsWith('.css'))
  if (!css) { console.error('No hay CSS en dist/assets.'); process.exit(1) }
  return readFile(path.join(assets, css), 'utf8')
}

async function main() {
  const mapeoRaw = JSON.parse(await readFile(MAPEO, 'utf8'))
  const porId = new Map()
  for (const [archivo, valor] of Object.entries(mapeoRaw)) {
    if (archivo.startsWith('_')) continue
    if (filtro && !archivo.toLowerCase().includes(filtro)) continue
    for (const id of Array.isArray(valor) ? valor : [valor]) {
      if (!porId.has(id)) porId.set(id, archivo.replace(/\.\w+$/, '.jpg'))
    }
  }
  const ids = [...porId.keys()]
  if (!ids.length) { console.error(`Ningún recorte coincide con "${filtro}"`); process.exit(1) }

  const productos = []
  for (let i = 0; i < ids.length; i += 500) {
    const { data, error } = await supabase.from('productos')
      .select('id, nombre, precio_unit, precio_pack, unidades_pack, categoria_id, subcategoria')
      .in('id', ids.slice(i, i + 500))
    if (error) { console.error('Error leyendo productos:', error.message); process.exit(1) }
    productos.push(...data)
  }
  productos.sort((a, b) => (a.categoria_id - b.categoria_id) || a.nombre.localeCompare(b.nombre))

  await rm(SALIDA, { recursive: true, force: true })
  await mkdir(path.join(SALIDA, 'fotos'), { recursive: true })

  const tarjetas = []
  for (const p of productos) {
    const rel = porId.get(p.id)
    const destino = rel.replace(/\//g, '__')
    try {
      await cp(path.join(DIR_RECORTES, rel), path.join(SALIDA, 'fotos', destino))
    } catch { continue }
    tarjetas.push(`
    <article class="flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface-raised">
      <div class="relative aspect-square w-full overflow-hidden bg-surface-sunken">
        <img src="fotos/${esc(destino)}" alt="${esc(p.nombre)}" loading="lazy" decoding="async"
             class="object-cover bg-surface-sunken absolute inset-0 h-full w-full" />
      </div>
      <div class="flex flex-1 flex-col gap-1 px-3 pb-3 pt-2.5">
        <h3 class="font-sans text-[15px] font-600 leading-[20px] line-clamp-2 min-h-[2.375rem] text-ink">${esc(p.nombre)}</h3>
        <p class="cifra font-sans text-meta text-ink-muted">${p.unidades_pack ? `Pack x ${p.unidades_pack}` : '&nbsp;'}</p>
        <div class="mt-auto pt-1.5">
          <p class="cifra font-sans font-700 text-[18px] leading-[22px] desde600:text-[20px] desde600:leading-[24px] ${p.precio_unit ? 'text-ink' : 'italic text-bordo'}">${esc(pesos(p.precio_unit))}</p>
          <p class="mt-1 cifra font-sans text-pack text-ink-muted">${p.precio_pack ? `pack ${esc(pesos(p.precio_pack))}` : '&nbsp;'}</p>
        </div>
      </div>
    </article>`)
  }

  const html = `<!doctype html>
<html lang="es-AR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Vista previa de fotos — ${tarjetas.length} productos</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet" />
<style>${await cssCompilado()}</style>
</head>
<body>
  <div class="mx-auto max-w-[1100px]">
    <h1 class="px-4 pt-6 font-serif text-[22px] font-700 text-ink">Vista previa — ${tarjetas.length} fotos nuevas</h1>
    <p class="px-4 pb-2 font-sans text-meta text-ink-muted">Fotos locales, la base no se tocó. Achicá la ventana para ver la grilla de celular (2 columnas).</p>
    <div class="grid grid-cols-2 gap-3 px-4 py-3 sm:grid-cols-3">${tarjetas.join('')}</div>
  </div>
</body>
</html>`

  await writeFile(path.join(SALIDA, 'index.html'), html, 'utf8')
  console.log(`Vista previa con ${tarjetas.length} productos en:`)
  console.log(`  ${path.join(SALIDA, 'index.html')}`)
}

main()
