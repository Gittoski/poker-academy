import React, { useMemo, useState } from "react";
import { View, Text } from "react-native";
import { Touch, CardRow } from "./Visuals";
import { ui } from "./ui";
import {
  SimulatorSession,
  troublesomeSpots,
  reviewStates,
  practiceDecision,
  practiceReviewedDecision,
  ReviewedHand,
} from "../simulatorSession";
import { seatPosition } from "../positions";
import { evaluateBaseline } from "../baselineCoach";
import { DecisionChart } from "./DecisionChart";
export function HandLibrary({
  session,
  change,
  close,
  play,
}: {
  session: SimulatorSession;
  change: (f: (s: SimulatorSession) => SimulatorSession) => void;
  close: () => void;
  play: () => void;
}) {
  const [tab, setTab] = useState("Troublesome spots");
  const [selected, setSelected] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const [chart, setChart] = useState(false);
  const spots = useMemo(() => troublesomeSpots(session), [session]);
  const hand = session.archive.find((h) => h.id === selected);
  const states = useMemo(() => (hand ? reviewStates(hand) : []), [hand]);
  const table = states[step];
  function practice(f: (s: SimulatorSession) => SimulatorSession) {
    change(f);
    play();
  }
  const header = (
    <Touch accessibilityRole="button" style={ui.button} onPress={close}>
      <Text style={ui.text}>← Back to table</Text>
    </Touch>
  );
  if (hand && table) {
    const action = hand.record.actions[step];
    const hero = table.actor === 0 && !table.done && !!action;
    const feedback = hero ? evaluateBaseline(table, action) : null;
    return (
      <>
        {header}
        <Touch
          accessibilityRole="button"
          style={ui.button}
          onPress={() => setSelected(null)}
        >
          <Text style={ui.text}>← Saved hands</Text>
        </Touch>
        <Text style={ui.heading}>Review hand {hand.record.hand}</Text>
        <Text style={ui.muted}>
          {hand.practice ? "Practice branch" : "Original play"} · saved #
          {hand.id}. Only information available at this point is shown. Reviews
          do not change the live table.
        </Text>
        <View style={ui.card}>
          <Text style={ui.label}>
            ACTION {step} / {hand.record.actions.length} ·{" "}
            {["PREFLOP", "FLOP", "TURN", "RIVER"][table.stage]}
          </Text>
          <Text style={ui.heading}>
            Pot {table.players.reduce((n, p) => n + p.total, 0)} chips
          </Text>
          <Text style={ui.text}>Your cards</Text>
          <CardRow cards={table.players[0].hole} />
          <Text style={ui.text}>Board</Text>
          {table.board.length ? (
            <CardRow cards={table.board} compact />
          ) : (
            <Text style={ui.muted}>Not dealt yet</Text>
          )}
          {table.players.map((p, i) => (
            <Text key={i} style={ui.muted}>
              {i === 0 ? "You" : `Seat ${i + 1}`} ·{" "}
              {seatPosition(table.button, i)} · {p.stack} behind · {p.street} in
              street{p.folded ? " · Folded" : ""}
            </Text>
          ))}
          <Text style={ui.text}>
            {table.done
              ? "Hand finished"
              : `${table.actor === 0 ? "You" : `Seat ${table.actor + 1}`} to act`}
          </Text>
          <View style={ui.row}>
            <Touch
              accessibilityRole="button"
              disabled={step === 0}
              style={ui.button}
              onPress={() => {
                setStep(step - 1);
                setChart(false);
              }}
            >
              <Text style={ui.text}>Previous action</Text>
            </Touch>
            <Touch
              accessibilityRole="button"
              disabled={step === states.length - 1}
              style={ui.button}
              onPress={() => {
                setStep(step + 1);
                setChart(false);
              }}
            >
              <Text style={ui.text}>Next action</Text>
            </Touch>
          </View>
        </View>
        {hero && feedback && (
          <View style={ui.card}>
            <Text style={ui.heading}>Your decision at this point</Text>
            <Text style={ui.text}>
              You chose{" "}
              {action.type === "raise" ? `raise to ${action.to}` : action.type}.
            </Text>
            <Text style={ui.label}>{feedback.title}</Text>
            <Text style={ui.muted}>{feedback.context}</Text>
            <Text style={ui.text}>{feedback.explanation}</Text>
            <Touch
              accessibilityRole="button"
              style={ui.button}
              onPress={() =>
                practice((s) => practiceReviewedDecision(s, hand.id, step))
              }
            >
              <Text style={ui.text}>Practice this saved decision</Text>
            </Touch>
            <Touch
              accessibilityRole="button"
              accessibilityState={{ expanded: chart }}
              style={ui.button}
              onPress={() => setChart(!chart)}
            >
              <Text style={ui.text}>
                {chart ? "Hide review chart" : "Show review chart"}
              </Text>
            </Touch>
            {chart && <DecisionChart table={table} />}
          </View>
        )}
      </>
    );
  }
  return (
    <>
      {header}
      <Text style={ui.heading}>Your simulator notebook</Text>
      <Text style={ui.muted}>
        Saved on this device: up to 30 completed hands and 200 decision
        attempts. First tries and practice tries are kept separate. Baseline
        matches are not a poker skill rating.
      </Text>
      <View style={ui.row}>
        {["Troublesome spots", "Saved hands"].map((t) => (
          <Touch
            key={t}
            accessibilityRole="button"
            accessibilityState={{ selected: tab === t }}
            style={ui.button}
            onPress={() => {
              setTab(t);
              setSelected(null);
            }}
          >
            <Text style={ui.text}>{t}</Text>
          </Touch>
        ))}
      </View>
      {tab === "Troublesome spots" ? (
        <>
          {spots.length === 0 ? (
            <Text style={ui.muted}>
              No troublesome spots saved yet. Baseline deviations appear here
              automatically. You can also mark an ungraded decision yourself.
            </Text>
          ) : (
            spots.map((g) => (
              <View key={g.key} style={ui.card}>
                <Text style={ui.heading}>
                  {g.label.replace("UTG", "LJ (UTG)")}
                </Text>
                <Text style={ui.label}>
                  {g.latest.feedback.status === "ungraded"
                    ? "MANUALLY MARKED · NOT GRADED"
                    : g.latest.feedback.status === "match"
                      ? "MATCHED ON LATEST ATTEMPT"
                      : "NEEDS REVIEW"}
                </Text>
                <Text style={ui.muted}>
                  Retained first tries: {g.firstMatches}/{g.firstTries} matched
                  · Practice tries: {g.retries}. Retrying does not inflate
                  first-try results.
                </Text>
                <Text style={ui.muted}>
                  Baseline deviations in retained history: {g.deviations}.
                  Unresolved and repeatedly troublesome spots appear first.
                </Text>
                <Text style={ui.text}>{g.target.feedback.explanation}</Text>
                <Touch
                  accessibilityRole="button"
                  style={ui.button}
                  onPress={() =>
                    practice((s) => practiceDecision(s, g.target.id))
                  }
                >
                  <Text style={ui.text}>Practice saved spot {g.target.id}</Text>
                </Touch>
              </View>
            ))
          )}
        </>
      ) : (
        <>
          {session.archive.length === 0 ? (
            <Text style={ui.muted}>
              Finish a hand to save a review automatically.
            </Text>
          ) : (
            [...session.archive].reverse().map((h) => (
              <Touch
                key={h.id}
                accessibilityRole="button"
                style={ui.button}
                onPress={() => {
                  setSelected(h.id);
                  setStep(0);
                  setChart(false);
                }}
              >
                <Text style={ui.text}>
                  Review hand {h.record.hand} ·{" "}
                  {h.practice ? "practice" : "original"} · #{h.id}
                </Text>
                <Text style={ui.muted}>
                  {h.record.mode === "coached" ? "Coached hands" : "Free table"}{" "}
                  · {h.record.actions.length} actions
                </Text>
              </Touch>
            ))
          )}
        </>
      )}
    </>
  );
}
