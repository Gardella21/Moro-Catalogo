#!/usr/bin/env node
/**
 * Lista los productos que NO tienen foto, para poder conseguirlas una por una.
 *
 * Genera dos archivos:
 *   scripts/faltan-fotos.csv   - para abrir en Excel y trabajar la lista
 *   scripts/faltan-fotos.html  - lista navegable, con links de búsqueda por
 *                                producto (Google Imágenes, Jumbo, Open Food
 *                                Facts) y el nombre de archivo que hay que
 *                                ponerle a cada foto que bajes.
 *
 * EL NOMBRE DE ARCHIVO IMPORTA: si guardás la foto como "<id>.jpg" dentro de
 * scripts/fotos-web/, scripts/preview-fotos.mjs la toma sola y la vas a ver en
 * la grilla, sin tocar la base ni Supabase.
 *
 * CÓMO USARLO (desde la raíz del repo)
 *   node scripts/faltan-fotos.mjs          # solo los visibles en el catálogo
 *   node scripts/faltan-fotos.mjs --todos  # también los ocultos
 */

import { createClient } from '@supabase/supabase-js'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

process.loadEnvFile(path.join(process.cwd(), '.env'))

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY
if (!SUPABASE_URL || !KEY) { console.error('Faltan VITE_SUPABASE_URL y una key en .env'); process.exit(1) }
const supabase = createClient(SUPABASE_URL, KEY)

const TODOS = process.argv.includes('--todos')
const RAIZ = process.cwd()

const esc = (s) => (s ?? '').toString()
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const csvCampo = (s) => `"${(s ?? '').toString().replace(/"/g, '""')}"`

async function eansConocidos() {
  // los que ya se identificaron con scripts/fotos-libres.mjs / la medición por EAN
  try {
    const datos = JSON.parse(await readFile(path.join(RAIZ, 'scripts', 'ean-candidatos.json'), 'utf8'))
    const m = new Map()
    for (const r of datos) if (r.match?.ean && r.match.score >= 0.7) m.set(r.id, r.match)
    return m
  } catch { return new Map() }
}

