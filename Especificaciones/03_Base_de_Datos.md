# Especificación de Base de Datos y Transacciones

Este documento define la estructura de persistencia para el sistema de Pizarra Interactiva.

## 1. Diseño Lógico
El sistema almacena datos de Salas (`Rooms`) y Trazos (`Strokes`) asociados a cada pizarra para permitir recargar el tablero a nuevos usuarios.

### Tabla: `Room` (Salas)
- `id` (UUID, Primary Key): Identificador de la sala de colaboración.
- `name` (VARCHAR): Nombre de la pizarra.
- `created_at` (TIMESTAMP): Fecha de creación.

### Tabla: `Stroke` (Trazos)
- `id` (BIGINT, Primary Key Auto-Increment): Identificador del trazo.
- `room_id` (UUID, Foreign Key → `Room.id` ON DELETE CASCADE): Relación con la sala.
- `tool` (VARCHAR): Herramienta utilizada (`pencil`, `line`, `rect`, `circle`).
- `color` (VARCHAR): Código hexadecimal del color.
- `line_width` (INTEGER): Grosor de la línea.
- `points` (JSONB): Matriz de puntos de coordenadas `[{x, y}, {x, y}]`.
- `created_at` (TIMESTAMP): Fecha y hora del trazo.

## 2. Transacciones Críticas
- **Inserción masiva de trazos:** Cada vez que un usuario finaliza un trazo, se escribe asíncronamente en la tabla `Stroke` a través del `RoomManager` para no bloquear el bucle de eventos del WebSocket.
- **Limpieza de Pizarra (Truncado lógico):** Eliminar todos los trazos asociados a un `room_id` específico al presionar "Limpiar Pizarra".