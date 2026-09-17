// Muestra real sacada del Excel del cliente.
// Sirve para que `npm run dev` funcione ANTES de configurar Supabase.
// Cuando pongas las credenciales en .env, la app deja de usar esto sola.

export const CATEGORIAS_DEMO = [
  { id: 1, nombre: 'Gaseosas', slug: 'gaseosas', orden: 1 },
  { id: 2, nombre: 'Aguas', slug: 'aguas', orden: 2 },
  { id: 12, nombre: 'Sodas', slug: 'sodas', orden: 3 },
  { id: 3, nombre: 'Saborizadas', slug: 'saborizadas', orden: 4 },
  { id: 4, nombre: 'Cervezas', slug: 'cervezas', orden: 5 },
  { id: 5, nombre: 'Vinos', slug: 'vinos', orden: 6 },
  { id: 6, nombre: 'Champagne y sidras', slug: 'champagne', orden: 7 },
  { id: 7, nombre: 'Aperitivos y licores', slug: 'aperitivos', orden: 8 },
  { id: 8, nombre: 'Jugos y energizantes', slug: 'jugos', orden: 9 },
  { id: 9, nombre: 'Galletitas y budines', slug: 'galletitas', orden: 10 },
  { id: 10, nombre: 'Mercadería', slug: 'mercaderia', orden: 11 },
  { id: 11, nombre: 'Limpieza', slug: 'limpieza', orden: 12 }
]

const p = (id, cat, sub, nombre, unit, pack, uxp) => ({
  id, categoria_id: cat, subcategoria: sub, nombre,
  descripcion: null, imagen_url: null,
  precio_unit: unit, precio_pack: pack, unidades_pack: uxp,
  visible: true, destacado: false, orden: id
})

