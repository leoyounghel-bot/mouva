/**
 * OcrClient.ts - Azure AI Document Intelligence Integration
 * 
 * Uses Azure AI Document Intelligence (formerly Form Recognizer) for document parsing.
 * Supports layout analysis, text extraction, and table recognition.
 * 
 * Key capabilities:
 * - Layout analysis: Detects text, tables, selection marks with bounding boxes
 * - Text extraction: OCR with multi-language support (hundreds of languages)
 * - Table recognition: Structured table extraction with cells
 * - Reading order prediction: Logical reading sequence
 */

// Azure Document Intelligence configuration
const AZURE_ENDPOINT = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT || '';
const AZURE_KEY = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY || '';
const API_VERSION = '2024-11-30';

if (!AZURE_ENDPOINT || !AZURE_KEY) {
  console.error("[OCR Client] ⚠️ Azure Document Intelligence credentials missing! OCR will fail.");
  console.error("[OCR Client] Set AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT and AZURE_DOCUMENT_INTELLIGENCE_KEY in .env");
}

// =============================================================================
// Types
// =============================================================================

export interface OcrResult {
  success: boolean;
  text: string;
  error?: string;
}

/** 布局元素类型 */
export type LayoutElementType = 
  | 'text' 
  | 'title' 
  | 'table' 
  | 'image' 
  | 'chart' 
  | 'formula' 
  | 'header' 
  | 'footer'
  | 'caption'
  | 'list'
  | 'code'
  | 'selectionMark'
  | 'unknown';

/** 布局元素 */
export interface LayoutElement {
  type: LayoutElementType;
  content: string;
  /** 元素在页面中的位置 (相对坐标 0-1) */
  position?: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  /** 阅读顺序 */
  readingOrder?: number;
  /** 置信度 */
  confidence?: number;
}

/** 布局分析结果 */
export interface LayoutAnalysisResult {
  success: boolean;
  /** 检测到的布局元素 */
  elements: LayoutElement[];
  /** Markdown 格式的全文 */
  markdown: string;
  /** 原始响应 */
  rawResponse?: string;
  error?: string;
}

/** Azure analyze response */
interface AzureAnalyzeResult {
  content?: string;
  pages?: Array<{
    pageNumber: number;
    width: number;
    height: number;
    unit: string;
    lines?: Array<{
      content: string;
      polygon: number[];
    }>;
    words?: Array<{
      content: string;
      polygon: number[];
      confidence: number;
    }>;
    selectionMarks?: Array<{
      state: string;
      polygon: number[];
      confidence: number;
    }>;
  }>;
  paragraphs?: Array<{
    role?: string;
    content: string;
    boundingRegions?: Array<{
      pageNumber: number;
      polygon: number[];
    }>;
  }>;
  tables?: Array<{
    rowCount: number;
    columnCount: number;
    cells: Array<{
      rowIndex: number;
      columnIndex: number;
      content: string;
      boundingRegions?: Array<{
        pageNumber: number;
        polygon: number[];
      }>;
    }>;
    boundingRegions?: Array<{
      pageNumber: number;
      polygon: number[];
    }>;
  }>;
  figures?: Array<{
    id?: string;
    caption?: { content: string };
    boundingRegions?: Array<{
      pageNumber: number;
      polygon: number[];
    }>;
  }>;
}

// =============================================================================
// OCR Functions
// =============================================================================

/**
 * Extract text from an image using Azure Document Intelligence
 * @param base64Image - Base64 encoded image (with or without data URI prefix)
 * @param _mimeType - MIME type of the image (not used for Azure, kept for API compatibility)
 */
