import { Text, StyleSheet, type TextProps } from 'react-native';

import { useTypography } from '@/i18n/useTypography';

export function LocalizedText({ style, ...props }: TextProps) {
  const typography = useTypography();
  const flattenedStyle = StyleSheet.flatten(style) ?? {};
  const fontSize = flattenedStyle.fontSize ?? 16;
  const lineHeight = flattenedStyle.lineHeight
    ? Math.ceil(flattenedStyle.lineHeight * (typography.isRTL ? 1.15 : 1))
    : Math.ceil(fontSize * typography.lineHeightMultiplier);

  return (
    <Text
      {...props}
      style={[
        style,
        {
          fontFamily: typography.fontFamilyForWeight(flattenedStyle.fontWeight),
          lineHeight,
          textAlign: flattenedStyle.textAlign ?? 'auto',
        },
      ]}
    />
  );
}
