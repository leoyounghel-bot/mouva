import React, { useRef, useState, useContext, useCallback, useEffect } from 'react';
import { theme } from 'antd';
import {
  cloneDeep,
  ZOOM,
  Template,
  Schema,
  SchemaForUI,
  ChangeSchemas,
  DesignerProps,
  Size,
  isBlankPdf,
  px2mm,
} from '@pdfme/common';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import RightSidebar from './RightSidebar/index.js';
import LeftSidebar from './LeftSidebar.js';
import Canvas from './Canvas/index.js';
import Renderer from '../Renderer.js';
import { RULER_HEIGHT, RIGHT_SIDEBAR_WIDTH, LEFT_SIDEBAR_WIDTH } from '../../constants.js';
import { I18nContext, OptionsContext, PluginsRegistry } from '../../contexts.js';
import {
  schemasList2template,
  uuid,
  round,
  template2SchemasList,
  getPagesScrollTopByIndex,
  changeSchemas as _changeSchemas,
  useMaxZoom,
} from '../../helper.js';
import { useUIPreProcessor, useScrollPageCursor, useInitEvents } from '../../hooks.js';
import Root from '../Root.js';
import ErrorScreen from '../ErrorScreen.js';
import CtlBar from '../CtlBar.js';

/**
 * When the canvas scales there is a displacement of the starting position of the dragged schema.
 * It moves left or right from the top-left corner of the drag icon depending on the scale.
 * This function calculates the adjustment needed to compensate for this displacement.
 */
const scaleDragPosAdjustment = (adjustment: number, scale: number): number => {
  if (scale > 1) return adjustment * (scale - 1);
  if (scale < 1) return adjustment * -(1 - scale);
  return 0;
};

