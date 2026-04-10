/**
 * workspaceContext.ts - 工作区上下文提取器
 * 
 * 分析当前模板中已放置的元素，提取结构化信息供 AI 理解。
 * 支持：
 * - 元素统计和分布
 * - 文本内容提取
 * - 图片布局分析 (PaddleOCR-VL)
 * - 模板结构分析
 */

import { Template } from '@pdfme/common';
import { 
  extractTextFromImage, 
  analyzeDocumentLayout, 
  layoutToPdfmeHints,
  LayoutAnalysisResult,
  LayoutElement,
} from '../OcrClient';

// =============================================================================
// Types (类型定义)
// =============================================================================

export interface ElementInfo {
  name: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  content?: string;
  /** OCR 提取的文本（仅对图片） */
  ocrText?: string;
}

export interface PageInfo {
  pageIndex: number;
  elements: ElementInfo[];
  /** 页面布局概述 */
  layoutSummary: string;
}

export interface WorkspaceContext {
  /** 纸张尺寸 */
  paperSize: { width: number; height: number };
  /** 总页数 */
  pageCount: number;
  /** 各类型元素统计 */
  elementStats: Record<string, number>;
  /** 分页信息 */
  pages: PageInfo[];
  /** 所有文本内容 */
  allTextContent: string[];
  /** 是否有图片 */
  hasImages: boolean;
  /** 图片 OCR 结果（如果启用） */
  imageOcrResults?: { name: string; text: string }[];
  /** 图片布局分析结果（使用 PaddleOCR-VL） */
  layoutAnalysis?: LayoutAnalysisResult;
  /** PDFme 元素放置建议（基于布局分析） */
  layoutHints?: string;
  /** 画布截图 (base64) - 用于视觉布局分析 */
  canvasScreenshot?: string;
  /** 视觉布局分析结果 (基于画布截图) */
  visualLayoutAnalysis?: LayoutAnalysisResult;
  /** 模板结构描述（供 AI 理解） */
  structureSummary: string;
}

// =============================================================================
// Extraction Functions (提取函数)
// =============================================================================

/**
 * 从模板中提取工作区上下文
 * 
 * @param template - 当前 PDFme 模板
 * @param enableOcr - 是否对图片启用 OCR（默认 false，因为较慢）
 */
export async function extractWorkspaceContext(
  template: Template,
  enableOcr: boolean = false
): Promise<WorkspaceContext> {
  // 提取纸张尺寸
  const basePdf = template.basePdf;
  let paperSize = { width: 210, height: 297 }; // 默认 A4
  
  if (typeof basePdf === 'object' && 'width' in basePdf) {
    paperSize = { width: basePdf.width, height: basePdf.height };
  }

  // 初始化统计
  const elementStats: Record<string, number> = {};
  const allTextContent: string[] = [];
  const imageElements: { name: string; content: string }[] = [];
  const pages: PageInfo[] = [];
  let hasImages = false;

  // 遍历所有页面和元素
  if (template.schemas && Array.isArray(template.schemas)) {
    template.schemas.forEach((page, pageIndex) => {
      const pageElements: ElementInfo[] = [];
      
      // 处理 Record 格式 { fieldName: schema }
      if (page && typeof page === 'object' && !Array.isArray(page)) {
        Object.entries(page).forEach(([name, schema]: [string, any]) => {
          if (!schema || !schema.type) return;
          
          // 统计
          const type = schema.type;
          elementStats[type] = (elementStats[type] || 0) + 1;
          
          // 提取元素信息
          const elementInfo: ElementInfo = {
            name,
            type,
            position: schema.position || { x: 0, y: 0 },
            size: { width: schema.width || 0, height: schema.height || 0 },
          };
          
          // 提取文本内容
          if ((type === 'text' || type === 'multiVariableText') && schema.content) {
            elementInfo.content = schema.content;
            allTextContent.push(schema.content);
          }
          
          // 标记图片
          if (type === 'image') {
            hasImages = true;
            if (schema.content && !schema.content.startsWith('__GENERATE_IMAGE:')) {
              imageElements.push({ name, content: schema.content });
            }
          }
          
          // 表格内容
          if (type === 'table' && schema.content) {
            try {
              const tableData = typeof schema.content === 'string' 
                ? JSON.parse(schema.content) 
                : schema.content;
              if (tableData.head) {
                allTextContent.push(`Table headers: ${tableData.head.join(', ')}`);
              }
            } catch {}
          }
          
          pageElements.push(elementInfo);
        });
      }
      
      // 生成页面布局概述
      const layoutSummary = generatePageLayoutSummary(pageElements, paperSize);
      
      pages.push({
        pageIndex,
        elements: pageElements,
        layoutSummary,
      });
    });
  }

  // OCR 图片（可选）
  let imageOcrResults: { name: string; text: string }[] | undefined;
  if (enableOcr && imageElements.length > 0) {
    imageOcrResults = await Promise.all(
      imageElements.slice(0, 3).map(async (img) => { // 限制最多 3 张
        try {
          // 只处理 base64 图片
          if (img.content.startsWith('data:image/') || !img.content.startsWith('http')) {
            const result = await extractTextFromImage(img.content);
            return { name: img.name, text: result.success ? result.text : '' };
          }
        } catch {}
        return { name: img.name, text: '' };
      })
    );
    imageOcrResults = imageOcrResults.filter(r => r.text);
  }

  // 生成结构概述
  const structureSummary = generateStructureSummary(
    paperSize,
    pages,
    elementStats,
    allTextContent,
    hasImages
  );

  return {
    paperSize,
    pageCount: pages.length,
    elementStats,
    pages,
    allTextContent,
    hasImages,
    imageOcrResults,
    structureSummary,
  };
}

// =============================================================================
// Combined Context (结合两种分析)
// =============================================================================

