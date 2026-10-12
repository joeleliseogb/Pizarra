import React, { useState, useEffect, useRef } from 'react';
import Canvas from './components/Canvas';
import RadialMenu from './components/RadialMenu';
import { 
  Pen, 
  Eraser, 
  Minus, 
  Square, 
  Circle, 
  Undo2, 
  Redo2, 
  Trash2, 
  Download, 
  Eye, 
  EyeOff,
  Link as LinkIcon,
  Copy,
  Check,
  Sparkles,
  Wifi,
  WifiOff,
  Hand,
  Triangle,
  ArrowUpRight,
  Star,
  Ruler,
  Zap,
  Highlighter,
  Palette,
  Lock,
  Sun,
  PenTool,
  FileText,
  Menu
} from 'lucide-react';

const COLORS = [
  { name: 'Blanco', value: '#ffffff' },
  { name: 'Amarillo', value: '#ffd700' },
  { name: 'Azul', value: '#38bdf8' },
  { name: 'Verde', value: '#10b981' },
  { name: 'Rojo', value: '#ef4444' }
];

export default function App() {
  const [roomId, setRoomId] = useState(null);
  const [roomName, setRoomName] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [inputRoomId, setInputRoomId] = useState('');
  
  // Estados de la pizarra
  const [activeTool, setActiveTool] = useState('pencil');
  const [activeColor, setActiveColor] = useState('#ffd700');
  const [lineWidth, setLineWidth] = useState(5);
  const [isConnected, setIsConnected] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(true);
  const [copied, setCopied] = useState(false);
  const [metricSystem, setMetricSystem] = useState('px');
  const [showRulers, setShowRulers] = useState(true);
  const [showSecurityInk, setShowSecurityInk] = useState(false);
  const [isCanvasDrawing, setIsCanvasDrawing] = useState(false);
  const [showFullscreenOverlay, setShowFullscreenOverlay] = useState(false);

  const [isUserIdle, setIsUserIdle] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isRadialExpanded, setIsRadialExpanded] = useState(false);
  const idleTimeoutRef = useRef(null);

  // Estados del Menú Radial Flotante
  const [radialState, setRadialState] = useState({
    x: 0,
    y: 0,
    visible: false
  });

  const canvasRef = useRef(null);
  const pressTimer = useRef(null);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const colorInputRef = useRef(null);

  // Detectar URL para cargar sala existente
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setRoomId(roomParam);
      fetchRoomDetails(roomParam);
      setShowFullscreenOverlay(true); // Requiere gesto de usuario para pantalla completa
    }
  }, []);

  // Efecto para detectar tamaño de pantalla responsivo
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const resetIdleTimer = () => {
    setIsUserIdle(false);
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }
    // No auto-ocultar si el menú radial está expandido o si el menú Drawer móvil está abierto
    if (isRadialExpanded || mobileMenuOpen) return;
    
    // Relajar el tiempo a 8 segundos para mayor comodidad visual
    idleTimeoutRef.current = setTimeout(() => {
      setIsUserIdle(true);
    }, 8000);
  };

  // Efecto especial para evitar que la UI se auto-oculte cuando hay menús abiertos
  useEffect(() => {
    if (isRadialExpanded || mobileMenuOpen) {
      setIsUserIdle(false);
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
    } else {
      resetIdleTimer();
    }
  }, [isRadialExpanded, mobileMenuOpen]);

  // Detector global de actividad para resetear el temporizador de inactividad
  useEffect(() => {
    const handleActivity = () => {
      resetIdleTimer();
    };

    window.addEventListener('pointermove', handleActivity);
    window.addEventListener('pointerdown', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('wheel', handleActivity);

    resetIdleTimer();

    return () => {
      window.removeEventListener('pointermove', handleActivity);
      window.removeEventListener('pointerdown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('wheel', handleActivity);
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
    };
  }, []);

  // Escuchar el evento global para limpiar la pizarra desde el menú radial
  useEffect(() => {
    const handleGlobalClear = () => {
      canvasRef.current?.clearBoard();
    };
    window.addEventListener('pizarra-clear', handleGlobalClear);
    return () => window.removeEventListener('pizarra-clear', handleGlobalClear);
  }, []);

  const getBackendUrl = () => {
    if (import.meta.env.VITE_BACKEND_URL) {
      return import.meta.env.VITE_BACKEND_URL;
    }
    return window.location.hostname === 'localhost' 
      ? 'http://localhost:3001' 
      : window.location.origin;
  };

  const fetchRoomDetails = async (id) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/rooms/${id}`);
      if (response.ok) {
        const data = await response.json();
        setRoomName(data.name);
      } else {
        console.error('Sala no encontrada');
        // Limpiar parámetro inválido
        window.history.replaceState({}, document.title, window.location.pathname);
        setRoomId(null);
      }
    } catch (err) {
      console.error('Error cargando detalles de la sala:', err);
    }
  };

  const enterFullscreen = () => {
    const docEl = document.documentElement;
    if (docEl.requestFullscreen) {
      docEl.requestFullscreen().catch(err => console.warn("Fullscreen request rejected:", err));
    } else if (docEl.webkitRequestFullscreen) { /* Safari */
      docEl.webkitRequestFullscreen();
    } else if (docEl.msRequestFullscreen) { /* IE11 */
      docEl.msRequestFullscreen();
    }
  };

  // Crear una nueva sala
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    enterFullscreen();

    try {
      const response = await fetch(`${getBackendUrl()}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newRoomName })
      });

      if (response.ok) {
        const data = await response.json();
        setRoomId(data.id);
        setRoomName(data.name);
        // Actualizar URL
        window.history.pushState({}, '', `?room=${data.id}`);
      } else {
        alert('Error al crear la sala en el servidor.');
      }
    } catch (error) {
      console.error('Error al conectar con el backend:', error);
      alert('Error de conexión con el backend.');
    }
  };

  // Unirse a sala existente mediante ID
  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!inputRoomId.trim()) return;
    enterFullscreen();
    setRoomId(inputRoomId.trim());
    window.history.pushState({}, '', `?room=${inputRoomId.trim()}`);
    fetchRoomDetails(inputRoomId.trim());
  };

  // Copiar link de compartir
  const copyShareLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Controlar clic derecho para abrir Menú Radial
  const handleContextMenu = (e) => {
    e.preventDefault();
    setRadialState({
      x: e.clientX,
      y: e.clientY,
      visible: true
    });
  };

  // Manejar toques largos para dispositivos móviles (Menú radial)
  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };

    pressTimer.current = setTimeout(() => {
      setRadialState({
        x: touch.clientX,
        y: touch.clientY,
        visible: true
      });
    }, 600); // 600ms de pulsación larga para disparar
  };

  const handleTouchMove = (e) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);
    
    // Si el usuario mueve el dedo más de 10px, cancelamos la pulsación larga
    if (dx > 10 || dy > 10) {
      clearTimeout(pressTimer.current);
    }
  };

  const handleTouchEnd = () => {
    clearTimeout(pressTimer.current);
  };

  // Si no hay sala cargada, renderizamos la pantalla de bienvenida premium
  if (!roomId) {
    return (
      <div 
        className="pizarra-grid" 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100vw'
        }}
      >
        <div 
          className="glass-panel"
          style={{
            width: '90%',
            maxWidth: '480px',
            padding: '40px 32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '30px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* Cabecera / Marca */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              display: 'inline-flex',
              padding: '12px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              marginBottom: '16px',
              color: '#ffffff',
              boxShadow: '0 8px 20px rgba(99, 102, 241, 0.3)'
            }}>
              <Sparkles size={32} />
            </div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 700,
              letterSpacing: '-0.5px',
              background: 'linear-gradient(to right, #ffffff, #94a3b8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '8px'
            }}>Pizarra Interactiva</h1>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>
              Colabora en tiempo real con lienzos infinitos de alto rendimiento.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Formulario 1: Crear Sala */}
            <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Crear una Nueva Sala
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Nombre de la sala (Ej. Matemáticas)..."
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    color: '#ffffff',
                    outline: 'none',
                    fontSize: '14px'
                  }}
                />
                <button
                  type="submit"
                  className="btn-action"
                  style={{
                    padding: '12px 20px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--primary)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
                  }}
                >
                  Crear
                </button>
              </div>
            </form>

            {/* Separador */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.06)' }} />
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>O</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.06)' }} />
            </div>

            {/* Formulario 2: Unirse a Sala */}
            <form onSubmit={handleJoinRoom} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Unirse con ID de Sala
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Pegar ID de la sala..."
                  value={inputRoomId}
                  onChange={(e) => setInputRoomId(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    color: '#ffffff',
                    outline: 'none',
                    fontSize: '14px'
                  }}
                />
                <button
                  type="submit"
                  className="btn-action"
                  style={{
                    padding: '12px 20px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Unirse
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}
    >
      {/* Estado Conexión, Información de Sala y Controles de Compartir (Superior Izquierda) */}
      {!isPresentationMode && !isMobile && (
        <div 
          className="glass-panel"
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            zIndex: 10,
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            pointerEvents: 'auto'
          }}
        >
          {/* Indicador de conexión */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title={isConnected ? 'Conectado al servidor' : 'Desconectado'}>
            {isConnected ? (
              <Wifi size={16} style={{ color: 'var(--success)' }} />
            ) : (
              <WifiOff size={16} style={{ color: 'var(--danger)', animation: 'pulse 1.5s infinite' }} />
            )}
            <span style={{ fontSize: '12px', fontWeight: 600, color: isConnected ? 'var(--success)' : 'var(--danger)' }}>
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>

          <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

          {/* Información de la sala */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>{roomName || 'Cargando sala...'}</span>
            <span style={{ fontSize: '10px', color: '#94a3b8' }}>ID: {roomId.slice(0, 8)}...</span>
          </div>

          <button
            onClick={copyShareLink}
            className="btn-action"
            style={{
              padding: '6px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="Copiar enlace de colaboración"
          >
            {copied ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
          </button>
        </div>
      )}

      {/* Barra de Herramientas Principal - Desktop */}
      {!isPresentationMode && !isMobile && (
        <div 
          className="glass-panel"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            zIndex: 10,
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            opacity: (isCanvasDrawing || isUserIdle) ? 0 : 1,
            pointerEvents: (isCanvasDrawing || isUserIdle) ? 'none' : 'auto',
            transition: 'opacity 0.25s ease, transform 0.25s ease',
            transform: (isCanvasDrawing || isUserIdle) ? 'translateY(-10px)' : 'none'
          }}
        >
          {/* Herramientas de Dibujo */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {[
              { id: 'pencil', icon: Pen, label: 'Lápiz estándar' },
              { id: 'highlighter', icon: Highlighter, label: 'Resaltador' },
              { id: 'dashed', icon: Minus, label: 'Trazo Discontinuo' },
              { id: 'magic', icon: Sparkles, label: 'Pluma Mágica' },
              { id: 'indelible', icon: Lock, label: 'Tinta Indeleble' },
              { id: 'security', icon: EyeOff, label: 'Tinta de Seguridad' },
              { id: 'eraser', icon: Eraser, label: 'Borrador' },
              { id: 'laser', icon: Zap, label: 'Puntero Láser' },
              { id: 'sticky', icon: FileText, label: 'Nota Adhesiva' },
              { id: 'hand', icon: Hand, label: 'Mano (Mover)' },
              { id: 'line', icon: Minus, label: 'Línea' },
              { id: 'rect', icon: Square, label: 'Rectángulo' },
              { id: 'circle', icon: Circle, label: 'Círculo' },
              { id: 'triangle', icon: Triangle, label: 'Triángulo' },
              { id: 'arrow', icon: ArrowUpRight, label: 'Flecha' },
              { id: 'star', icon: Star, label: 'Estrella' }
            ].map((tool) => {
              const IconComp = tool.icon;
              const isActive = activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className="btn-action"
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                    color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title={tool.label}
                >
                  <IconComp size={16} />
                </button>
              );
            })}
          </div>

          <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

          {/* Colores */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {COLORS.map((col) => {
              const isActive = activeColor === col.value && activeTool !== 'eraser';
              return (
                <button
                  key={col.value}
                  onClick={() => {
                    setActiveColor(col.value);
                    if (activeTool === 'eraser') setActiveTool('pencil');
                  }}
                  className="btn-action"
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: col.value,
                    border: isActive ? '2px solid #ffffff' : '1px solid rgba(0,0,0,0.3)',
                    cursor: 'pointer',
                    transform: isActive ? 'scale(1.15)' : 'none',
                    boxShadow: isActive ? '0 0 8px rgba(255,255,255,0.4)' : 'none'
                  }}
                  title={col.name}
                />
              );
            })}

            {/* Selector de Color Personalizado en la Barra */}
            <button
              onClick={() => colorInputRef.current?.click()}
              className="btn-action"
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ff0055, #00ff55, #0055ff)',
                border: !COLORS.some(c => c.value === activeColor) ? '2px solid #ffffff' : '1px solid rgba(0,0,0,0.3)',
                cursor: 'pointer',
                boxShadow: !COLORS.some(c => c.value === activeColor) ? '0 0 8px rgba(255,255,255,0.4)' : 'none'
              }}
              title="Color Personalizado"
            />
          </div>

          <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

          {/* Grosor de Línea */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', width: '24px', textAlign: 'center' }}>
              {lineWidth}px
            </span>
            <input
              type="range"
              min="1"
              max="40"
              value={lineWidth}
              onChange={(e) => setLineWidth(parseInt(e.target.value))}
              style={{
                width: '80px',
                accentColor: 'var(--primary)',
                cursor: 'pointer'
              }}
            />
          </div>

          <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

          {/* Selector de Sistema Métrico y Reglas */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setShowRulers(!showRulers)}
              className="btn-action"
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backgroundColor: showRulers ? 'var(--primary)' : 'rgba(15, 23, 42, 0.7)',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 500
              }}
              title={showRulers ? "Ocultar Reglas" : "Mostrar Reglas"}
            >
              <Ruler size={14} />
              <span>Reglas: {showRulers ? 'ON' : 'OFF'}</span>
            </button>

            {showRulers && (
              <select
                value={metricSystem}
                onChange={(e) => setMetricSystem(e.target.value)}
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  fontSize: '11px',
                  borderRadius: '6px',
                  padding: '4px 6px',
                  outline: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
                title="Unidad métrica de las reglas"
              >
                <option value="px">px</option>
                <option value="cm">cm</option>
                <option value="mm">mm</option>
                <option value="in">in</option>
              </select>
            )}

            <div style={{ width: '1px', height: '16px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

            {/* Botón de Luz UV (Revelador de Tinta de Seguridad) */}
            <button
              onClick={() => setShowSecurityInk(!showSecurityInk)}
              className="btn-action"
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backgroundColor: showSecurityInk ? '#c084fc' : 'rgba(15, 23, 42, 0.7)',
                color: showSecurityInk ? '#1e1b4b' : '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 500,
                boxShadow: showSecurityInk ? '0 0 10px rgba(192, 132, 252, 0.4)' : 'none'
              }}
              title="Alternar Revelador de Tinta de Seguridad (Luz UV)"
            >
              <Sun size={14} />
              <span>Luz UV: {showSecurityInk ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

          {/* Acciones de Edición */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => canvasRef.current?.undo()}
              className="btn-action"
              style={{
                padding: '8px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'rgba(255, 255, 255, 0.7)',
                cursor: 'pointer'
              }}
              title="Deshacer (Ctrl+Z)"
            >
              <Undo2 size={16} />
            </button>
            <button
              onClick={() => canvasRef.current?.redo()}
              className="btn-action"
              style={{
                padding: '8px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'rgba(255, 255, 255, 0.7)',
                cursor: 'pointer'
              }}
              title="Rehacer (Ctrl+Y)"
            >
              <Redo2 size={16} />
            </button>
            <button
              onClick={() => {
                if (window.confirm('¿Estás seguro de que deseas limpiar la pizarra completa para todos los usuarios conectados?')) {
                  canvasRef.current?.clearBoard();
                }
              }}
              className="btn-action"
              style={{
                padding: '8px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--danger)',
                cursor: 'pointer'
              }}
              title="Limpiar pizarra"
            >
              <Trash2 size={16} />
            </button>
          </div>

          <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

          {/* Exportación y Modos */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => canvasRef.current?.exportPNG()}
              className="btn-action"
              style={{
                padding: '8px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'rgba(255, 255, 255, 0.7)',
                cursor: 'pointer'
              }}
              title="Exportar como PNG"
            >
              <Download size={16} />
            </button>
            <button
              onClick={() => setIsPresentationMode(true)}
              className="btn-action"
              style={{
                padding: '8px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'rgba(255, 255, 255, 0.7)',
                cursor: 'pointer'
              }}
              title="Modo Presentación (Ocultar UI)"
            >
              <EyeOff size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Barra de Herramientas Principal - Mobile (Header + Drawer) */}
      {!isPresentationMode && isMobile && (
        <>
          {/* Header Superior Compacto */}
          <div 
            className="glass-panel"
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              right: '12px',
              zIndex: 100,
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              opacity: (isCanvasDrawing || isUserIdle) ? 0 : 1,
              pointerEvents: (isCanvasDrawing || isUserIdle) ? 'none' : 'auto',
              transition: 'opacity 0.25s ease, transform 0.25s ease',
              transform: (isCanvasDrawing || isUserIdle) ? 'translateY(-5px)' : 'none'
            }}
          >
            {/* Info de Sala */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title={isConnected ? 'Conectado al servidor' : 'Desconectado'}>
                {isConnected ? (
                  <Wifi size={14} style={{ color: 'var(--success)' }} />
                ) : (
                  <WifiOff size={14} style={{ color: 'var(--danger)', animation: 'pulse 1.5s infinite' }} />
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '11px', fontWeight: 600 }}>{roomName || 'Sala...'}</span>
                <span style={{ fontSize: '8px', color: '#94a3b8' }}>ID: {roomId ? roomId.slice(0, 8) : ''}...</span>
              </div>
              <button
                onClick={copyShareLink}
                className="btn-action"
                style={{
                  padding: '4px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                {copied ? <Check size={12} style={{ color: 'var(--success)' }} /> : <Copy size={12} />}
              </button>
            </div>

            {/* Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="btn-action"
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                backgroundColor: 'var(--primary)',
                border: 'none',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(99, 102, 241, 0.3)'
              }}
            >
              <Menu size={16} />
            </button>
          </div>

          {/* Backdrop de cierre al hacer tap fuera */}
          {mobileMenuOpen && (
            <div 
              onClick={() => setMobileMenuOpen(false)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1999,
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(3px)',
                cursor: 'pointer'
              }}
            />
          )}

          {/* Drawer Lateral Mobile */}
          {mobileMenuOpen && (
            <div 
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                width: '280px',
                zIndex: 2000,
                backgroundColor: 'rgba(15, 23, 42, 0.96)',
                backdropFilter: 'blur(20px)',
                borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
                overflowY: 'auto',
                boxSizing: 'border-box'
              }}
              className="animate-slide-in"
            >
              {/* Encabezado Drawer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>Opciones</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.6)',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Sección: Herramientas de Dibujo */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Herramientas</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {[
                    { id: 'pencil', icon: Pen, label: 'Lápiz' },
                    { id: 'highlighter', icon: Highlighter, label: 'Resaltador' },
                    { id: 'dashed', icon: Minus, label: 'Discontinuo' },
                    { id: 'magic', icon: Sparkles, label: 'Pluma Mágica' },
                    { id: 'indelible', icon: Lock, label: 'Tinta Indeleble' },
                    { id: 'security', icon: EyeOff, label: 'Tinta Seguridad' },
                    { id: 'eraser', icon: Eraser, label: 'Borrador' },
                    { id: 'laser', icon: Zap, label: 'Láser' },
                    { id: 'sticky', icon: FileText, label: 'Post-it' },
                    { id: 'hand', icon: Hand, label: 'Mano' },
                    { id: 'line', icon: Minus, label: 'Línea' },
                    { id: 'rect', icon: Square, label: 'Rectángulo' },
                    { id: 'circle', icon: Circle, label: 'Círculo' },
                    { id: 'triangle', icon: Triangle, label: 'Triángulo' },
                    { id: 'arrow', icon: ArrowUpRight, label: 'Flecha' },
                    { id: 'star', icon: Star, label: 'Estrella' }
                  ].map((tool) => {
                    const IconComp = tool.icon;
                    const isActive = activeTool === tool.id;
                    return (
                      <button
                        key={tool.id}
                        onClick={() => {
                          setActiveTool(tool.id);
                          setMobileMenuOpen(false); // Cerrar al seleccionar
                        }}
                        style={{
                          aspectRatio: '1',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: isActive ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                          color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title={tool.label}
                      >
                        {tool.id === 'dashed' ? (
                          <Minus size={16} style={{ strokeDasharray: '3 3' }} />
                        ) : (
                          <IconComp size={16} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sección: Colores */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Colores</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {COLORS.map((col) => {
                    const isActive = activeColor === col.value && activeTool !== 'eraser';
                    return (
                      <button
                        key={col.value}
                        onClick={() => {
                          setActiveColor(col.value);
                          if (activeTool === 'eraser') setActiveTool('pencil');
                        }}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: col.value,
                          border: isActive ? '2px solid #ffffff' : '1px solid rgba(0,0,0,0.3)',
                          cursor: 'pointer',
                          boxShadow: isActive ? '0 0 8px rgba(255,255,255,0.4)' : 'none'
                        }}
                      />
                    );
                  })}
                  <button
                    onClick={() => {
                      colorInputRef.current?.click();
                      setMobileMenuOpen(false);
                    }}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #ff0055, #00ff55, #0055ff)',
                      border: !COLORS.some(c => c.value === activeColor) ? '2px solid #ffffff' : '1px solid rgba(0,0,0,0.3)',
                      cursor: 'pointer',
                      boxShadow: !COLORS.some(c => c.value === activeColor) ? '0 0 8px rgba(255,255,255,0.4)' : 'none'
                    }}
                  />
                </div>
              </div>

              {/* Sección: Grosor de Línea */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Grosor</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="range"
                    min="1"
                    max="40"
                    value={lineWidth}
                    onChange={(e) => setLineWidth(parseInt(e.target.value))}
                    style={{
                      flex: 1,
                      accentColor: 'var(--primary)',
                      cursor: 'pointer'
                    }}
                  />
                  <span style={{ fontSize: '12px', color: '#ffffff', fontWeight: 600, width: '28px' }}>{lineWidth}px</span>
                </div>
              </div>

              {/* Sección: Reglas y Utilidades */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Lienzo</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Botón de Reglas */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => setShowRulers(!showRulers)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        backgroundColor: showRulers ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                        color: '#ffffff',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Ruler size={14} />
                      <span>Reglas: {showRulers ? 'ON' : 'OFF'}</span>
                    </button>
                    {showRulers && (
                      <select
                        value={metricSystem}
                        onChange={(e) => setMetricSystem(e.target.value)}
                        style={{
                          backgroundColor: 'rgba(15, 23, 42, 0.7)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#ffffff',
                          fontSize: '11px',
                          borderRadius: '6px',
                          padding: '0 8px',
                          outline: 'none',
                          cursor: 'pointer',
                          fontFamily: 'inherit'
                        }}
                      >
                        <option value="px">px</option>
                        <option value="cm">cm</option>
                        <option value="mm">mm</option>
                        <option value="in">in</option>
                      </select>
                    )}
                  </div>

                  {/* Luz UV */}
                  <button
                    onClick={() => setShowSecurityInk(!showSecurityInk)}
                    style={{
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      backgroundColor: showSecurityInk ? '#c084fc' : 'rgba(255,255,255,0.05)',
                      color: showSecurityInk ? '#1e1b4b' : '#ffffff',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Sun size={14} />
                    <span>Luz UV: {showSecurityInk ? 'ON' : 'OFF'}</span>
                  </button>
                </div>
              </div>

              {/* Sección: Acciones */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: 'auto' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Acciones</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                  <button
                    onClick={() => canvasRef.current?.undo()}
                    style={{
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      color: '#ffffff',
                      cursor: 'pointer',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <Undo2 size={14} />
                    Deshacer
                  </button>
                  <button
                    onClick={() => canvasRef.current?.redo()}
                    style={{
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      color: '#ffffff',
                      cursor: 'pointer',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <Redo2 size={14} />
                    Rehacer
                  </button>
                </div>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    canvasRef.current?.exportPNG();
                  }}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Download size={14} />
                  Exportar PNG
                </button>

                <button
                  onClick={() => {
                    if (window.confirm('¿Limpiar pizarra completa para todos?')) {
                      canvasRef.current?.clearBoard();
                      setMobileMenuOpen(false);
                    }
                  }}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Trash2 size={14} />
                  Limpiar Todo
                </button>

                <button
                  onClick={() => {
                    setIsPresentationMode(true);
                    setMobileMenuOpen(false);
                  }}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <EyeOff size={14} />
                  Ocultar UI (Pres.)
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Botón flotante para salir del Modo Presentación */}
      {isPresentationMode && (
        <button
          onClick={() => setIsPresentationMode(false)}
          className="glass-panel btn-action"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            zIndex: 100,
            padding: '10px 14px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            opacity: (isCanvasDrawing || isUserIdle) ? 0 : 1,
            pointerEvents: (isCanvasDrawing || isUserIdle) ? 'none' : 'auto',
            transition: 'opacity 0.25s ease'
          }}
        >
          <Eye size={16} />
          Mostrar Controles
        </button>
      )}

      {/* Lienzo Canvas principal */}
      <Canvas
        ref={canvasRef}
        roomId={roomId}
        tool={activeTool}
        color={activeColor}
        lineWidth={lineWidth}
        metricSystem={metricSystem}
        showRulers={showRulers}
        showSecurityInk={showSecurityInk}
        onConnectionStatusChange={setIsConnected}
        onDrawingStateChange={setIsCanvasDrawing}
      />

      {/* Menú Radial Contextual Flotante y Arrastrable */}
      {roomId && (
        <RadialMenu
          activeTool={activeTool}
          activeColor={activeColor}
          onSelectTool={setActiveTool}
          onSelectColor={setActiveColor}
          onCustomColorClick={() => colorInputRef.current?.click()}
          isExpanded={isRadialExpanded}
          onToggleExpand={setIsRadialExpanded}
          isCanvasDrawing={isCanvasDrawing}
        />
      )}

      {/* Superposición Premium para habilitar Pantalla Completa en accesos directos */}
      {showFullscreenOverlay && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 2000,
          backgroundColor: 'rgba(11, 15, 25, 0.92)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '20px',
          pointerEvents: 'auto'
        }}>
          <div style={{
            display: 'inline-flex',
            padding: '16px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            color: '#ffffff',
            boxShadow: '0 10px 25px rgba(99, 102, 241, 0.35)',
            marginBottom: '10px'
          }}>
            <Sparkles size={40} />
          </div>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.5px' }}>Pizarra Interactiva</h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '320px', textAlign: 'center', lineHeight: 1.6 }}>
            Ingresa a la pizarra colaborativa directamente en el modo pantalla completa del navegador.
          </p>
          <button
            onClick={() => {
              enterFullscreen();
              setShowFullscreenOverlay(false);
            }}
            className="btn-action"
            style={{
              padding: '14px 32px',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: '0 6px 18px rgba(99, 102, 241, 0.3)',
              marginTop: '10px'
            }}
          >
            Entrar en Pantalla Completa
          </button>
        </div>
      )}

      {/* Selector de Color Oculto Nativo */}
      <input
        type="color"
        ref={colorInputRef}
        onChange={(e) => {
          setActiveColor(e.target.value);
          if (activeTool === 'eraser') setActiveTool('pencil');
        }}
        style={{ display: 'none' }}
      />

      {/* Icono Sutil flotante cuando el menú está oculto por inactividad (despierta el menú con un tap) */}
      {isUserIdle && !isCanvasDrawing && (
        <button
          onClick={() => {
            setIsUserIdle(false);
            resetIdleTimer();
          }}
          className="glass-panel btn-action animate-fade-in animate-pulse"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            zIndex: 1001,
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backgroundColor: 'rgba(30, 41, 59, 0.8)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
            opacity: 0.7,
            transition: 'opacity 0.2s ease, transform 0.2s ease',
            backdropFilter: 'blur(8px)'
          }}
          title="Mostrar barra de herramientas"
        >
          <PenTool size={16} />
        </button>
      )}

      {/* Atajos de Teclado del Navegador (Undo/Redo) */}
      <KeyboardShortcuts canvasRef={canvasRef} />
    </div>
  );
}

// Subcomponente helper para manejar atajos de teclado sin ensuciar el App
function KeyboardShortcuts({ canvasRef }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl + Z para deshacer
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        canvasRef.current?.undo();
      }
      // Ctrl + Y para rehacer
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        canvasRef.current?.redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canvasRef]);

  return null;
}
