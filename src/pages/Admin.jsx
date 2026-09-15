import { useEffect, useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase, hayBackend } from '../lib/supabase'
import { precio, normalizar } from '../lib/formato'

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
  const [editando, setEditando] = useState(null)   // objeto producto o null
  const [aviso, setAviso] = useState(null)

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
      supabase.from('productos').select('*').order('orden')
    ])
    setCategorias(c.data ?? [])
    setProductos(p.data ?? [])
  }
  useEffect(() => { if (sesion) recargar() }, [sesion])

  const visibles = useMemo(() => {
    const q = normalizar(busqueda).trim()
    if (!q) return productos.slice(0, 60)
    return productos.filter((p) => normalizar(p.nombre).includes(q)).slice(0, 60)
  }, [productos, busqueda])

  /* -------------------------------------------------- acciones */
  async function guardar(form) {
    const fila = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      subcategoria: form.subcategoria.trim() || null,
      categoria_id: Number(form.categoria_id),
      precio_unit: form.precio_unit === '' ? null : Number(form.precio_unit),
      precio_pack: form.precio_pack === '' ? null : Number(form.precio_pack),
      unidades_pack: form.unidades_pack === '' ? null : Number(form.unidades_pack),
      imagen_url: form.imagen_url || null,
      visible: form.visible
    }

    const { error } = form.id
      ? await supabase.from('productos').update(fila).eq('id', form.id)
      : await supabase.from('productos').insert(fila)

    if (error) { setAviso({ tipo: 'error', texto: error.message }); return }
    setAviso({ tipo: 'ok', texto: form.id ? 'Producto actualizado' : 'Producto agregado' })
    setEditando(null)
    recargar()
  }

  async function eliminar(p) {
    if (!confirm(`Eliminar "${p.nombre}"? No se puede deshacer.`)) return
    const { error } = await supabase.from('productos').delete().eq('id', p.id)
    if (error) { setAviso({ tipo: 'error', texto: error.message }); return }
    setAviso({ tipo: 'ok', texto: 'Producto eliminado' })
    recargar()
  }

  if (sesion === undefined) return <div className="p-8 text-sm text-gris">Cargando…</div>
  if (!sesion) return null

  return (
    <div className="min-h-dvh bg-papel pb-24">
      <header className="sticky top-0 z-20 border-b border-linea bg-verdeOsc text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div>
            <p className="font-cond text-lg font-700 leading-tight">Panel</p>
            <p className="cifra text-2xs text-white/70">{productos.length} productos cargados</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link to="/" className="underline">Ver catálogo</Link>
            <button onClick={() => supabase.auth.signOut()} className="underline">Salir</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4">
        {aviso && (
          <p role="status" className={[
            'mt-4 rounded-md px-3 py-2 text-sm',
            aviso.tipo === 'ok' ? 'bg-verde/10 text-verde' : 'bg-red-50 text-red-800'
          ].join(' ')}>
            {aviso.texto}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <input
            value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar para editar" type="search"
            className="flex-1 rounded-lg border border-linea bg-white px-3 py-3 text-base
                       focus:border-verde focus:outline-none"
          />
          <button
            onClick={() => setEditando({ ...VACIO, categoria_id: categorias[0]?.id ?? '' })}
            className="shrink-0 rounded-lg bg-verde px-4 text-sm font-600 text-white"
          >
            Agregar
          </button>
        </div>

        <div className="mt-4 divide-y divide-linea overflow-hidden rounded-lg border border-linea bg-white">
          {visibles.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-cond text-[1rem] font-600">{p.nombre}</p>
                <p className="cifra truncate text-2xs text-gris">
                  {precio(p.precio_unit)}
                  {p.subcategoria && ` · ${p.subcategoria}`}
                  {!p.visible && ' · oculto'}
                </p>
              </div>
              <button onClick={() => setEditando(p)}
                      className="rounded-md border border-linea px-3 py-1.5 text-sm">Editar</button>
              <button onClick={() => eliminar(p)}
                      className="rounded-md px-2 py-1.5 text-sm text-red-700">Borrar</button>
            </div>
          ))}
          {visibles.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-gris">
              No hay productos con ese nombre.
            </p>
          )}
        </div>
      </div>

      {editando && (
        <Formulario
          inicial={editando}
          categorias={categorias}
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
function Formulario({ inicial, categorias, onCancelar, onGuardar }) {
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
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

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
    setF((prev) => ({ ...prev, imagen_url: data.publicUrl }))
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <h2 className="font-cond text-xl font-700">
          {f.id ? 'Editar producto' : 'Nuevo producto'}
        </h2>

        <div className="mt-4 space-y-3.5">
          <Campo etiqueta="Nombre" valor={f.nombre} onChange={set('nombre')} />

          <label className="block">
            <span className="text-sm font-500">Sección</span>
            <select value={f.categoria_id} onChange={set('categoria_id')}
                    className="mt-1.5 w-full rounded-lg border border-linea bg-white px-3 py-3 text-base">
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </label>

          <Campo etiqueta="Subsección (opcional)" valor={f.subcategoria} onChange={set('subcategoria')}
                 ayuda="Ej: Latas 473 ml. Sirve para agrupar dentro de la sección." />

          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Precio unitario" tipo="number" valor={f.precio_unit} onChange={set('precio_unit')}
                   ayuda="Vacío = Consultar" />
            <Campo etiqueta="Precio por pack" tipo="number" valor={f.precio_pack} onChange={set('precio_pack')} />
          </div>

          <Campo etiqueta="Unidades por pack" tipo="number" valor={f.unidades_pack} onChange={set('unidades_pack')} />

          <label className="block">
            <span className="text-sm font-500">Descripción (opcional)</span>
            <textarea value={f.descripcion} onChange={set('descripcion')} rows={2}
                      className="mt-1.5 w-full rounded-lg border border-linea px-3 py-2.5 text-base" />
          </label>

          <div>
            <span className="text-sm font-500">Foto</span>
            <div className="mt-1.5 flex items-center gap-3">
              {f.imagen_url
                ? <img src={f.imagen_url} alt="" className="h-16 w-16 rounded-md border border-linea object-cover" />
                : <div className="h-16 w-16 rounded-md border border-dashed border-linea" />}
              <input type="file" accept="image/*" onChange={subirFoto} className="text-sm" />
            </div>
            {subiendo && <p className="mt-1 text-sm text-gris">Subiendo…</p>}
          </div>

          <label className="flex items-center gap-2.5">
            <input type="checkbox" checked={f.visible}
                   onChange={(e) => setF({ ...f, visible: e.target.checked })}
                   className="h-4 w-4 accent-verde" />
            <span className="text-sm">Mostrar en el catálogo</span>
          </label>
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={onCancelar}
                  className="flex-1 rounded-lg border border-linea py-3 text-base font-500">
            Cancelar
          </button>
          <button onClick={() => onGuardar(f)} disabled={!f.nombre.trim() || subiendo}
                  className="flex-1 rounded-lg bg-verdeOsc py-3 text-base font-600 text-white disabled:opacity-50">
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

function Campo({ etiqueta, valor, onChange, tipo = 'text', ayuda }) {
  return (
    <label className="block">
      <span className="text-sm font-500">{etiqueta}</span>
      <input type={tipo} inputMode={tipo === 'number' ? 'decimal' : undefined}
             value={valor} onChange={onChange}
             className="mt-1.5 w-full rounded-lg border border-linea px-3 py-3 text-base
                        focus:border-verde focus:outline-none" />
      {ayuda && <span className="mt-1 block text-2xs text-gris">{ayuda}</span>}
    </label>
  )
}
