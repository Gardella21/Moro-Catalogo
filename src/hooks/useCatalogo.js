import { useEffect, useState } from 'react'
import { supabase, hayBackend } from '../lib/supabase'
import { CATEGORIAS_DEMO, PRODUCTOS_DEMO } from '../data/demo'

/**
 * Trae todo el catálogo de una sola vez y lo guarda en memoria.
 *
 * Por qué de una sola vez y no paginado: son ~1.500 productos sin foto
 * incrustada, lo que da unos 200 KB de JSON. Se baja una vez, y buscar
 * o cambiar de categoría después es instantáneo, sin pedirle nada más a
 * la red. En un mostrador con señal mala eso importa más que el primer
 * segundo de carga.
 */
export function useCatalogo() {
  const [categorias, setCategorias] = useState([])
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let vivo = true

    async function traer() {
      if (!hayBackend) {
        setCategorias(CATEGORIAS_DEMO)
        setProductos(PRODUCTOS_DEMO)
        setCargando(false)
        return
      }
      try {
        const [cat, prod] = await Promise.all([
          supabase.from('categorias').select('*').eq('visible', true).order('orden'),
          supabase.from('productos').select('*').eq('visible', true).order('orden')
        ])
        if (cat.error) throw cat.error
        if (prod.error) throw prod.error
        if (!vivo) return
        setCategorias(cat.data)
        setProductos(prod.data)
      } catch (e) {
        if (vivo) setError(e.message)
      } finally {
        if (vivo) setCargando(false)
      }
    }

    traer()
    return () => { vivo = false }
  }, [])

  return { categorias, productos, cargando, error }
}
