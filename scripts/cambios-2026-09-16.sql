-- Cambios.md — 16/09/2026
-- Pegar en Supabase → SQL Editor → Run (una sola vez)
--
-- 1) "La seccion manaos... no va, sacalas"
--    No existe una categoria "Manaos" en la tabla `categorias` (son 11 fijas,
--    ver supabase/schema.sql, y el panel no tiene forma de crear categorias
--    nuevas). "Manaos" es una marca: hay 2 productos con ese nombre, los dos
--    dentro de "Aguas y sodas", ambos sin precio cargado (Consultar). Se
--    ocultan esos 2 productos en vez de borrarlos, por si el dueño los quiere
--    de vuelta más adelante.
update productos set visible = false where nombre ilike '%manaos%';

-- 2) Separar Baggio 1L, Baggio 200 y Monster en una fila por sabor
--    (categoria "Jugos y energizantes", id 8). Se multiplica por 100 el
--    orden actual de toda la categoria para abrir hueco entero entre cada
--    producto consecutivo y poder insertar los sabores nuevos justo donde
--    estaba el original, sin pisar el orden de ningun otro producto de la
--    categoria.
update productos set orden = orden * 100 where categoria_id = 8;

-- 2a) Baggio 1L (Naranja, Durazno, Multifruta, Manzana, Mixfrutal, Pera)
--     precio_unit 1861 / precio_pack 14888 / unidades_pack 8 (igual que el original)
delete from productos
where nombre = 'Baggio 1L (Naranja, Durazno, Multifruta, Manzana, Mixfrutal, Pera)';

insert into productos (categoria_id, subcategoria, nombre, precio_unit, precio_pack, unidades_pack, orden)
values
  (8, 'Jugos', 'Baggio 1L Naranja',    1861, 14888, 8, 100),
  (8, 'Jugos', 'Baggio 1L Durazno',    1861, 14888, 8, 101),
  (8, 'Jugos', 'Baggio 1L Multifruta', 1861, 14888, 8, 102),
  (8, 'Jugos', 'Baggio 1L Manzana',    1861, 14888, 8, 103),
  (8, 'Jugos', 'Baggio 1L Mixfrutal',  1861, 14888, 8, 104),
  (8, 'Jugos', 'Baggio 1L Pera',       1861, 14888, 8, 105);

-- 2b) Baggio 200 (Naranja, Durazno, Multifruta, Manzana, Mixfrutal, Pera)
--     precio_unit 551 / precio_pack 9918 / unidades_pack 18 (igual que el original)
delete from productos
where nombre = 'Baggio 200 (Naranja, Durazno, Multifruta, Manzana, Mixfrutal, Pera)';

insert into productos (categoria_id, subcategoria, nombre, precio_unit, precio_pack, unidades_pack, orden)
values
  (8, 'Jugos', 'Baggio 200 Naranja',    551, 9918, 18, 200),
  (8, 'Jugos', 'Baggio 200 Durazno',    551, 9918, 18, 201),
  (8, 'Jugos', 'Baggio 200 Multifruta', 551, 9918, 18, 202),
  (8, 'Jugos', 'Baggio 200 Manzana',    551, 9918, 18, 203),
  (8, 'Jugos', 'Baggio 200 Mixfrutal',  551, 9918, 18, 204),
  (8, 'Jugos', 'Baggio 200 Pera',       551, 9918, 18, 205);

-- 2c) Monster (Negro, Blanco, Mango, Naranja, Rojo, Verde, Anana, Amarillo, Rosa, Durazno)
--     precio_unit 2760 / precio_pack 16560 / unidades_pack 6 (igual que el original)
--     Nota: en Cambios.md decia "BLACO", se corrigio a "Blanco" (typo).
delete from productos
where nombre = 'Monster (Negro, Blanco, Mango, Naranja, Rojo, Verde, Anana , Amarillo, Rosa,Durazno)';

insert into productos (categoria_id, subcategoria, nombre, precio_unit, precio_pack, unidades_pack, orden)
values
  (8, 'Energizantes', 'Monster Negro',    2760, 16560, 6, 1100),
  (8, 'Energizantes', 'Monster Blanco',   2760, 16560, 6, 1101),
  (8, 'Energizantes', 'Monster Mango',    2760, 16560, 6, 1102),
  (8, 'Energizantes', 'Monster Naranja',  2760, 16560, 6, 1103),
  (8, 'Energizantes', 'Monster Rojo',     2760, 16560, 6, 1104),
  (8, 'Energizantes', 'Monster Verde',    2760, 16560, 6, 1105),
  (8, 'Energizantes', 'Monster Anana',    2760, 16560, 6, 1106),
  (8, 'Energizantes', 'Monster Amarillo', 2760, 16560, 6, 1107),
  (8, 'Energizantes', 'Monster Rosa',     2760, 16560, 6, 1108),
  (8, 'Energizantes', 'Monster Durazno',  2760, 16560, 6, 1109);
