import React, { useContext, useCallback } from 'react';
import { Button, Typography, Tooltip } from 'antd';
import { Menu } from 'lucide-react';
import { SidebarBody, SidebarFrame, SidebarHeader, SIDEBAR_H_PADDING_PX } from './layout.js';
import { DESIGNER_CLASSNAME } from '../../../constants.js';
import type { SidebarProps } from '../../../types.js';
import { PluginsRegistry } from '../../../contexts.js';

const { Text } = Typography;

// Shape definitions with inline SVG icons
const SHAPE_ITEMS = [
  {
    key: 'line',
    label: 'Line',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/></svg>',
  },
  {
    key: 'rectangle',
    label: 'Rectangle',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14"/></svg>',
  },
  {
    key: 'roundedRectangle',
    label: 'Rounded',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="4" ry="4"/></svg>',
  },
  {
    key: 'ellipse',
    label: 'Circle',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>',
  },
  {
    key: 'triangle',
    label: 'Triangle',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12,3 2,21 22,21"/></svg>',
  },
  {
    key: 'diamond',
    label: 'Diamond',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12,2 22,12 12,22 2,12"/></svg>',
  },
  {
    key: 'star',
    label: 'Star',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>',
  },
  {
    key: 'arrow',
    label: 'Arrow',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="2,8 14,8 14,3 22,12 14,21 14,16 2,16"/></svg>',
  },
];

type ShapePanelProps = Pick<SidebarProps, 'activeElements' | 'schemas' | 'changeSchemas'> & {
  onClose: () => void;
  addSchemaHandler?: (schema: any) => void;
};

const ShapePanel = ({ onClose, addSchemaHandler }: ShapePanelProps) => {
  const pluginsRegistry = useContext(PluginsRegistry);

  const handleShapeClick = useCallback((shapeKey: string) => {
    if (!addSchemaHandler) return;

    // Look up the plugin by its registration key (label) from the registry
    let plugin = undefined;
    for (const [label, p] of pluginsRegistry.entries()) {
      if (label === shapeKey) {
        plugin = p;
        break;
      }
    }

    if (plugin?.propPanel?.defaultSchema) {
      // Use the Designer's internal addSchema flow — this auto-selects the element
      // and opens the property panel (DetailView) for editing
      addSchemaHandler({
        ...plugin.propPanel.defaultSchema,
        position: { x: 0, y: 0 }, // Will be centered by addSchema logic in Designer
      });
      // After addSchema, the Designer selects the new element → RightSidebar's
      // priority logic switches from ShapePanel to DetailView automatically
    }
  }, [addSchemaHandler, pluginsRegistry]);

  return (
    <SidebarFrame className={DESIGNER_CLASSNAME + 'shape-panel'}>
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
        <Text strong style={{ textAlign: 'center', width: '100%' }}>
          Shapes
        </Text>
      </SidebarHeader>
      <SidebarBody>
        {/* Shape grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
          }}
        >
          {SHAPE_ITEMS.map((shape) => (
            <Tooltip key={shape.key} title={shape.label} placement="bottom" mouseEnterDelay={0.3}>
              <button
                onClick={() => handleShapeClick(shape.key)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '12px 8px',
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 10,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  minHeight: 72,
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
                <div
                  style={{ width: 28, height: 28, color: '#374151' }}
                  dangerouslySetInnerHTML={{ __html: shape.icon }}
                />
                <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>
                  {shape.label}
                </span>
              </button>
            </Tooltip>
          ))}
        </div>

        {/* Info */}
        <div
          style={{
            marginTop: 20,
            padding: 10,
            background: '#f9fafb',
            borderRadius: 8,
            fontSize: 11,
            color: '#9ca3af',
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          Click a shape to add it to the canvas.
          Customize colors and borders in the properties panel.
        </div>
      </SidebarBody>
    </SidebarFrame>
  );
};

export default ShapePanel;

