import { useWindowDimensions } from 'react-native';
import { space } from './theme';

/**
 * Screen-size buckets used across the app: small phones (320–359 dp), regular phones,
 * and wide screens (tablets or a phone in landscape), where content is centred instead of stretched.
 */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const compact = width < 360;
  const wide = width >= 700;
  const gutter = compact ? space.md : space.lg;
  return {
    width,
    height,
    compact,
    wide,
    gutter,
    /** Two cards per row on phones, four on wide screens. */
    tileBasis: (wide ? '23%' : '47%') as `${number}%`,
    /** Lists show two columns side by side on wide screens. */
    listColumns: wide ? 2 : 1,
    /** Keeps reading width sane on tablets. */
    content: { width: '100%', maxWidth: wide ? 900 : undefined, alignSelf: 'center' } as const,
    narrowContent: { width: '100%', maxWidth: wide ? 720 : undefined, alignSelf: 'center' } as const,
  };
}
