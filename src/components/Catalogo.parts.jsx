import { useRef, useEffect } from 'react'
import { precio, sinPrecio } from '../lib/formato'

const WPP = import.meta.env.VITE_WHATSAPP || '5492346000000'
const NEGOCIO = import.meta.env.VITE_NEGOCIO || 'Moro Distribuidora'

/* ------------------------------------------------------------------ */
/* Encabezado                                                          */
/* ------------------------------------------------------------------ */
export function Encabezado({ actualizado }) {
  return (
    <header className="bg-verdeOsc text-white">
      <div className="mx-auto max-w-3xl px-4 pt-5 pb-4">
        <p className="font-cond text-[1.75rem] leading-none font-700 tracking-tight">
          {NEGOCIO}
        </p>
        <p className="mt-1.5 text-sm text-white/70">
          Lista de precios mayorista
          {actualizado && <> · actualizada el {actualizado}</>}
        </p>
      </div>
    </header>
  )
}

/* ------------------------------------------------------------------ */
/* Buscador + chips de categoría, pegados arriba al hacer scroll       */
/* ------------------------------------------------------------------ */
export function BarraBusqueda({ texto, setTexto, categorias, activa, setActiva, total }) {
  const cinta = useRef(null)

  // Al cambiar de categoría, traer el chip elegido a la vista
  useEffect(() => {
    const el = cinta.current?.querySelector('[data-activa="true"]')
    el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [activa])

  return (
    <div className="sticky top-0 z-20 bg-papel/95 backdrop-blur border-b border-linea">
      <div className="mx-auto max-w-3xl px-4 pt-3 pb-2">
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gris"
            width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            inputMode="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar producto"
            aria-label="Buscar producto"
            className="w-full rounded-lg border border-linea bg-white py-3 pl-10 pr-10 text-base
                       placeholder:text-gris focus:border-verde focus:outline-none"
          />
          {texto && (
            <button
              onClick={() => setTexto('')}
              aria-label="Borrar búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-2 text-gris hover:text-tinta"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          )}
        </div>
      </div>

      <div ref={cinta} className="sin-barra overflow-x-auto">
        <div className="mx-auto flex max-w-3xl gap-1.5 px-4 pb-3">
          <Chip activa={activa === null} onClick={() => setActiva(null)}>Todo</Chip>
          {categorias.map((c) => (
            <Chip key={c.id} activa={activa === c.id} onClick={() => setActiva(c.id)}>
              {c.nombre}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pb-2">
        <p className="text-2xs text-gris cifra">
          {total} {total === 1 ? 'producto' : 'productos'}
        </p>
      </div>
    </div>
  )
}

function Chip({ activa, onClick, children }) {
  return (
    <button
      onClick={onClick}
      data-activa={activa}
      className={[
        'shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-colors',
        activa
          ? 'bg-verdeOsc text-white'
          : 'bg-white text-tinta border border-linea hover:border-verde'
      ].join(' ')}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Fila de producto                                                    */
/* ------------------------------------------------------------------ */
export function FilaProducto({ p }) {
  return (
    <article className="flex gap-3 border-b border-linea bg-white px-4 py-3">
      <Miniatura src={p.imagen_url} alt={p.nombre} />

      <div className="min-w-0 flex-1">
        <h3 className="font-cond text-[1.0625rem] font-600 leading-snug">{p.nombre}</h3>
        {p.descripcion && (
          <p className="mt-0.5 text-sm leading-snug text-gris line-clamp-2">{p.descripcion}</p>
        )}
        {p.unidades_pack && (
          <p className="mt-1 text-2xs text-gris cifra">Pack x {p.unidades_pack}</p>
        )}
      </div>

      <div className="shrink-0 text-right">
        <p className={[
          'cifra font-600 leading-none',
          sinPrecio(p.precio_unit) ? 'text-sm text-gris' : 'text-[1.0625rem] text-tinta'
        ].join(' ')}>
          {precio(p.precio_unit)}
        </p>
        {!sinPrecio(p.precio_pack) && (
          <p className="mt-1.5 cifra text-2xs text-gris">
            pack {precio(p.precio_pack)}
          </p>
        )}
      </div>
    </article>
  )
}

function Miniatura({ src, alt }) {
  if (!src) {
    return (
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-md bg-papel border border-linea"
           aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7069" strokeWidth="1.5">
          <path d="M8 2h8l1 4v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6z" /><path d="M7 9h10" />
        </svg>
      </div>
    )
  }
  return (
    <img src={src} alt={alt} loading="lazy" decoding="async"
         className="h-14 w-14 shrink-0 rounded-md border border-linea object-cover bg-white" />
  )
}

/* ------------------------------------------------------------------ */
/* Título de subcategoría                                              */
/* ------------------------------------------------------------------ */
export function TituloGrupo({ children }) {
  return (
    <h2 className="sticky top-[132px] z-10 bg-papel px-4 pb-1.5 pt-4 text-sm font-600 text-verde">
      {children}
    </h2>
  )
}

/* ------------------------------------------------------------------ */
/* Botón de WhatsApp                                                   */
/* ------------------------------------------------------------------ */
export function BotonWhatsApp() {
  const texto = encodeURIComponent('Hola! Vi la lista de precios y quería hacer un pedido.')
  return (
    <a
      href={`https://wa.me/${WPP}?text=${texto}`}
      target="_blank" rel="noreferrer"
      className="safe-bottom fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-full
                 bg-verde px-5 py-3.5 text-white shadow-lg shadow-black/20 active:bg-verdeOsc"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.9L2 22l5.25-1.5A9.9 9.9 0 1 0 12.04 2m0 1.7a8.2 8.2 0 1 1-4.2 15.2l-.3-.18-3.1.88.9-3-.2-.32A8.2 8.2 0 0 1 12.04 3.7m-3.1 3.5c-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.02s.87 2.34 1 2.5c.12.16 1.7 2.7 4.2 3.68 2.08.82 2.5.66 2.95.62.45-.04 1.45-.6 1.66-1.17.2-.58.2-1.07.14-1.18-.06-.1-.22-.16-.46-.28-.24-.12-1.45-.72-1.67-.8-.22-.08-.39-.12-.55.12-.16.24-.63.8-.77.96-.14.16-.28.18-.52.06-.24-.12-1.03-.38-1.96-1.21-.72-.65-1.21-1.44-1.35-1.68-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.33-.75-1.82-.19-.46-.38-.4-.53-.4z" />
      </svg>
      <span className="text-[0.9375rem] font-600">Consultar</span>
    </a>
  )
}
