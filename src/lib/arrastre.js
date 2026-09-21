import { useEffect } from 'react'

/* ------------------------------------------------------------------ */
/* Arrastre horizontal con mouse/trackpad para las cintas de chips.    */
/* El scroll táctil nativo ya funciona en un celular real; esto cubre  */
/* simuladores y navegadores de escritorio donde arrastrar con el      */
/* mouse no dispara scroll horizontal por sí solo.                     */
/* Lo usan la barra del catálogo y el nav de secciones del panel.      */
/* ------------------------------------------------------------------ */
export function useArrastreHorizontal(ref, deps = []) {
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