export const extractTextFromImage = async (
  base64Image: string,
  _mimeType: string = 'image/png'
): Promise<OcrResult> => {
  if (!AZURE_ENDPOINT || !AZURE_KEY) {
    return { success: false, text: '', error: 'Azure Document Intelligence credentials missing' };
  }

  // Remove data URI prefix if present
  const base64Data = base64Image.includes(',') 
    ? base64Image.split(',')[1] 
    : base64Image;

  console.log('[OCR Client] 📄 Starting Azure OCR extraction...');

  try {
    // Step 1: Submit document for analysis
    const analyzeUrl = `${AZURE_ENDPOINT}/documentintelligence/documentModels/prebuilt-layout:analyze?api-version=${API_VERSION}`;
    
    const submitResponse = await fetch(analyzeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': AZURE_KEY,
      },
      body: JSON.stringify({
        base64Source: base64Data,
      }),
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error(`[OCR Client] ❌ Azure API Error (${submitResponse.status}):`, errorText);
      return { success: false, text: '', error: `Azure API Error (${submitResponse.status}): ${errorText}` };
    }

    // Step 2: Get operation location from response headers
    const operationLocation = submitResponse.headers.get('Operation-Location');
    if (!operationLocation) {
      return { success: false, text: '', error: 'No Operation-Location header in response' };
    }

    // Step 3: Poll for results
    const result = await pollForResult(operationLocation);
    
    if (!result.success) {
      return { success: false, text: '', error: result.error };
    }

    // Extract text content
    const extractedText = result.data?.content || '';
    
    console.log('[OCR Client] ✅ Azure OCR extraction complete');
    return { success: true, text: extractedText };

  } catch (error: any) {
    console.error('[OCR Client] ❌ Error:', error.message);
    return { success: false, text: '', error: error.message };
  }
};

/**
 * Analyze document layout using Azure Document Intelligence
 * 
 * Returns structured information about:
 * - Text regions (paragraphs, titles, headers, footers)
 * - Tables (with cell content)
 * - Selection marks (checkboxes, radio buttons)
 * - Reading order
 * 
 * @param base64Image - Base64 encoded image
 * @param _mimeType - MIME type (kept for API compatibility)
 */
export const analyzeDocumentLayout = async (
  base64Image: string,
  _mimeType: string = 'image/png'
): Promise<LayoutAnalysisResult> => {
  if (!AZURE_ENDPOINT || !AZURE_KEY) {
    return { success: false, elements: [], markdown: '', error: 'Azure Document Intelligence credentials missing' };
  }

  const base64Data = base64Image.includes(',') 
    ? base64Image.split(',')[1] 
    : base64Image;

  console.log('[OCR Client] 🔍 Starting Azure layout analysis...');

  try {
    // Step 1: Submit document for analysis
    const analyzeUrl = `${AZURE_ENDPOINT}/documentintelligence/documentModels/prebuilt-layout:analyze?api-version=${API_VERSION}`;
    
    const submitResponse = await fetch(analyzeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': AZURE_KEY,
      },
      body: JSON.stringify({
        base64Source: base64Data,
      }),
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error(`[OCR Client] ❌ Azure Layout API Error (${submitResponse.status}):`, errorText);
      return { success: false, elements: [], markdown: '', error: `API Error (${submitResponse.status}): ${errorText}` };
    }

    // Step 2: Get operation location
    const operationLocation = submitResponse.headers.get('Operation-Location');
    if (!operationLocation) {
      return { success: false, elements: [], markdown: '', error: 'No Operation-Location header' };
    }

    // Step 3: Poll for results
    const pollResult = await pollForResult(operationLocation);
    
    if (!pollResult.success || !pollResult.data) {
      return { success: false, elements: [], markdown: '', error: pollResult.error };
    }

    // Step 4: Parse Azure response into our format
    const { elements, markdown } = parseAzureLayoutResponse(pollResult.data);
    
    console.log(`[OCR Client] ✅ Azure layout analysis complete: ${elements.length} elements detected`);
    
    return {
      success: true,
      elements,
      markdown,
      rawResponse: JSON.stringify(pollResult.data),
    };

  } catch (error: any) {
    console.error('[OCR Client] ❌ Layout Error:', error.message);
    return { success: false, elements: [], markdown: '', error: error.message };
  }
};

/**
 * Analyze a PDF document's layout directly (no image conversion needed).
 * Sends the raw PDF bytes to Azure Document Intelligence.
 * Returns per-page layout elements grouped by page number.
 */
