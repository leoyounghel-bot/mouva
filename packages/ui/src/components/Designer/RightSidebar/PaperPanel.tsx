import React, { useContext, useMemo, useState, useEffect } from 'react';
import { Button, Typography, Tooltip, Segmented, Tag } from 'antd';
import { Menu, FileText, Monitor, Smartphone, CreditCard, Layout, Square, Rows3, Presentation } from 'lucide-react';
import { SidebarBody, SidebarFrame, SidebarHeader, SIDEBAR_H_PADDING_PX } from './layout.js';
import { DESIGNER_CLASSNAME } from '../../../constants.js';
import { OptionsContext } from '../../../contexts.js';
import type { SidebarProps } from '../../../types.js';

const { Text } = Typography;

// ============================================================================
// Paper Sizes Registry (with English labels)
// ============================================================================

interface PaperSizeConfig {
  name: string;
  width: number;
  height: number;
  ratio?: string;
  pixels?: string;
  /** 
   * Preferred orientation for this paper size.
   * 'landscape' = width > height (e.g., PPT presentations)
   * 'portrait' = height > width (e.g., social media posts like Xiaohongshu)
   * 'auto' or undefined = use the natural dimensions as defined
   */
  preferredOrientation?: 'portrait' | 'landscape' | 'auto';
}

interface PaperCategory {
  key: string;
  label: string;
  icon: React.ReactNode;
  sizes: PaperSizeConfig[];
}

const PAPER_CATEGORIES: PaperCategory[] = [
  {
    key: 'standard',
    label: 'STANDARD',
    icon: <FileText size={14} />,
    sizes: [
      // Standard paper sizes - typically used in portrait orientation
      { name: 'A3', width: 297, height: 420, preferredOrientation: 'portrait' },
      { name: 'A4', width: 210, height: 297, preferredOrientation: 'portrait' },
      { name: 'A5', width: 148, height: 210, preferredOrientation: 'portrait' },
      { name: 'B5', width: 176, height: 250, preferredOrientation: 'portrait' },
      { name: 'Letter', width: 216, height: 279, preferredOrientation: 'portrait' },
      { name: 'Legal', width: 216, height: 356, preferredOrientation: 'portrait' },
    ],
  },
  {
    key: 'presentation',
    label: 'PRESENTATION',
    icon: <Presentation size={14} />,
    sizes: [
      // PPT presentations - always landscape orientation
      { name: 'PPT 4:3', width: 254, height: 190.5, ratio: '4:3', preferredOrientation: 'landscape' },
      { name: 'PPT 16:9', width: 338.67, height: 190.5, ratio: '16:9', preferredOrientation: 'landscape' },
      { name: 'PPT 16:10', width: 304.8, height: 190.5, ratio: '16:10', preferredOrientation: 'landscape' },
    ],
  },
  {
    key: 'social',
    label: 'SOCIAL MEDIA',
    icon: <Smartphone size={14} />,
    sizes: [
      // Social media - orientation depends on the specific platform
      { name: 'Instagram Post', width: 150, height: 150, ratio: '1:1', pixels: '1080×1080', preferredOrientation: 'auto' }, // Square
      { name: 'WeChat', width: 150, height: 150, ratio: '1:1', pixels: '1080×1080', preferredOrientation: 'auto' }, // Square
      { name: 'Xiaohongshu', width: 150, height: 200, ratio: '3:4', pixels: '1080×1440', preferredOrientation: 'portrait' }, // Portrait for Xiaohongshu
      { name: 'IG Portrait', width: 150, height: 188, ratio: '4:5', pixels: '1080×1350', preferredOrientation: 'portrait' },
      { name: 'Story', width: 150, height: 267, ratio: '9:16', pixels: '1080×1920', preferredOrientation: 'portrait' },
      { name: 'Cover Photo', width: 200, height: 75, ratio: '16:6', pixels: '1640×624', preferredOrientation: 'landscape' }, // Wide cover photos
    ],
  },
  {
    key: 'cards',
    label: 'CARDS',
    icon: <CreditCard size={14} />,
    sizes: [
      // Cards - mixed orientations based on typical use
      { name: 'Postcard', width: 148, height: 100, preferredOrientation: 'landscape' },
      { name: 'Business Card', width: 90, height: 54, preferredOrientation: 'landscape' },
      { name: 'Greeting Card', width: 148, height: 105, preferredOrientation: 'landscape' },
      { name: 'Invitation', width: 140, height: 200, preferredOrientation: 'portrait' },
    ],
  },
  {
    key: 'custom',
    label: 'OTHER',
    icon: <Layout size={14} />,
    sizes: [
      // Other sizes - use natural dimensions
      { name: 'Square', width: 200, height: 200, preferredOrientation: 'auto' },
      { name: 'Banner', width: 300, height: 100, preferredOrientation: 'landscape' },
      { name: 'Poster', width: 420, height: 594, preferredOrientation: 'portrait' },
    ],
  },
];

