import React, {
  Ref,
  useMemo,
  useContext,
  MutableRefObject,
  useRef,
  useState,
  useEffect,
  forwardRef,
  useCallback,
} from 'react';
import { theme } from 'antd';
import MoveableComponent, { OnDrag, OnRotate, OnResize } from 'react-moveable';
import {
  ZOOM,
  SchemaForUI,
  Size,
  ChangeSchemas,
  BasePdf,
  isBlankPdf,
  replacePlaceholders,
} from '@pdfme/common';
import { PluginsRegistry, OptionsContext } from '../../../contexts.js';
import { X, LockKeyhole, LockKeyholeOpen, Plus, GripVertical, Copy, Ellipsis } from 'lucide-react';
import { RULER_HEIGHT, RIGHT_SIDEBAR_WIDTH, DESIGNER_CLASSNAME } from '../../../constants.js';
import { usePrevious } from '../../../hooks.js';
import { round, flatten, uuid } from '../../../helper.js';
import Paper from '../../Paper.js';
import Renderer from '../../Renderer.js';
import Selecto from './Selecto.js';
import Moveable from './Moveable.js';
import Guides from './Guides.js';
import Mask from './Mask.js';
import Padding from './Padding.js';
import StaticSchema from '../../StaticSchema.js';

const mm2px = (mm: number) => mm * 3.7795275591;

const DELETE_BTN_ID = uuid();
const LOCK_BTN_ID = uuid();
const NOTION_PLUS_BTN_ID = uuid();
const NOTION_DRAG_BTN_ID = uuid();
const BUBBLE_DELETE_BTN_ID = uuid();
const BUBBLE_LOCK_BTN_ID = uuid();
const BUBBLE_COPY_BTN_ID = uuid();
const fmt4Num = (prop: string) => Number(prop.replace('px', ''));
const fmt = (prop: string) => round(fmt4Num(prop) / ZOOM, 2);
const isTopLeftResize = (d: string) => d === '-1,-1' || d === '-1,0' || d === '0,-1';
const normalizeRotate = (angle: number) => ((angle % 360) + 360) % 360;

// Safely extract string content from schema.content (handles objects with content property)
const safeContent = (content: unknown): string => {
  if (content == null) return '';
  if (typeof content === 'string') return content;
  if (typeof content === 'number') return String(content);
  if (typeof content === 'object' && 'content' in content) {
    return safeContent((content as { content: unknown }).content);
  }
  return '';
};

/* ── Notion-style left-side controls (+, ⋮⋮) ── */
const NotionLeftControls = ({
  activeElements: aes,
  hoveringSchemaId,
  schemas,
}: {
  activeElements: HTMLElement[];
  hoveringSchemaId: string | null;
  schemas: SchemaForUI[];
}) => {
  const { token } = theme.useToken();

  // Find the hovered schema element (could be active or just hovered)
  const targetSchema = hoveringSchemaId ? schemas.find(s => s.id === hoveringSchemaId) : null;
  const targetEl = hoveringSchemaId
    ? aes.find(ae => ae.id === hoveringSchemaId) ||
      document.getElementById(hoveringSchemaId)
    : null;

  if (!targetSchema || !targetEl || !(targetEl instanceof HTMLElement)) return null;

  const top = fmt4Num(targetEl.style.top);
  const left = fmt4Num(targetEl.style.left);

  const btnSize = 22;
  const gap = 1;
  // Position: horizontal row at top-left, above the element
  const controlTop = top - btnSize - 6;
  const controlLeft = left;

  const btnStyle: React.CSSProperties = {
    width: btnSize,
    height: btnSize,
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    borderRadius: 4,
    background: 'transparent',
    color: 'rgba(55, 53, 47, 0.35)',
    cursor: 'pointer',
    transition: 'all 0.12s ease',
    pointerEvents: 'auto' as const,
  };

  return (
    <div
      style={{
        position: 'absolute',
        zIndex: 2,
        top: controlTop,
        left: controlLeft,
        display: 'flex',
        flexDirection: 'row',
        gap,
        opacity: 0,
        transition: 'opacity 0.15s ease',
        pointerEvents: 'none',
      }}
      className="notion-left-controls"
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
    >
      <button
        id={NOTION_PLUS_BTN_ID}
        style={btnStyle}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.color = 'rgba(55, 53, 47, 0.65)';
          (e.currentTarget as HTMLElement).style.background = 'rgba(55, 53, 47, 0.08)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
          (e.currentTarget as HTMLElement).style.color = 'rgba(55, 53, 47, 0.35)';
        }}
        title="Add block"
      >
        <Plus size={14} strokeWidth={2} style={{ pointerEvents: 'none' }} />
      </button>
      <button
        id={NOTION_DRAG_BTN_ID}
        style={{ ...btnStyle, cursor: 'grab' }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.color = 'rgba(55, 53, 47, 0.65)';
          (e.currentTarget as HTMLElement).style.background = 'rgba(55, 53, 47, 0.08)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
          (e.currentTarget as HTMLElement).style.color = 'rgba(55, 53, 47, 0.35)';
        }}
        title="Drag to move / Click for menu"
      >
        <GripVertical size={14} strokeWidth={2} style={{ pointerEvents: 'none' }} />
      </button>
    </div>
  );
};

