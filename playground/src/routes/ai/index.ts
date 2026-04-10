// =============================================================================
// AI Module Exports (AI 模块导出)
// =============================================================================

// Element Schemas
export {
  // Shared schemas
  PositionSchema,
  AvailableFonts,
  TextAlignments,
  VerticalAlignments,
  
  // Element schemas
  TextElementSchema,
  MultiVariableTextElementSchema,
  ImageElementSchema,
  SvgElementSchema,
  TableElementSchema,
  TableContentSchema,
  LineElementSchema,
  RectangleElementSchema,
  EllipseElementSchema,
  SimpleChartElementSchema,
  ChartTypes,
  DateElementSchema,
  TimeElementSchema,
  DateTimeElementSchema,
  QrCodeElementSchema,
  Code128ElementSchema,
  Ean13ElementSchema,
  SignatureElementSchema,
  CheckboxElementSchema,
  SelectElementSchema,
  RadioGroupElementSchema,
  
  // Union schemas
  AnyElementSchema,
  ElementSchemaMap,
  getElementSchema,
  
  // Template schemas
  BasePdfSchema,
  PageSchema,
  TemplateSchema,
  
  // Types
  type Position,
  type TextElement,
  type ImageElement,
  type TableElement,
  type AnyElement,
  type BasePdf,
  type Template,
  type FontName,
} from './elementSchemas';

// Element Registry
export {
  type ElementCategory,
  type ElementDefinition,
  elementRegistry,
  getElementSummaries,
  getElementDefinition,
  getElementPrompt,
  getElementPrompts,
  getElementsByCategory,
  getAllElementTypes,
} from './elementRegistry';

// Paper Size Registry
export {
  type PaperSize,
  type PaperSizeCategory,
  paperSizeCategories,
  getAllPaperSizes,
  getPaperSize,
  getPaperSizeSummaries,
  buildPaperSizePrompt,
  getContentBounds,
} from './paperSizeRegistry';

// Prompt Builder
export {
  type PromptContext,
  type VisualAnalysisTriggerContext,
  buildSystemPrompt,
  buildConversationPrompt,
  estimateTokens,
  detectLanguage,
  isGenerationRequest,
  detectPhase,
  shouldEnableVisualAnalysis,
} from './promptBuilder';

// Core Behavior Prompts
export {
  CORE_BEHAVIOR_PROMPT,
  CJK_FONT_RULES,
  PAGE_BOUNDARY_RULES,
  TEMPLATE_STRUCTURE,
} from './prompts/coreBehavior';

// Workspace Context
export {
  type ElementInfo,
  type PageInfo,
  type WorkspaceContext,
  type CombinedWorkspaceContext,
  extractWorkspaceContext,
  buildWorkspaceContextPrompt,
  getQuickWorkspaceSummary,
  // Combined Analysis (Schema + Visual)
  getFullWorkspaceContext,
  buildCombinedContextPrompt,
  // Layout Analysis (PaddleOCR-VL)
  analyzeUploadedImage,
  buildLayoutContextPrompt,
  // Visual Canvas Analysis
  captureCanvasAsImage,
  analyzeWorkspaceVisually,
  buildVisualContextPrompt,
  // OCR to PDFme Mapping
  getOcrToPdfmeMapping,
  // PDF → PDFme JSON Conversion
  convertLayoutToPdfmeSchemas,
} from './workspaceContext';
