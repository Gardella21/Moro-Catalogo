# Decisiones del proyecto

## 1. ¿Hace falta base de datos?

Sí. Y no es por el login: es por el panel.

Vale la pena separar las dos cosas porque se mezclan fácil.

**La contraseña sola no obliga a nada… pero tampoco sirve sola.**
Se puede escribir `if (clave === 'moro2026')` en el JavaScript del front. Funciona,
y es completamente inútil: ese código se descarga al navegador de cualquiera que
entre. Con F12 y diez segundos, cualquier persona ve la contraseña. Un login que
vive solo en el front no es un login, es un cartel que dice "no pasar".

**Lo que sí obliga es que el panel guarde cambios.**
Si los precios están escritos en un archivo del código (estático), el dueño no
puede cambiarlos desde el celular. Cambiar un precio sería: editar el archivo,
hacer commit, esperar que Vercel vuelva a publicar. O sea, tu trabajo cada vez
que aumenta la Coca. El pedido concreto del cliente en el audio es justamente ese
—*"que se pueda corregir los precios de alguna manera, dentro de todo sencillo,
por el tema de los aumentos"*— y eso necesita que los datos vivan en algún lado
que se pueda escribir desde afuera del código.

Además están las fotos. Van a subir imágenes desde el celular: eso necesita
almacenamiento, no un `<img src="/img/coca.png">` que alguien tenga que commitear.

**En resumen:** catálogo estático = no necesitás base. Panel que edita precios y
sube fotos = sí la necesitás, con o sin login.

---

## 2. Qué usar

**Supabase**, plan gratis. Es Postgres + autenticación + almacenamiento de
archivos, todo en el mismo lugar y sin que tengas que escribir backend.

Por qué encaja acá:

- La autenticación viene resuelta y del lado del servidor. Vos creás el usuario
  del dueño a mano desde el panel de Supabase; nunca hay una contraseña en tu código.
- Row Level Security te deja decir "cualquiera lee, solo el logueado escribe" en
  cuatro líneas de SQL (están en `supabase/schema.sql`). Sin eso, cualquiera con
  la clave pública podría borrarte la tabla.
- El bucket de Storage sirve las fotos por CDN. Importante para el celular.
- El plan gratis da 500 MB de base y 1 GB de archivos. Con ~1.500 productos vas a
  usar una fracción mínima de la base; el límite real lo van a marcar las fotos, y
  aun así entran holgadas si las comprimís.

**Lo que descarté y por qué:**

| Opción | Por qué no |
|---|---|
| Firebase | Hace lo mismo, pero Firestore no es SQL y la lista de precios es tabular. Además, si un día quieren pedidos, en Postgres lo hacés natural. |
| JSON estático + Decap CMS | Cero base de datos, gratis. Pero el dueño edita vía GitHub y cada cambio tarda un minuto en publicarse. Para alguien que "no tiene mucha idea", es fricción que va a hacer que no lo use. Y el briefing dice que el riesgo principal es justamente ese: *"que funcione de buena manera y que lo utilice"*. |
| Seguir usando el Google Sheet como base | Tentador porque ya existe. Pero escribir de vuelta al Sheet necesita credenciales de servicio, o sea backend igual, y perdés las fotos. Sirve como origen para la carga inicial, no como base viva. |

---

## 3. Lo que encontré en el Excel y te va a morder

Leí las 14 hojas. Tres cosas para hablar con Fermín **antes** de cargar nada:

**a. Muchísimos precios están en `$0.00`.**
No es cero: es "no lo cargaron". En categorías como Manaos o Trivento está casi
toda la hoja en cero. Si los mostrás como `$0`, el catálogo miente. La app los
muestra como **"Consultar"** y el script de importación los convierte a `NULL`.
Pero conviene que revisen la lista, porque un producto en "Consultar" sigue
mandándolos a WhatsApp, que es justo lo que quieren evitar.

**b. Hay dos precios por producto, no uno.**
Cada fila tiene precio unitario y precio por pack/cajón, más las unidades por
pack. El audio habla de "el precio" en singular, pero la lista real tiene los dos.
La app muestra el unitario grande y el del pack abajo en chico. Confirmá que sea
así y no al revés: si el cliente final es un kiosquero que compra por cajón,
quizás el protagonista tenga que ser el precio del pack.

**c. Los nombres tienen errores de tipeo.**
`COCA C0LA` con cero, `SPRTE`, `MAECELITO`, `AQUARIUS MANZABA`, `ARTIULOS DE
LIMPIEZA`. Si los importás tal cual, el buscador no los encuentra. Vale la pena
una pasada de limpieza sobre los CSV antes de importar —o al menos sobre las
categorías más buscadas.

**d. Las fotos son el cuello de botella real, no el código.**
Ni un solo producto tiene imagen en el Excel. Son ~1.500 productos. Nadie va a
fotografiar 1.500 SKUs. Mi sugerencia: que la foto sea opcional (la app ya
funciona sin ella, muestra un ícono de botella), y que arranquen cargando fotos
solo de los 40 o 50 productos que más venden. Decíselo antes de empezar, porque
si no la app va a quedar "a medias" a sus ojos durante meses.

---

## 4. Estructura de datos

Dos tablas, a propósito. `categorias` es una tabla porque va en el navbar y el
orden importa. `subcategoria` es un campo de texto suelto dentro de `productos`,
no una tercera tabla: en el Excel los subtítulos son irregulares
(`DESCARTABLE 1,500 ML`, `LATAS 473`, `YERBA`, `GIN`) y hacer una tabla aparte
significaría que el dueño tenga que mantener dos ABMs distintos para agregar un
producto. Para este tamaño, no paga.

```
categorias                    productos
──────────                    ─────────
id                            id
nombre    → navbar            categoria_id  → categorias.id
slug                          subcategoria  → texto libre, agrupa dentro de la sección
orden                         nombre, descripcion, imagen_url
visible                       precio_unit   → NULL = "Consultar"
                              precio_pack, unidades_pack
                              visible, orden, actualizado
```

---

## 5. Sobre la referencia (lamonedalistadeprecios)

Esa página tiene carrito y botón de "Enviar pedido" que arma un mensaje de
WhatsApp. Vos no vas a hacer eso —bien, el cliente pidió explícitamente arrancar
sin pedidos— pero tiene dos cosas que sí vale copiar:

- **El QR para compartir.** Los vendedores están en la calle; pasarle un QR a un
  cliente en el mostrador es más rápido que dictar una URL. Es media hora de
  trabajo con una librería de QR.
- **Un botón de WhatsApp fijo.** Ya está puesto en el proyecto. No arma pedido:
  abre la conversación. Es el puente mientras no haya carrito.

---

## 6. Si más adelante quieren pedidos

El audio dice *"el día de mañana se puede agregar"*. Con Postgres atrás, agregar
carrito es sumar dos tablas (`pedidos`, `pedido_items`) y reusar todo lo demás.
No hay que rehacer nada. Es otra razón para no elegir el camino del JSON estático
ahora.
