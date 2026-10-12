import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import io from 'socket.io-client';

const Canvas = forwardRef(({ 
  roomId, 
  tool, 
  color, 
  lineWidth, 
  metricSystem, 
  showRulers, 
  showSecurityInk, 
  onConnectionStatusChange,
  onDrawingStateChange
}, ref) => {
  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  
  // Estados de Trazos e Historial
  const [strokes, setStrokes] = useState([]);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Estado de Notas Adhesivas (Post-its)
  const [stickies, setStickies] = useState([]);
  
  // Estados de Paneo y Zoom (Lienzo Infinito)
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const isSpacePressed = useRef(false);

  // Estados de Dibujo
  const isDrawing = useRef(false);
  const isPanning = useRef(false);
  const currentPoints = useRef([]);
  const startPoint = useRef({ x: 0, y: 0 });
  const lastPanPoint = useRef({ x: 0, y: 0 });

  // Arrastre de Notas Adhesivas
  const draggingStickyId = useRef(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Temporizadores para Paneo por Toque Largo (Long Press)
  const longPressTimer = useRef(null);
  const startScreenPos = useRef({ x: 0, y: 0 });

  // Trazos Temporales
  const fadingStrokesRef = useRef([]);
  const animationFrameId = useRef(null);

  const getBackendUrl = () => {
    if (import.meta.env.VITE_BACKEND_URL) {
      return import.meta.env.VITE_BACKEND_URL;
    }
    return window.location.hostname === 'localhost' 
      ? 'http://localhost:3001' 
      : window.location.origin;
  };

  const backendUrl = getBackendUrl();

  // Bucle de animación para desvanecer trazos temporales
  const animateFadingStrokes = () => {
    const now = Date.now();
    let hasActiveFading = false;

    fadingStrokesRef.current = fadingStrokesRef.current.filter((s) => {
      const age = now - s.timestamp;
      const duration = s.tool === 'laser' ? 2000 : 10000;
      if (age < duration) {
        hasActiveFading = true;
        return true;
      }
      return false;
    });

    drawAll();

    if (hasActiveFading) {
      animationFrameId.current = requestAnimationFrame(animateFadingStrokes);
    } else {
      animationFrameId.current = null;
    }
  };

  const addFadingStroke = (points, strokeTool, strokeColor, strokeWidth, timestamp = Date.now()) => {
    fadingStrokesRef.current.push({
      id: Math.random().toString(),
      points,
      tool: strokeTool,
      color: strokeColor,
      lineWidth: strokeWidth,
      timestamp
    });

    if (!animationFrameId.current) {
      animationFrameId.current = requestAnimationFrame(animateFadingStrokes);
    }
  };

  // Algoritmo Ramer-Douglas-Peucker para simplificar curvas y detectar polígonos
  const simplifyPath = (points, tolerance) => {
    if (points.length <= 2) return points;

    let maxSqDist = 0;
    let index = 0;
    const end = points.length - 1;

    for (let i = 1; i < end; i++) {
      const p = points[i];
      const p1 = points[0];
      const p2 = points[end];
      
      let x = p1.x;
      let y = p1.y;
      let dx = p2.x - x;
      let dy = p2.y - y;

      if (dx !== 0 || dy !== 0) {
        let t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);
        if (t > 1) {
          x = p2.x;
          y = p2.y;
        } else if (t > 0) {
          x += dx * t;
          y += dy * t;
        }
      }
      const sqDist = Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2);

      if (sqDist > maxSqDist) {
        index = i;
        maxSqDist = sqDist;
      }
    }

    if (maxSqDist > tolerance * tolerance) {
      const results1 = simplifyPath(points.slice(0, index + 1), tolerance);
      const results2 = simplifyPath(points.slice(index), tolerance);
      return results1.slice(0, results1.length - 1).concat(results2);
    }
    return [points[0], points[end]];
  };

  // Algoritmo heurístico para autocorrección de figuras imperfectas con alta precisión matemática
  const detectAndCorrectShape = (points) => {
    if (points.length < 15) return null;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    points.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    const w = maxX - minX;
    const h = maxY - minY;
    if (w < 35 || h < 35) return null;

    const start = points[0];
    const end = points[points.length - 1];
    const startEndDist = Math.hypot(end.x - start.x, end.y - start.y);
    const bboxDiagonal = Math.hypot(w, h);

    // El inicio y fin del trazo deben estar juntos (tolerancia del 20%)
    const isClosed = startEndDist < bboxDiagonal * 0.20;

    if (isClosed) {
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      
      // 1. Evaluar Círculo (Permite desviaciones normales del trazado a mano alzada)
      const dists = points.map(p => Math.hypot(p.x - cx, p.y - cy));
      const rMean = dists.reduce((sum, d) => sum + d, 0) / dists.length;
      const variance = dists.reduce((sum, d) => sum + Math.pow(d - rMean, 2), 0) / dists.length;
      const stdDev = Math.sqrt(variance);
      const cv = stdDev / rMean;
      const aspect = w / h;

      if (cv < 0.16 && aspect > 0.72 && aspect < 1.38) {
        const radius = (w + h) / 4;
        return {
          tool: 'circle',
          points: [{ x: cx, y: cy }, { x: cx + radius, y: cy }]
        };
      }

      // 2. Simplificar el polígono mediante RDP para contar vértices
      const tolerance = bboxDiagonal * 0.09;
      const simplified = simplifyPath(points, tolerance);
      
      // Filtrar puntos duplicados consecutivos
      const uniqueVertices = [];
      for (let i = 0; i < simplified.length - 1; i++) {
        const p = simplified[i];
        if (uniqueVertices.length === 0) {
          uniqueVertices.push(p);
        } else {
          const last = uniqueVertices[uniqueVertices.length - 1];
          if (Math.hypot(p.x - last.x, p.y - last.y) > bboxDiagonal * 0.05) {
            uniqueVertices.push(p);
          }
        }
      }

      const vertexCount = uniqueVertices.length;

      // A. Si se simplificó a 3 vértices: ¡Es un Triángulo! (Equilátero, Obtuso, Llano, etc.)
      if (vertexCount === 3) {
        return {
          tool: 'triangle',
          points: [uniqueVertices[0], uniqueVertices[1], uniqueVertices[2]]
        };
      }

      // B. Si se simplificó a 4 vértices: ¡Es un Rectángulo / Cuadrado!
      if (vertexCount === 4) {
        return {
          tool: 'rect',
          points: [{ x: minX, y: minY }, { x: maxX, y: maxY }]
        };
      }
    }

    return null;
  };

  // Conexión del Socket e historial
  useEffect(() => {
    console.log('Conectando con WebSocket en:', backendUrl);
    const socket = io(backendUrl, {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      onConnectionStatusChange(true);
      socket.emit('join-room', roomId);
    });

    socket.on('disconnect', () => {
      onConnectionStatusChange(false);
    });

    const fetchHistory = async () => {
      try {
        const response = await fetch(`${backendUrl}/api/rooms/${roomId}/strokes`);
        if (response.ok) {
          const history = await response.json();
          setStrokes(history);
        }
      } catch (err) {
        console.error('Error al conectar con la API REST:', err);
      }
    };
    fetchHistory();

    socket.on('stroke', (remoteStroke) => {
      if (remoteStroke.tool === 'laser' || remoteStroke.tool === 'magic') {
        addFadingStroke(remoteStroke.points, remoteStroke.tool, remoteStroke.color, remoteStroke.line_width);
      } else {
        setStrokes((prev) => [...prev, remoteStroke]);
      }
    });

    // Listeners de Notas Adhesivas
    socket.on('new-sticky', (sticky) => {
      setStickies((prev) => [...prev, sticky]);
    });

    socket.on('update-sticky', (updatedSticky) => {
      setStickies((prev) => prev.map(s => s.id === updatedSticky.id ? updatedSticky : s));
    });

    socket.on('delete-sticky', (stickyId) => {
      setStickies((prev) => prev.filter(s => s.id !== stickyId));
    });

    socket.on('clear', () => {
      setStrokes([]);
      setUndoStack([]);
      setRedoStack([]);
      setStickies([]);
      fadingStrokesRef.current = [];
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
    });

    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        isSpacePressed.current = true;
        if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        isSpacePressed.current = false;
        if (canvasRef.current) {
          canvasRef.current.style.cursor = tool === 'eraser' ? 'cell' : tool === 'hand' ? 'grab' : 'crosshair';
        }
      }
    };

    // Liberar arrastre de Notas Adhesivas
    const handleGlobalPointerUp = () => {
      draggingStickyId.current = null;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('pointerup', handleGlobalPointerUp);

    return () => {
      socket.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [roomId, backendUrl, tool]);

  // Redibujar
  useEffect(() => {
    drawAll();
  }, [strokes, zoom, panOffset, metricSystem, showRulers, showSecurityInk]);

  // Manejar redimensionamiento
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      drawAll();
    };

    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 100);

    return () => window.removeEventListener('resize', handleResize);
  }, [strokes, zoom, panOffset, metricSystem, showRulers, showSecurityInk]);

  // Zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldX = (mouseX - panOffset.x) / zoom;
      const worldY = (mouseY - panOffset.y) / zoom;

      const zoomFactor = 1.1;
      let newZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor;
      newZoom = Math.max(0.1, Math.min(20, newZoom));

      const newPanOffset = {
        x: mouseX - worldX * newZoom,
        y: mouseY - worldY * newZoom
      };

      setZoom(newZoom);
      setPanOffset(newPanOffset);
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [zoom, panOffset]);

  // Reglas métricas
  const drawRulers = (ctx, width, height) => {
    ctx.save();
    
    let pps = 1;
    let unitLabel = 'px';
    
    if (metricSystem === 'cm') {
      pps = 37.795;
      unitLabel = 'cm';
    } else if (metricSystem === 'mm') {
      pps = 3.7795;
      unitLabel = 'mm';
    } else if (metricSystem === 'in') {
      pps = 96;
      unitLabel = 'in';
    }

    const rulerSize = 24;

    ctx.fillStyle = 'rgba(11, 15, 25, 0.9)';
    ctx.fillRect(0, 0, width, rulerSize);
    ctx.fillRect(0, 0, rulerSize, height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, rulerSize);
    ctx.lineTo(width, rulerSize);
    ctx.moveTo(rulerSize, 0);
    ctx.lineTo(rulerSize, height);
    ctx.stroke();

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, rulerSize, rulerSize);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px Outfit';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(unitLabel, rulerSize / 2, rulerSize / 2);

    ctx.font = '9px Outfit';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';

    const cleanIntervals = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
    
    let D = 50;
    for (const val of cleanIntervals) {
      const screenDist = val * pps * zoom;
      if (screenDist >= 50) {
        D = val;
        break;
      }
    }

    // --- REGLA HORIZONTAL ---
    const startWorldX = (rulerSize - panOffset.x) / zoom;
    const startUnitX = startWorldX / pps;
    let unitX = Math.floor(startUnitX / D) * D;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    while (true) {
      const screenX = unitX * pps * zoom + panOffset.x;
      if (screenX > width) break;

      if (screenX >= rulerSize) {
        ctx.beginPath();
        ctx.moveTo(screenX, rulerSize - 8);
        ctx.lineTo(screenX, rulerSize);
        ctx.stroke();

        ctx.fillText(unitX.toString(), screenX, 3);

        const subD = D / 5;
        for (let i = 1; i < 5; i++) {
          const subScreenX = (unitX + i * subD) * pps * zoom + panOffset.x;
          if (subScreenX >= rulerSize && subScreenX < width) {
            ctx.beginPath();
            ctx.moveTo(subScreenX, rulerSize - 4);
            ctx.lineTo(subScreenX, rulerSize);
            ctx.stroke();
          }
        }
      }
      unitX += D;
    }

    // --- REGLA VERTICAL ---
    const startWorldY = (rulerSize - panOffset.y) / zoom;
    const startUnitY = startWorldY / pps;
    let unitY = Math.floor(startUnitY / D) * D;

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    while (true) {
      const screenY = unitY * pps * zoom + panOffset.y;
      if (screenY > height) break;

      if (screenY >= rulerSize) {
        ctx.beginPath();
        ctx.moveTo(rulerSize - 8, screenY);
        ctx.lineTo(rulerSize, screenY);
        ctx.stroke();

        ctx.fillText(unitY.toString(), rulerSize - 11, screenY);

        const subD = D / 5;
        for (let i = 1; i < 5; i++) {
          const subScreenY = (unitY + i * subD) * pps * zoom + panOffset.y;
          if (subScreenY >= rulerSize && subScreenY < height) {
            ctx.beginPath();
            ctx.moveTo(rulerSize - 4, subScreenY);
            ctx.lineTo(rulerSize, subScreenY);
            ctx.stroke();
          }
        }
      }
      unitY += D;
    }

    ctx.restore();
  };

  // Renderizador principal del Canvas
  const drawAll = (tempStroke = null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);

    // 1. Dibujar trazos históricos comunes (no indelebles)
    strokes.filter(s => s.tool !== 'indelible').forEach((s) => {
      drawStroke(ctx, s);
    });

    // 2. Dibujar trazos indelebles encima
    strokes.filter(s => s.tool === 'indelible').forEach((s) => {
      drawStroke(ctx, s);
    });

    // 3. Dibujar trazo activo temporal
    if (tempStroke) {
      drawStroke(ctx, tempStroke);
    }

    // 4. Dibujar trazos temporales
    const now = Date.now();
    fadingStrokesRef.current.forEach((s) => {
      const age = now - s.timestamp;
      const duration = s.tool === 'laser' ? 2000 : 10000;
      const opacity = Math.max(0, 1 - age / duration);
      const pts = s.points;
      
      if (pts.length > 0) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (s.tool === 'laser') {
          ctx.strokeStyle = '#ef4444';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 12;
        } else {
          ctx.strokeStyle = s.color || '#3b82f6';
          ctx.shadowColor = s.color || '#3b82f6';
          ctx.shadowBlur = 6;
        }

        // Suavizado Bezier Cuadrático en trazos de desvanecimiento
        if (pts.length > 2) {
          for (let i = 1; i < pts.length; i++) {
            const p1 = pts[i - 1];
            const p2 = pts[i];
            const press = p2.pressure !== undefined ? p2.pressure : 0.5;

            ctx.beginPath();
            if (i > 1) {
              const p0 = pts[i - 2];
              ctx.moveTo((p0.x + p1.x) / 2, (p0.y + p1.y) / 2);
              ctx.quadraticCurveTo(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
            } else {
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
            }
            ctx.lineWidth = (s.lineWidth || 5) * (0.3 + press * 1.4);
            ctx.globalAlpha = opacity * Math.min(1.0, 0.4 + press * 1.2);
            ctx.stroke();
          }
        }
        ctx.restore();
      }
    });

    ctx.restore();

    if (showRulers) {
      drawRulers(ctx, canvas.width, canvas.height);
    }
  };

  const drawStroke = (ctx, stroke) => {
    if (!stroke.points || stroke.points.length === 0) return;
    
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    const pts = stroke.points;
    const isFreehand = stroke.tool === 'pencil' || stroke.tool === 'eraser' || stroke.tool === 'highlighter' || stroke.tool === 'dashed' || stroke.tool === 'indelible' || stroke.tool === 'security' || stroke.tool === 'laser' || stroke.tool === 'magic';

    if (isFreehand) {
      if (stroke.tool === 'security' && !showSecurityInk) {
        ctx.restore();
        return;
      }

      // Dibujar trazo libre suavizado por curvas de Bezier cuadráticas por segmento para soportar la presión
      for (let i = 1; i < pts.length; i++) {
        const p1 = pts[i - 1];
        const p2 = pts[i];
        const press = p2.pressure !== undefined ? p2.pressure : 0.5;

        // Configurar la brocha por segmento
        ctx.lineWidth = stroke.line_width * (0.3 + press * 1.4);

        if (stroke.tool === 'eraser') {
          ctx.strokeStyle = '#121826';
          ctx.lineWidth = stroke.line_width * 1.5 * (0.3 + press * 1.4);
          ctx.globalAlpha = 1.0;
        } else if (stroke.tool === 'highlighter') {
          ctx.strokeStyle = stroke.color;
          ctx.globalAlpha = 0.45 * Math.min(1.0, 0.4 + press * 1.2);
          ctx.lineWidth = stroke.line_width * 2.2 * (0.3 + press * 1.4);
          ctx.lineCap = 'square';
        } else if (stroke.tool === 'dashed') {
          ctx.strokeStyle = stroke.color;
          ctx.globalAlpha = Math.min(1.0, 0.3 + press * 1.4);
          ctx.setLineDash([ctx.lineWidth * 2, ctx.lineWidth * 2]);
        } else if (stroke.tool === 'indelible') {
          ctx.strokeStyle = stroke.color;
          ctx.globalAlpha = Math.min(1.0, 0.3 + press * 1.4);
        } else if (stroke.tool === 'security') {
          ctx.strokeStyle = '#c084fc';
          ctx.shadowColor = '#c084fc';
          ctx.shadowBlur = 10;
          ctx.globalAlpha = 0.85;
        } else if (stroke.tool === 'laser') {
          ctx.strokeStyle = '#ef4444';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 12;
          ctx.globalAlpha = Math.min(1.0, 0.4 + press * 1.2);
        } else if (stroke.tool === 'magic') {
          ctx.strokeStyle = stroke.color;
          ctx.shadowColor = stroke.color;
          ctx.shadowBlur = 6;
          ctx.globalAlpha = Math.min(1.0, 0.4 + press * 1.2);
        } else {
          ctx.strokeStyle = stroke.color;
          ctx.globalAlpha = Math.min(1.0, 0.3 + press * 1.4);
        }

        // Trazado del segmento con Curvas Bezier Cuadráticas
        ctx.beginPath();
        if (i > 1) {
          const p0 = pts[i - 2];
          ctx.moveTo((p0.x + p1.x) / 2, (p0.y + p1.y) / 2);
          ctx.quadraticCurveTo(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
        } else {
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
        }
        ctx.stroke();
        
        // Resetear patrón discontinuo
        if (stroke.tool === 'dashed') {
          ctx.setLineDash([]);
        }
      }
    } else {
      // Figuras geométricas
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.line_width;

      if (stroke.tool === 'line') {
        if (pts.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          ctx.lineTo(pts[1].x, pts[1].y);
          ctx.stroke();
        }
      } else if (stroke.tool === 'rect') {
        if (pts.length >= 2) {
          const x = pts[0].x;
          const y = pts[0].y;
          const w = pts[1].x - x;
          const h = pts[1].y - y;
          ctx.strokeRect(x, y, w, h);
        }
      } else if (stroke.tool === 'circle') {
        if (pts.length >= 2) {
          const x1 = pts[0].x;
          const y1 = pts[0].y;
          const x2 = pts[1].x;
          const y2 = pts[1].y;
          const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
          ctx.beginPath();
          ctx.arc(x1, y1, radius, 0, 2 * Math.PI);
          ctx.stroke();
        }
      } else if (stroke.tool === 'triangle') {
        if (pts.length === 3) {
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          ctx.lineTo(pts[1].x, pts[1].y);
          ctx.lineTo(pts[2].x, pts[2].y);
          ctx.closePath();
          ctx.stroke();
        } else if (pts.length >= 2) {
          const x1 = pts[0].x;
          const y1 = pts[0].y;
          const x2 = pts[1].x;
          const y2 = pts[1].y;
          ctx.beginPath();
          ctx.moveTo((x1 + x2) / 2, y1);
          ctx.lineTo(x2, y2);
          ctx.lineTo(x1, y2);
          ctx.closePath();
          ctx.stroke();
        }
      } else if (stroke.tool === 'arrow') {
        if (pts.length >= 2) {
          const x1 = pts[0].x;
          const y1 = pts[0].y;
          const x2 = pts[1].x;
          const y2 = pts[1].y;
          
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();

          const angle = Math.atan2(y2 - y1, x2 - x1);
          const headLength = Math.max(12, stroke.line_width * 3);

          ctx.beginPath();
          ctx.moveTo(x2, y2);
          ctx.lineTo(
            x2 - headLength * Math.cos(angle - Math.PI / 6),
            y2 - headLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(x2, y2);
          ctx.lineTo(
            x2 - headLength * Math.cos(angle + Math.PI / 6),
            y2 - headLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
        }
      } else if (stroke.tool === 'star') {
        if (pts.length >= 2) {
          const cx = pts[0].cx || pts[0].x;
          const cy = pts[0].cy || pts[0].y;
          const x2 = pts[1].x;
          const y2 = pts[1].y;
          const outerRadius = Math.sqrt(Math.pow(x2 - cx, 2) + Math.pow(y2 - cy, 2));
          const innerRadius = outerRadius * 0.4;
          
          let rot = (Math.PI / 2) * 3;
          let x = cx;
          let y = cy;
          const step = Math.PI / 5;

          ctx.beginPath();
          ctx.moveTo(cx, cy - outerRadius);
          for (let i = 0; i < 5; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
          }
          ctx.closePath();
          ctx.stroke();
        }
      }
    }
    
    ctx.restore();
  };

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, pressure: 0.5 };
    
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    
    return {
      x: (screenX - panOffset.x) / zoom,
      y: (screenY - panOffset.y) / zoom,
      pressure: e.pressure !== undefined ? e.pressure : 0.5
    };
  };

  // Manejo de Notas Adhesivas (Arrastre y Actualización)
  const handleStickyMouseDown = (e, stickyId) => {
    // Si hace clic en el botón de eliminar, no arrastrar
    if (e.target.closest('button')) return;
    
    e.stopPropagation();
    const rect = canvasRef.current.getBoundingClientRect();
    const sticky = stickies.find(s => s.id === stickyId);
    if (!sticky) return;

    draggingStickyId.current = stickyId;

    const mouseWorldX = (e.clientX - rect.left - panOffset.x) / zoom;
    const mouseWorldY = (e.clientY - rect.top - panOffset.y) / zoom;

    dragOffset.current = {
      x: mouseWorldX - sticky.x,
      y: mouseWorldY - sticky.y
    };
  };

  const handleStickyTouchStart = (e, stickyId) => {
    if (e.target.closest('button')) return;
    
    e.stopPropagation();
    const rect = canvasRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const sticky = stickies.find(s => s.id === stickyId);
    if (!sticky) return;

    draggingStickyId.current = stickyId;

    const mouseWorldX = (touch.clientX - rect.left - panOffset.x) / zoom;
    const mouseWorldY = (touch.clientY - rect.top - panOffset.y) / zoom;

    dragOffset.current = {
      x: mouseWorldX - sticky.x,
      y: mouseWorldY - sticky.y
    };
  };

  const handleUpdateStickyText = (stickyId, newText) => {
    setStickies(prev => prev.map(s => {
      if (s.id === stickyId) {
        const updated = { ...s, text: newText };
        socketRef.current.emit('update-sticky', { roomId, sticky: updated });
        return updated;
      }
      return s;
    }));
  };

  const handleDeleteSticky = (stickyId) => {
    setStickies(prev => prev.filter(s => s.id !== stickyId));
    socketRef.current.emit('delete-sticky', { roomId, stickyId });
  };

  const handlePointerDown = (e) => {
    if (e.button === 2) return;
    
    // Si estamos arrastrando una nota, ignorar dibujo
    if (draggingStickyId.current) return;

    startScreenPos.current = { x: e.clientX, y: e.clientY };

    if (tool === 'hand' || isSpacePressed.current) {
      isPanning.current = true;
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
      canvasRef.current.style.cursor = 'grabbing';
      return;
    }

    // Si es herramienta de nota adhesiva, insertarla de inmediato
    if (tool === 'sticky') {
      const coords = getCoordinates(e);
      const newSticky = {
        id: Math.random().toString(),
        x: coords.x - 75,
        y: coords.y - 75,
        text: '',
        color: '#fef08a'
      };
      setStickies(prev => [...prev, newSticky]);
      socketRef.current.emit('new-sticky', { roomId, sticky: newSticky });
      return;
    }

    onDrawingStateChange(true);

    longPressTimer.current = setTimeout(() => {
      isPanning.current = true;
      isDrawing.current = false;
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
      if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
      
      currentPoints.current = [];
      drawAll();
    }, 400);

    isDrawing.current = true;
    const coords = getCoordinates(e);
    
    if (tool === 'star') {
      startPoint.current = { x: coords.x, y: coords.y, cx: coords.x, cy: coords.y, pressure: coords.pressure };
      currentPoints.current = [{ x: coords.x, y: coords.y, cx: coords.x, cy: coords.y, pressure: coords.pressure }];
    } else {
      startPoint.current = coords;
      currentPoints.current = [coords];
    }

    canvasRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();

    // Gestionar arrastre de Nota Adhesiva
    if (draggingStickyId.current) {
      const mouseWorldX = (e.clientX - rect.left - panOffset.x) / zoom;
      const mouseWorldY = (e.clientY - rect.top - panOffset.y) / zoom;
      const newX = mouseWorldX - dragOffset.current.x;
      const newY = mouseWorldY - dragOffset.current.y;

      setStickies(prev => prev.map(s => {
        if (s.id === draggingStickyId.current) {
          const updated = { ...s, x: newX, y: newY };
          socketRef.current.emit('update-sticky', { roomId, sticky: updated });
          return updated;
        }
        return s;
      }));
      return;
    }

    if (longPressTimer.current) {
      const dx = Math.abs(e.clientX - startScreenPos.current.x);
      const dy = Math.abs(e.clientY - startScreenPos.current.y);
      if (dx > 8 || dy > 8) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }

    if (isPanning.current) {
      const dx = e.clientX - lastPanPoint.current.x;
      const dy = e.clientY - lastPanPoint.current.y;
      setPanOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (!isDrawing.current) return;
    
    const coords = getCoordinates(e);

    const isFreehand = tool === 'pencil' || tool === 'eraser' || tool === 'highlighter' || tool === 'dashed' || tool === 'indelible' || tool === 'security' || tool === 'laser' || tool === 'magic';

    if (isFreehand) {
      currentPoints.current.push(coords);
      const tempStroke = {
        tool,
        color: tool === 'laser' ? '#ef4444' : color,
        line_width: lineWidth,
        points: currentPoints.current
      };
      drawAll(tempStroke);
    } else {
      currentPoints.current = [startPoint.current, coords];
      const tempStroke = {
        tool,
        color,
        line_width: lineWidth,
        points: currentPoints.current
      };
      drawAll(tempStroke);
    }
  };

  const handlePointerUp = (e) => {
    onDrawingStateChange(false);

    // Finalizar arrastre de Post-It
    if (draggingStickyId.current) {
      draggingStickyId.current = null;
      return;
    }

    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (isPanning.current) {
      isPanning.current = false;
      canvasRef.current.style.cursor = (tool === 'hand' || isSpacePressed.current) ? 'grab' : 'crosshair';
      return;
    }

    if (!isDrawing.current) return;
    isDrawing.current = false;
    
    try {
      canvasRef.current.releasePointerCapture(e.pointerId);
    } catch (err) {}

    let finalTool = tool;
    let finalPoints = currentPoints.current;

    // Autocorrección geométrica inteligente
    if (tool === 'pencil' && currentPoints.current.length >= 15) {
      const correctedShape = detectAndCorrectShape(currentPoints.current);
      if (correctedShape) {
        finalTool = correctedShape.tool;
        finalPoints = correctedShape.points;
      }
    }

    const finalStroke = {
      tool: finalTool,
      color: finalTool === 'laser' ? '#ef4444' : color,
      line_width: lineWidth,
      points: finalPoints
    };

    if (finalPoints.length > 0) {
      if (finalTool === 'laser' || finalTool === 'magic') {
        addFadingStroke(finalPoints, finalTool, finalStroke.color, lineWidth);
        if (socketRef.current) {
          socketRef.current.emit('stroke', {
            roomId,
            stroke: finalStroke
          });
        }
      } else {
        setStrokes((prev) => [...prev, finalStroke]);
        setUndoStack((prev) => [...prev, finalStroke]);
        setRedoStack([]);

        if (socketRef.current) {
          socketRef.current.emit('stroke', {
            roomId,
            stroke: finalStroke
          });
        }
      }
    }
    
    currentPoints.current = [];
  };

  useEffect(() => {
    const handleClear = () => {
      setStrokes([]);
      setUndoStack([]);
      setRedoStack([]);
      setStickies([]);
      fadingStrokesRef.current = [];
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
    };

    window.addEventListener('pizarra-clear', handleClear);
    return () => window.removeEventListener('pizarra-clear', handleClear);
  }, []);

  useImperativeHandle(ref, () => ({
    undo() {
      if (undoStack.length === 0) return;
      
      const newUndoStack = [...undoStack];
      const poppedStroke = newUndoStack.pop();
      setUndoStack(newUndoStack);
      setRedoStack((prev) => [...prev, poppedStroke]);
      
      setStrokes((prev) => {
        const index = prev.lastIndexOf(poppedStroke);
        if (index > -1) {
          const nextStrokes = [...prev];
          nextStrokes.splice(index, 1);
          return nextStrokes;
        }
        return prev;
      });
    },
    
    redo() {
      if (redoStack.length === 0) return;
      
      const newRedoStack = [...redoStack];
      const restoredStroke = newRedoStack.pop();
      setRedoStack(newRedoStack);
      setUndoStack((prev) => [...prev, restoredStroke]);
      
      setStrokes((prev) => [...prev, restoredStroke]);

      if (socketRef.current) {
        socketRef.current.emit('stroke', {
          roomId,
          stroke: restoredStroke
        });
      }
    },

    clearBoard() {
      setStrokes([]);
      setUndoStack([]);
      setRedoStack([]);
      setStickies([]);
      fadingStrokesRef.current = [];
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
      if (socketRef.current) {
        socketRef.current.emit('clear', { roomId });
      }
    },

    exportPNG() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = canvas.width;
      exportCanvas.height = canvas.height;
      const exportCtx = exportCanvas.getContext('2d');

      exportCtx.fillStyle = '#0f172a';
      exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      
      exportCtx.save();
      exportCtx.translate(panOffset.x, panOffset.y);
      exportCtx.scale(zoom, zoom);
      
      const startX = -panOffset.x / zoom;
      const startY = -panOffset.y / zoom;
      const endX = startX + canvas.width / zoom;
      const endY = startY + canvas.height / zoom;

      exportCtx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      const gridStartX = Math.floor(startX / 32) * 32;
      const gridStartY = Math.floor(startY / 32) * 32;

      for (let x = gridStartX; x < endX; x += 32) {
        for (let y = gridStartY; y < endY; y += 32) {
          exportCtx.fillRect(x, y, 1, 1);
          exportCtx.fillRect(x + 16, y + 16, 1, 1);
        }
      }
      exportCtx.restore();

      exportCtx.save();
      exportCtx.translate(panOffset.x, panOffset.y);
      exportCtx.scale(zoom, zoom);
      
      strokes.filter(s => s.tool !== 'indelible').forEach((s) => {
        drawStroke(exportCtx, s);
      });
      strokes.filter(s => s.tool === 'indelible').forEach((s) => {
        drawStroke(exportCtx, s);
      });
      exportCtx.restore();

      const url = exportCanvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `pizarra_${roomId || 'colaborativa'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }));

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        className="pizarra-grid"
        style={{
          display: 'block',
          cursor: tool === 'hand' || isSpacePressed.current ? 'grab' : tool === 'eraser' ? 'cell' : 'crosshair',
          touchAction: 'none'
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />

      {/* Renderizado de Notas Adhesivas (Post-its) */}
      {stickies.map((sticky) => (
        <div
          key={sticky.id}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '160px',
            minHeight: '160px',
            backgroundColor: sticky.color || '#fef08a',
            padding: '12px',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
            color: '#1e293b',
            fontFamily: 'Outfit, sans-serif',
            fontSize: '13px',
            cursor: 'move',
            transform: `translate(${sticky.x * zoom + panOffset.x}px, ${sticky.y * zoom + panOffset.y}px) scale(${zoom})`,
            transformOrigin: 'top left',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
            border: '1px solid rgba(0,0,0,0.06)'
          }}
          onMouseDown={(e) => handleStickyMouseDown(e, sticky.id)}
          onTouchStart={(e) => handleStickyTouchStart(e, sticky.id)}
        >
          {/* Botón de eliminar */}
          <button
            onClick={() => handleDeleteSticky(sticky.id)}
            style={{
              position: 'absolute',
              top: '4px',
              right: '6px',
              border: 'none',
              background: 'transparent',
              color: 'rgba(0,0,0,0.3)',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '11px',
              padding: '2px'
            }}
            title="Eliminar nota"
          >
            ✕
          </button>

          {/* Área de texto editable */}
          <textarea
            value={sticky.text}
            onChange={(e) => handleUpdateStickyText(sticky.id, e.target.value)}
            style={{
              width: '100%',
              height: '120px',
              border: 'none',
              background: 'transparent',
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              color: 'inherit',
              overflow: 'hidden',
              marginTop: '8px'
            }}
            placeholder="Doble clic para escribir..."
          />
        </div>
      ))}
    </div>
  );
});

export default Canvas;
