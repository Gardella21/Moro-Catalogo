-- Cambios.md — 16/09/2026 (parte 4)
-- Pegar en Supabase → SQL Editor → Run (una sola vez)
--
-- Separar "Aguas y sodas" (categoria_id 2) en dos secciones: "Aguas" y
-- "Sodas". Dentro de esa categoria los sifones descartables (subcategoria
-- "Sifon Descartable": Sierra De Los Padres 1,750 Ml, Manaos X 2L, Vess X 2L,
-- Torasso X 2L) son soda de sifón; todo lo demás (bidones, botellas
-- descartables con o sin gas) es agua embotellada. Se usa ese campo, ya
-- cargado, para no tener que adivinar producto por producto.

-- 1) Renombrar la categoria existente de "Aguas y sodas" a "Aguas"
--    (mismo id y slug, solo cambia el nombre que se ve en el chip).
update categorias set nombre = 'Aguas' where id = 2;

-- 2) Abrir un lugar en el orden del nav justo despues de "Aguas" (orden 2)
--    para la nueva seccion "Sodas", corriendo una posicion a todo lo que
--    viene despues.
update categorias set orden = orden + 1 where orden >= 3;

-- 3) Crear la categoria nueva.
insert into categorias (nombre, slug, orden) values ('Sodas', 'sodas', 3)
on conflict (slug) do nothing;

-- 4) Mover los sifones descartables de "Aguas" a "Sodas".
update productos set categoria_id = (select id from categorias where slug = 'sodas')
where categoria_id = 2 and subcategoria = 'Sifon Descartable';
