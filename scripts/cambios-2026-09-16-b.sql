-- Cambios.md — 16/09/2026 (parte 2, después de la aclaración del dueño)
-- Pegar en Supabase → SQL Editor → Run (una sola vez)
--
-- 1) "Despensa" = lo que hoy está en "Mercadería" (103 productos) y en
--    "Limpieza" (18 productos). Se ocultan las 2 categorías enteras
--    (visible = false), no se borra ningún producto: quedan intactos en la
--    base y visibles/editables desde el panel, solo dejan de aparecer en el
--    catálogo público. Si en algún momento se quieren mostrar de nuevo,
--    alcanza con volver a poner visible = true en estas dos filas.
update categorias set visible = false where id in (10, 11); -- Mercadería, Limpieza

-- 2) "Línea Manaos" (la de la imagen: Descartable X 3L y X 2,250 Ml, sabores
--    Cola/Lima/Pomelo/Naranja, pack de 6, las 8 sin precio cargado). Ojo:
--    en "Gaseosas" hay OTROS productos con esos mismos nombres de sabor pero
--    de otras líneas (otro pack, otro precio, otra subcategoría) — no se
--    tocan, esto apunta puntualmente a los 8 ids que matchean exacto con la
--    imagen (mismo pack, mismo "sin precio", mismas dos subcategorías).
--    Se ocultan en vez de borrar, mismo criterio que el resto del proyecto.
update productos set visible = false
where id in (1976, 1977, 1978, 1979, 1980, 1981, 1982, 1983);
