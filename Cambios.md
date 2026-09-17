Cambios:
    [Hecho] 1-Cambiar dentro de Gaseosas, los nombres de los navbar y el contenido de cada una. Poniendo las distintas lineas. Linea Coca, Linea Pepsi y Linea Cunnington. Si necesitas los nombres de los productos que irian en cada liena dime.Deja solo las 3 subsecciones:
    Detalle: los 3 chips/subsecciones de Gaseosas (antes uno por tamaño: "Vidrio
    1,250 Ml", "Ref 2L", "Latas 310 Ml", etc.) ahora son solo "Línea Coca",
    "Línea Pepsi" y "Línea Cunnington", usando el mismo campo `subcategoria`
    que ya alimentaba esos chips y los títulos de grupo (no hizo falta agregar
    ninguna columna). Se matchearon los 106 productos que tiene hoy "Gaseosas"
    en la base contra la lista que dejaste, tolerando los typos con los que la
    escribiste (COCO COLA ZERO, GATORDE ROJO, POEMELO, "SIN      AZUCAR" con
    espacios de más, etc.) y los 106 quedaron clasificados sin ambigüedad —
    ninguno se dejó sin línea. La sección "gaseosa cordoba" (Descartable X 3 L
    y X 2,25, con Cola/Lima Limón/Pomelo) la agrupé dentro de "Línea
    Cunnington" porque así la anotaste, anidada debajo de esa línea.
    Aproveché para corregir dos typos que encontré en el NOMBRE real ya
    cargado en la base (no en tu lista): "Gatorde Rojo X 500" → "Gatorade
    Rojo X 500", y "Descartable Paso D L Toro Tonica 1.500" → "...Toros..."
    (el resto de los productos de esa marca ya decían "Toros" en plural, ese
    era el único en singular).
    Como la clave de Supabase que usa la app es de solo lectura, dejé el
    script `scripts/cambios-2026-09-16-e.sql` con los UPDATE necesarios —
    falta que lo corras en el SQL Editor de Supabase para que el cambio se
    vea en el catálogo real (el código ya está listo y compila).
                        Linea Coca: vidrio 1250ml: COCA COLA 1.250-COCA COLA SIN AZUCAR 1.250-SPRITE 1.250-FANTA 1.250.
                                    REF 2L: COCA COLA REF. 2L.-COCA COLA SIN AZUCAR REF. 2L-COCA COLA LIGHT REF 2L.-SPRITE REF 2L.-FANTA REF. 2L.-SCHWEPPES POMELO S. AZUCAR REF 2L.
                                    VIDRIO 350 ML: COCA COLA 350-COCA COLA SIN AZUCAR 350-COCA COLA LIGHT 350-SPRITE 350-FANTA 350
                                    DESCARTABLE 3L: COCA COLA 3L-SPRITE 3L
                                    DESCARTABLE 2,250 L: COCA COLA 2.250-SPRITE 2.250-FANTA 2.250
                                    DESCARTABLE 1,500 ML: COCA COLA 1.500-COCA COLA SIN AZUCAR 1.500-COCA COLA LIGHT 1.500-SPRITE 1.500-SPRITE SIN AZUCAR 1.500-SCHWEPPES TONICA 1.500-SCHWEPPES POMELO 1.500-SCHEPPES CITRUS 1.500
                                    DESCARTABLE 1,250 ML: POWER 1,250
                                    DESCARTABLE 500 ML:COCA COLA 500-COCA COLA LIGTH 500-COCA COLA SIN AZUCAR 500-SPRITE 500-SPRTE SIN AZUCAR 500-FANTA 500-FANTA SIN AZUCAR X 500-POWER 500
                                    LATAS 310 ML: COCA COLA-COCA COLA SIN AZUCAR-COCA C0LA LIGHT-SPRITE-FANTA-SCHWEPPES TONICA-SCHWEPPES TONICA SIN AZUCAR-SCHWEPPES POMELO
                                    DESCARTABLE X 237 ML: COCA COLA X237 VIDRIO-COCO COLA ZERO X 237 VIDRIO-FANTA X 237 VIDRIO-SPRITE X 237 VIDRIO
                        Linea Pepsi:DESCARTABLE 3L: PEPSI 3L-SEVEN UP 3L
                                    DESCARTABLE 2,450 ML:SEVEN UP 2 LITROS RECO
                                    DESCARTABLE 2 ML:PEPSI-SEVEN UP 
                                    DESCARTABLE 1,500 ML:DESCARTABLE PEPSI 1.500-DESCARTABLE PEPSI ZERO 1.500-DESCARTABLE SEVEN UP 1.500-DESCARTABLE SEVEN UP FREE 1.500-DESCARTABLE PASO D L TORO TONICA 1.500-DESCARTABLE PASO D L TOROS POMELO 1.500-DESCARTABLE MIRINDA 1.500-DESCARTABLE HO2 CITRUS 1.500-DESCARTABLE HO2 NARANCHEÑO 1.500-DESCARTABLE LIMONETO 1.500
                                    DESCARTABLE 1,250 ML:GATORADE 1250
                                    DESCARTABLE 500 ML:-DESCARTABLE PEPSI 500-DESCARTABLE SEVEN UP 500-DESCARTABLE SEVEN UP FREE 500-DESCARTABLE PASO D L TOROS POMELO 500-DESCARTABLE MIRINDA 500-GATORDE ROJO X 500-GATORADE AZUL X 500-GATORADE NARANJA X 500-GATORADE MANZANA X 500-GATORADE MANGO VERDE X 500-GATORADE UVA X 500
                                    LATAS:-LATA PEPSI 354-LATA SEVEN UP 354-LATA MIRINDA 354-LATA PASO D L TOROS TONICA 310-LATA PASO D L TOROS POMELO 310-LATA PEPSI BLACK X 354
                        Linea Cunnington: DESCARTABLE X 2,250 ML-TONICA-TONICA SIN AZUCAR-POMELO-POEMELO SIN AZUCAR-COLA-COLA SIN AZUCAR-LIMA LIMON-LIMA LIMON SIN      AZUCAR-NARANJA-NARANJA SIN AZUCAR
                                        DESCARTABLE X 1,500 ML: TONICA
                                        DESCARTABLE X 500 ML: -TONICA: -TONICA SIN AZUCAR: -POMELO: -COLA SUAVE: -LIMA LIMON: -NARANJA: -COLA
                                        gaseosa cordoba: DESCARTABLE X 3 L: COLA: LIMA LIMON: POMELO
                                                         DESCARTABLE X 2,25: COLA: LIMA LIMON: POMELO