#!/usr/bin/env node
/**
 * Busca en la web una foto para cada producto SIN imagen y la baja a
 * scripts/fotos-web/<id>.jpg, para poder verlas en localhost antes de decidir.
 *
 * NO sube nada a Supabase ni toca productos.imagen_url. Eso lo hace, después y
 * solo si te gustan, scripts/subir-fotos-web.mjs.
 *
 * DE DÓNDE SACA LAS FOTOS
 * De la API pública de catálogo (VTEX) de las cadenas argentinas. Se busca
 * primero POR CÓDIGO DE BARRAS (`fq=alternateIds_Ean:`), que es un match exacto
 * del producto; solo si no hay EAN se cae a búsqueda por nombre, y en ese caso
 * el resultado queda marcado como dudoso en el reporte. Las imágenes vienen en
 * 1000x1000 sobre fondo blanco y se piden directo en 800x800.
 *
 * OJO: son fotos con derechos de sus dueños. Esto sirve para EVALUAR qué
 * productos quedan bien con foto y cuáles hay que fotografiar o pedirle a la
 * marca. Antes de publicarlas conviene tener el OK del proveedor/marca.
 *
 * CÓMO USARLO (desde la raíz del repo)
 *   node scripts/buscar-fotos-web.mjs --limite 20   # probar con pocas
 *   node scripts/buscar-fotos-web.mjs               # todas las que falten
 *   node scripts/buscar-fotos-web.mjs --rehacer     # vuelve a bajar las ya bajadas
 * Deja el detalle en scripts/fotos-web/reporte.json
 */

import { createClient } from '@supabase/supabase-js'
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

process.loadEnvFile(path.join(process.cwd(), '.env'))

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY
if (!SUPABASE_URL || !KEY) { console.error('Faltan VITE_SUPABASE_URL y una key en .env'); process.exit(1) }
const supabase = createClient(SUPABASE_URL, KEY)

const RAIZ = process.cwd()
const DESTINO = path.join(RAIZ, 'scripts', 'fotos-web')
const UA = 'ValferCatalogo/1.0 (matiasgardella4@gmail.com)'
const TIENDAS = ['https://www.jumbo.com.ar', 'https://www.disco.com.ar', 'https://www.carrefour.com.ar']
const REHACER = process.argv.includes('--rehacer')
const LIMITE = Number(process.argv[process.argv.indexOf('--limite') + 1]) || Infinity
const ESPERA = 320