export interface CombinedWorkspaceContext {
  /** Schema 解析结果 (精确数据) */
  schemaContext: WorkspaceContext;
  /** 视觉分析结果 (设计意图) - 可选 */
  visualContext?: {
    screenshot: string;
    layoutAnalysis: LayoutAnalysisResult;
    layoutHints: string;
    visualDescription: string;
  };
  /** 合并后的提示词 */
  combinedPrompt: string;
  /** 分析模式 */
  mode: 'schema-only' | 'combined';
}

/**
 * 获取完整工作区上下文 (Schema + 视觉分析结合)
 * 
 * 两者互补：
 * - Schema 解析: 精确坐标、元素类型、文本内容 (即时)
 * - 视觉分析: 渲染效果、视觉层次、设计意图 (2-3秒)
 * 
 * AI 既知道精确数据，又理解设计意图
 * 
 * @param template - 当前模板
 * @param enableVisualAnalysis - 是否启用视觉分析 (默认 true)
 * @param canvasSelector - 画布选择器
 */
export async function getFullWorkspaceContext(
  template: Template,
  enableVisualAnalysis: boolean = true,
  canvasSelector?: string
): Promise<CombinedWorkspaceContext> {
  // 1. 快速层: Schema 解析 (始终执行)
  const schemaContext = await extractWorkspaceContext(template, false);
  
  // 如果画布为空，不需要视觉分析
  if (Object.keys(schemaContext.elementStats).length === 0) {
    return {
      schemaContext,
      combinedPrompt: buildWorkspaceContextPrompt(schemaContext),
      mode: 'schema-only',
    };
  }
  
  // 2. 深度层: 视觉分析 (可选)
  let visualContext: CombinedWorkspaceContext['visualContext'];
  
  if (enableVisualAnalysis) {
    try {
      const visualResult = await analyzeWorkspaceVisually(
        canvasSelector,
        schemaContext.paperSize
      );
      
      if (visualResult.success && visualResult.layoutAnalysis) {
        visualContext = {
          screenshot: visualResult.screenshot!,
          layoutAnalysis: visualResult.layoutAnalysis,
          layoutHints: visualResult.layoutHints!,
          visualDescription: visualResult.visualDescription!,
        };
      }
    } catch (e) {
      console.warn('[Workspace] Visual analysis failed, using schema only:', e);
    }
  }
  
  // 3. 合并两者生成提示词
  const combinedPrompt = buildCombinedContextPrompt(schemaContext, visualContext);
  
  return {
    schemaContext,
    visualContext,
    combinedPrompt,
    mode: visualContext ? 'combined' : 'schema-only',
  };
}

/**
 * 构建合并后的上下文提示词
 * 
 * 结合 Schema 精确数据 + 视觉设计意图
 */
export function buildCombinedContextPrompt(
  schemaContext: WorkspaceContext,
  visualContext?: CombinedWorkspaceContext['visualContext']
): string {
  const sections: string[] = [];
  
  sections.push('## WORKSPACE CONTEXT (工作区上下文)');
  sections.push('');
  sections.push('The user has already placed elements on the canvas. Build upon their existing work.');
  sections.push('');
  
  // Part 1: Schema 精确数据
  sections.push('### 📐 Precise Data (精确数据 - from Schema)');
  sections.push('```');
  sections.push(schemaContext.structureSummary);
  sections.push('```');
  
  // 文本内容
  if (schemaContext.allTextContent.length > 0) {
    sections.push('');
    sections.push('**Existing text content:**');
    schemaContext.allTextContent.slice(0, 8).forEach((text, i) => {
      const preview = text.length > 80 ? text.substring(0, 80) + '...' : text;
      sections.push(`${i + 1}. "${preview}"`);
    });
  }
  
  // Part 2: 视觉设计意图 (如果有)
  if (visualContext) {
    sections.push('');
    sections.push('### 👁️ Visual Design Intent (视觉设计意图 - from PaddleOCR-VL)');
    sections.push('');
    sections.push(visualContext.visualDescription);
    sections.push('');
    sections.push('**Element positions detected:**');
    sections.push(visualContext.layoutHints);
  }
  
  // Part 3: 设计指导
  sections.push('');
  sections.push('### 🎨 Design Guidelines (设计指导)');
  
  if (schemaContext.elementStats['image'] > 0) {
    sections.push('- Background/image already placed. Add text/elements ON TOP of it.');
  }
  
  if (schemaContext.allTextContent.length > 0) {
    sections.push('- Use consistent font styling with existing text.');
  }
  
  if (visualContext) {
    sections.push('- Maintain the detected visual hierarchy.');
    sections.push('- Preserve the reading order from visual analysis.');
  }
  
  sections.push('- **MERGE** with existing elements (do not replace them).');
  sections.push('- Use the precise coordinates from Schema data.');
  
  return sections.join('\n');
}

/**
 * 生成页面布局概述
 */
function generatePageLayoutSummary(
  elements: ElementInfo[],
  paperSize: { width: number; height: number }
): string {
  if (elements.length === 0) return 'Empty page';
  
  // 分析元素分布
  const topElements = elements.filter(e => e.position.y < paperSize.height * 0.33);
  const middleElements = elements.filter(e => 
    e.position.y >= paperSize.height * 0.33 && e.position.y < paperSize.height * 0.66
  );
  const bottomElements = elements.filter(e => e.position.y >= paperSize.height * 0.66);
  
  const parts: string[] = [];
  
  if (topElements.length > 0) {
    const types = [...new Set(topElements.map(e => e.type))].join(', ');
    parts.push(`Top: ${topElements.length} elements (${types})`);
  }
  if (middleElements.length > 0) {
    const types = [...new Set(middleElements.map(e => e.type))].join(', ');
    parts.push(`Middle: ${middleElements.length} elements (${types})`);
  }
  if (bottomElements.length > 0) {
    const types = [...new Set(bottomElements.map(e => e.type))].join(', ');
    parts.push(`Bottom: ${bottomElements.length} elements (${types})`);
  }
  
  return parts.join('; ');
}

