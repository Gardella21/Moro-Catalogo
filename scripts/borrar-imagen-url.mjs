#!/usr/bin/env node
/**
 * Deja en NULL el imagen_url de los productos que se le pasen por id.
 *
 * Se usó para sacar 4 fotos que había dejado la carga vieja
 * (scripts/cargar-fotos.mjs) y que estaban mal asignadas: eran fragmentos de
 * la foto de OTRO producto (ej. la petaca de Anís 8 Hermanos tenía la foto
 * de la botella de 750). Mejor sin foto que con la foto equivocada.
 *
 * CÓMO CORRERLO (desde la raíz del repo):
 *   node scripts/borrar-imagen-url.mjs 1564 1715 1716 1776
 *
 * Lee VITE_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY de .env.
 */
import { createClient } from '@supabase/supabase-js'
import path from 'node:path'

process.loadEnvFile(path.join(process.cwd(), '.env'))
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const ids = process.argv.slice(2).map(Number).filter((n) => Number.isFinite(n))
if (!ids.length) { console.error('Uso: node scripts/borrar-imagen-url.mjs <id> [id...]'); process.exit(1) }

const { data, error } = await supabase.from('productos')
  .update({ imagen_url: null }).in('id', ids).select('id, nombre')
if (error) { console.error(error.message); process.exit(1) }
for (const p of data) console.log(`imagen_url borrada: ${p.id} ${p.nombre}`)
console.log(`${data.length} productos actualizados`)
