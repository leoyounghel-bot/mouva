import React, { useContext, useState, useRef, useCallback } from 'react';
import { Size } from '@pdfme/common';
// Import icons from lucide-react
// Note: In tests, these will be mocked by the mock file in __mocks__/lucide-react.js
import { Plus, Minus, ChevronLeft, ChevronRight, FilePlus, Trash2, GripHorizontal } from 'lucide-react';

import { theme } from 'antd';
import { I18nContext } from '../contexts.js';
import { useMaxZoom } from '../helper.js';
import { UI_CLASSNAME } from '../constants.js';

type ZoomProps = {
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
};

const Zoom = ({ zoomLevel, setZoomLevel }: ZoomProps) => {
  const zoomStep = 0.25;
  const maxZoom = useMaxZoom();
  const minZoom = 0.25;

  const nextZoomOut = zoomLevel - zoomStep;
  const nextZoomIn = zoomLevel + zoomStep;

  const buttonStyle: React.CSSProperties = {
    width: 26,
    height: 26,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    borderRadius: 6,
    transition: 'background 0.2s ease',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button
        className={UI_CLASSNAME + 'zoom-out'}
        style={{
          ...buttonStyle,
          opacity: minZoom >= nextZoomOut ? 0.4 : 1,
          cursor: minZoom >= nextZoomOut ? 'not-allowed' : 'pointer',
        }}
        disabled={minZoom >= nextZoomOut}
        onClick={() => setZoomLevel(nextZoomOut)}
        onMouseEnter={(e) => { if (!(minZoom >= nextZoomOut)) e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <Minus size={14} color="white" />
      </button>
      <span style={{ 
        color: 'white', 
        fontSize: 11, 
        fontWeight: 600,
        minWidth: 38,
        textAlign: 'center',
      }}>
        {Math.round(zoomLevel * 75)}%
      </span>
      <button
        className={UI_CLASSNAME + 'zoom-in'}
        style={{
          ...buttonStyle,
          opacity: maxZoom < nextZoomIn ? 0.4 : 1,
          cursor: maxZoom < nextZoomIn ? 'not-allowed' : 'pointer',
        }}
        disabled={maxZoom < nextZoomIn}
        onClick={() => setZoomLevel(nextZoomIn)}
        onMouseEnter={(e) => { if (!(maxZoom < nextZoomIn)) e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <Plus size={14} color="white" />
      </button>
    </div>
  );
};

type PagerProps = {
  pageCursor: number;
  pageNum: number;
  setPageCursor: (page: number) => void;
};

const Pager = ({ pageCursor, pageNum, setPageCursor }: PagerProps) => {
  const buttonStyle: React.CSSProperties = {
    width: 24,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    borderRadius: 5,
    transition: 'background 0.2s ease',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <button
        className={UI_CLASSNAME + 'page-prev'}
        style={{
          ...buttonStyle,
          opacity: pageCursor <= 0 ? 0.4 : 1,
          cursor: pageCursor <= 0 ? 'not-allowed' : 'pointer',
        }}
        disabled={pageCursor <= 0}
        onClick={() => setPageCursor(pageCursor - 1)}
        onMouseEnter={(e) => { if (pageCursor > 0) e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <ChevronLeft size={12} color="white" />
      </button>
      <span style={{ 
        color: 'white', 
        fontSize: 11, 
        fontWeight: 500,
        padding: '0 2px',
      }}>
        {pageCursor + 1} / {pageNum}
      </span>
      <button
        className={UI_CLASSNAME + 'page-next'}
        style={{
          ...buttonStyle,
          opacity: pageCursor + 1 >= pageNum ? 0.4 : 1,
          cursor: pageCursor + 1 >= pageNum ? 'not-allowed' : 'pointer',
        }}
        disabled={pageCursor + 1 >= pageNum}
        onClick={() => setPageCursor(pageCursor + 1)}
        onMouseEnter={(e) => { if (pageCursor + 1 < pageNum) e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <ChevronRight size={12} color="white" />
      </button>
    </div>
  );
};

type CtlBarProps = {
  size: Size;
  pageCursor: number;
  pageNum: number;
  setPageCursor: (page: number) => void;
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
  addPageAfter?: () => void;
  removePage?: () => void;
  paperCenterX?: number; // Center X position of the paper in the viewport (in pixels)
  paperBottomY?: number; // Bottom Y position of the paper in the viewport (in pixels)
};

const CtlBar = (props: CtlBarProps) => {
  const { token } = theme.useToken();
  const i18n = useContext(I18nContext);

  const {
    size,
    pageCursor,
    pageNum,
    setPageCursor,
    zoomLevel,
    setZoomLevel,
    addPageAfter,
    removePage,
    paperCenterX,
    paperBottomY,
  } = props;

  // Track if user has manually dragged the control bar
  const [hasBeenDragged, setHasBeenDragged] = useState(false);
  
  // Drag offset (only used after user drags)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setHasBeenDragged(true); // Mark as dragged when user starts dragging
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: dragOffset.x,
      initialY: dragOffset.y,
    };
  }, [dragOffset]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragRef.current) return;
    
    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;
    
    let newX = dragRef.current.initialX + deltaX;
    let newY = dragRef.current.initialY + deltaY;
    
    // Only constrain the right boundary to prevent going into AI Chat area
    // The control bar starts centered at 50%, so we limit how far right it can go
    const maxX = size.width / 2 - 80; // Don't go into the right sidebar/AI chat area
    if (newX > maxX) {
      newX = maxX;
    }
    
    setDragOffset({ x: newX, y: newY });
  }, [isDragging, size.width]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragRef.current = null;
  }, []);

  // Add global mouse event listeners for dragging
  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const showPageActions = addPageAfter || (removePage && pageNum > 1 && pageCursor !== 0);

  const actionButtonStyle: React.CSSProperties = {
    width: 26,
    height: 26,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    background: 'rgba(255,255,255,0.1)',
    cursor: 'pointer',
    borderRadius: 6,
    transition: 'all 0.2s ease',
  };

  // Fixed gap between paper bottom and control bar
  const PAPER_GAP = 24;

  // Use fixed positioning so the control bar stays in place regardless of zoom level
  const ctlBarStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    boxSizing: 'border-box',
    padding: '4px 12px',
    borderRadius: 18,
    background: 'linear-gradient(135deg, rgba(107, 114, 128, 0.9) 0%, rgba(75, 85, 99, 0.95) 100%)',
    backdropFilter: 'blur(12px)',
    boxShadow: isDragging 
      ? '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
      : '0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    cursor: isDragging ? 'grabbing' : 'default',
    userSelect: 'none',
    transition: isDragging ? 'none' : 'box-shadow 0.2s ease',
    // Fixed position at bottom-right of canvas area (accounting for AI chat width)
    right: 420 + (hasBeenDragged ? -dragOffset.x : 0), // AI chat panel is ~400px wide
    bottom: 24 + (hasBeenDragged ? -dragOffset.y : 0),
  };

  return (
    <div
      className={UI_CLASSNAME + 'control-bar'}
      style={ctlBarStyle}
    >
      {/* Drag Handle */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isDragging ? 'grabbing' : 'grab',
          padding: '4px 2px',
          marginRight: 4,
          borderRadius: 4,
          transition: 'background 0.2s ease',
        }}
        onMouseEnter={(e) => { if (!isDragging) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        title="拖动"
      >
        <GripHorizontal size={14} color="rgba(255,255,255,0.6)" />
      </div>

      {/* Separator after drag handle */}
      <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.2)', marginRight: 4 }} />

      {/* Zoom Controls */}
      <Zoom zoomLevel={zoomLevel} setZoomLevel={setZoomLevel} />

      {/* Separator - only show if there are more controls */}
      {(pageNum > 1 || showPageActions) && (
        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />
      )}

      {/* Page Navigation */}
      {pageNum > 1 && (
        <Pager
          pageCursor={pageCursor}
          pageNum={pageNum}
          setPageCursor={setPageCursor}
        />
      )}

      {/* Page Actions */}
      {showPageActions && (
        <>
          {pageNum > 1 && <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.2)', margin: '0 2px' }} />}
          <div style={{ display: 'flex', gap: 4 }}>
            {addPageAfter && (
              <button
                title={i18n('addPageAfter')}
                style={actionButtonStyle}
                onClick={addPageAfter}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(10, 10, 10, 0.6)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              >
                <FilePlus size={13} color="white" />
              </button>
            )}
            {removePage && pageNum > 1 && pageCursor !== 0 && (
              <button
                title={i18n('removePage')}
                style={actionButtonStyle}
                onClick={removePage}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.6)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              >
                <Trash2 size={13} color="white" />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CtlBar;
