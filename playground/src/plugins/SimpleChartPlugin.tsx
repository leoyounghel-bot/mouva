import { Plugin, PDFRenderProps, UIRenderProps, Schema } from '@pdfme/common';
import { rgb } from 'pdf-lib';
import { z } from 'zod';

// =============================================================================
// Enhanced Chart Types and Data Structures
// =============================================================================

export type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'doughnut' | 'radar' | 'horizontalBar';
export type LegendPosition = 'top' | 'bottom' | 'left' | 'right' | 'none';

/** Dataset for multi-series charts */
export interface ChartDataset {
  label: string;
  data: number[];
  color: string;
}

/** Parsed chart data structure */
export interface ParsedChartData {
  labels: string[];
  datasets: ChartDataset[];
}

/** Enhanced Schema for charts */
export interface SimpleChartSchema extends Schema {
  chartType: ChartType;
  data: string; // CSV or JSON format
  label?: string;
  color?: string;
  colors?: string[]; // Multiple colors for pie/multi-series
  showGrid?: boolean;
  showLabels?: boolean;
  gradient?: boolean;
  legendPosition?: LegendPosition;
}

// =============================================================================
// Zod Schema for Validation
// =============================================================================

export const simpleChartSchemaArg = z.object({
  name: z.string(),
  type: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  width: z.number(),
  height: z.number(),
  content: z.string().optional(),
  rotate: z.number().optional(),
  opacity: z.number().optional(),
  readOnly: z.boolean().optional(),
  required: z.boolean().optional(),
  chartType: z.enum(['bar', 'line', 'area', 'pie', 'doughnut', 'radar', 'horizontalBar']).default('bar'),
  data: z.string().default('10,20,30'),
  label: z.string().default('My Chart'),
  color: z.string().default('#3b82f6'),
  colors: z.array(z.string()).optional(),
  showGrid: z.boolean().default(true),
  showLabels: z.boolean().default(false),
  gradient: z.boolean().default(false),
  legendPosition: z.enum(['top', 'bottom', 'left', 'right', 'none']).default('none'),
});

// =============================================================================
// Color Palette for Charts
// =============================================================================

const defaultColors = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#ec4899', // Pink
  '#84cc16', // Lime
  '#6366f1', // Indigo
];

// =============================================================================
// Data Parsing Utilities
// =============================================================================

/**
 * Parse chart data from various formats:
 * 1. Simple CSV: "10,20,30,40"
 * 2. Labeled CSV: "Jan:10,Feb:20,Mar:30"
 * 3. JSON multi-series: {"labels":["Q1","Q2"],"datasets":[...]}
 */
function parseChartData(dataStr: string, mainColor: string, colors?: string[]): ParsedChartData {
  // Defensive: ensure dataStr is always a string (AI may send number/null/undefined)
  const safeStr = (dataStr == null) ? '10,20,30' : String(dataStr);
  const trimmed = safeStr.trim() || '10,20,30';
  
  // Try JSON format first
  if (trimmed.startsWith('{')) {
    try {
      const json = JSON.parse(trimmed);
      if (json.labels && json.datasets) {
        return {
          labels: json.labels,
          datasets: json.datasets.map((ds: any, i: number) => ({
            label: ds.label || `Series ${i + 1}`,
            data: ds.data,
            color: ds.color || colors?.[i] || defaultColors[i % defaultColors.length],
          })),
        };
      }
    } catch (e) {
      // Fall through to other formats
    }
  }

  // Check for labeled format: "Jan:10,Feb:20"
  if (trimmed.includes(':')) {
    const pairs = trimmed.split(',').map(s => s.trim());
    const labels: string[] = [];
    const data: number[] = [];
    
    pairs.forEach(pair => {
      const [label, value] = pair.split(':');
      if (label && value) {
        labels.push(label.trim());
        data.push(Number(value.trim()) || 0);
      }
    });
    
    return {
      labels,
      datasets: [{ label: 'Data', data, color: mainColor }],
    };
  }

  // Simple CSV format: "10,20,30"
  const values = trimmed.split(',').map(s => Number(s.trim()) || 0);
  const labels = values.map((_, i) => `${i + 1}`);
  
  return {
    labels,
    datasets: [{ label: 'Data', data: values, color: mainColor }],
  };
}

