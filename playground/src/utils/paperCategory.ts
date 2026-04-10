/**
 * Paper Category Detection Utility
 * 
 * Determines what download formats are available based on paper type:
 * - Social Media (Instagram, WeChat, Xiaohongshu): Image + PDF only
 * - Presentations (PPT): PPT + PDF only  
 * - Standard/Cards/Other: All formats (PDF, PPT, Image)
 */

import type { Template } from '@pdfme/common';

export type DownloadFormat = 'pdf' | 'ppt' | 'image';
export type PaperCategory = 'social' | 'presentation' | 'standard';

/**
 * Paper dimensions that indicate social media formats
 */
const SOCIAL_MEDIA_SIZES = [
  // Instagram
  { width: 150, height: 150, name: 'Instagram Post' },
  { width: 150, height: 188, name: 'Instagram Portrait' },
  { width: 150, height: 267, name: 'Instagram Story' },
  // WeChat
  { width: 150, height: 150, name: 'WeChat Moments' },
  // Xiaohongshu
  { width: 150, height: 200, name: 'Xiaohongshu Post' },
  { width: 150, height: 267, name: 'Xiaohongshu Story' },
  // Cover Photo
  { width: 200, height: 75, name: 'Cover Photo' },
];

/**
 * Paper dimensions that indicate presentation formats
 */
const PRESENTATION_SIZES = [
  { width: 339, height: 191, name: 'PPT 16:9' },
  { width: 254, height: 191, name: 'PPT 4:3' },
  { width: 254, height: 159, name: 'PPT 16:10' },
  { width: 338.7, height: 190.5, name: 'PPT 16:9' },
  { width: 254, height: 190.5, name: 'PPT 4:3' },
];

/**
 * Tolerance for dimension matching (in mm)
 */
const SIZE_TOLERANCE = 5;

/**
 * Check if two dimensions match within tolerance
 */
function sizesMatch(a: number, b: number): boolean {
  return Math.abs(a - b) <= SIZE_TOLERANCE;
}

/**
 * Detect the paper category based on template basePdf dimensions
 */
export function detectPaperCategory(template: Template): PaperCategory {
  if (typeof template.basePdf !== 'object' || !('width' in template.basePdf)) {
    return 'standard';
  }
  
  const { width, height } = template.basePdf;
  
  // Check social media sizes
  for (const size of SOCIAL_MEDIA_SIZES) {
    if (sizesMatch(width, size.width) && sizesMatch(height, size.height)) {
      console.log(`[PaperCategory] Detected social media: ${size.name}`);
      return 'social';
    }
  }
  
  // Check presentation sizes
  for (const size of PRESENTATION_SIZES) {
    if (sizesMatch(width, size.width) && sizesMatch(height, size.height)) {
      console.log(`[PaperCategory] Detected presentation: ${size.name}`);
      return 'presentation';
    }
  }
  
  console.log(`[PaperCategory] Detected standard paper: ${width}×${height}mm`);
  return 'standard';
}

/**
 * Get available download formats based on paper category
 * 
 * - social: Image + PDF (社交媒体)
 * - presentation: PPT + PDF + Image (演示文稿，全部格式)
 * - standard: PDF + Image (标准/卡片/其他，无PPT)
 */
export function getAvailableFormats(category: PaperCategory): DownloadFormat[] {
  switch (category) {
    case 'social':
      return ['image', 'pdf'];
    case 'presentation':
      return ['ppt', 'pdf', 'image'];  // PPT类支持所有格式
    case 'standard':
    default:
      return ['pdf', 'image'];  // 标准类不支持PPT
  }
}

/**
 * Convenience function to check if a format is available for the given template
 */
export function isFormatAvailable(template: Template, format: DownloadFormat): boolean {
  const category = detectPaperCategory(template);
  const formats = getAvailableFormats(category);
  return formats.includes(format);
}
