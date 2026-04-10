import { Template, Font, checkTemplate, getInputFromTemplate } from '@pdfme/common';
import { Form, Viewer, Designer } from '@pdfme/ui';
import { generate } from '@pdfme/generator';
import { getPlugins } from './plugins';

export const pageSizes = {
  // ISO A Series
  'A3': { width: 297, height: 420 },
  'A4': { width: 210, height: 297 },
  'A5': { width: 148, height: 210 },
  
  // ISO B Series
  'B4': { width: 250, height: 353 },
  'B5': { width: 176, height: 250 },

  // US Paper Sizes
  'Letter': { width: 215.9, height: 279.4 },
  'Legal': { width: 215.9, height: 355.6 },
  'Tabloid': { width: 279.4, height: 431.8 },

  // Cards
  'Postcard (JP)': { width: 100, height: 148 },
  'Postcard (US)': { width: 101.6, height: 152.4 }, // 4x6 inch
  'Business Card (US)': { width: 89, height: 51 }, // 3.5x2 inch
  'Business Card (EU)': { width: 85, height: 55 },
  'Business Card (CN)': { width: 90, height: 54 },

  // Slides / Digital
  'PPT (4:3)': { width: 254, height: 190.5 }, // 10x7.5 inch
  'PPT (16:9)': { width: 338.7, height: 190.5 }, // 13.33x7.5 inch
};

export const getPageSize = (name: string) => {
  return pageSizes[name as keyof typeof pageSizes] || pageSizes['A4'];
};

