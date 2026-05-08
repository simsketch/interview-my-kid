import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DB_NAME, migrate } from '../src/db/schema';
import { ThemeProvider, useColors, useTheme } from '../src/theme';
import 'react-native-gesture-handler';
import 'react-native-reanimated';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ThemedRoot />
    </ThemeProvider>
  );
}

function ThemedRoot() {
  const colors = useColors();
  const { theme } = useTheme();
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <SQLiteProvider databaseName={DB_NAME} onInit={migrate}>
          <StatusBar style={theme.isLight ? 'dark' : 'light'} />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.text,
              headerTitleStyle: { color: colors.text, fontWeight: '700' },
              contentStyle: { backgroundColor: colors.bg },
              headerShadowVisible: false,
              headerBackButtonDisplayMode: 'minimal',
              headerBackTitle: '',
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="new/setup"
              options={{ title: 'New Interview' }}
            />
            <Stack.Screen name="new/edit" options={{ title: 'Edit Cards' }} />
            <Stack.Screen
              name="new/record"
              options={{
                headerShown: false,
                gestureEnabled: false,
                animation: 'fade',
              }}
            />
            <Stack.Screen name="session/[id]" options={{ title: 'Session' }} />
          </Stack>
        </SQLiteProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
