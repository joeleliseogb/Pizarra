# Guía de Despliegue: Pizarra Interactiva en cPanel & WHM

Esta guía detalla los pasos para desplegar la aplicación de pizarra colaborativa en tiempo real en un servidor administrado con **cPanel** y **WHM**.

---

## Paso 1: Configurar la Base de Datos MySQL en cPanel

Dado que PostgreSQL no suele estar disponible en configuraciones estándar de cPanel, la aplicación ha sido adaptada para usar **MySQL / MariaDB**.

1. Inicia sesión en tu panel de control **cPanel**.
2. Dirígete a **Bases de datos -> Asistente de bases de datos MySQL** (MySQL Database Wizard).
3. **Crear base de datos:** Escribe un nombre para la base de datos (ej: `usuario_pizarra`) y haz clic en *Siguiente paso*.
4. **Crear usuario:** Escribe un nombre de usuario (ej: `usuario_pizarra_user`) y genera una contraseña segura. Haz clic en *Crear usuario*.
5. **Privilegios:** Marca la opción **TODOS LOS PRIVILEGIOS** (ALL PRIVILEGES) para vincular el usuario con la base de datos. Haz clic en *Siguiente paso*.
6. Copia los datos para armar tu URL de conexión en el archivo `.env` del backend:
   ```env
   DATABASE_URL="mysql://usuario_pizarra_user:tu_contraseña_segura@127.0.0.1:3306/usuario_pizarra"
   ```

---

## Paso 2: Desplegar el Servidor Backend (Node.js)

Existen dos opciones para correr el backend en cPanel/WHM. La **Opción B (PM2 + SSH)** es la más recomendada para garantizar la estabilidad y rendimiento de Socket.IO (WebSockets).

### Opción A: Setup Node.js App (Administrador de Aplicaciones de cPanel)
Usa esta opción si no tienes acceso SSH root (WHM) y tu proveedor permite el Setup de Node.js.

1. Sube la carpeta `backend/` a tu directorio home (ej: `/home/usuario/pizarra-backend`).
2. En cPanel, busca **Software -> Setup Node.js App**.
3. Haz clic en **Create Application**:
   - **Node.js version:** Selecciona la versión estable más reciente (ej: 18 o 20).
   - **Application mode:** `Production`.
   - **Application root:** `pizarra-backend` (la ruta a tu carpeta de backend).
   - **Application URL:** Selecciona tu dominio y la ruta (ej: `api`).
   - **Application startup file:** `server.js`.
4. Haz clic en **Create**.
5. Agrega las **Variables de Entorno** en la sección inferior de la configuración:
   - `DATABASE_URL` = `mysql://usuario_pizarra_user:contraseña@127.0.0.1:3306/usuario_pizarra`
   - `PORT` = `3001`
6. Ejecuta la instalación de dependencias haciendo clic en **Run JS NPM Install**.
7. Abre una terminal de cPanel (o SSH) y corre las migraciones de base de datos para crear las tablas ejecutando:
   ```bash
   cd ~/pizarra-backend
   npx prisma db push
   ```

### Opción B: Standalone Node.js mediante SSH y PM2 (Recomendada con WHM)
Si eres administrador de WHM y tienes acceso SSH, este método es 100% inmune a restricciones de Phusion Passenger.

1. Conéctate por SSH a tu servidor y entra a la carpeta del proyecto.
2. Sube la carpeta `backend/` a `/home/usuario/pizarra-backend`.
3. Instala dependencias y prepara Prisma:
   ```bash
   cd /home/usuario/pizarra-backend
   npm install
   npx prisma generate
   npx prisma db push
   ```
4. Instala **PM2** globalmente si no lo tienes para mantener el backend activo:
   ```bash
   npm install -g pm2
   ```
5. Inicia el servidor con PM2:
   ```bash
   pm2 start server.js --name "pizarra-backend"
   pm2 save
   pm2 startup
   ```

---

## Paso 3: Configurar el Firewall CSF en WHM (Solo Opción B)

Si decidiste correr el backend en un puerto dedicado (ej: `3001`), debes abrir el puerto en el Firewall de WHM para que los clientes puedan conectarse a Socket.IO.

1. Inicia sesión en **WHM** como root.
2. Ve a **Plugins -> ConfigServer Security & Firewall** (CSF).
3. Haz clic en **Firewall Configuration**.
4. Busca las directivas de puertos: `TCP_IN` y `TCP_OUT`.
5. Añade el puerto `3001` a ambas listas de puertos separados por comas (ej: `...,3000,3001,3005`).
6. Haz clic en **Change** al final de la página y luego en **Restart csf+lfd**.

---

## Paso 4: Redirección mediante Apache Reverse Proxy (`.htaccess`)
Para canalizar el tráfico HTTP y WebSockets por el puerto estándar (80/443) y evitar problemas de CORS:

1. Crea o edita el archivo `.htaccess` en la raíz de tu dominio en cPanel (carpeta `public_html`).
2. Agrega las siguientes reglas de redirección proxy (requiere que el módulo `mod_proxy` y `mod_proxy_wstunnel` estén habilitados en Apache EasyApache de WHM):
   ```apache
   RewriteEngine On

   # Redirigir tráfico WebSocket de Socket.IO al backend en puerto 3001
   RewriteCond %{REQUEST_URI}  ^/socket.io             [NC]
   RewriteCond %{QUERY_STRING} transport=websocket    [NC]
   RewriteRule /(.*)           ws://127.0.0.1:3001/$1  [P,L]

   # Redirigir peticiones normales HTTP de Socket.IO
   RewriteCond %{REQUEST_URI}  ^/socket.io             [NC]
   RewriteRule ^socket.io/(.*) http://127.0.0.1:3001/socket.io/$1 [P,L]

   # Redirigir endpoints REST de la API al backend
   RewriteCond %{REQUEST_URI}  ^/api                   [NC]
   RewriteRule ^api/(.*)       http://127.0.0.1:3001/api/$1 [P,L]
   ```

---

## Paso 5: Compilar y Desplegar el Frontend

1. En tu máquina local de desarrollo, abre la terminal en la carpeta `frontend/`.
2. Si deseas apuntar el frontend a una URL de backend distinta (por ejemplo, si no usas Reverse Proxy en `.htaccess` y conectas directo a un puerto abierto en tu subdominio), crea un archivo `.env` en la raíz de `frontend/`:
   ```env
   VITE_BACKEND_URL=http://tu-dominio.com:3001
   ```
   *(Si utilizas la redirección `.htaccess` en el mismo puerto, no necesitas definir `VITE_BACKEND_URL`, se conectará automáticamente al mismo dominio).*
3. Ejecuta la compilación de producción:
   ```bash
   npm install
   npm run build
   ```
4. Este comando generará una carpeta `frontend/dist/`.
5. Sube todos los archivos y carpetas dentro de `frontend/dist/` directamente a la carpeta `public_html` del dominio de cPanel utilizando el Administrador de Archivos de cPanel o un cliente FTP.

¡Listo! Tu pizarra interactiva colaborativa en tiempo real estará funcionando y persistiendo datos en MySQL sobre tu servidor cPanel/WHM.
