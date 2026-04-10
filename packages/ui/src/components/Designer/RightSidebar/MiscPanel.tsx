import React, { useContext, useCallback } from 'react';
import { Button, Typography, Tooltip } from 'antd';
import { Menu } from 'lucide-react';
import { SidebarBody, SidebarFrame, SidebarHeader, SIDEBAR_H_PADDING_PX } from './layout.js';
import { DESIGNER_CLASSNAME } from '../../../constants.js';
import type { SidebarProps } from '../../../types.js';
import { PluginsRegistry } from '../../../contexts.js';
import PluginIcon from '../PluginIcon.js';

const { Text } = Typography;

// Plugin types that are handled elsewhere (text panel, shapes panel, etc.)
const EXCLUDED_TYPES = new Set([
  'text', 'heading', 'table', 'simplechart',
  'line', 'rectangle', 'ellipse', 'triangle', 'diamond', 'star', 'arrow',
  'svg', 'image', 'artText',
  'multiVariableText', 'readOnlyText',
]);

type MiscPanelProps = Pick<SidebarProps, 'activeElements' | 'schemas' | 'changeSchemas'> & {
  onClose: () => void;
  addSchemaHandler?: (schema: any) => void;
};

const MiscPanel = ({ onClose, addSchemaHandler }: MiscPanelProps) => {
  const pluginsRegistry = useContext(PluginsRegistry);

  // Get all "misc" plugins — those not excluded by dedicated panels
  const miscPlugins = Array.from(pluginsRegistry.entries()).filter(([_, plugin]) => {
    const type = plugin?.propPanel?.defaultSchema?.type;
    if (!type) return false;
    return !EXCLUDED_TYPES.has(type);
  });

  const handlePluginClick = useCallback((label: string) => {
    if (!addSchemaHandler) return;

    const entry = pluginsRegistry.entries().find(([l]) => l === label);
    const plugin = entry?.[1];
    if (plugin?.propPanel?.defaultSchema) {
      addSchemaHandler({
        ...plugin.propPanel.defaultSchema,
        position: { x: 0, y: 0 },
      });
    }
  }, [addSchemaHandler, pluginsRegistry]);

  return (
    <SidebarFrame className={DESIGNER_CLASSNAME + 'misc-panel'}>
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
          More Elements
        </Text>
      </SidebarHeader>
      <SidebarBody>
        {/* Plugin grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
          }}
        >
          {miscPlugins.map(([label, plugin]) => (
            <Tooltip key={label} title={label} placement="bottom" mouseEnterDelay={0.3}>
              <button
                onClick={() => handlePluginClick(label)}
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
                <div style={{ width: 28, height: 28, color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PluginIcon plugin={plugin} label={label} size={24} />
                </div>
                <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, textAlign: 'center', lineHeight: 1.2, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {label}
                </span>
              </button>
            </Tooltip>
          ))}
        </div>

        {miscPlugins.length === 0 && (
          <div
            style={{
              padding: 20,
              textAlign: 'center',
              color: '#9ca3af',
              fontSize: 13,
            }}
          >
            No additional elements available.
          </div>
        )}

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
          Click an element to add it to the canvas.
          Customize properties in the detail panel.
        </div>
      </SidebarBody>
    </SidebarFrame>
  );
};

export default MiscPanel;
