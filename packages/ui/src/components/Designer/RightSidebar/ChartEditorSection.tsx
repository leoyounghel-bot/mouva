import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Input, Tooltip, Slider, Switch, Select, Divider } from 'antd';
import { RotateCcw, Settings2, ChevronDown, ChevronRight } from 'lucide-react';
import { DESIGNER_CLASSNAME } from '../../../constants.js';
import type { SchemaForUI, ChangeSchemas } from '@pdfme/common';
import {
  Chart,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  BarController,
  LineController,
  PieController,
  DoughnutController,
  RadarController,
  ScatterController,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Filler,
  Legend,
  Title,
  Tooltip as ChartTooltip,
} from 'chart.js';

// Register Chart.js components
Chart.register(
  CategoryScale, LinearScale, RadialLinearScale,
  BarController, LineController, PieController, DoughnutController, RadarController, ScatterController,
  BarElement, LineElement, PointElement, ArcElement,
  Filler, Legend, Title, ChartTooltip,
);

const { TextArea } = Input;

// ─── Chart Type Definitions ────────────────────────────────────────────
type ChartTypeKey = 'bar' | 'horizontalBar' | 'line' | 'area' | 'pie' | 'donut' | 'radar' | 'scatter';

interface ChartTypeConfig {
  key: ChartTypeKey;
  label: string;
  icon: React.ReactNode;
}

const CHART_TYPES: ChartTypeConfig[] = [
  {
    key: 'bar', label: 'Bar',
    icon: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="12" width="4" height="9" rx="1" /><rect x="10" y="5" width="4" height="16" rx="1" /><rect x="17" y="8" width="4" height="13" rx="1" /></svg>),
  },
  {
    key: 'horizontalBar', label: 'H-Bar',
    icon: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="13" height="4" rx="1" /><rect x="3" y="10" width="18" height="4" rx="1" /><rect x="3" y="17" width="9" height="4" rx="1" /></svg>),
  },
  {
    key: 'line', label: 'Line',
    icon: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16" /><path d="m19 9-5 5-4-4-3 3" /></svg>),
  },
  {
    key: 'area', label: 'Area',
    icon: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16" /><path d="M7 16l4-6 4 3 5-7" /><path d="M7 16l4-6 4 3 5-7v14H7z" opacity="0.15" fill="currentColor" /></svg>),
  },
  {
    key: 'pie', label: 'Pie',
    icon: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></svg>),
  },
  {
    key: 'donut', label: 'Donut',
    icon: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="M12 3v4" /><path d="M19.8 7L16.3 9.5" /></svg>),
  },
  {
    key: 'radar', label: 'Radar',
    icon: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12,2 22,8.5 19,19.5 5,19.5 2,8.5" /><polygon points="12,7 17,10.5 15.5,16 8.5,16 7,10.5" opacity="0.3" fill="currentColor" /></svg>),
  },
  {
    key: 'scatter', label: 'Scatter',
    icon: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16" /><circle cx="8" cy="14" r="1.5" fill="currentColor" /><circle cx="11" cy="9" r="1.5" fill="currentColor" /><circle cx="15" cy="12" r="1.5" fill="currentColor" /><circle cx="18" cy="6" r="1.5" fill="currentColor" /><circle cx="14" cy="16" r="1.5" fill="currentColor" /></svg>),
  },
];

// ─── Color Palettes ────────────────────────────────────────────────────
interface ColorPalette { name: string; colors: string[]; }

