import { FadeIn, LessonArt, Touch } from "./Visuals";
import React, { useState } from "react";
import { View, Text } from "react-native";
import { lessons, unlocked } from "../curriculum";
import { Progress, completeLesson } from "../progress";
import {
  stages,
  stageAvailable,
  stageFor,
  nextLesson,
  bridges,
} from "../journey";
import { ui } from "./ui";
export function Curriculum({
  progress,
  save,
  ready,
}: {
  progress: Progress;
  save: (p: Progress) => void;
  ready: boolean;
}) {
  const next = nextLesson(progress.completed);
  const [stage, setStage] = useState(() => Math.floor(Math.max(0, next) / 4));
  const [open, setOpen] = useState<number | null>(null);
  const [phase, setPhase] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  function start(i: number) {
    if (!ready || !unlocked(i, progress.completed)) return;
    setOpen(i);
    setPhase(0);
    setAnswer(null);
    setStage(Math.floor(i / 4));
  }
  function advance() {
    setPhase(phase + 1);
    setAnswer(null);
  }
  const l = open === null ? null : lessons[open];
  const bridge = l ? bridges[l.id] : null;
  if (l && bridge && open !== null) {
    const question = phase === 2 ? l : bridge;
    return (
      <>
        <Touch
          accessibilityRole="button"
          style={ui.button}
          onPress={() => setOpen(null)}
        >
          <Text style={ui.text}>← Learning path</Text>
        </Touch>
        <Text style={ui.label}>
          {stageFor(open).name} · LESSON {open + 1} OF {lessons.length}
        </Text>
        <Text style={ui.heading}>{l.title}</Text>
        <View style={ui.row}>
          {["Learn", "Example", "Check", "Apply"].map((name, i) => (
            <View
              key={name}
              style={{
                flex: 1,
                borderTopWidth: 3,
                borderColor: phase >= i ? "#57D9B0" : "#30424C",
                paddingTop: 8,
              }}
            >
              <Text style={ui.muted}>{name}</Text>
            </View>
          ))}
        </View>
        <FadeIn key={`${open}-${phase}`} style={ui.card}>
          {phase === 0 ? (
            <>
              <Text style={ui.label}>CONNECT THE DOTS</Text>
              <Text style={ui.muted}>{bridge.connection}</Text>
              <Text style={ui.heading}>One idea to learn</Text>
              <Text style={ui.text}>{l.body}</Text>
              <Touch
                accessibilityRole="button"
                style={ui.button}
                onPress={advance}
              >
                <Text style={ui.text}>See a worked example →</Text>
              </Touch>
            </>
          ) : phase === 1 ? (
            <>
              <Text style={ui.label}>SEE IT IN CONTEXT</Text>
              <Text style={ui.heading}>A worked example</Text>
              <LessonArt lesson={l.id} />
              <Text style={ui.text}>{bridge.example}</Text>
              <Text style={ui.muted}>{l.basis}</Text>
              <Touch
                accessibilityRole="button"
                style={ui.button}
                onPress={advance}
              >
                <Text style={ui.text}>Check my understanding →</Text>
              </Touch>
            </>
          ) : phase < 4 ? (
            <>
              <Text style={ui.label}>
                {phase === 2 ? "RECALL THE CONCEPT" : "APPLY IT TO A NEW SPOT"}
              </Text>
              <Text style={ui.heading}>{question.question}</Text>
              {question.choices.map((c, i) => (
                <Touch
                  key={c}
                  accessibilityRole="button"
                  disabled={answer !== null}
                  style={ui.button}
                  onPress={() => {
                    setAnswer(i);
                    if (phase === 3 && i === question.answer) {
                      save(completeLesson(progress, l.id));
                      setPhase(4);
                    }
                  }}
                >
                  <Text style={ui.text}>{c}</Text>
                </Touch>
              ))}
              {answer !== null && (
                <>
                  <Text accessibilityRole="alert" style={ui.text}>
                    {answer === question.answer
                      ? "You’ve got it."
                      : "Not quite. Let’s work through it."}{" "}
                    {question.explanation}
                  </Text>
                  <Touch
                    accessibilityRole="button"
                    style={ui.button}
                    onPress={() => {
                      if (answer === question.answer) advance();
                      else setAnswer(null);
                    }}
                  >
                    <Text style={ui.text}>
                      {answer === question.answer
                        ? "Apply this concept →"
                        : "Try this check again"}
                    </Text>
                  </Touch>
                </>
              )}
            </>
          ) : (
            <>
              <View
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 27,
                  backgroundColor: "#295841",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#B3F2CF", fontSize: 28 }}>✓</Text>
              </View>
              <Text style={ui.label}>TWO CHECKS PASSED</Text>
              <Text accessibilityRole="alert" style={ui.heading}>
                Lesson complete. Keep building.
              </Text>
              <Text style={ui.text}>{bridge.explanation}</Text>
              <Text style={ui.muted}>
                Completion is saved on this device. +20 XP the first time only.
              </Text>
              {next >= 0 ? (
                <>
                  <Text style={ui.text}>Next: {lessons[next].title}</Text>
                  <Text style={ui.muted}>
                    {bridges[lessons[next].id].connection}
                  </Text>
                  <Touch
                    accessibilityRole="button"
                    style={ui.button}
                    onPress={() => start(next)}
                  >
                    <Text style={ui.text}>Continue to lesson {next + 1} →</Text>
                  </Touch>
                </>
              ) : (
                <Text style={ui.text}>
                  Your path is complete. Keep revisiting weak topics and
                  reviewing real decisions. This is a practice milestone, not
                  proof of poker mastery.
                </Text>
              )}
              <Touch
                accessibilityRole="button"
                style={ui.button}
                onPress={() => setOpen(null)}
              >
                <Text style={ui.text}>Back to my path</Text>
              </Touch>
            </>
          )}
        </FadeIn>
      </>
    );
  }
  return (
    <>
      <Text style={ui.label}>YOUR GUIDED PATH</Text>
      <Text style={ui.heading}>Small steps. Strong foundations.</Text>
      <Text style={ui.muted}>
        One idea, a worked example, then two checks. Each lesson builds on the
        last. Take it at your own pace.
      </Text>
      <View
        style={[
          ui.card,
          { backgroundColor: "#173D33", borderColor: "#426D58" },
        ]}
      >
        <Text style={ui.label}>
          {next < 0 ? "PATH COMPLETE" : stageFor(next).name.toUpperCase()}
        </Text>
        <Text style={ui.heading}>
          {next < 0 ? "Keep sharpening your decisions" : lessons[next].title}
        </Text>
        <Text style={ui.muted}>
          {next < 0
            ? "Review lessons or use weakest-topic practice. Completing a course is the start of applying it."
            : bridges[lessons[next].id].connection}
        </Text>
        {next >= 0 && (
          <Touch
            accessibilityRole="button"
            disabled={!ready}
            style={ui.button}
            onPress={() => start(next)}
          >
            <Text style={ui.text}>
              {next === 0
                ? "Start lesson 1 →"
                : `Continue lesson ${next + 1} →`}
            </Text>
          </Touch>
        )}
        <Text style={ui.muted}>
          {lessons.filter((v) => progress.completed.includes(v.id)).length} of
          12 lessons completed · no rush
        </Text>
      </View>
      {stages.map((group, i) => {
        const allowed = ready && stageAvailable(i, progress.completed);
        const selected = stage === i;
        return (
          <View style={ui.card} key={group.name}>
            <Touch
              accessibilityRole="button"
              disabled={!allowed}
              accessibilityState={{ disabled: !allowed, expanded: selected }}
              onPress={() => setStage(i)}
            >
              <Text style={ui.label}>
                {group.icon} ·{" "}
                {allowed ? "UNLOCKED" : "BUILD THE FOUNDATIONS FIRST"}
              </Text>
              <Text style={ui.heading}>{group.name}</Text>
              <Text style={ui.muted}>{group.subtitle}</Text>
            </Touch>
            {selected && allowed && (
              <>
                <Text style={ui.muted}>{group.goal}</Text>
                {lessons.slice(group.from, group.to).map((item, j) => {
                  const n = group.from + j;
                  const available = ready && unlocked(n, progress.completed);
                  const done = progress.completed.includes(item.id);
                  return (
                    <Touch
                      accessibilityRole="button"
                      key={item.id}
                      accessibilityState={{ disabled: !available }}
                      disabled={!available}
                      style={ui.button}
                      onPress={() => start(n)}
                    >
                      <Text style={ui.label}>
                        {done
                          ? "✓ Completed"
                          : available
                            ? "Available"
                            : "Locked"}
                      </Text>
                      <Text style={ui.text}>
                        {n + 1}. {item.title}
                      </Text>
                      {!available && (
                        <Text style={ui.muted}>Complete lesson {n} first</Text>
                      )}
                    </Touch>
                  );
                })}
              </>
            )}
          </View>
        );
      })}
    </>
  );
}
