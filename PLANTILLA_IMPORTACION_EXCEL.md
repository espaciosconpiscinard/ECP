# 📊 Plantilla de Importación Excel - Espacios Con Piscina

## Actualizado: 2025

Este documento describe la estructura actualizada de las hojas Excel para importación masiva.

---

## 📄 Hoja 1: VILLAS

### Columnas Obligatorias (*)

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| **Código Villa *** | Texto | Código único de villa (mayúsculas) | ECPV001 |
| **Nombre Villa *** | Texto | Nombre de la villa | Villa Paradise |
| **Precios Pasadía *** | Texto | Precios en formato especial (ver abajo) | regular:12000\|cliente:15000\|oferta:10000 |

### Columnas Opcionales

#### Información General
| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| Categoría | Texto | Nombre de categoría existente | Premium |

#### MODALIDAD PASADÍA (Por defecto activada)
| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| Tiene Pasadía | Texto | SI/NO (por defecto SI) | SI |
| Descripción Pasadía | Texto | Descripción de amenidades | PISCINA\nJACUZZI\nBAÑOS |
| Precios Pasadía * | Texto | Formato de precios | regular:12000\|cliente:15000 |
| Moneda Pasadía | Texto | DOP o USD | DOP |
| Check-in Pasadía | Texto | Hora entrada | 9:00 AM |
| Check-out Pasadía | Texto | Hora salida | 8:00 PM |

#### MODALIDAD AMANECIDA
| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| Tiene Amanecida | Texto | SI/NO (por defecto NO) | SI |
| Descripción Amanecida | Texto | Descripción de amenidades | PISCINA\nHABITACIONES\nCOCINA |
| Precios Amanecida | Texto | Formato de precios | regular:18000\|cliente:22000 |
| Moneda Amanecida | Texto | DOP o USD | DOP |
| Check-in Amanecida | Texto | Hora entrada | 9:00 AM |
| Check-out Amanecida | Texto | Hora salida | 8:00 AM |

#### MODALIDAD EVENTO
| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| Tiene Evento | Texto | SI/NO (por defecto NO) | NO |
| Descripción Evento | Texto | Descripción de amenidades | ÁREAS AMPLIAS\nSONIDO\nLUCES |
| Precios Evento | Texto | Formato de precios | regular:25000\|cliente:30000 |
| Moneda Evento | Texto | DOP o USD | DOP |
| Check-in Evento | Texto | Hora entrada | 6:00 PM |
| Check-out Evento | Texto | Hora salida | 11:00 PM |

---

## 🎯 FORMATO DE PRECIOS

El campo "Precios" usa un formato especial con pares `clave:valor` separados por `|`:

### Estructura:
```
tipo_owner:precio_owner|tipo_cliente:precio_cliente
```

### Tipos de Precio:
- **regular** → Precio normal del propietario
- **cliente** → Precio normal al cliente
- **oferta** → Precio oferta del propietario
- **temporada_alta** → Precio temporada alta del propietario
- **cliente_alta** → Precio temporada alta al cliente

### Ejemplos:

**Mínimo (solo regular):**
```
regular:12000|cliente:15000
```
Genera 1 opción de precio:
- Regular: Owner RD$ 12,000 / Cliente RD$ 15,000

**Completo (con oferta y temporada alta):**
```
regular:12000|cliente:15000|oferta:10000|temporada_alta:18000|cliente_alta:22000
```
Genera 3 opciones de precio:
- Regular: Owner RD$ 12,000 / Cliente RD$ 15,000
- Oferta: Owner RD$ 10,000 / Cliente RD$ 15,000
- Temporada Alta: Owner RD$ 18,000 / Cliente RD$ 22,000

---

## 📝 EJEMPLO DE FILA COMPLETA

| Código Villa * | Nombre Villa * | Categoría | Tiene Pasadía | Descripción Pasadía | Precios Pasadía * | Moneda Pasadía | Check-in Pasadía | Check-out Pasadía | Tiene Amanecida | Precios Amanecida | Tiene Evento |
|----------------|----------------|-----------|---------------|---------------------|-------------------|----------------|------------------|-------------------|-----------------|-------------------|--------------|
| ECPV001 | Villa Paradise | Premium | SI | PISCINA\nJACUZZI\nBAÑOS | regular:12000\|cliente:15000\|oferta:10000\|temporada_alta:18000\|cliente_alta:22000 | DOP | 9:00 AM | 8:00 PM | SI | regular:18000\|cliente:22000 | NO |

