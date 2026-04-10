import {
  Schema,
  isBlankPdf,
  BasePdf,
  CommonOptions,
  getDefaultFont,
  getFallbackFontName,
  cloneDeep,
} from '@pdfme/common';
import type { Font as FontKitFont } from 'fontkit';
import type {
  TableSchema,
  CellStyle,
  Styles,
  Spacing,
  TableInput,
  StylesProps,
  Section,
} from './types.js';
import { Cell, Column, Row, Table } from './classes.js';
import { getScaleFactor, DEFAULT_TABLE_WIDTH } from './helper.js';

type StyleProp = 'styles' | 'headStyles' | 'bodyStyles' | 'alternateRowStyles' | 'columnStyles';

interface CreateTableArgs {
  schema: Schema;
  basePdf: BasePdf;
  options: CommonOptions;
  _cache: Map<string | number, unknown>;
}

interface UserOptions {
  startY: number;
  tableWidth: number;
  margin: Spacing;
  showHead: boolean;
  tableLineWidth?: number;
  tableLineColor?: string;
  head?: string[][];
  body?: string[][];

  styles?: Partial<Styles>;
  bodyStyles?: Partial<Styles>;
  headStyles?: Partial<Styles>;
  alternateRowStyles?: Partial<Styles>;
  columnStyles?: {
    [key: string]: Partial<Styles>;
  };
}

function parseSection(
  sectionName: Section,
  sectionRows: string[][],
  columns: Column[],
  styleProps: StylesProps,
  fallbackFontName: string,
  scaleFactor: number,
): Row[] {
  // Defensive check: ensure sectionRows is a valid array
  if (!Array.isArray(sectionRows)) {
    console.warn(`[@pdfme/schemas/table] parseSection: sectionRows for "${sectionName}" is not an array, returning empty rows.`);
    return [];
  }
  const rowSpansLeftForColumn: { [key: string]: { left: number; times: number } } = {};
  const result = sectionRows.map((rawRow, rowIndex) => {
    let skippedRowForRowSpans = 0;
    const cells: { [key: string]: Cell } = {};

    let colSpansAdded = 0;
    let columnSpansLeft = 0;
    for (const column of columns) {
      if (
        rowSpansLeftForColumn[column.index] == null ||
        rowSpansLeftForColumn[column.index].left === 0
      ) {
        if (columnSpansLeft === 0) {
          let rawCell;
          if (Array.isArray(rawRow)) {
            rawCell = rawRow[column.index - colSpansAdded - skippedRowForRowSpans];
          } else {
            rawCell = rawRow[column.index];
          }
          const styles = cellStyles(sectionName, column, rowIndex, styleProps, fallbackFontName, scaleFactor);
          const cell = new Cell(rawCell, styles, sectionName);
          cells[column.index] = cell;

          columnSpansLeft = 0;
          rowSpansLeftForColumn[column.index] = {
            left: 0,
            times: columnSpansLeft,
          };
        } else {
          columnSpansLeft--;
          colSpansAdded++;
        }
      } else {
        rowSpansLeftForColumn[column.index].left--;
        columnSpansLeft = rowSpansLeftForColumn[column.index].times;
        skippedRowForRowSpans++;
      }
    }
    return new Row(rawRow, rowIndex, sectionName, cells);
  });
  return result;
}

function parseContent4Table(input: TableInput, fallbackFontName: string) {
  const content = input.content;
  const columns = content.columns.map((index) => new Column(index));
  const styles = input.styles;
  const scaleFactor = getScaleFactor(input.settings.tableWidth);
  return {
    columns,
    head: parseSection('head', content.head, columns, styles, fallbackFontName, scaleFactor),
    body: parseSection('body', content.body, columns, styles, fallbackFontName, scaleFactor),
  };
}

