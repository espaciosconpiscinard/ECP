# 📦 INSTRUCCIONES PARA ACTUALIZAR TU APP EN PRODUCCIÓN

## 🔄 Resumen de Cambios Implementados

### Backend:
1. ✅ Sistema de aprobación de usuarios con campo `is_approved`
2. ✅ Código secreto "ECPROSA" para crear administradores
3. ✅ Endpoints para aprobar/rechazar usuarios pendientes
4. ✅ Modelo de precios variables por rangos de personas en Villas
5. ✅ Endpoint para calcular precios según número de personas

### Frontend:
1. ✅ Campo código secreto en registro (solo visible para admin)
2. ✅ Mensajes de éxito diferenciados (admin vs empleado)
3. ✅ Sección de usuarios pendientes con botones aprobar/rechazar
4. ⏳ Configuración de precios variables en Villas (EN PROGRESO)

---

## 🚀 PASOS PARA ACTUALIZAR EN RENDER Y VERCEL

### Opción A: Actualización Automática (Recomendada)

Si conectaste Render y Vercel a tu repositorio GitHub:

1. **Guarda los cambios en GitHub** (usa la opción "Save to Github" en Emergent)
2. **Espera 2-5 minutos** - Render y Vercel detectarán automáticamente los cambios
3. **Verifica el deployment**:
   - Render: https://dashboard.render.com → Ve a tu servicio → Verás "Deploying..."
   - Vercel: https://vercel.com/dashboard → Ve a tu proyecto → Verás "Building..."

### Opción B: Deployment Manual

Si NO tienes conexión automática con GitHub:

#### Backend (Render):
1. Ve a https://dashboard.render.com
2. Selecciona tu servicio backend
3. Click en **"Manual Deploy"** (arriba a la derecha)
4. Selecciona **"Deploy latest commit"** o **"Clear build cache & deploy"**
5. Espera 3-5 minutos

#### Frontend (Vercel):
1. Ve a https://vercel.com/dashboard
2. Selecciona tu proyecto frontend
3. Click en **"Deployments"**
4. Click en **"Redeploy"** en el último deployment
5. Espera 2-3 minutos

---

## ⚙️ CONFIGURACIÓN CRÍTICA EN RENDER

**IMPORTANTE:** Asegúrate de tener estas variables de entorno configuradas:

1. Ve a tu servicio backend en Render
2. Click en **"Environment"** (menú lateral izquierdo)
3. Verifica que existan:

```bash
MONGO_URL = mongodb+srv://[usuario]:[password]@[cluster].mongodb.net/?retryWrites=true&w=majority
DB_NAME = espacios_piscina
JWT_SECRET_KEY = [tu_secreto_seguro]
CORS_ORIGINS = *
```

4. Si falta alguna, agrégala y click **"Save Changes"**
5. Render redespleará automáticamente

---

## ⚙️ CONFIGURACIÓN CRÍTICA EN VERCEL

1. Ve a tu proyecto en Vercel
2. Click en **"Settings"** → **"Environment Variables"**
3. Verifica que exista:

```bash
REACT_APP_BACKEND_URL = https://[tu-backend].onrender.com
```

4. Si necesitas cambiarla, agrégala y redespliega

---

## 🧪 VERIFICACIÓN POST-DEPLOYMENT

### 1. Backend (Render):
```bash
# Test de salud
curl https://[tu-backend].onrender.com/api/health

# Debería retornar:
{"status":"healthy","service":"espacios-con-piscina-api"}
```

### 2. Frontend (Vercel):
- Abre https://[tu-frontend].vercel.app
- Intenta crear una cuenta de empleado
- Verifica que aparezca el mensaje: "Espera la aprobación del administrador"

### 3. Prueba de Código Secreto Admin:
- En registro, selecciona rol "Administrador"
- Ingresa código: `ECPROSA`
- Debería crear cuenta y permitir login inmediato

---

## 🔧 TROUBLESHOOTING

### ❌ Error: "Cannot connect to database"
**Solución:**
1. Verifica que `MONGO_URL` en Render esté correcta
2. Verifica que `DB_NAME = espacios_piscina` exista
3. Verifica IP whitelist en MongoDB Atlas (debe permitir 0.0.0.0/0)

### ❌ Error: "Código secreto inválido"
**Verificación:**
- El código debe ser exactamente: `ECPROSA` (todo en mayúsculas)
- Si no funciona, revisa que el backend se haya redespleado correctamente

### ❌ Frontend no se conecta al backend
**Solución:**
1. Verifica `REACT_APP_BACKEND_URL` en Vercel
2. Asegúrate de que NO termine en `/` (slash)
3. Ejemplo correcto: `https://mi-backend.onrender.com`
4. Ejemplo INCORRECTO: `https://mi-backend.onrender.com/`

### ❌ "User account is inactive" o "Cuenta pendiente de aprobación"
**Esto es CORRECTO:**
- Empleados nuevos necesitan aprobación de admin
- Admin debe aprobarlos desde: Panel → Usuarios → Sección amarilla "Pendientes"

---

## 📱 USAR LA NUEVA FUNCIONALIDAD

### Para Crear Admin (Primera vez):
1. Ve a registro
2. Selecciona rol "Administrador"
3. Ingresa código secreto: `ECPROSA`
4. Completa formulario
5. Listo, ya puedes iniciar sesión

### Para Crear Empleados:
**Opción 1 - Registro Público (con aprobación):**
1. Usuario se registra como "Empleado"
2. Aparece mensaje: "Espera aprobación"
3. Admin aprueba desde panel de usuarios

**Opción 2 - Admin crea directamente:**
1. Admin entra al sistema
2. Va a "Usuarios" → "+ Nuevo Usuario"
3. Crea empleado directamente (ya aprobado)

### Para Aprobar Empleados Pendientes:
1. Admin inicia sesión
2. Va a sección "Usuarios"
3. Verá sección amarilla con usuarios pendientes
4. Click en "✅ Aprobar" o "❌ Rechazar"

---

## 📊 PRECIOS VARIABLES (PRÓXIMAMENTE)

El sistema de precios variables está parcialmente implementado en el backend.
Falta completar la interfaz de usuario en el frontend.

**Cómo funcionará:**
- En gestión de villas, botón "+ Agregar Rango de Precio"
- Configurar: 1-10 personas: $5000, 11-20 personas: $7000, etc.
- Al crear reservación, precios se sugieren automáticamente según # personas
- Siempre editables manualmente

---

## 📞 SOPORTE

Si algo no funciona:
1. Revisa los logs en Render: Dashboard → Tu servicio → "Logs"
2. Revisa los logs en Vercel: Dashboard → Tu proyecto → "Deployments" → Click en deployment → "View Function Logs"
3. Si persiste el error, comparte los logs

---

## ✅ CHECKLIST FINAL

- [ ] Variables de entorno configuradas en Render (MONGO_URL, DB_NAME, JWT_SECRET_KEY)
- [ ] Variable de entorno configurada en Vercel (REACT_APP_BACKEND_URL)
- [ ] Backend redespleado en Render
- [ ] Frontend redespleado en Vercel
- [ ] Probado crear admin con código ECPROSA
- [ ] Probado crear empleado y aprobar desde admin
- [ ] App funcionando correctamente

**¡Tu app está lista para usar con las nuevas funcionalidades de seguridad!** 🎉
