import React, { useState, useEffect, useRef } from 'react';
import { 
  Pen, 
  Eraser, 
  Minus, 
  Square, 
  Circle as CircleIcon, 
  Undo2, 
  Redo2, 
  Trash2, 
  X,
  Move,
  Triangle,
  ArrowUpRight,
  Star,
  Shapes,
  ArrowLeft,
  PenTool,
  Highlighter,
  Zap,
  Palette,
  Sparkles,
  Lock,
  EyeOff,
  FileText
} from 'lucide-react';

const COLORS = [
  { name: 'Blanco', value: '#ffffff' },
  { name: 'Azul', value: '#38bdf8' },
  { name: 'Rojo', value: '#ef4444' },
  { name: 'Verde', value: '#10b981' },
  { name: 'Amarillo', value: '#ffd700' }
];

export default function RadialMenu({
  activeTool,
  activeColor,
  onSelectTool,
  onSelectColor,
  onCustomColorClick,
  isExpanded,
  onToggleExpand,
  isCanvasDrawing
}) {
  const [position, setPosition] = useState({
    x: window.innerWidth - 120,
    y: window.innerHeight / 2
  });

  const [currentMenu, setCurrentMenu] = useState('main');

  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const positionStart = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isExpanded) {
      setCurrentMenu('main');
    }
  }, [isExpanded]);

  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        const newX = Math.min(prev.x, window.innerWidth - 50);
        const newY = Math.min(prev.y, window.innerHeight - 50);
        return { x: newX, y: newY };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePointerDown = (e) => {
    if (isExpanded && e.target.closest('button') && !e.target.closest('.drag-handle')) {
      return;
    }
    
    setIsDragging(true);
    hasMoved.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY };
    positionStart.current = { x: position.x, y: position.y };

    if (menuRef.current) {
      try {
        menuRef.current.setPointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    
    // Activar arrastre solo si se mueve más de 6px (evita micro-movimientos de tap)
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
      hasMoved.current = true;
    }

    if (hasMoved.current) {
      const newX = Math.max(40, Math.min(window.innerWidth - 40, positionStart.current.x + dx));
      const newY = Math.max(40, Math.min(window.innerHeight - 40, positionStart.current.y + dy));
      setPosition({ x: newX, y: newY });
    }
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);
    
    if (menuRef.current) {
      try {
        menuRef.current.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }

    if (!hasMoved.current) {
      if (onToggleExpand) {
        onToggleExpand(!isExpanded);
      }
    }
  };

  const dialRadius = 86;
  const getPositionStyles = (angleInDegrees, elementRadius = 16) => {
    const angleInRadians = (angleInDegrees * Math.PI) / 180;
    const posX = Math.cos(angleInRadians) * dialRadius;
    const posY = Math.sin(angleInRadians) * dialRadius;
    return {
      position: 'absolute',
      left: `calc(50% + ${posX}px - ${elementRadius}px)`,
      top: `calc(50% + ${posY}px - ${elementRadius}px)`,
      zIndex: 5
    };
  };

  const getCollapsedIcon = () => {
    switch (activeTool) {
      case 'pencil': return <Pen size={20} />;
      case 'highlighter': return <Highlighter size={20} />;
      case 'dashed': return <Minus size={20} style={{ strokeDasharray: '3 3' }} />;
      case 'magic': return <Sparkles size={20} />;
      case 'indelible': return <Lock size={20} />;
      case 'security': return <EyeOff size={20} />;
      case 'eraser': return <Eraser size={20} />;
      case 'laser': return <Zap size={20} />;
      case 'sticky': return <FileText size={20} />;
      case 'line': return <Minus size={20} />;
      case 'rect': return <Square size={20} />;
      case 'circle': return <CircleIcon size={20} />;
      case 'triangle': return <Triangle size={20} />;
      case 'arrow': return <ArrowUpRight size={20} />;
      case 'star': return <Star size={20} />;
      default: return <Pen size={20} />;
    }
  };

  // 1. Menú Principal (Figuras, Pinceles, Borrador, Láser, Post-its)
  const mainTools = [
    { id: 'brushes_menu', icon: PenTool, label: 'Pinceles...' },
    { id: 'eraser', icon: Eraser, label: 'Borrador' },
    { id: 'shapes_menu', icon: Shapes, label: 'Figuras...' },
    { id: 'laser', icon: Zap, label: 'Puntero Láser' },
    { id: 'sticky', icon: FileText, label: 'Nota Adhesiva' }
  ];

  // 2. Submenú: Figuras geométricas
  const shapesSubmenu = [
    { id: 'back', icon: ArrowLeft, label: 'Atrás', isAction: true },
    { id: 'line', icon: Minus, label: 'Línea' },
    { id: 'rect', icon: Square, label: 'Rectángulo' },
    { id: 'circle', icon: CircleIcon, label: 'Círculo' },
    { id: 'triangle', icon: Triangle, label: 'Triángulo' },
    { id: 'arrow', icon: ArrowUpRight, label: 'Flecha' },
    { id: 'star', icon: Star, label: 'Estrella' }
  ];

  // 3. Submenú: Pinceles
  const brushesSubmenu = [
    { id: 'back', icon: ArrowLeft, label: 'Atrás', isAction: true },
    { id: 'pencil', icon: Pen, label: 'Pincel estándar' },
    { id: 'highlighter', icon: Highlighter, label: 'Resaltador' },
    { id: 'dashed', icon: Minus, label: 'Trazo Discontinuo' },
    { id: 'magic', icon: Sparkles, label: 'Pluma Mágica (Fading)' },
    { id: 'indelible', icon: Lock, label: 'Tinta Indeleble' },
    { id: 'security', icon: EyeOff, label: 'Tinta de Seguridad' }
  ];

  const getToolsToRender = () => {
    if (currentMenu === 'shapes') return shapesSubmenu;
    if (currentMenu === 'brushes') return brushesSubmenu;
    return mainTools;
  };

  const toolsToRender = getToolsToRender();
  const isCustomColorActive = !COLORS.some(c => c.value === activeColor);

  return (
    <div
      ref={menuRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="animate-radial-pop"
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: isExpanded ? '230px' : '76px',
        height: isExpanded ? '230px' : '76px',
        zIndex: 1000,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: 'translate(-50%, -50%)',
        backgroundColor: isExpanded ? '#1b2336' : 'transparent',
        border: isExpanded ? '4px solid #2e3b57' : 'none',
        boxShadow: isExpanded ? '0 25px 60px rgba(0, 0, 0, 0.8)' : 'none',
        touchAction: 'none',
        pointerEvents: isCanvasDrawing ? 'none' : 'auto',
        opacity: isCanvasDrawing ? 0 : isExpanded ? 1 : 0.35,
        transition: 'width 0.2s ease, height 0.2s ease, background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.22s ease'
      }}
    >
      {/* Botón Central / Único botón cuando está colapsado */}
      <div
        className="drag-handle"
        style={{
          width: '74px',
          height: '74px',
          borderRadius: '50%',
          backgroundColor: '#111827',
          border: `3px solid ${activeColor}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
          zIndex: 10,
          gap: '2px',
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none'
        }}
        title={isExpanded ? "Arrastra para mover" : "Pulsa para expandir el menú"}
      >
        <span style={{ color: '#64748b', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase' }}>
          {isExpanded 
            ? (currentMenu === 'main' ? 'Mover' : currentMenu === 'shapes' ? 'Figuras' : 'Pinceles')
            : 'Herram.'
          }
        </span>
        <div style={{ color: activeColor }}>
          {isExpanded ? (
            currentMenu === 'main' ? <Move size={16} /> : currentMenu === 'shapes' ? <Shapes size={16} /> : <PenTool size={16} />
          ) : (
            getCollapsedIcon()
          )}
        </div>
      </div>

      {/* Renderizar resto de herramientas y colores solo si está expandido */}
      {isExpanded && (
        <>
          {/* 1. ARCO DE COLORES (Oculto en submenús) */}
          {currentMenu === 'main' && COLORS.map((color, index) => {
            const angle = -50 + (index * 90) / (COLORS.length - 1);
            const isActive = activeColor === color.value && activeTool !== 'eraser';
            
            return (
              <button
                key={color.value}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => {
                  onSelectColor(color.value);
                  if (activeTool === 'eraser') onSelectTool('pencil');
                  if (onToggleExpand) onToggleExpand(false);
                }}
                className="btn-action"
                style={{
                  ...getPositionStyles(angle, 14),
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: color.value,
                  border: isActive ? '3px solid #ffffff' : '2px solid #111827',
                  boxShadow: isActive ? `0 0 12px ${color.value}` : '0 2px 5px rgba(0,0,0,0.3)',
                  cursor: 'pointer'
                }}
                title={color.name}
              />
            );
          })}

          {/* Botón de Color Personalizado (Oculto en submenús) */}
          {currentMenu === 'main' && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                onCustomColorClick();
                if (onToggleExpand) onToggleExpand(false);
              }}
              className="btn-action"
              style={{
                ...getPositionStyles(60, 15),
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ff0055, #00ff55, #0055ff)',
                border: isCustomColorActive ? '3px solid #ffffff' : '2px solid #111827',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: isCustomColorActive ? '0 0 12px #ffffff' : '0 2px 5px rgba(0,0,0,0.3)'
              }}
              title="Color Personalizado"
            >
              <Palette size={14} />
            </button>
          )}

          {/* 2. ARCO DE HERRAMIENTAS DINÁMICO */}
          {toolsToRender.map((tool, index) => {
            const isWide = toolsToRender.length > 5;
            const minAngle = isWide ? 110 : toolsToRender.length === 5 ? 120 : 130;
            const maxAngle = isWide ? 250 : toolsToRender.length === 5 ? 240 : 230;
            const totalAngle = maxAngle - minAngle;
            
            const angle = minAngle + (index * totalAngle) / (toolsToRender.length - 1);
            const isActive = activeTool === tool.id;
            const IconComponent = tool.icon;

            return (
              <button
                key={tool.id}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => {
                  if (tool.id === 'shapes_menu') {
                    setCurrentMenu('shapes');
                  } else if (tool.id === 'brushes_menu') {
                    setCurrentMenu('brushes');
                  } else if (tool.id === 'back') {
                    setCurrentMenu('main');
                  } else {
                    onSelectTool(tool.id);
                    if (onToggleExpand) onToggleExpand(false);
                  }
                }}
                className="btn-action"
                style={{
                  ...getPositionStyles(angle, 16),
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: tool.id === 'back' 
                    ? '#374151' 
                    : isActive ? 'var(--primary)' : '#1e293b',
                  border: isActive ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.08)',
                  color: tool.id === 'back' ? '#ffd700' : '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 3px 6px rgba(0,0,0,0.3)'
                }}
                title={tool.label}
              >
                {tool.id === 'dashed' ? (
                  <Minus size={14} style={{ strokeDasharray: '3 3' }} />
                ) : (
                  <IconComponent size={14} />
                )}
              </button>
            );
          })}

          {/* 3. ACCIONES RÁPIDAS (Ocultas en submenús) */}
          {currentMenu === 'main' && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                if (onToggleExpand) onToggleExpand(false);
              }}
              className="btn-action"
              style={{
                ...getPositionStyles(-90, 15),
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                backgroundColor: '#374151',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 3px 6px rgba(0,0,0,0.3)'
              }}
              title="Colapsar menú"
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          )}

          {currentMenu === 'main' && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                if (window.confirm('¿Limpiar pizarra completa?')) {
                  const clearEvent = new CustomEvent('pizarra-clear');
                  window.dispatchEvent(clearEvent);
                  if (onToggleExpand) onToggleExpand(false);
                }
              }}
              className="btn-action"
              style={{
                ...getPositionStyles(90, 16),
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#374151',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 3px 6px rgba(0,0,0,0.3)'
              }}
              title="Limpiar Todo"
            >
              <Trash2 size={14} />
            </button>
          )}
        </>
      )}
    </div>
  );
}
