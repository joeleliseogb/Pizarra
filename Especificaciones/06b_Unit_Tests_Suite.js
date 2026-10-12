// Suite de Pruebas Unitarias e Integración para Pizarra Interactiva
// Framework: Jest + Socket.io-client

const ioClient = require('socket.io-client');
const http = require('http');
const ioServer = require('socket.io');

describe('Suite de Integración: WebSockets de Pizarra', () => {
  let server, socketClient1, socketClient2;
  const port = 3010;

  beforeAll((done) => {
    // Configurar servidor HTTP y Socket.IO de prueba
    const httpServer = http.createServer();
    server = ioServer(httpServer, {
      cors: { origin: "*" }
    });

    server.on('connection', (socket) => {
      socket.on('join-room', (roomId) => {
        socket.join(roomId);
      });

      socket.on('stroke', (data) => {
        socket.to(data.roomId).emit('stroke', data.stroke);
      });

      socket.on('clear', (data) => {
        socket.to(data.roomId).emit('clear');
      });
    });

    httpServer.listen(port, () => {
      done();
    });
  });

  afterAll((done) => {
    server.close();
    done();
  });

  beforeEach((done) => {
    // Conectar dos clientes de prueba
    socketClient1 = ioClient(`http://localhost:${port}`);
    socketClient2 = ioClient(`http://localhost:${port}`);
    
    let connected = 0;
    const checkConnect = () => {
      connected++;
      if (connected === 2) done();
    };
    
    socketClient1.on('connect', checkConnect);
    socketClient2.on('connect', checkConnect);
  });

  afterEach(() => {
    socketClient1.disconnect();
    socketClient2.disconnect();
  });

  test('Debería retransmitir los trazos en tiempo real a los usuarios en la misma sala', (done) => {
    const testRoom = 'room-matematicas';
    const mockStroke = {
      tool: 'pencil',
      color: '#ffd700',
      line_width: 5,
      points: [{ x: 10, y: 20 }, { x: 15, y: 25 }]
    };

    socketClient1.emit('join-room', testRoom);
    socketClient2.emit('join-room', testRoom);

    socketClient2.on('stroke', (receivedStroke) => {
      expect(receivedStroke.tool).toBe('pencil');
      expect(receivedStroke.color).toBe('#ffd700');
      expect(receivedStroke.points[0].x).toBe(10);
      done();
    });

    // Pequeño retardo para asegurar suscripción de sala
    setTimeout(() => {
      socketClient1.emit('stroke', { roomId: testRoom, stroke: mockStroke });
    }, 100);
  });
});