// Get icon component for category
const getSizeIcon = (category: string) => {
  switch (category) {
    case 'standard': return FileText;
    case 'presentation': return Presentation;
    case 'social': return Smartphone;
    case 'cards': return CreditCard;
    default: return Layout;
  }
};

// ============================================================================
// Component Types
// ============================================================================

type PaperPanelProps = Pick<SidebarProps, 'activeElements' | 'schemas' | 'changeSchemas' | 'size' | 'pageSize'> & {
  onClose: () => void;
  onBack?: () => void;
};

// ============================================================================
// Section Title Component
// ============================================================================

const SectionTitle: React.FC<{ children: React.ReactNode; icon?: React.ReactNode }> = ({ children, icon }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
    marginTop: 4,
  }}>
    {icon && <span style={{ color: '#0a0a0a' }}>{icon}</span>}
    <span style={{
      fontSize: 10,
      fontWeight: 600,
      color: '#6b7280',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    }}>
      {children}
    </span>
  </div>
);

// ============================================================================
// Main Component
// ============================================================================

const PaperPanel = ({ onClose, onBack, size, pageSize }: PaperPanelProps) => {
  const options = useContext(OptionsContext);
  
  // Get current paper size from options.paperSize (synced from template.basePdf)
  // This ensures the highlight updates immediately when paper size changes, 
  // as options.paperSize is updated synchronously via updateOptions() in AiDesigner.tsx
  // Fallback to pageSize prop (async) and finally default A4
  const currentSize = useMemo(() => {
    // Priority 1: options.paperSize (synchronously updated from template.basePdf)
    const optionsPaperSize = (options as any)?.paperSize;
    console.log('[PaperPanel] Computing currentSize, options.paperSize:', optionsPaperSize, 'pageSize:', pageSize);
    if (optionsPaperSize && typeof optionsPaperSize === 'object' && 'width' in optionsPaperSize && 'height' in optionsPaperSize) {
      console.log('[PaperPanel] Using options.paperSize:', optionsPaperSize);
      return optionsPaperSize;
    }
    // Priority 2: pageSize prop (async from useUIPreProcessor)
    if (pageSize) {
      console.log('[PaperPanel] Using pageSize prop:', pageSize);
      return pageSize;
    }
    // Priority 3: default A4
    console.log('[PaperPanel] Using default A4');
    return { width: 210, height: 297 };
  }, [options, pageSize]); // Use entire options object to detect any changes

  // Orientation state derived from current size
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(() => {
    return currentSize.width > currentSize.height ? 'landscape' : 'portrait';
  });

  // Update orientation when current size changes
  useEffect(() => {
    setOrientation(currentSize.width > currentSize.height ? 'landscape' : 'portrait');
  }, [currentSize]);

  // Calculate current orientation type for display
  const orientationType = useMemo(() => {
    if (currentSize.width === currentSize.height) return 'square';
    return currentSize.width > currentSize.height ? 'landscape' : 'portrait';
  }, [currentSize]);

  // Handle size selection - uses the paper size's preferred orientation
  const handleSizeSelect = (sizeConfig: PaperSizeConfig) => {
    const { name, width, height, preferredOrientation } = sizeConfig;
    console.log('[PaperPanel] handleSizeSelect called:', { name, width, height, preferredOrientation });
    
    const onPaperSizeChange = (options as any)?.onPaperSizeChange;
    console.log('[PaperPanel] onPaperSizeChange available:', !!onPaperSizeChange);
    
    if (onPaperSizeChange) {
      // Determine the effective orientation based on preferredOrientation
      // - 'landscape': always use landscape (width > height)
      // - 'portrait': always use portrait (height > width)
      // - 'auto' or undefined: use the natural dimensions as defined
      let effectiveOrientation: 'portrait' | 'landscape';
      
      if (preferredOrientation === 'landscape') {
        effectiveOrientation = 'landscape';
      } else if (preferredOrientation === 'portrait') {
        effectiveOrientation = 'portrait';
      } else {
        // 'auto' - use natural dimensions, determine what they represent
        effectiveOrientation = width > height ? 'landscape' : (width === height ? 'portrait' : 'portrait');
      }
      
      // Update the orientation toggle to reflect the paper's preferred orientation
      // This provides visual feedback to the user about the selected paper's orientation
      if (preferredOrientation && preferredOrientation !== 'auto') {
        setOrientation(effectiveOrientation);
      }
      
      // Apply the effective orientation to calculate final dimensions
      const finalWidth = effectiveOrientation === 'landscape' ? Math.max(width, height) : Math.min(width, height);
      const finalHeight = effectiveOrientation === 'landscape' ? Math.min(width, height) : Math.max(width, height);
      
      console.log('[PaperPanel] Calling onPaperSizeChange with:', { finalWidth, finalHeight, effectiveOrientation });
      onPaperSizeChange(finalWidth, finalHeight);
    } else {
      console.warn('[PaperPanel] onPaperSizeChange callback is not available in options!');
    }
  };

  // Handle orientation change
  const handleOrientationChange = (newOrientation: 'portrait' | 'landscape') => {
    setOrientation(newOrientation);
    
    const onPaperSizeChange = (options as any)?.onPaperSizeChange;
    if (onPaperSizeChange && currentSize.width !== currentSize.height) {
      const { width, height } = currentSize;
      const finalWidth = newOrientation === 'landscape' ? Math.max(width, height) : Math.min(width, height);
      const finalHeight = newOrientation === 'landscape' ? Math.min(width, height) : Math.max(width, height);
      onPaperSizeChange(finalWidth, finalHeight);
    }
  };

  // Render paper size button
  const renderSizeButton = (sizeConfig: PaperSizeConfig, category: string) => {
    // Calculate both portrait and landscape dimensions for this paper size
    const portraitWidth = Math.min(sizeConfig.width, sizeConfig.height);
    const portraitHeight = Math.max(sizeConfig.width, sizeConfig.height);
    const landscapeWidth = Math.max(sizeConfig.width, sizeConfig.height);
    const landscapeHeight = Math.min(sizeConfig.width, sizeConfig.height);
    
    // Use tolerance comparison for floating point precision issues (e.g., PPT 16:9 = 338.67mm)
    const tolerance = 0.5; // 0.5mm tolerance for size comparison
    const sizeMatches = (a: number, b: number) => Math.abs(a - b) < tolerance;
    
    // Check if current size matches either orientation of this paper size
    // This ensures correct highlighting regardless of orientation state timing
    const isSelected = 
      (sizeMatches(currentSize.width, portraitWidth) && sizeMatches(currentSize.height, portraitHeight)) ||
      (sizeMatches(currentSize.width, landscapeWidth) && sizeMatches(currentSize.height, landscapeHeight));
    
    const Icon = getSizeIcon(category);
    
    // Build tooltip content
    const tooltipContent = sizeConfig.pixels 
      ? `${sizeConfig.width} × ${sizeConfig.height}mm (${sizeConfig.ratio}, ${sizeConfig.pixels}px)`
      : `${sizeConfig.width} × ${sizeConfig.height}mm`;

    return (
      <Tooltip 
        key={sizeConfig.name} 
        title={tooltipContent} 
        placement="top"
        color="#1f1f1f"
        overlayInnerStyle={{ 
          fontSize: 12, 
          fontWeight: 500, 
          color: '#ffffff',
          padding: '6px 10px',
          borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      >
        <button
          onClick={() => handleSizeSelect(sizeConfig)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: 76,
            height: 56,
            borderRadius: 8,
            border: isSelected ? '2px solid #0a0a0a' : '1.5px solid #d1d5db',
            background: isSelected 
              ? 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)' 
              : '#ffffff',
            boxShadow: isSelected 
              ? '0 2px 8px rgba(139, 92, 246, 0.15)' 
              : '0 1px 2px rgba(0, 0, 0, 0.06)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            padding: 0,
          }}
          onMouseEnter={(e) => {
            if (!isSelected) {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.borderColor = '#c4b5fd';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.08)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSelected) {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.06)';
            }
          }}
        >
          <Icon 
            size={16} 
            style={{ 
              color: isSelected ? '#0a0a0a' : '#525252',
              marginBottom: 3,
            }} 
          />
          <span style={{ 
            fontSize: 11, 
            color: isSelected ? '#0a0a0a' : '#1f2937',
            fontWeight: isSelected ? 600 : 500,
            textAlign: 'center',
            lineHeight: 1.2,
            maxWidth: 70,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {sizeConfig.name}
          </span>
        </button>
      </Tooltip>
    );
  };

  // Get status display config
  const statusConfig = useMemo(() => {
    if (orientationType === 'square') {
      return { label: 'Square', color: '#10b981', icon: <Square size={12} /> };
    }
    if (orientationType === 'landscape') {
      return { label: 'Landscape', color: '#f59e0b', icon: <Rows3 size={12} style={{ transform: 'rotate(90deg)' }} /> };
    }
    return { label: 'Portrait', color: '#0a0a0a', icon: <Rows3 size={12} /> };
  }, [orientationType]);

  return (
    <SidebarFrame className={DESIGNER_CLASSNAME + 'paper-panel'}>
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
          onClick={onBack || onClose}
          icon={<Menu strokeWidth={1.5} size={20} />}
        />
        <Text strong style={{ textAlign: 'center', width: '100%' }}>
          Paper Settings
        </Text>
      </SidebarHeader>
      
      <SidebarBody>
        {/* Orientation Toggle */}
        <div style={{ marginBottom: 12 }}>
          <Segmented
            value={orientation}
            onChange={(value) => handleOrientationChange(value as 'portrait' | 'landscape')}
            block
            options={[
              {
                label: (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '2px 0', fontSize: 12 }}>
                    <Monitor size={12} />
                    <span>Portrait</span>
                  </div>
                ),
                value: 'portrait',
              },
              {
                label: (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '2px 0', fontSize: 12 }}>
                    <Monitor size={12} style={{ transform: 'rotate(90deg)' }} />
                    <span>Landscape</span>
                  </div>
                ),
                value: 'landscape',
              },
            ]}
            style={{
              background: '#fafafa',
              padding: 3,
              borderRadius: 8,
            }}
          />
        </div>

        {/* Paper Size Categories */}
        {PAPER_CATEGORIES.map((category) => (
          <div key={category.key} style={{ marginBottom: 10 }}>
            <SectionTitle icon={category.icon}>{category.label}</SectionTitle>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: 6,
            }}>
              {category.sizes.map((sizeConfig) => renderSizeButton(sizeConfig, category.key))}
            </div>
          </div>
        ))}

        {/* Current Size Status Card */}
        <div style={{ 
          marginTop: 6,
          padding: '8px 12px',
          background: 'linear-gradient(135deg, #faf5ff 0%, #f5f3ff 100%)',
          borderRadius: 8,
          border: '1px solid #ede9fe',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <span style={{ 
              color: '#6b7280', 
              fontSize: 10, 
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
            }}>
              Current Size
            </span>
            <div style={{ 
              fontSize: 13, 
              fontWeight: 700,
              color: '#0a0a0a',
              marginTop: 2,
              whiteSpace: 'nowrap',
            }}>
              {currentSize.width} × {currentSize.height} mm
            </div>
          </div>
          <Tag 
            style={{ 
              backgroundColor: `${statusConfig.color}15`,
              color: statusConfig.color,
              border: `1px solid ${statusConfig.color}30`,
              fontWeight: 500,
              borderRadius: 6,
              padding: '2px 8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              fontSize: 11,
              margin: 0,
            }}
          >
            {statusConfig.icon}
            {statusConfig.label}
          </Tag>
        </div>
      </SidebarBody>
    </SidebarFrame>
  );
};

export default PaperPanel;
