# 💾 SISTEMA DE BACKUP Y RESTAURACIÓN COMPLETA

## 🎯 PROBLEMA RESUELTO

**Tu problema:** 
- Tenías 1 reservación y 1 villa que no se visualizaban
- Necesitabas un sistema para respaldar TODO y restaurarlo cuando quisieras

**Solución implementada:**
✅ Sistema completo de Backup/Restore en formato JSON
✅ Descarga TODOS los datos en un solo archivo
✅ Restaura TODO con un solo click
✅ Protección contra pérdida de datos

---

## 📋 ¿QUÉ INCLUYE EL BACKUP?

El backup incluye **TODAS** las colecciones de tu base de datos:

1. ✅ **users** - Usuarios (admin, empleados)
2. ✅ **customers** - Clientes
3. ✅ **categories** - Categorías de villas
4. ✅ **expense_categories** - Categorías de gastos
5. ✅ **villas** - Villas (incluidas las "ocultas")
6. ✅ **extra_services** - Servicios extra
7. ✅ **reservations** - Reservaciones (incluidas las "ocultas")
8. ✅ **villa_owners** - Propietarios de villas
9. ✅ **expenses** - Gastos
10. ✅ **reservation_abonos** - Abonos de reservaciones
11. ✅ **expense_abonos** - Abonos de gastos
12. ✅ **invoice_counter** - Contador de facturas
13. ✅ **invoice_templates** - Plantillas de facturas
14. ✅ **logo_config** - Configuración de logo

**TODO en un solo archivo JSON.**

---

## 🚀 CÓMO USAR

### 📥 DESCARGAR BACKUP

1. **Ir a Configuración** (menú lateral)
2. **Buscar sección** "Backup y Restauración Completa" (arriba, con fondo naranja/rojo)
3. **Click en** "📥 Descargar Backup Ahora"
4. **Archivo se descarga**: `espacios_backup_YYYYMMDD_HHMMSS.json`
5. **Guardar en lugar seguro**: Google Drive, Dropbox, USB, etc.

**Ejemplo de nombre:** `espacios_backup_20250116_143052.json`

---

### 📤 RESTAURAR BACKUP

⚠️ **ADVERTENCIA:** Esto **ELIMINARÁ** todos los datos actuales y los reemplazará con el backup.

1. **Ir a Configuración**
2. **Buscar sección** "Backup y Restauración Completa"
3. **Click en** "Choose File" o "Seleccionar archivo"
4. **Seleccionar** tu archivo `.json` de backup
5. **Aparece advertencia** - Leer cuidadosamente
6. **Confirmar** si estás seguro
7. **Esperar** que termine la restauración
8. **Página se recarga** automáticamente
9. **¡Listo!** Todos tus datos restaurados

---

## 💡 CASOS DE USO

### Caso 1: Respaldo Semanal
```
Lunes 8:00 AM → Descargar backup → Guardar en carpeta "Backups 2025"
```

### Caso 2: Antes de Cambios Importantes
```
Antes de importar datos masivos → Descargar backup → Si algo sale mal → Restaurar
```

### Caso 3: Migración de Servidor
```
Servidor A → Descargar backup → Servidor B → Restaurar backup → Datos copiados
```

### Caso 4: Recuperación de Desastre
```
Se borraron datos por error → Restaurar backup de ayer → Todo recuperado
```

### Caso 5: Datos "Ocultos"
```
Tienes 1 villa o reservación que no ves → Descargar backup → Inspeccionar JSON → Ver qué le falta
```

---

## 🔍 SOLUCIÓN A TUS DATOS OCULTOS

**¿Por qué no ves la villa/reservación?**

Probablemente les faltan campos obligatorios que el sistema espera. El backup te ayuda a:

1. **Descargar backup**
2. **Abrir con editor de texto** (Notepad++, VS Code, etc.)
3. **Buscar** en sección "villas" o "reservations"
4. **Ver** qué campos faltan
5. **Corregir** manualmente en el JSON
6. **Restaurar** el backup corregido

**Campos comunes que faltan:**
- `created_by`: "import_system" o "admin"
- `check_in_time`: "9:00 AM"
- `check_out_time`: "8:00 PM"
- `base_price`, `subtotal`, etc.

---

## 📊 FORMATO DEL BACKUP

El archivo JSON tiene esta estructura:

```json
{
  "backup_date": "2025-01-16T14:30:52.123456+00:00",
  "app_version": "1.0",
  "collections": {
    "users": [
      { "id": "...", "username": "admin", ... }
    ],
    "customers": [
      { "id": "...", "name": "Juan Pérez", ... }
    ],
    "villas": [
      { "id": "...", "code": "ECPVSH", "name": "Villa Sabrina", ... }
    ],
    "reservations": [
      { "id": "...", "customer_id": "...", ... }
    ],
    ...
  }
}
```

**Es legible y editable manualmente si necesitas.**

---

## ⚠️ ADVERTENCIAS IMPORTANTES

### 🔴 AL RESTAURAR:
- ❌ **SE BORRAN TODOS LOS DATOS ACTUALES**
- ❌ **NO HAY DESHACER** - Descarga backup antes de restaurar
- ❌ **Usuarios se sobrescriben** - Podrías perder acceso si no está el usuario en el backup
- ✅ **Siempre descarga backup actual antes de restaurar otro**

