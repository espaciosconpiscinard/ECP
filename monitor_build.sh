#!/bin/bash

echo "🚀 Generando Instalador de Espacios Con Piscina"
echo "================================================"
echo ""

cd /app/frontend

# Limpiar carpetas anteriores
rm -rf dist/ build/

# Ejecutar build en background
nohup yarn electron-build-win > /tmp/installer-build.log 2>&1 &
BUILD_PID=$!

echo "✓ Proceso iniciado (PID: $BUILD_PID)"
echo "✓ Monitoreando progreso..."
echo ""

# Monitorear progreso
while kill -0 $BUILD_PID 2>/dev/null; do
    echo -n "⏳ Construyendo..."
    
    if [ -d "build" ]; then
        echo -n " [Build creado]"
    fi
    
    if [ -d "dist/win-unpacked" ]; then
        echo -n " [App empaquetada]"
    fi
    
    if ls dist/*.exe 2>/dev/null; then
        echo ""
        echo ""
        echo "🎉 ¡INSTALADOR GENERADO EXITOSAMENTE!"
        echo "================================================"
        echo ""
        echo "📁 Ubicación:"
        ls -lh dist/*.exe
        echo ""
        echo "📊 Tamaño:"
        du -h dist/*.exe
        echo ""
        echo "✅ Listo para distribuir"
        exit 0
    fi
    
    echo " (esperando...)"
    sleep 10
done

echo ""
echo "❌ El proceso terminó. Verifica el log en: /tmp/installer-build.log"
echo ""
echo "Últimas líneas del log:"
tail -30 /tmp/installer-build.log
