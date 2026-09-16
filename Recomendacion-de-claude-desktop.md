# Dónde conseguir fotos de productos para el catálogo de Moro Distribuidora

## TL;DR
- **La mejor fuente gratuita y legal es Open Food Facts** (ar.openfoodfacts.org): base abierta con ~16.180 productos argentinos, búsqueda por código de barras (EAN) y API JSON gratuita que devuelve las URLs de las imágenes para descargar en lote; las imágenes están bajo licencia CC-BY-SA 3.0, así que solo tenés que dar atribución.
- **Para lo que falte** (champán Chandon, vinos, gaseosas, limpieza), la ruta más segura legalmente es **pedir el kit de imágenes al proveedor/fabricante** (te las dan porque vender su producto los beneficia) y, como complemento, **sacar tus propias fotos** con el celular (fondo blanco + luz de ventana + Photoroom/remove.bg).
- **Evitá copiar imágenes de Coto, Carrefour o Jumbo**: son útiles como referencia, pero esas fotos tienen derechos y usarlas sin permiso es un riesgo legal. Usá bancos como Unsplash/Pexels solo para banners genéricos, no para el producto puntual.

## Key Findings

**1. Open Food Facts es la opción principal.** Es una base de datos colaborativa sin fines de lucro que incluye más de 4 millones de productos de 150 países (según la descripción oficial del dataset: *"The database includes over 4 million products from 150 countries... More than 5,000 volunteers have contributed by scanning barcodes and uploading product images"*), de los cuales unos 16.180 son de Argentina. Sirve especialmente para alimentos, bebidas y golosinas. Tiene versión argentina (ar.openfoodfacts.org) y una API gratuita que permite buscar por código de barras y traer las fotos.

**2. La API es ideal para carga masiva.** Como tenés una lista de precios en CSV/Excel con (idealmente) los códigos EAN, podés recorrer esa lista y consultar la API producto por producto para bajar las imágenes automáticamente. Es exactamente el flujo que te conviene para cientos de productos.

**3. Legalmente, la ruta más limpia es proveedor + fotos propias.** Las fotos de producto son obras protegidas por la Ley 11.723 en Argentina; el autor (fotógrafo) tiene los derechos. Copiar imágenes de webs de supermercados o de fabricantes sin permiso es una infracción, aunque en la práctica muchas veces se tolera. Lo correcto y sin riesgo es: pedir el material a proveedores/marcas, o producir tus propias fotos.

**4. Para estandarizar cientos de imágenes hay herramientas gratuitas** que quitan el fondo y ponen fondo blanco en lote (remove.bg, Photoroom, erase.bg, Pixelcut).

## Details

### A) Open Food Facts (recomendación principal)