const COLOR_PALETTES: ColorPalette[] = [
  { name: 'Modern', colors: ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308'] },
  { name: 'Notion', colors: ['#2383e2', '#5b9eff', '#35baf6', '#6ec8c8', '#4dab9a', '#73b761', '#e9a23b', '#e06a5c'] },
  { name: 'Ocean', colors: ['#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b'] },
  { name: 'Warm', colors: ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4'] },
  { name: 'Mono', colors: ['#171717', '#404040', '#525252', '#737373', '#a3a3a3', '#d4d4d4', '#e5e5e5', '#f5f5f5'] },
  { name: 'Pastel', colors: ['#c4b5fd', '#a5b4fc', '#93c5fd', '#67e8f9', '#5eead4', '#86efac', '#fde68a', '#fca5a5'] },
];

// ─── Per-Chart-Type Parameters ─────────────────────────────────────────
interface ChartParams {
  borderRadius: number;
  barPercentage: number;
  barBorderWidth: number;
  showGrid: boolean;
  stacked: boolean;
  tension: number;
  pointRadius: number;
  lineWidth: number;
  stepped: boolean;
  fillOpacity: number;
  showPoints: boolean;
  cutout: number;
  arcBorderWidth: number;
  rotation: number;
  legendPosition: 'top' | 'bottom' | 'left' | 'right';
  radarPointRadius: number;
  radarFillOpacity: number;
  radarBorderWidth: number;
  scatterPointRadius: number;
  showLegend: boolean;
  showGridLines: boolean;
  beginAtZero: boolean;
  animationDuration: number;
}

const DEFAULT_PARAMS: ChartParams = {
  borderRadius: 6, barPercentage: 0.8, barBorderWidth: 2, showGrid: true, stacked: false,
  tension: 0.4, pointRadius: 4, lineWidth: 2.5, stepped: false, fillOpacity: 30, showPoints: true,
  cutout: 55, arcBorderWidth: 2, rotation: 0, legendPosition: 'bottom',
  radarPointRadius: 3, radarFillOpacity: 25, radarBorderWidth: 2,
  scatterPointRadius: 6,
  showLegend: true, showGridLines: true, beginAtZero: true, animationDuration: 400,
};

const DEFAULT_DATA = `Label,Value\nQ1,120\nQ2,190\nQ3,150\nQ4,220\nQ5,280`;

// ─── Shared Styles ─────────────────────────────────────────────────────
const SECTION_LABEL: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: '#1a1a1a',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6,
};

const PARAM_ROW: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  marginBottom: 6, gap: 6,
};

const PARAM_LABEL: React.CSSProperties = {
  fontSize: 11, color: '#262626', fontWeight: 500, minWidth: 68, flexShrink: 0,
};

// ─── Slider Row ────────────────────────────────────────────────────────
const SliderRow = ({ label, value, min, max, step, onChange, suffix }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; suffix?: string;
}) => (
  <div style={PARAM_ROW}>
    <span style={PARAM_LABEL}>{label}</span>
    <Slider min={min} max={max} step={step} value={value} onChange={onChange}
      style={{ flex: 1, margin: '0 6px' }} />
    <span style={{ fontSize: 10, color: '#525252', fontWeight: 500, minWidth: 28, textAlign: 'right' }}>
      {value}{suffix || ''}
    </span>
  </div>
);

// ─── Toggle Row ────────────────────────────────────────────────────────
const ToggleRow = ({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void;
}) => (
  <div style={PARAM_ROW}>
    <span style={PARAM_LABEL}>{label}</span>
    <Switch size="small" checked={checked} onChange={onChange} />
  </div>
);

// ─── Component Props ───────────────────────────────────────────────────
interface ChartEditorSectionProps {
  activeSchema: SchemaForUI;
  changeSchemas: ChangeSchemas;
  onUpdateChart?: (schemaId: string, dataUrl: string, chartMeta: Record<string, any>) => void;
}

