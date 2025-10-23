# 🚀 Guía de Deployment - Espacios Con Piscina

Esta guía te ayudará a deployar tu aplicación en servicios gratuitos (Vercel + Render + MongoDB Atlas).

## 📌 Requisitos Previos

1. Cuenta de GitHub (para guardar el código)
2. Cuenta de MongoDB Atlas (base de datos - GRATIS)
3. Cuenta de Render.com (backend - GRATIS)
4. Cuenta de Vercel (frontend - GRATIS)

---

## PASO 1️⃣: Configurar MongoDB Atlas (Base de Datos)

### 1.1 Crear Cuenta y Cluster

1. Ve a: https://www.mongodb.com/cloud/atlas/register
2. Crea una cuenta gratuita
3. Crea un nuevo proyecto: "Espacios Con Piscina"
4. Crea un cluster GRATUITO (M0 Sandbox):
   - Cloud Provider: AWS
   - Region: Elige la más cercana a tu ubicación
   - Cluster Name: `espacios-piscina-cluster`
5. Click "Create Cluster" (tarda 3-5 minutos)

### 1.2 Configurar Seguridad

**Crear Usuario de Base de Datos:**
1. En el menú lateral: `Security` → `Database Access`
2. Click "Add New Database User"
3. Authentication Method: `Password`
4. Username: `admin_espacios`
5. Password: Genera una contraseña segura (guárdala, la necesitarás)
6. Database User Privileges: `Atlas admin`
7. Click "Add User"

**Configurar IP Whitelist:**
1. En el menú lateral: `Security` → `Network Access`
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (o agrega `0.0.0.0/0`)
4. Click "Confirm"

### 1.3 Obtener Connection String

1. Ve a `Database` → Click en "Connect" de tu cluster
2. Click "Connect your application"
3. Driver: `Python` / Version: `3.11 or later`
4. Copia el connection string:
   ```
   mongodb+srv://admin_espacios:<password>@espacios-piscina-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. **Reemplaza `<password>` con tu contraseña real**
6. Agrega el nombre de la base de datos al final:
   ```
   mongodb+srv://admin_espacios:TU_PASSWORD@espacios-piscina-cluster.xxxxx.mongodb.net/espacios_piscina?retryWrites=true&w=majority
   ```
7. **GUARDA ESTE STRING** (lo necesitarás en el siguiente paso)

---

## PASO 2️⃣: Guardar Código en GitHub

### 2.1 Desde Emergent

1. Click en el botón **"Save to GitHub"** en la interfaz de Emergent
2. Conecta tu cuenta de GitHub si no lo has hecho
3. Selecciona/crea un repositorio: `espacios-con-piscina`
4. Branch: `main`
5. Click "PUSH TO GITHUB"

### 2.2 Verificar en GitHub

1. Ve a https://github.com/tu-usuario/espacios-con-piscina
2. Verifica que existan las carpetas `frontend/` y `backend/`

---

## PASO 3️⃣: Deploy Backend en Render.com

### 3.1 Crear Cuenta

1. Ve a: https://render.com/
2. Click "Get Started"
3. Regístrate con tu cuenta de GitHub

### 3.2 Crear Web Service

1. En el Dashboard, click "New +"
2. Selecciona "Web Service"
3. Conecta tu repositorio de GitHub: `espacios-con-piscina`
4. Click "Connect"

### 3.3 Configurar el Service

**Configuración Básica:**
- **Name**: `espacios-piscina-api`
- **Region**: Oregon (US West) o el más cercano
- **Branch**: `main`
- **Root Directory**: `backend`
- **Runtime**: `Python 3`
- **Build Command**:
  ```bash
  pip install -r requirements.txt
  ```
- **Start Command**:
  ```bash
  uvicorn server:app --host 0.0.0.0 --port $PORT
  ```

**Plan:**
- Selecciona: **Free** (gratis)

### 3.4 Agregar Variables de Entorno

En la sección "Environment Variables", agrega:

1. **MONGO_URL**
   - Value: Tu connection string de MongoDB Atlas
   ```
   mongodb+srv://admin_espacios:TU_PASSWORD@espacios-piscina-cluster.xxxxx.mongodb.net/espacios_piscina?retryWrites=true&w=majority
   ```

2. **JWT_SECRET**
   - Value: Genera un string aleatorio (ej: `mi_secreto_super_seguro_12345`)

3. Click "Create Web Service"

### 3.5 Esperar Deployment

- El deployment tarda 2-5 minutos
- Verás logs en tiempo real
- Cuando termine, verás: ✅ "Live"
- Copia tu URL del backend (ej: `https://espacios-piscina-api.onrender.com`)

⚠️ **GUARDA ESTA URL** - La necesitarás para el frontend

---

## PASO 4️⃣: Deploy Frontend en Vercel

### 4.1 Crear Cuenta

1. Ve a: https://vercel.com/signup
2. Regístrate con tu cuenta de GitHub

