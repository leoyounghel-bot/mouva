import { 
  getElementSummaries, 
  getAllElementTypes,
  ElementCategory,
  elementRegistry 
} from './elementRegistry';
import { buildPaperSizePrompt, getPaperSize, buildLayoutRulesPrompt } from './paperSizeRegistry';
import { 
  CORE_BEHAVIOR_PROMPT, 
  CJK_FONT_RULES, 
  PAGE_BOUNDARY_RULES, 
  TEMPLATE_STRUCTURE,
  IMAGE_LAYOUT_RULES,
  NO_EMOJI_RULE,
  NO_HTML_TAGS_RULE
} from './prompts/coreBehavior';
import { PRESENTATION_DESIGN_RULES } from './prompts/presentationRules';

// =============================================================================
// Prompt Context (提示词上下文)
// =============================================================================

export interface PromptContext {
  /** 用户预设的可用元素类型 (如果为空则使用全部) */
  userPresetElements?: string[];
  /** 已选择的纸张尺寸名称 */
  paperSizeName?: string;
  /** 用户语言 */
  language: 'zh' | 'en';
  /** 当前阶段: discovery (决策) 或 generation (生成) */
  phase: 'discovery' | 'generation';
  /** 是否包含详细示例 */
  includeExamples?: boolean;
  /** 工作区上下文提示词（已放置元素的描述） */
  workspaceContextPrompt?: string;
}

// =============================================================================
// Element Section Builders (元素部分构建器)
// =============================================================================

/**
 * 构建元素摘要部分 (Phase 1: Discovery)
 * 只提供元素名称和简短描述，用于 AI 判断使用哪些元素
 */
function buildElementSummarySection(
  language: 'zh' | 'en',
  presetElements?: string[]
): string {
  const categories: ElementCategory[] = ['content', 'shape', 'data', 'input', 'barcode'];
  const categoryNames: Record<ElementCategory, { zh: string; en: string; emoji: string }> = {
    content: { zh: '内容元素', en: 'Content Elements', emoji: '📝' },
    shape: { zh: '形状元素', en: 'Shape Elements', emoji: '📐' },
    data: { zh: '数据元素', en: 'Data Elements', emoji: '📊' },
    input: { zh: '输入元素', en: 'Input Elements', emoji: '✍️' },
    barcode: { zh: '条码元素', en: 'Barcode Elements', emoji: '📱' },
  };

  const summaries = getElementSummaries(language);
  
  // 如果有预设元素，只显示这些
  const filteredSummaries = presetElements && presetElements.length > 0
    ? summaries.filter(s => presetElements.includes(s.type))
    : summaries;

  const sections: string[] = [];
  
  categories.forEach(category => {
    const categoryElements = filteredSummaries.filter(s => s.category === category);
    if (categoryElements.length === 0) return;
    
    const catInfo = categoryNames[category];
    const catName = language === 'zh' ? catInfo.zh : catInfo.en;
    
    const elementList = categoryElements
      .map(el => `  - **${el.type}** (${el.name}): ${el.description}`)
      .join('\n');
    
    sections.push(`${catInfo.emoji} **${catName}**:\n${elementList}`);
  });

  const header = language === 'zh' 
    ? '## 可用元素类型'
    : '## Available Element Types';

  const note = language === 'zh'
    ? '_根据你的设计需求选择合适的元素类型_'
    : '_Choose appropriate element types based on your design needs_';

  return `${header}\n${note}\n\n${sections.join('\n\n')}`;
}

/**
 * 构建元素详细部分 (Phase 2: Generation)
 * 提供选定元素的完整配置说明
 */
function buildElementDetailSection(
  language: 'zh' | 'en',
  presetElements?: string[]
): string {
  const typesToInclude = presetElements && presetElements.length > 0
    ? presetElements
    : getAllElementTypes();
  
  const header = language === 'zh'
    ? '## 可用元素类型 (侧边栏工具)'
    : '## AVAILABLE ELEMENT TYPES';

  const prompts = typesToInclude
    .map(type => {
      const def = elementRegistry.find(el => el.type === type);
      if (!def) return '';
      return def.promptTemplate;
    })
    .filter(Boolean)
    .join('\n');

  return `${header}\n\n${prompts}`;
}

