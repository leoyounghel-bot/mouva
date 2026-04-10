/**
 * Image Generation Utility
 * 
 * Uses html2canvas to capture the designer canvas as high-resolution PNG/JPG images.
 * This is ideal for social media exports where image format is preferred.
 */

import html2canvas from 'html2canvas';
import type { Template } from '@pdfme/common';

export type ImageFormat = 'png' | 'jpg';

/**
 * Elements to hide during capture (UI controls that shouldn't be in export)
 */
const UI_ELEMENTS_TO_HIDE = [
  '[id*="preview-download"]',
  'button[title="下载"]',
  '[style*="position: fixed"]',
  '[style*="position:fixed"]',
  '[class*="ctlBar"]',
  '[class*="CtlBar"]',
  '[class*="control-bar"]',
  '[class*="mode-switcher"]',
  '.ant-float-btn',
  '.ant-float-btn-group',
];

/**
 * Find the scaled container and temporarily reset its scale to 1.0 for accurate capture.
 * Returns the original scale value for restoration.
 */
function resetScaleForCapture(container: HTMLElement): { scaledElement: HTMLElement | null; originalTransform: string; originalScale: number } {
  // Find the element with transform: scale(...)
  const scaledElement = container.querySelector('div[style*="transform"]') as HTMLElement;
  
  if (!scaledElement) {
    return { scaledElement: null, originalTransform: '', originalScale: 1 };
  }
  
  const styleAttr = scaledElement.getAttribute('style') || '';
  const scaleMatch = styleAttr.match(/transform:\s*scale\(([\d.]+)\)/);
  const originalScale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;
  const originalTransform = scaledElement.style.transform;
  
  // Reset scale to 1.0 for accurate capture
  if (originalScale !== 1) {
    console.log(`[generateImage] Resetting scale from ${originalScale} to 1.0 for capture`);
    scaledElement.style.transform = 'scale(1)';
  }
  
  return { scaledElement, originalTransform, originalScale };
}

/**
 * Restore the original scale after capture
 */
function restoreScale(scaleInfo: { scaledElement: HTMLElement | null; originalTransform: string; originalScale: number }): void {
  if (scaleInfo.scaledElement && scaleInfo.originalScale !== 1) {
    console.log(`[generateImage] Restoring scale to ${scaleInfo.originalScale}`);
    scaleInfo.scaledElement.style.transform = scaleInfo.originalTransform;
  }
}

/**
 * Temporarily hide UI elements and return a restore function
 */
function hideUIElements(): () => void {
  const hiddenElements: { element: HTMLElement; originalDisplay: string }[] = [];
  
  UI_ELEMENTS_TO_HIDE.forEach(selector => {
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.style) {
          hiddenElements.push({
            element: htmlEl,
            originalDisplay: htmlEl.style.display
          });
          htmlEl.style.display = 'none';
        }
      });
    } catch (e) {
      // Ignore invalid selectors
    }
  });
  
  return () => {
    hiddenElements.forEach(({ element, originalDisplay }) => {
      element.style.display = originalDisplay;
    });
  };
}

/**
 * Find the actual page/paper elements within the container
 */
function findPageElements(container: HTMLElement): HTMLElement[] {
  const pages: HTMLElement[] = [];
  
  // Method 1: Find elements with backgroundImage (Paper component style)
  const allDivs = container.querySelectorAll('div[style*="backgroundImage"]');
  allDivs.forEach(div => {
    const style = (div as HTMLElement).style;
    if (style.backgroundSize && style.width && style.height) {
      pages.push(div as HTMLElement);
    }
  });
  
  if (pages.length > 0) {
    return pages;
  }
  
  // Method 2: Find elements with paper-like styling
  const paperLikeElements = container.querySelectorAll('div[style*="boxShadow"]');
  paperLikeElements.forEach(el => {
    const htmlEl = el as HTMLElement;
    if (htmlEl.offsetWidth > 200 && htmlEl.offsetHeight > 200) {
      pages.push(htmlEl);
    }
  });
  
  if (pages.length > 0) {
    return pages;
  }
  
  // Method 3: Fallback - find the scaled container
  const scaledContainer = container.querySelector('div[style*="transform: scale"]');
  if (scaledContainer) {
    const children = scaledContainer.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement;
      if (child.offsetWidth > 200 && child.offsetHeight > 200) {
        pages.push(child);
      }
    }
  }
  
  if (pages.length > 0) {
    return pages;
  }
  
  // Final fallback
  return [container];
}

/**
 * Generate and download images from the designer canvas.
 * 
 * @param container - The DOM container of the Designer component
 * @param template - The current template (for metadata)
 * @param filename - Output filename (without extension)
 * @param format - Image format: 'png' or 'jpg'
 * @param quality - JPEG quality (0-1), only applies to 'jpg' format
 */
export async function generateImage(
  container: HTMLElement,
  _template: Template,
  filename = 'design',
  format: ImageFormat = 'png',
  quality = 0.95
): Promise<void> {
  console.log(`[generateImage] Starting ${format.toUpperCase()} export...`);

  // Hide UI elements before capture
  const restoreUI = hideUIElements();
  
  // Reset scale to 1.0 for accurate text rendering
  console.log('[generateImage] Resetting scale for accurate capture...');
  const scaleInfo = resetScaleForCapture(container);
  
  try {
    // Wait a frame for the DOM to update after scale change
    await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 100)));
    
    // Find page elements
    const pages = findPageElements(container);
    
    if (pages.length === 0) {
      throw new Error('No renderable pages found in the designer container');
    }
    
    console.log(`[generateImage] Found ${pages.length} page(s) to capture`);

    // Capture each page and download
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      console.log(`[generateImage] Capturing page ${i + 1}...`);
      
      const canvas = await html2canvas(page, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        ignoreElements: (element) => {
          if (element.tagName === 'BUTTON') return true;
          const style = window.getComputedStyle(element);
          if (style.position === 'fixed') return true;
          return false;
        },
      });
      
      // Convert to data URL and download - more reliable for filename preservation
      const extension = format === 'jpg' ? 'jpg' : 'png';
      const pageFilename = pages.length > 1 ? `${filename}-page${i + 1}.${extension}` : `${filename}.${extension}`;
      
      // Use toDataURL for reliable download with proper filename
      const dataUrl = format === 'jpg' 
        ? canvas.toDataURL('image/jpeg', quality) 
        : canvas.toDataURL('image/png');
      
      // Create download link with data URL (not blob URL)
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = pageFilename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      // Small delay before cleanup to ensure download starts
      await new Promise(resolve => setTimeout(resolve, 100));
      document.body.removeChild(link);
      
      console.log(`[generateImage] Downloaded: ${pageFilename}`);
    }
    
    console.log('[generateImage] Export complete!');
    
  } finally {
    // Restore scale and UI elements
    console.log('[generateImage] Restoring scale and UI elements...');
    restoreScale(scaleInfo);
    restoreUI();
  }
}

export default generateImage;