export const PRODUCTOS_DEMO = [
  // Gaseosas
  p(1, 1, 'Línea Coca', 'Coca Cola 1.250', 2830, 22640, 8),
  p(2, 1, 'Línea Coca', 'Coca Cola Sin Azúcar 1.250', 2830, 22640, 8),
  p(3, 1, 'Línea Coca', 'Sprite 1.250', 2830, 22640, 8),
  p(4, 1, 'Línea Coca', 'Coca Cola Ref. 2 L', 3488, 31392, 9),
  p(5, 1, 'Línea Coca', 'Coca Cola 2.250', 5340, 32040, 6),
  p(6, 1, 'Línea Coca', 'Coca Cola 1.500', 3855, 23130, 6),
  p(7, 1, 'Línea Coca', 'Coca Cola 500', 1832, 21984, 12),
  p(8, 1, 'Línea Coca', 'Coca Cola lata', 1500, 9000, 6),
  p(9, 1, 'Línea Coca', 'Schweppes Tónica lata', 1500, 9000, 6),
  p(10, 1, 'Línea Pepsi', 'Pepsi 1.500', 2800, 16800, 6),
  p(11, 1, 'Línea Pepsi', 'Seven Up 1.500', 2800, 16800, 6),
  p(12, 1, 'Línea Pepsi', 'Lata Pepsi 354', 1045, 25080, 24),
  p(13, 1, 'Línea Cunnington', 'Cunnington Tónica 2.250', 1810, 10860, 6),
  p(14, 1, 'Línea Cunnington', 'Manaos Cola 3 L', null, null, 6),

  // Aguas
  p(20, 2, 'Descartable 2 L', 'Villavicencio 2 L', 1860, 11160, 6),
  p(21, 2, 'Descartable 2 L', 'Glaciar 2 L', 1950, 11700, 6),
  p(22, 2, 'Descartable 2 L', 'Sierra de los Padres 2 L', 1234, 7404, 6),
  p(23, 2, 'Descartable 500 ml', 'Villavicencio 500', 975, 11700, 12),
  p(24, 2, 'Descartable 500 ml', 'Glon 500', 700, 8400, 12),

  // Sodas
  p(25, 12, 'Sifón descartable', 'Sierra de los Padres 1,750 ml', 1500, 9000, 6),
  p(26, 12, 'Sifón descartable', 'Torasso 2 L', 1315, 7890, 6),

  // Saborizadas
  p(30, 3, 'Descartable 1,5 L', 'Aquarius Naranja 1.500', 3202, 19212, 6),
  p(31, 3, 'Descartable 1,5 L', 'Levité Pomelo 1.500', 2050, 12300, 6),
  p(32, 3, 'Descartable 1,5 L', 'Fresh Manzana 1.500', 1368, 8208, 6),
  p(33, 3, 'Descartable 500 ml', 'Levité Naranja 500', 1420, 17040, 12),
  p(34, 3, 'Descartable 500 ml', 'Brío Pomelo 500', 720, 8640, 12),

  // Cervezas
  p(40, 4, 'Retornable 1 L', 'Quilmes 1 L', 3400, 40800, 12),
  p(41, 4, 'Retornable 1 L', 'Brahma 1 L', 3450, 41400, 12),
  p(42, 4, 'Retornable 1 L', 'Heineken 1 L', 5100, 61200, 12),
  p(43, 4, 'Retornable 1 L', 'Stella Artois 1 L', 5300, 63600, 12),
  p(44, 4, 'Latas 473 ml', 'Quilmes 473 ml', 1920, 46080, 24),
  p(45, 4, 'Latas 473 ml', 'Heineken 473 ml', 2850, 68400, 24),
  p(46, 4, 'Latas 473 ml', 'Schneider 473 ml', 1800, 43200, 24),
  p(47, 4, 'Latón 710 ml', 'Heineken 710 ml', 4455, 106920, 24),
  p(48, 4, 'Porrón', 'Corona porrón 340 ml', 3150, 75600, 24),

  // Vinos
  p(50, 5, 'Escorihuela Gascón 750', 'Familia Gascón Malbec', 5900, 35400, 6),
  p(51, 5, 'Escorihuela Gascón 750', 'Escorihuela Gascón Malbec', 9100, 54600, 6),
  p(52, 5, 'Zuccardi 750', 'Santa Julia Malbec', 4585, 27510, 6),
  p(53, 5, 'Norton 750', 'Norton Clásico Tinto / Blanco', 3450, 20700, 6),
  p(54, 5, 'Catena Zapata', 'Saint Felicien Malbec', 9500, 57000, 6),
  p(55, 5, 'Tetrabrik', 'Toro Brik Tinto / Blanco', 2185, 26220, 12),

  // Champagne y sidras
  p(60, 6, 'Champagne', 'Norton Cosecha Especial Extra Brut', 8900, 53400, 6),
  p(61, 6, 'Champagne', 'Santa Julia Extra Brut', 6800, 40800, 6),
  p(62, 6, 'Sidras', 'Rama Caída x 710', 2650, 15900, 6),
  p(63, 6, 'Sidras', 'Lata Sidra 1888 x 473', 2365, 28380, 12),

  // Aperitivos y licores
  p(70, 7, 'Aperitivos', 'Fernet Branca 750', 18450, 221400, 12),
  p(71, 7, 'Aperitivos', 'Gancia 1 L', 7150, 85800, 12),
  p(72, 7, 'Aperitivos', 'Campari 750', 11000, 132000, 12),
  p(73, 7, 'Gin', 'Beefeater 750', 25100, null, null),
  p(74, 7, 'Vodka', 'Smirnoff Clásico', 8400, null, null),
  p(75, 7, 'Whisky', 'Johnnie Walker Red x 750', 26500, null, null),
  p(76, 7, 'Licores', 'Baileys Clásico', 32000, null, null),

  // Jugos y energizantes
  p(80, 8, 'Jugos', 'Baggio 1 L (naranja, durazno, multifruta)', 1861, 14888, 8),
  p(81, 8, 'Jugos', 'Baggio 200 ml', 551, 9918, 18),
  p(82, 8, 'Energizantes', 'Speed 473', 2398, 28776, 12),
  p(83, 8, 'Energizantes', 'Monster (todos los sabores)', 2760, 16560, 6),
  p(84, 8, 'Energizantes', 'Dr. Lemon Vodka x 1 L', 3560, 42720, 12),
  p(85, 8, 'Termas', 'Terma Serrano', 2170, 26040, 12),

  // Galletitas y budines
  p(90, 9, 'Nevares', 'Alfajor Negro Genio Triple', 347, 8328, 24),
  p(91, 9, 'Nevares', 'Turrón Nevares x 25 g', 218, 10900, 50),
  p(92, 9, 'Nevares', 'Obleas Chocolate x 33 g', 305, 14640, 48),
  p(93, 9, 'Pozo', 'Magdalenas clásicas x 200 g', 1820, 18200, 10),
  p(94, 9, 'Pozo', 'Vainillas x 148 g', 1057, 29596, 28),

  // Mercadería
  p(100, 10, 'Yerba', 'Playadito x 1 kg', 4885, 24425, 5),
  p(101, 10, 'Yerba', 'Amanda x 500', 1780, 17800, 10),
  p(102, 10, 'Aceites', 'Cañuelas x 1500', 5865, null, 12),
  p(103, 10, 'Aderezos', 'Mayonesa Natura x 1 kg', 3900, 31200, 8),
  p(104, 10, 'Varios', 'Arroz Ala x 1 kg', 1680, null, null),
  p(105, 10, 'Varios', 'Harina Chacabuco 000', 895, null, null),
  p(106, 10, 'Té', 'Té Green Hills x 25 saquitos', 1378, 27560, 20),

  // Limpieza
  p(110, 11, null, 'Detergente Ala x 750', 1950, null, 15),
  p(111, 11, null, 'Papel higiénico x 4', 1650, null, 12),
  p(112, 11, null, 'Poett líquido x 900', 1650, null, 12),
  p(113, 11, null, 'Raid', 5800, null, 12)
]