export const analyzeDocumentLayoutFromPdf = async (
  pdfBase64: string
): Promise<{ success: boolean; pageElements: Map<number, LayoutElement[]>; pageCount: number; error?: string }> => {
  if (!AZURE_ENDPOINT || !AZURE_KEY) {
    return { success: false, pageElements: new Map(), pageCount: 0, error: 'Azure credentials missing' };
  }

  const base64Data = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64;
  console.log('[OCR Client] 🔍 Starting Azure PDF layout analysis (direct PDF)...');

  try {
    const analyzeUrl = `${AZURE_ENDPOINT}/documentintelligence/documentModels/prebuilt-layout:analyze?api-version=${API_VERSION}`;
    const submitResponse = await fetch(analyzeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': AZURE_KEY,
      },
      body: JSON.stringify({ base64Source: base64Data }),
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error(`[OCR Client] ❌ Azure PDF Layout API Error (${submitResponse.status}):`, errorText);
      return { success: false, pageElements: new Map(), pageCount: 0, error: `API Error (${submitResponse.status}): ${errorText}` };
    }

    const operationLocation = submitResponse.headers.get('Operation-Location');
    if (!operationLocation) {
      return { success: false, pageElements: new Map(), pageCount: 0, error: 'No Operation-Location header' };
    }

    const pollResult = await pollForResult(operationLocation);
    if (!pollResult.success || !pollResult.data) {
      return { success: false, pageElements: new Map(), pageCount: 0, error: pollResult.error };
    }

    // Parse multi-page results
    const result = pollResult.data;
    const pageCount = result.pages?.length || 0;
    const pageElements = new Map<number, LayoutElement[]>();

    for (let p = 0; p < pageCount; p++) {
      const { elements } = parseAzureLayoutResponseForPage(result, p + 1);
      pageElements.set(p, elements);
      console.log(`[OCR Client] ✅ Page ${p + 1}: ${elements.length} elements detected`);
    }

    return { success: true, pageElements, pageCount };
  } catch (error: any) {
    console.error('[OCR Client] ❌ PDF Layout Error:', error.message);
    return { success: false, pageElements: new Map(), pageCount: 0, error: error.message };
  }
};

/**
 * Analyze any document (PDF, PPTX, image) layout via Azure Document Intelligence.
 * Azure natively supports PDF, PPTX, DOCX, and image formats.
 * Returns per-page layout elements grouped by page number.
 */
export const analyzeDocumentLayoutFromFile = async (
  fileBase64: string,
  fileType: string = 'pdf'
): Promise<{ success: boolean; pageElements: Map<number, LayoutElement[]>; pageCount: number; pageDimensions?: Array<{ width: number; height: number }>; error?: string }> => {
  if (!AZURE_ENDPOINT || !AZURE_KEY) {
    return { success: false, pageElements: new Map(), pageCount: 0, error: 'Azure credentials missing' };
  }

  const base64Data = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
  console.log(`[OCR Client] 🔍 Starting Azure layout analysis (${fileType})...`);

  try {
    const analyzeUrl = `${AZURE_ENDPOINT}/documentintelligence/documentModels/prebuilt-layout:analyze?api-version=${API_VERSION}`;
    const submitResponse = await fetch(analyzeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': AZURE_KEY,
      },
      body: JSON.stringify({ base64Source: base64Data }),
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error(`[OCR Client] ❌ Azure ${fileType} Layout API Error (${submitResponse.status}):`, errorText);
      return { success: false, pageElements: new Map(), pageCount: 0, error: `API Error (${submitResponse.status}): ${errorText}` };
    }

    const operationLocation = submitResponse.headers.get('Operation-Location');
    if (!operationLocation) {
      return { success: false, pageElements: new Map(), pageCount: 0, error: 'No Operation-Location header' };
    }

    const pollResult = await pollForResult(operationLocation);
    if (!pollResult.success || !pollResult.data) {
      return { success: false, pageElements: new Map(), pageCount: 0, error: pollResult.error };
    }

    const result = pollResult.data;
    const pageCount = result.pages?.length || 0;
    const pageElements = new Map<number, LayoutElement[]>();
    
    // Extract page dimensions from Azure response (in inches, convert to mm)
    const pageDimensions: Array<{ width: number; height: number }> = [];
    
    for (let p = 0; p < pageCount; p++) {
      const { elements } = parseAzureLayoutResponseForPage(result, p + 1);
      pageElements.set(p, elements);
      
      // Azure returns page dimensions - convert inches to mm (1 inch = 25.4mm)
      const azurePage = result.pages?.[p];
      if (azurePage) {
        const unit = azurePage.unit || 'inch';
        const factor = unit === 'inch' ? 25.4 : 1; // Azure usually returns inches
        pageDimensions.push({
          width: Math.round(azurePage.width * factor * 100) / 100,
          height: Math.round(azurePage.height * factor * 100) / 100,
        });
      }
      
      console.log(`[OCR Client] ✅ Page ${p + 1}: ${elements.length} elements detected`);
    }

    return { success: true, pageElements, pageCount, pageDimensions };
  } catch (error: any) {
    console.error(`[OCR Client] ❌ ${fileType} Layout Error:`, error.message);
    return { success: false, pageElements: new Map(), pageCount: 0, error: error.message };
  }
};

