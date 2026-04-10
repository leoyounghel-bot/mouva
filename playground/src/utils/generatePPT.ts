/**
 * PPT Generation Utility
 * 
 * Uses html2canvas to capture the designer canvas as high-resolution images,
 * then embeds them into a PowerPoint presentation using pptxgenjs.
 * This approach ensures 100% visual fidelity with the original design.
 */

import html2canvas from 'html2canvas';
import PptxGenJS from 'pptxgenjs';
import type { Template } from '@pdfme/common';

/**
 * Elements to hide during capture (UI controls that shouldn't be in export)
 */
const UI_ELEMENTS_TO_HIDE = [
  // Preview/Edit buttons and download button
  '[id*="preview-download"]',
  'button[title="下载"]',
  // Floating control bar (zoom, page navigation)
  '[style*="position: fixed"]',
  '[style*="position:fixed"]',
  // Any element with ctlbar-like styling
  '[class*="ctlBar"]',
  '[class*="CtlBar"]',
  '[class*="control-bar"]',
  // Mode switcher buttons
  '[class*="mode-switcher"]',
  // Any fixed positioned overlays
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
    console.log(`[generatePPT] Resetting scale from ${originalScale} to 1.0 for capture`);
    scaledElement.style.transform = 'scale(1)';
  }
  
  return { scaledElement, originalTransform, originalScale };
}

/**
 * Restore the original scale after capture
 */
function restoreScale(scaleInfo: { scaledElement: HTMLElement | null; originalTransform: string; originalScale: number }): void {
  if (scaleInfo.scaledElement && scaleInfo.originalScale !== 1) {
    console.log(`[generatePPT] Restoring scale to ${scaleInfo.originalScale}`);
    scaleInfo.scaledElement.style.transform = scaleInfo.originalTransform;
  }
}

/**
 * Temporarily hide UI elements and return a restore function
 */
function hideUIElements(container: HTMLElement): () => void {
  const hiddenElements: { element: HTMLElement; originalDisplay: string }[] = [];
  
  // Hide elements matching our selectors
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
  
  // Also find and hide elements inside/near the container that look like UI controls
  // Look for fixed/absolute positioned elements with button-like appearance
  const allButtons = container.querySelectorAll('button');
  allButtons.forEach(btn => {
    const rect = btn.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    // Hide buttons that are positioned outside the paper content area
    if (rect.bottom < containerRect.top + 100 || rect.top > containerRect.bottom - 100) {
      hiddenElements.push({
        element: btn as HTMLElement,
        originalDisplay: (btn as HTMLElement).style.display
      });
      (btn as HTMLElement).style.display = 'none';
    }
  });
  
  // Return restore function
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
    // Paper elements have specific dimensions and background
    if (style.backgroundSize && style.width && style.height) {
      pages.push(div as HTMLElement);
    }
  });
  
  if (pages.length > 0) {
    console.log(`[generatePPT] Found ${pages.length} pages via backgroundImage`);
    return pages;
  }
  
  // Method 2: Find elements with specific paper-like styling
  const paperLikeElements = container.querySelectorAll('div[style*="boxShadow"]');
  paperLikeElements.forEach(el => {
    const htmlEl = el as HTMLElement;
    // Check if it looks like a paper element
    if (htmlEl.offsetWidth > 200 && htmlEl.offsetHeight > 200) {
      pages.push(htmlEl);
    }
  });
  
  if (pages.length > 0) {
    console.log(`[generatePPT] Found ${pages.length} pages via boxShadow`);
    return pages;
  }
  
  // Method 3: Fallback - find the main content container
  // Look for the scaled container (Paper wrapper)
  const scaledContainer = container.querySelector('div[style*="transform: scale"]');
  if (scaledContainer) {
    // Get direct children that look like pages
    const children = scaledContainer.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement;
      if (child.offsetWidth > 200 && child.offsetHeight > 200) {
        pages.push(child);
      }
    }
  }
  
  if (pages.length > 0) {
    console.log(`[generatePPT] Found ${pages.length} pages via scaled container`);
    return pages;
  }
  
  // Final fallback: use container itself
  console.log('[generatePPT] Using container as single page');
  return [container];
}

