# 🚀 Guía de Deployment - Espacios Con Piscina

Esta guía te ayudará a deployar tu aplicación en servicios gratuitos.

## 📌 Lo que necesitas:

1. Cuenta de GitHub
2. Cuenta de MongoDB Atlas (base de datos - GRATIS)
3. Cuenta de Render.com (backend - GRATIS)
4. Cuenta de Vercel (frontend - GRATIS)

---

## PASO 1: MongoDB Atlas (Base de Datos)

### Crear Cuenta y Cluster

1. Ve a: https://www.mongodb.com/cloud/atlas/register
2. Crea una cuenta gratuita
3. Crea un cluster M0 (GRATIS):
   - Cloud: AWS
   - Region: La más cercana
   - Name: espacios-piscina-cluster

### Configurar Seguridad

**Usuario de Base de Datos:**
1. Security → Database Access
2. Add New Database User
3. Username: admin_espacios
4. Password: (genera una y guárdala)
5. Privileges: Atlas admin

**IP Whitelist:**
1. Security → Network Access
2. Add IP Address
3. Allow Access from Anywhere (0.0.0.0/0)

### Obtener Connection String

1. Database → Connect → Connect your application
2. Copia el string:
```
mongodb+srv://admin_espacios:<password>@cluster.xxxxx.mongodb.net/espacios_piscina?retryWrites=true&w=majority
```
3. Reemplaza <password> con tu contraseña
4. GUARDA ESTE STRING

---

## PASO 2: Guardar en GitHub

1. En Emergent, click "Save to GitHub"
2. Conecta tu cuenta si no lo has hecho
3. Repositorio: espacios-con-piscina
4. Branch: main
5. PUSH TO GITHUB

---

## PASO 3: Deploy Backend (Render)

1. Ve a: https://render.com
2. Regístrate con GitHub
3. New + → Web Service
4. Conecta tu repo: espacios-con-piscina

**Configuración:**
- Name: espacios-piscina-api
- Region: Oregon
- Branch: main
- Root Directory: backend
- Runtime: Python 3
- Build Command: pip install -r requirements.txt
- Start Command: uvicorn server:app --host 0.0.0.0 --port $PORT
- Plan: Free

**Variables de Entorno:**
1. MONGO_URL = tu connection string de MongoDB
2. JWT_SECRET = cualquier string aleatorio (ej: mi_secreto_12345)

3. Click "Create Web Service"
4. Espera 2-5 minutos
5. GUARDA LA URL (ej: https://espacios-piscina-api.onrender.com)

---

## PASO 4: Deploy Frontend (Vercel)

1. Ve a: https://vercel.com/signup
2. Regístrate con GitHub
3. Add New → Project
4. Importa: espacios-con-piscina

**Configuración:**
- Framework: Create React App
- Root Directory: frontend
- Build Command: (auto-detectado)
- Output Directory: build

**Variable de Entorno:**
- REACT_APP_BACKEND_URL = URL de tu backend en Render
  (ej: https://espacios-piscina-api.onrender.com)
  SIN slash al final

2. Click "Deploy"
3. Espera 1-3 minutos
4. Tu app estará lista!

---

## PASO 5: Crear Usuario Admin

1. Ve a MongoDB Atlas
2. Browse Collections
3. Database: espacios_piscina
4. Collection: users (créala si no existe)
5. Insert Document:

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

Credenciales:
- Usuario: admin
- Password: admin123

⚠️ CAMBIA LA CONTRASEÑA después del primer login

---

## 🎉 LISTO!

Tu aplicación está en:
- Frontend: https://tu-app.vercel.app
- Backend: https://tu-api.onrender.com/api/docs

### Actualizaciones futuras:
1. Haz cambios en Emergent
2. Save to GitHub
3. Auto-deploy en 2-5 minutos

---

## 🆘 Problemas Comunes

**Backend no inicia:**
- Verifica MONGO_URL en Render
- Verifica IP whitelist en MongoDB (0.0.0.0/0)

**Frontend no conecta:**
- Verifica REACT_APP_BACKEND_URL en Vercel
- No debe tener /api al final
- Re-deploy si cambias variables

**Render se duerme (Plan Free):**
- Primera carga tarda 30-60 segundos
- Se despierta automáticamente
- Upgrade a $7/mes para siempre activo

---

## 💰 Costos

100% GRATIS:
- MongoDB Atlas: 512 MB
- Render: 512 MB RAM (se duerme después de 15 min)
- Vercel: 100 GB bandwidth/mes

Upgrade opcional:
- Render Pro: $7/mes (siempre activo)
- MongoDB M10: $57/mes (más storage)
- Vercel Pro: $20/mes (más bandwidth)