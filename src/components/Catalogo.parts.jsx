import { useRef, useEffect, useState } from 'react'
import { precio, sinPrecio } from '../lib/formato'

const WPP = import.meta.env.VITE_WHATSAPP || '5492346000000'
const NEGOCIO = import.meta.env.VITE_NEGOCIO || 'Valfer Bebidas Chivilcoy SA'

/* ------------------------------------------------------------------ */
/* Encabezado                                                          */
/* ------------------------------------------------------------------ */
export function Encabezado({ actualizado, sesion, onSalir }) {
  return (
    <header className="border-b-[3px] border-brass bg-masthead text-on-masthead">
      <div className="mx-auto flex max-w-3xl items-start justify-between gap-3 px-4 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <img src="/logo-nuevo.jpeg" alt="" className="h-11 w-11 shrink-0 rounded-full" />
          <div>
            <h1 className="font-serif text-[22px] font-700 leading-[28px] tracking-[0.01em] desde720:text-[30px] desde720:leading-[36px]">
              {NEGOCIO}
            </h1>
            {actualizado && (
              <p className="mt-1.5 font-sans text-[13px] leading-[18px] text-masthead-muted desde720:text-[15px] desde720:leading-[22px]">
                actualizada el {actualizado}
              </p>
            )}
          </div>
        </div>

        {sesion && (
          <button
            onClick={onSalir}
            className="mt-1 shrink-0 rounded-md border border-on-masthead/25 px-3 py-1.5 font-sans text-sm font-600 text-on-masthead/90 hover:bg-on-masthead/10"
          >
            Cerrar sesión
          </button>
        )}
      </div>
    </header>
  )
}

