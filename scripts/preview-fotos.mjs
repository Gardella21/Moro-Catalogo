#!/usr/bin/env node
/**
 * Arma una vista previa LOCAL de la grilla del catálogo, sin tocar Supabase
 * Storage ni productos.imagen_url.
 *
 * DOS MODOS
 *   (por defecto)  los recortes de los PDF (scripts/fotos-recortadas), según
 *                  el mapeo revisado a ojo en fotos-mapeo.json.
 *   --web          las fotos bajadas de la web por scripts/buscar-fotos-web.mjs
 *                  (scripts/fotos-web/<id>.jpg). Cada tarjeta muestra cómo se
 *                  matcheó — por código de barras o por nombre — y con qué
 *                  producto de la tienda, para poder descartar los errores a ojo.
 *
 * Usa el CSS ya compilado en dist/ (correr `npm run build` antes) y el mismo
 * marcado que src/components/Catalogo.parts.jsx -> TarjetaProducto.
 *
 * CÓMO USARLO (desde la raíz del repo)
 *   npm run build
 *   node scripts/preview-fotos.mjs             # recortes de los PDF
 *   node scripts/preview-fotos.mjs champagne   # filtra por sección
 *   node scripts/preview-fotos.mjs --web          # fotos bajadas de la web
 *   node scripts/preview-fotos.mjs --web vinos    # y filtrando por categoría
 *   node scripts/preview-fotos.mjs --web --solo-ean   # solo las confiables
 *                                  (las que matchearon por código de barras)
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
const DIR_WEB = path.join(RAIZ, 'scripts', 'fotos-web')
const MAPEO = path.join(RAIZ, 'scripts', 'fotos-mapeo.json')
const SALIDA = path.join(RAIZ, 'scripts', 'preview-fotos')

const MODO_WEB = process.argv.includes('--web')
const SOLO_EAN = process.argv.includes('--solo-ean')
const filtro = (process.argv.slice(2).find((a) => !a.startsWith('--')) ?? '').toLowerCase()

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

async function traerProductos(ids) {
  const productos = []
  for (let i = 0; i < ids.length; i += 500) {
    const { data, error } = await supabase.from('productos')
      .select('id, nombre, precio_unit, precio_pack, unidades_pack, categoria_id, subcategoria')
      .in('id', ids.slice(i, i + 500))
    if (error) { console.error('Error leyendo productos:', error.message); process.exit(1) }
    productos.push(...data)
  }
  return productos
}

/* ------------------------------------------------------------------ */
/* Modo 1: recortes de los PDF                                         */
/* ------------------------------------------------------------------ */
async function desdeRecortes() {
  const mapeoRaw = JSON.parse(await readFile(MAPEO, 'utf8'))
  const porId = new Map()
  for (const [archivo, valor] of Object.entries(mapeoRaw)) {
    if (archivo.startsWith('_')) continue
    if (filtro && !archivo.toLowerCase().includes(filtro)) continue
    for (const id of Array.isArray(valor) ? valor : [valor]) {
      if (!porId.has(id)) porId.set(id, archivo.replace(/\.\w+$/, '.jpg'))
    }
  }
  if (!porId.size) { console.error(`Ningún recorte coincide con "${filtro}"`); process.exit(1) }
  const productos = await traerProductos([...porId.keys()])
  return { origen: DIR_RECORTES, titulo: 'fotos de los PDF', productos, rutaDe: (p) => porId.get(p.id), extra: () => '' }
}

/* ------------------------------------------------------------------ */
/* Modo 2: fotos bajadas de la web                                     */
/* ------------------------------------------------------------------ */
async function desdeWeb() {
  let reporte = []
  try {
    reporte = JSON.parse(await readFile(path.join(DIR_WEB, 'reporte.json'), 'utf8'))
  } catch {
    console.error('No hay scripts/fotos-web/reporte.json. Corré antes: node scripts/buscar-fotos-web.mjs')
    process.exit(1)
  }
  let archivos
  try {
    archivos = new Set((await readdir(DIR_WEB)).filter((f) => f.endsWith('.jpg')))
  } catch {
    console.error('No hay scripts/fotos-web/'); process.exit(1)
  }
  const info = new Map(reporte.map((r) => [r.id, r]))
  // varios tamaños del mismo producto caen en la misma ficha de la tienda y
  // terminan con la misma foto; conviene verlo marcado
  const vecesOrigen = new Map()
  for (const r of reporte) if (r.origen) vecesOrigen.set(r.origen, (vecesOrigen.get(r.origen) ?? 0) + 1)
  // también toma fotos puestas a mano en la carpeta, aunque no estén en el reporte
  let ids = [...archivos].map((f) => Number(f.replace('.jpg', ''))).filter(Boolean)
  if (SOLO_EAN) ids = ids.filter((id) => info.get(id)?.via === 'ean')
  if (!ids.length) { console.error('No hay fotos en scripts/fotos-web/'); process.exit(1) }
  const productos = await traerProductos(ids)

  const extra = (p) => {
    const r = info.get(p.id)
    if (!r) return `<p class="nota nota-manual">puesta a mano</p>`
    const repetida = (vecesOrigen.get(r.origen) ?? 0) > 1
      ? `<span class="repetida">misma foto en ${vecesOrigen.get(r.origen)} productos</span>` : ''
    if (r.via === 'ean') return `<p class="nota nota-ok">código de barras · ${esc(r.nombreTienda ?? '')}${repetida}</p>`
    const pct = Math.round((r.score ?? 0) * 100)
    const clase = pct >= 70 ? 'nota-ok' : 'nota-dudosa'
    return `<p class="nota ${clase}">por nombre ${pct}% · ${esc(r.nombreTienda ?? '')}${repetida}</p>`
  }
  const titulo = SOLO_EAN
    ? 'fotos confiables (match por código de barras)'
    : 'fotos bajadas de la web'
  return { origen: DIR_WEB, titulo, productos, rutaDe: (p) => `${p.id}.jpg`, extra }
}

