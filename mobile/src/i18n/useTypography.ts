import type { TextStyle } from 'react-native';

import { useLanguage } from './useLanguage';

function fontWeightLevel(weight: TextStyle['fontWeight']): 400 | 500 | 600 | 700 {
  if (weight === 'bold') {
    return 700;
  }

  const numericWeight = Number(weight ?? 400);
  if (numericWeight >= 700) {
    return 700;
  }
  if (numericWeight >= 600) {
    return 600;
  }
  if (numericWeight >= 500) {
    return 500;
  }
  return 400;
}

export function useTypography() {
  const { isRTL } = useLanguage();

  return {
    isRTL,
    lineHeightMultiplier: isRTL ? 1.55 : 1.35,
    fontFamilyForWeight(weight?: TextStyle['fontWeight']): string {
      const level = fontWeightLevel(weight);
      if (isRTL) {
        return {
          400: 'Cairo_400Regular',
          500: 'Cairo_500Medium',
          600: 'Cairo_600SemiBold',
          700: 'Cairo_700Bold',
        }[level];
      }
      return {
        400: 'Poppins_400Regular',
        500: 'Poppins_500Medium',
        600: 'Poppins_600SemiBold',
        700: 'Poppins_700Bold',
      }[level];
    },
  };
}