function cellStyles(
  sectionName: Section,
  column: Column,
  rowIndex: number,
  styles: StylesProps,
  fallbackFontName: string,
  scaleFactor: number,
) {
  let sectionStyles;
  if (sectionName === 'head') {
    sectionStyles = styles.headStyles;
  } else if (sectionName === 'body') {
    sectionStyles = styles.bodyStyles;
  }
  const otherStyles = Object.assign({}, styles.styles, sectionStyles);

  const colStyles = styles.columnStyles[column.index] || {};

  const rowStyles =
    sectionName === 'body' && rowIndex % 2 === 0
      ? Object.assign({}, styles.alternateRowStyles)
      : {};

  const defaultStyle = {
    fontName: fallbackFontName,
    backgroundColor: '',
    textColor: '#000000',
    lineHeight: 1,
    characterSpacing: 0,
    alignment: 'left',
    verticalAlignment: 'middle',
    fontSize: 10,
    cellPadding: 5,
    lineColor: '#000000',
    lineWidth: 0,
    minCellHeight: 0,
    minCellWidth: 0,
  };
  const result = Object.assign(defaultStyle, otherStyles, rowStyles, colStyles) as Styles;

  result.fontSize *= scaleFactor;
  result.characterSpacing *= scaleFactor;
  result.cellPadding = {
    top: result.cellPadding.top * scaleFactor,
    right: result.cellPadding.right * scaleFactor,
    bottom: result.cellPadding.bottom * scaleFactor,
    left: result.cellPadding.left * scaleFactor,
  };
  result.lineWidth = {
    top: result.lineWidth.top * scaleFactor,
    right: result.lineWidth.right * scaleFactor,
    bottom: result.lineWidth.bottom * scaleFactor,
    left: result.lineWidth.left * scaleFactor,
  };
  result.minCellHeight *= scaleFactor;
  result.minCellWidth *= scaleFactor;

  return result;
}

function mapCellStyle(style: CellStyle): Partial<Styles> {
  return {
    fontName: style.fontName,
    alignment: style.alignment,
    verticalAlignment: style.verticalAlignment,
    fontSize: style.fontSize,
    lineHeight: style.lineHeight,
    characterSpacing: style.characterSpacing,
    backgroundColor: style.backgroundColor,
    // ---
    textColor: style.fontColor,
    lineColor: style.borderColor,
    lineWidth: style.borderWidth,
    cellPadding: style.padding,
  };
}

// Default styles for defensive fallback
const defaultTableStyles = {
  borderColor: '#000000',
  borderWidth: 0.1,
};

const defaultCellStyle: CellStyle = {
  fontName: '',
  alignment: 'left',
  verticalAlignment: 'middle',
  fontSize: 10,
  lineHeight: 1,
  characterSpacing: 0,
  backgroundColor: '#ffffff',
  fontColor: '#000000',
  borderColor: '#000000',
  borderWidth: { top: 0.1, right: 0.1, bottom: 0.1, left: 0.1 },
  padding: { top: 5, right: 5, bottom: 5, left: 5 },
};

const defaultBodyStyle: CellStyle & { alternateBackgroundColor: string } = {
  ...defaultCellStyle,
  alternateBackgroundColor: '#f5f5f5',
};

