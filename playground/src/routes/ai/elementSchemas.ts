import { z } from 'zod';

// =============================================================================
// Shared Schemas (基础共享 schema)
// =============================================================================

/** 位置 schema - 所有元素都需要的 position 对象 */
export const PositionSchema = z.object({
  x: z.number().min(0, 'x must be >= 0'),
  y: z.number().min(0, 'y must be >= 0'),
});

/** 基础元素 schema - 所有元素的共有属性 */
const BaseElementSchema = z.object({
  name: z.string().min(1, 'Element name is required'),
  position: PositionSchema,
  width: z.number().positive('Width must be positive'),
  height: z.number().positive('Height must be positive'),
  rotate: z.number().min(0).max(360).default(0),
  opacity: z.number().min(0).max(1).default(1),
});

// =============================================================================
// Content Elements (内容元素)
// =============================================================================

/** 可用字体列表 - Total 103 fonts (81 original + 22 Chinese Art Fonts) */
export const AvailableFonts = [
  // CJK fonts (4)
  'NotoSansSC', 'NotoSansTC', 'NotoSansJP', 'NotoSansKR', 
  // South Asian fonts (9)
  'NotoSansDevanagari', 'NotoSansBengali', 'NotoSansTamil', 'NotoSansTelugu',
  'NotoSansGujarati', 'NotoSansKannada', 'NotoSansMalayalam', 'NotoSansGurmukhi', 'NotoSansOriya',
  // Southeast Asian fonts (10)
  'NotoSansThai', 'NotoSansMyanmar', 'NotoSansKhmer', 'NotoSansLao',
  'NotoSansJavanese', 'NotoSansBalinese', 'NotoSansTaiTham', 'NotoSansBuginese', 'NotoSansCham', 'NotoSansSundanese',
  // Middle East fonts (5)
  'NotoSansArabic', 'NotoSansHebrew', 'NotoSansSyriac', 'NotoSansThaana', 'NotoSansNKo',
  // Caucasus & Central Asia fonts (4)
  'NotoSansArmenian', 'NotoSansGeorgian', 'NotoSerifTibetan', 'NotoSansMongolian',
  // African fonts (3)
  'NotoSansEthiopic', 'NotoSansTifinagh', 'NotoSansSinhala',
  // Indigenous (2)
  'NotoSansCherokee', 'NotoSansYi',
  // Emoji (2)
  'NotoEmoji', 'OpenMoji',
  // Modern Sans-Serif (11)
  'Inter', 'Roboto', 'OpenSans', 'Montserrat', 'Rubik', 'WorkSans', 'Comfortaa', 'Dosis', 'Fredoka', 'Lato', 'Poppins',
  // Plain text fonts (5)
  'Kanit', 'Mukta', 'Abel', 'CrimsonText', 'Spectral',
  // Display/Headline fonts (9)
  'Anton', 'BebasNeue', 'Bangers', 'Righteous', 'AbrilFatface', 'RussoOne', 'Acme', 'Bungee', 'PlayfairDisplay',
  // Artistic/Script fonts (12)
  'Pacifico', 'GreatVibes', 'Lobster', 'Allura', 'DancingScript', 'Sacramento', 
  'Courgette', 'Tangerine', 'PinyonScript', 'AlexBrush', 'LoversQuarrel', 'Knewave',
  // Handwriting (2)
  'IndieFlower', 'ShadowsIntoLight',
  // Monospace/Code (3)
  'FiraCode', 'Inconsolata', 'PressStart2P',
  // Chinese Art Fonts (22)
  'SiYuanHeiTi', 'SiYuanSongTi', 'SiYuanRouHeiMono', 'SiYuanRouHeiP',
  'WenQuanYiZhengHei', 'WenQuanYiMicroHei',
  'ZhanKuGaoDuanHei', 'ZhanKuKuaiLeTi', 'ZhanKuKuHeiTi', 'ZhanKuXiaoWei', 'ZhanKuHuangYou', 'ZhanKuWenYi',
  'BaoTuXiaoBai', 'PangMenZhengDao', 'YangRenDongZhuShi', 'MuYaoSoftPen',
  'SetoFont', 'WangHanZongKaiTi', 'TaipeiFontTC', 'RuiZiZhenYan', 'LuShuaiZhengRuiHei', 'ZhiYongShouShu'
] as const;
export type FontName = typeof AvailableFonts[number];

/** 文本对齐方式 */
export const TextAlignments = ['left', 'center', 'right', 'justify'] as const;
export const VerticalAlignments = ['top', 'middle', 'bottom'] as const;
export const DynamicFontSizeFit = ['horizontal', 'vertical'] as const;

