/**
 * SVG Export Utility
 * 
 * Captures the designer canvas as SVG by:
 * 1. Using html2canvas to capture each page as a high-res PNG
 * 2. Embedding the raster data inside an SVG wrapper
 * 
 * This ensures 100% visual fidelity with the original design,
 * including text effects, gradients, and complex elements.
 */

import html2canvas from 'html2canvas';
import type { Template } from '@pdfme/common';

/**
 * Elements to hide during capture
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

function resetScaleForCapture(container: HTMLElement) {
  const scaledElement = container.querySelector('div[style*="transform"]') as HTMLElement;
  if (!scaledElement) return { scaledElement: null, originalTransform: '', originalScale: 1 };
  
  const styleAttr = scaledElement.getAttribute('style') || '';
  const scaleMatch = styleAttr.match(/transform:\s*scale\(([\d.]+)\)/);
  const originalScale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;
  const originalTransform = scaledElement.style.transform;
  
  if (originalScale !== 1) {
    scaledElement.style.transform = 'scale(1)';
  }
  
  return { scaledElement, originalTransform, originalScale };
}

function restoreScale(scaleInfo: { scaledElement: HTMLElement | null; originalTransform: string; originalScale: number }) {
  if (scaleInfo.scaledElement && scaleInfo.originalScale !== 1) {
    scaleInfo.scaledElement.style.transform = scaleInfo.originalTransform;
  }
}

function hideUIElements(): () => void {
  const hiddenElements: { element: HTMLElement; originalDisplay: string }[] = [];
  
  UI_ELEMENTS_TO_HIDE.forEach(selector => {
    try {
      document.querySelectorAll(selector).forEach(el => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.style) {
          hiddenElements.push({ element: htmlEl, originalDisplay: htmlEl.style.display });
          htmlEl.style.display = 'none';
        }
      });
    } catch (_) { /* ignore */ }
  });
  
  return () => {
    hiddenElements.forEach(({ element, originalDisplay }) => {
      element.style.display = originalDisplay;
    });
  };
}

function findPageElements(container: HTMLElement): HTMLElement[] {
  // Method 1: elements with backgroundImage (Paper component)
  const bgPages: HTMLElement[] = [];
  container.querySelectorAll('div[style*="backgroundImage"]').forEach(div => {
    const style = (div as HTMLElement).style;
    if (style.backgroundSize && style.width && style.height) {
      bgPages.push(div as HTMLElement);
    }
  });
  if (bgPages.length > 0) return bgPages;

  // Method 2: shadow-based paper elements
  const shadowPages: HTMLElement[] = [];
  container.querySelectorAll('div[style*="boxShadow"]').forEach(el => {
    const htmlEl = el as HTMLElement;
    if (htmlEl.offsetWidth > 200 && htmlEl.offsetHeight > 200) {
      shadowPages.push(htmlEl);
    }
  });
  if (shadowPages.length > 0) return shadowPages;

  // Method 3: scaled container children
  const scaled = container.querySelector('div[style*="transform: scale"]');
  if (scaled) {
    const children: HTMLElement[] = [];
    for (let i = 0; i < scaled.children.length; i++) {
      const child = scaled.children[i] as HTMLElement;
      if (child.offsetWidth > 200 && child.offsetHeight > 200) children.push(child);
    }
    if (children.length > 0) return children;
  }

  return [container];
}

/**
 * Generate and download SVG from the designer canvas.
 * 
 * Strategy: Capture with html2canvas for pixel-perfect fidelity,
 * then wrap the raster image inside an SVG container. This ensures
 * all complex elements (artText, tables, etc.) render correctly.
 */
export async function generateSVG(
  container: HTMLElement,
  template: Template,
  filename = 'design'
): Promise<void> {
  console.log('[generateSVG] Starting SVG export...');

  const restoreUI = hideUIElements();
  const scaleInfo = resetScaleForCapture(container);

  try {
    await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 100)));
    
    const pages = findPageElements(container);
    if (pages.length === 0) throw new Error('No renderable pages found');

    console.log(`[generateSVG] Found ${pages.length} page(s) to capture`);

    // Get paper dimensions from template
    const basePdf = template.basePdf as any;
    const paperWidthMM = basePdf?.width || 210;
    const paperHeightMM = basePdf?.height || 297;

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      console.log(`[generateSVG] Capturing page ${i + 1}...`);

      // Capture at 3x resolution for high quality
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

      // Get the raster data as PNG
      const dataUrl = canvas.toDataURL('image/png');
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // Create SVG wrapper with the raster image embedded
      // Use mm units for print-ready dimensions
      const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${paperWidthMM}mm" 
     height="${paperHeightMM}mm" 
     viewBox="0 0 ${imgWidth} ${imgHeight}"
     preserveAspectRatio="xMidYMid meet">
  <title>${filename} - Page ${i + 1}</title>
  <image 
    width="${imgWidth}" 
    height="${imgHeight}" 
    href="${dataUrl}"
    preserveAspectRatio="xMidYMid meet"/>
</svg>`;

      // Download the SVG file
      const pageFilename = pages.length > 1 
        ? `${filename}-page${i + 1}.svg` 
        : `${filename}.svg`;
      
      const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = pageFilename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log(`[generateSVG] Downloaded: ${pageFilename}`);
    }

    console.log('[generateSVG] Export complete!');
  } finally {
    restoreScale(scaleInfo);
    restoreUI();
  }
}

export default generateSVG;