async function main() {
  const [{ data: cats }, eanPorId] = await Promise.all([
    supabase.from('categorias').select('id,nombre,orden').order('orden'),
    eansConocidos(),
  ])
  const productos = []
  for (let d = 0; ; d += 1000) {
    const { data, error } = await supabase.from('productos')
      .select('id,nombre,categoria_id,subcategoria,imagen_url,visible,precio_unit').order('id').range(d, d + 999)
    if (error) { console.error('Error leyendo productos:', error.message); process.exit(1) }
    productos.push(...data)
    if (data.length < 1000) break
  }
  const porCat = new Map(cats.map((c) => [c.id, c]))
  const ordenCat = new Map(cats.map((c) => [c.id, c.orden ?? 0]))

  const faltan = productos
    .filter((p) => !p.imagen_url && (TODOS || p.visible))
    .sort((a, b) => (ordenCat.get(a.categoria_id) ?? 0) - (ordenCat.get(b.categoria_id) ?? 0)
      || (a.subcategoria ?? '').localeCompare(b.subcategoria ?? '')
      || a.nombre.localeCompare(b.nombre))

  // ---- CSV ----
  const cab = ['id', 'categoria', 'subcategoria', 'nombre', 'visible', 'url_imagen', 'ean_probable', 'nombre_en_jumbo', 'archivo_a_guardar']
  const filasCsv = faltan.map((p) => {
    const m = eanPorId.get(p.id)
    return [p.id, porCat.get(p.categoria_id)?.nombre ?? '', p.subcategoria ?? '', p.nombre,
      p.visible ? 'si' : 'no', '', m?.ean ?? '', m?.nombre ?? '', `${p.id}.jpg`].map(csvCampo).join(',')
  })
  await writeFile(path.join(RAIZ, 'scripts', 'faltan-fotos.csv'),
    '﻿' + [cab.join(','), ...filasCsv].join('\r\n'), 'utf8')

  // ---- HTML ----
  const grupos = {}
  for (const p of faltan) (grupos[porCat.get(p.categoria_id)?.nombre ?? '(sin categoría)'] ??= []).push(p)

  const secciones = Object.entries(grupos).map(([cat, lista]) => `
  <h2>${esc(cat)} <span class="cuenta">${lista.length}</span></h2>
  <table>
    <thead><tr><th>id</th><th>producto</th><th>sub-línea</th><th>url de la imagen</th><th>buscar en</th></tr></thead>
    <tbody>
    ${lista.map((p) => {
      const q = encodeURIComponent(p.nombre)
      const m = eanPorId.get(p.id)
      return `<tr${p.visible ? '' : ' class="oculto"'}>
        <td class="id">${p.id}</td>
        <td><strong>${esc(p.nombre)}</strong>${m ? `<div class="pista">en Jumbo figura como: ${esc(m.nombre)} · EAN ${esc(m.ean)}</div>` : ''}</td>
        <td class="sub">${esc(p.subcategoria ?? '')}</td>
        <td><input type="text" class="url" placeholder="pegar URL acá" data-id="${p.id}"></td>
        <td class="links">
          <a target="_blank" rel="noreferrer" href="https://www.google.com/search?tbm=isch&q=${q}">Google</a>
          <a target="_blank" rel="noreferrer" href="https://www.jumbo.com.ar/${m?.ean ? `${m.ean}/p` : `busca?ft=${q}`}">Jumbo</a>
          <a target="_blank" rel="noreferrer" href="https://ar.openfoodfacts.org/cgi/search.pl?search_terms=${q}&search_simple=1&action=process">OFF</a>
        </td>
      </tr>`
    }).join('')}
    </tbody>
  </table>`).join('')

  const html = `<!doctype html>
<html lang="es-AR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Faltan fotos — ${faltan.length} productos</title>
<style>
  :root { color-scheme: light dark; --linea:#ddd9d3; --tenue:#6b6862; }
  body { font:15px/1.5 system-ui,sans-serif; margin:0 auto; padding:24px 16px 64px; max-width:1100px; }
  h1 { font-size:22px; margin:0 0 4px; }
  .intro { color:var(--tenue); margin:0 0 28px; }
  h2 { font-size:17px; margin:34px 0 8px; border-bottom:2px solid var(--linea); padding-bottom:6px; }
  .cuenta { color:var(--tenue); font-weight:400; font-size:14px; }
  table { border-collapse:collapse; width:100%; }
  th { text-align:left; font-size:12px; text-transform:uppercase; letter-spacing:.04em; color:var(--tenue); padding:6px 8px; }
  td { padding:7px 8px; border-top:1px solid var(--linea); vertical-align:top; }
  .id, .sub { color:var(--tenue); font-size:13px; }
  .id { width:56px; } .sub { width:150px; }
  .pista { color:var(--tenue); font-size:12px; margin-top:2px; }
  code { background:rgba(128,128,128,.14); padding:1px 5px; border-radius:4px; font-size:13px; }
  .links a { margin-right:8px; font-size:13px; }
  .oculto td { opacity:.5; }
  .oculto .id::after { content:" (oculto)"; font-size:11px; }
  input.url { width:100%; box-sizing:border-box; font:inherit; padding:5px 7px; border:1px solid var(--linea); border-radius:5px; background:transparent; color:inherit; }
  input.url:not(:placeholder-shown) { border-color:#3b8a4a; }
  .barra { position:sticky; top:0; background:Canvas; padding:10px 0; margin-bottom:8px; display:flex; gap:10px; align-items:center; border-bottom:1px solid var(--linea); z-index:1; }
  .barra button { font:inherit; padding:7px 14px; border-radius:6px; border:1px solid var(--linea); cursor:pointer; }
  .barra span { color:var(--tenue); font-size:13px; }
  textarea#salida { width:100%; height:140px; margin-top:10px; font:12px/1.4 ui-monospace,monospace; }
</style></head>
<body>
  <h1>Faltan fotos — ${faltan.length} productos</h1>
  <p class="intro">
    Pegá la URL de la imagen que encontraste en la columna “url de la imagen” de cada
    producto (los links de la derecha abren la búsqueda). Lo que escribís se guarda solo
    en este navegador a medida que tipeás. Cuando termines (o quieras hacer una tanda),
    tocá “Copiar lista para Claude” y pasale ese texto.
  </p>
  <div class="barra">
    <button id="btnCopiar">Copiar lista para Claude</button>
    <span id="contador">0 con URL cargada</span>
  </div>
  <textarea id="salida" readonly placeholder="Acá aparece la lista cuando tocás “Copiar lista”…" style="display:none"></textarea>
  ${secciones}
  <script>
    const CLAVE = 'faltan-fotos-urls'
    const guardadas = JSON.parse(localStorage.getItem(CLAVE) || '{}')
    const inputs = [...document.querySelectorAll('input.url')]
    for (const inp of inputs) if (guardadas[inp.dataset.id]) inp.value = guardadas[inp.dataset.id]
    function actualizarContador() {
      const n = inputs.filter((i) => i.value.trim()).length
      document.getElementById('contador').textContent = n + ' con URL cargada'
    }
    for (const inp of inputs) inp.addEventListener('input', () => {
      guardadas[inp.dataset.id] = inp.value.trim()
      if (!inp.value.trim()) delete guardadas[inp.dataset.id]
      localStorage.setItem(CLAVE, JSON.stringify(guardadas))
      actualizarContador()
    })
    actualizarContador()
    document.getElementById('btnCopiar').addEventListener('click', async () => {
      const filas = inputs.filter((i) => i.value.trim())
        .map((i) => i.dataset.id + '\\t' + i.value.trim())
      const texto = 'id\\turl_imagen\\n' + filas.join('\\n')
      const salida = document.getElementById('salida')
      salida.style.display = 'block'
      salida.value = texto
      try { await navigator.clipboard.writeText(texto); document.getElementById('btnCopiar').textContent = 'Copiado ✓ (' + filas.length + ')' }
      catch { salida.select() }
    })
  </script>
</body></html>`
  await writeFile(path.join(RAIZ, 'scripts', 'faltan-fotos.html'), html, 'utf8')

  console.log(`Productos sin foto${TODOS ? '' : ' (visibles)'}: ${faltan.length}`)
  console.log(`  con EAN ya identificado: ${faltan.filter((p) => eanPorId.has(p.id)).length}`)
  console.log('')
  console.log('  scripts/faltan-fotos.csv')
  console.log('  scripts/faltan-fotos.html')
}

main()