export function fromKebabCase(str: string): string {
  return str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// IMPORTANT: fontkit 2.0.2+ supports variable fonts
// Both static .ttf and variable fonts work!
export const getFontsData = (): Font => ({
  // =====================
  // Default/Fallback Font (ONLY ONE can have fallback: true)
  // =====================
  'NotoEmoji': {
    fallback: false,
    data: '/fonts/NotoEmoji-Regular.ttf',
  },
  // OpenMoji - Open source emoji project (CC BY-SA 4.0)
  'OpenMoji': {
    fallback: false,
    data: '/fonts/OpenMoji.ttf',
  },
  
  'Lato': {
    fallback: true,
    data: '/fonts/Lato-Regular.ttf',
  },
  
  // =====================
  // East Asian Languages - CJK Fonts
  // =====================
  
  // Chinese Simplified (简体中文)
  'NotoSansSC': {
    fallback: false,
    data: '/fonts/NotoSansSC.ttf',
  },
  // Chinese Traditional (繁體中文)
  'NotoSansTC': {
    fallback: false,
    data: '/fonts/NotoSansTC.ttf',
  },
  // Japanese (日本語)
  'NotoSansJP': {
    fallback: false,
    data: '/fonts/NotoSansJP.ttf',
  },
  // Korean (한국어)
  'NotoSansKR': {
    fallback: false,
    data: '/fonts/NotoSansKR.ttf',
  },
  
  // =====================
  // Other Language Fonts
  // =====================
  // Thai (ภาษาไทย)
  'NotoSansThai': {
    fallback: false,
    data: '/fonts/NotoSansThai.ttf',
  },
  // Arabic (العربية)
  'NotoSansArabic': {
    fallback: false,
    data: '/fonts/NotoSansArabic.ttf',
  },
  // Hebrew (עברית)
  'NotoSansHebrew': {
    fallback: false,
    data: '/fonts/NotoSansHebrew.ttf',
  },
  // Hindi/Devanagari (हिन्दी)
  'NotoSansDevanagari': {
    fallback: false,
    data: '/fonts/NotoSansDevanagari.ttf',
  },
  // Bengali (বাংলা)
  'NotoSansBengali': {
    fallback: false,
    data: '/fonts/NotoSansBengali.ttf',
  },
  // Tamil (தமிழ்)
  'NotoSansTamil': {
    fallback: false,
    data: '/fonts/NotoSansTamil.ttf',
  },
  // Telugu (తెలుగు)
  'NotoSansTelugu': {
    fallback: false,
    data: '/fonts/NotoSansTelugu.ttf',
  },
  // Myanmar (မြန်မာ)
  'NotoSansMyanmar': {
    fallback: false,
    data: '/fonts/NotoSansMyanmar.ttf',
  },
  // Khmer (ខ្មែរ)
  'NotoSansKhmer': {
    fallback: false,
    data: '/fonts/NotoSansKhmer.ttf',
  },
  // Lao (ລາວ)
  'NotoSansLao': {
    fallback: false,
    data: '/fonts/NotoSansLao.ttf',
  },
  // Georgian (ქართული)
  'NotoSansGeorgian': {
    fallback: false,
    data: '/fonts/NotoSansGeorgian.ttf',
  },
  // Sinhala (සිංහල)
  'NotoSansSinhala': {
    fallback: false,
    data: '/fonts/NotoSansSinhala.ttf',
  },
  // Gujarati (ગુજરાતી)
  'NotoSansGujarati': {
    fallback: false,
    data: '/fonts/NotoSansGujarati.ttf',
  },
  // Kannada (ಕನ್ನಡ)
  'NotoSansKannada': {
    fallback: false,
    data: '/fonts/NotoSansKannada.ttf',
  },
  // Malayalam (മലയാളം)
  'NotoSansMalayalam': {
    fallback: false,
    data: '/fonts/NotoSansMalayalam.ttf',
  },
  // Armenian (Հայերեն)
  'NotoSansArmenian': {
    fallback: false,
    data: '/fonts/NotoSansArmenian.ttf',
  },
  // Ethiopic (ግዕዝ)
  'NotoSansEthiopic': {
    fallback: false,
    data: '/fonts/NotoSansEthiopic.ttf',
  },
  // Gurmukhi/Punjabi (ਪੰਜਾਬੀ)
  'NotoSansGurmukhi': {
    fallback: false,
    data: '/fonts/NotoSansGurmukhi.ttf',
  },
  
  // =====================
  // Additional Language Fonts
  // =====================
  // Oriya/Odia (ଓଡ଼ିଆ)
  'NotoSansOriya': {
    fallback: false,
    data: '/fonts/NotoSansOriya.ttf',
  },
  // Javanese (ꦧꦱꦗꦮ)
  'NotoSansJavanese': {
    fallback: false,
    data: '/fonts/NotoSansJavanese.ttf',
  },
  // Cherokee (ᏣᎳᎩ)
  'NotoSansCherokee': {
    fallback: false,
    data: '/fonts/NotoSansCherokee.ttf',
  },
  // Tibetan (བོད་སྐད)
  'NotoSerifTibetan': {
    fallback: false,
    data: '/fonts/NotoSerifTibetan.ttf',
  },
  // Balinese (ᬅᬓ᭄ᬱᬭᬩᬮᬶ)
  'NotoSansBalinese': {
    fallback: false,
    data: '/fonts/NotoSansBalinese.ttf',
  },
  // Syriac (ܣܘܪܝܝܐ)
  'NotoSansSyriac': {
    fallback: false,
    data: '/fonts/NotoSansSyriac.ttf',
  },
  // Thaana/Maldivian (ދިވެހި)
  'NotoSansThaana': {
    fallback: false,
    data: '/fonts/NotoSansThaana.ttf',
  },
  // Tifinagh/Berber (ⵜⵉⴼⵉⵏⴰⵖ)
  'NotoSansTifinagh': {
    fallback: false,
    data: '/fonts/NotoSansTifinagh.ttf',
  },
  // Yi (ꆈꌠ)
  'NotoSansYi': {
    fallback: false,
    data: '/fonts/NotoSansYi.ttf',
  },
  // Tai Tham/Lanna (ᨲᩮ᩠ᩅᨾᩮᩥᩬᨦ)
  'NotoSansTaiTham': {
    fallback: false,
    data: '/fonts/NotoSansTaiTham.ttf',
  },
  // Buginese (ᨒᨚᨈᨑ)
  'NotoSansBuginese': {
    fallback: false,
    data: '/fonts/NotoSansBuginese.ttf',
  },
  // Cham (ꨌꩌ)
  'NotoSansCham': {
    fallback: false,
    data: '/fonts/NotoSansCham.ttf',
  },
  // Sundanese (ᮞᮥᮔ᮪ᮓ)
  'NotoSansSundanese': {
    fallback: false,
    data: '/fonts/NotoSansSundanese.ttf',
  },
  // N'Ko (ߒߞߏ)
  'NotoSansNKo': {
    fallback: false,
    data: '/fonts/NotoSansNKo.ttf',
  },
  // Mongolian (ᠮᠣᠩᠭᠣᠯ)
  'NotoSansMongolian': {
    fallback: false,
    data: '/fonts/NotoSansMongolian.ttf',
  },
  
  // =====================
  // Base Fonts (Static fonts)
  // =====================
  'Pacifico': {
    fallback: false,
    data: '/fonts/Pacifico-Regular.ttf',
  },
  
  // =====================
  // Artistic/Decorative Fonts (Existing)
  // =====================
  
  // Calligraphy Style - Romantic, elegant
  'GreatVibes': {
    fallback: false,
    data: '/fonts/GreatVibes-Regular.ttf',
  },
  // Bold Display - Headlines, logos
  'Lobster': {
    fallback: false,
    data: '/fonts/Lobster-Regular.ttf',
  },
  // Flowing Script - Wedding, formal events
  'Allura': {
    fallback: false,
    data: '/fonts/Allura-Regular.ttf',
  },
  
  // =====================
  // NEW: Popular Variable Fonts (fontkit 2.0.2+ supports these)
  // =====================
  'Inter': {
    fallback: false,
    data: '/fonts/Inter.ttf',
  },
  'Roboto': {
    fallback: false,
    data: '/fonts/Roboto.ttf',
  },
  'OpenSans': {
    fallback: false,
    data: '/fonts/OpenSans.ttf',
  },
  
  // =====================
  // NEW: Plain Text Fonts (Static)
  // =====================
  'Poppins': {
    fallback: false,
    data: '/fonts/Poppins-Regular.ttf',
  },
  'Kanit': {
    fallback: false,
    data: '/fonts/Kanit-Regular.ttf',
  },
  'Mukta': {
    fallback: false,
    data: '/fonts/Mukta-Regular.ttf',
  },
  'Abel': {
    fallback: false,
    data: '/fonts/Abel-Regular.ttf',
  },
  'CrimsonText': {
    fallback: false,
    data: '/fonts/CrimsonText-Regular.ttf',
  },
  'Spectral': {
    fallback: false,
    data: '/fonts/Spectral-Regular.ttf',
  },
  
  // =====================
  // NEW: Artistic/Decorative Fonts
  // =====================
  'DancingScript': {
    fallback: false,
    data: '/fonts/DancingScript.ttf',
  },
  'Sacramento': {
    fallback: false,
    data: '/fonts/Sacramento-Regular.ttf',
  },
  'Courgette': {
    fallback: false,
    data: '/fonts/Courgette-Regular.ttf',
  },
  'Tangerine': {
    fallback: false,
    data: '/fonts/Tangerine-Regular.ttf',
  },
  'PinyonScript': {
    fallback: false,
    data: '/fonts/PinyonScript-Regular.ttf',
  },
  'AlexBrush': {
    fallback: false,
    data: '/fonts/AlexBrush-Regular.ttf',
  },
  'LoversQuarrel': {
    fallback: false,
    data: '/fonts/LoversQuarrel-Regular.ttf',
  },
  'Knewave': {
    fallback: false,
    data: '/fonts/Knewave-Regular.ttf',
  },
  
  // =====================
  // New Popular Display & Headline Fonts
  // =====================
  'Montserrat': {
    fallback: false,
    data: '/fonts/Montserrat.ttf',
  },
  'PlayfairDisplay': {
    fallback: false,
    data: '/fonts/PlayfairDisplay.ttf',
  },
  'Comfortaa': {
    fallback: false,
    data: '/fonts/Comfortaa.ttf',
  },
  'Rubik': {
    fallback: false,
    data: '/fonts/Rubik.ttf',
  },
  'Dosis': {
    fallback: false,
    data: '/fonts/Dosis.ttf',
  },
  'WorkSans': {
    fallback: false,
    data: '/fonts/WorkSans.ttf',
  },
  'Fredoka': {
    fallback: false,
    data: '/fonts/Fredoka.ttf',
  },
  
  // =====================
  // Bold Display / Poster Fonts
  // =====================
  'Anton': {
    fallback: false,
    data: '/fonts/Anton.ttf',
  },
  'BebasNeue': {
    fallback: false,
    data: '/fonts/BebasNeue.ttf',
  },
  'Bangers': {
    fallback: false,
    data: '/fonts/Bangers.ttf',
  },
  'Righteous': {
    fallback: false,
    data: '/fonts/Righteous.ttf',
  },
  'AbrilFatface': {
    fallback: false,
    data: '/fonts/AbrilFatface.ttf',
  },
  'RussoOne': {
    fallback: false,
    data: '/fonts/RussoOne.ttf',
  },
  'Acme': {
    fallback: false,
    data: '/fonts/Acme.ttf',
  },
  'Bungee': {
    fallback: false,
    data: '/fonts/Bungee.ttf',
  },
  
  // =====================
  // Handwriting & Casual Fonts
  // =====================
  'IndieFlower': {
    fallback: false,
    data: '/fonts/IndieFlower.ttf',
  },
  'ShadowsIntoLight': {
    fallback: false,
    data: '/fonts/ShadowsIntoLight.ttf',
  },
  
  // =====================
  // Monospace / Code Fonts
  // =====================
  'FiraCode': {
    fallback: false,
    data: '/fonts/FiraCode.ttf',
  },
  'Inconsolata': {
    fallback: false,
    data: '/fonts/Inconsolata.ttf',
  },
  'PressStart2P': {
    fallback: false,
    data: '/fonts/PressStart2P.ttf',
  },
  
  // =====================
  // Chinese Art Fonts (中文艺术字体)
  // All fonts are open source / free for commercial use
  // =====================
  
  // 思源系列 (Source Han - Adobe/Google, SIL OFL 1.1)
  'SiYuanHeiTi': {
    fallback: false,
    data: '/chinese-art-fonts/思源黑体.ttf',
  },
  'SiYuanSongTi': {
    fallback: false,
    data: '/chinese-art-fonts/思源宋体.otf',
  },
  'SiYuanRouHeiMono': {
    fallback: false,
    data: '/chinese-art-fonts/思源柔黑-Monospace-Heavy.ttf',
  },
  'SiYuanRouHeiP': {
    fallback: false,
    data: '/chinese-art-fonts/思源柔黑-P-Heavy.ttf',
  },
  
  // 文泉驿 (WenQuanYi - GPL)
  'WenQuanYiZhengHei': {
    fallback: false,
    data: '/chinese-art-fonts/文泉驿正黑.ttf',
  },
  'WenQuanYiMicroHei': {
    fallback: false,
    data: '/chinese-art-fonts/文泉驿等宽微米黑.ttf',
  },
  
  // 站酷系列 (ZCOOL - Free Commercial Use)
  'ZhanKuGaoDuanHei': {
    fallback: false,
    data: '/chinese-art-fonts/站酷高端黑修订151105.ttf',
  },
  'ZhanKuKuaiLeTi': {
    fallback: false,
    data: '/chinese-art-fonts/站酷快乐体2016修订版.ttf',
  },
  'ZhanKuKuHeiTi': {
    fallback: false,
    data: '/chinese-art-fonts/站酷酷黑体.ttf',
  },
  'ZhanKuXiaoWei': {
    fallback: false,
    data: '/chinese-art-fonts/站酷小薇LOGO体.otf',
  },
  'ZhanKuHuangYou': {
    fallback: false,
    data: '/chinese-art-fonts/站酷庆科黄油体.ttf',
  },
  'ZhanKuWenYi': {
    fallback: false,
    data: '/chinese-art-fonts/站酷文艺体.ttf',
  },
  
  // 其他开源中文字体
  'BaoTuXiaoBai': {
    fallback: false,
    data: '/chinese-art-fonts/包图小白体.ttf',
  },
  'PangMenZhengDao': {
    fallback: false,
    data: '/chinese-art-fonts/庞门正道标题体.ttf',
  },
  'YangRenDongZhuShi': {
    fallback: false,
    data: '/chinese-art-fonts/杨任东竹石体-Heavy.ttf',
  },
  'MuYaoSoftPen': {
    fallback: false,
    data: '/chinese-art-fonts/沐瑶软笔手写体.ttf',
  },
  'SetoFont': {
    fallback: false,
    data: '/chinese-art-fonts/濑户可爱体.ttf',
  },
  'WangHanZongKaiTi': {
    fallback: false,
    data: '/chinese-art-fonts/王汉宗粗楷体简.ttf',
  },
  'TaipeiFontTC': {
    fallback: false,
    data: '/chinese-art-fonts/台北黑体常规体.ttf',
  },
  'RuiZiZhenYan': {
    fallback: false,
    data: '/chinese-art-fonts/锐字真言体.ttf',
  },
  'LuShuaiZhengRuiHei': {
    fallback: false,
    data: '/chinese-art-fonts/联盟起艺卢帅正锐黑体.ttf',
  },
  'ZhiYongShouShu': {
    fallback: false,
    data: '/chinese-art-fonts/智勇手书体中文简体.ttf',
  },
  'DroidSansMonoPy': {
    fallback: false,
    data: '/chinese-art-fonts/DroidSansMonoPy安卓字体.ttf',
  },
});

export const readFile = (file: File | null, type: 'text' | 'dataURL' | 'arrayBuffer') => {
  return new Promise<string | ArrayBuffer>((r) => {
    const fileReader = new FileReader();
    fileReader.addEventListener('load', (e) => {
      if (e && e.target && e.target.result && file !== null) {
        r(e.target.result);
      }
    });
    if (file !== null) {
      if (type === 'text') {
        fileReader.readAsText(file);
      } else if (type === 'dataURL') {
        fileReader.readAsDataURL(file);
      } else if (type === 'arrayBuffer') {
        fileReader.readAsArrayBuffer(file);
      }
    }
  });
};

const getTemplateFromJsonFile = (file: File) => {
  return readFile(file, 'text').then((jsonStr) => {
    const template: Template = JSON.parse(jsonStr as string);
    checkTemplate(template);
    return template;
  });
};

export const downloadJsonFile = (json: unknown, title: string) => {
  if (typeof window !== 'undefined') {
    const blob = new Blob([JSON.stringify(json)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
};

export const handleLoadTemplate = (
  e: React.ChangeEvent<HTMLInputElement>,
  currentRef: Designer | Form | Viewer | null
) => {
  if (e.target && e.target.files && e.target.files[0]) {
    getTemplateFromJsonFile(e.target.files[0])
      .then((t) => {
        if (!currentRef) return;
        currentRef.updateTemplate(t);
      })
      .catch((e) => {
        alert(`Invalid template file.
--------------------------
${e}`);
      });
  }
};

export const translations: { label: string; value: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ko', label: 'Korean' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ar', label: 'Arabic' },
  { value: 'th', label: 'Thai' },
  { value: 'pl', label: 'Polish' },
  { value: 'it', label: 'Italian' },
  { value: 'de', label: 'German' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
];

export const generatePDF = async (currentRef: Designer | Form | Viewer | null) => {
  if (!currentRef) return;
  const template = currentRef.getTemplate();
  const options = currentRef.getOptions();
  const inputs =
    typeof (currentRef as Viewer | Form).getInputs === 'function'
      ? (currentRef as Viewer | Form).getInputs()
      : getInputFromTemplate(template);
  const font = getFontsData();

  try {
    const pdf = await generate({
      template,
      inputs,
      options: {
        font,
        lang: options.lang,
        title: 'pdfme',
      },
      plugins: getPlugins(),
    });

    const blob = new Blob([pdf.buffer], { type: 'application/pdf' });
    window.open(URL.createObjectURL(blob));
  } catch (e) {
    alert(e + '\n\nCheck the console for full stack trace');
    throw e;
  }
};

export const isJsonString = (str: string) => {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
};

export const getBlankTemplate = () =>
({
  schemas: [{}],
  basePdf: {
    width: 210,
    height: 297,
    padding: [0, 0, 0, 0],
  },
} as Template);

export const getTemplateById = async (templateId: string): Promise<Template> => {
  const template = await fetch(`/template-assets/${templateId}/template.json`).then((res) =>
    res.json()
  );
  checkTemplate(template);
  return template as Template;
};