const norm = (x) => (x ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const VACIAS = new Set(['de', 'la', 'el', 'con', 'sin', 'x', 'ml', 'lt', 'l', 'cc', 'gr', 'g', 'kg', 'un', 'unidades', 'ref', 'lts', 'grs'])
const pal = (x) => norm(x).split(/[^a-z0-9.]+/).filter((w) => w.length > 2 && !VACIAS.has(w))
const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

async function pedir(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
  if (r.status !== 200 && r.status !== 206) return null
  return r.json()
}

/** Ficha exacta por código de barras. */
async function porEan(ean) {
  for (const tienda of TIENDAS) {
    try {
      const j = await pedir(`${tienda}/api/catalog_system/pub/products/search?fq=alternateIds_Ean:${ean}`)
      const p = j?.[0]
      const img = p?.items?.[0]?.images?.[0]?.imageUrl
      if (img) return { tienda, nombreTienda: p.productName, imagen: img, via: 'ean' }
    } catch { /* probar la siguiente tienda */ }
    await dormir(ESPERA)
  }
  return null
}

/** Último recurso: búsqueda por nombre; devuelve además cuánto coincide. */
async function porNombre(nombre) {
  const mias = new Set(pal(nombre))
  for (const tienda of TIENDAS) {
    try {
      const j = await pedir(`${tienda}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(nombre)}&_from=0&_to=4`)
      let mejor = null
      for (const cand of j ?? []) {
        const suyas = new Set(pal(cand.productName))
        const score = [...mias].filter((w) => suyas.has(w)).length / Math.max(1, mias.size)
        const img = cand.items?.[0]?.images?.[0]?.imageUrl
        if (img && (!mejor || score > mejor.score)) {
          mejor = { tienda, nombreTienda: cand.productName, imagen: img, score, via: 'nombre' }
        }
      }
      if (mejor) return mejor
    } catch { /* probar la siguiente tienda */ }
    await dormir(ESPERA)
  }
  return null
}

/** El CDN de VTEX sirve el tamaño que le pidas metiéndolo en la ruta del id. */
const en800 = (url) => url.replace(/\/arquivos\/ids\/(\d+)\//, '/arquivos/ids/$1-800-800/')

async function bajar(url, destino) {
  const r = await fetch(en800(url), { headers: { 'User-Agent': UA } })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const buf = Buffer.from(await r.arrayBuffer())
  if (buf.byteLength < 2000) throw new Error('imagen demasiado chica, probablemente un placeholder')
  await writeFile(destino, buf)
  return buf.byteLength
}

async function main() {
  await mkdir(DESTINO, { recursive: true })

  let eanPorId = new Map()
  try {
    const datos = JSON.parse(await readFile(path.join(RAIZ, 'scripts', 'ean-candidatos.json'), 'utf8'))
    for (const r of datos) if (r.match?.ean && r.match.score >= 0.7) eanPorId.set(r.id, r.match.ean)
  } catch { /* se busca todo por nombre */ }

  const productos = []
  for (let d = 0; ; d += 1000) {
    const { data, error } = await supabase.from('productos')
      .select('id,nombre,categoria_id,imagen_url,visible').order('id').range(d, d + 999)
    if (error) { console.error('Error leyendo productos:', error.message); process.exit(1) }
    productos.push(...data)
    if (data.length < 1000) break
  }
  const faltan = productos.filter((p) => p.visible && !p.imagen_url).slice(0, LIMITE)

  console.log(`A buscar: ${faltan.length} productos (${eanPorId.size} con EAN conocido)`)
  const reporte = []
  let ok = 0, nada = 0
  for (const [i, p] of faltan.entries()) {
    const archivo = path.join(DESTINO, `${p.id}.jpg`)
    if (!REHACER) {
      try { await access(archivo); reporte.push({ id: p.id, nombre: p.nombre, estado: 'ya estaba' }); ok++; continue } catch { /* bajarla */ }
    }

    const ean = eanPorId.get(p.id)
    let hallazgo = ean ? await porEan(ean) : null
    if (!hallazgo) hallazgo = await porNombre(p.nombre)

    if (!hallazgo) {
      nada++
      reporte.push({ id: p.id, nombre: p.nombre, estado: 'sin resultado' })
    } else {
      try {
        const bytes = await bajar(hallazgo.imagen, archivo)
        ok++
        reporte.push({
          id: p.id, nombre: p.nombre, estado: 'bajada', archivo: `${p.id}.jpg`,
          via: hallazgo.via, score: hallazgo.score ?? null, ean: ean ?? null,
          tienda: hallazgo.tienda, nombreTienda: hallazgo.nombreTienda,
          origen: en800(hallazgo.imagen), kb: Math.round(bytes / 1024),
        })
      } catch (e) {
        nada++
        reporte.push({ id: p.id, nombre: p.nombre, estado: 'error al bajar: ' + e.message })
      }
    }
    if ((i + 1) % 20 === 0) console.log(`  ${i + 1}/${faltan.length}  (bajadas ${ok}, sin foto ${nada})`)
    await dormir(ESPERA)
  }

  await writeFile(path.join(DESTINO, 'reporte.json'), JSON.stringify(reporte, null, 1), 'utf8')
  const porEanCount = reporte.filter((r) => r.via === 'ean').length
  const porNombreCount = reporte.filter((r) => r.via === 'nombre').length
  const dudosas = reporte.filter((r) => r.via === 'nombre' && (r.score ?? 0) < 0.7).length
  console.log('')
  console.log(`bajadas: ${ok}  |  sin resultado: ${nada}`)
  console.log(`  match exacto por código de barras: ${porEanCount}`)
  console.log(`  match por nombre:                  ${porNombreCount}  (de esas, ${dudosas} dudosas)`)
  console.log('')
  console.log(`Para verlas: node scripts/preview-fotos.mjs --web`)
}

main()
