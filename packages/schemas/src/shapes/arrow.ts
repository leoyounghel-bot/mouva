import { Plugin, Schema, mm2pt } from '@pdfme/common';
import { HEX_COLOR_PATTERN } from '../constants.js';
import { hex2PrintingColor, convertForPdfLayoutProps } from '../utils.js';

interface ArrowSchema extends Schema {
  type: 'arrow';
  borderWidth: number;
  borderColor: string;
  color: string;
}

// Right-pointing arrow (chevron arrow shape)
const ARROW_CLIP = 'polygon(0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%)';

const arrowPath = (x: number, y: number, w: number, h: number): string => {
  // Right-pointing block arrow
  const shaftTop = y + h * 0.2;
  const shaftBot = y + h * 0.8;
  const headJoin = x + w * 0.6;
  const tip = x + w;
  const mid = y + h / 2;
  return `M ${x} ${shaftTop} L ${headJoin} ${shaftTop} L ${headJoin} ${y} L ${tip} ${mid} L ${headJoin} ${y + h} L ${headJoin} ${shaftBot} L ${x} ${shaftBot} Z`;
};

const arrowPlugin: Plugin<ArrowSchema> = {
  ui: (arg) => {
    const { schema, rootElement } = arg;
    const div = document.createElement('div');
    div.style.width = '100%';
    div.style.height = '100%';
    div.style.boxSizing = 'border-box';
    div.style.clipPath = ARROW_CLIP;
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
      inner.style.clipPath = ARROW_CLIP;
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

    const path = arrowPath(position.x, position.y, width, height);

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
      type: 'arrow',
      position: { x: 0, y: 0 },
      width: 50,
      height: 30,
      rotate: 0,
      opacity: 1,
      borderWidth: 1,
      borderColor: '#000000',
      color: '',
      readOnly: false,
    },
  },
  icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="2,8 14,8 14,3 22,12 14,21 14,16 2,16"/></svg>',
};

export default arrowPlugin;