/**
 * 构建纸张尺寸部分
 * 如果已经选择了尺寸，只显示该尺寸的边界规则
 */
function buildPaperSizeSection(
  language: 'zh' | 'en',
  paperSizeName?: string
): string {
  if (paperSizeName) {
    const size = getPaperSize(paperSizeName);
    if (size) {
      return language === 'zh'
        ? `### 当前纸张尺寸: ${paperSizeName}
- 尺寸: ${size.width}×${size.height}mm
- 无内边距 (全出血设计)
- 内容区域: x ∈ [0, ${size.width}], y ∈ [0, ${size.height}]`
        : `### Current Paper Size: ${paperSizeName}
- Dimensions: ${size.width}×${size.height}mm
- No padding (full bleed design)
- Content area: x ∈ [0, ${size.width}], y ∈ [0, ${size.height}]`;
    }
  }
  
  // 如果没有选择尺寸，提供完整的尺寸列表
  return buildPaperSizePrompt(language);
}

/**
 * 构建示例部分
 */
function buildExamplesSection(language: 'zh' | 'en'): string {
  const header = language === 'zh'
    ? '## 示例模板 (多页报告带图表)'
    : '## EXAMPLE TEMPLATE (Multi-page report with Chart)';

  return `${header}
\`\`\`json
{
  "basePdf": { "width": 210, "height": 297, "padding": [0, 0, 0, 0] },
  "schemas": [
    [
      { "name": "title", "type": "text", "position": { "x": 15, "y": 15 }, "width": 180, "height": 15, "content": "Annual Report 2024", "fontSize": 30, "fontName": "Lato" },
      { "name": "chart1", "type": "simplechart", "position": { "x": 55, "y": 50 }, "width": 100, "height": 80, "chartType": "bar", "data": "50,80,60,100", "label": "Quarterly Performance", "color": "#3b82f6" },
      { "name": "cap1", "type": "text", "position": { "x": 55, "y": 135 }, "width": 100, "height": 10, "content": "Figure 1: Quarterly Performance", "fontSize": 10, "alignment": "center" },
      { "name": "p1", "type": "text", "position": { "x": 100, "y": 282 }, "width": 20, "height": 10, "content": "Page 1", "fontSize": 9 }
    ],
    [
      { "name": "ref_title", "type": "text", "position": { "x": 15, "y": 15 }, "width": 180, "height": 15, "content": "References", "fontSize": 18, "fontName": "Lato" },
      { "name": "ref_list", "type": "text", "position": { "x": 15, "y": 35 }, "width": 180, "height": 50, "content": "1. Sales Dept data, Q4 2024.\\n2. Market Analysis Report, 2024.", "fontSize": 12 },
      { "name": "p2", "type": "text", "position": { "x": 100, "y": 282 }, "width": 20, "height": 10, "content": "Page 2", "fontSize": 9 }
    ]
  ]
}
\`\`\``;
}

// =============================================================================
// Main Prompt Builder (主构建函数)
// =============================================================================

/**
 * 构建完整的 system prompt
 * 
 * @param context - 提示词上下文配置
 * @returns 完整的 system prompt 字符串
 * 
 * @example
 * // Discovery phase - 只获取元素摘要
 * const prompt1 = buildSystemPrompt({ language: 'zh', phase: 'discovery' });
 * 
 * // Generation phase - 获取完整元素定义
 * const prompt2 = buildSystemPrompt({ 
 *   language: 'zh', 
 *   phase: 'generation',
 *   userPresetElements: ['text', 'image', 'table'],
 *   paperSizeName: 'A4'
 * });
 */
