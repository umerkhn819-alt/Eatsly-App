import { useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as aiApi from "../api/aiApi";
import * as recipesApi from "../api/recipesApi";
import type { AiSuggestion, RecipePublic } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { getRecipeImage, seedRecipes } from "../data/seedRecipes";
import type { HomeMainScreenProps } from "../navigation/types";
import { spacing } from "../theme/spacing";
import { useTheme } from "../theme/ThemeContext";

const QUICK_PICKS = [
  { label: "High Protein", icon: "barbell-outline" as const },
  { label: "Quick", icon: "flash-outline" as const },
  { label: "Spicy", icon: "flame-outline" as const },
  { label: "Healthy", icon: "leaf-outline" as const },
  { label: "Budget", icon: "cash-outline" as const },
];

const MOODS = [
  { emoji: "😴", label: "Comfort" },
  { emoji: "💪", label: "High Energy" },
  { emoji: "🌿", label: "Light" },
  { emoji: "🔥", label: "Spicy" },
  { emoji: "🍫", label: "Indulgent" },
  { emoji: "⚡", label: "5-Minute" },
];

const CUISINES = [
  { emoji: "🍕", label: "Italian" },
  { emoji: "🍜", label: "Asian" },
  { emoji: "🌮", label: "Mexican" },
  { emoji: "🍛", label: "Indian" },
  { emoji: "🥩", label: "American" },
  { emoji: "🥗", label: "Med" },
];

const TIPS = [
  { emoji: "🧂", tip: "Salt pasta water like the sea" },
  { emoji: "🔪", tip: "Rest meat 5 min before cutting" },
  { emoji: "🧄", tip: "Crush garlic to release more flavour" },
  { emoji: "🥚", tip: "Room-temp eggs beat better" },
  { emoji: "🍳", tip: "Preheat pan before adding oil" },
  { emoji: "🌿", tip: "Add fresh herbs at the very end" },
];

const MAX_UPLOAD_BASE64 = 3_700_000;
const RESIZE_STEPS = [1280, 1024, 900, 768, 640] as const;
const COMPRESS_STEPS = [0.55, 0.45, 0.35, 0.25] as const;

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function mergeHomeFeed(discover: RecipePublic[], catalog: RecipePublic[]): RecipePublic[] {
  const seen = new Set<string>();
  const out: RecipePublic[] = [];
  for (const r of discover) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(r);
  }
  for (const r of catalog) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(r);
  }
  return out;
}