/**
 * Parse hex color to RGB components
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16) / 255,
    g: parseInt(clean.slice(2, 4), 16) / 255,
    b: parseInt(clean.slice(4, 6), 16) / 255,
  };
}

/**
 * Create a lighter version of a color for gradients
 */
function lightenColor(hex: string, amount: number = 0.3): string {
  const { r, g, b } = hexToRgb(hex);
  const lighten = (c: number) => Math.min(1, c + amount);
  const toHex = (c: number) => Math.round(c * 255).toString(16).padStart(2, '0');
  return `#${toHex(lighten(r))}${toHex(lighten(g))}${toHex(lighten(b))}`;
}

// =============================================================================
// UI Render Function (Canvas rendering for preview)
// =============================================================================

const uiRender = (arg: UIRenderProps<SimpleChartSchema>) => {
  const { schema, rootElement, value } = arg;
  const chartType = schema.chartType || 'bar';
  const dataStr = value || schema.data || '10,20,30';
  const mainColor = schema.color || '#3b82f6';
  const colors = schema.colors || defaultColors;
  const showGrid = schema.showGrid !== false;
  const showLabels = schema.showLabels === true;
  const useGradient = schema.gradient === true;
  const legendPosition = schema.legendPosition || 'none';
  
  const parsed = parseChartData(dataStr, mainColor, colors);
  
  rootElement.innerHTML = '';
  
  // Create container
  const container = document.createElement('div');
  container.style.cssText = `
    width: 100%; height: 100%;
    display: flex; flex-direction: column;
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    border-radius: 8px;
    padding: 8px;
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    overflow: hidden;
  `;

  // Title
  if (schema.label) {
    const title = document.createElement('div');
    title.innerText = schema.label;
    title.style.cssText = `
      font-size: 11px; font-weight: 600;
      color: #1e293b;
      margin-bottom: 6px;
      text-align: center;
    `;
    container.appendChild(title);
  }

  // Chart area
  const chartArea = document.createElement('div');
  chartArea.style.cssText = `
    flex: 1; position: relative;
    display: flex; align-items: flex-end;
    min-height: 0;
  `;

  // Render based on chart type
  switch (chartType) {
    case 'bar':
    case 'horizontalBar':
      renderBarChart(chartArea, parsed, colors, showGrid, showLabels, useGradient, chartType === 'horizontalBar');
      break;
    case 'line':
    case 'area':
      renderLineAreaChart(chartArea, parsed, colors, showGrid, showLabels, useGradient, chartType === 'area');
      break;
    case 'pie':
    case 'doughnut':
      renderPieChart(chartArea, parsed, colors, showLabels, chartType === 'doughnut');
      break;
    case 'radar':
      renderRadarChart(chartArea, parsed, colors, showLabels, useGradient);
      break;
    default:
      renderBarChart(chartArea, parsed, colors, showGrid, showLabels, useGradient, false);
  }

  container.appendChild(chartArea);

  // Legend
  if (legendPosition !== 'none' && parsed.datasets.length > 1) {
    const legend = createLegend(parsed.datasets, legendPosition);
    if (legendPosition === 'top') {
      container.insertBefore(legend, chartArea);
    } else {
      container.appendChild(legend);
    }
  }

  rootElement.appendChild(container);
};

// =============================================================================
// Chart Rendering Functions
// =============================================================================