function getTableOptions(schema: TableSchema, body: string[][]): UserOptions {
  // Defensive check: ensure headWidthPercentages exists
  // If missing, create equal-width percentages based on number of head columns
  const headWidthPercentages = schema.headWidthPercentages || 
    (schema.head && schema.head.length > 0 
      ? schema.head.map(() => 100 / schema.head.length)
      : [100]);

  const columnStylesWidth = headWidthPercentages.reduce(
    (acc, cur, i) => ({ ...acc, [i]: { cellWidth: schema.width * (cur / 100) } }),
    {} as Record<number, Partial<Styles>>,
  );

  const columnStylesAlignment = Object.entries(schema.columnStyles?.alignment || {}).reduce(
    (acc, [key, value]) => ({ ...acc, [key]: { alignment: value } }),
    {} as Record<number, Partial<Styles>>,
  );

  const allKeys = new Set([
    ...Object.keys(columnStylesWidth).map(Number),
    ...Object.keys(columnStylesAlignment).map(Number),
  ]);
  const columnStyles = Array.from(allKeys).reduce(
    (acc, key) => {
      const widthStyle = columnStylesWidth[key] || {};
      const alignmentStyle = columnStylesAlignment[key] || {};
      return { ...acc, [key]: { ...widthStyle, ...alignmentStyle } };
    },
    {} as Record<number, Partial<Styles>>,
  );

  // Defensive: ensure tableStyles, headStyles, and bodyStyles exist with sensible defaults
  const tableStyles = schema.tableStyles || defaultTableStyles;
  const headStyles = schema.headStyles || defaultCellStyle;
  const bodyStyles = schema.bodyStyles || defaultBodyStyle;

  return {
    head: [schema.head || []],
    body,
    showHead: schema.showHead,
    startY: schema.position?.y ?? 0,
    tableWidth: schema.width,
    tableLineColor: tableStyles.borderColor,
    tableLineWidth: tableStyles.borderWidth,
    headStyles: mapCellStyle(headStyles),
    bodyStyles: mapCellStyle(bodyStyles),
    alternateRowStyles: { backgroundColor: bodyStyles.alternateBackgroundColor },
    columnStyles,
    margin: { top: 0, right: 0, left: schema.position?.x ?? 0, bottom: 0 },
  };
}

function parseStyles(cInput: UserOptions) {
  const styleOptions: StylesProps = {
    styles: {},
    headStyles: {},
    bodyStyles: {},
    alternateRowStyles: {},
    columnStyles: {},
  };
  for (const prop of Object.keys(styleOptions) as StyleProp[]) {
    if (prop === 'columnStyles') {
      const current = cInput[prop];
      styleOptions.columnStyles = Object.assign({}, current);
    } else {
      const allOptions = [cInput];
      const styles = allOptions.map((opts) => opts[prop] || {});
      styleOptions[prop] = Object.assign({}, styles[0], styles[1], styles[2]);
    }
  }
  return styleOptions;
}

function parseContent4Input(options: UserOptions) {
  const head = options.head || [];
  const body = options.body || [];
  const columns = (head[0] || body[0] || []).map((_, index) => index);
  return { columns, head, body };
}

function parseInput(schema: TableSchema, body: string[][]): TableInput {
  const options = getTableOptions(schema, body);
  const styles = parseStyles(options);
  const settings = {
    startY: options.startY,
    margin: options.margin,
    tableWidth: options.tableWidth,
    showHead: options.showHead,
    tableLineWidth: options.tableLineWidth ?? 0,
    tableLineColor: options.tableLineColor ?? '',
  };

  const content = parseContent4Input(options);

  return { content, styles, settings };
}

export function createSingleTable(body: string[][], args: CreateTableArgs) {
  const { options, _cache, basePdf } = args;
  if (!isBlankPdf(basePdf)) {
    console.warn(
      '[@pdfme/schema/table]' +
        'When specifying a custom PDF for basePdf, ' +
        'you cannot use features such as page breaks or re-layout of other elements.' +
        'To utilize these features, please define basePdf as follows:\n' +
        '{ width: number; height: number; padding: [number, number, number, number]; }',
    );
  }

  const schema = cloneDeep(args.schema) as TableSchema;
  const { start } = schema.__bodyRange || { start: 0 };
  if (start % 2 === 1) {
    const alternateBackgroundColor = schema.bodyStyles.alternateBackgroundColor;
    schema.bodyStyles.alternateBackgroundColor = schema.bodyStyles.backgroundColor;
    schema.bodyStyles.backgroundColor = alternateBackgroundColor;
  }
  schema.showHead = schema.showHead === false ? false : (!schema.__isSplit || schema.repeatHead === true);

  const input = parseInput(schema, body);

  const font = options.font || getDefaultFont();

  const fallbackFontName = getFallbackFontName(font);

  const content = parseContent4Table(input, fallbackFontName);

  return Table.create({
    input,
    content,
    font,
    _cache: _cache as unknown as Map<string | number, FontKitFont>,
  });
}
