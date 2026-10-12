#!/bin/bash

# Script para iniciar la Pizarra Interactiva de forma local con doble clic
# Desarrollado para Linux

# Obtener la ruta del directorio donde está guardado este script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "============================================="
echo "   Iniciando Pizarra Interactiva Digital     "
echo "============================================="

# 1. Verificar e instalar dependencias si faltan en backend
if [ ! -d "backend/node_modules" ]; then
    echo "[1/4] Instalando dependencias del Backend..."
    cd "$DIR/backend" && npm install
else
    echo "[1/4] Dependencias del Backend ya instaladas."
fi

# 2. Verificar e instalar dependencias si faltan en frontend
if [ ! -d "frontend/node_modules" ]; then
    echo "[2/4] Instalando dependencias del Frontend..."
    cd "$DIR/frontend" && npm install
else
    echo "[2/4] Dependencias del Frontend ya instaladas."
fi

# 3. Preparar base de datos y Prisma Client
echo "[3/4] Generando cliente de Base de Datos (Prisma)..."
cd "$DIR/backend"
npx prisma generate

# Intentar sincronizar la base de datos (requiere MySQL activo localmente)
echo "Intentando conectar con MySQL local en puerto 3306..."
npx prisma db push --accept-data-loss &> /dev/null
if [ $? -eq 0 ]; then
    echo "¡Base de datos MySQL sincronizada con éxito!"
else
    echo "Advertencia: No se pudo conectar a MySQL local en el puerto 3306."
    echo "Asegúrate de iniciar XAMPP, MAMP o tu servicio de MySQL para persistir los datos."
    echo "El backend se ejecutará, pero la base de datos no guardará trazos nuevos hasta que MySQL esté activo."
fi

# 4. Iniciar Servidores en segundo plano
echo "[4/4] Iniciando servidores de desarrollo..."

# Iniciar backend en segundo plano y redirigir logs
cd "$DIR/backend"
npm run dev > "$DIR/backend.log" 2>&1 &
BACKEND_PID=$!

# Iniciar frontend en segundo plano y redirigir logs
cd "$DIR/frontend"
npm run dev > "$DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!

# Función para limpiar procesos al salir
cleanup() {
    echo ""
    echo "Cerrando servidores..."
    kill $BACKEND_PID &>/dev/null
    kill $FRONTEND_PID &>/dev/null
    echo "Servidores apagados."
    exit
}

# Capturar señales de salida para apagar los servidores
trap cleanup SIGINT SIGTERM EXIT

# Esperar a que el servidor de Vite inicie
sleep 2

# Abrir el navegador en el puerto local de Vite
echo "Abriendo la Pizarra en tu navegador..."
if command -v xdg-open > /dev/null; then
    xdg-open "http://localhost:5173"
elif command -v google-chrome > /dev/null; then
    google-chrome "http://localhost:5173"
elif command -v firefox > /dev/null; then
    firefox "http://localhost:5173"
fi

echo "============================================="
echo "¡Pizarra corriendo en http://localhost:5173!"
echo "Presiona Ctrl+C en esta terminal para detener."
echo "============================================="

# Mantener el script activo para que los servidores sigan corriendo
while true; do
    sleep 1
done
