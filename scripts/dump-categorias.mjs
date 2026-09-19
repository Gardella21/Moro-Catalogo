#!/usr/bin/env node
/**
 * Vuelca la tabla `categorias` de Supabase a JSON (complemento de
 * scripts/dump-productos.mjs).
 *
 * CÓMO CORRERLO (desde la raíz del repo):
 *   node scripts/dump-categorias.mjs <salida.json>
 */
import { createClient } from '@supabase/supabase-js'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'

process.loadEnvFile(path.join(process.cwd(), '.env'))
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const salida = process.argv[2]
const { data, error } = await supabase.from('categorias').select('*').order('id')
if (error) { console.error(error.message); process.exit(1) }
if (salida) await writeFile(salida, JSON.stringify(data, null, 1), 'utf8')
console.log(JSON.stringify(data, null, 1))
