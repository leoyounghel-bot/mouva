import type { ThemeConfig } from 'antd';

// Ultra Minimal Design - Cool Monochrome Palette
// Matching official website: blacks, whites, grays
export const defaultTheme: ThemeConfig = {
  token: {
    // Primary color - light purple (Notion-style)
    colorPrimary: '#8B5CF6',
    colorPrimaryHover: '#7C3AED',
    colorPrimaryActive: '#6D28D9',
    
    // Background colors - neutral grays
    colorBgLayout: '#f5f5f5',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgSpotlight: '#fafafa',
    
    // Border colors
    colorBorder: '#e5e5e5',
    colorBorderSecondary: '#f0f0f0',
    
    // Text colors
    colorText: '#0a0a0a',
    colorTextSecondary: '#737373',
    colorTextTertiary: '#a3a3a3',
    colorTextQuaternary: '#d4d4d4',
    
    // Typography
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 14,
    
    // Radius - subtle
    borderRadius: 6,
    
    // Shadows - minimal
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
    boxShadowSecondary: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
  },
  components: {
    Tooltip: {
      colorBgSpotlight: '#262626',
      colorTextLightSolid: '#ffffff',
      fontSize: 12,
      borderRadius: 6,
    },
    Form: {
      fontSize: 12,
      margin: 8,
      marginLG: 12,
      marginXS: 4,
      padding: 8,
      paddingLG: 12,
      paddingXS: 4,
      itemMarginBottom: 4,
      verticalLabelPadding: '0 0 2px',
    },
    Button: {
      borderRadius: 6,
      controlHeight: 36,
      fontWeight: 500,
    },
    Input: {
      borderRadius: 6,
    },
    Select: {
      borderRadius: 6,
    },
  },
};
