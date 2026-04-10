import { z } from 'zod';

// --- Color Name to Hex Mapping ---
// bwip-js and pdfme require hex colors, not CSS color names
const colorNameToHex: Record<string, string> = {
  white: '#ffffff',
  black: '#000000',
  red: '#ff0000',
  green: '#00ff00',
  blue: '#0000ff',
  yellow: '#ffff00',
  orange: '#ffa500',
  purple: '#800080',
  pink: '#ffc0cb',
  gray: '#808080',
  grey: '#808080',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  transparent: '',
};

/**
 * Convert color name to hex color code
 * If already a hex color or unknown name, return as-is
 */
const normalizeColor = (color: string | undefined): string | undefined => {
  if (!color) return undefined;
  const lowerColor = color.toLowerCase().trim();
  if (colorNameToHex[lowerColor] !== undefined) {
    return colorNameToHex[lowerColor];
  }
  // Already hex or other format, return as-is
  return color;
};

// --- Strict Validation Schemas ---

export const AiSchemaItem = z.object({
  name: z.string().min(1).optional(), // Optional - name can be generated if missing
  type: z.string().min(1),
  position: z.object({ x: z.number(), y: z.number() }),
  width: z.number().positive(),
  height: z.number().positive(),
  content: z.union([z.string(), z.record(z.string(), z.any()), z.array(z.any())]).optional(),
  fontSize: z.number().optional(),
  fontName: z.string().optional(),
  alignment: z.enum(['left', 'center', 'right', 'justify']).optional(),
  verticalAlignment: z.enum(['top', 'middle', 'bottom']).optional(),
  backgroundColor: z.string().optional(),
  fontColor: z.string().optional(),
  rotate: z.number().optional(),
  opacity: z.number().optional(),
}).passthrough();

// Schema for Record format: { "field_name": { type, position, ... } }
export const AiSchemaRecord = z.record(z.string(), z.object({
  type: z.string().min(1),
  position: z.object({ x: z.number(), y: z.number() }),
  width: z.number().positive(),
  height: z.number().positive(),
  content: z.union([z.string(), z.record(z.string(), z.any()), z.array(z.any())]).optional(),
  fontSize: z.number().optional(),
  fontName: z.string().optional(),
  alignment: z.enum(['left', 'center', 'right', 'justify']).optional(),
  verticalAlignment: z.enum(['top', 'middle', 'bottom']).optional(),
  backgroundColor: z.string().optional(),
  fontColor: z.string().optional(),
  rotate: z.number().optional(),
  opacity: z.number().optional(),
}).passthrough());

// Page can be either array of items (with "name" field) or a record (field name is key)
export const AiPageSchema = z.union([
  z.array(AiSchemaItem),  // Array format: [{ name, type, ... }]
  AiSchemaRecord,         // Record format: { "fieldName": { type, ... } }
]);

export const AiTemplateSchema = z.object({
  basePdf: z.object({
    width: z.number(),
    height: z.number(),
    padding: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  }).optional(), // Optional because we might merge with existing
  schemas: z.array(AiPageSchema),
});

/**
 * Page size configuration for boundary validation
 */
export interface PageSize {
  width: number;
  height: number;
}

/**
 * Validates and fixes the AI-generated schema.
 * 1. Enforces unique names.
 * 2. Ensures required fields are present (handled by Zod, but we double-check defaults).
 * 3. Validates and fixes element positions to stay within page boundaries.
 * 4. Normalizes element-specific properties (colors, table content, etc.)
 */