- **Sitio Argentina:** https://ar.openfoodfacts.org/ — al día de hoy figura un total de alrededor de 16.180 productos argentinos ("Productos 16.180" en la home del sitio argentino). Es un número vivo: sube constantemente porque la base es colaborativa.
- **Cómo buscar por código de barras (a mano):** entrás a la ficha del producto con la URL `https://world.openfoodfacts.org/product/{codigo}` (por ejemplo, un producto de La Campagnola: https://world.openfoodfacts.org/product/7793360982309).
- **API JSON (para automatizar):** el endpoint es
  `https://world.openfoodfacts.org/api/v2/product/{codigo}.json`
  Ejemplo con Nutella: `https://world.openfoodfacts.org/api/v2/product/3017624010701.json`. No requiere clave ni registro para leer; solo piden que mandes un `User-Agent` propio identificando tu app (formato `MoroCatalogo/1.0 (tumail@ejemplo.com)`). El mismo path funciona en el subdominio argentino (`ar.openfoodfacts.org`).
- **Campos de imagen que devuelve la API:** `image_url`, `image_front_url` (y variantes `image_front_small_url`, `image_front_thumb_url`), además de los objetos `selected_images` e `images` que traen todas las resoluciones (thumb/small/display/full) por idioma. Las imágenes se sirven desde `https://images.openfoodfacts.org/images/products/`. La ruta se deriva del código de barras: se completa a 13 dígitos, se parten los primeros 9 en tres grupos de 3 y luego el resto (ej.: `3435660768163` → `343/566/076/8163/front_fr.4.full.jpg` para full, o `.400.jpg` para 400px).
- **Descarga en lote:** OFF pide que, si vas a traer más de unos cientos de productos, uses las exportaciones (CSV/JSONL) en vez de martillar la API en vivo. También hay un dataset completo de imágenes en AWS (Registry of Open Data on AWS, s3://openfoodfacts-images) y hay límites de tasa (te devuelve HTTP 503 si abusás). Recomendación: cacheá localmente las imágenes que bajes.
- **Licencia:** las imágenes están bajo **Creative Commons Attribution-ShareAlike 3.0 (CC-BY-SA 3.0)** y los datos (texto) bajo ODbL — así lo confirma la ficha de Wikipedia de Open Food Facts: *"Content license: Open Database Licence; Database Contents License; Creative Commons Attribution/Share-Alike 3.0 (product pictures)"*. Esto significa que las podés usar, incluso comercialmente, siempre que: (1) des atribución a "Open Food Facts contributors" y (2) compartas las obras derivadas bajo la misma licencia.
- **Ojo con la cobertura:** al ser colaborativa, la completitud varía mucho por producto. Muchos productos argentinos no van a tener foto o van a tener una foto de baja calidad / mal recortada. No cuentes con el 100% de tu catálogo acá.
- **Nota importante sobre la licencia:** OFF advierte que las imágenes "pueden contener elementos gráficos sujetos a derechos de autor u otros derechos" (los logos y diseños de packaging de las marcas). La licencia CC-BY-SA cubre la fotografía, no la marca en sí; para un catálogo de reventa esto normalmente no es problema, pero tenelo presente. Además, OFF pide explícitamente a los colaboradores que **no suban contenido scrapeado de internet** ("Do not upload scraped content from the internet. Only upload content taken by final users"), lo que refuerza que la base está pensada como fotos originales de usuarios.
- **Categorías fuera de alimentos:** para limpieza, cosmética, etc., existen los proyectos hermanos **Open Products Facts** (ar.openproductsfacts.org) y **Open Beauty Facts**, con la misma lógica y licencia, aunque con mucha menos cobertura.

### B) Sitios de supermercados argentinos (referencia, no para copiar)

Todos tienen catálogos online con fotos en fondo blanco de buena calidad:
- **Coto Digital:** https://www.cotodigital.com.ar/
- **Carrefour:** https://www.carrefour.com.ar/
- **Jumbo:** https://www.jumbo.com.ar/ (y Disco / Vea, del mismo grupo Cencosud, sobre plataforma VTEX)
- **Día, La Anónima**, etc.

Técnicamente, Carrefour, Día, Jumbo, Disco y Vea corren sobre la plataforma **VTEX** y exponen un API de catálogo público (`/api/catalog_system/pub/products/search/...`) sin login; Coto usa un motor propio con Constructor.io. **Pero**: las fotos que aparecen ahí tienen derechos de autor (del supermercado o de la marca) y los términos de uso de estos sitios prohíben el uso comercial de su contenido sin autorización. Sirven perfecto para **buscar la foto de referencia e identificar el producto**, pero no es legalmente seguro descargarlas y republicarlas en tu catálogo.

### C) Mayoristas / B2B

- **Maxiconsumo:** https://maxiconsumo.com/ tiene "sucursal online" con fotos de producto; es el mayorista más grande del país (fundado en 1993, con más de 30 sucursales) y su surtido se parece mucho al de una distribuidora.
- Otros: Diarco, Yaguar, Makro, Vital. Muchos tienen catálogos digitales.
- **MayoristaNet** (mayoristanet.com) también expone fichas con imágenes.

Misma advertencia legal que los supermercados: útiles como referencia, las imágenes no son de libre uso.

### D) Marcas / fabricantes (la ruta legalmente ideal)

La práctica estándar en distribución es **pedirle al proveedor o a la marca el kit de imágenes** ("material de prensa", "assets de producto" o "pack shots"). Como distribuidor que revende sus productos, las marcas suelen entregar estas imágenes con gusto porque les conviene que su producto se vea bien. Muchas tienen secciones de prensa/brand en su web. Pedí:
- Imágenes en alta resolución, fondo blanco/transparente (PNG).
- Autorización **por escrito** (mail) de uso para tu catálogo. Guardala: si algún titular te reclama, tenés el permiso documentado. (Es exactamente lo que recomienda Mercado Libre a sus vendedores: *"la autorización debe ser escrita para que puedas adjuntarla en tu respuesta si algún titular de derechos te denuncia por ese uso"*.)

Esto aplica muy bien para tus rubros: Coca-Cola / grupo Coca-Cola (Arca Continental embotella en el norte argentino), Quilmes/AB InBev, Arcor, Chandon (Moët Hennessy), Unilever (Ala, Cif), P&G (Magistral), bodegas, etc.

### E) Bancos de imágenes (solo genéricos / placeholders)

- **Unsplash** (unsplash.com) y **Pexels**: fotos gratis, uso comercial, sin atribución obligatoria. Sirven para banners de secciones ("Bebidas", "Limpieza"), fondos, o placeholders mientras no tengas la foto real.
- **NO** sirven para la foto puntual de un SKU (no vas a encontrar "Quilmes lata 473ml" con foto de catálogo). Además, las fotos de marcas que aparezcan ahí pueden tener conflictos con derechos de marca.
- Freepik/123RF/Adobe Stock: mezclan gratis y pago; menos recomendables para este caso.

### F) Aspectos legales en Argentina (resumen práctico)

- **Ley 11.723 (Propiedad Intelectual):** protege las fotografías como obras. Según el texto oficial (art. 34, modificado por Ley 25.006, B.O. 13/8/1998): *"Para las obras fotográficas la duración del derecho de propiedad es de VEINTE (20) años a partir de la fecha de la primera publicación."* Sin embargo, ese plazo está en tensión con los tratados internacionales: ARGRA (Asociación de Reporteros Gráficos) sostiene que *"una correcta interpretación de la prelación de las leyes permite extender el plazo de protección a 50 años post-mortem del autor"*, y el Convenio de Berna (Acta de París 1971, art. 7 párr. 4) fija un mínimo de 25 años desde la realización para obras fotográficas. En la práctica: **asumí que toda foto ajena tiene dueño y está protegida.**
- **Marca vs. foto:** el diseño del packaging y el logo de Coca-Cola/Arcor/etc. son marcas registradas. Mostrar el producto que efectivamente vendés (reventa legítima) generalmente está permitido, pero **la foto en sí** (la obra fotográfica) es de quien la sacó.
- **Regla de oro:** la vía sin riesgo es (1) imágenes que te da el fabricante/proveedor con permiso, (2) fotos propias, o (3) Open Food Facts respetando CC-BY-SA. Todo lo demás (bajar de supermercados/Google) es zona gris/riesgosa.
- **Atribución de OFF:** poné en algún lugar del sitio (footer o página "Créditos") algo como: "Algunas imágenes provienen de Open Food Facts y sus colaboradores, bajo licencia CC-BY-SA 3.0." Y, por ShareAlike, si modificás esas imágenes, la versión modificada queda bajo la misma licencia.

### G) Consejos prácticos para conseguir cientos de imágenes eficientemente

**1. Automatizá con la lista de EAN + API de Open Food Facts.**
Si tu CSV/Excel tiene la columna de código de barras (EAN-13), armá un script (en Next.js/Node te sirve un endpoint o un script Node) que:
- Lea el CSV.
- Por cada EAN llame a `https://world.openfoodfacts.org/api/v2/product/{ean}.json`.
- Si viene `image_front_url` (o `image_url`), la descargue y la suba a tu Supabase Storage.
- Marque los que no tienen foto para resolverlos por otra vía.
Mandá un `User-Agent` identificándote y agregá una pausa entre requests para no comerte el rate-limit (HTTP 503).

**2. Si NO tenés los EAN en el CSV:** conseguilos. Podés escanear con el celular (la app de Open Food Facts escanea y carga), o pedir la lista con códigos al proveedor. El EAN es la llave maestra para cruzar todo.

**3. Fotos propias con el celular (para lo que no aparezca):**
- **Fondo:** cartulina o tela blanca lisa (si el producto es blanco, usá gris claro). Consistencia = catálogo profesional.
- **Luz:** natural, de una ventana con luz indirecta (evitá sol directo del mediodía y el flash del celular, que aplana y genera reflejos). Si usás luz artificial, que sea blanca y desde dos lados a 45°.
- **Cámara:** limpiá el lente, usá modo HDR si lo tenés, sacá sin flash, y estabilizá (trípode o apoyo).
- **Encuadre:** cuadrado (1:1) para que la grilla del catálogo quede pareja. Resolución 1200×1200 px ideal.
- **Flujo eficiente:** sacá TODAS las fotos de una tanda en una sola sesión y después procesalas juntas.

**4. Herramientas gratuitas para quitar fondo y estandarizar:**
- **remove.bg** (remove.bg/es): quita fondo automático, gratis, PNG transparente o fondo blanco.
- **Photoroom** (photoroom.com): la más usada en LatAm para producto; tiene **modo batch** (procesar hasta 50 fotos por sesión), plantillas y sombras. El plan gratuito limita a ~100 exportaciones/mes con marca de agua y no permite uso comercial; el plan **Pro cuesta USD 12,99/mes (o USD 7,50/mes con facturación anual, ~USD 90/año)** e incluye 500 batch exports mensuales sin marca de agua y alta resolución.
- **Alternativas:** erase.bg, Pixelcut, Fotor, Canva.
- **Optimización web:** exportá en WebP o JPG calidad ~85%, apuntando a 100-300 KB por imagen para que el catálogo cargue rápido en Vercel.

## Recommendations

**Etapa 1 — Carga inicial masiva (esta semana):**
1. Asegurate de tener el **código EAN** de cada producto en tu CSV. Si falta, pedilo al proveedor o escaneá.
2. Escribí un script que recorra los EAN y baje las imágenes de la **API de Open Food Facts** a Supabase Storage. Esto te resuelve probablemente el grueso de alimentos, gaseosas y golosinas de marca.
3. Guardá metadata de origen de cada imagen (para la atribución CC-BY-SA de las que vengan de OFF).

**Etapa 2 — Completar huecos (1-2 semanas):**
4. Listá los productos sin foto (típicamente champagne/vinos/limpieza de marca y productos regionales).
5. Mandá un mail a cada proveedor/marca pidiendo su **kit de imágenes de producto** con autorización de uso escrita. Priorizá tus proveedores más grandes.
6. Para lo que no llegue, **sacá fotos propias** en una sesión concentrada con el setup de fondo blanco + ventana.

**Etapa 3 — Estandarización:**
7. Pasá todas las fotos (propias y las que hagan falta) por **Photoroom en modo batch** o remove.bg para uniformar fondo blanco y tamaño cuadrado.
8. Optimizá a WebP y subí a Supabase.

**Umbrales que cambian la decisión:**
- Si la cobertura de OFF para tus SKUs resulta < 50%, no pierdas tiempo puliendo el script: prioritá pedir kits a proveedores y fotos propias.
- Si el catálogo se comparte solo por link a vendedores/algunos clientes (no es una tienda pública masiva), el riesgo legal de usar alguna foto de referencia es bajo — pero igual, para cientos de productos y con vistas a crecer, conviene construir sobre imágenes limpias (OFF + proveedor + propias) desde el inicio.
- Si vas a necesitar actualizar precios/productos seguido, dejá el script de OFF parametrizable para re-correr cuando sumes SKUs.

## Caveats
- **La cobertura de Open Food Facts para Argentina es parcial e irregular:** ~16.180 productos suena mucho, pero muchos no tienen foto o tienen fotos amateur/torcidas. No asumas que cubre tu catálogo entero. Además es un número vivo que cambia día a día.
- **CC-BY-SA obliga a atribuir y a compartir igual:** si editás una imagen de OFF (por ejemplo, le cambiás el fondo), la versión editada hereda la licencia CC-BY-SA. Para evitar complicaciones, para las fotos "estrella" conviene tener las propias o las del fabricante.
- **Las imágenes de supermercados y mayoristas NO son de libre uso**, aunque técnicamente sean fáciles de descargar (VTEX/Constructor.io). Úsalas solo como referencia visual.
- **El plazo de la Ley 11.723 es ambiguo** (20 años art. 34 vs. plazo mayor por tratados internacionales). No te apoyes en "es viejo, ya es de dominio público": asumí protección.
- Los datos de OFF son colaborativos: puede haber errores en el producto asociado a un EAN. Verificá que la foto que baja coincida con el producto real antes de publicarla.
- Precios de herramientas (Photoroom Pro USD 12,99/mes) pueden variar; verificá al momento de contratar.