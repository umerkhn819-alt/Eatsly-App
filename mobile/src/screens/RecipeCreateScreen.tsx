import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiError } from "../api/http";
import * as recipesApi from "../api/recipesApi";
import { AppButton } from "../components/AppButton";
import { FormErrorText } from "../components/FormErrorText";
import type { RecipesStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

type Props = NativeStackScreenProps<RecipesStackParamList, "RecipeCreate">;

function parseIngredients(raw: string): Array<{ name: string; amount?: string }> {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [name, amount] = line.split("|").map((s) => s.trim());
      return amount ? { name, amount } : { name };
    });
}

function parseSteps(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function RecipeCreateScreen({ navigation }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ingredientsRaw, setIngredientsRaw] = useState("");
  const [stepsRaw, setStepsRaw] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () =>
      title.trim().length > 0 &&
      ingredientsRaw.trim().length > 0 &&
      stepsRaw.trim().length > 0 &&
      !busy,
    [busy, ingredientsRaw, stepsRaw, title],
  );

  async function onSave() {
    setBusy(true);
    setError(null);
    try {
      const recipe = await recipesApi.createRecipe({
        title: title.trim(),
        description: description.trim(),
        ingredients: parseIngredients(ingredientsRaw),
        steps: parseSteps(stepsRaw),
        tags: tagsRaw
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter((t) => t.length > 0),
      });
      navigation.replace("RecipeDetail", { recipeId: recipe.id });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to create recipe");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <FormErrorText message={error} />
          <Field label="Title">
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Recipe title"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </Field>
          <Field label="Description (optional)">
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Short description"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.multiline]}
              multiline
            />
          </Field>
          <Field label="Ingredients (one per line, optional amount with `|`)">
            <TextInput
              value={ingredientsRaw}
              onChangeText={setIngredientsRaw}
              placeholder={"Eggs|2\nSalt|1 tsp"}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.multilineLarge]}
              multiline
            />
          </Field>
          <Field label="Steps (one per line)">
            <TextInput
              value={stepsRaw}
              onChangeText={setStepsRaw}
              placeholder={"Whisk eggs\nCook in pan"}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.multilineLarge]}
              multiline
            />
          </Field>
          <Field label="Tags (comma separated)">
            <TextInput
              value={tagsRaw}
              onChangeText={setTagsRaw}
              placeholder="quick, breakfast"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </Field>

          <AppButton title="Create recipe" onPress={onSave} loading={busy} disabled={!canSubmit} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  field: { gap: spacing.xs },
  label: { color: colors.text, fontSize: 14, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
  },
  multiline: { minHeight: 90, textAlignVertical: "top" },
  multilineLarge: { minHeight: 130, textAlignVertical: "top" },
});
