import { useForm } from 'form-render';
import React, { useRef, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type {
  Dict,
  ChangeSchemaItem,
  SchemaForUI,
  PropPanelWidgetProps,
  PropPanelSchema,
  Schema,
} from '@pdfme/common';
import { isBlankPdf } from '@pdfme/common';
import type { SidebarProps } from '../../../types.js';
import { Menu, ArrowRight, Bold, Layers, Palette, PenTool } from 'lucide-react';
import { I18nContext, PluginsRegistry, OptionsContext } from '../../../contexts.js';
import { debounce } from '../../../helper.js';
import { DESIGNER_CLASSNAME } from '../../../constants.js';
import { theme, Typography, Button, Divider, Switch, Slider, ColorPicker, Select, Input } from 'antd';
import AlignWidget from './DetailView/AlignWidget.js';
import WidgetRenderer from './DetailView/WidgetRenderer.js';
import ButtonGroupWidget from './DetailView/ButtonGroupWidget.js';
import HeadingWidget from './DetailView/HeadingWidget.js';
import { InternalNamePath, ValidateErrorEntity } from 'rc-field-form/es/interface.js';
import { SidebarBody, SidebarFrame, SidebarHeader, SIDEBAR_H_PADDING_PX } from './layout.js';
import type { Color } from 'antd/es/color-picker';

// Import FormRender as a default import
import FormRenderComponent from 'form-render';

const { Text } = Typography;

// Art font effects interface
interface ArtFontEffects {
  bold: boolean;
  shadow: boolean;
  shadowColor: string;
  shadowBlur: number;
  gradient: boolean;
  gradientColors: [string, string];
  outline: boolean;
  outlineColor: string;
  outlineWidth: number;
}

const defaultEffects: ArtFontEffects = {
  bold: false,
  shadow: false,
  shadowColor: '#00000040',
  shadowBlur: 4,
  gradient: false,
  gradientColors: ['#0a0a0a', '#737373'],
  outline: false,
  outlineColor: '#000000',
  outlineWidth: 1,
};

// Props that ArtFontPanel needs from parent
type ArtFontPanelProps = Pick<SidebarProps, 'activeElements' | 'schemas' | 'changeSchemas'> & {
  onClose: () => void;
  // Additional props needed for full DetailView functionality
  size?: { width: number; height: number };
  schemasList?: SchemaForUI[][];
  pageSize?: { width: number; height: number };
  basePdf?: any;
  deselectSchema?: () => void;
  // Handler to add new art text schema
  addSchemaHandler?: (schema: any) => void;
};

const ArtFontPanel = (props: ArtFontPanelProps) => {
  const { token } = theme.useToken();
  const { 
    activeElements, 
    schemas, 
    changeSchemas, 
    onClose,
    schemasList = [],
    pageSize = { width: 210, height: 297 },
    basePdf,
    addSchemaHandler,
  } = props;
  
  const form = useForm();
  const i18n = useContext(I18nContext);
  const pluginsRegistry = useContext(PluginsRegistry);
  const options = useContext(OptionsContext);

  // Art font effects state
  const [effects, setEffects] = useState<ArtFontEffects>(defaultEffects);
  
  // Current art font state
  const [currentArtFont, setCurrentArtFont] = useState<string>('');
  
  // Art text content for direct input (when no element selected)
  const [artTextContent, setArtTextContent] = useState<string>('');

  // Get fonts from options
  const fonts = (options as any)?.font || {};
  
  // Define which fonts are considered "art fonts" (decorative/display fonts)
  // These are artistic, script, display, and headline fonts - NOT regular language fonts
  const ART_FONTS = [
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
  ];
  
  // Get list of available art fonts (intersection of ART_FONTS and system fonts)
  const fontList = useMemo(() => {
    const availableFonts = Object.keys(fonts);
    // Only show fonts that are both in ART_FONTS list AND available in system
    const artFonts = ART_FONTS.filter(font => availableFonts.includes(font));
    // If no art fonts available, fallback to first available font
    return artFonts.length > 0 ? artFonts : availableFonts.slice(0, 3);
  }, [fonts]);

  // Get active schemas (selected elements)
  const activeSchemas = useMemo(() => {
    const activeIds = activeElements.map((ae) => ae.id);
    return schemas.filter((s) => activeIds.includes(s.id));
  }, [activeElements, schemas]);

  // Get first active schema as the "active schema" for editing
  const activeSchema = activeSchemas[0] as SchemaForUI | undefined;

  // Check if any selected element is a text type (including artText)
  const textSchemas = useMemo(() => {
    return activeSchemas.filter((s) => 
      s.type === 'text' || s.type === 'multiVariableText' || s.type === 'artText'
    );
  }, [activeSchemas]);

  const hasSelectedTextElement = textSchemas.length > 0;
  
  // Get current font from first selected text element
  useEffect(() => {
    if (textSchemas.length > 0) {
      const fontName = (textSchemas[0] as any).fontName || '';
      setCurrentArtFont(fontName);
    } else {
      setCurrentArtFont('');
    }
  }, [textSchemas]);

  // Synchronize effects state with activeSchema
  useEffect(() => {
    if (activeSchema && activeSchema.type === 'artText') {
      const s = activeSchema as any;
      setEffects({
        bold: Boolean(s.artBold),
        shadow: Boolean(s.artShadow),
        shadowColor: s.artShadowColor || defaultEffects.shadowColor,
        shadowBlur: s.artShadowBlur ?? defaultEffects.shadowBlur,
        gradient: Boolean(s.artGradient),
        gradientColors: s.artGradientColors || defaultEffects.gradientColors,
        outline: Boolean(s.artOutline),
        outlineColor: s.artOutlineColor || defaultEffects.outlineColor,
        outlineWidth: s.artOutlineWidth ?? defaultEffects.outlineWidth,
      });
    } else {
      setEffects(defaultEffects);
    }
  }, [activeSchema?.id]);

  // Handle art font effects change
  const handleEffectsChange = useCallback((newEffects: Partial<ArtFontEffects>) => {
    setEffects(prev => {
      const updatedEffects = { ...prev, ...newEffects };
      
      // Apply effects to selected text elements
      if (textSchemas.length > 0) {
        const changes: { key: string; value: any; schemaId: string }[] = [];
        
        textSchemas.forEach((schema) => {
          // Bold effect
          if ('bold' in newEffects) {
            changes.push({ key: 'artBold', value: updatedEffects.bold, schemaId: schema.id });
          }
          // Shadow effect
          if ('shadow' in newEffects) {
            changes.push({ key: 'artShadow', value: updatedEffects.shadow, schemaId: schema.id });
            changes.push({ key: 'artShadowColor', value: updatedEffects.shadowColor, schemaId: schema.id });
            changes.push({ key: 'artShadowBlur', value: updatedEffects.shadowBlur, schemaId: schema.id });
          }
          // Gradient effect
          if ('gradient' in newEffects) {
            changes.push({ key: 'artGradient', value: updatedEffects.gradient, schemaId: schema.id });
            changes.push({ key: 'artGradientColors', value: updatedEffects.gradientColors, schemaId: schema.id });
          }
          // Outline effect
          if ('outline' in newEffects) {
            changes.push({ key: 'artOutline', value: updatedEffects.outline, schemaId: schema.id });
            changes.push({ key: 'artOutlineColor', value: updatedEffects.outlineColor, schemaId: schema.id });
            changes.push({ key: 'artOutlineWidth', value: updatedEffects.outlineWidth, schemaId: schema.id });
          }
        });
        
        if (changes.length > 0) {
          changeSchemas(changes);
        }
      }
      return updatedEffects;
    });
  }, [textSchemas, changeSchemas]);
  
  // Handle creating new art text element
  const handleCreateArtText = () => {
    if (!addSchemaHandler || !artTextContent.trim()) return;
    
    // Create a new artText schema with art font settings
    const newSchema = {
      type: 'artText',
      position: { x: 20, y: 20 },
      width: 100,
      height: 20,
      content: artTextContent,
      fontName: currentArtFont || fontList[0] || 'NotoSansSC',
      fontSize: 24,
      fontColor: '#0a0a0a', // Default purple
    };
    
    addSchemaHandler(newSchema);
    setArtTextContent(''); // Clear input after creating
    onClose(); // Close panel after creating
  };

  // Font Picker Component for visual selection
  const FontPicker = ({ value, onChange, options: list }: { value: string; onChange: (v: string) => void; options: string[] }) => {
    return (
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: 8, 
        maxHeight: 280, 
        overflowY: 'auto',
        paddingRight: 4,
        marginTop: 4
      }}>
        {list.map((fontName) => {
          const isSelected = value === fontName;
          return (
            <div
              key={fontName}
              onClick={() => onChange(fontName)}
              style={{
                padding: '10px 8px',
                borderRadius: 8,
                border: `2px solid ${isSelected ? '#0a0a0a' : '#f5f5f5'}`,
                background: isSelected ? '#f5f3ff' : '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                boxShadow: isSelected ? '0 4px 6px -1px rgba(139, 92, 246, 0.1)' : 'none',
              }}
            >
              <div style={{ 
                fontFamily: fontName, 
                fontSize: 16, 
                color: isSelected ? '#171717' : '#1f2937',
                lineHeight: 1.2,
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {/* Show native language preview for each font */}
                {(() => {
                  // Chinese fonts
                  if (fontName.includes('NotoSansSC') || fontName.startsWith('SiYuan') || 
                      fontName.startsWith('WenQuanYi') || fontName.startsWith('ZhanKu') || 
                      fontName.startsWith('BaoTu') || fontName.startsWith('PangMen') || 
                      fontName.startsWith('YangRenDong') || fontName.startsWith('MuYao') || 
                      fontName.startsWith('Seto') || fontName.startsWith('WangHanZong') || 
                      fontName.startsWith('RuiZi') || fontName.startsWith('LuShuai') || 
                      fontName.startsWith('ZhiYong')) return '艺术字';
                  // Traditional Chinese
                  if (fontName.includes('NotoSansTC') || fontName.includes('Taipei')) return '藝術字';
                  // Japanese
                  if (fontName.includes('NotoSansJP')) return 'アート';
                  // Korean
                  if (fontName.includes('NotoSansKR')) return '아트';
                  // Arabic
                  if (fontName.includes('Arabic')) return 'فن';
                  // Thai
                  if (fontName.includes('Thai') || fontName === 'Kanit') return 'ศิลปะ';
                  // Hindi/Devanagari
                  if (fontName.includes('Devanagari') || fontName === 'Mukta') return 'कला';
                  // Bengali
                  if (fontName.includes('Bengali')) return 'শিল্প';
                  // Tamil
                  if (fontName.includes('Tamil')) return 'கலை';
                  // Hebrew
                  if (fontName.includes('Hebrew')) return 'אמנות';
                  // Default English
                  return 'Art';
                })()}
              </div>
              <div style={{ 
                fontSize: 10, 
                color: isSelected ? '#0a0a0a' : '#9ca3af',
                textAlign: 'center',
                fontWeight: 500
              }}>
                {fontName}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Define a type-safe i18n function that accepts string keys
  const typedI18n = useCallback(
    (key: string): string => {
      return typeof i18n === 'function' ? i18n(key as keyof Dict) : key;
    },
    [i18n],
  );

  const [widgets, setWidgets] = useState<{
    [key: string]: (props: PropPanelWidgetProps) => React.JSX.Element;
  }>({});

  useEffect(() => {
    if (!activeSchema) return;
    
    const newWidgets: typeof widgets = {
      AlignWidget: (p) => <AlignWidget {...p} {...props} activeSchema={activeSchema} options={options} />,
      Divider: () => (
        <Divider style={{ marginTop: token.marginXS, marginBottom: token.marginXS }} />
      ),
      ButtonGroup: (p) => <ButtonGroupWidget {...p} {...props} activeSchema={activeSchema} options={options} />,
      HeadingWidget: (p) => <HeadingWidget {...p} {...props} activeSchema={activeSchema} options={options} />,
      // Art effects widget with bold, shadow, gradient, outline buttons
      ArtEffects: () => (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: 4, 
          marginBottom: 8 
        }}>
          {[
            { id: 'bold', label: 'Bold', icon: Bold, active: effects.bold },
            { id: 'shadow', label: 'Shadow', icon: Layers, active: effects.shadow },
            { id: 'gradient', label: 'Gradient', icon: Palette, active: effects.gradient },
            { id: 'outline', label: 'Outline', icon: PenTool, active: effects.outline }
          ].map((effect) => {
            const Icon = effect.icon;
            return (
              <Button
                key={effect.id}
                size="middle"
                type={effect.active ? 'primary' : 'default'}
                onClick={() => handleEffectsChange({ [effect.id]: !effect.active })}
                icon={<Icon size={16} />}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 'auto',
                  minHeight: 56,
                  padding: '4px 2px',
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: effect.active ? 600 : 400,
                  transition: 'all 0.2s ease',
                  background: effect.active ? '#0a0a0a' : '#fff',
                  borderColor: effect.active ? '#0a0a0a' : '#e5e7eb',
                  boxShadow: effect.active ? '0 4px 12px rgba(139, 92, 246, 0.25)' : 'none',
                }}
              >
                {effect.label}
              </Button>
            );
          })}
        </div>
      ),
      FontPicker: (p) => (
        <FontPicker 
          value={p.value} 
          onChange={(v) => p.onChange(v)} 
          options={fontList} 
        />
      ),
    };
    for (const plugin of pluginsRegistry.values()) {
      const pluginWidgets = plugin.propPanel.widgets || {};
      Object.entries(pluginWidgets).forEach(([widgetKey, widgetValue]) => {
        newWidgets[widgetKey] = (p) => (
          <WidgetRenderer
            {...p}
            {...props}
            activeSchema={activeSchema}
            options={options}
            theme={token}
            i18n={typedI18n}
            widget={widgetValue}
          />
        );
      });
    }
    setWidgets(newWidgets);
  }, [activeSchema, pluginsRegistry, JSON.stringify(options), effects, handleEffectsChange]);

  useEffect(() => {
    if (activeSchema) {
      form.resetFields();
    }
  }, [activeSchema?.id]);

  useEffect(() => {
    if (!activeSchema) return;
    // Create a type-safe copy of the schema with editable property
    const values: Record<string, unknown> = { ...activeSchema };
    const readOnly = typeof values.readOnly === 'boolean' ? values.readOnly : false;
    values.editable = !readOnly;
    form.setValues(values);
  }, [activeSchema]);

  // Reference to a function that validates schema name uniqueness
  const uniqueSchemaName = useRef(
    (_unused: string): boolean => true,
  );

  useEffect(() => {
    if (!activeSchema) return;
    uniqueSchemaName.current = (value: string): boolean => {
      for (const page of schemasList) {
        for (const s of Object.values(page)) {
          if (s.name === value && s.id !== activeSchema.id) {
            return false;
          }
        }
      }
      return true;
    };
  }, [schemasList, activeSchema]);

  const validateUniqueSchemaName = (_: unknown, value: string): boolean =>
    uniqueSchemaName.current(value);

  // Calculate padding values once
  const [paddingTop, paddingRight, paddingBottom, paddingLeft] = basePdf && isBlankPdf(basePdf)
    ? basePdf.padding
    : [0, 0, 0, 0];

  // Cross-field validation
  const validatePosition = (_: unknown, value: number, fieldName: string): boolean => {
    const formValues = form.getValues() as Record<string, unknown>;
    const position = formValues.position as { x: number; y: number } | undefined;
    const width = formValues.width as number | undefined;
    const height = formValues.height as number | undefined;

    if (!position || width === undefined || height === undefined) return true;

    if (fieldName === 'x') {
      if (value < paddingLeft || value > pageSize.width - paddingRight) return true;
      if (width > 0 && value + width > pageSize.width - paddingRight) return false;
    } else if (fieldName === 'y') {
      if (value < paddingTop || value > pageSize.height - paddingBottom) return true;
      if (height > 0 && value + height > pageSize.height - paddingBottom) return false;
    } else if (fieldName === 'width') {
      if (position.x < paddingLeft || position.x > pageSize.width - paddingRight) return true;
      if (value > 0 && position.x + value > pageSize.width - paddingRight) return false;
    } else if (fieldName === 'height') {
      if (position.y < paddingTop || position.y > pageSize.height - paddingBottom) return true;
      if (value > 0 && position.y + value > pageSize.height - paddingBottom) return false;
    }

    return true;
  };

  // Handle form changes
  const handleWatch = debounce(function (...args: unknown[]) {
    if (!activeSchema) return;
    
    const formSchema = args[0] as Record<string, unknown>;
    const formAndSchemaValuesDiffer = (formValue: unknown, schemaValue: unknown): boolean => {
      if (typeof formValue === 'object' && formValue !== null) {
        return JSON.stringify(formValue) !== JSON.stringify(schemaValue);
      }
      return formValue !== schemaValue;
    };

    let changes: ChangeSchemaItem[] = [];
    for (const key in formSchema) {
      if (['id', 'content'].includes(key)) continue;

      let value = formSchema[key];
      if (formAndSchemaValuesDiffer(value, (activeSchema as Record<string, unknown>)[key])) {
        if (value === null && ['rotate', 'opacity'].includes(key)) {
          value = undefined;
        }

        if (key === 'editable') {
          const readOnlyValue = !value;
          changes.push({ key: 'readOnly', value: readOnlyValue, schemaId: activeSchema.id });
          if (readOnlyValue) {
            changes.push({ key: 'required', value: false, schemaId: activeSchema.id });
          }
          continue;
        }

        changes.push({ key, value, schemaId: activeSchema.id });
      }
    }

    if (changes.length) {
      form
        .validateFields()
        .then(() => changeSchemas(changes))
        .catch((reason: ValidateErrorEntity) => {
          if (reason.errorFields.length) {
            changes = changes.filter(
              (change: ChangeSchemaItem) =>
                !reason.errorFields.find((field: { name: InternalNamePath; errors: string[] }) =>
                  field.name.includes(change.key),
                ),
            );
          }
          if (changes.length) {
            changeSchemas(changes);
          }
        });
    }
  }, 100);

  // Build the form schema (similar to DetailView)
  const buildPropPanelSchema = (): PropPanelSchema | null => {
    if (!activeSchema) return null;

    const activePlugin = pluginsRegistry.findByType(activeSchema.type);
    if (!activePlugin) return null;

    const activePropPanelSchema = activePlugin.propPanel.schema;
    const typeOptions: Array<{ label: string; value: string | undefined }> = [];

    pluginsRegistry.entries().forEach(([label, plugin]) => {
      typeOptions.push({ label, value: plugin.propPanel.defaultSchema?.type ?? undefined });
    });

    const emptySchema: Record<string, unknown> = {};
    const defaultSchema: Record<string, unknown> = activePlugin?.propPanel?.defaultSchema
      ? (() => {
          const result: Record<string, unknown> = {};
          for (const key in activePlugin.propPanel.defaultSchema) {
            if (Object.prototype.hasOwnProperty.call(activePlugin.propPanel.defaultSchema, key)) {
              result[key] = (activePlugin.propPanel.defaultSchema as Record<string, unknown>)[key];
            }
          }
          return result;
        })()
      : emptySchema;

    const maxWidth = pageSize.width - paddingLeft - paddingRight;
    const maxHeight = pageSize.height - paddingTop - paddingBottom;

    const propPanelSchema: PropPanelSchema = {
      type: 'object',
      column: 2,
      properties: {
        type: {
          title: typedI18n('type'),
          type: 'string',
          widget: 'select',
          props: { options: [{ label: 'artText', value: 'artText' }] },
          required: true,
          span: 12,
          readOnly: true,
        },
        name: {
          title: typedI18n('fieldName'),
          type: 'string',
          required: true,
          span: 12,
          rules: [
            {
              validator: validateUniqueSchemaName,
              message: typedI18n('validation.uniqueName'),
            },
          ],
          props: { autoComplete: 'off' },
        },
        editable: {
          title: typedI18n('editable'),
          type: 'boolean',
          span: 8,
          hidden: typeof defaultSchema.readOnly !== 'undefined',
        },
        required: {
          title: typedI18n('required'),
          type: 'boolean',
          span: 16,
          hidden: '{{!formData.editable}}',
        },
        '-': { type: 'void', widget: 'Divider' },
        geometry: {
          title: 'Geometry',
          type: 'object',
          widget: 'Card',
          span: 24,
          properties: {
            align: { title: typedI18n('align'), type: 'void', widget: 'AlignWidget', span: 24 },
            x: {
              title: 'X',
              type: 'number',
              widget: 'inputNumber',
              required: true,
              span: 12,
              min: paddingLeft,
              max: pageSize.width - paddingRight,
              rules: [
                {
                  validator: (_: unknown, value: number) => validatePosition(_, value, 'x'),
                  message: typedI18n('validation.outOfBounds'),
                },
              ],
              bind: 'position.x',
            },
            y: {
              title: 'Y',
              type: 'number',
              widget: 'inputNumber',
              required: true,
              span: 12,
              min: paddingTop,
              max: pageSize.height - paddingBottom,
              rules: [
                {
                  validator: (_: unknown, value: number) => validatePosition(_, value, 'y'),
                  message: typedI18n('validation.outOfBounds'),
                },
              ],
              bind: 'position.y',
            },
            width: {
              title: typedI18n('width'),
              type: 'number',
              widget: 'inputNumber',
              required: true,
              span: 12,
              props: { min: 0, max: maxWidth },
              rules: [
                {
                  validator: (_: unknown, value: number) => validatePosition(_, value, 'width'),
                  message: typedI18n('validation.outOfBounds'),
                },
              ],
            },
            height: {
              title: typedI18n('height'),
              type: 'number',
              widget: 'inputNumber',
              required: true,
              span: 12,
              props: { min: 0, max: maxHeight },
              rules: [
                {
                  validator: (_: unknown, value: number) => validatePosition(_, value, 'height'),
                  message: typedI18n('validation.outOfBounds'),
                },
              ],
            },
            rotate: {
              title: typedI18n('rotate'),
              type: 'number',
              widget: 'inputNumber',
              disabled: typeof defaultSchema.rotate === 'undefined',
              max: 360,
              props: { min: 0 },
              span: 12,
            },
            opacity: {
              title: typedI18n('opacity'),
              type: 'number',
              widget: 'inputNumber',
              disabled: typeof defaultSchema.opacity === 'undefined',
              props: { step: 0.1, min: 0, max: 1 },
              span: 12,
            },
          },
        },
      },
    };

    // Create a safe copy of the properties
    const safeProperties = { ...propPanelSchema.properties };

    if (typeof activePropPanelSchema === 'function') {
      const propPanelProps = {
        size: props.size,
        schemas,
        pageSize,
        changeSchemas,
        activeElements,
        deselectSchema: props.deselectSchema,
        activeSchema,
      };

      const functionResult = activePropPanelSchema({
        ...propPanelProps,
        options,
        theme: token,
        i18n: typedI18n,
      });

      const apps = functionResult && typeof functionResult === 'object' ? functionResult : {};
      const dividerObj =
        Object.keys(apps).length === 0 ? {} : { '--': { type: 'void', widget: 'Divider' } };

      propPanelSchema.properties = {
        ...safeProperties,
        ...(dividerObj as Record<string, Partial<Schema>>),
        ...(apps as Record<string, Partial<Schema>>),
      };
    } else {
      const apps =
        activePropPanelSchema && typeof activePropPanelSchema === 'object'
          ? activePropPanelSchema
          : {};
      const dividerObj =
        Object.keys(apps).length === 0 ? {} : { '--': { type: 'void', widget: 'Divider' } };

      propPanelSchema.properties = {
        ...safeProperties,
        ...(dividerObj as Record<string, Partial<Schema>>),
        ...(apps as Record<string, Partial<Schema>>),
      };
    }

    // Override fontName to use visual FontPicker
    if (propPanelSchema.properties && (propPanelSchema.properties as any).fontName) {
      const existingFontName = (propPanelSchema.properties as any).fontName;
      (propPanelSchema.properties as any).fontName = {
        ...existingFontName,
        title: 'Select Art Font',
        widget: 'FontPicker',
        span: 24,
      };
    }

    // Add art font effects button group after formatter (Format section)
    // These are custom art text effects: bold, shadow, gradient, outline
    (propPanelSchema.properties as any).artEffects = {
      title: 'Art Effects',
      widget: 'ArtEffects',
      span: 24,
    };

    return propPanelSchema;
  };

  const propPanelSchema = buildPropPanelSchema();

  // Effect Row Component for art font effects
  const EffectRow = ({ 
    icon: Icon, 
    label, 
    enabled, 
    onToggle, 
    children 
  }: { 
    icon: React.ElementType; 
    label: string; 
    enabled: boolean; 
    onToggle: (v: boolean) => void;
    children?: React.ReactNode;
  }) => (
    <div style={{ 
      marginBottom: 16, 
      padding: 12, 
      background: enabled ? '#f5f3ff' : '#f9fafb', 
      borderRadius: 8,
      border: enabled ? '1px solid #c4b5fd' : '1px solid #e5e7eb'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon size={16} style={{ color: enabled ? '#0a0a0a' : '#9ca3af' }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: enabled ? '#171717' : '#374151' }}>
            {label}
          </span>
        </div>
        <Switch 
          size="small" 
          checked={enabled} 
          onChange={onToggle}
          disabled={!hasSelectedTextElement}
        />
      </div>
      {enabled && children && (
        <div style={{ marginTop: 12 }}>{children}</div>
      )}
    </div>
  );

  return (
    <SidebarFrame className={DESIGNER_CLASSNAME + 'art-font-panel'}>
      <SidebarHeader>
        <Button
          className={DESIGNER_CLASSNAME + 'back-button'}
          style={{
            position: 'absolute',
            left: SIDEBAR_H_PADDING_PX,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'translateY(-50%)',
            top: '50%',
            paddingTop: '3px',
          }}
          onClick={onClose}
          icon={<Menu strokeWidth={1.5} size={20} />}
        />
        <Text strong style={{ textAlign: 'center', width: '100%' }}>
          Art Font Effects
        </Text>
        <Button
          className={DESIGNER_CLASSNAME + 'next-button'}
          style={{
            position: 'absolute',
            right: SIDEBAR_H_PADDING_PX,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'translateY(-50%)',
            top: '50%',
            paddingTop: '3px',
          }}
          onClick={onClose}
          icon={<ArrowRight strokeWidth={1.5} size={20} />}
        />
      </SidebarHeader>
      <SidebarBody>
        {/* Direct art text input when no element is selected */}
        {!hasSelectedTextElement && (
          <>
            {/* Art Text Content Input */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>输入艺术字内容</div>
              <Input.TextArea
                value={artTextContent}
                onChange={(e) => setArtTextContent(e.target.value)}
                placeholder="在此输入艺术字内容..."
                rows={3}
                style={{ marginBottom: 12 }}
              />
            </div>

            {/* Art Font Selection */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 12 }}>选择艺术字体</div>
              <FontPicker
                value={currentArtFont}
                onChange={setCurrentArtFont}
                options={fontList}
              />
            </div>

            {/* Premium Art Effects Buttons */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 12 }}>快速效果</div>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: 8 
              }}>
                {[
                  { id: 'bold', label: '加粗', icon: Bold, active: effects.bold },
                  { id: 'shadow', label: '阴影', icon: Layers, active: effects.shadow },
                  { id: 'gradient', label: '渐变', icon: Palette, active: effects.gradient },
                  { id: 'outline', label: '描边', icon: PenTool, active: effects.outline }
                ].map((effect) => {
                  const Icon = effect.icon;
                  return (
                    <Button
                      key={effect.id}
                      size="middle"
                      type={effect.active ? 'primary' : 'default'}
                      onClick={() => handleEffectsChange({ [effect.id]: !effect.active })}
                      icon={<Icon size={16} />}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: 38,
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: effect.active ? 600 : 400,
                        transition: 'all 0.2s ease',
                        background: effect.active ? '#0a0a0a' : '#fff',
                        borderColor: effect.active ? '#0a0a0a' : '#e5e7eb',
                        boxShadow: effect.active ? '0 4px 12px rgba(139, 92, 246, 0.25)' : 'none',
                      }}
                    >
                      {effect.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Preview */}
            <Divider style={{ margin: '16px 0' }}>预览</Divider>
            <div style={{ 
              padding: 20, 
              background: '#f8f7ff', 
              borderRadius: 8,
              textAlign: 'center',
              minHeight: 60,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16
            }}>
              <span style={{ 
                fontSize: 24,
                fontWeight: effects.bold ? 700 : 400,
                fontFamily: currentArtFont || 'inherit',
                color: '#374151',
              }}>
                {artTextContent || '艺术字预览'}
              </span>
            </div>

            {/* Create Button */}
            <Button
              type="primary"
              block
              size="large"
              onClick={handleCreateArtText}
              disabled={!artTextContent.trim() || !addSchemaHandler}
              style={{
                background: '#0a0a0a',
                borderColor: '#0a0a0a',
                height: 44,
                borderRadius: 8,
                fontWeight: 500
              }}
            >
              创建艺术字
            </Button>
          </>
        )}

        {/* DetailView-style form fields when element is selected */}
        {propPanelSchema && hasSelectedTextElement && (
          <>
            {/* Heading Level Quick Select - Premium Pill Design */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ 
                fontSize: 11, 
                color: '#0a0a0a', 
                marginBottom: 10, 
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                <span style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  background: 'linear-gradient(135deg, #0a0a0a 0%, #404040 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  color: '#fff',
                  fontWeight: 700
                }}>H</span>
                Text Level
              </div>
              <div style={{ 
                display: 'flex', 
                gap: 0,
                background: 'linear-gradient(135deg, #f8fafc 0%, #fafafa 100%)',
                borderRadius: 12,
                padding: 4,
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), inset 0 1px 2px rgba(255, 255, 255, 0.8)'
              }}>
                {(['h1', 'h2', 'h3', 'body', 'small'] as const).map((level, index, arr) => {
                  const config: Record<string, { label: string; size: number; weight: 'bold' | 'normal'; fontSize: number }> = {
                    h1: { label: 'H1', size: 36, weight: 'bold', fontSize: 14 },
                    h2: { label: 'H2', size: 24, weight: 'bold', fontSize: 13 },
                    h3: { label: 'H3', size: 18, weight: 'bold', fontSize: 12 },
                    body: { label: 'Body', size: 12, weight: 'normal', fontSize: 11 },
                    small: { label: 'Small', size: 10, weight: 'normal', fontSize: 10 },
                  };
                  const { label, size, weight, fontSize: labelFontSize } = config[level];
                  const isActive = (activeSchema as any)?.fontSize === size;
                  const isHeading = ['h1', 'h2', 'h3'].includes(level);
                  
                  return (
                    <button
                      key={level}
                      style={{
                        flex: 1,
                        height: 36,
                        borderRadius: 8,
                        fontWeight: isActive ? 700 : isHeading ? 600 : 500,
                        fontSize: labelFontSize,
                        background: isActive 
                          ? 'linear-gradient(135deg, #0a0a0a 0%, #171717 100%)' 
                          : 'transparent',
                        border: 'none',
                        color: isActive ? '#fff' : isHeading ? '#4b5563' : '#6b7280',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative',
                        boxShadow: isActive 
                          ? '0 4px 12px rgba(139, 92, 246, 0.35), 0 2px 4px rgba(139, 92, 246, 0.2)' 
                          : 'none',
                        transform: isActive ? 'scale(1.02)' : 'scale(1)',
                        zIndex: isActive ? 2 : 1,
                        letterSpacing: isHeading ? '0.5px' : 'normal',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'rgba(139, 92, 246, 0.08)';
                          e.currentTarget.style.color = '#171717';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = isHeading ? '#4b5563' : '#6b7280';
                        }
                      }}
                      onClick={() => {
                        if (activeSchema) {
                          changeSchemas([
                            { key: 'fontSize', value: size, schemaId: activeSchema.id },
                            { key: 'artBold', value: weight === 'bold', schemaId: activeSchema.id },
                          ]);
                        }
                      }}
                    >
                      {label}
                      {/* Active indicator dot */}
                      {isActive && (
                        <span style={{
                          position: 'absolute',
                          bottom: 4,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 4,
                          height: 4,
                          borderRadius: '50%',
                          background: 'rgba(255, 255, 255, 0.8)',
                        }} />
                      )}
                    </button>
                  );
                })}
              </div>
              {/* Size indicator */}
              <div style={{
                marginTop: 8,
                fontSize: 10,
                color: '#9ca3af',
                textAlign: 'center',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 4
              }}>
                <span style={{ 
                  width: 6, 
                  height: 6, 
                  borderRadius: 2, 
                  background: '#0a0a0a',
                  opacity: 0.6
                }} />
                {(() => {
                  const currentSize = (activeSchema as any)?.fontSize;
                  const sizeLabels: Record<number, string> = {
                    36: 'H1 · 36pt',
                    24: 'H2 · 24pt', 
                    18: 'H3 · 18pt',
                    12: 'Body · 12pt',
                    10: 'Small · 10pt'
                  };
                  return sizeLabels[currentSize] || `${currentSize}pt`;
                })()}
              </div>
            </div>
            <FormRenderComponent
              form={form}
              schema={propPanelSchema}
              widgets={widgets}
              watch={{ '#': handleWatch }}
              locale="zh-CN"
            />
          </>
        )}
      </SidebarBody>
    </SidebarFrame>
  );
};

export default ArtFontPanel;
export { defaultEffects };
export type { ArtFontEffects };