function renderBarChart(
  container: HTMLElement,
  data: ParsedChartData,
  colors: string[],
  showGrid: boolean,
  showLabels: boolean,
  useGradient: boolean,
  horizontal: boolean
) {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    width: 100%; height: 100%;
    display: flex;
    ${horizontal ? 'flex-direction: column;' : 'flex-direction: row; align-items: flex-end;'}
    gap: 3px;
    padding: ${showGrid ? '2px 0 16px 0' : '2px'};
    position: relative;
  `;

  // Grid lines
  if (showGrid && !horizontal) {
    for (let i = 0; i <= 4; i++) {
      const line = document.createElement('div');
      line.style.cssText = `
        position: absolute;
        left: 0; right: 0;
        bottom: ${16 + (i * 20)}%;
        height: 1px;
        background: #e2e8f0;
        z-index: 0;
      `;
      wrapper.appendChild(line);
    }
  }

  const allValues = data.datasets.flatMap(ds => ds.data);
  const maxVal = Math.max(...allValues, 1);
  const numSeries = data.datasets.length;

  data.labels.forEach((label, i) => {
    const barGroup = document.createElement('div');
    barGroup.style.cssText = `
      flex: 1;
      display: flex;
      ${horizontal ? 'flex-direction: row; height: 100%;' : 'flex-direction: row; align-items: flex-end; height: 100%;'}
      gap: 1px;
      position: relative;
      z-index: 1;
    `;

    data.datasets.forEach((ds, seriesIdx) => {
      const value = ds.data[i] || 0;
      const pct = (value / maxVal) * 100;
      const color = ds.color || colors[seriesIdx % colors.length];
      
      const bar = document.createElement('div');
      if (horizontal) {
        bar.style.cssText = `
          height: ${100 / numSeries}%;
          width: ${pct}%;
          background: ${useGradient ? `linear-gradient(90deg, ${color}, ${lightenColor(color)})` : color};
          border-radius: 0 4px 4px 0;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        `;
      } else {
        bar.style.cssText = `
          flex: 1;
          height: ${pct}%;
          min-height: 2px;
          background: ${useGradient ? `linear-gradient(180deg, ${color}, ${lightenColor(color)})` : color};
          border-radius: 4px 4px 0 0;
          transition: all 0.3s ease;
          box-shadow: 0 -2px 4px rgba(0,0,0,0.1);
        `;
      }

      // Value label
      if (showLabels) {
        const labelEl = document.createElement('div');
        labelEl.innerText = String(value);
        labelEl.style.cssText = `
          position: absolute;
          ${horizontal ? `left: ${pct + 2}%; top: 50%;` : `bottom: ${pct + 2}%; left: 50%;`}
          transform: translate(-50%, -50%);
          font-size: 8px;
          color: #64748b;
          white-space: nowrap;
        `;
        bar.style.position = 'relative';
        bar.appendChild(labelEl);
      }

      barGroup.appendChild(bar);
    });

    // X-axis label
    if (!horizontal) {
      const xLabel = document.createElement('div');
      xLabel.innerText = label;
      xLabel.style.cssText = `
        position: absolute;
        bottom: 0; left: 0; right: 0;
        font-size: 7px;
        color: #94a3b8;
        text-align: center;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      `;
      barGroup.appendChild(xLabel);
    }

    wrapper.appendChild(barGroup);
  });

  container.appendChild(wrapper);
}

function renderLineAreaChart(
  container: HTMLElement,
  data: ParsedChartData,
  colors: string[],
  showGrid: boolean,
  showLabels: boolean,
  useGradient: boolean,
  isArea: boolean
) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 60');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.style.cssText = 'width: 100%; height: 100%;';

  // Defs for gradients
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  
  // Grid lines
  if (showGrid) {
    for (let i = 0; i <= 4; i++) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', '0');
      line.setAttribute('y1', String(i * 15));
      line.setAttribute('x2', '100');
      line.setAttribute('y2', String(i * 15));
      line.setAttribute('stroke', '#e2e8f0');
      line.setAttribute('stroke-width', '0.3');
      svg.appendChild(line);
    }
  }

  const allValues = data.datasets.flatMap(ds => ds.data);
  const maxVal = Math.max(...allValues, 1);
  const padding = { top: 5, bottom: 10, left: 2, right: 2 };
  const chartWidth = 100 - padding.left - padding.right;
  const chartHeight = 60 - padding.top - padding.bottom;

  data.datasets.forEach((ds, seriesIdx) => {
    const color = ds.color || colors[seriesIdx % colors.length];
    const points = ds.data.map((val, i) => {
      const x = padding.left + (i / (ds.data.length - 1 || 1)) * chartWidth;
      const y = padding.top + chartHeight - (val / maxVal) * chartHeight;
      return { x, y, val };
    });

    // Create gradient for area
    if (isArea && useGradient) {
      const gradientId = `gradient-${seriesIdx}`;
      const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
      gradient.setAttribute('id', gradientId);
      gradient.setAttribute('x1', '0%');
      gradient.setAttribute('y1', '0%');
      gradient.setAttribute('x2', '0%');
      gradient.setAttribute('y2', '100%');
      
      const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop1.setAttribute('offset', '0%');
      stop1.setAttribute('stop-color', color);
      stop1.setAttribute('stop-opacity', '0.6');
      
      const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop2.setAttribute('offset', '100%');
      stop2.setAttribute('stop-color', color);
      stop2.setAttribute('stop-opacity', '0.1');
      
      gradient.appendChild(stop1);
      gradient.appendChild(stop2);
      defs.appendChild(gradient);
    }

    // Area fill
    if (isArea) {
      const areaPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const linePoints = points.map(p => `${p.x},${p.y}`).join(' L ');
      const areaD = `M ${padding.left},${padding.top + chartHeight} L ${linePoints} L ${padding.left + chartWidth},${padding.top + chartHeight} Z`;
      areaPath.setAttribute('d', areaD);
      areaPath.setAttribute('fill', useGradient ? `url(#gradient-${seriesIdx})` : color);
      areaPath.setAttribute('fill-opacity', useGradient ? '1' : '0.3');
      svg.appendChild(areaPath);
    }

    // Line
    const linePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const lineD = 'M ' + points.map(p => `${p.x},${p.y}`).join(' L ');
    linePath.setAttribute('d', lineD);
    linePath.setAttribute('stroke', color);
    linePath.setAttribute('stroke-width', '1.5');
    linePath.setAttribute('fill', 'none');
    linePath.setAttribute('stroke-linecap', 'round');
    linePath.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(linePath);

    // Data points
    points.forEach((p) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(p.x));
      circle.setAttribute('cy', String(p.y));
      circle.setAttribute('r', '2');
      circle.setAttribute('fill', '#fff');
      circle.setAttribute('stroke', color);
      circle.setAttribute('stroke-width', '1');
      svg.appendChild(circle);

      // Labels
      if (showLabels) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String(p.x));
        text.setAttribute('y', String(p.y - 4));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '4');
        text.setAttribute('fill', '#64748b');
        text.textContent = String(p.val);
        svg.appendChild(text);
      }
    });
  });

  // X-axis labels
  data.labels.forEach((label, i) => {
    const x = padding.left + (i / (data.labels.length - 1 || 1)) * chartWidth;
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', String(x));
    text.setAttribute('y', '58');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-size', '4');
    text.setAttribute('fill', '#94a3b8');
    text.textContent = label.length > 4 ? label.slice(0, 4) : label;
    svg.appendChild(text);
  });

  svg.insertBefore(defs, svg.firstChild);
  container.appendChild(svg);
}

