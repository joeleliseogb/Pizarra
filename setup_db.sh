#!/bin/bash

# Script para configurar MariaDB localmente
# Debe ejecutarse con privilegios sudo en tu terminal

echo "============================================="
echo "   Configurando Base de Datos MariaDB/MySQL  "
echo "============================================="

# 1. Iniciar servicio MariaDB
echo "Iniciando servicio MariaDB..."
sudo systemctl start mariadb

# Habilitar servicio para que inicie con el sistema
sudo systemctl enable mariadb

# 2. Crear base de datos y configurar usuario root con contraseña 'root'
# Usamos ALTER USER para modificar el método de autenticación por defecto (unix_socket)
# a contraseña tradicional (mysql_native_password) y permitir el acceso de Prisma.
echo "Creando base de datos y otorgando permisos..."
sudo mysql -u root <<EOF
CREATE DATABASE IF NOT EXISTS pizarra;

-- Cambiar el método de autenticación de root en localhost a contraseña tradicional
ALTER USER 'root'@'localhost' IDENTIFIED VIA mysql_native_password USING PASSWORD('root');
GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost' WITH GRANT OPTION;

-- Configurar también para IP de loopback (127.0.0.1)
CREATE USER IF NOT EXISTS 'root'@'127.0.0.1' IDENTIFIED VIA mysql_native_password USING PASSWORD('root');
ALTER USER 'root'@'127.0.0.1' IDENTIFIED VIA mysql_native_password USING PASSWORD('root');
GRANT ALL PRIVILEGES ON *.* TO 'root'@'127.0.0.1' WITH GRANT OPTION;

FLUSH PRIVILEGES;
EOF

if [ $? -eq 0 ]; then
    echo "¡Base de datos y usuario root configurados con contraseña 'root' con éxito!"
else
    echo "Hubo un error al ejecutar los comandos en MariaDB."
    exit 1
fi

# 3. Correr migraciones de Prisma
echo "Sincronizando el esquema de base de datos con Prisma..."
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR/backend"
npx prisma db push

echo "============================================="
echo "¡Configuración de Base de Datos completada!"
echo "============================================="
