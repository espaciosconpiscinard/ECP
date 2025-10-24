# Espacios Con Piscina - Sistema de Gestión de Villas

## 📋 Descripción

Sistema completo de gestión para alquiler de villas con piscina. Incluye gestión de reservaciones, clientes, gastos, abonos, facturación y más.

## ✨ Funcionalidades Principales

### 🏠 Gestión de Villas
- Crear y administrar villas con precios personalizados
- Categorías de villas
- Horarios personalizados (check-in/check-out)
- Servicios adicionales
- Depósitos de seguridad

### 👥 Gestión de Clientes
- Base de datos de clientes
- Búsqueda por nombre o documento
- Historial de reservaciones
- Multi-selección y eliminación masiva

### 📅 Reservaciones
- Sistema de reservaciones con tipos (pasadía, amanecida, evento)
- Facturación automática con números únicos
- Administradores pueden asignar números de factura manualmente
- Cálculo automático de totales con ITBIS
- Gestión de servicios adicionales
- Sistema de abonos con facturas individuales
- Impresión de facturas profesionales con historial completo de pagos
- Tarjetas resumen: Total reservaciones, pendientes, pagado, restante

### 💰 Gestión de Gastos
- Categorías de gastos: Fijo, Variable, Único, Compromiso
- Recordatorios de pago
- Gastos recurrentes automáticos
- Auto-generación de gastos de propietario
- Filtros avanzados: por mes, villa, propietario, factura
- Ordenamiento inteligente por urgencia
- Sistema de abonos con facturas individuales
- Totales agrupados por tipo de gasto

### 🧾 Sistema de Abonos
- Cada abono genera su propia factura única
- Empleados: números auto-generados
- Administradores: pueden asignar números manualmente
- Validación de duplicados
- Historial completo en facturas impresas
- Visualización de facturas de abonos en listas

### 📊 Dashboard
- Estadísticas en tiempo real
- Totales por mes
- Métricas de compromisos
- Análisis de ingresos y gastos

### 📄 Facturación
- Facturas profesionales personalizables
- Logo personalizado
- Historial completo de pagos (inicial + abonos)
- Impresión optimizada
- Editor de plantillas

### 📥 Importar/Exportar
- Descarga de plantilla Excel
- Exportación de reservaciones
- Importación masiva de datos históricos
- Auto-generación de gastos al importar

### 👤 Gestión de Usuarios
- Roles: Admin y Empleado
- Permisos diferenciados
- Autenticación JWT

## 🛠️ Stack Tecnológico

### Backend
- **FastAPI** (Python)
- **MongoDB** (Base de datos)
- **JWT** (Autenticación)
- **Pandas** (Exportación Excel)

### Frontend
- **React 19**
- **Tailwind CSS**
- **Radix UI** (Componentes)
- **React Router** (Navegación)
- **Axios** (HTTP Client)

## 🚀 Deployment

Ver [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) para instrucciones completas de deployment en:
- MongoDB Atlas (Base de datos)
- Render.com (Backend)
- Vercel (Frontend)

## 📦 Instalación Local

### Requisitos
- Python 3.11+
- Node.js 18+
- MongoDB

### Backend

```bash
cd backend
pip install -r requirements.txt

# Configurar .env
MONGO_URL=mongodb://localhost:27017/espacios_piscina
JWT_SECRET=tu_secret_key

# Iniciar servidor
uvicorn server:app --reload --port 8001
```

### Frontend

```bash
cd frontend
yarn install

# Configurar .env
REACT_APP_BACKEND_URL=http://localhost:8001

# Iniciar app
yarn start
```

Accede a: http://localhost:3000

## 👤 Usuario por Defecto

- **Username**: admin
- **Password**: admin123

⚠️ Cambiar la contraseña después del primer login

## 📝 Estructura del Proyecto

```
espacios-con-piscina/
├── backend/
│   ├── server.py          # API principal
│   ├── models.py          # Modelos de datos
│   ├── auth.py            # Autenticación
│   ├── database.py        # Conexión DB
│   ├── export_service.py  # Exportación Excel
│   ├── import_service.py  # Importación Excel
│   └── requirements.txt   # Dependencias
├── frontend/
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── context/       # Context API
│   │   └── lib/           # Utilidades
│   └── package.json       # Dependencias
├── DEPLOYMENT_GUIDE.md    # Guía de deployment
└── README.md              # Este archivo
```

## 🔒 Seguridad

- Autenticación JWT
- Passwords hasheados con bcrypt
- Roles y permisos
- Validación de datos con Pydantic
- CORS configurado

## 🤝 Contribuir

Este es un proyecto privado. Para solicitar cambios o reportar bugs, contacta al administrador.

## 📄 Licencia

Propietario: Espacios Con Piscina, SRL
Todos los derechos reservados.

## 📞 Soporte

- Teléfono: 829-953-8401
- WhatsApp: 829-904-4245
- RNC: 1-33-24652-1