/**
 * 生成模板结构概述（供 AI 理解）
 */
function generateStructureSummary(
  paperSize: { width: number; height: number },
  pages: PageInfo[],
  elementStats: Record<string, number>,
  textContent: string[],
  hasImages: boolean
): string {
  const lines: string[] = [];
  
  // 纸张信息
  lines.push(`Paper: ${paperSize.width}×${paperSize.height}mm, ${pages.length} page(s)`);
  
  // 元素统计
  if (Object.keys(elementStats).length > 0) {
    const statsStr = Object.entries(elementStats)
      .map(([type, count]) => `${type}: ${count}`)
      .join(', ');
    lines.push(`Elements: ${statsStr}`);
  } else {
    lines.push('Elements: None (blank template)');
  }
  
  // 文本预览
  if (textContent.length > 0) {
    const preview = textContent.slice(0, 5).map(t => 
      t.length > 50 ? t.substring(0, 50) + '...' : t
    );
    lines.push(`Text content: "${preview.join('", "')}"`);
  }
  
  // 图片信息
  if (hasImages) {
    lines.push('Has background images or assets');
  }
  
  // 每页概述
  pages.forEach((page, i) => {
    if (page.elements.length > 0) {
      lines.push(`Page ${i + 1}: ${page.layoutSummary}`);
    }
  });
  
  return lines.join('\n');
}

// =============================================================================
// Prompt Integration (提示词集成)
// =============================================================================

/**
 * 将工作区上下文转换为 AI 提示词片段
 */
export function buildWorkspaceContextPrompt(context: WorkspaceContext): string {
  const sections: string[] = [];
  
  sections.push(`## CURRENT WORKSPACE STATE (当前工作区状态)`);
  sections.push(`The user has already placed some elements on the canvas. Build upon their existing work.`);
  sections.push('');
  sections.push('```');
  sections.push(context.structureSummary);
  sections.push('```');
  
  // 如果有文本内容，提供预览
  if (context.allTextContent.length > 0) {
    sections.push('');
    sections.push('**Existing text content:**');
    context.allTextContent.slice(0, 10).forEach((text, i) => {
      const preview = text.length > 100 ? text.substring(0, 100) + '...' : text;
      sections.push(`${i + 1}. "${preview}"`);
    });
  }
  
  // 如果有 OCR 结果
  if (context.imageOcrResults && context.imageOcrResults.length > 0) {
    sections.push('');
    sections.push('**Text extracted from images (OCR):**');
    context.imageOcrResults.forEach(ocr => {
      const preview = ocr.text.length > 200 ? ocr.text.substring(0, 200) + '...' : ocr.text;
      sections.push(`- ${ocr.name}: "${preview}"`);
    });
  }
  
  // 设计指导
  sections.push('');
  sections.push('**Design guidelines based on existing elements:**');
  
  if (context.elementStats['image'] > 0) {
    sections.push('- Background image already placed. Add text/elements ON TOP of it.');
  }
  
  if (context.allTextContent.length > 0) {
    sections.push('- Use consistent font styling with existing text.');
    sections.push('- Maintain the established visual hierarchy.');
  }
  
  if (Object.keys(context.elementStats).length === 0) {
    sections.push('- This is a blank canvas. Create a complete design from scratch.');
  } else {
    sections.push('- Preserve existing elements. Add new elements that complement the design.');
    sections.push('- When outputting JSON, MERGE with existing elements (do not replace them).');
  }
  
  return sections.join('\n');
}

/**
 * 快速提取工作区概述（不含 OCR，用于快速上下文）
 */
export function getQuickWorkspaceSummary(template: Template): string {
  const basePdf = template.basePdf;
  let paperSize = { width: 210, height: 297 };
  
  if (typeof basePdf === 'object' && 'width' in basePdf) {
    paperSize = { width: basePdf.width, height: basePdf.height };
  }
  
  let totalElements = 0;
  const types: Set<string> = new Set();
  const texts: string[] = [];
  
  if (template.schemas && Array.isArray(template.schemas)) {
    template.schemas.forEach(page => {
      if (page && typeof page === 'object' && !Array.isArray(page)) {
        Object.entries(page).forEach(([_name, schema]: [string, any]) => {
          if (!schema || !schema.type) return;
          totalElements++;
          types.add(schema.type);
          if ((schema.type === 'text' || schema.type === 'multiVariableText') && schema.content) {
            texts.push(schema.content);
          }
        });
      }
    });
  }
  
  if (totalElements === 0) {
    return `Blank ${paperSize.width}×${paperSize.height}mm canvas`;
  }
  
  const typeList = [...types].join(', ');
  const textPreview = texts.length > 0 
    ? `, text: "${texts[0].substring(0, 30)}${texts[0].length > 30 ? '...' : ''}"` 
    : '';
  
  return `${paperSize.width}×${paperSize.height}mm, ${totalElements} elements (${typeList})${textPreview}`;
}

// =============================================================================
// Canvas Visual Analysis (画布视觉分析)
// =============================================================================

/**
 * 截取 PDFme 画布为图片
 * 
 * 使用 html2canvas 或 DOM 截图技术将当前画布渲染为图片，
 * 然后可以发送给 PaddleOCR-VL 进行视觉布局分析。
 * 
 * @param canvasSelector - 画布 DOM 选择器 (默认: '.pdfme-canvas' 或画布容器)
 * @returns Base64 编码的图片，或 null 如果失败
 */
