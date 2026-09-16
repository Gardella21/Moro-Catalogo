-- Cambios.md — 16/09/2026 (parte 3, corrige la parte 2)
-- Pegar en Supabase → SQL Editor → Run (una sola vez)
--
-- La parte 2 ocultó la categoría "Mercadería" y "Limpieza" (categorias.visible
-- = false), pero eso solo saca el chip del nav — el catálogo trae los
-- productos visibles sin importar si su categoría está oculta, así que esos
-- 121 productos seguían apareciendo en "Todo" y en el buscador. Falta ocultar
-- también cada producto de esas dos categorías.
update productos set visible = false where categoria_id in (10, 11); -- Mercadería, Limpieza