/** 动态字体大小 schema */
export const DynamicFontSizeSchema = z.object({
  min: z.number().positive(),
  max: z.number().positive(),
  fit: z.enum(DynamicFontSizeFit),
});

/** TEXT 文本元素 - 对齐 PDFme TextSchema */
export const TextElementSchema = BaseElementSchema.extend({
  type: z.literal('text'),
  content: z.string().min(1, 'Text content cannot be empty'),
  required: z.boolean().optional(),
  // Typography
  fontName: z.enum(AvailableFonts).optional().default('Lato'),
  fontSize: z.number().min(6).max(200).default(16),
  lineHeight: z.number().positive().default(1),
  characterSpacing: z.number().default(0),
  // Alignment
  alignment: z.enum(TextAlignments).default('left'),
  verticalAlignment: z.enum(VerticalAlignments).default('top'),
  // Formatting
  strikethrough: z.boolean().optional().default(false),
  underline: z.boolean().optional().default(false),
  // Dynamic font size
  dynamicFontSize: DynamicFontSizeSchema.optional(),
  // Colors
  fontColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').default('#000000'),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#ffffff'),
});

/** MULTI-VARIABLE TEXT 多变量文本 - 对齐 PDFme TextSchema */
export const MultiVariableTextElementSchema = BaseElementSchema.extend({
  type: z.literal('multiVariableText'),
  content: z.string().min(1, 'Content cannot be empty'),
  variables: z.array(z.string()).optional(),
  required: z.boolean().optional(),
  // Typography
  fontName: z.enum(AvailableFonts).optional().default('Lato'),
  fontSize: z.number().min(6).max(200).default(16),
  lineHeight: z.number().positive().default(1),
  characterSpacing: z.number().default(0),
  // Alignment
  alignment: z.enum(TextAlignments).default('left'),
  verticalAlignment: z.enum(VerticalAlignments).default('top'),
  // Formatting
  strikethrough: z.boolean().optional().default(false),
  underline: z.boolean().optional().default(false),
  // Dynamic font size
  dynamicFontSize: DynamicFontSizeSchema.optional(),
  // Colors
  fontColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#000000'),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#ffffff'),
});

/** IMAGE 图片元素 */
export const ImageElementSchema = BaseElementSchema.extend({
  type: z.literal('image'),
  content: z.string().min(1, 'Image content is required').refine(
    (val) => 
      val.startsWith('__GENERATE_IMAGE:') || 
      val.startsWith('http://') || 
      val.startsWith('https://') || 
      val.startsWith('data:image/'),
    { message: 'Image content must be __GENERATE_IMAGE:prompt, URL, or base64 data URI' }
  ),
});

/** SVG 矢量图元素 */
export const SvgElementSchema = BaseElementSchema.extend({
  type: z.literal('svg'),
  content: z.string().min(1, 'SVG content is required').refine(
    (val) => val.includes('<svg') || val.startsWith('data:image/svg'),
    { message: 'Content must be valid SVG markup or data URI' }
  ),
});

/** 单元格样式 schema - 对齐 PDFme CellStyle */
export const CellStyleSchema = z.object({
  fontName: z.enum(AvailableFonts).optional().default('Lato'),
  alignment: z.enum(TextAlignments).default('left'),
  verticalAlignment: z.enum(VerticalAlignments).default('middle'),
  fontSize: z.number().min(6).max(200).default(12),
  lineHeight: z.number().positive().default(1),
  characterSpacing: z.number().default(0),
  fontColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#000000'),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#ffffff'),
  borderColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#000000'),
  borderWidth: z.object({
    top: z.number().default(1),
    right: z.number().default(1),
    bottom: z.number().default(1),
    left: z.number().default(1),
  }).optional(),
  padding: z.object({
    top: z.number().default(4),
    right: z.number().default(4),
    bottom: z.number().default(4),
    left: z.number().default(4),
  }).optional(),
});

/** TABLE 表格元素 - 对齐 PDFme TableSchema */
export const TableContentSchema = z.object({
  head: z.array(z.string()).min(1, 'Table must have at least one header'),
  body: z.array(z.array(z.string())).min(1, 'Table must have at least one row'),
});