/**
 * Poll Azure for analysis results
 */
async function pollForResult(
  operationLocation: string,
  maxAttempts: number = 30,
  intervalMs: number = 1000
): Promise<{ success: boolean; data?: AzureAnalyzeResult; error?: string }> {
  console.log('[OCR Client] ⏳ Polling for results...');
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, intervalMs));
    
    try {
      const response = await fetch(operationLocation, {
        method: 'GET',
        headers: {
          'Ocp-Apim-Subscription-Key': AZURE_KEY,
        },
      });

      if (!response.ok) {
        console.warn(`[OCR Client] ⚠️ Poll error (${response.status})`);
        continue;
      }

      const result = await response.json();
      const status = result.status;
      
      console.log(`[OCR Client] 📊 Poll [${attempt + 1}/${maxAttempts}]: ${status}`);

      if (status === 'succeeded') {
        return { success: true, data: result.analyzeResult };
      } else if (status === 'failed') {
        return { success: false, error: result.error?.message || 'Analysis failed' };
      }
      // Status is 'running' or 'notStarted', continue polling
      
    } catch (e: any) {
      console.warn(`[OCR Client] ⚠️ Poll network error:`, e.message);
    }
  }

  return { success: false, error: 'Polling timeout' };
}

/**
 * Parse Azure layout response into our element format
 */
function parseAzureLayoutResponse(result: AzureAnalyzeResult): { elements: LayoutElement[]; markdown: string } {
  return parseAzureLayoutResponseForPage(result, 1);
}

/**
 * Parse Azure layout response for a specific page (1-indexed)
 */
