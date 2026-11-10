#!/usr/bin/env node
/**
 * Matchea las fotos extraídas de los PDF del catálogo viejo
 * (scripts/fotos-manifest.json, generado por scripts/extraer-fotos-pdf.py)
 * contra productos.nombre en Supabase, y sube al bucket "productos" las que
 * matchean con confianza alta.
 *
 * CÓMO USARLO
 * 1. Extraer las imágenes primero (una sola vez, o de nuevo si el dueño
 *    agrega más PDF a pdf-imagenes/):
 *      PYTHONPATH=".pytools" "/c/Users/matia/AppData/Local/Python/bin/python.exe" scripts/extraer-fotos-pdf.py
 *    (instala pymupdf antes si hace falta, ver el comentario de ese script)
 * 2. Modo reporte (no sube nada, solo muestra qué matchearía):
 *      node scripts/cargar-fotos.mjs
 * 3. Modo real (sube las fotos de confianza ALTA y actualiza imagen_url):
 *      node scripts/cargar-fotos.mjs --subir
 *
 * Lee SUPABASE_SERVICE_ROLE_KEY y VITE_SUPABASE_URL de .env (nunca hardcodeados
 * acá — no lo subas a git con la key adentro).
 *
 * CÓMO DECIDE "confianza alta"
 * Para cada imagen extraída, el extractor ya calculó qué bloques de texto de
 * la página están más cerca (tipo Voronoi: cada texto se asigna a la imagen
 * más próxima). Achicamos esos textos a los 4 más cercanos, los pegamos en
 * un "blob", y pedimos que TODAS las palabras significativas del nombre del
 * producto (sin contar "x", "de", "ml", etc) aparezcan en ese blob — y que
 * ningún otro producto distinto logre el mismo puntaje perfecto (si hay
 * empate, es ambiguo y se deja para revisar a mano, nunca se sube a ciegas).
 * Ver DECISIONES tomadas en la sesión: muchas fotos de estos catálogos son
 * "genéricas" (una sola foto de botella representa varios sabores en la
 * misma fila), así que es esperable que buena parte quede sin matchear
 * automáticamente — eso es intencional, no un bug.
 *
 * Además del puntaje automático, en la sesión del 2026-09-18 se revisaron
 * a mano (imagen por imagen) las ~75 fotos que habían dado "confianza alta"
 * y 9 resultaron ser matches incorrectos (mezclaban texto de la botella de
 * al lado, o apuntaban a un producto que no existe tal cual en la base).
 * Quedaron excluidas a mano en EXCLUIR_REVISION_MANUAL, más abajo. Si se
 * vuelve a extraer con más PDF y aparecen fotos nuevas de confianza alta,
 * conviene repetir esa auditoría visual antes de subir en serio.
 */

import { createClient } from '@supabase/supabase-js'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

process.loadEnvFile(path.join(process.cwd(), '.env'))

const SUBIR = process.argv.includes('--subir')

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const MANIFEST = path.join(process.cwd(), 'scripts', 'fotos-manifest.json')
const REPORTE = path.join(process.cwd(), 'scripts', 'fotos-reporte.json')

/* --------------------------------------------------- normalización (mismo criterio que src/lib/formato.js) */
const normalizar = (s) =>
  (s ?? '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const STOPWORDS = new Set(['x', 'de', 'del', 'la', 'el', 'los', 'las', 'y', 'con', 'sin', 'en', 'ml', 'gr', 'lt'])

function tokensSignificativos(nombre) {
  return normalizar(nombre)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t))
}

// Truncamientos conocidos: el catálogo viejo suele poner solo "COCA" en vez
// de "Coca Cola", "SEVEN" en vez de "Seven Up". Si el token previo matcheó,
// no exigimos el token siguiente de estos pares.
const PARES_ALIAS = [['coca', 'cola'], ['seven', 'up']]

