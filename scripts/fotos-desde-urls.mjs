#!/usr/bin/env node
/**
 * Toma las URLs que el dueño cargó a mano en la planilla (columna
 * `url_imagen` de scripts/faltan-fotos.csv / el Google Sheet), las descarga
 * y las sube al bucket "productos" de Supabase, actualizando
 * productos.imagen_url.
 *
 * Lee el mapeo id -> url de scripts/fotos-urls.json: { "1916": "https://...", ... }
 * (se genera a mano a partir de la planilla; no lo pisa este script).
 *
 * CÓMO USARLO (desde la raíz del repo)
 *   1. Bajar las fotos a scripts/fotos-web/<id>.jpg, SIN tocar Supabase:
 *        node scripts/fotos-desde-urls.mjs
 *   2. Cuadrarlas a 800x800 (si no, entran recortadas en la tarjeta):
 *        $env:PYTHONPATH=".pytools"; & "C:\Users\matia\AppData\Local\Python\bin\python.exe" scripts\cuadrar-fotos-web.py --cuadrar
 *   3. Mirarlas en la grilla real (sin tocar producción):
 *        npm run build
 *        node scripts/preview-fotos.mjs --web
 *   4. Cuando estén revisadas, subir de verdad (pisa productos.imagen_url):
 *        node scripts/fotos-desde-urls.mjs --subir
 *      Con --solo-faltantes saltea los productos que ya tienen imagen_url.
 *
 * OJO: --subir sube el archivo local de scripts/fotos-web/<id>.jpg, NO
 * vuelve a bajar de la URL. Es a propósito: lo que se sube tiene que ser
 * exactamente lo que se revisó en la vista previa, ya cuadrado.
 *
 * Lee VITE_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY de .env.
 */

import { createClient } from '@supabase/supabase-js'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

process.loadEnvFile(path.join(process.cwd(), '.env'))

const SUBIR = process.argv.includes('--subir')
const SOLO_FALTANTES = process.argv.includes('--solo-faltantes')
// ids sueltos como argumentos: trabaja solo sobre esos (para corregir una foto
// puntual sin volver a bajar las 255)
const SOLO_IDS = new Set(process.argv.slice(2).filter((a) => /^\d+$/.test(a)))

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// Revisados a ojo contra la etiqueta: la URL trae una foto que no es de este
// producto. Se dejan afuera en vez de subir una foto equivocada; cuando
// aparezca la foto correcta, se cambia la URL en fotos-urls.json y se saca de acá.
const EXCLUIR = new Map([
  ['2341', 'Colon Cabernet: la foto es la etiqueta "Colon Malbec Bonarda"'],
])

const RAIZ = process.cwd()
const MAPA = path.join(RAIZ, 'scripts', 'fotos-urls.json')
const DIR_WEB = path.join(RAIZ, 'scripts', 'fotos-web')
const REPORTE = path.join(DIR_WEB, 'reporte.json')

const normalizar = (s) =>
  (s ?? '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const slug = (nombre) =>
  normalizar(nombre).replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)

function extDeContentType(ct) {
  if (!ct) return 'jpg'
  if (ct.includes('webp')) return 'webp'
  if (ct.includes('png')) return 'png'
  if (ct.includes('gif')) return 'gif'
  return 'jpg'
}
function contentTypeDeExt(ext) {
  return ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
}

async function descargar(url) {
  const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  const ct = resp.headers.get('content-type') ?? ''
  const buffer = Buffer.from(await resp.arrayBuffer())
  // varias tiendas contestan 200 con la página del producto (o un cartel de
  // "acceso denegado") en vez de la imagen: la URL apunta a la ficha, no al archivo
  if (!ct.startsWith('image/') || buffer.subarray(0, 64).toString('latin1').trim().toLowerCase().startsWith('<!doctype')) {
    throw new Error(`no es una imagen (content-type ${ct || 'desconocido'}) — la URL apunta a la página, no al archivo`)
  }
  return { buffer, ext: extDeContentType(ct) }
}

