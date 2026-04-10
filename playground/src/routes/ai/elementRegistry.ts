import { z } from 'zod';
import {
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
} from './elementSchemas';

// =============================================================================
// Element Categories (元素分类)
// =============================================================================

export type ElementCategory = 'content' | 'shape' | 'data' | 'input' | 'barcode';

// =============================================================================
// Element Definition Interface (元素定义接口)
// =============================================================================

export interface ElementDefinition {
  /** 元素类型 key (与 pdfme plugin key 一致) */
  type: string;
  /** 显示名称 (中文) */
  nameZh: string;
  /** 显示名称 (英文) */
  nameEn: string;
  /** 元素分类 */
  category: ElementCategory;
  /** 简短描述 (中文) - 用于 AI 决策 */
  descriptionZh: string;
  /** 简短描述 (英文) */
  descriptionEn: string;
  /** Zod 验证 schema */
  zodSchema: z.ZodObject<any>;
  /** 详细的 AI 提示词片段 */
  promptTemplate: string;
  /** 示例对象 */
  examples: object[];
  /** 使用限制说明 (如有) */
  restrictions?: string;
  /** 必需属性列表 */
  requiredProps: string[];
  /** 可选属性列表 */
  optionalProps: string[];
}

// =============================================================================
// Element Registry (元素注册表)
// =============================================================================

