import React, { useContext, useCallback } from 'react';
import { Button, Typography } from 'antd';
import { Menu } from 'lucide-react';
import { SidebarBody, SidebarFrame, SidebarHeader, SIDEBAR_H_PADDING_PX } from './layout.js';
import { DESIGNER_CLASSNAME } from '../../../constants.js';
import type { SidebarProps } from '../../../types.js';
import { PluginsRegistry } from '../../../contexts.js';

const { Text: AntText } = Typography;

// Pre-styled art text variants with visual previews
const ART_TEXT_STYLES = [
  {
    label: 'Gradient',
    preview: 'Gradient',
    fontColor: '#8b5cf6',
    fontSize: 28,
    artBold: true,
    artGradient: true,
    artGradientColors: ['#8b5cf6', '#ec4899'] as [string, string],
    previewStyle: {
      background: 'linear-gradient(90deg, #8b5cf6, #ec4899)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      fontWeight: 800,
      fontSize: 22,
    } as React.CSSProperties,
  },
  {
    label: 'Shadow',
    preview: 'Shadow',
    fontColor: '#1f2937',
    fontSize: 28,
    artBold: true,
    artShadow: true,
    artShadowColor: '#00000040',
    artShadowBlur: 6,
    previewStyle: {
      color: '#1f2937',
      fontWeight: 800,
      fontSize: 22,
      textShadow: '3px 3px 6px rgba(0,0,0,0.25)',
    } as React.CSSProperties,
  },
  {
    label: 'Outline',
    preview: 'Outline',
    fontColor: '#ffffff',
    fontSize: 28,
    artBold: true,
    artOutline: true,
    artOutlineColor: '#374151',
    artOutlineWidth: 2,
    previewStyle: {
      color: 'transparent',
      fontWeight: 800,
      fontSize: 22,
      WebkitTextStroke: '1.5px #374151',
    } as React.CSSProperties,
  },
  {
    label: 'Neon',
    preview: 'Neon',
    fontColor: '#22d3ee',
    fontSize: 28,
    artBold: true,
    artShadow: true,
    artShadowColor: '#22d3ee80',
    artShadowBlur: 10,
    previewStyle: {
      color: '#22d3ee',
      fontWeight: 800,
      fontSize: 22,
      textShadow: '0 0 8px #22d3ee80, 0 0 16px #22d3ee40',
    } as React.CSSProperties,
  },
  {
    label: 'Sunset',
    preview: 'Sunset',
    fontColor: '#f97316',
    fontSize: 28,
    artBold: true,
    artGradient: true,
    artGradientColors: ['#f97316', '#ef4444'] as [string, string],
    previewStyle: {
      background: 'linear-gradient(90deg, #f97316, #ef4444)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      fontWeight: 800,
      fontSize: 22,
    } as React.CSSProperties,
  },
  {
    label: 'Ocean',
    preview: 'Ocean',
    fontColor: '#3b82f6',
    fontSize: 28,
    artBold: true,
    artGradient: true,
    artGradientColors: ['#06b6d4', '#3b82f6'] as [string, string],
    previewStyle: {
      background: 'linear-gradient(90deg, #06b6d4, #3b82f6)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      fontWeight: 800,
      fontSize: 22,
    } as React.CSSProperties,
  },
  {
    label: 'Gold',
    preview: 'Gold',
    fontColor: '#d97706',
    fontSize: 28,
    artBold: true,
    artShadow: true,
    artShadowColor: '#d9770640',
    artShadowBlur: 4,
    previewStyle: {
      background: 'linear-gradient(135deg, #f59e0b, #d97706, #b45309)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      fontWeight: 800,
      fontSize: 22,
    } as React.CSSProperties,
  },
  {
    label: 'Forest',
    preview: 'Forest',
    fontColor: '#16a34a',
    fontSize: 28,
    artBold: true,
    artGradient: true,
    artGradientColors: ['#16a34a', '#059669'] as [string, string],
    previewStyle: {
      background: 'linear-gradient(90deg, #16a34a, #059669)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      fontWeight: 800,
      fontSize: 22,
    } as React.CSSProperties,
  },
];

