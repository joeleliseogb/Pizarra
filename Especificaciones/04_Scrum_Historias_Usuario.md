# Product Backlog & Historias de Usuario

A continuación se detallan las historias de usuario bajo el formato ágil de Scrum.

## Épica 1: Lienzo de Dibujo Colaborativo
### HU-001: Dibujo libre con PointerEvents
Como **colaborador de la pizarra**  
Quiero **dibujar trazos con mi dedo, mouse o lápiz táctil**  
Para **escribir o ilustrar mis ideas de forma natural**.

- **Criterio de Aceptación 1:**
  - **Given** que estoy dentro de una sala de pizarra activa.
  - **When** presiono el lienzo, arrastro el puntero y luego lo levanto.
  - **Then** el canvas debe renderizar una línea fluida con el color y grosor seleccionado a 60 FPS.

## Épica 2: Menú Radial Flotante
### HU-002: Menú contextual radial
Como **usuario de la pizarra**  
Quiero **abrir un menú circular al hacer clic derecho o mantener presionado el lienzo**  
Para **cambiar rápidamente de color o herramienta sin interrumpir mi flujo**.

- **Criterio de Aceptación 1:**
  - **Given** que tengo el lienzo de dibujo abierto.
  - **When** realizo un clic derecho sobre cualquier área del lienzo.
  - **Then** debe aparecer un menú circular centrado en la posición de mi cursor con iconos para Pluma, Borrador, Formas, Colores y Limpiar.

- **Criterio de Aceptación 2:**
  - **Given** que el menú radial está visible.
  - **When** selecciono una de las opciones con un clic o tocando una opción.
  - **Then** la herramienta o color debe actualizarse inmediatamente y el menú radial debe ocultarse de forma fluida.