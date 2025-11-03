# Espacios Con Piscina - Aplicación de Escritorio

## 📋 Descripción

Sistema completo de gestión de villas con:
- Gestión de Reservaciones con facturación
- Gestión de Clientes
- Gestión de Villas y Servicios Extra
- Control de Gastos con pagos parciales
- Dashboard con estadísticas
- Sistema de usuarios (Admin/Empleado)
- Base de datos en la nube (MongoDB Atlas)

## 🚀 Características Principales

### Para Administradores
- ✅ Crear, editar y eliminar reservaciones
- ✅ Generar facturas personalizadas con logo
- ✅ Gestionar clientes con identificación (Cedula/Pasaporte/RNC)
- ✅ Administrar villas y categorías
- ✅ Control completo de gastos y abonos
- ✅ Dashboard con información financiera
- ✅ Gestión de usuarios del sistema

### Para Empleados
- ✅ Crear y ver reservaciones
- ✅ Gestionar clientes
- ✅ Ver villas disponibles
- ✅ Dashboard básico (sin información financiera)

## 💻 Versiones Disponibles

### Versión Web (Actual)
Accede desde cualquier navegador: https://piscina-invoice.preview.emergentagent.com

### Versión Desktop (En Desarrollo)
Aplicación de escritorio para Windows con:
- Icono en el escritorio
- Acceso directo sin navegador
- Misma funcionalidad que la web
- Conexión automática a la base de datos en la nube

## 🔧 Instalación de la Versión Desktop

### Requisitos Previos
- Windows 10 o Windows 11
- Conexión a Internet (para acceder a la base de datos)

### Pasos de Instalación

1. **Descargar el Instalador**
   - Ejecuta el archivo: `EspaciosConPiscina-Setup-1.0.0.exe`

2. **Instalar la Aplicación**
   - Sigue el asistente de instalación
   - Elige la carpeta de instalación (por defecto: `C:\Program Files\Espacios Con Piscina`)
   - Marca la opción "Crear acceso directo en el escritorio"

3. **Ejecutar la Aplicación**
   - Haz doble clic en el icono del escritorio: **Espacios Con Piscina**
   - La aplicación se abrirá automáticamente
   - Inicia sesión con tu usuario y contraseña

## 👥 Gestión de Usuarios

### Crear Nuevos Usuarios (Solo Admin)

1. Inicia sesión como administrador
2. Ve al menú lateral: **Usuarios**
3. Click en **+ Nuevo Usuario**
4. Completa el formulario:
   - Nombre de Usuario (único)
   - Email (único)
   - Nombre Completo
   - Rol: Administrador o Empleado
   - Contraseña
5. Click en **Crear Usuario**

### Usuarios Actuales

**Administrador Principal:**
- Usuario: `admin`
- Contraseña: `admin123`

> ⚠️ **IMPORTANTE**: Cambia la contraseña del administrador después de la primera instalación

## 🌐 Conexión a Internet

La aplicación requiere conexión a internet para:
- Acceder a la base de datos en MongoDB Atlas
- Sincronizar información entre todas las PCs
- Guardar cambios en tiempo real

### ¿Qué pasa si se va la luz?

✅ **Tus datos están seguros**: Toda la información está guardada en la nube (MongoDB Atlas)

✅ **Al regresar la luz**: 
1. Enciende la PC
2. Conecta a Internet
3. Abre la aplicación
4. Todo estará como lo dejaste

❌ **Sin conexión a internet**: La aplicación no podrá acceder a los datos

## 🔒 Seguridad

- ✅ Base de datos encriptada en MongoDB Atlas
- ✅ Contraseñas hasheadas con bcrypt
- ✅ Autenticación con JWT tokens
- ✅ Control de permisos por roles
- ✅ Prevención de múltiples instancias

## 📊 Base de Datos

**MongoDB Atlas (Gratuito)**
- 512MB de almacenamiento
- Suficiente para ~60 reservas mensuales
- Backups automáticos
- Accesible desde cualquier lugar

## 🛠️ Solución de Problemas

### La aplicación no abre
1. Verifica que tienes conexión a internet
2. Cierra todas las instancias de la aplicación
3. Intenta abrir nuevamente

### No puedo iniciar sesión
1. Verifica que tu usuario esté activo
2. Contacta al administrador para restablecer contraseña
3. Verifica la conexión a internet

### Los cambios no se guardan
1. Verifica la conexión a internet
2. Revisa que no haya errores en pantalla
3. Intenta cerrar y abrir la aplicación

## 📞 Soporte

Para asistencia técnica o dudas sobre la aplicación, contacta al administrador del sistema.

## 📝 Notas Importantes

1. **Instalar en todas las PCs**: Cada empleado/admin debe instalar la aplicación en su PC
2. **Mismo usuario**: Puedes usar el mismo usuario en múltiples PCs
3. **Datos compartidos**: Todos ven la misma información en tiempo real
4. **Internet obligatorio**: La aplicación no funciona sin conexión
5. **Actualizaciones**: Se notificarán nuevas versiones automáticamente

## 🎯 Próximas Mejoras

- [ ] Modo offline con sincronización automática
- [ ] Notificaciones de escritorio para recordatorios
- [ ] Reportes en PDF exportables
- [ ] Integración con WhatsApp para envío de facturas

---

**Versión**: 1.0.0  
**Última Actualización**: Octubre 2025  
**Desarrollado para**: Espacios Con Piscina, República Dominicana
