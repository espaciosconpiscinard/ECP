# 📘 GUÍA DE DEPLOYMENT - ESPACIOS CON PISCINA

## 🗄️ 1. ¿DÓNDE SE ALMACENAN LOS DATOS?

Todos tus datos se guardan en **MongoDB**:

- **Clientes** → Colección `customers`
- **Villas** → Colección `villas`
- **Categorías** → Colección `categories`
- **Reservaciones** → Colección `reservations`
- **Gastos** → Colección `expenses`
- **Servicios** → Colección `extra_services`
- **Usuarios** → Colección `users`

### Base de Datos Actual:
```
Nombre: espacios_piscina
Ubicación: MongoDB local en el contenedor
```

---

## 👥 2. CÓMO AGREGAR USUARIOS

### Opción A: Usando el Script Python (Recomendado)

```bash
# En la terminal del proyecto
cd /app
python3 add_user.py
```

El script te guiará paso a paso para:
- Crear nuevos usuarios
- Listar usuarios existentes
- Asignar roles (Admin o Employee)

### Opción B: Desde el Backend con curl

```bash
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "nuevo_usuario",
    "email": "usuario@ejemplo.com",
    "full_name": "Nombre Completo",
    "password": "contraseña_segura",
    "role": "employee"
  }'
```

### Roles Disponibles:
- **admin**: Acceso completo (configuración, gastos, categorías, usuarios)
- **employee**: Acceso limitado (solo reservaciones y clientes)

---

## 🚀 3. OPCIONES DE DEPLOYMENT

### Opción 1: EMERGENT (Plataforma Actual) ⭐ RECOMENDADO

**Ventajas:**
- ✅ Ya estás aquí
- ✅ Deploy automático
- ✅ MongoDB incluido
- ✅ SSL/HTTPS automático
- ✅ Backups automáticos
- ✅ Escalado fácil

**Cómo deployar en Emergent:**
1. Tu app ya está funcionando aquí
2. Para deployment permanente, usa el botón "Deploy" o "Save to GitHub"
3. Emergent maneja todo automáticamente

**Para más información sobre deployment en Emergent:**
- Contacta al soporte de Emergent
- O usa el comando de ayuda en el chat

---

### Opción 2: VPS Propio (DigitalOcean, AWS, etc.)

**Requisitos:**
- Servidor Linux (Ubuntu 20.04+)
- MongoDB instalado
- Node.js 18+
- Python 3.9+
- Nginx (para proxy reverso)

**Pasos básicos:**

1. **Instalar dependencias:**
```bash
# MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod

# Node.js y Python
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs python3-pip
```

2. **Clonar tu código:**
```bash
cd /var/www
git clone [tu-repositorio] espacios-piscina
cd espacios-piscina
```

3. **Configurar Backend:**
```bash
cd backend
pip3 install -r requirements.txt

# Crear .env
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
JWT_SECRET_KEY=$(openssl rand -hex 32)
EOF
```

4. **Configurar Frontend:**
```bash
cd ../frontend
yarn install

# Crear .env
cat > .env << EOF
REACT_APP_BACKEND_URL=https://tu-dominio.com
EOF

yarn build
```

5. **Configurar Nginx:**
```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    # Frontend
    location / {
        root /var/www/espacios-piscina/frontend/build;
        try_files $uri /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

6. **Usar PM2 para mantener el backend corriendo:**
```bash
npm install -g pm2
cd /var/www/espacios-piscina/backend
pm2 start "uvicorn server:app --host 0.0.0.0 --port 8001" --name espacios-backend
pm2 save
pm2 startup
```

---

### Opción 3: Docker (Portabilidad)

**Crear docker-compose.yml:**
```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:6.0
    volumes:
      - mongo_data:/data/db
    
  backend:
    build: ./backend
    environment:
      - MONGO_URL=mongodb://mongodb:27017
    depends_on:
      - mongodb
    
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  mongo_data:
```

**Deployar:**
```bash
docker-compose up -d
```

---

## 💾 4. BACKUP DE DATOS

### Hacer Backup de MongoDB:

```bash
# Exportar toda la base de datos
mongodump --db espacios_piscina --out /ruta/backup/$(date +%Y%m%d)

# Backup de una colección específica
mongodump --db espacios_piscina --collection reservations --out /ruta/backup
```

### Restaurar Backup:

```bash
mongorestore --db espacios_piscina /ruta/backup/espacios_piscina
```

### Script de Backup Automático:

```bash
#!/bin/bash
# Agregar a cron: 0 2 * * * /ruta/backup.sh

BACKUP_DIR="/backups/espacios_piscina"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
mongodump --db espacios_piscina --out $BACKUP_DIR/$DATE

# Mantener solo últimos 7 días
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} \;
```

---

## 🔐 5. SEGURIDAD

### Cambios Importantes para Producción:

1. **JWT Secret Key:**
```bash
# Generar una clave segura
openssl rand -hex 32
# Agregarla a backend/.env
JWT_SECRET_KEY=tu_clave_generada_aqui
```

2. **MongoDB con Autenticación:**
```bash
# Crear usuario admin en MongoDB
mongo
> use admin
> db.createUser({
    user: "admin",
    pwd: "password_seguro",
    roles: ["root"]
})

# Actualizar MONGO_URL en .env
MONGO_URL=mongodb://admin:password_seguro@localhost:27017/espacios_piscina?authSource=admin
```

3. **HTTPS con Let's Encrypt:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com
```

---

## 👨‍💼 6. GESTIÓN DE TU EQUIPO

### Agregar Usuarios a tu Equipo:

1. **Administradores** (acceso completo):
```bash
python3 add_user.py
# Seleccionar rol: Admin
```

2. **Empleados** (solo reservaciones):
```bash
python3 add_user.py
# Seleccionar rol: Employee
```

### Permisos por Rol:

**Admin puede:**
- ✅ Todo lo del empleado
- ✅ Ver y gestionar gastos
- ✅ Crear/editar categorías
- ✅ Ver estadísticas financieras
- ✅ Gestionar usuarios

**Employee puede:**
- ✅ Crear/editar reservaciones
- ✅ Gestionar clientes
- ✅ Ver dashboard básico
- ❌ No puede ver gastos
- ❌ No puede editar configuración

---

## 📊 7. MONITOREO

### Ver Logs:

**En Emergent:**
- Los logs están disponibles en el dashboard

**En tu servidor:**
```bash
# Logs del backend
pm2 logs espacios-backend

# Logs de MongoDB
tail -f /var/log/mongodb/mongod.log

# Logs de Nginx
tail -f /var/log/nginx/access.log
```

---

## 🆘 8. SOPORTE

### Para Deployment en Emergent:
- Usa el comando en el chat para contactar soporte
- Emergent tiene documentación completa de deployment

### Para Problemas Técnicos:
1. Revisa los logs
2. Verifica que MongoDB esté corriendo
3. Confirma las variables de entorno

---

## 📝 RESUMEN RÁPIDO

**Agregar usuario:**
```bash
python3 add_user.py
```

**Backup de datos:**
```bash
mongodump --db espacios_piscina --out /backup/$(date +%Y%m%d)
```

**Deploy en Emergent:**
- Ya estás deployado aquí
- Usa "Save to GitHub" para versionar

**Deploy en servidor propio:**
- Instalar MongoDB, Node.js, Python
- Configurar Nginx
- Usar PM2 para backend
- Configurar SSL con Let's Encrypt

---

¿Necesitas ayuda específica con alguno de estos pasos? ¡Pregunta!
