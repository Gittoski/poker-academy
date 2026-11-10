import React, { useState } from "react";
import { Text, View, Pressable } from "react-native";
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
        <Pressable
          accessibilityRole="button"
          key={c}
          disabled={!ready || answer !== null}
          style={ui.button}
          onPress={() => {
            setAnswer(i);
            onAnswer(drill.topic, i === drill.answer);
          }}
        >
          <Text style={ui.text}>
            {answer === i ? "● " : ""}
            {c}
          </Text>
        </Pressable>
      ))}
      {answer !== null && (
        <>
          <Text accessibilityRole="alert" style={ui.heading}>
            {answer === drill.answer
              ? "Matches this exercise · +10 XP"
              : "Review the assumptions · +2 XP"}
          </Text>
          <Text style={ui.muted}>{drill.explanation}</Text>
          <Pressable
            accessibilityRole="button"
            style={ui.button}
            onPress={() => {
              setIndex((index + 1) % total);
              setAnswer(null);
            }}
          >
            <Text style={ui.text}>Next scenario →</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
