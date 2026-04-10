import multiVariableText from './multiVariableText/index.js';
import text from './text/index.js';
import image from './graphics/image.js';
import svg from './graphics/svg.js';
import barcodes from './barcodes/index.js';
import line from './shapes/line.js';
import table from './tables/index.js';
import { rectangle, ellipse, roundedRectangle } from './shapes/rectAndEllipse.js';
import triangle from './shapes/triangle.js';
import diamond from './shapes/diamond.js';
import star from './shapes/star.js';
import arrow from './shapes/arrow.js';
import dateTime from './date/dateTime.js';
import date from './date/date.js';
import time from './date/time.js';
import select from './select/index.js';
import radioGroup from './radioGroup/index.js';
import checkbox from './checkbox/index.js';
import heading from './heading/index.js';

const builtInPlugins = { Text: text };

export {
  builtInPlugins,
  // schemas
  text,
  multiVariableText,
  image,
  svg,
  table,
  barcodes,
  line,
  rectangle,
  ellipse,
  roundedRectangle,
  triangle,
  diamond,
  star,
  arrow,
  dateTime,
  date,
  time,
  select,
  radioGroup,
  checkbox,
  heading,
};

// Export utility functions
export { getDynamicHeightsForTable } from './tables/dynamicTemplate.js';