// ─── Main Component ────────────────────────────────────────────────────
const ChartEditorSection = ({ activeSchema, changeSchemas, onUpdateChart }: ChartEditorSectionProps) => {
  // Read chart metadata from schema (or use defaults)
  const schemaMeta = activeSchema as any;
  const [chartType, setChartType] = useState<ChartTypeKey>(schemaMeta.chartType || 'bar');
  const [dataText, setDataText] = useState(schemaMeta.chartData || DEFAULT_DATA);
  const [paletteIndex, setPaletteIndex] = useState(schemaMeta.chartPaletteIndex ?? 0);
  const [chartTitle, setChartTitle] = useState(schemaMeta.chartTitle || '');
  const [params, setParams] = useState<ChartParams>({ ...DEFAULT_PARAMS, ...(schemaMeta.chartParams || {}) });
  const [showSettings, setShowSettings] = useState(false);
  const [showData, setShowData] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const updateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-initialize when a different chart element is selected
  useEffect(() => {
    const meta = activeSchema as any;
    setChartType(meta.chartType || 'bar');
    setDataText(meta.chartData || DEFAULT_DATA);
    setPaletteIndex(meta.chartPaletteIndex ?? 0);
    setChartTitle(meta.chartTitle || '');
    setParams({ ...DEFAULT_PARAMS, ...(meta.chartParams || {}) });
  }, [activeSchema.id]);

  const setParam = useCallback(<K extends keyof ChartParams>(key: K, value: ChartParams[K]) => {
    setParams(prev => ({ ...prev, [key]: value }));
  }, []);

  // Parse CSV-like data
  const parseData = useCallback((text: string) => {
    const lines = text.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) return { labels: [], values: [] as number[][] };
    const header = lines[0].split(/[,\t;]/).map(s => s.trim());
    const numSeries = header.length - 1;
    const labels: string[] = [];
    const values: number[][] = Array.from({ length: numSeries }, () => []);
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(/[,\t;]/).map(s => s.trim());
      if (parts.length >= 2) {
        labels.push(parts[0]);
        for (let j = 0; j < numSeries; j++) {
          values[j].push(parseFloat(parts[j + 1]) || 0);
        }
      }
    }
    return { labels, values, seriesNames: header.slice(1) };
  }, []);

  // Build Chart.js config
  const buildConfig = useCallback(() => {
    const { labels, values, seriesNames } = parseData(dataText);
    const palette = COLOR_PALETTES[paletteIndex].colors;
    const p = params;
    const legendDisplay = p.showLegend && (values.length > 1 || chartType === 'pie' || chartType === 'donut');
    const titleConfig = { display: !!chartTitle, text: chartTitle, font: { size: 13, weight: 'bold' as const } };

    let config: any;
    switch (chartType) {
      case 'bar':
      case 'horizontalBar': {
        const isHorizontal = chartType === 'horizontalBar';
        config = {
          type: 'bar' as const,
          data: {
            labels,
            datasets: values.map((v, i) => ({
              label: seriesNames?.[i] || `Series ${i + 1}`,
              data: v,
              backgroundColor: values.length === 1 ? palette.slice(0, v.length) : palette[i % palette.length] + 'cc',
              borderColor: values.length === 1 ? palette.slice(0, v.length) : palette[i % palette.length],
              borderWidth: p.barBorderWidth, borderRadius: p.borderRadius, barPercentage: p.barPercentage,
            })),
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            indexAxis: isHorizontal ? 'y' as const : 'x' as const,
            plugins: { legend: { display: legendDisplay }, title: titleConfig },
            scales: {
              [isHorizontal ? 'x' : 'y']: { beginAtZero: p.beginAtZero, stacked: p.stacked, grid: { display: p.showGridLines, color: '#f0f0f0' } },
              [isHorizontal ? 'y' : 'x']: { stacked: p.stacked, grid: { display: false } },
            },
          },
        };
        break;
      }
      case 'line':
      case 'area': {
        const isArea = chartType === 'area';
        config = {
          type: 'line' as const,
          data: {
            labels,
            datasets: values.map((v, i) => ({
              label: seriesNames?.[i] || `Series ${i + 1}`, data: v,
              borderColor: palette[i % palette.length],
              backgroundColor: palette[i % palette.length] + Math.round(p.fillOpacity * 2.55).toString(16).padStart(2, '0'),
              pointBackgroundColor: palette[i % palette.length],
              tension: p.stepped ? 0 : p.tension, pointRadius: p.showPoints ? p.pointRadius : 0,
              pointHoverRadius: p.showPoints ? p.pointRadius + 2 : 0, borderWidth: p.lineWidth,
              fill: isArea, stepped: p.stepped,
            })),
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: legendDisplay }, title: titleConfig },
            scales: {
              y: { beginAtZero: p.beginAtZero, grid: { display: p.showGridLines, color: '#f0f0f0' } },
              x: { grid: { display: false } },
            },
          },
        };
        break;
      }
      case 'pie':
        config = {
          type: 'pie' as const,
          data: { labels, datasets: [{ data: values[0] || [], backgroundColor: palette.slice(0, labels.length), borderColor: '#ffffff', borderWidth: p.arcBorderWidth, rotation: p.rotation }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: p.showLegend, position: p.legendPosition, labels: { padding: 12 } }, title: titleConfig } },
        };
        break;
      case 'donut':
        config = {
          type: 'doughnut' as const,
          data: { labels, datasets: [{ data: values[0] || [], backgroundColor: palette.slice(0, labels.length), borderColor: '#ffffff', borderWidth: p.arcBorderWidth, cutout: `${p.cutout}%`, rotation: p.rotation }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: p.showLegend, position: p.legendPosition, labels: { padding: 12 } }, title: titleConfig } },
        };
        break;
      case 'radar':
        config = {
          type: 'radar' as const,
          data: { labels, datasets: values.map((v, i) => ({ label: seriesNames?.[i] || `Series ${i + 1}`, data: v, borderColor: palette[i % palette.length], backgroundColor: palette[i % palette.length] + Math.round(p.radarFillOpacity * 2.55).toString(16).padStart(2, '0'), pointBackgroundColor: palette[i % palette.length], borderWidth: p.radarBorderWidth, pointRadius: p.radarPointRadius })) },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: legendDisplay }, title: titleConfig }, scales: { r: { beginAtZero: p.beginAtZero, grid: { color: '#e5e5e5', display: p.showGridLines }, ticks: { backdropColor: 'transparent' } } } },
        };
        break;
      case 'scatter':
        config = {
          type: 'scatter' as const,
          data: { datasets: [{ label: seriesNames?.[0] || 'Data', data: (values[0] || []).map((v, i) => ({ x: v, y: (values[1] || values[0])?.[i] || 0 })), backgroundColor: palette.slice(0, (values[0] || []).length), pointRadius: p.scatterPointRadius, pointHoverRadius: p.scatterPointRadius + 2 }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, title: titleConfig }, scales: { y: { beginAtZero: p.beginAtZero, grid: { display: p.showGridLines, color: '#f0f0f0' } }, x: { grid: { display: p.showGridLines, color: '#f0f0f0' } } } },
        };
        break;
    }
    return config;
  }, [chartType, dataText, paletteIndex, chartTitle, params, parseData]);

  // Render chart and auto-update schema
  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const config = buildConfig();
    if (!config) return;

    try {
      chartRef.current = new Chart(canvasRef.current, {
        ...config,
        options: {
          ...config.options,
          animation: { duration: params.animationDuration },
          plugins: {
            ...config.options?.plugins,
            legend: {
              ...config.options?.plugins?.legend,
              labels: { ...config.options?.plugins?.legend?.labels, font: { family: "'Inter', -apple-system, sans-serif", size: 11 } },
            },
          },
        },
      });
    } catch (e) {
      console.error('[ChartEditorSection] Failed to render chart:', e);
    }

    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [buildConfig, params.animationDuration]);

  // Debounced update: push new chart image + metadata to schema
  useEffect(() => {
    if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
    updateTimerRef.current = setTimeout(() => {
      if (!canvasRef.current || !chartRef.current) return;
      try {
        const dataUrl = canvasRef.current.toDataURL('image/png', 1.0);
        const chartMeta = {
          chartType, chartData: dataText, chartPaletteIndex: paletteIndex,
          chartTitle, chartParams: params,
        };
        if (onUpdateChart) {
          onUpdateChart(activeSchema.id, dataUrl, chartMeta);
        }
      } catch (e) {
        console.error('[ChartEditorSection] Failed to export chart:', e);
      }
    }, 300);
    return () => { if (updateTimerRef.current) clearTimeout(updateTimerRef.current); };
  }, [chartType, dataText, paletteIndex, chartTitle, params, activeSchema.id, onUpdateChart]);

  // Reset
  const handleReset = useCallback(() => {
    setDataText(DEFAULT_DATA);
    setChartTitle('');
    setPaletteIndex(0);
    setParams({ ...DEFAULT_PARAMS });
  }, []);

  // Per-type settings
  const renderSettings = () => {
    switch (chartType) {
      case 'bar':
      case 'horizontalBar':
        return (<>
          <SliderRow label="Border R." value={params.borderRadius} min={0} max={20} step={1} onChange={v => setParam('borderRadius', v)} suffix="px" />
          <SliderRow label="Bar Width" value={Math.round(params.barPercentage * 100)} min={20} max={100} step={5} onChange={v => setParam('barPercentage', v / 100)} suffix="%" />
          <ToggleRow label="Stacked" checked={params.stacked} onChange={v => setParam('stacked', v)} />
          <ToggleRow label="Grid" checked={params.showGridLines} onChange={v => setParam('showGridLines', v)} />
        </>);
      case 'line':
      case 'area':
        return (<>
          <SliderRow label="Curve" value={Math.round(params.tension * 100)} min={0} max={100} step={5} onChange={v => setParam('tension', v / 100)} suffix="%" />
          <SliderRow label="Line W." value={params.lineWidth} min={1} max={6} step={0.5} onChange={v => setParam('lineWidth', v)} suffix="px" />
          <ToggleRow label="Points" checked={params.showPoints} onChange={v => setParam('showPoints', v)} />
          <ToggleRow label="Stepped" checked={params.stepped} onChange={v => setParam('stepped', v)} />
          {chartType === 'area' && <SliderRow label="Fill %" value={params.fillOpacity} min={5} max={80} step={5} onChange={v => setParam('fillOpacity', v)} suffix="%" />}
        </>);
      case 'pie':
      case 'donut':
        return (<>
          {chartType === 'donut' && <SliderRow label="Cutout" value={params.cutout} min={20} max={85} step={5} onChange={v => setParam('cutout', v)} suffix="%" />}
          <SliderRow label="Border W." value={params.arcBorderWidth} min={0} max={8} step={1} onChange={v => setParam('arcBorderWidth', v)} suffix="px" />
          <SliderRow label="Rotation" value={params.rotation} min={0} max={360} step={15} onChange={v => setParam('rotation', v)} suffix="°" />
          <ToggleRow label="Legend" checked={params.showLegend} onChange={v => setParam('showLegend', v)} />
          {params.showLegend && (
            <div style={PARAM_ROW}>
              <span style={PARAM_LABEL}>Position</span>
              <Select size="small" value={params.legendPosition} onChange={v => setParam('legendPosition', v)} style={{ flex: 1 }}
                options={[{ value: 'top', label: 'Top' }, { value: 'bottom', label: 'Bottom' }, { value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }]} />
            </div>
          )}
        </>);
      case 'radar':
        return (<>
          <SliderRow label="Point Size" value={params.radarPointRadius} min={0} max={8} step={1} onChange={v => setParam('radarPointRadius', v)} suffix="px" />
          <SliderRow label="Fill %" value={params.radarFillOpacity} min={0} max={80} step={5} onChange={v => setParam('radarFillOpacity', v)} suffix="%" />
          <ToggleRow label="Grid" checked={params.showGridLines} onChange={v => setParam('showGridLines', v)} />
        </>);
      case 'scatter':
        return (<>
          <SliderRow label="Point Size" value={params.scatterPointRadius} min={2} max={14} step={1} onChange={v => setParam('scatterPointRadius', v)} suffix="px" />
          <ToggleRow label="Grid" checked={params.showGridLines} onChange={v => setParam('showGridLines', v)} />
        </>);
      default: return null;
    }
  };

  return (
    <div className={DESIGNER_CLASSNAME + 'chart-editor-section'}>
      <Divider style={{ margin: '8px 0' }} />

      {/* ── Section Header ──────────────────────────────── */}
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 0', marginBottom: expanded ? 8 : 0 }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ ...SECTION_LABEL, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          Chart Editor
        </div>
        <Tooltip title="Reset chart">
          <button
            onClick={(e) => { e.stopPropagation(); handleReset(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 3, padding: '2px 6px',
              border: 'none', background: 'transparent', color: '#737373',
              cursor: 'pointer', fontSize: 10, borderRadius: 4,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#6366f1')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#737373')}
          >
            <RotateCcw size={10} /> Reset
          </button>
        </Tooltip>
      </div>

      {expanded && (
        <>
          {/* ── Chart Type Grid ──────────────────────────── */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
              {CHART_TYPES.map((ct) => (
                <button key={ct.key} onClick={() => setChartType(ct.key)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 2, padding: '5px 2px',
                    border: chartType === ct.key ? '1.5px solid #6366f1' : '1px solid #e5e7eb',
                    borderRadius: 6, background: chartType === ct.key ? '#eef2ff' : '#fff',
                    cursor: 'pointer', transition: 'all 0.15s ease',
                    color: chartType === ct.key ? '#4f46e5' : '#1a1a1a', fontSize: 10,
                  }}
                >
                  {ct.icon}
                  <span style={{ fontWeight: 600, lineHeight: 1 }}>{ct.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Live Preview ─────────────────────────────── */}
          <div style={{ marginBottom: 10 }}>
            <div style={{
              position: 'relative', width: '100%', height: 160,
              border: '1px solid #e5e7eb', borderRadius: 8,
              overflow: 'hidden', background: '#fff', padding: 8,
            }}>
              <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
            </div>
          </div>

          {/* ── Title Input ──────────────────────────────── */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ ...SECTION_LABEL, marginBottom: 4 }}>Title</div>
            <Input placeholder="Chart title..." value={chartTitle} onChange={(e) => setChartTitle(e.target.value)}
              style={{ borderRadius: 6, fontSize: 12 }} size="small" />
          </div>

          {/* ── Color Palette ────────────────────────────── */}
          <div style={{ marginBottom: 10 }}>
            <div style={SECTION_LABEL}>Palette</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {COLOR_PALETTES.map((pal, idx) => (
                <button key={pal.name} onClick={() => setPaletteIndex(idx)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px',
                    border: paletteIndex === idx ? '1.5px solid #6366f1' : '1px solid #e5e7eb',
                    borderRadius: 6, background: paletteIndex === idx ? '#eef2ff' : '#fff',
                    cursor: 'pointer', transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#303030', minWidth: 40 }}>{pal.name}</span>
                  <div style={{ display: 'flex', gap: 2, flex: 1 }}>
                    {pal.colors.slice(0, 8).map((c, ci) => (
                      <div key={ci} style={{ width: 12, height: 12, borderRadius: 2, background: c, flexShrink: 0 }} />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Settings (Collapsible) ───────────────────── */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ ...SECTION_LABEL, marginBottom: 0 }}>
                <Settings2 size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                Settings
              </div>
              <button onClick={() => setShowSettings(!showSettings)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 10, color: '#6366f1', fontWeight: 500, padding: '1px 3px' }}>
                {showSettings ? 'Hide' : 'Show'}
              </button>
            </div>
            {showSettings && (
              <div style={{ padding: '8px 8px', background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
                {renderSettings()}
              </div>
            )}
          </div>

          {/* ── Data (Collapsible) ───────────────────────── */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={SECTION_LABEL}>Data</div>
              <button onClick={() => setShowData(!showData)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 10, color: '#6366f1', fontWeight: 500, padding: '1px 3px' }}>
                {showData ? 'Hide' : 'Edit'}
              </button>
            </div>
            {showData && (
              <>
                <TextArea value={dataText} onChange={(e) => setDataText(e.target.value)}
                  placeholder={`Label,Value\nQ1,100\nQ2,200`}
                  autoSize={{ minRows: 3, maxRows: 8 }}
                  style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 11, borderRadius: 6, lineHeight: 1.5 }} />
                <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 3 }}>
                  CSV: Label,Value · Tab/semicolon · Paste from Excel
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ChartEditorSection;
