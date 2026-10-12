-- Creación de tablas de base de datos para Pizarra Interactiva
-- Motor recomendado: PostgreSQL 14+

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de Salas
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Trazos
CREATE TABLE IF NOT EXISTS strokes (
    id BIGSERIAL PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    tool VARCHAR(50) NOT NULL,
    color VARCHAR(10) NOT NULL,
    line_width INTEGER NOT NULL,
    points JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices de optimización de lectura de sala
CREATE INDEX IF NOT EXISTS idx_strokes_room_id ON strokes(room_id);