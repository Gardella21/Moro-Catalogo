# Valfer Bebidas Chivilcoy SA — catálogo de precios

Catálogo mayorista para celular. Sin carrito: se ve el producto, la foto y el
precio, y el pedido sigue yendo por WhatsApp. El dueño edita todo desde un panel
con usuario y contraseña.

React + Vite + Tailwind en el front, Supabase (Postgres + Auth + Storage) atrás.

**Leé [DECISIONES.md](./DECISIONES.md) antes de arrancar.** Ahí está la respuesta
a lo de la base de datos y tres problemas del Excel que conviene resolver con el
cliente antes de cargar datos.

---

## Arrancar

```bash
npm install
npm run dev
```

Levanta en `http://localhost:5173` con datos de ejemplo sacados del Excel real.
No necesitás Supabase todavía para ver cómo queda.

> Tip: `npm run dev` expone la app en la red local. Abrila desde el celular con
> la IP de tu máquina (`http://192.168.x.x:5173`) — es donde se va a usar de verdad.

---

## Conectar la base

1. Creá un proyecto en [supabase.com](https://supabase.com) (plan gratis).
2. SQL Editor → pegá todo `supabase/schema.sql` → Run. Crea las tablas, las
   políticas de permisos y las 12 categorías.
3. Storage → verificá que exista el bucket `productos` y que esté en público.
4. Authentication → Users → **Add user**. Creá el usuario del dueño a mano, con
   el mail y la contraseña que le vayas a dar. No habilites el registro abierto:
   si alguien puede registrarse solo, entra al panel.
5. Settings → API → copiá *Project URL* y *anon public key*.
6. `cp .env.example .env` y pegá esos dos valores.
7. `npm run dev` de nuevo. El cartel amarillo de "datos de ejemplo" desaparece.

La clave `anon` es pública, va en el front, y está bien que así sea: sin una
sesión iniciada solo permite leer los productos visibles. Eso lo garantizan las
políticas RLS del paso 2, no la clave. Si alguna vez desactivás RLS, la clave
pasa a ser una puerta abierta.

---

## Cargar los 1.500 productos

```bash
# 1. Exportá cada hoja del Sheet a CSV (Archivo → Descargar → CSV,
#    baja solo la hoja activa, hay que repetirlo 14 veces)
# 2. Guardalas en scripts/csv/ con el nombre del slug:
#    gaseosas.csv, aguas.csv, saborizadas.csv, cervezas.csv, vinos.csv,
#    champagne.csv, aperitivos.csv, jugos.csv, galletitas.csv,
#    mercaderia.csv, limpieza.csv
npm run importar
# 3. Pegá scripts/productos.sql en Supabase → SQL Editor → Run
```

El script entiende la estructura del Excel: descarta los títulos y encabezados,
convierte los subtítulos (`DESCARTABLE 1,500 ML`) en subcategoría de las filas de
abajo, y pasa los `$0.00` a `NULL` para que salgan como "Sin Stock".

Corré primero con una hoja sola y mirá el SQL generado antes de importar todo.

---

## Publicar

Vercel, conectado al repo de GitHub. Configurá las variables `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`, `VITE_WHATSAPP` y `VITE_NEGOCIO` en el panel del
proyecto (Settings → Environment Variables). Build: `npm run build`, carpeta: `dist`.
Vercel detecta Vite solo.

El repo ya trae `vercel.json` con un rewrite a `/index.html` para que
`/panel` e `/ingresar` no tiren 404 al recargar la página.

---

## Cómo está armado

```
src/
  pages/
    Catalogo.jsx    buscador + secciones + lista de productos
    Login.jsx       entrada al panel (Supabase Auth)
    Admin.jsx       agregar / editar / borrar / subir foto
  components/
    Catalogo.parts.jsx   encabezado, barra de búsqueda, fila de producto
  hooks/useCatalogo.js   trae todo el catálogo de una vez
  lib/
    supabase.js     cliente; si no hay .env, la app usa los datos de demo
    formato.js      precios en pesos, "Sin Stock" cuando es NULL, búsqueda sin acentos
  data/demo.js      muestra real del Excel para desarrollar sin backend
supabase/schema.sql tablas + permisos + categorías
scripts/importar-csv.mjs  Excel → SQL
```

**Decisiones de interfaz que importan en el celular:**

- Todo el catálogo se baja de una sola vez (~200 KB). Buscar y cambiar de sección
  después no toca la red. En un mostrador con señal mala eso rinde más que
  paginar.
- La búsqueda ignora acentos y mayúsculas y acepta palabras sueltas: escribir
  "coca 500" encuentra "Coca Cola 500".
- Los precios usan cifras tabulares, así quedan alineados en columna aunque
  tengan distinta cantidad de dígitos.
- Los inputs son de 16 px como mínimo: con menos, iOS hace zoom solo al tocarlos.
