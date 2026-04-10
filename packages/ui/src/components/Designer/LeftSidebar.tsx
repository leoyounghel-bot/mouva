import React, { useContext, useState, useEffect } from 'react';
import { Schema, Plugin, BasePdf, getFallbackFontName } from '@pdfme/common';
import { theme, Button, Tooltip, Divider, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Download, FileText, ChevronDown, Smile, Type, Settings, BarChart3, Upload, Pentagon, Table2, MoreHorizontal } from 'lucide-react';
import Renderer from '../Renderer.js';
import { LEFT_SIDEBAR_WIDTH, DESIGNER_CLASSNAME } from '../../constants.js';
import { setFontNameRecursively } from '../../helper';
import { OptionsContext, PluginsRegistry } from '../../contexts.js';
import PluginIcon from './PluginIcon.js';

const Draggable = (props: {
  plugin: Plugin<Schema>;
  scale: number;
  basePdf: BasePdf;
  children: React.ReactNode;
}) => {
  const { plugin } = props;
  const options = useContext(OptionsContext);
  const defaultSchema = plugin.propPanel.defaultSchema;
  if (options.font) {
    const fontName = getFallbackFontName(options.font);
    setFontNameRecursively(defaultSchema, fontName);
  }
  const draggable = useDraggable({ id: defaultSchema.type, data: defaultSchema });
  const { listeners, setNodeRef, attributes, transform, isDragging } = draggable;
  const style = { transform: CSS.Translate.toString(transform) };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <div style={{ visibility: isDragging ? 'hidden' : 'visible' }}>{props.children}</div>
    </div>
  );
};