export const validateAndFixSchemas = (schemas: any[][], pageSize?: PageSize): any[][] => {
  const nameMap = new Map<string, number>();
  
  // Default to A4 size if not provided
  const { width: pageWidth, height: pageHeight } = pageSize || { width: 210, height: 297 };
  
  return schemas.map(page => {
    if (!Array.isArray(page)) return [];
    
    return page.map(item => {
      // Fix name uniqueness
      let originalName = item.name || 'field';
      let finalName = originalName;
      
      if (nameMap.has(originalName)) {
        const count = nameMap.get(originalName)!;
        nameMap.set(originalName, count + 1);
        finalName = `${originalName}_${count}`;
      } else {
        nameMap.set(originalName, 1);
      }
      
      const subtype = (item.type || '').toLowerCase();
      
      // === TYPE-SPECIFIC NORMALIZATIONS ===
      
      // --- Rectangle/Ellipse: Map "backgroundColor" to "color" ---
      // pdfme shapes expect "color" for fill, AI often generates "backgroundColor"
      let normalizedItem = { ...item };
      if (subtype === 'rectangle' || subtype === 'ellipse') {
        if (item.backgroundColor && !item.color) {
          normalizedItem.color = normalizeColor(item.backgroundColor);
          delete normalizedItem.backgroundColor;
        }
        // Normalize existing color
        if (normalizedItem.color) {
          normalizedItem.color = normalizeColor(normalizedItem.color);
        }
        // Normalize borderColor
        if (normalizedItem.borderColor) {
          normalizedItem.borderColor = normalizeColor(normalizedItem.borderColor);
        }
        // Ensure borderWidth defaults (pdfme shapes require it)
        if (normalizedItem.borderWidth === undefined) {
          normalizedItem.borderWidth = 0;
        }
      }
      
      // --- QR Code/Barcodes: Normalize colors to hex ---
      // bwip-js crashes on color names like "white", need hex values
      if (['qrcode', 'code128', 'ean13', 'ean8', 'upca', 'upce', 'itf14', 'code39', 'nw7', 'japanpost', 'gs1datamatrix', 'pdf417'].includes(subtype)) {
        if (normalizedItem.backgroundColor) {
          normalizedItem.backgroundColor = normalizeColor(normalizedItem.backgroundColor) || '#ffffff';
        }
        if (normalizedItem.barColor) {
          normalizedItem.barColor = normalizeColor(normalizedItem.barColor) || '#000000';
        }
        if (normalizedItem.color) {
          normalizedItem.color = normalizeColor(normalizedItem.color);
        }
      }
      
      // --- Table: Convert headers/rows to pdfme table format ---
      // AI generates: { headers: [...], rows: [[...], [...]] }
      // pdfme expects:
      //   - schema.head = ["Header1", "Header2"]  (direct string array)
      //   - schema.content = '[["A", "B"]]'       (JSON string of body rows only)
      if (subtype === 'table') {
        // DEBUG: Log what AI actually generated for table
        console.log('[Table Debug] Raw AI table data:', JSON.stringify({
          head: normalizedItem.head,
          headers: normalizedItem.headers,
          content: normalizedItem.content,
          rows: normalizedItem.rows,
          body: normalizedItem.body,
        }, null, 2));
        
        // CASE 1: AI used "headers" and "rows" format
        if (normalizedItem.headers && Array.isArray(normalizedItem.headers)) {
          // Ensure headers are plain strings (not objects)
          const head = normalizedItem.headers.map((h: unknown) => {
            if (typeof h === 'string') return h;
            if (h && typeof h === 'object' && 'content' in h) return String((h as any).content || '');
            return String(h || '');
          });
          // Ensure body rows are plain strings (not objects)
          const bodyRaw = normalizedItem.rows || [['']];
          const body = Array.isArray(bodyRaw) ? bodyRaw.map((row: unknown[]) => {
            if (!Array.isArray(row)) return [''];
            return row.map((cell: unknown) => {
              if (typeof cell === 'string') return cell;
              if (cell && typeof cell === 'object' && 'content' in cell) return String((cell as any).content || '');
              return String(cell || '');
            });
          }) : [['']];
          // Set head as direct array property
          normalizedItem.head = head;
          // Set content as JSON string of body only
          normalizedItem.content = JSON.stringify(body);
          // Calculate head width percentages
          normalizedItem.headWidthPercentages = head.map(() => 100 / head.length);
          // Clean up AI-specific properties
          delete normalizedItem.headers;
          delete normalizedItem.rows;
          delete normalizedItem.headerStyle;
          delete normalizedItem.rowStyle;
          console.log('[Table Debug] Processed from headers/rows format:', { head, content: normalizedItem.content });
        } 
        // CASE 2: AI used "head" and "body" format (without content wrapper)
        else if (normalizedItem.head && Array.isArray(normalizedItem.head) && normalizedItem.body && Array.isArray(normalizedItem.body)) {
          const head = normalizedItem.head.map((h: unknown) => {
            if (typeof h === 'string') return h;
            if (h && typeof h === 'object' && 'content' in h) return String((h as any).content || '');
            return String(h || '');
          });
          const body = normalizedItem.body.map((row: unknown) => {
            if (!Array.isArray(row)) return [''];
            return (row as unknown[]).map((cell: unknown) => {
              if (typeof cell === 'string') return cell;
              if (cell && typeof cell === 'object' && 'content' in cell) return String((cell as any).content || '');
              return String(cell || '');
            });
          });
          normalizedItem.head = head;
          normalizedItem.content = JSON.stringify(body);
          normalizedItem.headWidthPercentages = head.map(() => 100 / head.length);
          delete normalizedItem.body;
          console.log('[Table Debug] Processed from head/body format:', { head, content: normalizedItem.content });
        }
        // CASE 3: AI generated 'head' or 'content' directly
        else {
            // Case: AI generated 'head' or 'content' directly but might have rich objects
            if (normalizedItem.head && Array.isArray(normalizedItem.head)) {
                 normalizedItem.head = normalizedItem.head.map((h: unknown) => {
                    if (typeof h === 'string') return h;
                    if (h && typeof h === 'object' && 'content' in h) return String((h as any).content || '');
                    return String(h || '');
                });
            }

            // Ensure content is a JSON string of string[][] (if it's an array or object)
            if (normalizedItem.content && typeof normalizedItem.content !== 'string') {
                 try {
                     // Check if content is {head: [...], body: [...]} object format
                     if (!Array.isArray(normalizedItem.content) && 
                         typeof normalizedItem.content === 'object' &&
                         'body' in normalizedItem.content) {
                          // Extract head and body from the object
                          const contentObj = normalizedItem.content as { head?: unknown[]; body?: unknown[][] };
                          if (contentObj.head && Array.isArray(contentObj.head)) {
                              normalizedItem.head = contentObj.head.map((h: unknown) => {
                                  if (typeof h === 'string') return h;
                                  if (h && typeof h === 'object' && 'content' in h) return String((h as any).content || '');
                                  return String(h || '');
                              });
                          }
                          const body = contentObj.body || [['']];
                          const sanitizedBody = Array.isArray(body) ? body.map((row: unknown) => {
                              if (!Array.isArray(row)) return [''];
                              return row.map((cell: unknown) => {
                                  if (typeof cell === 'string') return cell;
                                  if (cell && typeof cell === 'object' && 'content' in cell) return String((cell as any).content || '');
                                  return String(cell || '');
                              });
                          }) : [['']];
                          normalizedItem.content = JSON.stringify(sanitizedBody);
                          // Calculate head width percentages if head was extracted
                          if (normalizedItem.head && normalizedItem.head.length > 0) {
                              normalizedItem.headWidthPercentages = normalizedItem.head.map(() => 100 / normalizedItem.head.length);
                          }
                     } else if (Array.isArray(normalizedItem.content)) {
                          // If it is array (likely body), sanitize it
                          const sanitizedBody = normalizedItem.content.map((row: unknown) => {
                                if (!Array.isArray(row)) return [''];
                                return row.map((cell: unknown) => {
                                    if (typeof cell === 'string') return cell;
                                    if (cell && typeof cell === 'object' && 'content' in cell) return String((cell as any).content || '');
                                    return String(cell || '');
                                });
                          });
                          normalizedItem.content = JSON.stringify(sanitizedBody);
                     } else {
                          // Fallback
                          normalizedItem.content = JSON.stringify([['']]);
                     }
                 } catch (e) {
                     normalizedItem.content = JSON.stringify([['']]);
                 }
            } else if (normalizedItem.content && typeof normalizedItem.content === 'string') {
                // CRITICAL FIX: Handle the case where content is a string containing {head, body} JSON
                // AI often returns: content: '{"head":["A","B"],"body":[["1","2"]]}'
                // pdfme expects: content = '[["1","2"]]' (body only) and head as separate property
                try {
                    const parsed = JSON.parse(normalizedItem.content);
                    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'body' in parsed) {
                        // It's {head, body} format - extract and transform
                        if (parsed.head && Array.isArray(parsed.head)) {
                            normalizedItem.head = parsed.head.map((h: unknown) => {
                                if (typeof h === 'string') return h;
                                if (h && typeof h === 'object' && 'content' in h) return String((h as any).content || '');
                                return String(h || '');
                            });
                        }
                        const body = parsed.body || [['']];
                        const sanitizedBody = Array.isArray(body) ? body.map((row: unknown) => {
                            if (!Array.isArray(row)) return [''];
                            return row.map((cell: unknown) => {
                                if (typeof cell === 'string') return cell;
                                if (cell && typeof cell === 'object' && 'content' in cell) return String((cell as any).content || '');
                                return String(cell || '');
                            });
                        }) : [['']];
                        normalizedItem.content = JSON.stringify(sanitizedBody);
                        // Calculate head width percentages if head was extracted
                        if (normalizedItem.head && normalizedItem.head.length > 0) {
                            normalizedItem.headWidthPercentages = normalizedItem.head.map(() => 100 / normalizedItem.head.length);
                        }
                    }
                    // Otherwise it's already in correct format (array of arrays), keep as is
                } catch (e) {
                    // JSON parse failed, leave content as is (might be non-JSON string)
                }
            }
        }
      }

      
      // Ensure "content" is not empty for text/barcode types
      let finalContent = normalizedItem.content;
      
      if (!finalContent || (typeof finalContent === 'string' && finalContent.trim() === '')) {
        if (['text', 'multivariabletext', 'date', 'time', 'datetime'].includes(subtype)) {
           finalContent = normalizedItem.name || 'Text';
        } else if (['qrcode', 'code128', 'ean13'].includes(subtype)) {
           finalContent = '123456789';
        } else if (subtype === 'image') {
           // Leave empty for image placeholders if not generated yet
        } else if (subtype === 'table') {
           // For table: only set fallback if NO head was provided
           // If AI provided head, generate sample content matching column count
           if (!normalizedItem.head || !Array.isArray(normalizedItem.head) || normalizedItem.head.length === 0) {
             // Use professional placeholder data for table without headers
             normalizedItem.head = ['Item', 'Description', 'Amount'];
             normalizedItem.headWidthPercentages = [25, 50, 25];
             normalizedItem.showHead = true;
             finalContent = JSON.stringify([
               ['Item 1', 'Description text', '$100.00'],
               ['Item 2', 'Another description', '$200.00']
             ]);
           } else {
             // Head exists but content is empty - generate sample content matching column count
             const colCount = normalizedItem.head.length;
             const sampleRow1 = Array.from({ length: colCount }, (_, i) => `Row 1 Col ${i + 1}`);
             const sampleRow2 = Array.from({ length: colCount }, (_, i) => `Row 2 Col ${i + 1}`);
             finalContent = JSON.stringify([sampleRow1, sampleRow2]);
             // Ensure headWidthPercentages is set
             if (!normalizedItem.headWidthPercentages || normalizedItem.headWidthPercentages.length !== colCount) {
               normalizedItem.headWidthPercentages = Array.from({ length: colCount }, () => 100 / colCount);
             }
             // Ensure showHead is set for visibility
             if (normalizedItem.showHead === undefined) {
               normalizedItem.showHead = true;
             }
           }
        }
      }


      // Ensure visual visibility (no white-on-white by default)
      const finalFontColor = normalizeColor(normalizedItem.fontColor) || '#000000';
      
      // Ensure defaults for dimensions
      let finalWidth = normalizedItem.width || 50;
      let finalHeight = normalizedItem.height || 20;
      
      // BOUNDARY VALIDATION: Ensure element stays within page boundaries
      let finalX = normalizedItem.position?.x ?? 0;
      let finalY = normalizedItem.position?.y ?? 0;
      
      // Ensure position.x >= 0
      if (finalX < 0) {
        finalX = 0;
      }
      
      // Ensure position.y >= 0
      if (finalY < 0) {
        finalY = 0;
      }
      
      // Ensure element width doesn't exceed page width
      if (finalWidth > pageWidth) {
        finalWidth = pageWidth;
      }
      
      // Ensure element height doesn't exceed page height
      if (finalHeight > pageHeight) {
        finalHeight = pageHeight;
      }
      
      // Ensure position.x + width <= pageWidth
      if (finalX + finalWidth > pageWidth) {
        finalX = Math.max(0, pageWidth - finalWidth);
      }
      
      // Ensure position.y + height <= pageHeight
      if (finalY + finalHeight > pageHeight) {
        finalY = Math.max(0, pageHeight - finalHeight);
      }
      
      return {
        ...normalizedItem,
        name: finalName,
        content: finalContent,
        fontColor: finalFontColor,
        position: { x: finalX, y: finalY },
        width: finalWidth,
        height: finalHeight,
        opacity: normalizedItem.opacity ?? 1,
        rotate: normalizedItem.rotate ?? 0,
      };
    });
  });
};
