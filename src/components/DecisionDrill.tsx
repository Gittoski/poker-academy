import { FadeIn, Touch } from "./Visuals";
import React, { useState } from "react";
import { Text, View } from "react-native";
import { Drill } from "../math";
import { ui } from "./ui";
export function DecisionDrill({
  get,
  total,
  onAnswer,
  ready,
}: {
  get: (i: number) => Drill;
  total: number;
  onAnswer: (topic: string, correct: boolean) => void;
  ready: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const drill = get(index);
  return (
    <View style={ui.card}>
      <Text style={ui.label}>
        SCENARIO {index + 1} / {total} · {drill.topic}
      </Text>
      <Text style={ui.heading}>{drill.question}</Text>
      {drill.choices.map((c, i) => (
        <Touch
          accessibilityRole="button"
          key={c}
          disabled={!ready || answer !== null}
          accessibilityState={{ selected: answer === i }}
          style={[
            ui.button,
            answer === i && {
              borderColor: i === drill.answer ? "#83E2BC" : "#F1A3AE",
              backgroundColor: i === drill.answer ? "#1E4436" : "#4B2933",
            },
          ]}
          onPress={() => {
            setAnswer(i);
            onAnswer(drill.topic, i === drill.answer);
          }}
        >
          <Text style={ui.text}>
            {answer === i ? "● " : ""}
            {c}
          </Text>
        </Touch>
      ))}
      {answer !== null && (
        <FadeIn style={{ gap: 16 }}>
          <Text accessibilityRole="alert" style={ui.heading}>
            {answer === drill.answer
              ? "Matches this exercise · +10 XP"
              : "Review the assumptions · +2 XP"}
          </Text>
          <Text style={ui.muted}>{drill.explanation}</Text>
          <Touch
            accessibilityRole="button"
            style={ui.button}
            onPress={() => {
              setIndex((index + 1) % total);
              setAnswer(null);
            }}
          >
            <Text style={ui.text}>Next scenario →</Text>
          </Touch>
        </FadeIn>
      )}
    </View>
  );
}