export async function captureCanvasAsImage(
  canvasSelector: string = '.pdfme-canvas, [data-pdfme-canvas], .canvas-container'
): Promise<string | null> {
  console.log('[Workspace] 📸 Capturing canvas as image...');
  
  try {
    // 查找画布元素
    const canvasElement = document.querySelector(canvasSelector) as HTMLElement;
    if (!canvasElement) {
      console.warn('[Workspace] Canvas element not found:', canvasSelector);
      return null;
    }
    
    // 尝试使用 html2canvas (如果已加载)
    if (typeof (window as any).html2canvas === 'function') {
      const canvas = await (window as any).html2canvas(canvasElement, {
        scale: 2, // 高分辨率
        useCORS: true,
        logging: false,
      });
      const dataUrl = canvas.toDataURL('image/png');
      console.log('[Workspace] ✅ Canvas captured using html2canvas');
      return dataUrl;
    }
    
    // 尝试查找内部 canvas 元素
    const internalCanvas = canvasElement.querySelector('canvas') as HTMLCanvasElement;
    if (internalCanvas) {
      const dataUrl = internalCanvas.toDataURL('image/png');
      console.log('[Workspace] ✅ Canvas captured from internal canvas element');
      return dataUrl;
    }
    
    // 最后尝试：如果有 SVG 元素，序列化它
    const svgElement = canvasElement.querySelector('svg');
    if (svgElement) {
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      // 转换 SVG 为 PNG
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = svgElement.clientWidth * 2;
          canvas.height = svgElement.clientHeight * 2;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.scale(2, 2);
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            console.log('[Workspace] ✅ Canvas captured from SVG element');
            resolve(canvas.toDataURL('image/png'));
          } else {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = url;
      });
    }
    
    console.warn('[Workspace] No suitable canvas element found for capture');
    return null;
    
  } catch (error: any) {
    console.error('[Workspace] ❌ Canvas capture failed:', error.message);
    return null;
  }
}

/**
 * 使用 PaddleOCR-VL 分析当前工作区的视觉布局
 * 
 * 这个函数会：
 * 1. 截取当前画布
 * 2. 发送给 PaddleOCR-VL 进行布局分析
 * 3. 返回结构化的布局信息
 * 
 * 这比单纯解析 template.schemas 更准确，因为：
 * - 捕获了实际渲染效果
 * - 包含了字体、颜色、间距等视觉信息
 * - AI 能理解视觉层次结构
 * 
 * @param canvasSelector - 画布选择器
 * @param paperSize - 纸张尺寸
 */
