import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet } from 'react-native';
import { getThemeName, setThemeName } from './storage/keychain';

export type Palette = {
  bg: string;
  bgElevated: string;
  bgInput: string;
  bgTab: string;
  border: string;
  borderStrong: string;
  borderSelected: string;
  text: string;
  textSubtle: string;
  textMuted: string;
  textDim: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  accentSecondary: string;
  accentSecondarySoft: string;
  accentTertiary: string;
  accentTertiarySoft: string;
  danger: string;
  dangerSoft: string;
  success: string;
  successSoft: string;
  recording: string;
  overlay: string;
  overlayStrong: string;
  glass: string;
};

export type ThemeName =
  | 'daylight'
  | 'meadow'
  | 'midnight'
  | 'field'
  | 'bubblegum'
  | 'confetti';

export type Theme = {
  id: ThemeName;
  label: string;
  description: string;
  isLight: boolean;
  colors: Palette;
};

const midnight: Palette = {
  bg: '#120a26',
  bgElevated: '#251a45',
  bgInput: '#332560',
  bgTab: '#170d2e',
  border: '#3a2c66',
  borderStrong: '#5a4793',
  borderSelected: '#ff5d8f',
  text: '#fef3e8',
  textSubtle: '#e2d8ec',
  textMuted: '#a99cc7',
  textDim: '#7a6e94',
  accent: '#ff5d8f',
  accentSoft: 'rgba(255, 93, 143, 0.18)',
  accentText: '#1b0832',
  accentSecondary: '#bef264',
  accentSecondarySoft: 'rgba(190, 242, 100, 0.18)',
  accentTertiary: '#5eead4',
  accentTertiarySoft: 'rgba(94, 234, 212, 0.18)',
  danger: '#fb7185',
  dangerSoft: 'rgba(251, 113, 133, 0.18)',
  success: '#bef264',
  successSoft: 'rgba(190, 242, 100, 0.18)',
  recording: '#fb7185',
  overlay: 'rgba(18, 10, 38, 0.78)',
  overlayStrong: 'rgba(18, 10, 38, 0.92)',
  glass: 'rgba(254, 243, 232, 0.06)',
};

const confetti: Palette = {
  bg: '#0e1a36',
  bgElevated: '#1d2c54',
  bgInput: '#2a3c6f',
  bgTab: '#131f3f',
  border: '#3a4a7c',
  borderStrong: '#5b6da3',
  borderSelected: '#22d3ee',
  text: '#fffbeb',
  textSubtle: '#fef3c7',
  textMuted: '#a3a8c9',
  textDim: '#6c7396',
  accent: '#22d3ee',
  accentSoft: 'rgba(34, 211, 238, 0.18)',
  accentText: '#0a1226',
  accentSecondary: '#f472b6',
  accentSecondarySoft: 'rgba(244, 114, 182, 0.18)',
  accentTertiary: '#facc15',
  accentTertiarySoft: 'rgba(250, 204, 21, 0.18)',
  danger: '#fb7185',
  dangerSoft: 'rgba(251, 113, 133, 0.18)',
  success: '#a3e635',
  successSoft: 'rgba(163, 230, 53, 0.18)',
  recording: '#fb7185',
  overlay: 'rgba(14, 26, 54, 0.78)',
  overlayStrong: 'rgba(14, 26, 54, 0.92)',
  glass: 'rgba(255, 251, 235, 0.06)',
};

const field: Palette = {
  bg: '#06181c',
  bgElevated: '#0d2a30',
  bgInput: '#13373e',
  bgTab: '#08191d',
  border: '#1c4750',
  borderStrong: '#2f6b75',
  borderSelected: '#84cc16',
  text: '#f0fdf4',
  textSubtle: '#bbf7d0',
  textMuted: '#86b8a3',
  textDim: '#4d7561',
  accent: '#84cc16',
  accentSoft: 'rgba(132, 204, 22, 0.18)',
  accentText: '#06140a',
  accentSecondary: '#fbbf24',
  accentSecondarySoft: 'rgba(251, 191, 36, 0.18)',
  accentTertiary: '#22d3ee',
  accentTertiarySoft: 'rgba(34, 211, 238, 0.18)',
  danger: '#f87171',
  dangerSoft: 'rgba(248, 113, 113, 0.18)',
  success: '#a3e635',
  successSoft: 'rgba(163, 230, 53, 0.18)',
  recording: '#f87171',
  overlay: 'rgba(6, 24, 28, 0.78)',
  overlayStrong: 'rgba(6, 24, 28, 0.92)',
  glass: 'rgba(240, 253, 244, 0.06)',
};

const bubblegum: Palette = {
  bg: '#1c0d22',
  bgElevated: '#321840',
  bgInput: '#3f1f4f',
  bgTab: '#220f29',
  border: '#522a66',
  borderStrong: '#75428f',
  borderSelected: '#f0abfc',
  text: '#fdf4ff',
  textSubtle: '#fae8ff',
  textMuted: '#bca0c8',
  textDim: '#7d6385',
  accent: '#f0abfc',
  accentSoft: 'rgba(240, 171, 252, 0.18)',
  accentText: '#1c0d22',
  accentSecondary: '#67e8f9',
  accentSecondarySoft: 'rgba(103, 232, 249, 0.18)',
  accentTertiary: '#fde047',
  accentTertiarySoft: 'rgba(253, 224, 71, 0.18)',
  danger: '#fb7185',
  dangerSoft: 'rgba(251, 113, 133, 0.18)',
  success: '#86efac',
  successSoft: 'rgba(134, 239, 172, 0.18)',
  recording: '#fb7185',
  overlay: 'rgba(28, 13, 34, 0.78)',
  overlayStrong: 'rgba(28, 13, 34, 0.92)',
  glass: 'rgba(253, 244, 255, 0.06)',
};

