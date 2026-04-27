import React, { useCallback, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiError } from "../api/http";
import * as aiApi from "../api/aiApi";
import type { AiSuggestion } from "../api/types";
import { AppButton } from "../components/AppButton";
import { Chip } from "../components/Chip";
import { EmptyState } from "../components/EmptyState";
import { FormErrorText } from "../components/FormErrorText";
import { SectionHeader } from "../components/SectionHeader";
import type { AiHubScreenProps } from "../navigation/types";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

type ChatTurn = { id: string; role: "user" | "assistant"; content: string };

function id(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function AiHubScreen(_props: AiHubScreenProps) {
  const [mode, setMode] = useState<"recommend" | "chat">("recommend");
  const [notes, setNotes] = useState("");
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [catalogSize, setCatalogSize] = useState<number | null>(null);
  const [modelLabel, setModelLabel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [chatDraft, setChatDraft] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatTurn[]>([]);
  const [chatHistory, setChatHistory] = useState<string[]>([]);
  const [chatBusy, setChatBusy] = useState(false);
  const quickPrompts = [
    "High protein dinner under 20 minutes",
    "Budget meal prep for 3 days",
    "Healthy snack ideas with eggs and oats",
    "Dinner using rice, chicken, and spinach",
  ];

  const runRecommendations = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await aiApi.fetchRecommendations({
        userNotes: notes.trim(),
        wantCount: 5,
      });
      setSuggestions(res.suggestions);
      setModelLabel(res.model);
      setCatalogSize(res.catalogSampleSize);
    } catch (e) {
      setSuggestions([]);
      setError(e instanceof ApiError ? e.message : "Recommendations failed");
    } finally {
      setBusy(false);
    }
  }, [notes]);

  const sendChat = useCallback(async () => {
    const text = chatDraft.trim();
    if (text.length === 0 || chatBusy) {
      return;
    }
    const userMsg: ChatTurn = { id: id(), role: "user", content: text };
    const thread = [...chatMessages, userMsg].map(({ role, content }) => ({
      role,
      content,
    }));

    setChatDraft("");
    setChatMessages((m) => [...m, userMsg]);
    setChatHistory((h) => [text, ...h].slice(0, 8));
    setChatBusy(true);
    setError(null);

    try {
      const { message, model } = await aiApi.sendChatMessage({ messages: thread });
      setModelLabel(model);
      setChatMessages((m) => [
        ...m,
        { id: id(), role: "assistant", content: message },
      ]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Chat failed");
    } finally {
      setChatBusy(false);
    }
  }, [chatBusy, chatDraft, chatMessages]);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
      <View style={styles.segment}>
        <Pressable
          accessibilityRole="tab"
          onPress={() => setMode("recommend")}
          style={[styles.segBtn, mode === "recommend" && styles.segBtnOn]}
        >
          <Text style={[styles.segTxt, mode === "recommend" && styles.segTxtOn]}>
            Recommend
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          onPress={() => setMode("chat")}
          style={[styles.segBtn, mode === "chat" && styles.segBtnOn]}
        >
          <Text style={[styles.segTxt, mode === "chat" && styles.segTxtOn]}>
            Chat
          </Text>
        </Pressable>
      </View>

      <FormErrorText message={error} />

      {modelLabel ? (
        <Text style={styles.modelHint}>Model: {modelLabel}</Text>
      ) : null}

      {mode === "recommend" ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.pad}
        >
          <SectionHeader title="AI Recommendations" subtitle="Prompt shortcuts + grounded suggestions" />
          <Text style={[styles.lead, { color: colors.textMuted }]}>
            Describe what you feel like eating, dietary notes, or ingredients you
            have. We send your catalog titles to the model for grounded ideas.
          </Text>
          <View style={styles.chips}>
            {quickPrompts.map((prompt) => (
              <Chip key={prompt} label={prompt} onPress={() => setNotes(prompt)} />
            ))}
          </View>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. High protein, 30 minutes, I have chicken and rice…"
            placeholderTextColor={colors.textMuted}
            multiline
            style={styles.notes}
          />
          <AppButton title="Get suggestions" onPress={runRecommendations} loading={busy} />
          {catalogSize != null ? (
            <Text style={styles.meta}>Catalog titles sent: {catalogSize}</Text>
          ) : null}
          {suggestions.map((s, i) => (
            <View key={`${s.title}-${i}`} style={styles.card}>
              <Text style={styles.cardTitle}>{s.title}</Text>
              {s.matchesCatalogRecipeTitle ? (
                <Text style={styles.match}>
                  Matches catalog: {s.matchesCatalogRecipeTitle}
                </Text>
              ) : null}
              <Text style={styles.reason}>{s.reason}</Text>
            </View>
          ))}
          {!busy && suggestions.length === 0 ? (
            <EmptyState
              icon="sparkles"
              title="No suggestions yet"
              body="Use a quick prompt or describe your available ingredients."
            />
          ) : null}
        </ScrollView>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={88}
        >
          <FlatList
            data={chatMessages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.chatList}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.bubbleWrap,
                  item.role === "user" ? styles.bubbleUser : styles.bubbleAi,
                ]}
              >
                <Text style={styles.bubbleRole}>
                  {item.role === "user" ? "You" : "TasteAI"}
                </Text>
                <Text style={styles.bubbleText}>{item.content}</Text>
              </View>
            )}
            ListEmptyComponent={
              <Text style={[styles.lead, { color: colors.textMuted }]}>
                Ask cooking questions. Replies use your TasteAI assistant policy on
                the server.
              </Text>
            }
          />
          {chatHistory.length > 0 ? (
            <View style={[styles.historyWrap, { borderTopColor: colors.border }]}>
              <Text style={[styles.historyTitle, { color: colors.textMuted }]}>Recent prompts</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyRow}>
                {chatHistory.map((h) => (
                  <Chip key={h} label={h} onPress={() => setChatDraft(h)} />
                ))}
              </ScrollView>
            </View>
          ) : null}
          <View style={styles.chatInputRow}>
            <TextInput
              value={chatDraft}
              onChangeText={setChatDraft}
              placeholder="Message…"
              placeholderTextColor={colors.textMuted}
              style={styles.chatInput}
              editable={!chatBusy}
            />
            <AppButton
              title="Send"
              onPress={sendChat}
              loading={chatBusy}
              disabled={chatDraft.trim().length === 0 || chatBusy}
              style={styles.sendBtn}
            />
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  segment: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  segBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  segBtnOn: {
    backgroundColor: colors.primary,
  },
  segTxt: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textMuted,
  },
  segTxtOn: {
    color: "#FFFFFF",
  },
  modelHint: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xs,
    fontSize: 12,
    color: colors.textMuted,
  },
  pad: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  lead: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
  notes: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
    textAlignVertical: "top",
  },
  meta: {
    fontSize: 13,
    color: colors.textMuted,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
  },
  match: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  reason: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  flex: {
    flex: 1,
  },
  chatList: {
    padding: spacing.lg,
    gap: spacing.md,
    flexGrow: 1,
  },
  bubbleWrap: {
    maxWidth: "92%",
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleUser: {
    alignSelf: "flex-end",
    backgroundColor: "#FFF7ED",
  },
  bubbleAi: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
  },
  bubbleRole: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  bubbleText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
  },
  chatInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  chatInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  sendBtn: {
    minWidth: 96,
  },
  historyWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  historyTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  historyRow: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
});
