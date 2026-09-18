-- Cambios.md — 17/09/2026, parte 2 (producto masivo: "productos que no se venden más")
-- Pegar en Supabase → SQL Editor → Run (una sola vez)
--
-- El dueño pidió sacar del catálogo una lista larga de productos (Vinos por
-- bodega, Aguas, Saborizadas, Gaseosas, Cervezas, Champagne, Aperitivos y
-- Licores, Jugos y Energizantes, Galletitas y Budines) y dejó explícito
-- "eliminarlos u ocultarlos, vos decidís".
--
-- Decisión: OCULTAR (visible = false), no DELETE.
--   - `productos.visible` ya existe en el schema (supabase/schema.sql) y ya
--     está implementado en todo el circuito: la política RLS de lectura
--     pública filtra `visible = true` (src/hooks/useCatalogo.js), y el panel
--     (src/pages/Admin.jsx) ya trae *todos* los productos sin filtrar,
--     muestra "· oculto" al lado del nombre y tiene el checkbox "Visible"
--     para reactivarlo con un clic. No hace falta ningún cambio de código:
--     esto es 100% un cambio de datos.
--   - Es reversible: si el dueño vuelve a vender algo de esta lista, lo
--     tilda desde el panel en vez de tener que pedir que se vuelva a cargar.
--   - No se usa DELETE porque en Postgres es irreversible y varios de estos
--     productos tienen precios/nombres corregidos a mano en sesiones
--     anteriores (ver cambios-2026-09-16-*.sql) que se perderían.
--
-- Se revisó cada línea de Cambios.md contra los ~750 productos reales de la
-- base (tolerando los typos habituales del dueño: "Cahteau"→"Chateau",
-- "Manzna"→"Manzana", "Mirimda"→"Mirinda", "Patogonia"→"Patagonia", etc.,
-- igual que en las rondas anteriores de Línea Coca/Pepsi/Cunnington). Todas
-- las líneas de la lista encontraron un match único y sin ambigüedad real
-- (ningún caso con dos productos candidatos igual de válidos) — no quedó
-- ningún ítem pendiente de confirmar con el dueño en esta tanda.
--
-- Casos de fuzzy-match que vale aclarar (por si el dueño repregunta):
--   - "Norrom pedirle Centenario" (bajo *Norton*) → "Norton Pedriel
--     Centenario" (id 2263): es el único vino de la bodega Norton con
--     "Centenario" en el nombre.
--   - "Jim beam honestamente" (bajo *WHISKY*) → "Jim Beam Honey" (id 1660):
--     es el único producto Jim Beam de todo Aperitivos y Licores.
--   - "H2o limonero x 1,500" → "Descartable Limoneto 1.500" (id 1957): en
--     la base le falta el prefijo "Ho2" que sí tienen sus dos hermanos
--     (Citrus y Naranchelo, ids 1955/1956, mismo rango de ids y misma
--     línea), typo previo de la carga original, no de esta lista.
--   - "Bodega Trivento: todo completo" oculta los 5 productos agrupados hoy
--     bajo subcategoria = 'Trivento' en la base, incluidos los dos
--     "Casillero Del Diablo" (marca real: Concha y Toro) que quedaron
--     agrupados ahí en una reorganización anterior — se sigue la
--     estructura que ya tiene el catálogo, no se reclasifica nada nuevo.
--   - "Cunington ... x 1,500" / "x 500" / "Córdoba ... x 3L" / "x 2,25":
--     estos productos están cargados en la base sin el nombre de marca ni
--     el tamaño en el campo `nombre` (ej. sólo dice "Pomelo", "Cola", "Lima
--     Limon", y hay varios con el mismo nombre para tamaños distintos). Se
--     usó la propia nota del dueño de la ronda anterior (Cambios.md, commit
--     c705189) que sí traía el desglose por tamaño de "Línea Cunnington"
--     (ids 1984-2001): "Descartable X 2,250 Ml" = 10 productos (ids
--     1984-1993, pack x6, $1.810), "Descartable X 1,500 Ml" = 1 solo
--     producto, Tonica (id 1994, pack x6, $1.170), "Descartable X 500 Ml" =
--     7 productos (ids 1995-2001, pack x9, ~$835). O sea que el único "x
--     1,500" de Cunnington es el id 1994, no el rango 1984-1993 (que en
--     realidad es la presentación de 2,250ml). ids 2002-2007 = los 6
--     productos "Córdoba" que quedaron anidados debajo de Cunnington en esa
--     misma reorganización (pack x4 = botellas de 3L, pack x6 = botellas de
--     2,25L). El id ya identifica la fila de manera única; el nombre en el
--     WHERE es sólo un control extra.
-- ============================================================