const LeftSidebar = (props: {
  height: number;
  scale: number;
  basePdf: BasePdf;
  onAddSchema?: (schema: Schema) => void;
  onEmojiClick?: () => void;
  onDownload?: () => void;
  onDownloadPdf?: () => void;
}) => {
  const { height, scale, basePdf, onAddSchema, onEmojiClick, onDownload, onDownloadPdf } = props;
  const { token } = theme.useToken();
  const pluginsRegistry = useContext(PluginsRegistry);
  const options = useContext(OptionsContext);

  // Custom: Check for "header" layout mode from options (injected via Designer options)
  const isHeaderMode = (options as any).layoutMode === 'header';

  // User profile dropdown state
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const style: React.CSSProperties = isHeaderMode ? {
    position: 'relative',
    width: '100%',
    height: '48px',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    background: 'transparent',
    zIndex: 10,
    padding: '0 16px',
    overflowX: 'visible',
    overflowY: 'visible',
    gap: '4px'
  } : {
    left: 0,
    right: 0,
    position: 'absolute',
    zIndex: 1,
    height,
    width: LEFT_SIDEBAR_WIDTH,
    background: token.colorBgLayout,
    textAlign: 'center',
    overflow: 'auto',
  };

  // Mode toggle
  const currentMode = (options as any).currentMode; // 'preview' | 'edit'
  const onModeChange = (options as any).onModeChange; // (mode: 'preview' | 'edit') => void

  // Get callbacks from options or props
  const onDownloadPpt = (options as any).onDownloadPpt;
  const onDownloadImg = (options as any).onDownloadImg;
  const onDownloadPng = (options as any).onDownloadPng;
  const onDownloadJpg = (options as any).onDownloadJpg;
  const onDownloadSvg = (options as any).onDownloadSvg;
  const onPaperClick = (options as any).onPaperClick;
  const onChartClick = (options as any).onChartClick;
  const onUploadClick = (options as any).onUploadClick;
  const onDownloadPdfFromOptions = (options as any).onDownloadPdf;
  
  // Use callback from options if props don't have it
  const effectiveOnDownloadPdf = onDownloadPdf || onDownloadPdfFromOptions;

  const handleDownloadMenuClick: MenuProps['onClick'] = ({ key }) => {
    switch (key) {
      case 'pdf':
        (effectiveOnDownloadPdf || onDownload)?.();
        break;
      case 'ppt':
        onDownloadPpt?.();
        break;
      case 'png':
        (onDownloadPng || onDownloadImg)?.();
        break;
      case 'jpg':
        onDownloadJpg?.();
        break;
      case 'svg':
        onDownloadSvg?.();
        break;
    }
  };

  const downloadMenuItems: MenuProps['items'] = [
    {
      key: 'pdf',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
            <polyline points="14,2 14,8 20,8"/>
            <path d="M10 12l1 1 2-2"/>
          </svg>
          Download PDF
        </span>
      ),
    },
    {
      key: 'ppt',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
          Download PPT
        </span>
      ),
      disabled: !onDownloadPpt,
    },
    {
      key: 'png',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <path d="m21 15-5-5L5 21"/>
          </svg>
          Download PNG
        </span>
      ),
      disabled: !(onDownloadPng || onDownloadImg),
    },
    {
      key: 'jpg',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M7 21l4.5-4.5"/>
            <path d="M21 15l-5-5L5 21"/>
            <circle cx="9" cy="9" r="2"/>
          </svg>
          Download JPG
        </span>
      ),
      disabled: !(onDownloadJpg || onDownloadImg),
    },
    {
      key: 'svg',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <path d="m3.3 7 8.7 5 8.7-5"/>
            <path d="M12 22V12"/>
          </svg>
          Download SVG
        </span>
      ),
      disabled: !onDownloadSvg,
    },
  ];

  // Paper Button - FIRST position in header mode
  const paperButton = isHeaderMode && onPaperClick && (
    <Tooltip title="Paper Size" placement="bottom" mouseEnterDelay={0.5}>
      <Button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onPaperClick?.();
        }}
        style={{
          width: 38,
          height: 38,
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #e5e7eb',
          background: '#ffffff',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          borderRadius: '10px',
          transition: 'all 0.2s ease',
          color: '#737373'
        }}
        icon={<FileText size={18} />}
      />
    </Tooltip>
  );

  // Don't render editing tools in preview mode
  const isPreviewMode = currentMode === 'preview';

  return (
    <div
      className={DESIGNER_CLASSNAME + 'left-sidebar'}
      style={style}
    >


      {!isPreviewMode && paperButton}

      {/* Text button - opens TextPanel in right sidebar (combines Text, Heading, ArtText) */}
      {!isPreviewMode && isHeaderMode && (() => {
        const onTextClick = (options as any).onTextClick;
        if (!onTextClick) return null;
        return (
          <Tooltip title="Text" placement="bottom" mouseEnterDelay={0.5}>
            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onTextClick();
              }}
              style={{
                width: 38,
                height: 38,
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                borderRadius: '10px',
                transition: 'all 0.2s ease',
                color: '#737373'
              }}
              icon={<Type size={18} />}
            />
          </Tooltip>
        );
      })()}

      {/* Shapes button - opens ShapePanel in right sidebar */}
      {!isPreviewMode && isHeaderMode && (() => {
        const onShapeClick = (options as any).onShapeClick;
        if (!onShapeClick) return null;
        return (
          <Tooltip title="Shapes" placement="bottom" mouseEnterDelay={0.5}>
            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onShapeClick();
              }}
              style={{
                width: 38,
                height: 38,
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                borderRadius: '10px',
                transition: 'all 0.2s ease',
                color: '#525252',
              }}
              icon={<Pentagon size={17} strokeWidth={2} />}
            />
          </Tooltip>
        );
      })()}

      {/* Emoji Button - inline with plugins in header mode */}
      {isHeaderMode && !isPreviewMode && onEmojiClick && (
        <Tooltip title="Emoji" placement="bottom" mouseEnterDelay={0.5}>
          <Button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEmojiClick?.();
            }}
            style={{
              width: 38,
              height: 38,
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #e5e7eb',
              background: '#ffffff',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              borderRadius: '10px',
              transition: 'all 0.2s ease',
              color: '#737373'
            }}
            icon={<Smile size={18} />}
          />
        </Tooltip>
      )}

      {/* Tables & Charts Button - inline with plugins in header mode */}
      {isHeaderMode && !isPreviewMode && onChartClick && (
        <Tooltip title="Tables & Charts" placement="bottom" mouseEnterDelay={0.5}>
          <Button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChartClick?.();
            }}
            style={{
              width: 38,
              height: 38,
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #e5e7eb',
              background: '#ffffff',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              borderRadius: '10px',
              transition: 'all 0.2s ease',
              color: '#737373'
            }}
            icon={<Table2 size={18} />}
          />
        </Tooltip>
      )}

      {/* More button - opens MiscPanel in right sidebar with all misc plugins */}
      {!isPreviewMode && isHeaderMode && (() => {
        const onMiscClick = (options as any).onMiscClick;
        if (!onMiscClick) return null;
        return (
          <Tooltip title="More Elements" placement="bottom" mouseEnterDelay={0.5}>
            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onMiscClick();
              }}
              style={{
                width: 38,
                height: 38,
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                borderRadius: '10px',
                transition: 'all 0.2s ease',
                color: '#737373'
              }}
              icon={<MoreHorizontal size={18} />}
            />
          </Tooltip>
        );
      })()}


      {/* Spacer to push download/upload buttons to the right in header mode */}
      {isHeaderMode && <div style={{ flex: 1 }} />}

      {/* Upload + Download button group on RIGHT */}
      {isHeaderMode && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginTop: currentMode === 'preview' ? 8 : 0,
        }}>
          {/* Upload Button */}
          {!isPreviewMode && onUploadClick && (
            <Tooltip title="Upload PDF / Image / PPT" placement="bottom" mouseEnterDelay={0.5}>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onUploadClick?.();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  height: 32,
                  borderRadius: 6,
                  background: '#ffffff',
                  border: '1px solid #d1d5db',
                  padding: '0 12px',
                  color: '#374151',
                  fontWeight: 500,
                  fontSize: 13,
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <Upload size={15} />
              </Button>
            </Tooltip>
          )}

          {/* Download dropdown */}
          {(onDownload || effectiveOnDownloadPdf) && (
            <Dropdown menu={{ items: downloadMenuItems, onClick: handleDownloadMenuClick }} placement="bottomRight" trigger={['click']}>
              <Button
                type="primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  height: 32,
                  borderRadius: 6,
                  background: '#0a0a0a',
                  borderColor: '#0a0a0a',
                  padding: '0 12px',
                  fontWeight: 500,
                  fontSize: 13,
                  transition: 'all 0.2s ease',
                }}
              >
                <Download size={15} />
              </Button>
            </Dropdown>
          )}
        </div>
      )}

      {/* Mode toggle on RIGHT of download button - only in header mode */}
      {isHeaderMode && onModeChange && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: '#f5f5f5',
          borderRadius: 8,
          padding: 2,
          marginLeft: 8,
          marginRight: 16,
          marginTop: currentMode === 'preview' ? 8 : 0,
        }}>
          <button
            onClick={() => onModeChange('preview')}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 500,
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: currentMode === 'preview' ? '#ffffff' : 'transparent',
              color: currentMode === 'preview' ? '#0a0a0a' : '#737373',
              boxShadow: currentMode === 'preview' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              minWidth: 60,
            }}
          >
            Preview
          </button>
          <button
            onClick={() => onModeChange('edit')}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 500,
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: currentMode === 'edit' ? '#ffffff' : 'transparent',
              color: currentMode === 'edit' ? '#0a0a0a' : '#737373',
              boxShadow: currentMode === 'edit' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              minWidth: 60,
            }}
          >
            Edit
          </button>
        </div>
      )}

      {/* User Profile Avatar - on the far right in header mode */}
      {isHeaderMode && (
        <div style={{ position: 'relative', marginLeft: 8 }}>
          <div
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: (options as any).currentUser?.avatarUrl 
                ? 'transparent'
                : (options as any).currentUser 
                  ? 'linear-gradient(135deg, #171717 0%, #0a0a0a 100%)' 
                  : 'linear-gradient(135deg, #a3a3a3 0%, #737373 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              boxShadow: (options as any).currentUser 
                ? '0 2px 4px rgba(10, 10, 10, 0.2)' 
                : '0 2px 4px rgba(115, 115, 115, 0.2)',
              transition: 'all 0.2s ease',
              marginTop: currentMode === 'preview' ? 8 : 0,
              overflow: 'hidden',
            }}
            title={(options as any).currentUser?.name || (options as any).currentUser?.email || 'Guest'}
          >
            {(options as any).currentUser?.avatarUrl ? (
              <img 
                src={(options as any).currentUser.avatarUrl} 
                alt="Profile"
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover',
                  borderRadius: '50%',
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.textContent = 
                    (options as any).currentUser?.email?.charAt(0).toUpperCase() || 'U';
                }}
              />
            ) : (
              (options as any).currentUser?.email?.charAt(0).toUpperCase() || '?'
            )}
          </div>
          
          {showUserDropdown && (
            <>
              <div
                onClick={() => setShowUserDropdown(false)}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 999,
                }}
              />
              <div style={{
                position: 'absolute',
                top: 40,
                right: 0,
                background: '#ffffff',
                borderRadius: 8,
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                border: '1px solid #e5e7eb',
                padding: 8,
                minWidth: 200,
                zIndex: 1000,
              }}>
                {(options as any).currentUser ? (
                  <>
                    <div style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid #f5f5f5',
                      marginBottom: 4,
                    }}>
                      <div style={{ fontSize: 12, color: '#737373' }}>Signed in as</div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#1f2937', wordBreak: 'break-all' }}>
                        {(options as any).currentUser.email}
                      </div>
                    </div>
                    <div style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid #f5f5f5',
                      marginBottom: 4,
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      setShowUserDropdown(false);
                      window.location.href = '/pricing';
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 12, color: '#737373' }}>Plan</div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#0a0a0a' }}>
                            {(options as any).currentUser.subscription?.planName || 'Free'}
                          </div>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9,18 15,12 9,6" />
                        </svg>
                      </div>
                    </div>
                    <div style={{ height: 1, background: '#f5f5f5', margin: '4px 0' }} />
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        console.log('Go to settings');
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 13,
                        color: '#374151',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Settings size={16} />
                      Settings
                    </button>
                    <div style={{ height: 1, background: '#f5f5f5', margin: '4px 0' }} />
                    {(options as any).onLogout && (
                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          (options as any).onLogout();
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 13,
                          color: '#ef4444',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16,17 21,12 16,7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Log out
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <div style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid #f5f5f5',
                      marginBottom: 4,
                    }}>
                      <div style={{ fontSize: 12, color: '#737373' }}>Welcome</div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#1f2937' }}>
                        Guest User
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        window.location.href = '/auth';
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'linear-gradient(135deg, #171717 0%, #0a0a0a 100%)',
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        fontSize: 13,
                        fontWeight: 500,
                        color: '#ffffff',
                        transition: 'opacity 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                        <polyline points="10,17 15,12 10,7" />
                        <line x1="15" y1="12" x2="3" y2="12" />
                      </svg>
                      Sign In
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}


    </div>
  );
};

export default LeftSidebar;