function renderPieChart(
  container: HTMLElement,
  data: ParsedChartData,
  colors: string[],
  showLabels: boolean,
  isDoughnut: boolean
) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '-55 -55 110 110');
  svg.style.cssText = 'width: 100%; height: 100%;';

  const values = data.datasets[0]?.data || [];
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const radius = 45;
  const innerRadius = isDoughnut ? 25 : 0;

  let currentAngle = -90; // Start from top

  values.forEach((val, i) => {
    const sliceAngle = (val / total) * 360;
    const color = colors[i % colors.length];
    
    // Create arc path
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    
    const x1 = Math.cos((startAngle * Math.PI) / 180) * radius;
    const y1 = Math.sin((startAngle * Math.PI) / 180) * radius;
    const x2 = Math.cos((endAngle * Math.PI) / 180) * radius;
    const y2 = Math.sin((endAngle * Math.PI) / 180) * radius;
    
    const largeArc = sliceAngle > 180 ? 1 : 0;
    
    let d: string;
    if (isDoughnut) {
      const ix1 = Math.cos((startAngle * Math.PI) / 180) * innerRadius;
      const iy1 = Math.sin((startAngle * Math.PI) / 180) * innerRadius;
      const ix2 = Math.cos((endAngle * Math.PI) / 180) * innerRadius;
      const iy2 = Math.sin((endAngle * Math.PI) / 180) * innerRadius;
      d = `M ${ix1} ${iy1} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1} Z`;
    } else {
      d = `M 0 0 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    }
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', color);
    path.setAttribute('stroke', '#fff');
    path.setAttribute('stroke-width', '1');
    path.style.cssText = 'filter: drop-shadow(0 2px 2px rgba(0,0,0,0.1));';
    svg.appendChild(path);

    // Label
    if (showLabels && sliceAngle > 20) {
      const midAngle = startAngle + sliceAngle / 2;
      const labelRadius = isDoughnut ? (radius + innerRadius) / 2 : radius * 0.6;
      const lx = Math.cos((midAngle * Math.PI) / 180) * labelRadius;
      const ly = Math.sin((midAngle * Math.PI) / 180) * labelRadius;
      
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(lx));
      text.setAttribute('y', String(ly));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('font-size', '6');
      text.setAttribute('font-weight', 'bold');
      text.setAttribute('fill', '#fff');
      text.textContent = `${Math.round((val / total) * 100)}%`;
      svg.appendChild(text);
    }

    currentAngle = endAngle;
  });

  container.style.cssText += 'align-items: center; justify-content: center;';
  container.appendChild(svg);
}

function renderRadarChart(
  container: HTMLElement,
  data: ParsedChartData,
  colors: string[],
  _showLabels: boolean,
  useGradient: boolean
) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '-60 -60 120 120');
  svg.style.cssText = 'width: 100%; height: 100%;';

  const labels = data.labels;
  const values = data.datasets[0]?.data || [];
  const numAxes = labels.length;
  const maxVal = Math.max(...values, 100);
  const radius = 40;

  // Background grid
  for (let ring = 1; ring <= 4; ring++) {
    const r = (ring / 4) * radius;
    const points: string[] = [];
    for (let i = 0; i < numAxes; i++) {
      const angle = (i / numAxes) * 2 * Math.PI - Math.PI / 2;
      points.push(`${Math.cos(angle) * r},${Math.sin(angle) * r}`);
    }
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', points.join(' '));
    polygon.setAttribute('fill', 'none');
    polygon.setAttribute('stroke', '#e2e8f0');
    polygon.setAttribute('stroke-width', '0.5');
    svg.appendChild(polygon);
  }

  // Axis lines
  for (let i = 0; i < numAxes; i++) {
    const angle = (i / numAxes) * 2 * Math.PI - Math.PI / 2;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', '0');
    line.setAttribute('y1', '0');
    line.setAttribute('x2', String(Math.cos(angle) * radius));
    line.setAttribute('y2', String(Math.sin(angle) * radius));
    line.setAttribute('stroke', '#e2e8f0');
    line.setAttribute('stroke-width', '0.5');
    svg.appendChild(line);
  }

  // Data polygon
  const color = data.datasets[0]?.color || colors[0];
  const dataPoints: string[] = [];
  const pointCoords: { x: number; y: number; val: number }[] = [];

  for (let i = 0; i < numAxes; i++) {
    const angle = (i / numAxes) * 2 * Math.PI - Math.PI / 2;
    const val = values[i] || 0;
    const r = (val / maxVal) * radius;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    dataPoints.push(`${x},${y}`);
    pointCoords.push({ x, y, val });
  }

  // Gradient definition
  if (useGradient) {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
    gradient.setAttribute('id', 'radarGradient');
    
    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', color);
    stop1.setAttribute('stop-opacity', '0.6');
    
    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', color);
    stop2.setAttribute('stop-opacity', '0.2');
    
    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);
    svg.appendChild(defs);
  }

  const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  polygon.setAttribute('points', dataPoints.join(' '));
  polygon.setAttribute('fill', useGradient ? 'url(#radarGradient)' : color);
  polygon.setAttribute('fill-opacity', useGradient ? '1' : '0.3');
  polygon.setAttribute('stroke', color);
  polygon.setAttribute('stroke-width', '1.5');
  svg.appendChild(polygon);

  // Data points
  pointCoords.forEach(p => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', String(p.x));
    circle.setAttribute('cy', String(p.y));
    circle.setAttribute('r', '2');
    circle.setAttribute('fill', '#fff');
    circle.setAttribute('stroke', color);
    circle.setAttribute('stroke-width', '1');
    svg.appendChild(circle);
  });

  // Labels
  labels.forEach((label, i) => {
    const angle = (i / numAxes) * 2 * Math.PI - Math.PI / 2;
    const labelRadius = radius + 12;
    const x = Math.cos(angle) * labelRadius;
    const y = Math.sin(angle) * labelRadius;
    
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', String(x));
    text.setAttribute('y', String(y));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('font-size', '5');
    text.setAttribute('fill', '#64748b');
    text.textContent = label.length > 6 ? label.slice(0, 6) : label;
    svg.appendChild(text);
  });

  container.style.cssText += 'align-items: center; justify-content: center;';
  container.appendChild(svg);
}

function createLegend(datasets: ChartDataset[], position: LegendPosition): HTMLElement {
  const legend = document.createElement('div');
  const isVertical = position === 'left' || position === 'right';
  
  legend.style.cssText = `
    display: flex;
    ${isVertical ? 'flex-direction: column;' : 'flex-direction: row; flex-wrap: wrap;'}
    gap: 4px;
    ${position === 'top' ? 'margin-bottom: 6px;' : 'margin-top: 6px;'}
    justify-content: center;
  `;

  datasets.forEach(ds => {
    const item = document.createElement('div');
    item.style.cssText = `
      display: flex; align-items: center; gap: 3px;
      font-size: 7px; color: #64748b;
    `;
    
    const dot = document.createElement('div');
    dot.style.cssText = `
      width: 6px; height: 6px;
      background: ${ds.color};
      border-radius: 2px;
    `;
    
    item.appendChild(dot);
    item.appendChild(document.createTextNode(ds.label));
    legend.appendChild(item);
  });

  return legend;
}

// =============================================================================
// PDF Render Function
// =============================================================================

const pdfRender = async (arg: PDFRenderProps<SimpleChartSchema>) => {
  const { schema, page, options } = arg;
  const { position, width, height, color = '#3b82f6' } = schema;
  const chartType = schema.chartType || 'bar';
  const dataStr = schema.data || '10,20,30';
  const colors = schema.colors || defaultColors;
  
  const parsed = parseChartData(dataStr, color, colors);
  
  // Convert mm to points
  const xPt = position.x * 2.83465;
  const yPt = page.getHeight() - (position.y * 2.83465) - (height * 2.83465);
  const wPt = width * 2.83465;
  const hPt = height * 2.83465;

  // Draw background
  page.drawRectangle({
    x: xPt,
    y: yPt,
    width: wPt,
    height: hPt,
    color: options.colorType === 'cmyk' ? undefined : rgb(0.98, 0.99, 1),
    borderColor: rgb(0.9, 0.92, 0.96),
    borderWidth: 0.5,
  });

  // Draw title
  if (schema.label) {
    page.drawText(schema.label, {
      x: xPt + 5,
      y: yPt + hPt - 12,
      size: 9,
      color: rgb(0.12, 0.16, 0.24),
    });
  }

  const chartPadding = 15;
  const chartX = xPt + chartPadding;
  const chartY = yPt + 10;
  const chartW = wPt - chartPadding * 2;
  const chartH = hPt - (schema.label ? 30 : 20);

  // Render based on chart type
  switch (chartType) {
    case 'bar':
    case 'horizontalBar':
      renderPdfBarChart(page, parsed, colors, chartX, chartY, chartW, chartH, chartType === 'horizontalBar');
      break;
    case 'line':
    case 'area':
      renderPdfLineChart(page, parsed, colors, chartX, chartY, chartW, chartH, chartType === 'area');
      break;
    case 'pie':
    case 'doughnut':
      renderPdfPieChart(page, parsed, colors, chartX, chartY, chartW, chartH, chartType === 'doughnut');
      break;
    case 'radar':
      // Radar is complex, fallback to bar for PDF
      renderPdfBarChart(page, parsed, colors, chartX, chartY, chartW, chartH, false);
      break;
    default:
      renderPdfBarChart(page, parsed, colors, chartX, chartY, chartW, chartH, false);
  }
};

function renderPdfBarChart(
  page: any,
  data: ParsedChartData,
  colors: string[],
  x: number,
  y: number,
  w: number,
  h: number,
  _horizontal: boolean
) {
  const allValues = data.datasets.flatMap(ds => ds.data);
  const maxVal = Math.max(...allValues, 1);
  const numBars = data.labels.length;
  const numSeries = data.datasets.length;
  const barWidth = w / numBars;
  const seriesWidth = barWidth / numSeries * 0.8;

  data.labels.forEach((_, labelIdx) => {
    data.datasets.forEach((ds, seriesIdx) => {
      const value = ds.data[labelIdx] || 0;
      const pct = value / maxVal;
      const { r, g, b } = hexToRgb(ds.color || colors[seriesIdx % colors.length]);
      
      const barX = x + labelIdx * barWidth + seriesIdx * seriesWidth + barWidth * 0.1;
      const barH = pct * h * 0.85;

      page.drawRectangle({
        x: barX,
        y: y,
        width: seriesWidth - 2,
        height: barH,
        color: rgb(r, g, b),
      });
    });
  });
}

function renderPdfLineChart(
  page: any,
  data: ParsedChartData,
  colors: string[],
  x: number,
  y: number,
  w: number,
  h: number,
  _isArea: boolean
) {
  const allValues = data.datasets.flatMap(ds => ds.data);
  const maxVal = Math.max(...allValues, 1);

  data.datasets.forEach((ds, seriesIdx) => {
    const { r, g, b } = hexToRgb(ds.color || colors[seriesIdx % colors.length]);
    const points = ds.data.map((val, i) => ({
      x: x + (i / (ds.data.length - 1 || 1)) * w,
      y: y + (val / maxVal) * h * 0.85,
    }));

    // Draw lines between points
    for (let i = 0; i < points.length - 1; i++) {
      page.drawLine({
        start: { x: points[i].x, y: points[i].y },
        end: { x: points[i + 1].x, y: points[i + 1].y },
        color: rgb(r, g, b),
        thickness: 1.5,
      });
    }

    // Draw points
    points.forEach(p => {
      page.drawCircle({
        x: p.x,
        y: p.y,
        size: 2,
        color: rgb(r, g, b),
        borderColor: rgb(1, 1, 1),
        borderWidth: 0.5,
      });
    });
  });
}

function renderPdfPieChart(
  page: any,
  data: ParsedChartData,
  colors: string[],
  x: number,
  y: number,
  w: number,
  h: number,
  isDoughnut: boolean
) {
  const centerX = x + w / 2;
  const centerY = y + h / 2;
  const radius = Math.min(w, h) / 2 * 0.8;
  const values = data.datasets[0]?.data || [];
  const total = values.reduce((a, b) => a + b, 0) || 1;

  let currentAngle = 0;

  values.forEach((val, i) => {
    const sliceAngle = (val / total) * 2 * Math.PI;
    const { r, g, b } = hexToRgb(colors[i % colors.length]);
    
    // Draw pie slice as a filled sector (approximated with lines)
    const segments = Math.ceil(sliceAngle / (Math.PI / 18)); // ~10 degree segments
    for (let s = 0; s < segments; s++) {
      const a1 = currentAngle + (s / segments) * sliceAngle;
      
      const innerR = isDoughnut ? radius * 0.5 : 0;
      
      // Draw line from center to edge (or inner to outer for doughnut)
      page.drawLine({
        start: { 
          x: centerX + Math.cos(a1) * innerR, 
          y: centerY + Math.sin(a1) * innerR 
        },
        end: { 
          x: centerX + Math.cos(a1) * radius, 
          y: centerY + Math.sin(a1) * radius 
        },
        color: rgb(r, g, b),
        thickness: 2,
      });
    }
    
    currentAngle += sliceAngle;
  });
}

// =============================================================================
// Property Panel Configuration
// =============================================================================

const propPanel = {
  schema: {
    label: { title: 'Chart Label', type: 'string' },
    data: { title: 'Data', type: 'string' },
    color: { title: 'Primary Color', type: 'string', widget: 'color' },
    chartType: { 
      title: 'Chart Type', 
      type: 'string', 
      enum: ['bar', 'line', 'area', 'pie', 'doughnut', 'radar', 'horizontalBar'],
      widget: 'select' 
    },
    showGrid: { title: 'Show Grid', type: 'boolean' },
    showLabels: { title: 'Show Labels', type: 'boolean' },
    gradient: { title: 'Gradient Effect', type: 'boolean' },
    legendPosition: {
      title: 'Legend',
      type: 'string',
      enum: ['none', 'top', 'bottom', 'left', 'right'],
      widget: 'select'
    },
  },
  defaultSchema: {
    name: 'newChart',
    type: 'simplechart',
    content: '10,20,30',
    position: { x: 0, y: 0 },
    width: 80,
    height: 60,
    chartType: 'bar',
    data: 'Q1:65,Q2:80,Q3:72,Q4:95',
    label: 'Performance',
    color: '#3b82f6',
    showGrid: true,
    showLabels: false,
    gradient: false,
    legendPosition: 'none',
  } as SimpleChartSchema,
};

// =============================================================================
// Export the Plugin
// =============================================================================

export const simpleChartPlugin: Plugin<SimpleChartSchema> = {
  ui: uiRender,
  pdf: pdfRender,
  propPanel,
  icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>',
};
