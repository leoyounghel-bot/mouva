import React from 'react';
import type { SchemaForUI, ChangeSchemas } from '@pdfme/common';

// Custom props for HeadingWidget that can work both standalone and as form-render widget
interface HeadingWidgetProps {
  activeElements: HTMLElement[];
  schemas: SchemaForUI[];
  changeSchemas: ChangeSchemas;
  // Optional props from form-render
  value?: any;
  onChange?: (v: any) => void;
  schema?: any;
  style?: React.CSSProperties;
  id?: string;
  addons?: any;
  [key: string]: any;
}

const HEADING_LEVELS = [
  { label: 'H1', size: 36, bold: true, fontSize: 14 },
  { label: 'H2', size: 24, bold: true, fontSize: 13 },
  { label: 'H3', size: 18, bold: true, fontSize: 12 },
  { label: 'Body', size: 12, bold: false, fontSize: 11 },
  { label: 'Small', size: 10, bold: false, fontSize: 10 },
];

const HeadingWidget = (props: HeadingWidgetProps) => {
  const { activeElements, changeSchemas, schemas } = props;

  const apply = (level: typeof HEADING_LEVELS[0]) => {
    const ids = activeElements.map((ae) => ae.id);
    const ass = schemas.filter((s) => ids.includes(s.id));
    
    changeSchemas(
      ass.map((s: SchemaForUI) => {
        const changes: any[] = [{ key: 'fontSize', value: level.size, schemaId: s.id }];
        
        // Handle artText specifically for bold
        if (s.type === 'artText') {
          changes.push({ key: 'artBold', value: level.bold, schemaId: s.id });
        }
        
        return changes;
      }).flat()
    );
  };

  const currentLevelLabel = () => {
    if (activeElements.length === 0) return null;
    const firstSchema = schemas.find(s => s.id === activeElements[0].id) as any;
    if (!firstSchema) return null;
    
    const size = firstSchema.fontSize;
    const found = HEADING_LEVELS.find(l => l.size === size);
    return found ? found.label : null;
  };

  const getCurrentSize = () => {
    if (activeElements.length === 0) return null;
    const firstSchema = schemas.find(s => s.id === activeElements[0].id) as any;
    return firstSchema?.fontSize || null;
  };

  const activeLabel = currentLevelLabel();
  const currentSize = getCurrentSize();

  const sizeLabels: Record<number, string> = {
    36: 'H1 · 36pt',
    24: 'H2 · 24pt', 
    18: 'H3 · 18pt',
    12: 'Body · 12pt',
    10: 'Small · 10pt'
  };

  return (
    <div style={{ marginBottom: 4 }}>
      {/* Label with icon */}
      <div style={{ 
        fontSize: 11, 
        color: '#0a0a0a', 
        marginBottom: 10, 
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        display: 'flex',
        alignItems: 'center',
        gap: 6
      }}>
        <span style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          background: 'linear-gradient(135deg, #0a0a0a 0%, #404040 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          color: '#fff',
          fontWeight: 700
        }}>H</span>
        Text Level
      </div>
      
      {/* Button group with pill design */}
      <div style={{ 
        display: 'flex', 
        gap: 0,
        background: 'linear-gradient(135deg, #f8fafc 0%, #fafafa 100%)',
        borderRadius: 12,
        padding: 4,
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), inset 0 1px 2px rgba(255, 255, 255, 0.8)'
      }}>
        {HEADING_LEVELS.map((level) => {
          const isActive = activeLabel === level.label;
          const isHeading = ['H1', 'H2', 'H3'].includes(level.label);
          
          return (
            <button
              key={level.label}
              style={{
                flex: 1,
                height: 36,
                borderRadius: 8,
                fontWeight: isActive ? 700 : isHeading ? 600 : 500,
                fontSize: level.fontSize,
                background: isActive 
                  ? 'linear-gradient(135deg, #0a0a0a 0%, #171717 100%)' 
                  : 'transparent',
                border: 'none',
                color: isActive ? '#fff' : isHeading ? '#4b5563' : '#6b7280',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                boxShadow: isActive 
                  ? '0 4px 12px rgba(139, 92, 246, 0.35), 0 2px 4px rgba(139, 92, 246, 0.2)' 
                  : 'none',
                transform: isActive ? 'scale(1.02)' : 'scale(1)',
                zIndex: isActive ? 2 : 1,
                letterSpacing: isHeading ? '0.5px' : 'normal',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(139, 92, 246, 0.08)';
                  e.currentTarget.style.color = '#171717';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = isHeading ? '#4b5563' : '#6b7280';
                }
              }}
              onClick={() => apply(level)}
            >
              {level.label}
              {/* Active indicator dot */}
              {isActive && (
                <span style={{
                  position: 'absolute',
                  bottom: 4,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.8)',
                }} />
              )}
            </button>
          );
        })}
      </div>
      
      {/* Size indicator */}
      <div style={{
        marginTop: 8,
        fontSize: 10,
        color: '#9ca3af',
        textAlign: 'center',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4
      }}>
        <span style={{ 
          width: 6, 
          height: 6, 
          borderRadius: 2, 
          background: '#0a0a0a',
          opacity: 0.6
        }} />
        {currentSize ? (sizeLabels[currentSize] || `${currentSize}pt`) : 'Select level'}
      </div>
    </div>
  );
};

export default HeadingWidget;
