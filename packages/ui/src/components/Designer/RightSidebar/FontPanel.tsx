import React, { useContext, useMemo } from 'react';
import { Button, Typography } from 'antd';
import { Check, Menu } from 'lucide-react';
import { SidebarBody, SidebarFrame, SidebarHeader, SIDEBAR_H_PADDING_PX } from './layout.js';
import { DESIGNER_CLASSNAME } from '../../../constants.js';
import { OptionsContext } from '../../../contexts.js';
import type { SidebarProps } from '../../../types.js';

const { Text } = Typography;

// Props that FontPanel needs from parent
type FontPanelProps = Pick<SidebarProps, 'activeElements' | 'schemas' | 'changeSchemas'> & {
  onClose: () => void;
};

const FontPanel = ({ activeElements, schemas, changeSchemas, onClose }: FontPanelProps) => {
  const options = useContext(OptionsContext);
  
  // Get fonts from options
  const fonts = (options as any)?.font || {};

  // Get active schemas (selected elements)
  const activeSchemas = useMemo(() => {
    const activeIds = activeElements.map((ae) => ae.id);
    return schemas.filter((s) => activeIds.includes(s.id));
  }, [activeElements, schemas]);

  // Check if any selected element is a text type
  const textSchemas = useMemo(() => {
    return activeSchemas.filter((s) => 
      s.type === 'text' || s.type === 'multiVariableText' || s.type === 'table'
    );
  }, [activeSchemas]);

  const hasSelectedTextElement = textSchemas.length > 0;

  // Get current font from first selected text element
  const currentFont = useMemo(() => {
    if (textSchemas.length > 0) {
      return (textSchemas[0] as any).fontName || '';
    }
    return '';
  }, [textSchemas]);

  const fontList = useMemo(() => {
    return Object.keys(fonts).sort();
  }, [fonts]);

  const handleFontChange = (fontName: string) => {
    if (textSchemas.length === 0) return;

    // Apply font change to all selected text elements
    const changes = textSchemas.map((schema) => ({
      key: 'fontName',
      value: fontName,
      schemaId: schema.id,
    }));

    changeSchemas(changes);
  };

  return (
    <SidebarFrame className={DESIGNER_CLASSNAME + 'font-panel'}>
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
          字体选择
        </Text>
      </SidebarHeader>
      <SidebarBody>
        {!hasSelectedTextElement && (
          <div style={{ 
            padding: 12, 
            background: '#fef3c7', 
            borderRadius: 8, 
            marginBottom: 16,
            fontSize: 12,
            color: '#92400e'
          }}>
            请先选中一个文本元素
          </div>
        )}

        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
          当前字体: <span style={{ color: '#0a0a0a', fontWeight: 500 }}>{currentFont || '默认'}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {fontList.map((fontName) => {
            const isActive = currentFont === fontName;
            return (
              <Button
                key={fontName}
                onClick={() => handleFontChange(fontName)}
                disabled={!hasSelectedTextElement}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  height: 44,
                  borderRadius: 8,
                  border: isActive ? '2px solid #0a0a0a' : '1px solid #e5e7eb',
                  background: isActive ? '#f5f3ff' : '#ffffff',
                  textAlign: 'left',
                  paddingLeft: 12,
                  paddingRight: 12,
                }}
              >
                <span style={{ 
                  fontFamily: fontName, 
                  fontSize: 14,
                  color: isActive ? '#0a0a0a' : '#374151',
                  fontWeight: isActive ? 600 : 400
                }}>
                  {fontName}
                </span>
                {isActive && <Check size={16} style={{ color: '#0a0a0a' }} />}
              </Button>
            );
          })}
        </div>

        {fontList.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: 20, 
            color: '#9ca3af',
            fontSize: 13
          }}>
            暂无可用字体
          </div>
        )}
      </SidebarBody>
    </SidebarFrame>
  );
};

export default FontPanel;
