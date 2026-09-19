#!/usr/bin/env node
/**
 * Vuelca la tabla `productos` de Supabase a un JSON local para poder
 * trabajarla offline (matcheo de fotos, auditorías, etc).
 *
 * CÓMO CORRERLO (desde la raíz del repo):
 *   node scripts/dump-productos.mjs <ruta-de-salida.json>
 *
 * Lee VITE_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY de .env (nunca
 * hardcodeadas acá: el repo es público).
 */
import { createClient } from '@supabase/supabase-js'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'

process.loadEnvFile(path.join(process.cwd(), '.env'))

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const salida = process.argv[2]
if (!salida) { console.error('Uso: node scripts/dump-productos.mjs <salida.json>'); process.exit(1) }

const todos = []
for (let desde = 0; ; desde += 1000) {
  const { data, error } = await supabase.from('productos').select('*').order('id').range(desde, desde + 999)
  if (error) { console.error(error.message); process.exit(1) }
  todos.push(...data)
  if (data.length < 1000) break
}

await writeFile(salida, JSON.stringify(todos, null, 1), 'utf8')
console.log(`${todos.length} productos -> ${salida}`)
console.log(`con imagen_url: ${todos.filter((p) => p.imagen_url).length}`)
const porCat = {}
for (const p of todos) {
  const c = p.categoria ?? '(sin categoria)'
  porCat[c] = porCat[c] ?? { total: 0, conFoto: 0 }
  porCat[c].total++
  if (p.imagen_url) porCat[c].conFoto++
}
for (const [c, v] of Object.entries(porCat).sort()) console.log(`  ${c}: ${v.conFoto}/${v.total}`)
