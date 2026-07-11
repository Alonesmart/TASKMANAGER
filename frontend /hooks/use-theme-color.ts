/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useAppTheme } from '@/theme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const { isDark } = useAppTheme();
  const themeName = isDark ? 'dark' : 'light';
  const colorFromProps = props[themeName];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[themeName][colorName];
  }
}
