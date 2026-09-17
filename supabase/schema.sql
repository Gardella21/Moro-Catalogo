-- ============================================================
-- Valfer Bebidas Chivilcoy SA — esquema del catálogo
-- Pegar esto entero en Supabase → SQL Editor → Run
-- ============================================================

-- 1. CATEGORÍAS (lo que va en el navbar)
create table if not exists categorias (
  id          bigserial primary key,
  nombre      text not null,
  slug        text not null unique,
  orden       int  not null default 0,
  visible     boolean not null default true
);

-- 2. PRODUCTOS
-- subcategoria es texto libre a propósito: en el Excel los subtítulos
-- ("DESCARTABLE 1,500 ML", "LATAS 473", "YERBA") son irregulares y
-- una tabla aparte obligaría al dueño a mantener dos ABMs en vez de uno.
create table if not exists productos (
  id             bigserial primary key,
  categoria_id   bigint not null references categorias(id) on delete restrict,
  subcategoria   text,
  nombre         text not null,
  descripcion    text,
  imagen_url     text,
  precio_unit    numeric(12,2),           -- null = "consultar", NO cero
  precio_pack    numeric(12,2),
  unidades_pack  int,
  destacado      boolean not null default false,
  visible        boolean not null default true,
  orden          int not null default 0,
  actualizado    timestamptz not null default now()
);

create index if not exists productos_categoria_idx on productos(categoria_id);
create index if not exists productos_visible_idx  on productos(visible);

-- La búsqueda por nombre (sin acentos, insensible a mayúsculas) la hace el
-- front en memoria sobre el catálogo completo (ver src/lib/formato.js), no
-- Postgres. Por eso no hace falta un índice de texto acá.

-- Toca "actualizado" solo en updates
create or replace function tocar_actualizado() returns trigger as $$
begin new.actualizado = now(); return new; end;
$$ language plpgsql;

drop trigger if exists productos_actualizado on productos;
create trigger productos_actualizado before update on productos
  for each row execute function tocar_actualizado();

-- ============================================================
-- 3. SEGURIDAD (esto es el corazón del asunto)
-- Cualquiera puede LEER el catálogo. Solo un usuario logueado
-- puede escribir. La contraseña la maneja Supabase Auth: nunca
-- vive en el código del front.
-- ============================================================
alter table categorias enable row level security;
alter table productos  enable row level security;

drop policy if exists "lectura publica categorias" on categorias;
create policy "lectura publica categorias" on categorias
  for select to anon, authenticated using (visible = true);

drop policy if exists "lectura publica productos" on productos;
create policy "lectura publica productos" on productos
  for select to anon, authenticated using (visible = true);

drop policy if exists "admin escribe categorias" on categorias;
create policy "admin escribe categorias" on categorias
  for all to authenticated using (true) with check (true);

drop policy if exists "admin escribe productos" on productos;
create policy "admin escribe productos" on productos
  for all to authenticated using (true) with check (true);

-- ============================================================
-- 4. STORAGE para las fotos
-- Después de correr esto: Storage → New bucket → "productos" → Public
-- ============================================================
insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict (id) do nothing;

drop policy if exists "fotos lectura publica" on storage.objects;
create policy "fotos lectura publica" on storage.objects
  for select to anon, authenticated using (bucket_id = 'productos');

drop policy if exists "fotos escribe admin" on storage.objects;
create policy "fotos escribe admin" on storage.objects
  for all to authenticated
  using (bucket_id = 'productos') with check (bucket_id = 'productos');

-- ============================================================
-- 5. CATEGORÍAS INICIALES (salen de las hojas del Excel)
-- ============================================================
insert into categorias (nombre, slug, orden) values
  ('Gaseosas',              'gaseosas',      1),
  ('Aguas',                 'aguas',         2),
  ('Sodas',                 'sodas',         3),
  ('Saborizadas',           'saborizadas',   4),
  ('Cervezas',              'cervezas',      5),
  ('Vinos',                 'vinos',         6),
  ('Champagne y sidras',    'champagne',     7),
  ('Aperitivos y licores',  'aperitivos',    8),
  ('Jugos y energizantes',  'jugos',         9),
  ('Galletitas y budines',  'galletitas',   10),
  ('Mercadería',            'mercaderia',   11),
  ('Limpieza',              'limpieza',     12)
on conflict (slug) do nothing;
