-- Cambios.md — 18/09/2026
-- Pegar en Supabase → SQL Editor → Run (una sola vez)
-- Cubre los ítems 1, 2, 3 y 4 de Cambios.md. El ítem 5 ("Consultar" →
-- "Sin Stock") es un cambio de texto en el código (src/lib/formato.js),
-- no necesita SQL.

-- ============================================================
-- 1) Renombrar la sección "Jugos y energizantes" a
-- "Jugos-Energizantes y Termas".
-- ============================================================
update categorias set nombre = 'Jugos-Energizantes y Termas' where slug = 'jugos';

-- ============================================================
-- 2) Vinos: reordenar de arriba a abajo como en
-- "LISTA DE PRECIOS - VINOS.csv". Se revisaron los 14 grupos de la
-- categoría (Escorihuela Gascón 750, Zuccardi 750, Norton 750, Fabre
-- Montmayou, Lopez, Catena Zapata, Bodegas La Rural, Bodega Luigi Bosca,
-- Varios, Botellón 1,125, Tetrabrik, Vino 375, Latas, Estuches) contra el
-- CSV: en 13 de los 14 el orden en base ya coincide con el CSV, una vez
-- que se descartan los vinos que se ocultaron en la ronda anterior
-- (cambios-2026-09-17-b.sql). El único grupo que no coincidía es
-- "Zuccardi 750": los 5 vinos que se insertaron la sesión pasada
-- (Santa Julia Torrontes, Santa Julia Reserva Malbec, Alambrado
-- Sauvignon Blanc, Zuccardi Serie A Chardonnay, Zuccardi Q Chardonnay)
-- quedaron con `orden` muy alto (156 a 160, al final de toda la
-- categoría) en vez de intercalados con el resto de Zuccardi. Se
-- corrige moviéndolos al lugar que les toca.
--
-- Primero se corre "Norton 750" en adelante un lugar (+1) para abrir
-- hueco: el grupo Zuccardi 750 pasa de 8 a 13 vinos y ya no entra en el
-- rango 17-28 que tenía libre antes de "Norton 750" (que hoy empieza en
-- orden 29).
-- ============================================================
update productos
set orden = orden + 1
where categoria_id = 5 and orden >= 29;

-- Zuccardi 750, orden final (17 a 29), en el mismo orden del CSV:
update productos set orden = 17 where id = 2244 and nombre = 'Santa Julia Malbec';
update productos set orden = 18 where id = 2246 and nombre = 'Santa Julia Chandonnay';
update productos set orden = 19 where id = 2423 and nombre = 'Santa Julia Torrontes';
update productos set orden = 20 where id = 2424 and nombre = 'Santa Julia Reserva Malbec';
update productos set orden = 21 where id = 2245 and nombre = 'Santa Julia Tinto Dulce';
update productos set orden = 22 where id = 2247 and nombre = 'Santa Julia Chenin Blanco Dulce';
update productos set orden = 23 where id = 2253 and nombre = 'Alambrado Malbec/Cabernet Fran';
update productos set orden = 24 where id = 2425 and nombre = 'Alambrado Sauvignon Blanc';
update productos set orden = 25 where id = 2252 and nombre = 'Zuccardi Serie A Malbec';
update productos set orden = 26 where id = 2426 and nombre = 'Zuccardi Serie A Chardonnay';
update productos set orden = 27 where id = 2254 and nombre = 'Zuccardi Q Malbec';
update productos set orden = 28 where id = 2427 and nombre = 'Zuccardi Q Chardonnay';
update productos set orden = 29 where id = 2255 and nombre = 'Piedra Infinita Malbec';

-- ============================================================
-- 3) Línea Cunnington (Gaseosas): agregar el tamaño de la botella al
-- nombre, para diferenciar los 2,250 ml de los 500 ml (hoy los dos
-- "Tonica" / "Lima Limon" / "Cola" se llaman exactamente igual, solo
-- se distinguen por el pack y el precio). Tamaños según
-- "LISTA DE PRECIOS - LINEA CUNINGTON.csv". Se sigue la convención que
-- ya usa Línea Coca para las presentaciones chicas ("Lata X310ML",
-- "de Vidrio X237ML"): "<sabor> X<mililitros>ML".
--
-- No se toca "Gaseosa Córdoba" (ids 2002-2007), que quedó anidada bajo
-- esta misma línea en una reorganización anterior: está oculta desde
-- cambios-2026-09-17-b.sql y la clave de Supabase de solo lectura que
-- usa este script no puede leer filas ocultas para confirmar el nombre
-- actual antes de tocarlas (evita un UPDATE a ciegas). Si en algún
-- momento se reactiva, conviene renombrarla con el mismo criterio
-- (Cola / Lima Limón / Pomelo, X3L y X2250ML).
-- ============================================================
update productos set nombre = 'Tonica X2250ML' where id = 1984 and nombre = 'Tonica';
update productos set nombre = 'Tonica Sin Azucar X2250ML' where id = 1985 and nombre = 'Tonica Sin Azucar';
update productos set nombre = 'Pomelo X2250ML' where id = 1986 and nombre = 'Pomelo';
update productos set nombre = 'Pomelo Sin Azucar X2250ML' where id = 1987 and nombre = 'Pomelo Sin Azucar';
update productos set nombre = 'Cola X2250ML' where id = 1988 and nombre = 'Cola';
update productos set nombre = 'Cola Sin Azucar X2250ML' where id = 1989 and nombre = 'Cola Sin Azucar';
update productos set nombre = 'Lima Limon X2250ML' where id = 1990 and nombre = 'Lima Limon';
update productos set nombre = 'Lima Limon Sin Azucar X2250ML' where id = 1991 and nombre = 'Lima Limon Sin Azucar';
update productos set nombre = 'Naranja X2250ML' where id = 1992 and nombre = 'Naranja';
update productos set nombre = 'Naranja Sin Azucar X2250ML' where id = 1993 and nombre = 'Naranja Sin Azucar';
update productos set nombre = 'Tonica X500ML' where id = 1995 and nombre = 'Tonica';
update productos set nombre = 'Lima Limon X500ML' where id = 1999 and nombre = 'Lima Limon';
update productos set nombre = 'Cola X500ML' where id = 2001 and nombre = 'Cola';

-- ============================================================
-- 4) Línea Pepsi (Gaseosas): los primeros dos productos de la línea son
-- de 2L retornable (ids 1946 y 1947, orden 53-54, sin precio cargado
-- todavía), agregarles el tamaño al nombre.
-- ============================================================
update productos set nombre = 'Pepsi X2L' where id = 1946 and nombre = 'Pepsi';
update productos set nombre = 'Seven Up X2L' where id = 1947 and nombre = 'Seven Up';