/* ------------------------------------------------------------------ */
/* Buscador + chips de categoría, pegados arriba al hacer scroll       */
/* ------------------------------------------------------------------ */
export function BarraBusqueda({
  texto, setTexto, categorias, activa, setActiva,
  subcategorias = [], subActiva, setSubActiva, total
}) {
  const cinta = useRef(null)
  const cintaSub = useRef(null)
  useArrastreHorizontal(cinta, [categorias.length])
  useArrastreHorizontal(cintaSub, [subcategorias.length])
  const bordes = useBordesScroll(cinta, [categorias.length])
  const bordesSub = useBordesScroll(cintaSub, [subcategorias.length])

  // Al cambiar de categoría, traer el chip elegido a la vista
  useEffect(() => {
    const el = cinta.current?.querySelector('[data-activa="true"]')
    el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [activa])

  return (
    <div className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto max-w-3xl px-4 pt-3 pb-2">
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
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
            className="w-full rounded-lg border border-line-strong bg-surface-raised py-3 pl-10 pr-10 font-sans text-base
                       placeholder:text-ink-muted focus:border-navy focus:outline-none"
          />
          {texto && (
            <button
              onClick={() => setTexto('')}
              aria-label="Borrar búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-2 text-ink-muted hover:text-ink"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        <div ref={cinta} className="sin-barra cursor-grab overflow-x-auto touch-pan-x active:cursor-grabbing">
          <div className="mx-auto flex max-w-3xl gap-1.5 px-4 pb-3">
            <Chip activa={activa === null} onClick={() => setActiva(null)}>Todo</Chip>
            {categorias.map((c) => (
              <Chip key={c.id} activa={activa === c.id} onClick={() => setActiva(c.id)}>
                {c.nombre}
              </Chip>
            ))}
          </div>
        </div>
        {bordes.izq && <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-surface/95 to-transparent" />}
        {bordes.der && <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-surface/95 to-transparent" />}
      </div>

      {subcategorias.length > 1 && (
        <div className="relative">
          <div ref={cintaSub} className="sin-barra cursor-grab overflow-x-auto touch-pan-x active:cursor-grabbing">
            <div className="mx-auto flex max-w-3xl gap-1.5 px-4 pb-3">
              <Chip chica activa={subActiva === null} onClick={() => setSubActiva(null)}>Todas las líneas</Chip>
              {subcategorias.map((s) => (
                <Chip chica key={s} activa={subActiva === s} onClick={() => setSubActiva(s)}>
                  {s}
                </Chip>
              ))}
            </div>
          </div>
          {bordesSub.izq && <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-surface/95 to-transparent" />}
          {bordesSub.der && <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-surface/95 to-transparent" />}
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 pb-2">
        <p className="cifra font-sans text-meta text-ink-muted">
          {total} {total === 1 ? 'producto' : 'productos'}
        </p>
      </div>
    </div>
  )
}

function Chip({ activa, onClick, children, chica }) {
  return (
    <button
      onClick={onClick}
      data-activa={activa}
      className={[
        'shrink-0 whitespace-nowrap rounded-full font-sans font-600 transition-colors',
        chica ? 'px-3.5 py-2 text-xs' : 'px-3.5 py-2 text-sm',
        activa
          ? 'border border-navy bg-navy text-on-navy'
          : 'border border-line-strong bg-surface-raised text-ink hover:border-navy'
      ].join(' ')}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Detecta si una cinta de chips tiene más contenido a izquierda/      */
/* derecha, para mostrar un desvanecido que avise que se puede         */
/* seguir scrolleando (si no, no queda claro que el nav sigue).        */
/* ------------------------------------------------------------------ */
function useBordesScroll(ref, deps = []) {
  const [estado, setEstado] = useState({ izq: false, der: false })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    function calcular() {
      setEstado({
        izq: el.scrollLeft > 4,
        der: el.scrollLeft < el.scrollWidth - el.clientWidth - 4
      })
    }

    calcular()
    el.addEventListener('scroll', calcular, { passive: true })
    window.addEventListener('resize', calcular)
    return () => {
      el.removeEventListener('scroll', calcular)
      window.removeEventListener('resize', calcular)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return estado
}

/* ------------------------------------------------------------------ */
/* Arrastre horizontal con mouse/trackpad para las cintas de chips.    */
/* El scroll táctil nativo ya funciona en un celular real; esto cubre  */
/* simuladores y navegadores de escritorio donde arrastrar con el      */
/* mouse no dispara scroll horizontal por sí solo.                     */
/* ------------------------------------------------------------------ */
function useArrastreHorizontal(ref, deps = []) {
  useEffect(() => {
    const el = ref.current
    if (!el) return

    let arrastrando = false
    let inicioX = 0
    let inicioScroll = 0
    let movido = false

    function abajo(e) {
      arrastrando = true
      movido = false
      inicioX = e.clientX
      inicioScroll = el.scrollLeft
    }
    function mover(e) {
      if (!arrastrando) return
      const delta = e.clientX - inicioX
      if (Math.abs(delta) > 3) movido = true
      el.scrollLeft = inicioScroll - delta
    }
    function soltar() { arrastrando = false }
    // Evita que el click dispare la selección del chip cuando en realidad se arrastró
    function click(e) { if (movido) { e.stopPropagation(); e.preventDefault() } }

    el.addEventListener('pointerdown', abajo)
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
    el.addEventListener('click', click, true)

    return () => {
      el.removeEventListener('pointerdown', abajo)
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      el.removeEventListener('click', click, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

/* ------------------------------------------------------------------ */
/* Tarjeta de producto                                                 */
/* Estructura fija (foto / nombre / precio siempre en el mismo lugar)  */
/* para que las tarjetas queden alineadas en la grilla aunque a algún  */
/* producto le falte descripción, pack o precio.                      */
/* ------------------------------------------------------------------ */
export function TarjetaProducto({ p }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface-raised">
      <div className="relative aspect-square w-full overflow-hidden bg-surface-sunken">
        <Miniatura src={p.imagen_url} alt={p.nombre} grande />
      </div>

      <div className="flex flex-1 flex-col gap-1 px-3 pb-3 pt-2.5">
        <h3 className="font-sans text-[15px] font-600 leading-[20px] line-clamp-2 min-h-[2.375rem] text-ink">
          {p.nombre}
        </h3>

        <p className="cifra font-sans text-meta text-ink-muted">
          {p.unidades_pack ? `Pack x ${p.unidades_pack}` : ' '}
        </p>

        <div className="mt-auto pt-1.5">
          <p className={[
            'cifra font-sans font-700 text-[18px] leading-[22px] desde600:text-[20px] desde600:leading-[24px]',
            sinPrecio(p.precio_unit) ? 'italic text-bordo' : 'text-ink'
          ].join(' ')}>
            {precio(p.precio_unit)}
          </p>
          <p className="mt-1 cifra font-sans text-pack text-ink-muted">
            {!sinPrecio(p.precio_pack) ? `pack ${precio(p.precio_pack)}` : ' '}
          </p>
        </div>
      </div>
    </article>
  )
}

function Miniatura({ src, alt, grande }) {
  // "grande" vive dentro de un contenedor `relative aspect-square overflow-hidden`:
  // se posiciona absoluto para no participar del layout en flujo, porque una imagen
  // muy angosta/alta (recortes de PDF, ej. 80x316) hace que `h-full` con `aspect-ratio`
  // en el padre no alcance a fijar la altura y el navegador la calcula por el alto
  // intrínseco de la imagen en vez de por el cuadrado del contenedor.
  const tamano = grande ? 'absolute inset-0 h-full w-full' : 'h-14 w-14 shrink-0 rounded-md border border-line'

  if (!src) {
    return (
      <div className={`grid place-items-center bg-surface-sunken ${tamano}`} aria-hidden="true">
        <svg width={grande ? 32 : 20} height={grande ? 32 : 20} viewBox="0 0 24 24" fill="none" stroke="var(--ink-muted)" strokeWidth="1.5">
          <path d="M8 2h8l1 4v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6z" /><path d="M7 9h10" />
        </svg>
      </div>
    )
  }
  return (
    <img src={src} alt={alt} loading="lazy" decoding="async"
         className={`object-contain bg-surface-raised ${tamano}`} />
  )
}

/* ------------------------------------------------------------------ */
/* Título de subcategoría                                              */
/* ------------------------------------------------------------------ */
export function TituloGrupo({ children }) {
  return (
    <h2 className="sticky top-[132px] z-10 flex items-center gap-3 bg-surface px-4 pb-1.5 pt-4 font-serif text-[19px] font-700 leading-[24px] text-ink desde720:text-[21px] desde720:leading-[28px]">
      <span>{children}</span>
      <span className="h-px flex-1 bg-line-strong" aria-hidden="true" />
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
                 bg-navy px-5 py-3.5 font-sans text-on-navy shadow-lg shadow-black/20 active:bg-navy-strong"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.9L2 22l5.25-1.5A9.9 9.9 0 1 0 12.04 2m0 1.7a8.2 8.2 0 1 1-4.2 15.2l-.3-.18-3.1.88.9-3-.2-.32A8.2 8.2 0 0 1 12.04 3.7m-3.1 3.5c-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.02s.87 2.34 1 2.5c.12.16 1.7 2.7 4.2 3.68 2.08.82 2.5.66 2.95.62.45-.04 1.45-.6 1.66-1.17.2-.58.2-1.07.14-1.18-.06-.1-.22-.16-.46-.28-.24-.12-1.45-.72-1.67-.8-.22-.08-.39-.12-.55.12-.16.24-.63.8-.77.96-.14.16-.28.18-.52.06-.24-.12-1.03-.38-1.96-1.21-.72-.65-1.21-1.44-1.35-1.68-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.33-.75-1.82-.19-.46-.38-.4-.53-.4z" />
      </svg>
      <span className="text-[0.9375rem] font-600">Consultar</span>
    </a>
  )
}
