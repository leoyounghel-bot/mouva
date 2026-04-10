// =============================================================================
// Paper Size Registry (纸张尺寸注册表)
// =============================================================================

export interface PaperSize {
  /** 宽度 (mm) */
  width: number;
  /** 高度 (mm) */
  height: number;
  /** 内边距 [top, right, bottom, left] */
  padding: [number, number, number, number];
  /** 宽高比 (仅用于社交媒体) */
  aspectRatio?: string;
  /** 对应像素尺寸 (仅用于社交媒体) */
  pixels?: string;
}

export interface PaperSizeCategory {
  /** 分类名称 (中文) */
  nameZh: string;
  /** 分类名称 (英文) */
  nameEn: string;
  /** 分类内的尺寸 */
  sizes: Record<string, PaperSize>;
}

// =============================================================================
// Paper Size Definitions (尺寸定义)
// =============================================================================

export const paperSizeCategories: Record<string, PaperSizeCategory> = {
  standard: {
    nameZh: '标准纸张',
    nameEn: 'Standard Paper',
    sizes: {
      A4: { width: 210, height: 297, padding: [0, 0, 0, 0] },
      A3: { width: 297, height: 420, padding: [0, 0, 0, 0] },
      A5: { width: 148, height: 210, padding: [0, 0, 0, 0] },
      B5: { width: 176, height: 250, padding: [0, 0, 0, 0] },
      Letter: { width: 216, height: 279, padding: [0, 0, 0, 0] },
      Legal: { width: 216, height: 356, padding: [0, 0, 0, 0] },
    },
  },

  socialMedia: {
    nameZh: '社交媒体',
    nameEn: 'Social Media',
    sizes: {
      'WeChat Moments': { 
        width: 150, height: 150, 
        padding: [0, 0, 0, 0], 
        aspectRatio: '1:1', 
        pixels: '1080×1080px' 
      },
      'Xiaohongshu Post': { 
        width: 150, height: 200, 
        padding: [0, 0, 0, 0], 
        aspectRatio: '3:4', 
        pixels: '1080×1440px' 
      },
      'Xiaohongshu Story': { 
        width: 150, height: 267, 
        padding: [0, 0, 0, 0], 
        aspectRatio: '9:16', 
        pixels: '1080×1920px' 
      },
      'Instagram Post': { 
        width: 150, height: 150, 
        padding: [0, 0, 0, 0], 
        aspectRatio: '1:1', 
        pixels: '1080×1080px' 
      },
      'Instagram Portrait': { 
        width: 150, height: 188, 
        padding: [0, 0, 0, 0], 
        aspectRatio: '4:5', 
        pixels: '1080×1350px' 
      },
      'Instagram Story': { 
        width: 150, height: 267, 
        padding: [0, 0, 0, 0], 
        aspectRatio: '9:16', 
        pixels: '1080×1920px' 
      },
    },
  },

  cards: {
    nameZh: '卡片',
    nameEn: 'Cards',
    sizes: {
      'Postcard': { width: 148, height: 100, padding: [0, 0, 0, 0] },
      'Business Card': { width: 90, height: 54, padding: [0, 0, 0, 0] },
      'Greeting Card': { width: 148, height: 105, padding: [0, 0, 0, 0] },
      'Invitation': { width: 140, height: 200, padding: [0, 0, 0, 0] },
    },
  },

  presentations: {
    nameZh: '演示文稿 & 自定义',
    nameEn: 'Presentations & Custom',
    sizes: {
      'PPT (16:9)': { width: 339, height: 191, padding: [0, 0, 0, 0] },
      'PPT (4:3)': { width: 254, height: 191, padding: [0, 0, 0, 0] },
      'Square': { width: 200, height: 200, padding: [0, 0, 0, 0] },
      'Banner': { width: 300, height: 100, padding: [0, 0, 0, 0] },
      'Poster': { width: 420, height: 594, padding: [0, 0, 0, 0] },
    },
  },
};

// =============================================================================
// Query Functions (查询函数)
// =============================================================================

/**
 * 获取所有可用纸张尺寸的扁平列表
 */
export function getAllPaperSizes(): Record<string, PaperSize> {
  const result: Record<string, PaperSize> = {};
  
  Object.values(paperSizeCategories).forEach(category => {
    Object.entries(category.sizes).forEach(([name, size]) => {
      result[name] = size;
    });
  });
  
  return result;
}

/**
 * 根据名称获取纸张尺寸
 */
export function getPaperSize(name: string): PaperSize | undefined {
  const allSizes = getAllPaperSizes();
  // Support legacy Chinese aliases for backward compatibility
  const aliases: Record<string, string> = {
    '微信朋友圈': 'WeChat Moments',
    '小红书 竖版': 'Xiaohongshu Post',
    '小红书 Story': 'Xiaohongshu Story',
    'Instagram 竖版': 'Instagram Portrait',
    '明信片': 'Postcard',
    '名片': 'Business Card',
    '贺卡': 'Greeting Card',
    '邀请函': 'Invitation',
    '正方形': 'Square',
    '横幅 Banner': 'Banner',
    '海报': 'Poster',
  };
  
  return allSizes[name] || allSizes[aliases[name]];
}

/**
 * 获取纸张尺寸摘要列表 (用于 AI 决策)
 */
