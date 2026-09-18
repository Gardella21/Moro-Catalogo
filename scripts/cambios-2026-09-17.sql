-- Cambios.md — 17/09/2026 (6 ítems pedidos por el dueño)
-- Pegar en Supabase → SQL Editor → Run (una sola vez)
-- Cubre los ítems 1, 2, 3, 4 y 5 de Cambios.md. El ítem 6 (logo) es solo
-- de código (archivos en public/ + referencias en index.html/JSX), no
-- requiere SQL.

-- ============================================================
-- 1) Gaseosas > Línea Coca > Latas: aclarar "310ML" en el nombre.
-- Los 8 productos son los de precio 1500 / pack x6 (ids 1931 a 1938,
-- verificados uno por uno contra la lista del dueño). Se copia la
-- convención que ya usa la propia Línea Coca para las de vidrio
-- ("Coca Cola de Vidrio X237ML", id 1939): "<nombre> Lata X310ML".
-- ============================================================
update productos set nombre = 'Coca Cola Lata X310ML'
where id = 1931 and nombre = 'Coca Cola';

update productos set nombre = 'Coca Cola Sin Azucar Lata X310ML'
where id = 1932 and nombre = 'Coca Cola Sin Azucar';

update productos set nombre = 'Coca Cola Light Lata X310ML'
where id = 1933 and nombre = 'Coca Cola Light';

update productos set nombre = 'Sprite Lata X310ML'
where id = 1934 and nombre = 'Sprite';

update productos set nombre = 'Fanta Lata X310ML'
where id = 1935 and nombre = 'Fanta';

update productos set nombre = 'Schweppes Tonica Lata X310ML'
where id = 1936 and nombre = 'Schweppes Tonica';

update productos set nombre = 'Schweppes Tonica Sin Azucar Lata X310ML'
where id = 1937 and nombre = 'Schweppes Tonica Sin Azucar';

update productos set nombre = 'Schweppes Pomelo Lata X310ML'
where id = 1938 and nombre = 'Schweppes Pomelo';

-- ============================================================
-- 2) Aguas > Descartable 500ml / Descartable 2L: los que tienen "Gas"
-- en el nombre pasan a Sodas (categoria_id 12). Son 6 productos, ids
-- 1564 a 1569 (únicos con "Gas" en el nombre dentro de Aguas). Se deja
-- la subcategoria tal cual la tenían ("Descartable X 2 L" /
-- "Descartable 500Ml"), separada de "Sifón descartable" que ya usan
-- los sifones de Sodas.
-- ============================================================
update productos set categoria_id = 12
where categoria_id = 2
  and id in (1564, 1565, 1566, 1567, 1568, 1569)
  and nombre ilike '%gas%';

-- ============================================================
-- 3) Renombrar la sección "Galletitas y budines" a "Galletitas y Dulces".
-- ============================================================
update categorias set nombre = 'Galletitas y Dulces' where slug = 'galletitas';

-- ============================================================
-- 4) Nueva sección "Infusiones", con los productos de
-- "LISTA DE PRECIOS - GREEN HILLS_TRANQUERA.csv" (16 productos en 3
-- subsecciones: Te, Matecocido, Yerba). El único precio en blanco del
-- csv (Tranquera x 100 saquitos) se carga como NULL ("Consultar"),
-- nunca como $0. Se corrige de paso el typo del csv "TE GREEB HILLS"
-- → "Te Green Hills" (falta la N).
-- ============================================================
insert into categorias (nombre, slug, orden)
values ('Infusiones', 'infusiones', (select coalesce(max(orden), 0) + 1 from categorias))
on conflict (slug) do nothing;