/* ------------------------------------------------------------------ */
async function main() {
  const { origen, titulo, productos, rutaDe, extra } = MODO_WEB ? await desdeWeb() : await desdeRecortes()

  const { data: cats } = await supabase.from('categorias').select('id,nombre,orden').order('orden')
  const nombreCat = new Map((cats ?? []).map((c) => [c.id, c.nombre]))
  const ordenCat = new Map((cats ?? []).map((c) => [c.id, c.orden ?? 0]))

  let lista = productos
  if (MODO_WEB && filtro) lista = lista.filter((p) => (nombreCat.get(p.categoria_id) ?? '').toLowerCase().includes(filtro))
  lista.sort((a, b) => (ordenCat.get(a.categoria_id) ?? 0) - (ordenCat.get(b.categoria_id) ?? 0)
    || (a.subcategoria ?? '').localeCompare(b.subcategoria ?? '')
    || a.nombre.localeCompare(b.nombre))

  await rm(SALIDA, { recursive: true, force: true })
  await mkdir(path.join(SALIDA, 'fotos'), { recursive: true })

  const porCategoria = {}
  for (const p of lista) {
    const rel = rutaDe(p)
    if (!rel) continue
    const destino = rel.replace(/\//g, '__')
    try {
      await cp(path.join(origen, rel), path.join(SALIDA, 'fotos', destino))
    } catch { continue }
    const cat = nombreCat.get(p.categoria_id) ?? '(sin categoría)'
    ;(porCategoria[cat] ??= []).push(`
    <article class="flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface-raised">
      <div class="relative aspect-square w-full overflow-hidden bg-surface-sunken">
        <img src="fotos/${esc(destino)}" alt="${esc(p.nombre)}" loading="lazy" decoding="async"
             class="object-cover bg-surface-sunken absolute inset-0 h-full w-full" />
      </div>
      <div class="flex flex-1 flex-col gap-1 px-3 pb-3 pt-2.5">
        <h3 class="font-sans text-[15px] font-600 leading-[20px] line-clamp-2 min-h-[2.375rem] text-ink">${esc(p.nombre)}</h3>
        <p class="cifra font-sans text-meta text-ink-muted">${p.unidades_pack ? `Pack x ${p.unidades_pack}` : '&nbsp;'}</p>
        <div class="mt-auto pt-1.5">
          <p class="cifra font-sans font-700 text-[18px] leading-[22px] ${p.precio_unit ? 'text-ink' : 'italic text-bordo'}">${esc(pesos(p.precio_unit))}</p>
          <p class="mt-1 cifra font-sans text-pack text-ink-muted">${p.precio_pack ? `pack ${esc(pesos(p.precio_pack))}` : '&nbsp;'}</p>
        </div>
        ${extra(p)}
      </div>
    </article>`)
  }

  const total = Object.values(porCategoria).reduce((n, v) => n + v.length, 0)
  const secciones = Object.entries(porCategoria).map(([cat, tarjetas]) => `
    <h2 class="px-4 pt-6 pb-1 font-serif text-[19px] font-700 text-ink">${esc(cat)} <span class="font-sans text-meta font-400 text-ink-muted">${tarjetas.length}</span></h2>
    <div class="grid grid-cols-2 gap-3 px-4 py-2 sm:grid-cols-3">${tarjetas.join('')}</div>`).join('')

  const html = `<!doctype html>
<html lang="es-AR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Vista previa — ${total} ${esc(titulo)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet" />
<style>
${await cssCompilado()}
.nota { margin-top:6px; padding-top:6px; border-top:1px solid var(--line); font:12px/1.35 'Source Sans 3',system-ui,sans-serif; }
.nota-ok { color:#1d6b3f; }
.nota-dudosa { color:#a1341f; font-weight:600; }
.nota-manual { color:var(--ink-muted); }
.repetida { display:block; color:#8a6d1f; font-weight:600; }
</style>
</head>
<body>
  <div class="mx-auto max-w-[1100px]">
    <h1 class="px-4 pt-6 font-serif text-[22px] font-700 text-ink">Vista previa — ${total} ${esc(titulo)}</h1>
    <p class="px-4 pb-1 font-sans text-meta text-ink-muted">
      Todo local: no se tocó la base ni Supabase.${MODO_WEB ? ' En rojo, las que se matchearon solo por nombre y hay que mirar con cuidado.' : ''}
    </p>
    ${secciones}
  </div>
</body>
</html>`

  await writeFile(path.join(SALIDA, 'index.html'), html, 'utf8')
  console.log(`Vista previa con ${total} productos en:`)
  console.log(`  ${path.join(SALIDA, 'index.html')}`)
}

main()
