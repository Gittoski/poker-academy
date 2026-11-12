import React, { useState } from "react";
import { Touch } from "./Visuals";
import {
  solvedSpot,
  solvedClasses,
  riverPack,
  actionLabel,
  SOLVED_EV_TOLERANCE,
} from "../solvedStrategy";
import { View, Text } from "react-native";
import { Table } from "../table";
import {
  evaluateBaseline,
  handClass,
  heroPosition,
  baselineName,
} from "../baselineCoach";
import { hands, firstIn, Position } from "../preflop";
import { ui } from "./ui";
export function DecisionChart({ table }: { table: Table }) {
  if (solvedSpot(table)) return <SolvedChart table={table} />;
  const coverage = evaluateBaseline(table, { type: "fold" });
  if (coverage.status === "ungraded")
    return (
      <View style={ui.card}>
        <Text style={ui.heading}>No applicable chart</Text>
        <Text style={ui.muted}>{coverage.explanation}</Text>
      </View>
    );
  const position = heroPosition(table.button) as Position;
  const hand = handClass(table.players[0].hole);
  return (
    <View style={ui.card}>
      <Text style={ui.heading}>Chart for this decision</Text>
      <Text style={ui.label}>
        {position === "UTG" ? "LJ (UTG)" : position} · {hand} · 100 BB ·
        UNOPENED
      </Text>
      <Text style={ui.text}>
        {hand}: {firstIn(position, hand)}
        {firstIn(position, hand) === "Raise"
          ? ` to ${position === "SB" ? 3 : 2.5} BB`
          : ""}
      </Text>
      <Text style={ui.muted}>
        {baselineName}. Authored raise-or-fold convention, not a solved GTO
        chart. No ante/rake; SB deliberately shares BTN hand selection. Other
        scenarios require different data.
      </Text>
      <Text style={ui.muted}>
        Green: raise · Slate: fold · Gold border: your hand. s = suited, o =
        offsuit.
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {hands.map((h) => (
          <View
            accessible
            accessibilityLabel={`${h}: ${firstIn(position, h)}${h === hand ? "; your hand" : ""}`}
            key={h}
            style={{
              width: "7.69%",
              minHeight: 28,
              justifyContent: "center",
              backgroundColor:
                firstIn(position, h) === "Raise" ? "#245F4C" : "#17232D",
              borderWidth: h === hand ? 2 : 0.5,
              borderColor: h === hand ? "#E2C78F" : "#0A1015",
            }}
          >
            <Text
              style={{ fontSize: 9, textAlign: "center", color: "#F1F1E9" }}
            >
              {h}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const strategyColors = ["#83C3EB", "#83E2BC", "#E2C78F"];
function SolvedChart({ table }: { table: Table }) {
  const spot = solvedSpot(table)!;
  const hero = handClass(table.players[table.actor].hole);
  const [selected, setSelected] = useState(hero);
  const [source, setSource] = useState(false);
  const classes = solvedClasses(spot.node);
  const row = classes.get(selected);
  const best = spot.combo ? Math.max(...spot.combo.ev) : 0;
  const localGap = spot.combo
    ? best -
      spot.combo.ev.reduce((n, v, i) => n + v * spot.combo!.frequencies[i], 0)
    : 0;
  return (
    <View style={ui.card} testID="solved-decision-chart">
      <Text style={ui.heading}>River strategy chart</Text>
      <Text style={ui.label}>
        BTN vs BB · node {spot.node.path.join("/") || "root"} · {hero}
      </Text>
      <Text style={ui.muted}>
        Conditional solve · assumed river ranges · 50% / pot bets, 2.5× raises ·
        no rake
      </Text>
      {localGap > SOLVED_EV_TOLERANCE && (
        <Text style={ui.muted}>
          Low-confidence combination · chart only; this decision will not be
          graded.
        </Text>
      )}
      <Text style={ui.text}>Your exact cards</Text>
      {spot.combo ? (
        spot.node.actions.map((a, i) => (
          <Text key={i} style={ui.text}>
            {actionLabel(a, table)}:{" "}
            {(spot.combo!.frequencies[i] * 100).toFixed(1)}% · loss{" "}
            {((best - spot.combo!.ev[i]) / 2).toFixed(3)} BB
          </Text>
        ))
      ) : (
        <Text style={ui.muted}>
          Your exact combination has no positive reach in this node. No verdict.
        </Text>
      )}
      <Text style={ui.muted}>
        Frequencies describe repeated play; more than one action can be valid.
        Loss compares the actions in this tree, not every possible size.
      </Text>
      <View style={ui.row}>
        {spot.node.actions.map((a, i) => (
          <Text key={i} style={[ui.label, { color: strategyColors[i] }]}>
            ■ {actionLabel(a, table)}
          </Text>
        ))}
      </View>
      <Text style={ui.muted}>
        Tap a hand to inspect its class average. Gold border: your class. Dark
        cells: no reachable combinations, not a fold recommendation.
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {hands.map((h) => {
          const c = classes.get(h);
          const label = c
            ? c.frequencies
                .map(
                  (p, i) =>
                    `${actionLabel(spot.node.actions[i], table)} ${(p * 100).toFixed(1)}%`,
                )
                .join(", ")
            : "no reachable combinations";
          return (
            <Touch
              key={h}
              accessibilityRole="button"
              accessibilityLabel={`${h}: ${label}${h === hero ? "; your hand" : ""}`}
              accessibilityState={{ selected: h === selected }}
              onPress={() => setSelected(h)}
              style={{
                width: "7.69%",
                height: 32,
                justifyContent: "center",
                backgroundColor: c ? "#1C3442" : "#101B24",
                borderWidth: h === hero ? 2 : 0.5,
                borderColor:
                  h === hero
                    ? "#E2C78F"
                    : h === selected
                      ? "#F1F1E9"
                      : "#0A1015",
              }}
            >
              <Text
                style={{
                  fontSize: 9,
                  textAlign: "center",
                  color: c ? "#F1F1E9" : "#AEBCC6",
                }}
              >
                {h}
              </Text>
              {c && (
                <View
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 5,
                    flexDirection: "row",
                  }}
                >
                  {c.frequencies.map((p, i) => (
                    <View
                      key={i}
                      style={{
                        width: `${p * 100}%`,
                        backgroundColor: strategyColors[i],
                      }}
                    />
                  ))}
                </View>
              )}
            </Touch>
          );
        })}
      </View>
      <Text style={ui.text}>
        {selected} · class average{" "}
        {row ? `(${row.combinations} reachable combinations)` : "— no reach"}
      </Text>
      {row &&
        spot.node.actions.map((a, i) => (
          <Text key={i} style={ui.muted}>
            {actionLabel(a, table)}: {(row.frequencies[i] * 100).toFixed(1)}%
          </Text>
        ))}
      <Touch
        accessibilityRole="button"
        accessibilityState={{ expanded: source }}
        style={ui.button}
        onPress={() => setSource(!source)}
      >
        <Text style={ui.text}>
          {source ? "Hide solve details" : "Solve details & assumptions"}
        </Text>
      </Touch>
      {source && (
        <>
          <Text style={ui.muted}>
            {riverPack.id} · {riverPack.source.engine} · revision{" "}
            {riverPack.source.revision}
          </Text>
          <Text style={ui.muted}>
            Board: {riverPack.source.board.join(" ")} · Starting river pot: 11
            chips (5.5 BB) · effective stack: 195 chips (97.5 BB). 1 BB = 2
            chips.
          </Text>
          <Text style={ui.muted}>
            BB assumed range: {riverPack.source.ranges[0]}
          </Text>
          <Text style={ui.muted}>
            BTN assumed range: {riverPack.source.ranges[1]}
          </Text>
          <Text style={ui.muted}>
            {riverPack.source.iterations} DCFR iterations · reported
            exploitability {riverPack.source.exploitabilityChips.toFixed(6)}{" "}
            chips. Training tolerance 0.01 BB is separate from this aggregate
            solver metric.
          </Text>
          <Text style={ui.muted}>
            These original input ranges are assumptions, not solved preflop
            ranges. Folded players' card removal is not modeled. This is a
            two-player river abstraction, not a complete six-max equilibrium or
            a recreational-player model. Class frequencies use
            reach/card-removal weights; feedback uses your exact suit
            combination. Off-tree actions remain ungraded.
          </Text>
        </>
      )}
    </View>
  );
}
