import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { KindeAuthProvider } from "@kinde/expo";

import { useColorScheme } from "@/hooks/use-color-scheme";

export const unstable_settings = {
  anchor: "(tabs)",
};
const domain = process.env.EXPO_PUBLIC_KINDE_DOMAIN!;
const clientId = process.env.EXPO_PUBLIC_KINDE_CLIENT_ID!;

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <KindeAuthProvider
        config={{
          domain: domain, // e.g https://mybusiness.kinde.com
          clientId: clientId,
        }}
        // All callbacks are optional
        callbacks={{
          onSuccess: async (token, state, context) => {},
          onError: (error) => {},
          onEvent: async (event, state, context) => {},
        }}
      >
        {/* Your app components go here */}
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="modal"
            options={{ presentation: "modal", title: "Modal" }}
          />
        </Stack>
        <StatusBar style="auto" />
      </KindeAuthProvider>
    </ThemeProvider>
  );
}
