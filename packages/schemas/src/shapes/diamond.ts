import { Plugin, Schema, mm2pt } from '@pdfme/common';
import { HEX_COLOR_PATTERN } from '../constants.js';
import { hex2PrintingColor, convertForPdfLayoutProps } from '../utils.js';

interface DiamondSchema extends Schema {
  type: 'diamond';
  borderWidth: number;
  borderColor: string;
  color: string;
}

const diamondPlugin: Plugin<DiamondSchema> = {
  ui: (arg) => {
    const { schema, rootElement } = arg;
    const div = document.createElement('div');
    div.style.width = '100%';
    div.style.height = '100%';
    div.style.boxSizing = 'border-box';
    div.style.clipPath = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
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
      inner.style.clipPath = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
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

    const x = position.x;
    const y = position.y;
    const cx = x + width / 2;
    const cy = y + height / 2;

    const path = `M ${cx} ${y} L ${x + width} ${cy} L ${cx} ${y + height} L ${x} ${cy} Z`;

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
      type: 'diamond',
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
  icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12,2 22,12 12,22 2,12"/></svg>',
};

export default diamondPlugin;
