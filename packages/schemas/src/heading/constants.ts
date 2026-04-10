import type { HEADING_LEVEL } from './types.js';

export const HEADING_LEVELS: Record<HEADING_LEVEL, { fontSize: number; fontWeight: 'normal' | 'bold' }> = {
  h1: { fontSize: 36, fontWeight: 'bold' },
  h2: { fontSize: 24, fontWeight: 'bold' },
  h3: { fontSize: 18, fontWeight: 'bold' },
  body: { fontSize: 12, fontWeight: 'normal' },
  small: { fontSize: 10, fontWeight: 'normal' },
};

export const DEFAULT_HEADING_LEVEL: HEADING_LEVEL = 'body';
export const DEFAULT_HEADING_FONT_COLOR = '#000000';
export const DEFAULT_HEADING_LINE_HEIGHT = 1;
export const DEFAULT_HEADING_ALIGNMENT = 'left';
export const DEFAULT_HEADING_VERTICAL_ALIGNMENT = 'middle';