export async function analyzeWorkspaceVisually(
  canvasSelector?: string,
  paperSize: { width: number; height: number } = { width: 210, height: 297 }
): Promise<{
  success: boolean;
  screenshot?: string;
  layoutAnalysis?: LayoutAnalysisResult;
  layoutHints?: string;
  visualDescription?: string;
  error?: string;
}> {
  console.log('[Workspace] 👁️ Starting visual workspace analysis...');
  
  try {
    // Step 1: 截取画布
    const screenshot = await captureCanvasAsImage(canvasSelector);
    if (!screenshot) {
      return { 
        success: false, 
        error: 'Failed to capture canvas. Make sure html2canvas is loaded or canvas element exists.' 
      };
    }
    
    // Step 2: 使用 PaddleOCR-VL 分析
    const layoutResult = await analyzeDocumentLayout(screenshot);
    
    if (!layoutResult.success) {
      return { 
        success: false, 
        screenshot,
        error: layoutResult.error || 'Layout analysis failed' 
      };
    }
    
    // Step 3: 生成布局提示
    const layoutHints = layoutToPdfmeHints(
      layoutResult.elements,
      paperSize.width,
      paperSize.height
    );
    
    // Step 4: 生成视觉描述（供 AI 理解）
    const visualDescription = generateVisualDescription(layoutResult);
    
    console.log(`[Workspace] ✅ Visual analysis complete: ${layoutResult.elements.length} elements detected`);
    
    return {
      success: true,
      screenshot,
      layoutAnalysis: layoutResult,
      layoutHints,
      visualDescription,
    };
    
  } catch (error: any) {
    console.error('[Workspace] ❌ Visual analysis failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 生成视觉描述供 AI 理解
 */
function generateVisualDescription(layoutResult: LayoutAnalysisResult): string {
  const lines: string[] = [];
  lines.push('## Current Canvas Visual Layout (当前画布视觉布局)');
  lines.push('');
  lines.push('The following elements are visually detected on the canvas:');
  lines.push('');
  
  // 按位置分组
  const topElements = layoutResult.elements.filter(e => e.position && e.position.top < 0.33);
  const middleElements = layoutResult.elements.filter(e => e.position && e.position.top >= 0.33 && e.position.top < 0.66);
  const bottomElements = layoutResult.elements.filter(e => e.position && e.position.top >= 0.66);
  
  if (topElements.length > 0) {
    lines.push('**Top Section (页面顶部):**');
    topElements.forEach(el => {
      lines.push(`  - ${el.type}: "${el.content.substring(0, 50)}..."`);
    });
    lines.push('');
  }
  
  if (middleElements.length > 0) {
    lines.push('**Middle Section (页面中部):**');
    middleElements.forEach(el => {
      lines.push(`  - ${el.type}: "${el.content.substring(0, 50)}..."`);
    });
    lines.push('');
  }
  
  if (bottomElements.length > 0) {
    lines.push('**Bottom Section (页面底部):**');
    bottomElements.forEach(el => {
      lines.push(`  - ${el.type}: "${el.content.substring(0, 50)}..."`);
    });
    lines.push('');
  }
  
  // 添加 markdown 内容
  if (layoutResult.markdown) {
    lines.push('---');
    lines.push('**Extracted Text Content:**');
    lines.push('```');
    lines.push(layoutResult.markdown.substring(0, 1500));
    if (layoutResult.markdown.length > 1500) {
      lines.push('...(truncated)');
    }
    lines.push('```');
  }
  
  return lines.join('\n');
}

/**
 * 构建视觉分析上下文提示词
 */
export function buildVisualContextPrompt(
  visualDescription: string,
  layoutHints: string
): string {
  return `
## VISUAL CANVAS ANALYSIS (视觉画布分析)

The current canvas has been analyzed using PaddleOCR-VL's PP-DocLayoutV2.
This gives you a TRUE VISUAL understanding of what's on the canvas, including:
- Actual rendered text and fonts
- Visual hierarchy and spacing
- Element positions and sizes
- Reading order

${visualDescription}

### Detected Element Positions (检测到的元素位置):
${layoutHints}

**Design Instructions:**
- Build upon this existing visual layout
- Maintain consistent styling with detected elements
- Use similar fonts, colors, and spacing
- Add new elements that complement the existing design
`;
}

// =============================================================================
// Image Layout Analysis (图片布局分析)
// =============================================================================

/**
 * 分析用户上传的图片，提取布局结构
 * 
 * 使用 PaddleOCR-VL 的 PP-DocLayoutV2 进行：
 * - 元素检测（文本、标题、表格、图片、图表、公式等）
 * - 位置识别（每个元素的坐标）
 * - 阅读顺序预测
 * - 内容提取
 * 
 * @param imageBase64 - Base64 编码的图片
 * @param paperSize - 目标纸张尺寸（用于坐标转换）
 * @returns 布局分析结果，包含 PDFme 元素放置建议
 */
export async function analyzeUploadedImage(
  imageBase64: string,
  paperSize: { width: number; height: number } = { width: 210, height: 297 }
): Promise<{
  success: boolean;
  layoutAnalysis?: LayoutAnalysisResult;
  layoutHints?: string;
  elementSuggestions?: string;
  error?: string;
}> {
  console.log('[Workspace] 🖼️ Analyzing uploaded image layout...');
  
  try {
    // 使用 PaddleOCR-VL 进行布局分析
    const layoutResult = await analyzeDocumentLayout(imageBase64);
    
    if (!layoutResult.success) {
      return { 
        success: false, 
        error: layoutResult.error || 'Layout analysis failed' 
      };
    }
    
    // 生成 PDFme 元素放置建议
    const layoutHints = layoutToPdfmeHints(
      layoutResult.elements, 
      paperSize.width, 
      paperSize.height
    );
    
    // 生成元素建议（供 AI 理解）
    const elementSuggestions = generateElementSuggestions(layoutResult, paperSize);
    
    console.log(`[Workspace] ✅ Layout analysis complete: ${layoutResult.elements.length} elements detected`);
    
    return {
      success: true,
      layoutAnalysis: layoutResult,
      layoutHints,
      elementSuggestions,
    };
    
  } catch (error: any) {
    console.error('[Workspace] ❌ Image layout analysis failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * OCR 元素类型到 PDFme 元素类型的完整映射
 * 
 * PaddleOCR-VL 检测的元素类型 → PDFme 实际元素配置
 */
interface PdfmeElementMapping {
  /** PDFme 元素类型 */
  pdfmeType: string;
  /** 建议的属性 */
  suggestedProps: Record<string, any>;
  /** 给 AI 的说明 */
  description: string;
  /** JSON 示例片段 */
  jsonExample: string;
}

const OCR_TO_PDFME_MAPPING: Record<string, PdfmeElementMapping> = {
  // 标题
  title: {
    pdfmeType: 'text',
    suggestedProps: { fontSize: 28, fontWeight: 'bold', fontName: 'NotoSansSC' },
    description: 'Use **text** with large fontSize (24-36) and bold fontWeight',
    jsonExample: '{"type": "text", "fontSize": 28, "fontWeight": "bold", "fontName": "NotoSansSC", "alignment": "center"}',
  },
  
  // 普通文本/段落
  text: {
    pdfmeType: 'text',
    suggestedProps: { fontSize: 12, lineHeight: 1.5, fontName: 'NotoSansSC' },
    description: 'Use **text** with fontSize 10-14',
    jsonExample: '{"type": "text", "fontSize": 12, "lineHeight": 1.5, "fontName": "NotoSansSC"}',
  },
  
  // 表格
  table: {
    pdfmeType: 'table',
    suggestedProps: { showHead: true, headWidthPercentages: [], bodyWidthPercentages: [] },
    description: 'Use **table** element with structured content',
    jsonExample: '{"type": "table", "showHead": true, "content": "[[head1,head2],[row1col1,row1col2]]", "headStyles": {"backgroundColor": "#f0f0f0"}}',
  },
  
  // 图片
  image: {
    pdfmeType: 'image',
    suggestedProps: {},
    description: 'Use **image** element',
    jsonExample: '{"type": "image", "content": "__GENERATE_IMAGE:description here"}',
  },
  
  // 图表 - Enhanced with multiple chart types
  chart: {
    pdfmeType: 'simplechart',
    suggestedProps: { chartType: 'bar', color: '#3b82f6', showGrid: true, gradient: false },
    description: 'Use **simplechart** element. chartTypes: bar/line/area/pie/doughnut/radar. Data: "Label1:val1,Label2:val2" or "10,20,30"',
    jsonExample: '{"type": "simplechart", "chartType": "bar", "data": "Q1:65,Q2:80,Q3:72,Q4:95", "label": "Sales", "color": "#3b82f6", "showGrid": true}',
  },
  
  // 列表
  list: {
    pdfmeType: 'text',
    suggestedProps: { fontSize: 12, lineHeight: 1.8 },
    description: 'Use **text** with bullet points (• item1\\n• item2) or numbered (1. item1\\n2. item2)',
    jsonExample: '{"type": "text", "fontSize": 12, "lineHeight": 1.8, "content": "• Item 1\\n• Item 2\\n• Item 3"}',
  },
  
  // 公式
  formula: {
    pdfmeType: 'svg',
    suggestedProps: {},
    description: 'Use **svg** element for formulas (or **image** with rendered formula)',
    jsonExample: '{"type": "svg", "content": "<svg>...</svg>"}',
  },
  
  // 代码块
  code: {
    pdfmeType: 'text',
    suggestedProps: { fontSize: 10, fontName: 'Courier', backgroundColor: '#f5f5f5' },
    description: 'Use **text** with monospace font (Courier)',
    jsonExample: '{"type": "text", "fontSize": 10, "fontName": "Courier", "backgroundColor": "#f5f5f5", "padding": [8,8,8,8]}',
  },
  
  // 页眉
  header: {
    pdfmeType: 'text',
    suggestedProps: { fontSize: 9, alignment: 'center' },
    description: 'Use **text** with small fontSize (8-10), typically at page top',
    jsonExample: '{"type": "text", "fontSize": 9, "alignment": "center", "position": {"x": 20, "y": 10}}',
  },
  
  // 页脚
  footer: {
    pdfmeType: 'text',
    suggestedProps: { fontSize: 9, alignment: 'center' },
    description: 'Use **text** with small fontSize (8-10), typically at page bottom',
    jsonExample: '{"type": "text", "fontSize": 9, "alignment": "center", "position": {"x": 20, "y": 280}}',
  },
  
  // 图注/说明
  caption: {
    pdfmeType: 'text',
    suggestedProps: { fontSize: 10, fontStyle: 'italic', alignment: 'center' },
    description: 'Use **text** with small fontSize (9-11), italic style',
    jsonExample: '{"type": "text", "fontSize": 10, "fontStyle": "italic", "alignment": "center"}',
  },
  
  // 二维码
  qrcode: {
    pdfmeType: 'qrcode',
    suggestedProps: {},
    description: 'Use **qrcode** element',
    jsonExample: '{"type": "qrcode", "content": "https://example.com", "width": 30, "height": 30}',
  },
  
  // 条形码
  barcode: {
    pdfmeType: 'code128',
    suggestedProps: {},
    description: 'Use **code128** or **ean13** element',
    jsonExample: '{"type": "code128", "content": "ABC123456", "width": 50, "height": 15}',
  },
  
  // 签名
  signature: {
    pdfmeType: 'signature',
    suggestedProps: {},
    description: 'Use **signature** element',
    jsonExample: '{"type": "signature", "width": 40, "height": 15}',
  },
  
  // 日期
  date: {
    pdfmeType: 'date',
    suggestedProps: { format: 'YYYY-MM-DD' },
    description: 'Use **date** element',
    jsonExample: '{"type": "date", "format": "YYYY-MM-DD", "width": 30, "height": 8}',
  },
  
  // 复选框
  checkbox: {
    pdfmeType: 'checkbox',
    suggestedProps: {},
    description: 'Use **checkbox** element',
    jsonExample: '{"type": "checkbox", "width": 5, "height": 5}',
  },
  
  // 矩形/框
  rectangle: {
    pdfmeType: 'rectangle',
    suggestedProps: { borderWidth: 1, borderColor: '#000000' },
    description: 'Use **rectangle** element',
    jsonExample: '{"type": "rectangle", "borderWidth": 1, "borderColor": "#000000", "color": ""}',
  },
  
  // 分割线
  line: {
    pdfmeType: 'line',
    suggestedProps: { color: '#000000' },
    description: 'Use **line** element',
    jsonExample: '{"type": "line", "width": 170, "height": 1, "color": "#000000"}',
  },
  
  // 默认/未知
  unknown: {
    pdfmeType: 'text',
    suggestedProps: { fontSize: 12 },
    description: 'Use **text** element as fallback',
    jsonExample: '{"type": "text", "fontSize": 12}',
  },
};

/**
 * 获取 OCR 元素类型对应的 PDFme 映射
 */
export function getOcrToPdfmeMapping(ocrType: string): PdfmeElementMapping {
  return OCR_TO_PDFME_MAPPING[ocrType] || OCR_TO_PDFME_MAPPING['unknown'];
}

/**
 * Crop a region from a data-URL image using an offscreen canvas.
 * Returns a data URL of the cropped area.
 */
async function cropImageRegion(
  imageDataUrl: string,
  region: { left: number; top: number; width: number; height: number }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const sx = Math.round(region.left * img.naturalWidth);
      const sy = Math.round(region.top * img.naturalHeight);
      const sw = Math.round(region.width * img.naturalWidth);
      const sh = Math.round(region.height * img.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, sw);
      canvas.height = Math.max(1, sh);
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(imageDataUrl); return; }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load image for cropping'));
    img.src = imageDataUrl;
  });
}

/**
 * 将 OCR 布局分析结果直接转换为 PDFme JSON schemas
 * 
 * 用于 PDF 上传功能：PDF → pdf2img → Azure OCR → 本函数 → PDFme 可编辑模板
 * 
 * @param elements - OCR 检测到的布局元素（相对坐标 0-1）
 * @param paperSize - 纸张尺寸（mm）
 * @param pageImageDataUrl - Optional rendered page image (data URL) for 1:1 background
 * @returns PDFme schemas Record (一页的 schema)
 */
export async function convertLayoutToPdfmeSchemas(
  elements: LayoutElement[],
  paperSize: { width: number; height: number },
  pageImageDataUrl?: string
): Promise<Record<string, any>> {
  const schemas: Record<string, any> = {};
  const nameCounter: Record<string, number> = {};

  // ── Step 0: Insert full-page background image ──
  // When a page image is provided, place it as the bottom-most element for 1:1 fidelity
  if (pageImageDataUrl) {
    schemas['_bg'] = {
      type: 'image',
      position: { x: 0, y: 0 },
      width: paperSize.width,
      height: paperSize.height,
      content: pageImageDataUrl,
    };
  }

  // 按阅读顺序排序
  const sorted = [...elements]
    .sort((a, b) => (a.readingOrder || 0) - (b.readingOrder || 0));

  // ── Step 1: Convert all elements to absolute mm coordinates ──
  interface ConvertedElement {
    el: LayoutElement;
    x: number; y: number; w: number; h: number;
    baseName: string;
  }

  const converted: ConvertedElement[] = [];

  for (const el of sorted) {
    const pos = el.position;
    const x = pos ? Math.round(pos.left * paperSize.width * 10) / 10 : 0;
    const y = pos ? Math.round(pos.top * paperSize.height * 10) / 10 : 0;
    const w = pos ? Math.max(Math.round(pos.width * paperSize.width * 10) / 10, 5) : 50;
    const h = pos ? Math.max(Math.round(pos.height * paperSize.height * 10) / 10, 5) : 10;

    const baseName = el.type === 'title' ? 'title' 
      : el.type === 'header' ? 'header'
      : el.type === 'footer' ? 'footer'
      : el.type === 'table' ? 'table'
      : el.type === 'image' ? 'image'
      : el.type === 'chart' ? 'chart'
      : `text`;

    converted.push({ el, x, y, w, h, baseName });
  }

  // ── Step 1.5: Merge adjacent same-column paragraphs ──
  // Dense booklets often produce many small paragraph boxes for continuous text.
  // Merge consecutive text elements that are vertically adjacent (gap < MERGE_GAP).
  const MERGE_GAP = 3; // mm — max vertical gap to consider "adjacent"
  const X_OVERLAP_THRESHOLD = 0.5; // 50% horizontal overlap to be "same column"

  const merged: ConvertedElement[] = [];
  for (let i = 0; i < converted.length; i++) {
    const cur = converted[i];
    // Only merge text-type elements
    if (cur.baseName !== 'text' || !cur.el.content) {
      merged.push(cur);
      continue;
    }

    // Try to merge with the last merged element if it's also text
    const last = merged.length > 0 ? merged[merged.length - 1] : null;
    if (last && last.baseName === 'text' && last.el.content) {
      // Check horizontal overlap (same column?)
      const overlapLeft = Math.max(cur.x, last.x);
      const overlapRight = Math.min(cur.x + cur.w, last.x + last.w);
      const overlapW = Math.max(0, overlapRight - overlapLeft);
      const minW = Math.min(cur.w, last.w);
      const horizontalOverlap = minW > 0 ? overlapW / minW : 0;

      // Check vertical adjacency
      const lastBottom = last.y + last.h;
      const verticalGap = cur.y - lastBottom;

      if (horizontalOverlap >= X_OVERLAP_THRESHOLD && verticalGap >= -1 && verticalGap <= MERGE_GAP) {
        // Merge: extend the last element to cover both
        const newBottom = Math.max(lastBottom, cur.y + cur.h);
        last.h = Math.round((newBottom - last.y) * 10) / 10;
        last.w = Math.round(Math.max(last.w, cur.w) * 10) / 10;
        last.x = Math.round(Math.min(last.x, cur.x) * 10) / 10;
        // Concatenate content
        last.el = {
          ...last.el,
          content: (last.el.content || '') + '\n' + (cur.el.content || ''),
        };
        continue;
      }
    }

    merged.push(cur);
  }

  // ── Step 2: Snap x-coordinates for left-margin alignment ──
  const SNAP_TOLERANCE = 5; // mm
  const xGroups: { targetX: number; indices: number[] }[] = [];

  for (let i = 0; i < merged.length; i++) {
    const cx = merged[i].x;
    let matched = false;
    for (const group of xGroups) {
      if (Math.abs(cx - group.targetX) <= SNAP_TOLERANCE) {
        group.indices.push(i);
        matched = true;
        break;
      }
    }
    if (!matched) {
      xGroups.push({ targetX: cx, indices: [i] });
    }
  }

  for (const group of xGroups) {
    if (group.indices.length >= 2) {
      const minX = Math.min(...group.indices.map(i => merged[i].x));
      for (const idx of group.indices) {
        const dx = merged[idx].x - minX;
        merged[idx].w = Math.round((merged[idx].w + dx) * 10) / 10;
        merged[idx].x = minX;
      }
    }
  }

  // ── Step 2.5: Overlap detection & resolution ──
  // Sort by y position for vertical overlap detection
  const byY = [...merged].sort((a, b) => a.y - b.y);
  for (let i = 0; i < byY.length; i++) {
    for (let j = i + 1; j < byY.length; j++) {
      const a = byY[i];
      const b = byY[j];

      // Check horizontal overlap
      const overlapLeft = Math.max(a.x, b.x);
      const overlapRight = Math.min(a.x + a.w, b.x + b.w);
      if (overlapRight <= overlapLeft) continue; // No horizontal overlap

      // Check vertical overlap
      const aBottom = a.y + a.h;
      const overlapHeight = aBottom - b.y;
      if (overlapHeight <= 0) continue; // No vertical overlap

      // Resolve: push element b down to just below a (with 1mm gap)
      const newY = Math.round((aBottom + 1) * 10) / 10;
      b.y = newY;
      // Also reduce height if it would exceed page
      if (b.y + b.h > paperSize.height) {
        b.h = Math.max(5, Math.round((paperSize.height - b.y) * 10) / 10);
      }
    }
  }

  // ── Step 3: Scale-aware font sizing ──
  // Scale factor relative to A4 width (210mm) — for small pages, fonts should be smaller
  const A4_WIDTH = 210;
  const scaleFactor = Math.min(1, paperSize.width / A4_WIDTH);
  // Dynamic max font size based on page dimensions
  const maxBodyFontSize = paperSize.width < 100 ? 10 : paperSize.width < 150 ? 12 : 16;
  const titleFontSize = Math.max(10, Math.round(24 * scaleFactor));

  // ── Step 4: Build PDFme schemas ──
  for (const item of byY) {
    const { el, baseName } = item;
    const mapping = getOcrToPdfmeMapping(el.type);
    
    // 生成唯一名称
    nameCounter[baseName] = (nameCounter[baseName] || 0) + 1;
    const name = nameCounter[baseName] === 1 
      ? baseName 
      : `${baseName}_${nameCounter[baseName]}`;
    
    // 确保不超出页面边界
    const clampedX = Math.min(item.x, paperSize.width - 5);
    const clampedY = Math.min(item.y, paperSize.height - 5);
    const clampedW = Math.min(item.w, paperSize.width - clampedX);
    const clampedH = Math.min(item.h, paperSize.height - clampedY);

    // 构建 PDFme schema 元素
    const schema: Record<string, any> = {
      type: mapping.pdfmeType,
      position: { x: clampedX, y: clampedY },
      width: clampedW,
      height: clampedH,
      ...mapping.suggestedProps,
    };

    // 设置内容
    if (mapping.pdfmeType === 'table' && el.content) {
      schema.content = el.content;
      schema.showHead = true;
    } else if (mapping.pdfmeType === 'text') {
      schema.content = el.content || ' ';
      // 根据元素类型调整字号 (scale-aware)
      if (el.type === 'title') {
        schema.fontSize = titleFontSize;
        schema.fontWeight = 'bold';
      } else if (el.type === 'header' || el.type === 'footer') {
        schema.fontSize = Math.max(7, Math.round(9 * scaleFactor));
      } else if (el.type === 'caption') {
        schema.fontSize = Math.max(7, Math.round(10 * scaleFactor));
      } else {
        // Estimate font size from element height and number of text lines
        const lineCount = Math.max(1, (el.content || '').split('\n').length);
        const lineHeight = clampedH / lineCount;
        // Convert mm line height to approximate pt font size (1pt ≈ 0.353mm, line-height ≈ 1.2x)
        const estimatedPt = Math.round(lineHeight / 0.353 / 1.2);
        schema.fontSize = Math.max(7, Math.min(maxBodyFontSize, estimatedPt));
      }
      schema.fontColor = '#000000';
    } else if (mapping.pdfmeType === 'image') {
      // For image/figure elements: crop the exact region from the page image
      if (pageImageDataUrl && item.el.position) {
        try {
          schema.content = await cropImageRegion(pageImageDataUrl, {
            left: item.el.position.left,
            top: item.el.position.top,
            width: item.el.position.width,
            height: item.el.position.height,
          });
        } catch (err) {
          console.warn('[convertLayout] Figure crop failed, using full page image:', err);
          schema.content = pageImageDataUrl;
        }
      } else {
        schema.content = '';
      }
    } else {
      schema.content = el.content || '';
    }

    schemas[name] = schema;
  }

  return schemas;
}

/**
 * 根据布局分析生成 AI 可理解的元素建议
 * 
 * 将 PaddleOCR-VL 检测到的元素对齐到 PDFme 的元素类型
 */
function generateElementSuggestions(
  layoutResult: LayoutAnalysisResult,
  paperSize: { width: number; height: number }
): string {
  const lines: string[] = [];
  lines.push('## Detected Document Layout → PDFme Elements');
  lines.push('');
  lines.push('Each detected element is mapped to the corresponding PDFme element type:');
  lines.push('');
  
  // 按阅读顺序排序
  const sortedElements = [...layoutResult.elements]
    .sort((a, b) => (a.readingOrder || 0) - (b.readingOrder || 0));
  
  sortedElements.forEach((el, i) => {
    const pos = el.position;
    const mapping = getOcrToPdfmeMapping(el.type);
    
    // 转换为 mm 坐标
    const x = pos ? Math.round(pos.left * paperSize.width) : 0;
    const y = pos ? Math.round(pos.top * paperSize.height) : 0;
    const w = pos ? Math.round(pos.width * paperSize.width) : 50;
    const h = pos ? Math.round(pos.height * paperSize.height) : 10;
    
    lines.push(`### ${i + 1}. OCR: \`${el.type}\` → PDFme: \`${mapping.pdfmeType}\``);
    lines.push(`- **Position**: (${x}, ${y}) size ${w}×${h}mm`);
    lines.push(`- **Content**: "${el.content.substring(0, 60)}${el.content.length > 60 ? '...' : ''}"`);
    lines.push(`- **How to use**: ${mapping.description}`);
    lines.push(`- **JSON example**: \`${mapping.jsonExample}\``);
    lines.push('');
  });
  
  // 添加 Markdown 全文
  if (layoutResult.markdown) {
    lines.push('---');
    lines.push('### Full Document Text (完整文档内容):');
    lines.push('');
    lines.push(layoutResult.markdown.substring(0, 2000));
    if (layoutResult.markdown.length > 2000) {
      lines.push('...(truncated)');
    }
  }
  
  return lines.join('\n');
}

/**
 * 构建包含布局分析的工作区上下文提示词
 */
export function buildLayoutContextPrompt(
  layoutHints: string,
  elementSuggestions: string
): string {
  return `
## REFERENCE IMAGE LAYOUT (参考图片布局分析)

The user has uploaded a reference image. Use PaddleOCR-VL layout analysis to recreate this design:

${elementSuggestions}

### Element Placement Guide (元素放置指南):
${layoutHints}

**Instructions:**
1. Recreate the layout as closely as possible
2. Use the detected positions as starting points
3. Maintain the visual hierarchy (titles, body text, images)
4. Preserve the reading order
5. Use appropriate PDFme element types for each detected region
`;
}