insert into productos (categoria_id, subcategoria, nombre, precio_unit, precio_pack, unidades_pack, orden)
select c.id, v.subcategoria, v.nombre, v.precio_unit, v.precio_pack, v.unidades_pack, v.orden
from categorias c, (values
  ('Te', 'Te Green Hills X 25 Saquitos', 1378.00, 27560.00, 20, 1),
  ('Te', 'Te Green Hills X 50 Saquitos', 2650.00, 26500.00, 10, 2),
  ('Te', 'Te Green Hills X 100 Saquitos', 5200.00, 46800.00, 9, 3),
  ('Te', 'Te Green Hills En Hebra X 100 Gr', 1300.00, 26000.00, 20, 4),
  ('Te', 'Te Green Hills Boldo X 20 Saquitos', 2560.00, 15360.00, 6, 5),
  ('Te', 'Te Green Hills Manzanilla X 20 Saquitos', 2048.00, 12288.00, 6, 6),
  ('Te', 'Te Green Hills Durazno Mango X 20 Saq', 2180.00, 26160.00, 12, 7),
  ('Te', 'Te Green Hills Limon X 20 Saquitos', 2180.00, 26160.00, 12, 8),
  ('Te', 'Te Green Hills Verde X 25 Saquitos', 1680.00, 20160.00, 12, 9),
  ('Te', 'Te Green Hills Tilo X 20 Saquitos', 3000.00, 18000.00, 6, 10),
  ('Matecocido', 'Tranquera X 25 Saquitos', 810.00, 19440.00, 24, 11),
  ('Matecocido', 'Tranquera X 50 Saquitos', 1549.00, 18588.00, 12, 12),
  ('Matecocido', 'Tranquera X 100 Saquitos', NULL, NULL, 6, 13),
  ('Yerba', 'Tranquera Tradicional X 500', 1535.00, 18420.00, 12, 14),
  ('Yerba', 'Tranquera Liviana X 500', 1260.00, 15120.00, 12, 15),
  ('Yerba', 'Tranquera Tradicional X 1 Kg', 2860.00, 17160.00, 6, 16)
) as v(subcategoria, nombre, precio_unit, precio_pack, unidades_pack, orden)
where c.slug = 'infusiones';

-- ============================================================
-- 5) Vinos > Zuccardi 750: lista de vinos del dueño (imagen adjunta).
-- Se revisaron los 12 productos de la subcategoria "Zuccardi 750"
-- contra la lista:
--   - Ya existen con el precio correcto (no se tocan): Santa Julia
--     Chardonnay (id 2246, nombre en base dice "Chandonnay" por un typo
--     ya existente, no se corrige porque no lo pidió el dueño), Santa
--     Julia Tinto Dulce (id 2245), Santa Julia Chenin Blanco = "Santa
--     Julia Chenin Blanco Dulce" en base (id 2247, mismo precio, se
--     asume que es el mismo vino), Alambrado Malbec = "Alambrado
--     Malbec/Cabernet Fran" en base (id 2253, mismo precio, se asume
--     que es el mismo vino), Zuccardi Q Malbec (id 2254).
--   - Precio desactualizado, se actualiza: Santa Julia Magna Malbec
--     (id 2249, no tenía precio cargado).
--   - "Zuccardi Serie A" estaba cargado como un solo producto
--     ("Zuccardi Serie A Malbec/Chandonnay", id 2252, $8.500/$51.000)
--     y el dueño ahora lo pide como dos productos separados a
--     $9.600/$57.600 cada uno. Se reutiliza el id 2252 para "Zuccardi
--     Serie A Malbec" y se inserta "Zuccardi Serie A Chardonnay" como
--     producto nuevo.
--   - Faltan y se insertan: Santa Julia Torrontes, Santa Julia Reserva
--     Malbec, Alambrado Sauvignon Blanc, Zuccardi Serie A Chardonnay,
--     Zuccardi Q Chardonnay.
--   - "Piedra Infinita" (id 2255) NO se toca: la imagen no trae un
--     precio confiable (decía "3" y $0,00 en vez de un precio), y
--     $0 no es un precio real. Sigue con precio_unit/pack en NULL
--     ("Consultar") hasta que el dueño confirme el valor real.
-- ============================================================
update productos set precio_unit = 6900, precio_pack = 41400
where id = 2249 and nombre = 'Santa Julia Magna Malbec';

update productos set nombre = 'Zuccardi Serie A Malbec', precio_unit = 9600, precio_pack = 57600
where id = 2252 and nombre = 'Zuccardi Serie A Malbec/Chandonnay';

insert into productos (categoria_id, subcategoria, nombre, precio_unit, precio_pack, unidades_pack, orden)
select c.id, 'Zuccardi 750', v.nombre, v.precio_unit, v.precio_pack, v.unidades_pack, v.orden
from categorias c, (values
  ('Santa Julia Torrontes', 4585, 27510, 6, 156),
  ('Santa Julia Reserva Malbec', 5200, 31200, 6, 157),
  ('Alambrado Sauvignon Blanc', 7100, 42600, 6, 158),
  ('Zuccardi Serie A Chardonnay', 9600, 57600, 6, 159),
  ('Zuccardi Q Chardonnay', 17000, 102000, 6, 160)
) as v(nombre, precio_unit, precio_pack, unidades_pack, orden)
where c.slug = 'vinos';
