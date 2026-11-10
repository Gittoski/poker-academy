import { CardRow, Touch } from "./Visuals";
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Share,
  useWindowDimensions,
} from "react-native";
import { Action, legal } from "../table";
import {
  SimulatorSession,
  sessionAction,
  continueSession,
} from "../simulatorSession";
import { botNames } from "../bots";
import { ui } from "./ui";
export function Simulator({
  session,
  change,
  reset,
  persistenceError,
}: {
  session: SimulatorSession | null;
  change: (update: (s: SimulatorSession) => SimulatorSession) => void;
  reset: () => void;
  persistenceError: string;
}) {
  const { width } = useWindowDimensions();
  const [showDetails, setShowDetails] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [target, setTarget] = useState("");
  const [error, setError] = useState("");
  if (!session)
    return (
      <View style={ui.card}>
        <Text style={ui.heading}>
          {persistenceError ? "Table needs attention" : "Loading your table…"}
        </Text>
        {persistenceError && (
          <Text accessibilityRole="alert" style={ui.text}>
            {persistenceError}
          </Text>
        )}
        {confirmReset ? (
          <Touch accessibilityRole="button" style={ui.danger} onPress={reset}>
            <Text style={ui.text}>Confirm reset virtual table</Text>
          </Touch>
        ) : persistenceError ? (
          <Touch
            accessibilityRole="button"
            style={ui.button}
            onPress={() => setConfirmReset(true)}
          >
            <Text style={ui.text}>Reset virtual table</Text>
          </Touch>
        ) : null}
      </View>
    );
  const table = session.table;
  const l = legal(table);
  const p = table.players[0];
  function move(action: Action) {
    try {
      change((s) => sessionAction(s, action));
      setTarget("");
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function next() {
    try {
      change(continueSession);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <Text style={ui.heading}>Table lab · virtual chips</Text>
      <Text style={ui.label}>
        HAND {session.hand} · BLINDS 1/2 · VIRTUAL CHIPS
      </Text>
      {persistenceError && (
        <Text accessibilityRole="alert" style={ui.text}>
          {persistenceError}
        </Text>
      )}
      <View
        style={[
          ui.card,
          {
            backgroundColor: "#103D32",
            borderWidth: 1,
            borderColor: "#377B66",
          },
        ]}
      >
        <Text style={ui.label}>
          {["PREFLOP", "FLOP", "TURN", "RIVER"][table.stage]} ·{" "}
          {table.done ? "HAND COMPLETE" : "YOUR DECISION"}
        </Text>
        <Text style={ui.heading}>
          Pot {table.players.reduce((n, p) => n + p.total, 0)} chips
        </Text>
        <CardRow
          cards={table.board.length ? table.board : [0, 1, 2, 3, 4]}
          hidden={!table.board.length}
          compact={width < 360}
        />
        <View style={ui.row}>
          {table.players.map((v, i) => (
            <View
              key={i}
              style={{
                width: "47%",
                padding: 10,
                backgroundColor: "#0D2924",
                borderRadius: 10,
              }}
            >
              <Text style={ui.text}>
                {i === table.button ? "ⓓ " : ""}
                {botNames[i]}
              </Text>
              <Text style={ui.muted}>
                {v.stack} behind · {v.street} in street
              </Text>
              {v.folded ? (
                <Text style={ui.muted}>Folded</Text>
              ) : (
                <View style={{ gap: 8, paddingTop: 8 }}>
                  <CardRow
                    cards={v.hole}
                    hidden={i !== 0 && !table.done}
                    compact
                  />
                  {!v.stack && !table.done && (
                    <Text style={ui.label}>ALL-IN</Text>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={ui.text}>
          {error}
        </Text>
      ) : null}
      {!table.done && (
        <View style={ui.card}>
          <Text style={ui.heading}>Your decision</Text>
          <CardRow cards={p.hole} />
          <Text style={ui.muted}>
            Facing {Math.max(0, table.bet - p.street)} · Call costs {l.call} ·
            Stack {p.stack}
          </Text>
          <View style={ui.row}>
            {l.call > 0 && (
              <Touch
                accessibilityRole="button"
                style={ui.button}
                onPress={() => move({ type: "fold" })}
              >
                <Text style={ui.text}>Fold</Text>
              </Touch>
            )}
            <Touch
              accessibilityRole="button"
              style={ui.button}
              onPress={() => move({ type: l.call ? "call" : "check" })}
            >
              <Text style={ui.text}>{l.call ? "Call " + l.call : "Check"}</Text>
            </Touch>
          </View>
          {l.canRaise && (
            <>
              <Text style={ui.muted}>
                Raise TO a total this street. Minimum {l.minTo}, maximum{" "}
                {l.maxTo}; a smaller all-in is legal.
              </Text>
              <TextInput
                accessibilityLabel="Raise total in chips"
                style={ui.input}
                keyboardType="number-pad"
                value={target}
                onChangeText={setTarget}
                placeholder="Total chips this street"
                placeholderTextColor="#AEBCC6"
              />
              <View style={ui.row}>
                <Touch
                  accessibilityRole="button"
                  style={ui.button}
                  onPress={() => move({ type: "raise", to: Number(target) })}
                >
                  <Text style={ui.text}>Raise to amount</Text>
                </Touch>
                <Touch
                  accessibilityRole="button"
                  style={ui.button}
                  onPress={() => move({ type: "raise", to: l.maxTo })}
                >
                  <Text style={ui.text}>All-in {l.maxTo}</Text>
                </Touch>
              </View>
            </>
          )}
        </View>
      )}
      {table.done && (
        <View style={ui.card}>
          <Text accessibilityRole="alert" style={ui.heading}>
            Hand complete
          </Text>
          <Text style={ui.text}>
            {table.awards
              .map((n, i) => (n ? `${botNames[i]} receives ${n}` : ""))
              .filter(Boolean)
              .join("\n")}
          </Text>
          <Text style={ui.muted}>
            Awards include pot wins and returned unmatched chips. A result is
            not a strategic grade.
          </Text>
          <Touch accessibilityRole="button" style={ui.button} onPress={next}>
            <Text style={ui.text}>Next hand</Text>
          </Touch>
          <Text style={ui.muted}>
            Seats at or below 2 chips are refilled to 200 virtual chips before
            the next hand. Refills are practice credits, not winnings.
          </Text>
          <Touch
            accessibilityRole="button"
            style={ui.button}
            onPress={() =>
              Share.share({
                message: JSON.stringify(
                  {
                    seed: table.seed,
                    stacks: table.initial,
                    button: table.button,
                    actions: table.actions,
                  },
                  null,
                  2,
                ),
              }).catch(() => setError("Replay could not be shared."))
            }
          >
            <Text style={ui.text}>Export hand replay</Text>
          </Touch>
        </View>
      )}
      <Touch
        accessibilityRole="button"
        accessibilityState={{ expanded: showDetails }}
        style={ui.button}
        onPress={() => setShowDetails(!showDetails)}
      >
        <Text style={ui.text}>
          {showDetails ? "Hide table details" : "Table details & history"}
        </Text>
      </Touch>
      {showDetails && (
        <View style={ui.card}>
          <Text style={ui.heading}>Table details</Text>
          <Text style={ui.muted}>
            Six seats, blinds 1/2 chips, no ante or rake. Initial 200 chips =
            100 BB. Toy opponents are not calibrated player models. Your table
            stays saved across tabs and reloads.
          </Text>
          <Text style={ui.muted}>
            Seats at or below the 2-chip big blind are refilled to 200 virtual
            chips between hands. {session.refills} seat refills so far. Refills
            change the available virtual chips; they are not poker winnings.
          </Text>
          <Text style={ui.heading}>Action history</Text>
          {table.log.map((v, i) => (
            <Text key={i} style={ui.muted}>
              {v}
            </Text>
          ))}
          <Touch
            accessibilityRole="button"
            style={ui.danger}
            onPress={() => setConfirmReset(true)}
          >
            <Text style={ui.text}>Reset virtual table</Text>
          </Touch>
          {confirmReset && (
            <>
              <Text style={ui.text}>
                Discard this table and start from hand 1? Learning progress will
                be kept.
              </Text>
              <Touch
                accessibilityRole="button"
                style={ui.danger}
                onPress={() => {
                  reset();
                  setConfirmReset(false);
                }}
              >
                <Text style={ui.text}>Confirm reset virtual table</Text>
              </Touch>
              <Touch
                accessibilityRole="button"
                style={ui.button}
                onPress={() => setConfirmReset(false)}
              >
                <Text style={ui.text}>Cancel table reset</Text>
              </Touch>
            </>
          )}
        </View>
      )}
    </>
  );
}
