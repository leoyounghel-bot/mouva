import type { Schema } from '@pdfme/common';
import type { ALIGNMENT, VERTICAL_ALIGNMENT } from '../text/types.js';

export type HEADING_LEVEL = 'h1' | 'h2' | 'h3' | 'body' | 'small';

export interface HeadingSchema extends Schema {
  level: HEADING_LEVEL;
  fontName?: string;
  alignment: ALIGNMENT;
  verticalAlignment: VERTICAL_ALIGNMENT;
  fontSize: number;
  lineHeight: number;
  characterSpacing: number;
  fontColor: string;
  backgroundColor: string;
  fontWeight: 'normal' | 'bold';
}