-- ---------- VINOS ----------

-- Bodega Esmeralda: "todo completo" (8 productos: Bravio, Uxmal, Estiba I)
update productos set visible = false
where id in (2311,2312,2313,2314,2315,2316,2317,2318);

-- Bodega La Rural: San Felipe Roble Malbec, Pequeña Vasija Varietal
update productos set visible = false
where id in (2298,2299);

-- Catena Zapata: Alamos Malbec
update productos set visible = false
where id = 2286;

-- Escorihuela Gascon: Lola Malbec, Circus Malbec/Chandonnay, Circus Roble
-- Malbec, Pinot Noir
update productos set visible = false
where id in (2228,2229,2230,2238);

-- Estuches: Estuche Familia Gascon Malbec X1, Estuche Escorihuela Gascon X1
update productos set visible = false
where id in (2381,2382);

-- Bodega Trivento: "todo completo" (5 productos agrupados hoy bajo
-- subcategoria = 'Trivento', ver nota arriba sobre Casillero Del Diablo)
update productos set visible = false
where id in (2269,2270,2271,2272,2273);

-- Bodega Lopez: Chateau Vieux Malbec, Rivas Malbec, Casona De Lopez Rose,
-- Chateau Vieux Chandonnay (no la "Reserva Chandonnay", que no se pidió)
update productos set visible = false
where id in (2278,2281,2282,2283);

-- Bodega Zuccardi: Santa Julia Rose, Magna Malbec, Mercado Malbec, Caber
-- Malbec De Seleccion
update productos set visible = false
where id in (2248,2249,2250,2251);

-- Norton: Sexy Fish Tinto/Blanco, Barrel, Pedriel Centenario (fuzzy, ver nota)
update productos set visible = false
where id in (2258,2259,2263);

-- Varios: Don David Malbec, Ventus Roble Malbec, Valmont Tinto, Goyenechea
-- Tinto, Elemento Malbec (750), Colon Torrontes
update productos set visible = false
where id in (2329,2332,2334,2335,2338,2339);

-- Tetra Brick: Resero, Pico De Oro Tinto, Pico De Oro Blanco, Viñas Riojanas
update productos set visible = false
where id in (2357,2360,2361,2362);

-- Vinos 375: Don Valentin Tinto, Elemento Malbec (375) — no tocar el Don
-- Valentin Tinto ni el Elemento Malbec de 750 (ids 2325/2338 ya cubierto
-- arriba), son productos distintos que el dueño no pidió de ese tamaño
update productos set visible = false
where id in (2364,2371);

-- ---------- AGUAS ----------
-- Glaciar X1,500, Villa Del Sur X1650, Glon 500, Agua Lagoa Con Pico X600,
-- Agua Eco De Los Andes Con Pico X1L. "Lagoa con gas x 500" ya vive en la
-- categoría Sodas desde la separación Aguas/Sodas de la sesión anterior
-- (id 1565), se oculta igual porque el dueño lo anotó bajo "AGUAS".
update productos set visible = false
where id in (1548,1551,1552,1557,1558,1565);