/* ── Editing Bubble Toolbar (above selected element) ── */
const EditingBubble = ({
  activeElements: aes,
  schemas,
}: {
  activeElements: HTMLElement[];
  schemas: SchemaForUI[];
}) => {
  const { token } = theme.useToken();

  if (aes.length === 0) return null;

  const selectedSchemas = schemas.filter(s => aes.map(ae => ae.id).includes(s.id));
  const isLocked = selectedSchemas.some(s => s.readOnly);

  // Get bounding box of all active elements
  const tops = aes.map(({ style }) => fmt4Num(style.top));
  const lefts = aes.map(({ style }) => fmt4Num(style.left));
  const rights = aes.map(({ style }) => fmt4Num(style.left) + fmt4Num(style.width));
  const minTop = Math.min(...tops);
  const minLeft = Math.min(...lefts);
  const maxRight = Math.max(...rights);
  const centerX = (minLeft + maxRight) / 2;

  // Schema type label
  const typeLabel = selectedSchemas.length === 1
    ? (selectedSchemas[0].type.charAt(0).toUpperCase() + selectedSchemas[0].type.slice(1))
    : `${selectedSchemas.length} items`;

  const bubbleHeight = 42;
  const gap = 8;

  const actionBtnStyle: React.CSSProperties = {
    width: 34,
    height: 34,
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    borderRadius: 6,
    background: 'transparent',
    color: 'rgba(55, 53, 47, 0.85)',
    cursor: 'pointer',
    transition: 'all 0.12s ease',
  };

  return (
    <div
      style={{
        position: 'absolute',
        zIndex: 10,
        top: minTop - bubbleHeight - gap,
        left: centerX,
        transform: 'translateX(-50%)',
        height: bubbleHeight,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '0 10px',
        borderRadius: 10,
        background: '#ffffff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.08)',
        whiteSpace: 'nowrap',
        pointerEvents: 'auto',
      }}
    >
      {/* Type label */}
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'rgba(55, 53, 47, 0.75)',
          padding: '0 10px 0 4px',
          borderRight: '1px solid rgba(55, 53, 47, 0.12)',
          marginRight: 2,
          userSelect: 'none',
          lineHeight: `${bubbleHeight}px`,
          letterSpacing: '0.01em',
        }}
      >
        {typeLabel}
      </span>

      {/* Duplicate */}
      <button
        id={BUBBLE_COPY_BTN_ID}
        style={actionBtnStyle}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(55, 53, 47, 0.08)'; (e.currentTarget as HTMLElement).style.color = '#37352f'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(55, 53, 47, 0.85)'; }}
        title="Duplicate"
      >
        <Copy size={18} strokeWidth={1.8} style={{ pointerEvents: 'none' }} />
      </button>

      {/* Lock toggle */}
      <button
        id={BUBBLE_LOCK_BTN_ID}
        style={actionBtnStyle}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(55, 53, 47, 0.08)'; (e.currentTarget as HTMLElement).style.color = '#37352f'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(55, 53, 47, 0.85)'; }}
        title={isLocked ? 'Unlock' : 'Lock'}
      >
        {isLocked ? (
          <LockKeyhole size={18} strokeWidth={1.8} style={{ pointerEvents: 'none' }} />
        ) : (
          <LockKeyholeOpen size={18} strokeWidth={1.8} style={{ pointerEvents: 'none' }} />
        )}
      </button>

      {/* Divider */}
      <div style={{ width: 1, height: 22, background: 'rgba(55, 53, 47, 0.12)', margin: '0 2px' }} />

      {/* Delete */}
      <button
        id={BUBBLE_DELETE_BTN_ID}
        style={{ ...actionBtnStyle, color: '#eb5757' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(235, 87, 87, 0.1)'; (e.currentTarget as HTMLElement).style.color = '#e03e3e'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#eb5757'; }}
        title="Delete"
      >
        <X size={18} strokeWidth={1.8} style={{ pointerEvents: 'none' }} />
      </button>
    </div>
  );
};

