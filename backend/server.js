const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const prisma = new PrismaClient();

// Configuración de puertos
const PORT = process.env.PORT || 3001;

// Memoria RAM temporal de respaldo (Para pruebas locales sin base de datos activa)
let roomsMemory = [];
let strokesMemory = [];

// Middleware
app.use(cors());
app.use(express.json());

// Endpoints REST

// Crear una nueva sala de pizarra
app.post('/api/rooms', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'El nombre de la sala es requerido.' });
    }

    try {
      // Intentar guardar en base de datos MySQL
      const room = await prisma.room.create({
        data: { name: name.trim() }
      });
      return res.status(201).json({
        id: room.id,
        name: room.name,
        created_at: room.createdAt
      });
    } catch (dbError) {
      console.warn('⚠️ Base de datos MySQL desconectada. Usando almacenamiento en memoria RAM temporal.');
      
      // Fallback en memoria RAM
      const fallbackRoom = {
        id: crypto.randomUUID(),
        name: name.trim(),
        createdAt: new Date()
      };
      roomsMemory.push(fallbackRoom);

      return res.status(201).json({
        id: fallbackRoom.id,
        name: fallbackRoom.name,
        created_at: fallbackRoom.createdAt
      });
    }
  } catch (error) {
    console.error('Error al crear sala:', error);
    res.status(500).json({ error: 'Error interno del servidor al crear la sala.' });
  }
});

