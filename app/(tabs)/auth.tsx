import React, { useCallback } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { useKindeAuth } from "@kinde/expo";
import { getUserProfile } from "@kinde/expo/utils";

import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

export default function AuthScreen() {
  const { login, register, logout, isAuthenticated } = useKindeAuth();

  const handleSignIn = useCallback(async () => {
    try {
      const token = await login();
      if (token.success) {
        const profile = await getUserProfile();
        console.log("[Auth] login token", token);
        console.log("[Auth] user profile after login", profile);

        if (!profile) {
          Alert.alert(
            "Signed in (profile missing)",
            "Login succeeded but user profile is null – possible write/read race.",
          );
        } else {
          Alert.alert(
            "Signed in",
            `You are now authenticated as ${profile.email ?? "unknown email"}.`,
          );
        }
      } else {
        Alert.alert("Sign in failed", token.errorMessage);
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Sign in failed", (error as Error).message);
    }
  }, [login]);

  const handleSignUp = useCallback(async () => {
    try {
      const token = await register();
      if (token.success) {
        const profile = await getUserProfile();
        console.log("[Auth] register token", token);
        console.log("[Auth] user profile after register", profile);

        if (!profile) {
          Alert.alert(
            "Signed up (profile missing)",
            "Sign up succeeded but user profile is null – possible write/read race.",
          );
        } else {
          Alert.alert(
            "Signed up",
            `Account created for ${profile.email ?? "unknown email"} and you are signed in.`,
          );
        }
      } else {
        Alert.alert("Sign up failed", token.errorMessage);
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Sign up failed", (error as Error).message);
    }
  }, [register]);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
      headerImage={<></>}
    >
      <ThemedView style={styles.container}>
        <ThemedText type="title">Authentication</ThemedText>
        <ThemedText type="default">
          Use the buttons below to sign in or sign up with Kinde.
        </ThemedText>

        <View style={styles.buttonRow}>
          <PrimaryButton label="Sign in" onPress={handleSignIn} />
          <PrimaryButton label="Sign up" onPress={handleSignUp} />
          <PrimaryButton
            label="Logout"
            onPress={async () => {
              try {
                await logout({ revokeToken: true });
                Alert.alert("Logged out", "Your session has been cleared.");
              } catch (error) {
                console.error(error);
                Alert.alert("Logout failed", (error as Error).message);
              }
            }}
          />
        </View>

        <ThemedText type="defaultSemiBold" style={styles.status}>
          Status: {isAuthenticated ? "Authenticated" : "Not authenticated"}
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
};

function PrimaryButton({ label, onPress }: PrimaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      <ThemedText type="defaultSemiBold" style={styles.buttonLabel}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 16,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#208AEF",
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonLabel: {
    color: "#FFFFFF",
  },
  status: {
    marginTop: 24,
  },
});
