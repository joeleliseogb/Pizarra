# Contratos de API y Mensajes de WebSockets

Este documento describe la comunicación entre el Cliente y el Servidor.

## 1. API REST (HTTP)

### Crear una nueva sala de pizarra
- **Método:** `POST`
- **Ruta:** `/api/rooms`
- **Cuerpo (JSON):**
  ```json
  { "name": "Clase de Matemáticas" }
  ```
- **Respuesta (JSON - 201 Created):**
  ```json
  {
    "id": "e4328de9-6a2d-4cdd-b003-05eb6b3c6fe6",
    "name": "Clase de Matemáticas",
    "created_at": "2026-06-28T19:40:00Z"
  }
  ```

### Obtener historial de trazos de una sala
- **Método:** `GET`
- **Ruta:** `/api/rooms/:id/strokes`
- **Respuesta (JSON - 200 OK):**
  ```json
  [
    {
      "id": 12893,
      "tool": "pencil",
      "color": "#ffd700",
      "line_width": 5,
      "points": [{"x": 100, "y": 150}, {"x": 105, "y": 155}]
    }
  ]
  ```

---

## 2. Eventos de WebSockets (Socket.IO)

### Unirse a una sala (`join-room`)
El cliente emite este evento al abrir la pizarra para enrutar sus eventos solo a esa sala.
- **Payload:** `{ "roomId": "e4328de9-6a2d-4cdd-b003-05eb6b3c6fe6" }`

### Transmisión de trazos (`stroke`)
Emitido por el cliente al dibujar y retransmitido a los demás.
- **Payload:**
  ```json
  {
    "roomId": "uuid-sala",
    "stroke": {
      "tool": "line",
      "color": "#10b981",
      "line_width": 3,
      "points": [{"x": 200, "y": 200}, {"x": 300, "y": 300}]
    }
  }
  ```

### Limpiar pizarra (`clear`)
Limpia el lienzo de todos los conectados en la sala.
- **Payload:** `{ "roomId": "uuid-sala" }`
