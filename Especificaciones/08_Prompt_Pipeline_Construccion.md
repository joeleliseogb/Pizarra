# Construction Prompt Pipeline para Antigravity

Este documento contiene las instrucciones precisas para que el agente AI construya la aplicación "Pizarra Interactiva" paso a paso.

---

### **PROMPT 1/5: Inicialización del Servidor Backend**
**Objetivo:** Crear un servidor Socket.IO seguro con soporte para CORS, salas de colaboración e inserción simplificada.
**Instrucciones para la IA:**
"Crea la carpeta \`backend\` e inicializa un proyecto con \`package.json\` que incluya las dependencias \`express\`, \`socket.io\` y \`nodemon\` (en devDependencies). Luego, escribe el archivo \`backend/server.js\` con la siguiente lógica:
- Servidor Express escuchando en el puerto 3001 con CORS habilitado para \`http://localhost:5173\` (Vite).
- Inicialización de Socket.IO.
- Evento \`join-room\`: Permite al socket unirse a una sala (\`socket.join(roomId)\`).
- Evento \`stroke\`: Transmite el objeto de dibujo (\`stroke\`) recibido a todos los demás clientes conectados a la misma sala usando \`socket.to(roomId).emit('stroke', stroke)\`.
- Evento \`clear\`: Transmite la orden de borrar a los demás en la sala \`socket.to(roomId).emit('clear')\`.
Genera los archivos \`package.json\` y \`server.js\` completos."

---

### **PROMPT 2/5: Estructura del Cliente Vite + React y Estilos Globales**
**Objetivo:** Configurar el frontend de Vite y los estilos en CSS puro para lograr un diseño oscuro prémium de pizarra.
**Instrucciones para la IA:**
"Crea la aplicación frontend utilizando React y Vite. Configura el archivo \`frontend/index.html\` y define el archivo \`frontend/src/index.css\` con las siguientes especificaciones:
- Fondo oscuro completo de pizarra negra (#0f172a).
- Desactivación del scroll global y del menú contextual del navegador por defecto (\`contextmenu\`) en el cuerpo de la aplicación para permitir nuestro menú radial personalizado.
- Animaciones suaves para transiciones de herramientas.
Genera los archivos \`frontend/package.json\`, \`frontend/index.html\` y \`frontend/src/index.css\` completos."

---

### **PROMPT 3/5: Componente Menú Radial Flotante Contextual**
**Objetivo:** Crear un menú circular que aparezca al hacer clic derecho para cambiar herramientas y colores de dibujo.
**Instrucciones para la IA:**
"Crea el archivo \`frontend/src/components/RadialMenu.jsx\`. Este componente debe:
- Recibir como props: \`x\`, \`y\`, \`visible\`, \`activeTool\`, \`activeColor\`, \`onSelectTool\`, \`onSelectColor\` y \`onClose\`.
- Renderizarse como un contenedor circular flotante absoluto colocado en las coordenadas \`(x, y)\`.
- Mostrar un anillo exterior con botones circulares para colores (#ffffff, #ffd700, #38bdf8, #10b981, #ef4444) e iconos internos para las herramientas: Pluma (\`fa-pen\`), Borrador (\`fa-eraser\`), Línea (\`fa-minus\`), Rectángulo (\`fa-square\`) y Círculo (\`fa-circle\`).
- Implementar animaciones de escala y opacidad al mostrarse/ocultarse.
Genera el código completo de \`RadialMenu.jsx\`."

---

### **PROMPT 4/5: Componente de Lienzo Inteligente (Canvas API)**
**Objetivo:** Desarrollar la lógica de dibujo libre y geométrico multijugador sincronizado.
**Instrucciones para la IA:**
"Crea el archivo \`frontend/src/components/Canvas.jsx\`. Este componente debe:
- Conectarse al backend mediante Socket.IO (\`http://localhost:3001\`) y suscribirse a la sala.
- Integrar el elemento \`<canvas>\` de HTML5 configurando su contexto 2D (\`ctx\`).
- Usar \`PointerEvents\` (\`pointerdown\`, \`pointermove\`, \`pointerup\`) para dar soporte fluido a mouse y pantallas táctiles con Stylus.
- Lógica de herramientas:
  - **Lápiz/Pluma:** Trazo libre siguiendo el puntero.
  - **Goma:** Trazo libre con el color del fondo de la pizarra.
  - **Línea, Rectángulo, Círculo:** Vista previa temporal del trazado mientras se arrastra, y fijación del objeto al levantar el puntero.
- Emitir los trazos finalizados al backend mediante el evento \`stroke\`.
- Escuchar eventos \`stroke\` remotos y dibujarlos en el canvas local.
- Escuchar evento \`clear\` remoto para limpiar el canvas local.
Genera el código completo de \`Canvas.jsx\`."

---

### **PROMPT 5/5: Ensamblado Final y Controles Generales**
**Objetivo:** Integrar la interfaz del Toolbar, el menú radial y la descarga a imagen PNG.
**Instrucciones para la IA:**
"Crea el componente \`frontend/src/App.jsx\` para unir el Canvas, el RadialMenu y añadir un Toolbar superior con:
- Control deslizante para grosor de línea.
- Botón 'Deshacer' / 'Rehacer' (con pila de historial local).
- Botón 'Exportar PNG' que capture el canvas y fuerce una descarga.
- Botón 'Modo Presentación' para ocultar la UI.
Genera el código de \`App.jsx\`."