type TextPanelProps = Pick<SidebarProps, 'activeElements' | 'schemas' | 'changeSchemas'> & {
  onClose: () => void;
  addSchemaHandler?: (schema: any) => void;
};

const TextPanel = ({ onClose, addSchemaHandler }: TextPanelProps) => {
  const pluginsRegistry = useContext(PluginsRegistry);

  const handleTextClick = useCallback((itemKey: string, overrides?: Record<string, unknown>) => {
    if (!addSchemaHandler) return;

    let plugin = undefined;
    for (const [_label, p] of pluginsRegistry.entries()) {
      if (p?.propPanel?.defaultSchema?.type === itemKey) {
        plugin = p;
        break;
      }
    }

    if (plugin?.propPanel?.defaultSchema) {
      addSchemaHandler({
        ...plugin.propPanel.defaultSchema,
        ...overrides,
        position: { x: 0, y: 0 },
      });
    }
  }, [addSchemaHandler, pluginsRegistry]);

  return (
    <SidebarFrame className={DESIGNER_CLASSNAME + 'text-panel'}>
      <SidebarHeader>
        <Button
          className={DESIGNER_CLASSNAME + 'back-button'}
          style={{
            position: 'absolute',
            left: SIDEBAR_H_PADDING_PX,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'translateY(-50%)',
            top: '50%',
            paddingTop: '3px',
          }}
          onClick={onClose}
          icon={<Menu strokeWidth={1.5} size={20} />}
        />
        <AntText strong style={{ textAlign: 'center', width: '100%' }}>
          Text
        </AntText>
      </SidebarHeader>
      <SidebarBody>
        {/* Primary action: Add Text Box */}
        <button
          onClick={() => handleTextClick('text')}
          style={{
            width: '100%',
            padding: '10px 16px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            border: 'none',
            borderRadius: 10,
            cursor: 'pointer',
            color: '#ffffff',
            fontSize: 14,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.45)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(99, 102, 241, 0.3)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700 }}>T</span>
          Add Text Box
        </button>

        {/* Text style preview buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14 }}>
          {/* Add Title */}
          <button
            onClick={() => handleTextClick('heading')}
            style={{
              width: '100%',
              padding: '14px 16px',
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f9fafb';
              e.currentTarget.style.borderColor = '#d1d5db';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span style={{
              fontSize: 22,
              fontWeight: 800,
              color: '#1f2937',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}>
              Add a title
            </span>
          </button>

          {/* Add Subtitle */}
          <button
            onClick={() => handleTextClick('heading')}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f9fafb';
              e.currentTarget.style.borderColor = '#d1d5db';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#4b5563',
              lineHeight: 1.3,
            }}>
              Add a subtitle
            </span>
          </button>

          {/* Add Body Text */}
          <button
            onClick={() => handleTextClick('text')}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f9fafb';
              e.currentTarget.style.borderColor = '#d1d5db';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span style={{
              fontSize: 13,
              fontWeight: 400,
              color: '#6b7280',
              lineHeight: 1.4,
            }}>
              Add body text
            </span>
          </button>
        </div>

        {/* Art Text Section — expanded examples grid */}
        <div style={{ marginTop: 24 }}>
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 10,
          }}>
            Art Text
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 8,
          }}>
            {ART_TEXT_STYLES.map((style) => (
              <button
                key={style.label}
                onClick={() => handleTextClick('artText', {
                  content: style.preview,
                  fontColor: style.fontColor,
                  fontSize: style.fontSize,
                  artBold: style.artBold,
                  artGradient: style.artGradient,
                  artGradientColors: style.artGradientColors,
                  artShadow: style.artShadow,
                  artShadowColor: style.artShadowColor,
                  artShadowBlur: style.artShadowBlur,
                  artOutline: style.artOutline,
                  artOutlineColor: style.artOutlineColor,
                  artOutlineWidth: style.artOutlineWidth,
                })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '18px 10px',
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 10,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  minHeight: 64,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f9fafb';
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span style={{
                  ...style.previewStyle,
                  fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
                  userSelect: 'none',
                }}>
                  {style.preview}
                </span>
              </button>
            ))}
          </div>
        </div>
      </SidebarBody>
    </SidebarFrame>
  );
};

export default TextPanel;