/**
 * Generate a PowerPoint file from the designer canvas.
 * 
 * @param container - The DOM container of the Designer component
 * @param template - The current template with basePdf dimensions
 * @param filename - Output filename (without extension)
 */
export async function generatePPT(
  container: HTMLElement,
  template: Template,
  filename = 'presentation'
): Promise<void> {
  // 1. Get paper dimensions from template (in mm)
  let widthMm = 339;  // Default PPT 16:9
  let heightMm = 191;
  
  if (typeof template.basePdf === 'object' && 'width' in template.basePdf) {
    widthMm = template.basePdf.width;
    heightMm = template.basePdf.height;
  }
  
  // Convert mm to inches (PowerPoint uses inches)
  const widthInch = widthMm / 25.4;
  const heightInch = heightMm / 25.4;
  
  console.log(`[generatePPT] Paper size: ${widthMm}×${heightMm}mm = ${widthInch.toFixed(2)}×${heightInch.toFixed(2)}in`);

  // 2. Hide UI elements before capture
  console.log('[generatePPT] Hiding UI elements...');
  const restoreUI = hideUIElements(container);
  
  // 3. Reset scale to 1.0 for accurate text rendering (declared outside try for finally access)
  console.log('[generatePPT] Resetting scale for accurate capture...');
  const scaleInfo = resetScaleForCapture(container);
  
  try {
    
    // Wait a frame for the DOM to update after scale change
    await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 100)));
    
    // 4. Find page elements
    const pages = findPageElements(container);
    
    if (pages.length === 0) {
      throw new Error('No renderable pages found in the designer container');
    }
    
    console.log(`[generatePPT] Capturing ${pages.length} page(s)...`);

    // 4. Capture each page as a high-resolution image
    const images: string[] = [];
    
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      console.log(`[generatePPT] Capturing page ${i + 1}...`);
      
      const canvas = await html2canvas(page, {
        scale: 3,  // High resolution (3x)
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        // Ignore UI elements during capture
        ignoreElements: (element) => {
          // Ignore buttons and controls
          if (element.tagName === 'BUTTON') return true;
          // Ignore fixed positioned elements
          const style = window.getComputedStyle(element);
          if (style.position === 'fixed') return true;
          return false;
        },
      });
      
      const dataUrl = canvas.toDataURL('image/png');
      images.push(dataUrl);
      console.log(`[generatePPT] Page ${i + 1} captured successfully`);
    }

    // 5. Create PowerPoint presentation
    console.log('[generatePPT] Creating PPTX...');
    const pptx = new PptxGenJS();
    
    // Set custom slide size to match the paper dimensions
    pptx.defineLayout({
      name: 'CUSTOM',
      width: widthInch,
      height: heightInch,
    });
    pptx.layout = 'CUSTOM';
    
    // Set presentation title
    pptx.title = filename;
    pptx.author = 'AI Designer';

    // 6. Add each captured image as a slide
    for (let i = 0; i < images.length; i++) {
      const slide = pptx.addSlide();
      
      // Add the image as a full-page background
      slide.addImage({
        data: images[i],
        x: 0,
        y: 0,
        w: '100%',
        h: '100%',
      });
      
      console.log(`[generatePPT] Added slide ${i + 1}`);
    }

    // 7. Save and download the file
    console.log('[generatePPT] Writing file...');
    await pptx.writeFile({ fileName: `${filename}.pptx` });
    console.log('[generatePPT] Download complete!');
    
  } finally {
    // 8. Restore scale and UI elements
    console.log('[generatePPT] Restoring scale and UI elements...');
    restoreScale(scaleInfo);
    restoreUI();
  }
}

export default generatePPT;
