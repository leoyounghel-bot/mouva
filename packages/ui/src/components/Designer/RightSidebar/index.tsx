import React, { useContext, useState } from 'react';
import { theme } from 'antd';
import type { SidebarProps } from '../../../types.js';
import { RIGHT_SIDEBAR_WIDTH, DESIGNER_CLASSNAME } from '../../../constants.js';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { OptionsContext } from '../../../contexts.js';
import ListView from './ListView/index.js';
import DetailView from './DetailView/index.js';
import FontPanel from './FontPanel.js';
import PaperPanel from './PaperPanel.js';
import ArtFontPanel from './ArtFontPanel.js';
import EmojiPanel from './EmojiPanel.js';
import ChartPanel from './ChartPanel.js';
import ChartEditorSection from './ChartEditorSection.js';
import ShapePanel from './ShapePanel.js';
import MiscPanel from './MiscPanel.js';
import TextPanel from './TextPanel.js';

const Sidebar = (props: SidebarProps) => {
  const { sidebarOpen, setSidebarOpen, activeElements, schemas, activePanel } = props;
  const options = useContext(OptionsContext);
  
  // State to toggle between ListView and DetailView
  const [showListView, setShowListView] = useState(false);

  const { token } = theme.useToken();
  const getActiveSchemas = () =>
    schemas.filter((s) => s && activeElements.filter((ae) => ae != null).map((ae) => ae.id).includes(s.id));
  const getLastActiveSchema = () => {
    const activeSchemas = getActiveSchemas();
    return activeSchemas[activeSchemas.length - 1];
  };

  const iconProps = { strokeWidth: 1.5, size: 20 };

  // Get the close handler from options
  const handlePanelClose = () => {
    if ((options as any)?.onPanelClose) {
      (options as any).onPanelClose();
    }
  };

  // "Back" handler: close the panel but keep sidebar open (toggle bar visible)
  const handlePanelBack = () => {
    handlePanelClose();
    setSidebarOpen(true);
  };
  
  // Toggle to ListView
  const handleShowListView = () => {
    setShowListView(true);
  };
  
  // Toggle back to DetailView (when clicking an element in the list)
  const handleEditFromList = (id: string) => {
    setShowListView(false);
    props.onEdit(id);
  };

  // Render the sidebar content based on selection state and activePanel
  const renderSidebarContent = () => {
    const activeSchemasList = getActiveSchemas();
    const lastActiveSchema = getLastActiveSchema();
    
    // Check if selected element is an art text element (name starts with 'artText_')
    const isArtTextElement = lastActiveSchema && 
      (lastActiveSchema.name?.startsWith('artText_') || lastActiveSchema.name === 'artText' || lastActiveSchema.type === 'artText');
    
    // Check if selected element is a chart element (name starts with 'chart_')
    const isChartElement = lastActiveSchema && lastActiveSchema.name?.startsWith('chart_');
    
    // Panel props - share activeElements, schemas, changeSchemas for element manipulation
    const panelProps = {
      activeElements,
      schemas,
      changeSchemas: props.changeSchemas,
      onClose: handlePanelClose,
      onBack: handlePanelBack,
      schemasList: props.schemasList,
      pageSize: props.pageSize,
      basePdf: props.basePdf,
      size: props.size,
      deselectSchema: props.deselectSchema,
    };
    
    // PRIORITY 0: If showListView is true, show the ListView
    if (showListView && schemas.length > 0) {
      return (
        <ListView
          schemas={schemas}
          onSortEnd={props.onSortEnd}
          onEdit={handleEditFromList}
          hoveringSchemaId={props.hoveringSchemaId}
          onChangeHoveringSchemaId={props.onChangeHoveringSchemaId}
          changeSchemas={props.changeSchemas}
        />
      );
    }
    
    // PRIORITY 1: If an element is selected, show its editor panel (this takes priority over tool panels)
    if (activeSchemasList.length > 0) {
      // ART TEXT element gets ArtFontPanel
      if (isArtTextElement) {
        const addSchemaHandler = (options as any)?.addSchemaHandler;
        return <ArtFontPanel {...panelProps} addSchemaHandler={addSchemaHandler} />;
      }
      // Chart elements get DetailView + ChartEditorSection below it
      if (isChartElement) {
        const onUpdateChart = (options as any)?.onUpdateChart;
        return (
          <DetailView {...props} activeSchema={lastActiveSchema} onShowListView={handleShowListView}>
            <ChartEditorSection
              activeSchema={lastActiveSchema}
              changeSchemas={props.changeSchemas}
              onUpdateChart={onUpdateChart}
            />
          </DetailView>
        );
      }
      // Other elements get DetailView - pass the toggle callback
      return <DetailView {...props} activeSchema={lastActiveSchema} onShowListView={handleShowListView} />;
    }
    
    // PRIORITY 2: Tool panels (only shown when NO element is selected)
    if (activePanel === 'paper') {
      return <PaperPanel {...panelProps} />;
    }
    if (activePanel === 'emoji') {
      const onInsertEmoji = (options as any)?.onInsertEmoji;
      return <EmojiPanel {...panelProps} onInsertEmoji={onInsertEmoji} />;
    }
    if (activePanel === 'artFont') {
      const addSchemaHandler = (options as any)?.addSchemaHandler;
      return <ArtFontPanel {...panelProps} addSchemaHandler={addSchemaHandler} />;
    }
    if (activePanel === 'font') {
      return <FontPanel {...panelProps} />;
    }
    if (activePanel === 'chart') {
      const onInsertChart = (options as any)?.onInsertChart;
      const onInsertTable = (options as any)?.onInsertTable;
      return <ChartPanel {...panelProps} onInsertChart={onInsertChart} onInsertTable={onInsertTable} />;
    }
    if (activePanel === 'shape') {
      return <ShapePanel {...panelProps} addSchemaHandler={props.onAddSchema} />;
    }
    if (activePanel === 'misc') {
      return <MiscPanel {...panelProps} addSchemaHandler={props.onAddSchema} />;
    }
    if (activePanel === 'text') {
      return <TextPanel {...panelProps} addSchemaHandler={props.onAddSchema} />;
    }

    // MODERN MINIMAL: No default panel - return null to collapse sidebar
    // This maximizes canvas space when no element is selected
    return null;
  };

  // Determine if sidebar should be shown (has content to display)
  const hasContent = (() => {
    const activeSchemasList = getActiveSchemas();
    if (activeSchemasList.length > 0) return true;
    if (activePanel) return true;
    if (showListView && schemas.length > 0) return true;
    return false;
  })();

  // Auto-manage sidebar visibility based on content
  // Also auto-open when a tool panel (paper, emoji, etc.) is active
  const effectiveSidebarOpen = (sidebarOpen || !!activePanel) && hasContent;

  return (
    <div
      className={DESIGNER_CLASSNAME + 'right-sidebar'}
      style={{
        position: 'absolute',
        right: 0,
        zIndex: 1,
        height: '100%',
        width: RIGHT_SIDEBAR_WIDTH,
        pointerEvents: 'none', // Allow clicks to pass through the container
      }}
    >
      {/* Toggle Button - Split Border design: minimal line that shows chevron on hover */}
      <div
        className={DESIGNER_CLASSNAME + 'sidebar-toggle'}
        style={{
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          top: 0,
          bottom: 0,
          // Position at panel edge
          right: effectiveSidebarOpen ? (RIGHT_SIDEBAR_WIDTH - 2) : 0,
          width: 24,
          zIndex: 101,
          pointerEvents: 'auto',
          cursor: 'pointer',
          transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onClick={() => {
          if (!effectiveSidebarOpen && !hasContent) {
            // When sidebar is closed and empty, open paper settings as default action
            const onPaperClick = (options as any)?.onPaperClick;
            if (onPaperClick) {
              onPaperClick();
            }
          } else {
            // When closing sidebar, also clear any active tool panel (Paper, Emoji, etc.)
            // Without this, activePanel keeps effectiveSidebarOpen true even after toggling sidebarOpen
            if (activePanel) {
              handlePanelClose();
            }
            setSidebarOpen(!sidebarOpen);
          }
        }}
      >
        {/* Vertical line indicator */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 2,
            height: 40,
            background: effectiveSidebarOpen ? token.colorBorderSecondary : token.colorPrimary,
            borderRadius: 1,
            transition: 'all 0.2s ease',
            opacity: 0.6,
          }}
        />
        {/* Chevron icon - shows on hover via CSS */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 20,
            height: 40,
            marginLeft: 2,
            opacity: 0,
            transition: 'opacity 0.2s ease',
            color: effectiveSidebarOpen ? token.colorTextSecondary : token.colorPrimary,
          }}
          className={DESIGNER_CLASSNAME + 'toggle-icon'}
        >
          {effectiveSidebarOpen ? <ArrowRight {...iconProps} /> : <ArrowLeft {...iconProps} />}
        </div>
        {/* Hover styles injected via style tag */}
        <style>{`
          .${DESIGNER_CLASSNAME}sidebar-toggle:hover .${DESIGNER_CLASSNAME}toggle-icon {
            opacity: 1 !important;
          }
          .${DESIGNER_CLASSNAME}sidebar-toggle:hover > div:first-child {
            opacity: 1 !important;
            height: 60px !important;
          }
        `}</style>
      </div>
      {/* Panel Container with slide animation */}
      <div
        style={{
          width: RIGHT_SIDEBAR_WIDTH,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          top: 0,
          right: 0,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          boxSizing: 'border-box',
          background: token.colorBgLayout,
          borderLeft: `1px solid ${token.colorSplit}`,
          // Slide animation using transform (better performance than width)
          transform: effectiveSidebarOpen ? 'translateX(0)' : `translateX(${RIGHT_SIDEBAR_WIDTH}px)`,
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: 'auto',
          // Subtle shadow when open
          boxShadow: effectiveSidebarOpen ? '-4px 0 16px rgba(0,0,0,0.08)' : 'none',
        }}
      >
        {renderSidebarContent()}
      </div>
    </div>
  );
};

export default Sidebar;
