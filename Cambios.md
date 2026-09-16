Cambios:
   1-La seccion manaos y despensa no va, sacalas. 

[Listo el script, falta que lo corras vos] Manaos: no es una sección/categoría
propia (las categorías son 11 fijas, no hay forma de crear otras desde el
panel — ver `supabase/schema.sql`). Es una marca: encontré 2 productos con
"Manaos" en el nombre, los dos dentro de "Aguas y sodas" ("Villa Manaos X 6 L"
y "Manaos X 2L"), y ambos ya estaban sin precio cargado (Consultar). Dejé
listo el UPDATE para ocultarlos (`visible = false`, no los borro, por si los
querés de vuelta) en `scripts/cambios-2026-09-16.sql`.

[Hecho] Despensa: confirmado por el dueño = "Mercadería" (103 productos) +
"Limpieza" (18 productos). Se ocultan las 2 categorías enteras (visible =
false en `categorias`), sin borrar ningún producto — quedan editables desde
el panel, solo dejan de aparecer en el catálogo público. Script en
`scripts/cambios-2026-09-16-b.sql`, falta que lo corras vos en el SQL Editor.

CORRECCIÓN (verificado después de correr el script de arriba): ocultar la
categoría solo saca el chip del nav, pero el catálogo trae los productos
visibles sin filtrar por si su categoría está oculta — esos 121 productos
seguían apareciendo en "Todo" y en el buscador. Se corrigió con
`scripts/cambios-2026-09-16-c.sql`, ya corrido y verificado: 0 productos de
Mercadería/Limpieza visibles.

[Hecho] Línea Manaos (la de la imagen: Descartable X 3L y X 2,250 Ml, sabores
Cola/Lima/Pomelo/Naranja, pack de 6, las 8 sin precio): identificados los 8
productos exactos en "Gaseosas" (ids 1976-1983) — hay OTROS productos con
esos mismos nombres de sabor pero de otras líneas/packs que no se tocan.
Se ocultan (no se borran), mismo script `scripts/cambios-2026-09-16-b.sql`.
Verificado: los 8 ya no aparecen, y los 2 productos "Manaos" bidón/sifón
tampoco.

Nota sobre por qué no lo apliqué yo directo: la clave que usa la app (`.env`,
`VITE_SUPABASE_ANON_KEY`) solo tiene permiso de lectura — lo confirmé
probando un `update` real que no tuvo ningún efecto (las políticas de
seguridad de Supabase exigen una sesión logueada para escribir, y esa clave
no la tiene). Para aplicar el cambio: entrá a Supabase → SQL Editor (logueado
vos) → pegá el contenido de `scripts/cambios-2026-09-16.sql` → Run.

   2-Estos hay que separarlos por gustos ya que estan todas en la misma card,hay que hacer una por gusto:
            BAGGIO 1L (NARANJA, DURAZNO, MULTIFRUTA, MANZANA, MIXFRUTAL, PERA)
            BAGGIO 200 (NARANJA, DURAZNO, MULTIFRUTA, MANZANA, MIXFRUTAL, PERA)
            MONSTER (NEGRO, BLACO, MANGO, NARANJA, ROJO, VERDE, ANANA , AMARILLO, ROSA,DURAZNO)

[Listo el script, falta que lo corras vos] Está en el mismo archivo
`scripts/cambios-2026-09-16.sql` (parte 2). Borra esas 3 filas y las
reemplaza por una fila por sabor: 6 de Baggio 1L, 6 de Baggio 200 y 10 de
Monster (22 filas nuevas en total), cada una con el mismo precio unitario,
precio de pack, unidades por pack, categoría y subcategoría que tenía la fila
original — solo cambia el nombre, por ejemplo "Baggio 1L Naranja",
"Baggio 1L Durazno", etc. (mismo patrón para Baggio 200 y Monster). Corregí
"BLACO" → "Blanco" al nombrar el producto (typo en el pedido original).
Mismo motivo que el punto 1: no lo pude aplicar yo porque la clave del front
no tiene permiso de escritura — correlo con el mismo script del SQL Editor.
