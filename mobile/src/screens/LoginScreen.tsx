import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { getErrorMessage, useAuth } from "../auth/AuthContext";
import { AppButton } from "../components/AppButton";
import { AppTextField } from "../components/AppTextField";
import { AuthScreenLayout } from "../components/AuthScreenLayout";
import { FormErrorText } from "../components/FormErrorText";
import type { RootStackParamList } from "../navigation/types";
import { spacing } from "../theme/spacing";
import { useTheme } from "../theme/ThemeContext";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.length > 0 && !submitting;
  }, [email, password, submitting]);

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthScreenLayout
      headline="Sign in"
      subline="Your recipes, AI ideas, and shopping list—together in one place."
      footer={
        <>
          <Text style={[styles.footerMuted, { color: colors.textMuted }]}>New to Tastie?</Text>
          <Pressable accessibilityRole="button" onPress={() => navigation.navigate("Register")} hitSlop={10}>
            <Text style={[styles.link, { color: colors.primary }]}>Create account</Text>
          </Pressable>
        </>
      }
    >
      <FormErrorText message={error} />

      <View style={styles.form}>
        <AppTextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="username"
        />
        <AppTextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
          autoComplete="password"
        />
      </View>

      <AppButton title="Sign in" onPress={onSubmit} disabled={!canSubmit} loading={submitting} />
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.sm,
  },
  footerMuted: {
    fontSize: 14,
  },
  link: {
    fontSize: 14,
    fontWeight: "700",
  },
});
