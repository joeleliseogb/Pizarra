# Matriz de Control de Acceso (RBAC/ABAC)

El sistema de la Pizarra Interactiva soporta dos roles de acceso dentro de cada sala de colaboración:

| Rol | Crear Sala | Dibujar / Borrar | Limpiar Lienzo | Exportar PNG | Invitar Usuarios |
|---|---|---|---|---|---|
| **Propietario / Administrador** | ✅ Sí | ✅ Sí | ✅ Sí | ✅ Sí | ✅ Sí |
| **Colaborador (Editor)** | ❌ No | ✅ Sí | ❌ No | ✅ Sí | ❌ No |
| **Lector (Read-Only)** | ❌ No | ❌ No | ❌ No | ✅ Sí | ❌ No |

## Seguridad de WebSockets
El servidor verificará el token de acceso de Socket.IO al conectarse. Si el usuario tiene el rol `Reader`, el servidor descartará silenciosamente cualquier evento entrante de tipo `stroke` o `clear` proveniente de ese cliente, evitando inyecciones de datos no autorizadas.