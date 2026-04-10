/**
 * ArtText Plugin - 艺术字插件
 * 
 * 完全独立的艺术字插件，支持加粗、阴影、渐变、描边等效果
 */

import type { Plugin, PropPanelWidgetProps, UIRenderProps, PDFRenderProps } from '@pdfme/common';

// 定义艺术字体列表 - 只包含装饰性/艺术性字体
export const ART_FONT_LIST = [
  // CJK Base (for Chinese content support)
  'NotoSansSC',      // 简体中文
  // Display/Headline fonts (Bold, impactful)
  'Anton', 'BebasNeue', 'Bangers', 'Righteous', 'AbrilFatface', 
  'RussoOne', 'Acme', 'Bungee', 'PlayfairDisplay', 'Montserrat',
  // Artistic/Script fonts (Elegant, decorative)
  'Pacifico', 'GreatVibes', 'Lobster', 'Allura', 'DancingScript', 
  'Sacramento', 'Courgette', 'Tangerine', 'PinyonScript', 
  'AlexBrush', 'LoversQuarrel', 'Knewave',
  // Handwriting fonts
  'IndieFlower', 'ShadowsIntoLight',
  // Rounded/Fun fonts
  'Comfortaa', 'Fredoka', 'Dosis', 'Rubik',
  // Chinese Art Fonts (中文艺术字体)
  'SiYuanHeiTi', 'SiYuanSongTi', 'SiYuanRouHeiMono', 'SiYuanRouHeiP',  // 思源系列
  'WenQuanYiZhengHei', 'WenQuanYiMicroHei',  // 文泉驿
  'ZhanKuGaoDuanHei', 'ZhanKuKuaiLeTi', 'ZhanKuKuHeiTi', 'ZhanKuXiaoWei', 'ZhanKuHuangYou', 'ZhanKuWenYi',  // 站酷
  'BaoTuXiaoBai', 'PangMenZhengDao', 'YangRenDongZhuShi', 'MuYaoSoftPen',  // 其他艺术字
  'SetoFont', 'WangHanZongKaiTi', 'TaipeiFontTC', 'RuiZiZhenYan', 'LuShuaiZhengRuiHei', 'ZhiYongShouShu',
] as const;

export type ArtFontName = typeof ART_FONT_LIST[number];

// Sparkles icon SVG (保留但不使用，以备将来需要)
// const sparklesIcon = '<svg xmlns="http://www.w3.org/2000/svg" ...></svg>';

// 创建 artText 插件 schema
interface ArtTextSchema {
  [x: string]: unknown;  // 索引签名，满足 @pdfme/common 类型约束
  id?: string;
  name: string;
  type: 'artText';
  content: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  rotate?: number;
  opacity?: number;
  fontName?: string;
  fontSize?: number;
  fontColor?: string;
  backgroundColor?: string;
  alignment?: 'left' | 'center' | 'right';
  verticalAlignment?: 'top' | 'middle' | 'bottom';
  lineHeight?: number;
  characterSpacing?: number;
  // 艺术效果属性
  artBold?: boolean;
  artShadow?: boolean;
  artShadowColor?: string;
  artShadowBlur?: number;
  artGradient?: boolean;
  artGradientColors?: [string, string];
  artOutline?: boolean;
  artOutlineColor?: string;
  artOutlineWidth?: number;
}

// 默认值常量
const DEFAULT_FONT_SIZE = 13;
const DEFAULT_ALIGNMENT = 'left';
const DEFAULT_LINE_HEIGHT = 1;
const DEFAULT_CHARACTER_SPACING = 0;
const DEFAULT_FONT_COLOR = '#000000';