export function buildSystemPrompt(context: PromptContext): string {
  const sections: string[] = [];

  // 1. 核心行为规则 (始终包含)
  sections.push(CORE_BEHAVIOR_PROMPT);

  // 2. 工作区上下文 (如果有已放置的元素)
  if (context.workspaceContextPrompt) {
    sections.push(context.workspaceContextPrompt);
  }

  // 3. 元素摘要或详细定义
  if (context.phase === 'discovery') {
    sections.push(buildElementSummarySection(context.language, context.userPresetElements));
  } else {
    sections.push(buildElementDetailSection(context.language, context.userPresetElements));
  }

  // 4. 纸张尺寸
  sections.push(buildPaperSizeSection(context.language, context.paperSizeName));

  // 5. 页面边界规则
  sections.push(PAGE_BOUNDARY_RULES);

  // 6. 动态布局规则 (根据纸张尺寸计算)
  if (context.paperSizeName) {
    const size = getPaperSize(context.paperSizeName);
    if (size) {
      sections.push(buildLayoutRulesPrompt(size, context.language));
    }
  }

  // 7. 图片布局规则
  sections.push(IMAGE_LAYOUT_RULES);

  // 8. Emoji 限制规则
  sections.push(NO_EMOJI_RULE);

  // 9. HTML 标签限制规则
  sections.push(NO_HTML_TAGS_RULE);

  // 9. 模板结构
  sections.push(TEMPLATE_STRUCTURE);

  // 10. 字体规则 (CJK)
  sections.push(CJK_FONT_RULES);

  // 11. 演示文稿专用规则 (仅 PPT 尺寸)
  if (context.paperSizeName && context.paperSizeName.toLowerCase().includes('ppt')) {
    sections.push(PRESENTATION_DESIGN_RULES);
  }

  // 8. 示例 (可选，仅在 generation phase 且 includeExamples 为 true 时)
  if (context.phase === 'generation' && context.includeExamples !== false) {
    sections.push(buildExamplesSection(context.language));
  }

  return sections.join('\n\n---\n\n');
}

/**
 * 构建精简版 system prompt (用于对话模式)
 */
export function buildConversationPrompt(): string {
  return CORE_BEHAVIOR_PROMPT;
}

/**
 * 估算 prompt 的 token 数 (粗略估计，1 token ≈ 4 字符)
 */
export function estimateTokens(prompt: string): number {
  return Math.ceil(prompt.length / 4);
}

// =============================================================================
// Intent Detection Utilities (意图检测工具)
// =============================================================================

/**
 * 检测用户输入的语言
 */
export function detectLanguage(input: string): 'zh' | 'en' {
  // 检测中文字符
  const chinesePattern = /[\u4e00-\u9fa5]/;
  return chinesePattern.test(input) ? 'zh' : 'en';
}

/**
 * 检测用户是否请求生成或修改模板
 */
export function isGenerationRequest(input: string): boolean {
  const generationKeywords = [
    // English — creation
    'create', 'make', 'design', 'generate', 'build', 'draft', 'produce',
    // English — modification
    'modify', 'change', 'swap', 'move', 'resize', 'update', 'edit', 'adjust',
    'replace', 'remove', 'delete', 'add', 'rearrange', 'reorder', 'enlarge',
    'shrink', 'reposition', 'rename', 'duplicate', 'align',
    // Chinese — creation (创建类)
    '创建', '制作', '设计', '生成', '做一个', '帮我做', '弄一个', '画一个',
    // Chinese — modification (修改类)
    '修改', '调整', '互换', '交换', '换一下', '移动', '替换', '删除',
    '添加', '放大', '缩小', '改', '换', '移', '加', '去掉', '把',
    '对齐', '居中', '排列', '重新', '更改', '变更', '挪',
    // Japanese — creation + modification
    '作成', 'デザイン', '生成する', '変更', '修正', '移動', '削除',
    '追加', '入れ替え', '調整', '差し替え', '編集',
    // Korean — creation + modification
    '만들기', '디자인', '생성', '변경', '수정', '이동', '삭제',
    '추가', '교환', '조정', '교체', '편집',
    // French
    'créer', 'concevoir', 'modifier', 'changer', 'déplacer', 'supprimer', 'ajouter',
    // Spanish
    'crear', 'diseñar', 'modificar', 'cambiar', 'mover', 'eliminar', 'agregar',
    // German
    'erstellen', 'gestalten', 'ändern', 'verschieben', 'löschen', 'hinzufügen',
    // Portuguese
    'criar', 'projetar', 'modificar', 'mover', 'excluir', 'adicionar',
    // Arabic
    'إنشاء', 'تصميم', 'تعديل', 'نقل', 'حذف', 'إضافة',
  ];
  
  const lowerInput = input.toLowerCase();
  return generationKeywords.some(keyword => lowerInput.includes(keyword));
}

