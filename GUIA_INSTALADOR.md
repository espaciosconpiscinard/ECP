# 🚀 Guía para Generar el Instalador de Windows

## Requisitos Previos

1. Node.js instalado (v16 o superior)
2. Yarn instalado
3. Conexión a internet

## Pasos para Generar el Instalador .exe

### 1. Preparar el Proyecto

```bash
cd /app/frontend
```

### 2. Instalar Dependencias (si es necesario)

```bash
yarn install
```

### 3. Construir la Aplicación para Producción

Este comando creará una versión optimizada de la aplicación:

```bash
yarn build
```

**Nota**: Este proceso puede tardar 2-5 minutos dependiendo de tu máquina.

### 4. Generar el Instalador para Windows

```bash
yarn electron-build-win
```

**Este comando hará**:
- Empaqueta la aplicación con Electron
- Crea un instalador NSIS para Windows
- Genera el archivo .exe en la carpeta `dist`

**Tiempo estimado**: 3-7 minutos

### 5. Encontrar el Instalador

El instalador se guardará en:
```
/app/frontend/dist/EspaciosConPiscina-Setup-1.0.0.exe
```

**Tamaño aproximado**: 80-150 MB

## 📦 Distribución

### Compartir con tu Equipo

1. **Copia el instalador** desde `dist/EspaciosConPiscina-Setup-1.0.0.exe`

2. **Compártelo** mediante:
   - USB
   - Google Drive / Dropbox
   - Email (si el tamaño lo permite)
   - Red local compartida

3. **Instrucciones para Empleados**:
   - Descargar el archivo `.exe`
   - Ejecutar el instalador
   - Seguir el asistente de instalación
   - Crear acceso directo en el escritorio
   - Abrir la aplicación e iniciar sesión

## 🔄 Actualizar la Aplicación

Cuando hagas cambios y quieras distribuir una nueva versión:

1. **Actualiza la versión** en `package.json`:
   ```json
   "version": "1.1.0"
   ```

2. **Genera el nuevo instalador**:
   ```bash
   yarn electron-build-win
   ```

3. **Distribuye** el nuevo instalador a tu equipo

## 🛠️ Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `yarn electron-dev` | Ejecutar en modo desarrollo (para pruebas) |
| `yarn build` | Construir aplicación web optimizada |
| `yarn electron-build-win` | Generar instalador para Windows |
| `yarn electron-build` | Generar instalador (detecta SO automáticamente) |

## ⚠️ Solución de Problemas

### Error: "electron-builder not found"
```bash
yarn add electron-builder --dev
```

### Error: "Build failed"
1. Asegúrate de que `yarn build` funcione correctamente primero
2. Verifica que todos los archivos estén presentes
3. Revisa los logs para más detalles

### El instalador es muy grande
- Tamaño normal: 80-150 MB
- Incluye Electron runtime completo
- No se puede reducir significativamente

### Problemas con Windows Defender
- Windows Defender puede bloquear el instalador por no estar firmado
- Es normal para aplicaciones no publicadas en la tienda
- Los usuarios deben hacer clic en "Más información" → "Ejecutar de todos modos"

## 🔐 Firma Digital (Opcional)

Para evitar advertencias de Windows Defender, puedes firmar digitalmente el instalador:

1. **Obtén un certificado de firma de código** (cuesta dinero)
2. **Configura la firma** en `package.json`:
   ```json
   "win": {
     "certificateFile": "path/to/certificate.pfx",
     "certificatePassword": "your-password"
   }
   ```

**Nota**: La firma digital es opcional pero recomendada para distribución profesional.

## 📋 Checklist Antes de Distribuir

- [ ] Probar la aplicación en modo desarrollo
- [ ] Verificar que todas las funcionalidades funcionen
- [ ] Actualizar la versión en package.json
- [ ] Generar el build de producción
- [ ] Probar el instalador en una PC limpia
- [ ] Documentar cambios de la nueva versión
- [ ] Compartir el instalador con el equipo

## 🎯 Próximos Pasos

Una vez tengas el instalador:

1. **Prueba local**: Instala en tu PC primero
2. **Prueba en otra PC**: Verifica que funcione en otra máquina
3. **Distribuye al equipo**: Comparte con los 2 administradores primero
4. **Soporte**: Estate disponible para ayudar con la instalación

## 💡 Consejos

- **Mantén una copia**: Guarda todos los instaladores generados
- **Versionado**: Usa versionado semántico (1.0.0, 1.1.0, 2.0.0)
- **Changelog**: Documenta qué cambió en cada versión
- **Testing**: Siempre prueba antes de distribuir

---

**¿Listo para generar tu primer instalador?**

Ejecuta:
```bash
cd /app/frontend
yarn build && yarn electron-build-win
```

¡Espera unos minutos y tendrás tu instalador listo! 🎉
