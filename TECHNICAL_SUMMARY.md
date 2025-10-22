# 📋 Resumen Técnico - Sistema de Gestión de Villas

## 🏗️ Arquitectura del Sistema

### Stack Tecnológico
```
Frontend: React 19 + Tailwind CSS + shadcn/ui
Backend: FastAPI (Python 3.11)
Base de Datos: MongoDB
Autenticación: JWT (JSON Web Tokens)
```

### Estructura de Directorios
```
/app/
├── backend/
│   ├── server.py          # API principal con todos los endpoints
│   ├── models.py          # Modelos Pydantic para validación
│   ├── auth.py            # Sistema de autenticación JWT
│   ├── database.py        # Conexión y utilidades de MongoDB
│   ├── requirements.txt   # Dependencias Python
│   └── .env              # Variables de entorno
│
├── frontend/
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   │   ├── Login.js
│   │   │   ├── Layout.js
│   │   │   ├── Dashboard.js
│   │   │   ├── Reservations.js
│   │   │   ├── Owners.js
│   │   │   ├── Expenses.js
│   │   │   ├── CustomerDialog.js
│   │   │   └── ui/        # Componentes UI de shadcn
│   │   ├── context/
│   │   │   └── AuthContext.js  # Context de autenticación
│   │   ├── api/
│   │   │   └── api.js     # Funciones API
│   │   ├── App.js         # Componente principal
│   │   └── index.js       # Entry point
│   ├── package.json
│   └── .env
│
└── INSTRUCCIONES.md       # Guía de usuario
```

## 📊 Modelos de Datos

### User (Usuario)
```python
{
    "id": "uuid",
    "username": "string",
    "email": "string",
    "full_name": "string",
    "role": "admin" | "employee",
    "password_hash": "string",
    "created_at": "datetime",
    "is_active": "boolean"
}
```

### Customer (Cliente)
```python
{
    "id": "uuid",
    "name": "string",
    "phone": "string",
    "email": "string" (opcional),
    "identification": "string" (opcional),
    "address": "string" (opcional),
    "notes": "string" (opcional),
    "created_at": "datetime",
    "created_by": "user_id"
}
```

### Reservation (Reservación)
```python
{
    "id": "uuid",
    "customer_id": "uuid",
    "customer_name": "string",
    "villa_name": "string",
    "check_in": "datetime",
    "check_out": "datetime",
    "total_amount": "float",
    "deposit": "float",
    "amount_paid": "float",
    "balance_due": "float" (calculado),
    "currency": "DOP" | "USD",
    "guests": "integer",
    "extra_hours": "float",
    "extra_hours_cost": "float",
    "additional_guests": "integer",
    "additional_guests_cost": "float",
    "notes": "string",
    "status": "pending" | "confirmed" | "completed" | "cancelled",
    "invoice_number": "string" (generado),
    "created_at": "datetime",
    "updated_at": "datetime",
    "created_by": "user_id"
}
```

### VillaOwner (Propietario)
```python
{
    "id": "uuid",
    "name": "string",
    "phone": "string",
    "email": "string" (opcional),
    "villas": ["string"],
    "commission_percentage": "float",
    "total_owed": "float",
    "amount_paid": "float",
    "balance_due": "float" (calculado),
    "notes": "string",
    "created_at": "datetime",
    "created_by": "user_id"
}
```

### Payment (Pago a Propietario)
```python
{
    "id": "uuid",
    "owner_id": "uuid",
    "amount": "float",
    "currency": "DOP" | "USD",
    "payment_method": "string",
    "payment_date": "datetime",
    "notes": "string",
    "created_by": "user_id"
}
```

### Expense (Gasto)
```python
{
    "id": "uuid",
    "category": "local" | "nomina" | "variable" | "otros",
    "description": "string",
    "amount": "float",
    "currency": "DOP" | "USD",
    "expense_date": "datetime",
    "payment_status": "paid" | "pending",
    "notes": "string",
    "created_at": "datetime",
    "created_by": "user_id"
}
```

## 🔌 API Endpoints

### Autenticación
```
POST   /api/auth/register    # Registrar usuario
POST   /api/auth/login       # Iniciar sesión
GET    /api/auth/me          # Obtener usuario actual
```

### Clientes
```
GET    /api/customers        # Listar clientes
POST   /api/customers        # Crear cliente
GET    /api/customers/{id}   # Obtener cliente
DELETE /api/customers/{id}   # Eliminar cliente (admin)
```

### Reservaciones
```
GET    /api/reservations              # Listar reservaciones
POST   /api/reservations              # Crear reservación
GET    /api/reservations/{id}         # Obtener reservación
PUT    /api/reservations/{id}         # Actualizar reservación
DELETE /api/reservations/{id}         # Eliminar reservación (admin)
```

### Propietarios
```
GET    /api/owners                    # Listar propietarios
POST   /api/owners                    # Crear propietario
GET    /api/owners/{id}               # Obtener propietario
PUT    /api/owners/{id}               # Actualizar propietario
DELETE /api/owners/{id}               # Eliminar propietario (admin)
POST   /api/owners/{id}/payments      # Registrar pago
GET    /api/owners/{id}/payments      # Obtener pagos
PUT    /api/owners/{id}/amounts       # Actualizar montos
```

