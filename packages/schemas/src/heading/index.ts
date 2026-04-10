import type { Plugin } from '@pdfme/common';
import { pdfRender } from './pdfRender.js';
import { propPanel } from './propPanel.js';
import { uiRender } from './uiRender.js';
import type { HeadingSchema } from './types.js';
import { Heading } from 'lucide';
import { createSvgStr } from '../utils.js';

const headingSchema: Plugin<HeadingSchema> = {
  pdf: pdfRender,
  ui: uiRender,
  propPanel,
  icon: createSvgStr(Heading),
};

export default headingSchema;