const daylight: Palette = {
  bg: '#f8fafc',
  bgElevated: '#ffffff',
  bgInput: '#eef2f7',
  bgTab: '#f1f5f9',
  border: '#dbe3ec',
  borderStrong: '#94a3b8',
  borderSelected: '#2563eb',
  text: '#0f172a',
  textSubtle: '#1e293b',
  textMuted: '#475569',
  textDim: '#64748b',
  accent: '#2563eb',
  accentSoft: 'rgba(37, 99, 235, 0.12)',
  accentText: '#ffffff',
  accentSecondary: '#16a34a',
  accentSecondarySoft: 'rgba(22, 163, 74, 0.12)',
  accentTertiary: '#0891b2',
  accentTertiarySoft: 'rgba(8, 145, 178, 0.12)',
  danger: '#dc2626',
  dangerSoft: 'rgba(220, 38, 38, 0.1)',
  success: '#16a34a',
  successSoft: 'rgba(22, 163, 74, 0.12)',
  recording: '#dc2626',
  // Camera UI overlays stay dark for legibility on top of the live feed.
  overlay: 'rgba(15, 23, 42, 0.78)',
  overlayStrong: 'rgba(15, 23, 42, 0.92)',
  glass: 'rgba(15, 23, 42, 0.06)',
};

const meadow: Palette = {
  bg: '#fefdf6',
  bgElevated: '#ffffff',
  bgInput: '#fef9e0',
  bgTab: '#fef7d4',
  border: '#f1e9c0',
  borderStrong: '#d4c79f',
  borderSelected: '#16a34a',
  text: '#1c1f0e',
  textSubtle: '#2e2f17',
  textMuted: '#5b5c3a',
  textDim: '#85866a',
  accent: '#16a34a',
  accentSoft: 'rgba(22, 163, 74, 0.12)',
  accentText: '#ffffff',
  accentSecondary: '#ca8a04',
  accentSecondarySoft: 'rgba(202, 138, 4, 0.12)',
  accentTertiary: '#0891b2',
  accentTertiarySoft: 'rgba(8, 145, 178, 0.12)',
  danger: '#dc2626',
  dangerSoft: 'rgba(220, 38, 38, 0.1)',
  success: '#15803d',
  successSoft: 'rgba(21, 128, 61, 0.12)',
  recording: '#dc2626',
  // Camera UI overlays stay dark for legibility.
  overlay: 'rgba(28, 25, 23, 0.78)',
  overlayStrong: 'rgba(28, 25, 23, 0.92)',
  glass: 'rgba(28, 25, 23, 0.06)',
};

export const themes: Record<ThemeName, Theme> = {
  daylight: {
    id: 'daylight',
    label: 'Daylight',
    description: 'Cool light mode with cobalt blue accent',
    isLight: true,
    colors: daylight,
  },
  meadow: {
    id: 'meadow',
    label: 'Meadow',
    description: 'Warm cream light mode with grass-green accent',
    isLight: true,
    colors: meadow,
  },
  midnight: {
    id: 'midnight',
    label: 'Midnight',
    description: 'Deep purple with hot coral accent',
    isLight: false,
    colors: midnight,
  },
  field: {
    id: 'field',
    label: 'Field',
    description: 'Deep teal with grass-green accent',
    isLight: false,
    colors: field,
  },
  bubblegum: {
    id: 'bubblegum',
    label: 'Bubblegum',
    description: 'Plum base with candy-pink and cyan',
    isLight: false,
    colors: bubblegum,
  },
  confetti: {
    id: 'confetti',
    label: 'Confetti',
    description: 'Cyan, magenta and yellow on a navy base',
    isLight: false,
    colors: confetti,
  },
};

export const DEFAULT_THEME: ThemeName = 'daylight';

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  display: 34,
  hero: 44,
} as const;

export function makeShadow(palette: Palette) {
  return {
    card: {
      shadowColor: '#000',
      shadowOpacity: 0.45,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 5,
    },
    pill: {
      shadowColor: palette.accent,
      shadowOpacity: 0.45,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
  } as const;
}

type ThemeContextValue = {
  theme: Theme;
  themeName: ThemeName;
  setTheme: (name: ThemeName) => Promise<void>;
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeNameLocal] = useState<ThemeName>(DEFAULT_THEME);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stored = await getThemeName();
        if (active && stored && stored in themes) {
          setThemeNameLocal(stored as ThemeName);
        }
      } catch {
        // fall back to default
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const setTheme = useCallback(async (name: ThemeName) => {
    setThemeNameLocal(name);
    try {
      await setThemeName(name);
    } catch {
      // ignore — non-critical
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: themes[themeName],
      themeName,
      setTheme,
      ready,
    }),
    [themeName, setTheme, ready]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be called inside <ThemeProvider>');
  }
  return ctx;
}

export function useColors(): Palette {
  return useTheme().theme.colors;
}

export function useThemedStyles<T>(factory: (palette: Palette) => T): T {
  const colors = useColors();
  return useMemo(() => factory(colors), [colors, factory]);
}

export function useShadow() {
  const colors = useColors();
  return useMemo(() => makeShadow(colors), [colors]);
}

// Default static export for any non-component code that just wants the
// default palette (e.g. early-boot utilities). Live theming requires hooks.
export const colors = daylight;
export const shadow = makeShadow(daylight);