/**
 * 根据对话历史和当前输入推断阶段
 */
export function detectPhase(
  messages: { role: string; content: string }[],
  currentInput: string
): 'discovery' | 'generation' {
  // 如果是第一条消息且请求生成，仍然以 discovery 开始（确认细节）
  if (messages.length === 0 && isGenerationRequest(currentInput)) {
    // 检查输入是否足够详细 (简单启发式: 长度 > 50 字符)
    if (currentInput.length > 50) {
      return 'generation';
    }
    return 'discovery';
  }
  
  // 如果对话已经进行，且用户提供了更多细节，切换到 generation
  if (messages.length > 0 && isGenerationRequest(currentInput)) {
    return 'generation';
  }
  
  // 默认 discovery
  return 'discovery';
}

// =============================================================================
// Visual Analysis Trigger (视觉分析触发条件)
// =============================================================================

export interface VisualAnalysisTriggerContext {
  /** 用户输入 */
  userInput: string;
  /** 画布是否有图片元素 */
  hasImageElements: boolean;
  /** 用户是否上传了参考图片 */
  hasUploadedImage: boolean;
  /** 当前阶段 */
  phase: 'discovery' | 'generation';
}

/**
 * 智能判断是否需要启用视觉分析 (PaddleOCR-VL)
 * 
 * 只在必要时启用，避免每次都卡 2-3 秒
 * 
 * 触发条件：
 * 1. ✅ 画布有图片元素（需要理解图片内容）
 * 2. ✅ 用户请求"复制/参考/模仿"这个设计
 * 3. ✅ 用户上传了参考图片
 * 4. ✅ 对话中提到"布局/排版/结构"
 * 5. ❌ 其他情况只用 Schema（快速）
 */
export function shouldEnableVisualAnalysis(context: VisualAnalysisTriggerContext): boolean {
  const { userInput, hasImageElements, hasUploadedImage, phase } = context;
  
  // 只在 generation 阶段考虑视觉分析
  if (phase !== 'generation') {
    return false;
  }
  
  // 条件 1: 用户上传了参考图片
  if (hasUploadedImage) {
    console.log('[Visual Trigger] ✅ User uploaded reference image');
    return true;
  }
  
  // 条件 2: 画布有图片元素
  if (hasImageElements) {
    console.log('[Visual Trigger] ✅ Canvas has image elements');
    return true;
  }
  
  const lowerInput = userInput.toLowerCase();
  
  // 条件 3: 用户请求复制/参考/模仿
  const copyKeywords = [
    // Chinese
    '复制', '参考', '模仿', '照着', '按照', '仿照', '克隆', '一样的',
    '这个样式', '这个风格', '这个布局', '同样的',
    // English
    'copy', 'reference', 'imitate', 'clone', 'duplicate', 'same as',
    'like this', 'similar to', 'based on', 'follow this',
  ];
  
  if (copyKeywords.some(keyword => lowerInput.includes(keyword))) {
    console.log('[Visual Trigger] ✅ User wants to copy/reference design');
    return true;
  }
  
  // 条件 4: 用户提到布局/排版/结构
  const layoutKeywords = [
    // Chinese
    '布局', '排版', '结构', '位置', '对齐', '间距', '层次',
    '视觉', '设计', '样式', '排列',
    // English
    'layout', 'structure', 'position', 'align', 'spacing', 'hierarchy',
    'visual', 'arrangement', 'placement',
  ];
  
  if (layoutKeywords.some(keyword => lowerInput.includes(keyword))) {
    console.log('[Visual Trigger] ✅ User mentions layout/structure');
    return true;
  }
  
  // 默认不启用
  console.log('[Visual Trigger] ❌ No trigger conditions met, using Schema only');
  return false;
}