export function getPaperSizeSummaries(language: 'zh' | 'en' = 'zh'): string {
  const sections: string[] = [];
  
  Object.entries(paperSizeCategories).forEach(([key, category]) => {
    const categoryName = language === 'zh' ? category.nameZh : category.nameEn;
    const emoji = key === 'standard' ? '📄' : key === 'socialMedia' ? '📱' : key === 'cards' ? '💳' : '🖼️';
    
    const sizeList = Object.entries(category.sizes)
      .map(([name, size]) => {
        const pixelInfo = size.pixels ? ` (${size.aspectRatio}, ${size.pixels})` : '';
        return `  - "${name}": ${size.width}×${size.height}mm${pixelInfo}`;
      })
      .join('\n');
    
    sections.push(`${emoji} **${categoryName}:**\n${sizeList}`);
  });
  
  return sections.join('\n\n');
}

/**
 * 生成纸张尺寸的 AI 提示词片段
 */
export function buildPaperSizePrompt(language: 'zh' | 'en' = 'zh'): string {
  const intro = 'Choose appropriate paper size based on user request, set basePdf width and height:';
  
  return `
### ⚠️ PAPER SIZES ⚠️
${intro}

${getPaperSizeSummaries(language)}

**Default**: A4 (210×297mm)

**Example - WeChat Moments:**
\`\`\`json
{
  "basePdf": { "width": 150, "height": 150, "padding": [0, 0, 0, 0] },
  "schemas": [...]
}
\`\`\`

**Example - PPT (16:9):**
\`\`\`json
{
  "basePdf": { "width": 339, "height": 191, "padding": [0, 0, 0, 0] },
  "schemas": [...]
}
\`\`\`
`;
}

/**
 * 计算内容区域的边界
 */
export function getContentBounds(paperSize: PaperSize): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  contentWidth: number;
  contentHeight: number;
} {
  const [top, right, bottom, left] = paperSize.padding;
  return {
    minX: left,
    minY: top,
    maxX: paperSize.width - right,
    maxY: paperSize.height - bottom,
    contentWidth: paperSize.width - left - right,
    contentHeight: paperSize.height - top - bottom,
  };
}

/**
 * 计算动态布局区域 (适应任意纸张尺寸)
 * Layout zones are calculated proportionally:
 * - Header: 15% of content height
 * - Body: 70% of content height  
 * - Footer: 15% of content height
 */
export function getLayoutZones(paperSize: PaperSize): {
  header: { yStart: number; yEnd: number };
  body: { yStart: number; yEnd: number };
  footer: { yStart: number; yEnd: number };
  gridX: number[];
} {
  const bounds = getContentBounds(paperSize);
  const contentHeight = bounds.contentHeight;
  
  // 按比例分配: Header 15%, Body 70%, Footer 15%
  const headerHeight = Math.round(contentHeight * 0.15);
  const footerHeight = Math.round(contentHeight * 0.15);
  const gap = Math.max(5, Math.round(contentHeight * 0.03)); // 3% gap or min 5mm
  
  const headerYEnd = bounds.minY + headerHeight;
  const footerYStart = bounds.maxY - footerHeight;
  
  // 生成5个均匀分布的x网格点
  const gridX = [0, 1, 2, 3, 4].map(i => 
    Math.round(bounds.minX + (bounds.contentWidth * i / 4))
  );
  
  return {
    header: { yStart: bounds.minY, yEnd: headerYEnd },
    body: { yStart: headerYEnd + gap, yEnd: footerYStart - gap },
    footer: { yStart: footerYStart, yEnd: bounds.maxY },
    gridX,
  };
}

/**
 * 生成当前纸张的布局设计原则提示词
 */
export function buildLayoutRulesPrompt(paperSize: PaperSize, _language: 'zh' | 'en' = 'zh'): string {
  const bounds = getContentBounds(paperSize);
  const zones = getLayoutZones(paperSize);
  
  return `### ⚠️ LAYOUT DESIGN PRINCIPLES ⚠️

**1. Grid-Based Layout**:
- Header zone: y=${zones.header.yStart} ~ ${zones.header.yEnd} (title, logo)
- Body zone: y=${zones.body.yStart} ~ ${zones.body.yEnd} (main content)
- Footer zone: y=${zones.footer.yStart} ~ ${zones.footer.yEnd} (page number, copyright)
- X grid points: [${zones.gridX.join(', ')}]
- Content dimensions: ${bounds.contentWidth}mm × ${bounds.contentHeight}mm

**2. Element Alignment**:
- Keep 8-15mm gaps between related elements
- Center elements: x = (${paperSize.width} - width) / 2
- Left-aligned text blocks use x=${bounds.minX}

**3. Z-Order (JSON array order)**:
- First in array = bottom layer (background rectangles, decorative shapes)
- Last in array = top layer (main content, text, foreground images)
- Order: Background → Decorations → Text → Main images

**4. Balanced Composition**:
- When placing image on one side, balance with text or image on the other
- Leave 30-40% whitespace, don't fill every pixel

**5. Color Harmony**:
- Choose 2-3 main colors and use consistently
- Background: light/soft colors
- Text: high contrast with background
- Accent: borders, highlights, decorative elements`;
}
