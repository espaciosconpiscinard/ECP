#!/bin/bash

# Script para generar el instalador de Espacios Con Piscina
# Uso: bash generar_instalador.sh

echo "🚀 ====================================="
echo "   Espacios Con Piscina"
echo "   Generador de Instalador Windows"
echo "====================================="
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: Este script debe ejecutarse desde /app/frontend"
    exit 1
fi

echo "✅ Directorio correcto detectado"
echo ""

# Paso 1: Construir la aplicación
echo "📦 Paso 1/2: Construyendo aplicación web..."
echo "⏳ Esto puede tardar 2-5 minutos..."
echo ""

yarn build

if [ $? -ne 0 ]; then
    echo "❌ Error en el build. Por favor revisa los errores anteriores."
    exit 1
fi

echo ""
echo "✅ Build completado exitosamente"
echo ""

# Paso 2: Generar instalador
echo "🔨 Paso 2/2: Generando instalador Windows..."
echo "⏳ Esto puede tardar 3-7 minutos..."
echo ""

yarn electron-build-win

if [ $? -ne 0 ]; then
    echo "❌ Error generando el instalador. Por favor revisa los errores anteriores."
    exit 1
fi

echo ""
echo "✅ ====================================="
echo "   ¡Instalador Generado Exitosamente!"
echo "====================================="
echo ""
echo "📁 Ubicación del instalador:"
echo "   /app/frontend/dist/EspaciosConPiscina-Setup-1.0.0.exe"
echo ""
echo "📊 Información del archivo:"
ls -lh dist/*.exe 2>/dev/null | tail -1
echo ""
echo "🎉 Próximos pasos:"
echo "   1. Copia el instalador desde la carpeta 'dist'"
echo "   2. Compártelo con tu equipo (USB, Drive, etc.)"
echo "   3. Ejecuta el instalador en cada PC"
echo "   4. ¡Listo para usar!"
echo ""
echo "📖 Para más información, consulta README_DESKTOP.md"
echo ""
