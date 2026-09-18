Cambios:
  [Hecho] 1-Cambiar el nombre de la seccion Jugos y energizantes a Jugos-Energizantes y Termas.
  Detalle: cambio de dato, no de código. Dejé el UPDATE en
  `scripts/cambios-2026-09-18.sql` (`update categorias set nombre = ...
  where slug = 'jugos'`) — falta correrlo en Supabase → SQL Editor. El
  slug se deja igual ('jugos'), como ya se hizo con "Galletitas y budines"
  → "Galletitas y Dulces" en la ronda anterior.

  [Hecho] 2-Reordenar los vinos de arriba hacia abajo. esta en el archivo LISTA DE PRECIOS - VINOS.csv. Ordenalo como esta en la lista de precio
  Detalle: comparé los 14 grupos de Vinos contra el CSV (descartando los
  vinos que ya están ocultos de la ronda anterior) y en 13 de los 14 el
  orden en base ya coincidía con el CSV. El único desalineado era
  "Zuccardi 750": los 5 vinos que se agregaron la sesión pasada (Santa
  Julia Torrontes, Santa Julia Reserva Malbec, Alambrado Sauvignon
  Blanc, Zuccardi Serie A Chardonnay, Zuccardi Q Chardonnay) habían
  quedado con un `orden` muy alto, al final de toda la categoría, en vez
  de intercalados con el resto de Zuccardi. Van los UPDATE en
  `scripts/cambios-2026-09-18.sql` (falta correrlos en Supabase).

  [Hecho] 3-Cambiarle el nomrbe a la linea Cunnington dentro de Gaseosas. Hay que agregarles al nomrbe el tamanio de las botellas,ejemplo: tonica 2,250Ml. El archivo que te pasare estan las cantidades. archivo:  LISTA DE PRECIOS - LINEA CUNINGTON.csv
  Detalle: los 13 productos visibles de "Línea Cunnington" (2,250 ml y
  500 ml) hoy tienen nombres repetidos (dos "Tonica", dos "Lima Limon",
  dos "Cola" — uno de cada tamaño), sin forma de distinguirlos a simple
  vista. Usé la convención que ya tiene Línea Coca para presentaciones
  chicas ("Lata X310ML", "de Vidrio X237ML"): quedó "Tonica X2250ML",
  "Cola X500ML", etc. (ver el UPDATE completo en
  `scripts/cambios-2026-09-18.sql`). No toqué "Gaseosa Córdoba" (los 6
  productos anidados debajo de esta misma línea): están ocultos desde la
  ronda anterior y la clave de Supabase de solo lectura no puede leer
  filas ocultas para confirmar el nombre antes de actualizarlas — si en
  algún momento se reactivan, conviene renombrarlos con el mismo
  criterio.

  [Hecho] 4-Dentro de la Linea pepsi en gaseosas, los primeros dos productos agregarle la cantidad que es 2L. Osea quedaria Pepsi X2L y Seven Up X2L.
  Detalle: son los productos "Pepsi" y "Seven Up" (sin precio cargado
  todavía), primeros de la línea. UPDATE en
  `scripts/cambios-2026-09-18.sql` (falta correrlo en Supabase).

  [Hecho] 5-Todos los productos que tengan en el Precio "Consultar", cambiarles a Sin Stock.
  Detalle: es un cambio de código, no de datos — "Consultar" era el texto
  que se mostraba cuando un producto no tiene precio cargado
  (`src/lib/formato.js`), y ahora ese mismo texto dice "Sin Stock" en
  todos lados donde se ve un precio (catálogo y panel). No hizo falta
  tocar ningún producto en Supabase: ya estaba resuelto para todos los
  productos que no tienen precio, automáticamente.