// UI 渲染器 - 在画布上显示艺术字
const artTextUiRender = async (arg: UIRenderProps<ArtTextSchema>) => {
  const { value, schema, rootElement, mode, onChange, stopEditing, tabIndex, placeholder } = arg;
  
  // 清空容器
  rootElement.innerHTML = '';
  
  // 创建容器
  const container = document.createElement('div');
  container.style.cssText = `
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: ${schema.verticalAlignment === 'middle' ? 'center' : schema.verticalAlignment === 'bottom' ? 'flex-end' : 'flex-start'};
    padding: 0;
    box-sizing: border-box;
    background-color: ${schema.backgroundColor || 'transparent'};
    cursor: ${mode === 'viewer' ? 'default' : 'text'};
  `;
  rootElement.appendChild(container);
  
  // 创建文本元素
  const textElement = document.createElement('div');
  textElement.id = 'arttext-' + String(schema.id || Date.now());
  
  // 基础样式
  let textStyles = `
    font-family: ${schema.fontName ? `'${schema.fontName}'` : 'inherit'};
    font-size: ${schema.fontSize || DEFAULT_FONT_SIZE}pt;
    color: ${schema.fontColor || DEFAULT_FONT_COLOR};
    letter-spacing: ${schema.characterSpacing || DEFAULT_CHARACTER_SPACING}pt;
    line-height: ${schema.lineHeight || DEFAULT_LINE_HEIGHT}em;
    text-align: ${schema.alignment || DEFAULT_ALIGNMENT};
    white-space: pre-wrap;
    word-break: break-word;
    outline: none;
    border: none;
    background: transparent;
  `;
  
  // 加粗效果
  if (schema.artBold) {
    textStyles += 'font-weight: 700;';
  }
  
  // 阴影效果
  if (schema.artShadow) {
    const shadowColor = schema.artShadowColor || '#00000040';
    const shadowBlur = schema.artShadowBlur || 4;
    textStyles += `text-shadow: ${shadowBlur / 2}px ${shadowBlur / 2}px ${shadowBlur}px ${shadowColor};`;
  }
  
  // 渐变效果
  if (schema.artGradient) {
    const colors = schema.artGradientColors || ['#8b5cf6', '#ec4899'];
    textStyles += `
      background: linear-gradient(90deg, ${colors[0]}, ${colors[1]});
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    `;
  }
  
  // 描边效果
  if (schema.artOutline) {
    const outlineColor = schema.artOutlineColor || '#000000';
    const outlineWidth = schema.artOutlineWidth || 1;
    textStyles += `-webkit-text-stroke: ${outlineWidth}px ${outlineColor};`;
  }
  
  textElement.style.cssText = textStyles;
  
  // 设置内容
  const displayValue = value || placeholder || '';
  
  if (mode === 'viewer') {
    // 只读模式
    textElement.innerText = displayValue;
  } else {
    // 编辑模式
    textElement.contentEditable = 'plaintext-only';
    textElement.tabIndex = tabIndex || 0;
    textElement.innerText = value || '';
    
    // 监听失焦事件保存内容
    textElement.addEventListener('blur', (e: Event) => {
      const target = e.target as HTMLDivElement;
      let text = target.innerText;
      if (text.endsWith('\n')) {
        text = text.slice(0, -1);
      }
      if (onChange) onChange({ key: 'content', value: text });
      if (stopEditing) stopEditing();
    });
    
    // 如果是 designer 模式，自动聚焦
    if (mode === 'designer') {
      setTimeout(() => {
        textElement.focus();
        const selection = window.getSelection();
        const range = document.createRange();
        if (selection && range) {
          range.selectNodeContents(textElement);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      });
    }
  }
  
  container.appendChild(textElement);
};

// PDF 渲染器 - 导入并使用 text 的 PDF 渲染（因为 PDF 不支持 CSS 效果）
// 注意：艺术效果主要体现在 UI 上，PDF 输出会使用基础文本样式
import { text } from '@pdfme/schemas';

const artTextPdfRender = async (arg: PDFRenderProps<ArtTextSchema>) => {
  // 将 artText schema 转换为 text 兼容格式
  const textArg = {
    ...arg,
    schema: {
      ...arg.schema,
      type: 'text' as const,
    },
  };
  
  // 使用 text 的 PDF 渲染器
  await (text.pdf as any)(textArg);
};

// UseDynamicFontSize widget
const UseDynamicFontSize = (props: PropPanelWidgetProps) => {
  const { rootElement, changeSchemas, activeSchema, i18n } = props;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = Boolean((activeSchema as any)?.dynamicFontSize);
  checkbox.onchange = (e: Event) => {
    const val = (e.target as HTMLInputElement).checked
      ? { min: 8, max: 72, fit: 'horizontal' }
      : undefined;
    changeSchemas([{ key: 'dynamicFontSize', value: val, schemaId: activeSchema.id }]);
  };
  const label = document.createElement('label');
  const span = document.createElement('span');
  span.innerText = (i18n('schemas.text.dynamicFontSize') as string) || 'Dynamic Font Size';
  span.style.cssText = 'margin-left: 0.5rem';
  label.style.cssText = 'display: flex; width: 100%;';
  label.appendChild(checkbox);
  label.appendChild(span);
  rootElement.appendChild(label);
};

// 创建 artText 插件
const artTextPlugin: Plugin<ArtTextSchema> = {
  // 使用自定义渲染器
  pdf: artTextPdfRender,
  ui: artTextUiRender,
  
  // 自定义 propPanel，只显示艺术字体
  propPanel: {
    schema: ({ options, i18n }) => {
      const font = options.font || {};
      const availableFonts = Object.keys(font);
      
      // 只显示艺术字体（取 ART_FONT_LIST 和可用字体的交集）
      const artFontNames = ART_FONT_LIST.filter(fontName => 
        availableFonts.includes(fontName)
      );
      
      // 如果没有可用的艺术字体，回退到第一个可用字体
      const fontOptions = artFontNames.length > 0 
        ? artFontNames 
        : availableFonts.slice(0, 5);
      
      const fallbackFontName = fontOptions[0] || 'NotoSansSC';

      return {
        fontName: {
          title: i18n('schemas.text.fontName') || 'Font Name',
          type: 'string',
          widget: 'select',
          default: fallbackFontName,
          placeholder: fallbackFontName,
          props: { 
            options: fontOptions.map((name) => ({ label: name, value: name })) 
          },
          span: 12,
        },
        fontSize: {
          title: i18n('schemas.text.size') || 'Size',
          type: 'number',
          widget: 'inputNumber',
          span: 6,
          props: { min: 0 },
        },
        characterSpacing: {
          title: i18n('schemas.text.spacing') || 'Spacing',
          type: 'number',
          widget: 'inputNumber',
          span: 6,
          props: { min: 0 },
        },
        lineHeight: {
          title: i18n('schemas.text.lineHeight') || 'Line Height',
          type: 'number',
          widget: 'inputNumber',
          props: { step: 0.1, min: 0 },
          span: 12,
        },
        useDynamicFontSize: { 
          type: 'boolean', 
          widget: 'UseDynamicFontSize', 
          bind: false, 
          span: 12 
        },
        fontColor: {
          title: i18n('schemas.textColor') || 'Text Color',
          type: 'string',
          widget: 'color',
          props: { disabledAlpha: true },
          rules: [
            {
              pattern: '^#[0-9A-Fa-f]{6}$',
              message: i18n('validation.hexColor') || 'Invalid hex color',
            },
          ],
        },
        backgroundColor: {
          title: i18n('schemas.bgColor') || 'Background Color',
          type: 'string',
          widget: 'color',
          props: { disabledAlpha: true },
          rules: [
            {
              pattern: '^#[0-9A-Fa-f]{6}$',
              message: i18n('validation.hexColor') || 'Invalid hex color',
            },
          ],
        },
      };
    },
    widgets: { UseDynamicFontSize },
    defaultSchema: {
      name: '',
      type: 'artText',
      content: 'Art Text',
      position: { x: 0, y: 0 },
      width: 80,
      height: 20,
      rotate: 0,
      alignment: 'center',
      verticalAlignment: 'middle',
      fontSize: 24,
      lineHeight: 1,
      characterSpacing: 0,
      fontColor: '#8b5cf6', // 默认紫色
      fontName: 'NotoSansSC',
      backgroundColor: '',
      opacity: 1,
      // 艺术效果默认值
      artBold: false,
      artShadow: false,
      artShadowColor: '#00000040',
      artShadowBlur: 4,
      artGradient: false,
      artGradientColors: ['#8b5cf6', '#ec4899'],
      artOutline: false,
      artOutlineColor: '#000000',
      artOutlineWidth: 1,
    },
  },
  // 不设置 icon，避免在工具栏显示重复的按钮
  // 艺术字通过魔法棒按钮 (onArtFontClick) 创建
};

export default artTextPlugin;