### Gastos
```
GET    /api/expenses                  # Listar gastos
POST   /api/expenses                  # Crear gasto
GET    /api/expenses/{id}             # Obtener gasto
PUT    /api/expenses/{id}             # Actualizar gasto
DELETE /api/expenses/{id}             # Eliminar gasto (admin)
```

### Dashboard
```
GET    /api/dashboard/stats           # Obtener estadísticas
```

### Health Check
```
GET    /api/health                    # Verificar estado del API
```

## 🔒 Seguridad

### Autenticación
- JWT con expiración de 7 días
- Contraseñas hasheadas con bcrypt
- Tokens Bearer en headers de autorización

### Autorización
- Middleware de autenticación en todos los endpoints protegidos
- Verificación de roles para operaciones administrativas
- Los empleados no pueden eliminar registros

### Variables de Entorno
```bash
# Backend (.env)
MONGO_URL=mongodb://localhost:27017
DB_NAME=villa_management
CORS_ORIGINS=*
JWT_SECRET_KEY=<secret-key>

# Frontend (.env)
REACT_APP_BACKEND_URL=https://villa-expense-mgr.preview.emergentagent.com
```

## 🚀 Deployment

### Servicios Ejecutándose (Supervisor)
```bash
- backend:  Puerto 8001 (FastAPI)
- frontend: Puerto 3000 (React Dev Server)
- mongodb:  Puerto 27017
- nginx:    Puerto 443/80 (Proxy)
```

### Comandos Útiles
```bash
# Reiniciar servicios
sudo supervisorctl restart all
sudo supervisorctl restart backend
sudo supervisorctl restart frontend

# Ver logs
tail -f /var/log/supervisor/backend.*.log
tail -f /var/log/supervisor/frontend.*.log

# Estado de servicios
sudo supervisorctl status
```

## 🎨 Frontend

### Componentes Principales
- **AuthContext**: Manejo de autenticación global
- **Layout**: Shell de la aplicación con navegación
- **Login**: Pantalla de inicio de sesión/registro
- **Dashboard**: Vista de estadísticas y resumen
- **Reservations**: CRUD completo de reservaciones
- **Owners**: CRUD completo de propietarios
- **Expenses**: CRUD completo de gastos
- **CustomerDialog**: Modal para crear clientes rápido

### Librerías UI
- shadcn/ui: Componentes base (Button, Input, Card, Dialog, etc.)
- Tailwind CSS: Estilos utilitarios
- Lucide React: Iconos
- Axios: Cliente HTTP
- React Router: Navegación

## 🧪 Testing

### Datos de Prueba Iniciales

**Usuarios:**
```
Admin:
  username: admin
  password: admin123

Empleado:
  username: empleado
  password: empleado123
```

### Pruebas Manuales Recomendadas
1. ✅ Login con ambos usuarios
2. ✅ Crear cliente
3. ✅ Crear reservación
4. ✅ Editar reservación
5. ✅ Imprimir factura
6. ✅ Crear propietario
7. ✅ Registrar pago a propietario
8. ✅ Ver historial de pagos
9. ✅ Crear gasto
10. ✅ Ver dashboard con estadísticas

## 📈 Características Clave

### Cálculos Automáticos
- Balance en reservaciones: `total_amount - amount_paid`
- Balance en propietarios: `total_owed - amount_paid`
- Actualizaciones automáticas al modificar montos

### Generación de Facturas
- Número único basado en timestamp
- Impresión directa desde el navegador
- Formato profesional con todos los detalles

### Multi-moneda
- Soporte completo para DOP y USD
- Conversiones y totales separados
- Reportes por moneda

### Búsqueda y Filtros
- Búsqueda en reservaciones por cliente, villa o factura
- Filtros por categoría en gastos
- Filtros por estado en reservaciones

## 🔧 Mantenimiento

### Base de Datos
```javascript
// Colecciones MongoDB
- users
- customers
- reservations
- villa_owners
- owner_payments
- expenses
```

### Backup Recomendado
```bash
# Backup de MongoDB
mongodump --db villa_management --out /backup/$(date +%Y%m%d)

# Restore
mongorestore --db villa_management /backup/YYYYMMDD/villa_management
```

## 🎯 Mejoras Futuras (Opcional)

1. Dashboard con gráficos (Chart.js)
2. Exportar reportes a Excel/PDF
3. Notificaciones por email
4. Sistema de recordatorios automáticos
5. App móvil nativa
6. Integración con WhatsApp
7. Firma digital en facturas
8. Multi-idioma
9. Calendario visual de reservaciones
10. Sistema de comisiones automático

## 📞 Información de Contacto Técnico

**Estructura del Proyecto**: Full-stack moderna con separación frontend/backend
**Base de Datos**: NoSQL (MongoDB) para flexibilidad
**API**: RESTful con documentación automática (FastAPI)
**UI/UX**: Moderna, responsive y profesional

---

**Estado**: ✅ Producción - Completamente funcional
**Versión**: 1.0.0
**Fecha**: Octubre 2025