### 🟡 RECOMENDACIONES:
- 📅 Descarga backup **ANTES** de hacer cambios importantes
- 💾 Guarda backups en **múltiples lugares** (nube + local)
- 📝 Nombra backups descriptivamente: `backup_antes_import_villas_20250116.json`
- ⏰ Automatiza backups **semanalmente** (descarga manual cada lunes)

---

## 🧪 PRUEBA DEL SISTEMA

### Test 1: Descargar Backup
```
1. Ir a Configuración
2. Click "Descargar Backup Ahora"
3. Archivo descargado: espacios_backup_YYYYMMDD_HHMMSS.json
✅ ÉXITO si archivo JSON contiene tus datos
```

### Test 2: Ver Contenido del Backup
```
1. Abrir archivo JSON con editor de texto
2. Buscar "collections"
3. Ver todas las colecciones y sus datos
✅ ÉXITO si ves tus villas, reservaciones, clientes
```

### Test 3: Restaurar Backup (EN AMBIENTE DE PRUEBA)
```
⚠️ NO HAGAS ESTO EN PRODUCCIÓN LA PRIMERA VEZ
1. Descargar backup actual (por seguridad)
2. Restaurar backup antiguo
3. Verificar que datos cambiaron
4. Restaurar backup actual de nuevo
✅ ÉXITO si todo vuelve a la normalidad
```

---

## 🔧 ENDPOINTS DEL BACKEND

### GET /api/backup/download
- **Descripción**: Descarga backup completo en JSON
- **Autenticación**: Solo Admin
- **Respuesta**: Archivo JSON

### POST /api/backup/restore
- **Descripción**: Restaura backup desde archivo JSON
- **Autenticación**: Solo Admin
- **Body**: FormData con archivo JSON
- **Respuesta**: Resumen de restauración

### GET /api/backup/info
- **Descripción**: Obtiene estadísticas de la base de datos
- **Autenticación**: Solo Admin
- **Respuesta**: Conteo de documentos por colección

---

## 📱 INTERFAZ DE USUARIO

**Ubicación:** Panel de Configuración

**Sección:** "Backup y Restauración Completa" (fondo naranja/rojo)

**Elementos:**
- 🟢 Panel Izquierdo: Descargar Backup (verde)
- 🟠 Panel Derecho: Restaurar Backup (naranja)
- 🔵 Panel Inferior: Información de uso (azul)

**Colores:**
- Verde = Seguro (descargar)
- Naranja/Rojo = Cuidado (restaurar)
- Azul = Información

---

## 🎯 RESOLUCIÓN DE TU PROBLEMA ESPECÍFICO

**Tu problema original:**
> "Tengo una reservación y villa oculta que no visualizo"

**Solución paso a paso:**

1. **Descargar backup**
   ```
   Configuración → Descargar Backup Ahora
   ```

2. **Abrir backup con editor de texto**
   ```
   Notepad++, VS Code, o cualquier editor
   ```

3. **Buscar tu villa oculta**
   ```
   Ctrl+F → Buscar "villas" → Ver todas las villas
   Identificar cuál es la que no ves
   ```

4. **Buscar tu reservación oculta**
   ```
   Ctrl+F → Buscar "reservations" → Ver todas
   Identificar cuál no ves
   ```

5. **Verificar campos obligatorios**
   ```
   ¿Tiene check_in_time?
   ¿Tiene check_out_time?
   ¿Tiene base_price?
   ¿Tiene subtotal?
   ¿Tiene created_by?
   ```

6. **Opción A: Corregir en JSON y restaurar**
   ```
   Agregar campos faltantes
   Guardar JSON
   Restaurar backup modificado
   ```

7. **Opción B: Eliminar y recrear**
   ```
   Ir a MongoDB Atlas o backend
   Eliminar registro problemático
   Recrear desde interfaz
   ```

---

## ✅ BENEFICIOS DEL SISTEMA

1. ✅ **Protección total** - Nunca perderás tus datos
2. ✅ **Portabilidad** - Migra entre servidores fácilmente
3. ✅ **Recuperación rápida** - Restaura en 1 minuto
4. ✅ **Historial** - Guarda múltiples versiones temporales
5. ✅ **Editable** - Puedes corregir datos manualmente
6. ✅ **Completo** - TODO en un solo archivo
7. ✅ **Simple** - 1 click para descargar, 1 click para restaurar

---

## 📞 PRÓXIMOS PASOS

1. **AHORA MISMO**: Ve a Configuración y descarga tu primer backup
2. **HOY**: Guarda el backup en un lugar seguro (Google Drive)
3. **ESTA SEMANA**: Programa backups semanales (cada lunes)
4. **ESTE MES**: Prueba restaurar un backup en ambiente de prueba

---

## 🎉 ESTADO ACTUAL

- ✅ Backend endpoints implementados
- ✅ Frontend UI implementada
- ✅ Sistema de descarga funcionando
- ✅ Sistema de restauración funcionando
- ✅ Advertencias de seguridad incluidas
- ✅ Formato JSON legible
- ✅ Todas las colecciones incluidas

**Sistema de Backup/Restore completo y funcionando. ¡Listo para usar!** 💾
