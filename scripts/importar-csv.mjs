#!/usr/bin/env node
/**
 * Convierte las hojas del Excel del cliente en un archivo .sql listo para pegar
 * en Supabase.
 *
 * CÓMO USARLO
 * 1. En Google Sheets: Archivo → Descargar → CSV. Se baja SOLO la hoja activa,
 *    así que hay que repetirlo hoja por hoja (son 14).
 * 2. Guardá cada CSV en scripts/csv/ con el nombre del slug de la categoría:
 *       scripts/csv/gaseosas.csv
 *       scripts/csv/cervezas.csv
 *       scripts/csv/vinos.csv        ... etc
 *    Los slugs válidos son los de supabase/schema.sql.
 * 3. node scripts/importar-csv.mjs
 * 4. Se genera scripts/productos.sql → pegalo en Supabase → SQL Editor.
 *
 * QUÉ HACE CON LA ESTRUCTURA DEL EXCEL
 * Las hojas tienen tres tipos de fila mezcladas:
 *   - título de categoría        ("GASEOSAS LINEA COCA")  → se ignora
 *   - encabezado de tabla        ("DESCRIPCION | CANTIDAD X PACK | ...") → se ignora
 *   - subtítulo de agrupación    ("DESCARTABLE 1,500 ML" con cantidad pero sin precio)
 *                                → pasa a ser la subcategoría de las filas siguientes
 *   - producto                   (tiene precio unitario o de pack)
 * Los $0.00 se guardan como NULL, que en la app se muestra como "Consultar".
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const DIR = path.join(process.cwd(), 'scripts', 'csv')
const SALIDA = path.join(process.cwd(), 'scripts', 'productos.sql')

/* --------------------------------------------------- CSV parser mínimo */
function parsearCSV(texto) {
  const filas = []
  let fila = [], campo = '', comillas = false
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++ }
      else if (c === '"') comillas = false
      else campo += c
    } else if (c === '"') comillas = true
    else if (c === ',') { fila.push(campo); campo = '' }
    else if (c === '\n') { fila.push(campo); filas.push(fila); fila = []; campo = '' }
    else if (c !== '\r') campo += c
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila) }
  return filas
}

/* --------------------------------------------------- helpers */
const limpiar = (s) => (s ?? '').replace(/\s+/g, ' ').trim()

/**
 * Google Sheets exporta "$2,830.00" (coma = miles, punto = decimales), pero si
 * la planilla está en configuración regional argentina sale "$2.830,00". Se
 * decide mirando cuál de los dos separadores aparece último: ese es el decimal.
 */
function aNumero(s) {
  let t = limpiar(s).replace(/[$\s]/g, '')
  if (!t || t.startsWith('#')) return null

  const ultimaComa = t.lastIndexOf(',')
  const ultimoPunto = t.lastIndexOf('.')

  if (ultimaComa > ultimoPunto) {
    t = t.replace(/\./g, '').replace(',', '.')   // 2.830,00
  } else {
    t = t.replace(/,/g, '')                       // 2,830.00
  }

  const n = Number(t)
  if (!Number.isFinite(n) || n === 0) return null // $0.00 = sin precio cargado
  return n
}

function aEntero(s) {
  const n = Number(limpiar(s))
  return Number.isInteger(n) && n > 0 ? n : null
}

// "COCA COLA SIN AZUCAR 1.250" → "Coca Cola Sin Azúcar 1.250"
// Deja intactas las siglas cortas y los números.
function capitalizar(s) {
  return limpiar(s).toLowerCase().replace(/\b[a-záéíóúñ]/g, (m) => m.toUpperCase())
}

const escapar = (s) => (s === null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`)
const num = (n) => (n === null ? 'NULL' : n)

const ES_ENCABEZADO = /^DESCRIPCION$/i

/* --------------------------------------------------- main */
const archivos = existsSync(DIR) ? (await readdir(DIR)).filter((f) => f.endsWith('.csv')) : []

if (archivos.length === 0) {
  console.error(`No encontré ningún CSV en ${DIR}`)
  console.error('Exportá cada hoja del Sheet a CSV y guardala ahí con el nombre del slug.')
  console.error('Ejemplo: scripts/csv/gaseosas.csv')
  await mkdir(DIR, { recursive: true })
  process.exit(1)
}

const lineas = [
  '-- Generado por scripts/importar-csv.mjs',
  '-- Pegar en Supabase → SQL Editor → Run',
  ''
]
let totalProductos = 0

for (const archivo of archivos) {
  const slug = path.basename(archivo, '.csv')
  const filas = parsearCSV(await readFile(path.join(DIR, archivo), 'utf8'))

  let subcategoria = null
  let packDelGrupo = null   // en el Excel la cantidad x pack suele estar en el
                            // subtítulo y vale para todas las filas de abajo
  let orden = 0
  const productos = []

  for (const fila of filas) {
    const [descripcion, cantidad, unitario, pack] = fila.map(limpiar)
    if (!descripcion) continue
    if (ES_ENCABEZADO.test(descripcion)) continue

    const pUnit = aNumero(unitario)
    const pPack = aNumero(pack)
    const uxp = aEntero(cantidad)

    // Subtítulo: nombre + (a veces) cantidad, pero ninguna columna de precio
    // con contenido escrito. Los productos siempre traen algo en precio.
    const tienePrecioEscrito = limpiar(unitario) !== '' || limpiar(pack) !== ''
    if (!tienePrecioEscrito) {
      subcategoria = capitalizar(descripcion)
      packDelGrupo = uxp          // puede ser null, y está bien
      continue
    }

    productos.push({
      nombre: capitalizar(descripcion),
      subcategoria,
      precio_unit: pUnit,
      precio_pack: pPack,
      unidades_pack: uxp ?? packDelGrupo,   // el de la fila gana al del grupo
      orden: ++orden
    })
  }

  if (productos.length === 0) {
    console.warn(`  ${slug}: 0 productos — revisá el formato del CSV`)
    continue
  }

  totalProductos += productos.length
  console.log(`  ${slug}: ${productos.length} productos`)

  lineas.push(`-- ${slug} (${productos.length})`)
  lineas.push('insert into productos (categoria_id, subcategoria, nombre, precio_unit, precio_pack, unidades_pack, orden)')
  lineas.push('select c.id, v.subcategoria, v.nombre, v.precio_unit, v.precio_pack, v.unidades_pack, v.orden')
  lineas.push(`from categorias c, (values`)
  lineas.push(
    productos.map((p) =>
      `  (${escapar(p.subcategoria)}, ${escapar(p.nombre)}, ${num(p.precio_unit)}, ${num(p.precio_pack)}, ${num(p.unidades_pack)}, ${p.orden})`
    ).join(',\n')
  )
  lineas.push(') as v(subcategoria, nombre, precio_unit, precio_pack, unidades_pack, orden)')
  lineas.push(`where c.slug = '${slug}';`)
  lineas.push('')
}

await writeFile(SALIDA, lineas.join('\n'), 'utf8')
console.log(`\n${totalProductos} productos → ${SALIDA}`)