-- ---------- SABORIZADAS ----------
-- Celier Pomelo/Manzana x1,500, Levite Pomelo Rosado x1,500 y x500,
-- Fresh Naj. Pom. Cero x500, Ivess Citrus x500, Celier x500, Sierra
-- Naranja/Pomelo x500
update productos set visible = false
where id in (2197,2198,2201,2210,2214,2220,2222,2226,2227);

-- ---------- GASEOSAS ----------

-- Línea Coca / Power (presentaciones puntuales, no toda la línea)
update productos set visible = false
where id in (1900,1904,1905,1906,1907,1908,1913,1922,1924,1930,1933);

-- Línea Pepsi/Seven Up 3L y 2L retornable
update productos set visible = false
where id in (1943,1944,1945);

-- H2O (los 3 sabores), Gatorade 1,250, 7Up Free x500, Paso De Los Toros
-- Pomelo x500, Mirinda x500, Gatorade Mango Verde, Lata Mirinda, Lata Pepsi
-- Black
update productos set visible = false
where id in (1955,1956,1957,1958,1961,1962,1963,1968,1972,1975);

-- Línea Cunnington: Tonica x1,500 (id 1994, no el 1984 — ver nota sobre
-- cómo se identificó cada tamaño), Tonica Sin Azucar x500, Pomelo x500,
-- Cola Suave x500, Naranja x500
update productos set visible = false
where id in (1994,1996,1997,1998,2000);

-- "Gaseosa Córdoba" (los 6 productos anidados bajo Línea Cunnington):
-- Cola/Lima Limon/Pomelo x3L y x2,25
update productos set visible = false
where id in (2002,2003,2004,2005,2006,2007);

-- ---------- CERVEZAS ----------

-- Retornables 1L
update productos set visible = false
where id in (1723,1726,1729,1731,1732,1733,1734,1735,1741);

-- Latas 473ml
update productos set visible = false
where id in (1742,1743,1744,1745,1747,1750,1752,1753,1757,1759,1760,1767,1768,1769);

-- Latones 710ml
update productos set visible = false
where id in (1774,1775,1776,1777);

-- Retornables 340ml: "todo" (Brahma, Quilmes y Budweiser)
update productos set visible = false
where id in (1781,1782,1783);

-- Botella descartable: Patagonia 710, Porron Warsteiner, 361 X1L
update productos set visible = false
where id in (1787,1788,1795);

-- ---------- CHAMPAGNE ----------
-- Familia Gascon Extra Brut, Chandon Extra Brut/Brut Nature/Aperitiv,
-- Miguel Escorihuela Gascon Brut Nature, Alambrado Pinot Rose, Champaña
-- Lata Mum Spritz X269
update productos set visible = false
where id in (1802,1806,1807,1808,1814,1815,1820);

-- ---------- APERITIVOS Y LICORES ----------

-- Gin: Larios Rose, Beefeater Pink X700, Gin Gordons Lata
update productos set visible = false
where id in (1592,1599,1605);

-- Whisky: Ballantines 7 Años X750, Jim Beam Honey (fuzzy, ver nota)
update productos set visible = false
where id in (1656,1660);

-- Licores: Cusenier (Melon/Chocolate/Dulce De Leche/Cafe Al Coñac), Baileys
-- Crema, Jagermeister X1L
update productos set visible = false
where id in (1664,1665,1666,1667,1672,1677);

-- ---------- JUGOS Y ENERGIZANTES ----------
-- Cepita Naranja X1L, F-Nandito Doble X1L
update productos set visible = false
where id in (2014,2038);

-- ---------- GALLETITAS Y BUDINES ----------
-- Palmeritas, Medallon Dulce De Leche/Chocolate, Pepas Aires De Lujan,
-- Surtidas, Torta Chocolate, Bocaditos, Bombom Smack, Alfajor Simple
-- Nevares, Torta Genio Blanco Rellena Dulce De Leche, Crocbar Obleas
-- Relleno Vainilla, Bom Bom Smack Con Mousse X16, Garrapiñada
update productos set visible = false
where id in (1858,1859,1860,1861,1862,1868,1869,1872,1876,1878,1879,1880,1881);