export const elementRegistry: ElementDefinition[] = [
  // ===== CONTENT ELEMENTS (内容元素) =====
  {
    type: 'text',
    nameZh: '文本',
    nameEn: 'Text',
    category: 'content',
    descriptionZh: '静态文本内容，支持字体、颜色、对齐等样式',
    descriptionEn: 'Static text content with font, color, and alignment styling',
    zodSchema: TextElementSchema,
    requiredProps: ['position', 'width', 'height', 'content'],
    optionalProps: ['fontSize', 'fontName', 'fontColor', 'alignment', 'verticalAlignment', 'backgroundColor', 'lineHeight', 'rotate', 'opacity'],
    promptTemplate: `
### TEXT - type: "text"
**Properties**:
- position: { x, y } - element position (mm)
- width, height: dimensions (mm)
- content: text content (cannot be empty!)
- fontSize: font size (6-200, default 16)
- fontName: font (25 fonts available: NotoSansSC, Lato, Inter, Roboto, OpenSans, Poppins, Kanit, Mukta, Abel, CrimsonText, Spectral, Pacifico, GreatVibes, Lobster, Allura, DancingScript, Sacramento, Courgette, Tangerine, PinyonScript, AlexBrush, LoversQuarrel, Knewave, NotoEmoji, OpenMoji)
- fontColor: color (hex, default #000000)
- alignment: alignment ("left" | "center" | "right" | "justify")
- verticalAlignment: vertical alignment ("top" | "middle" | "bottom")
- backgroundColor: background color (optional)

**⚠️ Key Rules**:
- Chinese content MUST use fontName: "NotoSansSC"
- content cannot be empty string, use realistic content not placeholders
`,
    examples: [
      {
        name: 'title',
        type: 'text',
        position: { x: 20, y: 20 },
        width: 170,
        height: 15,
        content: 'Annual Report 2024',
        fontSize: 30,
        fontName: 'Lato',
        fontColor: '#000000',
        alignment: 'center',
      },
      {
        name: 'chinese_text',
        type: 'text',
        position: { x: 20, y: 50 },
        width: 170,
        height: 12,
        content: '新年快乐',
        fontSize: 24,
        fontName: 'NotoSansSC',
        fontColor: '#ff0000',
      },
    ],
  },

  {
    type: 'multiVariableText',
    nameZh: '多变量文本',
    nameEn: 'Multi-Variable Text',
    category: 'content',
    descriptionZh: '支持 {{变量}} 占位符的动态文本，用于模板填充',
    descriptionEn: 'Dynamic text with {{variable}} placeholders for template filling',
    zodSchema: MultiVariableTextElementSchema,
    requiredProps: ['position', 'width', 'height', 'content'],
    optionalProps: ['variables', 'fontSize', 'fontName', 'fontColor', 'alignment'],
    promptTemplate: `
### MULTI-VARIABLE TEXT - type: "multiVariableText"
Same as text, but content can include {{variable_name}} placeholders.
Only use when user explicitly asks for "dynamic template" or "variables".

**Example**: "Dear {{customer_name}}, your order #{{order_id}} is ready."
`,
    examples: [
      {
        name: 'greeting',
        type: 'multiVariableText',
        position: { x: 20, y: 30 },
        width: 170,
        height: 20,
        content: 'Dear {{customer_name}}, your order #{{order_id}} is confirmed.',
        fontSize: 14,
        fontName: 'Lato',
      },
    ],
  },

  {
    type: 'image',
    nameZh: '图片',
    nameEn: 'Image',
    category: 'content',
    descriptionZh: '图片元素，支持 AI 生成、URL 或 base64',
    descriptionEn: 'Image element supporting AI generation, URL, or base64',
    zodSchema: ImageElementSchema,
    requiredProps: ['position', 'width', 'height', 'content'],
    optionalProps: ['rotate', 'opacity'],
    promptTemplate: `
### IMAGE - type: "image"
**Properties**: position, width, height, content

**⚠️ CONTENT Rules (Critical!)**:
- MUST use AI generation: \`"content": "__GENERATE_IMAGE:detailed english prompt__"\`
- Or use real URL/base64

❌ Forbidden: "https://via.placeholder.com/..."
❌ Forbidden: ""
✅ Correct: "__GENERATE_IMAGE:A professional coffee shop logo, minimalist vector style__"
`,
    examples: [
      {
        name: 'hero_image',
        type: 'image',
        position: { x: 20, y: 60 },
        width: 170,
        height: 100,
        content: '__GENERATE_IMAGE:Modern office workspace with laptop and coffee, professional photography style__',
      },
    ],
    restrictions: 'Do not use placeholder URLs, must use __GENERATE_IMAGE: format',
  },

  {
    type: 'svg',
    nameZh: '矢量图',
    nameEn: 'SVG',
    category: 'content',
    descriptionZh: '矢量图形，支持原生 SVG 代码',
    descriptionEn: 'Vector graphics with native SVG code support',
    zodSchema: SvgElementSchema,
    requiredProps: ['position', 'width', 'height', 'content'],
    optionalProps: ['rotate', 'opacity'],
    promptTemplate: `
### SVG - type: "svg"
Content is native SVG string.

**Example**:
{ "type": "svg", "content": "<svg viewBox='0 0 24 24'>...</svg>", "width": 20, "height": 20 }
`,
    examples: [
      {
        name: 'icon',
        type: 'svg',
        position: { x: 20, y: 20 },
        width: 20,
        height: 20,
        content: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5z"/></svg>',
      },
    ],
  },

  {
    type: 'table',
    nameZh: '表格',
    nameEn: 'Table',
    category: 'content',
    descriptionZh: '精美数据表格，支持表头样式、交替行色、边框配置',
    descriptionEn: 'Beautiful data table with header styles, alternating rows',
    zodSchema: TableElementSchema,
    requiredProps: ['position', 'width', 'height', 'head', 'content'],
    optionalProps: ['showHead', 'headWidthPercentages', 'tableStyles', 'headStyles', 'bodyStyles'],
    promptTemplate: `
### TABLE - type: "table"

**🚨 MANDATORY: YOU MUST GENERATE COMPLETE TABLE DATA - NEVER LEAVE CONTENT EMPTY!**

Tables require TWO data properties - both MUST have real values:
1. \`head\`: Column headers array - e.g., ["Description", "Qty", "Price", "Amount"]
2. \`content\`: Body rows as JSON string - YOU MUST FILL THIS WITH REALISTIC DATA!

**❌ FORBIDDEN:**
- Empty content: content: "[]" or content: ""
- Placeholder text: "Sample 1", "Data 1", "Item 1", "填充内容"
- Telling user to fill data - YOU generate the data!

**✅ REQUIRED:**
- Generate 3-5 rows of realistic, contextual data
- For invoices: use real-looking services/products with prices
- For reports: use meaningful business data
- All values must be strings, even numbers: "100" not 100

**Invoice Table Example (COPY THIS PATTERN):**
{
  "name": "invoice_items",
  "type": "table",
  "position": { "x": 20, "y": 120 },
  "width": 170, "height": 60,
  "head": ["Description", "Qty", "Price", "Amount"],
  "headWidthPercentages": [40, 15, 20, 25],
  "content": "[[\\"Website Development\\",\\"1\\",\\"$3,500.00\\",\\"$3,500.00\\"],[\\"Logo Design Package\\",\\"1\\",\\"$850.00\\",\\"$850.00\\"],[\\"SEO Optimization\\",\\"3\\",\\"$200.00\\",\\"$600.00\\"],[\\"Monthly Hosting\\",\\"12\\",\\"$25.00\\",\\"$300.00\\\"]]",
  "showHead": true,
  "headStyles": { "backgroundColor": "#1e3a5f", "fontColor": "#ffffff", "fontSize": 10 },
  "bodyStyles": { "fontSize": 9, "alternateBackgroundColor": "#f8fafc" }
}

**Product Catalog Example:**
{
  "name": "products",
  "type": "table",
  "position": { "x": 15, "y": 80 },
  "width": 180, "height": 70,
  "head": ["Product", "SKU", "Category", "Price", "Stock"],
  "content": "[[\\"iPhone 15 Pro Max\\",\\"APL-15PM-256\\",\\"Smartphones\\",\\"$1,199.00\\",\\"45\\\"],[\\"Samsung Galaxy S24\\",\\"SAM-S24-128\\",\\"Smartphones\\",\\"$899.00\\",\\"78\\\"],[\\"MacBook Pro 14\\",\\"APL-MBP14-M3\\",\\"Laptops\\",\\"$1,999.00\\",\\"23\\\"]]",
  "showHead": true,
  "headStyles": { "backgroundColor": "#3b82f6", "fontColor": "#ffffff" }
}

**Style Options:**
- headStyles: { backgroundColor: "#1e3a5f", fontColor: "#ffffff" }
- bodyStyles: { alternateBackgroundColor: "#f8fafc" }
- headWidthPercentages: [40, 20, 20, 20] - must sum to 100

**Remember: The content field MUST contain actual data rows as a JSON string!**
`,
    examples: [
      {
        name: 'product_table',
        type: 'table',
        position: { x: 20, y: 80 },
        width: 170,
        height: 60,
        showHead: true,
        head: ['Product', 'Quantity', 'Price'],
        headWidthPercentages: [50, 25, 25],
        content: '[["iPhone 15","2","$1,998"],["MacBook Pro","1","$2,499"],["iPad Air","1","$599"]]',
        tableStyles: { borderColor: '#e2e8f0', borderWidth: 0.5 },
        headStyles: { fontColor: '#ffffff', backgroundColor: '#3b82f6', fontSize: 11 },
        bodyStyles: { fontColor: '#334155', fontSize: 10, alternateBackgroundColor: '#f8fafc' },
      },
    ],

  },

  // ===== SHAPE ELEMENTS (形状元素) =====
  {
    type: 'line',
    nameZh: '线条',
    nameEn: 'Line',
    category: 'shape',
    descriptionZh: '直线分隔符',
    descriptionEn: 'Straight line separator',
    zodSchema: LineElementSchema,
    requiredProps: ['position', 'width', 'height'],
    optionalProps: ['color', 'opacity'],
    promptTemplate: `
### LINE - type: "line"
- width = line length, height = line thickness
- color: color (default #000000)
`,
    examples: [
      { name: 'divider', type: 'line', position: { x: 20, y: 50 }, width: 170, height: 1, color: '#cccccc' },
    ],
  },

  {
    type: 'rectangle',
    nameZh: '矩形',
    nameEn: 'Rectangle',
    category: 'shape',
    descriptionZh: '矩形色块或边框',
    descriptionEn: 'Rectangular shape or border',
    zodSchema: RectangleElementSchema,
    requiredProps: ['position', 'width', 'height'],
    optionalProps: ['color', 'borderWidth', 'borderColor', 'opacity'],
    promptTemplate: `
### RECTANGLE - type: "rectangle"
- color: fill color (required, avoid transparent!)
- borderWidth, borderColor: border (optional)

⚠️ Must set color, otherwise element is invisible!
`,
    examples: [
      { name: 'bg_box', type: 'rectangle', position: { x: 15, y: 15 }, width: 180, height: 50, color: '#f0f0f0', opacity: 1 },
    ],
  },

  {
    type: 'ellipse',
    nameZh: '椭圆',
    nameEn: 'Ellipse',
    category: 'shape',
    descriptionZh: '椭圆或圆形',
    descriptionEn: 'Ellipse or circle shape',
    zodSchema: EllipseElementSchema,
    requiredProps: ['position', 'width', 'height'],
    optionalProps: ['color', 'borderWidth', 'borderColor', 'opacity'],
    promptTemplate: `
### ELLIPSE - type: "ellipse"
- width = height creates a circle
- color: fill color (required)
`,
    examples: [
      { name: 'circle_badge', type: 'ellipse', position: { x: 90, y: 20 }, width: 30, height: 30, color: '#3b82f6' },
    ],
  },

  // ===== DATA ELEMENTS (数据元素) =====
  {
    type: 'simplechart',
    nameZh: '图表',
    nameEn: 'Chart',
    category: 'data',
    descriptionZh: '支持多种类型的现代可视化图表：柱状图、折线图、面积图、饼图、环形图、雷达图',
    descriptionEn: 'Modern visualization charts: bar, line, area, pie, doughnut, radar',
    zodSchema: SimpleChartElementSchema,
    requiredProps: ['position', 'width', 'height', 'data'],
    optionalProps: ['chartType', 'label', 'color', 'colors', 'showGrid', 'showLabels', 'gradient', 'legendPosition'],
    promptTemplate: `
### CHART - type: "simplechart"

**Supported Chart Types (chartType)**:
- "bar" - Bar chart: compare values across categories (default)
- "horizontalBar" - Horizontal bar chart: for long category names
- "line" - Line chart: show trends, time series
- "area" - Area chart: emphasize cumulative values
- "pie" - Pie chart: show proportions (for ≤6 categories)
- "doughnut" - Doughnut chart: hollow pie, more modern
- "radar" - Radar chart: multi-dimensional comparisons

**Data Formats (data)** - Three options:
1. **Simple format**: "10,20,30,40" (single series values)
2. **With labels**: "Jan:10,Feb:20,Mar:30,Apr:40" (with category labels)
3. **Multi-series JSON**: {"labels":["Q1","Q2","Q3","Q4"],"datasets":[{"label":"2023","data":[100,150,200,180],"color":"#3b82f6"},{"label":"2024","data":[120,180,220,200],"color":"#10b981"}]}

**Style Properties**:
- label: chart title
- color: theme color (for single series)
- colors: color array (for pie chart or multi-series, e.g. ["#3b82f6","#10b981","#f59e0b"])
- showGrid: show grid lines (default true)
- showLabels: show value labels (default false)
- gradient: use gradient effect (default false)
- legendPosition: legend position "top"/"bottom"/"none" (default "none")

**Examples**:
// Simple bar chart - quarterly data
{ "type": "simplechart", "chartType": "bar", "data": "Q1:65,Q2:80,Q3:72,Q4:95", "label": "Quarterly Sales", "color": "#3b82f6", "showGrid": true }

// Gradient area chart - monthly growth
{ "type": "simplechart", "chartType": "area", "data": "Jan:30,Feb:45,Mar:60,Apr:55,May:70", "label": "Monthly Growth", "color": "#8b5cf6", "gradient": true }

// Multi-series line chart - year comparison
{ "type": "simplechart", "chartType": "line", "data": "{\\"labels\\":[\\"Q1\\",\\"Q2\\",\\"Q3\\",\\"Q4\\"],\\"datasets\\":[{\\"label\\":\\"2023\\",\\"data\\":[100,150,200,180],\\"color\\":\\"#3b82f6\\"},{\\"label\\":\\"2024\\",\\"data\\":[120,180,220,200],\\"color\\":\\"#10b981\\"}]}", "label": "Year Comparison", "legendPosition": "top" }

// Pie chart - market share
{ "type": "simplechart", "chartType": "pie", "data": "iOS:35,Android:45,Web:20", "label": "Platform Share", "colors": ["#3b82f6","#10b981","#f59e0b"], "showLabels": true }

// Doughnut chart - more stylish
{ "type": "simplechart", "chartType": "doughnut", "data": "Desktop:40,Mobile:50,Tablet:10", "label": "Device Usage", "colors": ["#6366f1","#ec4899","#14b8a6"], "showLabels": true }

// Radar chart - capability assessment
{ "type": "simplechart", "chartType": "radar", "data": "Speed:80,Power:90,Defense:70,Magic:85,Luck:60", "label": "Character Stats", "color": "#8b5cf6", "gradient": true }

**Design Tips**:
- Use gradient: true for more modern beautiful charts
- Line/area charts work well with showGrid: true
- Pie/doughnut charts benefit from showLabels: true
- Multi-series data needs legendPosition for legend display
`,
    examples: [
      {
        name: 'sales_chart',
        type: 'simplechart',
        position: { x: 20, y: 60 },
        width: 120,
        height: 80,
        chartType: 'bar',
        data: 'Q1:65,Q2:80,Q3:72,Q4:95',
        label: 'Quarterly Sales',
        color: '#3b82f6',
        showGrid: true,
        gradient: false,
      },
      {
        name: 'growth_chart',
        type: 'simplechart',
        position: { x: 20, y: 60 },
        width: 120,
        height: 80,
        chartType: 'area',
        data: 'Jan:30,Feb:45,Mar:60,Apr:55,May:70',
        label: 'Monthly Growth',
        color: '#8b5cf6',
        gradient: true,
        showGrid: true,
      },
      {
        name: 'share_chart',
        type: 'simplechart',
        position: { x: 60, y: 80 },
        width: 90,
        height: 90,
        chartType: 'doughnut',
        data: 'iOS:35,Android:45,Web:20',
        label: 'Platform Share',
        colors: ['#3b82f6', '#10b981', '#f59e0b'],
        showLabels: true,
      },
    ],
  },

  {
    type: 'date',
    nameZh: '日期',
    nameEn: 'Date',
    category: 'data',
    descriptionZh: '日期输入字段',
    descriptionEn: 'Date input field',
    zodSchema: DateElementSchema,
    requiredProps: ['position', 'width', 'height'],
    optionalProps: ['content', 'format'],
    promptTemplate: `### DATE - type: "date"\nformat: date format (default YYYY-MM-DD)`,
    examples: [
      { name: 'issue_date', type: 'date', position: { x: 20, y: 100 }, width: 40, height: 8, format: 'YYYY-MM-DD' },
    ],
  },

  {
    type: 'time',
    nameZh: '时间',
    nameEn: 'Time',
    category: 'data',
    descriptionZh: '时间输入字段',
    descriptionEn: 'Time input field',
    zodSchema: TimeElementSchema,
    requiredProps: ['position', 'width', 'height'],
    optionalProps: ['content', 'format'],
    promptTemplate: `### TIME - type: "time"\nformat: time format (default HH:mm)`,
    examples: [
      { name: 'event_time', type: 'time', position: { x: 70, y: 100 }, width: 30, height: 8 },
    ],
  },

  {
    type: 'dateTime',
    nameZh: '日期时间',
    nameEn: 'DateTime',
    category: 'data',
    descriptionZh: '日期时间组合字段',
    descriptionEn: 'Combined date and time field',
    zodSchema: DateTimeElementSchema,
    requiredProps: ['position', 'width', 'height'],
    optionalProps: ['content', 'format'],
    promptTemplate: `### DATETIME - type: "dateTime"\nformat: datetime format (default YYYY-MM-DD HH:mm)`,
    examples: [
      { name: 'created_at', type: 'dateTime', position: { x: 20, y: 110 }, width: 60, height: 8 },
    ],
  },

  // ===== BARCODE ELEMENTS (条码元素) =====
  {
    type: 'qrcode',
    nameZh: '二维码',
    nameEn: 'QR Code',
    category: 'barcode',
    descriptionZh: '二维码，可包含 URL 或文本',
    descriptionEn: 'QR code containing URL or text',
    zodSchema: QrCodeElementSchema,
    requiredProps: ['position', 'width', 'height', 'content'],
    optionalProps: [],
    promptTemplate: `
### QR CODE - type: "qrcode"
⚠️ Only use when user explicitly requests a QR code!
content: URL or text to encode
`,
    examples: [
      { name: 'website_qr', type: 'qrcode', position: { x: 160, y: 250 }, width: 25, height: 25, content: 'https://example.com' },
    ],
    restrictions: 'Only use when user explicitly requests QR code',
  },

  {
    type: 'code128',
    nameZh: 'Code128 条形码',
    nameEn: 'Code128 Barcode',
    category: 'barcode',
    descriptionZh: '通用条形码格式',
    descriptionEn: 'Universal barcode format',
    zodSchema: Code128ElementSchema,
    requiredProps: ['position', 'width', 'height', 'content'],
    optionalProps: [],
    promptTemplate: `### CODE128 - type: "code128"\ncontent: barcode data`,
    examples: [
      { name: 'product_barcode', type: 'code128', position: { x: 20, y: 260 }, width: 60, height: 15, content: 'ABC123456' },
    ],
  },

  {
    type: 'ean13',
    nameZh: 'EAN-13 条形码',
    nameEn: 'EAN-13 Barcode',
    category: 'barcode',
    descriptionZh: '13位商品条形码',
    descriptionEn: '13-digit product barcode',
    zodSchema: Ean13ElementSchema,
    requiredProps: ['position', 'width', 'height', 'content'],
    optionalProps: [],
    promptTemplate: `### EAN-13 - type: "ean13"\ncontent: must be 13 digits`,
    examples: [
      { name: 'ean_barcode', type: 'ean13', position: { x: 20, y: 260 }, width: 60, height: 15, content: '5901234123457' },
    ],
  },

  // ===== INPUT ELEMENTS (输入元素) =====
  {
    type: 'signature',
    nameZh: '签名',
    nameEn: 'Signature',
    category: 'input',
    descriptionZh: '手写签名区域',
    descriptionEn: 'Handwritten signature area',
    zodSchema: SignatureElementSchema,
    requiredProps: ['position', 'width', 'height'],
    optionalProps: ['content'],
    promptTemplate: `### SIGNATURE - type: "signature"\nSignature input area, content can be empty`,
    examples: [
      { name: 'customer_signature', type: 'signature', position: { x: 20, y: 240 }, width: 60, height: 20 },
    ],
  },

  {
    type: 'checkbox',
    nameZh: '复选框',
    nameEn: 'Checkbox',
    category: 'input',
    descriptionZh: '勾选框',
    descriptionEn: 'Checkbox input',
    zodSchema: CheckboxElementSchema,
    requiredProps: ['position', 'width', 'height'],
    optionalProps: ['content'],
    promptTemplate: `### CHECKBOX - type: "checkbox"\ncontent: "true" or "false"`,
    examples: [
      { name: 'agree_terms', type: 'checkbox', position: { x: 20, y: 200 }, width: 5, height: 5, content: 'false' },
    ],
  },

  {
    type: 'select',
    nameZh: '下拉选择',
    nameEn: 'Select',
    category: 'input',
    descriptionZh: '下拉选择框',
    descriptionEn: 'Dropdown select input',
    zodSchema: SelectElementSchema,
    requiredProps: ['position', 'width', 'height', 'options', 'content'],
    optionalProps: [],
    promptTemplate: `### SELECT - type: "select"\noptions: options array, content: default selected value`,
    examples: [
      { name: 'country', type: 'select', position: { x: 20, y: 120 }, width: 50, height: 8, options: ['USA', 'UK', 'China', 'Japan'], content: 'USA' },
    ],
  },

  {
    type: 'radioGroup',
    nameZh: '单选框组',
    nameEn: 'Radio Group',
    category: 'input',
    descriptionZh: '单选按钮组',
    descriptionEn: 'Radio button group',
    zodSchema: RadioGroupElementSchema,
    requiredProps: ['position', 'width', 'height', 'options', 'content'],
    optionalProps: [],
    promptTemplate: `### RADIO GROUP - type: "radioGroup"\noptions: options array (at least 2), content: selected value`,
    examples: [
      { name: 'payment_method', type: 'radioGroup', position: { x: 20, y: 130 }, width: 80, height: 10, options: ['Credit Card', 'PayPal', 'Bank Transfer'], content: 'Credit Card' },
    ],
  },
];

