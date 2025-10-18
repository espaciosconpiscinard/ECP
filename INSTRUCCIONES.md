# 🏖️ Sistema de Gestión de Villas

Sistema completo para gestionar el negocio de alquiler de villas, incluyendo reservaciones, propietarios, gastos y más.

## 🚀 Inicio Rápido

### Acceso al Sistema

La aplicación está disponible en: `https://espanol-amigo-7.preview.emergentagent.com`

### Usuarios Predefinidos

**Administrador:**
- Usuario: `admin`
- Contraseña: `admin123`
- Permisos: Acceso completo a todas las funcionalidades

**Empleado:**
- Usuario: `empleado`
- Contraseña: `empleado123`
- Permisos: Puede registrar clientes, reservaciones, ver reportes

## 📋 Funcionalidades Principales

### 1. Dashboard
- Resumen general del negocio
- Estadísticas de ingresos en DOP y USD
- Reservaciones pendientes de pago
- Total de propietarios
- Gastos totales
- Lista de reservaciones recientes
- Alertas de pagos pendientes

### 2. Reservaciones / Facturas
**Características:**
- ✅ Crear nuevas reservaciones con datos del cliente
- ✅ Seleccionar moneda (DOP o USD)
- ✅ Ingresar total, depósito y monto pagado
- ✅ **Cálculo automático del restante**
- ✅ Agregar horas extras y su costo
- ✅ Agregar personas adicionales y su costo
- ✅ Editar reservaciones existentes
- ✅ **Imprimir facturas** con un clic
- ✅ Botón "Cliente Rápido" para agregar clientes sobre la marcha
- ✅ Búsqueda por cliente, villa o número de factura
- ✅ Estados: Pendiente, Confirmada, Completada, Cancelada

**Flujo de trabajo:**
1. Hacer clic en "Nueva Reservación"
2. Si el cliente no existe, usar "Cliente Rápido" para agregarlo
3. Seleccionar el cliente de la lista
4. Llenar los datos de la villa, fechas, huéspedes
5. Ingresar el total y monto pagado
6. El sistema calcula automáticamente el restante
7. Guardar y/o Imprimir la factura

### 3. Propietarios de Villas
**Características:**
- ✅ Registrar propietarios con sus datos de contacto
- ✅ Asignar villas a cada propietario
- ✅ Configurar porcentaje de comisión
- ✅ Ingresar total a pagar
- ✅ Registrar abonos/pagos
- ✅ **Cálculo automático del restante**
- ✅ Ver historial completo de pagos
- ✅ Actualizar montos cuando sea necesario

**Flujo de trabajo:**
1. Agregar nuevo propietario con sus datos
2. Asignar las villas que le pertenecen
3. Actualizar el "Total a Pagar" cuando corresponda
4. Registrar pagos con el botón "Pago"
5. Ver el restante actualizado automáticamente
6. Consultar historial de pagos

### 4. Gastos y Compromisos
**Características:**
- ✅ Registrar diferentes tipos de gastos:
  - Pago de Local
  - Nómina
  - Gastos Variables
  - Otros
- ✅ Soporte para DOP y USD
- ✅ Estado de pago (Pagado/Pendiente)
- ✅ Filtrar por categoría
- ✅ Ver totales por moneda
- ✅ Editar y eliminar gastos

### 5. Gestión de Usuarios (Solo Admin)
- Los administradores pueden crear nuevos usuarios
- Asignar roles: Administrador o Empleado

## 💰 Monedas Soportadas

El sistema maneja dos monedas:
- **DOP** - Pesos Dominicanos (RD$)
- **USD** - Dólares ($)

Todos los reportes y estadísticas separan los montos por moneda.

## 🎯 Características Especiales

### Cálculos Automáticos
- ✅ **Restante en Reservaciones**: Total - Pagado = Restante
- ✅ **Restante en Propietarios**: Total Adeudado - Pagado = Restante
- ✅ Los cálculos se actualizan automáticamente al cambiar los valores

### Sistema de Impresión
- Cada reservación puede imprimirse como factura
- La factura incluye:
  - Número de factura único
  - Datos del cliente
  - Detalles de la reservación
  - Desglose de pagos
  - Restante a pagar destacado
  - Horas extras y personas adicionales si aplican

### Notificaciones Visuales
- Pagos pendientes en color naranja
- Pagos completados en color verde
- Alertas en el dashboard de reservaciones con saldo pendiente

## 📱 Interfaz Responsive
- Funciona en computadoras, tablets y teléfonos
- Menú lateral colapsable en móviles
- Tablas con scroll horizontal para mejor visualización

## 🔐 Seguridad
- Autenticación con JWT (tokens seguros)
- Permisos basados en roles
- Los empleados no pueden eliminar registros
- Solo los administradores pueden borrar datos

## 📊 Base de Datos
- MongoDB para almacenamiento de datos
- Búsquedas rápidas y eficientes
- Respaldos automáticos

## 🛠️ Tecnología
- **Frontend**: React + Tailwind CSS
- **Backend**: FastAPI (Python)
- **Base de Datos**: MongoDB
- **Autenticación**: JWT

## 📝 Consejos de Uso

1. **Para Empleados**:
   - Registra clientes al momento de hacer reservaciones
   - Siempre verifica que el monto pagado esté correcto
   - Imprime la factura para entregarla al cliente

2. **Para Administradores**:
   - Revisa el dashboard diariamente
   - Mantén actualizado el registro de propietarios
   - Registra los gastos regularmente
   - Crea usuarios para tus empleados

3. **Buenas Prácticas**:
   - Actualiza los pagos tan pronto se reciban
   - Mantén notas detalladas en cada registro
   - Revisa los reportes de pagos pendientes
   - Actualiza los estados de las reservaciones

## 🎨 Navegación

El menú lateral incluye:
- 🏠 Dashboard - Vista general
- 📄 Reservaciones - Gestión de reservas y facturas
- 🏢 Propietarios - Gestión de propietarios y pagos
- 💵 Gastos - Registro de gastos y compromisos

## 🚨 Soporte

Si necesitas ayuda o encuentras algún problema:
1. Revisa este documento
2. Contacta al administrador del sistema
3. Los cambios se guardan automáticamente, no perderás información

## 🎉 ¡Listo para usar!

El sistema está completamente funcional y listo para gestionar tu negocio de villas. ¡Comienza a usarlo ahora!

---

**Versión**: 1.0
**Última actualización**: Octubre 2025