export const TableElementSchema = BaseElementSchema.extend({
  type: z.literal('table'),
  content: z.union([
    z.string().refine(
      (val) => {
        try {
          const parsed = JSON.parse(val);
          return parsed.head && parsed.body;
        } catch {
          return false;
        }
      },
      { message: 'Table content must be JSON string with head and body arrays' }
    ),
    TableContentSchema,
  ]),
  // Required table properties
  showHead: z.boolean().default(true),
  head: z.array(z.string()).optional(),
  headWidthPercentages: z.array(z.number()).optional(),
  repeatHead: z.boolean().optional().default(false),
  // Table-specific styling
  tableStyles: z.object({
    borderColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#000000'),
    borderWidth: z.number().min(0).default(1),
  }).optional(),
  // Header cell styles
  headStyles: CellStyleSchema.optional(),
  // Body cell styles
  bodyStyles: CellStyleSchema.extend({
    alternateBackgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  }).optional(),
  // Column-specific alignment overrides
  columnStyles: z.object({
    alignment: z.record(z.string(), z.enum(TextAlignments)).optional(),
  }).optional(),
});

// =============================================================================
// Shape Elements (形状元素)
// =============================================================================

/** LINE 线条元素 */
export const LineElementSchema = BaseElementSchema.extend({
  type: z.literal('line'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#000000'),
  // Note: For lines, width represents length, height represents thickness
});

/** RECTANGLE 矩形元素 - 对齐 PDFme ShapeSchema */
export const RectangleElementSchema = BaseElementSchema.extend({
  type: z.literal('rectangle'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#000000'),
  borderWidth: z.number().min(0).default(1),
  borderColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#000000'),
  radius: z.number().min(0).optional().default(0),
});

/** ELLIPSE 椭圆元素 */
export const EllipseElementSchema = BaseElementSchema.extend({
  type: z.literal('ellipse'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#000000'),
  borderWidth: z.number().min(0).optional(),
  borderColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

// =============================================================================
// Data Elements (数据元素)
// =============================================================================

/** SIMPLE CHART 简单图表 - Enhanced with modern chart types */
export const ChartTypes = ['bar', 'line', 'area', 'pie', 'doughnut', 'radar', 'horizontalBar'] as const;
export const LegendPositions = ['top', 'bottom', 'left', 'right', 'none'] as const;

export const SimpleChartElementSchema = BaseElementSchema.extend({
  type: z.literal('simplechart'),
  chartType: z.enum(ChartTypes).default('bar'),
  // Data formats:
  // 1. Simple CSV: "10,20,30,40"
  // 2. Labeled CSV: "Jan:10,Feb:20,Mar:30"
  // 3. JSON multi-series: {"labels":[...],"datasets":[...]}
  data: z.string(),
  label: z.string().optional(), // Chart title
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#3b82f6'), // Primary color
  colors: z.array(z.string()).optional(), // Multiple colors for pie/multi-series
  showGrid: z.boolean().default(true), // Show grid lines
  showLabels: z.boolean().default(false), // Show data labels
  gradient: z.boolean().default(false), // Use gradient effect
  legendPosition: z.enum(LegendPositions).default('none'), // Legend position
});

/** DATE 日期元素 - 对齐 PDFme DateSchema */
export const DateElementSchema = BaseElementSchema.extend({
  type: z.literal('date'),
  content: z.string().default(''),
  format: z.string().default('YYYY-MM-DD'),
  fontName: z.enum(AvailableFonts).optional().default('Lato'),
  fontSize: z.number().min(6).max(200).default(16),
  alignment: z.enum(TextAlignments).default('left'),
  characterSpacing: z.number().default(0),
  fontColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#000000'),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#ffffff'),
  locale: z.string().optional(),
});

/** TIME 时间元素 - 对齐 PDFme DateSchema */
export const TimeElementSchema = BaseElementSchema.extend({
  type: z.literal('time'),
  content: z.string().default(''),
  format: z.string().default('HH:mm'),
  fontName: z.enum(AvailableFonts).optional().default('Lato'),
  fontSize: z.number().min(6).max(200).default(16),
  alignment: z.enum(TextAlignments).default('left'),
  characterSpacing: z.number().default(0),
  fontColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#000000'),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#ffffff'),
  locale: z.string().optional(),
});

/** DATETIME 日期时间元素 - 对齐 PDFme DateSchema */
export const DateTimeElementSchema = BaseElementSchema.extend({
  type: z.literal('dateTime'),
  content: z.string().default(''),
  format: z.string().default('YYYY-MM-DD HH:mm'),
  fontName: z.enum(AvailableFonts).optional().default('Lato'),
  fontSize: z.number().min(6).max(200).default(16),
  alignment: z.enum(TextAlignments).default('left'),
  characterSpacing: z.number().default(0),
  fontColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#000000'),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#ffffff'),
  locale: z.string().optional(),
});

// =============================================================================
// Barcode Elements (条码元素) - 对齐 PDFme BarcodeSchema
// =============================================================================

/** QR CODE 二维码 */
export const QrCodeElementSchema = BaseElementSchema.extend({
  type: z.literal('qrcode'),
  content: z.string().min(1, 'QR code content is required'),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#ffffff'),
  barColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#000000'),
});

/** CODE128 条形码 */
export const Code128ElementSchema = BaseElementSchema.extend({
  type: z.literal('code128'),
  content: z.string().min(1, 'Barcode content is required'),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#ffffff'),
  barColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#000000'),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  includetext: z.boolean().optional().default(true),
});

/** EAN13 条形码 */
export const Ean13ElementSchema = BaseElementSchema.extend({
  type: z.literal('ean13'),
  content: z.string().length(13, 'EAN-13 must be exactly 13 digits').regex(/^\d+$/, 'Must be digits only'),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#ffffff'),
  barColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#000000'),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  includetext: z.boolean().optional().default(true),
});

// =============================================================================
// Input Elements (输入元素)
// =============================================================================

/** SIGNATURE 签名元素 */
export const SignatureElementSchema = BaseElementSchema.extend({
  type: z.literal('signature'),
  content: z.string().optional(), // Base64 of signature when filled
});

/** CHECKBOX 复选框 */
export const CheckboxElementSchema = BaseElementSchema.extend({
  type: z.literal('checkbox'),
  content: z.enum(['true', 'false']).default('false'),
});

/** SELECT 下拉选择框 */
export const SelectElementSchema = BaseElementSchema.extend({
  type: z.literal('select'),
  options: z.array(z.string()).min(1, 'Must have at least one option'),
  content: z.string(), // Selected value
});

/** RADIO GROUP 单选框组 */
export const RadioGroupElementSchema = BaseElementSchema.extend({
  type: z.literal('radioGroup'),
  options: z.array(z.string()).min(2, 'Must have at least two options'),
  content: z.string(), // Selected value
});

// =============================================================================
// Schema Registry (类型注册表)
// =============================================================================

/** 所有元素 schema 的联合类型 */
export const AnyElementSchema = z.discriminatedUnion('type', [
  TextElementSchema,
  MultiVariableTextElementSchema,
  ImageElementSchema,
  SvgElementSchema,
  TableElementSchema,
  LineElementSchema,
  RectangleElementSchema,
  EllipseElementSchema,
  SimpleChartElementSchema,
  DateElementSchema,
  TimeElementSchema,
  DateTimeElementSchema,
  QrCodeElementSchema,
  Code128ElementSchema,
  Ean13ElementSchema,
  SignatureElementSchema,
  CheckboxElementSchema,
  SelectElementSchema,
  RadioGroupElementSchema,
]);

/** 元素类型到 schema 的映射 */
export const ElementSchemaMap: Record<string, z.ZodObject<any>> = {
  text: TextElementSchema,
  multiVariableText: MultiVariableTextElementSchema,
  image: ImageElementSchema,
  svg: SvgElementSchema,
  table: TableElementSchema,
  line: LineElementSchema,
  rectangle: RectangleElementSchema,
  ellipse: EllipseElementSchema,
  simplechart: SimpleChartElementSchema,
  date: DateElementSchema,
  time: TimeElementSchema,
  dateTime: DateTimeElementSchema,
  qrcode: QrCodeElementSchema,
  code128: Code128ElementSchema,
  ean13: Ean13ElementSchema,
  signature: SignatureElementSchema,
  checkbox: CheckboxElementSchema,
  select: SelectElementSchema,
  radioGroup: RadioGroupElementSchema,
};

/** 根据类型获取对应的 schema */
export function getElementSchema(type: string): z.ZodObject<any> | undefined {
  return ElementSchemaMap[type] || ElementSchemaMap[type.toLowerCase()];
}

// =============================================================================
// Template Schema (模板 schema)
// =============================================================================

/** BasePdf 纸张配置 */
export const BasePdfSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  padding: z.tuple([z.number(), z.number(), z.number(), z.number()]),
});

/** 页面 schema - 元素数组 */
export const PageSchema = z.array(AnyElementSchema);

/** 完整模板 schema */
export const TemplateSchema = z.object({
  basePdf: BasePdfSchema.optional(),
  schemas: z.array(PageSchema).min(1, 'Template must have at least one page'),
});

// Type exports
export type Position = z.infer<typeof PositionSchema>;
export type TextElement = z.infer<typeof TextElementSchema>;
export type ImageElement = z.infer<typeof ImageElementSchema>;
export type TableElement = z.infer<typeof TableElementSchema>;
export type AnyElement = z.infer<typeof AnyElementSchema>;
export type BasePdf = z.infer<typeof BasePdfSchema>;
export type Template = z.infer<typeof TemplateSchema>;
