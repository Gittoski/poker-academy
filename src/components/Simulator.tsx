import { CardRow, Touch } from "./Visuals";
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Share,
  useWindowDimensions,
} from "react-native";
import { Action, Table, act, createTable, nextHand, legal } from "../table";
import { botNames, toHero } from "../bots";
import { ui } from "./ui";
export function Simulator() {
  const { width } = useWindowDimensions();
  const [table, setTable] = useState<Table>(() => toHero(createTable(42)));
  const [target, setTarget] = useState("");
  const [error, setError] = useState("");
  const l = legal(table);
  const p = table.players[0];
  function move(action: Action) {
    try {
      setTable(toHero(act(table, action)));
      setTarget("");
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function next() {
    try {
      setTable(toHero(nextHand(table)));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <Text style={ui.heading}>Table lab · virtual chips</Text>
      <Text style={ui.muted}>
        Blinds 1/2 chips. 200 chips = 100 BB at start. Five toy opponents
        illustrate tendencies; they are not calibrated models or optimal
        players. No rake. Leaving the Table tab starts a fresh virtual session.
      </Text>
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
          {table.players.filter((p) => p.stack > 0).length >= 2 &&
          p.stack > 0 ? (
            <Touch accessibilityRole="button" style={ui.button} onPress={next}>
              <Text style={ui.text}>Next hand</Text>
            </Touch>
          ) : (
            <Text style={ui.text}>
              Session complete. Reset the table to play again.
            </Text>
          )}
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
          <Touch
            accessibilityRole="button"
            style={ui.button}
            onPress={() => {
              setTable(toHero(createTable(42)));
              setError("");
            }}
          >
            <Text style={ui.text}>Reset virtual table</Text>
          </Touch>
        </View>
      )}
      <View style={ui.card}>
        <Text style={ui.heading}>Action history</Text>
        {table.log.map((v, i) => (
          <Text style={ui.muted} key={i}>
            {v}
          </Text>
        ))}
      </View>
    </>
  );
}
