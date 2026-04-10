import {
  DEFAULT_FONT_NAME,
  PropPanel,
  PropPanelWidgetProps,
  PropPanelSchema,
  getFallbackFontName,
} from '@pdfme/common';
import type { HeadingSchema, HEADING_LEVEL } from './types.js';
import {
  HEADING_LEVELS,
  DEFAULT_HEADING_LEVEL,
  DEFAULT_HEADING_FONT_COLOR,
  DEFAULT_HEADING_LINE_HEIGHT,
  DEFAULT_HEADING_ALIGNMENT,
  DEFAULT_HEADING_VERTICAL_ALIGNMENT,
} from './constants.js';
import { DEFAULT_OPACITY, HEX_COLOR_PATTERN } from '../constants.js';

// Custom widget for heading level selection with modern pill design
const HeadingLevelWidget = (props: PropPanelWidgetProps) => {
  const { rootElement, changeSchemas, activeSchema } = props;
  const currentLevel = (activeSchema as unknown as HeadingSchema).level || DEFAULT_HEADING_LEVEL;

  // Main wrapper
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'margin-bottom: 4px;';

  // Header with icon
  const header = document.createElement('div');
  header.style.cssText = `
    font-size: 11px;
    color: #8b5cf6;
    margin-bottom: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    gap: 6px;
  `;

  const iconBadge = document.createElement('span');
  iconBadge.innerText = 'H';
  iconBadge.style.cssText = `
    width: 16px;
    height: 16px;
    border-radius: 4px;
    background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: #fff;
    font-weight: 700;
  `;

  const headerText = document.createElement('span');
  headerText.innerText = 'Text Level';

  header.appendChild(iconBadge);
  header.appendChild(headerText);
  wrapper.appendChild(header);

  // Button container with pill design
  const container = document.createElement('div');
  container.style.cssText = `
    display: flex;
    gap: 0;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-radius: 12px;
    padding: 4px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), inset 0 1px 2px rgba(255, 255, 255, 0.8);
  `;

  const levels: HEADING_LEVEL[] = ['h1', 'h2', 'h3', 'body', 'small'];
  const labels: Record<HEADING_LEVEL, string> = {
    h1: 'H1',
    h2: 'H2',
    h3: 'H3',
    body: 'Body',
    small: 'Small',
  };

  const sizeLabels: Record<HEADING_LEVEL, string> = {
    h1: 'H1 · 36pt',
    h2: 'H2 · 24pt',
    h3: 'H3 · 18pt',
    body: 'Body · 14pt',
    small: 'Small · 10pt',
  };

  levels.forEach((level) => {
    const btn = document.createElement('button');
    btn.innerText = labels[level];
    const isActive = currentLevel === level;
    const isHeading = ['h1', 'h2', 'h3'].includes(level);

    btn.style.cssText = `
      flex: 1;
      height: 36px;
      border-radius: 8px;
      font-weight: ${isActive ? '700' : isHeading ? '600' : '500'};
      font-size: ${isHeading ? '13px' : '12px'};
      background: ${isActive ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : 'transparent'};
      border: none;
      color: ${isActive ? '#fff' : isHeading ? '#4b5563' : '#6b7280'};
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      box-shadow: ${isActive ? '0 4px 12px rgba(139, 92, 246, 0.35), 0 2px 4px rgba(139, 92, 246, 0.2)' : 'none'};
      transform: ${isActive ? 'scale(1.02)' : 'scale(1)'};
      z-index: ${isActive ? '2' : '1'};
      letter-spacing: ${isHeading ? '0.5px' : 'normal'};
    `;

    // Add active indicator dot
    if (isActive) {
      const dot = document.createElement('span');
      dot.style.cssText = `
        position: absolute;
        bottom: 4px;
        left: 50%;
        transform: translateX(-50%);
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.8);
      `;
      btn.appendChild(dot);
    }

    btn.onmouseenter = () => {
      if (!isActive) {
        btn.style.background = 'rgba(139, 92, 246, 0.08)';
        btn.style.color = '#7c3aed';
      }
    };
    btn.onmouseleave = () => {
      if (!isActive) {
        btn.style.background = 'transparent';
        btn.style.color = isHeading ? '#4b5563' : '#6b7280';
      }
    };
    btn.onclick = () => {
      const { fontSize, fontWeight } = HEADING_LEVELS[level];
      changeSchemas([
        { key: 'level', value: level, schemaId: activeSchema.id },
        { key: 'fontSize', value: fontSize, schemaId: activeSchema.id },
        { key: 'fontWeight', value: fontWeight, schemaId: activeSchema.id },
      ]);
    };
    container.appendChild(btn);
  });

  wrapper.appendChild(container);

  // Size indicator at bottom
  const indicator = document.createElement('div');
  indicator.style.cssText = `
    margin-top: 8px;
    font-size: 10px;
    color: #9ca3af;
    text-align: center;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 4px;
  `;

  const indicatorDot = document.createElement('span');
  indicatorDot.style.cssText = `
    width: 6px;
    height: 6px;
    border-radius: 2px;
    background: #8b5cf6;
    opacity: 0.6;
  `;

  const indicatorText = document.createElement('span');
  indicatorText.innerText = sizeLabels[currentLevel] || 'Select level';

  indicator.appendChild(indicatorDot);
  indicator.appendChild(indicatorText);
  wrapper.appendChild(indicator);

  rootElement.appendChild(wrapper);
};