// Obtener detalles de una sala específica
app.get('/api/rooms/:id', async (req, res) => {
  try {
    const { id } = req.params;

    try {
      // Intentar obtener de base de datos MySQL
      const room = await prisma.room.findUnique({
        where: { id }
      });
      if (room) {
        return res.json({
          id: room.id,
          name: room.name,
          created_at: room.createdAt
        });
      }
    } catch (dbError) {
      // Continuar al fallback en memoria
    }

    // Buscar en memoria RAM
    const memRoom = roomsMemory.find(r => r.id === id);
    if (!memRoom) {
      return res.status(404).json({ error: 'Sala no encontrada.' });
    }

    res.json({
      id: memRoom.id,
      name: memRoom.name,
      created_at: memRoom.createdAt
    });
  } catch (error) {
    console.error('Error al obtener sala:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// Obtener historial de trazos de una sala
app.get('/api/rooms/:id/strokes', async (req, res) => {
  try {
    const { id } = req.params;

    try {
      // Intentar obtener de base de datos MySQL
      const strokes = await prisma.stroke.findMany({
        where: { roomId: id },
        orderBy: { id: 'asc' }
      });

      const formattedStrokes = strokes.map(s => ({
        id: s.id,
        tool: s.tool,
        color: s.color,
        line_width: s.lineWidth,
        points: typeof s.points === 'string' ? JSON.parse(s.points) : s.points
      }));

      return res.json(formattedStrokes);
    } catch (dbError) {
      // Continuar al fallback en memoria
    }

    // Obtener de memoria RAM
    const memStrokes = strokesMemory.filter(s => s.roomId === id);
    res.json(memStrokes);
  } catch (error) {
    console.error('Error al obtener trazos:', error);
    res.status(500).json({ error: 'Error al cargar el historial de trazos.' });
  }
});

// Endpoint para reconocimiento de escritura a mano (OCR) mediante Google Input Tools
app.post('/api/ocr', async (req, res) => {
  try {
    const { ink, width, height } = req.body;
    if (!ink || !Array.isArray(ink)) {
      return res.status(400).json({ error: 'Falta el trazo (ink) en formato correcto.' });
    }

    const payload = {
      app_version: 0.4,
      api_level: "537.36",
      device: "5.0; iPhone; CPU iPhone OS 9_1 like Mac OS X",
      input_type: 0,
      options: "enable_pre_space",
      requests: [
        {
          writing_area_width: width || 1000,
          writing_area_height: height || 1000,
          ink: ink
        }
      ]
    };

    const response = await fetch('https://inputtools.google.com/request?itc=es-t-i0-handwrit&app=screenshot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Google Input Tools respondió con status ${response.status}`);
    }

    const data = await response.json();
    if (data && data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1]) {
      const candidates = data[1][0][1];
      return res.json({ text: candidates[0], candidates });
    }

    res.json({ text: '', candidates: [] });
  } catch (error) {
    console.error('Error en servicio OCR:', error);
    res.status(500).json({ error: 'Error al reconocer el texto a mano.' });
  }
});

// Configuración de Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware de Socket.IO para validar eventos
const validateStroke = (stroke) => {
  if (!stroke || typeof stroke !== 'object') return false;
  const { tool, color, line_width, points } = stroke;
  
  const validTools = [
    'pencil', 'highlighter', 'dashed', 'eraser', 'laser', 'magic', 
    'indelible', 'security', 'line', 'rect', 'circle', 'triangle', 
    'arrow', 'star'
  ];
  
  if (typeof tool !== 'string' || !validTools.includes(tool)) return false;
  if (typeof color !== 'string' || color.length > 25) return false; // Permitir rgb/rgba más largos
  if (typeof line_width !== 'number' || line_width < 1 || line_width > 100) return false;
  if (!Array.isArray(points) || points.length === 0) return false;
  if (points.length > 5000) return false;
  
  for (const pt of points) {
    if (typeof pt.x !== 'number' || typeof pt.y !== 'number') return false;
  }
  return true;
};

io.on('connection', (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);

  socket.on('join-room', (data) => {
    let roomId;
    if (typeof data === 'string') {
      roomId = data;
    } else if (data && typeof data === 'object') {
      roomId = data.roomId;
    }

    if (roomId && typeof roomId === 'string') {
      socket.join(roomId);
      console.log(`Socket ${socket.id} se unió a la sala: ${roomId}`);
    }
  });

  socket.on('stroke', async (payload) => {
    try {
      if (!payload || typeof payload !== 'object') return;
      const { roomId, stroke } = payload;

      if (!roomId || typeof roomId !== 'string' || !validateStroke(stroke)) {
        return;
      }

      // Retransmitir inmediatamente
      socket.to(roomId).emit('stroke', stroke);

      // Intentar persistir en base de datos MySQL (excepto láser y mágicos que son temporales)
      if (stroke.tool !== 'laser' && stroke.tool !== 'magic') {
        prisma.stroke.create({
          data: {
            roomId,
            tool: stroke.tool,
            color: stroke.color,
            lineWidth: stroke.line_width,
            points: stroke.points
          }
        }).catch(err => {
          // Guardar en memoria RAM si la base de datos está desconectada
          strokesMemory.push({
            id: Date.now() + Math.random(),
            roomId,
            tool: stroke.tool,
            color: stroke.color,
            line_width: stroke.line_width,
            points: stroke.points
          });
        });
      }

    } catch (error) {
      console.error('Error procesando evento stroke:', error);
    }
  });

  // Retransmisores de Notas Adhesivas (Post-its)
  socket.on('new-sticky', (payload) => {
    if (payload && payload.roomId && payload.sticky) {
      socket.to(payload.roomId).emit('new-sticky', payload.sticky);
    }
  });

  socket.on('update-sticky', (payload) => {
    if (payload && payload.roomId && payload.sticky) {
      socket.to(payload.roomId).emit('update-sticky', payload.sticky);
    }
  });

  socket.on('delete-sticky', (payload) => {
    if (payload && payload.roomId && payload.stickyId) {
      socket.to(payload.roomId).emit('delete-sticky', payload.stickyId);
    }
  });

  socket.on('clear', async (payload) => {
    try {
      let roomId;
      if (typeof payload === 'string') {
        roomId = payload;
      } else if (payload && typeof payload === 'object') {
        roomId = payload.roomId;
      }

      if (!roomId || typeof roomId !== 'string') return;

      // Borrar de base de datos MySQL
      try {
        await prisma.stroke.deleteMany({
          where: { roomId }
        });
      } catch (dbError) {
        // Continuar al borrado en memoria
      }

      // Borrar de memoria RAM
      strokesMemory = strokesMemory.filter(s => s.roomId !== roomId);

      socket.to(roomId).emit('clear');
      console.log(`Lienzo limpiado en la sala: ${roomId}`);
    } catch (error) {
      console.error('Error al limpiar trazos:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Cliente desconectado: ${socket.id}`);
  });
});

// Iniciar Servidor
server.listen(PORT, () => {
  console.log(`Servidor de Pizarra Interactiva corriendo en el puerto ${PORT}`);
});
