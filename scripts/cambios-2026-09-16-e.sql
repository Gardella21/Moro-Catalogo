-- Cambios.md — 16/09/2026 (parte 5, ítem 1)
-- Pegar en Supabase → SQL Editor → Run (una sola vez)
--
-- Reemplazar las subsecciones actuales de "Gaseosas" (categoria_id 1: Vidrio
-- 1,250 Ml / Ref 2L / Latas 310 Ml / etc., una por tamaño) por solo 3, tal
-- como las pidió el dueño en Cambios.md: "Línea Coca", "Línea Pepsi" y
-- "Línea Cunnington". El campo usado para las 3 subsecciones es
-- `subcategoria` (mismo campo que ya alimenta los chips de sub-línea y los
-- títulos de grupo del catálogo — no se agrega ninguna columna nueva).
--
-- Se revisaron los 106 productos que hoy tiene "Gaseosas" en la base contra
-- la lista de productos por línea que dejó el dueño (tolerando sus typos:
-- "COCO COLA ZERO", "GATORDE ROJO", "POEMELO", "SEVEN UP 2 LITROS RECO",
-- espacios de más, etc.) y los 106 matchean sin ambigüedad, en 3 rangos de
-- id contiguos:
--   - Línea Coca:       id 1894 a 1942 (49 productos)
--   - Línea Pepsi:      id 1943 a 1975 (33 productos)
--   - Línea Cunnington: id 1984 a 2007 (24 productos, incluye los renglones
--     de "gaseosa cordoba" que el dueño anotó anidados debajo de Cunnington)
-- No quedó ningún producto de Gaseosas sin clasificar ni ningún ítem de la
-- lista del dueño sin encontrar en la base.

-- 1) Línea Coca
update productos set subcategoria = 'Línea Coca'
where categoria_id = 1 and id between 1894 and 1942;

-- 2) Línea Pepsi
update productos set subcategoria = 'Línea Pepsi'
where categoria_id = 1 and id between 1943 and 1975;

-- 3) Línea Cunnington
update productos set subcategoria = 'Línea Cunnington'
where categoria_id = 1 and id between 1984 and 2007;

-- 4) Typos evidentes encontrados en el NOMBRE real (no en la lista del
--    dueño) al hacer el matching, corregidos de paso:
--    - "Gatorde Rojo X 500" -> falta la "a" de Gatorade.
--    - "Descartable Paso D L Toro Tonica 1.500" -> el resto de los
--      productos de esa marca en la base dicen "Toros" (plural); este era
--      el único en singular.
update productos set nombre = 'Gatorade Rojo X 500'
where id = 1964 and nombre = 'Gatorde Rojo X 500';

update productos set nombre = 'Descartable Paso D L Toros Tonica 1.500'
where id = 1952 and nombre = 'Descartable Paso D L Toro Tonica 1.500';