interface GuidesInterface {
  getGuides(): number[];
  scroll(pos: number): void;
  scrollGuides(pos: number): void;
  loadGuides(guides: number[]): void;
  resize(): void;
}

interface Props {
  basePdf: BasePdf;
  height: number;
  hoveringSchemaId: string | null;
  onChangeHoveringSchemaId: (id: string | null) => void;
  pageCursor: number;
  schemasList: SchemaForUI[][];
  scale: number;
  backgrounds: string[];
  pageSizes: Size[];
  size: Size;
  activeElements: HTMLElement[];
  onEdit: (targets: HTMLElement[]) => void;
  changeSchemas: ChangeSchemas;
  removeSchemas: (ids: string[]) => void;
  moveSchemaToPage: (schemaId: string, targetPageIndex: number, newPosition: { x: number; y: number }) => void;
  paperRefs: MutableRefObject<HTMLDivElement[]>;
  sidebarOpen: boolean;
}

const Canvas = (props: Props, ref: Ref<HTMLDivElement>) => {
  const {
    basePdf,
    pageCursor,
    scale,
    backgrounds,
    pageSizes,
    size,
    activeElements,
    schemasList,
    hoveringSchemaId,
    onEdit,
    changeSchemas,
    removeSchemas,
    moveSchemaToPage,
    onChangeHoveringSchemaId,
    paperRefs,
    sidebarOpen,
  } = props;
  const { token } = theme.useToken();
  const pluginsRegistry = useContext(PluginsRegistry);
  const options = useContext(OptionsContext);
  const isHeaderMode = (options as any).layoutMode === 'header';

  const verticalGuides = useRef<GuidesInterface[]>([]);
  const horizontalGuides = useRef<GuidesInterface[]>([]);
  const moveable = useRef<MoveableComponent>(null);

  const [isPressShiftKey, setIsPressShiftKey] = useState(false);
  const [editing, setEditing] = useState(false);

  const prevSchemas = usePrevious(schemasList[pageCursor]);

  const onKeydown = (e: KeyboardEvent) => {
    if (e.shiftKey) setIsPressShiftKey(true);
  };
  const onKeyup = (e: KeyboardEvent) => {
    if (e.key === 'Shift' || !e.shiftKey) setIsPressShiftKey(false);
    if (e.key === 'Escape' || e.key === 'Esc') setEditing(false);
  };

  const initEvents = useCallback(() => {
    window.addEventListener('keydown', onKeydown);
    window.addEventListener('keyup', onKeyup);
  }, []);

  const destroyEvents = useCallback(() => {
    window.removeEventListener('keydown', onKeydown);
    window.removeEventListener('keyup', onKeyup);
  }, []);

  useEffect(() => {
    initEvents();

    return destroyEvents;
  }, [initEvents, destroyEvents]);

  useEffect(() => {
    moveable.current?.updateRect();
    if (!prevSchemas) {
      return;
    }

    const prevSchemaKeys = JSON.stringify(prevSchemas[pageCursor] || {});
    const schemaKeys = JSON.stringify(schemasList[pageCursor] || {});

    if (prevSchemaKeys === schemaKeys) {
      moveable.current?.updateRect();
    }
  }, [pageCursor, schemasList, prevSchemas]);

  const onDrag = ({ target, top, left }: OnDrag) => {
    const { width: _width, height: _height } = target.style;
    const targetWidth = fmt(_width);
    const targetHeight = fmt(_height);
    const actualTop = top / ZOOM;
    const actualLeft = left / ZOOM;
    const { width: pageWidth, height: pageHeight } = pageSizes[pageCursor];
    let topPadding = 0;
    let rightPadding = 0;
    let bottomPadding = 0;
    let leftPadding = 0;

    if (isBlankPdf(basePdf)) {
      const [t, r, b, l] = basePdf.padding;
      topPadding = t * ZOOM;
      rightPadding = r;
      bottomPadding = b;
      leftPadding = l * ZOOM;
    }

    // Allow vertical overflow for cross-page dragging (don't clamp top/bottom)
    target.style.top = `${top}px`;

    if (actualLeft + targetWidth > pageWidth - rightPadding) {
      target.style.left = `${(pageWidth - targetWidth - rightPadding) * ZOOM}px`;
    } else {
      target.style.left = `${left < leftPadding ? leftPadding : left}px`;
    }
  };

  const onDragEnd = ({ target }: { target: HTMLElement | SVGElement }) => {
    const { top, left } = target.style;
    const posY = fmt(top);
    const posX = fmt(left);
    const { height: pageHeight } = pageSizes[pageCursor];

    // Cross-page detection: if element dragged past bottom or above top
    if (posY > pageHeight && pageCursor < schemasList.length - 1) {
      // Dragged below current page → move to next page
      const newY = Math.max(0, posY - pageHeight);
      moveSchemaToPage(target.id, pageCursor + 1, { x: posX, y: newY });
      return;
    }
    if (posY < 0 && pageCursor > 0) {
      // Dragged above current page → move to previous page
      const prevPageHeight = pageSizes[pageCursor - 1].height;
      const newY = Math.max(0, prevPageHeight + posY);
      moveSchemaToPage(target.id, pageCursor - 1, { x: posX, y: newY });
      return;
    }

    // Normal within-page drag
    changeSchemas([
      { key: 'position.y', value: posY, schemaId: target.id },
      { key: 'position.x', value: posX, schemaId: target.id },
    ]);
  };

  const onDragEnds = ({ targets }: { targets: (HTMLElement | SVGElement)[] }) => {
    // For group drags, check each target for cross-page. If any need to move, handle them individually.
    const normalUpdates: { key: string; value: number; schemaId: string }[][] = [];
    for (const target of targets) {
      const posY = fmt(target.style.top);
      const posX = fmt(target.style.left);
      const { height: pageHeight } = pageSizes[pageCursor];

      if (posY > pageHeight && pageCursor < schemasList.length - 1) {
        const newY = Math.max(0, posY - pageHeight);
        moveSchemaToPage(target.id, pageCursor + 1, { x: posX, y: newY });
      } else if (posY < 0 && pageCursor > 0) {
        const prevPageHeight = pageSizes[pageCursor - 1].height;
        const newY = Math.max(0, prevPageHeight + posY);
        moveSchemaToPage(target.id, pageCursor - 1, { x: posX, y: newY });
      } else {
        normalUpdates.push([
          { key: 'position.y', value: posY, schemaId: target.id },
          { key: 'position.x', value: posX, schemaId: target.id },
        ]);
      }
    }
    if (normalUpdates.length > 0) {
      changeSchemas(flatten(normalUpdates));
    }
  };

  const onRotate = ({ target, rotate }: OnRotate) => {
    target.style.transform = `rotate(${rotate}deg)`;
  };

  const onRotateEnd = ({ target }: { target: HTMLElement | SVGElement }) => {
    const { transform } = target.style;
    const rotate = Number(transform.replace('rotate(', '').replace('deg)', ''));
    const normalizedRotate = normalizeRotate(rotate);
    changeSchemas([{ key: 'rotate', value: normalizedRotate, schemaId: target.id }]);
  };

  const onRotateEnds = ({ targets }: { targets: (HTMLElement | SVGElement)[] }) => {
    const arg = targets.map(({ style: { transform }, id }) => {
      const rotate = Number(transform.replace('rotate(', '').replace('deg)', ''));
      const normalizedRotate = normalizeRotate(rotate);
      return [{ key: 'rotate', value: normalizedRotate, schemaId: id }];
    });
    changeSchemas(flatten(arg));
  };

  const onResizeEnd = ({ target }: { target: HTMLElement | SVGElement }) => {
    const { id, style } = target;
    const { width, height, top, left } = style;
    changeSchemas([
      { key: 'position.x', value: fmt(left), schemaId: id },
      { key: 'position.y', value: fmt(top), schemaId: id },
      { key: 'width', value: fmt(width), schemaId: id },
      { key: 'height', value: fmt(height), schemaId: id },
    ]);

    const targetSchema = schemasList[pageCursor].find((schema) => schema.id === id);

    if (!targetSchema) return;

    targetSchema.position.x = fmt(left);
    targetSchema.position.y = fmt(top);
    targetSchema.width = fmt(width);
    targetSchema.height = fmt(height);
  };

  const onResizeEnds = ({ targets }: { targets: (HTMLElement | SVGElement)[] }) => {
    const arg = targets.map(({ style: { width, height, top, left }, id }) => [
      { key: 'width', value: fmt(width), schemaId: id },
      { key: 'height', value: fmt(height), schemaId: id },
      { key: 'position.y', value: fmt(top), schemaId: id },
      { key: 'position.x', value: fmt(left), schemaId: id },
    ]);
    changeSchemas(flatten(arg));
  };

  const onResize = ({ target, width, height, direction }: OnResize) => {
    if (!target) return;
    let topPadding = 0;
    let rightPadding = 0;
    let bottomPadding = 0;
    let leftPadding = 0;

    if (isBlankPdf(basePdf)) {
      const [t, r, b, l] = basePdf.padding;
      topPadding = t * ZOOM;
      rightPadding = mm2px(r);
      bottomPadding = mm2px(b);
      leftPadding = l * ZOOM;
    }

    const pageWidth = mm2px(pageSizes[pageCursor].width);
    const pageHeight = mm2px(pageSizes[pageCursor].height);

    const obj: { top?: string; left?: string; width: string; height: string } = {
      width: `${width}px`,
      height: `${height}px`,
    };

    const s = target.style;
    let newLeft = fmt4Num(s.left) + (fmt4Num(s.width) - width);
    let newTop = fmt4Num(s.top) + (fmt4Num(s.height) - height);
    if (newLeft < leftPadding) {
      newLeft = leftPadding;
    }
    if (newTop < topPadding) {
      newTop = topPadding;
    }
    if (newLeft + width > pageWidth - rightPadding) {
      obj.width = `${pageWidth - rightPadding - newLeft}px`;
    }
    if (newTop + height > pageHeight - bottomPadding) {
      obj.height = `${pageHeight - bottomPadding - newTop}px`;
    }

    const d = direction.toString();
    if (isTopLeftResize(d)) {
      obj.top = `${newTop}px`;
      obj.left = `${newLeft}px`;
    } else if (d === '1,-1') {
      obj.top = `${newTop}px`;
    } else if (d === '-1,1') {
      obj.left = `${newLeft}px`;
    }
    Object.assign(s, obj);
  };

  const getGuideLines = (guides: GuidesInterface[], index: number) =>
    guides[index] && guides[index].getGuides().map((g) => g * ZOOM);

  const onClickMoveable = () => {
    // Just set editing to true without trying to access event properties
    setEditing(true);
  };

  const rotatable = useMemo(() => {
    const selectedSchemas = (schemasList[pageCursor] || []).filter((s) =>
      s && activeElements.filter((ae) => ae != null).map((ae) => ae.id).includes(s.id),
    );
    const schemaTypes = selectedSchemas.map((s) => s.type);
    const uniqueSchemaTypes = [...new Set(schemaTypes)];

    // Create a type-safe array of default schemas
    const defaultSchemas: Record<string, unknown>[] = [];

    pluginsRegistry.entries().forEach(([, plugin]) => {
      if (plugin.propPanel.defaultSchema) {
        defaultSchemas.push(plugin.propPanel.defaultSchema as Record<string, unknown>);
      }
    });

    // Check if all schema types have rotate property
    return uniqueSchemaTypes.every((type) => {
      const matchingSchema = defaultSchemas.find((ds) => ds && 'type' in ds && ds.type === type);
      return matchingSchema && 'rotate' in matchingSchema;
    });
  }, [activeElements, pageCursor, schemasList, pluginsRegistry]);

  return (
    <div
      className={DESIGNER_CLASSNAME + 'canvas'}
      style={{
        position: 'relative',
        overflow: 'auto',
        marginRight: sidebarOpen ? RIGHT_SIDEBAR_WIDTH : 0,
        background: isHeaderMode ? '#E8ECF4' : undefined,
        ...size,
      }}
      ref={ref}
    >
      <Selecto
        container={paperRefs.current[pageCursor]}
        continueSelect={isPressShiftKey}
        onDragStart={(e) => {
          // Use type assertion to safely access inputEvent properties
          const inputEvent = e.inputEvent as MouseEvent | TouchEvent;
          const target = inputEvent.target as Element | null;
          const isMoveableElement = moveable.current?.isMoveableElement(target as Element);

          if ((inputEvent.type === 'touchstart' && e.isTrusted) || isMoveableElement) {
            e.stop();
          }

          if (paperRefs.current[pageCursor] === target) {
            onEdit([]);
          }

          // Check if the target is an HTMLElement and has an id property
          const targetElement = target as HTMLElement | null;

          // Bubble toolbar: Delete
          if (targetElement && (targetElement.id === DELETE_BTN_ID || targetElement.id === BUBBLE_DELETE_BTN_ID)) {
            removeSchemas(activeElements.filter((ae) => ae != null).map((ae) => ae.id));
          }

          // Bubble toolbar: Lock toggle
          if (targetElement && (targetElement.id === LOCK_BTN_ID || targetElement.id === BUBBLE_LOCK_BTN_ID)) {
            const ids = activeElements.filter((ae) => ae != null).map((ae) => ae.id);
            const selectedSchemas = schemasList[pageCursor].filter((s) => ids.includes(s.id));
            const isAnyLocked = selectedSchemas.some((s) => s.readOnly);
            changeSchemas(ids.map((id) => ({ key: 'readOnly', value: !isAnyLocked, schemaId: id })));
          }
        }}
        onSelect={(e) => {
          // Use type assertions to safely access properties
          const inputEvent = e.inputEvent as MouseEvent | TouchEvent;
          const added = e.added as HTMLElement[];
          const removed = e.removed as HTMLElement[];
          const selected = e.selected as HTMLElement[];

          const isClick = inputEvent.type === 'mousedown';
          let newActiveElements: HTMLElement[] = isClick ? selected : [];

          if (!isClick && added.length > 0) {
            newActiveElements = activeElements.concat(added);
          }
          if (!isClick && removed.length > 0) {
            newActiveElements = activeElements.filter((ae) => !removed.includes(ae));
          }
          onEdit(newActiveElements);

          if (newActiveElements != activeElements) {
            setEditing(false);
          }

          // For MacOS CMD+SHIFT+3/4 screenshots where the keydown event is never received, check mouse too
          const mouseEvent = inputEvent as MouseEvent;
          if (mouseEvent && typeof mouseEvent.shiftKey === 'boolean' && !mouseEvent.shiftKey) {
            setIsPressShiftKey(false);
          }
        }}
      />
      <Paper
        paperRefs={paperRefs}
        scale={scale}
        size={size}
        schemasList={schemasList}
        pageSizes={pageSizes}
        backgrounds={backgrounds}
        hasRulers={!isHeaderMode}
        renderPaper={({ index, paperSize }) => {
          const selectedSchemas = schemasList[index].filter((s) => activeElements.map((ae) => ae.id).includes(s.id));
          const isAnyLocked = selectedSchemas.some((s) => s.readOnly);
          return (
            <>
              {/* Notion-style left controls (visible on hover) */}
              {!editing && pageCursor === index && (
                <NotionLeftControls
                  activeElements={activeElements}
                  hoveringSchemaId={hoveringSchemaId}
                  schemas={schemasList[index]}
                />
              )}
              {/* Editing bubble toolbar (visible when selected) */}
              {!editing && activeElements.length > 0 && pageCursor === index && (
                <EditingBubble activeElements={activeElements} schemas={schemasList[index]} />
              )}
              {!isHeaderMode && <Padding basePdf={basePdf} />}
            <StaticSchema
              template={{ schemas: schemasList, basePdf }}
              input={Object.fromEntries(
                schemasList.flat().map(({ name, content = '' }) => [name, content]),
              )}
              scale={scale}
              totalPages={schemasList.length}
              currentPage={index + 1}
            />
            {!isHeaderMode && (
              <Guides
                paperSize={paperSize}
                horizontalRef={(e) => {
                  if (e) horizontalGuides.current[index] = e;
                }}
                verticalRef={(e) => {
                  if (e) verticalGuides.current[index] = e;
                }}
              />
            )}
            {pageCursor !== index ? (
              isHeaderMode ? (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    zIndex: 100,
                    width: paperSize.width,
                    height: paperSize.height,
                    background: 'rgba(232, 236, 244, 0.6)',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    // Allow clicking to switch to this page
                  }}
                />
              ) : (
                <Mask
                  width={paperSize.width + RULER_HEIGHT}
                  height={paperSize.height + RULER_HEIGHT}
                />
              )
            ) : (
              !editing && (
                <Moveable
                  ref={moveable}
                  target={activeElements}
                  bounds={{ left: 0, top: -99999, bottom: 99999, right: paperSize.width }}
                  horizontalGuidelines={getGuideLines(horizontalGuides.current, index)}
                  verticalGuidelines={getGuideLines(verticalGuides.current, index)}
                  keepRatio={isPressShiftKey}
                  rotatable={rotatable && !isAnyLocked}
                  draggable={!isAnyLocked}
                  resizable={!isAnyLocked}
                  onDrag={onDrag}
                  onDragEnd={onDragEnd}
                  onDragGroupEnd={onDragEnds}
                  onRotate={onRotate}
                  onRotateEnd={onRotateEnd}
                  onRotateGroupEnd={onRotateEnds}
                  onResize={onResize}
                  onResizeEnd={onResizeEnd}
                  onResizeGroupEnd={onResizeEnds}
                  onClick={onClickMoveable}
                />
              )
            )}
          </>
        )}}
        renderSchema={({ schema, index }) => {
          const mode =
            editing && activeElements.filter((ae) => ae != null).map((ae) => ae.id).includes(schema.id)
              ? 'designer'
              : 'viewer';

          const content = safeContent(schema.content);
          let value = content;

          if (mode !== 'designer' && schema.readOnly) {
            const variables = {
              ...schemasList.flat().reduce(
                (acc, currSchema) => {
                  acc[currSchema.name] = safeContent(currSchema.content);
                  return acc;
                },
                {} as Record<string, string>,
              ),
              totalPages: schemasList.length,
              currentPage: index + 1,
            };

            value = replacePlaceholders({ content, variables, schemas: schemasList });
          }

          return (
            <Renderer
              key={schema.id}
              schema={schema}
              basePdf={basePdf}
              value={value}
              onChangeHoveringSchemaId={onChangeHoveringSchemaId}
              mode={mode}
              onChange={
                (schemasList[pageCursor] || []).some((s) => s.id === schema.id)
                  ? (arg) => {
                    // Use type assertion to safely handle the argument
                    type ChangeArg = { key: string; value: unknown };
                    const args = Array.isArray(arg) ? (arg as ChangeArg[]) : [arg as ChangeArg];
                    changeSchemas(
                      args.map(({ key, value }) => ({ key, value, schemaId: schema.id })),
                    );
                  }
                  : undefined
              }
              stopEditing={() => setEditing(false)}
              outline={hoveringSchemaId === schema.id
                ? `1px solid ${token.colorPrimary}`
                : 'none'}
              scale={scale}
            />
          );
        }}
      />
    </div>
  );
};
export default forwardRef<HTMLDivElement, Props>(Canvas);