// =============================================================================
// Registry Query Functions (查询函数)
// =============================================================================

/**
 * 获取所有元素的摘要信息 (用于 AI 决策)
 * @param language 语言 ('zh' | 'en')
 * @param categories 可选，筛选特定分类
 */
export function getElementSummaries(
  language: 'zh' | 'en' = 'zh',
  categories?: ElementCategory[]
): { type: string; name: string; description: string; category: ElementCategory }[] {
  let elements = elementRegistry;
  
  if (categories && categories.length > 0) {
    elements = elements.filter(el => categories.includes(el.category));
  }

  return elements.map(el => ({
    type: el.type,
    name: language === 'zh' ? el.nameZh : el.nameEn,
    description: language === 'zh' ? el.descriptionZh : el.descriptionEn,
    category: el.category,
  }));
}

/**
 * 获取指定元素类型的完整定义
 */
export function getElementDefinition(type: string): ElementDefinition | undefined {
  return elementRegistry.find(el => el.type === type || el.type.toLowerCase() === type.toLowerCase());
}

/**
 * 获取指定元素类型的详细提示词
 */
export function getElementPrompt(type: string): string {
  const def = getElementDefinition(type);
  return def?.promptTemplate || '';
}

/**
 * 获取多个元素类型的详细提示词
 */
export function getElementPrompts(types: string[]): string {
  return types
    .map(type => getElementPrompt(type))
    .filter(Boolean)
    .join('\n');
}

/**
 * 获取分类下的所有元素
 */
export function getElementsByCategory(category: ElementCategory): ElementDefinition[] {
  return elementRegistry.filter(el => el.category === category);
}

/**
 * 获取所有可用的元素类型
 */
export function getAllElementTypes(): string[] {
  return elementRegistry.map(el => el.type);
}