export const propPanel: PropPanel<HeadingSchema> = {
  schema: ({ options, i18n }) => {
    const font = options.font || { [DEFAULT_FONT_NAME]: { data: '', fallback: true } };
    const fontNames = Object.keys(font);
    const fallbackFontName = getFallbackFontName(font);

    const headingSchema: Record<string, PropPanelSchema> = {
      textStyle: {
        title: 'Style',
        type: 'object',
        widget: 'Card',
        span: 24,
        properties: {
          fontName: {
            title: i18n('schemas.text.fontName') || 'Font',
            type: 'string',
            widget: 'select',
            default: fallbackFontName,
            props: { options: fontNames.map((name) => ({ label: name, value: name })) },
            span: 24,
          },
          fontColor: {
            title: i18n('schemas.textColor') || 'Color',
            type: 'string',
            widget: 'color',
            props: { disabledAlpha: true },
            rules: [{ pattern: HEX_COLOR_PATTERN, message: i18n('validation.hexColor') }],
            span: 12,
          },
          backgroundColor: {
            title: i18n('schemas.bgColor') || 'Background',
            type: 'string',
            widget: 'color',
            props: { disabledAlpha: true },
            rules: [{ pattern: HEX_COLOR_PATTERN, message: i18n('validation.hexColor') }],
            span: 12,
          },
        },
      },
    };

    return headingSchema;
  },
  widgets: { HeadingLevelWidget },
  defaultSchema: {
    name: '',
    type: 'heading',
    content: 'Heading',
    position: { x: 0, y: 0 },
    width: 100,
    height: 15,
    rotate: 0,
    level: DEFAULT_HEADING_LEVEL,
    alignment: DEFAULT_HEADING_ALIGNMENT as any,
    verticalAlignment: DEFAULT_HEADING_VERTICAL_ALIGNMENT as any,
    fontSize: HEADING_LEVELS[DEFAULT_HEADING_LEVEL].fontSize,
    lineHeight: DEFAULT_HEADING_LINE_HEIGHT,
    characterSpacing: 0,
    fontColor: DEFAULT_HEADING_FONT_COLOR,
    fontName: undefined,
    backgroundColor: '',
    fontWeight: HEADING_LEVELS[DEFAULT_HEADING_LEVEL].fontWeight,
    opacity: DEFAULT_OPACITY,
  },
};