### 4.2 Importar Proyecto

1. Click "Add New..." → "Project"
2. Encuentra tu repositorio: `espacios-con-piscina`
3. Click "Import"

### 4.3 Configurar Deployment

**Configuración Básica:**
- **Framework Preset**: `Create React App`
- **Root Directory**: `frontend`
- **Build Command**: (déjalo como está - auto-detectado)
- **Output Directory**: `build`
- **Install Command**: (déjalo como está)

### 4.4 Agregar Variables de Entorno

En "Environment Variables", agrega:

1. **REACT_APP_BACKEND_URL**
   - Value: La URL de tu backend en Render
   ```
   https://espacios-piscina-api.onrender.com
   ```
   ⚠️ **SIN slash al final**

2. Click "Deploy"

### 4.5 Esperar Deployment

- El deployment tarda 1-3 minutos
- Cuando termine, verás: "🎉 Congratulations!"
- Tu app estará en: `https://espacios-con-piscina.vercel.app`

---

## PASO 5️⃣: Crear Usuario Admin Inicial

Una vez que ambos servicios estén desplegados, necesitas crear el primer usuario admin.

### Opción: Manualmente en MongoDB Atlas

1. Ve a MongoDB Atlas → Tu cluster
2. Click "Browse Collections"
3. Database: `espacios_piscina`
4. Collection: `users` (créala si no existe)
5. Click "Insert Document"
6. Pega este JSON:
   ```json
   {
     "id": "admin-001",
     "username": "admin",
     "email": "admin@espaciosconpiscina.com",
     "full_name": "Administrador",
     "hashed_password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIeWU2u3ZC",
     "role": "admin",
     "created_at": "2025-01-22T00:00:00Z"
   }
   ```
   - Usuario: `admin`
   - Contraseña: `admin123`
7. Click "Insert"

⚠️ **IMPORTANTE**: Cambia la contraseña después del primer login.

---

## 🎉 ¡LISTO! Tu Aplicación Está en Producción

### Accede a tu aplicación:
- **Frontend**: https://espacios-con-piscina.vercel.app
- **Backend API**: https://espacios-piscina-api.onrender.com/api/docs

### Credenciales iniciales:
- **Username**: `admin`
- **Password**: `admin123`

---

## 🔄 Actualizaciones Futuras

Cada vez que hagas cambios en Emergent:

1. Guarda en GitHub con "Save to GitHub"
2. Vercel y Render detectarán los cambios automáticamente
3. Se re-desplegarán en 2-5 minutos

---

## 🆘 Solución de Problemas Comunes

### Backend no inicia (Render)

1. Ve a "Logs" en Render
2. Busca errores de:
   - Instalación de dependencias
   - Connection string de MongoDB
   - Variables de entorno

**Solución común:**
- Verifica que `MONGO_URL` esté correctamente configurado
- Verifica que el IP `0.0.0.0/0` esté en whitelist de MongoDB

### Frontend no conecta con Backend

1. Verifica que `REACT_APP_BACKEND_URL` sea correcta
2. Debe ser: `https://tu-backend.onrender.com` (sin `/api` al final)
3. Verifica en Vercel → Settings → Environment Variables
4. Si cambias una variable, debes re-deployar: "Deployments" → "..." → "Redeploy"

### Plan Free de Render se duerme

El plan gratuito de Render "duerme" el servicio después de 15 minutos de inactividad:
- **Síntoma**: Primera carga tarda 30-60 segundos
- **Solución**: El servicio se "despierta" automáticamente
- **Alternativa**: Upgrade a plan pagado ($7/mes) para mantenerlo siempre activo

---

## 💰 Costos

Todo es **100% GRATIS** con estas limitaciones:

**MongoDB Atlas (M0 Free Tier):**
- 512 MB de almacenamiento
- Suficiente para ~1000 reservaciones

**Render (Free Plan):**
- 512 MB RAM
- Se duerme después de 15 min inactivos
- 750 horas/mes gratis

**Vercel (Hobby Plan):**
- 100 GB bandwidth/mes
- Deployments ilimitados
- HTTPS automático

---

## ✅ Checklist Final

- [ ] MongoDB Atlas cluster creado y configurado
- [ ] Usuario de base de datos creado
- [ ] IP whitelist configurado (0.0.0.0/0)
- [ ] Connection string guardado
- [ ] Código guardado en GitHub
- [ ] Backend desplegado en Render
- [ ] Variables de entorno del backend configuradas
- [ ] Backend funcionando (check /api/docs)
- [ ] Frontend desplegado en Vercel
- [ ] Variable REACT_APP_BACKEND_URL configurada
- [ ] Usuario admin creado en la base de datos
- [ ] Primer login exitoso
- [ ] Contraseña del admin cambiada

---

**¿Necesitas ayuda?** Consulta los logs de cada servicio para troubleshooting.
