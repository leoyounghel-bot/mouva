import React from 'react';
import FontPanel from './FontPanel';
import ArtFontPanel, { ArtFontEffects } from './ArtFontPanel';
import PaperPanel from './PaperPanel';

export type ToolPanelType = 'font' | 'artFont' | 'paper' | null;

interface ToolPanelContainerProps {
  activePanel: ToolPanelType;
  onClose: () => void;
  
  // Font Panel props
  fonts?: Record<string, { data: string | ArrayBuffer | Uint8Array; fallback?: boolean; subset?: boolean }>;
  currentFont?: string;
  onFontChange?: (fontName: string) => void;
  hasSelectedElement?: boolean;
  
  // Art Font Panel props
  currentArtFontEffects?: ArtFontEffects;
  currentArtFont?: string;
  onArtFontEffectsChange?: (effects: Partial<ArtFontEffects>) => void;
  onArtFontChange?: (fontName: string) => void;
  
  // Paper Panel props
  currentPaperSize?: { width: number; height: number };
  paperOrientation?: 'portrait' | 'landscape';
  onPaperSizeChange?: (width: number, height: number) => void;
  onPaperOrientationChange?: (orientation: 'portrait' | 'landscape') => void;
}

const ToolPanelContainer: React.FC<ToolPanelContainerProps> = ({
  activePanel,
  onClose,
  fonts = {},
  currentFont = '',
  onFontChange = () => {},
  hasSelectedElement = false,
  currentArtFontEffects,
  currentArtFont = '',
  onArtFontEffectsChange = () => {},
  onArtFontChange = () => {},
  currentPaperSize = { width: 210, height: 297 },
  paperOrientation = 'portrait',
  onPaperSizeChange = () => {},
  onPaperOrientationChange = () => {},
}) => {
  if (!activePanel) return null;

  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 320,
    height: '100%',
    background: '#ffffff',
    borderLeft: '1px solid #e5e7eb',
    zIndex: 100,
    boxShadow: '-4px 0 12px rgba(0,0,0,0.05)',
  };

  return (
    <div style={panelStyle}>
      {activePanel === 'font' && (
        <FontPanel
          fonts={fonts}
          currentFont={currentFont}
          onFontChange={onFontChange}
          onClose={onClose}
          hasSelectedElement={hasSelectedElement}
        />
      )}
      {activePanel === 'artFont' && (
        <ArtFontPanel
          currentEffects={currentArtFontEffects!}
          currentArtFont={currentArtFont}
          onEffectsChange={onArtFontEffectsChange}
          onArtFontChange={onArtFontChange}
          onClose={onClose}
          hasSelectedElement={hasSelectedElement}
        />
      )}
      {activePanel === 'paper' && (
        <PaperPanel
          currentSize={currentPaperSize}
          orientation={paperOrientation}
          onSizeChange={onPaperSizeChange}
          onOrientationChange={onPaperOrientationChange}
          onClose={onClose}
        />
      )}
    </div>
  );
};

export default ToolPanelContainer;