async function main() {
  const mapa = JSON.parse(await readFile(MAPA, 'utf8'))
  const entradas = Object.entries(mapa)
    .filter(([, url]) => url)
    .filter(([id]) => SOLO_IDS.size === 0 || SOLO_IDS.has(id))
    .filter(([id]) => {
      if (!EXCLUIR.has(id) || SOLO_IDS.has(id)) return true
      console.log(`  (excluido) id ${id}: ${EXCLUIR.get(id)}`)
      return false
    })
  console.log(`URLs en el mapeo: ${entradas.length}${SOLO_IDS.size ? ` (filtrado a ${[...SOLO_IDS].join(', ')})` : ''}`)

  // avisar si una misma URL quedó pegada a más de un producto (foto genérica)
  const porUrl = new Map()
  for (const [id, url] of entradas) {
    if (!porUrl.has(url)) porUrl.set(url, [])
    porUrl.get(url).push(id)
  }
  const compartidas = [...porUrl.entries()].filter(([, ids]) => ids.length > 1)
  if (compartidas.length) {
    console.log(`\nOJO: ${compartidas.length} URL(s) están repetidas en más de un producto:`)
    for (const [url, ids] of compartidas) console.log(`  ${ids.join(', ')} -> ${url}`)
    console.log('')
  }

  const productos = []
  for (let d = 0; ; d += 1000) {
    const { data, error } = await supabase.from('productos').select('id,nombre,imagen_url').order('id').range(d, d + 999)
    if (error) { console.error('Error leyendo productos:', error.message); process.exit(1) }
    productos.push(...data)
    if (data.length < 1000) break
  }
  const porId = new Map(productos.map((p) => [String(p.id), p]))

  const tareas = []
  const problemas = []
  for (const [id, url] of entradas) {
    const producto = porId.get(id)
    if (!producto) { problemas.push({ id, url, motivo: 'el id no existe en productos' }); continue }
    tareas.push({ id, url, producto })
  }
  for (const p of problemas) console.log(`  - id ${p.id}: ${p.motivo}`)

  if (!SUBIR) {
    console.log(`\nDescargando ${tareas.length} fotos a ${DIR_WEB}...`)
    await mkdir(DIR_WEB, { recursive: true })
    const reporte = []
    let ok = 0
    const errores = []
    const TANDA = 8
    for (let i = 0; i < tareas.length; i += TANDA) {
      const tanda = tareas.slice(i, i + TANDA)
      await Promise.all(tanda.map(async ({ id, url, producto }) => {
        try {
          const { buffer } = await descargar(url)
          await writeFile(path.join(DIR_WEB, `${id}.jpg`), buffer)
          reporte.push({
            id: Number(id), via: 'url-manual', nombreTienda: producto.nombre, origen: url,
          })
          ok++
        } catch (e) {
          errores.push({ id, url, error: e.message ?? String(e) })
        }
      }))
      console.log(`  ${Math.min(i + TANDA, tareas.length)}/${tareas.length}`)
    }
    await writeFile(REPORTE, JSON.stringify(reporte, null, 1), 'utf8')
    console.log(`\nBajadas OK: ${ok}`)
    if (errores.length) {
      console.log(`Errores: ${errores.length}`)
      for (const e of errores) console.log(`  - id ${e.id} (${e.url}): ${e.error}`)
    }
    console.log('\nModo descarga (no se tocó Supabase). Para revisarlas en la grilla real:')
    console.log('  npm run build')
    console.log('  node scripts/preview-fotos.mjs --web')
    console.log('Para subir de verdad: node scripts/fotos-desde-urls.mjs --subir')
    return
  }

  // ---- modo real: sube a Supabase Storage y actualiza imagen_url ----
  // Se sube el archivo local (ya cuadrado por cuadrar-fotos-web.py), no la
  // URL original: lo que va a producción es lo que se vio en la vista previa.
  const candidatos = SOLO_FALTANTES ? tareas.filter((t) => !t.producto.imagen_url) : tareas
  const aSubir = []
  const sinArchivo = []
  for (const t of candidatos) {
    try {
      const buffer = await readFile(path.join(DIR_WEB, `${t.id}.jpg`))
      // la descarga a veces trae una página de error con status 200
      if (buffer[0] !== 0xff || buffer[1] !== 0xd8) throw new Error('no es un JPEG (¿la descarga trajo una página de error?)')
      aSubir.push({ ...t, buffer })
    } catch (e) {
      sinArchivo.push({ id: t.id, nombre: t.producto.nombre, error: e.message ?? String(e) })
    }
  }
  if (sinArchivo.length) {
    console.log(`\nSe saltean ${sinArchivo.length} sin foto local usable:`)
    for (const s of sinArchivo) console.log(`  - id ${s.id} ${s.nombre}: ${s.error}`)
  }

  console.log(`\nSubiendo ${aSubir.length} fotos a Supabase Storage...`)
  const TANDA = 10
  let ok = 0
  const errores = []
  for (let i = 0; i < aSubir.length; i += TANDA) {
    const tanda = aSubir.slice(i, i + TANDA)
    await Promise.all(tanda.map(async ({ id, url, producto, buffer }) => {
      try {
        const ext = 'jpg'
        const nombreArchivo = `${slug(producto.nombre)}-${producto.id}.${ext}`

        const { error: errUpload } = await supabase.storage.from('productos').upload(nombreArchivo, buffer, {
          cacheControl: '31536000', upsert: true, contentType: contentTypeDeExt(ext),
        })
        if (errUpload) throw errUpload

        const { data: pub } = supabase.storage.from('productos').getPublicUrl(nombreArchivo)
        const urlFinal = `${pub.publicUrl}?v=${Date.now()}`
        const { error: errUpdate } = await supabase.from('productos')
          .update({ imagen_url: urlFinal }).eq('id', producto.id)
        if (errUpdate) throw errUpdate
        ok++
      } catch (e) {
        errores.push({ id, url, nombre: producto.nombre, error: e.message ?? String(e) })
      }
    }))
    console.log(`  ${Math.min(i + TANDA, aSubir.length)}/${aSubir.length}`)
  }

  console.log(`\nSubidas OK: ${ok}`)
  if (errores.length) {
    console.log(`Errores: ${errores.length}`)
    for (const e of errores) console.log(`  - ${e.nombre} (id ${e.id}, ${e.url}): ${e.error}`)
  }
}

main()
