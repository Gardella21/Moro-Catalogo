#!/usr/bin/env node
/**
 * Lista los recortes de scripts/fotos-recortadas que NO están en
 * fotos-mapeo.json y propone, para cada uno, productos SIN foto que podrían
 * corresponderle, usando los textos que el PDF tiene alrededor de la foto
 * (guardados como "candidatos" en recortes-manifest.json).
 *
 * Es una AYUDA para revisar a ojo, no un matcheo automático: la propuesta se
 * confirma mirando la imagen, igual que el mapeo original. Lo que salga de
 * acá se agrega a mano a scripts/fotos-mapeo.json y se sube con
 * scripts/subir-fotos-recortadas.mjs --subir.
 *
 * CÓMO USARLO (desde la raíz del repo)
 *   node scripts/fotos-libres.mjs
 * Deja el detalle en scripts/fotos-libres.json.
 */

import { createClient } from '@supabase/supabase-js'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

process.loadEnvFile(path.join(process.cwd(), '.env'))

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY
if (!SUPABASE_URL || !KEY) {
  console.error('Faltan VITE_SUPABASE_URL y una key en .env')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, KEY)

const RAIZ = process.cwd()
const SALIDA = path.join(RAIZ, 'scripts', 'fotos-libres.json')

// misma normalización que src/lib/formato.js
const normalizar = (s) =>
  (s ?? '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// palabras que aparecen en casi todos los nombres y no distinguen nada
const VACIAS = new Set([
  'de', 'la', 'el', 'los', 'las', 'del', 'x', 'ml', 'lt', 'l', 'cc', 'gr', 'kg',
  'sin', 'con', 'y', 'vino', 'lata', 'botella', 'pack', 'un', 'una', 'al',
])

const palabras = (s) => normalizar(s).split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !VACIAS.has(w))

async function main() {
  const mapeo = JSON.parse(await readFile(path.join(RAIZ, 'scripts', 'fotos-mapeo.json'), 'utf8'))
  const manifest = JSON.parse(await readFile(path.join(RAIZ, 'scripts', 'fotos-recortadas', 'recortes-manifest.json'), 'utf8'))

  const usados = new Set(Object.keys(mapeo).filter((k) => !k.startsWith('_')).map((k) => k.replace(/\.\w+$/, '.jpg')))
  const libres = Object.values(manifest).flat().filter((it) => !usados.has(it.archivo))

  const productos = []
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await supabase.from('productos')
      .select('id, nombre, subcategoria, imagen_url, visible').order('id').range(desde, desde + 999)
    if (error) { console.error('Error leyendo productos:', error.message); process.exit(1) }
    productos.push(...data)
    if (data.length < 1000) break
  }
  const sinFoto = productos.filter((p) => !p.imagen_url)
  const indice = sinFoto.map((p) => ({ p, palabras: new Set(palabras(p.nombre)) }))

  const filas = libres.map((it) => {
    const pistas = (it.candidatos ?? []).slice(0, 4).map((c) => c.texto)
    const buscadas = [...new Set(pistas.flatMap(palabras))]
    const puntuados = indice
      .map(({ p, palabras: pp }) => ({ p, hits: buscadas.filter((w) => pp.has(w)).length }))
      .filter((x) => x.hits > 0)
      .sort((a, b) => b.hits - a.hits || a.p.nombre.length - b.p.nombre.length)
      .slice(0, 4)
    return {
      archivo: it.archivo,
      pagina: it.pagina,
      pistas,
      candidatos: puntuados.map((x) => ({ id: x.p.id, nombre: x.p.nombre, sub: x.p.subcategoria, visible: x.p.visible, coincidencias: x.hits })),
    }
  })

  await writeFile(SALIDA, JSON.stringify(filas, null, 1), 'utf8')

  const conCandidatos = filas.filter((f) => f.candidatos.length)
  console.log(`Recortes sin mapear: ${filas.length}`)
  console.log(`Productos sin foto en la base: ${sinFoto.length} (${sinFoto.filter((p) => p.visible).length} visibles)`)
  console.log(`Recortes con al menos un producto candidato: ${conCandidatos.length}\n`)
  for (const f of conCandidatos) {
    console.log(`${f.archivo}  [${f.pistas.join(' | ')}]`)
    for (const c of f.candidatos) console.log(`    ${c.coincidencias}x  id ${c.id}  ${c.nombre}${c.visible ? '' : '  (oculto)'}`)
  }
  console.log(`\nDetalle completo en ${SALIDA}`)
}

main()