function parseAzureLayoutResponseForPage(result: AzureAnalyzeResult, pageNumber: number): { elements: LayoutElement[]; markdown: string } {
  const elements: LayoutElement[] = [];
  const markdownParts: string[] = [];
  
  // Get page dimensions for coordinate normalization (use target page)
  const page = result.pages?.find((p: any) => p.pageNumber === pageNumber) || result.pages?.[0];
  const pageWidth = page?.width || 1;
  const pageHeight = page?.height || 1;

  // Helper: check if a bounding region belongs to the target page
  const isOnPage = (boundingRegions?: any[]) => {
    if (!boundingRegions || boundingRegions.length === 0) return pageNumber === 1;
    return boundingRegions.some((r: any) => r.pageNumber === pageNumber);
  };

  // Helper: get polygon from bounding region for the target page
  const getPolygonForPage = (boundingRegions?: any[]) => {
    if (!boundingRegions) return undefined;
    const region = boundingRegions.find((r: any) => r.pageNumber === pageNumber);
    return region?.polygon;
  };

  // Helper to convert polygon to bounding box (normalized 0-1)
  const polygonToPosition = (polygon: number[]) => {
    if (!polygon || polygon.length < 8) return undefined;
    
    // Polygon format: [x1,y1, x2,y2, x3,y3, x4,y4] (4 corners)
    const xs = [polygon[0], polygon[2], polygon[4], polygon[6]];
    const ys = [polygon[1], polygon[3], polygon[5], polygon[7]];
    
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    return {
      left: minX / pageWidth,
      top: minY / pageHeight,
      width: (maxX - minX) / pageWidth,
      height: (maxY - minY) / pageHeight,
    };
  };

  let readingOrder = 0;

  // Process paragraphs (filter by page)
  if (result.paragraphs) {
    result.paragraphs.forEach(para => {
      if (!isOnPage(para.boundingRegions)) return;

      const role = para.role || 'text';
      let type: LayoutElementType = 'text';
      
      if (role === 'title') type = 'title';
      else if (role === 'sectionHeading') type = 'title';
      else if (role === 'pageHeader') type = 'header';
      else if (role === 'pageFooter') type = 'footer';
      else if (role === 'footnote') type = 'caption';
      
      const polygon = getPolygonForPage(para.boundingRegions);
      const position = polygon ? polygonToPosition(polygon) : undefined;
      
      elements.push({
        type,
        content: para.content,
        position,
        readingOrder: readingOrder++,
      });
      
      if (type === 'title') {
        markdownParts.push(`# ${para.content}`);
      } else if (type === 'header' || type === 'footer') {
        markdownParts.push(`*${para.content}*`);
      } else {
        markdownParts.push(para.content);
      }
    });
  }

  // Process tables (filter by page)
  if (result.tables) {
    result.tables.forEach(table => {
      if (!isOnPage(table.boundingRegions)) return;

      const polygon = getPolygonForPage(table.boundingRegions);
      const position = polygon ? polygonToPosition(polygon) : undefined;

      // Build markdown table
      const rows: string[][] = [];
      for (let r = 0; r < table.rowCount; r++) {
        rows.push(new Array(table.columnCount).fill(''));
      }
      
      table.cells.forEach(cell => {
        if (rows[cell.rowIndex]) {
          rows[cell.rowIndex][cell.columnIndex] = cell.content;
        }
      });

      // Convert to markdown
      const headerRow = rows[0] || [];
      const mdHeader = `| ${headerRow.join(' | ')} |`;
      const mdSeparator = `| ${headerRow.map(() => '---').join(' | ')} |`;
      const mdBody = rows.slice(1).map(row => `| ${row.join(' | ')} |`).join('\n');
      const tableMarkdown = [mdHeader, mdSeparator, mdBody].join('\n');
      
      elements.push({
        type: 'table',
        content: tableMarkdown,
        position,
        readingOrder: readingOrder++,
      });
      
      markdownParts.push(tableMarkdown);
    });
  }

  // Process selection marks (for the target page)
  const targetPage = result.pages?.find((p: any) => p.pageNumber === pageNumber);
  if (targetPage?.selectionMarks) {
    targetPage.selectionMarks.forEach(mark => {
      const position = polygonToPosition(mark.polygon);
      
      elements.push({
        type: 'selectionMark',
        content: mark.state === 'selected' ? '[x]' : '[ ]',
        position,
        confidence: mark.confidence,
        readingOrder: readingOrder++,
      });
    });
  }

  // Process figures/images (detected by Azure Document Intelligence)
  if ((result as any).figures) {
    (result as any).figures.forEach((figure: any) => {
      if (!isOnPage(figure.boundingRegions)) return;

      const polygon = getPolygonForPage(figure.boundingRegions);
      const position = polygon ? polygonToPosition(polygon) : undefined;

      // Skip very small figures (likely decorative elements or icons)
      if (position && (position.width < 0.03 || position.height < 0.03)) return;

      const caption = figure.caption?.content || '';

      elements.push({
        type: 'image',
        content: caption || '[figure]',
        position,
        readingOrder: readingOrder++,
      });

      if (caption) {
        markdownParts.push(`![${caption}]`);
      }
    });
  }

  return {
    elements,
    markdown: markdownParts.join('\n\n'),
  };
}

/**
 * Convert layout elements to PDFme-compatible schema suggestions
 * Useful for AI to understand how to place elements based on extracted layout
 */
export function layoutToPdfmeHints(
  elements: LayoutElement[],
  pageWidth: number = 210,
  pageHeight: number = 297
): string {
  const hints: string[] = [];
  
  elements.forEach((el, i) => {
    if (!el.position) return;
    
    const x = Math.round(el.position.left * pageWidth);
    const y = Math.round(el.position.top * pageHeight);
    const w = Math.round(el.position.width * pageWidth);
    const h = Math.round(el.position.height * pageHeight);
    
    const typeMap: Record<LayoutElementType, string> = {
      text: 'text',
      title: 'text (large font)',
      table: 'table',
      image: 'image',
      chart: 'simplechart or image',
      formula: 'svg or image',
      header: 'text',
      footer: 'text',
      caption: 'text (small font)',
      list: 'text (bullet points)',
      code: 'text (monospace)',
      selectionMark: 'checkbox',
      unknown: 'unknown',
    };
    
    hints.push(`${i + 1}. ${typeMap[el.type]} at (${x}, ${y}) size ${w}×${h}mm: "${el.content.substring(0, 50)}..."`);
  });
  
  return hints.join('\n');
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Convert a File object to base64 string
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Extract base64 content without the data URI prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Get MIME type from file extension
 */
export const getMimeType = (filename: string): string => {
  const ext = filename.toLowerCase().split('.').pop();
  const mimeTypes: Record<string, string> = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'pdf': 'application/pdf',
    'tiff': 'image/tiff',
    'bmp': 'image/bmp',
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
};
