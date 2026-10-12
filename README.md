# 🎨 Pizarra Interactiva Digital y Colaborativa

Una aplicación web moderna de pizarra interactiva colaborativa en tiempo real diseñada con alto rendimiento, baja latencia y soporte completo para dispositivos móviles, tablets y computadoras de escritorio.

---

## ✨ Características Principales

### 🖌️ Herramientas de Dibujo y Precisión
- **Trazos Suavizados:** Dibujo a mano alzada con curvas cuadráticas Bézier (`quadraticCurveTo`), eliminando esquinas poligonales y artefactos bruscos.
- **Sensibilidad a la Presión:** Soporte para stylus, Apple Pencil y tabletas gráficas (Wacom) modulando grosor y opacidad en tiempo real (`PointerEvents.pressure`).
- **Autocorrección Geométrica Inteligente:**
  - Reconocimiento y snap automático de **círculos** y **rectángulos/cuadrados**.
  - Reconocimiento generalizado de **triángulos** (equiláteros, isósceles, rectángulos/llanos, obtusos y escalenos) mediante simplificación poligonal **Ramer-Douglas-Peucker (RDP)**.
- **Formas Predefinidas:** Línea recta, Rectángulo, Círculo, Triángulo, Flecha orientada y Estrella de 5 puntas.
- **Pinceles Especiales:**
  - **Lápiz estándar** (tinta opaca fluida).
  - **Resaltador** (translúcido que preserva capas inferiores).
  - **Trazo discontinuo** (línea de guiones calculada por grosor).
  - **Pluma mágica** (trazo temporal que se desvanece suavemente a los 10 segundos).
  - **Tinta indeleble** (inmune al borrador tradicional).
  - **Tinta de seguridad / Luz UV** (invisible por defecto, visible únicamente con interruptor de lámpara ultravioleta).
  - **Puntero láser** (trazo temporal con resplandor neón que se desvanece automáticamente a los 2 segundos).

### 🔍 Reconocimiento de Escritura a Mano (OCR)
- Herramienta de selección para encerrar o seleccionar texto manuscrito en el lienzo.
- Conversión precisa de trazos a mano alzada a texto plano.
- Ventana modal interactiva con opción de copiado y exportación con pulsación larga a archivo `.txt`.

### 📌 Notas Adhesivas (Post-its) Colaborativas
- Creación, arrastre libre, edición de texto y eliminación de notas adhesivas sobre el lienzo.
- Sincronización multiusuario en tiempo real a través de WebSockets.
- Coordenadas adaptativas sincronizadas con el sistema de zoom y desplazamiento del lienzo.

### 📐 Lienzo Infinito y Reglas Métricas
- **Zoom centrado en cursor:** Escalado fluido de 0.1x a 20x mediante rueda de ratón o gestos táctiles pinch-to-zoom.
- **Paneo y desplazamiento:** Herramienta de mano (`hand`), atajo manteniendo presionada la barra espaciadora (`Space`), o gesto de pulsación larga (400ms).
- **Reglas métricas escalables:** Escalas horizontal y vertical en tiempo real con soporte para unidades: `px`, `cm`, `mm` e `in`.

### 📱 Experiencia Móvil y Menú Radial Flotante
- **Adaptabilidad completa a móviles:** Cabecera minimalista con estado de conexión Wi-Fi en vivo y panel lateral desplegable tipo Drawer.
- **Menú Radial Contextual:** Dial flotante arrastrable con soporte de submenús aislados (Figuras, Pinceles, Paleta de colores).
- **Modo Fantasma:** Se colapsa en un discreto icono semitransparente que se oculta automáticamente al dibujar para no interrumpir el espacio de trabajo.

### 🌐 Conectividad y Despliegue
- **Colaboración en Tiempo Real:** WebSocket nativo con fallback a HTTP Long-Polling a través de Socket.IO.
- **Persistencia Dual:** Almacenamiento relacional en MySQL / MariaDB mediante Prisma ORM con respaldo automático en memoria RAM si la base de datos se interrumpe.
- **Compatible con cPanel y WHM:** Arquitectura lista para ejecutarse tras Apache con Reverse Proxy y Passenger/Node.js.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend:**
  - React 18
  - Vite
  - Tailwind CSS
  - Lucide React (iconografía)
  - Socket.IO Client
- **Backend:**
  - Node.js & Express
  - Socket.IO Server
  - Prisma ORM
  - MySQL / MariaDB

---

## 🚀 Instalación y Puesta en Marcha

### Prerrequisitos
- Node.js (v18 o superior)
- MySQL / MariaDB (opcional para persistencia completa, o modo en memoria automático)

### 1. Clonar el repositorio
```bash
git clone https://github.com/joeleliseogb/Pizarra.git
cd Pizarra
```

### 2. Configuración del Backend
```bash
cd backend
npm install
cp .env.example .env
# Configura tu DATABASE_URL en backend/.env si usas MySQL
npx prisma generate
npx prisma db push # Opcional: crea las tablas si MySQL está activo
```

### 3. Configuración del Frontend
```bash
cd ../frontend
npm install
```

### 4. Iniciar la aplicación
Puedes iniciar ambos servidores automáticamente ejecutando el script en la raíz:
```bash
./iniciar_proyecto.sh
```

O bien iniciarlos por separado:
```bash
# Terminal 1 - Backend:
cd backend && npm start

# Terminal 2 - Frontend:
cd frontend && npm run dev
```

La aplicación estará disponible en: [http://localhost:5173](http://localhost:5173)
El backend escuchará en el puerto: [http://localhost:3001](http://localhost:3001)

---

## 📄 Licencia

Este proyecto está distribuido bajo la licencia MIT.
