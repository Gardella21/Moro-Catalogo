import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase, hayBackend } from '../lib/supabase'
import { precio, normalizar } from '../lib/formato'
import { useArrastreHorizontal } from '../lib/arrastre'

const VACIO = {
  nombre: '', descripcion: '', subcategoria: '', categoria_id: '',
  precio_unit: '', precio_pack: '', unidades_pack: '', imagen_url: '', visible: true
}

export default function Admin() {
  const ir = useNavigate()
  const [sesion, setSesion] = useState(undefined)
  const [categorias, setCategorias] = useState([])
  const [productos, setProductos] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState(null)   // null = todas las secciones
  const cinta = useRef(null)                                     // cinta de chips de sección
  const [editando, setEditando] = useState(null)   // objeto producto o null
  const [aviso, setAviso] = useState(null)

  /* -------------------------------------------------- ajuste de precios por lote */
  const [ajusteAbierto, setAjusteAbierto] = useState(false)
  const [ajusteModo, setAjusteModo] = useState('categoria')   // 'categoria' | 'nombre'
  const [ajusteCategoria, setAjusteCategoria] = useState('')
  const [ajusteTexto, setAjusteTexto] = useState('')
  const [ajustePorcentaje, setAjustePorcentaje] = useState('')
  const [ajusteAplicando, setAjusteAplicando] = useState(false)
  const [ajusteSeleccion, setAjusteSeleccion] = useState(new Set())   // ids elegidos, solo modo "nombre"

  /* -------------------------------------------------- sesión */
  useEffect(() => {
    if (!hayBackend) { setSesion(null); return }
    supabase.auth.getSession().then(({ data }) => setSesion(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSesion(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (sesion === null) ir('/ingresar', { replace: true })
  }, [sesion, ir])

  /* -------------------------------------------------- datos */
  async function recargar() {
    const [c, p] = await Promise.all([
      supabase.from('categorias').select('*').order('orden'),
      supabase.from('productos').select('*').order('orden').order('id')
    ])
    setCategorias(c.data ?? [])
    setProductos(p.data ?? [])
  }
  useEffect(() => { if (sesion) recargar() }, [sesion])

  useArrastreHorizontal(cinta, [categorias.length])

  // Con una sección puntual elegida y sin búsqueda, mostramos la sección
  // entera (no solo 60) porque ahí es donde se reordena a mano y hace falta
  // ver todo el listado para que "primero" y "último" tengan sentido.
  const puedeReordenar = filtroCategoria !== null && !busqueda.trim()

  const visibles = useMemo(() => {
    const q = normalizar(busqueda).trim()
    const base = filtroCategoria === null
      ? productos
      : productos.filter((p) => p.categoria_id === filtroCategoria)
    if (!q) return filtroCategoria === null ? base.slice(0, 60) : base
    return base.filter((p) => normalizar(p.nombre).includes(q)).slice(0, 60)
  }, [productos, busqueda, filtroCategoria])

  // Para reordenar se agrupa igual que el catálogo (por subsección), porque
  // el orden que importa es el de adentro de cada subsección, no el de la
  // sección entera mezclada.
  const gruposVisibles = useMemo(() => {
    if (!puedeReordenar) return null
    const mapa = new Map()
    for (const p of visibles) {
      const clave = p.subcategoria || ''
      if (!mapa.has(clave)) mapa.set(clave, [])
      mapa.get(clave).push(p)
    }
    return [...mapa.entries()]
  }, [visibles, puedeReordenar])

  /* -------------------------------------------------- acciones */
  async function guardar(form) {
    const esNuevo = !form.id
    const categoriaId = Number(form.categoria_id)
    // Un producto nuevo va al final de su sección, no arriba de todo (antes
    // quedaba con orden=0 por default y saltaba al principio de la lista).
    const ordenNuevo = esNuevo
      ? Math.max(0, ...productos.filter((p) => p.categoria_id === categoriaId).map((p) => p.orden)) + 1
      : undefined

    const fila = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      subcategoria: form.subcategoria.trim() || null,
      categoria_id: categoriaId,
      precio_unit: form.precio_unit === '' ? null : Number(form.precio_unit),
      precio_pack: form.precio_pack === '' ? null : Number(form.precio_pack),
      unidades_pack: form.unidades_pack === '' ? null : Number(form.unidades_pack),
      imagen_url: form.imagen_url || null,
      visible: form.visible,
      ...(esNuevo ? { orden: ordenNuevo } : {})
    }

    const { error } = form.id
      ? await supabase.from('productos').update(fila).eq('id', form.id)
      : await supabase.from('productos').insert(fila)

    if (error) { setAviso({ tipo: 'error', texto: error.message }); return }
    setAviso({ tipo: 'ok', texto: form.id ? 'Producto actualizado' : 'Producto agregado' })
    setEditando(null)
    recargar()
  }

  // Agrupa por subcategoría igual que el catálogo (src/pages/Catalogo.jsx):
  // todos los productos de una misma subsección quedan juntos en su propio
  // array, en el orden en que aparecen, sin importar si en la lista original
  // había productos de otra subsección intercalados en el medio.
  function agruparPorSubcategoria(lista) {
    const mapa = new Map()
    for (const p of lista) {
      const clave = p.subcategoria || ''
      if (!mapa.has(clave)) mapa.set(clave, [])
      mapa.get(clave).push(p)
    }
    return mapa
  }

  // Mueve un producto un lugar hacia arriba (-1) o abajo (+1) dentro de su
  // propia subsección (no de toda la sección — ej: mover algo dentro de
  // "Línea Coca" sin afectar el resto de Gaseosas). Rearma la sección entera
  // agrupada por subsección y renumera el "orden" 1..N en ese orden, lo que
  // de paso deja cada subsección contigua y resuelve empates viejos en
  // orden=0 o productos de otra subsección que hubieran quedado mezclados.
  async function moverProducto(p, direccion) {
    const listaCategoria = productos
      .filter((x) => x.categoria_id === p.categoria_id)
      .slice()
      .sort((a, b) => a.orden - b.orden || a.id - b.id)

    const mapa = agruparPorSubcategoria(listaCategoria)
    const grupo = mapa.get(p.subcategoria || '')
    const i = grupo.findIndex((x) => x.id === p.id)
    const j = i + direccion
    if (j < 0 || j >= grupo.length) return
    ;[grupo[i], grupo[j]] = [grupo[j], grupo[i]]

    const reordenada = [...mapa.values()].flat()
    const actualizaciones = reordenada
      .map((x, idx) => ({ id: x.id, orden: idx + 1 }))
      .filter((x) => productos.find((o) => o.id === x.id).orden !== x.orden)
    if (actualizaciones.length === 0) return

    const resultados = await Promise.all(
      actualizaciones.map((u) => supabase.from('productos').update({ orden: u.orden }).eq('id', u.id))
    )
    const conError = resultados.find((r) => r.error)
    if (conError) { setAviso({ tipo: 'error', texto: conError.error.message }); return }
    recargar()
  }

  async function eliminar(p) {
    if (!confirm(`Eliminar "${p.nombre}"? No se puede deshacer.`)) return
    const { error } = await supabase.from('productos').delete().eq('id', p.id)
    if (error) { setAviso({ tipo: 'error', texto: error.message }); return }
    setAviso({ tipo: 'ok', texto: 'Producto eliminado' })
    recargar()
  }

  /* -------------------------------------------------- ajuste de precios por lote */
  const coincidenciasAjuste = useMemo(() => {
    if (ajusteModo === 'categoria') {
      if (!ajusteCategoria) return []
      return productos.filter((p) => p.categoria_id === Number(ajusteCategoria))
    }
    const q = normalizar(ajusteTexto).trim()
    if (!q) return []
    return productos.filter((p) => normalizar(p.nombre).includes(q))
  }, [productos, ajusteModo, ajusteCategoria, ajusteTexto])

  // En modo "nombre" puede haber muchas coincidencias (ej: 21 "coca cola") y
  // el dueño quiere elegir puntualmente a cuáles les toca el ajuste. Al
  // cambiar la búsqueda, arrancamos con todas tildadas.
  useEffect(() => {
    if (ajusteModo === 'nombre') setAjusteSeleccion(new Set(coincidenciasAjuste.map((p) => p.id)))
  }, [ajusteTexto, ajusteModo])

  function alternarSeleccion(id) {
    setAjusteSeleccion((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const objetivoAjuste = ajusteModo === 'nombre'
    ? coincidenciasAjuste.filter((p) => ajusteSeleccion.has(p.id))
    : coincidenciasAjuste

  async function aplicarAjuste() {
    const pct = Number(ajustePorcentaje)
    if (!pct || Number.isNaN(pct)) return
    if (objetivoAjuste.length === 0) return
    const signo = pct > 0 ? '+' : ''
    if (!confirm(
      `Vas a aplicar ${signo}${pct}% a ${objetivoAjuste.length} producto(s). No se puede deshacer. ¿Continuar?`
    )) return

    setAjusteAplicando(true)
    const factor = 1 + pct / 100
    const ajustar = (v) => (v === null || v === undefined ? v : Math.round(Number(v) * factor))

    const resultados = await Promise.all(
      objetivoAjuste.map((p) =>
        supabase.from('productos').update({
          precio_unit: ajustar(p.precio_unit),
          precio_pack: ajustar(p.precio_pack)
        }).eq('id', p.id)
      )
    )
    setAjusteAplicando(false)

    const conError = resultados.find((r) => r.error)
    if (conError) { setAviso({ tipo: 'error', texto: conError.error.message }); return }

    setAviso({ tipo: 'ok', texto: `Precios actualizados en ${objetivoAjuste.length} producto(s)` })
    setAjusteAbierto(false)
    setAjusteTexto('')
    setAjustePorcentaje('')
    setAjusteSeleccion(new Set())
    recargar()
  }

  if (sesion === undefined) return <div className="p-8 font-sans text-sm text-ink-muted">Cargando…</div>
  if (!sesion) return null

  return (
    <div className="min-h-dvh bg-surface pb-24">
      <header className="sticky top-0 z-20 border-b-[3px] border-brass bg-masthead text-on-masthead">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img src="/logo-nuevo.jpeg" alt="" className="h-10 w-10 shrink-0 rounded-full" />
            <div>
              <h1 className="font-serif text-[22px] font-700 leading-[28px] tracking-[0.01em]">Panel</h1>
              <p className="cifra font-sans text-meta text-masthead-muted">{productos.length} productos cargados</p>
            </div>
          </div>
          <div className="flex items-center gap-3 font-sans text-sm font-600">
            <Link to="/" className="underline">Ver catálogo</Link>
            <button onClick={() => supabase.auth.signOut()} className="underline">Salir</button>
          </div>
        </div>
      </header>

      <div ref={cinta}
           className="sin-barra cursor-grab touch-pan-x overflow-x-auto border-b border-line bg-surface-raised active:cursor-grabbing">
        <div className="mx-auto flex max-w-3xl gap-1.5 px-4 py-2.5">
          <NavChip activa={filtroCategoria === null} onClick={() => setFiltroCategoria(null)}>
            Todas
          </NavChip>
          {categorias.map((c) => (
            <NavChip key={c.id} activa={filtroCategoria === c.id} onClick={() => setFiltroCategoria(c.id)}>
              {c.nombre}
            </NavChip>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4">
        {aviso && (
          <p role="status" className={[
            'mt-4 rounded-md px-3 py-2 font-sans text-sm',
            aviso.tipo === 'ok' ? 'bg-navy/10 text-navy' : 'bg-red-50 text-red-800'
          ].join(' ')}>
            {aviso.texto}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <input
            value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar para editar" type="search"
            className="flex-1 rounded-lg border border-line-strong bg-surface-raised px-3 py-3 font-sans text-base
                       focus:border-navy focus:outline-none"
          />
          <button
            onClick={() => setEditando({ ...VACIO, categoria_id: categorias[0]?.id ?? '' })}
            className="shrink-0 rounded-lg bg-navy px-4 font-sans text-sm font-600 text-on-navy hover:bg-navy-strong"
          >
            Agregar
          </button>
        </div>

        <div className="mt-3 overflow-hidden rounded-lg border border-line bg-surface-raised">
          <button
            onClick={() => setAjusteAbierto((v) => !v)}
            className="flex w-full items-center justify-between px-3 py-2.5 font-sans text-sm font-600 text-ink"
          >
            Ajustar precios por lote
            <span className="text-ink-muted">{ajusteAbierto ? '−' : '+'}</span>
          </button>

          {ajusteAbierto && (
            <div className="space-y-3 border-t border-line px-3 py-3">
              <div className="flex gap-2 font-sans text-sm">
                <button
                  onClick={() => setAjusteModo('categoria')}
                  className={[
                    'flex-1 rounded-md border px-3 py-2',
                    ajusteModo === 'categoria' ? 'border-navy bg-navy/10 text-navy' : 'border-line-strong text-ink'
                  ].join(' ')}
                >
                  Por sección
                </button>
                <button
                  onClick={() => setAjusteModo('nombre')}
                  className={[
                    'flex-1 rounded-md border px-3 py-2',
                    ajusteModo === 'nombre' ? 'border-navy bg-navy/10 text-navy' : 'border-line-strong text-ink'
                  ].join(' ')}
                >
                  Por nombre
                </button>
              </div>

              {ajusteModo === 'categoria' ? (
                <select
                  value={ajusteCategoria} onChange={(e) => setAjusteCategoria(e.target.value)}
                  className="w-full rounded-lg border border-line-strong bg-surface-raised px-3 py-3 font-sans text-base
                             focus:border-navy focus:outline-none"
                >
                  <option value="">Elegí una sección</option>
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              ) : (
                <input
                  value={ajusteTexto} onChange={(e) => setAjusteTexto(e.target.value)}
                  placeholder="Nombre o parte del nombre"
                  className="w-full rounded-lg border border-line-strong bg-surface-raised px-3 py-3 font-sans text-base
                             focus:border-navy focus:outline-none"
                />
              )}

              {ajusteModo === 'nombre' && coincidenciasAjuste.length > 0 && (
                <div className="overflow-hidden rounded-lg border border-line">
                  <div className="flex items-center justify-between border-b border-line bg-surface px-3 py-2">
                    <span className="font-sans text-2xs text-ink-muted">
                      {coincidenciasAjuste.length} coincidencia(s) — elegí cuáles ajustar
                    </span>
                    <button
                      onClick={() => setAjusteSeleccion(new Set(coincidenciasAjuste.map((p) => p.id)))}
                      className="font-sans text-2xs font-600 text-navy underline"
                    >
                      Elegir todas
                    </button>
                  </div>
                  <div className="max-h-48 divide-y divide-line overflow-y-auto bg-surface-raised">
                    {coincidenciasAjuste.map((p) => (
                      <label key={p.id} className="flex items-center gap-2.5 px-3 py-2 font-sans text-sm text-ink">
                        <input
                          type="checkbox" checked={ajusteSeleccion.has(p.id)}
                          onChange={() => alternarSeleccion(p.id)}
                          className="h-4 w-4 shrink-0 accent-navy"
                        />
                        <span className="min-w-0 flex-1 truncate">{p.nombre}</span>
                        <span className="cifra shrink-0 text-2xs text-ink-muted">{precio(p.precio_unit)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <label className="block">
                <span className="font-sans text-sm font-500 text-ink">Porcentaje</span>
                <input
                  type="number" inputMode="decimal"
                  value={ajustePorcentaje} onChange={(e) => setAjustePorcentaje(e.target.value)}
                  placeholder="Ej: 10 para +10%, -5 para -5%"
                  className="mt-1.5 w-full rounded-lg border border-line-strong bg-surface-raised px-3 py-3 font-sans text-base
                             focus:border-navy focus:outline-none"
                />
              </label>

              <p className="cifra font-sans text-2xs text-ink-muted">
                {objetivoAjuste.length} producto(s) van a cambiar de precio
              </p>

              <button
                onClick={aplicarAjuste}
                disabled={!ajustePorcentaje || objetivoAjuste.length === 0 || ajusteAplicando}
                className="w-full rounded-lg bg-navy py-3 font-sans text-sm font-600 text-on-navy hover:bg-navy-strong disabled:opacity-50"
              >
                {ajusteAplicando ? 'Aplicando…' : 'Aplicar a los precios'}
              </button>
            </div>
          )}
        </div>

        {!puedeReordenar && (
          <p className="mt-3 font-sans text-2xs text-ink-muted">
            Elegí una sección arriba (y dejá la búsqueda vacía) para poder ordenar sus productos a mano,
            subsección por subsección.
          </p>
        )}

        <div className="mt-4 overflow-hidden rounded-lg border border-line bg-surface-raised">
          {puedeReordenar ? (
            gruposVisibles.map(([clave, items]) => (
              <div key={clave || '__general__'}>
                <p className="border-b border-t border-line bg-surface px-3 py-1.5 font-sans text-2xs
                               font-600 uppercase tracking-wide text-ink-muted first:border-t-0">
                  {clave || 'Sin subsección'}
                </p>
                <div className="divide-y divide-line">
                  {items.map((p, i) => (
                    <FilaProducto key={p.id} p={p}
                      onSubir={() => moverProducto(p, -1)} puedeSubir={i > 0}
                      onBajar={() => moverProducto(p, 1)} puedeBajar={i < items.length - 1}
                      onEditar={() => setEditando(p)} onEliminar={() => eliminar(p)} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="divide-y divide-line">
              {visibles.map((p) => (
                <FilaProducto key={p.id} p={p}
                  onEditar={() => setEditando(p)} onEliminar={() => eliminar(p)} />
              ))}
            </div>
          )}
          {visibles.length === 0 && (
            <p className="px-3 py-8 text-center font-sans text-sm text-ink-muted">
              No hay productos con ese nombre.
            </p>
          )}
        </div>
      </div>

      {editando && (
        <Formulario
          inicial={editando}
          categorias={categorias}
          productos={productos}
          onCancelar={() => setEditando(null)}
          onGuardar={guardar}
        />
      )}
    </div>
  )
}

/* ==================================================================== */
/* Formulario de alta / edición                                         */
/* ==================================================================== */
function Formulario({ inicial, categorias, productos, onCancelar, onGuardar }) {
  const [f, setF] = useState({
    ...VACIO, ...inicial,
    precio_unit: inicial.precio_unit ?? '',
    precio_pack: inicial.precio_pack ?? '',
    unidades_pack: inicial.unidades_pack ?? '',
    descripcion: inicial.descripcion ?? '',
    subcategoria: inicial.subcategoria ?? '',
    imagen_url: inicial.imagen_url ?? ''
  })
  const [subiendo, setSubiendo] = useState(false)
  const [fotoRota, setFotoRota] = useState(false)   // el link pegado no muestra nada
  // Si la subsección del producto (al editar) no está entre las de su sección
  // actual, arrancamos mostrando el campo de texto en vez del desplegable.
  const [subNueva, setSubNueva] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const subcategoriasDeLaSeccion = useMemo(() => {
    const set = new Set()
    for (const p of productos) {
      if (p.categoria_id === Number(f.categoria_id) && p.subcategoria) set.add(p.subcategoria)
    }
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [productos, f.categoria_id])

  useEffect(() => {
    if (f.subcategoria && !subcategoriasDeLaSeccion.includes(f.subcategoria)) setSubNueva(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function cambiarSeccion(e) {
    // Al cambiar de sección las subsecciones son otras, así que no tiene
    // sentido arrastrar la elegida antes.
    setF((prev) => ({ ...prev, categoria_id: e.target.value, subcategoria: '' }))
    setSubNueva(false)
  }

  function elegirSubcategoria(e) {
    if (e.target.value === '__nueva__') { setSubNueva(true); setF((prev) => ({ ...prev, subcategoria: '' })); return }
    setF((prev) => ({ ...prev, subcategoria: e.target.value }))
  }

  async function subirFoto(e) {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    setSubiendo(true)
    const nombre = `${Date.now()}-${archivo.name.replace(/[^\w.\-]/g, '_')}`
    const { error } = await supabase.storage.from('productos').upload(nombre, archivo, {
      cacheControl: '31536000', upsert: false
    })
    setSubiendo(false)
    if (error) { alert('No se pudo subir la foto: ' + error.message); return }
    const { data } = supabase.storage.from('productos').getPublicUrl(nombre)
    setFotoRota(false)
    setF((prev) => ({ ...prev, imagen_url: data.publicUrl }))
  }

  // La otra forma de poner la foto: pegar el link de una imagen que ya está
  // publicada en internet, sin subir nada al bucket.
  function pegarLinkFoto(e) {
    setFotoRota(false)
    setF((prev) => ({ ...prev, imagen_url: e.target.value.trim() }))
  }

  function quitarFoto() {
    setFotoRota(false)
    setF((prev) => ({ ...prev, imagen_url: '' }))
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-surface-raised p-5 sm:rounded-2xl">
        <h2 className="font-serif text-xl font-700 text-ink">
          {f.id ? 'Editar producto' : 'Nuevo producto'}
        </h2>

        <div className="mt-4 space-y-3.5">
          <Campo etiqueta="Nombre" valor={f.nombre} onChange={set('nombre')} />

          <label className="block">
            <span className="font-sans text-sm font-500 text-ink">Sección</span>
            <select value={f.categoria_id} onChange={cambiarSeccion}
                    className="mt-1.5 w-full rounded-lg border border-line-strong bg-surface-raised px-3 py-3 font-sans text-base
                               focus:border-navy focus:outline-none">
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="font-sans text-sm font-500 text-ink">Subsección (opcional)</span>
            {!subNueva ? (
              <select value={f.subcategoria} onChange={elegirSubcategoria}
                      className="mt-1.5 w-full rounded-lg border border-line-strong bg-surface-raised px-3 py-3 font-sans text-base
                                 focus:border-navy focus:outline-none">
                <option value="">Sin subsección (general)</option>
                {subcategoriasDeLaSeccion.map((s) => <option key={s} value={s}>{s}</option>)}
                <option value="__nueva__">+ Crear subsección nueva…</option>
              </select>
            ) : (
              <div className="mt-1.5 flex gap-2">
                <input value={f.subcategoria} onChange={set('subcategoria')} autoFocus
                       placeholder="Ej: Latas 473 ml"
                       className="w-full rounded-lg border border-line-strong bg-surface-raised px-3 py-3 font-sans text-base
                                  focus:border-navy focus:outline-none" />
                <button type="button" onClick={() => { setSubNueva(false); setF((prev) => ({ ...prev, subcategoria: '' })) }}
                        className="shrink-0 rounded-lg border border-line-strong px-3 font-sans text-sm text-ink">
                  Cancelar
                </button>
              </div>
            )}
            <span className="mt-1 block font-sans text-2xs text-ink-muted">
              Agrupa los productos dentro de la sección (ej: "Latas 473 ml").
            </span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Precio unitario" tipo="number" valor={f.precio_unit} onChange={set('precio_unit')}
                   ayuda="Vacío = Sin Stock" />
            <Campo etiqueta="Precio por pack" tipo="number" valor={f.precio_pack} onChange={set('precio_pack')} />
          </div>

          <Campo etiqueta="Unidades por pack" tipo="number" valor={f.unidades_pack} onChange={set('unidades_pack')} />

          <label className="block">
            <span className="font-sans text-sm font-500 text-ink">Descripción (opcional)</span>
            <textarea value={f.descripcion} onChange={set('descripcion')} rows={2}
                      className="mt-1.5 w-full rounded-lg border border-line-strong bg-surface-raised px-3 py-2.5 font-sans text-base
                                 focus:border-navy focus:outline-none" />
          </label>

          <div>
            <span className="font-sans text-sm font-500 text-ink">Foto</span>
            <div className="mt-1.5 flex items-center gap-3">
              {f.imagen_url && !fotoRota
                ? <img src={f.imagen_url} alt="" onError={() => setFotoRota(true)}
                       className="h-16 w-16 rounded-md border border-line object-cover" />
                : <div className="h-16 w-16 rounded-md border border-dashed border-line bg-surface-sunken" />}
              <input type="file" accept="image/*" onChange={subirFoto} className="font-sans text-sm" />
            </div>
            {subiendo && <p className="mt-1 font-sans text-sm text-ink-muted">Subiendo…</p>}

            <input type="url" value={f.imagen_url} onChange={pegarLinkFoto}
                   placeholder="https://… link de una imagen"
                   className="mt-2 w-full rounded-lg border border-line-strong bg-surface-raised px-3 py-2.5 font-sans text-base
                              focus:border-navy focus:outline-none" />
            <div className="mt-1 flex items-start justify-between gap-3">
              <span className="font-sans text-2xs text-ink-muted">
                Subí un archivo o pegá el link de una imagen que ya esté en internet.
              </span>
              {f.imagen_url &&
                <button type="button" onClick={quitarFoto}
                        className="shrink-0 font-sans text-2xs font-600 text-ink-muted underline">
                  Quitar foto
                </button>}
            </div>
            {f.imagen_url && fotoRota &&
              <p className="mt-1 font-sans text-2xs text-red-600">
                Ese link no muestra ninguna imagen. Revisalo o subí el archivo.
              </p>}
          </div>

          <label className="flex items-center gap-2.5">
            <input type="checkbox" checked={f.visible}
                   onChange={(e) => setF({ ...f, visible: e.target.checked })}
                   className="h-4 w-4 accent-navy" />
            <span className="font-sans text-sm text-ink">Mostrar en el catálogo</span>
          </label>
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={onCancelar}
                  className="flex-1 rounded-lg border border-line-strong py-3 font-sans text-base font-500 text-ink">
            Cancelar
          </button>
          <button onClick={() => onGuardar(f)} disabled={!f.nombre.trim() || subiendo}
                  className="flex-1 rounded-lg bg-navy py-3 font-sans text-base font-600 text-on-navy hover:bg-navy-strong disabled:opacity-50">
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

function FilaProducto({ p, onSubir, puedeSubir, onBajar, puedeBajar, onEditar, onEliminar }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      {onSubir && (
        <div className="flex shrink-0 flex-col gap-1">
          <button onClick={onSubir} disabled={!puedeSubir} aria-label="Subir"
                  className="rounded border border-line-strong px-1.5 leading-4 text-ink disabled:opacity-30">▲</button>
          <button onClick={onBajar} disabled={!puedeBajar} aria-label="Bajar"
                  className="rounded border border-line-strong px-1.5 leading-4 text-ink disabled:opacity-30">▼</button>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-sans text-[1rem] font-600 text-ink">{p.nombre}</p>
        <p className="cifra truncate font-sans text-meta text-ink-muted">
          {precio(p.precio_unit)}
          {p.subcategoria && ` · ${p.subcategoria}`}
          {!p.visible && ' · oculto'}
        </p>
      </div>
      <button onClick={onEditar}
              className="rounded-md border border-line-strong bg-surface-raised px-3 py-1.5 font-sans text-sm text-ink">Editar</button>
      <button onClick={onEliminar}
              className="rounded-md px-2 py-1.5 font-sans text-sm text-bordo hover:bg-bordo-soft">Borrar</button>
    </div>
  )
}

function NavChip({ activa, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={[
        'shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 font-sans text-sm font-600 transition-colors',
        activa ? 'border-navy bg-navy text-on-navy' : 'border-line-strong text-ink hover:border-navy'
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function Campo({ etiqueta, valor, onChange, tipo = 'text', ayuda }) {
  return (
    <label className="block">
      <span className="font-sans text-sm font-500 text-ink">{etiqueta}</span>
      <input type={tipo} inputMode={tipo === 'number' ? 'decimal' : undefined}
             value={valor} onChange={onChange}
             className="mt-1.5 w-full rounded-lg border border-line-strong bg-surface-raised px-3 py-3 font-sans text-base
                        focus:border-navy focus:outline-none" />
      {ayuda && <span className="mt-1 block font-sans text-2xs text-ink-muted">{ayuda}</span>}
    </label>
  )
}
