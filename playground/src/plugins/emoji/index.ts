/**
 * Emoji Plugin - 表情包插件
 * 
 * 允许用户从表情包库中选择并插入表情符号到画布
 * 插入的表情符号作为 SVG 图片元素
 */

import type { Plugin, UIRenderProps, PDFRenderProps } from '@pdfme/common';
import { image } from '@pdfme/schemas';

// Smile icon for the plugin toolbar
const smileIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>';

// Emoji schema interface
interface EmojiSchema {
  [x: string]: unknown;
  id?: string;
  name: string;
  type: 'emoji';
  content: string;  // SVG data URL or path
  position: { x: number; y: number };
  width: number;
  height: number;
  rotate?: number;
  opacity?: number;
}

// UI 渲染器 - 使用 image 插件的渲染逻辑
const emojiUiRender = async (arg: UIRenderProps<EmojiSchema>) => {
  // Emoji 本质上是 SVG 图片，复用 image 的渲染逻辑
  const imageArg = {
    ...arg,
    schema: {
      ...arg.schema,
      type: 'image' as const,
    },
  };
  await (image.ui as any)(imageArg);
};

// PDF 渲染器 - 使用 image 插件的渲染逻辑
const emojiPdfRender = async (arg: PDFRenderProps<EmojiSchema>) => {
  const imageArg = {
    ...arg,
    schema: {
      ...arg.schema,
      type: 'image' as const,
    },
  };
  await (image.pdf as any)(imageArg);
};

// 创建 emoji 插件
const emojiPlugin: Plugin<EmojiSchema> = {
  pdf: emojiPdfRender,
  ui: emojiUiRender,
  
  propPanel: {
    schema: () => ({
      // Emoji 插件的属性面板比较简单，主要是尺寸调整
      // 图片内容通过 EmojiPanel 选择
    }),
    defaultSchema: {
      name: '',
      type: 'emoji',
      content: '',
      position: { x: 0, y: 0 },
      width: 30,
      height: 30,
      rotate: 0,
      opacity: 1,
    },
  },
  icon: smileIcon,
};

export default emojiPlugin;
