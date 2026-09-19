#!/usr/bin/env node
/**
 * Sube al bucket "productos" de Supabase los recortes de foto generados por
 * scripts/recortar-fotos-pdf.py y actualiza productos.imagen_url, según el
 * mapeo revisado a ojo en scripts/fotos-mapeo.json.
 *
 * POR QUÉ ESTE SCRIPT Y NO scripts/cargar-fotos.mjs (el viejo)
 * El viejo matcheaba por proximidad de texto a ciegas contra las imágenes
 * EMBEBIDAS del PDF (que vienen cortadas en tiras: cuellos de botella
 * sueltos). Este trabaja con recortes del render de la página, y el mapeo
 * recorte -> producto se hizo mirando cada página, no adivinando.
 *
 * CÓMO USARLO (desde la raíz del repo)
 *   1. Generar los recortes (una sola vez):
 *        $env:PYTHONPATH=".pytools"; & "C:\Users\matia\AppData\Local\Python\bin\python.exe" scripts\recortar-fotos-pdf.py scripts\fotos-recortadas 200
 *   2. Modo reporte (no toca nada, muestra qué haría):
 *        node scripts/subir-fotos-recortadas.mjs
 *   3. Subir de verdad (PISA las fotos ya cargadas: es intencional, las
 *      viejas eran fragmentos):
 *        node scripts/subir-fotos-recortadas.mjs --subir
 *      Con --solo-faltantes saltea los productos que ya tienen imagen_url.
 *
 * Lee VITE_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY de .env (el repo es
 * público: la key nunca va hardcodeada acá ni en el reporte).
 */

import { createClient } from '@supabase/supabase-js'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

process.loadEnvFile(path.join(process.cwd(), '.env'))

const SUBIR = process.argv.includes('--subir')
const SOLO_FALTANTES = process.argv.includes('--solo-faltantes')

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const DIR_RECORTES = path.join(process.cwd(), 'scripts', 'fotos-recortadas')
const MAPEO = path.join(process.cwd(), 'scripts', 'fotos-mapeo.json')
const REPORTE = path.join(process.cwd(), 'scripts', 'fotos-recortadas-reporte.json')

// misma normalización que src/lib/formato.js
const normalizar = (s) =>
  (s ?? '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

const slug = (nombre) =>
  normalizar(nombre).replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)

async function main() {
  const mapeoRaw = JSON.parse(await readFile(MAPEO, 'utf8'))

  // archivo -> [ids]
  const mapeo = []
  for (const [archivo, valor] of Object.entries(mapeoRaw)) {
    if (archivo.startsWith('_')) continue
    mapeo.push({ archivo, ids: Array.isArray(valor) ? valor : [valor] })
  }

  const productos = []
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await supabase.from('productos').select('*').order('id').range(desde, desde + 999)
    if (error) { console.error('Error leyendo productos:', error.message); process.exit(1) }
    productos.push(...data)
    if (data.length < 1000) break
  }
  const porId = new Map(productos.map((p) => [p.id, p]))

  // Cada producto tiene que recibir una sola foto
  const tareas = []
  const problemas = []
  const vistos = new Map()
  for (const { archivo, ids } of mapeo) {
    for (const id of ids) {
      const producto = porId.get(id)
      if (!producto) { problemas.push({ archivo, id, motivo: 'el id no existe en productos' }); continue }
      if (vistos.has(id)) {
        problemas.push({ archivo, id, motivo: `id repetido, ya lo tomaba ${vistos.get(id)}` })
        continue
      }
      vistos.set(id, archivo)
      tareas.push({ archivo, producto })
    }
  }

  const yaConFoto = tareas.filter((t) => t.producto.imagen_url)
  const aSubir = SOLO_FALTANTES ? tareas.filter((t) => !t.producto.imagen_url) : tareas

  console.log(`Productos en la base: ${productos.length} (con imagen_url hoy: ${productos.filter((p) => p.imagen_url).length})`)
  console.log(`Recortes mapeados: ${mapeo.length} -> ${tareas.length} productos`)
  console.log(`De esos, ya tenían foto (se van a pisar): ${yaConFoto.length}`)
  if (problemas.length) {
    console.log(`\nProblemas en el mapeo: ${problemas.length}`)
    for (const p of problemas) console.log(`  - ${p.archivo} (id ${p.id}): ${p.motivo}`)
  }

  await writeFile(REPORTE, JSON.stringify({
    generado: new Date().toISOString(),
    aSubir: aSubir.map((t) => ({ archivo: t.archivo, id: t.producto.id, nombre: t.producto.nombre })),
    problemas,
  }, null, 1), 'utf8')

  if (!SUBIR) {
    console.log(`\nModo reporte (no se subió nada). Detalle en ${REPORTE}`)
    console.log('Para subir en serio: node scripts/subir-fotos-recortadas.mjs --subir')
    return
  }

  console.log(`\nSubiendo ${aSubir.length} fotos en tandas...`)
  const TANDA = 12
  let ok = 0
  const errores = []
  for (let i = 0; i < aSubir.length; i += TANDA) {
    const tanda = aSubir.slice(i, i + TANDA)
    await Promise.all(tanda.map(async ({ archivo, producto }) => {
      try {
        const buffer = await readFile(path.join(DIR_RECORTES, archivo))
        const nombreArchivo = `${slug(producto.nombre)}-${producto.id}.png`

        const { error: errUpload } = await supabase.storage.from('productos').upload(nombreArchivo, buffer, {
          cacheControl: '31536000', upsert: true, contentType: 'image/png',
        })
        if (errUpload) throw errUpload

        const { data: pub } = supabase.storage.from('productos').getPublicUrl(nombreArchivo)
        // ?v= para romper la cache del CDN si la foto ya existía con ese nombre
        const url = `${pub.publicUrl}?v=${Date.now()}`
        const { error: errUpdate } = await supabase.from('productos')
          .update({ imagen_url: url }).eq('id', producto.id)
        if (errUpdate) throw errUpdate
        ok++
      } catch (e) {
        errores.push({ archivo, id: producto.id, nombre: producto.nombre, error: e.message ?? String(e) })
      }
    }))
    console.log(`  ${Math.min(i + TANDA, aSubir.length)}/${aSubir.length}`)
  }

  console.log(`\nSubidas OK: ${ok}`)
  if (errores.length) {
    console.log(`Errores: ${errores.length}`)
    for (const e of errores) console.log(`  - ${e.nombre} (${e.archivo}): ${e.error}`)
  }
}

main()
