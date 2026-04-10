import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Designer, Viewer } from '@pdfme/ui';
import { generate } from '@pdfme/generator';
import { Template, checkTemplate, getInputFromTemplate } from '@pdfme/common';
import { getFontsData, getBlankTemplate } from '../helper';
import { getPlugins } from '../plugins';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { saveAs } from 'file-saver';
import { generatePPT } from '../utils/generatePPT';
import { parseSpreadsheet, isSpreadsheetFile, SpreadsheetData } from '../utils/parseSpreadsheet';
import BatchGenerateModal from '../components/BatchGenerateModal';
import JSZip from 'jszip';

import ReactMarkdown from 'react-markdown';
import HistoryModal, { Session } from '../components/HistoryModal';
import { getAuthToken, getCurrentUser, logout, getSessions as getServerSessions, getSession as getServerSession, createSession as createServerSession, updateSession as updateServerSession, deleteSession as deleteServerSession, User, checkAiLimit, incrementUsage, convertDocument } from '../api/client';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import './AiDesigner.css';

// ... (keep existing imports and constants)

// Initialize OpenAI-compatible client for Together AI (AI SDK 6)
// Using createOpenAI with baseURL pointing to Together AI API
const apiKey = process.env.TOGETHER_API_KEY || '';

// In production, call Together API directly. In development, use Vite proxy.
const togetherBaseUrl = import.meta.env.PROD 
  ? 'https://api.together.xyz/v1' 
  : '/api/together/v1';

const together = createOpenAI({
  baseURL: togetherBaseUrl,
  apiKey: apiKey,
});

// Use together.chat() to explicitly use Chat Completions API
const grokModel = together.chat('moonshotai/Kimi-K2.5');

// Plugin type mapping (AI output -> PDFme plugin key)
const pluginMap: Record<string, string> = {
  // Standard Lowercase Keys (Target)
  'text': 'text',
  'multivariabletext': 'multiVariableText',
  'multiVariableText': 'multiVariableText',
  'table': 'table',
  'line': 'line',
  'rectangle': 'rectangle',
  'ellipse': 'ellipse',
  'image': 'image',
  'svg': 'svg',
  'signature': 'signature',
  'qrcode': 'qrcode',
  'datetime': 'dateTime',
  'date': 'date',
  'time': 'time',
  'select': 'select',
  'checkbox': 'checkbox',
  'radiogroup': 'radioGroup',
  'radioGroup': 'radioGroup',
  'code128': 'code128',
  'ean13': 'ean13',
  'simplechart': 'simplechart',
  'simpleChart': 'simplechart',

  // Legacy Capitalized Keys (Map to Lowercase)
  'Text': 'text',
  'Multi-Variable Text': 'multiVariableText',
  'Table': 'table',
  'Line': 'line',
  'Rectangle': 'rectangle',
  'Ellipse': 'ellipse',
  'Image': 'image',
  'SVG': 'svg',
  'Signature': 'signature',
  'QR': 'qrcode',
  'DateTime': 'dateTime',
  'Date': 'date',
  'Time': 'time',
  'Select': 'select',
  'Checkbox': 'checkbox',
  'RadioGroup': 'radioGroup',
  'Code128': 'code128',
  'EAN13': 'ean13',
  'SimpleChart': 'simplechart',
};

import { AiTemplateSchema, validateAndFixSchemas, PageSize } from './AiDesignerLogic';
import { generateImage } from './NovitaClient';
import { fileToBase64, analyzeDocumentLayoutFromPdf, analyzeDocumentLayoutFromFile } from './OcrClient';
import { buildSystemPrompt, detectLanguage, detectPhase, PromptContext, getFullWorkspaceContext, shouldEnableVisualAnalysis, convertLayoutToPdfmeSchemas } from './ai';
import { pdf2size, pdf2img } from '@pdfme/converter';

/**
 * Convert any image (Blob) to PNG format using Canvas.
 * This ensures compatibility with pdf-lib which only supports PNG/JPEG.
 * Without this, WebP or other formats from AI image generation cause "SOI not found in JPEG" errors.
 */
const convertImageToPng = async (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(blob);
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const pngDataUrl = canvas.toDataURL('image/png');
        URL.revokeObjectURL(objectUrl);
        resolve(pngDataUrl);
      } catch (e) {
        URL.revokeObjectURL(objectUrl);
        reject(e);
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for PNG conversion'));
    };
    
    img.src = objectUrl;
  });
};

/**
 * Strip large base64 content from templates before storing in localStorage.
 * This prevents localStorage quota from being exceeded by image-heavy sessions.
 */
const stripLargeContent = (templateJson: string): string => {
  try {
    const template = JSON.parse(templateJson);
    if (template.schemas) {
      template.schemas.forEach((page: any) => {
        if (Array.isArray(page)) {
          page.forEach((schema: any) => {
            // Strip base64 images larger than 100KB to save space (increased from 1KB)
            if (schema.content && typeof schema.content === 'string' && 
                schema.content.startsWith('data:image') && 
                schema.content.length > 100 * 1024) {
              schema.content = '[IMAGE_STRIPPED_FOR_STORAGE]';
            }
          });
        } else if (typeof page === 'object') {
          Object.values(page).forEach((schema: any) => {
            if (schema.content && typeof schema.content === 'string' && 
                schema.content.startsWith('data:image') && 
                schema.content.length > 100 * 1024) {
              schema.content = '[IMAGE_STRIPPED_FOR_STORAGE]';
            }
          });
        }
      });
    }
    return JSON.stringify(template);
  } catch (e) {
    return templateJson;
  }
};

// Maximum number of sessions to store (prevents localStorage quota issues)
const MAX_SESSIONS = 10;

