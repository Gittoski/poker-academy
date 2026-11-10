import React, { useEffect, useRef, useState } from "react";
import { ScrollView, View, Text, Pressable, StyleSheet } from "react-native";
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
import { Boundary } from "./src/components/Boundary";
import { ProgressPanel } from "./src/components/ProgressPanel";
import { reviewQueue } from "./src/review";
import { Simulator } from "./src/components/Simulator";
import { Opponents } from "./src/components/Opponents";
import { postflop } from "./src/postflop";
import { DecisionDrill } from "./src/components/DecisionDrill";
import { Preflop } from "./src/components/Preflop";
import { Curriculum } from "./src/components/Curriculum";
import { drills } from "./src/math";
const KEY = "poker-academy.progress.v1";
function Academy() {
  const [tab, setTab] = useState("Learn");
  const [progress, setProgress] = useState<Progress>(freshProgress);
  const [reviewSet, setReviewSet] = useState(drills);
  const [reviewKey, setReviewKey] = useState(0);
  const [mode, setMode] = useState("Math");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const writes = useRef(Promise.resolve());
  const drill = drills[index];
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
        <ScrollView contentContainerStyle={s.body}>
          <Text style={s.eyebrow}>POKER PTO ACADEMY / 6-MAX NLHE</Text>
          <Text style={s.title}>
            Better decisions.{"\n"}One hand at a time.
          </Text>
          <Text style={s.sub}>Train with intention. Play with confidence.</Text>
          <View style={s.hero}>
            <Text style={s.eyebrow}>YOUR JOURNEY</Text>
            <Text style={s.heading}>
              Level {level(progress.xp)} · {progress.xp} XP
            </Text>
            <Text style={s.sub}>
              {ready
                ? "Progress stays on this device. No account required."
                : "Loading local progress…"}
            </Text>
          </View>
          {error ? (
            <Text accessibilityRole="alert" style={s.error}>
              {error}
            </Text>
          ) : null}
          <View style={s.tabs}>
            {["Learn", "Practice", "Table", "Progress"].map((t) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: tab === t }}
                key={t}
                onPress={() => setTab(t)}
                style={[s.tab, tab === t && s.active]}
              >
                <Text style={s.text}>{t}</Text>
              </Pressable>
            ))}
          </View>
          {tab === "Table" ? (
            <Simulator />
          ) : tab === "Learn" ? (
            <Curriculum progress={progress} save={save} ready={ready} />
          ) : tab === "Practice" ? (
            <>
              <View style={s.tabs}>
                {["Math", "Preflop", "Postflop", "Exploits"].map((m) => (
                  <Pressable
                    key={m}
                    accessibilityRole="button"
                    onPress={() => setMode(m)}
                    style={s.tab}
                  >
                    <Text style={s.text}>{m}</Text>
                  </Pressable>
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
                    Postflop lab · Exact calculations where inputs are supplied;
                    strategic choices are conditional educational heuristics.
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
                    <Pressable
                      key={c}
                      accessibilityRole="button"
                      disabled={!ready || selected !== null}
                      style={s.tab}
                      onPress={() => answer(i)}
                    >
                      <Text style={s.text}>
                        {selected === i ? "● " : ""}
                        {c}
                      </Text>
                    </Pressable>
                  ))}
                  {selected !== null && (
                    <>
                      <Text accessibilityRole="alert" style={s.text}>
                        {selected === drill.answer
                          ? "Correct · +10 XP"
                          : "Review · +2 XP"}
                      </Text>
                      <Text style={s.sub}>{drill.explanation}</Text>
                      <Pressable
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
                      </Pressable>
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

          <Text style={s.foot}>
            Original educational heuristics, with explicit assumptions. No
            solver outputs or affiliation with a commercial training product are
            claimed. Virtual chips only.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A1015" },
  body: {
    padding: 24,
    paddingBottom: 48,
    maxWidth: 680,
    width: "100%",
    alignSelf: "center",
    gap: 18,
  },
  eyebrow: {
    color: "#57D9B0",
    fontSize: 12,
    letterSpacing: 1.7,
    fontWeight: "700",
  },
  title: { color: "#F2F5F7", fontSize: 36, fontWeight: "800", lineHeight: 43 },
  sub: { color: "#AEBCC6", fontSize: 15, lineHeight: 23 },
  hero: { padding: 24, backgroundColor: "#12312D", borderRadius: 20, gap: 12 },
  heading: { color: "#F2F5F7", fontSize: 21, fontWeight: "700" },
  tabs: { flexDirection: "row", gap: 8 },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#17232D",
  },
  active: { backgroundColor: "#22604F" },
  text: { color: "#F2F5F7", fontSize: 16, lineHeight: 24 },
  card: { backgroundColor: "#131F29", padding: 20, borderRadius: 16, gap: 10 },
  foot: { color: "#AEBCC6", fontSize: 12, lineHeight: 19 },
  error: { color: "#FFB6B6" },
});

export default function App() {
  return (
    <Boundary>
      <Academy />
    </Boundary>
  );
}