// Blob "espaciado": conserva separación de palabras (para exigir límite de
// palabra en el match y evitar falsos positivos tipo "500" adentro de
// "1500", o "gas" adentro de "gaseosas").
function espaciado(texto) {
  return normalizar(texto).replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

// Blob "aplanado": sin ningún separador. Solo se usa como último recurso
// para tokens mixtos letra+número ("3l", "1l") que en el PDF a veces
// aparecen con espacio en el medio ("X 3 L").
function flatten(texto) {
  return normalizar(texto).replace(/[^\p{L}\p{N}]/gu, '')
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function tieneToken(token, blobSpaced, blobFlat) {
  const limite = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(token)}(?![\\p{L}\\p{N}])`, 'u')
  if (limite.test(blobSpaced)) return true
  const esMixto = /^[0-9]+[a-z]+$/.test(token) || /^[a-z]+[0-9]+$/.test(token)
  return esMixto && blobFlat.includes(token)
}

/**
 * Puntaje 0..1: fracción de tokens significativos del nombre del producto
 * que aparecen (con límite de palabra) en el texto cercano a la imagen.
 */
function puntaje(nombreProducto, blobSpaced, blobFlat) {
  let tokens = tokensSignificativos(nombreProducto)
  for (const [a, b] of PARES_ALIAS) {
    const ia = tokens.indexOf(a)
    if (ia !== -1 && tieneToken(a, blobSpaced, blobFlat)) tokens = tokens.filter((t) => t !== b)
  }
  if (tokens.length === 0) return { score: 0, matched: 0, total: 0 }
  const matched = tokens.filter((t) => tieneToken(t, blobSpaced, blobFlat)).length
  return { score: matched / tokens.length, matched, total: tokens.length }
}

/* --------------------------------------------------- slug para nombre de archivo */
function slug(nombre) {
  return normalizar(nombre)
    .replace(/[^\w]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/* --------------------------------------------------- main */
async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'))

  const { data: productos, error: errP } = await supabase.from('productos').select('*').order('id')
  if (errP) { console.error('Error leyendo productos:', errP.message); process.exit(1) }

  console.log(`Productos en la base: ${productos.length} (con foto ya cargada: ${productos.filter((p) => p.imagen_url).length})\n`)

  const alta = []       // { pdf, item, producto, score }
  const revisar = []    // { pdf, item, mejorCandidato, score, empatados }
  let totalImagenes = 0

  for (const [pdf, items] of Object.entries(manifest)) {
    for (const item of items) {
      totalImagenes++
      const cercanos = item.candidatos.slice(0, 4).map((c) => c.texto).join(' ')
      const blobSpaced = espaciado(cercanos)
      const blobFlat = flatten(cercanos)
      if (!blobSpaced) { revisar.push({ pdf, item, motivo: 'sin texto cercano' }); continue }

      // Candidatos: cualquier producto con al menos el 60% de sus palabras
      // significativas presentes cerca de la imagen (y al menos 2 palabras).
      // OJO: se prioriza por cantidad de palabras matcheadas (no por
      // porcentaje) — así un nombre específico como "Imperial Golden Sin
      // Alcohol 473" le gana a uno genérico como "Imperial Golden" cuando
      // el texto cercano menciona "sin alcohol", aunque el genérico llegue
      // más fácil al 100%. Si el que más palabras matchea no llega al 100%
      // de las suyas, no se adivina: se manda a revisar.
      const candidatos = []
      for (const p of productos) {
        const { score, matched, total } = puntaje(p.nombre, blobSpaced, blobFlat)
        if (total === 0) continue
        if (score >= 0.6 && matched >= 2) candidatos.push({ producto: p, score, matched, total })
      }

      if (candidatos.length === 0) { revisar.push({ pdf, item, motivo: 'sin candidato', cercanos }); continue }

      candidatos.sort((a, b) => b.matched - a.matched || b.score - a.score)
      const mejor = candidatos[0]
      const empatados = candidatos.filter((c) =>
        c.producto.id !== mejor.producto.id && c.matched === mejor.matched && c.score === mejor.score)

      if (mejor.score === 1 && empatados.length === 0) {
        alta.push({ pdf, item, producto: mejor.producto, score: mejor.score, cercanos })
      } else {
        const top3 = candidatos.slice(0, 3).map((s) => `${s.producto.nombre} (${s.matched}/${s.total})`)
        const motivo = mejor.score !== 1
          ? 'el candidato con mas coincidencias no llega al 100% de su nombre'
          : 'empate entre productos igual de especificos'
        revisar.push({ pdf, item, motivo, cercanos, candidatos: top3 })
      }
    }
  }

  // dos imágenes distintas no pueden ir al mismo producto (nos quedamos con
  // la de score más alto / distancia más chica; el resto pasa a "revisar")
  const porProducto = new Map()
  for (const a of alta) {
    const prev = porProducto.get(a.producto.id)
    if (!prev || a.item.candidatos[0]?.distancia < prev.item.candidatos[0]?.distancia) {
      if (prev) revisar.push({ ...prev, motivo: 'descartada: otra imagen matcheo mejor al mismo producto' })
      porProducto.set(a.producto.id, a)
    } else {
      revisar.push({ ...a, motivo: 'descartada: otra imagen matcheo mejor al mismo producto' })
    }
  }
  let altaFinal = [...porProducto.values()]

  // Auditoría visual manual (sesión 2026-09-18): se abrieron las ~75 fotos
  // candidatas una por una y se compararon contra el nombre matcheado. El
  // texto cercano a veces mezcla la etiqueta de una botella vecina (misma
  // grilla), así que el puntaje por palabras no alcanza para estos casos —
  // se excluyen a mano en vez de subir una foto equivocada. Si se vuelve a
  // correr el script con --subir y aparecen de nuevo (mismo archivo), van a
  // seguir excluidas; si el archivo cambia (nueva extracción), revisar de
  // nuevo a mano antes de sacarlas de esta lista.
  const EXCLUIR_REVISION_MANUAL = new Set([
    // [pdf, archivo] -> motivo
    'cervezas-y-vinos_20260906_203227_0000/p019-img04.png',  // "Pinot Noir": la etiqueta real dice "Escorihuela Gascon Pinot Noir", que no existe como producto propio en la base
    'cervezas-y-vinos_20260906_203227_0000/p038-img07.png',  // "Trumpeter Cabernet Franc": la foto es en realidad un Trumpeter Chardonnay
    'cervezas-y-vinos_20260906_203227_0000/p016-img03.png',  // "Colon Malbec X 750": la etiqueta dice "Colon Selecto Malbec", ambiguo con "Colon Selecto Tinto Dulce"
    'cervezas-y-vinos_20260906_203227_0000/p031-img04.png',  // "Lopez Dulce Natural": la foto es en realidad un Vasco Viejo Blanco
    'cervezas-y-vinos_20260906_203227_0000/p038-img03.png',  // "San Felipe Malbec": la etiqueta dice "San Felipe Roble Malbec", que es otro producto distinto en la base
    'aguas-y-gaseosas_20260901_125917_0000/p016-img08.jpeg', // "Tonica Sin Azucar": la imagen extraída es un fondo gris decorativo, no una foto de producto
    'aguas-y-gaseosas_20260901_125917_0000/p032-img04.png',  // "Villavicencio 500": no se puede confirmar visualmente la variante/tamaño contra "Villavicencio Premium"
    'aguas-y-gaseosas_20260901_125917_0000/p033-img02.png',  // "Villavicencio Premium": la etiqueta dice "Reserva", no se puede confirmar que sea la línea "Premium"
    'aguas-y-gaseosas_20260901_125917_0000/p033-img03.png',  // "Sierra De Los Padres 500": la etiqueta muestra la variante "Omega", que no está cargada como producto propio
  ].map((s) => s))
  const YA_EXCLUIDAS_ARCHIVOS = new Set(EXCLUIR_REVISION_MANUAL)

  for (const a of altaFinal) {
    if (YA_EXCLUIDAS_ARCHIVOS.has(a.item.archivo.replace(/^scripts\/fotos-extraidas\//, ''))) {
      revisar.push({ pdf: a.pdf, item: a.item, motivo: 'excluida en auditoría visual manual (ver EXCLUIR_REVISION_MANUAL)', cercanos: a.cercanos, candidatos: [a.producto.nombre] })
    }
  }
  altaFinal = altaFinal.filter((a) => !YA_EXCLUIDAS_ARCHIVOS.has(a.item.archivo.replace(/^scripts\/fotos-extraidas\//, '')))

  console.log(`Imágenes extraídas: ${totalImagenes}`)
  console.log(`Confianza ALTA (matchean 1 solo producto, sin ambigüedad): ${altaFinal.length}`)
  console.log(`Para revisar a mano: ${revisar.length}\n`)

  await writeFile(REPORTE, JSON.stringify({
    alta: altaFinal.map((a) => ({ pdf: a.pdf, pagina: a.item.pagina, archivo: a.item.archivo, producto: a.producto.nombre, id: a.producto.id, cercanos: a.cercanos })),
    revisar: revisar.map((r) => ({ pdf: r.pdf, pagina: r.item.pagina, archivo: r.item.archivo, motivo: r.motivo, cercanos: r.cercanos, candidatos: r.candidatos })),
  }, null, 1), 'utf8')
  console.log(`Detalle guardado en ${REPORTE}\n`)

  if (!SUBIR) {
    console.log('Modo reporte (no se subió nada). Para subir las de confianza ALTA: node scripts/cargar-fotos.mjs --subir')
    return
  }

  console.log(`Subiendo ${altaFinal.length} fotos...`)
  const yaConFoto = new Set(productos.filter((p) => p.imagen_url).map((p) => p.id))
  const aSubir = altaFinal.filter((a) => !yaConFoto.has(a.producto.id))
  console.log(`(${altaFinal.length - aSubir.length} ya tenían imagen_url cargada, se saltean)`)

  const TANDA = 10
  let ok = 0
  const errores = []
  for (let i = 0; i < aSubir.length; i += TANDA) {
    const tanda = aSubir.slice(i, i + TANDA)
    await Promise.all(tanda.map(async (a) => {
      try {
        const buffer = await readFile(a.item.archivo)
        const ext = path.extname(a.item.archivo).slice(1) || 'png'
        const nombreArchivo = `${slug(a.producto.nombre)}-${a.producto.id}.${ext}`
        const contentType = ext === 'jpeg' || ext === 'jpg' ? 'image/jpeg' : `image/${ext}`

        const { error: errUpload } = await supabase.storage.from('productos').upload(nombreArchivo, buffer, {
          cacheControl: '31536000', upsert: true, contentType
        })
        if (errUpload) throw errUpload

        const { data: pub } = supabase.storage.from('productos').getPublicUrl(nombreArchivo)
        const { error: errUpdate } = await supabase.from('productos')
          .update({ imagen_url: pub.publicUrl }).eq('id', a.producto.id)
        if (errUpdate) throw errUpdate

        ok++
      } catch (e) {
        errores.push({ producto: a.producto.nombre, error: e.message ?? String(e) })
      }
    }))
    console.log(`  ${Math.min(i + TANDA, aSubir.length)}/${aSubir.length}`)
  }

  console.log(`\nSubidas OK: ${ok}`)
  if (errores.length) {
    console.log(`Errores: ${errores.length}`)
    for (const e of errores) console.log(`  - ${e.producto}: ${e.error}`)
  }
}

main()