// Modern AI Status Card Component
const AIStatusCard: React.FC<{ type: 'success' | 'info' | 'processing' | 'error' | 'file'; title: string; subtitle?: string }> = ({ type, title, subtitle }) => {
  const icons = {
    success: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
      </svg>
    ),
    info: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
    processing: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 animate-spin">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
      </svg>
    ),
    error: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
      </svg>
    ),
    file: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
      </svg>
    ),
  };

  const colors = {
    success: 'bg-green-50 border-green-200 text-green-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
    processing: 'bg-purple-50 border-purple-200 text-purple-700',
    error: 'bg-red-50 border-red-200 text-red-700',
    file: 'bg-gray-50 border-gray-200 text-gray-700',
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${colors[type]}`}>
      <div className="flex-shrink-0">
        {icons[type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{title}</div>
        {subtitle && <div className="text-xs opacity-75 truncate">{subtitle}</div>}
      </div>
    </div>
  );
};

// === Workflow Step Indicator (Cursor-style) ===
interface WorkflowStep {
  label: string;
  status: 'pending' | 'active' | 'done';
}

const STEPS_PATTERN = /^\[STEPS\]([\s\S]*?)\[\/STEPS\]([\s\S]*)$/;

function parseWorkflowSteps(content: string): { steps: WorkflowStep[]; message?: string } | null {
  const match = content.match(STEPS_PATTERN);
  if (!match) return null;
  try {
    const steps = JSON.parse(match[1]) as WorkflowStep[];
    return { steps, message: match[2]?.trim() || undefined };
  } catch {
    return null;
  }
}

function buildStepsMessage(steps: WorkflowStep[], resultText?: string): string {
  return `[STEPS]${JSON.stringify(steps)}[/STEPS]${resultText || ''}`;
}

// Parse AI-generated [PLAN]step1|step2|...[/PLAN] marker from response
const PLAN_PATTERN = /\[PLAN\](.+?)\[\/PLAN\]/;
function parsePlanMarker(content: string): string[] | null {
  const match = content.match(PLAN_PATTERN);
  if (!match) return null;
  const steps = match[1].split('|').map(s => s.trim()).filter(Boolean);
  return steps.length >= 2 ? steps : null;
}

// Strip [PLAN]...[/PLAN] from content for display
function stripPlanMarker(content: string): string {
  return content.replace(/\[PLAN\].+?\[\/PLAN\]\s*/g, '').trim();
}

// Default fallback step labels
const DEFAULT_PLAN_LABELS = ['Analyzing request', 'Building elements', 'Validating layout', 'Applying template'];

// Build dynamic step array from plan labels with a given active index
function buildDynamicSteps(planLabels: string[], activeIndex: number): WorkflowStep[] {
  return planLabels.map((label, i) => ({
    label,
    status: i < activeIndex ? 'done' as const : i === activeIndex ? 'active' as const : 'pending' as const,
  }));
}

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="sda-step-spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
);

const PendingIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="8" opacity="0.35" />
  </svg>
);

const StepIndicator: React.FC<{ steps: WorkflowStep[]; message?: string }> = ({ steps, message }) => (
  <div className="sda-workflow-steps">
    {steps.map((step, i) => (
      <div key={i} className={`sda-workflow-step sda-step-${step.status}`}>
        <span className="sda-step-icon">
          {step.status === 'done' ? <CheckIcon /> : step.status === 'active' ? <SpinnerIcon /> : <PendingIcon />}
        </span>
        <span className="sda-step-label">{step.label}</span>
      </div>
    ))}
    {message && <div className="sda-workflow-result">{message}</div>}
  </div>
);

// Parse status message format: [STATUS:type:title:subtitle]
const parseStatusMessage = (content: string): { type: 'success' | 'info' | 'processing' | 'error' | 'file'; title: string; subtitle?: string } | null => {
  const match = content.match(/^\[STATUS:(\w+):([^:]+)(?::([^\]]+))?\]$/);
  if (match) {
    return {
      type: match[1] as 'success' | 'info' | 'processing' | 'error' | 'file',
      title: match[2],
      subtitle: match[3],
    };
  }
  return null;
};

// Type for copied element to send to AI
interface CopiedElement {
  name: string;
  type: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  content?: string;
  fontSize?: number;
  fontColor?: string;
  fontName?: string;
  [key: string]: any;
}


// Process image placeholders and generate images in parallel
const processImagePlaceholders = async (
  template: any,
  setMessages: React.Dispatch<React.SetStateAction<any[]>>
): Promise<any> => {
  // Support both formats: 
  // 1. __GENERATE_IMAGE:prompt__ (with trailing __)
  // 2. __GENERATE_IMAGE:prompt (without trailing __)
  // The (?:__)?$ at the end makes the trailing __ optional, and ensures we capture the entire prompt
  const imagePattern = /__GENERATE_IMAGE:(.+?)(?:__|$)/;
  const processedTemplate = JSON.parse(JSON.stringify(template)); // Deep clone

  /**
   * Check if image content looks like a prompt that needs generation.
   * Returns the prompt if it needs generation, null otherwise.
   */
  const getImagePromptIfNeeded = (content: string): string | null => {
    if (!content || typeof content !== 'string') return null;
    
    const trimmed = content.trim();
    
    // 1. Check standard format: __GENERATE_IMAGE:prompt__
    const match = trimmed.match(imagePattern);
    if (match) {
      return match[1].trim();
    }
    
    // 2. Skip if already valid image data
    // - Base64 data URI
    if (trimmed.startsWith('data:image/')) return null;
    // - HTTP URL
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return null;
    // - Empty or whitespace
    if (trimmed === '') return null;
    // - Placeholder marker (already processed or failed)
    if (trimmed === '[IMAGE_STRIPPED_FOR_STORAGE]') return null;
    // - Existing image placeholder (will be restored from old template later)
    if (trimmed === '__EXISTING_IMAGE__') return null;
    
    // 3. If content is a descriptive string (not URL, not base64, not empty),
    //    assume it's a prompt that needs generation (AI forgot to add prefix)
    //    This handles the case where AI outputs: "A breathtaking mountain landscape..."
    //    instead of: "__GENERATE_IMAGE:A breathtaking mountain landscape...__"
    console.log(`[AI Designer] Detected non-prefixed image prompt: "${trimmed.substring(0, 50)}..."`);
    return trimmed;
  };

  // Collect all image generation tasks
  const imageTasks: { page: number; name: string; prompt: string }[] = [];

  if (processedTemplate.schemas && Array.isArray(processedTemplate.schemas)) {
    processedTemplate.schemas.forEach((page: any, pageIndex: number) => {
      if (Array.isArray(page)) {
        // Array format: [[{name, content, ...}]]
        page.forEach((schema: any) => {
          if (schema.type?.toLowerCase() === 'image' && schema.content) {
            const prompt = getImagePromptIfNeeded(schema.content);
            if (prompt) {
              imageTasks.push({ page: pageIndex, name: schema.name, prompt });
            }
          }
        });
      } else if (typeof page === 'object') {
        // Record format: [{"field_name": {content, ...}}]
        Object.entries(page).forEach(([fieldName, schema]: [string, any]) => {
          if (schema.type?.toLowerCase() === 'image' && schema.content) {
            const prompt = getImagePromptIfNeeded(schema.content);
            if (prompt) {
              imageTasks.push({ page: pageIndex, name: fieldName, prompt });
            }
          }
        });
      }
    });
  }

  if (imageTasks.length === 0) {
    console.log('[AI Designer] No image placeholders found');
    return processedTemplate;
  }

  console.log(`[AI Designer] Found ${imageTasks.length} image placeholders to generate`);
  // Update last message with image generation step (don't push new message)
  setMessages(prev => {
    const newMessages = [...prev];
    newMessages[newMessages.length - 1] = {
      role: 'assistant' as const,
      content: buildStepsMessage([
        { label: 'Analyzing request', status: 'done' },
        { label: 'Building layout', status: 'done' },
        { label: `Generating ${imageTasks.length} image(s)`, status: 'active' },
        { label: 'Applying template', status: 'pending' },
      ])
    };
    return newMessages;
  });

  // Generate all images sequentially to avoid rate limits and better handle failures
  const results = [];
  for (const task of imageTasks) {
    try {
      console.log(`[AI Designer] Generating image: "${task.prompt}"`);
      const url = await generateImage({ prompt: task.prompt });
      
      // Convert URL to PNG Base64 (Data URI)
      // Using PNG conversion via Canvas to ensure compatibility with pdf-lib.
      console.log(`[AI Designer] Converting image to PNG base64: ${url}`);
      
      let finalUrl = url;
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
        const blob = await response.blob();
        
        // Convert to PNG using Canvas (handles WebP, JPEG, or any format the browser supports)
        finalUrl = await convertImageToPng(blob);
        console.log(`[AI Designer] Successfully converted image to PNG base64`);
      } catch (conversionError: any) {
        // If conversion fails (CORS or other), use the original URL if possible
        // While pdf-lib might fail later, at least the Designer can show it
        console.warn(`[AI Designer] Image conversion failed for "${task.name}", using original URL:`, conversionError.message);
      }
      
      results.push({ ...task, url: finalUrl, success: true });
    } catch (e: any) {
      console.error(`[AI Designer] Failed to generate image for "${task.name}":`, e);
      results.push({ ...task, url: '', success: false, error: e.message });
    }
  }

  // Hydrate template with generated image URLs
  let successCount = 0;
  let failCount = 0;
  
  results.forEach((result) => {
    const { page, name, url, success } = result;
    const pageData = processedTemplate.schemas[page];
    if (success && url) {
      successCount++;
      if (Array.isArray(pageData)) {
        const schema = pageData.find((s: any) => s.name === name);
        if (schema) schema.content = url;
      } else if (typeof pageData === 'object') {
        if (pageData[name]) pageData[name].content = url;
      }
    } else {
      failCount++;
      // Clear failed placeholders
      if (Array.isArray(pageData)) {
        const schema = pageData.find((s: any) => s.name === name);
        if (schema) schema.content = '';
      } else if (typeof pageData === 'object') {
        if (pageData[name]) pageData[name].content = '';
      }
    }
  });

  console.log(`[AI Designer] Image generation complete: ${successCount} succeeded, ${failCount} failed`);
  if (successCount > 0) {
    setMessages(prev => [...prev, { role: 'assistant', content: `✅ Generated ${successCount} image(s)${failCount > 0 ? `, ${failCount} failed` : ''}` }]);
  }

  return processedTemplate;
};


export default function AiDesigner() {
  const designerRef = useRef<HTMLDivElement | null>(null);
  const ui = useRef<Designer | Viewer | null>(null);
  const [mode, setMode] = useState<'preview' | 'edit'>('edit');
  const [searchParams, setSearchParams] = useSearchParams();

  // Show success toast when returning from successful payment
  useEffect(() => {
    if (searchParams.get('upgrade') === 'success') {
      toast.success('🎉 Upgrade successful! Welcome to the premium club.', {
        position: "top-center",
        autoClose: 10000,
      });
      
      // Refresh user data to update subscription status
      getCurrentUser().then(user => {
        if (user) {
          setCurrentUser(user);
          console.log('[AI Designer] Refreshed user subscription:', user.subscription);
        }
      }).catch(err => {
        console.error('[AI Designer] Failed to refresh user data after upgrade:', err);
      });
      
      // Clean up the URL parameter
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('upgrade');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const [template, setTemplate] = useState<Template>(() => {
    try {

      const savedSessionId = localStorage.getItem('ai-designer-current-session');
      const savedSessions = localStorage.getItem('ai-designer-sessions');
      if (savedSessionId && savedSessions) {
        const sessions: Session[] = JSON.parse(savedSessions);
        const currentSession = sessions.find(s => s.id === savedSessionId);
        if (currentSession && currentSession.templateSnapshot) {
          const parsed = JSON.parse(currentSession.templateSnapshot);
          
          if (parsed.schemas) {
             // Get plugin keys as lowercased set efficiently
             const pluginKeys = Object.keys(getPlugins());
             
             // Recursively sanitize and fix keys
             const sanitize = (schema: any): any => {
                if (!schema || typeof schema !== 'object') return schema;
                
                // Handle stripped image placeholders - replace with empty to show blank image
                if (schema.content === '[IMAGE_STRIPPED_FOR_STORAGE]') {
                   schema.content = '';
                   console.log('[AI Designer] Cleared stripped image placeholder');
                }
                
                // Map schema type to display-friendly plugin name using pluginMap
                if (schema.type) {
                   const lowerType = schema.type.toLowerCase();
                   const mappedType = pluginMap[lowerType] || pluginMap[schema.type];
                   if (mappedType) {
                      schema.type = mappedType;
                   }
                }

                if (!pluginKeys.includes(schema.type) && schema.type) {
                   console.warn(`[AI Designer] Removing invalid schema: ${schema.type}`);
                   return null; 
                }
                return schema;
             };

             parsed.schemas = parsed.schemas.map((page: any) => {
               if (Array.isArray(page)) {
                 return page.map(sanitize).filter(Boolean);
               } else {
                 const newPage: any = {};
                 Object.entries(page).forEach(([key, schema]: [string, any]) => {
                   const sanitized = sanitize(schema);
                   if (sanitized) newPage[key] = sanitized;
                 });
                 return newPage;
               }
             });
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load saved template:', e);
      localStorage.removeItem('ai-designer-sessions');
      localStorage.removeItem('ai-designer-current-session');
    }
    return getBlankTemplate();
  });
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string, templateUpdated?: boolean, attachedElements?: CopiedElement[] }[]>(() => {
    const saved = localStorage.getItem('ai-designer-messages');
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // File upload state - supports multiple files
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editorFileInputRef = useRef<HTMLInputElement | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<Array<{
    id: string;
    name: string;
    type: string;
    fileType: 'pdf' | 'image' | 'ppt';
    base64: string;
    ocrText?: string;
    /** 布局分析结果 (PaddleOCR-VL) */
    layoutAnalysis?: {
      elementCount: number;
      layoutHints: string;
      elementSuggestions: string;
    };
    /** 布局分析提示词 */
    layoutPrompt?: string;
    isProcessing?: boolean;
  }>>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  // Batch generation state
  const [spreadsheetData, setSpreadsheetData] = useState<SpreadsheetData | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);

  // Authentication state - derived from token presence
  const isLoggedIn = !!getAuthToken();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingServerSessions, setIsLoadingServerSessions] = useState(false);

  // Load current user when logged in
  useEffect(() => {
    if (isLoggedIn) {
      getCurrentUser().then(user => {
        setCurrentUser(user);
      });
    } else {
      setCurrentUser(null);
    }
  }, [isLoggedIn]);

  // Logout handler - clears session and redirects to auth page
  const handleLogout = useCallback(async () => {
    await logout();
    setCurrentUser(null);
    // Redirect to auth page
    window.location.href = '/auth';
  }, []);

  // Session management
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<Session[]>(() => {
    // Initially load from localStorage (for both guest and logged-in users)
    const saved = localStorage.getItem('ai-designer-sessions');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(() => {
    return localStorage.getItem('ai-designer-current-session') || undefined;
  });

  // Load sessions from server when logged in
  useEffect(() => {
    if (isLoggedIn && !isLoadingServerSessions) {
      setIsLoadingServerSessions(true);
      getServerSessions()
        .then(serverSessions => {
          // Convert server session format to local format
          const convertedSessions: Session[] = serverSessions.map((s: any) => ({
            id: s.id,
            title: s.title || '',
            createdAt: new Date(s.createdAt),
            updatedAt: new Date(s.updatedAt),
            messages: s.messages || [],
            templateSnapshot: s.templateSnapshot ? JSON.stringify(s.templateSnapshot) : undefined,
          }));
          setSessions(convertedSessions);
          console.log(`[AI Designer] Loaded ${convertedSessions.length} sessions from server`);
        })
        .catch(err => {
          console.error('[AI Designer] Failed to load server sessions:', err);
          // Fall back to localStorage if server fails
        })
        .finally(() => {
          setIsLoadingServerSessions(false);
        });
    }
  }, [isLoggedIn]);

  // Tool panel state - panels are now rendered directly in @pdfme/ui RightSidebar
  type ToolPanelType = 'font' | 'artFont' | 'paper' | 'emoji' | 'chart' | 'shape' | 'text' | 'misc' | null;
  const [activeToolPanel, setActiveToolPanel] = useState<ToolPanelType>(null);

  // Chat panel visibility state
  const [isChatOpen, setIsChatOpen] = useState(true);

  // Onboarding tour state - only show for first-time users
  const [onboardingStep, setOnboardingStep] = useState<number>(() => {
    const completed = localStorage.getItem('ai-designer-onboarding-complete');
    return completed ? 0 : 1; // 0 = disabled, 1-3 = active steps
  });

  const handleNextOnboardingStep = useCallback(() => {
    setOnboardingStep(prev => {
      if (prev >= 5) {
        localStorage.setItem('ai-designer-onboarding-complete', 'true');
        return 0; // Complete
      }
      return prev + 1;
    });
  }, []);

  const handleSkipOnboarding = useCallback(() => {
    localStorage.setItem('ai-designer-onboarding-complete', 'true');
    setOnboardingStep(0);
  }, []);

  // Clipboard elements from the editor (Ctrl+C) - Enhanced copy/paste feature
  const clipboardElements = useRef<CopiedElement[]>([]); // Elements copied from editor (Ctrl+C)
  const [pastedElements, setPastedElements] = useState<CopiedElement[]>([]); // Elements pasted into chat input
  const [selectedElements, setSelectedElements] = useState<CopiedElement[]>([]); // Currently selected elements in canvas

  // Generate unique session ID
  const generateSessionId = () => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Save sessions to localStorage with error handling and size limits
  useEffect(() => {
    try {
      // Limit sessions and strip large content before saving
      const sessionsToSave = sessions.slice(0, MAX_SESSIONS).map(session => ({
        ...session,
        templateSnapshot: session.templateSnapshot ? stripLargeContent(session.templateSnapshot) : undefined,
      }));
      localStorage.setItem('ai-designer-sessions', JSON.stringify(sessionsToSave));
    } catch (e: any) {
      if (e.name === 'QuotaExceededError') {
        console.warn('[AI Designer] localStorage quota exceeded, clearing oldest sessions...');
        // Remove oldest sessions until it fits
        const reducedSessions = sessions.slice(0, Math.max(3, sessions.length - 3));
        setSessions(reducedSessions);
        // Try again with reduced sessions
        try {
          const sessionsToSave = reducedSessions.slice(0, MAX_SESSIONS).map(session => ({
            ...session,
            templateSnapshot: session.templateSnapshot ? stripLargeContent(session.templateSnapshot) : undefined,
          }));
          localStorage.setItem('ai-designer-sessions', JSON.stringify(sessionsToSave));
        } catch (retryError) {
          console.error('[AI Designer] Still cannot save sessions, clearing all:', retryError);
          localStorage.removeItem('ai-designer-sessions');
        }
      } else {
        console.error('[AI Designer] Failed to save sessions:', e);
      }
    }
  }, [sessions]);

  // Auto-save current session when messages or template change
  // Debounce ref to track pending server save
  const serverSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (messages.length > 0) {
      const sessionId = currentSessionId || generateSessionId();
      if (!currentSessionId) {
        setCurrentSessionId(sessionId);
        localStorage.setItem('ai-designer-current-session', sessionId);
      }

      const updatedSession: Session = {
        id: sessionId,
        title: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: messages,
        templateSnapshot: JSON.stringify(template),
      };

      setSessions(prev => {
        const existingIndex = prev.findIndex(s => s.id === sessionId);
        if (existingIndex >= 0) {
          updatedSession.createdAt = prev[existingIndex].createdAt;
          const updated = [...prev];
          updated[existingIndex] = updatedSession;
          return updated;
        } else {
          return [updatedSession, ...prev];
        }
      });

      // Debounced save to server (only if logged in)
      if (isLoggedIn) {
        if (serverSaveTimeoutRef.current) {
          clearTimeout(serverSaveTimeoutRef.current);
        }
        serverSaveTimeoutRef.current = setTimeout(async () => {
          try {
            const templateData = JSON.parse(updatedSession.templateSnapshot || '{}');
            // Check if it's a local session ID (needs to create on server)
            if (sessionId.startsWith('session-')) {
              // Create new session on server
              const serverSession = await createServerSession({
                title: updatedSession.title || '',
                messages: updatedSession.messages as any,
                templateSnapshot: templateData,
              });
              // Update to use server ID
              setCurrentSessionId(serverSession.id);
              localStorage.setItem('ai-designer-current-session', serverSession.id);
              setSessions(prev => prev.map(s => 
                s.id === sessionId ? { ...s, id: serverSession.id } : s
              ));
              console.log(`[AI Designer] Created server session: ${serverSession.id}`);
            } else {
              // Update existing server session
              await updateServerSession(sessionId, {
                messages: updatedSession.messages as any,
                templateSnapshot: templateData,
              });
              console.log(`[AI Designer] Updated server session: ${sessionId}`);
            }
          } catch (err) {
            console.error('[AI Designer] Failed to save to server:', err);
          }
        }, 2000); // 2 second debounce
      }
    }
  }, [messages, template, currentSessionId, isLoggedIn]);

  // Handle session selection from history
  const handleSelectSession = useCallback(async (session: Session) => {
    // Try to load full session from server (includes non-stripped images)
    if (isLoggedIn && !session.id.startsWith('session-')) {
      try {
        const fullSession = await getServerSession(session.id);
        setMessages(fullSession.messages || []);
        if (fullSession.templateSnapshot) {
          const loadedTemplate = typeof fullSession.templateSnapshot === 'string' 
            ? JSON.parse(fullSession.templateSnapshot) 
            : fullSession.templateSnapshot;
          setTemplate(loadedTemplate);
        }
        setCurrentSessionId(fullSession.id);
        localStorage.setItem('ai-designer-current-session', fullSession.id);
        localStorage.setItem('ai-designer-messages', JSON.stringify(fullSession.messages || []));
        setShowHistory(false);
        console.log(`[AI Designer] Loaded full session from server: ${fullSession.id}`);
        return;
      } catch (err) {
        console.error('[AI Designer] Failed to load session from server, falling back to local:', err);
      }
    }
    
    // Fallback to local session data
    setMessages(session.messages);
    if (session.templateSnapshot) {
      try {
        const loadedTemplate = JSON.parse(session.templateSnapshot);
        setTemplate(loadedTemplate);
      } catch (e) {
        console.error('Failed to parse template snapshot:', e);
      }
    }
    setCurrentSessionId(session.id);
    localStorage.setItem('ai-designer-current-session', session.id);
    localStorage.setItem('ai-designer-messages', JSON.stringify(session.messages));
    setShowHistory(false);
  }, [isLoggedIn]);

  // Handle session deletion
  const handleDeleteSession = useCallback(async (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    
    // Also delete from server if logged in and it's a server session
    if (isLoggedIn && !sessionId.startsWith('session-')) {
      try {
        await deleteServerSession(sessionId);
        console.log(`[AI Designer] Deleted server session: ${sessionId}`);
      } catch (err) {
        console.error('[AI Designer] Failed to delete session from server:', err);
      }
    }
    
    if (currentSessionId === sessionId) {
      // If deleting current session, start a new one
      setCurrentSessionId(undefined);
      setMessages([]);
      setTemplate(getBlankTemplate());
      localStorage.removeItem('ai-designer-current-session');
      localStorage.removeItem('ai-designer-messages');
    }
  }, [currentSessionId, isLoggedIn]);

  // Start new chat
  const startNewChat = useCallback(() => {
    setCurrentSessionId(undefined);
    setMessages([]);
    setTemplate(getBlankTemplate());
    localStorage.removeItem('ai-designer-current-session');
    localStorage.removeItem('ai-designer-messages');
    setMode('preview'); // Reset to preview on new chat
  }, []);

  // Listen for Ctrl+C in editor to copy selected elements to clipboard
  useEffect(() => {
    const handleCopy = (e: KeyboardEvent) => {
      // Only in edit mode
      if (mode !== 'edit') return;
      // Check if Ctrl+C or Cmd+C
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        // Don't intercept if user is in an input field or textarea
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        
        // Don't intercept if user is in the chat panel (let normal text copy work)
        if (target.closest('.sda-chat-panel') || target.closest('.sda-messages')) return;
        
        // If there are selected elements (from onSelectionChange), copy them to our clipboard
        if (selectedElements.length > 0) {
          clipboardElements.current = [...selectedElements];
          console.log('[AI Designer] Copied', selectedElements.length, 'elements to AI clipboard');
        }
      }
    };
    
    document.addEventListener('keydown', handleCopy);
    return () => document.removeEventListener('keydown', handleCopy);
  }, [mode, selectedElements]);



  const buildUi = useCallback((currentTemplate: Template, uiMode: 'preview' | 'edit') => {
    if (!designerRef.current) return;

    // Destroy existing instance if any
    if (ui.current) {
      ui.current.destroy();
    }

    const plugins = getPlugins();

    const options = {
        font: getFontsData(),
        lang: 'en' as const,
        layoutMode: 'header', // Custom option
        sidebarOpen: false, // Default collapse Field List for maximum canvas space
        // Ultra Minimal Design theme - override Ant Design defaults
        theme: {
          token: {
            colorPrimary: '#8B5CF6', // Light purple (Notion-style)
            colorBgLayout: '#f5f5f5', // Light gray background
            colorBgContainer: '#ffffff', // White container
            colorBorder: '#e5e5e5', // Light border
            colorBorderSecondary: '#f0f0f0', // Even lighter border
            colorText: '#0a0a0a', // Black text
            colorTextSecondary: '#737373', // Gray secondary text
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          },
        },
        currentUser: currentUser, // User profile for header
        onLogout: handleLogout, // Logout callback for header
        onDownloadPdf: downloadPdf, // PDF download
        onDownloadPpt: async () => {
          // PPT export using html2canvas for 100% fidelity
          try {
            if (designerRef.current && ui.current) {
              console.log('[AI Designer] Starting PPT export...');
              await generatePPT(
                designerRef.current,
                ui.current.getTemplate(),
                'my-design'
              );
              console.log('[AI Designer] PPT export completed!');
            } else {
              alert('No design to export. Please create a design first.');
            }
          } catch (e) {
            console.error('[AI Designer] PPT export failed:', e);
            alert('PPT export failed: ' + (e as Error).message);
          }
        },
        onDownloadPng: async () => {
          // PNG export using html2canvas
          try {
            if (designerRef.current && ui.current) {
              console.log('[AI Designer] Starting PNG export...');
              const { default: generateImageExport } = await import('../utils/generateImage');
              await generateImageExport(
                designerRef.current,
                ui.current.getTemplate(),
                'my-design',
                'png'
              );
              console.log('[AI Designer] PNG export completed!');
            } else {
              alert('No design to export. Please create a design first.');
            }
          } catch (e) {
            console.error('[AI Designer] PNG export failed:', e);
            alert('PNG export failed: ' + (e as Error).message);
          }
        },
        onDownloadJpg: async () => {
          // JPG export using html2canvas
          try {
            if (designerRef.current && ui.current) {
              console.log('[AI Designer] Starting JPG export...');
              const { default: generateImageExport } = await import('../utils/generateImage');
              await generateImageExport(
                designerRef.current,
                ui.current.getTemplate(),
                'my-design',
                'jpg',
                0.92
              );
              console.log('[AI Designer] JPG export completed!');
            } else {
              alert('No design to export. Please create a design first.');
            }
          } catch (e) {
            console.error('[AI Designer] JPG export failed:', e);
            alert('JPG export failed: ' + (e as Error).message);
          }
        },
        onDownloadSvg: async () => {
          // SVG export
          try {
            if (designerRef.current && ui.current) {
              console.log('[AI Designer] Starting SVG export...');
              const { default: generateSVGExport } = await import('../utils/generateSVG');
              await generateSVGExport(
                designerRef.current,
                ui.current.getTemplate(),
                'my-design'
              );
              console.log('[AI Designer] SVG export completed!');
            } else {
              alert('No design to export. Please create a design first.');
            }
          } catch (e) {
            console.error('[AI Designer] SVG export failed:', e);
            alert('SVG export failed: ' + (e as Error).message);
          }
        },
        // Mode toggle
        currentMode: uiMode,
        onModeChange: (newMode: 'preview' | 'edit') => {
          setMode(newMode);
        },
        activePanel: activeToolPanel, // This tells RightSidebar which panel to show
        // Current paper size for PaperPanel display
        paperSize: typeof currentTemplate.basePdf === 'object' && 'width' in currentTemplate.basePdf 
          ? { width: currentTemplate.basePdf.width, height: currentTemplate.basePdf.height }
          : { width: 210, height: 297 },
        onPaperSizeChange: (width: number, height: number) => {
          // Update the basePdf with new paper dimensions
          const newBasePdf = typeof currentTemplate.basePdf === 'object' && 'width' in currentTemplate.basePdf
            ? { ...currentTemplate.basePdf, width, height }
            : { width, height, padding: [0, 0, 0, 0] as [number, number, number, number] };
          
          const updatedTemplate = {
            ...currentTemplate,
            basePdf: newBasePdf,
          };
          setTemplate(updatedTemplate);
          // Panel stays open so user can preview the change
        },
        onPanelClose: () => {
          setActiveToolPanel(null);
        },
        onPaperClick: () => {
          setActiveToolPanel(prev => prev === 'paper' ? null : 'paper');
        },
        onEmojiClick: () => {
          setActiveToolPanel(prev => prev === 'emoji' ? null : 'emoji');
        },
        // Callback for EmojiPanel to insert emoji as image element
        onInsertEmoji: async (svgPath: string, annotation: string) => {
          console.log('[AI Designer] Inserting emoji:', annotation, svgPath);
          
          const newSchemaName = `emoji_${Date.now()}`;
          
          // Fetch SVG and convert to Data URL for better compatibility
          let finalContent = svgPath;
          try {
            const resp = await fetch(svgPath);
            const svgText = await resp.text();
            finalContent = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgText)));
          } catch (e) {
            console.error('[AI Designer] Failed to fetch SVG for data URL:', e);
          }
          
          const newSchema = {
            type: 'image',
            position: { x: 50, y: 50 }, // Center-ish position
            width: 30,
            height: 30,
            content: finalContent,
          };
          
          // Use functional update to get the latest template state
          // This prevents issues when using stale closure values
          setTemplate(prevTemplate => {
            const updatedTemplate = JSON.parse(JSON.stringify(prevTemplate));
            if (!updatedTemplate.schemas || updatedTemplate.schemas.length === 0) {
              updatedTemplate.schemas = [{}];
            }
            
            // Support both Array and Record schema formats
            const firstPage = updatedTemplate.schemas[0];
            if (Array.isArray(firstPage)) {
              // Array format: push element with name
              firstPage.push({ ...newSchema, name: newSchemaName });
              console.log('[AI Designer] Added emoji to Array schema');
            } else if (typeof firstPage === 'object') {
              // Record format: add as key-value
              firstPage[newSchemaName] = newSchema;
              console.log('[AI Designer] Added emoji to Record schema');
            } else {
              console.error('[AI Designer] Unexpected schema format:', typeof firstPage);
              return prevTemplate; // Return unchanged if unexpected format
            }
            
            console.log('[AI Designer] Inserted emoji successfully');
            return updatedTemplate;
          });
          setActiveToolPanel(null); // Close panel after insert
        },
        onChartClick: () => {
          setActiveToolPanel(prev => prev === 'chart' ? null : 'chart');
        },
        // Callback for ChartPanel to insert a table element
        onInsertTable: () => {
          console.log('[AI Designer] Inserting table');
          const allPlugins = getPlugins() as Record<string, any>;
          const tablePlugin = allPlugins['table'];
          if (!tablePlugin?.propPanel?.defaultSchema) {
            console.error('[AI Designer] Table plugin not found');
            return;
          }
          const defaultSchema = tablePlugin.propPanel.defaultSchema;
          const newSchemaName = `table_${Date.now()}`;
          const newSchema = {
            ...defaultSchema,
            position: { x: 30, y: 30 },
          };
          
          setTemplate(prevTemplate => {
            const updatedTemplate = JSON.parse(JSON.stringify(prevTemplate));
            if (!updatedTemplate.schemas || updatedTemplate.schemas.length === 0) {
              updatedTemplate.schemas = [{}];
            }
            const firstPage = updatedTemplate.schemas[0];
            if (Array.isArray(firstPage)) {
              firstPage.push({ ...newSchema, name: newSchemaName });
            } else if (typeof firstPage === 'object') {
              firstPage[newSchemaName] = newSchema;
            }
            return updatedTemplate;
          });
          setActiveToolPanel(null);
        },
        onTextClick: () => {
          setActiveToolPanel(prev => prev === 'text' ? null : 'text');
        },
        onShapeClick: () => {
          setActiveToolPanel(prev => prev === 'shape' ? null : 'shape');
        },
        onMiscClick: () => {
          setActiveToolPanel(prev => prev === 'misc' ? null : 'misc');
        },
        onUploadClick: () => {
          editorFileInputRef.current?.click();
        },
        // Callback for ChartPanel to insert chart as image element
        onInsertChart: async (dataUrl: string, chartType: string, chartMeta?: Record<string, any>) => {
          console.log('[AI Designer] Inserting chart:', chartType);
          
          const newSchemaName = `chart_${chartType}_${Date.now()}`;
          
          const newSchema: Record<string, any> = {
            type: 'image',
            position: { x: 30, y: 30 },
            width: 120,
            height: 80,
            content: dataUrl,
            // Store chart metadata for later editing
            chartType: chartMeta?.chartType || chartType,
            chartData: chartMeta?.chartData || `Label,Value\nQ1,120\nQ2,190\nQ3,150\nQ4,220\nQ5,280`,
            chartPaletteIndex: chartMeta?.chartPaletteIndex ?? 0,
            chartTitle: chartMeta?.chartTitle || '',
            chartParams: chartMeta?.chartParams || {},
          };
          
          setTemplate(prevTemplate => {
            const updatedTemplate = JSON.parse(JSON.stringify(prevTemplate));
            if (!updatedTemplate.schemas || updatedTemplate.schemas.length === 0) {
              updatedTemplate.schemas = [{}];
            }
            
            const firstPage = updatedTemplate.schemas[0];
            if (Array.isArray(firstPage)) {
              firstPage.push({ ...newSchema, name: newSchemaName });
              console.log('[AI Designer] Added chart to Array schema');
            } else if (typeof firstPage === 'object') {
              firstPage[newSchemaName] = newSchema;
              console.log('[AI Designer] Added chart to Record schema');
            } else {
              console.error('[AI Designer] Unexpected schema format:', typeof firstPage);
              return prevTemplate;
            }
            
            console.log('[AI Designer] Inserted chart successfully');
            return updatedTemplate;
          });
          setActiveToolPanel(null);
        },
        // Callback for ChartEditorSection to update existing chart's image and metadata
        onUpdateChart: (schemaId: string, dataUrl: string, chartMeta: Record<string, any>) => {
          setTemplate(prevTemplate => {
            const updatedTemplate = JSON.parse(JSON.stringify(prevTemplate));
            for (const page of updatedTemplate.schemas) {
              if (Array.isArray(page)) {
                for (const schema of page) {
                  if (schema.name && schema.name.startsWith('chart_') && schema.id === schemaId) {
                    schema.content = dataUrl;
                    Object.assign(schema, chartMeta);
                    return updatedTemplate;
                  }
                }
              } else if (typeof page === 'object') {
                for (const [key, schema] of Object.entries(page)) {
                  if (key.startsWith('chart_') && (schema as any).id === schemaId) {
                    (schema as any).content = dataUrl;
                    Object.assign(schema as any, chartMeta);
                    return updatedTemplate;
                  }
                }
              }
            }
            // Fallback: find by iterating all schemas and matching name prefix + id
            console.warn('[AI Designer] Chart schema not found by id:', schemaId);
            return prevTemplate;
          });
        },
      };

    if (uiMode === 'edit') {
      designerRef.current.innerHTML = ''; // Force clear container
      ui.current = new Designer({
        domContainer: designerRef.current,
        template: currentTemplate,
        options,
        plugins,
      });
      // Capture changes in edit mode
      (ui.current as Designer).onSaveTemplate((newTemplate) => {
          setTemplate(newTemplate);
      });
      (ui.current as Designer).onChangeTemplate((newTemplate) => {
        setTemplate(newTemplate);
      });
      // Track selected elements for copy-to-AI feature
      // Note: onSelectionChange may not be in type definitions but exists at runtime
      if (typeof (ui.current as any).onSelectionChange === 'function') {
        (ui.current as any).onSelectionChange((schemas: any[]) => {
          const elements: CopiedElement[] = schemas.map((s: any) => ({
            name: s.name,
            type: s.type || 'unknown',
            position: s.position || { x: 0, y: 0 },
            width: s.width || 0,
            height: s.height || 0,
            content: s.content,
            fontSize: s.fontSize,
            fontColor: s.fontColor,
            fontName: s.fontName,
          }));
          setSelectedElements(elements);
        });
      }
    } else {
      // Preview mode (Viewer)
      designerRef.current.innerHTML = ''; // Force clear container
      const inputs = getInputFromTemplate(currentTemplate);
      ui.current = new Viewer({
        domContainer: designerRef.current,
        template: currentTemplate,
        inputs,
        options,
        plugins,
      });
    }
  }, [currentUser, handleLogout]); // activeToolPanel removed: synced via updateOptions effect; functional updates in onPaperClick/onEmojiClick avoid stale closures

  // Initialize UI ONLY when Mode or container changes
  // Template/basePdf changes are handled by updateTemplate effect below (no rebuild needed)
  // Also rebuild when currentUser changes to update the header profile display
  useEffect(() => {
    buildUi(template, mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, designerRef, currentUser]); // Rebuild on mode, container, or user change

  // Update logic for template changes
  // When template state changes (e.g. from AI), we want to update the UI
  // But if we are in Edit mode, the UI itself might be the source of change, so we need to be careful.
  // Ideally, if the change comes from AI, we just update.
  useEffect(() => {
    if (ui.current) {
      // If in edit mode and the update matches what we just edited, this might be redundant but safe
      // If in preview mode, we definitely need to update
       const currentUiTemplate = ui.current.getTemplate();
       if (JSON.stringify(currentUiTemplate) !== JSON.stringify(template)) {
          if (mode === 'edit') {
             ui.current.updateTemplate(template);
          } else {
             ui.current.updateTemplate(template);
             // Also update inputs for viewer if template schema changes
             const inputs = getInputFromTemplate(template);
             (ui.current as Viewer).setInputs(inputs);
          }
       }
    }
  }, [template, mode]); // Depend on template so AI updates reflect immediately

  // Sync activeToolPanel and paperSize to Designer options when they change
  useEffect(() => {
    if (ui.current && mode === 'edit') {
      const paperSize = typeof template.basePdf === 'object' && 'width' in template.basePdf
        ? { width: template.basePdf.width, height: template.basePdf.height }
        : { width: 210, height: 297 };
      (ui.current as any).updateOptions({
        activePanel: activeToolPanel,
        paperSize,
        // Include onPanelClose so the close/arrow button in PaperPanel works
        onPanelClose: () => {
          setActiveToolPanel(null);
        },
        // Include the callback so PaperPanel can trigger size changes
        onPaperSizeChange: (width: number, height: number) => {
          // Use functional update to get latest template state (avoid stale closure)
          setTemplate(prevTemplate => {
            const newBasePdf = typeof prevTemplate.basePdf === 'object' && 'width' in prevTemplate.basePdf
              ? { ...prevTemplate.basePdf, width, height }
              : { width, height, padding: [0, 0, 0, 0] as [number, number, number, number] };
            
            return {
              ...prevTemplate,
              basePdf: newBasePdf,
            };
          });
        },
        // Chart editor callback
        onUpdateChart: (schemaId: string, dataUrl: string, chartMeta: Record<string, any>) => {
          setTemplate(prevTemplate => {
            const updatedTemplate = JSON.parse(JSON.stringify(prevTemplate));
            for (const page of updatedTemplate.schemas) {
              if (Array.isArray(page)) {
                for (const schema of page) {
                  if (schema.name && schema.name.startsWith('chart_') && schema.id === schemaId) {
                    schema.content = dataUrl;
                    Object.assign(schema, chartMeta);
                    return updatedTemplate;
                  }
                }
              } else if (typeof page === 'object') {
                for (const [key, schema] of Object.entries(page)) {
                  if (key.startsWith('chart_') && (schema as any).id === schemaId) {
                    (schema as any).content = dataUrl;
                    Object.assign(schema as any, chartMeta);
                    return updatedTemplate;
                  }
                }
              }
            }
            return prevTemplate;
          });
        },
      });
    }
  }, [activeToolPanel, mode, template.basePdf]);

  // Save messages to local storage
  useEffect(() => {
    localStorage.setItem('ai-designer-messages', JSON.stringify(messages));
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Transform AI template output to PDFme format
  const transformTemplate = (aiTemplate: any): Template => {
    console.log('[AI Designer] Transforming template:', JSON.stringify(aiTemplate, null, 2));

    if (!aiTemplate.schemas || !Array.isArray(aiTemplate.schemas) || aiTemplate.schemas.length === 0) {
      throw new Error('Invalid template: schemas is missing or empty');
    }

    const firstPage = aiTemplate.schemas[0];
    const isAlreadyRecord = firstPage && !Array.isArray(firstPage) && typeof firstPage === 'object';

    let mappedSchemas;
    if (isAlreadyRecord) {
      // Already in Record format, just map the types and ensure defaults
      mappedSchemas = aiTemplate.schemas.map((pageRecord: Record<string, any>) => {
        const newPageRecord: Record<string, any> = {};
        for (const [fieldName, schema] of Object.entries(pageRecord)) {
          const lowerType = (schema.type || '').toLowerCase();
          const mappedType = pluginMap[lowerType] || schema.type;
          newPageRecord[fieldName] = { 
            ...schema, 
            type: mappedType,
            // Ensure position is defined
            position: schema.position || { x: 10, y: 10 },
            width: schema.width || 50,
            height: schema.height || 20,
          };
        }
        return newPageRecord;
      });
    } else {
      // Transform array-of-arrays to Record format
      mappedSchemas = aiTemplate.schemas.map((page: any[]) => {
        const pageRecord: Record<string, any> = {};
        page.forEach((schema: any) => {
          const lowerType = (schema.type || '').toLowerCase();
          const mappedType = pluginMap[lowerType] || schema.type;
          const { name, content, ...rest } = schema;

          // Stringify content if it's an object/array (required by pdfme for Table/other plugins)
          let finalContent = content;
          if (typeof content === 'object' && content !== null) {
            finalContent = JSON.stringify(content);
          }

          pageRecord[name] = { ...rest, content: finalContent, type: mappedType };
        });
        return pageRecord;
      });
    }

    const result = { ...aiTemplate, schemas: mappedSchemas };
    
    // Final safety pass: Ensure no schemas have empty content and enforce standard fonts
    const isCJK = (text: string) => /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(text);
    
    // Comprehensive emoji regex - matches most emoji ranges
    // PDF fonts (except NotoEmoji/OpenMoji) cannot render emojis, they appear as □ boxes
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23F3}]|[\u{23F8}-\u{23FA}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2614}-\u{2615}]|[\u{2648}-\u{2653}]|[\u{267F}]|[\u{2693}]|[\u{26A1}]|[\u{26AA}-\u{26AB}]|[\u{26BD}-\u{26BE}]|[\u{26C4}-\u{26C5}]|[\u{26CE}]|[\u{26D4}]|[\u{26EA}]|[\u{26F2}-\u{26F3}]|[\u{26F5}]|[\u{26FA}]|[\u{26FD}]/gu;
    
    // Check if font is an emoji font
    const isEmojiFont = (fontName: string) => ['NotoEmoji', 'OpenMoji'].includes(fontName);

    result.schemas.forEach((page: Record<string, any>) => {
       Object.values(page).forEach((schema: any) => {
          if ((schema.type === 'text' || schema.type === 'multiVariableText')) {
             if (!schema.content) {
                schema.content = schema.name || 'Text';
             }
             
             // Remove emoji characters from text content UNLESS using emoji font
             // This prevents broken □ boxes in PDF output
             if (schema.content && typeof schema.content === 'string' && !isEmojiFont(schema.fontName)) {
                const originalContent = schema.content;
                schema.content = schema.content.replace(emojiRegex, '').trim();
                if (originalContent !== schema.content) {
                   console.log(`[AI Designer] Stripped emojis from "${schema.name || 'unknown'}": "${originalContent}" → "${schema.content}"`);
                }
             }
             
             // CRITICAL: Force NotoSansSC if content contains CJK characters
             // This overrides AI's poor font choices (e.g. Lato) which cause "tofu" boxes
             if (schema.content && isCJK(schema.content)) {
                schema.fontName = 'NotoSansSC';
             }
          }
          
          // Ensure fontColor is set
          if (!schema.fontColor) {
             schema.fontColor = '#000000';
          }
       });
    });

    console.log('[AI Designer] Transformed template:', JSON.stringify(result, null, 2));
    return result as Template;
  };

  // Editor toolbar upload — process files silently, result goes directly to canvas (no chat messages)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!allowedTypes.includes(file.type) && !file.name.endsWith('.pptx') && !file.name.endsWith('.ppt')) {
        console.warn('[Editor Upload] Skipped unsupported file:', file.name, file.type);
        continue;
      }

      const isSvg = file.type === 'image/svg+xml';
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      const isPpt = file.type.includes('presentation') || file.type.includes('powerpoint')
        || file.name.endsWith('.pptx') || file.name.endsWith('.ppt');

      try {
        // ═══════════════════════════════════════════════════════════════
        // SVG → insert as image element on canvas
        // ═══════════════════════════════════════════════════════════════
        if (isSvg) {
          const svgText = await file.text();
          const svgBase64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgText)));
          const newSchemaName = `svg_${Date.now()}`;
          const newSchema = { type: 'image', position: { x: 50, y: 50 }, width: 60, height: 60, content: svgBase64 };

          setTemplate(prev => {
            const updated = JSON.parse(JSON.stringify(prev));
            if (!updated.schemas || updated.schemas.length === 0) updated.schemas = [{}];
            const page = updated.schemas[0];
            if (Array.isArray(page)) page.push({ ...newSchema, name: newSchemaName });
            else if (typeof page === 'object') page[newSchemaName] = newSchema;
            return updated;
          });
          console.log('[Editor Upload] SVG inserted on canvas:', file.name);
          continue;
        }

        // ═══════════════════════════════════════════════════════════════
        // PPT → Azure OCR → editable pdfme template
        // ═══════════════════════════════════════════════════════════════
        if (isPpt) {
          console.log('[Editor Upload] Processing PPT:', file.name);
          const pptArrayBuf = await file.arrayBuffer();
          const pptBytes = new Uint8Array(pptArrayBuf);
          const chunkSize = 8192;
          let pptBinary = '';
          for (let j = 0; j < pptBytes.length; j += chunkSize) {
            const chunk = pptBytes.subarray(j, Math.min(j + chunkSize, pptBytes.length));
            pptBinary += String.fromCharCode.apply(null, chunk as any);
          }
          const pptBase64 = btoa(pptBinary);

          // Run Azure OCR for text/table extraction
          const layoutResult = await analyzeDocumentLayoutFromFile(pptBase64, 'pptx');
          if (!layoutResult.success) throw new Error(layoutResult.error || 'PPT analysis failed');

          const slideCount = layoutResult.pageCount;
          const firstSlideDim = layoutResult.pageDimensions?.[0] || { width: 338.67, height: 190.5 };

          // Try server-side LibreOffice conversion: PPT → PDF → slide images
          let slideImages: string[] = [];
          try {
            const convertResult = await convertDocument(pptBase64, file.name);
            if (convertResult.success && convertResult.pdfBase64) {
              // Render PDF pages as images via pdf2img
              const pdfBuf = Uint8Array.from(atob(convertResult.pdfBase64), c => c.charCodeAt(0));
              const imgBufs = await pdf2img(new Uint8Array(pdfBuf), { scale: 1.5, imageType: 'jpeg' });
              slideImages = imgBufs.map((buf: ArrayBuffer) => {
                const bytes = new Uint8Array(buf);
                let binary = '';
                const chunkSz = 8192;
                for (let k = 0; k < bytes.length; k += chunkSz) {
                  const c = bytes.subarray(k, Math.min(k + chunkSz, bytes.length));
                  binary += String.fromCharCode.apply(null, c as any);
                }
                return 'data:image/jpeg;base64,' + btoa(binary);
              });
              console.log(`[Editor Upload] PPT → PDF → ${slideImages.length} slide image(s)`);
            }
          } catch (convErr: any) {
            console.warn('[Editor Upload] Server-side PPT conversion unavailable, proceeding without background:', convErr.message);
          }

          const allPageSchemas: Record<string, any>[] = [];
          for (let si = 0; si < slideCount; si++) {
            const pageElements = layoutResult.pageElements?.get(si) || [];
            const slideDim = layoutResult.pageDimensions?.[si] || firstSlideDim;
            const slideImg = slideImages[si] || undefined;
            if (pageElements.length > 0) {
              allPageSchemas.push(await convertLayoutToPdfmeSchemas(pageElements, slideDim, slideImg));
            } else if (slideImg) {
              // No OCR elements but we have a slide image — show background only
              allPageSchemas.push({
                '_bg': { type: 'image', position: { x: 0, y: 0 }, width: slideDim.width, height: slideDim.height, content: slideImg },
              });
            } else {
              allPageSchemas.push({});
            }
          }

          setTemplate({
            basePdf: { width: firstSlideDim.width, height: firstSlideDim.height, padding: [0, 0, 0, 0] },
            schemas: allPageSchemas as any,
          });
          console.log(`[Editor Upload] PPT → ${slideCount} slide(s) on canvas (bg: ${slideImages.length > 0 ? 'YES' : 'NO'})`);
          continue;
        }

        // ═══════════════════════════════════════════════════════════════
        // Image → Azure OCR → editable pdfme template
        // ═══════════════════════════════════════════════════════════════
        if (isImage) {
          console.log('[Editor Upload] Processing image:', file.name);
          const base64 = await fileToBase64(file);

          const layoutResult = await analyzeDocumentLayoutFromFile(base64, 'image');
          if (layoutResult.success && layoutResult.pageCount > 0) {
            const pageElements = layoutResult.pageElements?.get(0) || [];
            const imageDim = layoutResult.pageDimensions?.[0] || { width: 210, height: 297 };

            // Build the original image data URL for 1:1 background
            const mimeType = file.type || 'image/png';
            const imageDataUrl = `data:${mimeType};base64,${base64}`;

            if (pageElements.length > 0) {
              const pageSchema = await convertLayoutToPdfmeSchemas(pageElements, imageDim, imageDataUrl);
              setTemplate({
                basePdf: { width: imageDim.width, height: imageDim.height, padding: [0, 0, 0, 0] },
                schemas: [pageSchema] as any,
              });
              console.log(`[Editor Upload] Image → ${Object.keys(pageSchema).length} element(s) on canvas (bg: YES)`);
            } else {
              // No OCR elements detected — just show the image as background
              setTemplate({
                basePdf: { width: imageDim.width, height: imageDim.height, padding: [0, 0, 0, 0] },
                schemas: [{
                  '_bg': { type: 'image', position: { x: 0, y: 0 }, width: imageDim.width, height: imageDim.height, content: imageDataUrl },
                }] as any,
              });
              console.log('[Editor Upload] Image → background only (no OCR elements)');
            }
          }
          continue;
        }

        // ═══════════════════════════════════════════════════════════════
        // PDF → Azure OCR → editable pdfme template
        // ═══════════════════════════════════════════════════════════════
        if (isPdf) {
          console.log('[Editor Upload] Processing PDF:', file.name);
          const pdfArrayBuf = await file.arrayBuffer();
          const copyForSize = new Uint8Array(new Uint8Array(pdfArrayBuf));
          const pageSizes = await pdf2size(copyForSize);

          // Run pdf2img and Azure OCR in parallel for speed
          // pdf2img: render each page as JPEG at 1.5x scale for background
          const copyForImg = new Uint8Array(new Uint8Array(pdfArrayBuf));
          const imgPromise = pdf2img(copyForImg, { scale: 1.5, imageType: 'jpeg' })
            .then((buffers: ArrayBuffer[]) => {
              return buffers.map((buf: ArrayBuffer) => {
                const bytes = new Uint8Array(buf);
                let binary = '';
                const chunkSz = 8192;
                for (let k = 0; k < bytes.length; k += chunkSz) {
                  const chunk = bytes.subarray(k, Math.min(k + chunkSz, bytes.length));
                  binary += String.fromCharCode.apply(null, chunk as any);
                }
                return 'data:image/jpeg;base64,' + btoa(binary);
              });
            })
            .catch((err: any) => {
              console.warn('[Editor Upload] pdf2img failed, proceeding without background:', err.message);
              return [] as string[];
            });

          // Azure OCR: extract text/table/figure layout
          const copyForOcr = new Uint8Array(new Uint8Array(pdfArrayBuf));
          const ocrPdfBytes = copyForOcr;
          const chunkSize = 8192;
          let pdfBinary = '';
          for (let j = 0; j < ocrPdfBytes.length; j += chunkSize) {
            const chunk = ocrPdfBytes.subarray(j, Math.min(j + chunkSize, ocrPdfBytes.length));
            pdfBinary += String.fromCharCode.apply(null, chunk as any);
          }
          const pdfBase64 = btoa(pdfBinary);
          const ocrPromise = analyzeDocumentLayoutFromPdf(pdfBase64);

          // Wait for both to complete
          const [pageImages, layoutResult] = await Promise.all([imgPromise, ocrPromise]);
          console.log(`[Editor Upload] pdf2img: ${pageImages.length} images, OCR: ${layoutResult.success ? 'OK' : 'FAIL'}`);

          const allPageSchemas: Record<string, any>[] = [];
          for (let pi = 0; pi < pageSizes.length; pi++) {
            const pageSize = pageSizes[pi] || { width: 210, height: 297 };
            const pageElements = layoutResult.pageElements?.get(pi) || [];
            const pageImg = pageImages[pi] || undefined;
            if (pageElements.length > 0) {
              allPageSchemas.push(await convertLayoutToPdfmeSchemas(pageElements, pageSize, pageImg));
            } else if (pageImg) {
              // No OCR elements but we have a page image — show background only
              allPageSchemas.push({
                '_bg': { type: 'image', position: { x: 0, y: 0 }, width: pageSize.width, height: pageSize.height, content: pageImg },
              });
            } else {
              allPageSchemas.push({});
            }
          }

          const firstPageSize = pageSizes[0] || { width: 210, height: 297 };
          setTemplate({
            basePdf: { width: firstPageSize.width, height: firstPageSize.height, padding: [0, 0, 0, 0] },
            schemas: allPageSchemas as any,
          });
          console.log(`[Editor Upload] PDF → ${pageSizes.length} page(s) on canvas (bg: ${pageImages.length > 0 ? 'YES' : 'NO'})`);
          continue;
        }
      } catch (error: any) {
        console.error('[Editor Upload] Error processing file:', file.name, error.message);
      }
    }

    // Reset file input
    if (e.target) e.target.value = '';
  };

  // Lightweight file attach for chat panel (paperclip) — just attaches as context, no OCR/conversion
  const handleChatFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
    const validFiles: File[] = [];
    const spreadsheetFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (isSpreadsheetFile(file)) {
        spreadsheetFiles.push(file);
      } else if (allowedTypes.includes(file.type) || file.name.endsWith('.pptx') || file.name.endsWith('.ppt')) {
        validFiles.push(file);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Skipped unsupported file: ${file.name}` }]);
      }
    }

    // Spreadsheets still trigger batch generation
    if (spreadsheetFiles.length > 0) {
      const spreadsheetFile = spreadsheetFiles[0];
      try {
        setMessages(prev => [...prev, { role: 'assistant', content: `📊 Processing spreadsheet: ${spreadsheetFile.name}...` }]);
        const data = await parseSpreadsheet(spreadsheetFile);
        setSpreadsheetData(data);
        setShowBatchModal(true);
        setMessages(prev => [...prev, { role: 'assistant', content: `✅ Loaded ${data.totalRows} rows from ${spreadsheetFile.name}. Ready for batch generation.` }]);
      } catch (error: any) {
        setMessages(prev => [...prev, { role: 'assistant', content: `❌ Failed to parse spreadsheet: ${error.message}` }]);
      }
      if (e.target) e.target.value = '';
      if (validFiles.length === 0) return;
    }

    if (validFiles.length === 0) return;

    // Just attach files as context — no heavy processing
    for (const file of validFiles) {
      const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const isPdf = file.type === 'application/pdf';
      const isPpt = file.type.includes('presentation') || file.type.includes('powerpoint') || file.name.endsWith('.pptx') || file.name.endsWith('.ppt');
      const fileType: 'pdf' | 'image' | 'ppt' = isPdf ? 'pdf' : isPpt ? 'ppt' : 'image';

      try {
        const base64 = await fileToBase64(file);
        setAttachedFiles(prev => [...prev, {
          id: fileId,
          name: file.name,
          type: file.type,
          fileType,
          base64,
          isProcessing: false,
        }]);
        setMessages(prev => [...prev, { role: 'assistant', content: `📎 ${file.name} attached as context.` }]);
      } catch (error: any) {
        setMessages(prev => [...prev, { role: 'assistant', content: `❌ Error attaching file: ${error.message}` }]);
      }
    }

    if (e.target) e.target.value = '';
  };

  // Remove attached file by ID
  const removeAttachedFile = (fileId: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Remove single pasted element by index
  const removePastedElement = (index: number) => {
    setPastedElements(prev => prev.filter((_, i) => i !== index));
  };

  // Handle paste event in textarea - paste elements from clipboard
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Check if there are elements in the clipboard
    if (clipboardElements.current.length > 0) {
      e.preventDefault();
      // Add elements from clipboard to pasted elements
      setPastedElements(prev => [...prev, ...clipboardElements.current]);
    }
    // Otherwise, let the default paste behavior happen (for text)
  }, []);


  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    if (!apiKey) {
      setMessages(prev => [...prev, { role: 'user', content: input }]);
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Error: API Key is missing. Please set GROK_API_KEY in your environment or .env file.' }]);
      }, 100);
      setInput('');
      return;
    }

    // Build message content including OCR context and pasted elements context
    let messageContent = input;
    
    // Add pasted elements context (multiple elements from Ctrl+C -> Ctrl+V)
    if (pastedElements.length > 0) {
      // Get current template to include as context
      const currentTemplate = ui.current?.getTemplate();
      const elementNames = pastedElements.map((el: CopiedElement) => el.name);
      
      // Get page dimensions from basePdf
      const basePdf = currentTemplate?.basePdf;
      let pageWidth = 210, pageHeight = 297; // Default A4
      if (typeof basePdf === 'object' && basePdf && 'width' in basePdf) {
        pageWidth = (basePdf as any).width || 210;
        pageHeight = (basePdf as any).height || 297;
      }
      const orientation = pageWidth > pageHeight ? 'Landscape' : 'Portrait';
      
      // Count pages
      const pageCount = currentTemplate?.schemas?.length || 1;
      
      // Helper to describe position
      const describePosition = (x: number, y: number, w: number, h: number) => {
        const centerX = x + w / 2;
        const centerY = y + h / 2;
        const hPos = centerX < pageWidth * 0.33 ? 'Left' : centerX > pageWidth * 0.67 ? 'Right' : 'Center';
        const vPos = centerY < pageHeight * 0.33 ? 'Top' : centerY > pageHeight * 0.67 ? 'Bottom' : 'Middle';
        return `${vPos} ${hPos}`;
      };
      
      // Find which page each element belongs to
      const findElementPage = (elName: string): number => {
        if (!currentTemplate?.schemas) return 1;
        for (let pageIdx = 0; pageIdx < currentTemplate.schemas.length; pageIdx++) {
          const page = currentTemplate.schemas[pageIdx];
          if (Array.isArray(page)) {
            if (page.some((s: any) => s.name === elName)) return pageIdx + 1;
          } else if (typeof page === 'object') {
            if (elName in page) return pageIdx + 1;
          }
        }
        return 1;
      };
      
      const elementsContext = pastedElements.map((el: CopiedElement, i: number) => {
        const pageNum = findElementPage(el.name);
        const posDesc = describePosition(el.position.x, el.position.y, el.width, el.height);
        return `[Element ${i + 1}]
Name: ${el.name}
Type: ${el.type}
Page: ${pageNum} of ${pageCount}
Position: x=${el.position.x}mm, y=${el.position.y}mm (${posDesc})
Size: ${el.width}mm × ${el.height}mm
${el.content ? `Content: ${String(el.content).substring(0, 100)}${String(el.content).length > 100 ? '...' : ''}` : ''}`;
      }).join('\n\n');
      
      messageContent = `[Page Info]
Page Size: ${pageWidth}mm × ${pageHeight}mm
Orientation: ${orientation}
Total Pages: ${pageCount}

[Selected Elements]
The user selected the following ${pastedElements.length} element(s) as reference:

${elementsContext}

[Current Template]
${JSON.stringify(currentTemplate, null, 2)}

[User Request]
${input}

[Instructions]
1. The selected elements (${elementNames.join(', ')}) are the elements the user wants to discuss or modify
2. Decide how to modify based on the user's actual request; if the user explicitly asks to modify these elements, modify them
3. If the user's request involves other elements or the entire template, modify accordingly
4. Pay attention to the page number of each element; do not mix up pages in multi-page templates
5. Prioritize understanding user intent and handle flexibly`;
    } else if (attachedFiles.length > 0) {
      // Build context for all attached files
      const filesContext = attachedFiles.map(f => {
        if (f.ocrText) {
          return `[Attached file: ${f.name}]\n[Extracted content:]\n${f.ocrText}`;
        }
        return `[Attached file: ${f.name}]`;
      }).join('\n\n');
      messageContent = `${filesContext}\n\n[User request:]\n${input}`;
    }

    // ALWAYS inject current template JSON when workspace has elements
    // This is CRITICAL for modification requests — AI needs precise element data
    const currentTemplate = ui.current?.getTemplate();
    const hasExistingElements = currentTemplate?.schemas?.some(
      (page: any) => {
        if (Array.isArray(page)) return page.length > 0;
        if (page && typeof page === 'object') return Object.keys(page).length > 0;
        return false;
      }
    );
    
    if (hasExistingElements && pastedElements.length === 0) {
      // Strip base64 from images to keep message size manageable
      const strippedTemplate = JSON.parse(JSON.stringify(currentTemplate));
      strippedTemplate.schemas?.forEach((page: any) => {
        if (Array.isArray(page)) {
          page.forEach((schema: any) => {
            if (schema?.type === 'image' && schema?.content?.startsWith('data:image/')) {
              schema.content = '__EXISTING_IMAGE__';
            }
          });
        } else if (page && typeof page === 'object') {
          Object.values(page).forEach((schema: any) => {
            if (schema?.type === 'image' && schema?.content?.startsWith('data:image/')) {
              schema.content = '__EXISTING_IMAGE__';
            }
          });
        }
      });
      
      const templateJson = JSON.stringify(strippedTemplate, null, 2);
      // Prepend template context to existing messageContent
      messageContent = `[Current Template JSON]\n${templateJson}\n\n[User Request]\n${messageContent}`;
      console.log('[AI Designer] Injected current template JSON for modification context');
    }

    const userMessage: { role: 'user' | 'assistant', content: string } = { role: 'user', content: messageContent };
    // Display without the context for cleaner UI - include attached elements for history display
    const displayMessage: { role: 'user' | 'assistant', content: string, attachedElements?: CopiedElement[] } = { 
      role: 'user', 
      content: input,
      attachedElements: pastedElements.length > 0 ? [...pastedElements] : undefined
    };
    
    // Capture task context for completion summary BEFORE clearing
    const taskContext = {
      userRequest: input.trim(),
      targetElements: pastedElements.map(el => el.name),
      hasElements: pastedElements.length > 0
    };
    
    setMessages(prev => [...prev, displayMessage]);
    setInput('');
    setAttachedFiles([]); // Clear attached files after sending
    setPastedElements([]); // Clear pasted elements after sending
    setIsLoading(true);

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      // === USAGE LIMIT CHECK ===
      // Check if user has remaining AI generations for today
      if (isLoggedIn) {
        const limitStatus = await checkAiLimit();
        console.log(`[AI Designer] Limit check: ${limitStatus.used}/${limitStatus.limit} (${limitStatus.planName})`);
        
        if (!limitStatus.allowed) {
          // User has exceeded their daily limit
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `⚠️ **Daily AI Limit Reached**\n\nYou've used all ${limitStatus.limit} AI generations for today (${limitStatus.planName} plan).\n\n🚀 **Upgrade for more:**\n- Starter: 100/day ($9.99/mo)\n- Pro: 200/day ($29.99/mo)\n- Enterprise: Unlimited ($49.99/mo)\n\n[View Pricing](/pricing)\n\n_Your limit resets at midnight._`
          }]);
          setIsLoading(false);
          return;
        }
      }
      // === END LIMIT CHECK ===
      
      console.log('[AI Designer] Starting API call...');

      let currentAssistantMessage: { role: 'user' | 'assistant', content: string, templateUpdated?: boolean } = { role: 'assistant', content: '' };
      setMessages(prev => [...prev, currentAssistantMessage]);

      // Set timeout for hanging requests
      timeoutId = setTimeout(() => {
        console.error('[AI Designer] Request timeout after 30s');
        setMessages(prev => {
          const newMessages = [...prev];
          if (newMessages[newMessages.length - 1].content === '') {
            newMessages[newMessages.length - 1] = { role: 'assistant' as const, content: 'Request timed out. Please check the browser console.' };
          }
          return newMessages;
        });
        setIsLoading(false);
      }, 30000);

      console.log('[AI Designer] Calling streamText...');
      
      // Build dynamic system prompt based on context
      const userLanguage = detectLanguage(input);
      const currentPhase = detectPhase(
        messages.map(m => ({ role: m.role, content: m.content })),
        input
      );
      
      // Get current paper size name if set
      const currentPaperSize = typeof template.basePdf === 'object' && 'width' in template.basePdf
        ? undefined // Could map dimensions back to name, but optional for now
        : undefined;
      
      // Extract combined workspace context (Schema + Visual analysis)
      // Schema: 精确坐标、元素类型、文本内容 (即时)
      // Visual: 渲染效果、视觉层次、设计意图 (PaddleOCR-VL)
      // AI 既知道精确数据，又理解设计意图
      let workspaceContextPrompt: string | undefined;
      let analysisMode: 'schema-only' | 'combined' | 'none' = 'none';
      
      try {
        // 先快速检查画布是否有图片元素
        let hasImageElements = false;
        if (template.schemas && Array.isArray(template.schemas)) {
          template.schemas.forEach(page => {
            if (page && typeof page === 'object') {
              Object.values(page).forEach((schema: any) => {
                if (schema?.type === 'image') hasImageElements = true;
              });
            }
          });
        }
        
        // 智能判断是否需要视觉分析
        // 只在必要时启用，避免每次都卡 2-3 秒
        const hasUploadedReferenceImage = attachedFiles.some(f => f.layoutAnalysis);
        const enableVisual = shouldEnableVisualAnalysis({
          userInput: input,
          hasImageElements,
          hasUploadedImage: hasUploadedReferenceImage,
          phase: currentPhase,
        });
        
        const fullContext = await getFullWorkspaceContext(template, enableVisual, '.pdfme-canvas');
        
        if (fullContext.schemaContext && Object.keys(fullContext.schemaContext.elementStats).length > 0) {
          workspaceContextPrompt = fullContext.combinedPrompt;
          analysisMode = fullContext.mode;
          console.log(`[AI Designer] Workspace context: ${analysisMode}, ${fullContext.schemaContext.pageCount} page(s), elements: ${JSON.stringify(fullContext.schemaContext.elementStats)}`);
        }
      } catch (e) {
        console.warn('[AI Designer] Failed to extract workspace context:', e);
      }
      
      // If user has attached reference images with layout analysis, include them
      let referenceImagePrompt: string | undefined;
      const filesWithLayout = attachedFiles.filter(f => f.layoutPrompt);
      if (filesWithLayout.length > 0) {
        referenceImagePrompt = filesWithLayout.map(f => f.layoutPrompt).join('\n\n---\n\n');
        console.log(`[AI Designer] Including ${filesWithLayout.length} reference image layout(s)`);
      }
      
      // Combine workspace context with reference image prompt
      const combinedContextPrompt = [workspaceContextPrompt, referenceImagePrompt]
        .filter(Boolean)
        .join('\n\n---\n\n');
      
      const promptContext: PromptContext = {
        language: userLanguage,
        phase: currentPhase,
        paperSizeName: currentPaperSize,
        includeExamples: currentPhase === 'generation',
        workspaceContextPrompt: combinedContextPrompt || undefined,
      };
      
      const systemPrompt = buildSystemPrompt(promptContext);
      console.log(`[AI Designer] Using ${currentPhase} phase prompt (${systemPrompt.length} chars, ~${Math.ceil(systemPrompt.length / 4)} tokens)${workspaceContextPrompt ? ` [workspace: ${analysisMode}]` : ''}${referenceImagePrompt ? ' [with reference image]' : ''}`);
      
      const result = await streamText({
        model: grokModel as any,
        system: systemPrompt,

        // Filter messages to only include valid user/assistant pairs with content
        // This prevents 422 errors from incompatible old chat history (e.g., tool calls)
        messages: messages
          .filter(m => (m.role === 'user' || m.role === 'assistant') && m.content && typeof m.content === 'string' && m.content.trim() !== '')
          .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
          .concat(userMessage),
      });

      console.log('[AI Designer] streamText returned, starting to consume stream...');

      // Stream the text content
      let fullResponse = '';
      let chunkCount = 0;
      let isInsideJsonBlock = false;
      let dynamicPlan: string[] | null = null; // AI-generated step labels
      let planParsed = false; // Only attempt plan parsing once
      
      for await (const textPart of result.textStream) {
        chunkCount++;
        if (chunkCount === 1) {
          console.log('[AI Designer] First chunk received!');
          clearTimeout(timeoutId);
        }
        fullResponse += textPart;
        
        // Try to parse [PLAN] marker from early response chunks
        if (!planParsed && fullResponse.includes('[/PLAN]')) {
          dynamicPlan = parsePlanMarker(fullResponse);
          planParsed = true;
          if (dynamicPlan) {
            console.log('[AI Designer] Dynamic plan detected:', dynamicPlan);
            // Show initial step indicator with first step active
            setMessages(prev => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = { 
                role: 'assistant' as const, 
                content: buildStepsMessage(buildDynamicSteps(dynamicPlan!, 0))
              };
              return newMessages;
            });
          }
        }
        
        // Smart display: filter out JSON blocks during streaming
        const currentContent = fullResponse;
        
        // Check for JSON block start
        if (!isInsideJsonBlock && (currentContent.includes('```json') || currentContent.match(/```\s*\n\s*\{/))) {
          isInsideJsonBlock = true;
          // Show building step (2nd step or midpoint of plan)
          const labels = dynamicPlan || DEFAULT_PLAN_LABELS;
          const activeIdx = Math.min(1, labels.length - 2); // 2nd step
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = { 
              role: 'assistant' as const, 
              content: buildStepsMessage(buildDynamicSteps(labels, activeIdx))
            };
            return newMessages;
          });
        } else if (!isInsideJsonBlock) {
          // Normal text streaming (no JSON yet)
          // Strip [PLAN] marker from display if present
          const displayContent = stripPlanMarker(currentContent);
          if (displayContent) {
            currentAssistantMessage.content = displayContent;
            setMessages(prev => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = { role: 'assistant' as const, content: displayContent };
              return newMessages;
            });
          }
        }
        // If inside JSON block, don't update the display (keep showing progress message)
      }

      console.log('[AI Designer] Stream finished. Total chunks:', chunkCount);

      // Check if stream returned no content
      if (chunkCount === 0 || !fullResponse.trim()) {
        console.error('[AI Designer] No output generated from stream');
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { 
            role: 'assistant', 
            content: 'No output generated. Check the stream for errors.\nCheck browser console for details.' 
          };
          return newMessages;
        });
        setIsLoading(false);
        return;
      }

      // Extract and parse JSON from the response
      const jsonMatch = fullResponse.match(/```json\n([\s\S]*?)\n```/) || fullResponse.match(/```\n([\s\S]*?)\n```/);

      if (jsonMatch && jsonMatch[1]) {
        console.log('[AI Designer] JSON block found in response');
        try {
          const jsonContent = jsonMatch[1].trim();
          const newTemplate = JSON.parse(jsonContent);

          console.log('[AI Designer] Parsed JSON template:', JSON.stringify(newTemplate, null, 2));

          // 1. Strict Validation
          const validationResult = AiTemplateSchema.safeParse(newTemplate);

          if (!validationResult.success) {
            console.error('[AI Designer] Validation Failed:', validationResult.error);
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `Designed template, but found some issues:\n${validationResult.error.issues.map(e => `- ${e.path.join('.')}: ${e.message}`).join('\n')}`
            }]);
            // Attempt to proceed with best effort if schemas exist, or stop?
            // For now, let's try to proceed if "schemas" exists, assuming we can fix it.
            if (!newTemplate.schemas) {
              throw new Error("Invalid Template: Missing schemas array.");
            }
          }

          if (!newTemplate.schemas || !Array.isArray(newTemplate.schemas) || newTemplate.schemas.length === 0) {
            console.error('[AI Designer] Invalid template: schemas is missing or empty', newTemplate);
          } else {
            // Show step: Validating template (3rd step or near-end of plan)
            const valLabels = dynamicPlan || DEFAULT_PLAN_LABELS;
            const valIdx = Math.max(1, valLabels.length - 2); // near-end step
            setMessages(prev => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = { 
                role: 'assistant' as const, 
                content: buildStepsMessage(buildDynamicSteps(valLabels, valIdx))
              };
              return newMessages;
            });

            // 2. Fix Data (Unique Names) + Boundary Validation
            const pageSize: PageSize = newTemplate.basePdf 
              ? { width: newTemplate.basePdf.width, height: newTemplate.basePdf.height }
              : { width: 210, height: 297 };
            const fixedSchemas = validateAndFixSchemas(newTemplate.schemas, pageSize);
            const fixedTemplate = { ...newTemplate, schemas: fixedSchemas };

            // Show step: Processing images (if any)
            const hasImagePlaceholders = JSON.stringify(fixedTemplate).includes('__GENERATE_IMAGE');
            if (hasImagePlaceholders) {
              // Insert 'Rendering images' step into plan if not already there
              const imgLabels = dynamicPlan ? [...dynamicPlan] : [...DEFAULT_PLAN_LABELS];
              if (!imgLabels.some(l => l.toLowerCase().includes('image') || l.toLowerCase().includes('render'))) {
                imgLabels.splice(imgLabels.length - 1, 0, 'Rendering images');
              }
              const imgIdx = imgLabels.findIndex(l => l.toLowerCase().includes('image') || l.toLowerCase().includes('render'));
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = { 
                  role: 'assistant' as const, 
                  content: buildStepsMessage(buildDynamicSteps(imgLabels, imgIdx >= 0 ? imgIdx : imgLabels.length - 2))
                };
                return newMessages;
              });
            }

            // 3. Process image placeholders (parallel generation)
            const templateWithImages = await processImagePlaceholders(fixedTemplate, setMessages);

            // Show step: Applying template (last step active)
            const applyLabels = dynamicPlan ? [...dynamicPlan] : [...DEFAULT_PLAN_LABELS];
            if (hasImagePlaceholders && !applyLabels.some(l => l.toLowerCase().includes('image') || l.toLowerCase().includes('render'))) {
              applyLabels.splice(applyLabels.length - 1, 0, 'Rendering images');
            }
            setMessages(prev => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = { 
                role: 'assistant' as const, 
                content: buildStepsMessage(buildDynamicSteps(applyLabels, applyLabels.length - 1))
              };
              return newMessages;
            });

            // Capture old template BEFORE applying changes for diff detection
            const oldTemplate = ui.current?.getTemplate();

            const mappedTemplate = transformTemplate(templateWithImages);
            
            // Preserve existing images: restore base64 data from old template
            // When AI modifies a template, images are sent as "__EXISTING_IMAGE__"
            // We need to restore the original base64 content from the old template
            if (oldTemplate?.schemas && mappedTemplate?.schemas) {
              const oldImageMap = new Map<string, string>();
              // Build map of all existing images from old template
              oldTemplate.schemas.forEach((page: any) => {
                if (Array.isArray(page)) {
                  page.forEach((schema: any) => {
                    if (schema?.name && schema?.type === 'image' && schema?.content?.startsWith('data:image/')) {
                      oldImageMap.set(schema.name, schema.content);
                    }
                  });
                } else if (page && typeof page === 'object') {
                  Object.entries(page).forEach(([name, schema]: [string, any]) => {
                    if (schema?.type === 'image' && schema?.content?.startsWith('data:image/')) {
                      oldImageMap.set(name, schema.content);
                    }
                  });
                }
              });
              
              if (oldImageMap.size > 0) {
                // Restore __EXISTING_IMAGE__ placeholders with actual base64 data
                mappedTemplate.schemas.forEach((page: any) => {
                  if (Array.isArray(page)) {
                    page.forEach((schema: any) => {
                      if (schema?.type === 'image' && 
                          (schema?.content === '__EXISTING_IMAGE__' || !schema?.content || schema?.content === '') &&
                          schema?.name && oldImageMap.has(schema.name)) {
                        schema.content = oldImageMap.get(schema.name)!;
                        console.log(`[AI Designer] Restored existing image: ${schema.name}`);
                      }
                    });
                  } else if (page && typeof page === 'object') {
                    Object.entries(page).forEach(([name, schema]: [string, any]) => {
                      if (schema?.type === 'image' && 
                          (schema?.content === '__EXISTING_IMAGE__' || !schema?.content || schema?.content === '') &&
                          oldImageMap.has(name)) {
                        schema.content = oldImageMap.get(name)!;
                        console.log(`[AI Designer] Restored existing image: ${name}`);
                      }
                    });
                  }
                });
              }
            }
            
            checkTemplate(mappedTemplate);
            setTemplate(mappedTemplate);
            setMode('preview'); // Switch to preview mode after generation
            
            // === INCREMENT USAGE ===
            // Track successful AI generation for quota enforcement
            if (isLoggedIn) {
              incrementUsage('ai_request').then(() => {
                console.log('[AI Designer] Usage incremented successfully');
              });
            }
            // === END INCREMENT ===
            
            // Detect changes between old and new template
            const detectChanges = (oldT: any, newT: any, targetElements: string[]): string[] => {
              const changes: string[] = [];
              if (!oldT?.schemas || !newT?.schemas) return changes;
              
              // Property name translations
              const propNames: Record<string, string> = {
                fontColor: 'font color',
                backgroundColor: 'background',
                position: 'position',
                width: 'width',
                height: 'height',
                fontSize: 'font size',
                fontName: 'font',
                content: 'content',
                alignment: 'alignment',
                lineHeight: 'line height',
                borderColor: 'border color',
                borderWidth: 'border width',
                opacity: 'opacity',
                rotate: 'rotation'
              };
              
              // Get schemas as flat map
              const getSchemaMap = (schemas: any[]): Map<string, any> => {
                const map = new Map();
                schemas.forEach((page: any, pageIdx: number) => {
                  if (typeof page === 'object' && !Array.isArray(page)) {
                    Object.entries(page).forEach(([name, schema]: [string, any]) => {
                      map.set(name, { ...schema, _page: pageIdx });
                    });
                  }
                });
                return map;
              };
              
              const oldMap = getSchemaMap(oldT.schemas);
              const newMap = getSchemaMap(newT.schemas);
              
              // Check target elements for changes
              const elementsToCheck = targetElements.length > 0 ? targetElements : Array.from(newMap.keys());
              
              for (const elName of elementsToCheck) {
                const oldEl = oldMap.get(elName);
                const newEl = newMap.get(elName);
                
                if (!oldEl && newEl) {
                  changes.push(`added "${elName}"`);
                  continue;
                }
                
                if (oldEl && newEl) {
                  // Compare properties
                  const changedProps: string[] = [];
                  for (const [key, label] of Object.entries(propNames)) {
                    const oldVal = JSON.stringify(oldEl[key]);
                    const newVal = JSON.stringify(newEl[key]);
                    if (oldVal !== newVal && newEl[key] !== undefined) {
                      changedProps.push(label);
                    }
                  }
                  if (changedProps.length > 0) {
                    const propsStr = changedProps.slice(0, 3).join(', ') + (changedProps.length > 3 ? ', etc.' : '');
                    changes.push(`${propsStr}`);
                  }
                }
              }
              
              return changes;
            };
            
            // Build task summary based on context
            let completionMessage = '';
            
            if (taskContext.hasElements && taskContext.targetElements.length > 0) {
              // Element modification task - detect what changed
              const changes = detectChanges(oldTemplate, mappedTemplate, taskContext.targetElements);
              const elementsStr = taskContext.targetElements.length <= 2 
                ? taskContext.targetElements.map(n => `"${n}"`).join(', ')
                : `${taskContext.targetElements.length} elements`;
              
              if (changes.length > 0) {
                const changesStr = changes.slice(0, 3).join(', ') + (changes.length > 3 ? ', etc.' : '');
                completionMessage = `Modified ${elementsStr} · ${changesStr}`;
              } else {
                completionMessage = `Completed modification of ${elementsStr}`;
              }
            } else {
              // Template creation task - use natural language based on user's request
              // Extract document type from user request for friendly message
              const userRequest = taskContext.userRequest.toLowerCase();
              let docTypeEn = '';
              
              // Detect document type from user request
              const docTypePatterns: Array<{en: string, patterns: string[]}> = [
                { en: 'business card', patterns: ['business card', '名片', 'card'] },
                { en: 'invoice', patterns: ['invoice', '发票', 'receipt'] },
                { en: 'certificate', patterns: ['certificate', '证书', '奖状'] },
                { en: 'resume', patterns: ['resume', '简历', 'cv'] },
                { en: 'report', patterns: ['report', '报告'] },
                { en: 'poster', patterns: ['poster', '海报'] },
                { en: 'flyer', patterns: ['flyer', '传单', 'leaflet'] },
                { en: 'menu', patterns: ['menu', '菜单'] },
                { en: 'invitation', patterns: ['invitation', '邀请函', '请柬'] },
                { en: 'letterhead', patterns: ['letterhead', '信头', '信纸'] },
                { en: 'presentation', patterns: ['presentation', '演示', 'ppt', 'slide'] },
                { en: 'social media post', patterns: ['social media', 'instagram', 'facebook', 'twitter', '社交'] },
                { en: 'document', patterns: ['document', '文档'] },
              ];
              
              for (const docType of docTypePatterns) {
                if (docType.patterns.some(p => userRequest.includes(p))) {
                  docTypeEn = docType.en;
                  break;
                }
              }
              
              // Generate completion message in English
              completionMessage = docTypeEn 
                ? `${docTypeEn.charAt(0).toUpperCase() + docTypeEn.slice(1)} created successfully`
                : `Template generated successfully`;
            }
            
            // Build final step indicator with all steps done (using dynamic plan)
            const finalLabels = dynamicPlan ? [...dynamicPlan] : [...DEFAULT_PLAN_LABELS];
            if (hasImagePlaceholders && !finalLabels.some(l => l.toLowerCase().includes('image') || l.toLowerCase().includes('render'))) {
              finalLabels.splice(finalLabels.length - 1, 0, 'Rendering images');
            }
            const finalSteps: WorkflowStep[] = finalLabels.map(label => ({ label, status: 'done' as const }));
            
            setMessages(prev => {
              const newMessages = [...prev];
              if (newMessages.length > 0) {
                newMessages[newMessages.length - 1] = { 
                  role: 'assistant' as const,
                  content: buildStepsMessage(finalSteps, completionMessage),
                  templateUpdated: true 
                };
              }
              return newMessages;
            });
            
            console.log('[AI Designer] Template updated successfully from JSON block');
          }
        } catch (e: any) {
          console.error('[AI Designer] Failed to parse extracted JSON:', e);
          // Show user-friendly error instead of raw JSON parse error
          setMessages(prev => {
            const newMessages = [...prev];
            if (newMessages.length > 0) {
              newMessages[newMessages.length - 1] = { 
                role: 'assistant' as const, 
                content: '⚠️ Generation encountered an issue. Please try again or describe your request differently.' 
              };
            }
            return newMessages;
          });
        }
      } else {
        console.log('[AI Designer] No JSON block found in response');
        // Show the AI's actual text response (it was hidden during streaming while waiting for JSON)
        // Remove any JSON artifacts and display the conversational text
        const cleanResponse = fullResponse
          .replace(/```json[\s\S]*?```/g, '')
          .replace(/```[\s\S]*?```/g, '')
          .trim();
        
        setMessages(prev => {
          const newMessages = [...prev];
          if (newMessages.length > 0) {
            newMessages[newMessages.length - 1] = { 
              role: 'assistant' as const, 
              content: cleanResponse || fullResponse.trim()
            };
          }
          return newMessages;
        });
      }

      // Stream is already consumed through textStream iteration above
      // Removed: await result.text - this was causing "No output generated" errors
    } catch (error: any) {
      console.error('[AI Designer] Error caught:', error);
      const errorMessage = error?.message || "Unknown error";
      console.error('[AI Designer] Error stack:', error?.stack || "");
      setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, something went wrong. Error: ${errorMessage}\n\nCheck browser console for details.` }]);
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };


  const downloadPdf = async () => {
    try {
      const plugins = getPlugins();
      
      // Use live template from Designer (not stale React state) to avoid downloading previous PDF
      const currentTemplate = ui.current ? ui.current.getTemplate() : template;
      const templateForPdf = JSON.parse(JSON.stringify(currentTemplate));
      
      // Auto-correct fonts for CJK characters
      const isCJK = (text: string) => /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(text);
      
      if (templateForPdf.schemas) {
        templateForPdf.schemas.forEach((page: any) => {
          Object.values(page).forEach((schema: any) => {
             if ((schema.type === 'text' || schema.type === 'multiVariableText') && schema.content && isCJK(schema.content)) {
                schema.fontName = 'NotoSansSC';
             }
          });
        });
      }

      // Get inputs from template - this extracts the actual content values
      const inputs = getInputFromTemplate(templateForPdf);
      console.log('[AI Designer] Generating PDF with inputs:', inputs);

      const pdf = await generate({
        template: templateForPdf,
        inputs,
        options: { font: getFontsData() },
        plugins,
      });
      const blob = new Blob([pdf.buffer], { type: 'application/pdf' });
      saveAs(blob, 'template.pdf');
    } catch (error: any) {
      console.error('[AI Designer] PDF generation failed:', error);
      alert('PDF generation failed: ' + error.message);
    }
  };

  // Get template field names for batch generation mapping
  const getTemplateFields = useMemo(() => {
    const fields: string[] = [];
    if (template.schemas) {
      template.schemas.forEach((page: any) => {
        if (Array.isArray(page)) {
          page.forEach((schema: any) => {
            if (schema.name && !schema.readOnly) fields.push(schema.name);
          });
        } else if (typeof page === 'object') {
          Object.keys(page).forEach(key => {
            const schema = page[key];
            if (!schema.readOnly) fields.push(key);
          });
        }
      });
    }
    return fields;
  }, [template]);

  // Handle batch generation
  const handleBatchGenerate = async (
    data: SpreadsheetData,
    fieldMapping: Record<string, string>,
    mode: 'merge' | 'zip'
  ) => {
    setIsBatchGenerating(true);
    setBatchProgress(0);

    try {
      const plugins = getPlugins();
      const templateForPdf = JSON.parse(JSON.stringify(template));

      // Build inputs array from spreadsheet data
      const inputs: Record<string, string>[] = data.rows.map(row => {
        const input: Record<string, string> = {};
        for (const [templateField, spreadsheetColumn] of Object.entries(fieldMapping)) {
          if (spreadsheetColumn && row[spreadsheetColumn] !== undefined) {
            input[templateField] = row[spreadsheetColumn];
          }
        }
        return input;
      });

      if (mode === 'merge') {
        // Generate single merged PDF with all inputs
        const pdf = await generate({
          template: templateForPdf,
          inputs,
          options: { font: getFontsData() },
          plugins,
        });
        setBatchProgress(100);
        const blob = new Blob([pdf.buffer], { type: 'application/pdf' });
        saveAs(blob, `batch_${data.rows.length}_records.pdf`);
        
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `✅ Generated merged PDF with ${data.rows.length} pages!` 
        }]);
      } else {
        // Generate individual PDFs and zip them
        const zip = new JSZip();
        
        for (let i = 0; i < inputs.length; i++) {
          const pdf = await generate({
            template: templateForPdf,
            inputs: [inputs[i]],
            options: { font: getFontsData() },
            plugins,
          });
          
          // Use first mapped field value as filename, or index
          const firstField = Object.keys(fieldMapping)[0];
          const fileName = inputs[i][firstField] || `document_${i + 1}`;
          zip.file(`${fileName}.pdf`, pdf.buffer);
          
          setBatchProgress(Math.round(((i + 1) / inputs.length) * 100));
        }
        
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, `batch_${data.rows.length}_pdfs.zip`);
        
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `✅ Generated ZIP with ${data.rows.length} individual PDFs!` 
        }]);
      }

      setShowBatchModal(false);
      setSpreadsheetData(null);
    } catch (error: any) {
      console.error('[AI Designer] Batch generation failed:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `❌ Batch generation failed: ${error.message}` 
      }]);
    } finally {
      setIsBatchGenerating(false);
      setBatchProgress(0);
    }
  };

  return (
    <div className="smart-doc-assistant" style={{ position: 'relative', height: '100vh', width: '100%' }}>
      <div className="sda-content">
        {/* PDF Panel & Field List Container (70%) */}
        {/* We use inline styles to override default sda-pdf-panel flex if needed, but sda-pdf-panel has flex:50 by default. We want 70 here relative to chat's 30. */}
        <div className="sda-pdf-panel" style={{ flex: 70, display: 'flex', flexDirection: 'column', padding: 0, gap: 0, overflow: 'hidden', position: 'relative' }}>
          {/* PDFme Container - The Designer component now includes the tool bar at the top */}
          <div id="pdfme-designer-root" className="flex-1 relative bg-gray-50" ref={designerRef}></div>
          {/* Hidden file input for editor toolbar upload button */}
          <input
            ref={editorFileInputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,.svg,.pptx,.ppt,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            multiple
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />

          {/* Onboarding Overlay — Card Carousel (one card per step) */}
          {onboardingStep > 0 && (
            <div className="sda-onboarding-overlay">
              <div className="sda-onboarding-carousel">
                <div className="sda-onboarding-slider" style={{ transform: `translateX(-${(onboardingStep - 1) * 100}%)` }}>

                  {/* Card 1 — Describe */}
                  <div className="sda-onboarding-slide">
                    <div className="sda-onboarding-card-v2">
                      <button className="sda-onboarding-dismiss" onClick={handleSkipOnboarding} title="Skip">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                      </button>
                      <div className="sda-card-illustration">
                        <img src="/onboarding/describe.png" alt="Describe" draggable={false} />
                      </div>
                      <div className="sda-card-content">
                        <div className="sda-card-step-label">Step 1 of 5</div>
                        <h3 className="sda-card-title">Describe</h3>
                        <p className="sda-card-desc">Tell the chat panel what document to create.</p>
                      </div>
                      <div className="sda-card-footer">
                        <div className="sda-onboarding-progress">
                          {[1,2,3,4,5].map(i => <div key={i} className={`sda-progress-dot ${onboardingStep >= i ? 'active' : ''}`} />)}
                        </div>
                        <button className="sda-onboarding-next-btn" onClick={handleNextOnboardingStep}>Next</button>
                      </div>
                    </div>
                  </div>

                  {/* Card 2 — Generate */}
                  <div className="sda-onboarding-slide">
                    <div className="sda-onboarding-card-v2">
                      <button className="sda-onboarding-dismiss" onClick={handleSkipOnboarding} title="Skip">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                      </button>
                      <div className="sda-card-illustration">
                        <img src="/onboarding/generate.png" alt="Generate" draggable={false} />
                      </div>
                      <div className="sda-card-content">
                        <div className="sda-card-step-label">Step 2 of 5</div>
                        <h3 className="sda-card-title">Generate</h3>
                        <p className="sda-card-desc">Your design renders directly onto this canvas.</p>
                      </div>
                      <div className="sda-card-footer">
                        <div className="sda-onboarding-progress">
                          {[1,2,3,4,5].map(i => <div key={i} className={`sda-progress-dot ${onboardingStep >= i ? 'active' : ''}`} />)}
                        </div>
                        <button className="sda-onboarding-next-btn" onClick={handleNextOnboardingStep}>Next</button>
                      </div>
                    </div>
                  </div>

                  {/* Card 3 — Copy & Modify */}
                  <div className="sda-onboarding-slide">
                    <div className="sda-onboarding-card-v2">
                      <button className="sda-onboarding-dismiss" onClick={handleSkipOnboarding} title="Skip">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                      </button>
                      <div className="sda-card-illustration">
                        <img src="/onboarding/modify.png" alt="Copy & Modify" draggable={false} />
                      </div>
                      <div className="sda-card-content">
                        <div className="sda-card-step-label">Step 3 of 5</div>
                        <h3 className="sda-card-title">Copy & Modify</h3>
                        <p className="sda-card-desc">Select an element, copy it to chat, and describe changes.</p>
                      </div>
                      <div className="sda-card-footer">
                        <div className="sda-onboarding-progress">
                          {[1,2,3,4,5].map(i => <div key={i} className={`sda-progress-dot ${onboardingStep >= i ? 'active' : ''}`} />)}
                        </div>
                        <button className="sda-onboarding-next-btn" onClick={handleNextOnboardingStep}>Next</button>
                      </div>
                    </div>
                  </div>

                  {/* Card 4 — Upload */}
                  <div className="sda-onboarding-slide">
                    <div className="sda-onboarding-card-v2">
                      <button className="sda-onboarding-dismiss" onClick={handleSkipOnboarding} title="Skip">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                      </button>
                      <div className="sda-card-illustration">
                        <img src="/onboarding/upload.png" alt="Upload" draggable={false} />
                      </div>
                      <div className="sda-card-content">
                        <div className="sda-card-step-label">Step 4 of 5</div>
                        <h3 className="sda-card-title">Upload</h3>
                        <p className="sda-card-desc">📎 <strong>Attach</strong> — clip icon in chat input, attach reference images for AI to analyze. <br/>⬆ <strong>Upload</strong> — toolbar button, import existing PDF/PPT to edit directly.</p>
                      </div>
                      <div className="sda-card-footer">
                        <div className="sda-onboarding-progress">
                          {[1,2,3,4,5].map(i => <div key={i} className={`sda-progress-dot ${onboardingStep >= i ? 'active' : ''}`} />)}
                        </div>
                        <button className="sda-onboarding-next-btn" onClick={handleNextOnboardingStep}>Next</button>
                      </div>
                    </div>
                  </div>

                  {/* Card 5 — Export */}
                  <div className="sda-onboarding-slide">
                    <div className="sda-onboarding-card-v2">
                      <button className="sda-onboarding-dismiss" onClick={handleSkipOnboarding} title="Skip">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                      </button>
                      <div className="sda-card-illustration">
                        <img src="/onboarding/export.png" alt="Export" draggable={false} />
                      </div>
                      <div className="sda-card-content">
                        <div className="sda-card-step-label">Step 5 of 5</div>
                        <h3 className="sda-card-title">Export</h3>
                        <p className="sda-card-desc">Download as PDF, PPT, or batch generate from spreadsheet.</p>
                      </div>
                      <div className="sda-card-footer">
                        <div className="sda-onboarding-progress">
                          {[1,2,3,4,5].map(i => <div key={i} className={`sda-progress-dot ${onboardingStep >= i ? 'active' : ''}`} />)}
                        </div>
                        <button className="sda-onboarding-next-btn" onClick={handleNextOnboardingStep}>Done</button>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* Tool panels are now rendered directly in @pdfme/ui RightSidebar based on activePanel option */}
        </div>

        {/* Chat Panel (30%) */}
        <div className="sda-chat-panel" style={{ flex: isChatOpen ? 20 : 0, width: isChatOpen ? 'auto' : 0, minWidth: isChatOpen ? 240 : 0, transition: 'all 0.3s ease', overflow: 'hidden' }}>
          {/* Header */}
          <div className="sda-panel-header">
            <div className="sda-header-left flex gap-2">
              {/* Chat Toggle Button - Left side */}
              <button 
                onClick={() => setIsChatOpen(!isChatOpen)} 
                className="sda-header-btn" 
                title={isChatOpen ? 'Close Chat' : 'Open Chat'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  {isChatOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                  )}
                </svg>
              </button>
            </div>
            <div className="flex gap-2 items-center">
              {/* New Chat Button */}
              <button onClick={startNewChat} className="sda-header-btn" title="New Chat">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
              {/* History Button */}
              <button onClick={() => setShowHistory(true)} className="sda-header-btn" title="History">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </button>
            </div>
          </div>



          {/* Messages Chain */}
          <div className="sda-chat-messages">
            {messages.length === 0 && (
              <div className="sda-chat-welcome">
                {/* Mouva Logo */}
                <div className="sda-welcome-icon">
                  <img src="/logo.svg" alt="Mouva" className="sda-welcome-logo" />
                </div>
                
                <h2 className="sda-welcome-title">AI PDF Designer</h2>
                <p className="sda-welcome-subtitle">Describe what you need, and AI will create it for you</p>


                {/* Quick Start Templates */}
                <p className="sda-templates-label">QUICK START TEMPLATES</p>
                <div className="sda-suggestion-chips">
                  <button 
                    className="sda-suggestion-chip" 
                    onClick={() => setInput("Create a modern invoice with QR code")}
                  >
                    <svg className="sda-chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="8" y1="13" x2="16" y2="13"/>
                      <line x1="8" y1="17" x2="12" y2="17"/>
                    </svg>
                    Invoice
                  </button>
                  <button 
                    className="sda-suggestion-chip" 
                    onClick={() => setInput("Design a professional business card")}
                  >
                    <svg className="sda-chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="5" width="20" height="14" rx="2"/>
                      <circle cx="8" cy="12" r="2"/>
                      <line x1="14" y1="10" x2="20" y2="10"/>
                      <line x1="14" y1="14" x2="18" y2="14"/>
                    </svg>
                    Business Card
                  </button>
                  <button 
                    className="sda-suggestion-chip" 
                    onClick={() => setInput("Create a certificate of achievement")}
                  >
                    <svg className="sda-chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="6"/>
                      <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12"/>
                    </svg>
                    Certificate
                  </button>
                  <button 
                    className="sda-suggestion-chip" 
                    onClick={() => setInput("Design a modern resume template")}
                  >
                    <svg className="sda-chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                      <rect x="8" y="2" width="8" height="4" rx="1"/>
                      <circle cx="12" cy="11" r="2"/>
                      <line x1="8" y1="16" x2="16" y2="16"/>
                      <line x1="8" y1="19" x2="14" y2="19"/>
                    </svg>
                    Resume
                  </button>
                  <button 
                    className="sda-suggestion-chip" 
                    onClick={() => setInput("Create an event poster")}
                  >
                    <svg className="sda-chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <line x1="3" y1="9" x2="21" y2="9"/>
                      <path d="M9 21V9"/>
                    </svg>
                    Poster
                  </button>
                  <button 
                    className="sda-suggestion-chip" 
                    onClick={() => setInput("Design a product label")}
                  >
                    <svg className="sda-chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                      <circle cx="7" cy="7" r="1.5" fill="currentColor"/>
                    </svg>
                    Label
                  </button>
                </div>
              </div>
            )}

            {messages.map((m, i) => {
              // Remove JSON code blocks from display
              let displayContent = m.content || '';
              if (m.role === 'assistant') {
                const textWithoutJson = displayContent.replace(/```json[\s\S]*?```/g, '').replace(/```[\s\S]*?```/g, '').trim();
                // Only show "Template updated!" if JSON was actually parsed and template was updated
                displayContent = textWithoutJson || (m.templateUpdated ? '✅ Template updated!' : m.content);
              }

              // Check for workflow steps format and status message format
              const workflowData = m.role === 'assistant' ? parseWorkflowSteps(displayContent) : null;
              const statusInfo = m.role === 'assistant' && !workflowData ? parseStatusMessage(displayContent) : null;

              return (
                <div key={i} className={`sda-message ${m.role}`}>
                  <div className={`sda-message-content markdown-body`}>
                    {m.role === 'user' ? (
                      <>
                        {m.attachedElements && m.attachedElements.length > 0 && (
                          <div className="sda-message-elements">
                            {m.attachedElements.map((el, idx) => (
                              <div key={`msg-el-${idx}`} className="sda-element-tag" data-type={el.type}>
                                <span className="sda-element-tag-type">{el.type.toUpperCase()}</span>
                                <span className="sda-element-tag-name">{el.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <p>{displayContent}</p>
                      </>
                    ) : workflowData ? (
                      <StepIndicator steps={workflowData.steps} message={workflowData.message} />
                    ) : statusInfo ? (
                      <AIStatusCard type={statusInfo.type} title={statusInfo.title} subtitle={statusInfo.subtitle} />
                    ) : (
                      <div className="markdown-body">
                        <ReactMarkdown>{displayContent || 'Thinking...'}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="sda-message assistant">
                <div className="sda-typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area - Unified Window */}
          <div className="sda-chat-input-wrapper" style={{ position: 'relative' }}>

            <div 
              className="sda-chat-input-box"
              onDragOver={(e) => {
                e.preventDefault();
                console.log('[DEBUG] Chat Input onDragOver');
                e.currentTarget.classList.add('dragging-over');
              }}
              onDragLeave={(e) => {
                console.log('[DEBUG] Chat Input onDragLeave');
                e.currentTarget.classList.remove('dragging-over');
              }}
              onDrop={(e) => {
                e.preventDefault();
                console.log('[DEBUG] Chat Input onDrop triggered');
                e.currentTarget.classList.remove('dragging-over');
                const dragData = e.dataTransfer.getData('application/pdfme-field');
                console.log('[DEBUG] Dropped data:', dragData);
                if (dragData) {
                  try {
                    const schema = JSON.parse(dragData);
                    const copiedEl: CopiedElement = {
                      name: schema.name,
                      type: schema.type,
                      position: schema.position,
                      width: schema.width,
                      height: schema.height,
                      content: schema.content,
                      ...schema
                    };
                    setPastedElements(prev => [...prev, copiedEl]);
                  } catch (err) {
                    console.error('Failed to parse dropped field data', err);
                  }
                }
              }}
            >
              {/* Attachments Container - Inside the box */}
              {(attachedFiles.length > 0 || pastedElements.length > 0) && (
                <div className="sda-attachments-container">
                  {/* Attached Files as Colorful Tags */}
                  {attachedFiles.map((file) => (
                    <div 
                      key={file.id} 
                      className={`sda-file-tag ${file.fileType} ${file.isProcessing ? 'processing' : ''}`}
                    >
                      <span className="sda-file-type-badge">
                        {file.fileType === 'pdf' ? 'PDF' : file.fileType === 'ppt' ? 'PPT' : 'IMG'}
                      </span>
                      <span className="sda-file-tag-name">{file.name}</span>
                      {file.ocrText && <span className="sda-file-ocr-badge">✓ OCR</span>}
                      <button 
                        type="button" 
                        className="sda-file-tag-remove" 
                        onClick={() => removeAttachedFile(file.id)} 
                        title="Remove"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  
                  {/* Pasted Elements as Colorful Tags */}
                  {pastedElements.map((el, idx) => (
                    <div 
                      key={`el-${idx}`} 
                      className="sda-element-tag" 
                      data-type={el.type}
                    >
                      <span className="sda-element-tag-type">{el.type.toUpperCase()}</span>
                      <span className="sda-element-tag-name">{el.name}</span>
                      <button type="button" className="sda-element-tag-remove" onClick={() => removePastedElement(idx)}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Text Input */}
              <textarea
                className="sda-input-textarea"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={
                  attachedFiles.length > 0 && pastedElements.length > 0 
                    ? `${attachedFiles.length} file(s) and ${pastedElements.length} element(s) attached, describe your request...`
                    : attachedFiles.length > 0 
                    ? `${attachedFiles.length} file(s) attached, describe your request...`
                    : pastedElements.length > 0 
                    ? `${pastedElements.length} element(s) pasted, enter your modification request...` 
                    : "Chat or describe your PDF template..."
                }
                disabled={isLoading}
                onPaste={handlePaste}
                rows={1}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              
              {/* Action Buttons */}
              <div className="sda-input-actions">
                {/* Attachment Button */}
                <div className="sda-input-tools">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,.svg,.pptx,.ppt,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                    multiple
                    onChange={handleChatFileAttach}
                    style={{ display: 'none' }}
                  />
                  <button
                    className="sda-attach-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading || isProcessingFile}
                    title="Attach file (PDF, Image)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                    </svg>
                  </button>
                </div>
                <button
                  onClick={(e) => handleSendMessage(e as any)}
                  disabled={isLoading || !input.trim()}
                  className={`sda-send-btn-circle ${input.trim() ? 'active' : ''}`}
                >
                  {/* Upward arrow icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
                  </svg>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
      {/* Floating Chat Toggle Button - appears when chat is closed */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          style={{
            position: 'fixed',
            right: 24,
            bottom: 24,
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
            border: 'none',
            boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            transition: 'all 0.2s ease',
            zIndex: 1000,
          }}
          title="Open AI Chat"
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(139, 92, 246, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(139, 92, 246, 0.4)';
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 24, height: 24 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
          </svg>
        </button>
      )}
      {/* History Modal */}
      <HistoryModal
        isOpen={showHistory}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelect={handleSelectSession}
        onDelete={handleDeleteSession}
        onClose={() => setShowHistory(false)}
      />
      {/* Batch Generate Modal */}
      <BatchGenerateModal
        isOpen={showBatchModal}
        spreadsheetData={spreadsheetData}
        templateFields={getTemplateFields}
        onClose={() => {
          setShowBatchModal(false);
          setSpreadsheetData(null);
        }}
        onGenerate={handleBatchGenerate}
        isGenerating={isBatchGenerating}
        progress={batchProgress}
      />
    </div>
  );
}
