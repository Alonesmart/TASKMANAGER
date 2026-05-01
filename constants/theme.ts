/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/) or [unistyles](https://reactnativeunistyles.vercel.app).
 */

import { Platform } from 'react-native';

const tintColorLight = '#1d6ef5';
const tintColorDark = '#3d8ef8';

export const Colors = {
  light: {
    text: '#111827',
    background: '#f4f7fb',
    tint: tintColorLight,
    icon: '#526173',
    tabIconDefault: '#8a97a8',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#e6edf3',
    background: '#0d1117',
    tint: tintColorDark,
    icon: '#7d8590',
    tabIconDefault: '#64748b',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
