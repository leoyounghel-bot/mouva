import {
  multiVariableText,
  text,
  barcodes,
  image,
  svg,
  line,
  table,
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
  checkbox,
  radioGroup,
  heading,
} from '@pdfme/schemas';
import { signature } from './signature';
import { simpleChartPlugin } from './SimpleChartPlugin';
import artTextPlugin from './artText';
// Note: Emoji plugin removed - emojis are now inserted as 'image' elements via EmojiPanel

export const getPlugins = () => {
  return {
    // Standard PDFme plugin keys (lowercase)
    text,
    multiVariableText,
    table,
    line,
    rectangle,
    ellipse,
    roundedRectangle,
    triangle,
    diamond,
    star,
    arrow,
    image,
    svg,
    signature,
    qrcode: barcodes.qrcode,
    dateTime,
    date,
    time,
    select,
    checkbox,
    radioGroup,
    ean13: barcodes.ean13,
    code128: barcodes.code128,
    simplechart: simpleChartPlugin,
    // Heading plugin - 标题
    heading,
    // Art Text plugin - 艺术字
    artText: artTextPlugin,
    // Note: Emoji plugin is intentionally NOT included here to avoid duplicate button.
    // Emojis are inserted via the EmojiPanel (Smile button on toolbar) which creates
    // image elements directly. The emoji plugin import is kept for type mapping below.
  };
};

// Mapping from AI output types (lowercase) to plugin keys (internal pdfme keys)
// Used in AiDesigner.tsx transformTemplate() to convert AI-generated schema types
export const pluginTypeMap: Record<string, string> = {
  text: 'text',
  multivariabletext: 'multiVariableText',
  table: 'table',
  line: 'line',
  rectangle: 'rectangle',
  ellipse: 'ellipse',
  roundedrectangle: 'roundedRectangle',
  triangle: 'triangle',
  diamond: 'diamond',
  star: 'star',
  arrow: 'arrow',
  image: 'image',
  svg: 'svg',
  signature: 'signature',
  qrcode: 'qrcode',
  datetime: 'dateTime',
  date: 'date',
  time: 'time',
  select: 'select',
  checkbox: 'checkbox',
  radiogroup: 'radioGroup',
  ean13: 'ean13',
  code128: 'code128',
  simplechart: 'simplechart',
  simpleChart: 'simplechart',
  arttext: 'artText',
  artText: 'artText',
  // Heading mapping
  heading: 'heading',
  // Emoji mapping - maps to 'image' since emojis are now inserted as image elements
  emoji: 'image',
};

