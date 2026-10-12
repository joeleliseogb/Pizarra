# Especificación Técnica Master: Pizarra Interactiva Digital

Este documento detalla el diseño conceptual, alcance y pila tecnológica estricta de la aplicación de pizarra colaborativa en tiempo real.

## 1. Alcance del Proyecto
La aplicación permitirá a múltiples usuarios colaborar simultáneamente sobre un lienzo digital interactivo (canvas). Diseñado específicamente para pantallas táctiles y navegadores de escritorio utilizando interacciones fluidas.

### Requerimientos Funcionales Críticos:
- **Lienzo Infinito/Auto-ajustable:** Fondo negro tipo pizarrón con renderizado fluido a 60 FPS.
- **Herramientas de Dibujo:** Pluma libre con grosor dinámico, Borrador, y Figuras Geométricas (Líneas, Rectángulos, Círculos).
- **Menú Radial Flotante:** Un menú circular contextual (activado por clic derecho o pulsación larga) para cambio rápido de herramientas y colores.
- **Operaciones de Edición:** Deshacer (Undo), Rehacer (Redo) y Limpieza completa.
- **Colaboración Multijugador:** Renderizado en tiempo real de trazos y cursores de colaboradores conectados.
- **Exportación:** Descarga del lienzo completo a PNG preservando la transparencia.

## 2. Pila Tecnológica Estricta (Bloqueada)
Para asegurar el máximo rendimiento, baja latencia y facilidad de despliegue, se bloquean las siguientes tecnologías sin alternativas:

- **Frontend Core:** React 18 + Vite (Compilación ultra rápida).
- **Lienzo e Interacciones:** HTML5 Canvas API + Renderizado 2D nativo optimizado con detección de puntero unificado (`PointerEvents`).
- **Estilos:** CSS Vanilla (Variables de entorno CSS y Flexbox/Grid).
- **Servicio en Tiempo Real:** Node.js + Express + Socket.IO (Servicio de WebSockets bi-direccional).
- **Base de Datos y Persistencia:** PostgreSQL (Para almacenar metadatos de las salas y trazos históricos) junto a Prisma ORM.
- **Servidor Web y Hosting:** Firebase Hosting (Frontend) y servicio en la nube Dockerizado (Backend).