const TemplateEditor = ({
  template,
  size,
  onSaveTemplate,
  onChangeTemplate,
  onPageCursorChange,
  onSelectionChange,
}: Omit<DesignerProps, 'domContainer'> & {
  size: Size;
  onSaveTemplate: (t: Template) => void;
  onChangeTemplate: (t: Template) => void;
} & {
  onChangeTemplate: (t: Template) => void;
  onPageCursorChange: (newPageCursor: number, totalPages: number) => void;
  onSelectionChange?: (schemas: SchemaForUI[]) => void;
}) => {
  const past = useRef<SchemaForUI[][]>([]);
  const future = useRef<SchemaForUI[][]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const paperRefs = useRef<HTMLDivElement[]>([]);

  const i18n = useContext(I18nContext);
  const pluginsRegistry = useContext(PluginsRegistry);
  const options = useContext(OptionsContext);
  const maxZoom = useMaxZoom();

  const [hoveringSchemaId, setHoveringSchemaId] = useState<string | null>(null);
  const [activeElements, setActiveElements] = useState<HTMLElement[]>([]);
  const [activeDragData, setActiveDragData] = useState<Schema | null>(null);
  const { token } = theme.useToken();
  const [schemasList, setSchemasList] = useState<SchemaForUI[][]>([[]] as SchemaForUI[][]);
  const [pageCursor, setPageCursor] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(options.zoomLevel ?? 1);
  const [sidebarOpen, setSidebarOpen] = useState(options.sidebarOpen ?? true);
  const [prevTemplate, setPrevTemplate] = useState<Template | null>(null);

  const { backgrounds, pageSizes, scale, error, refresh } = useUIPreProcessor({
    template,
    size,
    zoomLevel,
    maxZoom,
  });

  const onEdit = (targets: HTMLElement[]) => {
    setActiveElements(targets);
    setHoveringSchemaId(null);
    // Auto-open sidebar when selecting an element
    if (targets.length > 0) {
      setSidebarOpen(true);
    }
    // Notify parent of selection change
    if (onSelectionChange) {
      const ids = targets.map((t) => t.id);
      const selectedSchemas = schemasList[pageCursor].filter((s) => ids.includes(s.id));
      onSelectionChange(selectedSchemas);
    }
  };

  const onEditEnd = () => {
    setActiveElements([]);
    setHoveringSchemaId(null);
    // Notify parent of selection cleared
    if (onSelectionChange) {
      onSelectionChange([]);
    }
  };

  // Update component state only when _options_ changes
  // Ignore exhaustive useEffect dependency warnings here
  useEffect(() => {
    if (typeof options.zoomLevel === 'number' && options.zoomLevel !== zoomLevel) {
      setZoomLevel(options.zoomLevel);
    }
    if (typeof options.sidebarOpen === 'boolean' && options.sidebarOpen !== sidebarOpen) {
      setSidebarOpen(options.sidebarOpen);
    }
    // eslint-disable-next-line
  }, [options]);

  useScrollPageCursor({
    ref: canvasRef,
    pageSizes,
    scale,
    pageCursor,
    onChangePageCursor: (p) => {
      setPageCursor(p);
      onPageCursorChange(p, schemasList.length);
      onEditEnd();
    },
  });

  const commitSchemas = useCallback(
    (newSchemas: SchemaForUI[]) => {
      future.current = [];
      past.current.push(cloneDeep(schemasList[pageCursor]));
      const _schemasList = cloneDeep(schemasList);
      _schemasList[pageCursor] = newSchemas;
      setSchemasList(_schemasList);
      onChangeTemplate(schemasList2template(_schemasList, template.basePdf));
    },
    [template, schemasList, pageCursor, onChangeTemplate],
  );

  const removeSchemas = useCallback(
    (ids: string[]) => {
      commitSchemas(schemasList[pageCursor].filter((schema) => !ids.includes(schema.id)));
      onEditEnd();
    },
    [schemasList, pageCursor, commitSchemas],
  );

  const moveSchemaToPage = useCallback(
    (schemaId: string, targetPageIndex: number, newPosition: { x: number; y: number }) => {
      if (targetPageIndex < 0 || targetPageIndex >= schemasList.length) return;
      if (targetPageIndex === pageCursor) return;

      const schema = schemasList[pageCursor].find((s) => s.id === schemaId);
      if (!schema) return;

      const _schemasList = cloneDeep(schemasList);
      // Remove from current page
      _schemasList[pageCursor] = _schemasList[pageCursor].filter((s) => s.id !== schemaId);
      // Add to target page with new position
      const movedSchema = cloneDeep(schema);
      movedSchema.position = { x: newPosition.x, y: newPosition.y };
      _schemasList[targetPageIndex].push(movedSchema);

      // Commit the full change
      future.current = [];
      past.current.push(cloneDeep(schemasList[pageCursor]));
      setSchemasList(_schemasList);
      onChangeTemplate(schemasList2template(_schemasList, template.basePdf));

      // Switch to target page
      setPageCursor(targetPageIndex);
      onPageCursorChange(targetPageIndex, _schemasList.length);
      onEditEnd();

      // Scroll to the target page
      setTimeout(() => {
        if (canvasRef.current) {
          canvasRef.current.scrollTop = getPagesScrollTopByIndex(pageSizes, targetPageIndex, scale);
        }
      }, 0);
    },
    [schemasList, pageCursor, template, onChangeTemplate, onPageCursorChange, pageSizes, scale],
  );

  const changeSchemas: ChangeSchemas = useCallback(
    (objs) => {
      _changeSchemas({
        objs,
        schemas: schemasList[pageCursor],
        basePdf: template.basePdf,
        pluginsRegistry,
        pageSize: pageSizes[pageCursor],
        commitSchemas,
      });
    },
    [commitSchemas, pageCursor, schemasList, pluginsRegistry, pageSizes, template.basePdf],
  );

  useInitEvents({
    pageCursor,
    pageSizes,
    activeElements,
    template,
    schemasList,
    changeSchemas,
    commitSchemas,
    removeSchemas,
    onSaveTemplate,
    past,
    future,
    setSchemasList,
    onEdit,
    onEditEnd,
  });

  const updateTemplate = useCallback(async (newTemplate: Template) => {
    const sl = await template2SchemasList(newTemplate);
    setSchemasList(sl);
    onEditEnd();
    setPageCursor(0);
    if (canvasRef.current?.scroll) {
      canvasRef.current.scroll({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const addSchema = (defaultSchema: Schema) => {
    const [paddingTop, paddingRight, paddingBottom, paddingLeft] = isBlankPdf(template.basePdf)
      ? template.basePdf.padding
      : [0, 0, 0, 0];
    const pageSize = pageSizes[pageCursor];

    const newSchemaName = (prefix: string) => {
      let index = schemasList.reduce((acc, page) => acc + page.length, 1);
      let newName = prefix + index;
      while (schemasList.some((page) => page.find((s) => s.name === newName))) {
        index++;
        newName = prefix + index;
      }
      return newName;
    };
    const ensureMiddleValue = (min: number, value: number, max: number) =>
      Math.min(Math.max(min, value), max);

    const s = {
      id: uuid(),
      ...defaultSchema,
      name: newSchemaName(i18n('field')),
      position: {
        x: ensureMiddleValue(
          paddingLeft,
          defaultSchema.position.x,
          pageSize.width - paddingRight - defaultSchema.width,
        ),
        y: ensureMiddleValue(
          paddingTop,
          defaultSchema.position.y,
          pageSize.height - paddingBottom - defaultSchema.height,
        ),
      },
      required: defaultSchema.readOnly
        ? false
        : options.requiredByDefault || defaultSchema.required || false,
    } as SchemaForUI;

    if (defaultSchema.position.y === 0) {
      const paper = paperRefs.current[pageCursor];
      const canvas = canvasRef.current;
      if (paper && canvas && isHeaderMode) {
        // If in header mode and y=0 (added via click or failed drag), 
        // land it at the center of the current scroll viewport
        const paperRect = paper.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        
        // Find the center of the viewport relative to the paper top
        const viewportCenterY = (canvasRect.top + canvasRect.height / 2) - paperRect.top;
        s.position.y = round(px2mm(Math.max(paddingTop * 3.77, viewportCenterY / scale)), 2);
        
        const viewportCenterX = (canvasRect.left + canvasRect.width / 2) - paperRect.left;
        s.position.x = round(px2mm(Math.max(paddingLeft * 3.77, viewportCenterX / scale)), 2);
      } else {
        const rectTop = paper ? paper.getBoundingClientRect().top : 0;
        s.position.y = rectTop > 0 ? paddingTop : pageSizes[pageCursor].height / 2;
      }
    }

    commitSchemas(schemasList[pageCursor].concat(s));
    // Auto-open sidebar when adding a new element
    setSidebarOpen(true);
    setTimeout(() => {
      const elem = document.getElementById(s.id);
      if (elem) {
        onEdit([elem]);
      }
    });
  };

  const onSortEnd = (sortedSchemas: SchemaForUI[]) => {
    commitSchemas(sortedSchemas);
  };

  const onChangeHoveringSchemaId = (id: string | null) => {
    setHoveringSchemaId(id);
  };

  const updatePage = async (sl: SchemaForUI[][], newPageCursor: number) => {
    setPageCursor(newPageCursor);
    const newTemplate = schemasList2template(sl, template.basePdf);
    onChangeTemplate(newTemplate);
    await updateTemplate(newTemplate);
    void refresh(newTemplate);

    // Notify page change with updated total pages
    onPageCursorChange(newPageCursor, sl.length);

    // Use setTimeout to update scroll position after render
    setTimeout(() => {
      if (canvasRef.current) {
        canvasRef.current.scrollTop = getPagesScrollTopByIndex(pageSizes, newPageCursor, scale);
      }
    }, 0);
  };

  const handleRemovePage = () => {
    if (pageCursor === 0) return;

    const _schemasList = cloneDeep(schemasList);
    _schemasList.splice(pageCursor, 1);
    void updatePage(_schemasList, pageCursor - 1);
  };

  const handleAddPageAfter = () => {
    const _schemasList = cloneDeep(schemasList);
    _schemasList.splice(pageCursor + 1, 0, []);
    void updatePage(_schemasList, pageCursor + 1);
  };

  if (prevTemplate !== template) {
    setPrevTemplate(template);
    void updateTemplate(template);
  }

  /* Custom: Layout Mode Check */
  const isHeaderMode = (options as any).layoutMode === 'header';

  const canvasWidth = size.width - (isHeaderMode ? 0 : LEFT_SIDEBAR_WIDTH);
  // Match the effective sidebar open logic from RightSidebar:
  // The sidebar is effectively open when sidebarOpen is true OR a tool panel (paper, emoji, etc.) is active
  const activePanel = (options as any).activePanel ?? null;
  const effectiveSidebarOpen = (sidebarOpen || !!activePanel);
  const sizeExcSidebars = {
    width: effectiveSidebarOpen ? canvasWidth - RIGHT_SIDEBAR_WIDTH : canvasWidth,
    height: size.height - (isHeaderMode ? 48 : 0), // Subtract header height if needed, though canvas handles scaling
  };

  if (error) {
    // Pass the error directly to ErrorScreen
    return <ErrorScreen size={size} error={error} />;
  }
  const pageManipulation = isBlankPdf(template.basePdf)
    ? { addPageAfter: handleAddPageAfter, removePage: handleRemovePage }
    : {};

  return (
    <Root size={size} scale={scale}>
      <DndContext
        onDragStart={(event) => {
          onEditEnd();
          setActiveDragData(event.active.data.current as Schema);
        }}
        onDragEnd={(event) => {
          setActiveDragData(null);
          // Triggered after a schema is dragged & dropped from the left sidebar.
          if (!event.active) return;
          const active = event.active;
          const pageRect = paperRefs.current[pageCursor].getBoundingClientRect();

          const dragStartTop = active.rect.current.initial?.top || 0;
          const dragStartLeft = active.rect.current.initial?.left || 0;

          // In header mode, we need to account for the fact that the drag starts from the top toolbar
          // event.delta already provides the travel distance from the initial position.
          // mousePosition = initialPosition + delta
          // relativePosition = mousePosition - targetRectTop
          const moveY = (event.delta.y + dragStartTop - pageRect.top) / scale;
          const moveX = (event.delta.x + dragStartLeft - pageRect.left) / scale;

          const position = {
            x: round(px2mm(Math.max(0, moveX)), 2),
            y: round(px2mm(Math.max(0, moveY)), 2),
          };

          addSchema({ ...(active.data.current as Schema), position });
        }}
      >
        <div style={isHeaderMode ? { display: 'flex', flexDirection: 'column', height: '100%', width: '100%' } : {}}>
          <LeftSidebar
            height={isHeaderMode ? 48 : (canvasRef.current ? canvasRef.current.clientHeight : 0)}
            scale={scale}
            basePdf={template.basePdf}
            onAddSchema={addSchema}
          />

          <div style={{ position: 'relative', width: canvasWidth, marginLeft: isHeaderMode ? 0 : LEFT_SIDEBAR_WIDTH, flex: 1, display: isHeaderMode ? 'flex' : 'block' }}>
            {/* If Header Mode, we might want Flex layout for Canvas + RightSidebar */}

            <div style={isHeaderMode ? { flex: 1, position: 'relative' } : {}}>
              {/* Calculate paper position for control bar */}
              {(() => {
                // mm to px conversion
                const mm2px = (mm: number) => mm * 3.7795275591;
                
                // Current page size
                const currentPageSize = pageSizes[pageCursor] || { width: 210, height: 297 };
                
                // Paper dimensions in pixels (considering scale)
                const paperHeightPx = mm2px(currentPageSize.height) * scale;
                
                // Canvas top offset (ruler height + header if applicable)
                const canvasTopOffset = isHeaderMode ? (48 + RULER_HEIGHT * ZOOM) : (RULER_HEIGHT * ZOOM);
                
                // Paper bottom Y = canvas top + paper height (first page)
                const paperBottomY = canvasTopOffset + paperHeightPx;
                
                // Paper center X - in header mode, left sidebar is horizontal so no offset needed
                const leftOffset = isHeaderMode ? 0 : LEFT_SIDEBAR_WIDTH;
                const paperCenterX = leftOffset + sizeExcSidebars.width / 2;

                return (
                  <CtlBar
                    size={sizeExcSidebars}
                    pageCursor={pageCursor}
                    pageNum={schemasList.length}
                    setPageCursor={(p) => {
                      if (!canvasRef.current) return;
                      // Update scroll position and state
                      canvasRef.current.scrollTop = getPagesScrollTopByIndex(pageSizes, p, scale);
                      setPageCursor(p);
                      onPageCursorChange(p, schemasList.length);
                      onEditEnd();
                    }}
                    zoomLevel={zoomLevel}
                    setZoomLevel={setZoomLevel}
                    paperCenterX={paperCenterX}
                    paperBottomY={paperBottomY}
                    {...pageManipulation}
                  />
                );
              })()}
              <Canvas
                ref={canvasRef}
                paperRefs={paperRefs}
                basePdf={template.basePdf}
                hoveringSchemaId={hoveringSchemaId}
                onChangeHoveringSchemaId={onChangeHoveringSchemaId}
                height={isHeaderMode ? (size.height - 48 - RULER_HEIGHT * ZOOM) : (size.height - RULER_HEIGHT * ZOOM)}
                pageCursor={pageCursor}
                scale={scale}
                size={sizeExcSidebars}
                pageSizes={pageSizes}
                backgrounds={backgrounds}
                activeElements={activeElements}
                schemasList={schemasList}
                changeSchemas={changeSchemas}
                removeSchemas={removeSchemas}
                moveSchemaToPage={moveSchemaToPage}
                sidebarOpen={effectiveSidebarOpen}
                onEdit={onEdit}
              />
            </div>

            <RightSidebar
              hoveringSchemaId={hoveringSchemaId}
              onChangeHoveringSchemaId={onChangeHoveringSchemaId}
              height={canvasRef.current ? canvasRef.current.clientHeight : 0}
              size={size}
              pageSize={pageSizes[pageCursor] ?? []}
              basePdf={template.basePdf}
              activeElements={activeElements}
              schemasList={schemasList}
              schemas={schemasList[pageCursor] ?? []}
              changeSchemas={changeSchemas}
              onSortEnd={onSortEnd}
              onEdit={(id) => {
                const editingElem = document.getElementById(id);
                if (editingElem) {
                  onEdit([editingElem]);
                }
              }}
              onEditEnd={onEditEnd}
              deselectSchema={onEditEnd}
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              activePanel={activePanel}
              onAddSchema={addSchema}
            />

          </div>
        </div>
        <DragOverlay>
          {activeDragData ? (
            <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', opacity: 0.8, pointerEvents: 'none' }}>
              <Renderer
                schema={{ ...activeDragData, id: 'drag-overlay' }}
                basePdf={template.basePdf}
                value={activeDragData.content || ''}
                mode="viewer"
                outline={`1px solid ${token.colorPrimary}`}
                scale={scale}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </Root>
  );
};

export default TemplateEditor;