---

## 📄 Hoja 2: SERVICIOS EXTRA

### Columnas

| Columna | Obligatorio | Descripción | Ejemplo |
|---------|-------------|-------------|---------|
| **Nombre Servicio *** | Sí | Nombre del servicio | DJ |
| **Precio *** | Sí | Precio base del servicio | 8000 |
| Descripción | No | Descripción del servicio | Música variada, equipo profesional |

**NOTA:** Los suplidores se configuran desde la UI de VillasManagement, no desde Excel.

---

## 📄 Hoja 3: CLIENTES

### Columnas

| Columna | Obligatorio | Descripción | Ejemplo |
|---------|-------------|-------------|---------|
| **Nombre *** | Sí | Nombre completo | Juan Pérez |
| Teléfono | No | Teléfono de contacto | 809-555-1234 |
| Email | No | Correo electrónico | juan@example.com |
| Dirección | No | Dirección física | Calle Principal #123 |

---

## 📄 Hoja 4: CATEGORÍAS

### Columnas

| Columna | Obligatorio | Descripción | Ejemplo |
|---------|-------------|-------------|---------|
| **Nombre Categoría *** | Sí | Nombre de categoría | Premium |
| Descripción | No | Descripción | Villas de lujo con amenidades exclusivas |

---

## 📄 Hoja 5: PROPIETARIOS

### Columnas

| Columna | Obligatorio | Descripción | Ejemplo |
|---------|-------------|-------------|---------|
| **Nombre *** | Sí | Nombre completo | María García |
| Teléfono | No | Teléfono de contacto | 809-555-5678 |
| Email | No | Correo electrónico | maria@example.com |

---

## 📄 Hoja 6: CATEGORÍAS GASTOS

### Columnas

| Columna | Obligatorio | Descripción | Ejemplo |
|---------|-------------|-------------|---------|
| **Nombre Categoría *** | Sí | Nombre de categoría | Electricidad |
| Descripción | No | Descripción | Gastos de servicio eléctrico |

---

## 🚀 PROCESO DE IMPORTACIÓN

1. **Preparar Excel** con las hojas correspondientes
2. **Verificar formato** de precios (usar `|` y `:` correctamente)
3. **Ir a Configuración → Importar Datos**
4. **Seleccionar archivo Excel**
5. **Revisar resultados:**
   - ✅ Creados: Registros nuevos
   - 🔄 Actualizados: Registros existentes
   - ❌ Errores: Registros con problemas

---

## ⚠️ NOTAS IMPORTANTES

1. **Códigos únicos:** Cada villa debe tener un código único
2. **Actualización:** Si el código ya existe, se ACTUALIZA el registro
3. **Precios obligatorios:** Al menos una modalidad debe tener precios
4. **Formato especial:** Respetar el formato `key:value|key:value` para precios
5. **Suplidores:** Se configuran desde la UI, no desde Excel
6. **Descripción multilinea:** Usar `\n` para saltos de línea en descripciones

---

## 📊 EJEMPLO DE ARCHIVO EXCEL

Nombre sugerido: `espacios_con_piscina_import.xlsx`

**Hojas requeridas:**
- ✅ Villas (obligatoria)
- ✅ Servicios Extra (obligatoria)
- ✅ Clientes (opcional)
- ✅ Categorías (opcional)
- ✅ Propietarios (opcional)
- ✅ Categorías Gastos (opcional)

---

## 🆘 PROBLEMAS COMUNES

### Error: "Precios Pasadía es obligatorio"
**Solución:** Agregar al menos `regular:X|cliente:Y` en la columna

### Error: "Código Villa es obligatorio"
**Solución:** Asegurar que la columna tenga un valor (ej: ECPV001)

### Precios no se crean correctamente
**Solución:** Verificar formato exacto: `regular:12000|cliente:15000` (sin espacios extra)

---

**Última actualización:** Noviembre 2024
**Versión:** 2.0 - Sistema de Modalidades
