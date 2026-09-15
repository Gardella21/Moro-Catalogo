import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCatalogo } from '../hooks/useCatalogo'
import { normalizar } from '../lib/formato'
import { supabase, hayBackend } from '../lib/supabase'
import {
  Encabezado, BarraBusqueda, TarjetaProducto, TituloGrupo, BotonWhatsApp
} from '../components/Catalogo.parts'

export default function Catalogo() {
  const { categorias, productos, cargando, error } = useCatalogo()
  const [texto, setTexto] = useState('')
  const [activa, setActiva] = useState(null)
  const [subActiva, setSubActiva] = useState(null)
  const [sesion, setSesion] = useState(null)

  // Sesión del dueño: para poder mostrar "Cerrar sesión" también desde el catálogo
  useEffect(() => {
    if (!hayBackend) return
    supabase.auth.getSession().then(({ data }) => setSesion(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSesion(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // Al cambiar de categoría, la sub-línea elegida (ej: "Coca-Cola" dentro de Gaseosas) ya no aplica
  useEffect(() => { setSubActiva(null) }, [activa])

  const subcategorias = useMemo(() => {
    if (activa === null) return []
    const set = new Set()
    for (const p of productos) {
      if (p.categoria_id === activa && p.subcategoria) set.add(p.subcategoria)
    }
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [productos, activa])

  const filtrados = useMemo(() => {
    const q = normalizar(texto).trim()
    return productos.filter((p) => {
      if (activa !== null && p.categoria_id !== activa) return false
      if (subActiva && p.subcategoria !== subActiva) return false
      if (!q) return true
      // Busca por palabras sueltas: "coca 500" encuentra "COCA COLA 500"
      const heno = normalizar(`${p.nombre} ${p.subcategoria ?? ''} ${p.descripcion ?? ''}`)
      return q.split(/\s+/).every((palabra) => heno.includes(palabra))
    })
  }, [productos, texto, activa, subActiva])

  // Agrupar por subcategoría, respetando el orden en que vienen
  const grupos = useMemo(() => {
    const mapa = new Map()
    for (const p of filtrados) {
      const clave = p.subcategoria || 'Otros'
      if (!mapa.has(clave)) mapa.set(clave, [])
      mapa.get(clave).push(p)
    }
    return [...mapa.entries()]
  }, [filtrados])

  return (
    <div className="min-h-dvh pb-24">
      <Encabezado sesion={sesion} onSalir={() => supabase.auth.signOut()} />

      <BarraBusqueda
        texto={texto} setTexto={setTexto}
        categorias={categorias}
        activa={activa} setActiva={setActiva}
        subcategorias={subcategorias}
        subActiva={subActiva} setSubActiva={setSubActiva}
        total={filtrados.length}
      />

      <main className="mx-auto max-w-3xl">
        {cargando && <Cargando />}

        {error && (
          <Aviso titulo="No se pudo cargar la lista">
            Revisá la conexión y volvé a entrar. Si sigue igual, avisale a quien administra la app.
            <span className="mt-2 block text-2xs text-gris">{error}</span>
          </Aviso>
        )}

        {!cargando && !error && filtrados.length === 0 && (
          <Aviso titulo="No hay nada con esa búsqueda">
            Probá con menos palabras, o tocá <strong>Todo</strong> para ver la lista completa.
          </Aviso>
        )}

        {grupos.map(([titulo, items]) => (
          <section key={titulo}>
            {titulo !== 'Otros' && <TituloGrupo>{titulo}</TituloGrupo>}
            <div className="grid grid-cols-2 gap-3 px-4 py-3 sm:grid-cols-3">
              {items.map((p) => <TarjetaProducto key={p.id} p={p} />)}
            </div>
          </section>
        ))}
      </main>

      {/* Botón de WhatsApp: escondido por pedido del dueño, se puede reactivar
          descomentando esta línea si en algún momento vuelve a necesitarse. */}
      {/* <BotonWhatsApp /> */}

      <footer className="mx-auto max-w-3xl px-4 py-8 text-center text-2xs text-gris">
        {!hayBackend && (
          <p className="mb-3 rounded-md bg-ambar/10 px-3 py-2 text-ambar">
            Mostrando datos de ejemplo. Configurá <code>.env</code> para conectar la base real.
          </p>
        )}
        <p>Los precios pueden cambiar sin aviso. Consultá disponibilidad antes de cerrar el pedido.</p>
        {sesion
          ? <Link to="/panel" className="mt-3 inline-block underline">Panel</Link>
          : <Link to="/ingresar" className="mt-3 inline-block underline">Administrar</Link>}
      </footer>
    </div>
  )
}

function Cargando() {
  return (
    <div className="divide-y divide-linea">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-3 bg-white px-4 py-3">
          <div className="h-14 w-14 shrink-0 rounded-md bg-linea" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3.5 w-3/5 rounded bg-linea" />
            <div className="h-3 w-1/3 rounded bg-linea/70" />
          </div>
          <div className="h-3.5 w-16 rounded bg-linea" />
        </div>
      ))}
    </div>
  )
}

function Aviso({ titulo, children }) {
  return (
    <div className="px-4 py-14 text-center">
      <p className="font-cond text-xl font-600">{titulo}</p>
      <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-gris">{children}</p>
    </div>
  )
}
