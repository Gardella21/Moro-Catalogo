const pesos = new Intl.NumberFormat('es-AR', {
  style: 'currency', currency: 'ARS',
  minimumFractionDigits: 0, maximumFractionDigits: 0
})

// En el Excel "sin precio" viene como $0.00, celda vacía o #VALUE!.
// Todo eso es lo mismo: no hay precio cargado.
export const sinPrecio = (v) =>
  v === null || v === undefined || v === '' || Number(v) === 0 || Number.isNaN(Number(v))

export const precio = (v) => (sinPrecio(v) ? 'Consultar' : pesos.format(Number(v)))

// Para buscar: saca acentos y pasa a minúscula
export const normalizar = (s) =>
  (s ?? '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
