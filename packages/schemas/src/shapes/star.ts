import { Plugin, Schema, mm2pt } from '@pdfme/common';
import { HEX_COLOR_PATTERN } from '../constants.js';
import { hex2PrintingColor, convertForPdfLayoutProps } from '../utils.js';

interface StarSchema extends Schema {
  type: 'star';
  borderWidth: number;
  borderColor: string;
  color: string;
}

// Generate 5-pointed star points as CSS polygon
const STAR_CLIP = 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';

// Generate 5-pointed star SVG path for given dimensions
const starPath = (x: number, y: number, w: number, h: number): string => {
  // 5-pointed star: 10 points alternating outer/inner
  const cx = x + w / 2;
  const cy = y + h / 2;
  const outerR = Math.min(w, h) / 2;
  const innerR = outerR * 0.38;
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / 2) + (i * Math.PI / 5);
    // PDF coordinate: y increases downward in our converted coords
    const px = cx + r * Math.cos(angle);
    const py = cy - r * Math.sin(angle);
    points.push(`${i === 0 ? 'M' : 'L'} ${px} ${py}`);
  }
  return points.join(' ') + ' Z';
};

const starPlugin: Plugin<StarSchema> = {
  ui: (arg) => {
    const { schema, rootElement } = arg;
    const div = document.createElement('div');
    div.style.width = '100%';
    div.style.height = '100%';
    div.style.boxSizing = 'border-box';
    div.style.clipPath = STAR_CLIP;
    div.style.backgroundColor = schema.color || 'transparent';
    if (schema.borderWidth && schema.borderColor) {
      div.style.backgroundColor = schema.borderColor || 'transparent';
      const inner = document.createElement('div');
      const bw = schema.borderWidth || 0;
      inner.style.position = 'absolute';
      inner.style.top = `${bw}mm`;
      inner.style.left = `${bw}mm`;
      inner.style.right = `${bw}mm`;
      inner.style.bottom = `${bw}mm`;
      inner.style.clipPath = STAR_CLIP;
      inner.style.backgroundColor = schema.color || '#ffffff';
      div.style.position = 'relative';
      div.appendChild(inner);
    }
    rootElement.appendChild(div);
  },
  pdf: (arg) => {
    const { schema, page, options } = arg;
    if (!schema.color && !schema.borderColor) return;
    const { colorType } = options;
    const pageHeight = page.getHeight();
    const { position, width, height, opacity } = convertForPdfLayoutProps({ schema, pageHeight });

    const path = starPath(position.x, position.y, width, height);

    if (schema.color) {
      page.drawSvgPath(path, {
        color: hex2PrintingColor(schema.color, colorType),
        opacity,
      });
    }
    if (schema.borderWidth && schema.borderColor) {
      page.drawSvgPath(path, {
        borderColor: hex2PrintingColor(schema.borderColor, colorType),
        borderWidth: mm2pt(schema.borderWidth),
        opacity,
      });
    }
  },
  propPanel: {
    schema: ({ i18n }) => ({
      shapeStyle: {
        title: i18n('schemas.shape.style') || 'Shape Style',
        type: 'object',
        widget: 'Card',
        span: 24,
        properties: {
          borderWidth: {
            title: i18n('schemas.borderWidth'),
            type: 'number',
            widget: 'inputNumber',
            props: { min: 0, step: 1 },
            span: 12,
          },
          borderColor: {
            title: i18n('schemas.borderColor'),
            type: 'string',
            widget: 'color',
            props: { disabledAlpha: true },
            rules: [{ pattern: HEX_COLOR_PATTERN, message: i18n('validation.hexColor') }],
            span: 12,
          },
          color: {
            title: i18n('schemas.color'),
            type: 'string',
            widget: 'color',
            props: { disabledAlpha: true },
            rules: [{ pattern: HEX_COLOR_PATTERN, message: i18n('validation.hexColor') }],
            span: 12,
          },
        },
      },
    }),
    defaultSchema: {
      name: '',
      type: 'star',
      position: { x: 0, y: 0 },
      width: 37.5,
      height: 37.5,
      rotate: 0,
      opacity: 1,
      borderWidth: 1,
      borderColor: '#000000',
      color: '',
      readOnly: false,
    },
  },
  icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>',
};

export default starPlugin;
