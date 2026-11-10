import React, { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  decodeProgress,
  freshProgress,
  level,
  Progress,
  record,
} from "./src/progress";
import { MotionProvider, Touch, FadeIn } from "./src/components/Visuals";
import { ui, palette } from "./src/components/ui";
import { lessons } from "./src/curriculum";
import { Boundary } from "./src/components/Boundary";
import { ProgressPanel } from "./src/components/ProgressPanel";
import { reviewQueue } from "./src/review";
import { useSimulatorSession } from "./src/useSimulatorSession";
import { Simulator } from "./src/components/Simulator";
import { Opponents } from "./src/components/Opponents";
import { postflop } from "./src/postflop";
import { DecisionDrill } from "./src/components/DecisionDrill";
import { Preflop } from "./src/components/Preflop";
import { Curriculum } from "./src/components/Curriculum";
import { drills } from "./src/math";
const KEY = "poker-academy.progress.v1";
function Academy() {
  const tableSession = useSimulatorSession();
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [lessonFocused, setLessonFocused] = useState(false);
  const resetLessonScroll = useCallback(
    () => scroll.current?.scrollTo({ y: 0, animated: false }),
    [],
  );
  const [tab, setTab] = useState("Learn");
  const [progress, setProgress] = useState<Progress>(freshProgress);
  const [reviewSet, setReviewSet] = useState(drills);
  const [reviewKey, setReviewKey] = useState(0);
  const [mode, setMode] = useState("Math");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const writes = useRef(Promise.resolve());
  const drill = drills[index];
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [tab, lessonFocused]);
  function answer(choice: number) {
    if (!ready || selected !== null) return;
    setSelected(choice);
    const next = record(progress, drill.topic, choice === drill.answer);
    save(next);
  }
  function save(next: Progress) {
    setProgress(next);
    setReady(true);
    writes.current = writes.current
      .catch(() => {})
      .then(() => AsyncStorage.setItem(KEY, JSON.stringify(next)))
      .then(() => setError(""))
      .catch(() => {
        setError(
          "Progress could not be saved. Keep the app open and answer another drill to retry.",
        );
      });
  }
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        setProgress(decodeProgress(raw));
        setReady(true);
      })
      .catch(() =>
        setError(
          "Progress could not be read. Stored data has been preserved. Restart to retry.",
        ),
      );
  }, []);
  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.root}>
        <StatusBar style="light" />
        <ScrollView ref={scroll} contentContainerStyle={s.body}>
          {!lessonFocused && (
            <>
              <View style={s.brandRow}>
                <View style={s.brandMark}>
                  <Text style={{ color: palette.mint, fontSize: 22 }}>♠</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.eyebrow}>PTO / ACADEMY</Text>
                  <Text style={s.small}>THE LIVE POKER LEARNING ROOM</Text>
                </View>
                <View style={s.offline}>
                  <Text style={s.small}>LOCAL</Text>
                </View>
              </View>
              <View style={{ gap: 8 }}>
                <Text style={s.title}>
                  {tab === "Learn"
                    ? "Build your edge.\nOne step at a time."
                    : tab === "Practice"
                      ? "Practice with purpose."
                      : tab === "Table"
                        ? "Take a seat."
                        : "See how far you’ve come."}
                </Text>
                <Text style={s.sub}>
                  {tab === "Learn"
                    ? "A clear path from first principles to thoughtful play."
                    : tab === "Practice"
                      ? "Focused exercises. Clear reasoning. No guesswork."
                      : tab === "Table"
                        ? "Apply your thinking with virtual chips."
                        : "Your progress belongs to you. Keep building on it."}
                </Text>
              </View>
              {tab !== "Table" && (
                <View style={s.hero}>
                  <View style={s.brandRow}>
                    <Text style={[s.eyebrow, { flex: 1 }]}>YOUR JOURNEY</Text>
                    <Text style={s.small}>
                      {
                        lessons.filter((l) => progress.completed.includes(l.id))
                          .length
                      }
                      /12 LESSONS
                    </Text>
                  </View>
                  <Text style={s.heading}>
                    Level {level(progress.xp)} · {progress.xp} XP
                  </Text>
                  <View style={{ flexDirection: "row", gap: 4 }}>
                    {lessons.map((l) => (
                      <View
                        key={l.id}
                        style={{
                          flex: 1,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: progress.completed.includes(l.id)
                            ? palette.mint
                            : "#344B48",
                        }}
                      />
                    ))}
                  </View>
                  {!ready && <Text style={s.sub}>Loading local progress…</Text>}
                </View>
              )}
            </>
          )}
          {error ? (
            <Text accessibilityRole="alert" style={s.error}>
              {error}
            </Text>
          ) : null}
          <FadeIn key={tab} testID="screen-transition" style={{ gap: 20 }}>
            {tab === "Table" ? (
              <Simulator
                session={tableSession.session}
                change={tableSession.change}
                reset={tableSession.reset}
                persistenceError={tableSession.error}
              />
            ) : tab === "Learn" ? (
              <Curriculum
                progress={progress}
                save={save}
                ready={ready}
                onFocusChange={setLessonFocused}
                onStepChange={resetLessonScroll}
              />
            ) : tab === "Practice" ? (
              <>
                <Text style={s.sub}>
                  Optional practice lab. Your step-by-step path stays in Learn;
                  these exercises let you revisit a topic without changing
                  lesson unlocks.
                </Text>
                <View style={s.tabs}>
                  {["Math", "Preflop", "Postflop", "Exploits"].map((m) => (
                    <Touch
                      key={m}
                      accessibilityRole="button"
                      onPress={() => setMode(m)}
                      accessibilityState={{ selected: mode === m }}
                      style={[s.tab, mode === m && s.active]}
                    >
                      <Text style={s.text}>{m}</Text>
                    </Touch>
                  ))}
                </View>
                {mode === "Review" ? (
                  <DecisionDrill
                    key={reviewKey}
                    get={(i) => reviewSet[i]}
                    total={reviewSet.length}
                    ready={ready}
                    onAnswer={(t, c) => save(record(progress, t, c))}
                  />
                ) : mode === "Exploits" ? (
                  <Opponents
                    ready={ready}
                    onAnswer={(t, c) => save(record(progress, t, c))}
                  />
                ) : mode === "Postflop" ? (
                  <>
                    <Text style={s.sub}>
                      Postflop lab · Exact calculations where inputs are
                      supplied; strategic choices are conditional educational
                      heuristics.
                    </Text>
                    <DecisionDrill
                      get={(i) => postflop[i]}
                      total={postflop.length}
                      ready={ready}
                      onAnswer={(t, c) => save(record(progress, t, c))}
                    />
                  </>
                ) : mode === "Preflop" ? (
                  <Preflop
                    ready={ready}
                    onAnswer={(t, c) => save(record(progress, t, c))}
                  />
                ) : (
                  <View style={s.card}>
                    <Text style={s.eyebrow}>
                      DRILL {index + 1} / {drills.length} · {drill.topic}
                    </Text>
                    <Text style={s.heading}>{drill.question}</Text>
                    {drill.choices.map((c, i) => (
                      <Touch
                        key={c}
                        accessibilityRole="button"
                        disabled={!ready || selected !== null}
                        accessibilityState={{ selected: selected === i }}
                        style={[
                          s.tab,
                          selected === i && {
                            borderColor:
                              i === drill.answer ? palette.mint : "#F1A3AE",
                            backgroundColor:
                              i === drill.answer ? "#1E4436" : "#4B2933",
                          },
                        ]}
                        onPress={() => answer(i)}
                      >
                        <Text style={s.text}>
                          {selected === i ? "● " : ""}
                          {c}
                        </Text>
                      </Touch>
                    ))}
                    {selected !== null && (
                      <>
                        <Text accessibilityRole="alert" style={s.text}>
                          {selected === drill.answer
                            ? "Correct · +10 XP"
                            : "Review · +2 XP"}
                        </Text>
                        <Text style={s.sub}>{drill.explanation}</Text>
                        <Touch
                          accessibilityRole="button"
                          style={s.active}
                          onPress={() => {
                            setIndex((index + 1) % drills.length);
                            setSelected(null);
                          }}
                        >
                          <Text style={[s.text, { padding: 16 }]}>
                            Next drill →
                          </Text>
                        </Touch>
                      </>
                    )}
                  </View>
                )}
              </>
            ) : (
              <ProgressPanel
                progress={progress}
                save={save}
                ready={ready}
                review={() => {
                  setReviewSet(reviewQueue(progress));
                  setReviewKey(reviewKey + 1);
                  setMode("Review");
                  setTab("Practice");
                }}
              />
            )}
          </FadeIn>
          {!lessonFocused && (
            <Text style={s.foot}>
              Original educational heuristics, with explicit assumptions. No
              solver outputs or affiliation with a commercial training product
              are claimed. Virtual chips only.
            </Text>
          )}
        </ScrollView>
        {!lessonFocused && (
          <View style={s.navbar}>
            {[
              { name: "Learn", icon: "◇" },
              { name: "Practice", icon: "◎" },
              { name: "Table", icon: "♠" },
              { name: "Progress", icon: "▥" },
            ].map((t) => (
              <Touch
                key={t.name}
                accessibilityRole="button"
                accessibilityLabel={t.name}
                accessibilityState={{ selected: tab === t.name }}
                onPress={() => setTab(t.name)}
                style={[s.navItem, tab === t.name && s.navActive]}
              >
                <Text
                  aria-hidden
                  style={{
                    fontSize: 22,
                    color: tab === t.name ? palette.mint : palette.muted,
                  }}
                >
                  {t.icon}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: tab === t.name ? palette.mint : palette.muted,
                  }}
                >
                  {t.name}
                </Text>
              </Touch>
            ))}
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
  body: {
    padding: 20,
    paddingTop: 24,
    paddingBottom: 32,
    maxWidth: 680,
    width: "100%",
    alignSelf: "center",
    gap: 24,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#3C6655",
    backgroundColor: "#13332C",
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    color: palette.mint,
    fontSize: 11,
    letterSpacing: 1.6,
    fontWeight: "800",
    lineHeight: 18,
  },
  small: {
    color: palette.muted,
    fontSize: 9,
    letterSpacing: 1,
    lineHeight: 16,
  },
  offline: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  title: {
    color: palette.ink,
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 39,
    letterSpacing: -1,
  },
  sub: { color: palette.muted, fontSize: 14, lineHeight: 23 },
  hero: {
    padding: 20,
    backgroundColor: "#112B29",
    borderWidth: 1,
    borderColor: "#2C5246",
    borderRadius: 22,
    gap: 12,
  },
  heading: {
    color: palette.ink,
    fontSize: 23,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  tabs: { flexDirection: "row", gap: 6 },
  tab: {
    flex: 1,
    minHeight: 50,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    backgroundColor: palette.surface,
  },
  active: {
    backgroundColor: "#234B3D",
    borderColor: "#548E73",
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 50,
  },
  text: { color: palette.ink, fontSize: 15, lineHeight: 24 },
  card: ui.card,
  foot: { color: palette.muted, fontSize: 11, lineHeight: 18 },
  error: { color: "#FFB6B6" },
  navbar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderColor: palette.border,
    backgroundColor: "#0D1721",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
  },
  navItem: {
    flex: 1,
    paddingVertical: 6,
    minHeight: 58,
    alignItems: "center",
    gap: 3,
    borderRadius: 16,
  },
  navActive: { backgroundColor: "#19342F" },
});
export default function App() {
  return (
    <MotionProvider>
      <Boundary>
        <Academy />
      </Boundary>
    </MotionProvider>
  );
}