export function HomeScreen({ navigation }: HomeMainScreenProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [catalogRecipes, setCatalogRecipes] = useState<RecipePublic[]>(seedRecipes);
  const [discoverRecipes, setDiscoverRecipes] = useState<RecipePublic[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [aiResults, setAiResults] = useState<AiSuggestion[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [scannerBusy, setScannerBusy] = useState(false);
  const scannerAnim = useRef(new Animated.Value(0)).current;
  const parentNav = navigation.getParent();

  useEffect(() => {
    let cancelled = false;
    setDiscoverLoading(true);
    void aiApi
      .fetchRandomSpoonacularRecipes(12)
      .then((list) => {
        if (!cancelled) {
          setDiscoverRecipes(list);
          setDiscoverLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDiscoverRecipes([]);
          setDiscoverLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void recipesApi
        .listRecipes({ mine: false, limit: 10, offset: 0 })
        .then((r) => {
          if (!cancelled) {
            setCatalogRecipes(r.recipes.length > 0 ? r.recipes : seedRecipes);
          }
        })
        .catch(() => {
          if (!cancelled) setCatalogRecipes(seedRecipes);
        });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scannerAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(scannerAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ]),
    ).start();
  }, [scannerAnim]);

  const firstName = (user?.email?.split("@")[0] ?? "there").replace(/\d+/g, "");

  const handleGenerate = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setAiLoading(true);
    setAiResults([]);
    try {
      const res = await aiApi.fetchRecommendations({ userNotes: q, wantCount: 3 });
      setAiResults(res.suggestions);
    } catch {
      setAiResults([]);
    } finally {
      setAiLoading(false);
    }
  }, [searchQuery]);

  const handleQuickPick = useCallback(
    (label: string) => {
      if (parentNav) parentNav.navigate("Search", { query: label });
    },
    [parentNav],
  );

  const optimizeAssetForUpload = useCallback(async (
    asset: ImagePicker.ImagePickerAsset,
  ): Promise<{ base64: string; mimeType: string }> => {
    const width = asset.width ?? 1280;
    const height = asset.height ?? 1280;
    const longest = Math.max(width, height);

    for (const targetMax of RESIZE_STEPS) {
      const scale = longest > targetMax ? targetMax / longest : 1;
      const nextW = Math.max(320, Math.round(width * scale));
      const nextH = Math.max(320, Math.round(height * scale));
      for (const quality of COMPRESS_STEPS) {
        const out = await manipulateAsync(
          asset.uri,
          [{ resize: { width: nextW, height: nextH } }],
          {
            compress: quality,
            format: SaveFormat.JPEG,
            base64: true,
          },
        );
        if (out.base64 && out.base64.length <= MAX_UPLOAD_BASE64) {
          return { base64: out.base64, mimeType: "image/jpeg" };
        }
      }
    }
    throw new Error("Image is too large. Try a closer or less detailed photo.");
  }, []);

  const runPhotoRecipeScan = useCallback(async (source: "camera" | "library") => {
    try {
      setScannerBusy(true);
      let base64: string | undefined;
      let mimeType = "image/jpeg";
      let picked: ImagePicker.ImagePickerAsset | null = null;

      if (source === "camera") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          throw new Error("Camera permission is required.");
        }
        const shot = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          quality: 0.6,
          base64: true,
        });
        if (shot.canceled) return;
        picked = shot.assets[0];
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          throw new Error("Photo library permission is required.");
        }
        const pick = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.6,
          base64: true,
          allowsMultipleSelection: false,
        });
        if (pick.canceled) return;
        picked = pick.assets[0];
      }

      if (!picked) {
        throw new Error("No image selected. Please try again.");
      }

      const optimized = await optimizeAssetForUpload(picked);
      base64 = optimized.base64;
      mimeType = optimized.mimeType;

      if (!base64 || base64.length === 0) {
        throw new Error("Could not read image data. Please try another photo.");
      }

      const result = await aiApi.fetchPhotoRecipe({ imageBase64: base64, mimeType });
      navigation.navigate("RecipeDetail", { recipeId: result.recipe.id });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not scan photo right now.";
      Alert.alert("Scan failed", msg);
    } finally {
      setScannerBusy(false);
    }
  }, [navigation, optimizeAssetForUpload]);

  const handleScannerPress = useCallback(() => {
    if (scannerBusy) return;
    Alert.alert("Snap a food photo", "Choose image source", [
      { text: "Camera", onPress: () => { void runPhotoRecipeScan("camera"); } },
      { text: "Gallery", onPress: () => { void runPhotoRecipeScan("library"); } },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [runPhotoRecipeScan, scannerBusy]);

  const bg = colors.background;
  const surface = colors.surface;
  const primary = colors.primary;
  const text = colors.text;
  const muted = colors.textMuted;
  const border = colors.border;

  const homeRecipes = useMemo(
    () => mergeHomeFeed(discoverRecipes, catalogRecipes),
    [discoverRecipes, catalogRecipes],
  );

  // top-pick mini cards (4 from the recipe list, skip index 0 to vary from trending)
  const topPicks = homeRecipes.slice(0, 4);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={["top", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.greeting, { color: muted }]}>
              {getGreeting()}, {firstName} 👋
            </Text>
            <Text style={[styles.heroLine1, { color: text }]}>What are you</Text>
            <Text style={[styles.heroLine2, { color: primary }]}>craving?</Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate("Cart")}
            style={[styles.iconBtn, { backgroundColor: surface, borderColor: border }]}
          >
            <Ionicons name="cart-outline" size={20} color={text} />
          </Pressable>
        </View>

        {/* ── Search bar ── */}
        <View style={[styles.searchRow, { backgroundColor: surface, borderColor: border }]}>
          <Ionicons name="search-outline" size={18} color={muted} />
          <TextInput
            value={searchQuery}
            onChangeText={(t) => { setSearchQuery(t); if (!t) setAiResults([]); }}
            placeholder="e.g. High-protein chicken bowl..."
            placeholderTextColor={muted}
            style={[styles.searchInput, { color: text }]}
            returnKeyType="search"
            onSubmitEditing={() => void handleGenerate()}
          />
          <Pressable
            onPress={() => void handleGenerate()}
            style={[styles.generateBtn, { backgroundColor: primary }]}
            disabled={aiLoading || !searchQuery.trim()}
          >
            {aiLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="sparkles" size={12} color="#fff" />
                <Text style={styles.generateLabel}>Generate</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* ── AI inline results ── */}
        {aiResults.length > 0 && (
          <View style={styles.aiResultsBlock}>
            <Text style={[styles.sectionLabel, { color: muted }]}>AI PICKS FOR YOU</Text>
            {aiResults.map((s, i) => (
              <Pressable
                key={`${s.title}-${i}`}
                style={[styles.aiResultCard, { backgroundColor: surface, borderColor: border }]}
                onPress={() => {
                  if (typeof s.spoonacularId === "number") {
                    navigation.navigate("RecipeDetail", {
                      recipeId: `spoonacular:${s.spoonacularId}`,
                    });
                    return;
                  }
                  parentNav?.navigate("Search", { query: s.title });
                }}
              >
                <View style={[styles.aiResultIcon, { backgroundColor: primary + "22" }]}>
                  <Ionicons name="sparkles" size={14} color={primary} />
                </View>
                <View style={styles.aiResultText}>
                  <Text style={[styles.aiResultTitle, { color: text }]}>{s.title}</Text>
                  <Text style={[styles.aiResultReason, { color: muted }]} numberOfLines={1}>{s.reason}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={muted} />
              </Pressable>
            ))}
          </View>
        )}

        {/* ── Quick Picks ── */}
        <Text style={[styles.sectionLabel, { color: muted }]}>QUICK PICK</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll} contentContainerStyle={styles.quickRow}>
          {QUICK_PICKS.map((pick) => (
            <Pressable
              key={pick.label}
              onPress={() => handleQuickPick(pick.label)}
              style={[styles.quickChip, { backgroundColor: surface, borderColor: border }]}
            >
              <View style={[styles.quickIcon, { backgroundColor: primary + "22" }]}>
                <Ionicons name={pick.icon} size={18} color={primary} />
              </View>
              <Text style={[styles.quickLabel, { color: text }]}>{pick.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── Mood pills ── */}
        <Text style={[styles.sectionLabel, { color: muted }]}>I'M IN THE MOOD FOR</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.moodScroll} contentContainerStyle={styles.moodRow}>
          {MOODS.map((m) => (
            <Pressable
              key={m.label}
              onPress={() => parentNav?.navigate("Search", { query: m.label })}
              style={[styles.moodPill, { backgroundColor: surface, borderColor: border }]}
            >
              <Text style={styles.moodEmoji}>{m.emoji}</Text>
              <Text style={[styles.moodLabel, { color: text }]}>{m.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── AI Scanner banner ── */}
        <Pressable
          style={[styles.scannerCard, { backgroundColor: surface, borderColor: border }]}
          onPress={handleScannerPress}
        >
          <View style={styles.scannerLeft}>
            <Text style={[styles.scannerTag, { color: primary }]}>✦ AI SCANNER</Text>
            <Text style={[styles.scannerTitle, { color: text }]}>
              Snap a food photo,{"\n"}get the recipe instantly
            </Text>
            {scannerBusy ? (
              <View style={styles.scannerBusyRow}>
                <ActivityIndicator color={primary} size="small" />
                <Text style={[styles.scannerCta, { color: primary }]}>Scanning...</Text>
              </View>
            ) : (
              <Text style={[styles.scannerCta, { color: primary }]}>Try it now →</Text>
            )}
          </View>
          <Animated.View
            style={[
              styles.scannerImageWrap,
              { opacity: scannerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
            ]}
          >
            <Image
              source={{ uri: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400" }}
              style={styles.scannerImage}
              resizeMode="cover"
            />
            <View style={[styles.scannerOverlay, { backgroundColor: primary + "33" }]} />
          </Animated.View>
        </Pressable>

        {/* ── Trending Now ── */}
        <View style={styles.rowHeader}>
          <Ionicons name="flame" size={13} color={primary} />
          <Text style={[styles.sectionLabel, { color: muted, marginTop: 0, marginBottom: 0 }]}>  TRENDING NOW</Text>
          {discoverLoading && <ActivityIndicator size="small" color={primary} style={{ marginLeft: 8 }} />}
          <Pressable onPress={() => navigation.navigate("RecipesList")} style={styles.seeAllBtn}>
            <Text style={[styles.seeAllText, { color: primary }]}>See all</Text>
          </Pressable>
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={homeRecipes}
          keyExtractor={(r) => r.id}
          style={styles.trendList}
          contentContainerStyle={styles.trendingRow}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.trendCard, { backgroundColor: surface, borderColor: border }]}
              onPress={() => navigation.navigate("RecipeDetail", { recipeId: item.id })}
            >
              <Image source={{ uri: getRecipeImage(item) }} style={styles.trendImage} resizeMode="cover" />
              <View style={styles.trendFavBtn}>
                <Ionicons name="heart-outline" size={13} color="#fff" />
              </View>
              <View style={styles.trendBottom}>
                <Text style={[styles.trendTitle, { color: text }]} numberOfLines={2}>{item.title}</Text>
                <Text style={[styles.trendMeta, { color: muted }]}>
                  {(item.prepMinutes ?? 0) + (item.cookMinutes ?? 0) > 0
                    ? `⏱ ${(item.prepMinutes ?? 0) + (item.cookMinutes ?? 0)} min`
                    : "Quick meal"}
                </Text>
              </View>
            </Pressable>
          )}
        />

        {/* ── Top Picks (compact 2-col grid) ── */}
        <View style={styles.rowHeader}>
          <Ionicons name="star" size={13} color={primary} />
          <Text style={[styles.sectionLabel, { color: muted, marginTop: 0, marginBottom: 0 }]}>  TOP PICKS</Text>
        </View>
        <View style={styles.picksGrid}>
          {topPicks.map((item) => (
            <Pressable
              key={`pick-${item.id}`}
              style={[styles.pickCard, { backgroundColor: surface, borderColor: border }]}
              onPress={() => navigation.navigate("RecipeDetail", { recipeId: item.id })}
            >
              <Image source={{ uri: getRecipeImage(item) }} style={styles.pickImage} resizeMode="cover" />
              <View style={styles.pickBody}>
                <Text style={[styles.pickTitle, { color: text }]} numberOfLines={2}>{item.title}</Text>
                <View style={styles.pickMeta}>
                  {item.tags.slice(0, 1).map((t) => (
                    <View key={t} style={[styles.pickTag, { backgroundColor: primary + "18" }]}>
                      <Text style={[styles.pickTagText, { color: primary }]}>{t}</Text>
                    </View>
                  ))}
                  <Text style={[styles.pickTime, { color: muted }]}>
                    ⏱{(item.prepMinutes ?? 0) + (item.cookMinutes ?? 0)}m
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        {/* ── Explore Cuisines ── */}
        <Text style={[styles.sectionLabel, { color: muted }]}>EXPLORE CUISINES</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cuisineScroll} contentContainerStyle={styles.cuisineRow}>
          {CUISINES.map((c) => (
            <Pressable
              key={c.label}
              onPress={() => parentNav?.navigate("Search", { query: c.label })}
              style={[styles.cuisineChip, { backgroundColor: surface, borderColor: border }]}
            >
              <Text style={styles.cuisineEmoji}>{c.emoji}</Text>
              <Text style={[styles.cuisineLabel, { color: text }]}>{c.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── Daily Tips ── */}
        <Text style={[styles.sectionLabel, { color: muted }]}>CHEF'S TIPS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tipsScroll} contentContainerStyle={styles.tipsRow}>
          {TIPS.map((t) => (
            <View
              key={t.tip}
              style={[styles.tipChip, { backgroundColor: surface, borderColor: border }]}
            >
              <Text style={styles.tipEmoji}>{t.emoji}</Text>
              <Text style={[styles.tipText, { color: text }]} numberOfLines={2}>{t.tip}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 16 },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerLeft: { flex: 1 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  greeting: { fontSize: 13, fontWeight: "500", marginBottom: 4 },
  heroLine1: { fontSize: 28, fontWeight: "800", lineHeight: 34 },
  heroLine2: { fontSize: 28, fontWeight: "800", lineHeight: 34 },

  // Search
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 6,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 6 },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  generateLabel: { color: "#fff", fontSize: 12, fontWeight: "700" },

  // AI results
  aiResultsBlock: { marginHorizontal: spacing.lg, marginTop: spacing.sm, gap: 8 },
  aiResultCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
  },
  aiResultIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  aiResultText: { flex: 1 },
  aiResultTitle: { fontSize: 13, fontWeight: "700" },
  aiResultReason: { fontSize: 11, marginTop: 1 },

  // Section labels
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },

  // Quick picks
  quickScroll: { height: 100 },
  quickRow: { paddingHorizontal: spacing.lg, gap: spacing.sm, alignItems: "flex-start" },
  quickChip: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing.sm,
    gap: 6,
    width: 88,
    height: 88,
    flexShrink: 0,
  },
  quickIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontSize: 11, fontWeight: "600", textAlign: "center" },

  // Mood pills
  moodScroll: { height: 50 },
  moodRow: { paddingHorizontal: spacing.lg, gap: 8 },
  moodPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  moodEmoji: { fontSize: 16 },
  moodLabel: { fontSize: 13, fontWeight: "600" },

  // Scanner
  scannerCard: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    height: 120,
  },
  scannerLeft: { flex: 1, padding: spacing.md, gap: 4, justifyContent: "center" },
  scannerTag: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  scannerTitle: { fontSize: 15, fontWeight: "800", lineHeight: 22 },
  scannerCta: { fontSize: 13, fontWeight: "700", marginTop: 4 },
  scannerBusyRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  scannerImageWrap: { width: 130, height: 120 },
  scannerImage: { width: 130, height: 120 },
  scannerOverlay: { ...StyleSheet.absoluteFillObject },

  // Row header with icon
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  seeAllBtn: { marginLeft: "auto" },
  seeAllText: { fontSize: 12, fontWeight: "700" },

  // Trending
  trendList: { height: 195 },
  trendingRow: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  trendCard: { width: 160, borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  trendImage: { width: "100%", height: 105 },
  trendFavBtn: {
    position: "absolute",
    top: 7,
    right: 7,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 14,
    padding: 5,
  },
  trendBottom: { padding: 10, gap: 3 },
  trendTitle: { fontSize: 12, fontWeight: "700", lineHeight: 16 },
  trendMeta: { fontSize: 11 },

  // Top picks 2-col grid
  picksGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  pickCard: {
    width: "48%",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  pickImage: { width: "100%", height: 90 },
  pickBody: { padding: 9, gap: 5 },
  pickTitle: { fontSize: 12, fontWeight: "700", lineHeight: 16 },
  pickMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  pickTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  pickTagText: { fontSize: 10, fontWeight: "700" },
  pickTime: { fontSize: 11, fontWeight: "500", marginLeft: "auto" },

  // Explore cuisines
  cuisineScroll: { height: 82 },
  cuisineRow: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  cuisineChip: {
    alignItems: "center",
    justifyContent: "center",
    width: 66,
    height: 66,
    borderRadius: 14,
    borderWidth: 1,
    gap: 5,
  },
  cuisineEmoji: { fontSize: 24 },
  cuisineLabel: { fontSize: 10, fontWeight: "700" },

  // Tips
  tipsScroll: { height: 74 },
  tipsRow: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  tipChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: 200,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tipEmoji: { fontSize: 20 },
  tipText: { flex: 1, fontSize: 12, fontWeight: "600", lineHeight: 17 },
});
